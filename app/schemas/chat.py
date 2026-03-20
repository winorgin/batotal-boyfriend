from pydantic import BaseModel, Field
from typing import Optional


class SendMessageRequest(BaseModel):
    """发送消息请求"""
    message: str = Field(..., min_length=1, max_length=1000, description="消息内容")
    useWebSocket: bool = Field(default=False, description="是否使用WebSocket")


class MessageResponse(BaseModel):
    """消息响应"""
    success: bool
    data: Optional[dict] = None
    message: Optional[str] = None


class ChatHistoryResponse(BaseModel):
    """聊天历史响应"""
    success: bool
    data: Optional[dict] = None
