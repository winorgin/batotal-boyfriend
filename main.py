from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
import socketio
import uvicorn

from app.core.config import settings
from app.core.security import verify_token
from app.api.routes import auth, chat, user
from app.services.websocket_service import sio, ws_manager

# 创建 FastAPI 应用
app = FastAPI(
    title="AI Boyfriend API",
    description="AI Boyfriend Web Platform - Python/FastAPI",
    version="1.0.0",
    debug=settings.debug
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.CORS_ORIGIN == "*" else [settings.CORS_ORIGIN],
    allow_credentials=settings.CORS_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件
app.mount("/css", StaticFiles(directory="static/css"), name="css")
app.mount("/js", StaticFiles(directory="static/js"), name="js")
app.mount("/images", StaticFiles(directory="static/images"), name="images")
app.mount("/audio", StaticFiles(directory="static/audio"), name="audio")

# 注册 API 路由
app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(chat.router, prefix="/api/chat", tags=["聊天"])
app.include_router(user.router, prefix="/api/user", tags=["用户"])

# 集成 Socket.IO
sio_app = socketio.ASGIApp(sio, app)


@app.on_event("startup")
async def startup_event():
    """应用启动时初始化"""
    print("🚀 Starting AI Boyfriend API...")
    
    # 初始化 WebSocket 管理器（Redis Pub/Sub）
    await ws_manager.initialize()
    
    print(f"✓ Server running on http://{settings.HOST}:{settings.PORT}")
    print(f"✓ Environment: {settings.NODE_ENV}")
    print(f"✓ WebSocket endpoint: ws://{settings.HOST}:{settings.PORT}/socket.io/")


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时清理"""
    print("👋 Shutting down AI Boyfriend API...")
    
    # 关闭 Redis 连接
    if ws_manager.redis_client:
        await ws_manager.redis_client.close()
        print("✓ Redis connection closed")


@app.head("/")
async def root_head():
    """根路径 HEAD 探测请求（健康检查/CDN 用）"""
    return Response(headers={"content-type": "text/html; charset=utf-8"})


@app.get("/")
async def root():
    """根路径 - 返回首页"""
    return FileResponse("static/index.html")


@app.get("/login")
async def login_page():
    """登录页面"""
    return FileResponse("static/login.html")


@app.get("/register")
async def register_page():
    """注册页面"""
    return FileResponse("static/register.html")


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket, token: str = Query(default=None)):
    """原生 WebSocket 端点（兼容前端 chat.js）"""
    # 验证 JWT token
    try:
        if not token:
            await websocket.close(code=4003, reason="缺少 token")
            return
        payload = verify_token(token)
        user_id = payload.get('user_id')
        if not user_id:
            raise ValueError("token 无 user_id")
    except Exception:
        await websocket.close(code=4003, reason="认证失败")
        return

    await websocket.accept()
    # 注册原生 WS 连接
    ws_manager.ws_connections[user_id] = websocket
    try:
        await websocket.send_json({'type': 'connected', 'userId': user_id})
        while True:
            # 消费心跳或客户端发来的任意帧，避免连接超时
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        ws_manager.ws_connections.pop(user_id, None)


@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.NODE_ENV
    }


@app.get("/api")
async def api_info():
    """API 信息"""
    return {
        "message": "AI Boyfriend API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:sio_app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.debug,
        log_level=settings.LOG_LEVEL.lower()
    )
