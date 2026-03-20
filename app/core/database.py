from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

# 全局 Supabase 客户端
_supabase_client: Optional[Client] = None


def get_supabase() -> Client:
    """获取 Supabase 客户端（单例模式）
    
    Returns:
        Supabase客户端实例
    """
    global _supabase_client
    
    if _supabase_client is None:
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY
        )
    
    return _supabase_client


def close_supabase():
    """关闭 Supabase 连接"""
    global _supabase_client
    _supabase_client = None
