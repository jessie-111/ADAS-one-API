import React, { useState, useEffect } from "react";

export default function AISettingsConfig({ onConfigChange }) {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState([]);
  const [testStatus, setTestStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 從 localStorage 載入設定
  useEffect(() => {
    const savedApiKey = localStorage.getItem('gemini_api_key');
    const savedModel = localStorage.getItem('gemini_model');
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedModel) setSelectedModel(savedModel);
  }, []);

  // 當配置改變時，通知父元件
  useEffect(() => {
    if (onConfigChange) {
      onConfigChange({
        apiKey,
        model: selectedModel
      });
    }
  }, [apiKey, selectedModel, onConfigChange]);

  // 載入可用模型
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/models');
        if (response.ok) {
          const data = await response.json();
          setModels(data);
          if (data.length > 0 && !selectedModel) {
            setSelectedModel(data[0].id);
          }
        } else {
          console.error('載入模型失敗: HTTP', response.status);
          setTestStatus('❌ 無法載入模型列表，請檢查後端服務');
        }
      } catch (error) {
        console.error('載入模型失敗:', error);
        setTestStatus('❌ 連接後端失敗，請確認服務是否運行');
      }
    };
    
    loadModels();
  }, [selectedModel]);

  // 保存設定
  const handleSave = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    localStorage.setItem('gemini_model', selectedModel);
    setTestStatus('設定已保存');
    setTimeout(() => setTestStatus(''), 3000);
  };

  // 測試連接
  const handleTest = async () => {
    if (!apiKey || !selectedModel) {
      setTestStatus('請填寫 API Key 並選擇模型');
      return;
    }

    setIsLoading(true);
    setTestStatus('測試中...');

    try {
      // 使用範例攻擊資料測試
      const testData = {
        attackDomain: "example.com",
        targetIP: "203.0.113.5",
        targetURL: "http://example.com/login",
        attackTrafficGbps: 5.6,
        sourceList: [
          { ip: "192.168.1.10", country: "US", asn: "AS15169" },
          { ip: "192.168.1.11", country: "CN", asn: "AS4134" }
        ],
        // 添加必要的統計資料
        totalRequests: 1000,
        totalBytes: 5000000,
        uniqueIPs: 50,
        attackPatterns: {},
        securityEvents: []
      };

      const response = await fetch('http://localhost:8080/api/test-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          model: selectedModel
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setTestStatus(`✅ 連接成功！${result.message}`);
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
      
      {/* API Key 輸入 */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
          Gemini API Key:
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="請輸入您的 Gemini API Key"
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 8,
            border: "1px solid #49cfff",
            background: "#181a28",
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
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
          選擇 AI 模型:
        </label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 8,
            border: "1px solid #49cfff",
            background: "#181a28",
            color: "#fff",
            fontSize: 14,
            boxSizing: "border-box"
          }}
        >
          {models.map(model => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

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
          {isLoading ? "測試中..." : "測試連接"}
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
            fontSize: 14
          }}
        >
          {testStatus}
        </div>
      )}

      {/* 說明 */}
      <div
        style={{
          background: "#181a28",
          borderRadius: 8,
          padding: 16,
          marginTop: 24
        }}
      >
        <h4 style={{ color: "#5bf1a1", marginBottom: 12 }}>使用說明:</h4>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
          <li>請先到 Google AI Studio 申請免費的 Gemini API Key</li>
          <li>選擇適合的 AI 模型（Flash 更快，Pro 更準確）</li>
          <li>點擊「測試連接」確認設定正確</li>
          <li>設定完成後，關聯圖頁面將使用 AI 動態分析攻擊資料</li>
        </ul>
      </div>
    </div>
  );
} 