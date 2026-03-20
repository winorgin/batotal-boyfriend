import edge_tts
import os
from pathlib import Path
from datetime import datetime
from app.core.config import settings


class VoiceService:
    """语音生成服务"""
    
    VOICES = {
        "zh": "zh-CN-XiaoxiaoNeural",
        "en": "en-US-JennyNeural",
        "ja": "ja-JP-NanamiNeural",
        "ko": "ko-KR-SunHiNeural"
    }
    
    SCENE_PARAMS = {
        "daily": {"rate": "+0%", "pitch": "+0Hz"},
        "emotional": {"rate": "-10%", "pitch": "+5Hz"},
        "excited": {"rate": "+10%", "pitch": "+10Hz"},
        "comforting": {"rate": "-15%", "pitch": "-5Hz"},
        "serious": {"rate": "+0%", "pitch": "-5Hz"}
    }
    
    async def generate_voice(
        self,
        text: str,
        language: str,
        scene: str = "daily",
        message_id: str = None
    ) -> str:
        """生成语音文件
        
        Args:
            text: 要转换的文本
            language: 语言代码
            scene: 场景类型
            message_id: 消息ID（用于文件名）
            
        Returns:
            语音文件的相对路径
        """
        # 选择语音
        voice = self.VOICES.get(language, self.VOICES["zh"])
        
        # 获取场景参数
        params = self.SCENE_PARAMS.get(scene, self.SCENE_PARAMS["daily"])
        
        # 生成文件名
        if message_id:
            filename = f"{message_id}.mp3"
        else:
            filename = f"voice_{datetime.now().strftime('%Y%m%d%H%M%S')}.mp3"
        
        # 确保输出目录存在
        output_dir = Path(settings.VOICE_OUTPUT_DIR)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        output_path = output_dir / filename
        
        # 生成语音
        communicate = edge_tts.Communicate(
            text,
            voice,
            rate=params["rate"],
            pitch=params["pitch"]
        )
        
        await communicate.save(str(output_path))
        
        # 返回相对路径
        return f"/audio/{filename}"
    
    def detect_scene(self, text: str) -> str:
        """检测语音场景
        
        Args:
            text: 文本内容
            
        Returns:
            场景类型
        """
        if any(word in text for word in ["爱你", "想你", "喜欢", "❤️"]):
            return "emotional"
        elif any(word in text for word in ["哈哈", "开心", "太好了", "棒"]):
            return "excited"
        elif any(word in text for word in ["别难过", "没事的", "我在", "别担心"]):
            return "comforting"
        elif any(word in text for word in ["工作", "学习", "认真", "重要"]):
            return "serious"
        return "daily"


# 全局实例
voice_service = VoiceService()
