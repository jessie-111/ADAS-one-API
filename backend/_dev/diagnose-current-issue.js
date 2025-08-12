// 診斷當前用戶問題
const fetch = require('node-fetch');

console.log('🩺 診斷當前 Ollama 配置問題...\n');

async function checkServices() {
  console.log('🔍 檢查服務狀態:');
  
  // 檢查後端
  try {
    const backendResponse = await fetch('http://localhost:8080/api/test-ai/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'test' })
    });
    console.log('✅ 後端服務 (8080):', backendResponse.status === 400 ? '正常運行' : '異常');
  } catch (error) {
    console.log('❌ 後端服務 (8080): 未運行');
  }
  
  // 檢查前端
  try {
    await fetch('http://localhost:3000');
    console.log('✅ 前端服務 (3000): 正常運行');
  } catch (error) {
    console.log('❌ 前端服務 (3000): 未運行 - 這就是問題所在！');
  }
  
  // 檢查 Ollama
  try {
    const ollamaResponse = await fetch('http://localhost:11434/api/tags');
    if (ollamaResponse.ok) {
      const data = await ollamaResponse.json();
      console.log('✅ Ollama 服務 (11434): 正常運行');
      console.log('   可用模型:', data.models.slice(0, 3).map(m => m.name).join(', '));
    }
  } catch (error) {
    console.log('❌ Ollama 服務 (11434): 未運行');
  }
  
  console.log();
}

async function testDirectRequest() {
  console.log('🧪 測試直接 API 請求:');
  
  const testConfigs = [
    {
      name: 'Gemini 配置',
      body: {
        provider: 'gemini',
        apiKey: 'test_key',
        model: 'gemini-1.5-flash',
        dataSource: 'file',
        timeRange: '1h'
      }
    },
    {
      name: 'Ollama 配置',
      body: {
        provider: 'ollama',
        apiUrl: 'http://localhost:11434',
        model: 'llama3.2:3b',
        dataSource: 'file',
        timeRange: '1h'
      }
    }
  ];
  
  for (const config of testConfigs) {
    console.log(`  測試 ${config.name}:`);
    
    try {
      const response = await fetch('http://localhost:8080/api/analyze-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.body)
      });
      
      if (response.ok) {
        console.log('    ✅ 成功');
      } else {
        const errorText = await response.text();
        console.log('    ❌ 失敗:', response.status);
        if (errorText.includes('Ollama API 配置無效')) {
          console.log('    📝 錯誤: 前端錯誤訊息 (表示問題在前端驗證)');
        } else {
          console.log('    📝 錯誤:', errorText.substring(0, 100));
        }
      }
    } catch (error) {
      console.log('    ❌ 連接錯誤:', error.message);
    }
  }
  
  console.log();
}

async function checkAIConfig() {
  console.log('🔧 模擬前端 AI 配置檢查:');
  
  // 模擬可能的前端狀態
  const scenarios = [
    {
      name: '用戶可能的配置 1',
      aiConfig: {
        provider: 'ollama',
        gemini: { apiKey: '', selectedModel: '' },
        ollama: { apiUrl: 'http://localhost:11434', selectedModel: 'llama3.2:3b' }
      }
    },
    {
      name: '用戶可能的配置 2', 
      aiConfig: {
        provider: 'ollama',
        gemini: { apiKey: '', selectedModel: '' },
        ollama: { apiUrl: '', selectedModel: '' } // 空配置
      }
    }
  ];
  
  scenarios.forEach(scenario => {
    console.log(`  ${scenario.name}:`);
    const aiConfig = scenario.aiConfig;
    const provider = aiConfig?.provider || 'gemini';
    
    if (provider === 'ollama') {
      const apiUrl = aiConfig?.ollama?.apiUrl || 'http://localhost:11434';
      const model = aiConfig?.ollama?.selectedModel || '';
      
      console.log(`    provider: ${provider}`);
      console.log(`    apiUrl: ${apiUrl}`);
      console.log(`    model: ${model}`);
      
      // 模擬新的驗證邏輯
      if (!apiUrl || !model || model.trim() === '') {
        console.log('    結果: ❌ 前端驗證失敗 (這可能是用戶遇到的問題)');
      } else {
        console.log('    結果: ✅ 前端驗證通過');
      }
    }
    console.log();
  });
}

async function main() {
  await checkServices();
  await testDirectRequest();
  await checkAIConfig();
  
  console.log('📋 診斷結論:');
  console.log('1. 如果前端服務未運行，用戶看到的是舊版本的代碼');
  console.log('2. 修復的代碼需要前端服務重新啟動才能生效');
  console.log('3. 用戶需要重新啟動前端服務並清除瀏覽器緩存');
  console.log('4. 檢查用戶的 AI 設定是否正確保存');
}

main().catch(console.error); 