#!/bin/bash

# Cloudflare 分階段文檔爬蟲啟動腳本
# 支援分階段爬取，避免 IP 封鎖風險

SCRIPT_NAME="cloudflare-staged-crawler.js"
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}🚀 Cloudflare 分階段文檔爬蟲${NC}"
echo -e "==============================="

# 檢查參數
if [ $# -eq 0 ]; then
    echo "使用方法:"
    echo "  $0 <產品線ID>          # 爬取指定產品線"
    echo "  $0 list               # 列出所有產品線"
    echo "  $0 monitor <產品線ID>  # 監控模式爬取"
    echo ""
    echo "可用的產品線 ID:"
    echo "  developer-products    # 🏗️ 開發者產品線"
    echo "  ai-products          # 🤖 AI 產品線"
    echo "  zero-trust           # 🔐 Zero Trust 產品線"
    echo "  security-products    # 🛡️ 安全產品線"
    echo ""
    echo "建議執行順序:"
    echo "  1. $0 developer-products"
    echo "  2. $0 ai-products"
    echo "  3. $0 zero-trust"
    echo "  4. $0 security-products"
    exit 1
fi

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 未安裝 Node.js${NC}"
    exit 1
fi

# 檢查腳本文件
if [ ! -f "$SCRIPT_NAME" ]; then
    echo -e "${RED}❌ 找不到 $SCRIPT_NAME${NC}"
    exit 1
fi

# 檢查依賴
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 安裝必要依賴...${NC}"
    npm install axios cheerio
fi

# 解析參數
COMMAND=$1
PRODUCT_LINE=$2

case $COMMAND in
    "list")
        echo -e "${GREEN}📋 查看可用產品線:${NC}"
        node $SCRIPT_NAME --list-products
        ;;
    
    "monitor")
        if [ -z "$PRODUCT_LINE" ]; then
            echo -e "${RED}❌ 監控模式需要指定產品線${NC}"
            echo "使用方法: $0 monitor <產品線ID>"
            exit 1
        fi
        
        echo -e "${GREEN}👀 監控模式爬取: $PRODUCT_LINE${NC}"
        echo "按 Ctrl+C 停止"
        echo "------------------------"
        
        # 啟動監控背景進程
        node $SCRIPT_NAME --product "$PRODUCT_LINE" &
        CRAWLER_PID=$!
        echo -e "${CYAN}爬蟲 PID: $CRAWLER_PID${NC}"
        
        # 監控進度
        while kill -0 $CRAWLER_PID 2>/dev/null; do
            clear
            echo -e "${CYAN}🔥 分階段爬蟲監控 - $PRODUCT_LINE${NC}"
            echo "======================================"
            echo "時間: $(date '+%Y-%m-%d %H:%M:%S')"
            echo ""
            
            # 檢查輸出
            if [ -d "cloudflare-docs/stages" ]; then
                echo -e "${GREEN}📁 輸出狀態:${NC}"
                STAGE_COUNT=$(find cloudflare-docs/stages -name "*.md" | wc -l | xargs)
                echo "已生成文件: $STAGE_COUNT"
                echo ""
                
                echo -e "${GREEN}📋 階段目錄:${NC}"
                ls -la cloudflare-docs/stages/ 2>/dev/null | grep "stage-" | sed 's/^/  /'
            else
                echo -e "${YELLOW}⏳ 等待創建輸出目錄...${NC}"
            fi
            
            echo ""
            echo -e "${GREEN}🔄 程序狀態: 正在運行${NC}"
            sleep 5
        done
        
        echo -e "${GREEN}✅ 爬取完成！${NC}"
        ;;
    
    *)
        # 直接爬取模式
        PRODUCT_LINE=$COMMAND
        
        echo -e "${GREEN}🚀 開始爬取: $PRODUCT_LINE${NC}"
        echo "------------------------"
        
        # 檢查產品線是否有效
        VALID_PRODUCTS=("developer-products" "ai-products" "zero-trust" "security-products")
        if [[ ! " ${VALID_PRODUCTS[@]} " =~ " ${PRODUCT_LINE} " ]]; then
            echo -e "${RED}❌ 無效的產品線: $PRODUCT_LINE${NC}"
            echo "可用選項: ${VALID_PRODUCTS[@]}"
            exit 1
        fi
        
        # 顯示預估信息
        case $PRODUCT_LINE in
            "developer-products")
                echo -e "${CYAN}🏗️ 開發者產品線 (預估 300-500 頁面, 15-30 分鐘)${NC}"
                ;;
            "ai-products")
                echo -e "${CYAN}🤖 AI 產品線 (預估 200-300 頁面, 10-20 分鐘)${NC}"
                ;;
            "zero-trust")
                echo -e "${CYAN}🔐 Zero Trust 產品線 (預估 400-600 頁面, 20-35 分鐘)${NC}"
                ;;
            "security-products")
                echo -e "${CYAN}🛡️ 安全產品線 (預估 500-700 頁面, 25-40 分鐘)${NC}"
                ;;
        esac
        
        echo ""
        
        # 執行爬取
        node $SCRIPT_NAME --product "$PRODUCT_LINE"
        EXIT_CODE=$?
        
        if [ $EXIT_CODE -eq 0 ]; then
            echo ""
            echo -e "${GREEN}🎉 爬取成功完成！${NC}"
            echo -e "${GREEN}📁 查看結果: ls -la cloudflare-docs/stages/stage-*-$PRODUCT_LINE/${NC}"
            
            # 顯示下一階段建議
            case $PRODUCT_LINE in
                "developer-products")
                    echo -e "${YELLOW}💡 下一階段建議: $0 ai-products${NC}"
                    ;;
                "ai-products")
                    echo -e "${YELLOW}💡 下一階段建議: $0 zero-trust${NC}"
                    ;;
                "zero-trust")
                    echo -e "${YELLOW}💡 下一階段建議: $0 security-products${NC}"
                    ;;
                "security-products")
                    echo -e "${GREEN}🎊 恭喜！所有階段完成！${NC}"
                    ;;
            esac
        else
            echo ""
            echo -e "${RED}❌ 爬取失敗，請檢查錯誤信息${NC}"
        fi
        ;;
esac

echo ""
echo -e "${CYAN}腳本執行完成！${NC}"
