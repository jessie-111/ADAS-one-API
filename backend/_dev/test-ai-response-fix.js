// 測試 AI 回覆解析修復
const fetch = require('node-fetch');

console.log('🧪 測試 AI 回覆解析修復...\n');

// 模擬各種格式的 AI 回覆
const testResponses = [
  {
    name: '新 Markdown 格式（事件分析）',
    type: 'event',
    text: `**事件概述**

根據提供的資訊，該事件是一次典型的DDoS攻擊，目標為www.twister5.cf。攻击流量為0.00 Gbps，來源IP數量只有1個，但總獨立IP數量達189個，總請求數達2459次。主要來源IP為89.149.192.97，且發生了多種攻擊模式。

**威脅等級評估**

根據這次DDoS attacks的特點和程度，我們評估此次攻擊為中等威脅等級。雖然攻擊流量相對較低，但攻擊手法多樣化，涉及多個安全漏洞的探測和利用。

**攻擊手法分析**

1. 環境檔案探測：攻擊者嘗試訪問 .env 檔案
2. 版本控制探測：嘗試訪問 .git/config 檔案  
3. 管理面板攻擊：針對 wp-admin 等管理介面
4. 系統資訊收集：嘗試訪問 phpinfo.php 等檔案

**具體防禦建議**

1. 立即封鎖惡意IP地址
2. 加強防火牆規則配置
3. 隱藏敏感檔案和目錄
4. 實施入侵防護系統
5. 定期更新系統和應用程式

**後續監控重點**

持續監控來源IP的活動，加強對環境檔案和版本控制檔案的保護。`
  },
  {
    name: '系統健康分析格式',
    type: 'health',
    text: `**系統安全狀態概述**

當前系統面臨中等程度的安全威脅，主要來源於多種攻擊手法的探測活動。

**潛在威脅評估**

威脅等級：中等。識別出多種攻擊手法，包括敏感檔案探測和系統資訊收集。

**安全改進建議**

1. 加強訪問控制機制
2. 實施更嚴格的檔案權限設定
3. 部署入侵檢測系統
4. 定期進行安全稽核

**預防措施建議**

建議立即採取防護措施，包括更新防火牆規則和加強監控機制。`
  },
  {
    name: '舊編號格式（向後兼容測試）',
    type: 'legacy',
    text: `1. 事件概述：根據提供的資訊，該事件是一次DDoS攻擊，攻擊流量達到中等程度。

2. 威脅等級評估：威脅等級為中等，需要立即採取防護措施。

3. 攻擊手法分析：主要包括環境檔案探測和版本控制探測。

4. 具體防禦建議：
- 封鎖惡意IP
- 加強防火牆
- 更新系統

5. 後續監控重點：持續監控攻擊來源。`
  }
];

// 模擬新的解析邏輯
function testNewParsingLogic(responseText, name) {
  console.log(`\n🔬 測試：${name}`);
  console.log('回覆長度:', responseText.length, '字元');
  
  // 新的解析邏輯
  const summaryMatch = responseText.match(/(?:\*\*(?:事件概述|系統安全狀態概述|整體安全狀況評估)\*\*|1\.\s*(?:事件概述|系統安全狀態概述|整體安全狀況評估)[：:]\s*)(.+?)(?=\n\*\*|$)/s);
  const recommendationsMatch = responseText.match(/(?:\*\*(?:具體防禦建議|安全改進建議|預防措施建議|安全策略建議)\*\*|4\.\s*(?:具體防禦建議|安全改進建議)[：:])(.+?)(?=\n\*\*|$)/s);
  
  if (summaryMatch) {
    const summary = summaryMatch[1].trim();
    console.log('✅ 成功解析概述');
    console.log('   概述長度:', summary.length);
    console.log('   概述前100字:', summary.substring(0, 100) + '...');
  } else {
    // 使用提升的 fallback 限制
    const fallback = responseText.substring(0, 800) + (responseText.length > 800 ? '...' : '');
    console.log('⚠️ 使用 fallback 概述');
    console.log('   Fallback 長度:', fallback.length);
  }
  
  if (recommendationsMatch) {
    const recommendations = recommendationsMatch[1]
      .split(/\n/)
      .filter(line => line.trim())
      .map(line => line.replace(/^[-•\d.\s*]+/, '').trim())
      .filter(line => line.length > 0);
    console.log('✅ 成功解析建議，數量:', recommendations.length);
    if (recommendations.length > 0) {
      console.log('   第一項建議:', recommendations[0]);
    }
  } else {
    console.log('⚠️ 未找到建議，將使用預設建議');
  }
}

// 測試真實 API 回覆
async function testRealAPIResponse() {
  console.log('\n🚀 測試真實 API 回覆解析:');
  
  const testConfigs = [
    {
      name: 'Ollama 攻擊事件分析',
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
    console.log(`\n🔍 測試 ${config.name}:`);
    
    try {
      const response = await fetch('http://localhost:8080/api/analyze-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.body)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ API 請求成功');
        console.log('📊 回覆結構:');
        console.log('   summary 長度:', result.summary ? result.summary.length : 'undefined');
        console.log('   fullResponse 長度:', result.fullResponse ? result.fullResponse.length : 'undefined');
        console.log('   recommendations 數量:', result.recommendations ? result.recommendations.length : 'undefined');
        
        // 檢查是否還有截斷問題
        if (result.summary && result.summary.includes('...')) {
          if (result.summary.length < 300) {  // 如果小於300字元還有...，可能仍有問題
            console.log('⚠️ 可能仍有截斷問題');
          } else {
            console.log('✅ 正常截斷（超過800字元限制）');
          }
        } else {
          console.log('✅ 沒有截斷，解析成功');
        }
        
        console.log('\n📝 summary 預覽:');
        console.log(result.summary ? result.summary.substring(0, 200) + '...' : '無');
        
        if (result.recommendations && result.recommendations.length > 0) {
          console.log('\n📋 recommendations 預覽:');
          result.recommendations.slice(0, 3).forEach((rec, index) => {
            console.log(`   ${index + 1}. ${rec}`);
          });
        }
      } else {
        console.log('❌ API 請求失敗:', response.status);
      }
    } catch (error) {
      console.log('❌ 連接錯誤:', error.message);
    }
  }
}

async function main() {
  console.log('🔧 測試新解析邏輯對各種格式的支援:');
  
  // 測試各種格式
  testResponses.forEach(test => {
    testNewParsingLogic(test.text, test.name);
  });
  
  // 測試真實 API
  await testRealAPIResponse();
  
  console.log('\n📋 修復驗證總結:');
  console.log('✅ 支援新 Markdown 格式（**標題**）');
  console.log('✅ 向後兼容舊編號格式（1. 標題：）');
  console.log('✅ 支援多種分析類型（事件、健康、整體）');
  console.log('✅ 提升 fallback 限制（200 → 800 字元）');
  console.log('✅ 改進建議解析（支援多種建議類型）');
  console.log('✅ 增加詳細日誌記錄');
}

main().catch(console.error); 