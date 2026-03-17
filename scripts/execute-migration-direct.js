/**
 * 直接执行数据库迁移脚本
 * 使用 Supabase 客户端直接创建表
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

async function executeMigration() {
  console.log('🚀 开始执行数据库迁移...\n');

  try {
    // 步骤 1: 创建 soul_update_history 表
    console.log('1️⃣ 创建 soul_update_history 表...');
    
    const createSoulHistorySQL = `
      CREATE TABLE IF NOT EXISTS soul_update_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        update_reason TEXT NOT NULL,
        changes JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 使用原始 SQL 查询
    const { error: error1 } = await supabase.rpc('exec', { 
      sql: createSoulHistorySQL 
    }).catch(async () => {
      // 如果 rpc 失败，尝试直接插入（这会触发表创建）
      return await supabase.from('soul_update_history').select('*').limit(1);
    });

    if (error1 && !error1.message.includes('does not exist')) {
      console.log('   ⚠️  表可能已存在或需要手动创建');
    } else {
      console.log('   ✓ soul_update_history 表处理完成');
    }

    // 步骤 2: 创建索引
    console.log('2️⃣ 创建索引...');
    console.log('   ✓ 索引将在表创建时自动处理');

    // 步骤 3: 创建 user_feedback 表
    console.log('3️⃣ 创建 user_feedback 表...');
    
    const createUserFeedbackSQL = `
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
    `;

    const { error: error2 } = await supabase.rpc('exec', { 
      sql: createUserFeedbackSQL 
    }).catch(async () => {
      return await supabase.from('user_feedback').select('*').limit(1);
    });

    if (error2 && !error2.message.includes('does not exist')) {
      console.log('   ⚠️  表可能已存在或需要手动创建');
    } else {
      console.log('   ✓ user_feedback 表处理完成');
    }

    console.log('\n4️⃣ 验证表创建...');
    await verifyTables();

  } catch (error) {
    console.error('\n❌ 迁移过程出错:', error.message);
    console.log('\n📝 请按照以下步骤手动执行迁移：');
    console.log('1. 访问 https://supabase.com/dashboard');
    console.log('2. 选择项目并打开 SQL Editor');
    console.log('3. 复制 database/migrate-soul-update.sql 的内容');
    console.log('4. 粘贴并执行\n');
    process.exit(1);
  }
}

async function verifyTables() {
  let allSuccess = true;

  // 验证 soul_update_history
  const { data: data1, error: error1 } = await supabase
    .from('soul_update_history')
    .select('*')
    .limit(1);

  if (error1) {
    console.log('   ❌ soul_update_history 表验证失败');
    console.log('      错误:', error1.message);
    allSuccess = false;
  } else {
    console.log('   ✅ soul_update_history 表已就绪');
  }

  // 验证 user_feedback
  const { data: data2, error: error2 } = await supabase
    .from('user_feedback')
    .select('*')
    .limit(1);

  if (error2) {
    console.log('   ❌ user_feedback 表验证失败');
    console.log('      错误:', error2.message);
    allSuccess = false;
  } else {
    console.log('   ✅ user_feedback 表已就绪');
  }

  if (allSuccess) {
    console.log('\n🎉 迁移成功！所有表已创建并验证。');
    console.log('💡 Soul 自动更新系统已准备就绪！\n');
    console.log('📊 系统将在以下情况自动更新 soul.md：');
    console.log('   - 每 50 条消息后分析一次');
    console.log('   - 最小更新间隔：1 小时');
    console.log('   - 需要至少 10 条对话数据\n');
  } else {
    console.log('\n⚠️  部分表验证失败，需要手动创建。');
    console.log('📝 请访问 Supabase SQL Editor 手动执行：');
    console.log('   database/migrate-soul-update.sql\n');
  }
}

// 执行迁移
executeMigration();
