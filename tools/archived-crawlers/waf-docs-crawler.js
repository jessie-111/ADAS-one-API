#!/usr/bin/env node

/**
 * Cloudflare WAF 文檔爬蟲程序
 * 獨立運行的爬蟲，用於抓取 https://developers.cloudflare.com/waf/ 下的所有文檔
 * 並按分類生成 markdown 文件供 RAG 系統使用
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const { URL } = require('url');

// 配置項
const CONFIG = {
    BASE_URL: 'https://developers.cloudflare.com',
    START_URL: 'https://developers.cloudflare.com/waf/',
    OUTPUT_DIR: './waf-docs',
    DELAY_BETWEEN_REQUESTS: 1000, // 1秒延遲避免過於頻繁的請求
    MAX_RETRIES: 3,
    REQUEST_TIMEOUT: 30000,
    USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// 分類映射 - 將 URL 路徑映射到對應的分類
const CATEGORY_MAPPING = {
    'overview': 'overview',
    'get-started': 'get-started', 
    'concepts': 'concepts',
    'traffic-detections': 'traffic-detections',
    'custom-rules': 'custom-rules',
    'rate-limiting-rules': 'rate-limiting-rules',
    'managed-rules': 'managed-rules',
    'additional-tools': 'additional-tools',
    'account-level-configuration': 'account-level-configuration',
    'analytics': 'analytics',
    'reference': 'reference',
    'troubleshooting': 'troubleshooting',
    'glossary': 'glossary',
    'changelog': 'changelog'
};

class WAFDocsCrawler {
    constructor() {
        this.visitedUrls = new Set();
        this.urlsToVisit = [];
        this.categorizedContent = {};
        this.axiosInstance = axios.create({
            timeout: CONFIG.REQUEST_TIMEOUT,
            headers: {
                'User-Agent': CONFIG.USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        
        // 初始化分類內容結構
        Object.keys(CATEGORY_MAPPING).forEach(category => {
            this.categorizedContent[category] = {
                title: this.formatCategoryTitle(category),
                content: []
            };
        });
    }

    /**
     * 格式化分類標題
     */
    formatCategoryTitle(category) {
        return category
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * 延遲函數
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 日誌輸出
     */
    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    /**
     * 獲取頁面內容（帶重試機制）
     */
    async fetchPage(url, retryCount = 0) {
        try {
            this.log(`正在獲取頁面: ${url}`);
            
            const response = await this.axiosInstance.get(url);
            
            if (response.status === 200) {
                this.log(`成功獲取頁面: ${url}`, 'success');
                return response.data;
            } else {
                throw new Error(`HTTP Status: ${response.status}`);
            }
        } catch (error) {
            if (retryCount < CONFIG.MAX_RETRIES) {
                this.log(`重試獲取頁面 (${retryCount + 1}/${CONFIG.MAX_RETRIES}): ${url}`);
                await this.delay(CONFIG.DELAY_BETWEEN_REQUESTS * (retryCount + 1));
                return this.fetchPage(url, retryCount + 1);
            } else {
                this.log(`無法獲取頁面: ${url} - ${error.message}`, 'error');
                return null;
            }
        }
    }

    /**
     * 解析頁面並收集 WAF 相關的 URL
     */
    async discoverUrls(startUrl) {
        const html = await this.fetchPage(startUrl);
        if (!html) return;

        const $ = cheerio.load(html);
        const urls = new Set();
        
        // 收集導航中的 WAF 相關連結
        $('nav a, .nav a, [class*="nav"] a').each((i, element) => {
            const href = $(element).attr('href');
            if (href && href.includes('/waf/')) {
                const fullUrl = this.resolveUrl(href, startUrl);
                if (this.isValidWafUrl(fullUrl)) {
                    urls.add(fullUrl);
                }
            }
        });

        // 收集文檔內容中的內部連結
        $('main a, .content a, [class*="content"] a, article a').each((i, element) => {
            const href = $(element).attr('href');
            if (href && href.includes('/waf/')) {
                const fullUrl = this.resolveUrl(href, startUrl);
                if (this.isValidWafUrl(fullUrl)) {
                    urls.add(fullUrl);
                }
            }
        });

        // 特別處理側邊欄導航
        $('.sidebar a, [class*="sidebar"] a, [class*="menu"] a').each((i, element) => {
            const href = $(element).attr('href');
            if (href && href.includes('/waf/')) {
                const fullUrl = this.resolveUrl(href, startUrl);
                if (this.isValidWafUrl(fullUrl)) {
                    urls.add(fullUrl);
                }
            }
        });

        this.log(`從 ${startUrl} 發現 ${urls.size} 個 WAF 相關 URL`, 'success');
        return Array.from(urls);
    }

    /**
     * 解析相對 URL 為絕對 URL
     */
    resolveUrl(href, baseUrl) {
        try {
            return new URL(href, baseUrl).href;
        } catch {
            return null;
        }
    }

    /**
     * 檢查是否為有效的 WAF URL
     */
    isValidWafUrl(url) {
        if (!url || !url.startsWith(CONFIG.BASE_URL + '/waf/')) return false;
        
        // 排除不需要的 URL
        const excludePatterns = [
            '#', // 錨點連結
            'mailto:', // 郵件連結
            'javascript:', // JavaScript 連結
            '.pdf', '.zip', '.tar.gz', // 文件下載
            '/api/', // API 文檔可能需要特殊處理
        ];

        return !excludePatterns.some(pattern => url.includes(pattern));
    }

    /**
     * 從 URL 判斷分類
     */
    getCategoryFromUrl(url) {
        const urlPath = new URL(url).pathname;
        const pathSegments = urlPath.split('/').filter(segment => segment);
        
        // 移除 'waf' 前綴
        if (pathSegments[0] === 'waf') {
            pathSegments.shift();
        }

        if (pathSegments.length === 0) {
            return 'overview';
        }

        const mainCategory = pathSegments[0];
        return CATEGORY_MAPPING[mainCategory] || 'reference';
    }

    /**
     * 提取頁面內容
     */
    extractContent(html, url) {
        const $ = cheerio.load(html);
        
        // 移除不需要的元素
        $('nav, .nav, header, footer, .sidebar, .breadcrumb, .pagination').remove();
        $('script, style, .hidden').remove();
        
        // 查找主要內容區域
        let contentElement = $('main').first();
        if (contentElement.length === 0) {
            contentElement = $('.content, [class*="content"], article').first();
        }
        if (contentElement.length === 0) {
            contentElement = $('body');
        }

        const title = $('h1').first().text().trim() || 
                     $('title').text().replace(' · Cloudflare Web Application Firewall docs', '').trim() ||
                     '未知標題';

        // 提取內容並轉換為 markdown
        let content = this.htmlToMarkdown(contentElement.html(), $);
        
        return {
            url,
            title,
            content: content.trim(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 將 HTML 轉換為 Markdown
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
                    markdown += `${$el.text().trim()}\n\n`;
                    break;
                    
                case 'ul':
                case 'ol':
                    $el.find('li').each((i, li) => {
                        const prefix = tagName === 'ul' ? '-' : `${i + 1}.`;
                        markdown += `${prefix} ${$(li).text().trim()}\n`;
                    });
                    markdown += '\n';
                    break;
                    
                case 'pre':
                case 'code':
                    const codeText = $el.text().trim();
                    if (tagName === 'pre' || codeText.includes('\n')) {
                        markdown += `\`\`\`\n${codeText}\n\`\`\`\n\n`;
                    } else {
                        markdown += `\`${codeText}\``;
                    }
                    break;
                    
                case 'blockquote':
                    const quoteLines = $el.text().trim().split('\n');
                    quoteLines.forEach(line => {
                        markdown += `> ${line.trim()}\n`;
                    });
                    markdown += '\n';
                    break;
                    
                case 'table':
                    // 簡單的表格處理
                    $el.find('tr').each((i, row) => {
                        const cells = $(row).find('td, th').map((j, cell) => 
                            $(cell).text().trim()).get();
                        markdown += `| ${cells.join(' | ')} |\n`;
                        
                        if (i === 0 && $(row).find('th').length > 0) {
                            markdown += `| ${cells.map(() => '---').join(' | ')} |\n`;
                        }
                    });
                    markdown += '\n';
                    break;
                    
                default:
                    // 對於其他元素，遞歸處理子元素
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

        return markdown;
    }

    /**
     * 收集所有 URL
     */
    async collectAllUrls() {
        this.log('開始收集 WAF 文檔的所有 URL...');
        
        const initialUrls = await this.discoverUrls(CONFIG.START_URL);
        this.urlsToVisit = [...(initialUrls || [])];
        
        // 遞歸發現更多 URL
        const discoveredUrls = new Set(this.urlsToVisit);
        
        for (const url of this.urlsToVisit) {
            if (this.visitedUrls.has(url)) continue;
            
            await this.delay(CONFIG.DELAY_BETWEEN_REQUESTS);
            const moreUrls = await this.discoverUrls(url);
            
            if (moreUrls) {
                moreUrls.forEach(newUrl => {
                    if (!discoveredUrls.has(newUrl)) {
                        discoveredUrls.add(newUrl);
                        this.urlsToVisit.push(newUrl);
                    }
                });
            }
            
            this.visitedUrls.add(url);
        }

        this.log(`總共發現 ${this.urlsToVisit.length} 個 WAF 文檔頁面`, 'success');
        return this.urlsToVisit;
    }

    /**
     * 爬取所有內容
     */
    async crawlAllContent() {
        this.log('開始爬取所有 WAF 文檔內容...');
        
        const urls = await this.collectAllUrls();
        let processedCount = 0;
        
        for (const url of urls) {
            try {
                await this.delay(CONFIG.DELAY_BETWEEN_REQUESTS);
                
                const html = await this.fetchPage(url);
                if (!html) continue;

                const content = this.extractContent(html, url);
                const category = this.getCategoryFromUrl(url);
                
                this.categorizedContent[category].content.push(content);
                processedCount++;
                
                this.log(`已處理 ${processedCount}/${urls.length}: ${content.title} (${category})`);
                
            } catch (error) {
                this.log(`處理頁面時發生錯誤 ${url}: ${error.message}`, 'error');
            }
        }

        this.log(`成功爬取 ${processedCount} 個頁面的內容`, 'success');
    }

    /**
     * 生成 Markdown 文件
     */
    async generateMarkdownFiles() {
        this.log('開始生成 Markdown 文件...');
        
        // 確保輸出目錄存在
        await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });

        for (const [category, data] of Object.entries(this.categorizedContent)) {
            if (data.content.length === 0) continue;
            
            let markdown = `# ${data.title}\n\n`;
            markdown += `> 本文檔包含 ${data.content.length} 個頁面的內容\n`;
            markdown += `> 生成時間: ${new Date().toISOString()}\n\n`;
            
            // 生成目錄
            if (data.content.length > 1) {
                markdown += '## 目錄\n\n';
                data.content.forEach((item, index) => {
                    markdown += `${index + 1}. [${item.title}](#${this.slugify(item.title)})\n`;
                });
                markdown += '\n---\n\n';
            }

            // 添加每個頁面的內容
            data.content.forEach((item, index) => {
                if (data.content.length > 1) {
                    markdown += `## ${item.title}\n\n`;
                    markdown += `**來源**: [${item.url}](${item.url})\n\n`;
                }
                
                markdown += item.content;
                markdown += '\n\n---\n\n';
            });

            const filename = `${category}.md`;
            const filepath = path.join(CONFIG.OUTPUT_DIR, filename);
            
            await fs.writeFile(filepath, markdown, 'utf8');
            this.log(`生成文件: ${filename} (${data.content.length} 個頁面)`, 'success');
        }
    }

    /**
     * 將標題轉換為 slug
     */
    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    /**
     * 生成總覽文件
     */
    async generateOverviewFile() {
        let overview = '# Cloudflare WAF 文檔總覽\n\n';
        overview += `> 爬取時間: ${new Date().toISOString()}\n`;
        overview += `> 來源: ${CONFIG.START_URL}\n\n`;
        
        overview += '## 文檔分類\n\n';
        
        const stats = [];
        for (const [category, data] of Object.entries(this.categorizedContent)) {
            if (data.content.length > 0) {
                overview += `- [${data.title}](${category}.md) - ${data.content.length} 個頁面\n`;
                stats.push({ category: data.title, count: data.content.length });
            }
        }
        
        const totalPages = stats.reduce((sum, item) => sum + item.count, 0);
        overview += `\n**總計**: ${totalPages} 個頁面，${stats.length} 個分類\n\n`;
        
        overview += '## 使用說明\n\n';
        overview += '這些文檔是從 Cloudflare WAF 官方文檔自動爬取並轉換的，適合用於 RAG 系統。每個分類文件包含該分類下所有相關頁面的內容。\n\n';
        overview += '### 文件結構\n\n';
        overview += '```\n';
        overview += 'waf-docs/\n';
        overview += '├── README.md          # 本文檔\n';
        stats.forEach(item => {
            overview += `├── ${this.slugify(item.category)}.md\n`;
        });
        overview += '```\n\n';
        
        const readmePath = path.join(CONFIG.OUTPUT_DIR, 'README.md');
        await fs.writeFile(readmePath, overview, 'utf8');
        
        this.log('生成總覽文件: README.md', 'success');
    }

    /**
     * 主要執行函數
     */
    async run() {
        try {
            this.log('=== Cloudflare WAF 文檔爬蟲開始執行 ===');
            this.log(`輸出目錄: ${path.resolve(CONFIG.OUTPUT_DIR)}`);
            
            await this.crawlAllContent();
            await this.generateMarkdownFiles();
            await this.generateOverviewFile();
            
            this.log('=== 爬蟲執行完成！===', 'success');
            this.log(`文件已保存到: ${path.resolve(CONFIG.OUTPUT_DIR)}`, 'success');
            
        } catch (error) {
            this.log(`爬蟲執行失敗: ${error.message}`, 'error');
            process.exit(1);
        }
    }
}

// 如果是直接執行此腳本
if (require.main === module) {
    const crawler = new WAFDocsCrawler();
    crawler.run();
}

module.exports = WAFDocsCrawler;
