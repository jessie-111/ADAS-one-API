// 模擬真實前端 AI 分析請求測試腳本
const fetch = require('node-fetch');

console.log('🧪 測試真實 AI 分析請求...\n');

// 檢查 Ollama 可用模型
async function checkOllamaModels() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json();
    console.log('✅ Ollama 可用模型:');
    data.models.forEach((model, index) => {
      console.log(`  ${index + 1}. ${model.name}`);
    });
    return data.models.map(m => m.name);
  } catch (error) {
    console.log('❌ 無法連接到 Ollama:', error.message);
    return [];
  }
}

// 測試真實的 AI 分析請求
async function testAIAnalysis(config) {
  console.log(`\n🔬 測試配置: ${config.name}`);
  console.log('請求參數:', JSON.stringify(config.body, null, 2));
  
  try {
    const response = await fetch('http://localhost:8080/api/analyze-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config.body)
    });
    
    const result = await response.text();
    
    if (response.ok) {
      console.log('✅ 成功:', result.substring(0, 200) + '...');
    } else {
      console.log('❌ 失敗:', result);
    }
  } catch (error) {
    console.log('❌ 連接錯誤:', error.message);
  }
}

async function main() {
  // 1. 檢查可用模型
  const availableModels = await checkOllamaModels();
  
  if (availableModels.length === 0) {
    console.log('❌ 沒有可用的 Ollama 模型，請先安裝模型');
    return;
  }
  
  // 2. 使用第一個可用模型進行測試
  const testModel = availableModels[0];
  console.log(`\n🎯 使用模型進行測試: ${testModel}`);
  
  // 3. 測試不同配置
  const testConfigs = [
    {
      name: '有效的 Ollama 配置',
      body: {
        provider: 'ollama',
        apiUrl: 'http://localhost:11434',
        model: testModel,
        dataSource: 'file',
        timeRange: '1h'
      }
    },
    {
      name: '無效模型名稱',
      body: {
        provider: 'ollama',
        apiUrl: 'http://localhost:11434',
        model: 'llama2', // 這個模型不存在
        dataSource: 'file',
        timeRange: '1h'
      }
    },
    {
      name: '缺少 apiUrl',
      body: {
        provider: 'ollama',
        model: testModel,
        dataSource: 'file',
        timeRange: '1h'
      }
    }
  ];
  
  // 4. 逐一測試
  for (const config of testConfigs) {
    await testAIAnalysis(config);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
  }
}

main().then(() => {
  console.log('\n🎉 測試完成');
}).catch(error => {
  console.error('❌ 測試失敗:', error);
}); 