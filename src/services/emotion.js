// 情感分析服务
export async function analyzeEmotion(text) {
  // 简单的关键词情感分析
  const positiveKeywords = ['喜欢', '爱', '开心', '高兴', '快乐', '好', '棒', '赞', '谢谢', '感谢', '哈哈', '😊', '❤️', '💕'];
  const negativeKeywords = ['讨厌', '恨', '难过', '伤心', '生气', '烦', '差', '糟', '不好', '😢', '😭', '😡'];
  const excitedKeywords = ['哇', '太棒了', 'amazing', '惊喜', '激动', '兴奋', '！！', '!!!'];
  const sadKeywords = ['难过', '伤心', '失望', '沮丧', '痛苦', '😢', '😭'];
  const angryKeywords = ['生气', '愤怒', '烦', '讨厌', '气死了', '😡', '💢'];
  
  let positiveScore = 0;
  let negativeScore = 0;
  let excitedScore = 0;
  let sadScore = 0;
  let angryScore = 0;
  
  const lowerText = text.toLowerCase();
  
  positiveKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) positiveScore++;
  });
  
  negativeKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) negativeScore++;
  });
  
  excitedKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) excitedScore++;
  });
  
  sadKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) sadScore++;
  });
  
  angryKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) angryScore++;
  });
  
  // 确定主要情绪
  let primary = 'neutral';
  let sentiment = 'neutral';
  let intensity = 0.5;
  
  const scores = {
    positive: positiveScore,
    negative: negativeScore,
    excited: excitedScore,
    sad: sadScore,
    angry: angryScore
  };
  
  const maxScore = Math.max(...Object.values(scores));
  
  if (maxScore > 0) {
    primary = Object.keys(scores).find(key => scores[key] === maxScore);
    intensity = Math.min(maxScore / 3, 1);
    
    if (positiveScore > negativeScore) {
      sentiment = 'positive';
    } else if (negativeScore > positiveScore) {
      sentiment = 'negative';
    }
  }
  
  return {
    primary,
    sentiment,
    intensity,
    scores
  };
}
