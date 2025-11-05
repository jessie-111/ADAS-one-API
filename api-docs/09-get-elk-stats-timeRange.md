# 獲取 ELK 統計資料（帶時間範圍）

## **功能說明**

此 API 用於獲取指定時間範圍內的 ELK 統計資料。根據路徑參數指定的時間範圍（如 1h、6h、24h、7d），回傳安全動作統計、熱門國家與 IP、WAF 分數等資訊。

**基礎 URL**: `http://localhost:8080/api`  
**狀態**: 生產環境

---

## **Resource 資源**

| Project | Method | URL |
|----------|---------|-----|
| WEB | GET | `/api/elk/stats/:timeRange` |

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

---

## **附註（Notes）**

- 所有 API 請求需攜帶 `Content-Type: application/json` 標頭（POST 請求）
- 所有時間欄位採用 ISO 8601 格式（UTC）
- 速率限制預設為每分鐘 100 次請求，超過限制將返回 `HTTP 429`
- 請求體大小限制為 10MB（JSON）
- CORS 配置允許指定的來源，需檢查 `securityConfig.app.corsOrigins`
- 若 API 回傳 `HTTP 400`，請檢查請求參數格式與必填欄位
- 若回傳 `HTTP 500`，請檢查伺服器日誌或聯絡管理員
- 請求範例與回應 JSON 僅供參考，實際內容依業務邏輯為準

---

## **版本紀錄（Changelog）**

- 由 **Auto (AI Assistant)** 編寫，更新於 **2025 年 10 月**
- 文件版本：v1.0
- 平台：GitHub (jessie-111/ADAS-one-Demo)
