/**
 * 性能测试脚本
 * 测试消息发送的响应时间
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';
const TEST_TOKEN = process.env.TEST_TOKEN || 'your-test-token-here';

async function testMessagePerformance() {
  console.log('🚀 开始性能测试...\n');
  
  const testMessages = [
    '你好',
    '今天天气怎么样？',
    '我有点累了',
    '想你了',
    '最近工作很忙'
  ];
  
  const results = [];
  
  for (const message of testMessages) {
    console.log(`📤 发送消息: "${message}"`);
    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        `${API_BASE}/chat/send`,
        { message },
        {
          headers: {
            'Authorization': `Bearer ${TEST_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      results.push({
        message,
        duration,
        success: response.data.success
      });
      
      console.log(`✅ 响应时间: ${duration}ms`);
      console.log(`📥 回复: ${response.data.response.substring(0, 50)}...\n`);
      
      // 等待冷却时间
      await new Promise(resolve => setTimeout(resolve, 3500));
    } catch (error) {
      console.error(`❌ 错误: ${error.message}\n`);
      results.push({
        message,
        duration: -1,
        success: false,
        error: error.message
      });
    }
  }
  
  // 统计结果
  console.log('\n📊 性能测试结果汇总:');
  console.log('='.repeat(50));
  
  const successResults = results.filter(r => r.success);
  if (successResults.length > 0) {
    const avgDuration = successResults.reduce((sum, r) => sum + r.duration, 0) / successResults.length;
    const minDuration = Math.min(...successResults.map(r => r.duration));
    const maxDuration = Math.max(...successResults.map(r => r.duration));
    
    console.log(`✅ 成功: ${successResults.length}/${results.length}`);
    console.log(`⏱️  平均响应时间: ${avgDuration.toFixed(0)}ms`);
    console.log(`⚡ 最快响应: ${minDuration}ms`);
    console.log(`🐌 最慢响应: ${maxDuration}ms`);
    
    // 性能评级
    if (avgDuration < 2000) {
      console.log('\n🎉 性能评级: 优秀 (< 2秒)');
    } else if (avgDuration < 3000) {
      console.log('\n👍 性能评级: 良好 (2-3秒)');
    } else if (avgDuration < 5000) {
      console.log('\n⚠️  性能评级: 一般 (3-5秒)');
    } else {
      console.log('\n❌ 性能评级: 需要优化 (> 5秒)');
    }
  } else {
    console.log('❌ 所有测试都失败了');
  }
  
  console.log('='.repeat(50));
}

// 运行测试
testMessagePerformance().catch(console.error);
