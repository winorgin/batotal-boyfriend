import socketio
import redis.asyncio as redis
import json
import asyncio
from typing import Dict, Optional, Any
from app.core.security import verify_token
from app.core.database import get_supabase
from app.core.config import settings


class WebSocketManager:
    """WebSocket 管理器 - 支持 Redis Pub/Sub 多服务器部署"""
    
    def __init__(self):
        self.sio = socketio.AsyncServer(
            async_mode='asgi',
            cors_allowed_origins='*',
            ping_timeout=60,
            ping_interval=30
        )
        
        # Redis 连接
        self.redis_client: Optional[redis.Redis] = None
        self.pubsub: Optional[redis.client.PubSub] = None
        
        # 本地连接映射 (user_id -> sid) — Socket.IO 连接
        self.user_connections: Dict[str, str] = {}
        
        # 原生 WebSocket 连接 (user_id -> WebSocket对象)
        self.ws_connections: Dict[str, Any] = {}
        
        # 注册事件处理器
        self._register_handlers()
    
    async def initialize(self):
        """初始化 Redis 连接"""
        try:
            redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379')
            self.redis_client = redis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            
            # 测试连接
            await self.redis_client.ping()
            print(f"✓ Redis connected: {redis_url}")
            
            # 启动订阅监听
            asyncio.create_task(self._subscribe_messages())
            
        except Exception as e:
            print(f"⚠ Redis connection failed: {e}")
            print("  Running in single-server mode (no Redis Pub/Sub)")
    
    async def _subscribe_messages(self):
        """订阅 Redis 消息（后台任务）"""
        if not self.redis_client:
            return
        
        try:
            self.pubsub = self.redis_client.pubsub()
            
            # 订阅所有用户频道的模式
            await self.pubsub.psubscribe('user:*')
            
            print("✓ Redis Pub/Sub listener started")
            
            async for message in self.pubsub.listen():
                if message['type'] == 'pmessage':
                    await self._handle_redis_message(message)
                    
        except Exception as e:
            print(f"Redis subscription error: {e}")
    
    async def _handle_redis_message(self, message):
        """处理 Redis 消息"""
        try:
            # 解析频道名获取 user_id
            channel = message['channel']  # 格式: user:{user_id}
            user_id = channel.split(':', 1)[1]
            
            # 检查用户是否连接到本服务器
            sid = self.user_connections.get(user_id)
            if not sid:
                return
            
            # 解析消息数据
            data = json.loads(message['data'])
            event_type = data.get('type')
            payload = data.get('payload', {})
            
            # 转发到 WebSocket 客户端
            await self.sio.emit(event_type, payload, room=sid)
            
        except Exception as e:
            print(f"Error handling Redis message: {e}")
    
    async def send_to_user(self, user_id: str, event_type: str, payload: dict):
        """发送消息给指定用户（优先原生 WS，其次 Redis/Socket.IO）
        
        Args:
            user_id: 用户ID
            event_type: 事件类型 (ai_response, voice_ready, etc.)
            payload: 消息内容
        """
        # 1. 优先通过原生 WebSocket 直接推送
        native_ws = self.ws_connections.get(user_id)
        if native_ws:
            try:
                await native_ws.send_json({'type': event_type, **payload})
                return
            except Exception:
                self.ws_connections.pop(user_id, None)

        message = {
            'type': event_type,
            'payload': payload
        }
        
        if self.redis_client:
            # 通过 Redis 发布，所有服务器都能收到
            await self.redis_client.publish(
                f'user:{user_id}',
                json.dumps(message)
            )
        else:
            # 单服务器模式：直接发送（Socket.IO）
            sid = self.user_connections.get(user_id)
            if sid:
                await self.sio.emit(event_type, payload, room=sid)
    
    def is_user_online(self, user_id: str) -> bool:
        """检查用户是否在线（本服务器）"""
        return user_id in self.user_connections
    
    async def get_online_users_count(self) -> int:
        """获取在线用户数（所有服务器）"""
        if self.redis_client:
            # 从 Redis 获取全局在线用户数
            try:
                count = await self.redis_client.scard('online_users')
                return count
            except:
                pass
        
        # 单服务器模式：返回本地连接数
        return len(self.user_connections)
    
    def _register_handlers(self):
        """注册 Socket.IO 事件处理器"""
        
        @self.sio.event
        async def connect(sid, environ):
            """客户端连接"""
            print(f"Client {sid} connected")
        
        @self.sio.event
        async def auth(sid, data):
            """WebSocket 认证"""
            token = data.get('token')
            
            try:
                payload = verify_token(token)
                user_id = payload['user_id']
                
                # 保存会话
                await self.sio.save_session(sid, {
                    'user_id': user_id,
                    'authenticated': True
                })
                
                # 记录连接映射
                self.user_connections[user_id] = sid
                
                # 添加到 Redis 在线用户集合
                if self.redis_client:
                    await self.redis_client.sadd('online_users', user_id)
                
                await self.sio.emit('auth_success', {
                    'message': '认证成功',
                    'userId': user_id
                }, room=sid)
                
                print(f"User {user_id} authenticated (sid: {sid})")
                
            except Exception as e:
                await self.sio.emit('error', {
                    'message': f'认证失败: {str(e)}'
                }, room=sid)
        
        @self.sio.event
        async def message(sid, data):
            """处理用户消息"""
            session = await self.sio.get_session(sid)
            
            if not session.get('authenticated'):
                await self.sio.emit('error', {
                    'message': '未认证，请先进行认证'
                }, room=sid)
                return
            
            user_id = session.get('user_id')
            user_message = data.get('message')
            
            # 发送打字状态
            await self.send_to_user(user_id, 'typing', {'isTyping': True})
            
            # 这里调用 AI 服务处理消息
            # 通过 send_to_user 发送响应，支持多服务器
            # 示例：
            # await self.send_to_user(user_id, 'ai_response', {
            #     'content': response,
            #     'emotion': emotion
            # })
            
            await self.send_to_user(user_id, 'typing', {'isTyping': False})
        
        @self.sio.event
        async def pong(sid):
            """响应心跳"""
            pass
        
        @self.sio.event
        async def disconnect(sid):
            """客户端断开连接"""
            try:
                session = await self.sio.get_session(sid)
                user_id = session.get('user_id')
                
                if user_id:
                    # 移除连接映射
                    self.user_connections.pop(user_id, None)
                    
                    # 从 Redis 在线用户集合移除
                    if self.redis_client:
                        await self.redis_client.srem('online_users', user_id)
                    
                    print(f"User {user_id} disconnected (sid: {sid})")
                else:
                    print(f"Client {sid} disconnected (not authenticated)")
                    
            except Exception as e:
                print(f"Error handling disconnect: {e}")


# 全局单例
ws_manager = WebSocketManager()

# 导出 Socket.IO 实例供 FastAPI 使用
sio = ws_manager.sio
