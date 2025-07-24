// 測試物件格式的AI回應處理
const testObjectResponse = () => {
  console.log('🧪 測試物件格式的AI回應處理...\n');

  // 模擬AI返回的物件格式回應（類似錯誤中的情況）
  const mockAIResponse = {
    summary: {
      attack_correlation_interpretation: "多個IP之間存在明顯的協調攻擊模式",
      coordinated_attack_assessment: "檢測到來自不同地理位置的同步攻擊行為",
      multi_target_attack_analysis: "攻擊者針對多個子域名進行分散式攻擊",
      infrastructure_threat: "目標基礎設施面臨嚴重威脅",
      attack_technique_combination: "結合了DDoS和Host Header偽造技術", 
      host_header_forgery: "發現Host Header偽造攻擊跡象",
      threat_actor_profiling: "攻擊者具備高級技術能力",
      overall_threat_level: "高風險"
    },
    recommendations: [
      "立即啟動DDoS防護機制",
      "監控Host Header請求",
      "加強IP過濾規則"
    ]
  };

  // 模擬處理邏輯（從 backend/index.js 複製的邏輯）
  const processAIResponse = (analysis) => {
    // 確保必要的屬性存在且格式正確
    if (!analysis.summary) {
      analysis.summary = "AI 分析完成，但摘要格式異常";
    } else if (typeof analysis.summary === 'object') {
      // 如果 summary 是物件，將其轉換為可讀的字串
      if (analysis.summary !== null) {
        const summaryParts = [];
        for (const [key, value] of Object.entries(analysis.summary)) {
          const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          summaryParts.push(`**${formattedKey}**: ${String(value)}`);
        }
        analysis.summary = summaryParts.join('\n\n');
      } else {
        analysis.summary = "AI 分析完成，但摘要格式異常";
      }
    }
    
    if (!analysis.recommendations) {
      analysis.recommendations = ["請檢查系統安全設定"];
    } else if (!Array.isArray(analysis.recommendations)) {
      // 如果 recommendations 不是陣列，轉換為陣列
      analysis.recommendations = [String(analysis.recommendations)];
    }

    return analysis;
  };

  console.log('📥 原始AI回應:');
  console.log('Summary 類型:', typeof mockAIResponse.summary);
  console.log('Summary 內容:', Object.keys(mockAIResponse.summary));
  console.log('Recommendations 類型:', typeof mockAIResponse.recommendations);
  console.log('Recommendations 是陣列:', Array.isArray(mockAIResponse.recommendations));

  // 處理回應
  const processedResponse = processAIResponse({...mockAIResponse});

  console.log('\n📤 處理後的回應:');
  console.log('Summary 類型:', typeof processedResponse.summary);
  console.log('Summary 內容預覽:', processedResponse.summary.substring(0, 100) + '...');
  console.log('Recommendations 類型:', typeof processedResponse.recommendations);
  console.log('Recommendations 是陣列:', Array.isArray(processedResponse.recommendations));
  console.log('Recommendations 數量:', processedResponse.recommendations.length);

  console.log('\n✅ 完整處理後的 Summary:');
  console.log(processedResponse.summary);

  console.log('\n✅ 完整處理後的 Recommendations:');
  processedResponse.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });

  // 測試其他邊界情況
  console.log('\n🧪 測試邊界情況...');

  // 測試 recommendations 不是陣列的情況
  const testCase1 = {
    summary: "正常字串摘要",
    recommendations: "單一建議字串"
  };

  const processed1 = processAIResponse({...testCase1});
  console.log('案例1 - recommendations 單一字串:');
  console.log('處理後是陣列:', Array.isArray(processed1.recommendations));
  console.log('內容:', processed1.recommendations);

  // 測試 summary 為 null 的情況
  const testCase2 = {
    summary: null,
    recommendations: ["正常建議"]
  };

  const processed2 = processAIResponse({...testCase2});
  console.log('\n案例2 - summary 為 null:');
  console.log('處理後的 summary:', processed2.summary);

  console.log('\n🎉 所有測試完成！');
};

// 執行測試
testObjectResponse(); 