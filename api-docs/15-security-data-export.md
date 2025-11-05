# 匯出安全分析資料

## POST: /api/security-data-export
- 將安全分析資料匯出為檔案API
- 支援匯出統計資料、圖表資料及原始日誌，產生 JSON 格式的檔案供下載，便於資料備份與離線分析。

---

## **請求參數（Request Parameters）**

**Type**：`json`

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| timeRange | string | N | 時間範圍 |
| startTime | string | N | 開始時間（ISO 8601 格式） |
| endTime | string | N | 結束時間（ISO 8601 格式） |
| options | object | Y | 匯出選項 |

## **請求範例（Example Request）**

使用時間範圍（不含原始資料）：
```json
{
  "timeRange": "24h",
  "options": {
    "includeRawData": false,
    "format": "json"
  }
}
```

使用自訂時間（包含原始資料）：
```json
{
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-01-01T23:59:59Z",
  "options": {
    "includeRawData": true,
    "format": "json"
  }
}
```

### **options 物件內容**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| includeRawData | bool | N | 是否包含原始日誌資料，預設為 `false` |
| format | string | N | 匯出格式，目前僅支援 `json`，預設為 `json` |

## **回應欄位（Response Fields）**

**Content-Type**: `application/json; charset=utf-8`  
**Content-Disposition**: `attachment; filename="security_export_*.json"`

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| metadata | object | Y | 元資料 |
| statistics | object | N | 統計資料（根據 options 決定） |
| charts | object | N | 圖表資料（根據 options 決定） |
| rawData | list(object) | N | 原始日誌資料（當 includeRawData 為 true 時） |

## **回應範例（Example Response）**

```json
{
  "metadata": {
    "exportTime": "2024-01-01T12:00:00Z",
    "exportVersion": "1.0",
    "recordCounts": {
      "totalRequests": 1000,
      "totalAttacks": 15,
      "rawLogEntries": 1000
    },
    "timeRange": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-01T23:59:59Z"
    }
  },
  "statistics": {
    "totalRequests": 1000,
    "blockedRequestsCount": 10
  },
  "charts": {
    "attackTypes": {}
  },
  "rawData": [
    {
      "timestamp": "2024-01-01T00:00:00Z",
      "clientIP": "192.168.1.1"
    }
  ]
}
```

## **錯誤碼（Errors）**

| Code | Message |
|------|----------|
| 400 | 缺少匯出選項設定 |
| 500 | 資料匯出失敗 |

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
