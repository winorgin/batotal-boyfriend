from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from app.schemas.chat import SendMessageRequest
from app.schemas.base import AifriendDictResponse as ADR, StandardResponse
from app.api.deps import get_current_user
from app.services.ai_service import ai_service
from app.services.memory_service import memory_service
from app.services.emotion_service import emotion_service
from app.services.personality_service import personality_service
from app.services.voice_service import voice_service
from app.core.database import get_supabase
from app.core.db_compat import normalize_user_record, resolve_user_platform
from datetime import datetime
import asyncio
from functools import lru_cache
from typing import Dict, List, Tuple

router = APIRouter()


# 用户数据缓存（5分钟过期）
@lru_cache(maxsize=1000)
def _get_cache_key(user_id: str) -> str:
    """生成缓存键（每5分钟变化一次）"""
    import time
    cache_time = int(time.time() / 300)  # 5分钟 = 300秒
    return f"{user_id}_{cache_time}"


async def get_cached_user_data(user_id: str) -> dict:
    """获取缓存的用户数据"""
    cache_key = _get_cache_key(user_id)
    supabase = get_supabase()
    
    result = supabase.table('users')\
        .select('*')\
        .eq('id', user_id)\
        .single()\
        .execute()

    user = result.data
    platform = resolve_user_platform(supabase, user, 'web')
    return normalize_user_record(user, platform)


async def background_voice_generation(
    text: str,
    language: str,
    scene: str,
    message_id: str,
    user_id: str
):
    """后台生成语音并更新数据库"""
    try:
        voice_url = await voice_service.generate_voice(text, language, scene, message_id)
        
        # 更新消息的语音URL
        supabase = get_supabase()
        supabase.table('chat_messages')\
            .update({'voice_url': voice_url})\
            .eq('id', message_id)\
            .execute()
    except Exception as e:
        print(f"后台语音生成失败: {str(e)}")


async def background_memory_extraction(
    user_message: str,
    ai_reply: str,
    user_id: str
):
    """后台提取记忆"""
    try:
        await memory_service.extract_memories(user_message, ai_reply, user_id)
    except Exception as e:
        print(f"后台记忆提取失败: {str(e)}")


@router.post("/send", response_model=StandardResponse)
async def send_message(
    request: SendMessageRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """发送消息
    
    Args:
        request: 发送消息请求
        current_user: 当前用户
        
    Returns:
        消息响应（包含AI回复、语音URL等）
    """
    user_id = current_user['id']
    supabase = get_supabase()
    
    # 先获取用户缓存数据（包含偏好语言）
    cached_user = await get_cached_user_data(user_id)
    
    # 检测语言（使用用户偏好语言作为备用）
    user_preferred_language = cached_user.get('preferred_language', 'zh')
    user_language = ai_service.detect_language(request.message, user_preferred_language)
    
    # 并行获取数据：记忆、历史
    async def get_chat_history():
        try:
            result = supabase.table('chat_messages')\
                .select('message, reply')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(5)\
                .execute()
        except Exception:
            # reply 列可能尚未迁移，降级为仅取 message 列
            result = supabase.table('chat_messages')\
                .select('message')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(5)\
                .execute()

        history = []
        for msg in reversed(result.data):
            history.append({"role": "user", "content": msg.get('message', '')})
            ai_reply = msg.get('reply') or ''
            if ai_reply:
                history.append({"role": "assistant", "content": ai_reply})
        return history
    
    # 并行执行独立操作
    relevant_memories, conversation_history = await asyncio.gather(
        memory_service.retrieve_relevant_memories(user_id, request.message, limit=10),
        get_chat_history()
    )
    
    # 分析情绪和调整个性（可以并行）
    current_mood = cached_user.get('current_mood', 'neutral')
    personality_traits = cached_user.get('personality_traits', {})
    
    new_mood, new_traits = await asyncio.gather(
        emotion_service.analyze_emotion(request.message, current_mood, 0),
        personality_service.adjust_personality(user_id, current_mood, personality_traits)
    )
    
    # 构建系统提示词
    relationship_stage = cached_user.get('relationship_stage', '密友')
    system_prompt = ai_service.build_system_prompt(
        user_language,
        relationship_stage,
        new_traits,
        new_mood,
        relevant_memories
    )
    
    # 生成 AI 响应
    try:
        ai_reply = await ai_service.generate_response(
            request.message,
            system_prompt,
            conversation_history
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI服务错误: {str(e)}")
    
    # 计算亲密度变化
    intimacy_change = 1
    if len(request.message) > 50:
        intimacy_change += 1
    
    new_intimacy = cached_user['intimacy'] + intimacy_change
    
    # 保存消息（完整字段，若扩展列尚未迁移则降级为基础字段）
    message_data_full = {
        'user_id': user_id,
        'platform': cached_user.get('platform', 'web'),
        'message': request.message,
        'reply': ai_reply,
        'voice_url': None,
        'intimacy_change': intimacy_change,
        'is_user': False,
        'user_emotion': emotion_service._detect_user_emotion(request.message),
        'ai_mood': new_mood
    }
    try:
        result = supabase.table('chat_messages').insert(message_data_full).execute()
    except Exception:
        # 回退到基础字段（reply/voice_url 等列可能尚未迁移）
        message_data_base = {
            'user_id': user_id,
            'platform': cached_user.get('platform', 'web'),
            'message': request.message,
            'is_user': False,
        }
        result = supabase.table('chat_messages').insert(message_data_base).execute()
    message_id = result.data[0]['id']
    
    # 合并所有用户数据更新为一次操作（若扩展列尚未迁移则降级）
    update_data_full = {
        'preferred_language': user_language,
        'intimacy': new_intimacy,
        'last_message_at': datetime.utcnow().isoformat()
    }
    if new_mood != current_mood:
        update_data_full['current_mood'] = new_mood

    try:
        supabase.table('users').update(update_data_full).eq('id', user_id).execute()
    except Exception:
        # 回退：只更新基础字段 intimacy 和 current_mood
        update_data_base = {'intimacy': new_intimacy}
        if new_mood != current_mood:
            update_data_base['current_mood'] = new_mood
        try:
            supabase.table('users').update(update_data_base).eq('id', user_id).execute()
        except Exception:
            pass
    
    # 后台任务：生成语音和提取记忆
    scene = voice_service.detect_scene(ai_reply)
    background_tasks.add_task(
        background_voice_generation,
        ai_reply, user_language, scene, message_id, user_id
    )
    background_tasks.add_task(
        background_memory_extraction,
        request.message, ai_reply, user_id
    )
    
    # 立即返回响应（语音URL稍后通过WebSocket推送）
    return ADR.success(data={
        'reply': ai_reply,
        'voiceUrl': None,  # 后台生成中
        'intimacyChange': intimacy_change,
        'newIntimacy': new_intimacy,
        'relationshipStage': relationship_stage,
        'currentMood': new_mood,
        'messageId': message_id,
    }).to_dict()


@router.get("/history", response_model=StandardResponse)
async def get_chat_history(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """获取聊天历史
    
    Args:
        limit: 返回数量限制
        offset: 偏移量
        current_user: 当前用户
        
    Returns:
        聊天历史响应
    """
    supabase = get_supabase()
    
    result = supabase.table('chat_messages')\
        .select('*')\
        .eq('user_id', current_user['id'])\
        .order('created_at', desc=True)\
        .range(offset, offset + limit - 1)\
        .execute()
    
    # 获取总数
    count_result = supabase.table('chat_messages')\
        .select('id', count='exact')\
        .eq('user_id', current_user['id'])\
        .execute()
    
    return ADR.success(data={
        'messages': result.data,
        'total': count_result.count,
        'limit': limit,
        'offset': offset,
    }).to_dict()
