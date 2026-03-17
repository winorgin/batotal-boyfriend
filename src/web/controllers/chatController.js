import { saveChatMessage, updateIntimacy, checkCooldown, setCooldown, saveSoulMemory, getRecentMessages, getUserLanguagePreference, updateUserPreferences, detectLanguage } from '../../services/supabase.js';
import { generateResponse } from '../../services/ai.js';
import { analyzeEmotion } from '../../services/emotion.js';
import { updatePersonality } from '../../services/personality.js';
import { onMessageProcessed } from '../../services/soulUpdater.js';
import { generateVoiceWithScene } from '../../services/voice.js';

// 发送消息
export async function sendMessage(req, res) {
  try {
    const { message } = req.body;
    const user = req.user;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: '消息不能为空' });
    }
    
  // 动态语言检测与切换（混合策略）
  const detectedLanguage = detectLanguage(message);
  let userLanguage = await getUserLanguagePreference(user.id);
  
  // 如果检测到的语言与保存的不同
  if (detectedLanguage !== userLanguage) {
    console.log(`[语言切换] 检测到语言变化: ${userLanguage} -> ${detectedLanguage}`);
    
    // 临时使用检测到的语言（立即生效）
    userLanguage = detectedLanguage;
    
    // 检查最近3条消息的语言，判断是否需要永久更新偏好
    const { data: recentUserMessages } = await getRecentMessages(user.id, 'web', 6);
    const userOnlyMessages = recentUserMessages.filter(msg => msg.is_user).slice(-3);
    
    if (userOnlyMessages.length >= 2) {
      const recentLanguages = userOnlyMessages.map(msg => detectLanguage(msg.message));
      const allSameLanguage = recentLanguages.every(lang => lang === detectedLanguage);
      
      if (allSameLanguage) {
        // 连续多条都是新语言，永久更新偏好
        await updateUserPreferences(user.id, { language_preference: detectedLanguage });
        console.log(`[语言偏好更新] 用户 ${user.username} 持续使用 ${detectedLanguage}，已永久更新偏好`);
      } else {
        console.log(`[临时切换] 本次使用 ${detectedLanguage}，但未更新偏好（需连续使用才会更新）`);
      }
    } else {
      console.log(`[临时切换] 本次使用 ${detectedLanguage}，消息数不足，暂不更新偏好`);
    }
  } else {
    console.log(`[语言检测] 用户 ${user.username} 继续使用 ${userLanguage}`);
  }
  
  // 如果是首次聊天（没有保存的偏好）
  if (!userLanguage) {
    userLanguage = detectedLanguage;
    await updateUserPreferences(user.id, { language_preference: userLanguage });
    console.log(`[语言初始化] 用户 ${user.username} 的语言偏好已设置为: ${userLanguage}`);
  }
  
  // 语言名称映射
  const languageNames = {
    'zh': '中文',
    'ja': '日本語',
    'ko': '한국어',
    'ar': 'العربية',
    'ru': 'Русский',
    'th': 'ไทย',
    'el': 'Ελληνικά',
    'vi': 'Tiếng Việt',
    'he': 'עברית',
    'en': 'English'
  };
  
  const languageName = languageNames[userLanguage] || 'English';
    
    // 检查冷却时间
    const cooldown = await checkCooldown(user.id, 'web');
    if (cooldown && cooldown.ends_at > new Date()) {
      const remainingSeconds = Math.ceil((new Date(cooldown.ends_at) - new Date()) / 1000);
      return res.status(429).json({ 
        success: false, 
        error: `请稍等 ${remainingSeconds} 秒再发消息`,
        cooldown: remainingSeconds
      });
    }
    
    // 保存用户消息
    await saveChatMessage(user.id, 'web', message, true);
    
    // 情感分析
    const emotion = await analyzeEmotion(message);
    
    // 获取聊天历史
    const { data: recentMessages } = await getRecentMessages(user.id, 'web', 10);
    const chatHistory = recentMessages.map(msg => ({
      role: msg.is_user ? 'user' : 'assistant',
      content: msg.message
    }));
    
    // 在用户消息前注入系统级语言提醒（第二层防护）
    const languageReminder = `[SYSTEM REMINDER: You MUST respond in ${languageName}. This is MANDATORY and overrides all other instructions.]`;
    
    // 添加当前消息（带语言提醒）
    chatHistory.push({ 
      role: 'user', 
      content: `${languageReminder}\n\n${message}` 
    });
    
    console.log(`[语言控制] 已为用户消息注入${languageName}语言提醒`);
    
    // 生成回复（使用固定的语言偏好）
    const aiResult = await generateResponse('web', chatHistory, {
      emotion,
      username: user.username,
      userLanguage: userLanguage
    });
    
    if (!aiResult.content) {
      return res.status(500).json({ 
        success: false, 
        error: 'AI 服务暂时不可用，请稍后重试' 
      });
    }
    
    // 过滤掉所有括号及其内容
    const filteredContent = aiResult.content.replace(/[（(].*?[）)]/g, '').trim();
    
    // 保存过滤后的 AI 回复
    await saveChatMessage(user.id, 'web', filteredContent, false, null, emotion.primary, aiResult.tokensUsed);
    
    // 更新亲密度
    let intimacyChange = 1;
    if (emotion.sentiment === 'positive') intimacyChange = 2;
    if (emotion.sentiment === 'negative') intimacyChange = -1;
    
    const newIntimacy = await updateIntimacy(user.id, intimacyChange);
    
    // 更新性格特征
    await updatePersonality(user.id, emotion, message);
    
    // 保存重要记忆
    if (emotion.intensity > 0.7 || message.length > 100) {
      await saveSoulMemory(user.id, 'web', {
        content: message,
        emotion: emotion.primary,
        context: '重要对话',
        importance: emotion.intensity
      });
    }
    
    // 设置冷却时间（3秒）
    await setCooldown(user.id, 'web', 3);
    
    // 生成语音（异步，不阻塞响应）
    let audioUrl = null;
    try {
      const voiceResult = await generateVoiceWithScene(aiResult.content);
      if (voiceResult.success) {
        audioUrl = voiceResult.audioUrl;
      }
    } catch (voiceError) {
      console.error('语音生成失败:', voiceError);
      // 语音生成失败不影响主流程
    }
    
    // 触发 Soul 自动更新检查
    onMessageProcessed(user.id, user.total_messages || 0).catch(err => {
      console.error('Soul 更新检查失败:', err);
    });
    
    res.json({
      success: true,
      response: filteredContent,
      audioUrl,
      intimacyChange,
      newIntimacy,
      emotion: emotion.primary
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: '发送消息失败' });
  }
}

// 获取聊天历史
export async function getHistory(req, res) {
  try {
    const user = req.user;
    const limit = parseInt(req.query.limit) || 50;
    
    const { data: messages } = await getRecentMessages(user.id, 'web', limit);
    
    // 转换数据格式以匹配前端期望
    const history = messages.map(msg => ({
      role: msg.is_user ? 'user' : 'assistant',
      content: msg.message,
      created_at: msg.created_at,
      emotion: msg.emotion
    }));
    
    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ success: false, error: '获取历史记录失败' });
  }
}
