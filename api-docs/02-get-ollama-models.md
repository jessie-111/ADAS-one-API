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

## **請求範例（Example Request）**

```json
{
  "apiUrl": "http://localhost:11434"
}
```

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

## **錯誤回應範例（Example ERROR Response Message）**


**HTTP 500 - Ollama 連接失敗**
```json
{
  "error": "Ollama 連接失敗",
  "statusCode": 500
}
```

