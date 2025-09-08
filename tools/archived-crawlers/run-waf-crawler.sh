#!/bin/bash

# Cloudflare WAF 文檔爬蟲啟動腳本
# 使用方法: ./run-waf-crawler.sh [monitor]

echo "🔥 Cloudflare WAF 文檔爬蟲"
echo "==============================="

# 檢查必要的依賴
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安裝，請先安裝 Node.js"
    exit 1
fi

# 檢查是否已安裝 npm 依賴
if [ ! -d "node_modules" ]; then
    echo "📦 安裝必要依賴..."
    npm install axios cheerio
fi

# 檢查爬蟲程序是否存在
if [ ! -f "waf-docs-crawler.js" ]; then
    echo "❌ 找不到 waf-docs-crawler.js"
    exit 1
fi

# 創建輸出目錄
mkdir -p waf-docs

if [ "$1" == "monitor" ]; then
    echo "👀 監控模式 - 將顯示實時進度"
    echo "按 Ctrl+C 退出監控（不會停止爬蟲）"
    echo "-------------------------------"
    
    # 啟動爬蟲（如果沒有運行）
    if ! pgrep -f "waf-docs-crawler.js" > /dev/null; then
        echo "🚀 啟動爬蟲程序..."
        node waf-docs-crawler.js &
        CRAWLER_PID=$!
        echo "爬蟲 PID: $CRAWLER_PID"
    else
        echo "🔄 爬蟲已在運行中..."
    fi
    
    # 監控進度
    while true; do
        clear
        echo "🔥 Cloudflare WAF 文檔爬蟲 - 監控模式"
        echo "======================================"
        echo "時間: $(date '+%Y-%m-%d %H:%M:%S')"
        echo
        
        # 檢查輸出目錄中的文件
        if [ -d "waf-docs" ]; then
            echo "📁 輸出目錄狀態:"
            echo "總文件數: $(find waf-docs -name "*.md" | wc -l | xargs)"
            echo "目錄大小: $(du -sh waf-docs 2>/dev/null | cut -f1 || echo "0B")"
            echo
            
            if [ -f "waf-docs/README.md" ]; then
                echo "✅ README.md 已生成"
            else
                echo "⏳ 等待生成中..."
            fi
            
            echo
            echo "📋 已生成的文件:"
            find waf-docs -name "*.md" -type f | sort | sed 's/^/  /'
        else
            echo "⏳ 等待創建輸出目錄..."
        fi
        
        echo
        echo "🔄 程序狀態:"
        if pgrep -f "waf-docs-crawler.js" > /dev/null; then
            echo "  ✅ 爬蟲正在運行"
        else
            echo "  ❌ 爬蟲未運行或已完成"
            echo "  檢查上方的輸出文件以確認是否完成"
            break
        fi
        
        sleep 5
    done
    
else
    echo "🚀 啟動爬蟲程序..."
    echo "💡 提示: 使用 './run-waf-crawler.sh monitor' 查看實時進度"
    echo "-------------------------------"
    
    # 直接執行爬蟲
    node waf-docs-crawler.js
fi

echo
echo "✅ 腳本執行完成！"
echo "📁 查看結果: ls -la waf-docs/"
