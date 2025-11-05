# 測試 Ollama AI 連接
## POST: /api/test-ai/ollama
- 測試本地 Ollama AI 服務的連接狀態API
- 驗證指定的 Ollama API URL 是否可正常連接，確保服務可用性。
  
---

## **請求參數（Request Parameters）**

**Type**：`json`

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| apiUrl | string | N | Ollama API URL，預設為 `http://localhost:11434` |

## **請求範例（Example Request）**

```json
{
  "apiUrl": "http://localhost:11434"
}
```

## **回應欄位（Response Fields）**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| success | bool | Y | 測試是否成功 |
| message | string | Y | 回應訊息 |

## **回應範例（Example Response）**

```json
{
  "success": true,
  "message": "Ollama 連接測試成功"
}
```

