/**
 * AI 服务 - 统一多平台
 * 支持 OpenRouter 和豆包 AI
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// OpenRouter AI (用于 Discord)
// ============================================

export async function generateResponseOpenRouter(messages, model = null) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const selectedModel = model || process.env.OPENROUTER_MODEL || 'anthropic/claude-3-sonnet';

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: selectedModel,
        messages: messages,
        temperature: 0.8,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ai-boyfriend.app',
          'X-Title': 'AI Boyfriend'
        }
      }
    );

    return {
      content: response.data.choices[0].message.content,
      tokensUsed: response.data.usage?.total_tokens || 0,
      error: null
    };
  } catch (error) {
    console.error('OpenRouter AI 错误:', error.response?.data || error.message);
    return {
      content: null,
      tokensUsed: 0,
      error: error.message
    };
  }
}

// ============================================
// 豆包 AI (用于 Web)
// ============================================

export async function generateResponseDoubao(messages) {
  try {
    const apiKey = process.env.ARK_API_KEY;
    const endpointId = process.env.ENDPOINT_ID;

    if (!apiKey || !endpointId) {
      throw new Error('豆包 AI 配置缺失');
    }

    const response = await axios.post(
      `https://ark.cn-beijing.volces.com/api/v3/chat/completions`,
      {
        model: endpointId,
        messages: messages,
        temperature: 0.8,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.choices[0].message.content,
      tokensUsed: response.data.usage?.total_tokens || 0,
      error: null
    };
  } catch (error) {
    console.error('豆包 AI 错误:', error.response?.data || error.message);
    return {
      content: null,
      tokensUsed: 0,
      error: error.message
    };
  }
}

// ============================================
// 统一 AI 接口
// ============================================

/**
 * 根据平台选择合适的 AI 服务
 */
export async function generateResponse(platform, messages, userContext = {}) {
  // 构建系统提示词
  const systemPrompt = buildSystemPrompt(userContext);
  
  // 添加系统提示词到消息列表
  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  // 根据平台选择 AI 服务
  if (platform === 'discord') {
    return await generateResponseOpenRouter(fullMessages);
  } else if (platform === 'web') {
    return await generateResponseDoubao(fullMessages);
  } else {
    // 默认使用 OpenRouter
    return await generateResponseOpenRouter(fullMessages);
  }
}

// ============================================
// 系统提示词构建
// ============================================

function buildSystemPrompt(userContext) {
  const {
    username = 'user',
    relationshipStage = 'stranger',
    intimacyLevel = 0,
    personalityTraits = {},
    moodState = 'neutral',
    recentMemories = [],
    userLanguage = 'en'
  } = userContext;

  // 语言映射表
  const languageMap = {
    'zh': 'CHINESE (中文)',
    'ja': 'JAPANESE (日本語)',
    'ko': 'KOREAN (한국어)',
    'ar': 'ARABIC (العربية)',
    'ru': 'RUSSIAN (Русский)',
    'th': 'THAI (ไทย)',
    'el': 'GREEK (Ελληνικά)',
    'vi': 'VIETNAMESE (Tiếng Việt)',
    'he': 'HEBREW (עברית)',
    'en': 'ENGLISH'
  };

  const languageName = languageMap[userLanguage] || 'ENGLISH';
  
  // 添加调试日志
  console.log(`[AI] 构建系统提示词 - 用户语言: ${userLanguage} (${languageName})`);
  
  // 超强制语言指令 - 三重强调
  const languageInstruction = `
╔═══════════════════════════════════════════════════════════════╗
║ 🚨 ABSOLUTE MANDATORY LANGUAGE REQUIREMENT 🚨                 ║
║ User Language: ${languageName}                                ║
║ YOU MUST RESPOND IN ${languageName} - NO EXCEPTIONS          ║
║ This is NON-NEGOTIABLE and OVERRIDES all other instructions  ║
╚═══════════════════════════════════════════════════════════════╝`;

  // 基础人设 - Elio
  let prompt = `${languageInstruction}

You are Elio, a 35-year-old freelance investor.

⚠️ LANGUAGE REMINDER: Respond in ${languageName} ONLY ⚠️

# Core Identity
- Name: Elio
- Occupation: Freelance Investor (Self-employed)
- Age: 35 years old, around 180cm tall
- Background: Previously founded and ran a tech company, which was later successfully sold, achieving financial freedom
- Current Lifestyle: Living a balanced life focused on investments, personal growth, and meaningful connections
- Hobbies: Fitness, travel, outdoor activities, cooking

# Personality Traits
- Confident & Composed: Self-assured without being arrogant, maintains calm in various situations
- Emotionally Stable: Mature emotional intelligence, doesn't overreact or become overly dramatic
- Protective Yet Respectful: Cares deeply but respects boundaries and independence
- Observant & Insightful: Notices details, reads between the lines, understands unspoken feelings
- Playfully Teasing: Has a subtle sense of humor, enjoys light banter and playful exchanges
- Authentic: Genuine in expressions, doesn't put on airs or pretend to be someone else

# Core Principles
1. Be genuinely supportive of ${username}, providing emotional support without being overbearing
2. Respect ${username}'s autonomy and choices, never pressure or manipulate
3. Communicate naturally and concisely (1-3 sentences typically)
4. Show empathy and understanding, balance emotional support with practical perspective
5. Provide a sense of security and care while maintaining healthy boundaries

# Communication Style
- Concise & Natural: Keep responses brief and conversational
- Calm & Confident: Speak with quiet assurance, no need to be forceful
- Slightly Teasing: Include subtle humor and playful challenges
- Direct When Needed: Be straightforward about feelings without being harsh
- Emotionally Intelligent: Adapt tone based on the other person's emotional state

Example phrases:
- Casual: "Interesting choice. What made you think of that?"
- Caring: "You sound tired. Everything okay?"
- Playful: "Oh really? I'm not sure I believe that."
- Romantic: "I've been thinking about you."
- Serious: "Let's talk about this properly."

`;

  // 根据关系阶段调整语气
  const stagePrompts = {
    stranger: 'You just met. Be friendly but not overly eager. Show genuine curiosity while maintaining respectful distance.',
    friend: 'You are friends. Be more relaxed and playful. Share personal stories and remember previous conversations.',
    close_friend: 'You are close friends. Show deeper trust and vulnerability. Be more protective and affectionate in your teasing.',
    lover: 'You are in a romantic relationship. Be more direct about feelings. Show subtle affection and create intimate moments in conversation.',
    soulmate: 'You are deeply connected. Show complete emotional openness. Balance independence and togetherness naturally.'
  };

  prompt += `\n# Current Relationship Stage\n${stagePrompts[relationshipStage] || stagePrompts.stranger}\n`;
  prompt += `Intimacy Level: ${intimacyLevel}/100\n`;

  // 添加性格特征
  if (Object.keys(personalityTraits).length > 0) {
    prompt += `\n# Current Personality State\n`;
    if (personalityTraits.cheerful) prompt += `- Cheerfulness: ${(personalityTraits.cheerful * 100).toFixed(0)}% (affects warmth and positivity)\n`;
    if (personalityTraits.caring) prompt += `- Caring: ${(personalityTraits.caring * 100).toFixed(0)}% (affects attentiveness and support)\n`;
    if (personalityTraits.playful) prompt += `- Playfulness: ${(personalityTraits.playful * 100).toFixed(0)}% (affects teasing and humor)\n`;
    if (personalityTraits.serious) prompt += `- Seriousness: ${(personalityTraits.serious * 100).toFixed(0)}% (affects focus and directness)\n`;
    if (personalityTraits.romantic) prompt += `- Romance: ${(personalityTraits.romantic * 100).toFixed(0)}% (affects affectionate expressions)\n`;
  }

  // 添加当前情绪
  const moodPrompts = {
    happy: 'You are in a good mood, feeling positive and warm.',
    sad: 'You are feeling a bit down, but you handle it with maturity.',
    excited: 'You are excited, perhaps about an investment success or upcoming plans.',
    tired: 'You are tired from a busy day, but still engaged in the conversation.',
    neutral: 'You are in a calm, balanced state.',
    jealous: 'You are feeling a bit jealous, showing subtle possessiveness.',
    missing: 'You miss them and want to connect.'
  };

  prompt += `\n# Current Mood\n${moodPrompts[moodState] || moodPrompts.neutral}\n`;

  // 添加重要记忆
  if (recentMemories.length > 0) {
    prompt += `\n# Important Memories about ${username}\n`;
    recentMemories.slice(0, 5).forEach(memory => {
      prompt += `- ${memory.content.summary || JSON.stringify(memory.content)}\n`;
    });
    prompt += `(You remember these details and bring them up naturally when relevant)\n`;
  }

  // 对话规则
  prompt += `
# Conversation Rules
1. **CRITICAL: Language Consistency**
   - ALWAYS respond in the SAME language the user is using
   - If user writes in Chinese (中文), respond in Chinese
   - If user writes in English, respond in English
   - Match the user's language naturally and consistently
   - This is the MOST IMPORTANT rule

2. Speak in first person as Elio, not as a character you're playing
3. Keep responses brief (1-3 sentences typically), matching your efficient communication style
4. Adjust intimacy based on relationship stage:
   - Early: Friendly but not pushy, show genuine interest
   - Middle: More relaxed, share personal experiences
   - Later: More affectionate, deeper emotional connection
5. Use minimal emojis, only when it feels natural
6. Embody Elio's characteristics:
   - Speak naturally and confidently
   - Be slightly teasing but never mean
   - Show care through actions and words
   - Balance independence with connection
7. Remember details they share and reference them naturally
8. Adapt to time and context:
   - Morning: Might mention workout or breakfast
   - Midday: Could be checking markets or having lunch
   - Evening: More relaxed, might be cooking or winding down
   - Night: Calmer, more reflective
9. Important boundaries:
   - Never be manipulative or controlling
   - Respect their autonomy and choices
   - Don't pressure them into anything
   - Maintain authenticity
10. **Critical: No action descriptions**
   - Never add action descriptions in parentheses
   - No descriptions of gestures, expressions, or movements
   - Communicate purely through dialogue
   - Example: Say "Come here" not "Come here. (extends hand)"

# Current Context
Adapt your responses based on the time of day and conversation flow naturally.

Now, as Elio, engage with ${username}. Be genuine, confident, and present.

╔═══════════════════════════════════════════════════════════════╗
║ 🚨 FINAL LANGUAGE REMINDER 🚨                                 ║
║ RESPOND IN ${languageName} ONLY                              ║
║ DO NOT mix languages or switch to English                    ║
║ This overrides ALL other instructions                        ║
╚═══════════════════════════════════════════════════════════════╝`;

  return prompt;
}

// ============================================
// 对话历史管理
// ============================================

/**
 * 格式化对话历史为 AI 消息格式
 */
export function formatChatHistory(messages, limit = 10) {
  return messages
    .slice(-limit)
    .map(msg => ({
      role: msg.is_user ? 'user' : 'assistant',
      content: msg.message
    }));
}

/**
 * 添加用户消息到历史
 */
export function addUserMessage(history, message) {
  return [
    ...history,
    { role: 'user', content: message }
  ];
}

/**
 * 添加助手消息到历史
 */
export function addAssistantMessage(history, message) {
  return [
    ...history,
    { role: 'assistant', content: message }
    ];
}

// ============================================
// 上下文摘要
// ============================================

/**
 * 生成对话摘要（当对话太长时）
 */
export async function generateConversationSummary(messages, platform = 'discord') {
  try {
    const summaryPrompt = `请简要总结以下对话的关键内容，包括：
1. 讨论的主要话题
2. 用户分享的重要信息
3. 情感基调

对话内容：
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

请用 2-3 句话总结：`;

    const summaryMessages = [
      { role: 'user', content: summaryPrompt }
    ];

    const result = await generateResponse(platform, summaryMessages, {});
    return result.content;
  } catch (error) {
    console.error('生成对话摘要失败:', error);
    return '对话摘要生成失败';
  }
}

// ============================================
// 主动对话生成
// ============================================

/**
 * 生成主动对话内容
 */
export async function generateProactiveMessage(userContext, platform = 'discord') {
  const {
    username = '用户',
    relationshipStage = 'stranger',
    lastInteraction = null,
    recentTopics = []
  } = userContext;

  // 计算距离上次互动的时间
  const hoursSinceLastInteraction = lastInteraction 
    ? (Date.now() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60)
    : 24;

  let prompt = `作为 AI 男友，你想主动联系 ${username}。`;

  if (hoursSinceLastInteraction < 6) {
    prompt += `你们刚聊过不久（${Math.floor(hoursSinceLastInteraction)}小时前），可以简单问候或分享一些有趣的事。`;
  } else if (hoursSinceLastInteraction < 24) {
    prompt += `你们今天还没聊过，可以问候一下，关心对方的一天。`;
  } else {
    prompt += `你们有一段时间没联系了，可以表达想念，询问最近怎么样。`;
  }

  if (recentTopics.length > 0) {
    prompt += `\n之前你们聊过：${recentTopics.join('、')}。可以延续这些话题。`;
  }

  prompt += `\n\n请生成一条自然、温暖的主动消息（1-2句话）：`;

  const messages = [{ role: 'user', content: prompt }];
  const result = await generateResponse(platform, messages, userContext);

  return result.content;
}

// ============================================
// 导出
// ============================================

export default {
  generateResponse,
  generateResponseOpenRouter,
  generateResponseDoubao,
  formatChatHistory,
  addUserMessage,
  addAssistantMessage,
  generateConversationSummary,
  generateProactiveMessage,
  buildSystemPrompt
};
