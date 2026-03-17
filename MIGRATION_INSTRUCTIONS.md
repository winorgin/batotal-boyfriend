# 数据库迁移说明

## 方法 1：使用 Supabase SQL Editor（推荐）

1. 登录 Supabase 控制台：https://supabase.com/dashboard
2. 选择你的项目：`lehwkihwnlqkavhcspel`
3. 点击左侧菜单的 **SQL Editor**
4. 点击 **New Query**
5. 复制 `database/migrate-soul-update.sql` 文件的全部内容
6. 粘贴到 SQL Editor 中
7. 点击 **Run** 按钮执行
8. 查看执行结果，应该显示：
   ```
   ✓ 迁移成功！所有表已创建。
   ```

## 方法 2：使用 Supabase CLI

如果你安装了 Supabase CLI：

```bash
cd ai-boyfriend-unified
supabase db push
```

## 验证迁移

执行迁移后，在 Supabase SQL Editor 中运行以下查询验证：

```sql
-- 检查表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('soul_update_history', 'user_feedback');

-- 查看表结构
\d soul_update_history
\d user_feedback
```

应该看到两个表都已创建。

## 迁移内容

此迁移会创建以下表：

### 1. soul_update_history
用于记录 soul.md 的每次自动更新历史

字段：
- `id`: UUID 主键
- `update_reason`: 更新原因
- `changes`: 更新内容（JSONB）
- `updated_at`: 更新时间

### 2. user_feedback
用于存储用户反馈数据

字段：
- `id`: UUID 主键
- `user_id`: 用户 ID（外键）
- `platform`: 平台（web/discord）
- `rating`: 评分（1-5）
- `comment`: 评论内容
- `feedback_type`: 反馈类型
- `related_message_id`: 相关消息 ID
- `created_at`: 创建时间

## 迁移后的下一步

1. 重启应用服务器
2. 系统会自动开始收集用户互动数据
3. 每 50 条消息后自动分析并更新 soul.md
4. 可以通过以下 SQL 查看更新历史：

```sql
SELECT * FROM soul_update_history 
ORDER BY updated_at DESC 
LIMIT 10;
```

## 故障排除

### 问题：表已存在错误

如果看到 "already exists" 错误，说明表已经创建过了，可以忽略。

### 问题：权限错误

确保使用的是 Service Role Key，而不是 Anon Key。

### 问题：外键约束错误

确保 `users` 表已经存在。如果不存在，先运行主数据库架构：
```bash
database/unified-schema.sql
```

## 手动创建表（备用方案）

如果自动迁移失败，可以手动在 SQL Editor 中执行：

```sql
-- 创建 soul_update_history 表
CREATE TABLE IF NOT EXISTS soul_update_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  update_reason TEXT NOT NULL,
  changes JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_soul_update_history_updated_at ON soul_update_history(updated_at DESC);

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

CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_rating ON user_feedback(rating);
CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at DESC);

-- 启用 RLS
ALTER TABLE soul_update_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- 创建策略
CREATE POLICY "Service role full access" ON soul_update_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON user_feedback FOR ALL USING (true) WITH CHECK (true);
```

## 联系支持

如果遇到问题，请查看：
- Supabase 文档：https://supabase.com/docs
- 项目 README.md
- SOUL_UPDATE_GUIDE.md
