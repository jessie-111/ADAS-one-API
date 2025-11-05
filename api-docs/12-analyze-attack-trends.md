# AI 趨勢分析

## POST: /api/analyze-attack-trends
- AI 分析攻擊趨勢變化API
- 比較當前與歷史時期的資料，由 AI 生成趨勢分析報告、識別攻擊模式變化並提供對應的安全建議。

---

## **請求參數（Request Parameters）**

**Type**：`json`

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| apiKey | string | Y | Gemini API Key |
| model | string | Y | AI 模型名稱 |
| currentData | object | Y | 當前時期資料 |
| previousData | object | Y | 上一時期資料 |
| periods | object | Y | 時期資訊 |

## **回應欄位（Response Fields）**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| summary | string | Y | 趨勢分析摘要 |
| trendAnalysis | string | Y | 趨勢分析內容 |
| recommendations | list(string) | Y | 建議措施 |

## **回應範例（Example Response）**

```json
{
  "summary": "攻擊流量較上一時期上升 25%",
  "trendAnalysis": "檢測到明顯的攻擊增長趨勢...",
  "recommendations": [
    "建議增強 DDoS 防護",
    "監控異常 IP 活動"
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
