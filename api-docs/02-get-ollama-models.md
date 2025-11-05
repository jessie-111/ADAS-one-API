# 獲取 Ollama 模型列表
## POST: /api/ollama/models
- 獲取本地 Ollama 服務中可用的 AI 模型列表API
- 可選擇性指定 Ollama API URL，並回傳模型清單及總數量。

---
## **請求參數（Request Parameters）**

**Type**：`json`

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| apiUrl | string | N | Ollama API URL，預設為 `http://localhost:11434` |

## **回應欄位（Response Fields）**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| models | list(object) | Y | 模型列表 |
| count | int | Y | 模型數量 |

## **回應範例（Example Response）**

```json
{
  "models": [
    {
      "name": "llama2",
      "size": 3825819519
    }
  ],
  "count": 5
}
```

## **錯誤碼（Errors）**

| Code | Message |
|------|----------|
| 500 | Ollama 連接失敗 |

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
