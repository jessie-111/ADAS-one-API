# API 文件規格說明

## **簡介（Introduction）**

此文件說明 ADAS-one-Demo 後端服務的 API 設計與使用規範。本系統提供 DDoS 攻擊分析、安全監控、AI 驅動的安全評估等功能。

**基礎 URL**: `http://localhost:8080/api`  
**狀態**: 生產環境

---

# 13. 防護分析統計

## **Resource 資源**

| Project | Method | URL |
|----------|---------|-----|
| WEB | POST | `/api/security-analysis-stats` |

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

## **錯誤碼（Errors）**

| Code | Message |
|------|----------|
| 400 | 輸入驗證失敗 |
| 400 | 目前僅支援 ELK 資料來源 |

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
