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
        
        // 加载用户自己的卡片
        await loadMyCard();
        
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

// 加载用户自己的卡片
async function loadMyCard() {
    try {
        const data = await API.getMyCard();
        const myCardPreview = document.getElementById('myCardPreview');
        
        if (data.card) {
            const user = appState.getUser();
            const genderIcon = user.gender === 'male' ? '♂' : user.gender === 'female' ? '♀' : '⚧';
            
            myCardPreview.innerHTML = `
                <div class="my-card-content">
                    <div class="my-card-header">
                        <span class="my-card-username">${user.username}</span>
                        <span class="my-card-gender">${genderIcon}</span>
                    </div>
                    <div class="my-card-text">${data.card.content}</div>
                    <div class="my-card-footer">
                        <span class="my-card-time">创建于 ${Utils.formatDate(data.card.createdAt)}</span>
                    </div>
                </div>
            `;
        } else {
            myCardPreview.innerHTML = '<p class="no-card">还没有创建卡片</p>';
        }
    } catch (error) {
        console.error('加载我的卡片失败:', error);
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
            
            // 保存个人资料
            const profileData = await API.updateProfile(bio, gender);
            appState.setUser(profileData.user);
            
            // 自动创建卡片（使用个人简介作为卡片内容）
            await API.createCard(bio);
            
            Utils.showToast('资料保存成功！卡片已创建', 'success');
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
    
    // 刷新卡片（使用事件委托，因为按钮是动态创建的）
    document.addEventListener('click', (e) => {
        if (e.target.id === 'refreshCardsBtn') {
            loadCards();
        }
    });
    
    // 编辑卡片
    const editCardBtn = document.getElementById('editCardBtn');
    if (editCardBtn) {
        editCardBtn.addEventListener('click', async () => {
            console.log('编辑卡片按钮被点击');
            try {
                // 加载用户自己的卡片内容
                const data = await API.getMyCard();
                
                if (data.card) {
                    document.getElementById('cardContent').value = data.card.content;
                    document.getElementById('cardCharCount').textContent = data.card.content.length;
                } else {
                    document.getElementById('cardContent').value = '';
                    document.getElementById('cardCharCount').textContent = '0';
                }
                
                PageManager.showModal('cardModal');
            } catch (error) {
                console.error('加载卡片失败:', error);
                Utils.showToast('加载卡片失败', 'error');
            }
        });
    } else {
        console.error('未找到编辑卡片按钮');
    }
    
    // 删除卡片
    const deleteCardBtn = document.getElementById('deleteCardBtn');
    if (deleteCardBtn) {
        deleteCardBtn.addEventListener('click', async () => {
            console.log('删除卡片按钮被点击');
            if (!confirm('确定要删除你的卡片吗？删除后将从发现区域消失。')) {
                return;
            }
            
            try {
                Utils.showLoading();
                await API.deleteMyCard();
                Utils.showToast('卡片已删除', 'success');
                await loadMyCard();
            } catch (error) {
                console.error('删除卡片失败:', error);
                Utils.showToast('删除失败', 'error');
            } finally {
                Utils.hideLoading();
            }
        });
    } else {
        console.error('未找到删除卡片按钮');
    }
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
    
    console.log('渲染留言列表:', appState.messages);
    
    // 按用户分组留言（只统计收到的留言）
    const messagesByUser = {};
    appState.messages.forEach(msg => {
        if (!messagesByUser[msg.fromUserId]) {
            messagesByUser[msg.fromUserId] = {
                username: msg.fromUsername,
                userId: msg.fromUserId,
                hasUnread: false,
                unreadCount: 0,
                latestTime: msg.createdAt,
                latestMessage: msg.content
            };
        }
        if (!msg.isRead) {
            messagesByUser[msg.fromUserId].hasUnread = true;
            messagesByUser[msg.fromUserId].unreadCount++;
        }
    });
    
    // 渲染用户列表（默认折叠）
    messagesList.innerHTML = Object.values(messagesByUser).map(userInfo => {
        return `
        <div class="message-user-item ${userInfo.hasUnread ? 'has-unread' : ''}" data-user-id="${userInfo.userId}">
            <div class="user-item-header">
                <div class="user-item-info">
                    <strong class="user-item-name">${userInfo.username}</strong>
                    ${userInfo.hasUnread ? `<span class="unread-count">${userInfo.unreadCount}</span>` : ''}
                </div>
                <span class="user-item-time">${Utils.formatDate(userInfo.latestTime)}</span>
            </div>
            <div class="user-item-preview">${userInfo.latestMessage}</div>
            <div class="conversation-detail" style="display: none;" data-user-id="${userInfo.userId}">
                <div class="loading-conversation">加载对话中...</div>
            </div>
        </div>
        `;
    }).join('');
    
    // 绑定点击事件 - 展开/折叠对话
    document.querySelectorAll('.message-user-item').forEach(item => {
        const userHeader = item.querySelector('.user-item-header');
        const userId = item.dataset.userId;
        
        userHeader.addEventListener('click', async () => {
            const conversationDetail = item.querySelector('.conversation-detail');
            
            // 切换展开/折叠
            if (conversationDetail.style.display === 'none') {
                // 折叠其他所有对话
                document.querySelectorAll('.conversation-detail').forEach(detail => {
                    detail.style.display = 'none';
                });
                document.querySelectorAll('.message-user-item').forEach(i => {
                    i.classList.remove('expanded');
                });
                
                // 展开当前对话
                conversationDetail.style.display = 'block';
                item.classList.add('expanded');
                
                // 如果还没加载过对话，则加载
                if (conversationDetail.querySelector('.loading-conversation')) {
                    await loadConversation(userId);
                }
            } else {
                // 折叠当前对话
                conversationDetail.style.display = 'none';
                item.classList.remove('expanded');
            }
        });
    });
}

// 加载与某个用户的完整对话
async function loadConversation(userId) {
    const container = document.querySelector(`.conversation-detail[data-user-id="${userId}"]`);
    if (!container) return;
    
    try {
        const data = await API.getConversation(userId);
        const messages = data.messages || [];
        const currentUserId = appState.getUser()._id;
        
        console.log('加载对话 - 当前用户ID:', currentUserId, '对话用户ID:', userId);
        console.log('对话消息数量:', messages.length);
        
        const totalMessages = messages.length;
        const shouldCollapse = totalMessages > 4; // 超过4条消息时折叠
        
        // 分离最新的4条和其余的
        const recentMessages = messages.slice(-4);
        const olderMessages = messages.slice(0, -4);
        
        // 获取用户名
        const username = messages.length > 0 ? (messages.find(m => m.fromUserId !== currentUserId)?.fromUsername || '用户') : '用户';
        
        container.innerHTML = `
            <div class="conversation-messages">
                ${shouldCollapse ? `
                <div class="collapsed-messages" style="display: none;">
                    ${olderMessages.map(msg => renderConversationMessage(msg, currentUserId)).join('')}
                </div>
                <button class="btn-toggle-messages">
                    <span class="toggle-text">展开 ${olderMessages.length} 条更早的消息</span>
                    <span class="toggle-icon">▼</span>
                </button>
                ` : ''}
                ${recentMessages.map(msg => renderConversationMessage(msg, currentUserId)).join('')}
            </div>
            <div class="conversation-actions">
                <button class="btn-reply" data-user-id="${userId}" data-username="${username}">回复</button>
                <button class="btn-mark-read" data-user-id="${userId}">全部标为已读</button>
                <button class="btn-delete" data-user-id="${userId}" data-username="${username}">删除</button>
            </div>
        `;
        
        // 绑定折叠按钮
        const toggleBtn = container.querySelector('.btn-toggle-messages');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                const collapsedMessages = container.querySelector('.collapsed-messages');
                const toggleText = toggleBtn.querySelector('.toggle-text');
                const toggleIcon = toggleBtn.querySelector('.toggle-icon');
                
                if (collapsedMessages.style.display === 'none') {
                    collapsedMessages.style.display = 'block';
                    toggleText.textContent = '收起更早的消息';
                    toggleIcon.textContent = '▲';
                    toggleBtn.classList.add('expanded');
                } else {
                    collapsedMessages.style.display = 'none';
                    toggleText.textContent = `展开 ${olderMessages.length} 条更早的消息`;
                    toggleIcon.textContent = '▼';
                    toggleBtn.classList.remove('expanded');
                }
            });
        }
        
        // 绑定操作按钮
        bindConversationActions(container, userId, username);
        
    } catch (error) {
        console.error('加载对话失败:', error);
        container.innerHTML = '<div class="error-message">加载对话失败</div>';
    }
}

// 渲染单条对话消息
function renderConversationMessage(msg, currentUserId) {
    const isOwn = String(msg.fromUserId) === String(currentUserId);
    const alignClass = isOwn ? 'message-right' : 'message-left';
    
    console.log('消息:', msg.content, '发送者ID:', msg.fromUserId, '当前用户ID:', currentUserId, '是自己:', isOwn);
    
    return `
        <div class="conversation-message ${alignClass} ${!msg.isRead && !isOwn ? 'unread' : ''}" data-message-id="${msg._id}">
            ${!isOwn ? `<div class="message-username">${msg.fromUsername}</div>` : ''}
            ${msg.replyToContent || msg.originalCardContent ? `
            <div class="message-context">
                ${msg.replyToContent ? `回复: "${msg.replyToContent}"` : `回复卡片: "${msg.originalCardContent}"`}
            </div>
            ` : ''}
            <div class="message-text-content">
                ${msg.content}
            </div>
            <div class="message-time">${Utils.formatDate(msg.createdAt)}</div>
        </div>
    `;
}

// 绑定对话操作按钮
function bindConversationActions(container, userId, username) {
    // 回复按钮
    const replyBtn = container.querySelector('.btn-reply');
    if (replyBtn) {
        replyBtn.addEventListener('click', async () => {
            // 获取该用户最新的留言ID
            const messages = container.querySelectorAll('.conversation-message.message-left');
            const latestMessage = messages[messages.length - 1];
            const latestMessageId = latestMessage ? latestMessage.dataset.messageId : null;
            
            showReplyModal(userId, username, latestMessageId);
        });
    }
    
    // 全部标为已读按钮
    const markReadBtn = container.querySelector('.btn-mark-read');
    if (markReadBtn) {
        markReadBtn.addEventListener('click', async () => {
            const unreadMessages = container.querySelectorAll('.conversation-message.unread');
            
            try {
                for (const msgEl of unreadMessages) {
                    const messageId = msgEl.dataset.messageId;
                    await API.markMessageRead(messageId);
                    msgEl.classList.remove('unread');
                }
                
                // 更新用户项的未读状态
                const userItem = document.querySelector(`.message-user-item[data-user-id="${userId}"]`);
                if (userItem) {
                    userItem.classList.remove('has-unread');
                    const unreadCount = userItem.querySelector('.unread-count');
                    if (unreadCount) unreadCount.remove();
                }
                
                await loadMessages();
                Utils.showToast('已标记为已读', 'success');
            } catch (error) {
                console.error('标记已读失败:', error);
                Utils.showToast('操作失败', 'error');
            }
        });
    }
    
    // 删除按钮
    const deleteBtn = container.querySelector('.btn-delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (!confirm(`确定要删除与 ${username} 的所有对话吗？`)) {
                return;
            }
            
            try {
                Utils.showLoading();
                await API.deleteMessagesFromUser(userId);
                await loadMessages();
                Utils.showToast('删除成功', 'success');
            } catch (error) {
                console.error('删除留言失败:', error);
                Utils.showToast('删除失败', 'error');
            } finally {
                Utils.hideLoading();
            }
        });
    }
}

// 绑定留言组事件（已废弃，保留以防兼容性问题）
function bindMessageGroupEvents() {
    
    // 绑定回复按钮事件
    document.querySelectorAll('.btn-reply').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.dataset.userId;
            const username = e.target.dataset.username;
            
            // 获取该用户最新的留言ID
            const container = document.querySelector(`.conversation-container[data-user-id="${userId}"]`);
            const messages = container.querySelectorAll('.conversation-message.message-left');
            const latestMessage = messages[messages.length - 1];
            const latestMessageId = latestMessage ? latestMessage.dataset.messageId : null;
            
            // 显示回复模态框
            showReplyModal(userId, username, latestMessageId);
        });
    });
    
    // 绑定全部标为已读按钮
    document.querySelectorAll('.btn-mark-read').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.dataset.userId;
            const messageGroup = e.target.closest('.message-group');
            const unreadMessages = messageGroup.querySelectorAll('.conversation-message.unread');
            
            try {
                // 标记该用户的所有未读留言为已读
                for (const msgEl of unreadMessages) {
                    const messageId = msgEl.dataset.messageId;
                    await API.markMessageRead(messageId);
                    msgEl.classList.remove('unread');
                }
                
                messageGroup.classList.remove('has-unread');
                await loadMessages(); // 重新加载更新徽章
                Utils.showToast('已标记为已读', 'success');
            } catch (error) {
                console.error('标记已读失败:', error);
                Utils.showToast('操作失败', 'error');
            }
        });
    });
    
    // 绑定删除按钮
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.dataset.userId;
            const username = e.target.dataset.username;
            
            if (!confirm(`确定要删除与 ${username} 的所有对话吗？`)) {
                return;
            }
            
            try {
                Utils.showLoading();
                await API.deleteMessagesFromUser(userId);
                await loadMessages(); // 重新加载留言列表
                Utils.showToast('删除成功', 'success');
            } catch (error) {
                console.error('删除留言失败:', error);
                Utils.showToast('删除失败', 'error');
            } finally {
                Utils.hideLoading();
            }
        });
    });
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

function showMessageModal(userId, cardId, username, replyToMessageId = null) {
    document.getElementById('messageToUser').textContent = username;
    document.getElementById('messageContent').value = '';
    document.getElementById('messageCharCount').textContent = '0';
    
    PageManager.showModal('messageModal');
    
    // 保存当前留言目标
    window.currentMessageTarget = { userId, cardId, replyToMessageId };
    
    // 重新绑定发送按钮事件（确保事件监听器生效）
    const sendBtn = document.getElementById('sendMessageModalBtn');
    if (sendBtn) {
        // 移除旧的事件监听器
        const newSendBtn = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
        
        // 添加新的事件监听器
        newSendBtn.addEventListener('click', async () => {
            console.log('发送留言按钮被点击');
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
                    content,
                    window.currentMessageTarget.replyToMessageId // 传递回复链ID
                );
                Utils.showToast('留言发送成功！', 'success');
                PageManager.hideAllModals();
                document.getElementById('messageContent').value = '';
                document.getElementById('messageCharCount').textContent = '0';
            } catch (error) {
                Utils.showToast(error.message, 'error');
            } finally {
                Utils.hideLoading();
            }
        });
    }
    
    // 重新绑定取消按钮
    const modalCancelBtns = document.querySelectorAll('#messageModal .modal-cancel');
    modalCancelBtns.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', () => {
            console.log('取消按钮被点击');
            PageManager.hideAllModals();
        });
    });
    
    // 重新绑定关闭按钮
    const modalCloseBtns = document.querySelectorAll('#messageModal .modal-close');
    modalCloseBtns.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', () => {
            console.log('关闭按钮被点击');
            PageManager.hideAllModals();
        });
    });
}

async function showReplyModal(userId, username, replyToMessageId = null) {
    // 获取对方的卡片ID
    try {
        const data = await API.getUserCard(userId);
        
        if (data.card) {
            showMessageModal(userId, data.card._id, username, replyToMessageId);
        } else {
            Utils.showToast('该用户还没有创建卡片', 'error');
        }
    } catch (error) {
        console.error('获取卡片信息失败:', error);
        Utils.showToast(error.message || '回复失败，请稍后重试', 'error');
    }
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
    
    // 取消匹配
    document.getElementById('cancelMatchBtn').addEventListener('click', () => {
        if (appState.socket) {
            appState.socket.emit('cancelMatching');
        }
        PageManager.showPage('main');
        PageManager.showTab('chat');
        Utils.showToast('已取消匹配', 'info');
    });
    
    // 结束聊天
    document.getElementById('endChatBtn').addEventListener('click', () => {
        if (!confirm('确定要结束聊天吗？')) return;
        
        if (appState.socket) {
            appState.socket.emit('endChat');
        }
        
        document.getElementById('chatMessages').innerHTML = '';
        PageManager.showPage('main');
        PageManager.showTab('chat');
        Utils.showToast('已结束聊天', 'info');
    });
    
    // 发送消息
    document.getElementById('sendMessageBtn').addEventListener('click', () => {
        sendChatMessage();
    });
    
    document.getElementById('messageText').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    
    // 输入状态
    let typingTimer;
    document.getElementById('messageText').addEventListener('input', () => {
        if (appState.socket) {
            appState.socket.emit('typing');
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => {
                appState.socket.emit('stopTyping');
            }, 1000);
        }
    });
    
    // 上传照片
    document.getElementById('uploadPhotoBtn').addEventListener('click', () => {
        document.getElementById('photoInput').click();
    });
    
    document.getElementById('photoInput').addEventListener('change', (e) => {
        handlePhotoUpload(e);
    });
    
    // 表情包
    document.getElementById('showEmojiBtn').addEventListener('click', () => {
        document.getElementById('emojiPanel').classList.toggle('show');
    });
    
    document.querySelectorAll('.emoji').forEach(emoji => {
        emoji.addEventListener('click', () => {
            const textarea = document.getElementById('messageText');
            textarea.value += emoji.textContent;
            textarea.focus();
            document.getElementById('emojiPanel').classList.remove('show');
        });
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
    
    socket.on('chatEnded', (data) => {
        addSystemMessage(data.message);
        setTimeout(() => {
            PageManager.showPage('main');
            PageManager.showTab('chat');
        }, 2000);
    });
}

function sendChatMessage() {
    const textarea = document.getElementById('messageText');
    const message = textarea.value.trim();
    
    if (!message || !appState.socket) return;
    
    // 发送消息
    appState.socket.emit('sendMessage', {
        content: message,
        type: 'text'
    });
    
    // 显示自己的消息
    addChatMessage(message, true);
    
    // 清空输入框
    textarea.value = '';
    textarea.style.height = 'auto';
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file || !appState.socket) return;
    
    if (!file.type.startsWith('image/')) {
        Utils.showToast('请选择图片文件', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        Utils.showToast('图片大小不能超过10MB', 'error');
        return;
    }
    
    Utils.showToast('正在处理图片...', 'info');
    
    compressImage(file, (compressedDataUrl) => {
        // 发送图片
        appState.socket.emit('sendMessage', {
            content: compressedDataUrl,
            type: 'image'
        });
        
        // 显示自己的图片
        addChatMessage(compressedDataUrl, true, true);
    });
    
    // 清空文件输入
    event.target.value = '';
}

function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            const maxSize = 800;
            if (width > height) {
                if (width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            callback(compressedDataUrl);
        };
        img.onerror = () => {
            Utils.showToast('图片加载失败', 'error');
        };
        img.src = e.target.result;
    };
    reader.onerror = () => {
        Utils.showToast('图片读取失败', 'error');
    };
    reader.readAsDataURL(file);
}

// 模态框事件
function bindModalEvents() {
    console.log('绑定模态框事件...');
    
    // 点击模态框外部关闭
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal') && e.target.classList.contains('show')) {
            console.log('点击了模态框外部');
            PageManager.hideAllModals();
        }
    });
    
    // 保存卡片按钮
    const saveCardBtn = document.getElementById('saveCardBtn');
    if (saveCardBtn) {
        console.log('找到保存卡片按钮');
        saveCardBtn.addEventListener('click', async function(e) {
            console.log('点击了保存卡片按钮');
            e.preventDefault();
            e.stopPropagation();
            
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
                // 刷新我的卡片显示
                await loadMyCard();
            } catch (error) {
                Utils.showToast(error.message, 'error');
            } finally {
                Utils.hideLoading();
            }
        });
    }
    
    // 卡片模态框的取消和关闭按钮
    const cardModalCancelBtns = document.querySelectorAll('#cardModal .modal-cancel, #cardModal .modal-close');
    cardModalCancelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('卡片模态框关闭按钮被点击');
            PageManager.hideAllModals();
        });
    });
    
    // 字符计数
    const cardContent = document.getElementById('cardContent');
    if (cardContent) {
        cardContent.addEventListener('input', (e) => {
            document.getElementById('cardCharCount').textContent = e.target.value.length;
        });
    }
    
    const messageContent = document.getElementById('messageContent');
    if (messageContent) {
        messageContent.addEventListener('input', (e) => {
            document.getElementById('messageCharCount').textContent = e.target.value.length;
        });
    }
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
