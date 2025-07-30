// 測試特定 ELK 記錄查詢
require('dotenv').config();

const { elkMCPClient } = require('../services/elkMCPClient');

async function testSpecificRecord() {
  console.log('🔍 測試查詢特定 ELK 記錄...');
  console.log('目標 ID:', 'mBwAMZgBWLoYWRcS2O1H');
  
  try {
    await elkMCPClient.connect();
    
    // 1. 測試通過 ID 查詢
    console.log('\n1. 通過文檔 ID 查詢...');
    const idResult = await elkMCPClient.client.callTool({
      name: 'search',
      arguments: {
        index: 'adasone-cf-logpush-*',
        query_body: {
          query: {
            ids: {
              values: ['mBwAMZgBWLoYWRcS2O1H']
            }
          }
        }
      }
    });
    
    console.log('ID 查詢結果:', JSON.stringify(idResult, null, 2));
    
    // 2. 測試 24 小時時間範圍查詢
    console.log('\n2. 測試 24 小時時間範圍查詢...');
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    console.log('查詢時間範圍:');
    console.log('從:', yesterday.toISOString());
    console.log('到:', now.toISOString());
    
    const timeRangeResult = await elkMCPClient.client.callTool({
      name: 'search',
      arguments: {
        index: 'adasone-cf-logpush-*',
        query_body: {
          query: {
            range: {
              "@timestamp": {
                gte: yesterday.toISOString(),
                lte: now.toISOString()
              }
            }
          },
          size: 10,
          sort: [
            {
              "@timestamp": {
                order: "desc"
              }
            }
          ]
        }
      }
    });
    
    console.log('24小時查詢結果摘要:', timeRangeResult.content[0]?.text || 'No summary');
    
    // 3. 測試特定時間段查詢（14:10-15:20）
    console.log('\n3. 測試特定時間段查詢（14:10-15:20）...');
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // 14:10 UTC
    const start1410 = new Date(targetDate.getTime() + 14 * 60 * 60 * 1000 + 10 * 60 * 1000);
    // 15:20 UTC
    const end1520 = new Date(targetDate.getTime() + 15 * 60 * 60 * 1000 + 20 * 60 * 1000);
    
    console.log('特定時間範圍:');
    console.log('從:', start1410.toISOString());
    console.log('到:', end1520.toISOString());
    
    const specificTimeResult = await elkMCPClient.client.callTool({
      name: 'search',
      arguments: {
        index: 'adasone-cf-logpush-*',
        query_body: {
          query: {
            range: {
              "@timestamp": {
                gte: start1410.toISOString(),
                lte: end1520.toISOString()
              }
            }
          },
          size: 10,
          sort: [
            {
              "@timestamp": {
                order: "desc"
              }
            }
          ]
        }
      }
    });
    
    console.log('特定時間段查詢結果摘要:', specificTimeResult.content[0]?.text || 'No summary');
    
    // 4. 檢查所有索引中的資料時間範圍
    console.log('\n4. 檢查索引資料時間範圍...');
    const statsResult = await elkMCPClient.client.callTool({
      name: 'search',
      arguments: {
        index: 'adasone-cf-logpush-*',
        query_body: {
          query: { match_all: {} },
          aggs: {
            time_range: {
              stats: {
                field: "@timestamp"
              }
            }
          },
          size: 0
        }
      }
    });
    
    console.log('時間範圍統計:', statsResult.content[0]?.text || 'No stats');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
  } finally {
    await elkMCPClient.disconnect();
  }
}

// 執行測試
testSpecificRecord().catch(console.error); 