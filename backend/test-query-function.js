// 測試 queryElasticsearch 函數
require('dotenv').config();

const { elkMCPClient } = require('./services/elkMCPClient');

async function testQueryFunction() {
  console.log('🔍 測試 queryElasticsearch 函數...');
  
  try {
    // 測試 queryElasticsearch 函數
    console.log('1. 測試 1 小時時間範圍...');
    const result1h = await elkMCPClient.queryElasticsearch('1h');
    console.log('1小時結果:', {
      total: result1h.total,
      hits: result1h.hits.length,
      firstRecord: result1h.hits[0] ? {
        id: result1h.hits[0].id,
        timestamp: result1h.hits[0].timestamp,
        clientIP: result1h.hits[0].source.ClientIP
      } : null
    });
    
    console.log('2. 測試 48 小時時間範圍...');
    const result48h = await elkMCPClient.queryElasticsearch('48h');
    console.log('48小時結果:', {
      total: result48h.total,
      hits: result48h.hits.length,
      firstRecord: result48h.hits[0] ? {
        id: result48h.hits[0].id,
        timestamp: result48h.hits[0].timestamp,
        clientIP: result48h.hits[0].source.ClientIP
      } : null
    });
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
  } finally {
    await elkMCPClient.disconnect();
  }
}

// 執行測試
testQueryFunction().catch(console.error); 