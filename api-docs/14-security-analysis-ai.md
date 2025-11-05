# 防護分析 AI 評估

## POST: /api/security-analysis-ai
- AI 對防護資料進行深度評估API
- 基於指定時間範圍的安全統計資料，由 AI 分析威脅分布、攻擊類型，並提供 Cloudflare 配置建議與後續措施。

---

## **請求參數（Request Parameters）**

**Type**：`json`

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| provider | string | Y | AI 提供商，目前支援 `ollama` |
| apiKey | string | N | API Key（保留供未來使用） |
| model | string | Y | AI 模型名稱 |
| apiUrl | string | N | Ollama API URL，預設為 `http://localhost:11434` |
| timeRange | string | N | 時間範圍 |
| startTime | string | N | 開始時間（ISO 8601 格式） |
| endTime | string | N | 結束時間（ISO 8601 格式） |
| clientOffsetMinutes | int | N | 客戶端時區偏移（分鐘） |
| clientTz | string | N | 客戶端時區名稱 |

## **回應欄位（Response Fields）**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| summary | string | Y | 分析摘要 |
| chartAnalysis | object | Y | 圖表分析 |
| cloudflareRecommendations | list(string) | Y | Cloudflare 建議 |
| nextSteps | object | Y | 下一步措施 |
| metadata | object | Y | 元資料 |

### **nextSteps 物件內容**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| immediate | list(string) | Y | 立即措施 |
| shortTerm | list(string) | Y | 短期措施 |

## **回應範例（Example Response）**

```json
{
  "summary": "【摘要】目前選定時間窗內偵測到 15 起攻擊事件...",
  "chartAnalysis": {
    "attackTypes": "SQL 注入攻擊佔比最高",
    "threatDistribution": "攻擊主要來自境外 IP"
  },
  "cloudflareRecommendations": [
    "建議啟用 WAF 自定義規則",
    "加強 Bot 管理策略"
  ],
  "nextSteps": {
    "immediate": [
      "持續監控 WAF/Firewall 事件",
      "設定告警門檻"
    ],
    "shortTerm": [
      "定期審視自訂規則",
      "檢查 Bot 管理策略"
    ]
  },
  "metadata": {
    "isAIGenerated": true,
    "analysisType": "security_analysis",
    "provider": "ollama",
    "model": "llama2"
  }
}
```

## **錯誤碼（Errors）**

| Code | Message |
|------|----------|
| 400 | 請提供 Ollama 模型名稱 |
| 500 | 防護分析 AI 分析失敗 |

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
