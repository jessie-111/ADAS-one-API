# 防護分析統計

## POST: /api/security-analysis-stats
- 獲取指定時間範圍內的防護分析統計資料API
- 支援自訂時間範圍或使用預設範圍，回傳總請求數、阻擋數、挑戰數、攻擊數等安全統計指標。

---

## **請求參數（Request Parameters）**

**Type**：`json`

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| timeRange | string | N | 時間範圍，如 `1h`、`24h` |
| startTime | string | N | 開始時間（ISO 8601 格式） |
| endTime | string | N | 結束時間（ISO 8601 格式） |
| dataSource | string | Y | 資料來源，目前僅支援 `elk` |
| clientOffsetMinutes | int | N | 客戶端時區偏移（分鐘） |
| clientTz | string | N | 客戶端時區名稱，如 `Asia/Taipei` |

## **請求範例（Example Request）**

使用時間範圍：
```json
{
  "timeRange": "24h",
  "dataSource": "elk",
  "clientTz": "Asia/Taipei"
}
```

使用自訂時間：
```json
{
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-01-01T23:59:59Z",
  "dataSource": "elk",
  "clientOffsetMinutes": 480,
  "clientTz": "Asia/Taipei"
}
```


### **注意事項**
- `startTime` 和 `endTime` 必須同時提供，且需在同一時區
- 若提供 `timeRange`，則不需提供 `startTime` 和 `endTime`

## **回應欄位（Response Fields）**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| totalRequests | int | Y | 總請求數 |
| blockedRequestsCount | int | Y | 被阻擋請求數 |
| challengeRequestsCount | int | Y | 挑戰請求數 |
| totalAttacks | int | Y | 總攻擊數 |
| securityActionStats | object | Y | 安全動作統計 |
| timeRange | object | Y | 資料時間範圍 |

## **回應範例（Example Response）**

```json
{
  "totalRequests": 1000,
  "blockedRequestsCount": 10,
  "challengeRequestsCount": 5,
  "totalAttacks": 15,
  "securityActionStats": {
    "counts": {
      "block": 10,
      "challenge": 5,
      "allow": 985
    }
  },
  "timeRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-01T23:59:59Z"
  }
}
```

## **錯誤回應範例（Example ERROR Response Message）**


**HTTP 400 - 輸入驗證失敗**
```json
{
  "error": "輸入驗證失敗",
  "statusCode": 400
}
```

**HTTP 400 - 目前僅支援 ELK 資料來源**
```json
{
  "error": "目前僅支援 ELK 資料來源",
  "statusCode": 400
}
```

