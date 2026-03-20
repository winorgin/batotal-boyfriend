from typing import Optional
from datetime import datetime
from app.core.database import get_supabase


class EmotionService:
    """情感系统服务"""
    
    MOODS = ["happy", "tired", "focused", "missing", "caring"]
    
    def __init__(self):
        self.mood_transitions = {
            "happy": {
                "negative_emotion": "caring",
                "long_conversation": "tired",
                "serious_topic": "focused"
            },
            "tired": {
                "positive_emotion": "happy",
                "rest": "happy"
            },
            "focused": {
                "topic_resolved": "happy",
                "emotional_support": "caring"
            },
            "missing": {
                "user_returns": "happy"
            },
            "caring": {
                "user_better": "happy"
            }
        }
    
    async def analyze_emotion(
        self,
        user_message: str,
        current_mood: str,
        message_count: int
    ) -> str:
        """分析并更新情绪
        
        Args:
            user_message: 用户消息
            current_mood: 当前情绪
            message_count: 消息计数
            
        Returns:
            新的情绪状态
        """
        # 检测用户情绪
        user_emotion = self._detect_user_emotion(user_message)
        
        # 根据规则转换情绪
        new_mood = current_mood
        
        if user_emotion == "negative":
            new_mood = "caring"
        elif message_count > 20:
            new_mood = "tired"
        elif self._is_serious_topic(user_message):
            new_mood = "focused"
        elif user_emotion == "positive":
            new_mood = "happy"
        
        return new_mood
    
    def _detect_user_emotion(self, message: str) -> str:
        """检测用户情绪
        
        Args:
            message: 用户消息
            
        Returns:
            情绪类型 (positive/negative/neutral)
        """
        positive_words = ["开心", "高兴", "快乐", "哈哈", "😊", "❤️", "太好了", "棒"]
        negative_words = ["难过", "伤心", "痛苦", "😢", "失望", "累", "烦"]
        
        if any(word in message for word in positive_words):
            return "positive"
        elif any(word in message for word in negative_words):
            return "negative"
        
        return "neutral"
    
    def _is_serious_topic(self, message: str) -> bool:
        """判断是否为严肃话题
        
        Args:
            message: 用户消息
            
        Returns:
            是否为严肃话题
        """
        serious_keywords = ["工作", "学习", "问题", "困难", "帮助", "建议"]
        return any(keyword in message for keyword in serious_keywords)
    
    async def update_mood(self, user_id: str, new_mood: str, reason: str):
        """更新用户情绪状态
        
        Args:
            user_id: 用户ID
            new_mood: 新情绪
            reason: 变化原因
        """
        supabase = get_supabase()
        
        # 更新用户当前情绪
        supabase.table('users')\
            .update({'current_mood': new_mood})\
            .eq('id', user_id)\
            .execute()
        
        # 记录情绪历史
        supabase.table('mood_history').insert({
            'user_id': user_id,
            'mood': new_mood,
            'reason': reason,
            'created_at': datetime.utcnow().isoformat()
        }).execute()


# 全局实例
emotion_service = EmotionService()
