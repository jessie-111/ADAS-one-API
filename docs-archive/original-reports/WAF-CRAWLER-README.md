# Cloudflare WAF 文檔爬蟲

這是一個獨立的 Node.js 程序，用於爬取 Cloudflare WAF 官方文檔並轉換為 RAG 系統可用的 Markdown 格式文件。

## 功能特點

- ✅ 自動發現並爬取 `/waf/` 路徑下的所有文檔頁面
- ✅ 按主題分類整理內容（custom-rules, managed-rules 等）
- ✅ 轉換為結構化的 Markdown 格式
- ✅ 適合 RAG 系統使用的文檔結構
- ✅ 錯誤處理和重試機制
- ✅ 適當的請求頻率控制

## 安裝與使用

### 1. 安裝依賴
```bash
# 使用提供的 package.json 安裝依賴
npm install --prefix . --package-lock=false axios cheerio
```

或者手動安裝：
```bash
npm install axios cheerio
```

### 2. 執行爬蟲
```bash
node waf-docs-crawler.js
```

### 3. 輸出結果
爬蟲會在當前目錄創建 `waf-docs/` 資料夾，包含以下文件：

```
waf-docs/
├── README.md                      # 總覽和使用說明
├── overview.md                    # WAF 概述
├── get-started.md                 # 入門指南
├── custom-rules.md                # 自定義規則
├── managed-rules.md               # 託管規則
├── rate-limiting-rules.md         # 速率限制規則
├── traffic-detections.md          # 流量檢測
├── additional-tools.md            # 額外工具
├── account-level-configuration.md # 帳戶級配置
├── analytics.md                   # 分析功能
├── reference.md                   # 參考資料
├── troubleshooting.md            # 故障排除
├── glossary.md                   # 術語表
└── changelog.md                  # 更新日誌
```

## 配置選項

您可以在 `waf-docs-crawler.js` 文件頂部的 `CONFIG` 對象中調整以下設置：

```javascript
const CONFIG = {
    BASE_URL: 'https://developers.cloudflare.com',
    START_URL: 'https://developers.cloudflare.com/waf/',
    OUTPUT_DIR: './waf-docs',                    // 輸出目錄
    DELAY_BETWEEN_REQUESTS: 1000,                // 請求間隔（毫秒）
    MAX_RETRIES: 3,                             // 最大重試次數
    REQUEST_TIMEOUT: 30000,                     // 請求超時（毫秒）
    USER_AGENT: '...'                          // User Agent
};
```

## 注意事項

1. **合規使用**: 此爬蟲遵守 robots.txt 規則和請求頻率限制
2. **僅供學習**: 爬取的內容僅用於個人學習和 RAG 系統訓練
3. **網路依賴**: 需要穩定的網路連接，建議在網路環境良好時執行
4. **執行時間**: 完整爬取可能需要 10-30 分鐘，請耐心等待

## 錯誤處理

- 自動重試失敗的請求（最多 3 次）
- 詳細的日誌輸出，便於排查問題
- 部分頁面失敗不會影響整體爬取

## 輸出格式說明

每個 Markdown 文件都包含：
- 文檔標題和來源連結
- 結構化的內容（標題、段落、程式碼塊、列表等）
- 自動生成的目錄（多頁面文件）
- 時間戳記和統計信息

## 適用於 RAG 系統

生成的 Markdown 文件具有以下特點，非常適合 RAG 系統使用：

- ✅ 清晰的文檔結構和分類
- ✅ 保留完整的上下文信息
- ✅ 統一的 Markdown 格式
- ✅ 適中的文件大小（按主題分類）
- ✅ 包含原始來源連結便於驗證

## 更新文檔

要獲取最新的文檔內容，只需重新執行爬蟲即可：
```bash
node waf-docs-crawler.js
```

程序會自動清理舊文件並生成新的內容。

## 技術實現

- **爬取引擎**: Axios + Cheerio（靜態內容爬取）
- **內容處理**: 智能 HTML 到 Markdown 轉換
- **分類邏輯**: 基於 URL 路徑的自動分類
- **錯誤處理**: 重試機制和詳細錯誤日誌

---

如果您遇到任何問題或需要自定義功能，請檢查程序的配置選項或修改對應的程式碼。
