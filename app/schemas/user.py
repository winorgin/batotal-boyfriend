from pydantic import BaseModel
from typing import Optional


class UserStatsResponse(BaseModel):
    """用户统计响应"""
    success: bool
    data: Optional[dict] = None
