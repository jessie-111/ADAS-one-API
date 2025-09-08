#!/usr/bin/env node

/**
 * Cloudflare 文檔分階段爬蟲程序
 * 支援手動分階段爬取，避免 IP 封鎖風險
 * 基於 waf-docs-crawler.js 擴展而來
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const { URL } = require('url');

// 基礎配置
const BASE_CONFIG = {
    BASE_URL: 'https://developers.cloudflare.com',
    OUTPUT_ROOT: './cloudflare-docs',
    DELAY_BETWEEN_REQUESTS: 1500, // 1.5秒延遲，更保守
    MAX_RETRIES: 3,
    REQUEST_TIMEOUT: 30000,
    USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// 產品線配置
const PRODUCT_LINES = {
    'developer-products': {
        name: '🏗️ Developer Products',
        description: '開發者產品線 - 建構現代應用的基礎工具',
        stage: 1,
        start_urls: [
            'https://developers.cloudflare.com/workers/',
            'https://developers.cloudflare.com/pages/', 
            'https://developers.cloudflare.com/r2/',
            'https://developers.cloudflare.com/images/',
            'https://developers.cloudflare.com/stream/'
        ],
        url_patterns: [
            /^https:\/\/developers\.cloudflare\.com\/workers\//,
            /^https:\/\/developers\.cloudflare\.com\/pages\//,
            /^https:\/\/developers\.cloudflare\.com\/r2\//,
            /^https:\/\/developers\.cloudflare\.com\/images\//,
            /^https:\/\/developers\.cloudflare\.com\/stream\//
        ],
        products: {
            'workers': 'Workers - 無服務器執行環境',
            'pages': 'Pages - 靜態網站託管',
            'r2': 'R2 - 對象存儲',
            'images': 'Images - 圖像優化',
            'stream': 'Stream - 視頻串流'
        },
        estimated_pages: '300-500',
        estimated_time: '15-30分鐘'
    },
    
    'ai-products': {
        name: '🤖 AI Products',
        description: 'AI產品線 - 人工智慧與機器學習解決方案',
        stage: 2,
        start_urls: [
            'https://developers.cloudflare.com/workers-ai/',
            'https://developers.cloudflare.com/vectorize/',
            'https://developers.cloudflare.com/ai-gateway/',
            'https://developers.cloudflare.com/ai/'
        ],
        url_patterns: [
            /^https:\/\/developers\.cloudflare\.com\/workers-ai\//,
            /^https:\/\/developers\.cloudflare\.com\/vectorize\//,
            /^https:\/\/developers\.cloudflare\.com\/ai-gateway\//,
            /^https:\/\/developers\.cloudflare\.com\/ai\//,
            /^https:\/\/developers\.cloudflare\.com\/constellation\//
        ],
        products: {
            'workers-ai': 'Workers AI - AI 推理平台',
            'vectorize': 'Vectorize - 向量數據庫',
            'ai-gateway': 'AI Gateway - AI API 網關',
            'ai-playground': 'AI Playground - AI 測試環境'
        },
        estimated_pages: '200-300',
        estimated_time: '10-20分鐘'
    },
    
    'zero-trust': {
        name: '🔐 Zero Trust (Cloudflare One)',
        description: 'Zero Trust產品線 - 零信任安全架構 (SASE平台)',
        stage: 3,
        start_urls: [
            'https://developers.cloudflare.com/cloudflare-one/'
        ],
        url_patterns: [
            /^https:\/\/developers\.cloudflare\.com\/cloudflare-one\//
        ],
        products: {
            'identity': 'Identity - 身份認證管理',
            'connections': 'Connections - 連接管理 (Tunnel + WARP)',
            'applications': 'Applications - 應用程序管理',
            'policies': 'Policies - 安全政策配置',
            'insights': 'Insights - 分析與監控',
            'email-security': 'Email Security - 郵件安全'
        },
        estimated_pages: '800-1200',
        estimated_time: '40-60分鐘'
    },
    
    'security-products': {
        name: '🛡️ Security Products',
        description: '安全產品線 - 全方位網路安全防護',
        stage: 4,
        start_urls: [
            'https://developers.cloudflare.com/ddos-protection/',
            'https://developers.cloudflare.com/bots/',
            'https://developers.cloudflare.com/ssl/',
            'https://developers.cloudflare.com/page-shield/'
        ],
        url_patterns: [
            /^https:\/\/developers\.cloudflare\.com\/ddos-protection\//,
            /^https:\/\/developers\.cloudflare\.com\/bots\//,
            /^https:\/\/developers\.cloudflare\.com\/ssl\//,
            /^https:\/\/developers\.cloudflare\.com\/page-shield\//,
            /^https:\/\/developers\.cloudflare\.com\/waf\// // 可選，已有資料
        ],
        products: {
            'ddos-protection': 'DDoS Protection - DDoS 防護',
            'bot-management': 'Bot Management - 機器人管理',
            'ssl-tls': 'SSL/TLS - 加密憑證',
            'page-shield': 'Page Shield - 頁面安全防護'
        },
        estimated_pages: '500-700',
        estimated_time: '25-40分鐘'
    }
};

class CloudflareStagedCrawler {
    constructor(productLine = null, options = {}) {
        this.productLine = productLine;
        this.options = {
            monitor: false,
            resume: false,
            validate: false,
            ...options
        };
        
        this.visitedUrls = new Set();
        this.urlsToVisit = [];
        this.crawledContent = [];
        this.stats = {
            startTime: new Date(),
            pagesProcessed: 0,
            pagesSkipped: 0,
            errors: 0
        };
        
        this.axiosInstance = axios.create({
            timeout: BASE_CONFIG.REQUEST_TIMEOUT,
            headers: {
                'User-Agent': BASE_CONFIG.USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });
    }

    /**
     * 日誌輸出
     */
    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warn' ? '⚠️' : 'ℹ️';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    /**
     * 延遲函數
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 列出所有可用的產品線
     */
    listProductLines() {
        this.log('📋 可用的產品線:');
        console.log('');
        
        Object.entries(PRODUCT_LINES).forEach(([key, config]) => {
            console.log(`${config.stage}. ${config.name}`);
            console.log(`   ID: ${key}`);
            console.log(`   描述: ${config.description}`);
            console.log(`   預估頁面: ${config.estimated_pages}`);
            console.log(`   預估時間: ${config.estimated_time}`);
            console.log('');
        });
        
        console.log('使用方法:');
        console.log(`node ${path.basename(__filename)} --product <產品線ID>`);
        console.log('');
        console.log('範例:');
        console.log(`node ${path.basename(__filename)} --product developer-products`);
    }

    /**
     * 檢查URL是否屬於當前產品線
     */
    isValidUrlForProductLine(url) {
        if (!this.productLine || !PRODUCT_LINES[this.productLine]) {
            return false;
        }

        const config = PRODUCT_LINES[this.productLine];
        return config.url_patterns.some(pattern => pattern.test(url));
    }

    /**
     * 從URL判斷產品類型
     */
    getProductFromUrl(url) {
        const pathname = new URL(url).pathname;
        const segments = pathname.split('/').filter(s => s);
        
        if (segments.length > 0) {
            const mainPath = segments[0];
            const config = PRODUCT_LINES[this.productLine];
            
            // 映射路徑到產品名稱
            const pathToProduct = {
                'workers': 'workers',
                'pages': 'pages',
                'r2': 'r2', 
                'images': 'images',
                'stream': 'stream',
                'workers-ai': 'workers-ai',
                'vectorize': 'vectorize',
                'ai-gateway': 'ai-gateway',
                'ai': 'ai-playground',
                'cloudflare-one': 'access',
                'access': 'access',
                'cloudflare-tunnels': 'tunnel',
                'tunnel': 'tunnel',
                'gateway': 'gateway',
                'browser-isolation': 'browser-isolation',
                'ddos-protection': 'ddos-protection',
                'bots': 'bot-management',
                'ssl': 'ssl-tls',
                'page-shield': 'page-shield'
            };
            
            return pathToProduct[mainPath] || mainPath;
        }
        
        return 'general';
    }

    /**
     * 獲取頁面內容
     */
    async fetchPage(url, retryCount = 0) {
        try {
            this.log(`正在獲取: ${url}`);
            
            const response = await this.axiosInstance.get(url);
            
            if (response.status === 200) {
                return response.data;
            } else {
                throw new Error(`HTTP Status: ${response.status}`);
            }
        } catch (error) {
            if (retryCount < BASE_CONFIG.MAX_RETRIES) {
                this.log(`重試 (${retryCount + 1}/${BASE_CONFIG.MAX_RETRIES}): ${url}`, 'warn');
                await this.delay(BASE_CONFIG.DELAY_BETWEEN_REQUESTS * (retryCount + 1));
                return this.fetchPage(url, retryCount + 1);
            } else {
                this.log(`獲取失敗: ${url} - ${error.message}`, 'error');
                this.stats.errors++;
                return null;
            }
        }
    }

    /**
     * 發現產品線相關的URL
     */
    async discoverUrls() {
        const config = PRODUCT_LINES[this.productLine];
        if (!config) {
            throw new Error(`未知的產品線: ${this.productLine}`);
        }

        this.log(`🔍 開始發現 ${config.name} 的所有頁面...`);
        
        const discoveredUrls = new Set();
        
        // 從起始URLs開始
        for (const startUrl of config.start_urls) {
            const html = await this.fetchPage(startUrl);
            if (!html) continue;
            
            const urls = this.extractUrls(html, startUrl);
            urls.forEach(url => {
                if (this.isValidUrlForProductLine(url)) {
                    discoveredUrls.add(url);
                }
            });
            
            await this.delay(BASE_CONFIG.DELAY_BETWEEN_REQUESTS);
        }

        // 遞歸發現更多URLs
        const urlsToExplore = Array.from(discoveredUrls);
        for (const url of urlsToExplore) {
            if (this.visitedUrls.has(url)) continue;
            
            const html = await this.fetchPage(url);
            if (!html) continue;
            
            const moreUrls = this.extractUrls(html, url);
            moreUrls.forEach(newUrl => {
                if (this.isValidUrlForProductLine(newUrl) && !discoveredUrls.has(newUrl)) {
                    discoveredUrls.add(newUrl);
                    urlsToExplore.push(newUrl);
                }
            });
            
            this.visitedUrls.add(url);
            await this.delay(BASE_CONFIG.DELAY_BETWEEN_REQUESTS);
        }

        this.urlsToVisit = Array.from(discoveredUrls);
        this.log(`🎯 發現 ${this.urlsToVisit.length} 個 ${config.name} 相關頁面`, 'success');
        
        return this.urlsToVisit;
    }

    /**
     * 從HTML中提取URLs
     */
    extractUrls(html, baseUrl) {
        const $ = cheerio.load(html);
        const urls = new Set();
        
        // 提取各種連結
        $('a[href]').each((i, element) => {
            const href = $(element).attr('href');
            if (href) {
                const fullUrl = this.resolveUrl(href, baseUrl);
                if (this.isValidUrl(fullUrl)) {
                    urls.add(fullUrl);
                }
            }
        });

        return Array.from(urls);
    }

    /**
     * 解析相對URL
     */
    resolveUrl(href, baseUrl) {
        try {
            return new URL(href, baseUrl).href;
        } catch {
            return null;
        }
    }

    /**
     * 檢查是否為有效URL
     */
    isValidUrl(url) {
        if (!url || !url.startsWith(BASE_CONFIG.BASE_URL)) return false;
        
        const excludePatterns = [
            '#', 'mailto:', 'javascript:', '.pdf', '.zip', '.tar.gz',
            '/api-schema/', '/changelog/', '/historical/'
        ];

        return !excludePatterns.some(pattern => url.includes(pattern));
    }

    /**
     * 提取頁面內容
     */
    extractContent(html, url) {
        const $ = cheerio.load(html);
        
        // 移除不需要的元素
        $('nav, .nav, header, footer, .sidebar, .breadcrumb, .pagination').remove();
        $('script, style, .hidden, .advertisement').remove();
        
        // 查找主要內容
        let contentElement = $('main').first();
        if (contentElement.length === 0) {
            contentElement = $('.content, [class*="content"], article, .markdown-body').first();
        }
        if (contentElement.length === 0) {
            contentElement = $('body');
        }

        const title = $('h1').first().text().trim() || 
                     $('title').text().replace(/\s*·\s*Cloudflare.*docs.*/, '').trim() ||
                     '未知標題';

        const content = this.htmlToMarkdown(contentElement.html(), $);
        
        return {
            url,
            title,
            content: content.trim(),
            product: this.getProductFromUrl(url),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * HTML轉Markdown
     */
    htmlToMarkdown(html, $) {
        if (!html) return '';
        
        const contentElement = $('<div>').html(html);
        let markdown = '';

        const processElement = (element) => {
            const $el = $(element);
            const tagName = element.tagName?.toLowerCase();

            switch (tagName) {
                case 'h1':
                case 'h2':
                case 'h3':
                case 'h4':
                case 'h5':
                case 'h6':
                    const level = '#'.repeat(parseInt(tagName[1]));
                    markdown += `${level} ${$el.text().trim()}\n\n`;
                    break;
                    
                case 'p':
                    const pText = $el.text().trim();
                    if (pText) markdown += `${pText}\n\n`;
                    break;
                    
                case 'ul':
                case 'ol':
                    $el.find('li').each((i, li) => {
                        const prefix = tagName === 'ul' ? '-' : `${i + 1}.`;
                        const liText = $(li).text().trim();
                        if (liText) markdown += `${prefix} ${liText}\n`;
                    });
                    markdown += '\n';
                    break;
                    
                case 'pre':
                case 'code':
                    const codeText = $el.text().trim();
                    if (codeText) {
                        if (tagName === 'pre' || codeText.includes('\n')) {
                            markdown += `\`\`\`\n${codeText}\n\`\`\`\n\n`;
                        } else {
                            markdown += `\`${codeText}\``;
                        }
                    }
                    break;
                    
                case 'blockquote':
                    const quoteText = $el.text().trim();
                    if (quoteText) {
                        quoteText.split('\n').forEach(line => {
                            markdown += `> ${line.trim()}\n`;
                        });
                        markdown += '\n';
                    }
                    break;
                    
                case 'table':
                    $el.find('tr').each((i, row) => {
                        const cells = $(row).find('td, th').map((j, cell) => 
                            $(cell).text().trim()).get();
                        if (cells.length > 0) {
                            markdown += `| ${cells.join(' | ')} |\n`;
                            
                            if (i === 0 && $(row).find('th').length > 0) {
                                markdown += `| ${cells.map(() => '---').join(' | ')} |\n`;
                            }
                        }
                    });
                    markdown += '\n';
                    break;
                    
                default:
                    $el.contents().each((i, child) => {
                        if (child.nodeType === 3) { // 文字節點
                            const text = $(child).text().trim();
                            if (text) markdown += text + ' ';
                        } else if (child.nodeType === 1) { // 元素節點
                            processElement(child);
                        }
                    });
                    break;
            }
        };

        contentElement.contents().each((i, child) => {
            if (child.nodeType === 1) {
                processElement(child);
            }
        });

        return markdown.trim();
    }

    /**
     * 爬取所有內容
     */
    async crawlAllContent() {
        const config = PRODUCT_LINES[this.productLine];
        this.log(`🚀 開始爬取 ${config.name} 的所有內容...`);
        
        const urls = await this.discoverUrls();
        
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            
            try {
                await this.delay(BASE_CONFIG.DELAY_BETWEEN_REQUESTS);
                
                const html = await this.fetchPage(url);
                if (!html) {
                    this.stats.pagesSkipped++;
                    continue;
                }

                const content = this.extractContent(html, url);
                this.crawledContent.push(content);
                this.stats.pagesProcessed++;
                
                this.log(`✅ [${i + 1}/${urls.length}] ${content.title} (${content.product})`);
                
            } catch (error) {
                this.log(`處理頁面錯誤 ${url}: ${error.message}`, 'error');
                this.stats.errors++;
            }
        }

        this.log(`🎉 爬取完成！處理 ${this.stats.pagesProcessed} 頁面`, 'success');
    }

    /**
     * 生成階段輸出目錄
     */
    async createOutputStructure() {
        const config = PRODUCT_LINES[this.productLine];
        const stageDir = path.join(BASE_CONFIG.OUTPUT_ROOT, 'stages', `stage-${config.stage}-${this.productLine}`);
        
        await fs.mkdir(stageDir, { recursive: true });
        await fs.mkdir(BASE_CONFIG.OUTPUT_ROOT, { recursive: true });
        
        return stageDir;
    }

    /**
     * 生成產品文件
     */
    async generateProductFiles() {
        const config = PRODUCT_LINES[this.productLine];
        const stageDir = await this.createOutputStructure();
        
        // 按產品分組內容
        const productGroups = {};
        this.crawledContent.forEach(item => {
            if (!productGroups[item.product]) {
                productGroups[item.product] = [];
            }
            productGroups[item.product].push(item);
        });

        // 為每個產品生成markdown文件
        for (const [productKey, items] of Object.entries(productGroups)) {
            const productName = config.products[productKey] || productKey;
            let markdown = `# ${productName}\n\n`;
            
            markdown += `> 本文檔包含 ${items.length} 個頁面的內容\n`;
            markdown += `> 生成時間: ${new Date().toISOString()}\n`;
            markdown += `> 產品線: ${config.name}\n\n`;
            
            if (items.length > 1) {
                markdown += '## 📑 目錄\n\n';
                items.forEach((item, index) => {
                    markdown += `${index + 1}. [${item.title}](#${this.slugify(item.title)})\n`;
                });
                markdown += '\n---\n\n';
            }

            items.forEach((item, index) => {
                if (items.length > 1) {
                    markdown += `## ${item.title}\n\n`;
                    markdown += `**來源**: [${item.url}](${item.url})\n\n`;
                }
                
                markdown += item.content;
                markdown += '\n\n---\n\n';
            });

            const filename = `${productKey}.md`;
            const filepath = path.join(stageDir, filename);
            
            await fs.writeFile(filepath, markdown, 'utf8');
            this.log(`📄 生成文件: ${filename} (${items.length} 頁面)`, 'success');
        }

        return { stageDir, productGroups };
    }

    /**
     * 生成階段README
     */
    async generateStageReadme(stageDir, productGroups) {
        const config = PRODUCT_LINES[this.productLine];
        
        let readme = `# ${config.name}\n\n`;
        readme += `> ${config.description}\n\n`;
        readme += `**爬取時間**: ${this.stats.startTime.toISOString()}\n`;
        readme += `**完成時間**: ${new Date().toISOString()}\n`;
        readme += `**處理頁面**: ${this.stats.pagesProcessed} 頁面\n\n`;
        
        readme += '## 📊 產品統計\n\n';
        Object.entries(productGroups).forEach(([productKey, items]) => {
            const productName = config.products[productKey] || productKey;
            readme += `- **${productName}**: ${items.length} 頁面\n`;
        });
        
        readme += `\n**總計**: ${this.stats.pagesProcessed} 頁面，${Object.keys(productGroups).length} 個產品\n\n`;
        
        readme += '## 📁 文件列表\n\n';
        Object.keys(productGroups).forEach(productKey => {
            readme += `- [${productKey}.md](${productKey}.md)\n`;
        });
        
        readme += '\n## 🎯 下一階段\n\n';
        const nextStage = Object.values(PRODUCT_LINES).find(p => p.stage === config.stage + 1);
        if (nextStage) {
            readme += `建議下一個階段爬取: **${nextStage.name}**\n`;
            readme += `執行指令: \`node cloudflare-staged-crawler.js --product ${Object.keys(PRODUCT_LINES).find(k => PRODUCT_LINES[k] === nextStage)}\`\n`;
        } else {
            readme += '🎉 恭喜！這是最後一個階段。\n';
        }

        const readmePath = path.join(stageDir, 'README.md');
        await fs.writeFile(readmePath, readme, 'utf8');
        
        this.log(`📋 生成階段總覽: README.md`, 'success');
    }

    /**
     * 更新總體進度
     */
    async updateProgress() {
        const progressPath = path.join(BASE_CONFIG.OUTPUT_ROOT, '📊-progress.json');
        
        let progress = {};
        try {
            const existing = await fs.readFile(progressPath, 'utf8');
            progress = JSON.parse(existing);
        } catch {
            progress = {
                started_at: new Date().toISOString(),
                stages: {}
            };
        }

        const config = PRODUCT_LINES[this.productLine];
        progress.stages[this.productLine] = {
            status: 'completed',
            completed_at: new Date().toISOString(),
            pages_crawled: this.stats.pagesProcessed,
            pages_skipped: this.stats.pagesSkipped,
            errors: this.stats.errors,
            duration_minutes: Math.round((new Date() - this.stats.startTime) / 1000 / 60)
        };

        // 設置下一階段
        const nextStage = Object.entries(PRODUCT_LINES).find(([k, v]) => v.stage === config.stage + 1);
        if (nextStage) {
            const [nextKey] = nextStage;
            if (!progress.stages[nextKey]) {
                progress.stages[nextKey] = {
                    status: 'pending',
                    estimated_pages: PRODUCT_LINES[nextKey].estimated_pages
                };
            }
        }

        await fs.writeFile(progressPath, JSON.stringify(progress, null, 2), 'utf8');
        this.log(`📊 更新進度文件`, 'success');
    }

    /**
     * 字符串轉slug
     */
    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /**
     * 主執行函數
     */
    async run() {
        try {
            if (!this.productLine) {
                this.listProductLines();
                return;
            }

            const config = PRODUCT_LINES[this.productLine];
            if (!config) {
                this.log(`❌ 未知的產品線: ${this.productLine}`, 'error');
                this.listProductLines();
                return;
            }

            this.log(`🎯 開始爬取 ${config.name}`);
            this.log(`📁 輸出目錄: ${path.resolve(BASE_CONFIG.OUTPUT_ROOT)}`);
            
            await this.crawlAllContent();
            const { stageDir, productGroups } = await this.generateProductFiles();
            await this.generateStageReadme(stageDir, productGroups);
            await this.updateProgress();
            
            this.log(`🎉 階段完成！${config.name} 爬取成功`, 'success');
            this.log(`📁 文件位置: ${stageDir}`, 'success');
            this.log(`📊 統計: ${this.stats.pagesProcessed}頁面, ${this.stats.errors}錯誤`, 'success');
            
        } catch (error) {
            this.log(`❌ 爬取失敗: ${error.message}`, 'error');
            console.error(error.stack);
            process.exit(1);
        }
    }
}

// 命令列解析
function parseArguments() {
    const args = process.argv.slice(2);
    const options = {
        product: null,
        monitor: false,
        resume: false,
        validate: false,
        listProducts: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--product':
            case '-p':
                options.product = args[++i];
                break;
            case '--monitor':
            case '-m':
                options.monitor = true;
                break;
            case '--resume':
            case '-r':
                options.resume = true;
                break;
            case '--validate':
            case '-v':
                options.validate = true;
                break;
            case '--list-products':
            case '--list':
            case '-l':
                options.listProducts = true;
                break;
            case '--help':
            case '-h':
                console.log(`
Cloudflare 分階段文檔爬蟲

使用方法:
  node ${path.basename(__filename)} [選項]

選項:
  --product, -p <產品線>    指定要爬取的產品線
  --list-products, -l       列出所有可用的產品線
  --monitor, -m             監控模式 
  --resume, -r              恢復中斷的爬取
  --validate, -v            驗證爬取結果
  --help, -h                顯示此幫助信息

範例:
  node ${path.basename(__filename)} --list-products
  node ${path.basename(__filename)} --product developer-products
  node ${path.basename(__filename)} --product ai-products --monitor
                `);
                process.exit(0);
                break;
        }
    }

    return options;
}

// 主程序入口
if (require.main === module) {
    const options = parseArguments();
    
    if (options.listProducts) {
        const crawler = new CloudflareStagedCrawler();
        crawler.listProductLines();
    } else {
        const crawler = new CloudflareStagedCrawler(options.product, options);
        crawler.run();
    }
}

module.exports = CloudflareStagedCrawler;
