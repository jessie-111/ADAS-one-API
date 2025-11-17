# 測試 ELK 連接

## GET: /api/elk/test-connection

- 測試 ELK MCP 服務器連接狀態
- 驗證是否可以正常連接到 Elasticsearch 服務

---

## **請求參數（Request Parameters）**

**Type**：無

此 API 不需要請求參數。

---
## **回應欄位（Response Fields）**

| Attribute | Type    | Required | Description          |
|-----------|---------|----------|----------------------|
| connected | boolean | Y        | 是否連接成功         |
| message   | string  | Y        | 連接狀態訊息         |
## **回應範例（Example Response）**

```json
{
  "connected": true,
  "message": "ELK MCP 連接正常"
}
```

## **錯誤回應範例（Example ERROR Response Message）**

| Attribute | Type    | Required | Description      |
|-----------|---------|----------|------------------|
| connected | boolean | Y        | 連接狀態（false）|
| error     | string  | Y        | 錯誤訊息         |

## **回應欄位（Response Fields）**
```json
{
  "connected": false,
  "error": "Connection timeout"
}
```

---

## **狀態碼（Status Codes）**

| Status Code | Description      |
|-------------|------------------|
| 200         | 成功             |
| 500         | 連接失敗         |

---

## **備註**

- 此 API 用於健康檢查
- 建議在系統啟動時或定期調用以確保 ELK 服務可用
- ELK 配置位於 `backend/config/elkConfig.js`

