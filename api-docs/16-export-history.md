# 獲取匯出歷史

## **功能說明**

此 API 用於查詢已匯出的安全分析資料檔案列表。回傳最近匯出的檔案清單（最多 10 筆），包含檔名、檔案大小及建立日期等資訊。

**基礎 URL**: `http://localhost:8080/api`  
**狀態**: 生產環境

---

## **Resource 資源**

| Project | Method | URL |
|----------|---------|-----|
| WEB | GET | `/api/export-history` |

## **請求參數（Request Parameters）**

**Type**：無

此 API 不需要請求參數。

## **回應欄位（Response Fields）**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| success | bool | Y | 是否成功 |
| files | list(object) | Y | 檔案列表（最多 10 筆） |
| total | int | Y | 總檔案數 |

### **files 物件內容**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| filename | string | Y | 檔案名稱 |
| size | int | Y | 檔案大小（bytes） |
| date | string | Y | 建立日期 |

## **回應範例（Example Response）**

```json
{
  "success": true,
  "files": [
    {
      "filename": "security_export_2024-01-01.json",
      "size": 12345,
      "date": "2024-01-01T12:00:00Z"
    }
  ],
  "total": 10
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
