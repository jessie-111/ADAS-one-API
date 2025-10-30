# API 文件規格說明

## **簡介（Introduction）**

此文件說明 ADAS-one-Demo 後端服務的 API 設計與使用規範。本系統提供 DDoS 攻擊分析、安全監控、AI 驅動的安全評估等功能。

**基礎 URL**: `http://localhost:8080/api`  
**狀態**: 生產環境

---

## **需求（Requirements）**

| Requirements | Description |
|---------------|-------------|
| Rate Limit | 所有 `/api/` 端點都有速率限制 |
| CORS | 需符合 CORS 配置要求 |
| Content-Type | POST 請求需設定 `Content-Type: application/json` |

- 所有 `/api/` 端點預設速率限制：每分鐘 100 次請求
- 超過速率限制將返回 `HTTP 429` 錯誤
- POST 請求必須使用 JSON 格式

### **Project 說明**
- **WEB**：Web 或 WAP 平台使用的基礎服務端點。

### **Method**
- HTTP Method（如 GET、POST、PUT、DELETE）

### **URL**
- API 路徑（`:timeRange`、`:filename` 為路徑參數）

---

## **通用錯誤碼（Common Errors）**

| Code | Message |
|------|----------|
| 200 | 成功 |
| 400 | 請求參數錯誤 |
| 404 | 資源不存在 |
| 429 | 請求過於頻繁（速率限制） |
| 500 | 伺服器內部錯誤 |

### **錯誤回應格式**

```json
{
  "error": "錯誤訊息",
  "details": "詳細錯誤描述"
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

