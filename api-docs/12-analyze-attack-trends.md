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

## **請求範例（Example Request）**

```json
{
  "apiKey": "YOUR_GEMINI_API_KEY",
  "model": "gemini-2.5-flash",
  "currentData": {
    "totalRequests": 1000,
    "totalAttacks": 15
  },
  "previousData": {
    "totalRequests": 800,
    "totalAttacks": 10
  },
  "periods": {
    "current": {
      "start": "2024-01-01T12:00:00Z",
      "end": "2024-01-02T12:00:00Z"
    },
    "previous": {
      "start": "2023-12-31T12:00:00Z",
      "end": "2024-01-01T12:00:00Z"
    }
  }
}
```

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

