import httpx
from typing import List, Dict
from app.core.config import settings


class AIService:
    """AI 服务 - 豆包 AI"""
    
    def __init__(self):
        self.api_key = settings.ARK_API_KEY
        self.endpoint_id = settings.ENDPOINT_ID
        self.api_url = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
    
    async def generate_response(
        self,
        message: str,
        system_prompt: str,
        conversation_history: List[Dict[str, str]]
    ) -> str:
        """生成 AI 响应
        
        Args:
            message: 用户消息
            system_prompt: 系统提示词
            conversation_history: 对话历史
            
        Returns:
            AI生成的回复
        """
        messages = [
            {"role": "system", "content": system_prompt},
            *conversation_history,
            {"role": "user", "content": message}
        ]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.api_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.endpoint_id,
                    "messages": messages
                }
            )
            
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    
    def build_system_prompt(
        self,
        user_language: str,
        relationship_stage: str,
        personality_traits: dict,
        current_mood: str,
        relevant_memories: List[str]
    ) -> str:
        """构建系统提示词
        
        Args:
            user_language: 用户语言
            relationship_stage: 关系阶段
            personality_traits: 个性特征
            current_mood: 当前情绪
            relevant_memories: 相关记忆
            
        Returns:
            完整的系统提示词
        """
        # 语言指令
        language_instruction = self._get_language_instruction(user_language)
        
        # 关系阶段描述
        relationship_desc = self._get_relationship_description(relationship_stage)
        
        # 个性特征描述
        personality_desc = self._format_personality(personality_traits)
        
        # 情绪描述
        mood_desc = self._get_mood_description(current_mood)
        
        # 记忆描述
        memories_desc = "\n".join([f"{i+1}. {mem}" for i, mem in enumerate(relevant_memories)])
        
        system_prompt = f"""【超强制语言指令】
{language_instruction}

【角色设定】
你是 Elio，35 岁的自由投资人，温柔霸总特质。

【关系阶段】
{relationship_desc}

【个性特征】
{personality_desc}

【当前情绪】
{mood_desc}

【重要记忆】
{memories_desc if memories_desc else "暂无重要记忆"}

【回复要求】
- 保持角色一致性
- 根据关系阶段调整亲密度
- 体现当前情绪状态
- 结合重要记忆
- 自然流畅，避免机械感
"""
        return system_prompt
    
    def _get_language_instruction(self, language: str) -> str:
        """获取语言指令"""
        instructions = {
            "zh": "用户使用中文，你必须用中文回复。",
            "en": "User uses English, you must reply in English.",
            "ja": "ユーザーは日本語を使用しています。日本語で返信してください。",
            "ko": "사용자가 한국어를 사용합니다. 한국어로 답장해 주세요."
        }
        return instructions.get(language, instructions["zh"])
    
    def _get_relationship_description(self, stage: str) -> str:
        """获取关系阶段描述"""
        descriptions = {
            "密友": "当前关系：密友。互动方式：温暖友好，偶尔调侃。",
            "恋人": "当前关系：恋人。互动方式：亲密温柔，充满爱意。",
            "灵魂伴侣": "当前关系：灵魂伴侣。互动方式：深度默契，心灵相通。"
        }
        return descriptions.get(stage, descriptions["密友"])
    
    def _format_personality(self, traits: dict) -> str:
        """格式化个性特征"""
        trait_names = {
            "cheerful": "开朗度",
            "caring": "关怀度",
            "playful": "玩心度",
            "serious": "严肃度",
            "romantic": "浪漫度"
        }
        lines = [f"- {trait_names.get(k, k)}: {v:.1f}" for k, v in traits.items()]
        return "\n".join(lines)
    
    def _get_mood_description(self, mood: str) -> str:
        """获取情绪描述"""
        descriptions = {
            "happy": "情绪：开心。原因：用户的积极互动。",
            "tired": "情绪：疲惫。原因：长时间对话。",
            "focused": "情绪：专注。原因：讨论严肃话题。",
            "missing": "情绪：想念。原因：长时间未互动。",
            "caring": "情绪：关怀。原因：用户表达负面情绪。"
        }
        return descriptions.get(mood, descriptions["happy"])
    
    def detect_language(self, text: str, fallback_language: str = 'en') -> str:
        """检测文本语言
        
        Args:
            text: 要检测的文本
            fallback_language: 当无法识别语言时使用的备用语言（默认为用户偏好语言）
            
        Returns:
            语言代码 (zh/en/ja/ko/ar)
        """
        # 检测是否主要是数字（包括带空格、逗号、点的数字）
        cleaned_text = text.strip().replace(' ', '').replace(',', '').replace('.', '').replace('-', '')
        if cleaned_text and cleaned_text.isdigit():
            return fallback_language
        
        # 检测明确的语言特征
        has_chinese = any('\u4e00' <= char <= '\u9fff' for char in text)
        has_japanese = any('\u3040' <= char <= '\u309f' or '\u30a0' <= char <= '\u30ff' for char in text)
        has_korean = any('\uac00' <= char <= '\ud7af' for char in text)
        has_arabic = any('\u0600' <= char <= '\u06ff' for char in text)
        has_english = any('a' <= char.lower() <= 'z' for char in text)
        
        # 如果检测到明确的语言特征，返回对应语言
        if has_chinese:
            return 'zh'
        elif has_japanese:
            return 'ja'
        elif has_korean:
            return 'ko'
        elif has_arabic:
            return 'ar'
        elif has_english:
            return 'en'
        
        # 如果没有检测到任何明确的语言特征（如纯符号、表情等），使用备用语言
        return fallback_language


# 全局实例
ai_service = AIService()
