# 🚀 ADAS-one-Demo API 參考文檔

> **最後更新**: 2025年  
> **基礎 URL**: `http://localhost:8080/api`  
> **狀態**: 生產環境

---

## 📋 目錄

1. [AI 配置相關](#ai-配置相關)
2. [ELK 資料分析](#elk-資料分析)
3. [趨勢對比分析](#趨勢對比分析)
4. [安全分析](#安全分析)
5. [資料匯出](#資料匯出)
6. [防護統計](#防護統計)
7. [除錯工具](#除錯工具)

---

## 🤖 AI 配置相關

### 1. 獲取 Gemini 模型列表
**端點**: `GET /api/models`  
**描述**: 取得可用的 Gemini 模型列表  
**請求**: 無  
**回應**:
```json
[
  { "id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro" },
  { "id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash" },
  { "id": "gemini-2.5-flash-lite", "name": "Gemini 2.5 Flash Lite" }
]
```

### 2. 獲取 Ollama 模型列表
**端點**: `POST /api/ollama/models`  
**描述**: 取得指定 Ollama 伺服器的模型列表  
**請求體**:
```json
{
  "apiUrl": "http://localhost:11434"
}
```
**回應**:
```json
{
  "models": [...],
  "count": 5
}
```

### 3. 測試 Gemini AI 連接
**端點**: `POST /api/test-ai`  
**描述**: 測試 Gemini AI 連接並進行簡單對話  
**請求體**:
```json
{
  "apiKey": "your-gemini-api-key",
  "model": "gemini-2.5-flash"
}
```
**回應**:
```json
{
  "success": true,
  "message": "✅ AI 連接測試成功",
  "model": "gemini-2.5-flash",
  "response": "AI 連接測試成功。"
}
```

### 4. 測試 Ollama AI 連接
**端點**: `POST /api/test-ai/ollama`  
**描述**: 測試 Ollama AI 連接  
**請求體**:
```json
{
  "apiUrl": "http://localhost:11434"
}
```
**回應**:
```json
{
  "success": true,
  "message": "Ollama 連接測試成功"
}
```

### 5. AI 分析
**端點**: `POST /api/analyze`  
**描述**: 執行 AI 驅動的安全分析  
**請求體**:
```json
{
  "provider": "gemini",
  "apiKey": "your-api-key",
  "model": "gemini-2.5-flash",
  "attackData": {...},
  "overallData": {...},
  "fieldReference": "..."
}
```
**回應**: 分析結果物件

### 6. AI 對話
**端點**: `POST /api/ai/chat`  
**描述**: AI 驅動的智能對話與文件推薦  
**請求體**:
```json
{
  "message": "如何使用WAF防護SQL注入？",
  "context": {...},
  "requestDocSuggestions": true,
  "requestPlanScaffold": true,
  "provider": "gemini",
  "apiKey": "your-api-key",
  "model": "gemini-2.5-flash"
}
```
**回應**:
```json
{
  "reply": "【摘要】...\n【圖表分析】...\n【建議】...\n【下一步】...",
  "docs": [...]
}
```

---

## 📊 ELK 資料分析

### 7. 測試 ELK 連接
**端點**: `GET /api/elk/test-connection`  
**描述**: 測試 ELK MCP Server 連接狀態  
**請求**: 無  
**回應**:
```json
{
  "connected": true,
  "message": "ELK MCP 連接正常"
}
```

### 8. 分析 ELK 日誌
**端點**: `POST /api/analyze-elk-log`  
**描述**: 使用 ELK 資料執行安全分析  
**請求體**:
```json
{
  "provider": "gemini",
  "apiKey": "your-api-key",
  "model": "gemini-2.5-flash",
  "timeRange": "1h"
}
```
**回應**: 分析結果，包含攻擊檢測、OWASP 分類、AI 評估

### 9. 獲取 ELK 統計資料（帶時間範圍）
**端點**: `GET /api/elk/stats/:timeRange`  
**描述**: 取得指定時間範圍的 ELK 統計資料  
**路徑參數**:
- `timeRange`: `1h`, `6h`, `24h`, `7d` 等

**回應**:
```json
{
  "security_actions": {...},
  "top_countries": {...},
  "top_ips": {...},
  "waf_score_stats": {...}
}
```

### 10. 獲取 ELK 統計資料（預設）
**端點**: `GET /api/elk/stats`  
**描述**: 取得最近 1 小時的 ELK 統計資料  
**請求**: 無  
**回應**: 同上

---

## 📈 趨勢對比分析

### 11. 載入趨勢對比資料
**端點**: `POST /api/load-trend-comparison`  
**描述**: 載入當前時期與上一時期的流量對比資料  
**請求體**:
```json
{
  "timeRange": "24h"
}
```
**回應**:
```json
{
  "success": true,
  "periods": {
    "current": { "start": "...", "end": "..." },
    "previous": { "start": "...", "end": "..." }
  },
  "currentPeriod": {...},
  "previousPeriod": {...},
  "comparisonChart": {...},
  "statistics": {...}
}
```

### 12. AI 趨勢分析
**端點**: `POST /api/analyze-attack-trends`  
**描述**: 使用 AI 分析攻擊趨勢對比資料  
**請求體**:
```json
{
  "apiKey": "your-api-key",
  "model": "gemini-2.5-flash",
  "currentData": {...},
  "previousData": {...},
  "periods": {...}
}
```
**回應**: AI 分析結果

---

## 🛡️ 安全分析

### 13. 防護分析統計
**端點**: `POST /api/security-analysis-stats`  
**描述**: 獲取防護分析統計資料  
**驗證**: 時間範圍驗證（startTime/endTime 必須在同一時區）  
**請求體**:
```json
{
  "timeRange": "1h",
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-01-01T23:59:59Z",
  "dataSource": "elk",
  "clientOffsetMinutes": 480,
  "clientTz": "Asia/Taipei"
}
```
**回應**:
```json
{
  "totalRequests": 1000,
  "blockedRequestsCount": 10,
  "challengeRequestsCount": 5,
  "totalAttacks": 15,
  "securityActionStats": {...},
  "timeRange": {...}
}
```

### 14. 防護分析 AI 評估
**端點**: `POST /api/security-analysis-ai`  
**描述**: 使用 AI 分析防護資料並提供建議  
**請求體**:
```json
{
  "provider": "gemini",
  "apiKey": "your-api-key",
  "model": "gemini-2.5-flash",
  "timeRange": "1h",
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-01-01T23:59:59Z",
  "clientOffsetMinutes": 480,
  "clientTz": "Asia/Taipei"
}
```
**回應**:
```json
{
  "summary": "【摘要】...",
  "chartAnalysis": {...},
  "cloudflareRecommendations": [...],
  "nextSteps": {...},
  "metadata": {...}
}
```

---

## 📥 資料匯出

### 15. 匯出安全分析資料
**端點**: `POST /api/security-data-export`  
**描述**: 匯出防護分析資料為 JSON 檔案  
**請求體**:
```json
{
  "timeRange": "1h",
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-01-01T23:59:59Z",
  "options": {
    "includeRawData": true,
    "format": "json"
  }
}
```
**回應**: 直接回傳 JSON 資料，Content-Disposition 標頭設為 attachment

**匯出資料結構**:
```json
{
  "metadata": {
    "recordCounts": {...},
    "timeRange": {...}
  },
  "statistics": {...},
  "charts": {...},
  "rawData": [...]
}
```

### 16. 獲取匯出歷史
**端點**: `GET /api/export-history`  
**描述**: 獲取匯出歷史記錄  
**請求**: 無  
**回應**:
```json
{
  "success": true,
  "files": [
    { "filename": "...", "size": 12345, "date": "..." }
  ],
  "total": 10
}
```

### 17. 刪除匯出檔案
**端點**: `DELETE /api/delete-export/:filename`  
**描述**: 刪除指定的匯出檔案  
**路徑參數**:
- `filename`: 檔案名稱

**回應**:
```json
{
  "success": true,
  "message": "檔案已刪除"
}
```

---

## 🔍 除錯工具

### 18. 除錯：時間分組測試
**端點**: `GET /api/debug/time-grouping`  
**描述**: 測試時間分組邏輯（開發用途）  
**請求**: 無  
**回應**: 時間分組測試結果

---

## 📝 通用錯誤回應

### 錯誤格式
```json
{
  "error": "錯誤訊息",
  "details": "詳細錯誤描述"
}
```

### 常見 HTTP 狀態碼
- `200` - 成功
- `400` - 請求參數錯誤
- `404` - 資源不存在
- `500` - 伺服器內部錯誤

---

## 🔐 安全與限制

### 速率限制
- 所有 `/api/` 端點都套用速率限制
- 預設: 每分鐘 100 次請求
- 超過限制: HTTP 429 回應

### CORS 配置
- 允許來源: 根據 `securityConfig.app.corsOrigins`
- 憑證: `credentials: true`
- 允許方法: `GET, POST, PUT, DELETE, OPTIONS`

### 請求大小限制
- JSON 請求體最大: 根據 `securityConfig.validation.maxRequestSize`
- 預設: 10MB

---

## 🛠️ 開發提示

### 環境變數配置
請參考 `backend/env.example` 配置以下變數:
- `GEMINI_API_KEY` - Gemini API Key
- `GEMINI_MODEL` - Gemini 模型名稱
- ELK MCP Server 配置

### 測試建議
1. 先測試 `/api/elk/test-connection` 確保 ELK 連接正常
2. 測試 AI 提供商連接 (`/api/test-ai` 或 `/api/test-ai/ollama`)
3. 執行分析前確認時間範圍設定正確
4. 使用 `/api/debug/time-grouping` 除錯時間相關問題

---

## 📊 資料流程圖

```
前端請求
   ↓
速率限制中間件
   ↓
CORS 處理
   ↓
Helmet 安全標頭
   ↓
請求日誌記錄
   ↓
API 路由處理
   ↓
業務邏輯處理
   ↓
資料回應
```

---

## 🎯 常用場景示例

### 場景 1: 完整安全分析流程
```javascript
// 1. 測試連接
GET /api/elk/test-connection

// 2. 獲取統計資料
POST /api/security-analysis-stats
{
  "timeRange": "24h",
  "dataSource": "elk"
}

// 3. AI 分析
POST /api/security-analysis-ai
{
  "provider": "gemini",
  "apiKey": "...",
  "model": "gemini-2.5-flash",
  "timeRange": "24h"
}

// 4. 匯出資料
POST /api/security-data-export
{
  "timeRange": "24h",
  "options": { "includeRawData": true }
}
```

### 場景 2: 趨勢對比分析
```javascript
// 1. 載入趨勢資料
POST /api/load-trend-comparison
{
  "timeRange": "7d"
}

// 2. AI 分析趨勢
POST /api/analyze-attack-trends
{
  "apiKey": "...",
  "model": "gemini-2.5-flash",
  "currentData": {...},
  "previousData": {...}
}
```

### 場景 3: AI 對話查詢
```javascript
POST /api/ai/chat
{
  "message": "如何配置WAF規則阻止SQL注入？",
  "requestDocSuggestions": true,
  "provider": "gemini",
  "apiKey": "...",
  "model": "gemini-2.5-flash"
}
```

---

**總計**: 18 個 API 端點  
**分類**: 7 大類（AI配置、ELK分析、趨勢對比、安全分析、資料匯出、防護統計、除錯工具）

