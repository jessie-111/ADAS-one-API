// 調試 ELK 查詢
require('dotenv').config();

const { elkMCPClient } = require('./services/elkMCPClient');

async function debugELKQuery() {
  console.log('🔍 開始調試 ELK 查詢...');
  
  try {
    // 1. 測試連接
    console.log('1. 測試 MCP 連接...');
    await elkMCPClient.connect();
    
    // 2. 測試簡單查詢（不限時間）
    console.log('2. 測試簡單查詢（match_all）...');
    const simpleResult = await elkMCPClient.client.callTool({
      name: 'search',
      arguments: {
        index: 'adasone-cf-logpush-*',
        query_body: {
          query: { match_all: {} },
          size: 5
        }
      }
    });
    
    console.log('簡單查詢結果:', JSON.stringify(simpleResult, null, 2));
    
    // 3. 測試時間範圍查詢
    console.log('3. 測試時間範圍查詢...');
    const now = new Date();
    const fromTime = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48小時前
    
    const timeRangeResult = await elkMCPClient.client.callTool({
      name: 'search',
      arguments: {
        index: 'adasone-cf-logpush-*',
        query_body: {
          query: {
            range: {
              "@timestamp": {
                gte: fromTime.toISOString(),
                lte: now.toISOString()
              }
            }
          },
          size: 5
        }
      }
    });
    
    console.log('時間範圍查詢結果:', JSON.stringify(timeRangeResult, null, 2));
    
    // 4. 列出可用的索引
    console.log('4. 列出可用的索引...');
    const indices = await elkMCPClient.client.callTool({
      name: 'list_indices',
      arguments: {
        index_pattern: 'adasone-cf-logpush-*'
      }
    });
    
    console.log('索引列表:', JSON.stringify(indices, null, 2));
    
  } catch (error) {
    console.error('❌ 調試失敗:', error);
  } finally {
    await elkMCPClient.disconnect();
  }
}

// 執行調試
debugELKQuery().catch(console.error); 