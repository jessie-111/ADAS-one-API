// 診斷用戶 Ollama 配置問題
const fetch = require('node-fetch');

console.log('🩺 診斷用戶 Ollama 配置問題...\n');

// 模擬不同的用戶狀態
const userScenarios = [
  {
    name: '情境 1: 初始狀態 - 沒有 localStorage',
    aiConfig: undefined, // 模擬 aiConfig 未正確傳遞
    localStorage: {}
  },
  {
    name: '情境 2: aiConfig 存在但 ollama 為空',
    aiConfig: {
      provider: 'ollama',
      gemini: { apiKey: '', selectedModel: '' },
      ollama: { apiUrl: '', selectedModel: '' } // 空值
    },
    localStorage: {}
  },
  {
    name: '情境 3: aiConfig 正確但 localStorage 不一致',
    aiConfig: {
      provider: 'ollama',
      gemini: { apiKey: '', selectedModel: '' },
      ollama: { apiUrl: 'http://localhost:11434', selectedModel: 'llama3.2:3b' }
    },
    localStorage: {
      'ollama_api_url': null,
      'ollama_model': null
    }
  },
  {
    name: '情境 4: 完整配置',
    aiConfig: {
      provider: 'ollama',
      gemini: { apiKey: '', selectedModel: '' },
      ollama: { apiUrl: 'http://localhost:11434', selectedModel: 'llama3.2:3b' }
    },
    localStorage: {
      'ollama_api_url': 'http://localhost:11434',
      'ollama_model': 'llama3.2:3b'
    }
  }
];

// 模擬前端邏輯
function simulateFrontendLogic(scenario) {
  console.log(`\n🧪 ${scenario.name}`);
  console.log('模擬配置:', JSON.stringify(scenario.aiConfig, null, 2));
  
  const aiConfig = scenario.aiConfig;
  const provider = aiConfig?.provider || 'gemini';
  
  console.log('選擇的提供商:', provider);
  
  if (provider === 'ollama') {
    // 模擬前端的變數設定邏輯
    const apiUrl = aiConfig?.ollama?.apiUrl || 
                   scenario.localStorage['ollama_api_url'] || 
                   'http://localhost:11434';
    const model = aiConfig?.ollama?.selectedModel || 
                  scenario.localStorage['ollama_model'];
    
    console.log('計算結果:');
    console.log('  apiUrl:', apiUrl);
    console.log('  model:', model);
    
    // 模擬前端驗證邏輯
    if (!apiUrl || !model) {
      console.log('❌ 前端驗證失敗: 請先在「AI分析設定」頁面設定 Ollama API 網址和模型');
      return { success: false, reason: 'frontend_validation' };
    }
    
    console.log('✅ 前端驗證通過');
    return { success: true, apiUrl, model };
  }
  
  return { success: false, reason: 'not_ollama' };
}

// 測試所有情境
async function testAllScenarios() {
  for (const scenario of userScenarios) {
    const result = simulateFrontendLogic(scenario);
    
    if (result.success) {
      console.log('  → 應該會發送 API 請求');
      
      // 模擬 API 請求
      try {
        const response = await fetch('http://localhost:8080/api/analyze-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'ollama',
            apiUrl: result.apiUrl,
            model: result.model,
            dataSource: 'file',
            timeRange: '1h'
          })
        });
        
        if (response.ok) {
          console.log('  → ✅ API 請求成功');
        } else {
          const errorText = await response.text();
          console.log('  → ❌ API 請求失敗:', errorText.substring(0, 100));
        }
      } catch (error) {
        console.log('  → ❌ 連接失敗:', error.message);
      }
    } else {
      console.log('  → ❌ 不會發送 API 請求，原因:', result.reason);
    }
  }
}

async function main() {
  // 首先檢查 Ollama 服務狀態
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json();
    console.log('✅ Ollama 服務正常，可用模型:');
    data.models.slice(0, 3).forEach(model => {
      console.log(`  - ${model.name}`);
    });
  } catch (error) {
    console.log('❌ Ollama 服務不可用:', error.message);
    return;
  }
  
  // 檢查後端服務
  try {
    const response = await fetch('http://localhost:8080/api/test-ai/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'test' })
    });
    console.log('✅ 後端服務正常');
  } catch (error) {
    console.log('❌ 後端服務不可用:', error.message);
    return;
  }
  
  // 測試各種情境
  await testAllScenarios();
  
  console.log('\n📋 診斷總結:');
  console.log('1. 如果用戶遇到 "Ollama API 配置無效" 錯誤，很可能是情境 1 或 2');
  console.log('2. 檢查前端 aiConfig 是否正確從 AISettingsConfig 傳遞到 DDoSGraph');
  console.log('3. 檢查用戶是否正確保存了 AI 設定');
}

main().catch(console.error); 