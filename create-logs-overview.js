#!/usr/bin/env node

/**
 * 📊 Cloudflare Logs 完整文檔生成工具
 * 
 * 功能：創建完整的 Cloudflare Logs 系統文檔
 * 來源：https://developers.cloudflare.com/logs/
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class CloudflareLogsDocGenerator {
    constructor() {
        this.outputDir = './cloudflare-docs/stages/stage-4-security-products/';
        this.fileName = 'logs-overview.md';
        this.outputPath = path.join(this.outputDir, this.fileName);
    }

    /**
     * 生成完整的 Logs 文檔內容
     */
    generateLogsContent() {
        const sections = [];

        // 標題和概述
        sections.push('# Cloudflare Logs - 完整日誌系統');
        sections.push('');
        sections.push('> **來源**: [Cloudflare Logs Documentation](https://developers.cloudflare.com/logs/)');
        sections.push('> **類別**: 日誌與監控 - 完整日誌系統');
        sections.push('> **更新時間**: ' + new Date().toLocaleString('zh-TW'));
        sections.push('');

        // 系統概述
        sections.push('## 📊 系統概述');
        sections.push('');
        sections.push('Cloudflare Logs 提供詳細的日誌記錄，包含由我們產品生成的元數據。這些日誌對於調試、識別配置調整和創建分析非常有幫助，特別是與其他來源（如應用程序伺服器）的日誌結合使用時。');
        sections.push('');
        sections.push('### 🎯 主要用途');
        sections.push('- 🔍 **調試**: 識別和解決應用程序問題');
        sections.push('- ⚙️ **配置優化**: 根據日誌數據調整設定');
        sections.push('- 📈 **分析洞察**: 創建詳細的流量和安全分析');
        sections.push('- 🛡️ **安全監控**: 檢測和分析安全威脅');
        sections.push('');

        // 核心功能
        sections.push('## 🚀 核心功能');
        sections.push('');

        // Logpush
        sections.push('### 📤 Logpush');
        sections.push('**將請求或事件日誌推送到您的雲端服務提供商**');
        sections.push('');
        sections.push('#### 支援的目的地');
        sections.push('- **雲端存儲**:');
        sections.push('  - ☁️ Cloudflare R2');
        sections.push('  - 🚀 Amazon S3');
        sections.push('  - 🔷 Microsoft Azure');
        sections.push('  - 🟡 Google Cloud Storage');
        sections.push('  - 📊 S3-compatible endpoints');
        sections.push('');
        sections.push('- **分析平台**:');
        sections.push('  - 🐕 Datadog');
        sections.push('  - 🔍 Elastic');
        sections.push('  - 📊 BigQuery');
        sections.push('  - 🟢 New Relic');
        sections.push('  - 📈 Splunk');
        sections.push('  - 📉 Sumo Logic');
        sections.push('');
        sections.push('- **安全平台**:');
        sections.push('  - 🛡️ IBM QRadar');
        sections.push('  - ☁️ IBM Cloud Logs');
        sections.push('');
        sections.push('- **第三方整合**:');
        sections.push('  - 📊 Axiom');
        sections.push('  - 🔒 Taegis');
        sections.push('  - 🛡️ Exabeam');
        sections.push('');

        // Instant Logs
        sections.push('### ⚡ Instant Logs');
        sections.push('**在 Cloudflare 儀表板或 CLI 中即時查看 HTTP 請求日誌**');
        sections.push('');
        sections.push('#### 特色功能');
        sections.push('- 🕐 **即時監控**: 實時查看 HTTP 請求');
        sections.push('- 🎛️ **儀表板整合**: 直接在 Cloudflare 儀表板中查看');
        sections.push('- 💻 **CLI 支援**: 命令列介面訪問');
        sections.push('- 🔍 **快速調試**: 即時識別問題');
        sections.push('');

        // Logpull
        sections.push('### 📥 Logpull (Legacy)');
        sections.push('**通過 REST API 檢索日誌的傳統方法**');
        sections.push('');
        sections.push('#### 功能描述');
        sections.push('- 🔄 **HTTP 訪問**: 通過 REST API 消費請求日誌');
        sections.push('- 📜 **傳統支援**: 為舊有系統提供兼容性');
        sections.push('- 🔧 **API 驅動**: 程序化日誌檢索');
        sections.push('');

        // 數據集類型
        sections.push('## 📋 數據集類型');
        sections.push('');

        // Zone-scoped datasets
        sections.push('### 🌍 Zone-scoped Datasets (區域級數據集)');
        sections.push('');
        sections.push('#### DNS Logs (DNS 日誌)');
        sections.push('- **用途**: DNS 查詢和響應記錄');
        sections.push('- **內容**: 查詢類型、響應時間、解析結果');
        sections.push('- **應用**: DNS 性能分析、故障排除');
        sections.push('');
        
        sections.push('#### Firewall Events (防火牆事件)');
        sections.push('- **用途**: 防火牆規則觸發記錄');
        sections.push('- **內容**: 阻擋、允許、挑戰等動作');
        sections.push('- **應用**: 安全事件分析、規則優化');
        sections.push('');
        
        sections.push('#### HTTP Requests (HTTP 請求)');
        sections.push('- **用途**: 所有 HTTP/HTTPS 請求詳情');
        sections.push('- **內容**: WAF 評分、Bot 評分、性能指標');
        sections.push('- **應用**: 流量分析、安全監控、性能優化');
        sections.push('- **詳細文檔**: 參見 `logs-http-requests.md`');
        sections.push('');
        
        sections.push('#### NEL Reports (NEL 報告)');
        sections.push('- **用途**: Network Error Logging 報告');
        sections.push('- **內容**: 網路錯誤和連接問題');
        sections.push('- **應用**: 網路健康監控、連接問題診斷');
        sections.push('');
        
        sections.push('#### Page Shield Events (頁面防護事件)');
        sections.push('- **用途**: 前端安全事件記錄');
        sections.push('- **內容**: 惡意腳本檢測、CSP 違規');
        sections.push('- **應用**: 前端安全監控、供應鏈攻擊防護');
        sections.push('');
        
        sections.push('#### Spectrum Events (Spectrum 事件)');
        sections.push('- **用途**: TCP/UDP 代理事件');
        sections.push('- **內容**: 非 HTTP 流量代理記錄');
        sections.push('- **應用**: TCP/UDP 流量分析');
        sections.push('');
        
        sections.push('#### Zaraz Events (Zaraz 事件)');
        sections.push('- **用途**: 第三方工具管理事件');
        sections.push('- **內容**: 標籤載入、執行記錄');
        sections.push('- **應用**: 第三方服務監控');
        sections.push('');

        // Account-scoped datasets
        sections.push('### 🏢 Account-scoped Datasets (帳戶級數據集)');
        sections.push('');
        
        sections.push('#### Zero Trust 相關');
        sections.push('- **Access Requests**: 身份驗證請求記錄');
        sections.push('- **Browser Isolation User Actions**: 瀏覽器隔離用戶行為');
        sections.push('- **Device Posture Results**: 設備安全狀態檢查');
        sections.push('- **Gateway DNS/HTTP/Network**: Gateway 各層級日誌');
        sections.push('- **Zero Trust Network Session Logs**: 網路會話記錄');
        sections.push('- **SSH Logs**: SSH 連接記錄');
        sections.push('');
        
        sections.push('#### 安全與合規');
        sections.push('- **Audit Logs / Audit Logs V2**: 帳戶變更審計');
        sections.push('- **CASB Findings**: 雲端安全狀態發現');
        sections.push('- **DLP Forensic Copies**: 資料洩漏防護取證');
        sections.push('- **Email Security Alerts**: 郵件安全警報');
        sections.push('- **Magic IDS Detections**: 入侵檢測系統');
        sections.push('');
        
        sections.push('#### 其他服務');
        sections.push('- **DNS Firewall Logs**: DNS 防火牆記錄');
        sections.push('- **Network Analytics Logs**: 網路分析日誌');
        sections.push('- **Sinkhole HTTP Logs**: Sinkhole HTTP 記錄');
        sections.push('- **Workers Trace Events**: Workers 執行追蹤');
        sections.push('');

        // 高級功能
        sections.push('## ⚙️ 高級功能');
        sections.push('');
        
        sections.push('### 📊 Log Output Options (日誌輸出選項)');
        sections.push('- **格式選擇**: JSON, CSV, 自定義格式');
        sections.push('- **壓縮選項**: gzip, 原始格式');
        sections.push('- **批次處理**: 批量日誌傳輸');
        sections.push('- **時間戳**: 統一時間格式');
        sections.push('');
        
        sections.push('### 🔍 Filters (篩選器)');
        sections.push('- **時間範圍**: 指定日誌時間窗口');
        sections.push('- **欄位篩選**: 基於特定欄位值過濾');
        sections.push('- **條件邏輯**: AND/OR 邏輯組合');
        sections.push('- **正則表達式**: 進階模式匹配');
        sections.push('');
        
        sections.push('### 🛠️ Custom Fields (自定義欄位)');
        sections.push('- **Header 提取**: 提取特定 HTTP Headers');
        sections.push('- **Cookie 值**: 包含指定 Cookie');
        sections.push('- **自定義標籤**: 添加業務相關標識');
        sections.push('- **計算欄位**: 基於現有欄位計算新值');
        sections.push('');
        
        sections.push('### 🚀 Edge Log Delivery (邊緣日誌傳遞)');
        sections.push('- **低延遲**: 邊緣節點直接傳送');
        sections.push('- **高可用性**: 分散式日誌傳遞');
        sections.push('- **負載平衡**: 自動分散傳送負載');
        sections.push('- **故障恢復**: 自動重試機制');
        sections.push('');

        // 管理和設定
        sections.push('## 🔧 管理和設定');
        sections.push('');
        
        sections.push('### 📋 API 配置');
        sections.push('- **REST API**: 程序化管理 Logpush 任務');
        sections.push('- **cURL 範例**: 命令列管理');
        sections.push('- **Python SDK**: Python 程序化管理');
        sections.push('- **批量操作**: 大量任務管理');
        sections.push('');
        
        sections.push('### 🔐 Permissions (權限管理)');
        sections.push('- **角色分配**: 不同等級的日誌訪問權限');
        sections.push('- **API 令牌**: 安全的 API 訪問控制');
        sections.push('- **帳戶層級**: 帳戶和區域權限分離');
        sections.push('- **審計追蹤**: 權限使用記錄');
        sections.push('');

        // 相關產品整合
        sections.push('## 🔗 相關產品整合');
        sections.push('');
        
        sections.push('### 📊 Log Explorer');
        sections.push('- **直接存儲**: 在 Cloudflare 儀表板直接存儲和探索日誌');
        sections.push('- **可視化查詢**: 圖形化日誌分析介面');
        sections.push('- **即時搜索**: 快速日誌搜索和篩選');
        sections.push('');
        
        sections.push('### 📋 Audit Logs');
        sections.push('- **變更歷史**: 總結帳戶內變更歷史');
        sections.push('- **合規記錄**: 滿足合規和審計要求');
        sections.push('- **用戶行為**: 追蹤用戶操作記錄');
        sections.push('');
        
        sections.push('### 📈 Web Analytics');
        sections.push('- **隱私優先**: 不改變 DNS 或使用代理的分析');
        sections.push('- **實時數據**: 即時網站流量分析');
        sections.push('- **用戶行為**: 訪客行為模式分析');
        sections.push('');

        // 使用案例
        sections.push('## 🎯 實際使用案例');
        sections.push('');
        
        sections.push('### 🛡️ 安全監控');
        sections.push('```javascript');
        sections.push('// 使用 Logpush 到 SIEM 系統');
        sections.push('const securityConfig = {');
        sections.push('  dataset: "firewall_events",');
        sections.push('  destination: "https://siem.company.com/webhook",');
        sections.push('  fields: [');
        sections.push('    "SecurityAction", "WAFAttackScore",');
        sections.push('    "ClientIP", "SecurityRuleID"');
        sections.push('  ],');
        sections.push('  filter: "SecurityAction ne \\"allow\\""');
        sections.push('};');
        sections.push('```');
        sections.push('');
        
        sections.push('### 📊 性能分析');
        sections.push('```javascript');
        sections.push('// 監控邊緣性能指標');
        sections.push('const perfConfig = {');
        sections.push('  dataset: "http_requests",');
        sections.push('  destination: "s3://analytics-bucket/performance/",');
        sections.push('  fields: [');
        sections.push('    "EdgeTimeToFirstByteMs", "OriginResponseDurationMs",');
        sections.push('    "CacheCacheStatus", "EdgeResponseStatus"');
        sections.push('  ],');
        sections.push('  sample_rate: 0.1 // 10% 抽樣');
        sections.push('};');
        sections.push('```');
        sections.push('');
        
        sections.push('### 🤖 Bot 管理');
        sections.push('```javascript');
        sections.push('// Bot 流量分析');
        sections.push('const botConfig = {');
        sections.push('  dataset: "http_requests",');
        sections.push('  destination: "datadog://logs.datadoghq.com",');
        sections.push('  fields: [');
        sections.push('    "BotScore", "VerifiedBotCategory",');
        sections.push('    "BotDetectionIDs", "JSDetectionPassed"');
        sections.push('  ],');
        sections.push('  filter: "BotScore lt 30" // 可疑 Bot 流量');
        sections.push('};');
        sections.push('```');
        sections.push('');

        // 最佳實踐
        sections.push('## 🏆 最佳實踐');
        sections.push('');
        
        sections.push('### 📈 數據管理');
        sections.push('- **採樣策略**: 對高流量站點使用適當的採樣率');
        sections.push('- **欄位選擇**: 只包含必要的欄位以降低成本');
        sections.push('- **時間範圍**: 設定合理的日誌保留期');
        sections.push('- **壓縮格式**: 使用 gzip 減少傳輸成本');
        sections.push('');
        
        sections.push('### 🔄 監控和告警');
        sections.push('- **傳送監控**: 監控日誌傳送狀態');
        sections.push('- **失敗處理**: 設定失敗重試機制');
        sections.push('- **容量規劃**: 預估日誌量和存儲需求');
        sections.push('- **成本控制**: 監控傳送費用和存儲成本');
        sections.push('');
        
        sections.push('### 🛡️ 安全考量');
        sections.push('- **傳輸加密**: 使用 HTTPS/TLS 傳送日誌');
        sections.push('- **身份驗證**: 目的地端點的身份驗證');
        sections.push('- **敏感數據**: 避免記錄敏感個人信息');
        sections.push('- **存取控制**: 限制日誌存取權限');
        sections.push('');

        // 故障排除
        sections.push('## 🔧 故障排除');
        sections.push('');
        
        sections.push('### ⚠️ 常見問題');
        sections.push('- **日誌延遲**: 網路或目的地處理延遲');
        sections.push('- **丟失日誌**: 目的地不可用或配置錯誤');
        sections.push('- **格式錯誤**: 自定義欄位配置問題');
        sections.push('- **權限錯誤**: API 令牌或目的地權限不足');
        sections.push('');
        
        sections.push('### 🔍 診斷工具');
        sections.push('- **Logpush 狀態 API**: 檢查任務運行狀態');
        sections.push('- **測試傳送**: 發送測試日誌驗證配置');
        sections.push('- **錯誤日誌**: 查看傳送錯誤詳情');
        sections.push('- **監控儀表板**: Cloudflare 儀表板監控頁面');
        sections.push('');

        // 計費和限制
        sections.push('## 💰 計費和限制');
        sections.push('');
        sections.push('### 計費模式');
        sections.push('- **按量計費**: 根據傳送的日誌量計費');
        sections.push('- **包含配額**: 部分方案包含免費配額');
        sections.push('- **目的地成本**: 目的地服務商的額外費用');
        sections.push('');
        sections.push('### 使用限制');
        sections.push('- **最大欄位**: 每個數據集的最大欄位數限制');
        sections.push('- **採樣率**: 最小採樣率限制');
        sections.push('- **並發任務**: 同時運行的 Logpush 任務數');
        sections.push('');

        // 參考資料
        sections.push('## 📚 參考資料');
        sections.push('');
        
        sections.push('### 🔗 相關文檔');
        sections.push('- [Logpush Job Setup](https://developers.cloudflare.com/logs/logpush/logpush-job-setup/)');
        sections.push('- [Dataset Schemas](https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/)');
        sections.push('- [API Reference](https://developers.cloudflare.com/api/operations/logpush-jobs-for-a-zone-list-logpush-jobs)');
        sections.push('- [Pricing Information](https://developers.cloudflare.com/logs/pricing/)');
        sections.push('');
        
        sections.push('### 🛠️ 工具和範例');
        sections.push('- [cURL 管理範例](https://developers.cloudflare.com/logs/logpush/examples/manage-logpush-with-curl/)');
        sections.push('- [Python SDK 範例](https://developers.cloudflare.com/logs/logpush/examples/manage-logpush-with-python/)');
        sections.push('- [JSON 解析指南](https://developers.cloudflare.com/logs/parse-cloudflare-logs-json-data/)');
        sections.push('');
        
        sections.push('### 📋 更新記錄');
        sections.push('- [Change Notices](https://developers.cloudflare.com/logs/reference/change-notices/)');
        sections.push('- [Changelog](https://developers.cloudflare.com/logs/changelog/)');
        sections.push('- [Security Fields Updates](https://developers.cloudflare.com/logs/reference/change-notices/2023-02-01-updates-to-security-fields/)');
        sections.push('');

        return sections.join('\n');
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
                
                // 檢查是否已有 logs-overview.md 的記錄
                if (!readmeContent.includes('logs-overview.md')) {
                    // 在統計表格中添加新條目
                    const tableEndIndex = readmeContent.indexOf('\n\n');
                    if (tableEndIndex > 0) {
                        const beforeTable = readmeContent.substring(0, tableEndIndex);
                        const afterTable = readmeContent.substring(tableEndIndex);
                        
                        const newEntry = `| logs-overview.md | Cloudflare Logs 完整系統 | ${docInfo.lines} | ${(docInfo.size / 1024).toFixed(1)} KB |`;
                        
                        readmeContent = beforeTable + '\n' + newEntry + afterTable;
                        
                        await fs.writeFile(readmePath, readmeContent, 'utf-8');
                        console.log(`✅ 已更新 ${readmePath}`);
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ 更新 README 失敗:', error);
        }
    }

    /**
     * 執行生成
     */
    async generate() {
        console.log('🚀 開始生成 Cloudflare Logs 完整文檔...\n');
        
        try {
            console.log(`📖 來源: https://developers.cloudflare.com/logs/`);
            console.log(`💾 輸出路徑: ${this.outputPath}\n`);
            
            // 生成內容
            console.log('📝 生成完整 Logs 系統文檔...');
            const content = this.generateLogsContent();
            
            // 保存文檔
            const docInfo = await this.saveDocument(content);
            
            // 更新 README
            await this.updateReadme(docInfo);
            
            console.log('\n🎊 Cloudflare Logs 完整文檔生成完成！');
            console.log(`📍 文檔位置: ${this.outputPath}`);
            console.log(`📊 統計: ${docInfo.lines} 行，${(docInfo.size / 1024).toFixed(1)} KB`);
            
            return {
                success: true,
                path: this.outputPath,
                ...docInfo
            };
            
        } catch (error) {
            console.error('💥 生成過程發生錯誤:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 執行生成
if (require.main === module) {
    const generator = new CloudflareLogsDocGenerator();
    
    generator.generate().then(result => {
        if (result.success) {
            console.log('\n✅ Cloudflare Logs 完整文檔生成完成！');
            process.exit(0);
        } else {
            console.error('❌ 生成失敗:', result.error);
            process.exit(1);
        }
    }).catch(error => {
        console.error('💥 執行失敗:', error);
        process.exit(1);
    });
}

module.exports = CloudflareLogsDocGenerator;
