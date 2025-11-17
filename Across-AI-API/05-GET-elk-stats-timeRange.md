# 獲取 ELK 統計資料（帶時間範圍）

## GET: /api/elk/stats/:timeRange

- 獲取指定時間範圍內的安全統計資料
- 從 Elasticsearch 查詢並彙總安全事件資訊

---

## **請求參數（Request Parameters）**

**Type**：Path Parameter

### Path Parameters

| Attribute  | Type   | Required | Description                                |
|------------|--------|----------|--------------------------------------------|
| timeRange  | string | Y        | 時間範圍（例如：1h, 24h, 7d, 30d）         |

### 時間範圍格式

| 格式 | 說明       |
|------|------------|
| 1h   | 最近 1 小時   |
| 12h  | 最近 12 小時  |
| 24h  | 最近 24 小時  |
| 7d   | 最近 7 天     |
| 30d  | 最近 30 天    |
| auto | 自動選擇      |

### 請求範例

```
GET /api/elk/stats/24h
```

---
## **回應欄位（Response Fields）**
| Attribute         | Type   | Required | Description          |
|-------------------|--------|----------|----------------------|
| totalEvents       | number | Y        | 總事件數             |
| blockedRequests   | number | Y        | 被阻擋的請求數       |
| highRiskRequests  | number | Y        | 高風險請求數         |
| topAttackSources  | array  | Y        | 主要攻擊來源列表     |
| topCountries      | array  | Y        | 主要來源國家         |
| topURIs           | array  | Y        | 最常被攻擊的 URI     |
| timeRange         | string | Y        | 查詢的時間範圍       |

## **回應範例（Example Response）**

```json
{
  "totalEvents": 5234,
  "blockedRequests": 1523,
  "highRiskRequests": 456,
  "topAttackSources": [
    {
      "ip": "192.168.1.100",
      "count": 234,
      "country": "US"
    },
    {
      "ip": "10.0.0.50",
      "count": 189,
      "country": "CN"
    }
  ],
  "topCountries": [
    {
      "country": "US",
      "count": 1234
    },
    {
      "country": "CN",
      "count": 987
    }
  ],
  "topURIs": [
    {
      "uri": "/admin/login",
      "count": 567
    },
    {
      "uri": "/api/v1/users",
      "count": 432
    }
  ],
  "timeRange": "24h"
}
```

## **錯誤回應範例（Example ERROR Response Message）**

```json
{
  "error": "獲取統計資料失敗",
  "details": "Invalid time range format"
}
```

---

## **狀態碼（Status Codes）**

| Status Code | Description          |
|-------------|----------------------|
| 200         | 成功                 |
| 500         | 伺服器錯誤           |

---

## **備註**

- 查詢結果會根據時間範圍進行即時計算
- 資料來源為 Elasticsearch 中的 Cloudflare 日誌
- 建議使用合理的時間範圍以避免查詢超時

