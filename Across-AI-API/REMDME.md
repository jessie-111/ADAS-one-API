# Backend API 文檔索引

本目錄包含 Across-AI 後端服務的所有 API 端點詳細文檔。

## 📚 API 文檔列表

### 🤖 AI 模型管理

1. **[GET /api/models](./01-GET-models.md)**
   - 獲取可用的 Gemini AI 模型列表

2. **[POST /api/test-ai](./02-POST-test-ai.md)**
   - 測試 AI 連接是否正常

3. **[POST /api/analyze](./03-POST-analyze.md)**
   - AI 分析（通用）

---

### 🔍 ELK 集成

4. **[GET /api/elk/test-connection](./04-GET-elk-test-connection.md)**
   - 測試 ELK 連接狀態

5. **[GET /api/elk/stats/:timeRange](./05-GET-elk-stats-timeRange.md)**
   - 獲取 ELK 統計資料（帶時間範圍）

6. **[GET /api/elk/stats](./06-GET-elk-stats.md)**
   - 獲取 ELK 統計資料（默認 1 小時）

7. **[GET /api/debug/time-grouping](./07-GET-debug-time-grouping.md)**
   - 調試時間分組（僅開發用）

---

### 🛡️ Cloudflare WAF 分析

8. **[POST /api/analyze-waf-risks-cloudflare](./08-POST-analyze-waf-risks-cloudflare.md)**
   - Cloudflare WAF 風險分析

---

## 🚀 快速開始

### 服務地址
```
http://localhost:8080
```

### 啟動服務
```bash
cd backend
npm install
node index.js
```

---

## 📝 文檔格式說明

每個 API 文檔包含以下章節：

- **API 路徑和方法**：HTTP 方法和完整路徑
- **功能描述**：API 的用途和功能
- **請求參數**：詳細的參數說明和範例
- **回應欄位**：完整的回應結構說明
- **回應範例**：成功和失敗的回應範例
- **狀態碼**：HTTP 狀態碼說明
- **備註**：額外的使用說明和注意事項

---

## 🔑 認證和配置

### Gemini API Key

大部分 AI 分析功能需要 Gemini API Key，請在 `backend/.env` 中配置：

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

### Ollama（可選）

如果使用本地 AI 服務，請配置 Ollama：

```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b
```

### ELK 配置

```env
ELK_MCP_SERVER_URL=http://localhost:3000
ELK_INDEX=cloudflare-logs-*
```

---

## 📊 API 分類概覽

| 分類 | 數量 | 說明 |
|------|------|------|
| AI 模型管理 | 3 | Gemini AI 模型相關操作 |
| ELK 集成 | 4 | Elasticsearch 日誌查詢和統計 |
| WAF 分析 | 1 | Cloudflare WAF 風險分析 |
| **總計** | **8** | - |

---

## 🔗 相關文件

- [完整 API 文檔](../API_DOCUMENTATION.md) - 包含所有 API 的統一文檔
- [ELK 配置](../config/elkConfig.js) - ELK 連接配置
- [Cloudflare 欄位映射](../../cloudflare-field-mapping.js) - Cloudflare 日誌欄位說明

---

## 📞 技術支援

如有問題或建議，請參考：
- 項目主 README
- 相關配置檔案
- 或聯繫項目維護者

---

**最後更新**：2025-11-17

