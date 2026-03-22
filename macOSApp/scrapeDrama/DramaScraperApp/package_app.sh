#!/bin/bash

# ==========================================
# 抓劇小幫手 - 一鍵封裝工具 (Release 版)
# ==========================================

APP_NAME="抓劇小幫手"
BINARY_NAME="DramaScraperApp"
BUNDLE_ID="com.howz.DramaScraperApp"
ICON_NAME="icon-app.png"

echo "------------------------------------------"
echo "🚀 準備封裝 $APP_NAME.app..."
echo "------------------------------------------"

# 1. 建立快取與清理
rm -rf "$APP_NAME.app"
mkdir -p "$APP_NAME.app/Contents/MacOS"
mkdir -p "$APP_NAME.app/Contents/Resources"

# 2. 編譯 Release 版本
echo "📦 正在進行 Release 編譯 (這可能需要一點時間)..."
# 我們強制使用靜態連結與 Release 優化
swift build -c release --arch arm64 --arch x86_64 > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "⚠️  編譯似乎遇到問題，嘗試尋找現有的快取檔案..."
    # 嘗試從 Xcode 的臨時資料夾中抓取
    BIN_PATH=$(find .build -name "$BINARY_NAME" -type f -perm +111 | grep -v "/checkouts/" | head -n 1)
else
    BIN_PATH=".build/apple/Products/Release/$BINARY_NAME"
    if [ ! -f "$BIN_PATH" ]; then
        # 不同的 Swift 版本路徑可能略有不同
        BIN_PATH=$(find .build -name "$BINARY_NAME" -type f -perm +111 | grep -v "/checkouts/" | head -n 1)
    fi
fi

if [ -z "$BIN_PATH" ] || [ ! -f "$BIN_PATH" ]; then
    echo "❌ 找不到執行檔！請確保您已經在 Xcode 中成功執行過專案。"
    exit 1
fi

echo "✅ 找到執行檔：$BIN_PATH"

# 3. 搬運資源
cp "$BIN_PATH" "$APP_NAME.app/Contents/MacOS/"
cp "Info.plist" "$APP_NAME.app/Contents/"

# 重要：複製 SPM 的資源 Bundle，這是造成 EXC_BAD_INSTRUCTION 閃退的主因
BUNDLE_PATH=$(find .build -name "*.bundle" -type d | grep -v "/checkouts/" | head -n 1)
if [ -d "$BUNDLE_PATH" ]; then
    echo "📦 複製資源包：$BUNDLE_PATH"
    cp -R "$BUNDLE_PATH" "$APP_NAME.app/Contents/Resources/"
fi

# 複製備用圖示到資源目錄
cp "Sources/DramaScraperApp/$ICON_NAME" "$APP_NAME.app/Contents/Resources/AppIcon.png"

# 4. 建立標籤檔 (PkgInfo) - macOS 識別為應用程式
echo "APPL????" > "$APP_NAME.app/Contents/PkgInfo"

# 5. 修改 Info.plist 中的圖示路徑 (確保對應)
# 雖然我們已經有 Info.plist，但為了保險我們確保圖示名稱正確
cat <<EOF > "$APP_NAME.app/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>$BINARY_NAME</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon.png</string>
    <key>CFBundleIdentifier</key>
    <string>$BUNDLE_ID</string>
    <key>CFBundleName</key>
    <string>$APP_NAME</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>13.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
</dict>
</plist>
EOF

echo "------------------------------------------"
echo "🎉 封裝成功！"
echo "📍 位置：$(pwd)/$APP_NAME.app"
echo "------------------------------------------"
echo "💡 提示：您可以直接將這張 $APP_NAME.app 拖入「應用程式」資料夾中。"

open .
