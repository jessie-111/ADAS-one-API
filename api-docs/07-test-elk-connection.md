# 測試 ELK 連接
## GET: /api/elk/test-connection
-  測試 ELK（Elasticsearch、Logstash、Kibana）MCP 服務的連接狀態API
- 驗證系統是否能正常連接到 ELK 日誌分析服務。

---

## **請求參數（Request Parameters）**

**Type**：無

此 API 不需要請求參數。

## **回應欄位（Response Fields）**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| connected | bool | Y | 連接狀態 |
| message | string | Y | 狀態訊息 |

## **回應範例（Example Response）**

```json
{
  "connected": true,
  "message": "ELK MCP 連接正常"
}
```

## **錯誤回應範例（Example ERROR Response Message）**


**HTTP 500 - ELK MCP 連接失敗**
```json
{
  "error": "ELK MCP 連接失敗",
  "statusCode": 500
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
