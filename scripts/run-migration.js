/**
 * 数据库迁移脚本执行器
 * 用于执行 Soul 自动更新系统的数据库迁移
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 错误：缺少 Supabase 配置');
  console.error('请确保 .env 文件中包含 SUPABASE_URL 和 SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 开始执行数据库迁移...\n');

    // 读取迁移脚本
    const migrationPath = path.join(process.cwd(), 'database', 'migrate-soul-update.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    console.log('📄 读取迁移脚本: migrate-soul-update.sql');
    console.log('📊 执行 SQL 语句...\n');

    // 执行迁移
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // 如果 exec_sql 函数不存在，尝试直接执行
      console.log('⚠️  exec_sql 函数不存在，尝试分步执行...\n');
      await executeMigrationStepByStep();
    } else {
      console.log('✅ 迁移执行成功！\n');
      await verifyMigration();
    }

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  }
}

async function executeMigrationStepByStep() {
  try {
    // 创建 soul_update_history 表
    console.log('1️⃣ 创建 soul_update_history 表...');
    const { error: error1 } = await supabase.rpc('exec', {
      query: `
        CREATE TABLE IF NOT EXISTS soul_update_history (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          update_reason TEXT NOT NULL,
          changes JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (error1 && !error1.message.includes('already exists')) {
      throw error1;
    }
    console.log('   ✓ soul_update_history 表创建成功');

    // 创建索引
    console.log('2️⃣ 创建索引...');
    await supabase.rpc('exec', {
      query: 'CREATE INDEX IF NOT EXISTS idx_soul_update_history_updated_at ON soul_update_history(updated_at DESC);'
    });
    console.log('   ✓ 索引创建成功');

    // 创建 user_feedback 表
    console.log('3️⃣ 创建 user_feedback 表...');
    const { error: error2 } = await supabase.rpc('exec', {
      query: `
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
      `
    });

    if (error2 && !error2.message.includes('already exists')) {
      throw error2;
    }
    console.log('   ✓ user_feedback 表创建成功');

    // 创建索引
    console.log('4️⃣ 创建 user_feedback 索引...');
    await supabase.rpc('exec', {
      query: `
        CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_feedback_rating ON user_feedback(rating);
        CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);
      `
    });
    console.log('   ✓ 索引创建成功\n');

    await verifyMigration();

  } catch (error) {
    console.error('❌ 分步执行失败:', error.message);
    console.log('\n📝 请手动在 Supabase SQL Editor 中执行以下脚本：');
    console.log('   database/migrate-soul-update.sql\n');
    process.exit(1);
  }
}

async function verifyMigration() {
  console.log('🔍 验证迁移结果...\n');

  // 检查 soul_update_history 表
  const { data: soulHistory, error: error1 } = await supabase
    .from('soul_update_history')
    .select('*')
    .limit(1);

  if (error1) {
    console.log('❌ soul_update_history 表验证失败:', error1.message);
  } else {
    console.log('✅ soul_update_history 表已就绪');
  }

  // 检查 user_feedback 表
  const { data: feedback, error: error2 } = await supabase
    .from('user_feedback')
    .select('*')
    .limit(1);

  if (error2) {
    console.log('❌ user_feedback 表验证失败:', error2.message);
  } else {
    console.log('✅ user_feedback 表已就绪');
  }

  if (!error1 && !error2) {
    console.log('\n🎉 所有表已成功创建并验证！');
    console.log('💡 Soul 自动更新系统已准备就绪\n');
  } else {
    console.log('\n⚠️  部分表创建失败，请检查 Supabase 控制台');
    console.log('📝 或手动执行: database/migrate-soul-update.sql\n');
  }
}

// 执行迁移
runMigration().catch(error => {
  console.error('❌ 未预期的错误:', error);
  process.exit(1);
});
