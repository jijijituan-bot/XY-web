// 主应用逻辑
document.addEventListener('DOMContentLoaded', async () => {
    // 初始化
    await initApp();
    
    // 绑定事件
    bindAuthEvents();
    bindProfileEvents();
    bindMainPageEvents();
    bindChatEvents();
    bindModalEvents();
});

// 初始化应用
async function initApp() {
    Utils.showLoading();
    
    try {
        // 尝试获取当前用户
        const data = await API.getUser();
        appState.setUser(data.user);
        
        // 已登录，显示主页
        PageManager.showPage('main');
        PageManager.showTab('cards');
        await loadUserData();
    } catch (error) {
        // 未登录，显示登录页
        PageManager.showPage('auth');
    } finally {
        Utils.hideLoading();
    }
}

// 加载用户数据
async function loadUserData() {
    try {
        const user = appState.getUser();
        
        // 更新个人中心显示
        document.getElementById('profileUsername').textContent = user.username;
        updateGenderDisplay(user.gender);
        
        // 加载卡片
        await loadCards();
        
        // 加载留言
        await loadMessages();
        
        // 设置聊天昵称
        document.getElementById('chatNickname').value = user.username;
    } catch (error) {
        console.error('加载用户数据失败:', error);
    }
}

// 认证相关事件
function bindAuthEvents() {
    // 切换登录/注册表单
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').classList.remove('active');
        document.getElementById('registerForm').classList.add('active');
    });
    
    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerForm').classList.remove('active');
        document.getElementById('loginForm').classList.add('active');
    });
    
    // 登录
    document.getElementById('loginBtn').addEventListener('click', async () => {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        if (!username || !password) {
            Utils.showToast('请填写完整信息', 'error');
            return;
        }
        
        try {
            Utils.showLoading();
            const data = await API.login(username, password);
            appState.setUser(data.user);
            
            Utils.showToast('登录成功！', 'success');
            PageManager.showPage('main');
            PageManager.showTab('cards');
            await loadUserData();
        } catch (error) {
            Utils.showToast(error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    });
    
    // 注册
    document.getElementById('registerBtn').addEventListener('click', async () => {
        const username = document.getElementById('registerUsername').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerPasswordConfirm').value;
        
        if (!username || !password || !confirmPassword) {
            Utils.showToast('请填写完整信息', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            Utils.showToast('两次密码不一致', 'error');
            return;
        }
        
        if (username.length < 3 || username.length > 20) {
            Utils.showToast('用户名长度必须在3-20字符之间', 'error');
            return;
        }
        
        if (password.length < 6) {
            Utils.showToast('密码长度至少6个字符', 'error');
            return;
        }
        
        try {
            Utils.showLoading();
            const data = await API.register(username, password);
            appState.setUser(data.user);
            
            Utils.showToast('注册成功！', 'success');
            PageManager.showPage('profileSetup');
        } catch (error) {
            Utils.showToast(error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    });
    
    // 退出登录
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        if (!confirm('确定要退出登录吗？')) return;
        
        try {
            await API.logout();
            appState.clearUser();
            Utils.showToast('已退出登录', 'success');
            PageManager.showPage('auth');
        } catch (error) {
            Utils.showToast('退出失败', 'error');
        }
    });
}

// 个人资料设置事件
function bindProfileEvents() {
    // 字符计数
    document.getElementById('profileBio').addEventListener('input', (e) => {
        document.getElementById('bioCharCount').textContent = e.target.value.length;
    });
    
    // 保存资料
    document.getElementById('saveProfileBtn').addEventListener('click', async () => {
        const bio = document.getElementById('profileBio').value.trim();
        const genderInput = document.querySelector('input[name="profileGender"]:checked');
        const gender = genderInput ? genderInput.value : 'other';
        
        if (!bio) {
            Utils.showToast('请填写个人简介', 'error');
            return;
        }
        
        try {
            Utils.showLoading();
            const data = await API.updateProfile(bio, gender);
            appState.setUser(data.user);
            
            Utils.showToast('资料保存成功！', 'success');
            PageManager.showPage('main');
            PageManager.showTab('cards');
            await loadUserData();
        } catch (error) {
            Utils.showToast(error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    });
    
    // 跳过设置
    document.getElementById('skipProfileBtn').addEventListener('click', () => {
        PageManager.showPage('main');
        PageManager.showTab('cards');
        loadUserData();
    });
    
    // 编辑资料
    document.getElementById('editProfileBtn').addEventListener('click', () => {
        PageManager.showPage('profileSetup');
        const user = appState.getUser();
        document.getElementById('profileBio').value = user.bio || '';
        document.getElementById('bioCharCount').textContent = (user.bio || '').length;
        
        const genderInput = document.querySelector(`input[name="profileGender"][value="${user.gender}"]`);
        if (genderInput) genderInput.checked = true;
    });
}

// 主页面事件
function bindMainPageEvents() {
    // 标签切换
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            PageManager.showTab(tab);
            
            if (tab === 'messages') {
                loadMessages();
            } else if (tab === 'cards') {
                loadCards();
            }
        });
    });
    
    // 刷新卡片
    document.getElementById('refreshCardsBtn').addEventListener('click', () => {
        loadCards();
    });
    
    // 编辑卡片
    document.getElementById('editCardBtn').addEventListener('click', async () => {
        PageManager.showModal('cardModal');
        
        // 加载现有卡片内容
        try {
            const data = await API.getCards();
            // 这里需要获取自己的卡片，暂时留空
            document.getElementById('cardContent').value = '';
        } catch (error) {
            console.error(error);
        }
    });
}

// 卡片相关
async function loadCards() {
    try {
        const data = await API.getCards();
        appState.cards = data.cards;
        renderCards();
    } catch (error) {
        console.error('加载卡片失败:', error);
        Utils.showToast('加载卡片失败', 'error');
    }
}

function renderCards() {
    const cardStack = document.getElementById('cardStack');
    cardStack.innerHTML = '';
    
    if (appState.cards.length === 0) {
        cardStack.innerHTML = `
            <div class="no-cards">
                <p>暂无更多卡片</p>
                <button id="refreshCardsBtn" class="btn-secondary">刷新</button>
            </div>
        `;
        return;
    }
    
    appState.cards.forEach((card, index) => {
        const cardEl = createCardElement(card, index);
        cardStack.appendChild(cardEl);
    });
}

function createCardElement(card, index) {
    const div = document.createElement('div');
    div.className = 'user-card';
    div.style.zIndex = appState.cards.length - index;
    
    const genderIcon = card.gender === 'male' ? '♂' : card.gender === 'female' ? '♀' : '⚧';
    
    div.innerHTML = `
        <div class="card-header">
            <span class="card-username">${card.username}</span>
            <span class="card-gender">${genderIcon}</span>
        </div>
        <div class="card-content">
            <p>${card.content}</p>
        </div>
        <div class="card-actions">
            <button class="card-btn card-pass" data-card-id="${card._id}">👎 下一个</button>
            <button class="card-btn card-like" data-card-id="${card._id}" data-user-id="${card.userId}" data-username="${card.username}">💬 留言</button>
        </div>
    `;
    
    // 绑定按钮事件
    div.querySelector('.card-pass').addEventListener('click', () => {
        removeCard(div);
    });
    
    div.querySelector('.card-like').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        showMessageModal(btn.dataset.userId, btn.dataset.cardId, btn.dataset.username);
        removeCard(div);
    });
    
    return div;
}

function removeCard(cardEl) {
    cardEl.style.transform = 'translateX(150%) rotate(20deg)';
    cardEl.style.opacity = '0';
    
    setTimeout(() => {
        cardEl.remove();
        
        // 检查是否还有卡片
        const remaining = document.querySelectorAll('.user-card').length;
        if (remaining === 0) {
            document.getElementById('cardStack').innerHTML = `
                <div class="no-cards">
                    <p>暂无更多卡片</p>
                    <button id="refreshCardsBtn" class="btn-secondary">刷新</button>
                </div>
            `;
        }
    }, 300);
}

// 留言相关
async function loadMessages() {
    try {
        const data = await API.getMessages();
        appState.messages = data.messages;
        renderMessages();
        updateMessageBadge();
    } catch (error) {
        console.error('加载留言失败:', error);
    }
}

function renderMessages() {
    const messagesList = document.getElementById('messagesList');
    
    if (appState.messages.length === 0) {
        messagesList.innerHTML = '<div class="no-messages"><p>还没有收到留言</p></div>';
        return;
    }
    
    messagesList.innerHTML = appState.messages.map(msg => `
        <div class="message-item ${msg.isRead ? 'read' : 'unread'}">
            <div class="message-header">
                <strong>${msg.fromUsername}</strong>
                <span class="message-time">${Utils.formatDate(msg.createdAt)}</span>
            </div>
            <div class="message-content">
                <p>${msg.content}</p>
            </div>
        </div>
    `).join('');
}

function updateMessageBadge() {
    const unreadCount = appState.messages.filter(m => !m.isRead).length;
    const badge = document.getElementById('messageBadge');
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

function showMessageModal(userId, cardId, username) {
    document.getElementById('messageToUser').textContent = username;
    document.getElementById('messageContent').value = '';
    document.getElementById('messageCharCount').textContent = '0';
    
    PageManager.showModal('messageModal');
    
    // 保存当前留言目标
    window.currentMessageTarget = { userId, cardId };
}

// 聊天相关事件（保留原有功能）
function bindChatEvents() {
    document.getElementById('startChatMatchBtn').addEventListener('click', () => {
        const nickname = document.getElementById('chatNickname').value.trim();
        const genderInput = document.querySelector('input[name="chatGender"]:checked');
        const gender = genderInput ? genderInput.value : 'other';
        
        if (!nickname) {
            Utils.showToast('请输入昵称', 'error');
            return;
        }
        
        startChatMatching(nickname, gender);
    });
}

function startChatMatching(nickname, gender) {
    PageManager.showPage('matching');
    
    // 初始化Socket.IO连接
    if (!appState.socket) {
        appState.socket = io();
        setupSocketEvents();
    }
    
    appState.socket.emit('joinChat', { nickname, gender });
    appState.socket.emit('startMatching');
}

function setupSocketEvents() {
    const socket = appState.socket;
    
    socket.on('matchFound', (data) => {
        PageManager.showPage('chatroom');
        document.getElementById('partnerName').textContent = data.partner.nickname;
        
        const genderIcon = data.partner.gender === 'male' ? '♂ 男' : 
                          data.partner.gender === 'female' ? '♀ 女' : '⚧ 其他';
        document.getElementById('partnerGender').textContent = genderIcon;
        
        addSystemMessage(`已连接到 ${data.partner.nickname}，开始聊天吧！`);
    });
    
    socket.on('receiveMessage', (message) => {
        addChatMessage(message.content, false, message.type === 'image');
    });
    
    socket.on('partnerTyping', () => {
        document.getElementById('typingIndicator').classList.add('show');
    });
    
    socket.on('partnerStoppedTyping', () => {
        document.getElementById('typingIndicator').classList.remove('show');
    });
    
    socket.on('partnerDisconnected', () => {
        addSystemMessage('对方已离开聊天');
        setTimeout(() => {
            PageManager.showPage('main');
            PageManager.showTab('chat');
        }, 2000);
    });
}

// 模态框事件
function bindModalEvents() {
    // 关闭模态框
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            PageManager.hideAllModals();
        });
    });
    
    // 点击模态框外部关闭
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                PageManager.hideAllModals();
            }
        });
    });
    
    // 保存卡片
    document.getElementById('saveCardBtn').addEventListener('click', async () => {
        const content = document.getElementById('cardContent').value.trim();
        
        if (!content) {
            Utils.showToast('请填写卡片内容', 'error');
            return;
        }
        
        try {
            Utils.showLoading();
            await API.createCard(content);
            Utils.showToast('卡片保存成功！', 'success');
            PageManager.hideAllModals();
        } catch (error) {
            Utils.showToast(error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    });
    
    // 发送留言
    document.getElementById('sendMessageModalBtn').addEventListener('click', async () => {
        const content = document.getElementById('messageContent').value.trim();
        
        if (!content) {
            Utils.showToast('请填写留言内容', 'error');
            return;
        }
        
        if (!window.currentMessageTarget) {
            Utils.showToast('留言目标错误', 'error');
            return;
        }
        
        try {
            Utils.showLoading();
            await API.sendMessage(
                window.currentMessageTarget.userId,
                window.currentMessageTarget.cardId,
                content
            );
            Utils.showToast('留言发送成功！', 'success');
            PageManager.hideAllModals();
        } catch (error) {
            Utils.showToast(error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    });
    
    // 字符计数
    document.getElementById('cardContent').addEventListener('input', (e) => {
        document.getElementById('cardCharCount').textContent = e.target.value.length;
    });
    
    document.getElementById('messageContent').addEventListener('input', (e) => {
        document.getElementById('messageCharCount').textContent = e.target.value.length;
    });
}

// 聊天辅助函数
function addChatMessage(content, isOwn, isImage = false) {
    const messagesDiv = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (isImage) {
        const img = document.createElement('img');
        img.src = content;
        img.className = 'message-image';
        contentDiv.appendChild(img);
    } else {
        contentDiv.textContent = content;
    }
    
    messageDiv.appendChild(contentDiv);
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = Utils.formatTime(new Date());
    messageDiv.appendChild(timeDiv);
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addSystemMessage(message) {
    const messagesDiv = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.style.textAlign = 'center';
    messageDiv.style.color = '#4a5568';
    messageDiv.style.fontSize = '13px';
    messageDiv.style.margin = '15px 0';
    messageDiv.style.padding = '8px 15px';
    messageDiv.style.background = 'rgba(255, 255, 255, 0.2)';
    messageDiv.style.borderRadius = '15px';
    messageDiv.style.backdropFilter = 'blur(10px)';
    messageDiv.style.fontWeight = '500';
    messageDiv.textContent = message;
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function updateGenderDisplay(gender) {
    const display = document.getElementById('profileGenderDisplay');
    const genderMap = {
        'male': '♂ 男',
        'female': '♀ 女',
        'other': '⚧ 其他'
    };
    display.textContent = genderMap[gender] || '';
    display.className = `profile-gender ${gender}`;
}
