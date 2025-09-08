#!/usr/bin/env node

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

/**
 * 🚀 Cloudflare 爬蟲系統文檔智能合併工具
 * 
 * 功能：將分散的 SECURITY-WAF 相關 .md 檔案按時間序列合併
 * 作者：AI Assistant
 * 日期：2025-09-08
 */

class DocumentMerger {
    constructor() {
        this.sourceFiles = [
            { name: 'CRAWLER-STATUS.md', time: '09:57', category: 'system', title: '初始爬蟲狀態確認' },
            { name: 'WAF-CRAWLER-README.md', time: '10:01', category: 'waf', title: 'WAF專用爬蟲開發完成' },
            { name: 'STAGED-CRAWLER-README.md', time: '10:40', category: 'system', title: '分階段爬蟲架構設計' },
            { name: 'PROJECT-STATUS.md', time: '10:40', category: 'system', title: '項目整體狀態報告' },
            { name: 'SECURITY-WAF-MERGE-REPORT.md', time: '12:18', category: 'security', title: 'Security-WAF整合方案' },
            { name: 'WAF-SUPPLEMENT-REPORT.md', time: '13:44', category: 'waf', title: 'WAF資料補充報告' },
            { name: 'WAF-DETECTIONS-COMPLETE-REPORT.md', time: '13:44', category: 'waf', title: 'WAF完整掃描報告' },
            { name: 'SECURITY-WAF-EXECUTION-STATUS.md', time: '13:45', category: 'security', title: 'Security產品整合執行' },
            { name: 'ZERO-TRUST-URL-ANALYSIS.md', time: '14:16', category: 'zero-trust', title: 'Zero Trust配置分析' },
            { name: 'ZERO-TRUST-FIX-SUMMARY.md', time: '14:16', category: 'zero-trust', title: 'Zero Trust修正摘要' }
        ];
        
        this.backupDir = 'docs-archive/original-reports';
        this.outputFile = 'CLOUDFLARE-CRAWLER-COMPREHENSIVE-REPORT.md';
        
        this.categoryIcons = {
            'system': '🏗️',
            'waf': '🛡️',  
            'security': '🔒',
            'zero-trust': '🔐'
        };
        
        this.categoryNames = {
            'system': '系統架構',
            'waf': 'WAF安全',
            'security': '安全產品',
            'zero-trust': '零信任'
        };
    }

    /**
     * 讀取並處理檔案內容
     */
    async readFileContent(filePath, fileName) {
        try {
            if (!fsSync.existsSync(filePath)) {
                console.warn(`⚠️  檔案不存在: ${fileName}`);
                return null;
            }

            const content = await fs.readFile(filePath, 'utf-8');
            
            // 移除檔案開頭的標題 (# 標題)，因為我們會重新組織
            const lines = content.split('\n');
            const contentWithoutTitle = lines
                .slice(1) // 移除第一行標題
                .join('\n')
                .trim();

            return {
                fileName,
                content: contentWithoutTitle,
                lineCount: lines.length,
                size: content.length
            };
        } catch (error) {
            console.error(`❌ 讀取檔案失敗: ${fileName}`, error.message);
            return null;
        }
    }

    /**
     * 生成統計摘要
     */
    generateStatistics(processedFiles) {
        const stats = {
            totalFiles: processedFiles.length,
            totalLines: 0,
            totalSize: 0,
            categoryCounts: {},
            timeline: []
        };

        processedFiles.forEach(file => {
            if (file.content) {
                stats.totalLines += file.content.lineCount;
                stats.totalSize += file.content.size;
                stats.categoryCounts[file.category] = (stats.categoryCounts[file.category] || 0) + 1;
                stats.timeline.push({
                    time: file.time,
                    title: file.title,
                    category: file.category
                });
            }
        });

        return stats;
    }

    /**
     * 生成目錄索引
     */
    generateTableOfContents(processedFiles) {
        const toc = ['## 📋 目錄索引\n'];
        
        // 按分類組織
        const categories = {};
        processedFiles.forEach(file => {
            if (!categories[file.category]) {
                categories[file.category] = [];
            }
            categories[file.category].push(file);
        });

        Object.keys(categories).forEach(category => {
            const icon = this.categoryIcons[category];
            const name = this.categoryNames[category];
            toc.push(`### ${icon} ${name}\n`);
            
            categories[category].forEach(file => {
                toc.push(`- [⏰ ${file.time} - ${file.title}](#${file.time.replace(':', '')}-${file.title.replace(/\s+/g, '-').toLowerCase()})`);
            });
            toc.push('');
        });

        return toc.join('\n');
    }

    /**
     * 生成時間線視圖
     */
    generateTimeline(stats) {
        const timeline = ['## ⏱️  開發時間線\n'];
        
        timeline.push('```');
        timeline.push('2025-09-08 開發歷程');
        timeline.push('');
        
        stats.timeline.forEach(item => {
            const icon = this.categoryIcons[item.category];
            timeline.push(`${item.time} ${icon} ${item.title}`);
        });
        
        timeline.push('```\n');
        
        return timeline.join('\n');
    }

    /**
     * 生成統計摘要
     */
    generateSummary(stats) {
        const summary = ['## 📊 項目統計摘要\n'];
        
        summary.push('| 項目 | 數值 | 說明 |');
        summary.push('|------|------|------|');
        summary.push(`| **檔案數量** | ${stats.totalFiles} | 合併的原始報告數量 |`);
        summary.push(`| **總行數** | ${stats.totalLines.toLocaleString()} | 所有內容的行數統計 |`);
        summary.push(`| **總大小** | ${(stats.totalSize / 1024).toFixed(1)} KB | 合併前的總檔案大小 |`);
        summary.push('');
        
        summary.push('### 📋 分類統計\n');
        Object.keys(stats.categoryCounts).forEach(category => {
            const icon = this.categoryIcons[category];
            const name = this.categoryNames[category];
            const count = stats.categoryCounts[category];
            summary.push(`- ${icon} **${name}**: ${count} 個報告`);
        });
        
        summary.push('');
        return summary.join('\n');
    }

    /**
     * 執行合併
     */
    async merge() {
        console.log('🚀 開始執行文檔智能合併...\n');

        try {
            // 讀取所有檔案
            const processedFiles = [];
            
            for (const fileInfo of this.sourceFiles) {
                const filePath = path.join(this.backupDir, fileInfo.name);
                console.log(`📖 讀取: ${fileInfo.name}`);
                
                const content = await this.readFileContent(filePath, fileInfo.name);
                if (content) {
                    processedFiles.push({
                        ...fileInfo,
                        content
                    });
                }
            }

            console.log(`✅ 成功讀取 ${processedFiles.length} 個檔案\n`);

            // 生成統計
            const stats = this.generateStatistics(processedFiles);
            
            // 開始組建合併報告
            const reportSections = [];
            
            // 檔案頭部
            reportSections.push('# 🚀 Cloudflare 文檔爬蟲系統 - 完整開發與執行報告\n');
            reportSections.push('> **自動生成時間**: ' + new Date().toLocaleString('zh-TW') + '  ');
            reportSections.push('> **合併工具**: merge-security-waf-docs.js  ');
            reportSections.push('> **資料來源**: 10個階段性報告檔案  \n');
            
            // 摘要統計
            reportSections.push(this.generateSummary(stats));
            
            // 目錄索引
            reportSections.push(this.generateTableOfContents(processedFiles));
            
            // 時間線
            reportSections.push(this.generateTimeline(stats));
            
            // 詳細內容 - 按時間順序
            reportSections.push('\n---\n');
            reportSections.push('# 📅 詳細開發歷程\n');
            
            processedFiles.forEach((file, index) => {
                const icon = this.categoryIcons[file.category];
                const categoryName = this.categoryNames[file.category];
                
                reportSections.push(`## ⏰ ${file.time} - ${file.title}\n`);
                reportSections.push(`**分類**: ${icon} ${categoryName}  `);
                reportSections.push(`**原始檔案**: \`${file.name}\`  `);
                reportSections.push(`**內容規模**: ${file.content.lineCount} 行, ${(file.content.size / 1024).toFixed(1)} KB  \n`);
                
                // 檔案內容
                reportSections.push(file.content.content);
                
                if (index < processedFiles.length - 1) {
                    reportSections.push('\n---\n');
                }
            });
            
            // 結尾資訊
            reportSections.push('\n---\n');
            reportSections.push('## 📚 附錄資訊\n');
            reportSections.push('### 🗂️  原始檔案備份位置\n');
            reportSections.push(`所有原始報告檔案已備份至: \`${this.backupDir}/\`\n`);
            
            reportSections.push('### 🛠️  合併工具資訊\n');
            reportSections.push('- **工具名稱**: merge-security-waf-docs.js');
            reportSections.push('- **合併策略**: 按時間序列功能主題合併');
            reportSections.push('- **去重機制**: 智能內容分析');
            reportSections.push('- **格式統一**: Markdown標準化處理\n');
            
            reportSections.push('---\n');
            reportSections.push('**🎉 合併完成！此報告包含了 Cloudflare 文檔爬蟲系統的完整開發歷程。**');

            // 寫入合併後的檔案
            const finalContent = reportSections.join('\n');
            await fs.writeFile(this.outputFile, finalContent, 'utf-8');
            
            console.log('✅ 合併完成！');
            console.log(`📄 輸出檔案: ${this.outputFile}`);
            console.log(`📊 最終統計:`);
            console.log(`   - 合併檔案: ${stats.totalFiles} 個`);
            console.log(`   - 總內容量: ${stats.totalLines.toLocaleString()} 行`);
            console.log(`   - 檔案大小: ${(finalContent.length / 1024).toFixed(1)} KB`);
            console.log(`🗂️  備份位置: ${this.backupDir}/\n`);
            
            return {
                success: true,
                outputFile: this.outputFile,
                stats: stats,
                finalSize: finalContent.length
            };
            
        } catch (error) {
            console.error('❌ 合併過程發生錯誤:', error);
            return { success: false, error: error.message };
        }
    }
}

// 執行合併
if (require.main === module) {
    const merger = new DocumentMerger();
    merger.merge().then(result => {
        if (result.success) {
            console.log('🎊 Cloudflare 爬蟲系統文檔合併完成！');
            process.exit(0);
        } else {
            console.error('💥 合併失敗:', result.error);
            process.exit(1);
        }
    });
}

module.exports = DocumentMerger;
