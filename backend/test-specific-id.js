// 測試查詢特定 ELK 記錄 ID
require('dotenv').config();

const { elkMCPClient } = require('./services/elkMCPClient');

async function testSpecificRecordId() {
  const targetId = '6h3ZNJgBWLoYWRcSyAui';
  console.log('🔍 測試查詢特定 ELK 記錄...');
  console.log('目標 ID:', targetId);
  console.log('');
  
  try {
    await elkMCPClient.connect();
    console.log('✅ ELK MCP 連接成功');
    
    // 1. 通過 ID 查詢特定記錄
    console.log('\n1. 通過文檔 ID 查詢記錄...');
    const idResult = await elkMCPClient.client.callTool({
      name: 'search',
      arguments: {
        index: 'adasone-cf-logpush-*',
        query_body: {
          query: {
            ids: {
              values: [targetId]
            }
          }
        }
      }
    });
    
    console.log('查詢結果狀態:', idResult.isError ? '❌ 錯誤' : '✅ 成功');
    
    if (idResult.content && idResult.content.length > 0) {
      console.log('\n📊 查詢回應內容:');
      const responseText = idResult.content[0]?.text || '';
      console.log('回應摘要:', responseText.substring(0, 300) + '...');
      
      // 嘗試解析資料
      if (idResult.content.length > 1) {
        const dataText = idResult.content[1]?.text || '';
        console.log('\n📋 實際資料:');
        console.log('資料長度:', dataText.length);
        
        try {
          const records = JSON.parse(dataText);
          console.log('資料類型:', Array.isArray(records) ? '陣列' : '物件');
          
          if (Array.isArray(records) && records.length > 0) {
            const record = records[0];
            console.log('\n🎯 找到記錄！');
            console.log('記錄欄位:', Object.keys(record));
            
            // 重點檢查 ClientRequestHost
            console.log('\n🔍 ClientRequestHost 欄位分析:');
            console.log('ClientRequestHost:', record.ClientRequestHost || '❌ 不存在');
            console.log('EdgeRequestHost:', record.EdgeRequestHost || '❌ 不存在');
            console.log('Host:', record.Host || '❌ 不存在');
            
            // 顯示其他相關欄位
            console.log('\n📝 其他相關欄位:');
            console.log('ClientIP:', record.ClientIP || 'N/A');
            console.log('ClientRequestURI:', record.ClientRequestURI || 'N/A');
            console.log('EdgeResponseStatus:', record.EdgeResponseStatus || 'N/A');
            console.log('RayID:', record.RayID || 'N/A');
            console.log('@timestamp:', record['@timestamp'] || 'N/A');
            
            // 顯示完整記錄（限制長度）
            console.log('\n📄 完整記錄 (JSON):');
            console.log(JSON.stringify(record, null, 2).substring(0, 1000) + '...');
            
          } else if (typeof records === 'object' && records !== null) {
            // 可能是標準 Elasticsearch 格式
            console.log('\n🎯 標準 ES 格式回應:');
            if (records.hits && records.hits.hits && records.hits.hits.length > 0) {
              const hit = records.hits.hits[0];
              const source = hit._source;
              
              console.log('\n🔍 ClientRequestHost 欄位分析:');
              console.log('ClientRequestHost:', source.ClientRequestHost || '❌ 不存在');
              console.log('EdgeRequestHost:', source.EdgeRequestHost || '❌ 不存在');
              console.log('Host:', source.Host || '❌ 不存在');
              
              console.log('\n📝 其他相關欄位:');
              console.log('ClientIP:', source.ClientIP || 'N/A');
              console.log('ClientRequestURI:', source.ClientRequestURI || 'N/A');
              console.log('EdgeResponseStatus:', source.EdgeResponseStatus || 'N/A');
              console.log('RayID:', source.RayID || 'N/A');
              console.log('@timestamp:', source['@timestamp'] || 'N/A');
            } else {
              console.log('❌ 沒有找到匹配的記錄');
            }
          } else {
            console.log('❌ 無法識別的資料格式');
          }
          
        } catch (parseError) {
          console.log('❌ JSON 解析失敗:', parseError.message);
          console.log('原始資料片段:', dataText.substring(0, 500));
        }
      }
    } else {
      console.log('❌ 沒有收到查詢結果');
    }
    
    // 2. 如果直接 ID 查詢失敗，嘗試通過 RayID 查詢
    console.log('\n2. 嘗試通過 RayID 查詢...');
    const rayIdResult = await elkMCPClient.client.callTool({
      name: 'search',
      arguments: {
        index: 'adasone-cf-logpush-*',
        query_body: {
          query: {
            term: {
              "RayID": targetId
            }
          }
        }
      }
    });
    
    console.log('RayID 查詢結果狀態:', rayIdResult.isError ? '❌ 錯誤' : '✅ 成功');
    
    if (rayIdResult.content && rayIdResult.content.length > 0) {
      const responseText = rayIdResult.content[0]?.text || '';
      console.log('RayID 查詢回應:', responseText.substring(0, 200) + '...');
    }
    
    // 3. 嘗試模糊查詢（部分匹配）
    console.log('\n3. 嘗試模糊查詢...');
    const fuzzyResult = await elkMCPClient.client.callTool({
      name: 'search',
      arguments: {
        index: 'adasone-cf-logpush-*',
        query_body: {
          query: {
            wildcard: {
              "_id": `*${targetId}*`
            }
          },
          size: 5
        }
      }
    });
    
    console.log('模糊查詢結果狀態:', fuzzyResult.isError ? '❌ 錯誤' : '✅ 成功');
    
    if (fuzzyResult.content && fuzzyResult.content.length > 0) {
      const responseText = fuzzyResult.content[0]?.text || '';
      console.log('模糊查詢回應:', responseText.substring(0, 200) + '...');
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
    console.error('錯誤詳情:', error.stack);
  } finally {
    await elkMCPClient.disconnect();
    console.log('🔌 ELK MCP 連接已關閉');
  }
}

// 執行測試
testSpecificRecordId().catch(console.error); 