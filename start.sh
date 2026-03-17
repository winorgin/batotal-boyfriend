#!/bin/bash

echo "🚀 启动 AI Boyfriend 统一项目..."
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未安装 Node.js，请先安装 Node.js 18+"
    exit 1
fi

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件"
    echo "📝 正在从 .env.example 创建 .env..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请编辑并填入你的配置"
    echo ""
    echo "必需配置项："
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_ANON_KEY"
    echo "  - DISCORD_BOT_TOKEN"
    echo "  - OPENROUTER_API_KEY"
    echo "  - DOUBAO_API_KEY"
    echo ""
    read -p "配置完成后按回车继续..."
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 启动服务
echo ""
echo "✨ 启动服务器..."
echo "📱 Web 界面: http://localhost:8044"
echo "🤖 Discord 机器人同时启动"
echo ""

node src/server.js
