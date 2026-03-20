from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """应用配置"""
    
    # Supabase 配置
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: Optional[str] = None
    
    # AI 服务配置（豆包 AI）
    ARK_API_KEY: str
    ENDPOINT_ID: str
    
    # JWT 配置
    JWT_SECRET: str
    JWT_EXPIRES_IN: str = "7d"
    JWT_ALGORITHM: str = "HS256"
    
    # 服务器配置
    PORT: int = 8044
    HOST: str = "0.0.0.0"
    NODE_ENV: str = "development"
    
    # 会话配置
    SESSION_SECRET: str
    SESSION_MAX_AGE: int = 86400000
    
    # 功能开关
    ENABLE_WEB: bool = True
    ENABLE_VOICE: bool = False
    ENABLE_IMAGE_GEN: bool = False
    
    # 系统配置
    DAILY_DOL_AMOUNT: int = 10
    DOL_PER_MESSAGE: int = 1
    INTIMACY_PER_MESSAGE: int = 1
    PROACTIVE_CHAT_COOLDOWN: int = 3600
    
    # 日志配置
    LOG_LEVEL: str = "info"
    LOG_FILE: str = "logs/app.log"
    
    # CORS 配置
    CORS_ORIGIN: str = "*"
    CORS_CREDENTIALS: bool = True
    
    # 代理配置（可选）
    HTTP_PROXY: Optional[str] = None
    HTTPS_PROXY: Optional[str] = None
    
    # Redis 配置（可选，用于多服务器部署）
    REDIS_URL: Optional[str] = "redis://localhost:6380"
    
    # 语音输出目录
    VOICE_OUTPUT_DIR: str = "static/audio"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )

    @staticmethod
    def _validate_secret_length(secret_name: str, value: str) -> str:
        """确保共享密钥满足最小安全长度要求。"""
        if len(value.encode("utf-8")) < 32:
            raise ValueError(f"{secret_name} 至少需要 32 字节")
        return value

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, value: str) -> str:
        """确保 JWT 密钥满足 HS256 的最小安全长度要求。"""
        return cls._validate_secret_length("JWT_SECRET", value)

    @field_validator("SESSION_SECRET")
    @classmethod
    def validate_session_secret(cls, value: str) -> str:
        """确保会话密钥满足最小安全长度要求。"""
        return cls._validate_secret_length("SESSION_SECRET", value)
    
    @property
    def debug(self) -> bool:
        """是否为调试模式"""
        return self.NODE_ENV == "development"
    
    @property
    def jwt_expiration_days(self) -> int:
        """JWT过期天数"""
        if self.JWT_EXPIRES_IN.endswith('d'):
            return int(self.JWT_EXPIRES_IN[:-1])
        return 7


# 全局配置实例
settings = Settings()
