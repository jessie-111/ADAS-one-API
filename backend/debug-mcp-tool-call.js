// 直接測試 MCP 工具調用
const { elkMCPClient } = require('./services/elkMCPClient');
const { ELK_CONFIG } = require('./config/elkConfig');

async function testMCPToolCall() {
  console.log('🔧 開始測試 MCP 工具調用...\n');
  
  try {
    // 1. 嘗試手動建立連接
    console.log('1. 建立 MCP 連接...');
    await elkMCPClient.connect();
    console.log('✅ MCP 連接建立成功\n');
    
    // 2. 列出可用的工具
    console.log('2. 列出可用的 MCP 工具...');
    try {
      const tools = await elkMCPClient.listTools();
      console.log('✅ 可用工具:', tools.map(t => t.name).join(', '));
      
      // 顯示每個工具的詳細信息
      tools.forEach(tool => {
        console.log(`   - ${tool.name}: ${tool.description || 'No description'}`);
      });
    } catch (error) {
      console.log('❌ 列出工具失敗:', error.message);
    }
    console.log('');
    
    // 3. 測試簡單的 search 工具調用
    console.log('3. 測試 search 工具調用...');
    console.log(`   索引: ${ELK_CONFIG.elasticsearch.index}`);
    
    const searchQuery = {
      query: { match_all: {} },
      size: 1,
      timeout: '10s'
    };
    
    console.log('   查詢內容:', JSON.stringify(searchQuery, null, 2));
    
    const result = await elkMCPClient.client.callTool({
      name: 'search',
      arguments: {
        index: ELK_CONFIG.elasticsearch.index,
        query_body: searchQuery
      }
    });
    
    console.log('   MCP 調用結果:');
    console.log('   - 是否錯誤:', result.isError);
    
    if (result.isError) {
      console.log('   ❌ 錯誤詳情:');
      result.content.forEach((content, i) => {
        console.log(`     [${i}] ${content.type}: ${content.text}`);
      });
    } else {
      console.log('   ✅ 調用成功');
      result.content.forEach((content, i) => {
        console.log(`     [${i}] ${content.type}: ${content.text.substring(0, 200)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ MCP 工具調用測試失敗:', error.message);
    console.error('錯誤堆疊:', error.stack);
  } finally {
    // 清理連接
    try {
      await elkMCPClient.disconnect();
      console.log('\n🔚 MCP 連接已關閉');
    } catch (e) {
      // 忽略清理錯誤
    }
  }
}

// 執行測試
testMCPToolCall().then(() => {
  console.log('\n✅ MCP 工具調用測試完成');
}).catch((error) => {
  console.error('\n❌ 測試過程發生致命錯誤:', error);
  process.exit(1);
}); 