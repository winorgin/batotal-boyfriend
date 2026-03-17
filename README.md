# AI Boyfriend - 统一多平台项目

一个完全整合的 AI 男友系统，支持 Web 界面和 Discord 机器人双平台。

## 🌟 项目特点

### 多平台支持
- 🌐 **Web 界面** - 现代化的网页聊天体验
- 💬 **Discord 机器人** - 在 Discord 服务器中互动
- 🔄 **数据同步** - 两个平台共享用户数据和聊天历史

### 核心功能
- 🤖 **智能对话** - 基于 AI 的自然对话
- 💝 **情感分析** - 识别和响应用户情绪
- 🎭 **性格系统** - 动态性格调整
- 🧠 **灵魂记忆** - 长期记忆和上下文理解
- 💰 **支付系统** - DOL 虚拟货币和充值
- 📊 **关系管理** - 亲密度和关系阶段
- 🎨 **图片生成** - AI 生成个性化图片
- 🗣️ **语音功能** - 文字转语音

### 技术栈
- **后端框架**: Node.js + Express
- **Web 前端**: HTML5 + JavaScript + CSS3
- **Discord**: Discord.js v14
- **数据库**: Supabase (PostgreSQL)
- **AI 服务**: OpenRouter / 豆包 AI
- **支付**: Creem 支付集成

## 📁 项目结构

```
ai-boyfriend-unified/
├── src/
│   ├── server.js              # 主服务器入口
│   ├── discord/               # Discord 机器人
│   │   ├── bot.js            # Discord 客户端
│   │   ├── commands/         # 斜杠命令
│   │   └── handlers/         # 事件处理
│   ├── web/                   # Web 应用
│   │   ├── routes/           # API 路由
│   │   ├── controllers/      # 控制器
│   │   └── middleware/       # 中间件
│   ├── services/              # 共享服务
│   │   ├── supabase.js       # 数据库服务
│   │   ├── ai.js             # AI 服务
│   │   ├── emotion.js        # 情感分析
│   │   ├── personality.js    # 性格系统
│   │   ├── soul.js           # 灵魂记忆
│   │   ├── payment.js        # 支付服务
│   │   └── relationship.js   # 关系管理
│   └── utils/                 # 工具函数
├── public/                    # 静态文件
│   ├── css/
│   ├── js/
│   └── images/
├── views/                     # HTML 模板
├── database/                  # 数据库架构
├── config/                    # 配置文件
└── tests/                     # 测试文件
```

## 🚀 快速开始

### 1. 环境要求
- Node.js 18+
- npm 或 yarn
- Supabase 账号
- Discord Bot Token
- OpenRouter API Key

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，填入你的配置
```

### 4. 初始化数据库
```bash
# 在 Supabase 控制台执行 database/schema.sql
```

### 5. 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## 🔧 配置说明

### 环境变量
```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_SERVICE_KEY=your_service_key

# Discord
DISCORD_TOKEN=your_discord_token
DISCORD_CLIENT_ID=your_client_id

# AI 服务
OPENROUTER_API_KEY=your_openrouter_key
ARK_API_KEY=your_ark_key
ENDPOINT_ID=your_endpoint_id

# 支付
CREEM_API_KEY=your_creem_key
CREEM_WEBHOOK_SECRET=your_webhook_secret

# 服务器
PORT=3000
NODE_ENV=production
SESSION_SECRET=your_session_secret
```

## 📱 使用方式

### Web 界面
1. 访问 `http://localhost:3000`
2. 注册或登录账号
3. 开始与 AI 男友聊天

### Discord 机器人
1. 邀请机器人到你的服务器
2. 使用 `/chat` 命令开始对话
3. 使用 `/balance` 查看 DOL 余额
4. 使用 `/recharge` 充值 DOL

## 🎯 核心功能详解

### 1. 统一用户系统
- Web 和 Discord 用户可以绑定账号
- 数据在两个平台间实时同步
- 统一的 DOL 余额和亲密度

### 2. 智能对话
- 上下文理解和记忆
- 情感识别和响应
- 性格动态调整
- 主动发起对话

### 3. 关系系统
- 3 个关系阶段：密友 → 恋人 → 灵魂伴侣
- 亲密度积累（密友: 0-499, 恋人: 500-999, 灵魂伴侣: 1000+）
- 特殊时刻记录
- 关系里程碑

### 4. 支付系统
- DOL 虚拟货币
- 多档位充值
- 每日免费 DOL
- 消费记录

### 5. 灵魂记忆
- 长期记忆存储
- 重要事件记录
- 智能记忆检索
- 记忆重要性评分

## 🔌 API 文档

### Web API

#### 用户认证
```
POST /api/auth/register - 注册
POST /api/auth/login - 登录
POST /api/auth/logout - 登出
GET /api/auth/profile - 获取用户信息
```

#### 聊天
```
POST /api/chat/message - 发送消息
GET /api/chat/history - 获取历史记录
GET /api/chat/session - 获取会话信息
```

#### 用户数据
```
GET /api/user/balance - 获取 DOL 余额
GET /api/user/relationship - 获取关系状态
GET /api/user/memories - 获取记忆
GET /api/user/stats - 获取统计信息
```

#### 支付
```
POST /api/payment/create - 创建支付订单
POST /api/payment/webhook - 支付回调
GET /api/payment/history - 支付历史
```

### Discord 命令

#### 基础命令
- `/chat <消息>` - 发送消息
- `/balance` - 查看 DOL 余额
- `/relationship` - 查看关系状态
- `/profile` - 查看个人资料

#### 支付命令
- `/recharge` - 充值 DOL
- `/daily` - 领取每日免费 DOL

#### 管理命令
- `/bind <email>` - 绑定 Web 账号
- `/unbind` - 解绑账号

## 🎨 自定义配置

### 性格配置
编辑 `config/personality.js` 自定义 AI 性格特征。

### 对话风格
编辑 `config/prompts.js` 自定义对话提示词。

### UI 主题
编辑 `public/css/theme.css` 自定义界面主题。

## 📊 数据库架构

### 核心表
- `users` - 统一用户表
- `user_platforms` - 平台账号绑定
- `chat_messages` - 聊天记录
- `relationships` - 关系状态
- `soul_memories` - 灵魂记忆
- `payments` - 支付记录
- `sessions` - 会话管理

详见 `database/schema.sql`

## 🔒 安全性

- 环境变量保护敏感信息
- JWT Token 认证
- SQL 注入防护
- XSS 防护
- CSRF 防护
- 行级安全策略（RLS）

## 🚀 部署

### Railway 部署
```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 部署
railway up
```

### Docker 部署
```bash
# 构建镜像
docker build -t ai-boyfriend .

# 运行容器
docker run -p 3000:3000 --env-file .env ai-boyfriend
```

### Vercel 部署
```bash
# 安装 Vercel CLI
npm install -g vercel

# 部署
vercel
```

## 📈 监控和日志

- 使用 Supabase 仪表板监控数据库
- 使用 Railway/Vercel 日志查看运行状态
- 集成错误追踪（可选）

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- OpenRouter - AI 服务
- Supabase - 数据库服务
- Discord.js - Discord 机器人框架
- 豆包 AI - 中文 AI 服务

## 📞 支持

- 📧 Email: support@example.com
- 💬 Discord: [加入服务器]
- 📖 文档: [查看文档]

---

**版本**: 1.0.0  
**最后更新**: 2026-03-04
