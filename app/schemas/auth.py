import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _normalize_username(value: str) -> str:
    username = value.strip()
    if not username:
        raise ValueError("用户名不能为空")
    return username


def _normalize_email(value: str) -> str:
    email = value.strip().lower()
    if not EMAIL_PATTERN.match(email):
        raise ValueError("邮箱格式不正确")
    return email


class RegisterRequest(BaseModel):
    """注册请求"""
    username: str = Field(..., min_length=3, max_length=20, description="用户名")
    email: str = Field(..., min_length=5, max_length=254, description="邮箱")
    password: str = Field(..., min_length=6, max_length=50, description="密码")
    platform: str = Field(default="web", description="平台")

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        return _normalize_username(value)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _normalize_email(value)


class LoginRequest(BaseModel):
    """登录请求"""
    username: str = Field(..., description="用户名")
    email: str = Field(..., min_length=5, max_length=254, description="邮箱")
    password: str = Field(..., description="密码")
    platform: str = Field(default="web", description="平台")

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        return _normalize_username(value)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _normalize_email(value)


class UserResponse(BaseModel):
    """用户响应"""
    id: str
    username: str
    email: Optional[str] = None
    platform: str
    intimacy: int
    dol_balance: int
    relationship_stage: Optional[str] = None
    current_mood: Optional[str] = None
    personality_traits: Optional[dict] = None
    preferred_language: Optional[str] = None
    created_at: Optional[str] = None
    last_message_at: Optional[str] = None


class AuthResponse(BaseModel):
    """认证响应"""
    success: bool
    message: str
    data: Optional[dict] = None
