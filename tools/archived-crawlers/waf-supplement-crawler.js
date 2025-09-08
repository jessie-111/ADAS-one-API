#!/usr/bin/env node

/**
 * WAF 文檔補充爬蟲
 * 用於補充遺漏的 WAF 頁面到現有的 waf-docs 目錄
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
    BASE_URL: 'https://developers.cloudflare.com',
    DOCS_DIR: './waf-docs',
    DELAY_BETWEEN_REQUESTS: 1000,
    MAX_RETRIES: 3,
    REQUEST_TIMEOUT: 30000,
    USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// 需要掃描的基礎路徑
const SCAN_PATHS = [
    'https://developers.cloudflare.com/waf/detections/'
];

// 已知遺漏的 URL 列表（從掃描中會自動發現更多）
const KNOWN_MISSING_URLS = [
    'https://developers.cloudflare.com/waf/detections/',
    'https://developers.cloudflare.com/waf/detections/leaked-credentials/',
    'https://developers.cloudflare.com/waf/detections/malicious-uploads/',
    // 可能還有更多子頁面
];

class WAFSupplementCrawler {
    constructor() {
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
        
        this.discoveredUrls = new Set(KNOWN_MISSING_URLS);
        this.visitedUrls = new Set();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warn' ? '⚠️' : 'ℹ️';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

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
                this.log(`重試獲取頁面 (${retryCount + 1}/${CONFIG.MAX_RETRIES}): ${url}`, 'warn');
                await this.delay(CONFIG.DELAY_BETWEEN_REQUESTS * (retryCount + 1));
                return this.fetchPage(url, retryCount + 1);
            } else {
                this.log(`無法獲取頁面: ${url} - ${error.message}`, 'error');
                return null;
            }
        }
    }

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
                    const headerText = $el.text().trim();
                    if (headerText) markdown += `${level} ${headerText}\n\n`;
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
                            if (line.trim()) markdown += `> ${line.trim()}\n`;
                        });
                        markdown += '\n';
                    }
                    break;
                    
                case 'table':
                    // 簡單的表格處理
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

        return markdown.trim();
    }

    getCategoryFromUrl(url) {
        const urlPath = new URL(url).pathname;
        const pathSegments = urlPath.split('/').filter(segment => segment);
        
        // 移除 'waf' 前綴
        if (pathSegments[0] === 'waf') {
            pathSegments.shift();
        }

        // 根據路徑判斷分類
        if (pathSegments.includes('detections')) {
            return 'traffic-detections';
        } else if (pathSegments.includes('custom-rules')) {
            return 'custom-rules';
        } else if (pathSegments.includes('managed-rules')) {
            return 'managed-rules';
        } else if (pathSegments.includes('rate-limiting')) {
            return 'rate-limiting-rules';
        } else {
            return 'reference';
        }
    }

    /**
     * 檢查是否為 WAF detections 相關的 URL
     */
    isDetectionUrl(url) {
        if (!url || !url.startsWith(CONFIG.BASE_URL + '/waf/detections/')) {
            return false;
        }

        // 排除不需要的 URL
        const excludePatterns = [
            '#', 'mailto:', 'javascript:', '.pdf', '.zip', '.tar.gz',
            '/api-schema/', '/changelog/', '/historical/',
            'github.com', 'twitter.com', 'discord.com'
        ];

        return !excludePatterns.some(pattern => url.includes(pattern));
    }

    /**
     * 從頁面中提取相關的 URLs
     */
    extractDetectionUrls(html, baseUrl) {
        const $ = cheerio.load(html);
        const urls = new Set();
        
        // 提取導航中的連結
        $('nav a, .nav a, [class*="nav"] a').each((i, element) => {
            const href = $(element).attr('href');
            if (href) {
                const fullUrl = this.resolveUrl(href, baseUrl);
                if (this.isDetectionUrl(fullUrl)) {
                    urls.add(fullUrl);
                }
            }
        });

        // 提取內容中的連結
        $('main a, .content a, [class*="content"] a, article a').each((i, element) => {
            const href = $(element).attr('href');
            if (href) {
                const fullUrl = this.resolveUrl(href, baseUrl);
                if (this.isDetectionUrl(fullUrl)) {
                    urls.add(fullUrl);
                }
            }
        });

        // 提取側邊欄中的連結  
        $('.sidebar a, [class*="sidebar"] a, [class*="menu"] a').each((i, element) => {
            const href = $(element).attr('href');
            if (href) {
                const fullUrl = this.resolveUrl(href, baseUrl);
                if (this.isDetectionUrl(fullUrl)) {
                    urls.add(fullUrl);
                }
            }
        });

        return Array.from(urls);
    }

    /**
     * 解析相對 URL
     */
    resolveUrl(href, baseUrl) {
        try {
            return new URL(href, baseUrl).href;
        } catch {
            return null;
        }
    }

    /**
     * 遞歸發現 detections 路徑下的所有頁面
     */
    async discoverDetectionPages() {
        this.log(`🔍 開始掃描 /waf/detections/ 路徑下的所有頁面...`);
        
        const toExplore = [...SCAN_PATHS];
        
        while (toExplore.length > 0) {
            const currentUrl = toExplore.shift();
            
            if (this.visitedUrls.has(currentUrl)) {
                continue;
            }
            
            this.visitedUrls.add(currentUrl);
            
            try {
                await this.delay(CONFIG.DELAY_BETWEEN_REQUESTS);
                
                const html = await this.fetchPage(currentUrl);
                if (!html) continue;
                
                const foundUrls = this.extractDetectionUrls(html, currentUrl);
                
                for (const url of foundUrls) {
                    if (!this.discoveredUrls.has(url) && !this.visitedUrls.has(url)) {
                        this.discoveredUrls.add(url);
                        toExplore.push(url);
                        this.log(`🆕 發現新頁面: ${url}`);
                    }
                }
                
            } catch (error) {
                this.log(`掃描頁面錯誤 ${currentUrl}: ${error.message}`, 'warn');
            }
        }
        
        const totalDiscovered = this.discoveredUrls.size;
        this.log(`✅ 發現完成！總共找到 ${totalDiscovered} 個 detections 相關頁面`, 'success');
        
        // 顯示所有發現的頁面
        this.log(`📋 發現的頁面列表:`);
        Array.from(this.discoveredUrls).forEach((url, index) => {
            this.log(`  ${index + 1}. ${url}`);
        });
        
        return Array.from(this.discoveredUrls);
    }

    async crawlMissingPages() {
        // 首先發現所有相關頁面
        const allUrls = await this.discoverDetectionPages();
        
        // 過濾出還沒有在現有文檔中的頁面
        const missingUrls = await this.filterMissingPages(allUrls);
        
        this.log(`🔍 開始補充 ${missingUrls.length} 個遺漏的 WAF detections 頁面...`);
        
        const crawledContent = [];
        
        for (let i = 0; i < missingUrls.length; i++) {
            const url = missingUrls[i];
            
            try {
                await this.delay(CONFIG.DELAY_BETWEEN_REQUESTS);
                
                const html = await this.fetchPage(url);
                if (!html) continue;

                const content = this.extractContent(html, url);
                const category = this.getCategoryFromUrl(url);
                
                crawledContent.push({
                    ...content,
                    category
                });
                
                this.log(`✅ [${i + 1}/${missingUrls.length}] ${content.title} (${category})`, 'success');
                
            } catch (error) {
                this.log(`處理頁面錯誤 ${url}: ${error.message}`, 'error');
            }
        }

        return crawledContent;
    }

    /**
     * 過濾出遺漏的頁面（檢查現有文檔中是否已存在）
     */
    async filterMissingPages(allUrls) {
        const categoryFile = path.join(CONFIG.DOCS_DIR, 'traffic-detections.md');
        let existingContent = '';
        
        try {
            existingContent = await fs.readFile(categoryFile, 'utf8');
        } catch {
            // 文件不存在，所有 URLs 都是新的
            return allUrls;
        }
        
        const missingUrls = [];
        
        for (const url of allUrls) {
            // 檢查 URL 是否已在現有內容中
            if (!existingContent.includes(url)) {
                missingUrls.push(url);
            } else {
                this.log(`📋 已存在: ${url}`, 'info');
            }
        }
        
        return missingUrls;
    }

    async addToExistingCategory(contents) {
        // 支援單個內容或內容數組
        const contentArray = Array.isArray(contents) ? contents : [contents];
        
        if (contentArray.length === 0) return;
        
        // 假設所有內容都屬於同一分類（traffic-detections）
        const category = contentArray[0].category;
        const categoryFile = path.join(CONFIG.DOCS_DIR, `${category}.md`);
        
        try {
            // 檢查分類文件是否存在
            const stats = await fs.stat(categoryFile);
            
            if (stats.isFile()) {
                // 文件存在，追加內容
                this.log(`📝 追加 ${contentArray.length} 個頁面到現有分類文件: ${category}.md`);
                
                let existingContent = await fs.readFile(categoryFile, 'utf8');
                
                // 更新標題中的頁面數量
                const currentCount = (existingContent.match(/\*\*來源\*\*:/g) || []).length;
                const newTotal = currentCount + contentArray.length;
                existingContent = existingContent.replace(
                    /本文檔包含 \d+ 個頁面的內容/,
                    `本文檔包含 ${newTotal} 個頁面的內容`
                );
                
                // 為每個新內容添加內容
                for (const content of contentArray) {
                    let newContent = `\n\n---\n\n## ${content.title}\n\n`;
                    newContent += `**來源**: [${content.url}](${content.url})\n\n`;
                    newContent += content.content;
                    existingContent += newContent;
                }
                
                await fs.writeFile(categoryFile, existingContent, 'utf8');
                
                this.log(`✅ 成功追加 ${contentArray.length} 個頁面到 ${category}.md`, 'success');
            } else {
                throw new Error('不是文件');
            }
        } catch (error) {
            // 文件不存在，創建新文件
            this.log(`📄 創建新分類文件: ${category}.md`);
            
            let markdown = `# ${this.formatCategoryTitle(category)}\n\n`;
            markdown += `> 本文檔包含 ${contentArray.length} 個頁面的內容\n`;
            markdown += `> 生成時間: ${new Date().toISOString()}\n`;
            markdown += `> WAF detections 完整掃描補充\n\n`;
            
            // 如果有多個頁面，生成目錄
            if (contentArray.length > 1) {
                markdown += '## 📑 目錄\n\n';
                contentArray.forEach((item, index) => {
                    markdown += `${index + 1}. [${item.title}](#${this.slugify(item.title)})\n`;
                });
                markdown += '\n---\n\n';
            }
            
            // 添加每個頁面的內容
            contentArray.forEach((content, index) => {
                if (contentArray.length > 1) {
                    markdown += `## ${content.title}\n\n`;
                    markdown += `**來源**: [${content.url}](${content.url})\n\n`;
                }
                
                markdown += content.content;
                if (index < contentArray.length - 1) {
                    markdown += '\n\n---\n\n';
                }
            });
            
            await fs.writeFile(categoryFile, markdown, 'utf8');
            this.log(`✅ 成功創建 ${category}.md 包含 ${contentArray.length} 個頁面`, 'success');
        }
    }

    /**
     * 將標題轉為 slug
     */
    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    formatCategoryTitle(category) {
        return category
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    async updateReadme() {
        const readmePath = path.join(CONFIG.DOCS_DIR, 'README.md');
        
        try {
            let readme = await fs.readFile(readmePath, 'utf8');
            
            // 查找並更新統計信息
            const files = await fs.readdir(CONFIG.DOCS_DIR);
            const mdFiles = files.filter(file => file.endsWith('.md') && file !== 'README.md');
            
            // 重新計算頁面總數（這是一個簡化的方法）
            let totalPages = 0;
            for (const file of mdFiles) {
                const content = await fs.readFile(path.join(CONFIG.DOCS_DIR, file), 'utf8');
                // 簡單計算：每個 "來源:" 表示一個頁面
                const pageMatches = content.match(/\*\*來源\*\*:/g);
                if (pageMatches) {
                    totalPages += pageMatches.length;
                } else {
                    totalPages += 1; // 如果沒有多個來源，假設是一個頁面
                }
            }
            
            // 更新統計信息
            readme = readme.replace(
                /\*\*總計\*\*: \d+ 個頁面，\d+ 個分類/,
                `**總計**: ${totalPages} 個頁面，${mdFiles.length} 個分類`
            );
            
            // 檢查是否需要添加新分類到列表
            if (!readme.includes('Traffic Detections')) {
                // 在適當位置添加 Traffic Detections
                readme = readme.replace(
                    /- \[Custom Rules\]/,
                    `- [Traffic Detections](traffic-detections.md) - 1 個頁面\n- [Custom Rules]`
                );
            }
            
            await fs.writeFile(readmePath, readme, 'utf8');
            this.log(`📋 更新 README.md 統計信息`, 'success');
            
        } catch (error) {
            this.log(`更新 README.md 失敗: ${error.message}`, 'warn');
        }
    }

    async run() {
        try {
            this.log('🚀 開始 WAF 文檔補充作業...');
            
            // 檢查目標目錄是否存在
            try {
                await fs.access(CONFIG.DOCS_DIR);
            } catch {
                this.log(`❌ 目標目錄不存在: ${CONFIG.DOCS_DIR}`, 'error');
                this.log('請先執行主要的 WAF 爬蟲程序', 'error');
                process.exit(1);
            }
            
            // 爬取遺漏的頁面
            const crawledContent = await this.crawlMissingPages();
            
            if (crawledContent.length === 0) {
                this.log('❌ 沒有成功爬取任何頁面', 'error');
                process.exit(1);
            }
            
            // 將所有內容一次性添加到分類文件（更高效）
            if (crawledContent.length > 0) {
                await this.addToExistingCategory(crawledContent);
            }
            
            // 更新 README
            await this.updateReadme();
            
            this.log(`🎉 補充作業完成！成功添加 ${crawledContent.length} 個頁面`, 'success');
            this.log(`📁 文件位置: ${path.resolve(CONFIG.DOCS_DIR)}`, 'success');
            
        } catch (error) {
            this.log(`❌ 補充作業失敗: ${error.message}`, 'error');
            console.error(error.stack);
            process.exit(1);
        }
    }
}

// 如果是直接執行此腳本
if (require.main === module) {
    const crawler = new WAFSupplementCrawler();
    crawler.run();
}

module.exports = WAFSupplementCrawler;
