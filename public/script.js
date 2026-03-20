class ChatApp {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.chatPartner = null;
        this.isMatching = false;
        this.isConnected = false;
        this.typingTimer = null;
        
        this.initializeElements();
        this.bindEvents();
        this.connectSocket();
    }
    
    initializeElements() {
        // 页面元素
        this.pages = {
            homepage: document.getElementById('homepage'),
            matching: document.getElementById('matching'),
            chatroom: document.getElementById('chatroom')
        };
        
        // 首页元素
        this.genderInputs = document.querySelectorAll('input[name="gender"]');
        this.nicknameInput = document.getElementById('nickname');
        this.startMatchBtn = document.getElementById('startMatch');
        
        // 匹配页面元素
        this.cancelMatchBtn = document.getElementById('cancelMatch');
        
        // 聊天页面元素
        this.partnerNameSpan = document.getElementById('partnerName');
        this.partnerGenderSpan = document.getElementById('partnerGender');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.endChatBtn = document.getElementById('endChat');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageText = document.getElementById('messageText');
        this.sendMessageBtn = document.getElementById('sendMessage');
        this.uploadPhotoBtn = document.getElementById('uploadPhoto');
        this.photoInput = document.getElementById('photoInput');
        this.showEmojiBtn = document.getElementById('showEmoji');
        this.emojiPanel = document.getElementById('emojiPanel');
    }
    
    connectSocket() {
        this.socket = io();
        
        // 连接成功
        this.socket.on('connect', () => {
            console.log('已连接到服务器');
        });
        
        // 加入成功
        this.socket.on('joinSuccess', (data) => {
            console.log('加入聊天成功:', data);
        });
        
        // 等待匹配
        this.socket.on('waitingForMatch', () => {
            console.log('等待匹配中...');
        });
        
        // 找到匹配
        this.socket.on('matchFound', (data) => {
            console.log('找到匹配:', data);
            this.chatPartner = data.partner;
            this.isMatching = false;
            this.isConnected = true;
            this.partnerNameSpan.textContent = this.chatPartner.nickname;
            
            // 显示性别
            this.updatePartnerGender(this.chatPartner.gender);
            
            this.showPage('chatroom');
            this.addSystemMessage(`已连接到 ${this.chatPartner.nickname}，开始聊天吧！`);
        });
        
        // 接收消息
        this.socket.on('receiveMessage', (message) => {
            this.addMessage(message.content, false, message.type === 'image');
        });
        
        // 消息发送成功
        this.socket.on('messageSent', (message) => {
            // 消息已经在发送时添加到界面，这里可以添加发送成功的标识
            console.log('消息发送成功:', message);
        });
        
        // 对方正在输入
        this.socket.on('partnerTyping', () => {
            this.typingIndicator.classList.add('show');
        });
        
        // 对方停止输入
        this.socket.on('partnerStoppedTyping', () => {
            this.typingIndicator.classList.remove('show');
        });
        
        // 对方断开连接
        this.socket.on('partnerDisconnected', () => {
            this.addSystemMessage('对方已离开聊天');
            this.isConnected = false;
            setTimeout(() => {
                this.endChat(false);
            }, 2000);
        });
        
        // 聊天结束
        this.socket.on('chatEnded', (data) => {
            this.addSystemMessage(data.message);
            this.isConnected = false;
            setTimeout(() => {
                this.endChat(false);
            }, 2000);
        });
        
        // 统计信息更新
        this.socket.on('statsUpdate', (stats) => {
            console.log('在线统计:', stats);
        });
        
        // 连接断开
        this.socket.on('disconnect', () => {
            console.log('与服务器断开连接');
            this.addSystemMessage('与服务器连接断开，请刷新页面重试');
        });
    }
    
    bindEvents() {
        // 首页事件
        this.startMatchBtn.addEventListener('click', () => this.startMatching());
        this.nicknameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.startMatching();
        });
        
        // 匹配页面事件
        this.cancelMatchBtn.addEventListener('click', () => this.cancelMatching());
        
        // 聊天页面事件
        this.endChatBtn.addEventListener('click', () => this.endChat(true));
        this.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        this.messageText.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // 输入状态检测
        this.messageText.addEventListener('input', () => {
            this.handleTyping();
            this.adjustTextareaHeight();
        });
        
        // 照片上传
        this.uploadPhotoBtn.addEventListener('click', () => this.photoInput.click());
        this.photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
        
        // 表情包
        this.showEmojiBtn.addEventListener('click', () => this.toggleEmojiPanel());
        document.querySelectorAll('.emoji').forEach(emoji => {
            emoji.addEventListener('click', () => this.insertEmoji(emoji.textContent));
        });
        
        // 点击其他地方关闭表情包面板
        document.addEventListener('click', (e) => {
            if (!this.emojiPanel.contains(e.target) && e.target !== this.showEmojiBtn) {
                this.emojiPanel.classList.remove('show');
            }
        });
    }
    
    showPage(pageName) {
        Object.values(this.pages).forEach(page => page.classList.remove('active'));
        this.pages[pageName].classList.add('active');
    }
    
    updatePartnerGender(gender) {
        const genderMap = {
            'male': '♂ 男',
            'female': '♀ 女',
            'other': '⚧ 其他'
        };
        
        this.partnerGenderSpan.textContent = genderMap[gender] || '';
        this.partnerGenderSpan.className = `partner-gender ${gender}`;
    }
    
    startMatching() {
        const selectedGender = document.querySelector('input[name="gender"]:checked');
        const nickname = this.nicknameInput.value.trim();
        
        if (!selectedGender) {
            alert('请选择性别');
            return;
        }
        
        if (!nickname) {
            alert('请输入昵称');
            return;
        }
        
        if (nickname.length > 20) {
            alert('昵称不能超过20个字符');
            return;
        }
        
        this.currentUser = {
            gender: selectedGender.value,
            nickname: nickname
        };
        
        // 加入聊天系统
        this.socket.emit('joinChat', this.currentUser);
        
        this.isMatching = true;
        this.showPage('matching');
        
        // 开始匹配
        this.socket.emit('startMatching');
    }
    
    cancelMatching() {
        this.isMatching = false;
        this.socket.emit('cancelMatching');
        this.showPage('homepage');
    }
    
    endChat(notify = true) {
        if (notify && this.isConnected) {
            this.socket.emit('endChat');
        }
        
        this.isConnected = false;
        this.chatPartner = null;
        this.chatMessages.innerHTML = '';
        this.messageText.value = '';
        this.partnerGenderSpan.textContent = '';
        this.partnerGenderSpan.className = 'partner-gender';
        this.showPage('homepage');
        this.nicknameInput.value = '';
        this.genderInputs.forEach(input => input.checked = false);
    }
    
    sendMessage() {
        const message = this.messageText.value.trim();
        if (!message || !this.isConnected) return;
        
        // 立即显示自己的消息
        this.addMessage(message, true);
        
        // 发送到服务器
        this.socket.emit('sendMessage', {
            content: message,
            type: 'text'
        });
        
        this.messageText.value = '';
        this.adjustTextareaHeight();
        this.stopTyping();
    }
    
    handleTyping() {
        if (!this.isConnected) return;
        
        // 发送正在输入信号
        this.socket.emit('typing');
        
        // 清除之前的定时器
        clearTimeout(this.typingTimer);
        
        // 3秒后发送停止输入信号
        this.typingTimer = setTimeout(() => {
            this.stopTyping();
        }, 3000);
    }
    
    stopTyping() {
        if (this.isConnected) {
            this.socket.emit('stopTyping');
        }
        clearTimeout(this.typingTimer);
    }
    
    addMessage(content, isOwn, isImage = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (isImage) {
            const img = document.createElement('img');
            img.src = content;
            img.className = 'message-image';
            img.onclick = () => this.showImageModal(content);
            contentDiv.appendChild(img);
        } else {
            contentDiv.textContent = content;
        }
        
        messageDiv.appendChild(contentDiv);
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = new Date().toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
        messageDiv.appendChild(timeDiv);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    addSystemMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.style.textAlign = 'center';
        messageDiv.style.color = 'rgba(255, 255, 255, 0.7)';
        messageDiv.style.fontSize = '14px';
        messageDiv.style.margin = '10px 0';
        messageDiv.textContent = message;
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file || !this.isConnected) return;
        
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert('图片大小不能超过5MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = e.target.result;
            
            // 立即显示自己的图片
            this.addMessage(imageData, true, true);
            
            // 发送到服务器
            this.socket.emit('sendMessage', {
                content: imageData,
                type: 'image'
            });
        };
        reader.readAsDataURL(file);
        
        // 清空文件输入
        event.target.value = '';
    }
    
    toggleEmojiPanel() {
        this.emojiPanel.classList.toggle('show');
    }
    
    insertEmoji(emoji) {
        const cursorPos = this.messageText.selectionStart;
        const textBefore = this.messageText.value.substring(0, cursorPos);
        const textAfter = this.messageText.value.substring(cursorPos);
        
        this.messageText.value = textBefore + emoji + textAfter;
        this.messageText.focus();
        this.messageText.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
        
        this.emojiPanel.classList.remove('show');
        this.adjustTextareaHeight();
        this.handleTyping();
    }
    
    adjustTextareaHeight() {
        this.messageText.style.height = 'auto';
        this.messageText.style.height = Math.min(this.messageText.scrollHeight, 100) + 'px';
    }
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    showImageModal(src) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
            cursor: pointer;
        `;
        
        const img = document.createElement('img');
        img.src = src;
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            border-radius: 10px;
        `;
        
        modal.appendChild(img);
        document.body.appendChild(modal);
        
        modal.onclick = () => {
            document.body.removeChild(modal);
        };
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});