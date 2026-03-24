# 心洞述说 - 随机匹配系统

一个基于 WebSocket 的实时心洞对话应用，支持随机用户匹配和实时消息传输。

## 功能特点

- ✨ 随机用户匹配
- 💬 实时聊天消息
- 📷 图片分享
- 😊 表情包支持
- 🎨 玻璃质感UI设计
- 📱 响应式设计

## 技术栈

- **后端**: Node.js + Express + Socket.IO
- **前端**: 原生 JavaScript + HTML5 + CSS3
- **实时通信**: WebSocket

## 本地运行

```bash
# 安装依赖
npm install

# 启动服务器
npm start

# 开发模式（自动重启）
npm run dev
```

访问 http://localhost:3000

## 部署到 Railway

1. 在 Railway 创建新项目
2. 连接 GitHub 仓库
3. Railway 会自动检测并部署
4. 部署完成后获得公网访问地址

## 环境变量

- `PORT`: 服务器端口（Railway 自动设置）

## 使用说明

1. 选择性别并输入昵称
2. 点击"开始匹配"
3. 等待系统匹配其他用户
4. 匹配成功后开始聊天
5. 可以发送文字、图片和表情

## 许可证

MIT
