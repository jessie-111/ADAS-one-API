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
- **作業系統**: Linux/macOS/Windows
- **Node.js**: 版本 16.x 或以上
- **npm**: 版本 8.x 或以上
- **記憶體**: 最少 4GB RAM
- **磁碟空間**: 最少 2GB 可用空間

### 可選元件（進階功能）
- **Docker**: 用於 ELK MCP Server（如需 ELK 整合）
- **Elasticsearch**: 版本 7.x 或 8.x（如有現有 ELK 環境）
- **Python**: 版本 3.8+ （如需 mcp-proxy）

## 📦 快速部署（推薦）

### 1. 克隆專案
```bash
git clone <repository-url>
cd ddos-attack-graph-demo
```

### 2. 一鍵安裝依賴
```bash
# 安裝後端依賴
cd backend
npm install

# 安裝前端依賴
cd ../frontend
npm install

# 返回專案根目錄
cd ..
```

### 3. 基本配置
```bash
# 複製環境變數範例檔案
cp backend/env.example backend/.env

# 編輯配置檔案（必須設定 AI API Key）
nano backend/.env
```

### 4. 快速啟動
```bash
# 使用提供的啟動腳本
chmod +x run.sh
./run.sh
```

**服務訪問地址：**
- 前端介面：http://localhost:3000
- 後端 API：http://localhost:8080

---

## 🛠️ 詳細部署步驟

### 步驟 1: 環境準備

#### 1.1 檢查 Node.js 版本
```bash
node --version  # 應該是 v16.x 或以上
npm --version   # 應該是 8.x 或以上
```

#### 1.2 安裝 Node.js（如需要）
```bash
# macOS (使用 Homebrew)
brew install node

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### 步驟 2: 專案安裝

#### 2.1 克隆專案
```bash
git clone <repository-url>
cd ddos-attack-graph-demo
```

#### 2.2 安裝後端依賴
```bash
cd backend
npm install

# 驗證關鍵依賴安裝

npm list @modelcontextprotocol/sdk
npm list express
```

#### 2.3 安裝前端依賴
```bash
cd ../frontend
npm install

# 驗證關鍵依賴安裝
npm list react
npm list @mui/material
npm list vis-network
```

### 步驟 3: 配置設定

#### 3.1 建立環境配置檔案
```bash
cd ../backend
cp env.example .env
```

#### 3.2 基本配置（必要）
編輯 `backend/.env` 檔案：

```bash
# ===========================================
# 必要配置 - AI 分析功能
# ===========================================
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# ===========================================
# 服務配置
# ===========================================
PORT=8080
NODE_ENV=development
```

**🚨 重要：必須設定有效的 Google Gemini API Key**

#### 3.3 Google Gemini API Key 申請
1. 前往 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 登入 Google 帳號
3. 點擊「Create API Key」
4. 複製 API Key 並更新 `.env` 檔案

#### 3.4 ELK 整合配置（必要）

配置 ELK 連接以啟用即時資料分析：

```bash
# ===========================================
# ELK MCP 連接配置（必要）
# ===========================================
ELK_MCP_SERVER_URL=http://your-elk-server:8080
ELK_MCP_PROTOCOL=proxy

# Elasticsearch 配置（使用 API Key 認證，無需用戶名/密碼）
ELK_HOST=https://your-elasticsearch:9200
ELK_INDEX=your-log-index-*
ELK_API_KEY=your_elasticsearch_api_key

# 查詢配置
ELK_TIME_RANGE=1h
ELK_MAX_TIME_RANGE=24h
ELK_ATTACK_THRESHOLD=20
ELK_TIME_WINDOW=10
```

### 步驟 4: 服務啟動

#### 4.1 方法一：使用啟動腳本（推薦）
```bash
# 回到專案根目錄
cd ..

# 賦予執行權限
chmod +x run.sh

# 啟動服務
./run.sh
```

#### 4.2 方法二：手動啟動
```bash
# 終端 1: 啟動後端服務
cd backend
node index.js &

# 終端 2: 啟動前端服務（另開新終端）
cd frontend
npm start
### 步驟 5: 驗證部署

#### 5.1 檢查服務狀態
```bash
# 檢查後端服務
curl http://localhost:8080/api/models
# 預期回應：Gemini 模型列表

# 檢查前端服務
curl http://localhost:3000
# 預期回應：HTML 頁面內容
```

#### 5.2 檢查進程
```bash
# 檢查 Node.js 進程
ps aux | grep node

# 檢查端口使用
netstat -an | grep :3000  # 前端
netstat -an | grep :8080  # 後端
```
程式Server 安裝 mcp proxy 
uv tool install mcp-proxy

#### 5.3 瀏覽器測試
1. 開啟瀏覽器訪問：http://localhost:3000
2. 檢查是否看到 DDoS 分析系統介面
3. 導航至「AI 助手設定」頁面
4. 確認 API Key 設定正確
5. 上傳測試日誌檔案進行分析

---

## ⚙️ ELK 整合設定（進階功能）

### 情況 1: 您有現有的 ELK 環境

#### 1.1 部署 Elasticsearch MCP Server
```bash
# 使用 Docker 部署 MCP Server
docker run --rm  -d -e ES_URL=https://your-elasticsearch:9200   -e ES_API_KEY=your-elasticsearch1_api_key   -e ES_SSL_SKIP_VERIFY=true   -p 8080:8080   docker.elastic.co/mcp/elasticsearch http
```

#### 1.2 更新系統配置
```bash
# 編輯 backend/config/elkConfig.js
修改 // HTTP MCP Server URL（您的 MCP 服務位址）
    serverUrl: process.env.ELK_MCP_SERVER_URL || 'http://your-elasticsearch:8080',
修改 // mcp-proxy 模式配置（推薦）
      '--transport=streamablehttp',
      `http://your-elasticsearch:8080/mcp`
修改 // Elasticsearch 連接配置
    host: process.env.ELK_HOST || 'https://your-elasticsearch:9200',

修改 //ELK Table
    index: process.env.ELK_INDEX || 'your-elasticsearch_table_name',
新增 //elk api key
    apiKey: process.env.ELK_API_KEY || 'your-elasticsearch1_api_key',
```


---
## 🎯 專案結構說明

```
ddos-attack-graph-demo/
├── backend/                 # 後端 Node.js 服務
│   ├── services/           # 核心服務 (ELK MCP, AI 分析)
│   ├── config/             # 配置檔案
│   ├── test-*.js          # 測試腳本
│   └── index.js           # 主要 API 服務
├── frontend/               # 前端 React 應用
│   └── src/               # React 組件和頁面
├── *.md                   # 文檔檔案
├── run.sh                 # 啟動腳本
└── cloudflare-field-mapping.js  # 欄位對應表
```
---

## 🏗 整體架構設計

### 系統架構圖
```
┌─────────────┐    MCP Protocol    ┌─────────────┐    HTTP API    ┌─────────────┐
│   AI 分析    │◄─────────────────►│ MCP Server  │◄─────────────►│ ELK Stack   │
│   系統       │                   │  (Docker)   │                │    (VM)     │
└─────────────┘                   └─────────────┘                └─────────────┘
       │                                                                   │
       ▼                                                                   │
┌─────────────┐                                                           │
│ 欄位對應表   │                                                           │
│ + OWASP    │                                                           │
│ 參考資料    │                                                           │
└─────────────┘                                                           │
       │                                                                   │
       ▼                                                                   │
┌─────────────┐    在發現攻擊時觸發    ┌─────────────┐◄─────────────────────┘
│ OWASP API   │◄─────────────────────│ 攻擊事件     │
│ 查詢服務    │                      │ 檢測器       │
└─────────────┘                      └─────────────┘

🎉 **恭喜！DDoS 攻擊圖表分析系統已成功部署！**

如有任何問題，請參考故障排除章節或檢查日誌檔案。 