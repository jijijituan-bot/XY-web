# 数据库设置指南

## 📊 数据库方案：MongoDB

### 方案一：Railway部署（推荐）

#### 步骤1：添加MongoDB数据库

1. 登录 https://railway.app/
2. 进入你的项目
3. 点击 "New" → "Database" → "Add MongoDB"
4. Railway会自动创建MongoDB实例并提供连接字符串

#### 步骤2：配置环境变量

Railway会自动添加以下环境变量：
- `MONGODB_URI` - MongoDB连接字符串（自动生成）

你需要手动添加：
- `SESSION_SECRET` - 随机字符串，用于session加密
  - 例如：`my-super-secret-key-12345`

#### 步骤3：更新代码

1. 将 `server-new.js` 重命名为 `server.js`（替换旧文件）
2. 安装新依赖：`npm install`
3. 推送到GitHub
4. Railway会自动重新部署

### 方案二：本地开发

#### 步骤1：安装MongoDB

**Windows:**
1. 下载：https://www.mongodb.com/try/download/community
2. 安装并启动MongoDB服务

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

#### 步骤2：创建.env文件

在项目根目录创建 `.env` 文件：

```env
MONGODB_URI=mongodb://localhost:27017/anonymous-chat
SESSION_SECRET=your-secret-key-change-this
PORT=3000
```

#### 步骤3：安装依赖并启动

```bash
npm install
npm start
```

## 🗄️ 数据库结构

### Users 集合（用户表）
```javascript
{
  _id: ObjectId,
  username: String,      // 用户名（唯一）
  password: String,      // 加密后的密码
  bio: String,          // 个人简介
  gender: String,       // 性别：male/female/other
  createdAt: Date,      // 注册时间
  lastActive: Date      // 最后活跃时间
}
```

### Cards 集合（卡片表）
```javascript
{
  _id: ObjectId,
  userId: ObjectId,     // 用户ID（关联Users）
  username: String,     // 用户名
  content: String,      // 卡片内容
  gender: String,       // 性别
  createdAt: Date,      // 创建时间
  viewCount: Number     // 浏览次数
}
```

### Messages 集合（留言表）
```javascript
{
  _id: ObjectId,
  fromUserId: ObjectId,    // 发送者ID
  fromUsername: String,    // 发送者用户名
  toUserId: ObjectId,      // 接收者ID
  toUsername: String,      // 接收者用户名
  cardId: ObjectId,        // 关联的卡片ID
  content: String,         // 留言内容
  isRead: Boolean,         // 是否已读
  createdAt: Date          // 发送时间
}
```

## 🔐 安全说明

1. **密码加密**：使用bcryptjs加密，不存储明文密码
2. **Session管理**：使用express-session + MongoDB存储
3. **环境变量**：敏感信息存储在.env文件中
4. **输入验证**：所有用户输入都经过验证和清理

## 🚀 API接口

### 用户认证
- `POST /api/register` - 注册
- `POST /api/login` - 登录
- `POST /api/logout` - 登出
- `GET /api/user` - 获取当前用户信息
- `PUT /api/user/profile` - 更新用户资料

### 卡片功能
- `POST /api/cards` - 创建/更新卡片
- `GET /api/cards` - 获取卡片列表（不包括自己的）

### 留言功能
- `POST /api/messages` - 发送留言
- `GET /api/messages` - 获取收到的留言
- `PUT /api/messages/:id/read` - 标记留言为已读

## 📝 测试数据

可以使用以下命令创建测试用户：

```javascript
// 在MongoDB shell中执行
use anonymous-chat

// 创建测试用户（密码会在注册时自动加密）
// 通过API注册：
POST /api/register
{
  "username": "testuser",
  "password": "123456"
}
```

## ⚠️ 注意事项

1. **生产环境**：
   - 必须更改 `SESSION_SECRET` 为强随机字符串
   - 启用HTTPS
   - 设置 `NODE_ENV=production`

2. **Railway部署**：
   - MongoDB连接字符串会自动配置
   - 确保添加了 `SESSION_SECRET` 环境变量

3. **备份**：
   - Railway提供自动备份
   - 本地开发建议定期导出数据

## 🔧 故障排除

### 连接失败
- 检查MongoDB是否运行
- 验证连接字符串格式
- 检查网络和防火墙设置

### Session问题
- 清除浏览器Cookie
- 检查SESSION_SECRET是否设置
- 验证MongoDB连接

### 部署问题
- 查看Railway日志
- 确认环境变量已设置
- 检查依赖是否正确安装
