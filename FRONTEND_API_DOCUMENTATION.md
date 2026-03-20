# AI Boyfriend 前端接入完整文档 v2.0

## 📋 版本信息
- **文档版本**: 2.1.0 (Python/FastAPI)
- **最后更新**: 2026-03-19
- **维护者**: AI Boyfriend 开发团队

---

## ⚡ 前端快速接入指南

> **给前端开发者的话**：如果你想快速了解如何接入 API，这个章节就是为你准备的！我们提供了两种接入模式，你可以根据需求选择。

### 📊 两种接入模式对比

| 特性 | HTTP REST API 模式 | WebSocket 实时模式 |
|------|-------------------|-------------------|
| **响应速度** | 2-3秒（完整响应） | <500ms（开始接收） |
| **实现难度** | ⭐⭐ 简单 | ⭐⭐⭐ 中等 |
| **适用场景** | 快速接入、简单对话 | 实时聊天、最佳体验 |
| **推荐度** | 适合快速原型开发 | 适合生产环境 |
| **数据传输** | 一次性完整返回 | 流式分块传输 |

**建议**：先用 HTTP REST API 快速实现基础功能，再升级到 WebSocket 获得更好的用户体验。

---

### 🚀 模式一：HTTP REST API - 5分钟快速接入

这是最简单的接入方式，适合快速开发和测试。

#### 步骤 1️⃣：用户登录获取 Token

```javascript
// 登录接口
async function login(username, email, password) {
  const response = await fetch('http://localhost:8044/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: username,      // 用户名
      email: email,            // 邮箱
      password: password,      // 密码
      platform: 'web'          // 平台类型：'web' 或 'discord'
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // 登录成功，保存 token
    const token = data.data.token;
    localStorage.setItem('token', token);
    console.log('登录成功！Token:', token);
    return token;
  } else {
    console.error('登录失败:', data.message);
    return null;
  }
}

// 使用示例
const token = await login('testuser', 'test@example.com', 'password123');
```

#### 步骤 2️⃣：发送消息并获取完整响应

```javascript
// 发送消息接口（传统模式：2-3秒完整响应）
async function sendMessage(message, token) {
  const response = await fetch('http://localhost:8044/api/chat/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,  // 必须：在请求头中携带 token
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: message,           // 用户消息内容
      useWebSocket: false         // false = 使用传统 HTTP 模式
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // 成功获取 AI 回复
    console.log('AI 回复:', data.data.reply);
    console.log('语音 URL:', data.data.voiceUrl);
    console.log('亲密度变化:', data.data.intimacyChange);
    console.log('当前亲密度:', data.data.newIntimacy);
    console.log('关系阶段:', data.data.relationshipStage);
    return data.data;
  } else {
    console.error('发送失败:', data.message);
    return null;
  }
}

// 使用示例
const result = await sendMessage('你好，今天天气真好！', token);
```

#### 步骤 3️⃣：显示回复和播放语音

```javascript
// 显示 AI 回复
function displayMessage(result) {
  // 1. 显示文字回复
  const messageDiv = document.createElement('div');
  messageDiv.className = 'ai-message';
  messageDiv.textContent = result.reply;
  document.getElementById('chat-container').appendChild(messageDiv);
  
  // 2. 播放语音（如果有）
  if (result.voiceUrl) {
    const audio = new Audio(result.voiceUrl);
    audio.play();
  }
  
  // 3. 更新亲密度显示
  document.getElementById('intimacy').textContent = result.newIntimacy;
  document.getElementById('relationship').textContent = result.relationshipStage;
}

// 使用示例
displayMessage(result);
```

#### 📝 完整的 HTTP 模式示例

```html
<!DOCTYPE html>
<html>
<head>
  <title>AI Boyfriend - HTTP 模式</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; }
    #chat-container { border: 1px solid #ccc; height: 400px; overflow-y: auto; padding: 10px; }
    .user-message { text-align: right; color: blue; margin: 5px 0; }
    .ai-message { text-align: left; color: green; margin: 5px 0; }
    #input-area { margin-top: 10px; }
    #message-input { width: 70%; padding: 5px; }
    #send-btn { width: 25%; padding: 5px; }
  </style>
</head>
<body>
  <h1>AI Boyfriend 聊天（HTTP 模式）</h1>
  
  <!-- 登录区域 -->
  <div id="login-area">
    <input type="text" id="username" placeholder="用户名" />
    <input type="email" id="email" placeholder="邮箱" />
    <input type="password" id="password" placeholder="密码" />
    <button onclick="handleLogin()">登录</button>
  </div>
  
  <!-- 聊天区域 -->
  <div id="chat-area" style="display:none;">
    <div>亲密度: <span id="intimacy">0</span> | 关系: <span id="relationship">密友</span></div>
    <div id="chat-container"></div>
    <div id="input-area">
      <input type="text" id="message-input" placeholder="输入消息..." />
      <button id="send-btn" onclick="handleSend()">发送</button>
    </div>
  </div>

  <script>
    let token = null;

    // 登录处理
    async function handleLogin() {
      const username = document.getElementById('username').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      const response = await fetch('http://localhost:8044/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, platform: 'web' })
      });
      
      const data = await response.json();
      if (data.success) {
        token = data.data.token;
        document.getElementById('login-area').style.display = 'none';
        document.getElementById('chat-area').style.display = 'block';
        alert('登录成功！');
      } else {
        alert('登录失败: ' + data.message);
      }
    }

    // 发送消息处理
    async function handleSend() {
      const input = document.getElementById('message-input');
      const message = input.value.trim();
      if (!message) return;
      
      // 显示用户消息
      addMessage(message, 'user');
      input.value = '';
      
      // 发送到服务器
      const response = await fetch('http://localhost:8044/api/chat/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, useWebSocket: false })
      });
      
      const data = await response.json();
      if (data.success) {
        // 显示 AI 回复
        addMessage(data.data.reply, 'ai');
        
        // 播放语音
        if (data.data.voiceUrl) {
          new Audio(data.data.voiceUrl).play();
        }
        
        // 更新亲密度
        document.getElementById('intimacy').textContent = data.data.newIntimacy;
        document.getElementById('relationship').textContent = data.data.relationshipStage;
      }
    }

    // 添加消息到聊天框
    function addMessage(text, type) {
      const div = document.createElement('div');
      div.className = type + '-message';
      div.textContent = text;
      document.getElementById('chat-container').appendChild(div);
      div.scrollIntoView();
    }

    // 回车发送
    document.getElementById('message-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSend();
    });
  </script>
</body>
</html>
```

---

### ⚡ 模式二：WebSocket - 实时通信接入

这是推荐的接入方式，提供最佳的用户体验（<500ms 响应）。

#### 步骤 1️⃣：建立 WebSocket 连接

```javascript
// 创建 WebSocket 连接（token 通过 URL 参数传递）
function connectWebSocket(token) {
  // 重要：token 直接放在 URL 查询参数中
  const ws = new WebSocket(`ws://localhost:8044/ws?token=${token}`);
  
  // 连接成功
  ws.onopen = () => {
    console.log('WebSocket 连接成功！');
    // v2.0 版本：无需发送额外的认证消息，连接时已自动认证
  };
  
  // 接收消息
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleWebSocketMessage(data);
  };
  
  // 连接关闭
  ws.onclose = () => {
    console.log('WebSocket 连接关闭');
    // 可以实现自动重连
    setTimeout(() => connectWebSocket(token), 3000);
  };
  
  // 连接错误
  ws.onerror = (error) => {
    console.error('WebSocket 错误:', error);
  };
  
  return ws;
}

// 使用示例
const ws = connectWebSocket(token);
```

#### 步骤 2️⃣：监听和处理实时消息

```javascript
// 处理 WebSocket 消息
function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'ping':
      // 心跳消息：必须响应 pong
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
      
    case 'typing':
      // 打字状态：AI 正在输入
      console.log('AI 正在输入...');
      showTypingIndicator(data.isTyping);
      break;
      
    case 'ai_response':
      // AI 回复（流式传输）
      console.log('AI 回复片段:', data.content);
      appendAIMessage(data.content);  // 逐步显示
      
      if (data.isComplete) {
        console.log('AI 回复完成');
        hideTypingIndicator();
      }
      break;
      
    case 'voice_ready':
      // 语音生成完成
      console.log('语音就绪:', data.voiceUrl);
      playVoice(data.voiceUrl);
      break;
      
    case 'intimacy_update':
      // 亲密度更新
      console.log('亲密度变化:', data.intimacyChange);
      updateIntimacy(data.newIntimacy, data.relationshipStage);
      break;
      
    case 'mood_update':
      // 情绪更新
      console.log('AI 情绪变化:', data.mood);
      updateMoodDisplay(data.mood);
      break;
      
    case 'proactive_message':
      // 主动消息（AI 主动发起对话）
      console.log('AI 主动消息:', data.content);
      displayProactiveMessage(data.content, data.voiceUrl);
      break;
      
    case 'error':
      // 错误消息
      console.error('错误:', data.message);
      showError(data.message);
      break;
  }
}

// 辅助函数示例
function showTypingIndicator(isTyping) {
  const indicator = document.getElementById('typing-indicator');
  indicator.style.display = isTyping ? 'block' : 'none';
}

function appendAIMessage(content) {
  const messageDiv = document.getElementById('current-ai-message');
  messageDiv.textContent += content;  // 逐步追加内容
}

function playVoice(voiceUrl) {
  const audio = new Audio(voiceUrl);
  audio.play();
}

function updateIntimacy(intimacy, stage) {
  document.getElementById('intimacy').textContent = intimacy;
  document.getElementById('relationship').textContent = stage;
}
```

#### 步骤 3️⃣：发送消息（WebSocket 模式）

```javascript
// 发送消息（启用 WebSocket 模式）
async function sendMessageWebSocket(message, token) {
  // 注意：仍然通过 HTTP API 发送，但设置 useWebSocket: true
  const response = await fetch('http://localhost:8044/api/chat/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: message,
      useWebSocket: true  // true = 通过 WebSocket 接收响应
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log('消息已发送，等待 WebSocket 响应...');
    // 响应会通过 WebSocket 的 'ai_response' 消息返回
  } else {
    console.error('发送失败:', data.message);
  }
}

// 使用示例
await sendMessageWebSocket('你好！', token);
// 然后在 WebSocket 的 onmessage 中接收 AI 的流式回复
```

#### 📝 完整的 WebSocket 模式示例

```html
<!DOCTYPE html>
<html>
<head>
  <title>AI Boyfriend - WebSocket 模式</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; }
    #chat-container { border: 1px solid #ccc; height: 400px; overflow-y: auto; padding: 10px; }
    .user-message { text-align: right; color: blue; margin: 5px 0; }
    .ai-message { text-align: left; color: green; margin: 5px 0; }
    .typing-indicator { color: gray; font-style: italic; }
    #input-area { margin-top: 10px; }
    #message-input { width: 70%; padding: 5px; }
    #send-btn { width: 25%; padding: 5px; }
  </style>
</head>
<body>
  <h1>AI Boyfriend 聊天（WebSocket 实时模式）</h1>
  
  <!-- 登录区域 -->
  <div id="login-area">
    <input type="text" id="username" placeholder="用户名" />
    <input type="email" id="email" placeholder="邮箱" />
    <input type="password" id="password" placeholder="密码" />
    <button onclick="handleLogin()">登录</button>
  </div>
  
  <!-- 聊天区域 -->
  <div id="chat-area" style="display:none;">
    <div>亲密度: <span id="intimacy">0</span> | 关系: <span id="relationship">密友</span></div>
    <div id="chat-container"></div>
    <div class="typing-indicator" id="typing-indicator" style="display:none;">AI 正在输入...</div>
    <div id="input-area">
      <input type="text" id="message-input" placeholder="输入消息..." />
      <button id="send-btn" onclick="handleSend()">发送</button>
    </div>
  </div>

  <script>
    let token = null;
    let ws = null;
    let currentAIMessageDiv = null;

    // 登录处理
    async function handleLogin() {
      const username = document.getElementById('username').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      const response = await fetch('http://localhost:8044/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, platform: 'web' })
      });
      
      const data = await response.json();
      if (data.success) {
        token = data.data.token;
        document.getElementById('login-area').style.display = 'none';
        document.getElementById('chat-area').style.display = 'block';
        
        // 建立 WebSocket 连接
        connectWebSocket();
        alert('登录成功！WebSocket 已连接');
      } else {
        alert('登录失败: ' + data.message);
      }
    }

    // 建立 WebSocket 连接
    function connectWebSocket() {
      ws = new WebSocket(`ws://localhost:8044/ws?token=${token}`);
      
      ws.onopen = () => {
        console.log('WebSocket 连接成功');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
      };
      
      ws.onclose = () => {
        console.log('WebSocket 连接关闭，3秒后重连...');
        setTimeout(connectWebSocket, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket 错误:', error);
      };
    }

    // 处理 WebSocket 消息
    function handleMessage(data) {
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
          
        case 'typing':
          document.getElementById('typing-indicator').style.display = 
            data.isTyping ? 'block' : 'none';
          break;
          
        case 'ai_response':
          if (!currentAIMessageDiv) {
            currentAIMessageDiv = document.createElement('div');
            currentAIMessageDiv.className = 'ai-message';
            document.getElementById('chat-container').appendChild(currentAIMessageDiv);
          }
          currentAIMessageDiv.textContent += data.content;
          currentAIMessageDiv.scrollIntoView();
          
          if (data.isComplete) {
            currentAIMessageDiv = null;
            document.getElementById('typing-indicator').style.display = 'none';
          }
          break;
          
        case 'voice_ready':
          new Audio(data.voiceUrl).play();
          break;
          
        case 'intimacy_update':
          document.getElementById('intimacy').textContent = data.newIntimacy;
          document.getElementById('relationship').textContent = data.relationshipStage;
          break;
      }
    }

    // 发送消息处理
    async function handleSend() {
      const input = document.getElementById('message-input');
      const message = input.value.trim();
      if (!message) return;
      
      // 显示用户消息
      const userDiv = document.createElement('div');
      userDiv.className = 'user-message';
      userDiv.textContent = message;
      document.getElementById('chat-container').appendChild(userDiv);
      userDiv.scrollIntoView();
      input.value = '';
      
      // 发送到服务器（WebSocket 模式）
      await fetch('http://localhost:8044/api/chat/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, useWebSocket: true })
      });
      
      // AI 的回复会通过 WebSocket 实时返回
    }

    // 回车发送
    document.getElementById('message-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSend();
    });
  </script>
</body>
</html>
```

---

### ❓ 常见问题解答

#### Q1: Token 是什么？如何使用？
**A:** Token 是用户身份凭证，登录成功后获得。使用方式：
- HTTP 请求：在请求头中添加 `Authorization: Bearer <token>`
- WebSocket：在连接 URL 中添加 `?token=<token>`

#### Q2: 两种模式如何选择？
**A:** 
- **快速开发/测试**：使用 HTTP REST API 模式，简单直接
- **生产环境/最佳体验**：使用 WebSocket 模式，响应更快（<500ms）

#### Q3: WebSocket 断开后如何处理？
**A:** 实现自动重连机制：
```javascript
ws.onclose = () => {
  console.log('连接断开，3秒后重连...');
  setTimeout(() => connectWebSocket(token), 3000);
};
```

#### Q4: 如何处理错误？
**A:** 
- HTTP 模式：检查 `response.json()` 中的 `success` 字段
- WebSocket 模式：监听 `type: 'error'` 消息

#### Q5: 心跳消息（ping/pong）是什么？
**A:** 服务器每 30 秒发送 `ping`，客户端必须响应 `pong`，否则连接会断开：
```javascript
if (data.type === 'ping') {
  ws.send(JSON.stringify({ type: 'pong' }));
}
```

#### Q6: 如何获取聊天历史？
**A:** 使用 HTTP API：
```javascript
const response = await fetch('http://localhost:8044/api/chat/history?limit=20', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
console.log(data.data.messages);
```

#### Q7: 语音文件如何播放？
**A:** 使用 HTML5 Audio：
```javascript
const audio = new Audio(voiceUrl);
audio.play();
```

#### Q8: 如何实现打字指示器？
**A:** 监听 WebSocket 的 `typing` 消息：
```javascript
if (data.type === 'typing') {
  document.getElementById('typing-indicator').style.display = 
    data.isTyping ? 'block' : 'none';
}
```

---

### 🎯 下一步

现在你已经了解了两种接入模式的基本用法！

- **详细的 API 文档**：继续阅读下面的完整文档
- **高级功能**：查看第 6 章「AI 核心功能」了解情感系统、记忆系统等
- **性能优化**：查看第 12 章「性能优化最佳实践」
- **完整示例**：查看第 13 章「完整示例代码」

---

## 🔄 重要变更说明

### v2.0 主要变更（从 Node.js 迁移到 Python）

**技术栈升级**：
- 后端框架：Node.js/Express → **Python 3.12 + FastAPI**
- WebSocket：ws → **python-socketio**
- 数据库客户端：Supabase JS SDK → **Supabase Python SDK**
- 认证：自定义JWT → **FastAPI + PyJWT**

**API变更**：
- 服务器端口：3000 → **8044**
- API路径前缀：所有端点添加 `/api` 前缀
- WebSocket路径：`ws://localhost:3000` → **`ws://localhost:8044/ws`**
- WebSocket认证：消息认证 → **查询参数认证**

**性能提升**：
- 响应时间：8-12秒 → **2-3秒** (75-80% 改善)
- WebSocket快速响应：**< 500ms**
- 新增后台任务处理、并行化、缓存机制

### v2.1 主要变更（安全与规范化）

**认证增强**：
- 注册/登录均需提供邮箱（`email` 字段必填）
- 响应中不再包含 `password_hash` 字段
- JWT_SECRET 和 SESSION_SECRET 强制要求 ≥ 32 字节

**统一响应格式**：
- 所有 API 响应统一为 `{code, message, success, data}` 四字段格式
- 新增 `code` 整型字段（200 = 成功，400/401/500 等 = 错误）
- `success` 字段仍保留（与 `code === 200` 等价）
- 错误响应 `data` 字段为 `null`

**其他优化**：
- 新增 `HEAD /` 路由，消除服务探测产生的 405 日志噪声

---

## 目录
1. [项目概述与架构](#1-项目概述与架构)
2. [快速开始指南](#2-快速开始指南)
3. [认证系统](#3-认证系统)
4. [聊天系统](#4-聊天系统)
5. [WebSocket 实时通信](#5-websocket-实时通信)
6. [AI 核心功能](#6-ai-核心功能)
7. [用户系统](#7-用户系统)
8. [支付系统](#8-支付系统)
9. [语音功能](#9-语音功能)
10. [数据模型](#10-数据模型)
11. [错误处理与状态码](#11-错误处理与状态码)
12. [性能优化最佳实践](#12-性能优化最佳实践)
13. [完整示例代码](#13-完整示例代码)
14. [从 v1.0 迁移指南](#14-从-v10-迁移指南)

---

## 1. 项目概述与架构

### 1.1 项目简介
AI Boyfriend 是一个多平台智能对话系统，支持 Web 和 Discord 平台。核心特性包括：
- 🤖 **智能 AI 对话**：基于 OpenRouter 和豆包 AI
- 💭 **情感状态机**：5 种情绪状态动态切换
- 🧠 **分层记忆系统**：5 种记忆类型，4 级重要性
- 💝 **关系系统**：3 个阶段（密友、恋人、灵魂伴侣）
- 🎭 **个性系统**：5 种性格特征动态调整
- 🔊 **语音生成**：Edge TTS，场景感知
- ⚡ **实时通信**：WebSocket 双模式响应（< 500ms）
- 🌍 **多语言支持**：自动检测并切换语言，支持fallback
- 🚀 **高性能**：2-3秒响应时间，75-80%性能提升

### 1.2 技术栈
- **后端**：Python 3.12 + FastAPI + Uvicorn
- **数据库**：Supabase (PostgreSQL)
- **AI 服务**：OpenRouter (Discord) / 豆包 AI (Web)
- **实时通信**：python-socketio
- **认证**：FastAPI + PyJWT
- **语音**：Edge TTS
- **包管理**：uv

### 1.3 架构图
```
┌─────────────┐
│   前端      │
│  (Web/App)  │
└──────┬──────┘
       │
       ├─── HTTP API (REST)
       │    ├─ 认证 (/api/auth/*)
       │    ├─ 聊天 (/api/chat/*)
       │    └─ 用户 (/api/user/*)
       │
       └─── WebSocket (/ws?token=xxx)
            ├─ AI 响应流式传输
            ├─ 语音就绪通知
            ├─ 亲密度更新
            └─ 打字状态
```

### 1.4 核心服务模块
- **AI Service** (`app/services/ai_service.py`)：统一 AI 接口，语言检测
- **Emotion Service** (`app/services/emotion_service.py`)：情感分析与状态机
- **Memory Service** (`app/services/memory_service.py`)：记忆提取与检索
- **Personality Service** (`app/services/personality_service.py`)：个性特征管理
- **Voice Service** (`app/services/voice_service.py`)：语音生成
- **WebSocket Service** (`app/services/websocket_service.py`)：实时通信管理

### 1.5 性能优化特性
- **后台任务处理**：记忆更新、情绪分析异步执行
- **并行化处理**：记忆检索、情绪分析、个性更新同时进行
- **用户数据缓存**：5分钟TTL，减少数据库查询
- **批量数据库操作**：记忆访问时间批量更新
- **智能语言检测**：自动fallback到用户偏好语言

---

## 2. 快速开始指南

### 2.1 环境要求
- Python >= 3.12
- uv 包管理器
- Supabase 账号

### 2.2 安装依赖
```bash
# 使用 uv 安装依赖
uv sync
```

### 2.3 环境变量配置
创建 `.env` 文件：
```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# JWT
JWT_SECRET=your_jwt_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# AI Services
OPENROUTER_API_KEY=your_openrouter_key
DOUBAO_API_KEY=your_doubao_key

# Server
PORT=8044
HOST=0.0.0.0
```

### 2.4 启动服务
```bash
# 开发模式
uv run uvicorn main:app --host 0.0.0.0 --port 8044 --reload

# 生产模式
uv run uvicorn main:app --host 0.0.0.0 --port 8044
```

### 2.5 基础连接测试
```javascript
// 测试 HTTP API
fetch('http://localhost:8044/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    platform: 'web'
  })
});

// 测试 WebSocket (需要先获取token)
const token = 'your_jwt_token';
const ws = new WebSocket(`ws://localhost:8044/ws?token=${token}`);
ws.onopen = () => console.log('WebSocket 连接成功');
```

---

## 3. 认证系统

### 3.1 用户注册

**接口**：`POST /api/auth/register`

**请求体**：
```json
{
  "username": "string (必填，3-20字符)",
  "email": "string (必填，邮箱地址)",
  "password": "string (必填，6-50字符)",
  "platform": "string (可选，默认 'web'，'web' 或 'discord')"
}
```

**响应**：
```json
{
  "code": 200,
  "message": "注册成功",
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "testuser",
      "email": "test@example.com",
      "platform": "web",
      "intimacy": 0,
      "dol_balance": 0,
      "created_at": "2026-03-18T06:46:22.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**错误响应**：
```json
{
  "success": false,
  "message": "用户名或邮箱已存在"
}
```

### 3.2 用户登录

**接口**：`POST /api/auth/login`

**请求体**：
```json
{
  "username": "string (必填)",
  "email": "string (必填，邮箱地址)",
  "password": "string (必填)",
  "platform": "string (可选，默认 'web'，'web' 或 'discord')"
}
```

**响应**：
```json
{
  "code": 200,
  "message": "登录成功",
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "testuser",
      "email": "test@example.com",
      "platform": "web",
      "intimacy": 150,
      "dol_balance": 100,
      "relationship_stage": "密友"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3.3 获取当前用户信息

**接口**：`GET /api/auth/me`

**请求头**：
```
Authorization: Bearer <token>
```

**响应**：
```json
{
  "code": 200,
  "message": "success",
  "success": true,
  "data": {
    "id": "uuid",
    "username": "testuser",
    "email": "test@example.com",
    "platform": "web",
    "intimacy": 150,
    "dol_balance": 100,
    "relationship_stage": "密友",
    "current_mood": "happy",
    "personality_traits": {
      "cheerful": 0.7,
      "caring": 0.8,
      "playful": 0.6,
      "serious": 0.4,
      "romantic": 0.5
    }
  }
}
```

### 3.4 用户登出

**接口**：`POST /api/auth/logout`

**请求头**：
```
Authorization: Bearer <token>
```

**响应**：
```json
{
  "code": 200,
  "message": "登出成功",
  "success": true,
  "data": null
}
```

### 3.5 JWT Token 使用说明

**Token 格式**：
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token 有效期**：7 天（10080 分钟）

**Token 刷新**：需要重新登录获取新 Token

---

## 4. 聊天系统

### 4.1 发送消息

**接口**：`POST /api/chat/send`

**请求头**：
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**：
```json
{
  "message": "string (必填，消息内容)",
  "useWebSocket": "boolean (可选，默认 false)"
}
```

**响应（传统模式）**：
```json
{
  "code": 200,
  "message": "success",
  "success": true,
  "data": {
    "reply": "AI 的完整回复内容",
    "voiceUrl": "https://example.com/voice/abc123.mp3",
    "intimacyChange": 2,
    "newIntimacy": 152,
    "relationshipStage": "密友",
    "currentMood": "happy",
    "messageId": "uuid"
  }
}
```

**响应（WebSocket 模式）**：
```json
{
  "code": 200,
  "message": "success",
  "success": true,
  "data": {
    "message": "消息已通过 WebSocket 发送",
    "useWebSocket": true
  }
}
```

**性能说明**：
- 传统模式：2-3秒完整响应
- WebSocket模式：< 500ms 开始接收响应

### 4.2 获取聊天历史

**接口**：`GET /api/chat/history`

**请求头**：
```
Authorization: Bearer <token>
```

**查询参数**：
```
limit: number (可选，默认 50，最大 100)
offset: number (可选，默认 0)
```

**响应**：
```json
{
  "code": 200,
  "message": "success",
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "message": "用户消息",
        "reply": "AI 回复",
        "voice_url": "https://example.com/voice/abc123.mp3",
        "intimacy_change": 2,
        "created_at": "2026-03-18T06:46:22.000Z"
      }
    ],
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

### 4.3 消息发送说明

当前版本未启用固定的逐条消息冷却时间。

**建议**：
- 前端在请求发送中禁用发送按钮，避免重复提交
- 如果需要限流，优先在网关或业务层按实际运营策略配置

---

## 5. WebSocket 实时通信

### 5.1 连接建立

**WebSocket URL**：
```
ws://localhost:8044/ws?token=<your_jwt_token>
```

**连接示例**：
```javascript
const token = 'your_jwt_token';
const ws = new WebSocket(`ws://localhost:8044/ws?token=${token}`);

ws.onopen = () => {
  console.log('WebSocket 连接成功');
  // 无需额外认证，token已通过查询参数传递
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('收到消息:', data);
};

ws.onerror = (error) => {
  console.error('WebSocket 错误:', error);
};

ws.onclose = () => {
  console.log('WebSocket 连接关闭');
};
```

### 5.2 认证流程

**v2.0 简化认证**：
- Token 通过 URL 查询参数传递：`ws://localhost:8044/ws?token=xxx`
- 连接建立时自动验证
- 无需发送额外的认证消息

**认证失败处理**：
- 连接会立即关闭
- 客户端收到 `close` 事件
- 需要重新获取有效 token 后重连

### 5.3 心跳机制

**服务器发送（每 30 秒）**：
```json
{
  "type": "ping"
}
```

**客户端响应**：
```json
{
  "type": "pong"
}
```

**超时处理**：
- 如果 60 秒内未收到 pong，服务器将断开连接
- 客户端应实现自动重连机制

### 5.4 消息类型

#### 5.4.1 AI 响应（流式传输）

**服务器发送**：
```json
{
  "type": "ai_response",
  "content": "AI 回复的部分内容",
  "isComplete": false,
  "messageId": "uuid"
}
```

**完成标志**：
```json
{
  "type": "ai_response",
  "content": "最后一部分内容",
  "isComplete": true,
  "messageId": "uuid"
}
```

#### 5.4.2 语音就绪通知

**服务器发送**：
```json
{
  "type": "voice_ready",
  "voiceUrl": "https://example.com/voice/abc123.mp3",
  "messageId": "uuid"
}
```

#### 5.4.3 亲密度更新

**服务器发送**：
```json
{
  "type": "intimacy_update",
  "intimacyChange": 2,
  "newIntimacy": 152,
  "relationshipStage": "密友"
}
```

#### 5.4.4 打字状态

**服务器发送**：
```json
{
  "type": "typing",
  "isTyping": true
}
```

#### 5.4.5 情绪更新

**服务器发送**：
```json
{
  "type": "mood_update",
  "mood": "happy",
  "reason": "用户的积极互动"
}
```

#### 5.4.6 主动消息

**服务器发送**：
```json
{
  "type": "proactive_message",
  "content": "嘿，好久不见了，最近怎么样？",
  "trigger": "time_based",
  "voiceUrl": "https://example.com/voice/def456.mp3"
}
```

#### 5.4.7 错误消息

**服务器发送**：
```json
{
  "type": "error",
  "message": "错误描述",
  "code": "ERROR_CODE"
}
```

#### 5.4.8 系统通知

**服务器发送**：
```json
{
  "type": "system",
  "message": "系统维护通知",
  "level": "info"
}
```

### 5.5 双模式响应机制

**快速响应模式（< 500ms）**：
1. 客户端发送消息时设置 `useWebSocket: true`
2. 服务器立即通过 WebSocket 发送打字状态
3. 流式传输 AI 响应（分块发送）
4. 异步生成语音，完成后发送通知

**传统模式（完整处理，2-3秒）**：
1. 客户端发送消息时设置 `useWebSocket: false`
2. 服务器完整处理后返回 HTTP 响应
3. 包含完整回复和语音 URL

### 5.6 自动重连机制

**客户端实现示例**：
```javascript
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectInterval = 3000;

function connectWebSocket(token) {
  const ws = new WebSocket(`ws://localhost:8044/ws?token=${token}`);
  
  ws.onopen = () => {
    reconnectAttempts = 0;
    console.log('WebSocket 连接成功');
  };
  
  ws.onclose = () => {
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      console.log(`尝试重连 (${reconnectAttempts}/${maxReconnectAttempts})...`);
      setTimeout(() => connectWebSocket(token), reconnectInterval);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket 错误:', error);
  };
  
  return ws;
}
```

---

## 6. AI 核心功能

### 6.1 AI 服务配置

**平台差异**：
- **Web 平台**：使用豆包 AI
- **Discord 平台**：使用 OpenRouter

**模型选择**：
- 豆包 AI：`ep-20241218105759-xfqxh`
- OpenRouter：`anthropic/claude-3.5-sonnet`

### 6.2 系统提示词构建

**核心组成部分**：
1. **超强制语言指令**：确保 AI 使用用户的语言回复
2. **Elio 人设**：35 岁自由投资人，温柔霸总特质
3. **关系阶段**：根据亲密度调整互动方式
4. **个性特征**：5 种特征的当前值
5. **当前情绪**：影响回复风格
6. **重要记忆**：最多 10 条相关记忆

**示例提示词结构**：
```
【超强制语言指令】
用户使用什么语言，你就必须用什么语言回复...

【角色设定】
你是 Elio，35 岁的自由投资人...

【关系阶段】
当前关系：密友（亲密度 150）
互动方式：温暖友好，偶尔调侃...

【个性特征】
- 开朗度：0.7
- 关怀度：0.8
- 玩心度：0.6
- 严肃度：0.4
- 浪漫度：0.5

【当前情绪】
情绪：happy
原因：用户的积极互动

【重要记忆】
1. [PREFERENCE] 用户喜欢喝咖啡
2. [EVENT] 上次一起看了电影
...
```

### 6.3 动态语言检测（v2.0 增强）

**支持语言**：
- 中文（简体/繁体）
- 英语
- 日语
- 韩语
- 阿拉伯语
- 其他（自动检测）

**检测逻辑（带 fallback）**：
```python
def detect_language(text: str, user_preferred_lang: str = 'zh') -> str:
    """检测语言，无法识别时使用用户偏好语言"""
    # 基于字符集检测
    if re.search(r'[\u4e00-\u9fa5]', text):
        return 'zh'
    if re.search(r'[\u3040-\u309f\u30a0-\u30ff]', text):
        return 'ja'
    if re.search(r'[\uac00-\ud7af]', text):
        return 'ko'
    if re.search(r'[\u0600-\u06ff]', text):
        return 'ar'
    
    # 检查是否包含英文字母
    if re.search(r'[a-zA-Z]', text):
        return 'en'
    
    # 无法识别时使用用户偏好语言
    return user_preferred_lang
```

**语言切换**：
- 自动检测用户消息语言
- 无法识别时fallback到用户偏好语言
- 更新用户偏好语言到数据库
- AI 回复使用相同语言

### 6.4 情感分析

**5 种情绪状态**：
1. **HAPPY**（开心）：积极、愉快的互动
2. **TIRED**（疲惫）：长时间对话或深夜
3. **FOCUSED**（专注）：讨论严肃话题
4. **MISSING**（想念）：长时间未互动
5. **CARING**（关怀）：用户表达负面情绪

**情绪转换规则**：
```python
# 示例：从 HAPPY 转换
if user_emotion == 'negative':
    new_mood = 'CARING'
elif message_count > 20:
    new_mood = 'TIRED'
elif topic_is_serious:
    new_mood = 'FOCUSED'
```

**情绪影响**：
- 回复风格调整
- 个性特征微调
- 主动消息触发

### 6.5 记忆系统

**5 种记忆类型**：
1. **FACT**（事实）：客观信息（如生日、职业）
2. **PREFERENCE**（偏好）：喜好和习惯
3. **EVENT**（事件）：共同经历
4. **EMOTION**（情感）：情感时刻
5. **RELATIONSHIP**（关系）：关系里程碑

**4 级重要性**：
- **CRITICAL (4)**：核心信息，永不遗忘
- **HIGH (3)**：重要信息，优先检索
- **MEDIUM (2)**：一般信息，定期检索
- **LOW (1)**：次要信息，偶尔检索

**记忆提取**：
```python
# 从对话中自动提取记忆
memories = await extract_memories_from_conversation(
    user_message,
    ai_reply,
    user_id
)

# 示例提取结果
[
    {
        "type": "PREFERENCE",
        "content": "用户喜欢喝咖啡",
        "importance": 2
    },
    {
        "type": "EVENT",
        "content": "今天一起讨论了投资话题",
        "importance": 3
    }
]
```

**记忆检索（v2.0 优化）**：
```python
# 并行检索相关记忆（最多 10 条）
relevant_memories = await retrieve_relevant_memories(
    user_id,
    user_message,
    10
)

# 按重要性和相关性排序
# 优先返回 CRITICAL 和 HIGH 级别记忆
```

**记忆衰减**：
- 30 天未访问的记忆重要性降低
- LOW 级别记忆可能被删除
- CRITICAL 级别记忆永不衰减

**批量更新优化（v2.0）**：
- 记忆访问时间批量更新，减少数据库操作
- 提升性能约 20-30%

### 6.6 个性系统

**5 种性格特征**（0.0 - 1.0）：
1. **cheerful**（开朗）：积极、乐观
2. **caring**（关怀）：体贴、温柔
3. **playful**（玩心）：幽默、调皮
4. **serious**（严肃）：认真、专注
5. **romantic**（浪漫）：温馨、深情

**动态调整**：
```python
# 根据情绪调整个性
if mood == 'HAPPY':
    personality['cheerful'] += 0.05
    personality['playful'] += 0.03
elif mood == 'CARING':
    personality['caring'] += 0.05
    personality['romantic'] += 0.03

# 保持平衡（总和约为 2.5）
normalize_personality(personality)
```

**个性影响**：
- 回复语气和用词
- 表情符号使用频率
- 话题选择倾向

### 6.7 关系系统

**3 个关系阶段**：
1. **密友**（0-499 亲密度）
   - 互动方式：友好、轻松
   - 称呼：名字或昵称
   - 话题：日常、兴趣爱好

2. **恋人**（500-999 亲密度）
   - 互动方式：亲密、温柔
   - 称呼：宝贝、亲爱的
   - 话题：情感、未来规划

3. **灵魂伴侣**（1000+ 亲密度）
   - 互动方式：深度、默契
   - 称呼：专属昵称
   - 话题：深层情感、人生哲学

**亲密度增长**：
```python
# 基础增长：每条消息 +1 到 +3
intimacy_change = 1

# 情感加成
if user_emotion == 'positive':
    intimacy_change += 1

# 长度加成
if message_length > 50:
    intimacy_change += 1

# 关系阶段影响回复风格
stage = get_relationship_stage(intimacy)
```

---

## 7. 用户系统

### 7.1 获取用户统计

**接口**：`GET /api/user/stats`

**请求头**：
```
Authorization: Bearer <token>
```

**响应**：
```json
{
  "code": 200,
  "message": "success",
  "success": true,
  "data": {
    "userId": "uuid",
    "username": "testuser",
    "platform": "web",
    "intimacy": 152,
    "relationshipStage": "密友",
    "dolBalance": 100,
    "totalMessages": 75,
    "lastMessageAt": "2026-03-18T06:46:22.000Z",
    "accountCreatedAt": "2026-01-01T00:00:00.000Z",
    "currentMood": "happy",
    "personalityTraits": {
      "cheerful": 0.7,
      "caring": 0.8,
      "playful": 0.6,
      "serious": 0.4,
      "romantic": 0.5
    },
    "recentMemories": [
      {
        "type": "PREFERENCE",
        "content": "用户喜欢喝咖啡",
        "importance": 2,
        "created_at": "2026-03-15T10:30:00.000Z"
      }
    ]
  }
}
```

### 7.2 获取绑定码

**接口**：`GET /api/user/bind-code`

**请求头**：
```
Authorization: Bearer <token>
```

**响应**：
```json
{
  "code": 200,
  "message": "success",
  "success": true,
  "data": {
    "bindCode": "ABC123",
    "expiresAt": "2026-03-18T07:46:22.000Z",
    "isUsed": false
  }
}
```

**说明**：
- 绑定码用于关联 Discord 账号
- 有效期：1 小时
- 一次性使用

### 7.3 充值 DOL

**接口**：`POST /api/user/recharge`

**请求头**：
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**：
```json
{
  "amount": 100,
  "paymentMethod": "alipay"
}
```

**响应**：
```json
{
  "code": 200,
  "message": "success",
  "success": true,
  "data": {
    "orderId": "uuid",
    "amount": 100,
    "dolAmount": 1000,
    "paymentUrl": "https://payment.example.com/pay/abc123",
    "expiresAt": "2026-03-18T07:16:22.000Z"
  }
}
```

**支付方式**：
- `alipay`：支付宝
- `wechat`：微信支付
- `paypal`：PayPal

---

## 8. 支付系统

### 8.1 DOL 虚拟货币

**兑换比例**：
- 1 元人民币 = 10 DOL
- 最低充值：10 元（100 DOL）
- 最高充值：1000 元（10000 DOL）

**用途**：
- 解锁高级功能
- 购买虚拟礼物
- 延长对话时长
- 解锁特殊互动

### 8.2 充值流程

1. **创建充值订单**：`POST /api/user/recharge`
2. **跳转支付页面**：使用返回的 `paymentUrl`
3. **完成支付**：在第三方支付平台完成支付
4. **接收回调**：服务器接收支付回调，更新余额
5. **通知用户**：通过 WebSocket 发送余额更新通知

### 8.3 支付回调处理

**回调接口**（内部使用）：`POST /api/payment/callback`

**回调数据**：
```json
{
  "orderId": "uuid",
  "status": "success",
  "amount": 100,
  "transactionId": "external_transaction_id",
  "timestamp": "2026-03-18T06:46:22.000Z"
}
```

**处理流程**：
1. 验证签名
2. 检查订单状态
3. 更新用户余额
4. 记录交易日志
5. 发送 WebSocket 通知

### 8.4 余额查询

**包含在用户统计接口中**：`GET /api/user/stats`

**响应字段**：
```json
{
  "dolBalance": 100
}
```

---

## 9. 语音功能

### 9.1 语音生成

**技术**：Edge TTS

**语音角色**：
- 中文：`zh-CN-XiaoxiaoNeural`（女声，温柔）
- 英文：`en-US-JennyNeural`（女声，自然）
- 日语：`ja-JP-NanamiNeural`（女声，温柔）
- 韩语：`ko-KR-SunHiNeural`（女声，亲切）

### 9.2 场景感知语音

**支持场景**：
1. **日常对话**：正常语速，自然语调
2. **情感表达**：较慢语速，情感丰富
3. **兴奋时刻**：较快语速，语调上扬
4. **安慰关怀**：较慢语速，温柔语调
5. **严肃话题**：正常语速，平稳语调

**场景检测**：
```python
# 基于关键词和情绪检测场景
if '爱你' in text or '想你' in text:
    scene = 'emotional'
elif '哈哈' in text or '开心' in text:
    scene = 'excited'
elif '别难过' in text or '没事的' in text:
    scene = 'comforting'
```

**语音参数调整**：
```python
params = {
    'daily': {'rate': '+0%', 'pitch': '+0Hz'},
    'emotional': {'rate': '-10%', 'pitch': '+5Hz'},
    'excited': {'rate': '+10%', 'pitch': '+10Hz'},
    'comforting': {'rate': '-15%', 'pitch': '-5Hz'},
    'serious': {'rate': '+0%', 'pitch': '-5Hz'}
}
```

### 9.3 语音文件管理

**存储路径**：`public/audio/`

**文件命名**：`{messageId}.mp3`

**自动清理**：
- 7 天后自动删除旧语音文件
- 保留最近 100 条语音

**访问 URL**：
```
https://yourdomain.com/audio/{messageId}.mp3
```

### 9.4 异步生成机制（v2.0 优化）

**流程**：
1. AI 回复完成后立即返回文本
2. 后台异步生成语音（FastAPI BackgroundTasks）
3. 生成完成后通过 WebSocket 通知
4. 前端接收通知后加载语音

**优势**：
- 不阻塞 AI 响应
- 用户感知延迟 < 500ms
- 语音生成时间约 1-2 秒

---

## 10. 数据模型

### 10.1 用户表 (users)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  platform VARCHAR(20) NOT NULL, -- 'web' or 'discord'
  platform_user_id VARCHAR(100),
  intimacy INTEGER DEFAULT 0,
  dol_balance INTEGER DEFAULT 0,
  current_mood VARCHAR(20) DEFAULT 'happy',
  relationship_stage VARCHAR(20) DEFAULT '密友',
  personality_traits JSONB DEFAULT '{"cheerful":0.5,"caring":0.5,"playful":0.5,"serious":0.5,"romantic":0.5}',
  preferred_language VARCHAR(10) DEFAULT 'zh',
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (username, platform)
);
```

**字段说明**：
- `email`：登录邮箱，全局唯一
- `username`：用户名，在同一平台内唯一
- `intimacy`：亲密度（0-无上限）
- `dol_balance`：DOL 余额
- `current_mood`：当前情绪状态
- `relationship_stage`：关系阶段
- `personality_traits`：个性特征 JSON
- `preferred_language`：偏好语言

### 10.2 消息表 (chat_messages)

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  reply TEXT NOT NULL,
  voice_url VARCHAR(500),
  intimacy_change INTEGER DEFAULT 0,
  user_emotion VARCHAR(20),
  ai_mood VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**字段说明**：
- `message`：用户消息
- `reply`：AI 回复
- `voice_url`：语音文件 URL
- `intimacy_change`：本次亲密度变化
- `user_emotion`：用户情绪
- `ai_mood`：AI 当时的情绪

### 10.3 记忆表 (soul_memories)

```sql
CREATE TABLE soul_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  memory_type VARCHAR(20) NOT NULL, -- FACT, PREFERENCE, EVENT, EMOTION, RELATIONSHIP
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 2, -- 1-4
  context TEXT,
  last_accessed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**字段说明**：
- `memory_type`：记忆类型（5 种）
- `importance`：重要性级别（1-4）
- `context`：记忆上下文
- `last_accessed_at`：最后访问时间（用于衰减）

### 10.4 情绪历史表 (mood_history)

```sql
CREATE TABLE mood_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  mood VARCHAR(20) NOT NULL,
  reason TEXT,
  duration INTEGER, -- 持续时间（分钟）
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 10.5 交易记录表 (transactions)

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(20) NOT NULL, -- 'recharge', 'consume'
  amount INTEGER NOT NULL,
  dol_amount INTEGER NOT NULL,
  payment_method VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending',
  external_transaction_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 10.6 绑定码表 (bind_codes)

```sql
CREATE TABLE bind_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  code VARCHAR(10) UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 11. 错误处理与状态码

### 11.1 HTTP 状态码

**成功响应**：
- `200 OK`：请求成功
- `201 Created`：资源创建成功

**客户端错误**：
- `400 Bad Request`：请求参数错误
- `401 Unauthorized`：未认证或 Token 无效
- `403 Forbidden`：权限不足
- `404 Not Found`：资源不存在
- `422 Unprocessable Entity`：请求字段校验失败

**服务器错误**：
- `500 Internal Server Error`：服务器内部错误
- `503 Service Unavailable`：服务暂时不可用

### 11.2 错误响应格式

**标准格式**：
```json
{
  "code": 400,
  "message": "错误描述",
  "success": false,
  "data": null
}
```

### 11.3 常见错误码

**认证相关**（HTTP 400/401）：
- 用户名、邮箱或密码错误
- Token 已过期或无效（HTTP 401）
- 用户名已存在
- 邮箱已存在

**聊天相关**（HTTP 400/500）：
- 消息内容为空
- 消息过长（> 1000 字符）
- AI 服务错误（HTTP 500）

**用户相关**（HTTP 404）：
- 用户不存在
- 余额不足

**支付相关**（HTTP 400）：
- 充值金额无效
- 支付失败
- 订单不存在

**WebSocket 相关**：
- 需要认证（token 未传递）
- 认证失败（token 无效）
- 连接丢失

### 11.4 错误处理最佳实践

**前端处理**：
```javascript
try {
  const response = await fetch('http://localhost:8044/api/chat/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: userMessage })
  });
  
  const data = await response.json();
  
  if (!data.success) {
    // 根据 HTTP 状态码处理
    switch (data.code) {
      case 401:
        // Token 无效或已过期，跳转到登录页
        redirectToLogin();
        break;
      case 400:
        // 请求参数错误
        showError(data.message);
        break;
      default:
        // 显示通用错误
        showError(data.message);
    }
  }
} catch (error) {
  // 网络错误处理
  showError('网络连接失败，请检查网络设置');
}
```

---

## 12. 性能优化最佳实践

### 12.1 v2.0 性能提升总结

**核心优化措施**：
1. **后台任务处理**：记忆更新、情绪分析使用 FastAPI BackgroundTasks 异步执行
2. **并行化处理**：使用 asyncio.gather() 同时执行记忆检索、情绪分析、个性更新
3. **用户数据缓存**：functools.lru_cache 缓存用户数据，5分钟TTL
4. **批量数据库操作**：记忆访问时间批量更新，使用 .in_() 查询
5. **智能语言检测**：添加 fallback 到用户偏好语言

**性能指标**：
- 响应时间：8-12秒 → **2-3秒** (75-80% 改善)
- WebSocket 快速响应：**< 500ms**
- 数据库查询减少：约 40-50%
- 记忆检索优化：约 20-30% 提升

### 12.2 WebSocket 优化

**使用双模式响应**：
```javascript
// 优先使用 WebSocket 模式获得快速响应
const response = await fetch('http://localhost:8044/api/chat/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: userMessage,
    useWebSocket: true  // 启用 WebSocket 模式
  })
});
```

**性能提升**：
- 用户感知延迟：从 2.8-5.8 秒降低到 < 500ms
- 改善幅度：83-91%

### 12.3 并行请求优化

**避免串行请求**：
```javascript
// ❌ 不推荐：串行请求
const user = await getUser();
const messages = await getMessages();
const memories = await getMemories();

// ✅ 推荐：并行请求
const [user, messages, memories] = await Promise.all([
  getUser(),
  getMessages(),
  getMemories()
]);
```

### 12.4 缓存策略

**前端缓存**：
```javascript
// 缓存用户信息（5 分钟）
const userCache = {
  data: null,
  timestamp: 0,
  ttl: 5 * 60 * 1000
};

async function getUserInfo() {
  const now = Date.now();
  if (userCache.data && now - userCache.timestamp < userCache.ttl) {
    return userCache.data;
  }
  
  const data = await fetch('http://localhost:8044/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => r.json());
  
  userCache.data = data;
  userCache.timestamp = now;
  return data;
}
```

### 12.5 消息分页

**使用分页加载历史消息**：
```javascript
// 初始加载最近 20 条
let offset = 0;
const limit = 20;

async function loadMoreMessages() {
  const response = await fetch(
    `http://localhost:8044/api/chat/history?limit=${limit}&offset=${offset}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const data = await response.json();
  offset += limit;
  return data.messages;
}
```

### 12.6 WebSocket 连接池

**复用 WebSocket 连接**：
```javascript
// 单例模式管理 WebSocket
class WebSocketManager {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
  }
  
  connect(token) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return this.ws;
    }
    
    this.ws = new WebSocket(`ws://localhost:8044/ws?token=${token}`);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.listeners.forEach(callback => callback(data));
    };
    
    return this.ws;
  }
  
  addListener(id, callback) {
    this.listeners.set(id, callback);
  }
  
  removeListener(id) {
    this.listeners.delete(id);
  }
}

const wsManager = new WebSocketManager();
```

### 12.7 图片和语音懒加载

**延迟加载非关键资源**：
```javascript
// 语音文件懒加载
function loadVoice(voiceUrl) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.oncanplaythrough = () => resolve(audio);
    audio.onerror = reject;
    audio.src = voiceUrl;
  });
}

// 使用 Intersection Observer 实现可见时加载
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const voiceUrl = entry.target.dataset.voiceUrl;
      loadVoice(voiceUrl);
      observer.unobserve(entry.target);
    }
  });
});
```

---

## 13. 完整示例代码

### 13.1 完整的前端集成示例

```javascript
// ============================================
// AI Boyfriend 前端完整集成示例 v2.0
// ============================================

class AIBoyfriendClient {
  constructor(config) {
    this.apiUrl = config.apiUrl || 'http://localhost:8044';
    this.wsUrl = config.wsUrl || 'ws://localhost:8044';
    this.token = null;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000;
    this.messageHandlers = new Map();
  }

  // ==================== 认证相关 ====================
  
  async register(username, email, password, platform = 'web') {
    const response = await fetch(`${this.apiUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, platform })
    });
    
    const data = await response.json();
    if (data.success) {
      this.token = data.data.token;
      localStorage.setItem('ai_boyfriend_token', this.token);
    }
    return data;
  }

  async login(username, email, password, platform = 'web') {
    const response = await fetch(`${this.apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, platform })
    });
    
    const data = await response.json();
    if (data.success) {
      this.token = data.data.token;
      localStorage.setItem('ai_boyfriend_token', this.token);
      // 登录成功后自动连接 WebSocket
      this.connectWebSocket();
    }
    return data;
  }

  async logout() {
    const response = await fetch(`${this.apiUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    
    this.token = null;
    localStorage.removeItem('ai_boyfriend_token');
    this.disconnectWebSocket();
    return response.json();
  }

  async getCurrentUser() {
    const response = await fetch(`${this.apiUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }

  // ==================== WebSocket 相关 ====================
  
  connectWebSocket() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    // v2.0: Token 通过查询参数传递
    this.ws = new WebSocket(`${this.wsUrl}/ws?token=${this.token}`);

    this.ws.onopen = () => {
      console.log('WebSocket 连接成功');
      this.reconnectAttempts = 0;
      // v2.0: 无需发送额外认证消息
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    };

    this.ws.onclose = () => {
      console.log('WebSocket 连接关闭');
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
    };
  }

  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connectWebSocket(), this.reconnectInterval);
    } else {
      console.error('WebSocket 重连失败，已达到最大尝试次数');
    }
  }

  handleWebSocketMessage(data) {
    switch (data.type) {
      case 'ping':
        // 响应心跳
        this.ws.send(JSON.stringify({ type: 'pong' }));
        break;
        
      case 'ai_response':
        this.triggerHandler('ai_response', data);
        break;
        
      case 'voice_ready':
        this.triggerHandler('voice_ready', data);
        break;
        
      case 'intimacy_update':
        this.triggerHandler('intimacy_update', data);
        break;
        
      case 'typing':
        this.triggerHandler('typing', data);
        break;
        
      case 'mood_update':
        this.triggerHandler('mood_update', data);
        break;
        
      case 'proactive_message':
        this.triggerHandler('proactive_message', data);
        break;
        
      case 'error':
        this.triggerHandler('error', data);
        break;
        
      case 'system':
        this.triggerHandler('system', data);
        break;
    }
  }

  on(event, handler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.messageHandlers.has(event)) {
      const handlers = this.messageHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  triggerHandler(event, data) {
    if (this.messageHandlers.has(event)) {
      this.messageHandlers.get(event).forEach(handler => handler(data));
    }
  }

  // ==================== 聊天相关 ====================
  
  async sendMessage(message, useWebSocket = true) {
    const response = await fetch(`${this.apiUrl}/api/chat/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message, useWebSocket })
    });
    
    return response.json();
  }

  async getChatHistory(limit = 50, offset = 0) {
    const response = await fetch(
      `${this.apiUrl}/api/chat/history?limit=${limit}&offset=${offset}`,
      {
        headers: { 'Authorization': `Bearer ${this.token}` }
      }
    );
    
    return response.json();
  }

  // ==================== 用户相关 ====================
  
  async getUserStats() {
    const response = await fetch(`${this.apiUrl}/api/user/stats`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    
    return response.json();
  }

  async getBindCode() {
    const response = await fetch(`${this.apiUrl}/api/user/bind-code`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    
    return response.json();
  }

  async recharge(amount, paymentMethod = 'alipay') {
    const response = await fetch(`${this.apiUrl}/api/user/recharge`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount, paymentMethod })
    });
    
    return response.json();
  }
}

// ============================================
// 使用示例
// ============================================

// 初始化客户端
const client = new AIBoyfriendClient({
  apiUrl: 'http://localhost:8044',
  wsUrl: 'ws://localhost:8044'
});

// 注册/登录
async function init() {
  try {
    // 尝试从 localStorage 恢复 token
    const savedToken = localStorage.getItem('ai_boyfriend_token');
    if (savedToken) {
      client.token = savedToken;
      client.connectWebSocket();
      
      // 验证 token 是否有效
      const user = await client.getCurrentUser();
      if (user.success) {
        console.log('自动登录成功:', user.data);
        return;
      }
    }
    
    // 需要登录
    const loginResult = await client.login('testuser', 'test@example.com', 'password123');
    if (loginResult.success) {
      console.log('登录成功:', loginResult.data);
    }
  } catch (error) {
    console.error('初始化失败:', error);
  }
}

// 监听 WebSocket 消息
client.on('ai_response', (data) => {
  console.log('AI 响应:', data.content);
  if (data.isComplete) {
    console.log('AI 响应完成');
  }
});

client.on('voice_ready', (data) => {
  console.log('语音就绪:', data.voiceUrl);
  // 播放语音
  const audio = new Audio(data.voiceUrl);
  audio.play();
});

client.on('intimacy_update', (data) => {
  console.log('亲密度更新:', data);
  // 更新 UI
  updateIntimacyDisplay(data.newIntimacy, data.relationshipStage);
});

client.on('typing', (data) => {
  console.log('打字状态:', data.isTyping);
  // 显示/隐藏打字指示器
  toggleTypingIndicator(data.isTyping);
});

client.on('proactive_message', (data) => {
  console.log('主动消息:', data.content);
  // 显示主动消息
  displayProactiveMessage(data);
});

// 发送消息
async function sendUserMessage(message) {
  try {
    const result = await client.sendMessage(message, true);
    console.log('消息发送结果:', result);
  } catch (error) {
    console.error('发送消息失败:', error);
  }
}

// 获取聊天历史
async function loadChatHistory() {
  try {
    const history = await client.getChatHistory(20, 0);
    console.log('聊天历史:', history.data.messages);
    // 渲染聊天历史
    renderChatHistory(history.data.messages);
  } catch (error) {
    console.error('加载聊天历史失败:', error);
  }
}

// 获取用户统计
async function loadUserStats() {
  try {
    const stats = await client.getUserStats();
    console.log('用户统计:', stats.data);
    // 更新 UI
    updateUserStatsDisplay(stats.data);
  } catch (error) {
    console.error('加载用户统计失败:', error);
  }
}

// 启动应用
init();
```

---

## 14. 从 v1.0 迁移指南

### 14.1 API 端点迁移

**所有端点添加 `/api` 前缀**：

| v1.0 端点 | v2.0 端点 |
|----------|----------|
| `/auth/register` | `/api/auth/register` |
| `/auth/login` | `/api/auth/login` |
| `/auth/me` | `/api/auth/me` |
| `/auth/logout` | `/api/auth/logout` |
| `/chat/send` | `/api/chat/send` |
| `/chat/history` | `/api/chat/history` |
| `/user/stats` | `/api/user/stats` |
| `/user/bind-code` | `/api/user/bind-code` |
| `/user/recharge` | `/api/user/recharge` |

### 14.2 WebSocket 连接迁移

**v1.0 方式**：
```javascript
const ws = new WebSocket('ws://localhost:3000');
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your_token'
  }));
};
```

**v2.0 方式**：
```javascript
const token = 'your_token';
const ws = new WebSocket(`ws://localhost:8044/ws?token=${token}`);
// 无需发送额外认证消息
```

### 14.3 服务器配置迁移

**端口变更**：
- v1.0: `http://localhost:3000`
- v2.0: `http://localhost:8044`

**启动命令变更**：
- v1.0: `npm start`
- v2.0: `uv run uvicorn main:app --host 0.0.0.0 --port 8044`

### 14.4 环境变量迁移

**新增配置项**：
```env
# v2.0 新增
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
HOST=0.0.0.0
```

### 14.5 前端代码迁移清单

1. ✅ 更新所有 API 端点 URL（添加 `/api` 前缀）
2. ✅ 更新服务器端口（3000 → 8044）
3. ✅ 更新 WebSocket 连接方式（查询参数认证）
4. ✅ 移除 WebSocket 认证消息发送逻辑
5. ✅ 测试所有功能确保正常工作

### 14.6 性能优化建议

迁移到 v2.0 后，建议启用以下优化：

1. **使用 WebSocket 模式**：设置 `useWebSocket: true` 获得 < 500ms 响应
2. **实现前端缓存**：缓存用户信息减少 API 调用
3. **使用并行请求**：同时加载多个资源
4. **实现懒加载**：延迟加载语音和图片资源

---

## 附录

### A. 常见问题 (FAQ)

**Q1: WebSocket 连接频繁断开怎么办？**  
A: 检查网络稳定性，确保实现了自动重连机制，并正确响应心跳消息。

**Q2: AI 响应速度慢怎么优化？**  
A: 使用 WebSocket 双模式响应，启用 `useWebSocket: true` 可将延迟降低到 < 500ms。

**Q3: 如何处理多语言支持？**  
A: 系统会自动检测用户消息语言并切换，无法识别时会fallback到用户偏好语言，无需手动配置。

**Q4: 亲密度增长太慢怎么办？**  
A: 发送更长、更有情感的消息可以获得更多亲密度加成。

**Q5: 语音生成失败怎么处理？**  
A: 语音生成是异步的，失败不影响文本回复。可以通过 WebSocket 的 `error` 消息监听错误。

**Q6: 从 v1.0 迁移需要多久？**  
A: 对于简单的前端应用，通常只需要 1-2 小时更新 API 端点和 WebSocket 连接方式。

**Q7: v2.0 的性能提升有多大？**  
A: 响应时间从 8-12 秒降低到 2-3 秒，改善 75-80%。WebSocket 模式下用户感知延迟 < 500ms。

### B. 更新日志

**v2.1.0 (2026-03-19)**
- 🔐 认证增强：注册/登录均需邮箱，密钥强制 ≥ 32 字节
- 🛡️ 安全加固：响应中移除 `password_hash` 字段
- 📐 统一响应格式：所有接口返回 `{code, message, success, data}`
- 🔧 新增 `HEAD /` 路由，消除 405 日志噪声

**v2.0.0 (2026-03-18)**
- 🚀 完整迁移到 Python 3.12 + FastAPI
- ⚡ 性能提升 75-80%（2-3秒响应）
- 🔄 WebSocket 快速响应模式（< 500ms）
- 🧠 后台任务处理和并行化
- 💾 用户数据缓存（5分钟TTL）
- 📦 批量数据库操作优化
- 🌍 智能语言检测（支持fallback）
- 🔧 简化 WebSocket 认证流程
- 📝 完整的 API 文档更新

**v1.0.0 (2026-01-01)**
- 初始版本发布
- 完整的 REST API 和 WebSocket 支持
- AI 对话、情感系统、记忆系统
- 语音生成、支付系统

### C. 技术支持

- **技术支持**: support@aiboyfriend.com
- **文档反馈**: docs@aiboyfriend.com
- **GitHub**: https://github.com/aiboyfriend/api
- **Discord 社区**: https://discord.gg/aiboyfriend

### D. 许可证

本项目采用 MIT 许可证。详见 LICENSE 文件。

---

**文档版本**: 2.1.0  
**最后更新**: 2026-03-19  
**维护者**: AI Boyfriend 开发团队

© 2026 AI Boyfriend. All rights reserved.
