# 測試 Gemini AI 連接
## POST: /api/test-ai
- 測試 Gemini AI 服務的連接狀態API
- 透過提供API Key與模型名稱，驗證是否能成功與 Gemini AI 服務溝通並取得回應。
  
---

## **請求參數（Request Parameters）**

**Type**：`json`

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| apiKey | string | Y | Gemini API Key |
| model | string | N | 模型名稱，預設為 `gemini-1.5-flash` |

## **請求範例（Example Request）**

```json
{
  "apiKey": "YOUR_GEMINI_API_KEY",
  "model": "gemini-2.5-flash"
}
```

## **回應欄位（Response Fields）**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| success | bool | Y | 測試是否成功 |
| message | string | Y | 回應訊息 |
| model | string | Y | 使用的模型名稱 |
| response | string | Y | AI 回應內容 |

## **回應範例（Example Response）**

```json
{
  "success": true,
  "message": "✅ AI 連接測試成功",
  "model": "gemini-2.5-flash",
  "response": "AI 連接測試成功。"
}
```

## **錯誤回應範例（Example ERROR Response Message）**


**HTTP 400 - 缺少 API Key**
```json
{
  "error": "缺少 API Key",
  "statusCode": 400
}
```

**HTTP 500 - AI 測試失敗**
```json
{
  "error": "AI 測試失敗",
  "statusCode": 500
}
```

