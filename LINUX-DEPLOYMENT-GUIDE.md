# DDoS Attack Graph Demo - Linux 部署指南

## 📋 概述

本文件提供從 macOS 開發環境轉移到 Linux 生產環境的詳細部署步驟和檔案修改指南。

## 🎯 部署難度評估

- **整體難度**: 🟢 低到中等
- **預估時間**: 4-7 小時
- **風險等級**: 低
- **主要工作**: 配置調整，無需重寫程式碼

## 🖥️ 支援的 Linux 發行版

- Ubuntu 18.04+ / Debian 9+
- CentOS 7+ / RHEL 7+
- Amazon Linux 2
- 其他主流 Linux 發行版

## 📝 需要修改的檔案清單

### 1. 必須修改的檔案

| 檔案名稱 | 修改類型 | 重要度 |
|---------|----------|--------|
| `run.sh` | 路徑修改 | 🔴 高 |
| `backend/config/elkConfig.js` | 路徑驗證 | 🟡 中 |
| `.env` | 環境變數 | 🟡 中 |

### 2. 建議檢查的檔案

| 檔案名稱 | 檢查項目 | 重要度 |
|---------|----------|--------|
| `backend/restart.sh` | 工具相容性 | 🟢 低 |
| `check-crawler-status.sh` | 已優化 | 🟢 低 |

## 🛠️ 詳細修改步驟

### 步驟 1: Linux 系統準備

#### A. 安裝必要的系統套件

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y curl wget git build-essential lsof procps net-tools
```

**CentOS/RHEL 7:**
```bash
sudo yum update
sudo yum install -y curl wget git gcc gcc-c++ make lsof procps-ng net-tools
```

**CentOS/RHEL 8+ / Fedora:**
```bash
sudo dnf update
sudo dnf install -y curl wget git gcc gcc-c++ make lsof procps-ng net-tools
```

#### B. 安裝 Node.js

**方法 1: 使用 NodeSource 官方倉庫 (推薦)**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

**方法 2: 使用 NVM (開發環境推薦)**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

**驗證安裝:**
```bash
node --version  # 應該顯示 v18.x.x 或更高版本
npm --version   # 應該顯示 npm 版本
```

#### C. 安裝 Docker (如果使用 MCP Server)

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# CentOS/RHEL
sudo yum install -y docker docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# 需要重新登入或執行
newgrp docker
```

### 步驟 2: 專案檔案修改

#### 修改 1: `run.sh` - 路徑調整

**原始內容 (第5行):**
```bash
export PATH="/Users/peter/.local/bin:$PATH"
```

**修改後:**
```bash
export PATH="$HOME/.local/bin:$PATH"
```

**完整的修改後的 run.sh:**
```bash
#!/bin/bash

# 進入 backend 資料夾，設定環境變數並啟動後端
cd backend || exit 1
export PATH="$HOME/.local/bin:$PATH"  # ← 修改此行
node index.js &

# 返回上一層
cd ..

# 進入 frontend 資料夾並啟動前端
cd frontend || exit 1
npm start
```

#### 修改 2: `backend/config/elkConfig.js` - 驗證路徑配置

**檢查第 14 行:**
```javascript
proxyCommand: process.env.HOME + '/.local/bin/mcp-proxy',
```

**如果 mcp-proxy 位於不同位置，建議使用環境變數:**

**選項 A: 使用環境變數 (推薦)**
```javascript
proxyCommand: process.env.MCP_PROXY_PATH || process.env.HOME + '/.local/bin/mcp-proxy',
```

**選項 B: 如果 mcp-proxy 在系統 PATH 中**
```javascript
proxyCommand: 'mcp-proxy',
```

#### 修改 3: 創建或修改 `.env` 檔案

**複製範例檔案:**
```bash
cp backend/env.config.example .env
# 或
cp backend/env.example .env
```

**關鍵環境變數設定:**
```bash
# 服務配置
PORT=8080
NODE_ENV=production

# ELK Stack 設定 (根據實際環境調整)
ELK_HOST=https://10.168.10.250:9200
ELK_INDEX=adasone-cf-logpush-*
ELK_API_KEY=your_actual_api_key_here
ELK_MCP_SERVER_URL=http://10.168.10.250:8080

# AI 服務設定
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
OLLAMA_URL=http://localhost:11434

# 安全設定
CORS_ORIGINS=http://localhost:3000,http://your-domain.com
RATE_LIMIT_MAX=100

# MCP Proxy 路徑 (如果需要自訂)
# MCP_PROXY_PATH=/custom/path/to/mcp-proxy
```

### 步驟 3: 安裝 mcp-proxy (如果使用)

#### 檢查 mcp-proxy 是否存在

```bash
# 檢查是否已安裝
which mcp-proxy
ls -la ~/.local/bin/mcp-proxy

# 如果不存在，需要安裝
```

#### 安裝 mcp-proxy

**方法 1: 使用 npm 全域安裝 (如果可用)**
```bash
npm install -g @modelcontextprotocol/mcp-proxy
```

**方法 2: 手動下載到 .local/bin**
```bash
mkdir -p ~/.local/bin
# 根據實際情況下載或編譯 mcp-proxy
# 確保有執行權限
chmod +x ~/.local/bin/mcp-proxy
```

**方法 3: 修改配置使用 Docker**
如果無法安裝 mcp-proxy，可以修改配置使用 Docker 模式：

```bash
# 在 .env 檔案中設定
ELK_MCP_PROTOCOL=stdio
ELK_MCP_COMMAND=docker
```

## 🚀 部署執行步驟

### 步驟 1: 下載專案

```bash
# 假設使用 git clone
git clone <your-repo-url> ddos-attack-graph-demo
cd ddos-attack-graph-demo
```

### 步驟 2: 安裝依賴套件

```bash
# 安裝後端依賴
cd backend
npm install

# 安裝前端依賴
cd ../frontend
npm install

# 回到專案根目錄
cd ..
```

### 步驟 3: 應用檔案修改

按照上述「步驟 2: 專案檔案修改」執行所有必要的修改。

### 步驟 4: 設定權限

```bash
# 設定腳本執行權限
chmod +x run.sh
chmod +x run-staged-crawler.sh
chmod +x check-crawler-status.sh
chmod +x backend/restart.sh

# 如果有 mcp-proxy
chmod +x ~/.local/bin/mcp-proxy
```

### 步驟 5: 測試連接

#### A. 測試 ELK 連接

```bash
cd backend
node -e "
const { elkMCPClient } = require('./services/elkMCPClient');
(async () => {
  try {
    const success = await elkMCPClient.testConnection();
    console.log('ELK 連接測試:', success ? '✅ 成功' : '❌ 失敗');
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    process.exit(1);
  }
})();
"
```

#### B. 測試環境設定

```bash
cd backend
node -e "
require('dotenv').config();
console.log('環境變數檢查:');
console.log('PORT:', process.env.PORT);
console.log('ELK_HOST:', process.env.ELK_HOST);
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '已設定' : '未設定');
"
```

### 步驟 6: 啟動服務

#### 方法 1: 使用 run.sh (推薦用於開發)

```bash
./run.sh
```

#### 方法 2: 分別啟動 (推薦用於生產)

```bash
# 終端 1: 啟動後端
cd backend
npm start
# 或
node index.js

# 終端 2: 啟動前端
cd frontend
npm run build  # 生產環境建議先建置
npm start
```

#### 方法 3: 使用 PM2 (生產環境推薦)

```bash
# 安裝 PM2
npm install -g pm2

# 啟動後端
cd backend
pm2 start index.js --name ddos-backend

# 建置並部署前端
cd ../frontend
npm run build
# 使用 nginx 或其他網頁伺服器提供靜態檔案

# 檢查狀態
pm2 status
pm2 logs ddos-backend
```

## ✅ 部署驗證

### 檢查清單

- [ ] **系統工具**: `curl`、`lsof`、`pgrep`、`pkill` 命令可用
- [ ] **Node.js**: 版本 >= 16.0.0
- [ ] **專案檔案**: 所有修改已完成
- [ ] **依賴套件**: `npm install` 成功
- [ ] **環境變數**: `.env` 檔案配置正確
- [ ] **MCP 連接**: ELK MCP Server 可連接
- [ ] **服務啟動**: 前後端服務正常啟動
- [ ] **功能測試**: 基本功能運作正常

### 驗證命令

```bash
# 檢查服務狀態
curl http://localhost:8080/api/health
curl http://localhost:3000

# 檢查進程
pgrep -f "node index.js"
pgrep -f "react-scripts"

# 檢查端口
lsof -i :8080
lsof -i :3000

# 檢查日誌
tail -f backend/startup.log
tail -f frontend/frontend.log
```

## 🔧 故障排除

### 常見問題 1: mcp-proxy 找不到

**症狀:**
```
Error: spawn /home/user/.local/bin/mcp-proxy ENOENT
```

**解決方案:**
1. 檢查 mcp-proxy 是否存在並有執行權限
2. 使用絕對路徑或添加到 PATH
3. 改用 Docker 模式

### 常見問題 2: 權限問題

**症狀:**
```
Error: EACCES: permission denied
```

**解決方案:**
```bash
# 修正檔案權限
chmod +x run.sh
chmod +x backend/restart.sh
chmod 755 ~/.local/bin/mcp-proxy

# 修正目錄權限
chown -R $USER:$USER ~/ddos-attack-graph-demo
```

### 常見問題 3: 端口被占用

**症狀:**
```
Error: listen EADDRINUSE :::8080
```

**解決方案:**
```bash
# 查找占用端口的進程
lsof -i :8080
# 終止進程
kill -9 <PID>
# 或更改端口
export PORT=8081
```

### 常見問題 4: ELK 連接失敗

**症狀:**
```
❌ ELK MCP Server 連接失敗
```

**解決方案:**
1. 檢查 ELK 伺服器是否可達
2. 驗證 API 金鑰
3. 確認網路連通性
4. 檢查防火牆設定

### 常見問題 5: 模組找不到

**症狀:**
```
Error: Cannot find module 'xxx'
```

**解決方案:**
```bash
# 清除快取並重新安裝
rm -rf node_modules package-lock.json
npm install

# 檢查 Node.js 版本
node --version
npm --version
```

## 🔐 生產環境安全建議

### 1. 環境變數安全

```bash
# 設定適當的檔案權限
chmod 600 .env

# 不要將 .env 檔案加入版本控制
echo ".env" >> .gitignore
```

### 2. 防火牆配置

```bash
# Ubuntu/Debian (使用 ufw)
sudo ufw allow 22    # SSH
sudo ufw allow 8080  # 後端 API
sudo ufw allow 3000  # 前端 (如果直接暴露)
sudo ufw enable

# CentOS/RHEL (使用 firewalld)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 3. 服務管理

```bash
# 使用 systemd 建立系統服務
sudo tee /etc/systemd/system/ddos-backend.service << EOF
[Unit]
Description=DDoS Attack Graph Demo Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/path/to/ddos-attack-graph-demo/backend
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 啟用服務
sudo systemctl daemon-reload
sudo systemctl enable ddos-backend
sudo systemctl start ddos-backend
```

## 📊 效能調整

### Node.js 調整

```bash
# 設定 Node.js 記憶體限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 啟用叢集模式 (修改 index.js)
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // 原始應用程式碼
}
```

### 系統調整

```bash
# 調整檔案描述符限制
echo "* soft nofile 65535" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65535" | sudo tee -a /etc/security/limits.conf

# 調整網路參數
echo "net.core.somaxconn = 65535" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 📚 更多資源

- [Node.js 官方文件](https://nodejs.org/docs/)
- [Docker 安裝指南](https://docs.docker.com/engine/install/)
- [PM2 部署指南](https://pm2.keymetrics.io/docs/)
- [Elasticsearch 文件](https://www.elastic.co/guide/)

## 🆘 技術支援

如果遇到問題，請檢查：

1. 系統日誌: `journalctl -f`
2. 應用程式日誌: `tail -f backend/startup.log`
3. PM2 日誌: `pm2 logs`
4. Docker 日誌: `docker logs <container>`

---

**最後更新**: $(date)
**版本**: 1.0.0
**適用於**: ddos-attack-graph-demo Linux 部署

