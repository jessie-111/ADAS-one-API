// 測試 AI 分析功能
const config = require('./config.js');

async function testAIAnalysis() {
  console.log('🧪 測試 AI 分析功能...\n');
  
  const testData = {
    attackDomain: "example.com",
    targetIP: "203.0.113.5",
    targetURL: "http://example.com/login",
    attackTrafficGbps: 5.6,
    sourceList: [
      { ip: "192.168.1.10", country: "US", asn: "AS15169" },
      { ip: "192.168.1.11", country: "CN", asn: "AS4134" },
      { ip: "192.168.1.12", country: "RU", asn: "AS1239" }
    ]
  };

  try {
    const response = await fetch('http://localhost:8080/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attackData: testData
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ AI 分析成功！\n');
      console.log('📊 分析結果：');
      console.log('事件概述：', result.summary);
      console.log('\n🛡️ 防禦建議：');
      result.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      
      if (result.metadata) {
        console.log('\n🔍 驗證資訊：');
        console.log('- 分析ID:', result.metadata.analysisId);
        console.log('- 分析時間:', result.metadata.timestamp);
        console.log('- AI 模型:', result.metadata.model);
        console.log('- 回應時間:', result.metadata.responseTime);
        console.log('- 真實 AI 生成:', result.metadata.isAIGenerated ? '✅ 是' : '❌ 否');
      }
    } else {
      const error = await response.json();
      console.log('❌ 測試失敗：', error.error);
    }
  } catch (error) {
    console.log('❌ 連接失敗：', error.message);
  }
}

console.log('⚙️ 使用設定：');
console.log('- API Key:', config.GEMINI_API_KEY ? '已設定' : '未設定');
console.log('- 模型:', config.GEMINI_MODEL || 'gemini-1.5-flash');
console.log('');

testAIAnalysis(); 