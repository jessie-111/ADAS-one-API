# API 文檔索引

## 📋 目錄

本目錄包含 ADAS-one-Demo 後端服務的所有 API 文檔，每個 API 都有獨立的說明文件。

### 📖 基礎文檔

- [00-introduction.md](00-introduction.md) - 文檔說明與通用規範

---

### 🤖 AI 配置相關

1. [01-get-gemini-models.md](01-get-gemini-models.md) - 獲取 Gemini 模型列表
2. [02-get-ollama-models.md](02-get-ollama-models.md) - 獲取 Ollama 模型列表
3. [03-test-gemini-connection.md](03-test-gemini-connection.md) - 測試 Gemini AI 連接
4. [04-test-ollama-connection.md](04-test-ollama-connection.md) - 測試 Ollama AI 連接
5. [05-ai-analysis.md](05-ai-analysis.md) - AI 分析
6. [06-ai-chat.md](06-ai-chat.md) - AI 對話

---

### 📊 ELK 資料分析

7. [07-test-elk-connection.md](07-test-elk-connection.md) - 測試 ELK 連接
8. [08-analyze-elk-log.md](08-analyze-elk-log.md) - 分析 ELK 日誌
9. [09-get-elk-stats-timeRange.md](09-get-elk-stats-timeRange.md) - 獲取 ELK 統計資料（帶時間範圍）
10. [10-get-elk-stats-default.md](10-get-elk-stats-default.md) - 獲取 ELK 統計資料（預設）

---

### 📈 趨勢對比分析

11. [11-load-trend-comparison.md](11-load-trend-comparison.md) - 載入趨勢對比資料
12. [12-analyze-attack-trends.md](12-analyze-attack-trends.md) - AI 趨勢分析

---

### 🛡️ 安全分析

13. [13-security-analysis-stats.md](13-security-analysis-stats.md) - 防護分析統計
14. [14-security-analysis-ai.md](14-security-analysis-ai.md) - 防護分析 AI 評估

---

### 📥 資料匯出

15. [15-security-data-export.md](15-security-data-export.md) - 匯出安全分析資料
16. [16-export-history.md](16-export-history.md) - 獲取匯出歷史
17. [17-delete-export.md](17-delete-export.md) - 刪除匯出檔案

---

### 🔍 除錯工具

18. [18-debug-time-grouping.md](18-debug-time-grouping.md) - 除錯：時間分組測試

---

## 📊 統計

- **總 API 數量**: 18 個
- **分類**: 6 大類（AI配置、ELK分析、趨勢對比、安全分析、資料匯出、除錯工具）

## 🔗 快速連結

**基礎 URL**: `http://localhost:8080/api`

**所有 API 列表**:

| 編號 | API 名稱 | Method | URL |
|------|---------|--------|-----|
| 1 | 獲取 Gemini 模型列表 | GET | `/api/models` |
| 2 | 獲取 Ollama 模型列表 | POST | `/api/ollama/models` |
| 3 | 測試 Gemini AI 連接 | POST | `/api/test-ai` |
| 4 | 測試 Ollama AI 連接 | POST | `/api/test-ai/ollama` |
| 5 | AI 分析 | POST | `/api/analyze` |
| 6 | AI 對話 | POST | `/api/ai/chat` |
| 7 | 測試 ELK 連接 | GET | `/api/elk/test-connection` |
| 8 | 分析 ELK 日誌 | POST | `/api/analyze-elk-log` |
| 9 | 獲取 ELK 統計資料（帶時間範圍） | GET | `/api/elk/stats/:timeRange` |
| 10 | 獲取 ELK 統計資料（預設） | GET | `/api/elk/stats` |
| 11 | 載入趨勢對比資料 | POST | `/api/load-trend-comparison` |
| 12 | AI 趨勢分析 | POST | `/api/analyze-attack-trends` |
| 13 | 防護分析統計 | POST | `/api/security-analysis-stats` |
| 14 | 防護分析 AI 評估 | POST | `/api/security-analysis-ai` |
| 15 | 匯出安全分析資料 | POST | `/api/security-data-export` |
| 16 | 獲取匯出歷史 | GET | `/api/export-history` |
| 17 | 刪除匯出檔案 | DELETE | `/api/delete-export/:filename` |
| 18 | 除錯：時間分組測試 | GET | `/api/debug/time-grouping` |

