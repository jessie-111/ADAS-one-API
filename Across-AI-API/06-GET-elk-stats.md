# 獲取 ELK 統計資料（默認）

## GET: /api/elk/stats

- 獲取默認時間範圍（1 小時）內的安全統計資料
- 從 Elasticsearch 查詢並彙總安全事件資訊

---

## **請求參數（Request Parameters）**

**Type**：無

此 API 不需要請求參數，默認使用 1 小時時間範圍。

### 請求範例

```
GET /api/elk/stats
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

---

## **回應範例（Example Response）**

```json
{
  "totalEvents": 234,
  "blockedRequests": 67,
  "highRiskRequests": 23,
  "topAttackSources": [
    {
      "ip": "192.168.1.100",
      "count": 45,
      "country": "US"
    },
    {
      "ip": "10.0.0.50",
      "count": 32,
      "country": "CN"
    }
  ],
  "topCountries": [
    {
      "country": "US",
      "count": 89
    },
    {
      "country": "CN",
      "count": 67
    }
  ],
  "topURIs": [
    {
      "uri": "/admin/login",
      "count": 34
    },
    {
      "uri": "/api/v1/users",
      "count": 28
    }
  ],
  "timeRange": "1h"
}
```

## **錯誤回應範例（Example ERROR Response Message）**


```json
{
  "error": "獲取統計資料失敗",
  "details": "ELK connection failed"
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

- 此 API 為 `/api/elk/stats/:timeRange` 的簡化版本
- 默認查詢最近 1 小時的資料
- 如需自訂時間範圍，請使用 `/api/elk/stats/:timeRange`
- 適合用於即時監控儀表板

