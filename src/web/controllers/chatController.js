import { saveChatMessage, updateIntimacy, checkCooldown, setCooldown, saveSoulMemory, getRecentMessages, getUserLanguagePreference, updateUserPreferences, detectLanguage } from '../../services/supabase.js';
import { generateResponse } from '../../services/ai.js';
import { analyzeEmotion, transitionMoodState, checkSchedule } from '../../services/emotion.js';
import { updatePersonality, getPersonalityState } from '../../services/personality.js';
import { extractMemoriesFromConversation, retrieveRelevantMemories } from '../../services/memory.js';
import { onMessageProcessed } from '../../services/soulUpdater.js';
import { generateVoiceWithScene } from '../../services/voice.js';
import wsManager from '../../services/websocket.js';

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
    
    // 并行执行所有数据库查询和分析（性能优化）
    const [
      ,
      emotion,
      ,
      { data: lastMessages },
      relevantMemories,
      personalityState,
      { data: recentMessages }
    ] = await Promise.all([
      saveChatMessage(user.id, 'web', message, true),
      analyzeEmotion(message),
      checkSchedule(user.id),
      getRecentMessages(user.id, 'web', 1),
      retrieveRelevantMemories(user.id, message, 5),
      getPersonalityState(user.id),
      getRecentMessages(user.id, 'web', 10)
    ]);
    
    // 计算距离上次互动的时间
    const lastInteractionTime = lastMessages.length > 0 ? new Date(lastMessages[0].created_at) : null;
    const hoursSinceLastInteraction = lastInteractionTime 
      ? (Date.now() - lastInteractionTime.getTime()) / (1000 * 60 * 60)
      : 0;
    
    // 更新情绪状态（不阻塞主流程）
    transitionMoodState(user.id, emotion, {
      timeOfDay: true,
      lastInteractionHours: hoursSinceLastInteraction
    }).catch(err => console.error('情绪状态更新失败:', err));
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
    
    // 生成回复（使用固定的语言偏好和新的上下文）
    const aiResult = await generateResponse('web', chatHistory, {
      username: user.username,
      relationshipStage: user.relationship_stage || 'close_friend',
      intimacyLevel: user.intimacy_level || 0,
      personalityTraits: personalityState?.traits || {},
      moodState: personalityState?.current_mood || 'neutral',
      recentMemories: relevantMemories,
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
    
    // 计算亲密度变化
    let intimacyChange = 1;
    if (emotion.sentiment === 'positive') intimacyChange = 2;
    if (emotion.sentiment === 'negative') intimacyChange = -1;
    
    // 检查用户是否在线（使用 WebSocket）
    const isOnline = wsManager.isUserOnline(user.id);
    
    if (isOnline) {
      // WebSocket 模式：立即返回确认，后台处理并推送
      console.log(`[WebSocket] 用户 ${user.username} 在线，使用实时推送模式`);
      
      // 立即返回确认响应（< 500ms）
      res.json({
        success: true,
        mode: 'websocket',
        message: '消息已接收，正在处理中...'
      });
      
      // 发送"正在输入"状态
      wsManager.sendTypingStatus(user.id, true);
      
      // 后台处理并通过 WebSocket 推送结果
      (async () => {
        try {
          // 并行执行关键操作
          const [, newIntimacy] = await Promise.all([
            saveChatMessage(user.id, 'web', filteredContent, false, null, emotion.primary, aiResult.tokensUsed),
            updateIntimacy(user.id, intimacyChange),
            setCooldown(user.id, 'web', 3)
          ]);
          
          // 停止"正在输入"状态
          wsManager.sendTypingStatus(user.id, false);
          
          // 推送 AI 响应
          wsManager.sendAIResponse(user.id, filteredContent, emotion.primary);
          
          // 推送亲密度更新
          wsManager.sendIntimacyUpdate(user.id, intimacyChange, newIntimacy);
          
          // 后台异步任务
          Promise.all([
            updatePersonality(user.id, emotion, message),
            extractMemoriesFromConversation(user.id, message, filteredContent, emotion).catch(err => 
              console.error('记忆提取失败:', err)
            ),
            (emotion.intensity > 0.7 || message.length > 100) 
              ? saveSoulMemory(user.id, 'web', {
                  content: message,
                  emotion: emotion.primary,
                  context: '重要对话',
                  importance: emotion.intensity
                })
              : Promise.resolve(),
            onMessageProcessed(user.id, user.total_messages || 0)
          ]).catch(err => console.error('后台任务失败:', err));
          
          // 语音生成完全异步，完成后推送
          generateVoiceWithScene(filteredContent).then(voiceResult => {
            if (voiceResult.success) {
              console.log('语音生成成功，推送给用户:', voiceResult.audioUrl);
              wsManager.sendVoiceReady(user.id, voiceResult.audioUrl);
            }
          }).catch(err => console.error('语音生成失败:', err));
          
        } catch (error) {
          console.error('[WebSocket] 后台处理失败:', error);
          wsManager.sendError(user.id, '处理消息时出错', 'PROCESSING_ERROR');
        }
      })();
      
    } else {
      // 传统模式：等待所有处理完成后返回（兼容性）
      console.log(`[传统模式] 用户 ${user.username} 离线，使用同步响应模式`);
      
      // 并行执行关键操作
      const [, newIntimacy] = await Promise.all([
        saveChatMessage(user.id, 'web', filteredContent, false, null, emotion.primary, aiResult.tokensUsed),
        updateIntimacy(user.id, intimacyChange),
        setCooldown(user.id, 'web', 3)
      ]);
      
      // 后台异步任务（不阻塞响应）
      Promise.all([
        updatePersonality(user.id, emotion, message),
        extractMemoriesFromConversation(user.id, message, filteredContent, emotion).catch(err => 
          console.error('记忆提取失败:', err)
        ),
        (emotion.intensity > 0.7 || message.length > 100) 
          ? saveSoulMemory(user.id, 'web', {
              content: message,
              emotion: emotion.primary,
              context: '重要对话',
              importance: emotion.intensity
            })
          : Promise.resolve(),
        onMessageProcessed(user.id, user.total_messages || 0)
      ]).catch(err => console.error('后台任务失败:', err));
      
      // 语音生成完全异步（不等待结果）
      let audioUrl = null;
      generateVoiceWithScene(filteredContent).then(voiceResult => {
        if (voiceResult.success) {
          console.log('语音生成成功:', voiceResult.audioUrl);
        }
      }).catch(err => console.error('语音生成失败:', err));
      
      res.json({
        success: true,
        mode: 'traditional',
        response: filteredContent,
        audioUrl,
        intimacyChange,
        newIntimacy,
        emotion: emotion.primary
      });
    }
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
