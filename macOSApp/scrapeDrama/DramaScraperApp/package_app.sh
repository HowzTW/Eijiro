#!/bin/bash

# 客製化名稱
APP_NAME="抓劇小幫手"
BINARY_NAME="DramaScraperApp"

echo "🚀 開始封裝 $APP_NAME..."

# 1. 編譯 Release 版本 (這會產生最精簡且快速的執行檔)
swift build -c release --arch arm64 --arch x86_64

# 2. 建立 .app 資料夾結構
mkdir -p "$APP_NAME.app/Contents/MacOS"
mkdir -p "$APP_NAME.app/Contents/Resources"

# 3. 複製執行檔
cp ".build/apple/Products/Release/$BINARY_NAME" "$APP_NAME.app/Contents/MacOS/"

# 4. 複製標頭檔 (Info.plist)
cp "Info.plist" "$APP_NAME.app/Contents/"

# 5. 處理圖示 (將 Assets 中的圖片轉為 macOS 標準 .icns)
# 如果沒有特別轉 .icns，這裡先用原本的 icon.png 佔位
# (macOS 其實也支援直接在 Plist 指定但轉成 icns 最正式)
cp "Sources/DramaScraperApp/Assets.xcassets/icon.imageset/icon.png" "$APP_NAME.app/Contents/Resources/AppIcon.png"

echo "✅ 封裝完成！您現在可以直接雙擊 $APP_NAME.app 執行，或者將它拖入您的「應用程式」資料夾中。"
open .
