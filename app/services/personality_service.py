from typing import Dict
from app.core.database import get_supabase


class PersonalityService:
    """个性系统服务"""
    
    DEFAULT_TRAITS = {
        "cheerful": 0.5,
        "caring": 0.5,
        "playful": 0.5,
        "serious": 0.5,
        "romantic": 0.5
    }
    
    async def adjust_personality(
        self,
        user_id: str,
        current_mood: str,
        current_traits: Dict[str, float]
    ) -> Dict[str, float]:
        """根据情绪调整个性
        
        Args:
            user_id: 用户ID
            current_mood: 当前情绪
            current_traits: 当前个性特征
            
        Returns:
            调整后的个性特征
        """
        new_traits = current_traits.copy()
        
        # 根据情绪调整个性特征
        if current_mood == "happy":
            new_traits["cheerful"] = min(1.0, new_traits.get("cheerful", 0.5) + 0.05)
            new_traits["playful"] = min(1.0, new_traits.get("playful", 0.5) + 0.03)
        elif current_mood == "caring":
            new_traits["caring"] = min(1.0, new_traits.get("caring", 0.5) + 0.05)
            new_traits["romantic"] = min(1.0, new_traits.get("romantic", 0.5) + 0.03)
        elif current_mood == "focused":
            new_traits["serious"] = min(1.0, new_traits.get("serious", 0.5) + 0.05)
        
        # 归一化（保持总和约为 2.5）
        new_traits = self._normalize_traits(new_traits)
        
        # 更新数据库（若列尚未迁移则忽略）
        try:
            supabase = get_supabase()
            supabase.table('users')\
                .update({'personality_traits': new_traits})\
                .eq('id', user_id)\
                .execute()
        except Exception:
            pass  # personality_traits 列尚未迁移，跳过本次更新
        
        return new_traits
    
    def _normalize_traits(self, traits: Dict[str, float]) -> Dict[str, float]:
        """归一化个性特征
        
        Args:
            traits: 个性特征字典
            
        Returns:
            归一化后的个性特征
        """
        total = sum(traits.values())
        target = 2.5
        
        if total > 0:
            factor = target / total
            return {k: v * factor for k, v in traits.items()}
        
        return self.DEFAULT_TRAITS.copy()


# 全局实例
personality_service = PersonalityService()
