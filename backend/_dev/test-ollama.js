// 測試 Ollama AI 功能
const { aiProviderManager } = require('../services/aiProviderManager');
const OllamaClient = require('../services/ollamaClient');

async function testOllamaFunctions() {
  console.log('🧪 開始測試 Ollama AI 功能...\n');
  
  const ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
  
  try {
    // 測試 1: 基本連接測試
    console.log('📡 測試 1: Ollama 連接測試');
    console.log(`連接到: ${ollamaUrl}`);
    
    const ollamaClient = new OllamaClient(ollamaUrl);
    const connectionResult = await ollamaClient.testConnection();
    
    if (connectionResult.success) {
      console.log('✅ Ollama 連接成功');
      console.log(`   可用模型數量: ${connectionResult.modelCount}`);
    } else {
      console.log('❌ Ollama 連接失敗');
      return;
    }
    
    // 測試 2: 獲取模型列表
    console.log('\n📋 測試 2: 獲取 Ollama 模型列表');
    const modelsResult = await ollamaClient.getModels();
    
    if (modelsResult.models.length > 0) {
      console.log(`✅ 成功獲取 ${modelsResult.models.length} 個模型:`);
      modelsResult.models.forEach((model, index) => {
        console.log(`   ${index + 1}. ${model.name} (${model.size})`);
      });
    } else {
      console.log('⚠️  未找到可用的模型，請先下載模型');
      console.log('   提示：運行 ollama pull llama2 來下載一個模型');
      return;
    }
    
    // 測試 3: 使用 AI 提供商管理器
    console.log('\n🎭 測試 3: AI 提供商管理器');
    const testModel = modelsResult.models[0].name;
    console.log(`使用模型: ${testModel}`);
    
    const providerConfig = {
      apiUrl: ollamaUrl,
      model: testModel
    };
    
    // 驗證配置
    try {
      aiProviderManager.validateProviderConfig('ollama', providerConfig);
      console.log('✅ 配置驗證通過');
    } catch (error) {
      console.log('❌ 配置驗證失敗:', error.message);
      return;
    }
    
    // 測試連接
    const testResult = await aiProviderManager.testProvider('ollama', providerConfig);
    console.log('✅ 提供商管理器連接測試成功');
    console.log(`   回應: ${testResult.message}`);
    
    // 測試 4: 內容生成
    console.log('\n🤖 測試 4: 內容生成');
    const testPrompt = "請用繁體中文簡單介紹一下什麼是 DDoS 攻擊，不超過100字。";
    console.log(`提示詞: ${testPrompt}`);
    
    const generateResult = await aiProviderManager.generateContent(
      'ollama', 
      providerConfig, 
      testPrompt
    );
    
    console.log('✅ 內容生成成功');
    console.log(`   模型: ${generateResult.model}`);
    console.log(`   回應時間: ${generateResult.responseTime}ms`);
    console.log(`   回應內容: ${generateResult.text.substring(0, 200)}${generateResult.text.length > 200 ? '...' : ''}`);
    
    // 測試 5: 安全分析模擬
    console.log('\n🛡️ 測試 5: 安全分析模擬');
    const mockAttackData = {
      attackDomain: "example.com",
      attackTrafficGbps: 2.5,
      sourceList: [
        { ip: "192.168.1.100", country: "US", requestCount: 1000 },
        { ip: "192.168.1.101", country: "CN", requestCount: 800 }
      ],
      uniqueIPs: 50,
      totalRequests: 5000,
      topCountries: [
        { item: "US", count: 2000 },
        { item: "CN", count: 1500 }
      ],
      attackPatterns: {
        sensitiveFiles: [{ item: "/.env", count: 10 }],
        adminPanels: [{ item: "/admin/", count: 5 }]
      }
    };
    
    const analysisPrompt = `請分析以下 DDoS 攻擊事件：
攻擊目標: ${mockAttackData.attackDomain}
攻擊流量: ${mockAttackData.attackTrafficGbps} Gbps
攻擊來源: ${mockAttackData.sourceList.length} 個主要IP
總請求數: ${mockAttackData.totalRequests}

請提供簡短的威脅評估和防護建議。`;
    
    const analysisResult = await aiProviderManager.generateContent(
      'ollama',
      providerConfig,
      analysisPrompt
    );
    
    console.log('✅ 安全分析完成');
    console.log(`   分析結果: ${analysisResult.text.substring(0, 300)}${analysisResult.text.length > 300 ? '...' : ''}`);
    
    // 測試總結
    console.log('\n🎉 Ollama 功能測試完成！');
    console.log('所有測試項目都通過了，Ollama AI 整合成功。');
    
    // 提供使用指引
    console.log('\n💡 使用指南:');
    console.log('1. 確保 Ollama 服務正在運行 (ollama serve)');
    console.log('2. 在前端選擇「本地端 Ollama AI」');
    console.log(`3. 輸入 API URL: ${ollamaUrl}`);
    console.log(`4. 選擇模型: ${testModel}`);
    console.log('5. 點擊「測試連接」驗證設定');
    console.log('6. 開始使用本地端 AI 進行安全分析！');
    
  } catch (error) {
    console.error('❌ Ollama 測試失敗:', error);
    console.log('\n🔧 故障排除建議:');
    console.log('1. 檢查 Ollama 服務是否運行: ollama serve');
    console.log('2. 檢查 Ollama 是否安裝: ollama --version');
    console.log('3. 下載至少一個模型: ollama pull llama2');
    console.log(`4. 確認 API URL 正確: ${ollamaUrl}`);
    console.log('5. 檢查防火牆設定是否阻擋連接');
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  testOllamaFunctions();
}

module.exports = {
  testOllamaFunctions
}; 