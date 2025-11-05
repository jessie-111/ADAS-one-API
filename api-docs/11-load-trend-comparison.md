# 載入趨勢對比資料

## POST: /api/load-trend-comparison
- 載入並對比不同時期的流量趨勢資料API
- 將當前時期與上一時期的請求量、流量等資料進行對比分析，產生趨勢圖表與變化統計。

---

## **請求參數（Request Parameters）**

**Type**：`json`

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| timeRange | string | Y | 時間範圍，如 `24h`、`7d` |

## **請求範例（Example Request）**

```json
{
  "timeRange": "24h"
}
```

## **回應欄位（Response Fields）**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| success | bool | Y | 是否成功 |
| periods | object | Y | 時期資訊 |
| currentPeriod | object | Y | 當前時期資料 |
| previousPeriod | object | Y | 上一時期資料 |
| comparisonChart | object | Y | 對比圖表資料 |
| statistics | object | Y | 統計資訊 |

### **periods 物件內容**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| current | object | Y | 當前時期時間範圍 |
| previous | object | Y | 上一時期時間範圍 |

## **回應範例（Example Response）**

```json
{
  "success": true,
  "periods": {
    "current": {
      "start": "2024-01-01T12:00:00Z",
      "end": "2024-01-02T12:00:00Z"
    },
    "previous": {
      "start": "2023-12-31T12:00:00Z",
      "end": "2024-01-01T12:00:00Z"
    }
  },
  "currentPeriod": {
    "totalRequests": 1000,
    "totalRequestTraffic": 1048576
  },
  "previousPeriod": {
    "totalRequests": 800,
    "totalRequestTraffic": 838860
  },
  "comparisonChart": {
    "labels": ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"]
  },
  "statistics": {
    "requestChange": 25,
    "trafficChange": 25
  }
}
```

