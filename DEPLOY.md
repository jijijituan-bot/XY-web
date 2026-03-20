# Railway 部署指南

## 准备工作

1. 注册 Railway 账号：https://railway.app/
2. 安装 Git（如果还没有）
3. 创建 GitHub 仓库

## 部署步骤

### 方法一：通过 GitHub（推荐）

1. **创建 GitHub 仓库**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/你的用户名/仓库名.git
   git push -u origin main
   ```

2. **在 Railway 部署**
   - 访问 https://railway.app/
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 授权并选择你的仓库
   - Railway 会自动检测 Node.js 项目并部署

3. **获取访问地址**
   - 部署完成后，点击项目
   - 进入 "Settings" → "Domains"
   - 点击 "Generate Domain" 生成公网地址
   - 例如：https://your-app.up.railway.app

### 方法二：通过 Railway CLI

1. **安装 Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **登录 Railway**
   ```bash
   railway login
   ```

3. **初始化项目**
   ```bash
   railway init
   ```

4. **部署**
   ```bash
   railway up
   ```

5. **生成域名**
   ```bash
   railway domain
   ```

## 验证部署

1. 访问生成的域名
2. 打开多个浏览器窗口或设备
3. 在不同窗口输入昵称并开始匹配
4. 测试实时聊天功能

## 常见问题

### WebSocket 连接失败
- 确保 Railway 已正确配置端口
- 检查浏览器控制台是否有错误
- 确认防火墙没有阻止 WebSocket

### 部署失败
- 检查 package.json 中的 engines 字段
- 确保所有依赖都在 dependencies 中
- 查看 Railway 部署日志

### 性能优化
- Railway 免费版有资源限制
- 考虑升级到付费计划以获得更好性能
- 可以添加 Redis 来管理用户会话（高级功能）

## 监控和日志

在 Railway 项目页面：
- 点击 "Deployments" 查看部署历史
- 点击 "Logs" 查看实时日志
- 点击 "Metrics" 查看性能指标

## 成本

- Railway 提供 $5 免费额度/月
- 超出后按使用量计费
- 小型聊天应用通常在免费额度内

## 下一步

部署成功后，你可以：
- 分享链接给朋友测试
- 添加更多功能（用户认证、聊天记录等）
- 自定义域名
- 添加数据库存储聊天历史
