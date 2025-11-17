# 調試時間分組

## GET: /api/debug/time-grouping

- 調試工具，用於檢查時間分組問題
- 查詢並分析少量實際資料的時間戳處理情況
- **僅供開發調試使用**

---

## **請求參數（Request Parameters）**

**Type**：無

此 API 不需要請求參數。

### 請求範例

```
GET /api/debug/time-grouping
```

---

## **回應欄位（Response Fields）**

| Attribute      | Type   | Required | Description                  |
|----------------|--------|----------|------------------------------|
| message        | string | Y        | 調試訊息                     |
| totalRecords   | number | Y        | ELK 查詢到的總記錄數         |
| sampleData     | array  | Y        | 樣本資料陣列（最多 10 筆）   |
| groupInterval  | string | Y        | 時間分組間隔                 |

### sampleData 陣列元素

| Attribute          | Type   | Required | Description              |
|--------------------|--------|----------|--------------------------|
| index              | number | Y        | 索引                     |
| originalTimestamp  | string | Y        | 原始時間戳               |
| parsedTimestamp    | string | Y        | 解析後的時間戳（ISO）    |
| timeKey            | string | Y        | 時間分組鍵（ISO）        |
| clientRequestBytes | number | Y        | 客戶端請求位元組數       |
| clientIP           | string | Y        | 客戶端 IP                |

---

## **回應範例（Example Response）**

```json
{
  "message": "時間分組調試",
  "totalRecords": 1523,
  "sampleData": [
    {
      "index": 0,
      "originalTimestamp": "2025-11-17T10:30:45.123Z",
      "parsedTimestamp": "2025-11-17T10:30:45.123Z",
      "timeKey": "2025-11-17T00:00:00.000Z",
      "clientRequestBytes": 1024,
      "clientIP": "192.168.1.100"
    },
    {
      "index": 1,
      "originalTimestamp": "2025-11-17T10:31:12.456Z",
      "parsedTimestamp": "2025-11-17T10:31:12.456Z",
      "timeKey": "2025-11-17T00:00:00.000Z",
      "clientRequestBytes": 2048,
      "clientIP": "192.168.1.101"
    }
  ],
  "groupInterval": "86400000ms (1天)"
}
```

### 失敗回應

```json
{
  "error": "沒有找到數據"
}
```

---

## **狀態碼（Status Codes）**

| Status Code | Description          |
|-------------|----------------------|
| 200         | 成功                 |
| 500         | 查詢失敗             |

---

## **備註**

- **此 API 僅供開發調試使用，不應在生產環境中調用**
- 只查詢並返回前 10 筆資料
- 用於檢查時間戳處理和分組邏輯是否正確
- 時間分組間隔默認為 1 天（86400000 毫秒）

