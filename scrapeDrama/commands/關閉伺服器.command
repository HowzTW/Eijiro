#!/bin/bash
# 取得目前腳本所在的目錄
cd "$(dirname "$0")"/..

PORT=3000

# 尋找佔用通訊埠的 PID
PID=$(lsof -Pi :$PORT -sTCP:LISTEN -t)

if [ -z "$PID" ]; then
    echo "ℹ️ 目前沒有偵測到正在執行的伺服器 (Port $PORT)。"
else
    echo "🛑 正在停止伺服器 (PID: $PID)..."
    kill $PID
    echo "✅ 伺服器已成功關閉。"
fi

# 過三秒自動關閉終端機視窗
echo "視窗將在 3 秒後自動關閉..."
sleep 3
exit
