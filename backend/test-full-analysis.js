// 測試完整的 ELK AI 分析
require('dotenv').config();

async function testFullELKAnalysis() {
  console.log('🧪 測試完整的 ELK AI 分析...');
  console.log('');
  
  try {
    const config = {
      apiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-2.5-flash',
      timeRange: '24h'
    };
    
    console.log('配置:', {
      apiKey: config.apiKey ? '✅ 已設定' : '❌ 未設定',
      model: config.model,
      timeRange: config.timeRange
    });
    
    if (!config.apiKey) {
      console.error('❌ 請設定 GEMINI_API_KEY 環境變數');
      return;
    }
    
    console.log('\n🔍 開始執行 ELK 分析...');
    
    // 通過 HTTP API 調用
    const response = await fetch('http://localhost:8080/api/analyze-elk-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: config.apiKey,
        model: config.model,
        timeRange: config.timeRange,
        dataSource: 'elk'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    
    console.log('\n✅ AI 分析完成！');
    console.log('\n📊 分析結果摘要:');
    console.log('事件概述長度:', result.summary?.length || 0);
    console.log('防禦建議數量:', result.recommendations?.length || 0);
    
    if (result.attackData) {
      console.log('\n🚨 攻擊資料摘要:');
      console.log('主要攻擊域名:', result.attackData.attackDomain);
      if (result.attackData.claimedDomain) {
        console.log('偽造域名:', result.attackData.claimedDomain, '⚠️');
      }
      if (result.attackData.allAttacks) {
        console.log('總攻擊事件數:', result.attackData.allAttacks.length);
        console.log('所有攻擊域名:');
        result.attackData.allAttacks.forEach((attack, index) => {
          console.log(`  ${index + 1}. ${attack.domain}${attack.claimedDomain ? ` (偽造: ${attack.claimedDomain})` : ''}`);
          console.log(`     嚴重程度: ${attack.severity}, 來源: ${attack.sourceCount} IP`);
        });
      }
    }
    
    console.log('\n📝 完整分析結果:');
    console.log('=== 事件概述 ===');
    console.log(result.summary || '無');
    
    console.log('\n=== 防禦建議 ===');
    if (result.recommendations && Array.isArray(result.recommendations)) {
      result.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    } else {
      console.log('無防禦建議');
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error('錯誤堆疊:', error.stack);
  }
}

// 執行測試
testFullELKAnalysis().catch(console.error); 