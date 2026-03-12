#!/bin/bash
# 取得目前腳本所在的目錄
cd "$(dirname "$0")"/..

PORT=3000

# 檢查連接埠是否被佔用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ 伺服器已經在執行中了 (Port $PORT)"
else
    echo "🚀 正在啟動 777TV Drama Scraper 伺服器..."
    # 啟動 Node.js 伺服器並在背景執行
    node server.js > /dev/null 2>&1 &
    # 等待一秒確保啟動完成
    sleep 1
fi

# 在預設瀏覽器開啟網址
open "http://localhost:$PORT"

echo "✅ 完成。您可以縮小此視窗，但請勿關閉。"
echo "若要完全停止，請執行「關閉伺服器」腳本。"
sleep 2
exit
