# 測試 AI 連接

## POST: /api/test-ai

- 測試 Gemini AI 連接是否正常
- 驗證提供的 API Key 和模型是否可用

---

## **請求參數（Request Parameters）**

**Type**：JSON Body

### Request Body

| Attribute | Type   | Required | Description                                    |
|-----------|--------|----------|------------------------------------------------|
| apiKey    | string | Y        | Gemini API Key                                 |
| model     | string | N        | 模型名稱（預設：gemini-2.5-flash）             |

### 請求範例

```json
{
  "apiKey": "your-gemini-api-key",
  "model": "gemini-2.5-flash"
}
```

---
## **回應欄位（Response Fields）**

| Attribute | Type    | Required | Description          |
|-----------|---------|----------|----------------------|
| success   | boolean | Y        | 測試是否成功         |
| message   | string  | Y        | 測試結果訊息         |
| model     | string  | Y        | 使用的模型名稱       |
| response  | string  | Y        | AI 的回應內容        |

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

```json
{
  "error": "AI 測試失敗",
  "details": "Invalid API key"
}
```

---

## **狀態碼（Status Codes）**

| Status Code | Description          |
|-------------|----------------------|
| 200         | 成功                 |
| 400         | 缺少 API Key         |
| 500         | 伺服器錯誤           |

