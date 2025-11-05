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
