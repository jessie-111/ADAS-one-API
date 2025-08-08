 import React, { useState, useEffect } from "react";

export default function AISettingsConfig({ onConfigChange }) {
  // AI 提供商相關狀態
  const [aiProvider, setAiProvider] = useState('gemini'); // 'gemini' | 'ollama'
  
  // Gemini 配置狀態
  const [geminiConfig, setGeminiConfig] = useState({
    apiKey: '',
    selectedModel: ''
  });
  
  // Ollama 配置狀態
  const [ollamaConfig, setOllamaConfig] = useState({
    apiUrl: 'http://localhost:11434',
    selectedModel: '',
    models: []
  });
  
  // 通用狀態
  const [geminiModels, setGeminiModels] = useState([]);
  const [testStatus, setTestStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 從 localStorage 載入設定
  useEffect(() => {
    // 載入 AI 提供商選擇
    const savedProvider = localStorage.getItem('ai_provider');
    if (savedProvider) setAiProvider(savedProvider);
    
    // 載入 Gemini 配置
    const savedGeminiApiKey = localStorage.getItem('gemini_api_key');
    const savedGeminiModel = localStorage.getItem('gemini_model');
    if (savedGeminiApiKey || savedGeminiModel) {
      setGeminiConfig({
        apiKey: savedGeminiApiKey || '',
        selectedModel: savedGeminiModel || ''
      });
    }
    
    // 載入 Ollama 配置
    const savedOllamaUrl = localStorage.getItem('ollama_api_url');
    const savedOllamaModel = localStorage.getItem('ollama_model');
    

    
    // 總是載入配置，即使其中一個為空
    setOllamaConfig(prev => ({
      ...prev,
      apiUrl: savedOllamaUrl || 'http://localhost:11434',
      selectedModel: savedOllamaModel || '',
      models: [] // 重置模型列表，將在下面重新載入
    }));
    
    // 總是嘗試載入模型列表（使用默認 URL 如果沒有保存的）
    const urlToUse = savedOllamaUrl || 'http://localhost:11434';
    
    // 延遲載入，確保組件已完全初始化
    setTimeout(() => {
      loadOllamaModelsIfNeeded(urlToUse, savedOllamaModel);
    }, 200);
  }, []);

  // 當配置改變時，通知父元件
  useEffect(() => {
    if (onConfigChange) {
      const config = {
        provider: aiProvider,
        gemini: geminiConfig,
        ollama: ollamaConfig
      };
      onConfigChange(config);
    }
  }, [aiProvider, geminiConfig, ollamaConfig, onConfigChange]);

  // 載入 Gemini 可用模型
  useEffect(() => {
    const loadGeminiModels = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/models');
        if (response.ok) {
          const data = await response.json();
          setGeminiModels(data);
          if (data.length > 0 && !geminiConfig.selectedModel) {
            setGeminiConfig(prev => ({
              ...prev,
              selectedModel: data[0].id
            }));
          }
        } else {
          console.error('載入 Gemini 模型失敗: HTTP', response.status);
          setTestStatus('❌ 無法載入 Gemini 模型列表，請檢查後端服務');
        }
      } catch (error) {
        console.error('載入 Gemini 模型失敗:', error);
        setTestStatus('❌ 連接後端失敗，請確認服務是否運行');
      }
    };
    
    loadGeminiModels();
  }, [geminiConfig.selectedModel]);

  // 載入 Ollama 可用模型（保持當前選擇）
  const loadOllamaModelsIfNeeded = async (apiUrl, savedModel = null) => {
    if (!apiUrl) return;
    
    try {
      const response = await fetch('http://localhost:8080/api/ollama/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl })
      });
      
      if (response.ok) {
        const data = await response.json();
        const models = data.models || [];
        
        setOllamaConfig(prev => ({
          ...prev,
          models: models,
          // 如果有保存的模型且在模型列表中，保持選擇；否則保持原有選擇
          selectedModel: savedModel && models.find(m => m.name === savedModel) ? 
                       savedModel : 
                       prev.selectedModel
        }));
      }
    } catch (error) {
      // 靜默處理，不影響頁面載入
    }
  };

  // 載入 Ollama 可用模型（手動觸發）
  const loadOllamaModels = async () => {
    if (!ollamaConfig.apiUrl) return;
    
    try {
      setTestStatus('正在載入 Ollama 模型列表...');
      const response = await fetch('http://localhost:8080/api/ollama/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl: ollamaConfig.apiUrl })
      });
      
      if (response.ok) {
        const data = await response.json();
        setOllamaConfig(prev => ({
          ...prev,
          models: data.models || []
          // 保持 selectedModel 不變
        }));
        setTestStatus('✅ Ollama 模型列表載入成功');
        setTimeout(() => setTestStatus(''), 3000);
      } else {
        const error = await response.json();
        setTestStatus(`❌ 載入 Ollama 模型失敗: ${error.error}`);
      }
    } catch (error) {
      setTestStatus(`❌ 連接 Ollama 失敗: ${error.message}`);
    }
  };

  // 保存設定到 localStorage
  const handleSave = () => {
    // 保存 AI 提供商選擇
    localStorage.setItem('ai_provider', aiProvider);
    
    // 保存 Gemini 配置
    localStorage.setItem('gemini_api_key', geminiConfig.apiKey);
    localStorage.setItem('gemini_model', geminiConfig.selectedModel);
    
    // 保存 Ollama 配置
    localStorage.setItem('ollama_api_url', ollamaConfig.apiUrl);
    localStorage.setItem('ollama_model', ollamaConfig.selectedModel);
    
    setTestStatus('✅ 設定已保存');
    setTimeout(() => setTestStatus(''), 3000);
  };

  // 測試連接
  const handleTest = async () => {
    const currentConfig = aiProvider === 'gemini' ? geminiConfig : ollamaConfig;
    
    if (aiProvider === 'gemini') {
      if (!currentConfig.apiKey || !currentConfig.selectedModel) {
        setTestStatus('請填寫 Gemini API Key 並選擇模型');
        return;
      }
    } else if (aiProvider === 'ollama') {
      if (!currentConfig.apiUrl || !currentConfig.selectedModel) {
        setTestStatus('請填寫 Ollama API URL 並選擇模型');
        return;
      }
    }

    setIsLoading(true);
    setTestStatus('測試中...');

    try {
      // 根據AI提供商選擇正確的端點
      const endpoint = aiProvider === 'gemini' 
        ? 'http://localhost:8080/api/test-ai'           // Gemini使用通用端點
        : 'http://localhost:8080/api/test-ai/ollama';   // Ollama使用專用端點
      
      const requestBody = aiProvider === 'gemini' 
        ? { apiKey: currentConfig.apiKey, model: currentConfig.selectedModel }
        : { apiUrl: currentConfig.apiUrl, model: currentConfig.selectedModel };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setTestStatus(`✅ ${aiProvider === 'gemini' ? 'Gemini' : 'Ollama'} 連接成功！${result.message}`);
          // 自動保存成功的設定
          handleSave();
        } else {
          setTestStatus(`❌ 測試失敗: ${result.error}`);
        }
      } else {
        const error = await response.json();
        setTestStatus(`❌ 連接失敗: ${error.error || error.details || '未知錯誤'}`);
      }
    } catch (error) {
      setTestStatus(`❌ 連接失敗: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "#22263a",
        color: "#fff",
        borderRadius: 10,
        padding: 24,
        width: 900,
        margin: "auto"
      }}
    >
      <h3 style={{ color: "#49cfff", marginBottom: 24 }}>AI 助手設定</h3>
      
      {/* AI 提供商選擇器 */}
      <div style={{ marginBottom: 32 }}>
        <label style={{ display: "block", marginBottom: 16, fontWeight: "bold", fontSize: 16 }}>
          選擇 AI 提供商:
        </label>
        <div style={{ display: "flex", gap: 24 }}>
          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              padding: "12px 20px",
              borderRadius: 8,
              border: aiProvider === 'gemini' ? "2px solid #49cfff" : "2px solid #444",
              background: aiProvider === 'gemini' ? "#1a2332" : "#181a28",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
            onClick={() => setAiProvider('gemini')}
          >
            <input 
              type="radio" 
              value="gemini" 
              checked={aiProvider === 'gemini'}
              onChange={(e) => setAiProvider(e.target.value)}
              style={{ marginRight: 12 }}
            />
            <label style={{ cursor: "pointer", fontSize: 14, fontWeight: "bold" }}>
              ☁️ 雲端 Gemini AI
            </label>
          </div>
          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              padding: "12px 20px",
              borderRadius: 8,
              border: aiProvider === 'ollama' ? "2px solid #49cfff" : "2px solid #444",
              background: aiProvider === 'ollama' ? "#1a2332" : "#181a28",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
            onClick={() => setAiProvider('ollama')}
          >
            <input 
              type="radio" 
              value="ollama" 
              checked={aiProvider === 'ollama'}
              onChange={(e) => setAiProvider(e.target.value)}
              style={{ marginRight: 12 }}
            />
            <label style={{ cursor: "pointer", fontSize: 14, fontWeight: "bold" }}>
              🏠 本地端 Ollama AI
            </label>
          </div>
        </div>
      </div>

      {/* Gemini 配置區塊 */}
      {aiProvider === 'gemini' && (
        <div style={{ background: "#181a28", borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <h4 style={{ color: "#49cfff", marginBottom: 16, marginTop: 0 }}>Gemini AI 配置</h4>
          
          {/* API Key 輸入 */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
              Gemini API Key:
            </label>
            <input
              type="password"
              value={geminiConfig.apiKey}
              onChange={(e) => setGeminiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              placeholder="請輸入您的 Gemini API Key"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid #49cfff",
                background: "#22263a",
                color: "#fff",
                fontSize: 14,
                boxSizing: "border-box"
              }}
            />
            <div style={{ fontSize: 12, color: "#b5b8c6", marginTop: 8 }}>
              您可以在 <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: "#49cfff" }}>Google AI Studio</a> 取得免費的 API Key
            </div>
          </div>

          {/* 模型選擇 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
              選擇 Gemini 模型:
            </label>
            <select
              value={geminiConfig.selectedModel}
              onChange={(e) => setGeminiConfig(prev => ({ ...prev, selectedModel: e.target.value }))}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid #49cfff",
                background: "#22263a",
                color: "#fff",
                fontSize: 14,
                boxSizing: "border-box"
              }}
            >
              {geminiModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Ollama 配置區塊 */}
      {aiProvider === 'ollama' && (
        <div style={{ background: "#181a28", borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <h4 style={{ color: "#4ecdc4", marginBottom: 16, marginTop: 0 }}>Ollama AI 配置</h4>
          
          {/* API URL 輸入 */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
              Ollama API URL:
            </label>
            <div style={{ display: "flex", gap: 12 }}>
              <input
                type="url"
                value={ollamaConfig.apiUrl}
                onChange={(e) => setOllamaConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
                placeholder="http://localhost:11434"
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid #4ecdc4",
                  background: "#22263a",
                  color: "#fff",
                  fontSize: 14,
                  boxSizing: "border-box"
                }}
              />
              <button
                onClick={loadOllamaModels}
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid #4ecdc4",
                  background: "transparent",
                  color: "#4ecdc4",
                  fontWeight: "bold",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                載入模型
              </button>
            </div>
            <div style={{ fontSize: 12, color: "#b5b8c6", marginTop: 8 }}>
              請確保 Ollama 服務正在運行，預設端口為 11434
            </div>
          </div>

          {/* 模型選擇 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
              選擇 Ollama 模型:
            </label>
            <select
              value={ollamaConfig.selectedModel}
              onChange={(e) => setOllamaConfig(prev => ({ ...prev, selectedModel: e.target.value }))}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid #4ecdc4",
                background: "#22263a",
                color: "#fff",
                fontSize: 14,
                boxSizing: "border-box"
              }}
            >
              <option value="">
                {ollamaConfig.models.length === 0 ? '請先載入模型列表' : '請選擇模型'}
              </option>
              
              {/* 如果已選擇的模型不在模型列表中，顯示為已選擇但不可用 */}
              {ollamaConfig.selectedModel && 
               !ollamaConfig.models.some(model => model.name === ollamaConfig.selectedModel) && (
                <option key={`selected-${ollamaConfig.selectedModel}`} value={ollamaConfig.selectedModel}>
                  {ollamaConfig.selectedModel} (已選擇 - 請重新載入模型列表)
                </option>
              )}
              
              {ollamaConfig.models.map(model => (
                <option key={model.name} value={model.name}>
                  {model.name} {model.size && `(${model.size})`}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 操作按鈕 */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <button
          onClick={handleTest}
          disabled={isLoading}
          style={{
            padding: "12px 24px",
            borderRadius: 8,
            border: "none",
            background: "#49cfff",
            color: "#000",
            fontWeight: "bold",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? "測試中..." : `測試 ${aiProvider === 'gemini' ? 'Gemini' : 'Ollama'} 連接`}
        </button>
        
        <button
          onClick={handleSave}
          style={{
            padding: "12px 24px",
            borderRadius: 8,
            border: "1px solid #49cfff",
            background: "transparent",
            color: "#49cfff",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          保存設定
        </button>
      </div>

      {/* 狀態顯示 */}
      {testStatus && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            background: "#181a28",
            color: testStatus.includes('✅') ? "#5bf1a1" : 
                   testStatus.includes('❌') ? "#ff5858" : "#49cfff",
            fontSize: 14,
            marginBottom: 16
          }}
        >
          {testStatus}
        </div>
      )}

      {/* 說明區塊 */}
      <div
        style={{
          background: "#181a28",
          borderRadius: 8,
          padding: 16,
          marginTop: 24
        }}
      >
        <h4 style={{ color: "#5bf1a1", marginBottom: 12 }}>使用說明:</h4>
        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ flex: 1 }}>
            <h5 style={{ color: "#49cfff", marginBottom: 8 }}>☁️ 雲端 Gemini AI</h5>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6, fontSize: 14 }}>
              <li>需要 Google AI Studio 的 API Key</li>
              <li>支援最新的 Gemini 2.5 系列模型</li>
              <li>網路連接必須穩定</li>
              <li>有 API 呼叫配額限制</li>
            </ul>
          </div>
          <div style={{ flex: 1 }}>
            <h5 style={{ color: "#4ecdc4", marginBottom: 8 }}>🏠 本地端 Ollama AI</h5>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6, fontSize: 14 }}>
              <li>資料完全保留在本地環境</li>
              <li>需要先安裝並啟動 Ollama 服務</li>
              <li>支援多種開源 AI 模型</li>
              <li>無 API 配額限制，完全離線運行</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 