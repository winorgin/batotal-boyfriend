from fastapi import APIRouter, Depends
from app.schemas.base import AifriendDictResponse as ADR, StandardResponse
from app.api.deps import get_current_user
from app.core.database import get_supabase

router = APIRouter()


@router.get("/stats", response_model=StandardResponse)
async def get_user_stats(current_user: dict = Depends(get_current_user)):
    """获取用户统计
    
    Args:
        current_user: 当前用户
        
    Returns:
        用户统计信息
    """
    supabase = get_supabase()
    
    # 获取消息总数
    messages_result = supabase.table('chat_messages')\
        .select('id', count='exact')\
        .eq('user_id', current_user['id'])\
        .execute()
    
    # 获取最近记忆
    memories_result = supabase.table('soul_memories')\
        .select('*')\
        .eq('user_id', current_user['id'])\
        .order('created_at', desc=True)\
        .limit(5)\
        .execute()
    
    return ADR.success(data={
        'userId': current_user['id'],
        'username': current_user['username'],
        'platform': current_user['platform'],
        'intimacy': current_user['intimacy'],
        'relationshipStage': current_user.get('relationship_stage', '密友'),
        'dolBalance': current_user['dol_balance'],
        'totalMessages': messages_result.count,
        'lastMessageAt': current_user.get('last_message_at'),
        'accountCreatedAt': current_user['created_at'],
        'currentMood': current_user['current_mood'],
        'personalityTraits': current_user.get('personality_traits', {}),
        'recentMemories': memories_result.data,
    }).to_dict()
