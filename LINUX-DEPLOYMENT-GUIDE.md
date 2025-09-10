# DDoS Attack Graph Demo - Linux 部署指南

## 📋 概述

本文件提供從 macOS 開發環境轉移到 Linux 生產環境的詳細部署步驟和檔案修改指南。


## 🖥️ 支援的 Linux 發行版

- Ubuntu 18.04+ / Debian 9+
- CentOS 7+ / RHEL 7+
- Amazon Linux 2
- 其他主流 Linux 發行版

## 📝 需要修改的檔案清單



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
**git安裝**
```bash
sudo apt-get install git
```

**git ssh 教學**
```bash
針對你的專案 https://github.com/petertzeng0610/ADAS-one-Demo.git，
如果你需要在同一台伺服器上設定多個 deploy key，SSH config 檔需要加上每個 repository 對應的 alias。這樣 git 操作就會根據指定 alias 使用不同的私鑰。

SSH 設定教學
1. 產生 Deploy Key
在你的 server 上執行：

bash
ssh-keygen -t ed25519 -f ~/.ssh/adas-one-demo_deploy_key -C "ADAS-one-Demo deploy key"
這會產生 adas-one-demo_deploy_key（私鑰）和 adas-one-demo_deploy_key.pub（公鑰）。

2. 將公鑰加到 GitHub Repo Deploy Keys
到 ADAS-one-Demo repository 頁面：

點選 Settings → Deploy Keys → Add deploy key

Title 輸入自訂名稱

Key 貼上 adas-one-demo_deploy_key.pub 內容

選擇要不要 勾 write 權限（通常只拉取請用預設 read-only）

按 Add key

3. 編輯 SSH Config
在 server 的 ~/.ssh/config 加入一段（假如只有這個 repository，就這一個 block）：

bash
Host github.com-adas-one-demo
    HostName github.com
    User git
    IdentityFile ~/.ssh/adas-one-demo_deploy_key
Host github.com-adas-one-demo 是你自訂的 alias（不影響 github 上名稱）

IdentityFile 指向剛才產生的私鑰

4. 使用該 alias 進行 clone/push/pull
你不能直接用官方網址，要用 ssh alias 這個格式：

bash
git clone git@github.com-adas-one-demo:petertzeng0610/ADAS-one-Demo.git
注意這裡：

git@github.com-adas-one-demo:

不是平常的 git@github.com:...

這樣 git 會用剛剛那個 deploy key 來認證這個 repo。
```

**npm安裝:**
```bash
apt install npm

#前後端安裝套件

/root/ADAS-one-Demo/frontend

npm install

/root/ADAS-one-Demo/backend

npm install

```

**驗證安裝:**
```bash
node --version  # 應該顯示 v18.x.x 或更高版本
npm --version   # 應該顯示 npm 版本
```
**mcp proxy安裝:**
```bash
sudo apt install -y python3 python3-pip
sudo apt install -y pipx
pipx ensurepath
source ~/.bashrc
pipx install mcp-proxy
# 5. 驗證安裝
which mcp-proxy
mcp-proxy --version
```


#### 修改 2: `backend/config/elkConfig.js` - 驗證路徑配置(安裝完預設會在/.local/bin/mcp-proxy)

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

**方法 2: 手動下載到 .local/bin**
```bash
mkdir -p ~/.local/bin
# 根據實際情況下載或編譯 mcp-proxy
# 確保有執行權限
chmod +x ~/.local/bin/mcp-proxy
```

#### 修改創建或修改 `.env` 檔案

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
```

**修改CORS問題**
```bash
sed -i 's/CORS_ORIGINS=.*/CORS_ORIGINS=http:\/\/localhost:3000,http:\/\/10.168.10.102:3000,http:\/\/10.168.10.102:8080/' .env

一次修改localhost問題

# 進入前端目錄
cd /root/ADAS-one-Demo/frontend

# 一次性替換所有檔案中的 localhost:8080 為 10.168.10.102:8080
find src/ -name "*.jsx" -o -name "*.js" | xargs sed -i 's/localhost:8080/10.168.10.102:8080/g'

# 驗證修改結果
# 檢查是否還有遺漏的 localhost:8080
grep -r "localhost:8080" src/

# 檢查新IP是否正確設置
grep -r "10.168.10.102:8080" src/ | head -10

# 查看具體修改了哪些檔案
grep -l "10.168.10.102:8080" src/**/*.jsx src/**/*.js

# 如果需要改回 localhost (回復原狀)
find src/ -name "*.jsx" -o -name "*.js" | xargs sed -i 's/10.168.10.102:8080/localhost:8080/g'

完成後重新F5畫面，查看AI分析設定是否有抓到模型＆資料來源是否綠燈
```

**ELK用:**
```bash
#### C. 安裝 Docker (如果使用 MCP Server)
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


### 啟動服務

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

# 檢查 Node.js 版本，看是前端還是後端，到該目錄底下
node --version
npm --version
npm list 出現錯誤的套件EX:react-scripts

# 前端出現react-scripts錯誤的話，解法如下

# 1. 確認在前端目錄
cd /root/ADAS-one-Demo/frontend
pwd

# 2. 檢查當前問題
npm list react-scripts
cat package.json | grep react-scripts

# 3. 移除有問題的 react-scripts
npm uninstall react-scripts

# 4. 清除快取
npm cache clean --force

# 5. 重新安裝正確版本
npm install react-scripts@5.0.1 --save

# 6. 驗證修復
npm list react-scripts
# 應該顯示 react-scripts@5.0.1
```

## 🔐 生產環境安全建議

### 1. 環境變數安全

```bash
# 設定適當的檔案權限
chmod 600 .env

# 不要將 .env 檔案加入版本控制
echo ".env" >> .gitignore
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




