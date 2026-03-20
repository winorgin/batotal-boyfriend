from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import verify_token
from app.core.database import get_supabase
from app.core.db_compat import normalize_user_record, resolve_user_platform

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """获取当前用户（依赖注入）
    
    Args:
        credentials: HTTP Bearer认证凭据
        
    Returns:
        用户信息字典
        
    Raises:
        HTTPException: 认证失败
    """
    token = credentials.credentials
    
    try:
        payload = verify_token(token)
        user_id = payload.get('user_id')
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的认证凭据"
            )
        
        # 从数据库获取用户信息
        supabase = get_supabase()
        result = supabase.table('users').select('*').eq('id', user_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户不存在"
            )

        user = result.data[0]
        platform = resolve_user_platform(supabase, user, 'web')
        return normalize_user_record(user, platform)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
