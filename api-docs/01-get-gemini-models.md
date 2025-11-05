# 獲取 Gemini 模型列表
## GET: /api/models
- 獲取可用的 Gemini AI 模型列表API
- 回傳所有支援的 Gemini 模型 ID 及其顯示名稱，供前端選擇使用。
---

## **請求參數（Request Parameters）**

**Type**：無

此 API 不需要請求參數。

## **回應欄位（Response Fields）**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| id | string | Y | 模型 ID |
| name | string | Y | 模型顯示名稱 |

## **回應範例（Example Response）**

```json
[
  {
    "id": "gemini-2.5-pro",
    "name": "Gemini 2.5 Pro"
  },
  {
    "id": "gemini-2.5-flash",
    "name": "Gemini 2.5 Flash"
  },
  {
    "id": "gemini-2.5-flash-lite",
    "name": "Gemini 2.5 Flash Lite"
  }
]
```

