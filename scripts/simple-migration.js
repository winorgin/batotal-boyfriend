/**
 * 简化版数据库迁移脚本
 * 直接验证表是否存在
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 错误：缺少 Supabase 配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndCreateTables() {
  console.log('🚀 检查数据库表状态...\n');

  let needsManualMigration = false;

  // 检查 soul_update_history 表
  console.log('1️⃣ 检查 soul_update_history 表...');
  const { data: data1, error: error1 } = await supabase
    .from('soul_update_history')
    .select('*')
    .limit(1);

  if (error1) {
    if (error1.message.includes('does not exist')) {
      console.log('   ❌ 表不存在，需要创建');
      needsManualMigration = true;
    } else {
      console.log('   ⚠️  检查失败:', error1.message);
      needsManualMigration = true;
    }
  } else {
    console.log('   ✅ 表已存在');
  }

  // 检查 user_feedback 表
  console.log('2️⃣ 检查 user_feedback 表...');
  const { data: data2, error: error2 } = await supabase
    .from('user_feedback')
    .select('*')
    .limit(1);

  if (error2) {
    if (error2.message.includes('does not exist')) {
      console.log('   ❌ 表不存在，需要创建');
      needsManualMigration = true;
    } else {
      console.log('   ⚠️  检查失败:', error2.message);
      needsManualMigration = true;
    }
  } else {
    console.log('   ✅ 表已存在');
  }

  console.log('\n' + '='.repeat(60));

  if (needsManualMigration) {
    console.log('\n📝 需要手动执行数据库迁移\n');
    console.log('请按照以下步骤操作：\n');
    console.log('1. 访问 Supabase 控制台：');
    console.log('   https://supabase.com/dashboard/project/lehwkihwnlqkavhcspel\n');
    console.log('2. 点击左侧菜单的 "SQL Editor"\n');
    console.log('3. 点击 "New Query"\n');
    console.log('4. 复制以下 SQL 并执行：\n');
    console.log('='.repeat(60));
    console.log(`
-- 创建 soul_update_history 表
CREATE TABLE IF NOT EXISTS soul_update_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  update_reason TEXT NOT NULL,
  changes JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soul_update_history_updated_at 
ON soul_update_history(updated_at DESC);

-- 创建 user_feedback 表
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  feedback_type TEXT,
  related_message_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_rating ON user_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);

-- 启用 RLS
ALTER TABLE soul_update_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- 创建策略
CREATE POLICY "Service role full access" ON soul_update_history 
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON user_feedback 
FOR ALL USING (true) WITH CHECK (true);
`);
    console.log('='.repeat(60));
    console.log('\n5. 执行完成后，再次运行此脚本验证\n');
  } else {
    console.log('\n🎉 所有表已就绪！\n');
    console.log('✅ soul_update_history 表已存在');
    console.log('✅ user_feedback 表已存在\n');
    console.log('💡 Soul 自动更新系统已准备就绪！\n');
    console.log('📊 系统将在以下情况自动更新 soul.md：');
    console.log('   • 每 50 条消息后分析一次');
    console.log('   • 最小更新间隔：1 小时');
    console.log('   • 需要至少 10 条对话数据\n');
    console.log('📖 查看详细文档：');
    console.log('   • SOUL_UPDATE_GUIDE.md');
    console.log('   • MIGRATION_INSTRUCTIONS.md\n');
  }
}

// 执行检查
checkAndCreateTables().catch(error => {
  console.error('❌ 检查过程出错:', error.message);
  process.exit(1);
});
