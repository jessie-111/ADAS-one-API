# AI 分析（通用）

## POST: /api/analyze

- 執行 AI 安全分析（主要由後端內部調用）
- 根據提供的資料類型（攻擊資料、健康資料、事件資料等）進行相應的分析

---

## **請求參數（Request Parameters）**

**Type**：JSON Body

### Request Body

| Attribute    | Type   | Required | Description                    |
|--------------|--------|----------|--------------------------------|
| apiKey       | string | Y        | Gemini API Key                 |
| model        | string | N        | 模型名稱（預設：gemini-2.5-flash） |
| attackData   | object | N        | 攻擊事件資料                   |
| healthData   | object | N        | 網站健康度資料                 |
| eventData    | object | N        | 事件日誌資料                   |
| overallData  | object | N        | 整體綜合資料                   |

**註**：至少需提供 attackData、healthData、eventData 或 overallData 其中之一。

### 請求範例

```json
{
  "apiKey": "your-gemini-api-key",
  "model": "gemini-2.5-flash",
  "attackData": {
    "attackDomain": "example.com",
    "targetURL": "/admin/login",
    "sourceList": [
      {
        "ip": "192.168.1.1",
        "country": "US",
        "asn": "AS12345",
        "count": 100
      }
    ]
  }
}
```

---

## **回應欄位（Response Fields）**

| Attribute       | Type     | Required | Description                    |
|-----------------|----------|----------|--------------------------------|
| summary         | string   | Y        | AI 分析摘要                    |
| recommendations | array    | Y        | 安全建議列表（字串陣列）       |
| metadata        | object   | Y        | 分析元資料                     |

### metadata 物件欄位

| Attribute      | Type    | Required | Description              |
|----------------|---------|----------|--------------------------|
| analysisId     | string  | Y        | 分析 ID                  |
| timestamp      | string  | Y        | 分析時間                 |
| model          | string  | Y        | 使用的模型               |
| isAIGenerated  | boolean | Y        | 是否為 AI 生成           |

---

## **回應範例（Example Response）**

```json
{
  "summary": "檢測到針對管理介面的暴力破解攻擊，來自單一 IP 地址的高頻率請求，建議立即採取防護措施。",
  "recommendations": [
    "立即封鎖攻擊來源 IP 192.168.1.1",
    "啟用帳號登入失敗鎖定機制",
    "實施多因素認證 (MFA)",
    "檢查管理介面的存取控制設定",
    "設定 Rate Limiting 限制"
  ],
  "metadata": {
    "analysisId": "abc123xyz",
    "timestamp": "2025-11-17T10:30:00",
    "model": "gemini-2.5-flash",
    "isAIGenerated": true
  }
}
```

## **錯誤回應範例（Example ERROR Response Message）**

```json
{
  "error": "AI 分析失敗",
  "details": "缺少必要參數"
}
```

---

## **狀態碼（Status Codes）**

| Status Code | Description                |
|-------------|----------------------------|
| 200         | 成功                       |
| 500         | AI 分析失敗或伺服器錯誤    |

---

## **備註**

- 此 API 支援重試機制：最多重試 3 次，每次間隔 2 秒
- 主要處理 503 Service Unavailable 錯誤
- 如果 AI 回應格式異常，系統會自動嘗試解析或提供 Fallback 資料

