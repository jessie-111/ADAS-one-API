# 分析 ELK 日誌

## POST: /api/analyze-elk-log
-  分析 ELK 系統中的日誌資料API
- 根據指定的時間範圍，從 ELK 取得日誌並進行 AI 驅動的分析，產生攻擊摘要與整體統計資訊。

---
## **請求參數（Request Parameters）**

**Type**：`json`

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| provider | string | Y | AI 提供商，`gemini` 或 `ollama` |
| apiKey | string | Y | Gemini API Key（當 provider 為 gemini 時必填） |
| model | string | Y | AI 模型名稱 |
| apiUrl | string | N | Ollama API URL（當 provider 為 ollama 時必填） |
| timeRange | string | N | 時間範圍，預設為 `1h`，支援 `1h`、`6h`、`24h`、`7d` |

## **請求範例（Example Request）**

```json
{
  "provider": "gemini",
  "apiKey": "YOUR_GEMINI_API_KEY",
  "model": "gemini-2.5-flash",
  "timeRange": "24h"
}
```

## **回應欄位（Response Fields）**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| summary | string | Y | 分析摘要 |
| attackData | object | N | 攻擊資料 |
| globalStats | object | N | 整體統計 |

## **回應範例（Example Response）**

```json
{
  "summary": "ELK 日誌分析完成",
  "attackData": {
    "attackDomain": "example.com",
    "totalAttacks": 15
  },
  "globalStats": {
    "totalRequests": 1000
  }
}
```

