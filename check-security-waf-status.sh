#!/bin/bash

# Security Products + WAF 合併進度監控腳本

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

clear
echo -e "${CYAN}🛡️ Security Products + WAF 合併進度監控${NC}"
echo -e "=============================================="
echo "時間: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 檢查爬蟲程序狀態
echo -e "${GREEN}🔄 程序運行狀態:${NC}"

# 檢查 security-products 爬蟲
if pgrep -f "security-products" > /dev/null; then
    CRAWLER_PID=$(pgrep -f "security-products")
    RUNNING_TIME=$(ps -o etime= -p $CRAWLER_PID 2>/dev/null | xargs)
    echo -e "  ✅ Security Products 爬蟲正在運行 (PID: $CRAWLER_PID)"
    echo -e "     ⏰ 運行時間: $RUNNING_TIME"
else
    echo -e "  ❌ Security Products 爬蟲未運行或已完成"
fi

# 檢查 WAF 合併程序
if pgrep -f "merge-waf-to-security" > /dev/null; then
    MERGER_PID=$(pgrep -f "merge-waf-to-security")
    RUNNING_TIME=$(ps -o etime= -p $MERGER_PID 2>/dev/null | xargs)
    echo -e "  ✅ WAF 合併程序正在等待 (PID: $MERGER_PID)"  
    echo -e "     ⏰ 等待時間: $RUNNING_TIME"
else
    echo -e "  ❌ WAF 合併程序未運行或已完成"
fi

echo ""

# 檢查進度文件
echo -e "${GREEN}📈 階段進度:${NC}"
if [ -f "cloudflare-docs/📊-progress.json" ]; then
    # 使用 Python 解析 JSON (如果可用)
    if command -v python3 &> /dev/null; then
        python3 -c "
import json
import sys
try:
    with open('cloudflare-docs/📊-progress.json', 'r') as f:
        data = json.load(f)
    
    stages = data.get('stages', {})
    for stage, info in stages.items():
        status_icon = '✅' if info.get('status') == 'completed' else '🔄' if info.get('status') == 'in_progress' else '⏳'
        pages = info.get('pages_crawled', info.get('estimated_pages', 'N/A'))
        errors = info.get('errors', 0)
        print(f'  {status_icon} {stage}: {pages} 頁面 ({errors} 錯誤)')
        
except Exception as e:
    print('  ❌ 無法讀取進度文件')
" 2>/dev/null
    else
        echo -e "  📄 進度文件存在，需要 Python3 來解析詳情"
    fi
else
    echo -e "  ❌ 進度文件尚未創建"
fi

echo ""

# 檢查輸出目錄
echo -e "${GREEN}📁 輸出狀態:${NC}"

# 檢查 security-products 階段目錄
if [ -d "cloudflare-docs/stages/stage-4-security-products" ]; then
    STAGE_FILES=$(find "cloudflare-docs/stages/stage-4-security-products" -name "*.md" -type f | wc -l | xargs)
    DIR_SIZE=$(du -sh "cloudflare-docs/stages/stage-4-security-products" 2>/dev/null | cut -f1)
    echo -e "  📊 Security Products 階段目錄: $STAGE_FILES 文件, $DIR_SIZE"
    
    # 列出已生成的文件
    if [ $STAGE_FILES -gt 0 ]; then
        echo -e "  📋 已生成文件:"
        find "cloudflare-docs/stages/stage-4-security-products" -name "*.md" -type f | sort | sed 's/^/    • /'
    fi
else
    echo -e "  ❌ Security Products 階段目錄尚未創建"
fi

echo ""

# 檢查 WAF 文檔狀態
echo -e "${GREEN}🔥 WAF 文檔狀態:${NC}"
if [ -d "waf-docs" ]; then
    WAF_FILES=$(find "waf-docs" -name "*.md" -type f | grep -v README | wc -l | xargs)
    WAF_SIZE=$(du -sh "waf-docs" 2>/dev/null | cut -f1)
    echo -e "  📊 WAF 文檔: $WAF_FILES 文件, $WAF_SIZE (等待合併)"
    
    # 檢查是否已經有 WAF 文件在 security-products 目錄
    if [ -d "cloudflare-docs/stages/stage-4-security-products" ]; then
        WAF_IN_SECURITY=$(find "cloudflare-docs/stages/stage-4-security-products" -name "*traffic-detections*" -o -name "*custom-rules*" -o -name "*managed-rules*" | wc -l | xargs)
        if [ $WAF_IN_SECURITY -gt 0 ]; then
            echo -e "  ✅ WAF 文檔已部分合併到 Security Products"
        else
            echo -e "  ⏳ WAF 文檔等待合併中..."
        fi
    fi
else
    echo -e "  ❌ WAF 文檔目錄不存在"
fi

echo ""

# 預估完成時間
echo -e "${YELLOW}⏰ 時間預估:${NC}"
echo -e "  📋 Security Products 階段: 25-40 分鐘"
echo -e "  🔥 WAF 合併: 1-2 分鐘"  
echo -e "  🎯 總預計完成時間: 30-45 分鐘"

echo ""

# 操作建議
echo -e "${YELLOW}💡 可用操作:${NC}"
echo -e "  📊 重新檢查: ./check-security-waf-status.sh"
echo -e "  📁 查看階段: ls -la cloudflare-docs/stages/"
echo -e "  🔍 查看 WAF: ls -la waf-docs/"

if pgrep -f "security-products\|merge-waf-to-security" > /dev/null; then
    echo -e "  ⏸️ 停止所有程序: pkill -f 'security-products'; pkill -f 'merge-waf-to-security'"
fi

echo ""
echo -e "${CYAN}=============================================="
echo -e "檢查時間: $(date)${NC}"

# 如果兩個程序都完成了，顯示最終狀態
if ! pgrep -f "security-products\|merge-waf-to-security" > /dev/null; then
    echo ""
    echo -e "${GREEN}🎉 所有程序已完成！${NC}"
    
    if [ -f "SECURITY-WAF-MERGE-REPORT.md" ]; then
        echo -e "${GREEN}📄 查看完整報告: cat SECURITY-WAF-MERGE-REPORT.md${NC}"
    fi
    
    if [ -d "cloudflare-docs/stages/stage-4-security-products" ]; then
        FINAL_COUNT=$(find "cloudflare-docs/stages/stage-4-security-products" -name "*.md" -type f | wc -l | xargs)
        echo -e "${GREEN}📊 最終結果: $FINAL_COUNT 個安全產品文檔（含 WAF）${NC}"
    fi
fi
