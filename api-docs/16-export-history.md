# 獲取匯出歷史

## GET: /api/export-history
- 查詢已匯出的安全分析資料檔案列表API
- 回傳最近匯出的檔案清單（最多 10 筆），包含檔名、檔案大小及建立日期等資訊。

---

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

