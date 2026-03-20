from typing import List, Dict
from datetime import datetime, timedelta
from app.core.database import get_supabase


class MemoryService:
    """记忆系统服务"""
    
    MEMORY_TYPES = ["FACT", "PREFERENCE", "EVENT", "EMOTION", "RELATIONSHIP"]
    IMPORTANCE_LEVELS = {
        "CRITICAL": 4,
        "HIGH": 3,
        "MEDIUM": 2,
        "LOW": 1
    }
    
    async def extract_memories(
        self,
        user_message: str,
        ai_reply: str,
        user_id: str
    ) -> List[Dict]:
        """从对话中提取记忆
        
        Args:
            user_message: 用户消息
            ai_reply: AI回复
            user_id: 用户ID
            
        Returns:
            提取的记忆列表
        """
        memories = []
        
        # 简单的关键词匹配提取（实际应用中可以使用 NLP）
        if any(word in user_message for word in ["喜欢", "爱", "最爱", "偏好"]):
            memories.append({
                "user_id": user_id,
                "memory_type": "PREFERENCE",
                "content": f"用户提到：{user_message[:50]}",
                "importance": 2,
                "context": ai_reply[:100]
            })
        
        if any(word in user_message for word in ["生日", "纪念日", "重要", "特殊"]):
            memories.append({
                "user_id": user_id,
                "memory_type": "EVENT",
                "content": f"重要事件：{user_message[:50]}",
                "importance": 3,
                "context": ai_reply[:100]
            })
        
        if any(word in user_message for word in ["难过", "开心", "生气", "感动"]):
            memories.append({
                "user_id": user_id,
                "memory_type": "EMOTION",
                "content": f"情感表达：{user_message[:50]}",
                "importance": 2,
                "context": ai_reply[:100]
            })
        
        # 保存记忆到数据库
        if memories:
            supabase = get_supabase()
            for memory in memories:
                supabase.table('soul_memories').insert(memory).execute()
        
        return memories
    
    async def retrieve_relevant_memories(
        self,
        user_id: str,
        query: str,
        limit: int = 10
    ) -> List[str]:
        """检索相关记忆
        
        Args:
            user_id: 用户ID
            query: 查询文本
            limit: 返回数量限制
            
        Returns:
            相关记忆列表
        """
        supabase = get_supabase()
        
        # 获取用户的所有记忆，按重要性和时间排序
        result = supabase.table('soul_memories')\
            .select('*')\
            .eq('user_id', user_id)\
            .order('importance', desc=True)\
            .order('last_accessed_at', desc=True)\
            .limit(limit)\
            .execute()
        
        memories = []
        memory_ids = []
        
        for mem in result.data:
            memories.append(f"[{mem['memory_type']}] {mem['content']}")
            memory_ids.append(mem['id'])
        
        # 批量更新访问时间（非阻塞，可以在后台执行）
        if memory_ids:
            # 使用 IN 查询批量更新，而不是逐个更新
            try:
                supabase.table('soul_memories')\
                    .update({'last_accessed_at': datetime.utcnow().isoformat()})\
                    .in_('id', memory_ids)\
                    .execute()
            except Exception as e:
                # 访问时间更新失败不影响主流程
                print(f"批量更新记忆访问时间失败: {str(e)}")
        
        return memories
    
    async def decay_memories(self, user_id: str):
        """记忆衰减机制
        
        Args:
            user_id: 用户ID
        """
        supabase = get_supabase()
        
        # 获取 30 天未访问的记忆
        threshold_date = (datetime.utcnow() - timedelta(days=30)).isoformat()
        
        result = supabase.table('soul_memories')\
            .select('*')\
            .eq('user_id', user_id)\
            .lt('last_accessed_at', threshold_date)\
            .execute()
        
        for memory in result.data:
            # 降低重要性
            new_importance = max(1, memory['importance'] - 1)
            
            if new_importance == 1 and memory['importance'] == 1:
                # 删除 LOW 级别的旧记忆
                supabase.table('soul_memories').delete().eq('id', memory['id']).execute()
            else:
                # 降低重要性
                supabase.table('soul_memories')\
                    .update({'importance': new_importance})\
                    .eq('id', memory['id'])\
                    .execute()


# 全局实例
memory_service = MemoryService()
