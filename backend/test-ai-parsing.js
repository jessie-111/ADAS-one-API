// 測試 AI 回應解析錯誤處理
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

// 模擬不同類型的AI回應來測試錯誤處理
const testResponses = [
  // 正常JSON回應
  `{
    "summary": "這是正常的分析摘要",
    "recommendations": ["建議1", "建議2", "建議3"]
  }`,
  
  // 非JSON回應（類似錯誤中的情況）
  `好的，作為網路安全專家，我來分析這些日誌資料：
  
  根據分析，我發現以下問題：
  - 存在DDoS攻擊跡象
  - IP來源集中在特定區域
  - 請求模式異常
  
  建議採取以下措施：
  1. 加強防火牆設定
  2. 監控異常流量
  3. 實施率限制`,
  
  // 包含JSON但有前綴的回應
  `好的，分析結果如下：
  {
    "summary": "發現潛在攻擊",
    "recommendations": ["強化防護", "監控流量"]
  }`,
  
  // 格式錯誤的JSON
  `{
    "summary": "分析摘要",
    "recommendations": [建議1, 建議2]
  }`,
  
  // recommendations不是陣列的情況
  `{
    "summary": "分析摘要",
    "recommendations": "單一建議字串"
  }`
];

// 模擬getAIAssessment函數的核心解析邏輯
function testAIResponseParsing(text, testName) {
  console.log(`\n🧪 測試: ${testName}`);
  console.log(`輸入: ${text.substring(0, 100)}...`);
  
  try {
    // 移除markdown標記
    let processedText = text.replace(/```json\s*|```\s*/g, '').trim();
    
    // 嘗試從非JSON回應中提取JSON部分
    if (!processedText.startsWith('{') && processedText.includes('{')) {
      const jsonStart = processedText.indexOf('{');
      processedText = processedText.substring(jsonStart);
    }
    
    try {
      const analysis = JSON.parse(processedText);
      
      // 確保必要的屬性存在
      if (!analysis.summary) {
        analysis.summary = "AI 分析完成，但摘要格式異常";
      }
      
      if (!analysis.recommendations) {
        analysis.recommendations = ["請檢查系統安全設定"];
      }
      
      // 安全地處理 recommendations 陣列
      if (analysis.recommendations && Array.isArray(analysis.recommendations)) {
        analysis.recommendations = analysis.recommendations.map(rec => {
          // 確保每個建議都是字串類型
          if (typeof rec === 'string') {
            return rec.replace(/^\*\*|\*\*$/g, '').replace(/^["']|["']$/g, '').replace(/^•\s*/, '').trim();
          } else if (typeof rec === 'object' && rec !== null) {
            // 如果是物件，嘗試轉換為字串
            return JSON.stringify(rec);
          } else {
            // 其他類型轉為字串
            return String(rec || '').trim();
          }
        }).filter(rec => rec.length > 0); // 過濾空字串
      } else {
        // 如果recommendations不是陣列，轉換為陣列
        analysis.recommendations = [String(analysis.recommendations || "請檢查系統安全設定")];
      }
      
      console.log('✅ JSON 解析成功');
      console.log('📝 摘要:', analysis.summary.substring(0, 50) + '...');
      console.log('💡 建議數量:', analysis.recommendations.length);
      return analysis;
      
    } catch (parseError) {
      console.log('⚠️ JSON 解析失敗，使用備用方案');
      
      // 嘗試從自然語言回應中提取有用信息
      let summary = processedText;
      let recommendations = [];
      
      // 如果回應太長，截取前500字元作為摘要
      if (summary.length > 500) {
        summary = summary.substring(0, 500) + '...';
      }
      
      // 嘗試提取建議（尋找列表格式的文字）
      const suggestionPatterns = ['建議', '建議', '應該', '需要', '可以', '推薦'];
      const lines = processedText.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.length > 0) {
          // 檢查是否包含建議關鍵字
          for (const pattern of suggestionPatterns) {
            if (trimmedLine.includes(pattern) && trimmedLine.length > 10) {
              recommendations.push(trimmedLine);
              break;
            }
          }
          // 檢查是否是列表項目
          if ((trimmedLine.startsWith('-') || trimmedLine.startsWith('•') || trimmedLine.startsWith('*') || trimmedLine.match(/^\d+\./)) && trimmedLine.length > 5) {
            recommendations.push(trimmedLine.replace(/^[-•*\d+.]\s*/, ''));
          }
        }
      }
      
      // 如果沒有找到建議，使用預設建議
      if (recommendations.length === 0) {
        recommendations = [
          '檢查防火牆設定是否適當',
          '監控異常流量模式',
          '定期更新安全規則',
          '加強訪問控制機制'
        ];
      }
      
      console.log('✅ 備用解析成功');
      console.log('📝 摘要:', summary.substring(0, 50) + '...');
      console.log('💡 建議數量:', recommendations.length);
      
      return {
        summary: summary,
        recommendations: recommendations.slice(0, 10), // 最多10個建議
        metadata: {
          parseError: true,
          originalResponse: processedText.substring(0, 100)
        }
      };
    }
  } catch (error) {
    console.log('❌ 處理失敗:', error.message);
    return {
      summary: "處理錯誤",
      recommendations: ["請檢查系統狀態"],
      metadata: {
        error: error.message
      }
    };
  }
}

// 執行測試
async function runTests() {
  console.log('🚀 開始測試 AI 回應解析錯誤處理...\n');
  
  const testNames = [
    '正常JSON回應',
    '自然語言回應',
    '混合格式回應',
    '格式錯誤JSON',
    'recommendations非陣列'
  ];
  
  for (let i = 0; i < testResponses.length; i++) {
    const result = testAIResponseParsing(testResponses[i], testNames[i]);
    
    // 驗證結果結構
    if (result && result.summary && Array.isArray(result.recommendations)) {
      console.log('✅ 結果結構正確');
    } else {
      console.log('❌ 結果結構異常');
    }
  }
  
  console.log('\n🎉 測試完成！');
}

// 執行測試
runTests().catch(console.error); 