// 測試 ELK MCP 連接
require('dotenv').config();

const { ElkMCPClient } = require('./services/elkMCPClient');

async function testMCPConnection() {
  console.log('🔍 開始測試 ELK MCP 連接...');
  console.log('');
  
  const client = new ElkMCPClient();
  
  try {
    // 測試連接
    console.log('1. 測試 MCP Server 連接...');
    await client.connect();
    
    // 測試基本功能
    console.log('2. 測試 MCP Server 工具列表...');
    const tools = await client.client.listTools();
    console.log('可用工具:', tools.tools.map(t => t.name));
    
    // 測試 Elasticsearch 連接
    console.log('3. 測試 Elasticsearch 索引列表...');
    const indices = await client.client.callTool({
      name: 'list_indices',
      arguments: {
        index_pattern: 'adasone-cf-logpush-*'
      }
    });
    console.log('索引列表:', JSON.stringify(indices, null, 2));
    
    // 測試查詢
    console.log('4. 測試簡單查詢...');
    const searchResult = await client.queryElasticsearch('5m');
    console.log(`查詢結果: 找到 ${searchResult.hits.length} 筆記錄`);
    
    console.log('');
    console.log('✅ MCP 連接測試完成！');
    
  } catch (error) {
    console.error('❌ MCP 連接測試失敗:', error);
  } finally {
    await client.disconnect();
  }
}

// 執行測試
testMCPConnection().catch(console.error); 