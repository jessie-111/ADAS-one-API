#!/usr/bin/env node

/**
 * 📊 Cloudflare Logs 完整文檔爬蟲
 * 
 * 功能：補充完整的 Cloudflare Logs 產品線文檔
 * 目標：https://developers.cloudflare.com/logs/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class CloudflareLogsCrawler {
    constructor() {
        this.baseUrl = 'https://developers.cloudflare.com';
        this.logsBaseUrl = 'https://developers.cloudflare.com/logs/';
        this.outputDir = './cloudflare-docs/stages/stage-4-security-products/logs/';
        
        // 定義要爬取的 Logs 相關文檔結構
        this.logsStructure = {
            'overview': {
                name: 'Cloudflare Logs 總覽',
                url: '/logs/',
                filename: 'logs-overview.md'
            },
            'logpush': {
                name: 'Logpush - 日誌推送',
                url: '/logs/logpush/',
                filename: 'logpush-overview.md'
            },
            'logpush-permissions': {
                name: 'Logpush 權限管理',
                url: '/logs/logpush/permissions/',
                filename: 'logpush-permissions.md'
            },
            'logpush-destinations': {
                name: 'Logpush 目標配置',
                url: '/logs/logpush/logpush-job/destinations/',
                filename: 'logpush-destinations.md'
            },
            'logpush-datasets': {
                name: 'Logpush 數據集總覽',
                url: '/logs/logpush/logpush-job/datasets/',
                filename: 'logpush-datasets.md'
            },
            'firewall-events': {
                name: '防火牆事件數據集',
                url: '/logs/logpush/logpush-job/datasets/zone/firewall_events/',
                filename: 'firewall-events.md'
            },
            'dns-logs': {
                name: 'DNS 日誌數據集',
                url: '/logs/logpush/logpush-job/datasets/zone/dns_logs/',
                filename: 'dns-logs.md'
            },
            'instant-logs': {
                name: 'Instant Logs - 即時日誌',
                url: '/logs/instant-logs/',
                filename: 'instant-logs.md'
            },
            'logs-engine': {
                name: 'Logs Engine - 日誌引擎',
                url: '/logs/logs-engine/',
                filename: 'logs-engine.md'
            },
            'logpull': {
                name: 'Logpull - 舊版日誌API',
                url: '/logs/logpull/',
                filename: 'logpull-legacy.md'
            },
            'security-fields': {
                name: '安全欄位參考',
                url: '/logs/reference/log-fields/security/',
                filename: 'security-fields.md'
            },
            'waf-fields': {
                name: 'WAF 欄位參考',
                url: '/logs/reference/log-fields/waf/',
                filename: 'waf-fields.md'
            }
        };

        this.delay = 2000; // 2秒延遲
        this.maxRetries = 3;
        this.crawledCount = 0;
        this.totalCount = Object.keys(this.logsStructure).length;
    }

    /**
     * 延遲函數
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 獲取頁面內容
     */
    async fetchPage(url, retries = 0) {
        try {
            console.log(`📖 抓取: ${url}`);
            
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8'
                },
                timeout: 15000
            });

            await this.sleep(this.delay);
            return response.data;

        } catch (error) {
            if (retries < this.maxRetries) {
                console.log(`⚠️  重試 ${retries + 1}/${this.maxRetries}: ${url}`);
                await this.sleep(this.delay * 2);
                return this.fetchPage(url, retries + 1);
            }
            
            console.error(`❌ 抓取失敗 (${retries + 1} 次重試後): ${url}`);
            console.error(`   錯誤: ${error.message}`);
            return null;
        }
    }

    /**
     * 解析並清理內容
     */
    parseContent(html, url) {
        try {
            const $ = cheerio.load(html);
            
            // 移除導航和無關元素
            $('nav, header, footer, .nav, .navbar, .sidebar').remove();
            $('.breadcrumb, .pagination, .page-nav').remove();
            $('script, style, .ads, .advertisement').remove();
            
            // 找到主要內容區域
            let mainContent = $('main').first();
            if (mainContent.length === 0) {
                mainContent = $('.content').first();
            }
            if (mainContent.length === 0) {
                mainContent = $('article').first();
            }
            if (mainContent.length === 0) {
                mainContent = $('body');
            }

            // 提取標題
            let title = $('h1').first().text().trim();
            if (!title) {
                title = $('title').text().replace(' - Cloudflare Docs', '').trim();
            }

            // 轉換為 Markdown
            let markdown = `# ${title}\n\n`;
            markdown += `> **來源**: [${title}](${url})\n`;
            markdown += `> **類別**: Cloudflare Logs - 日誌與監控\n`;
            markdown += `> **更新時間**: ${new Date().toLocaleString('zh-TW')}\n\n`;

            // 處理內容
            mainContent.find('h1, h2, h3, h4, h5, h6').each((i, el) => {
                const level = el.tagName.charAt(1);
                const text = $(el).text().trim();
                if (text && text !== title) {
                    markdown += '#'.repeat(parseInt(level)) + ' ' + text + '\n\n';
                }
            });

            mainContent.find('p').each((i, el) => {
                const text = $(el).text().trim();
                if (text && text.length > 10) {
                    markdown += text + '\n\n';
                }
            });

            // 處理程式碼區塊
            mainContent.find('pre code, .highlight').each((i, el) => {
                const code = $(el).text().trim();
                if (code) {
                    markdown += '```\n' + code + '\n```\n\n';
                }
            });

            // 處理清單
            mainContent.find('ul').each((i, el) => {
                $(el).find('li').each((j, li) => {
                    const text = $(li).text().trim();
                    if (text) {
                        markdown += `- ${text}\n`;
                    }
                });
                markdown += '\n';
            });

            // 處理表格
            mainContent.find('table').each((i, el) => {
                markdown += '\n';
                $(el).find('tr').each((i, tr) => {
                    let row = '|';
                    $(tr).find('th, td').each((j, cell) => {
                        row += ` ${$(cell).text().trim()} |`;
                    });
                    markdown += row + '\n';
                    
                    // 如果是標題行，添加分隔線
                    if (i === 0 && $(tr).find('th').length > 0) {
                        let separator = '|';
                        $(tr).find('th').each(() => {
                            separator += '------|';
                        });
                        markdown += separator + '\n';
                    }
                });
                markdown += '\n';
            });

            return markdown;
            
        } catch (error) {
            console.error(`❌ 內容解析失敗: ${url}`, error.message);
            return null;
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
    async saveDocument(filename, content) {
        try {
            const filePath = path.join(this.outputDir, filename);
            await fs.writeFile(filePath, content, 'utf-8');
            
            const stats = await fs.stat(filePath);
            const lines = content.split('\n').length;
            
            return {
                path: filePath,
                size: stats.size,
                lines: lines
            };
            
        } catch (error) {
            console.error(`❌ 保存失敗: ${filename}`, error);
            return null;
        }
    }

    /**
     * 生成 Logs 目錄 README
     */
    async generateLogsReadme(crawledDocs) {
        const readmeContent = [
            '# 📊 Cloudflare Logs - 完整日誌系統文檔\n',
            '> **產品線**: Cloudflare Logs - 日誌與監控',
            '> **類別**: 安全產品線 - 日誌分析',
            `> **爬取時間**: ${new Date().toLocaleString('zh-TW')}`,
            `> **文檔數量**: ${crawledDocs.length} 個\n`,
            
            '## 📋 Cloudflare Logs 產品概述\n',
            'Cloudflare Logs 提供完整的日誌分析和監控解決方案，包含：',
            '- 🚀 **Logpush** - 將日誌推送到您的雲端服務',
            '- ⚡ **Instant Logs** - 即時查看 HTTP 請求日誌', 
            '- 🔍 **Logs Engine** - 直接在 Cloudflare 中儲存和探索日誌',
            '- 📡 **Logpull** - 透過 REST API 擷取日誌 (舊版)\n',
            
            '## 📊 文檔統計\n',
            '| 檔案 | 描述 | 行數 | 大小 |',
            '|------|------|------|------|'
        ];

        crawledDocs.forEach(doc => {
            readmeContent.push(`| ${doc.filename} | ${doc.description} | ${doc.lines} | ${(doc.size / 1024).toFixed(1)} KB |`);
        });

        readmeContent.push('');
        readmeContent.push('## 🏗️ 日誌架構');
        readmeContent.push('');
        readmeContent.push('### 📤 Logpush (日誌推送)');
        readmeContent.push('- **目的地支援**: R2, S3, GCS, BigQuery, Datadog, Splunk 等');
        readmeContent.push('- **數據集**: HTTP Requests, Firewall Events, DNS Logs 等');
        readmeContent.push('- **自訂欄位**: 靈活的日誌欄位配置');
        readmeContent.push('');
        readmeContent.push('### ⚡ Instant Logs (即時日誌)');
        readmeContent.push('- **即時查看**: 在 Dashboard 或 CLI 中即時查看日誌');
        readmeContent.push('- **即時偵錯**: 快速識別和解決問題');
        readmeContent.push('');
        readmeContent.push('### 🔍 Logs Engine (日誌引擎)');
        readmeContent.push('- **雲端儲存**: 直接在 Cloudflare 中儲存日誌');
        readmeContent.push('- **查詢分析**: 透過 Dashboard 和 API 探索日誌');
        readmeContent.push('');

        readmeContent.push('## 🛡️ 安全分析應用');
        readmeContent.push('- **攻擊檢測**: 使用 WAF 和安全事件日誌');
        readmeContent.push('- **機器人分析**: Bot Management 日誌分析');  
        readmeContent.push('- **DDoS 監控**: DDoS 攻擊模式分析');
        readmeContent.push('- **合規稽核**: 完整的存取和變更記錄');
        readmeContent.push('');

        const readmePath = path.join(this.outputDir, 'README.md');
        await fs.writeFile(readmePath, readmeContent.join('\n'), 'utf-8');
        console.log(`✅ 已生成 Logs README: ${readmePath}`);
    }

    /**
     * 執行爬取
     */
    async crawl() {
        console.log('🚀 開始 Cloudflare Logs 完整文檔爬取...\n');
        console.log(`📊 計畫爬取 ${this.totalCount} 個文檔頁面`);
        console.log(`💾 輸出目錄: ${this.outputDir}\n`);

        try {
            await this.ensureOutputDir();
            
            const crawledDocs = [];
            const errors = [];

            for (const [key, info] of Object.entries(this.logsStructure)) {
                console.log(`\n📑 [${this.crawledCount + 1}/${this.totalCount}] ${info.name}`);
                
                const fullUrl = this.baseUrl + info.url;
                const html = await this.fetchPage(fullUrl);
                
                if (html) {
                    const content = this.parseContent(html, fullUrl);
                    
                    if (content && content.length > 500) { // 確保有實質內容
                        const docInfo = await this.saveDocument(info.filename, content);
                        
                        if (docInfo) {
                            crawledDocs.push({
                                key: key,
                                filename: info.filename,
                                description: info.name,
                                url: fullUrl,
                                ...docInfo
                            });
                            
                            console.log(`✅ 已保存: ${info.filename} (${docInfo.lines} 行, ${(docInfo.size / 1024).toFixed(1)} KB)`);
                        }
                    } else {
                        console.log(`⚠️  內容過少，跳過: ${info.filename}`);
                        errors.push({ url: fullUrl, reason: '內容過少' });
                    }
                } else {
                    console.log(`❌ 抓取失敗: ${info.name}`);
                    errors.push({ url: fullUrl, reason: '抓取失敗' });
                }
                
                this.crawledCount++;
            }

            // 生成統合 README
            await this.generateLogsReadme(crawledDocs);

            // 顯示結果
            console.log('\n🎊 Cloudflare Logs 文檔爬取完成！');
            console.log(`📊 成功爬取: ${crawledDocs.length}/${this.totalCount} 個文檔`);
            console.log(`📁 輸出目錄: ${this.outputDir}`);
            
            if (errors.length > 0) {
                console.log(`\n⚠️  失敗項目 (${errors.length} 個):`);
                errors.forEach(error => {
                    console.log(`   - ${error.url}: ${error.reason}`);
                });
            }

            console.log(`\n📈 統計:`);
            console.log(`   - 總檔案: ${crawledDocs.length + 1} 個 (含 README)`);
            console.log(`   - 總大小: ${(crawledDocs.reduce((sum, doc) => sum + doc.size, 0) / 1024).toFixed(1)} KB`);
            console.log(`   - 總行數: ${crawledDocs.reduce((sum, doc) => sum + doc.lines, 0).toLocaleString()} 行`);

            return {
                success: true,
                crawledDocs: crawledDocs,
                errors: errors,
                outputDir: this.outputDir
            };

        } catch (error) {
            console.error('💥 爬取過程發生錯誤:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 執行爬取
if (require.main === module) {
    const crawler = new CloudflareLogsCrawler();
    
    crawler.crawl().then(result => {
        if (result.success) {
            console.log('\n✅ Cloudflare Logs 文檔補充完成！');
            console.log('🎯 所有日誌系統文檔已整合到安全產品線中');
            process.exit(0);
        } else {
            console.error('❌ 爬取失敗:', result.error);
            process.exit(1);
        }
    }).catch(error => {
        console.error('💥 執行失敗:', error);
        process.exit(1);
    });
}

module.exports = CloudflareLogsCrawler;
