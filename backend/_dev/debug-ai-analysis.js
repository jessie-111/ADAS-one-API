// AI 分析除錯腳本
const fetch = require('node-fetch');

console.log('🔍 開始 AI 分析請求除錯...\n');

// 模擬前端可能傳遞的參數
const testRequests = [
  {
    name: '測試 1: Gemini 配置',
    endpoint: 'http://localhost:8080/api/analyze-log',
    body: {
      provider: 'gemini',
      apiKey: 'test_gemini_key',
      model: 'gemini-1.5-flash',
      dataSource: 'file',
      timeRange: '1h'
    }
  },
  {
    name: '測試 2: 完整 Ollama 配置',
    endpoint: 'http://localhost:8080/api/analyze-log',
    body: {
      provider: 'ollama',
      apiUrl: 'http://localhost:11434',
      model: 'llama2',
      dataSource: 'file', 
      timeRange: '1h'
    }
  },
  {
    name: '測試 3: Ollama 缺少模型',
    endpoint: 'http://localhost:8080/api/analyze-log',
    body: {
      provider: 'ollama',
      apiUrl: 'http://localhost:11434',
      model: '', // 空模型
      dataSource: 'file',
      timeRange: '1h'
    }
  },
  {
    name: '測試 4: Ollama 缺少 API URL',
    endpoint: 'http://localhost:8080/api/analyze-log',
    body: {
      provider: 'ollama',
      apiUrl: '', // 空 URL
      model: 'llama2',
      dataSource: 'file',
      timeRange: '1h'
    }
  },
  {
    name: '測試 5: Ollama 未定義參數',
    endpoint: 'http://localhost:8080/api/analyze-log',
    body: {
      provider: 'ollama',
      // apiUrl: undefined,
      // model: undefined, 
      dataSource: 'file',
      timeRange: '1h'
    }
  }
];

async function testAIAnalysis() {
  console.log('🚀 開始測試 AI 分析端點...\n');

  for (const test of testRequests) {
    console.log(`🔬 ${test.name}`);
    console.log('請求參數:', JSON.stringify(test.body, null, 2));

    try {
      const response = await fetch(test.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(test.body)
      });

      const responseText = await response.text();
      
      console.log(`狀態碼: ${response.status}`);
      
      if (response.ok) {
        console.log('✅ 請求成功');
        // 只顯示回應的開頭部分
        console.log('回應預覽:', responseText.substring(0, 200) + '...');
      } else {
        console.log('❌ 請求失敗');
        console.log('錯誤回應:', responseText);
        
        // 嘗試解析 JSON 錯誤
        try {
          const errorData = JSON.parse(responseText);
          console.log('錯誤詳情:', errorData);
        } catch (e) {
          console.log('無法解析錯誤回應為 JSON');
        }
      }
    } catch (error) {
      console.log('❌ 請求異常:', error.message);
    }
    
    console.log('─'.repeat(50));
  }
}

// 測試後端是否在運行
async function checkBackendStatus() {
  console.log('🔍 檢查後端服務狀態...');
  
  try {
    const response = await fetch('http://localhost:8080/api/ai-providers');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 後端服務正常運行');
      console.log('支援的 AI 提供商:', data.providers?.map(p => p.type).join(', '));
      return true;
    } else {
      console.log('❌ 後端服務異常，狀態碼:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ 無法連接到後端服務:', error.message);
    console.log('💡 請確保後端服務正在運行 (npm start 或 node index.js)');
    return false;
  }
}

// 主執行函數
async function main() {
  const backendOk = await checkBackendStatus();
  
  if (!backendOk) {
    console.log('\n❌ 後端服務未運行，無法進行測試');
    console.log('請先啟動後端服務：');
    console.log('  cd backend && node index.js');
    return;
  }
  
  console.log('\n');
  await testAIAnalysis();
  
  console.log('\n📊 除錯總結：');
  console.log('1. 檢查哪個測試案例觸發了與用戶相同的錯誤');
  console.log('2. 確認參數傳遞是否正確');
  console.log('3. 驗證後端參數驗證邏輯');
  console.log('4. 檢查前端是否正確設定了 apiUrl 和 model');
}

// 如果直接運行此腳本
if (require.main === module) {
  main().catch(error => {
    console.error('除錯腳本執行失敗:', error);
  });
}

module.exports = {
  testAIAnalysis,
  checkBackendStatus,
  testRequests
}; 