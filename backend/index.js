// backend/index.js
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const app = express();

app.use(cors());
app.use(express.json());

// 載入配置檔案（如果存在）
let config = {};
try {
  config = require('./config.js');
} catch (error) {
  // 配置檔案不存在，使用 UI 設定
}

// 可用的 Gemini 模型
const AVAILABLE_MODELS = [
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro' }
];

// 取得可用的模型列表
app.get('/api/models', (_req, res) => {
  res.json(AVAILABLE_MODELS);
});

// 範例 DDoS 輸出
app.get('/api/attack', (_req, res) => {
  res.json({
    attackDomain: "example.com",
    targetIP: "203.0.113.5",
    targetURL: "http://example.com/login",
    attackTrafficGbps: 5.6,
    sourceList: [
      { ip: "192.168.1.10", country: "US", asn: "AS15169" },
      { ip: "192.168.1.11", country: "CN", asn: "AS4134" },
      { ip: "192.168.1.12", country: "RU", asn: "AS1239" }
    ]
  });
});

// AI 分析端點
app.post('/api/analyze', async (req, res) => {
  try {
    const { apiKey, model, attackData } = req.body;
    
    // 使用配置檔案中的設定或請求中的設定
    const useApiKey = apiKey || config.GEMINI_API_KEY;
    const useModel = model || config.GEMINI_MODEL || 'gemini-1.5-flash';
    
    if (!useApiKey || !attackData) {
      return res.status(400).json({ error: '缺少必要參數' });
    }

    console.log('=== AI 分析開始 ===');
    console.log('使用模型:', useModel);
    console.log('攻擊資料:', JSON.stringify(attackData, null, 2));
    console.log('時間戳:', new Date().toISOString());

    const genAI = new GoogleGenerativeAI(useApiKey);
    const genModel = genAI.getGenerativeModel({ model: useModel });

    // 加入隨機元素讓每次分析都不同
    const analysisId = Math.random().toString(36).substr(2, 9);
    const currentTime = new Date().toLocaleString('zh-TW');
    
    const prompt = `
作為一個網路安全專家，請分析以下 DDoS 攻擊資料並提供專業見解：

分析ID: ${analysisId}
分析時間: ${currentTime}

攻擊資料：
- 目標網域：${attackData.attackDomain}
- 目標IP：${attackData.targetIP}
- 攻擊URL：${attackData.targetURL}
- 攻擊流量：${attackData.attackTrafficGbps} Gbps
- 攻擊來源：${attackData.sourceList.map(src => `${src.ip} (${src.country}, ${src.asn})`).join(', ')}

請提供：
1. 事件概述：根據以上攻擊資料，用您的專業知識分析這次攻擊的特徵、嚴重程度、可能的攻擊動機和影響（限制在100字以內）
2. 防禦建議：根據攻擊來源的地理分佈、流量大小、目標URL等特徵，提供4-5個針對性的防禦措施，每個建議格式為「措施名稱：簡短說明」

重要：請根據實際攻擊資料進行分析，不要使用固定模板。每次分析都應該是獨特的。

請以繁體中文回答，格式為 JSON：
{
  "summary": "您的專業分析",
  "recommendations": [
    "您的具體建議1",
    "您的具體建議2",
    "..."
  ]
}
`;

    console.log('正在調用 Gemini AI...');
    const startTime = Date.now();
    
    const result = await genModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    const endTime = Date.now();
    console.log(`AI 回應時間: ${endTime - startTime}ms`);
    console.log('AI 原始回應:', text.substring(0, 200) + '...');
    
    // 清理回應文本，移除多餘符號
    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    // 嘗試解析 JSON 回應
    try {
      const analysis = JSON.parse(text);
      
      // 進一步清理建議內容
      if (analysis.recommendations && Array.isArray(analysis.recommendations)) {
        analysis.recommendations = analysis.recommendations.map(rec => 
          rec.replace(/^\*\*|\*\*$/g, '') // 移除前後的 **
             .replace(/^["']|["']$/g, '') // 移除前後的引號
             .replace(/^•\s*/, '') // 移除開頭的 •
             .trim()
        );
      }
      
      // 加入 AI 分析的元資料
      analysis.metadata = {
        analysisId: analysisId,
        timestamp: currentTime,
        model: useModel,
        responseTime: `${endTime - startTime}ms`,
        isAIGenerated: true
      };
      
      console.log('AI 分析完成:', analysis);
      res.json(analysis);
    } catch (parseError) {
      console.error('JSON 解析錯誤:', parseError);
      // 如果無法解析為 JSON，返回原始文本
      res.json({
        summary: "AI 分析結果",
        recommendations: [text.replace(/[{}"'`]/g, '')],
        metadata: {
          analysisId: analysisId,
          timestamp: currentTime,
          model: useModel,
          responseTime: `${endTime - startTime}ms`,
          isAIGenerated: true,
          rawResponse: text.substring(0, 500) + '...'
        }
      });
    }
  } catch (error) {
    console.error('AI 分析錯誤:', error);
    res.status(500).json({ 
      error: 'AI 分析失敗',
      details: error.message 
    });
  }
});

// 啟動服務
const port = 8080;
app.listen(port, () => console.log(`Backend API on http://localhost:${port}`));
