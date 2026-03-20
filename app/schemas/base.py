"""
FastAPI 统一响应格式基类
"""

from typing import Any
from pydantic import BaseModel


class AifriendDictResponse:
    """
    AI Boyfriend 统一的字典响应类
    用于标准化所有 API 接口的返回格式

    使用方式：
        from app.schemas.base import AifriendDictResponse as ADR
        return ADR.success(data={'key': 'value'}).to_dict()
    """

    def __init__(self, code: int = 200, message: str = "success", data: Any = None):
        self.code = code
        self.message = message
        self.data = data
        self._success = (code == 200)

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "message": self.message,
            "success": self._success,
            "data": self.data,
        }

    @classmethod
    def success(cls, data: Any = None, message: str = "success", code: int = 200):
        return cls(code=code, message=message, data=data)

    @classmethod
    def error(cls, message: str = "error", code: int = 500, data: Any = None):
        return cls(code=code, message=message, data=data)


class StandardResponse(BaseModel):
    """FastAPI response_model 配套 Pydantic 模型，匹配 AifriendDictResponse.to_dict() 结构"""

    code: int = 200
    message: str = "success"
    success: bool = True
    data: Any = None
