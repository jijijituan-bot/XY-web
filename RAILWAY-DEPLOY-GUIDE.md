# Railway 部署指南 - 用户系统版本

## 🚀 快速部署步骤

### 第一步：添加MongoDB数据库

1. 登录 https://railway.app/
2. 进入你的项目（XY-web）
3. 点击右上角 **"New"** 按钮
4. 选择 **"Database"**
5. 选择 **"Add MongoDB"**
6. 等待MongoDB实例创建完成（约30秒）

✅ Railway会自动创建环境变量 `MONGODB_URI`

### 第二步：添加Session密钥

1. 在项目页面，点击你的服务（不是数据库）
2. 进入 **"Variables"** 标签
3. 点击 **"New Variable"**
4. 添加以下变量：

```
变量名: SESSION_SECRET
变量值: 随机字符串（例如：my-super-secret-key-xyz-12345）
```

⚠️ 重要：这个密钥用于加密session，请使用随机字符串！

### 第三步：等待自动部署

1. Railway检测到GitHub更新会自动重新部署
2. 在 **"Deployments"** 标签查看部署进度
3. 等待显示 **"Success"** 状态（约2-3分钟）

### 第四步：查看日志确认

在 **"Logs"** 标签中，你应该看到：

```
✅ MongoDB连接成功
🚀 服务器运行在 http://localhost:3000
✨ 心洞述说系统已启动（带用户系统）
```

### 第五步：访问网站

1. 进入 **"Settings"** 标签
2. 找到 **"Domains"** 部分
3. 点击你的域名访问网站

## 📋 环境变量检查清单

确保以下环境变量已设置：

- ✅ `MONGODB_URI` - 自动生成（由MongoDB插件提供）
- ✅ `SESSION_SECRET` - 手动添加（你设置的随机字符串）
- ✅ `PORT` - 自动设置（Railway提供）

## 🔍 故障排除

### 问题1：部署失败

**检查：**
1. 查看 Logs 标签的错误信息
2. 确认 package.json 中的依赖是否正确
3. 确认 MongoDB 已成功创建

**解决：**
```bash
# 如果是依赖问题，在本地测试
npm install
npm start
```

### 问题2：MongoDB连接失败

**检查：**
1. MongoDB实例是否正在运行（绿色状态）
2. MONGODB_URI 环境变量是否存在

**解决：**
1. 删除MongoDB实例
2. 重新添加MongoDB
3. 等待自动重新部署

### 问题3：Session错误

**检查：**
1. SESSION_SECRET 是否已设置
2. 浏览器Cookie是否被阻止

**解决：**
1. 添加 SESSION_SECRET 环境变量
2. 清除浏览器Cookie
3. 重新部署

### 问题4：网站无法访问

**检查：**
1. 部署状态是否为 Success
2. 域名是否已生成

**解决：**
1. 在 Settings → Domains 生成新域名
2. 等待DNS传播（约1-2分钟）

## 📊 部署后验证

### 1. 检查服务器状态

访问：`https://your-domain.up.railway.app/api/stats`

应该返回：
```json
{
  "totalUsers": 0,
  "waitingUsers": 0,
  "activeChatRooms": 0
}
```

### 2. 测试用户注册

使用Postman或curl测试：

```bash
curl -X POST https://your-domain.up.railway.app/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"123456"}'
```

应该返回：
```json
{
  "success": true,
  "user": {
    "id": "...",
    "username": "testuser",
    "bio": "",
    "gender": "other"
  }
}
```

### 3. 检查MongoDB数据

1. 在Railway项目中点击MongoDB
2. 进入 "Data" 标签
3. 应该能看到 `users` 集合
4. 里面有刚注册的测试用户

## 🎯 下一步

### 前端开发

目前后端API已完成，但前端还是旧版本。需要：

1. 创建登录/注册页面
2. 创建卡片浏览界面
3. 实现留言功能
4. 整合用户系统

### 临时测试方法

在前端完成之前，可以使用：

1. **Postman** - 测试所有API接口
2. **MongoDB Compass** - 查看数据库数据
3. **Railway Logs** - 监控服务器运行

## 📱 API接口列表

### 用户认证
- `POST /api/register` - 注册新用户
- `POST /api/login` - 用户登录
- `POST /api/logout` - 用户登出
- `GET /api/user` - 获取当前用户信息
- `PUT /api/user/profile` - 更新用户资料

### 卡片功能
- `POST /api/cards` - 创建/更新个人卡片
- `GET /api/cards` - 获取其他用户的卡片列表

### 留言功能
- `POST /api/messages` - 发送留言
- `GET /api/messages` - 获取收到的留言
- `PUT /api/messages/:id/read` - 标记留言为已读

### 聊天功能（WebSocket）
- 保留原有的随机匹配聊天功能
- Socket.IO连接和事件处理

## 💰 费用说明

**Railway免费额度：**
- $5/月 免费额度
- MongoDB: ~$2-3/月
- Web服务: ~$1-2/月
- 总计: ~$3-5/月（在免费额度内）

**超出后：**
- 按使用量计费
- 可以升级到付费计划

## 🔐 安全建议

1. **生产环境：**
   - 使用强随机SESSION_SECRET
   - 启用HTTPS（Railway自动提供）
   - 定期备份数据库

2. **监控：**
   - 定期查看Railway Logs
   - 监控数据库大小
   - 关注异常登录

3. **更新：**
   - 定期更新依赖包
   - 关注安全漏洞
   - 测试后再部署

## ✅ 部署完成检查清单

- [ ] MongoDB已添加并运行
- [ ] SESSION_SECRET已设置
- [ ] 部署状态显示Success
- [ ] 日志显示"MongoDB连接成功"
- [ ] 可以访问网站域名
- [ ] API接口返回正常
- [ ] 可以注册测试用户

全部完成后，后端就部署成功了！

接下来需要开发前端界面来使用这些API。
