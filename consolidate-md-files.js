#!/usr/bin/env node

/**
 * 📚 Markdown 檔案整合工具
 * 
 * 功能：將專案外層所有 .md 檔案內容整合到 README.md 中
 * 策略：按內容類別分類整理，保持邏輯結構
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class MarkdownConsolidator {
    constructor() {
        this.sourceFiles = [
            {
                name: 'CLOUDFLARE-CRAWLER-COMPREHENSIVE-REPORT.md',
                category: 'crawler-system',
                title: 'Cloudflare 文檔爬蟲系統',
                description: '完整的爬蟲系統開發與執行報告'
            },
            {
                name: 'MERGE-COMPLETION-REPORT.md', 
                category: 'maintenance',
                title: '文檔合併完成記錄',
                description: 'SECURITY-WAF 文檔合併作業記錄'
            },
            {
                name: 'PROJECT-CLEANUP-ANALYSIS.md',
                category: 'maintenance', 
                title: '專案檔案整理分析',
                description: '專案檔案結構整理分析報告'
            },
            {
                name: 'PROJECT-CLEANUP-COMPLETION-REPORT.md',
                category: 'maintenance',
                title: '專案檔案整理完成記錄', 
                description: '專案檔案結構整理執行報告'
            }
        ];
        
        this.targetFile = 'README.md';
        this.backupFile = 'README.md.backup';
    }

    /**
     * 讀取檔案內容
     */
    async readFileContent(filePath) {
        try {
            if (!fsSync.existsSync(filePath)) {
                console.warn(`⚠️  檔案不存在: ${filePath}`);
                return null;
            }

            const content = await fs.readFile(filePath, 'utf-8');
            return content;
        } catch (error) {
            console.error(`❌ 讀取檔案失敗: ${filePath}`, error.message);
            return null;
        }
    }

    /**
     * 提取檔案主要內容（移除標題）
     */
    extractMainContent(content, fileName) {
        const lines = content.split('\n');
        
        // 跳過第一個主標題 (# 標題)
        let startIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('# ')) {
                startIndex = i + 1;
                break;
            }
        }
        
        return {
            content: lines.slice(startIndex).join('\n').trim(),
            lineCount: lines.length - startIndex,
            totalLines: lines.length
        };
    }

    /**
     * 生成新的 README.md 內容
     */
    async generateNewReadme() {
        console.log('🚀 開始整合 Markdown 檔案...\n');

        try {
            // 備份原始 README.md
            const originalReadme = await this.readFileContent(this.targetFile);
            if (originalReadme) {
                await fs.writeFile(this.backupFile, originalReadme, 'utf-8');
                console.log(`✅ 已備份原始 README.md 到 ${this.backupFile}`);
            }

            // 讀取所有要整合的檔案
            const filesContent = {};
            let totalIntegratedLines = 0;

            for (const fileInfo of this.sourceFiles) {
                console.log(`📖 讀取: ${fileInfo.name}`);
                const content = await this.readFileContent(fileInfo.name);
                
                if (content) {
                    const extracted = this.extractMainContent(content, fileInfo.name);
                    filesContent[fileInfo.name] = {
                        ...fileInfo,
                        ...extracted
                    };
                    totalIntegratedLines += extracted.lineCount;
                }
            }

            console.log(`✅ 成功讀取 ${Object.keys(filesContent).length} 個檔案\n`);

            // 構建新的 README.md
            const readmeSections = [];
            
            // 檔案頭部 
            readmeSections.push('# 📚 DDoS Attack Graph Demo - 專案完整文檔\n');
            readmeSections.push('> **最後更新**: ' + new Date().toLocaleString('zh-TW'));
            readmeSections.push('> **整合狀態**: 已整合所有外層文檔，統一管理');
            readmeSections.push('> **維護策略**: 所有更新和記錄直接在此檔案中維護\n');
            
            // 目錄索引
            readmeSections.push('## 📋 文檔目錄\n');
            
            readmeSections.push('### 🏗️ 專案核心');
            readmeSections.push('- [專案概述](#專案概述)');
            readmeSections.push('- [系統架構](#系統架構)');
            readmeSections.push('- [功能特色](#功能特色)');
            readmeSections.push('- [安裝與使用](#安裝與使用)\n');
            
            readmeSections.push('### 🕷️ Cloudflare 文檔爬蟲系統');
            readmeSections.push('- [爬蟲系統概述](#cloudflare-文檔爬蟲系統)');
            readmeSections.push('- [開發歷程](#詳細開發歷程)');
            readmeSections.push('- [使用指南](#爬蟲使用指南)');
            readmeSections.push('- [技術架構](#爬蟲技術架構)\n');
            
            readmeSections.push('### 🛠️ 專案維護記錄');
            readmeSections.push('- [文檔整合記錄](#文檔整合記錄)');
            readmeSections.push('- [檔案整理記錄](#檔案整理記錄)');
            readmeSections.push('- [系統優化記錄](#系統優化記錄)\n');
            
            readmeSections.push('---\n');

            // 專案概述 (保留部分原始內容的精簡版)
            readmeSections.push('# 專案概述\n');
            readmeSections.push('**DDoS Attack Graph Demo** 是一個整合 AI 分析的 DDoS 攻擊圖表展示系統，同時包含完整的 Cloudflare 文檔爬蟲工具。\n');
            
            readmeSections.push('## 🎯 核心功能');
            readmeSections.push('- 🔍 **AI 智能分析**: 整合多種 AI 提供商進行攻擊模式分析');
            readmeSections.push('- 📊 **視覺化展示**: 即時 DDoS 攻擊趨勢圖表和統計');
            readmeSections.push('- 🕷️ **文檔爬蟲系統**: 完整的 Cloudflare 官方文檔爬取工具');
            readmeSections.push('- 🛡️ **安全防護**: 企業級安全配置和 API 保護');
            readmeSections.push('- 📈 **趨勢分析**: 攻擊模式趨勢分析和預測\n');

            // Cloudflare 文檔爬蟲系統
            readmeSections.push('---\n');
            readmeSections.push('# Cloudflare 文檔爬蟲系統\n');
            
            if (filesContent['CLOUDFLARE-CRAWLER-COMPREHENSIVE-REPORT.md']) {
                const crawlerContent = filesContent['CLOUDFLARE-CRAWLER-COMPREHENSIVE-REPORT.md'];
                readmeSections.push(`> **完整開發報告**: ${crawlerContent.totalLines} 行，詳細記錄整個爬蟲系統的開發歷程\n`);
                readmeSections.push(crawlerContent.content);
                readmeSections.push('\n');
            }

            // 專案維護記錄
            readmeSections.push('---\n');
            readmeSections.push('# 專案維護記錄\n');
            readmeSections.push('此部分記錄專案的重要維護活動和結構調整。\n');

            // 文檔整合記錄
            if (filesContent['MERGE-COMPLETION-REPORT.md']) {
                const mergeContent = filesContent['MERGE-COMPLETION-REPORT.md'];
                readmeSections.push('## 文檔整合記錄\n');
                readmeSections.push(`> **記錄來源**: ${mergeContent.name} (${mergeContent.totalLines} 行)\n`);
                readmeSections.push(mergeContent.content);
                readmeSections.push('\n');
            }

            // 檔案整理記錄
            readmeSections.push('## 檔案整理記錄\n');
            
            if (filesContent['PROJECT-CLEANUP-ANALYSIS.md']) {
                const analysisContent = filesContent['PROJECT-CLEANUP-ANALYSIS.md'];
                readmeSections.push('### 整理分析報告\n');
                readmeSections.push(`> **記錄來源**: ${analysisContent.name} (${analysisContent.totalLines} 行)\n`);
                readmeSections.push(analysisContent.content);
                readmeSections.push('\n');
            }
            
            if (filesContent['PROJECT-CLEANUP-COMPLETION-REPORT.md']) {
                const completionContent = filesContent['PROJECT-CLEANUP-COMPLETION-REPORT.md'];
                readmeSections.push('### 整理完成報告\n'); 
                readmeSections.push(`> **記錄來源**: ${completionContent.name} (${completionContent.totalLines} 行)\n`);
                readmeSections.push(completionContent.content);
                readmeSections.push('\n');
            }

            // 技術資訊
            readmeSections.push('---\n');
            readmeSections.push('# 技術資訊\n');
            
            readmeSections.push('## 📁 專案結構');
            readmeSections.push('```');
            readmeSections.push('ddos-attack-graph-demo/');
            readmeSections.push('├── README.md                      # 本檔案 - 完整專案文檔');
            readmeSections.push('├── backend/                       # 後端服務');
            readmeSections.push('├── frontend/                      # 前端應用');
            readmeSections.push('├── tools/                         # 工具歸檔目錄');
            readmeSections.push('│   ├── archived-crawlers/         # 已完成的爬蟲工具');
            readmeSections.push('│   └── one-time-scripts/          # 單次任務工具');
            readmeSections.push('├── cloudflare-docs/               # Cloudflare 文檔資料');
            readmeSections.push('├── waf-docs/                      # WAF 文檔資料');
            readmeSections.push('└── docs-archive/                  # 文檔備份');
            readmeSections.push('```\n');

            readmeSections.push('## 🚀 快速開始');
            readmeSections.push('```bash');
            readmeSections.push('# 啟動專案');
            readmeSections.push('./run.sh');
            readmeSections.push('');
            readmeSections.push('# 執行文檔爬蟲');
            readmeSections.push('./run-staged-crawler.sh [product-line]');
            readmeSections.push('```\n');

            // 檔案整合資訊
            readmeSections.push('---\n');
            readmeSections.push('# 📄 文檔整合資訊\n');
            
            readmeSections.push('## 📊 整合統計');
            readmeSections.push('| 項目 | 數值 | 說明 |');
            readmeSections.push('|------|------|------|');
            readmeSections.push(`| **整合檔案數** | ${Object.keys(filesContent).length} | 外層 .md 檔案數量 |`);
            readmeSections.push(`| **整合內容** | ${totalIntegratedLines.toLocaleString()} 行 | 整合的總內容量 |`);
            readmeSections.push('| **整合策略** | 分類歸檔 | 按內容類別整理 |');
            readmeSections.push(`| **整合時間** | ${new Date().toLocaleString('zh-TW')} | 自動整合完成時間 |\n`);
            
            readmeSections.push('## 🗂️ 整合來源檔案');
            Object.values(filesContent).forEach(file => {
                readmeSections.push(`- **${file.name}** (${file.totalLines} 行) - ${file.description}`);
            });
            readmeSections.push('');

            readmeSections.push('## 📝 維護說明');
            readmeSections.push('- ✅ **統一文檔**: 所有專案文檔已整合到此檔案');
            readmeSections.push('- ✅ **更新策略**: 未來所有更新直接在此檔案中維護');
            readmeSections.push('- ✅ **備份保護**: 原始檔案已備份到 `README.md.backup`');
            readmeSections.push('- ✅ **結構清晰**: 按功能和時間順序組織內容\n');

            // 寫入新的 README.md
            const finalContent = readmeSections.join('\n');
            await fs.writeFile(this.targetFile, finalContent, 'utf-8');
            
            console.log('✅ 整合完成！');
            console.log(`📄 新 README.md: ${finalContent.length.toLocaleString()} 字元`);
            console.log(`📊 整合統計:`);
            console.log(`   - 整合檔案: ${Object.keys(filesContent).length} 個`);
            console.log(`   - 整合內容: ${totalIntegratedLines.toLocaleString()} 行`);
            console.log(`📁 備份檔案: ${this.backupFile}\n`);

            return {
                success: true,
                integratedFiles: Object.keys(filesContent).length,
                totalLines: totalIntegratedLines,
                backupFile: this.backupFile
            };
            
        } catch (error) {
            console.error('❌ 整合過程發生錯誤:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 刪除已整合的檔案
     */
    async cleanupIntegratedFiles() {
        console.log('🧹 清理已整合的檔案...\n');
        
        const filesToDelete = this.sourceFiles.map(f => f.name);
        const deletedFiles = [];
        
        for (const fileName of filesToDelete) {
            try {
                if (fsSync.existsSync(fileName)) {
                    await fs.unlink(fileName);
                    deletedFiles.push(fileName);
                    console.log(`✅ 已刪除: ${fileName}`);
                } else {
                    console.log(`⚠️  檔案不存在: ${fileName}`);
                }
            } catch (error) {
                console.error(`❌ 刪除失敗: ${fileName}`, error.message);
            }
        }
        
        console.log(`\n🎉 清理完成！共刪除 ${deletedFiles.length} 個檔案`);
        return deletedFiles;
    }
}

// 執行整合
if (require.main === module) {
    const consolidator = new MarkdownConsolidator();
    
    consolidator.generateNewReadme().then(result => {
        if (result.success) {
            console.log('📚 README.md 整合成功，準備清理檔案...\n');
            
            return consolidator.cleanupIntegratedFiles();
        } else {
            console.error('💥 整合失敗:', result.error);
            process.exit(1);
        }
    }).then((deletedFiles) => {
        console.log('🎊 Markdown 檔案整合與清理完成！');
        console.log('\n📋 最終狀態:');
        console.log('   - ✅ README.md: 包含所有專案文檔');
        console.log('   - ✅ 備份檔案: README.md.backup');
        console.log(`   - ✅ 已清理: ${deletedFiles.length} 個外層 .md 檔案`);
        console.log('\n🎯 未來維護: 所有更新直接在 README.md 中進行');
        process.exit(0);
    }).catch(error => {
        console.error('💥 執行失敗:', error);
        process.exit(1);
    });
}

module.exports = MarkdownConsolidator;
