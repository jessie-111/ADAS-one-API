# 獲取 ELK 統計資料（帶時間範圍）

## GET: /api/elk/stats/:timeRange
- 獲取指定時間範圍內的 ELK 統計資料API
- 根據路徑參數指定的時間範圍（如 1h、6h、24h、7d），回傳安全動作統計、熱門國家與 IP、WAF 分數等資訊。


---

## **請求參數（Request Parameters）**

**Type**：路徑參數

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| :timeRange | string | Y | 時間範圍，如 `1h`、`6h`、`24h`、`7d` |

## **回應欄位（Response Fields）**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| security_actions | object | Y | 安全動作統計 |
| top_countries | object | Y | 熱門國家統計 |
| top_ips | object | Y | 熱門 IP 統計 |
| waf_score_stats | object | Y | WAF 分數統計 |

## **回應範例（Example Response）**

```json
{
  "security_actions": {
    "block": 10,
    "allow": 990
  },
  "top_countries": {
    "US": 500,
    "CN": 300
  },
  "top_ips": {
    "192.168.1.1": 50
  },
  "waf_score_stats": {
    "min": 1,
    "max": 99,
    "avg": 45
  }
}
```
