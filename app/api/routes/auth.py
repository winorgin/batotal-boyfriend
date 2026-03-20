from fastapi import APIRouter, HTTPException, Depends
from postgrest.exceptions import APIError
from app.schemas.auth import RegisterRequest, LoginRequest
from app.schemas.base import AifriendDictResponse as ADR, StandardResponse
from app.core.security import hash_password, verify_password, create_access_token
from app.core.database import get_supabase
from app.core.db_compat import (
    DEFAULT_PERSONALITY_TRAITS,
    ensure_platform_binding,
    filter_users_by_platform,
    normalize_user_record,
)
from app.api.deps import get_current_user

router = APIRouter()


def _is_missing_users_column_error(error: APIError) -> bool:
    message = str(error)
    return "users" in message and "column" in message


def _build_current_user_data(request: RegisterRequest, hashed_password: str) -> dict:
    return {
        'username': request.username,
        'email': request.email,
        'password_hash': hashed_password,
        'platform': request.platform,
        'intimacy': 0,
        'dol_balance': 0,
        'current_mood': 'happy',
        'relationship_stage': '密友',
        'personality_traits': DEFAULT_PERSONALITY_TRAITS.copy(),
        'preferred_language': 'zh',
    }


def _build_legacy_user_data(request: RegisterRequest, hashed_password: str) -> dict:
    return {
        'username': request.username,
        'email': request.email,
        'password_hash': hashed_password,
        'dol_balance': 0,
        'intimacy_level': 0,
        'relationship_stage': 'close_friend',
        'preferences': {
            'preferred_language': 'zh',
            'personality_traits': DEFAULT_PERSONALITY_TRAITS.copy(),
        },
    }


def _insert_user_record(supabase, request: RegisterRequest, hashed_password: str) -> dict:
    last_error = None

    for payload, is_legacy_schema in (
        (_build_current_user_data(request, hashed_password), False),
        (_build_legacy_user_data(request, hashed_password), True),
    ):
        try:
            result = supabase.table('users').insert(payload).execute()
            user = result.data[0]

            if is_legacy_schema:
                ensure_platform_binding(
                    supabase,
                    user['id'],
                    request.platform,
                    request.username,
                    request.username,
                )

            return normalize_user_record(user, request.platform)
        except APIError as exc:
            last_error = exc
            if _is_missing_users_column_error(exc):
                continue
            raise

    if last_error:
        raise last_error

    raise HTTPException(status_code=500, detail="用户创建失败")


@router.post("/register", response_model=StandardResponse)
async def register(request: RegisterRequest):
    """用户注册
    
    Args:
        request: 注册请求
        
    Returns:
        注册响应（包含用户信息和token）
    """
    supabase = get_supabase()

    # 检查用户是否存在
    result = supabase.table('users').select('id').eq(
        'username', request.username
    ).execute()

    existing_users = filter_users_by_platform(supabase, result.data or [], request.platform)
    if existing_users:
        raise HTTPException(status_code=400, detail="用户名已存在")

    email_result = supabase.table('users').select('id').eq(
        'email', request.email
    ).execute()

    if email_result.data:
        raise HTTPException(status_code=400, detail="邮箱已存在")
    
    # 创建用户
    hashed_password = hash_password(request.password)
    user = _insert_user_record(supabase, request, hashed_password)
    
    # 生成 token
    token = create_access_token({'user_id': user['id']})
    
    return ADR.success(
        data={'user': user, 'token': token},
        message='注册成功',
    ).to_dict()


@router.post("/login", response_model=StandardResponse)
async def login(request: LoginRequest):
    """用户登录
    
    Args:
        request: 登录请求
        
    Returns:
        登录响应（包含用户信息和token）
    """
    supabase = get_supabase()

    # 查找用户
    result = supabase.table('users').select('*').eq(
        'username', request.username
    ).eq(
        'email', request.email
    ).execute()

    matched_users = filter_users_by_platform(supabase, result.data or [], request.platform)

    if not matched_users:
        raise HTTPException(status_code=401, detail="用户名、邮箱或密码错误")

    user = matched_users[0]

    # 验证密码
    if not verify_password(request.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="用户名、邮箱或密码错误")

    normalized_user = normalize_user_record(user, request.platform)

    # 生成 token
    token = create_access_token({'user_id': user['id']})
    
    return ADR.success(
        data={'user': normalized_user, 'token': token},
        message='登录成功',
    ).to_dict()


@router.get("/me", response_model=StandardResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """获取当前用户信息
    
    Args:
        current_user: 当前用户（依赖注入）
        
    Returns:
        用户信息
    """
    return ADR.success(data=current_user).to_dict()


@router.post("/logout", response_model=StandardResponse)
async def logout(current_user: dict = Depends(get_current_user)):
    """用户登出
    
    Args:
        current_user: 当前用户（依赖注入）
        
    Returns:
        登出响应
    """
    return ADR.success(message='登出成功').to_dict()
