// 应用状态管理
class AppState {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'auth';
        this.socket = null;
        this.cards = [];
        this.messages = [];
    }

    setUser(user) {
        this.currentUser = user;
        localStorage.setItem('user', JSON.stringify(user));
    }

    getUser() {
        if (!this.currentUser) {
            const stored = localStorage.getItem('user');
            if (stored) {
                this.currentUser = JSON.parse(stored);
            }
        }
        return this.currentUser;
    }

    clearUser() {
        this.currentUser = null;
        localStorage.removeItem('user');
    }
}

const appState = new AppState();

// API请求封装
class API {
    static async request(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '请求失败');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    static async register(username, password) {
        return this.request('/api/register', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }

    static async login(username, password) {
        return this.request('/api/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }

    static async logout() {
        return this.request('/api/logout', {
            method: 'POST'
        });
    }

    static async getUser() {
        return this.request('/api/user');
    }

    static async updateProfile(bio, gender) {
        return this.request('/api/user/profile', {
            method: 'PUT',
            body: JSON.stringify({ bio, gender })
        });
    }

    static async createCard(content) {
        return this.request('/api/cards', {
            method: 'POST',
            body: JSON.stringify({ content })
        });
    }

    static async getCards() {
        return this.request('/api/cards');
    }
    
    static async getUserCard(userId) {
        return this.request(`/api/cards/user/${userId}`);
    }

    static async sendMessage(toUserId, cardId, content, replyToMessageId = null) {
        return this.request('/api/messages', {
            method: 'POST',
            body: JSON.stringify({ toUserId, cardId, content, replyToMessageId })
        });
    }

    static async getMessages() {
        return this.request('/api/messages');
    }

    static async getConversation(userId) {
        return this.request(`/api/messages/conversation/${userId}`);
    }

    static async markMessageRead(messageId) {
        return this.request(`/api/messages/${messageId}/read`, {
            method: 'PUT'
        });
    }

    static async deleteMessagesFromUser(userId) {
        return this.request(`/api/messages/user/${userId}`, {
            method: 'DELETE'
        });
    }
}

// 页面管理
class PageManager {
    static showPage(pageName) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        const page = document.getElementById(`${pageName}Page`);
        if (page) {
            page.classList.add('active');
            appState.currentPage = pageName;
        }
    }

    static showTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const tab = document.getElementById(`${tabName}Tab`);
        const navItem = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (tab) tab.classList.add('active');
        if (navItem) navItem.classList.add('active');
    }

    static showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
        }
    }

    static hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    }

    static hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }
}

// 工具函数
class Utils {
    static showLoading() {
        document.getElementById('loading').classList.add('show');
    }

    static hideLoading() {
        document.getElementById('loading').classList.remove('show');
    }

    static showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    static formatTime(date) {
        const d = new Date(date);
        return d.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static formatDate(date) {
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;
        
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
        
        return d.toLocaleDateString('zh-CN');
    }
}

// 导出全局对象
window.appState = appState;
window.API = API;
window.PageManager = PageManager;
window.Utils = Utils;
