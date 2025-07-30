# 🚀 DDoS 攻擊圖表分析系統 - 完整部署指南

## 📋 系統概述

這是一個基於 AI 的 DDoS 攻擊分析系統，具備以下核心功能：

- **🤖 AI 驅動分析**: 使用 Google Gemini API 進行智能攻擊分析
- **📊 即時資料整合**: 透過 MCP 協議連接 Elasticsearch (ELK Stack)
- **🔒 OWASP 標準**: 整合 OWASP Top 10 攻擊分類
- **📈 視覺化呈現**: 互動式攻擊關聯圖和統計圖表
- **🛡️ 多資料來源**: 支援 ELK 即時查詢和檔案上傳

## 🔧 系統需求

### 基本環境
- **作業系統**: 建議使用 Linux/macOS
- **Node.js**: 版本 18.x 或以上
- **npm**: 版本 9.x 或以上
- **Python**: 版本 3.8+ 

### 核心工具 (必要)
- **uv**: 用於安裝 Python 工具的 pip 編譯器與解析器。
- **mcp-proxy**: ELK MCP Server 的代理工具，為 ELK 整合的關鍵元件。

## 📦 快速部署步驟

### 1. 安裝前置工具 (mcp-proxy)

在開始之前，您必須先安裝 `mcp-proxy`。

```bash
# 步驟 1: 安裝 uv (如果尚未安裝)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 步驟 2: 使用 uv 安裝 mcp-proxy
uv tool install mcp-proxy

# 步驟 3: 將 uv 的工具路徑加入到您的 shell 環境變數中
# 這一步很重要，否則系統會找不到 mcp-proxy 指令
# 根據您的 shell (bash, zsh, etc.)，將下面這行加入到 ~/.bashrc, ~/.zshrc, 或對應的設定檔中
export PATH="$HOME/.local/bin:$PATH"

# 步驟 4: 重新載入 shell 設定或重開一個新的終端
source ~/.zshrc  # 如果您使用 zsh
# source ~/.bashrc # 如果您使用 bash

# 步驟 5: 驗證 mcp-proxy 是否安裝成功
mcp-proxy --version
```

### 2. 克隆並安裝專案

```bash
# 克隆專案
git clone <repository-url>
cd ddos-attack-graph-demo

# 安裝後端依賴
cd backend
npm install

# 安裝前端依賴
cd ../frontend
npm install
```

### 3. 設定 API 金鑰與組態

本專案主要有兩種設定方式：

- **前端設定**: 您的 Google Gemini API Key 是在前端介面的「AI 模型設定」頁面中直接輸入，並在每次請求時傳送至後端。**因此，您不需要在後端設定環境變數**。

- **後端組態**: ELK (Elasticsearch) 相關的連線設定，已寫在 `backend/config/elkConfig.js` 檔案中。如有需要，您可以直接修改該檔案。

**注意**: 專案中的 `.env` 檔案僅用於開發和執行獨立的測試腳本 (`test-*.js`)，對於正常的應用程式啟動並非必要步驟。

### 4. 啟動應用程式

您可以使用 `run.sh` 腳本來一次啟動所有服務，或分別手動啟動。

**方式一：使用啟動腳本 (推薦)**

```bash
# 回到專案根目錄
cd ..

# 賦予腳本執行權限
chmod +x run.sh

# 執行腳本
./run.sh
```

**方式二：手動啟動**

需要開啟兩個終端視窗。

```bash
# 終端 1: 啟動後端服務
cd backend
node index.js
```

```bash
# 終端 2: 啟動前端服務
cd frontend
npm start
```

### 5. 驗證與存取

- **前端介面**: 開啟瀏覽器訪問 http://localhost:3000
- **後端 API**: 服務運行在 http://localhost:8080

---

## ⚙️ ELK 整合設定（進階功能）

如果您有現成的 ELK 環境，需要額外部署 `Elasticsearch MCP Server` 來橋接本系統。

### 部署 Elasticsearch MCP Server

```bash
# 使用 Docker 部署 MCP Server
# 請將 your-elasticsearch-ip 和 your-elasticsearch-api-key 換成您自己的設定
docker run --rm -d \
  -e ES_URL=https://your-elasticsearch-ip:9200 \
  -e ES_API_KEY=your-elasticsearch-api-key \
  -e ES_SSL_SKIP_VERIFY=true \
  -p 8080:8080 \
  docker.elastic.co/mcp/elasticsearch http
```
部署成功後，請將 `backend/.env` 中的 ELK 相關設定指向您部署的 MCP Server 和 Elasticsearch 實例。

---

## 🎯 專案結構說明

```
ddos-attack-graph-demo/
├── backend/                 # 後端 Node.js 服務
│   ├── services/           # 核心服務 (ELK MCP, AI 分析, 趨勢分析)
│   ├── config/             # 配置檔案
│   ├── test-*.js           # 各種測試與除錯腳本
│   └── index.js            # 主要 API 服務
├── frontend/                # 前端 React 應用
│   └── src/                # React 組件和頁面
├── STARTUP_GUIDE.md         # 啟動指南 (本檔案)
├── run.sh                   # 快速啟動腳本
└── cloudflare-field-mapping.js  # Cloudflare 日誌欄位對應表
``` 