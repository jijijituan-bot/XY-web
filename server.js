const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    maxHttpBufferSize: 1e7, // 10MB，增加消息大小限制
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 用户管理
class UserManager {
    constructor() {
        this.users = new Map(); // socketId -> user info
        this.waitingUsers = []; // 等待匹配的用户
        this.chatRooms = new Map(); // roomId -> {user1, user2}
    }

    addUser(socketId, userInfo) {
        const user = {
            id: uuidv4(),
            socketId,
            nickname: userInfo.nickname,
            gender: userInfo.gender,
            status: 'online',
            joinTime: new Date()
        };
        this.users.set(socketId, user);
        return user;
    }

    removeUser(socketId) {
        const user = this.users.get(socketId);
        if (user) {
            // 从等待队列中移除
            this.waitingUsers = this.waitingUsers.filter(u => u.socketId !== socketId);
            
            // 如果在聊天中，通知对方
            const room = this.findUserRoom(socketId);
            if (room) {
                const partner = room.user1.socketId === socketId ? room.user2 : room.user1;
                io.to(partner.socketId).emit('partnerDisconnected');
                this.chatRooms.delete(room.id);
            }
            
            this.users.delete(socketId);
        }
        return user;
    }

    addToWaitingQueue(user) {
        this.waitingUsers.push(user);
        console.log(`用户 ${user.nickname} 加入等待队列，当前等待人数: ${this.waitingUsers.length}`);
    }

    findMatch(user) {
        // 简单匹配逻辑：找到第一个等待的用户（排除自己）
        const partnerIndex = this.waitingUsers.findIndex(u => u.socketId !== user.socketId);
        
        if (partnerIndex !== -1) {
            const partner = this.waitingUsers.splice(partnerIndex, 1)[0];
            // 也要从等待队列中移除当前用户
            this.waitingUsers = this.waitingUsers.filter(u => u.socketId !== user.socketId);
            
            return partner;
        }
        return null;
    }

    createChatRoom(user1, user2) {
        const roomId = uuidv4();
        const room = {
            id: roomId,
            user1,
            user2,
            createdAt: new Date(),
            messages: []
        };
        
        this.chatRooms.set(roomId, room);
        console.log(`创建聊天室 ${roomId}: ${user1.nickname} <-> ${user2.nickname}`);
        return room;
    }

    findUserRoom(socketId) {
        for (const room of this.chatRooms.values()) {
            if (room.user1.socketId === socketId || room.user2.socketId === socketId) {
                return room;
            }
        }
        return null;
    }

    getPartner(socketId) {
        const room = this.findUserRoom(socketId);
        if (room) {
            return room.user1.socketId === socketId ? room.user2 : room.user1;
        }
        return null;
    }

    getStats() {
        return {
            totalUsers: this.users.size,
            waitingUsers: this.waitingUsers.length,
            activeChatRooms: this.chatRooms.size
        };
    }
}

const userManager = new UserManager();

// Socket.IO 连接处理
io.on('connection', (socket) => {
    console.log(`用户连接: ${socket.id}`);
    
    // 错误处理
    socket.on('error', (error) => {
        console.error(`Socket错误 ${socket.id}:`, error);
    });
    
    // 连接错误处理
    socket.on('connect_error', (error) => {
        console.error(`连接错误 ${socket.id}:`, error);
    });

    // 用户加入
    socket.on('joinChat', (userInfo) => {
        const user = userManager.addUser(socket.id, userInfo);
        console.log(`用户 ${user.nickname} (${user.gender}) 加入聊天`);
        
        socket.emit('joinSuccess', {
            userId: user.id,
            nickname: user.nickname
        });

        // 广播在线用户数
        io.emit('statsUpdate', userManager.getStats());
    });

    // 开始匹配
    socket.on('startMatching', () => {
        const user = userManager.users.get(socket.id);
        if (!user) return;

        console.log(`用户 ${user.nickname} 开始匹配`);
        
        // 尝试找到匹配
        const partner = userManager.findMatch(user);
        
        if (partner) {
            // 找到匹配，创建聊天室
            const room = userManager.createChatRoom(user, partner);
            
            // 通知双方匹配成功
            socket.emit('matchFound', {
                roomId: room.id,
                partner: {
                    nickname: partner.nickname,
                    gender: partner.gender
                }
            });
            
            io.to(partner.socketId).emit('matchFound', {
                roomId: room.id,
                partner: {
                    nickname: user.nickname,
                    gender: user.gender
                }
            });

            console.log(`匹配成功: ${user.nickname} <-> ${partner.nickname}`);
        } else {
            // 没有找到匹配，加入等待队列
            userManager.addToWaitingQueue(user);
            socket.emit('waitingForMatch');
        }

        // 更新统计信息
        io.emit('statsUpdate', userManager.getStats());
    });

    // 取消匹配
    socket.on('cancelMatching', () => {
        const user = userManager.users.get(socket.id);
        if (user) {
            userManager.waitingUsers = userManager.waitingUsers.filter(u => u.socketId !== socket.id);
            console.log(`用户 ${user.nickname} 取消匹配`);
            io.emit('statsUpdate', userManager.getStats());
        }
    });

    // 发送消息
    socket.on('sendMessage', (messageData) => {
        const user = userManager.users.get(socket.id);
        const partner = userManager.getPartner(socket.id);
        
        if (user && partner) {
            // 检查消息大小
            const messageSize = JSON.stringify(messageData).length;
            if (messageSize > 5 * 1024 * 1024) { // 5MB限制
                socket.emit('error', { message: '消息太大，请压缩后再发送' });
                return;
            }
            
            const message = {
                id: uuidv4(),
                content: messageData.content,
                type: messageData.type || 'text',
                sender: user.nickname,
                timestamp: new Date()
            };

            // 发送给对方
            io.to(partner.socketId).emit('receiveMessage', message);
            
            // 确认发送成功
            socket.emit('messageSent', message);
            
            const contentPreview = messageData.type === 'image' ? '[图片]' : messageData.content.substring(0, 50);
            console.log(`消息: ${user.nickname} -> ${partner.nickname}: ${contentPreview}`);
        }
    });

    // 正在输入
    socket.on('typing', () => {
        const partner = userManager.getPartner(socket.id);
        if (partner) {
            io.to(partner.socketId).emit('partnerTyping');
        }
    });

    // 停止输入
    socket.on('stopTyping', () => {
        const partner = userManager.getPartner(socket.id);
        if (partner) {
            io.to(partner.socketId).emit('partnerStoppedTyping');
        }
    });

    // 结束聊天
    socket.on('endChat', () => {
        const user = userManager.users.get(socket.id);
        const partner = userManager.getPartner(socket.id);
        
        if (user && partner) {
            // 通知对方聊天结束
            io.to(partner.socketId).emit('chatEnded', {
                reason: 'partnerLeft',
                message: `${user.nickname} 离开了聊天`
            });
            
            // 移除聊天室
            const room = userManager.findUserRoom(socket.id);
            if (room) {
                userManager.chatRooms.delete(room.id);
                console.log(`聊天室 ${room.id} 已关闭`);
            }
        }
        
        io.emit('statsUpdate', userManager.getStats());
    });

    // 用户断开连接
    socket.on('disconnect', () => {
        const user = userManager.removeUser(socket.id);
        if (user) {
            console.log(`用户 ${user.nickname} 断开连接`);
            io.emit('statsUpdate', userManager.getStats());
        }
    });
});

// 首页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 统计信息API
app.get('/api/stats', (req, res) => {
    res.json(userManager.getStats());
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log('匿名聊天系统已启动');
});