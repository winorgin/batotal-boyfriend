import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 首页
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../public/index.html'));
});

// 登录页
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../public/login.html'));
});

// 注册页
router.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../public/register.html'));
});

export default router;
