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

