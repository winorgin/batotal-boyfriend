import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

import { SESSION_SECRET } from './config/secrets.js';

// 导入路由
import webRoutes from './web/routes/index.js';
import apiRoutes from './web/routes/api.js';

// 导入 Discord 机器人
import './discord/bot.js';

// 导入 WebSocket 管理器
import wsManager from './services/websocket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8044;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session 配置
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

// 静态文件
app.use(express.static(path.join(__dirname, '../public')));

// 路由
app.use('/', webRoutes);
app.use('/api', apiRoutes);

// 错误处理
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// 创建 HTTP 服务器
const server = http.createServer(app);

// 初始化 WebSocket
wsManager.initialize(server);

// 启动服务器
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Web interface: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server: ws://localhost:${PORT}/ws`);
  console.log(`🤖 Discord bot is starting...`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  wsManager.close();
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default app;
