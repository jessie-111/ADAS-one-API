# API 文件規格說明

## **簡介（Introduction）**

此文件說明 ADAS-one-Demo 後端服務的 API 設計與使用規範。本系統提供 DDoS 攻擊分析、安全監控、AI 驅動的安全評估等功能。

**基礎 URL**: `http://localhost:8080/api`  
**狀態**: 生產環境

---

# 1. 獲取 Gemini 模型列表

## **Resource 資源**

| Project | Method | URL |
|----------|---------|-----|
| WEB | GET | `/api/models` |

## **請求參數（Request Parameters）**

**Type**：無

此 API 不需要請求參數。

## **回應欄位（Response Fields）**

| Attribute | Type | Required | Description |
|------------|------|-----------|--------------|
| id | string | Y | 模型 ID |
| name | string | Y | 模型顯示名稱 |

## **回應範例（Example Response）**

```json
[
  {
    "id": "gemini-2.5-pro",
    "name": "Gemini 2.5 Pro"
  },
  {
    "id": "gemini-2.5-flash",
    "name": "Gemini 2.5 Flash"
  },
  {
    "id": "gemini-2.5-flash-lite",
    "name": "Gemini 2.5 Flash Lite"
  }
]
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
