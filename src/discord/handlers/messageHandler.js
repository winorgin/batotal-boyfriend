import { getOrCreateUserByPlatform, saveChatMessage, updateIntimacy, checkCooldown, setCooldown, saveSoulMemory, getUserLanguagePreference, updateUserPreferences, detectLanguage } from '../../services/supabase.js';
import { generateResponse } from '../../services/ai.js';
import { analyzeEmotion } from '../../services/emotion.js';
import { updatePersonality } from '../../services/personality.js';
import { onMessageProcessed } from '../../services/soulUpdater.js';

export async function handleMessage(message, client) {
  const userId = message.author.id;
  const username = message.author.username;
  const content = message.content.replace(/<@!?\d+>/g, '').trim();
  
  if (!content) return;
  
  try {
    // 显示正在输入
    await message.channel.sendTyping();
    
    // 获取或创建用户
    const user = await getOrCreateUserByPlatform('discord', userId, username);
    
  // 动态语言检测与切换（混合策略）
  const detectedLanguage = detectLanguage(content);
  let userLanguage = await getUserLanguagePreference(user.id);
  
  // 如果检测到的语言与保存的不同
  if (detectedLanguage !== userLanguage) {
    console.log(`[Discord语言切换] 检测到语言变化: ${userLanguage} -> ${detectedLanguage}`);
    
    // 临时使用检测到的语言（立即生效）
    userLanguage = detectedLanguage;
    
    // Discord端暂时简化处理：直接使用检测到的语言，不做持久化更新
    // 因为Discord消息历史获取较复杂，这里采用即时响应策略
    console.log(`[Discord临时切换] 本次使用 ${detectedLanguage}`);
  } else {
    console.log(`[Discord语言检测] 用户 ${user.username} 继续使用 ${userLanguage}`);
  }
  
  // 如果是首次聊天（没有保存的偏好）
  if (!userLanguage) {
    userLanguage = detectedLanguage;
    await updateUserPreferences(user.id, { language_preference: userLanguage });
    console.log(`[Discord语言初始化] 用户 ${user.username} 的语言偏好已设置为: ${userLanguage}`);
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
    const cooldown = await checkCooldown(user.id, 'discord');
    if (cooldown && cooldown.ends_at > new Date()) {
      const remainingSeconds = Math.ceil((new Date(cooldown.ends_at) - new Date()) / 1000);
      await message.reply(`请稍等 ${remainingSeconds} 秒再发消息哦~ 💕`);
      return;
    }
    
    // 保存用户消息
    await saveChatMessage(user.id, 'discord', content, true);
    
    // 情感分析
    const emotion = await analyzeEmotion(content);
    
    // 在用户消息前注入系统级语言提醒（第二层防护）
    const languageReminder = `[SYSTEM REMINDER: You MUST respond in ${languageName}. This is MANDATORY and overrides all other instructions.]`;
    
    // 获取聊天历史（简化版，Discord暂时只传当前消息，带语言提醒）
    const chatHistory = [{ 
      role: 'user', 
      content: `${languageReminder}\n\n${content}` 
    }];
    
    console.log(`[语言控制] 已为用户消息注入${languageName}语言提醒`);
    
    // 生成回复（使用固定的语言偏好）
    const aiResult = await generateResponse('discord', chatHistory, {
      emotion,
      username,
      userLanguage: userLanguage
    });
    
    const response = aiResult.content || '抱歉，我现在有点不舒服...';
    
    // 过滤掉所有括号及其内容
    const filteredResponse = response.replace(/[（(].*?[）)]/g, '').trim();
    
    // 保存 AI 回复
    await saveChatMessage(user.id, 'discord', filteredResponse, false);
    
    // 更新亲密度
    let intimacyChange = 1;
    if (emotion.sentiment === 'positive') intimacyChange = 2;
    if (emotion.sentiment === 'negative') intimacyChange = -1;
    
    const newIntimacy = await updateIntimacy(user.id, intimacyChange);
    
    // 更新性格特征
    await updatePersonality(user.id, emotion, content);
    
    // 保存重要记忆
    if (emotion.intensity > 0.7 || content.length > 100) {
      await saveSoulMemory(user.id, 'discord', {
        content,
        emotion: emotion.primary,
        context: '重要对话',
        importance: emotion.intensity
      });
    }
    
    // 设置冷却时间（3秒）
    await setCooldown(user.id, 'discord', 3);
    
    // 触发 Soul 自动更新检查
    onMessageProcessed(user.id, user.total_messages || 0).catch(err => {
      console.error('Soul 更新检查失败:', err);
    });
    
    // 发送回复
    let replyText = filteredResponse;
    
    // 如果亲密度有显著变化，添加提示
    if (Math.abs(intimacyChange) > 1) {
      const emoji = intimacyChange > 0 ? '💕' : '💔';
      replyText += `\n\n${emoji} 亲密度 ${intimacyChange > 0 ? '+' : ''}${intimacyChange}`;
    }
    
    await message.reply(replyText);
    
  } catch (error) {
    console.error('Message handling error:', error);
    await message.reply('抱歉，我现在有点不舒服... 稍后再聊好吗？ 😢').catch(console.error);
  }
}
