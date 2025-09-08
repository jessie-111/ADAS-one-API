#!/bin/bash

# Cloudflare 分階段爬蟲狀態檢查腳本

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

clear
echo -e "${CYAN}🔥 Cloudflare 分階段爬蟲狀態${NC}"
echo -e "======================================"
echo "時間: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 檢查進程狀態
echo -e "${GREEN}🔄 程序狀態:${NC}"
if pgrep -f "cloudflare-staged-crawler" > /dev/null; then
    CRAWLER_PID=$(pgrep -f "cloudflare-staged-crawler")
    echo -e "  ✅ 爬蟲正在運行 (PID: $CRAWLER_PID)"
    
    # 顯示運行時間
    RUNNING_TIME=$(ps -o etime= -p $CRAWLER_PID 2>/dev/null | xargs)
    if [ ! -z "$RUNNING_TIME" ]; then
        echo -e "  ⏰ 運行時間: $RUNNING_TIME"
    fi
else
    echo -e "  ❌ 沒有運行中的爬蟲程序"
fi

echo ""

# 檢查輸出目錄
echo -e "${GREEN}📁 輸出狀態:${NC}"
if [ -d "cloudflare-docs" ]; then
    # 總體統計
    TOTAL_FILES=$(find cloudflare-docs -name "*.md" -type f | wc -l | xargs)
    DIR_SIZE=$(du -sh cloudflare-docs 2>/dev/null | cut -f1 || echo "0B")
    echo -e "  📊 總文件數: $TOTAL_FILES"
    echo -e "  💾 目錄大小: $DIR_SIZE"
    
    # 階段統計
    if [ -d "cloudflare-docs/stages" ]; then
        echo -e "  📋 階段進度:"
        
        for stage_dir in cloudflare-docs/stages/stage-*; do
            if [ -d "$stage_dir" ]; then
                STAGE_NAME=$(basename "$stage_dir")
                STAGE_FILES=$(find "$stage_dir" -name "*.md" -type f | wc -l | xargs)
                echo -e "    • $STAGE_NAME: $STAGE_FILES 文件"
            fi
        done
    else
        echo -e "  ⏳ 階段目錄尚未創建"
    fi
    
    # 進度文件
    if [ -f "cloudflare-docs/📊-progress.json" ]; then
        echo -e "${GREEN}📈 詳細進度:${NC}"
        
        # 解析進度 JSON (簡化版)
        if command -v python3 &> /dev/null; then
            python3 -c "
import json
import sys
try:
    with open('cloudflare-docs/📊-progress.json', 'r') as f:
        data = json.load(f)
    
    print('  開始時間:', data.get('started_at', 'N/A'))
    print('  階段狀態:')
    
    for stage, info in data.get('stages', {}).items():
        status_icon = '✅' if info.get('status') == 'completed' else '⏳' if info.get('status') == 'pending' else '🔄'
        pages = info.get('pages_crawled', info.get('estimated_pages', 'N/A'))
        print(f'    {status_icon} {stage}: {pages} 頁面')
        
except Exception as e:
    print('  ❌ 無法讀取進度文件')
" 2>/dev/null
        else
            echo -e "  📄 進度文件存在，但需要 Python3 來解析詳情"
            echo -e "  📋 原始內容預覽:"
            head -10 "cloudflare-docs/📊-progress.json" | sed 's/^/    /'
        fi
    fi
    
else
    echo -e "  ❌ 輸出目錄 'cloudflare-docs' 尚未創建"
fi

echo ""

# 檢查日誌或最近的輸出
echo -e "${GREEN}📝 最近活動:${NC}"
if [ -d "cloudflare-docs/stages" ]; then
    # 查找最近修改的文件
    RECENT_FILE=$(find cloudflare-docs -name "*.md" -type f -exec ls -lt {} + 2>/dev/null | head -2 | tail -1 | awk '{print $9}' 2>/dev/null)
    if [ ! -z "$RECENT_FILE" ]; then
        echo -e "  📄 最近生成: $(basename "$RECENT_FILE")"
        echo -e "  🕐 修改時間: $(stat -f '%Sm' "$RECENT_FILE" 2>/dev/null || stat -c '%y' "$RECENT_FILE" 2>/dev/null)"
    fi
else
    echo -e "  ⏳ 等待首個階段開始..."
fi

echo ""

# 提供操作建議
echo -e "${YELLOW}💡 可用操作:${NC}"
echo -e "  📋 查看產品線: ./run-staged-crawler.sh list"
echo -e "  👀 監控模式: ./run-staged-crawler.sh monitor <產品線>"
echo -e "  📊 重新檢查: ./check-crawler-status.sh"
echo -e "  🔍 查看文件: ls -la cloudflare-docs/stages/"

if pgrep -f "cloudflare-staged-crawler" > /dev/null; then
    echo -e "${YELLOW}  ⏸️ 停止爬蟲: pkill -f cloudflare-staged-crawler${NC}"
else
    echo -e "  🚀 開始爬取: ./run-staged-crawler.sh <產品線>"
fi

echo ""
echo -e "${CYAN}======================================"
echo -e "檢查時間: $(date)${NC}"
