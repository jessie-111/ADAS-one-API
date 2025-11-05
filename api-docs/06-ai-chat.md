# AI 對話
## POST: /api/ai/chat
-  AI 助手的互動對話API
- 使用者可發送訊息並攜帶上下文資訊，AI 將根據安全分析情境提供專業建議、文件推薦及解決方案架構。

---

## **請求參數（Request Parameters）**

**Type**：`json`

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| message | string | N | 使用者訊息 |
| provider | string | Y | AI 提供商，`gemini` 或 `ollama` |
| apiKey | string | Y | Gemini API Key（當 provider 為 gemini 時必填） |
| model | string | Y | AI 模型名稱 |
| apiUrl | string | N | Ollama API URL（當 provider 為 ollama 時必填） |
| context | object | N | 上下文資訊 |
| requestDocSuggestions | bool | N | 是否請求文件建議 |
| requestPlanScaffold | bool | N | 是否請求計劃架構 |

## **請求範例（Example Request）**

```json
{
  "message": "如何設定 WAF 規則以防止 SQL 注入攻擊？",
  "provider": "gemini",
  "apiKey": "YOUR_GEMINI_API_KEY",
  "model": "gemini-2.5-flash",
  "context": {
    "attackType": "SQL Injection",
    "severity": "high"
  },
  "requestDocSuggestions": true
}
```

## **回應欄位（Response Fields）**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| reply | string | Y | AI 回應內容 |
| docs | list(string) | N | 推薦的文件列表 |

## **回應範例（Example Response）**

```json
{
  "reply": "【摘要】WAF 規則配置建議...\n【建議】1. 啟用 SQL 注入防護規則...",
  "docs": [
    "文件：WAF Custom Rules\n連結：https://developers.cloudflare.com/waf/...\n摘要：..."
  ]
}
```

---

## **附註（Notes）**

- 所有 API 請求需攜帶 `Content-Type: application/json` 標頭（POST 請求）
- 所有時間欄位採用 ISO 8601 格式（UTC）
- 速率限制預設為每分鐘 100 次請求，超過限制將返回 `HTTP 429`
- 請求體大小限制為 10MB（JSON）
- CORS 配置允許指定的來源，需檢查 `securityConfig.app.corsOrigins`
- 若 API 回傳 `HTTP 400`，請檢查請求參數格式與必填欄位
- 若回傳 `HTTP 500`，請檢查伺服器日誌或聯絡管理員
- 請求範例與回應 JSON 僅供參考，實際內容依業務邏輯為準

---

## **版本紀錄（Changelog）**

- 由 **Auto (AI Assistant)** 編寫，更新於 **2025 年 10 月**
- 文件版本：v1.0
- 平台：GitHub (jessie-111/ADAS-one-Demo)
