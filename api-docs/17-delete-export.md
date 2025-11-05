# 刪除匯出檔案

## DELETE: /api/delete-export/:filename
- 刪除已匯出的安全分析資料檔案API
- 透過指定檔案名稱，從系統中移除不再需要的匯出檔案，管理儲存空間。


---

## **請求參數（Request Parameters）**

**Type**：路徑參數

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| :filename | string | Y | 檔案名稱 |

## **回應欄位（Response Fields）**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| success | bool | Y | 是否成功 |
| message | string | Y | 回應訊息 |

## **回應範例（Example Response）**

```json
{
  "success": true,
  "message": "檔案已刪除"
}
```

## **錯誤碼（Errors）**

| Code | Message |
|------|----------|
| 400 | 無效的檔案名稱 |
| 404 | 檔案不存在 |
| 500 | 刪除檔案失敗 |

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
