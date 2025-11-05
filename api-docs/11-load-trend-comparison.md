# 載入趨勢對比資料

## **功能說明**

此 API 用於載入並對比不同時期的流量趨勢資料。將當前時期與上一時期的請求量、流量等資料進行對比分析，產生趨勢圖表與變化統計。

**基礎 URL**: `http://localhost:8080/api`  
**狀態**: 生產環境

---

## **Resource 資源**

| Project | Method | URL |
|----------|---------|-----|
| WEB | POST | `/api/load-trend-comparison` |

## **請求參數（Request Parameters）**

**Type**：`json`

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| timeRange | string | Y | 時間範圍，如 `24h`、`7d` |

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
