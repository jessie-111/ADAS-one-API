# AI 分析
## POST: /api/analyze
- 透過 AI（Gemini 或 Ollama）對攻擊資料進行智能分析API
- 提供攻擊數據與整體分析資料，由 AI 生成安全摘要、風險評估及建議措施。

---

## **請求參數（Request Parameters）**

**Type**：`json`

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| provider | string | Y | AI 提供商，`gemini` 或 `ollama` |
| apiKey | string | Y | Gemini API Key（當 provider 為 gemini 時必填） |
| model | string | Y | AI 模型名稱 |
| apiUrl | string | N | Ollama API URL（當 provider 為 ollama 時必填） |
| attackData | object | N | 攻擊資料 |
| overallData | object | N | 整體分析資料 |
| fieldReference | string | N | 欄位參考資訊 |

## **請求範例（Example Request）**

```json
{
  "provider": "gemini",
  "apiKey": "YOUR_GEMINI_API_KEY",
  "model": "gemini-2.5-flash",
  "attackData": {
    "attackDomain": "example.com",
    "totalAttacks": 15
  },
  "overallData": {
    "totalRequests": 1000
  }
}
```

## **回應欄位（Response Fields）**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| summary | string | Y | 分析摘要 |
| assessment | string | Y | 安全評估 |
| recommendations | list(string) | Y | 建議措施 |

## **回應範例（Example Response）**

```json
{
  "summary": "檢測到 DDoS 攻擊活動",
  "assessment": "高風險",
  "recommendations": [
    "啟用 Cloudflare DDoS 防護",
    "調整 WAF 規則"
  ]
}
```

