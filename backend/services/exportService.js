const fs = require('fs');
const path = require('path');

class ExportService {
  constructor() {
    // 匯出檔案暫存目錄
    this.exportsDir = path.join(__dirname, '..', 'exports');
    this.ensureExportsDirectory();
  }

  // 確保匯出目錄存在
  ensureExportsDirectory() {
    if (!fs.existsSync(this.exportsDir)) {
      fs.mkdirSync(this.exportsDir, { recursive: true });
      console.log('✅ 建立匯出目錄:', this.exportsDir);
    }
  }

  // 清理過期檔案 (超過24小時)
  cleanupExpiredFiles() {
    try {
      if (!fs.existsSync(this.exportsDir)) {
        return;
      }

      const files = fs.readdirSync(this.exportsDir);
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      files.forEach(filename => {
        const filePath = path.join(this.exportsDir, filename);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < oneDayAgo) {
          fs.unlinkSync(filePath);
          console.log('🗑️ 清理過期匯出檔案:', filename);
        }
      });
    } catch (error) {
      console.error('❌ 清理過期檔案失敗:', error);
    }
  }

  // 生成匯出檔案名稱
  generateFilename(timeRange, startTime, endTime) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5); // 移除毫秒和冒號
    
    let timeDesc = '';
    if (timeRange && timeRange !== 'custom') {
      timeDesc = timeRange;
    } else if (startTime && endTime) {
      const start = new Date(startTime).toISOString().slice(0, 16).replace(/[:-]/g, '').replace('T', '_');
      const end = new Date(endTime).toISOString().slice(0, 16).replace(/[:-]/g, '').replace('T', '_');
      timeDesc = `${start}-${end}`;
    } else {
      timeDesc = 'auto';
    }
    
    return `security_export_${timeDesc}_${timestamp}.json`;
  }

  // 組裝匯出資料
  buildExportData(securityStats, rawLogData, options, timeRange, startTime, endTime) {
    const exportData = {
      metadata: {
        exportTime: new Date().toISOString(),
        exportVersion: '1.0',
        dataSource: 'elk_mcp',
        timeRange: {
          requested: {
            timeRange: timeRange || 'custom',
            startTime: startTime || null,
            endTime: endTime || null
          },
          actual: securityStats?.timeRange || null
        },
        recordCounts: {
          totalRequests: securityStats?.totalRequests || 0,
          totalAttacks: securityStats?.totalAttacks || 0,
          rawLogEntries: rawLogData ? rawLogData.length : 0
        },
        exportOptions: options,
        systemInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          timestamp: Date.now()
        }
      }
    };

    // 根據選項包含不同的資料
    if (options.includeStats && securityStats) {
      exportData.statistics = {
        summary: {
          totalRequests: securityStats.totalRequests,
          totalAttacks: securityStats.totalAttacks,
          blockingRate: securityStats.blockingRate,
          avgResponseTime: securityStats.avgResponseTime,
          protectedSites: securityStats.protectedSites,
          blockedRequestsCount: securityStats.blockedRequestsCount,
          challengeRequestsCount: securityStats.challengeRequestsCount
        },
        attackTypeStats: securityStats.attackTypeStats,
        threatDistribution: securityStats.threatDistribution,
        securityActionStats: securityStats.securityActionStats,
        trafficStats: securityStats.trafficStats
      };
    }

    if (options.includeCharts && securityStats) {
      exportData.charts = {
        performanceTrend: securityStats.performanceTrend,
        attackTypeStats: securityStats.attackTypeStats,
        trafficStats: securityStats.trafficStats,
        timeRange: securityStats.timeRange
      };
    }

    if (options.includeRawData && rawLogData) {
      // 限制原始資料數量以避免檔案過大
      const maxRawRecords = 50000;
      exportData.rawData = {
        records: rawLogData.slice(0, maxRawRecords),
        totalAvailable: rawLogData.length,
        included: Math.min(rawLogData.length, maxRawRecords),
        truncated: rawLogData.length > maxRawRecords
      };
    }

    return exportData;
  }

  // 儲存匯出檔案
  async saveExportFile(filename, data) {
    try {
      const filePath = path.join(this.exportsDir, filename);
      const jsonData = JSON.stringify(data, null, 2);
      
      fs.writeFileSync(filePath, jsonData, 'utf8');
      
      const stats = fs.statSync(filePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log(`✅ 匯出檔案已儲存: ${filename} (${fileSizeMB} MB)`);
      
      return {
        filename,
        filePath,
        size: stats.size,
        sizeMB: fileSizeMB
      };
    } catch (error) {
      console.error('❌ 儲存匯出檔案失敗:', error);
      throw error;
    }
  }

  // 獲取檔案路徑
  getFilePath(filename) {
    return path.join(this.exportsDir, filename);
  }

  // 檢查檔案是否存在
  fileExists(filename) {
    return fs.existsSync(this.getFilePath(filename));
  }

  // 刪除檔案
  deleteFile(filename) {
    try {
      const filePath = this.getFilePath(filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️ 刪除匯出檔案:', filename);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ 刪除檔案失敗:', error);
      throw error;
    }
  }

  // 獲取匯出目錄中的檔案列表
  getExportFiles() {
    try {
      if (!fs.existsSync(this.exportsDir)) {
        return [];
      }

      const files = fs.readdirSync(this.exportsDir);
      return files
        .filter(filename => filename.endsWith('.json'))
        .map(filename => {
          const filePath = path.join(this.exportsDir, filename);
          const stats = fs.statSync(filePath);
          return {
            filename,
            size: stats.size,
            sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt); // 按建立時間降序排列
    } catch (error) {
      console.error('❌ 獲取匯出檔案列表失敗:', error);
      return [];
    }
  }

  // 批次處理大資料集
  async processLargeDataset(rawData, batchSize = 10000) {
    const batches = [];
    for (let i = 0; i < rawData.length; i += batchSize) {
      batches.push(rawData.slice(i, i + batchSize));
    }
    
    console.log(`📊 將 ${rawData.length} 筆記錄分為 ${batches.length} 個批次處理`);
    return batches;
  }

  // 清理所有匯出檔案
  cleanupAllFiles() {
    try {
      if (!fs.existsSync(this.exportsDir)) {
        return 0;
      }

      const files = fs.readdirSync(this.exportsDir);
      let deletedCount = 0;

      files.forEach(filename => {
        if (filename.endsWith('.json')) {
          const filePath = path.join(this.exportsDir, filename);
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      });

      console.log(`🗑️ 清理了 ${deletedCount} 個匯出檔案`);
      return deletedCount;
    } catch (error) {
      console.error('❌ 清理匯出檔案失敗:', error);
      throw error;
    }
  }
}

module.exports = ExportService;
