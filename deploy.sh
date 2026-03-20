#!/bin/bash
# 部署脚本，放在服务器项目根目录

# 拉取最新代码
git pull

# 安装依赖（如有）
if [ -f "package.json" ]; then
  npm install
fi
if [ -f "pyproject.toml" ]; then
  pip install -r requirements.txt || pip install .
fi

# 启动服务（根据实际情况修改）
# 例如：
# pm2 restart app.js
# 或
# nohup python main.py &

echo "部署完成！"
