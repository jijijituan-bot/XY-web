require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 导入模型
const User = require('./models/User');
const Card = require('./models/Card');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    maxHttpBufferSize: 1e7,
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// 信任代理（Railway使用反向代理）
app.set('trust proxy', 1);

// 中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/anonymous-chat';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB连接成功'))
    .catch(err => console.error('❌ MongoDB连接失败:', err));

// Session配置
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGODB_URI,
        touchAfter: 24 * 3600
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7天
        httpOnly: true,
        secure: false, // Railway使用代理，设置为false
        sameSite: 'lax'
    }
});

app.use(sessionMiddleware);

// Socket.IO使用session
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

// ==================== API路由 ====================

// 注册
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }
        
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ error: '用户名长度必须在3-20个字符之间' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: '密码长度至少6个字符' });
        }
        
        // 检查用户名是否已存在
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: '用户名已被使用' });
        }
        
        // 创建新用户
        const user = new User({ username, password });
        await user.save();
        
        // 自动登录
        req.session.userId = user._id;
        req.session.username = user.username;
        
        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                bio: user.bio,
                gender: user.gender
            }
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ error: '注册失败，请重试' });
    }
});

// 登录
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }
        
        // 查找用户
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        // 验证密码
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        // 更新最后活跃时间
        user.lastActive = new Date();
        await user.save();
        
        // 设置session
        req.session.userId = user._id;
        req.session.username = user.username;
        
        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                bio: user.bio,
                gender: user.gender
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '登录失败，请重试' });
    }
});

// 登出
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// 获取当前用户信息
app.get('/api/user', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const user = await User.findById(req.session.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }
        
        res.json({ user });
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({ error: '获取用户信息失败' });
    }
});

// 更新用户资料
app.put('/api/user/profile', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const { bio, gender } = req.body;
        
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }
        
        if (bio !== undefined) user.bio = bio;
        if (gender !== undefined) user.gender = gender;
        
        await user.save();
        
        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                bio: user.bio,
                gender: user.gender
            }
        });
    } catch (error) {
        console.error('更新资料错误:', error);
        res.status(500).json({ error: '更新资料失败' });
    }
});

// 创建卡片
app.post('/api/cards', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const { content } = req.body;
        
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: '内容不能为空' });
        }
        
        if (content.length > 500) {
            return res.status(400).json({ error: '内容不能超过500字' });
        }
        
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }
        
        // 删除旧卡片（每个用户只能有一张卡片）
        await Card.deleteMany({ userId: user._id });
        
        // 创建新卡片
        const card = new Card({
            userId: user._id,
            username: user.username,
            content: content.trim(),
            gender: user.gender
        });
        
        await card.save();
        
        res.json({ success: true, card });
    } catch (error) {
        console.error('创建卡片错误:', error);
        res.status(500).json({ error: '创建卡片失败' });
    }
});

// 获取卡片列表（排除自己的）
app.get('/api/cards', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const cards = await Card.find({
            userId: { $ne: req.session.userId }
        }).sort({ createdAt: -1 }).limit(50);
        
        res.json({ cards });
    } catch (error) {
        console.error('获取卡片错误:', error);
        res.status(500).json({ error: '获取卡片失败' });
    }
});

// 获取指定用户的卡片
app.get('/api/cards/user/:userId', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const card = await Card.findOne({
            userId: req.params.userId
        });
        
        if (!card) {
            return res.status(404).json({ error: '该用户还没有创建卡片' });
        }
        
        res.json({ card });
    } catch (error) {
        console.error('获取用户卡片错误:', error);
        res.status(500).json({ error: '获取卡片失败' });
    }
});

// 发送留言
app.post('/api/messages', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const { toUserId, cardId, content } = req.body;
        
        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: '留言内容不能为空' });
        }
        
        if (content.length > 500) {
            return res.status(400).json({ error: '留言不能超过500字' });
        }
        
        const fromUser = await User.findById(req.session.userId);
        const toUser = await User.findById(toUserId);
        const card = await Card.findById(cardId);
        
        if (!fromUser || !toUser || !card) {
            return res.status(404).json({ error: '用户或卡片不存在' });
        }
        
        const message = new Message({
            fromUserId: fromUser._id,
            fromUsername: fromUser.username,
            toUserId: toUser._id,
            toUsername: toUser.username,
            cardId: card._id,
            originalCardContent: card.content, // 保存原始卡片内容
            content: content.trim()
        });
        
        await message.save();
        
        res.json({ success: true, message });
    } catch (error) {
        console.error('发送留言错误:', error);
        res.status(500).json({ error: '发送留言失败' });
    }
});

// 获取收到的留言
app.get('/api/messages', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const messages = await Message.find({
            toUserId: req.session.userId
        }).sort({ createdAt: -1 }).limit(50);
        
        res.json({ messages });
    } catch (error) {
        console.error('获取留言错误:', error);
        res.status(500).json({ error: '获取留言失败' });
    }
});

// 标记留言为已读
app.put('/api/messages/:id/read', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: '未登录' });
        }
        
        const message = await Message.findOne({
            _id: req.params.id,
            toUserId: req.session.userId
        });
        
        if (!message) {
            return res.status(404).json({ error: '留言不存在' });
        }
        
        message.isRead = true;
        await message.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error('标记已读错误:', error);
        res.status(500).json({ error: '操作失败' });
    }
});

// ==================== 原有的聊天功能 ====================

// 用户管理类（保留原有功能）
class UserManager {
    constructor() {
        this.users = new Map();
        this.waitingUsers = [];
        this.chatRooms = new Map();
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
            this.waitingUsers = this.waitingUsers.filter(u => u.socketId !== socketId);
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
    }

    findMatch(user) {
        const partnerIndex = this.waitingUsers.findIndex(u => u.socketId !== user.socketId);
        if (partnerIndex !== -1) {
            const partner = this.waitingUsers.splice(partnerIndex, 1)[0];
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

// Socket.IO连接处理（保留原有聊天功能）
io.on('connection', (socket) => {
    console.log(`用户连接: ${socket.id}`);
    
    socket.on('error', (error) => {
        console.error(`Socket错误 ${socket.id}:`, error);
    });
    
    socket.on('connect_error', (error) => {
        console.error(`连接错误 ${socket.id}:`, error);
    });

    socket.on('joinChat', (userInfo) => {
        const user = userManager.addUser(socket.id, userInfo);
        socket.emit('joinSuccess', {
            userId: user.id,
            nickname: user.nickname
        });
        io.emit('statsUpdate', userManager.getStats());
    });

    socket.on('startMatching', () => {
        const user = userManager.users.get(socket.id);
        if (!user) return;
        
        const partner = userManager.findMatch(user);
        
        if (partner) {
            const room = userManager.createChatRoom(user, partner);
            
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
        } else {
            userManager.addToWaitingQueue(user);
            socket.emit('waitingForMatch');
        }
        
        io.emit('statsUpdate', userManager.getStats());
    });

    socket.on('cancelMatching', () => {
        const user = userManager.users.get(socket.id);
        if (user) {
            userManager.waitingUsers = userManager.waitingUsers.filter(u => u.socketId !== socket.id);
            io.emit('statsUpdate', userManager.getStats());
        }
    });

    socket.on('sendMessage', (messageData) => {
        const user = userManager.users.get(socket.id);
        const partner = userManager.getPartner(socket.id);
        
        if (user && partner) {
            const messageSize = JSON.stringify(messageData).length;
            if (messageSize > 5 * 1024 * 1024) {
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

            io.to(partner.socketId).emit('receiveMessage', message);
            socket.emit('messageSent', message);
        }
    });

    socket.on('typing', () => {
        const partner = userManager.getPartner(socket.id);
        if (partner) {
            io.to(partner.socketId).emit('partnerTyping');
        }
    });

    socket.on('stopTyping', () => {
        const partner = userManager.getPartner(socket.id);
        if (partner) {
            io.to(partner.socketId).emit('partnerStoppedTyping');
        }
    });

    socket.on('endChat', () => {
        const user = userManager.users.get(socket.id);
        const partner = userManager.getPartner(socket.id);
        
        if (user && partner) {
            io.to(partner.socketId).emit('chatEnded', {
                reason: 'partnerLeft',
                message: `${user.nickname} 离开了聊天`
            });
            
            const room = userManager.findUserRoom(socket.id);
            if (room) {
                userManager.chatRooms.delete(room.id);
            }
        }
        
        io.emit('statsUpdate', userManager.getStats());
    });

    socket.on('disconnect', () => {
        const user = userManager.removeUser(socket.id);
        if (user) {
            io.emit('statsUpdate', userManager.getStats());
        }
    });
});

// 首页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 健康检查端点
app.get('/health', (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        session: req.session ? 'enabled' : 'disabled'
    };
    res.json(health);
});

// 统计信息API
app.get('/api/stats', (req, res) => {
    res.json(userManager.getStats());
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log('✨ 心洞述说系统已启动（带用户系统）');
});
