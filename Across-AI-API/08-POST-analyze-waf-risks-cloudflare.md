# Cloudflare WAF 風險分析

## POST: /api/analyze-waf-risks-cloudflare

- 分析 Cloudflare WAF 日誌，識別安全風險
- 透過 ELK 查詢 Cloudflare 日誌並使用 AI 進行深度分析
- 支援 Gemini 和 Ollama 兩種 AI 提供者

---

## **請求參數（Request Parameters）**

**Type**：JSON Body

### Request Body

| Attribute   | Type   | Required | Description                                        |
|-------------|--------|----------|----------------------------------------------------|
| apiKey      | string | N        | Gemini API Key（使用 Ollama 時不需要）            |
| model       | string | N        | AI 模型名稱（預設：gemini-2.0-flash-exp）         |
| timeRange   | string | N        | 時間範圍（預設：24h）                              |
| aiProvider  | string | N        | AI 提供者（預設：gemini，可選：gemini, ollama）   |

### 支援的時間範圍

| 值   | 說明         |
|------|--------------|
| 1h   | 最近 1 小時  |
| 12h  | 最近 12 小時 |
| 24h  | 最近 24 小時 |
| 7d   | 最近 7 天    |
| 30d  | 最近 30 天   |
| auto | 自動選擇     |

### 支援的 AI 提供者

| 值      | 說明                                          |
|---------|-----------------------------------------------|
| gemini  | Google Gemini API（需提供 apiKey）            |
| ollama  | 本地 Ollama 服務（預設模型：gemma3:4b）       |

### 請求範例（使用 Gemini）

```json
{
  "apiKey": "your-gemini-api-key",
  "model": "gemini-2.0-flash-exp",
  "timeRange": "24h",
  "aiProvider": "gemini"
}
```

### 請求範例（使用 Ollama）

```json
{
  "model": "gemma3:4b",
  "timeRange": "24h",
  "aiProvider": "ollama"
}
```

---

## **回應欄位（Response Fields）**

### 成功回應

| Attribute | Type    | Required | Description              |
|-----------|---------|----------|--------------------------|
| success   | boolean | Y        | 分析是否成功             |
| risks     | array   | Y        | 風險列表                 |
| metadata  | object  | Y        | 分析元資料               |

### risks 陣列元素

| Attribute       | Type   | Required | Description              |
|-----------------|--------|----------|--------------------------|
| id              | string | Y        | 風險 ID                  |
| title           | string | Y        | 風險標題                 |
| severity        | string | Y        | 嚴重程度（high/medium/low）|
| description     | string | Y        | 風險描述                 |
| affectedIPs     | array  | N        | 受影響的 IP 列表         |
| affectedURIs    | array  | N        | 受影響的 URI 列表        |
| recommendations | array  | Y        | 建議措施列表             |
| owaspCategory   | string | N        | OWASP 類別               |

### metadata 物件

| Attribute          | Type   | Required | Description          |
|--------------------|--------|----------|----------------------|
| totalEvents        | number | Y        | 總事件數             |
| timeRange          | string | Y        | 分析時間範圍         |
| analysisTimestamp  | string | Y        | 分析時間戳（ISO）    |

### 錯誤回應

| Attribute | Type    | Required | Description      |
|-----------|---------|----------|------------------|
| success   | boolean | Y        | false            |
| error     | string  | Y        | 錯誤訊息         |
| details   | string  | Y        | 錯誤詳細資訊     |

---

## **回應範例（Example Response）**

### 成功回應

```json
{
  "success": true,
  "risks": [
    {
      "id": "risk_001",
      "title": "SQL 注入攻擊檢測",
      "severity": "high",
      "description": "檢測到來自多個 IP 的 SQL 注入嘗試，針對 /api/users 端點，WAF 分數高達 95+",
      "affectedIPs": [
        "192.168.1.100",
        "10.0.0.50",
        "172.16.0.25"
      ],
      "affectedURIs": [
        "/api/users",
        "/api/admin/users"
      ],
      "recommendations": [
        "立即啟用 Cloudflare WAF 規則以阻擋 SQL 注入",
        "審查並修復應用程式的 SQL 查詢參數化",
        "實施輸入驗證和過濾機制",
        "考慮使用預編譯語句（Prepared Statements）"
      ],
      "owaspCategory": "A03:2021 – Injection"
    },
    {
      "id": "risk_002",
      "title": "跨站腳本攻擊（XSS）",
      "severity": "medium",
      "description": "偵測到針對搜尋功能的 XSS 攻擊嘗試",
      "affectedIPs": [
        "203.0.113.45"
      ],
      "affectedURIs": [
        "/search",
        "/products/search"
      ],
      "recommendations": [
        "實施內容安全策略（CSP）",
        "對使用者輸入進行適當的編碼和轉義",
        "啟用 Cloudflare XSS 防護規則"
      ],
      "owaspCategory": "A03:2021 – Injection"
    },
    {
      "id": "risk_003",
      "title": "敏感檔案探測",
      "severity": "high",
      "description": "檢測到針對 .env、.git/config 等敏感檔案的掃描行為",
      "affectedIPs": [
        "198.51.100.78",
        "198.51.100.79"
      ],
      "affectedURIs": [
        "/.env",
        "/.git/config",
        "/config/database.yml"
      ],
      "recommendations": [
        "確保敏感檔案不可公開訪問",
        "配置 Web 伺服器阻止對隱藏檔案的訪問",
        "檢查 .gitignore 設定是否正確",
        "考慮封鎖來源 IP"
      ],
      "owaspCategory": "A01:2021 – Broken Access Control"
    }
  ],
  "metadata": {
    "totalEvents": 5234,
    "timeRange": "24h",
    "analysisTimestamp": "2025-11-17T10:30:00.000Z"
  }
}
```

## **錯誤回應範例（Example ERROR Response Message）**

```json
{
  "success": false,
  "error": "Cloudflare WAF 風險分析失敗",
  "details": "請先設定 Gemini API Key 或使用 Ollama"
}
```

---

## **狀態碼（Status Codes）**

| Status Code | Description                    |
|-------------|--------------------------------|
| 200         | 成功                           |
| 400         | 請求參數錯誤（如缺少 API Key） |
| 500         | 分析失敗或伺服器錯誤           |

---

## **備註**

### 分析流程

1. **Step 1**: 透過 ELK MCP 查詢 Cloudflare 日誌
2. **Step 2**: 彙總和分析安全事件資料
3. **Step 3**: 生成 AI 分析 Prompt
4. **Step 4**: 調用 AI（Gemini 或 Ollama）進行深度分析
5. **Step 5**: 解析並返回風險分析結果

### AI 提供者選擇

- **Gemini**: 需要 API Key，分析品質較高，適合生產環境
- **Ollama**: 本地運行，無需 API Key，適合開發測試環境

### Ollama 配置

```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b
```

### 相關服務

- **CloudflareWAFRiskService**: `backend/services/cloudflareWAFRiskService.js`
- **ELK MCP Client**: `backend/services/elkMCPClient.js`
- **ELK Config**: `backend/config/elkConfig.js`

### 效能建議

- 建議使用合理的時間範圍（如 24h）以避免處理過多資料
- Ollama 本地模型的分析速度取決於硬體效能
- Gemini API 受網路延遲和配額限制影響

