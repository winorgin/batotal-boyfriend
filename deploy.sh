#!/bin/bash
set -e
PROJ=/home/lzf/ai-boyfriend-unified

echo "[1/4] 拉取最新代码..."
cd $PROJ && git pull

echo "[2/4] 安装 Node.js 依赖..."
npm install --omit=dev

echo "[3/4] 安装 Python 依赖..."
pip3 install fastapi "uvicorn[standard]" python-socketio supabase pyjwt \
  bcrypt "passlib[bcrypt]" httpx python-dotenv pydantic-settings edge-tts \
  apscheduler redis "pydantic[email]" python-jose python-multipart aiofiles -q

echo "[4/4] 重启服务..."
sudo systemctl restart ai-boyfriend-node ai-boyfriend-python

echo "✅ 部署完成！"
systemctl is-active ai-boyfriend-node && systemctl is-active ai-boyfriend-python
