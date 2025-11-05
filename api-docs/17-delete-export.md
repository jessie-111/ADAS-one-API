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

## **錯誤回應範例（Example ERROR Response Message）**


**HTTP 400 - 無效的檔案名稱**
```json
{
  "error": "無效的檔案名稱",
  "statusCode": 400
}
```

**HTTP 404 - 檔案不存在**
```json
{
  "error": "檔案不存在",
  "statusCode": 404
}
```

**HTTP 500 - 刪除檔案失敗**
```json
{
  "error": "刪除檔案失敗",
  "statusCode": 500
}
```
