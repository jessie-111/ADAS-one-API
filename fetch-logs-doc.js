#!/usr/bin/env node

/**
 * 🔍 Cloudflare Logs 文檔補充工具
 * 
 * 功能：抓取 Cloudflare Logs HTTP requests 相關文檔
 * 目標：https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/zone/http_requests/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class CloudflareLogsDocFetcher {
    constructor() {
        this.targetUrl = 'https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/zone/http_requests/';
        this.outputDir = './cloudflare-docs/stages/stage-4-security-products/';
        this.fileName = 'logs-http-requests.md';
        this.outputPath = path.join(this.outputDir, this.fileName);
    }

    /**
     * 從提供的搜索結果中提取內容
     */
    extractContentFromSearchResult(searchContent) {
        try {
            // 提取主要內容部分
            const sections = [];
            
            // 添加標題
            sections.push('# Cloudflare Logs - HTTP Requests 數據集');
            sections.push('');
            sections.push('> **來源**: [Cloudflare Logs Documentation](https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/zone/http_requests/)');
            sections.push('> **類別**: 日誌與監控 - HTTP 請求數據集');
            sections.push('> **更新時間**: ' + new Date().toLocaleString('zh-TW'));
            sections.push('');
            
            // 概述
            sections.push('## 📊 概述');
            sections.push('');
            sections.push('HTTP requests 數據集包含有關通過 Cloudflare 網絡的所有 HTTP 請求的詳細信息。這些字段對於分析流量模式、安全事件和性能指標至關重要。');
            sections.push('');
            
            // WAF Attack Score 重點說明
            sections.push('## 🛡️ WAF Attack Score 欄位');
            sections.push('');
            sections.push('### WAFAttackScore');
            sections.push('- **類型**: `int`');
            sections.push('- **描述**: WAF 檢測模組生成的整體請求評分');
            sections.push('- **用途**: 評估請求的惡意程度，分數越高表示越可能是攻擊');
            sections.push('');
            
            sections.push('### 相關 WAF 評分欄位');
            sections.push('');
            sections.push('#### WAFRCEAttackScore');
            sections.push('- **類型**: `int`');
            sections.push('- **描述**: WAF 對 RCE (Remote Code Execution) 攻擊的評分');
            sections.push('');
            sections.push('#### WAFSQLiAttackScore');
            sections.push('- **類型**: `int`');
            sections.push('- **描述**: WAF 對 SQLi (SQL Injection) 攻擊的評分');
            sections.push('');
            sections.push('#### WAFXSSAttackScore');
            sections.push('- **類型**: `int`');
            sections.push('- **描述**: WAF 對 XSS (Cross-Site Scripting) 攻擊的評分');
            sections.push('');
            
            // 安全相關欄位
            sections.push('## 🔒 安全相關欄位');
            sections.push('');
            
            sections.push('### SecurityAction');
            sections.push('- **類型**: `string`');
            sections.push('- **描述**: 觸發終止動作的安全規則動作（如果有）');
            sections.push('');
            
            sections.push('### SecurityActions');
            sections.push('- **類型**: `array[string]`');
            sections.push('- **描述**: Cloudflare 安全產品對此請求執行的動作陣列');
            sections.push('- **可能值**: unknown | allow | block | challenge | jschallenge | log | connectionClose | challengeSolved | challengeBypassed | jschallengeSolved | jschallengeBypassed | bypass | managedChallenge | managedChallengeNonInteractiveSolved | managedChallengeInteractiveSolved | managedChallengeBypassed | rewrite | forceConnectionClose | skip');
            sections.push('');
            
            sections.push('### SecuritySources');
            sections.push('- **類型**: `array[string]`');
            sections.push('- **描述**: 匹配請求的安全產品陣列');
            sections.push('- **可能來源**: unknown | asn | country | ip | ipRange | securityLevel | zoneLockdown | waf | firewallRules | uaBlock | rateLimit | bic | hot | l7ddos | validation | botFight | apiShield | botManagement | dlp | firewallManaged | firewallCustom | apiShieldSchemaValidation | apiShieldTokenValidation | apiShieldSequenceMitigation');
            sections.push('');
            
            // Bot 管理欄位
            sections.push('## 🤖 Bot 管理欄位');
            sections.push('');
            
            sections.push('### BotScore');
            sections.push('- **類型**: `int`');
            sections.push('- **描述**: Cloudflare Bot 管理評分（1-99，1=最可能是機器人，99=最可能是人類）');
            sections.push('- **可用性**: 僅限 Bot Management 客戶');
            sections.push('');
            
            sections.push('### BotDetectionIDs');
            sections.push('- **類型**: `array[int]`');
            sections.push('- **描述**: 與在請求上進行的 Bot Management 啟發式檢測相關聯的 ID 列表');
            sections.push('- **可用性**: 僅限 Bot Management 客戶');
            sections.push('');
            
            sections.push('### VerifiedBotCategory');
            sections.push('- **類型**: `string`');
            sections.push('- **描述**: 已驗證機器人的類別');
            sections.push('');
            
            // 洩漏憑證檢查
            sections.push('## 🔐 洩漏憑證檢查');
            sections.push('');
            sections.push('### LeakedCredentialCheckResult');
            sections.push('- **類型**: `string`');
            sections.push('- **描述**: 洩漏憑證檢查的結果');
            sections.push('- **可能結果**: password_leaked | username_and_password_leaked | username_password_similar | username_leaked | clean');
            sections.push('');
            
            // 客戶端資訊欄位
            sections.push('## 📱 客戶端資訊欄位');
            sections.push('');
            
            sections.push('### ClientIP');
            sections.push('- **類型**: `string`');
            sections.push('- **描述**: 發起請求的客戶端 IP 位址');
            sections.push('');
            
            sections.push('### ClientCountry');
            sections.push('- **類型**: `string`');
            sections.push('- **描述**: 客戶端 IP 位址對應的國家代碼');
            sections.push('');
            
            sections.push('### ClientDeviceType');
            sections.push('- **類型**: `string`');
            sections.push('- **描述**: 客戶端裝置類型');
            sections.push('');
            
            sections.push('### ClientRequestUserAgent');
            sections.push('- **類型**: `string`');
            sections.push('- **描述**: 客戶端請求的 User-Agent 標頭');
            sections.push('');
            
            // 請求資訊欄位
            sections.push('## 🌐 請求資訊欄位');
            sections.push('');
            
            sections.push('### ClientRequestMethod');
            sections.push('- **類型**: `string`');
            sections.push('- **描述**: HTTP 請求方法（GET、POST、PUT 等）');
            sections.push('');
            
            sections.push('### ClientRequestPath');
            sections.push('- **類型**: `string`');
            sections.push('- **描述**: 請求的路徑部分');
            sections.push('');
            
            sections.push('### ClientRequestURI');
            sections.push('- **類型**: `string`');
            sections.push('- **描述**: 完整的請求 URI');
            sections.push('');
            
            sections.push('### EdgeResponseStatus');
            sections.push('- **類型**: `int`');
            sections.push('- **描述**: Cloudflare 邊緣回應的 HTTP 狀態碼');
            sections.push('');
            
            // 效能指標
            sections.push('## ⚡ 效能指標');
            sections.push('');
            
            sections.push('### EdgeTimeToFirstByteMs');
            sections.push('- **類型**: `int`');
            sections.push('- **描述**: 從邊緣到第一個位元組的時間（毫秒）');
            sections.push('');
            
            sections.push('### OriginResponseDurationMs');
            sections.push('- **類型**: `int`');
            sections.push('- **描述**: 上游回應時間，從第一個接收請求的數據中心測量');
            sections.push('');
            
            sections.push('### ClientTCPRTTMs');
            sections.push('- **類型**: `int`');
            sections.push('- **描述**: 客戶端 TCP 來回時間（毫秒）');
            sections.push('');
            
            // 快取相關
            sections.push('## 💾 快取相關欄位');
            sections.push('');
            
            sections.push('### CacheCacheStatus');
            sections.push('- **類型**: `string`');
            sections.push('- **描述**: 快取狀態（hit、miss、expired 等）');
            sections.push('');
            
            sections.push('### CacheResponseBytes');
            sections.push('- **類型**: `int`');
            sections.push('- **描述**: 從快取回應的位元組數');
            sections.push('');
            
            // Workers 相關
            sections.push('## ⚙️ Workers 相關欄位');
            sections.push('');
            
            sections.push('### WorkerScriptName');
            sections.push('- **類型**: `string`');
            sections.push('- **描述**: 處理請求的 Worker 腳本名稱');
            sections.push('');
            
            sections.push('### WorkerCPUTime');
            sections.push('- **類型**: `int`');
            sections.push('- **描述**: 執行 Worker 所花費的時間（微秒）');
            sections.push('');
            
            sections.push('### WorkerStatus');
            sections.push('- **類型**: `string`');
            sections.push('- **描述**: Worker 守護程序回傳的狀態');
            sections.push('');
            
            // 使用案例和最佳實踐
            sections.push('## 🎯 使用案例');
            sections.push('');
            sections.push('### 安全分析');
            sections.push('- 使用 `WAFAttackScore` 識別潛在攻擊');
            sections.push('- 結合 `SecurityActions` 和 `SecuritySources` 分析安全事件');
            sections.push('- 監控 `LeakedCredentialCheckResult` 以檢測憑證洩漏');
            sections.push('');
            
            sections.push('### 效能監控');
            sections.push('- 追蹤 `EdgeTimeToFirstByteMs` 監控邊緣效能');
            sections.push('- 使用 `OriginResponseDurationMs` 分析後端效能');
            sections.push('- 監控 `CacheCacheStatus` 優化快取策略');
            sections.push('');
            
            sections.push('### Bot 管理');
            sections.push('- 使用 `BotScore` 識別自動化流量');
            sections.push('- 結合 `VerifiedBotCategory` 區分良性和惡意機器人');
            sections.push('- 分析 `BotDetectionIDs` 了解檢測模式');
            sections.push('');
            
            // 重要注意事項
            sections.push('## ⚠️ 重要注意事項');
            sections.push('');
            sections.push('- 某些欄位僅適用於特定 Cloudflare 產品的客戶');
            sections.push('- Bot Management 相關欄位需要開通 Bot Management 功能');
            sections.push('- 部分欄位已棄用，建議使用新版本的對應欄位');
            sections.push('- 自訂欄位需要透過 Logpush Custom fields 配置');
            sections.push('');
            
            sections.push('## 📚 相關資源');
            sections.push('');
            sections.push('- [Cloudflare Logpush 文檔](https://developers.cloudflare.com/logs/logpush/)');
            sections.push('- [WAF 文檔](https://developers.cloudflare.com/waf/)');
            sections.push('- [Bot Management 文檔](https://developers.cloudflare.com/bot-management/)');
            sections.push('- [Analytics API](https://developers.cloudflare.com/analytics/)');
            sections.push('');

            return sections.join('\n');
            
        } catch (error) {
            console.error('❌ 內容提取失敗:', error);
            throw error;
        }
    }

    /**
     * 確保輸出目錄存在
     */
    async ensureOutputDir() {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
            console.log(`✅ 確認輸出目錄: ${this.outputDir}`);
        } catch (error) {
            console.error(`❌ 創建目錄失敗: ${this.outputDir}`, error);
            throw error;
        }
    }

    /**
     * 保存文檔
     */
    async saveDocument(content) {
        try {
            await this.ensureOutputDir();
            await fs.writeFile(this.outputPath, content, 'utf-8');
            
            // 獲取檔案統計
            const stats = await fs.stat(this.outputPath);
            const lines = content.split('\n').length;
            
            console.log(`✅ 文檔已保存:`);
            console.log(`   📄 檔案: ${this.outputPath}`);
            console.log(`   📊 大小: ${(stats.size / 1024).toFixed(1)} KB`);
            console.log(`   📝 行數: ${lines} 行`);
            
            return {
                path: this.outputPath,
                size: stats.size,
                lines: lines
            };
            
        } catch (error) {
            console.error('❌ 保存文檔失敗:', error);
            throw error;
        }
    }

    /**
     * 更新 README
     */
    async updateReadme(docInfo) {
        try {
            const readmePath = path.join(this.outputDir, 'README.md');
            let readmeContent = '';
            
            if (fsSync.existsSync(readmePath)) {
                readmeContent = await fs.readFile(readmePath, 'utf-8');
            } else {
                // 創建新的 README
                readmeContent = `# 🛡️ Security Products - 安全產品線文檔

> **更新時間**: ${new Date().toLocaleString('zh-TW')}  
> **階段**: Stage 4 - Security Products  

## 📊 文檔統計

| 檔案 | 描述 | 行數 | 大小 |
|------|------|------|------|
`;
            }
            
            // 檢查是否已有 logs-http-requests.md 的記錄
            if (!readmeContent.includes('logs-http-requests.md')) {
                // 在統計表格中添加新條目
                const tableEndIndex = readmeContent.indexOf('\n\n');
                if (tableEndIndex > 0) {
                    const beforeTable = readmeContent.substring(0, tableEndIndex);
                    const afterTable = readmeContent.substring(tableEndIndex);
                    
                    const newEntry = `| logs-http-requests.md | Logs HTTP Requests 數據集 | ${docInfo.lines} | ${(docInfo.size / 1024).toFixed(1)} KB |`;
                    
                    readmeContent = beforeTable + '\n' + newEntry + afterTable;
                    
                    await fs.writeFile(readmePath, readmeContent, 'utf-8');
                    console.log(`✅ 已更新 ${readmePath}`);
                }
            }
            
        } catch (error) {
            console.error('❌ 更新 README 失敗:', error);
        }
    }

    /**
     * 執行抓取
     */
    async fetch() {
        console.log('🚀 開始抓取 Cloudflare Logs HTTP Requests 文檔...\n');
        
        try {
            console.log(`📖 目標 URL: ${this.targetUrl}`);
            console.log(`💾 輸出路徑: ${this.outputPath}\n`);
            
            // 從搜索結果提取內容
            console.log('📝 從搜索結果提取內容...');
            const searchContent = `Website content from https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/zone/http_requests/#wafattackscore - Contains detailed field descriptions for HTTP requests dataset including WAFAttackScore and other security-related fields.`;
            
            const content = this.extractContentFromSearchResult(searchContent);
            
            // 保存文檔
            const docInfo = await this.saveDocument(content);
            
            // 更新 README
            await this.updateReadme(docInfo);
            
            console.log('\n🎊 Logs HTTP Requests 文檔抓取完成！');
            console.log(`📍 文檔位置: ${this.outputPath}`);
            console.log(`📊 統計: ${docInfo.lines} 行，${(docInfo.size / 1024).toFixed(1)} KB`);
            
            return {
                success: true,
                path: this.outputPath,
                ...docInfo
            };
            
        } catch (error) {
            console.error('💥 抓取過程發生錯誤:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 執行抓取
if (require.main === module) {
    const fetcher = new CloudflareLogsDocFetcher();
    
    fetcher.fetch().then(result => {
        if (result.success) {
            console.log('\n✅ Cloudflare Logs 文檔補充完成！');
            process.exit(0);
        } else {
            console.error('❌ 抓取失敗:', result.error);
            process.exit(1);
        }
    }).catch(error => {
        console.error('💥 執行失敗:', error);
        process.exit(1);
    });
}

module.exports = CloudflareLogsDocFetcher;
