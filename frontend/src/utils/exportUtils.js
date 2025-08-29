// 防護分析資料匯出工具函數

/**
 * 匯出防護分析資料
 * @param {Object} params - 匯出參數
 * @param {string} params.timeRange - 時間範圍 ('1h', '6h', '24h', '7d', 'custom')
 * @param {string} params.startTime - 開始時間 (ISO string)
 * @param {string} params.endTime - 結束時間 (ISO string)
 * @param {Object} params.options - 匯出選項
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const exportSecurityData = async (params) => {
  try {
    const { timeRange, startTime, endTime, options } = params;
    
    // 驗證參數
    if (!options || typeof options !== 'object') {
      throw new Error('缺少匯出選項設定');
    }
    
    if (timeRange === 'custom' && (!startTime || !endTime)) {
      throw new Error('自訂時間範圍需要提供開始和結束時間');
    }
    
    const response = await fetch('http://localhost:8080/api/security-data-export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timeRange: timeRange === 'custom' ? undefined : timeRange,
        startTime: timeRange === 'custom' ? startTime : undefined,
        endTime: timeRange === 'custom' ? endTime : undefined,
        options
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: 匯出失敗`);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('匯出資料失敗:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 獲取匯出歷史記錄
 * @returns {Promise<{success: boolean, files?: Array, error?: string}>}
 */
export const getExportHistory = async () => {
  try {
    const response = await fetch('http://localhost:8080/api/export-history');
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: 獲取歷史失敗`);
    }
    
    const data = await response.json();
    return { success: true, files: data.files || [] };
    
  } catch (error) {
    console.error('獲取匯出歷史失敗:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 下載指定的匯出檔案
 * @param {string} filename - 檔案名稱
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const downloadExportFile = async (filename) => {
  try {
    if (!filename) {
      throw new Error('檔案名稱不能為空');
    }
    
    const response = await fetch(`http://localhost:8080/api/download-export/${encodeURIComponent(filename)}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: 下載失敗`);
    }
    
    // 建立下載連結
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    return { success: true };
    
  } catch (error) {
    console.error('下載檔案失敗:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 刪除指定的匯出檔案
 * @param {string} filename - 檔案名稱
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteExportFile = async (filename) => {
  try {
    if (!filename) {
      throw new Error('檔案名稱不能為空');
    }
    
    const response = await fetch(`http://localhost:8080/api/delete-export/${encodeURIComponent(filename)}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: 刪除失敗`);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('刪除檔案失敗:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 清理所有匯出檔案
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export const cleanupAllExports = async () => {
  try {
    const response = await fetch('http://localhost:8080/api/cleanup-exports', {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: 清理失敗`);
    }
    
    const data = await response.json();
    return { success: true, message: data.message };
    
  } catch (error) {
    console.error('清理匯出檔案失敗:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 格式化檔案大小
 * @param {number} bytes - 位元組數
 * @returns {string} 格式化後的大小字串
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 格式化時間範圍顯示
 * @param {string} timeRange - 時間範圍
 * @param {string} startTime - 開始時間
 * @param {string} endTime - 結束時間
 * @returns {string} 格式化後的時間範圍字串
 */
export const formatTimeRangeDisplay = (timeRange, startTime, endTime) => {
  if (timeRange && timeRange !== 'custom') {
    const ranges = {
      '1h': '最近 1 小時',
      '6h': '最近 6 小時',
      '24h': '最近 24 小時',
      '7d': '最近 7 天'
    };
    return ranges[timeRange] || timeRange;
  }
  
  if (startTime && endTime) {
    const start = new Date(startTime).toLocaleString('zh-TW');
    const end = new Date(endTime).toLocaleString('zh-TW');
    return `${start} ~ ${end}`;
  }
  
  return '未知時間範圍';
};

/**
 * 驗證時間範圍設定
 * @param {string} timeRange - 時間範圍
 * @param {string} startTime - 開始時間
 * @param {string} endTime - 結束時間
 * @returns {{valid: boolean, error?: string}}
 */
export const validateTimeRange = (timeRange, startTime, endTime) => {
  if (timeRange === 'custom') {
    if (!startTime || !endTime) {
      return { valid: false, error: '自訂時間範圍需要提供開始和結束時間' };
    }
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (start >= end) {
      return { valid: false, error: '開始時間必須早於結束時間' };
    }
    
    const now = new Date();
    if (start > now) {
      return { valid: false, error: '開始時間不能晚於現在' };
    }
    
    // 檢查時間範圍是否過大 (超過30天)
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > thirtyDaysMs) {
      return { valid: false, error: '時間範圍不能超過30天' };
    }
  }
  
  return { valid: true };
};

/**
 * 預估檔案大小
 * @param {string} timeRange - 時間範圍
 * @param {string} startTime - 開始時間
 * @param {string} endTime - 結束時間
 * @param {Object} options - 匯出選項
 * @returns {string} 預估大小字串
 */
export const estimateFileSize = (timeRange, startTime, endTime, options) => {
  let hours = 0;
  
  if (timeRange === 'custom' && startTime && endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    hours = Math.abs(end - start) / (1000 * 60 * 60);
  } else {
    const timeMap = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 168
    };
    hours = timeMap[timeRange] || 1;
  }
  
  // 基礎大小預估 (每小時約1-5MB)
  let baseSizeMB = hours * 2.5;
  
  // 根據匯出選項調整
  let multiplier = 1;
  if (options.includeStats) multiplier += 0.1;
  if (options.includeCharts) multiplier += 0.2;
  if (options.includeRawData) multiplier += 2.0; // 原始資料佔大部分空間
  
  const estimatedMB = baseSizeMB * multiplier;
  
  if (estimatedMB < 1) return '< 1 MB';
  if (estimatedMB < 10) return `${Math.round(estimatedMB)} MB`;
  if (estimatedMB < 100) return `${Math.round(estimatedMB / 10) * 10} MB`;
  return `${Math.round(estimatedMB / 50) * 50} MB`;
};
