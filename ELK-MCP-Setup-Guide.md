# 🚀 ELK MCP 整合設定指南

本指南將協助您設定 DDoS 攻擊分析系統與 ELK Stack 的整合，透過 Model Context Protocol (MCP) 實現 AI 直接查詢 Elasticsearch 資料。

## 📋 系統需求

### 必要軟體
- **Docker**: 用於運行 Elasticsearch MCP Server
- **Node.js**: 版本 16 或以上
- **Elasticsearch**: 7.x 或 8.x 版本
- **Logstash**: 用於日誌處理（可選）
- **Kibana**: 用於視覺化（可選）

### 網路需求
- ELK Stack 與 MCP Server 之間的網路連通性
- Docker 容器能夠訪問 Elasticsearch 服務

## 🛠 步驟一：ELK Stack 設定

### 1.1 Elasticsearch 配置

確保您的 Elasticsearch 叢集正在運行並可訪問：

```bash
# 檢查 Elasticsearch 狀態
curl -X GET "localhost:9200/_cluster/health?pretty"
```

### 1.2 建立 API Key（推薦）

```bash
# 在 Elasticsearch 中建立 API Key
curl -X POST "localhost:9200/_security/api_key" \
  -H "Content-Type: application/json" \
  -u elastic:your_password \
  -d '{
    "name": "ddos-analyzer-key",
    "role_descriptors": {
      "ddos_analyzer_role": {
        "cluster": ["monitor"],
        "index": [
          {
            "names": ["cloudflare-logs-*"],
            "privileges": ["read", "view_index_metadata"]
          }
        ]
      }
    },
    "metadata": {
      "application": "ddos-analyzer"
    }
  }'
```

記錄返回的 `id` 和 `api_key`，格式為：`id:api_key`

### 1.3 索引模板設定

確保 Cloudflare 日誌的索引模板正確設定：

```json
{
  "index_patterns": ["cloudflare-logs-*"],
  "template": {
    "mappings": {
      "properties": {
        "ClientIP": { "type": "ip" },
        "ClientCountry": { "type": "keyword" },
        "ClientASN": { "type": "integer" },
        "EdgeStartTimestamp": { "type": "date" },
        "EdgeEndTimestamp": { "type": "date" },
        "ClientRequestURI": { "type": "keyword" },
        "EdgeResponseStatus": { "type": "integer" },
        "EdgeResponseBytes": { "type": "long" },
        "SecurityAction": { "type": "keyword" },
        "WAFAttackScore": { "type": "integer" },
        "WAFSQLiAttackScore": { "type": "integer" },
        "WAFXSSAttackScore": { "type": "integer" },
        "ClientRequestUserAgent": { "type": "text" },
        "RayID": { "type": "keyword" }
      }
    }
  }
}
```

## 🐳 步驟二：MCP Server 設定

### 方案 A：使用 Cloudflare 官方 MCP Server（推薦）

#### 2.1 克隆 Cloudflare MCP Server

```bash
# 克隆官方倉庫
git clone https://github.com/cloudflare/mcp-server-cloudflare.git
cd mcp-server-cloudflare

# 檢查可用的服務
ls apps/
```

#### 2.2 安裝相依套件

```bash
# 方案 A：使用 pnpm（需要 Node.js v18.12+）
npm install -g pnpm
pnpm install

# 方案 B：使用 npm（適用於較舊的 Node.js 版本）
npm install

# 如果遇到版本相容性問題，可以忽略引擎檢查
npm install --ignore-engines
```

#### 2.3 設定 Cloudflare API Token

建立 `.env` 檔案：

```bash
# Cloudflare API 配置
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_ZONE_ID=your_zone_id_here
```

#### 2.4 啟動相關的 MCP 服務

```bash
# 使用 pnpm 啟動
# 啟動 Logpush Server（處理 Cloudflare 日誌）
cd apps/logpush
pnpm run dev

# 或啟動 GraphQL Server（獲取分析資料）
cd apps/graphql
pnpm run dev

# 使用 npm 啟動（如果使用 npm 安裝）
# 啟動 Logpush Server
cd apps/logpush
npm run dev

# 或啟動 GraphQL Server
cd apps/graphql
npm run dev
```

### 方案 B：使用 Elasticsearch MCP Server（如果需要直接查詢 ELK）

**⚠️ 注意**: 此 MCP Server 為實驗性質。

**可用的 MCP 工具**:
- `list_indices`: 列出所有可用的 Elasticsearch 索引
- `get_mappings`: 獲取特定索引的欄位映射
- `search`: 執行 Elasticsearch 查詢 DSL
- `esql`: 執行 ES|QL 查詢
- `get_shards`: 獲取索引分片資訊

**支援的 Elasticsearch 版本**: 8.x 和 9.x

**MCP 協議選擇**:
- **stdio**: 適用於 MCP 客戶端（如 Claude Desktop）
- **HTTP**: 適用於 Web 應用整合（推薦用於我們的 DDoS 分析系統）
- **SSE**: 已棄用，建議使用 HTTP

#### 2.1 方案 B1：使用官方 Docker 映像（推薦）

```bash
# 拉取 Elastic 官方 MCP Server
docker pull docker.elastic.co/mcp/elasticsearch

# 查看使用說明
docker run docker.elastic.co/mcp/elasticsearch
```

#### 2.2 方案 B2：從原始碼建立（進階用戶）

```bash
# 克隆 Elastic 官方 MCP Server 倉庫
git clone https://github.com/elastic/mcp-server-elasticsearch.git
cd mcp-server-elasticsearch

# 查看 .env-example 檔案
cat .env-example

# 複製並編輯環境變數
cp .env-example .env
# 編輯 .env 檔案設定您的 Elasticsearch 連接資訊
```

#### 2.3 建立 Docker 配置檔案

**方案 B1：使用官方映像**

建立 `docker-compose.yml`：

```yaml
version: '3.8'
services:
  mcp-server-elasticsearch:
    image: docker.elastic.co/mcp/elasticsearch:latest
    container_name: mcp-server-elasticsearch
    environment:
      - ES_URL=https://10.168.10.250:9200
      - ES_API_KEY=Z3h5NE1KZ0JXTG9ZV1JjU3pleTA6b2Nfd1FEWjZfUTZmYVZHaW1kRzB6dw==
      - ES_SSL_SKIP_VERIFY=true
    network_mode: host
    restart: unless-stopped
```

**方案 B2：從原始碼建立**

建立 `.env` 檔案（在 `mcp-server-elasticsearch/` 目錄）：

```bash
# Elasticsearch 連接配置
ES_URL=https://10.168.10.250:9200
ES_API_KEY=Z3h5NE1KZ0JXTG9ZV1JjU3pleTA6b2Nfd1FEWjZfUTZmYVZHaW1kRzB6dw==
ES_SSL_SKIP_VERIFY=true

# 或使用基本認證（二選一）
ES_USERNAME=elastic
ES_PASSWORD=your_password_if_needed
```

#### 2.4 啟動 MCP Server

**方案 B1：使用官方映像**

```bash
# 使用 docker-compose 啟動
docker-compose up -d mcp-server-elasticsearch

# 使用 stdio 協議（適用於 MCP 客戶端）
docker run -i --rm \
  -e ES_URL=https://10.168.10.250:9200 \
  -e ES_API_KEY=Z3h5NE1KZ0JXTG9ZV1JjU3pleTA6b2Nfd1FEWjZfUTZmYVZHaW1kRzB6dw== \
  -e ES_SSL_SKIP_VERIFY=true \
  docker.elastic.co/mcp/elasticsearch stdio

# 使用 HTTP 協議（適用於 Web 應用）
docker run --rm \
  -e ES_URL=https://10.168.10.250:9200 \
  -e ES_API_KEY=Z3h5NE1KZ0JXTG9ZV1JjU3pleTA6b2Nfd1FEWjZfUTZmYVZHaW1kRzB6dw== \
  -e ES_SSL_SKIP_VERIFY=true \
  -p 8080:8080 \
  docker.elastic.co/mcp/elasticsearch http
```

**方案 B2：從原始碼啟動**

```bash
# 進入專案目錄
cd mcp-server-elasticsearch

# 注意：這是一個 Rust 專案，需要 Rust 編譯環境
# 安裝 Rust（如果尚未安裝）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 建立專案
cargo build --release

# 或直接建立 Docker 映像
docker build -t local-mcp-elasticsearch .

# 使用 stdio 協議啟動
docker run -i --rm \
  --env-file .env \
  local-mcp-elasticsearch stdio

# 使用 HTTP 協議啟動
docker run --rm \
  --env-file .env \
  -p 8080:8080 \
  local-mcp-elasticsearch http
```

#### 2.5 驗證 MCP Server

**方案 B1：驗證 Docker 容器**

```bash
# 檢查容器狀態
docker ps | grep mcp-server-elasticsearch

# 查看日誌
docker logs mcp-server-elasticsearch

# 測試 MCP Server 健康狀態（HTTP 模式）
curl -X GET "http://localhost:8080/ping"

# 測試 MCP 端點
curl -X GET "http://localhost:8080/mcp"
```

**方案 B2：驗證原始碼版本**

```bash
# 檢查 Docker 容器是否運行
docker ps | grep mcp-elasticsearch

# 查看容器日誌
docker logs local-mcp-elasticsearch

# 測試本地 MCP Server（HTTP 模式）
curl -X GET "http://localhost:8080/ping"

# 測試 MCP 端點
curl -X GET "http://localhost:8080/mcp"
```

**共同測試：驗證 Elasticsearch 連接**

```bash
# 測試 Elasticsearch 連接
curl -X GET "https://10.168.10.250:9200/_cluster/health" \
  -H "Authorization: ApiKey Z3h5NE1KZ0JXTG9ZV1JjU3pleTA6b2Nfd1FEWjZfUTZmYVZHaW1kRzB6dw==" \
  -k

# 測試索引查詢
curl -X GET "https://10.168.10.250:9200/adasone-cf-logpush-*/_search?size=1" \
  -H "Authorization: ApiKey Z3h5NE1KZ0JXTG9ZV1JjU3pleTA6b2Nfd1FEWjZfUTZmYVZHaW1kRzB6dw==" \
  -k
```

### 方案 C：遠端 Docker 部署

如果您的 Docker 在遠端機器上，請在遠端機器執行以下步驟：

#### 2.1 在遠端機器上設定

```bash
# SSH 連接到遠端 Docker 機器
ssh user@remote-docker-host

# 執行方案 A 或 B 的步驟
# 確保遠端機器可以訪問 ELK Stack (10.168.10.250:9200)
```

#### 2.2 網路配置

```bash
# 確保網路連通性
ping 10.168.10.250

# 測試 ELK 連接
curl -k https://10.168.10.250:9200/_cluster/health
```

#### 2.3 暴露 MCP Server 端口

```bash
# 如果需要從本地機器訪問遠端 MCP Server
# 修改 docker run 命令，暴露端口
docker run -d \
  --name mcp-server-elasticsearch \
  -p 8080:8080 \
  -e ELASTICSEARCH_URL=https://10.168.10.250:9200 \
  -e ELASTICSEARCH_API_KEY=Z3h5NE1KZ0JXTG9ZV1JjU3pleTA6b2Nfd1FEWjZfUTZmYVZHaW1kRzB6dw== \
  elasticsearch/mcp-server-elasticsearch:latest
```

## ⚙️ 步驟三：DDoS 分析系統配置

### 3.1 後端環境配置

複製環境變數範例檔案：

```bash
cd backend
cp env.example .env
```

編輯 `.env` 檔案：

```bash
# AI 分析配置
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# ELK MCP 連接配置
ELK_MCP_SERVER_URL=stdio://docker
ELK_MCP_COMMAND=docker
ELK_MCP_ARGS=run,--rm,--network,host,mcp-server-elasticsearch
ELK_MCP_TIMEOUT=30000
ELK_MCP_RETRY=3

# Elasticsearch 配置
ELK_HOST=http://localhost:9200
ELK_USERNAME=elastic
ELK_PASSWORD=your_elasticsearch_password
ELK_INDEX=cloudflare-logs-*
ELK_API_KEY=your_elasticsearch_api_key
ELK_MAX_RESULTS=10000

# 查詢配置
ELK_TIME_RANGE=1h
ELK_MAX_TIME_RANGE=24h
ELK_ATTACK_THRESHOLD=20
ELK_TIME_WINDOW=10
```

### 3.2 安裝相依套件

```bash
# 後端
cd backend
npm install

# 前端
cd ../frontend
npm install
```

### 3.3 啟動服務

```bash
# 啟動後端（在 backend 目錄）
npm start

# 啟動前端（在 frontend 目錄，另開終端）
npm start
```

### 3.4 MCP Server 連接配置

根據您選擇的 MCP Server 方案，更新後端配置：

#### 方案 A：Cloudflare MCP Server
```bash
# 更新 backend/.env
ELK_MCP_SERVER_URL=https://logs.mcp.cloudflare.com/sse
# 或
ELK_MCP_SERVER_URL=https://graphql.mcp.cloudflare.com/sse

# 本地開發模式（如果在本地運行）
ELK_MCP_SERVER_URL=http://localhost:3000
```

#### 方案 B：Elasticsearch MCP Server（本地 Docker）
```bash
# 更新 backend/.env
ELK_MCP_COMMAND=docker
ELK_MCP_ARGS=run,--rm,--network,host,mcp-server-elasticsearch
```

#### 方案 C：遠端 Docker MCP Server
```bash
# 更新 backend/.env
ELK_MCP_SERVER_URL=http://remote-docker-host:8080
# 或使用 SSH 隧道
ELK_MCP_COMMAND=ssh
ELK_MCP_ARGS=user@remote-host,docker,run,--rm,--network,host,mcp-server-elasticsearch
```

## 🧪 步驟四：測試整合

### 4.1 測試 MCP Server 連接

#### 方案 A：測試 Cloudflare MCP Server

```bash
# 測試 Logpush Server
curl -X GET "https://logs.mcp.cloudflare.com/sse" \
  -H "Authorization: Bearer your_cloudflare_api_token"

# 測試 GraphQL Server
curl -X GET "https://graphql.mcp.cloudflare.com/sse" \
  -H "Authorization: Bearer your_cloudflare_api_token"
```

#### 方案 B：測試 Elasticsearch MCP Server

```bash
# 測試本地 Docker MCP Server
curl -X GET "http://localhost:8080/health"

# 測試遠端 Docker MCP Server
curl -X GET "http://remote-docker-host:8080/health"
```

### 4.2 測試 UI 連接

在瀏覽器中開啟 `http://localhost:3000`，導航到「資料來源」標籤：

1. 選擇「ELK Stack (Elasticsearch)」
2. 選擇適當的時間範圍
3. 點擊「測試連接」按鈕
4. 確認顯示「✅ ELK MCP Server 連接正常」

### 4.2 執行分析測試

1. 導航到「攻擊關聯圖」標籤
2. 系統會自動使用 ELK 資料來源執行分析
3. 檢查是否正確顯示：
   - 攻擊關聯圖
   - AI 分析結果
   - OWASP Top 10 威脅分類

### 4.3 API 端點測試

使用 curl 測試 API：

```bash
# 測試 MCP 連接
curl -X GET "http://localhost:8080/api/elk/test-connection"

# 測試分析端點（使用 ELK 資料來源）
curl -X POST "http://localhost:8080/api/analyze-elk-log" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your_gemini_api_key",
    "model": "gemini-1.5-flash",
    "timeRange": "1h",
    "dataSource": "elk"
  }'

# 測試分析端點（使用 Cloudflare MCP）
curl -X POST "http://localhost:8080/api/analyze-cloudflare-log" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your_gemini_api_key",
    "model": "gemini-1.5-flash",
    "cloudflareToken": "your_cloudflare_api_token",
    "timeRange": "1h",
    "dataSource": "cloudflare"
  }'

# 獲取統計資料
curl -X GET "http://localhost:8080/api/elk/stats/1h"
```

## 🔧 故障排除

### 常見問題

#### 1. MCP Server 連接失敗

**症狀**: `❌ MCP Server 連接失敗`

**解決方案**:

**方案 A：Cloudflare MCP Server**
```bash
# 檢查 API Token 是否正確
curl -X GET "https://api.cloudflare.com/client/v4/user" \
  -H "Authorization: Bearer your_cloudflare_api_token"

# 檢查 MCP Server 狀態
curl -X GET "https://logs.mcp.cloudflare.com/sse"

# 重新啟動本地 MCP Server（如果使用本地版本）
cd mcp-server-cloudflare/apps/logpush
pnpm run dev
```

**方案 B：Elasticsearch MCP Server**

*使用官方映像：*
```bash
# 檢查 Docker 是否運行
docker --version

# 檢查 MCP Server 容器狀態
docker ps | grep mcp-server-elasticsearch

# 重新啟動 MCP Server
docker restart mcp-server-elasticsearch

# 查看詳細錯誤日誌
docker logs mcp-server-elasticsearch

# 確認使用正確的映像
docker images | grep elastic
```

*使用原始碼版本：*
```bash
# 檢查 Git 倉庫是否正確
cd mcp-server-elasticsearch
git remote -v
# 應該顯示：https://github.com/elastic/mcp-server-elasticsearch.git

# 檢查 Rust 版本
rustc --version
cargo --version

# 重新建立專案
cargo clean
cargo build --release

# 檢查服務狀態（使用 Docker）
docker build -t local-mcp-elasticsearch .
docker run -i --rm --env-file .env local-mcp-elasticsearch stdio
```

**方案 C：遠端 Docker**
```bash
# 檢查遠端機器連接
ssh user@remote-docker-host "docker ps"

# 檢查網路連通性
ping remote-docker-host

# 檢查端口是否開放
telnet remote-docker-host 8080
```

#### 2. Elasticsearch 認證失敗

**症狀**: `Elasticsearch 查詢錯誤: Authentication failed`

**解決方案**:
- 檢查 API Key 是否正確
- 確認用戶權限設定
- 驗證 Elasticsearch 服務狀態

```bash
# 測試認證
curl -H "Authorization: ApiKey your_api_key" \
  "http://localhost:9200/_cluster/health"
```

#### 3. 索引不存在

**症狀**: `index_not_found_exception`

**解決方案**:
```bash
# 檢查索引是否存在
curl -X GET "http://localhost:9200/_cat/indices/cloudflare-logs-*"

# 檢查索引模式配置
curl -X GET "http://localhost:9200/_index_template/cloudflare-logs"
```

#### 4. 網路連接問題

**症狀**: `Connection refused` 或 `Network timeout`

**解決方案**:
- 確認 Elasticsearch 服務正在運行
- 檢查防火牆設定
- 驗證網路連通性

```bash
# 測試網路連接
telnet localhost 9200

# 檢查服務狀態
systemctl status elasticsearch
```

### 效能調優

#### 1. 查詢最佳化

```bash
# 調整最大結果數量
ELK_MAX_RESULTS=5000

# 調整查詢超時時間
ELK_MCP_TIMEOUT=60000
```

#### 2. 記憶體最佳化

```bash
# 調整 Docker 記憶體限制
docker run -d \
  --name mcp-server-elasticsearch \
  --memory=1g \
  --network host \
  elasticsearch/mcp-server-elasticsearch:latest
```

## 📊 監控和維護

### 日誌監控

```bash
# 監控後端日誌
tail -f backend/logs/app.log

# 監控 MCP Server 日誌
docker logs -f mcp-server-elasticsearch

# 監控 Elasticsearch 日誌
tail -f /var/log/elasticsearch/elasticsearch.log
```

### 效能監控

在 Kibana 中建立監控儀表板：
- ELK 查詢回應時間
- MCP Server 連接狀態
- 分析請求頻率
- 錯誤率統計

## 🔒 安全建議

1. **API Key 管理**
   - 定期輪換 API Key
   - 使用最小權限原則
   - 避免在日誌中記錄敏感資訊

2. **網路安全**
   - 使用 HTTPS 連接
   - 配置適當的防火牆規則
   - 考慮使用 VPN 或專用網路

3. **監控和警報**
   - 設定異常查詢警報
   - 監控未授權訪問嘗試
   - 定期檢查系統日誌

## 📝 更新和維護

### 定期維護任務

1. **每週**
   - 檢查系統日誌
   - 監控效能指標
   - 驗證 ELK 連接狀態

2. **每月**
   - 更新 MCP Server 映像
   - 檢查 Elasticsearch 健康狀態
   - 清理舊日誌檔案

3. **每季**
   - 輪換 API Key
   - 檢查安全配置
   - 更新相依套件

### 版本升級

```bash
# 更新 MCP Server
docker pull elasticsearch/mcp-server-elasticsearch:latest
docker stop mcp-server-elasticsearch
docker rm mcp-server-elasticsearch
docker-compose up -d mcp-server-elasticsearch

# 更新 Node.js 相依套件
cd backend && npm update
cd frontend && npm update
```

## 📞 技術支援

如遇到問題，請檢查：
1. 本指南的故障排除章節
2. 官方 Elasticsearch MCP Server 文件
3. DDoS 分析系統的日誌檔案

## 🎯 **方案選擇指南**

### **推薦方案選擇**

根據您的環境和需求選擇最適合的方案：

| 情況 | 推薦方案 | 優點 | 缺點 |
|------|---------|------|------|
| **有 Cloudflare 帳號，需要即時分析** | 方案 A：Cloudflare MCP | • 官方支援<br>• 即時資料<br>• 豐富的 API | • 需要 Cloudflare API Token<br>• 依賴網路連接 |
| **已有 ELK 環境，本地開發** | 方案 B：本地 Elasticsearch MCP | • 直接查詢 ELK<br>• 本地控制<br>• 快速回應 | • 需要 Docker<br>• 資源消耗 |
| **ELK 和 Docker 在遠端機器** | 方案 C：遠端 Docker MCP | • 利用現有基礎設施<br>• 集中管理 | • 網路延遲<br>• 配置複雜 |
| **簡單測試，不想設定 MCP** | 保持檔案模式 | • 簡單快速<br>• 無額外依賴 | • 無即時資料<br>• 功能受限 |

### **您的環境評估**

根據您提供的資訊：
- ✅ ELK Stack 在 VM: `https://10.168.10.250:5601/`
- ✅ Docker 在別的機器上
- ✅ 已有 Cloudflare 日誌索引: `adasone-cf-logpush-*`

**建議**：
1. **短期**：使用 **方案 C（遠端 Docker）** - 利用現有的 ELK 和 Docker 環境
2. **長期**：考慮 **方案 A（Cloudflare MCP）** - 獲得更好的整合和即時性

### **快速開始**

如果您想快速測試，建議按以下順序嘗試：

1. **最快速**：保持現有檔案模式，加上 OWASP 整合
2. **中等複雜度**：設定方案 C（遠端 Docker MCP）
3. **最完整**：設定方案 A（Cloudflare MCP）

---

**注意**: 本系統整合了多個複雜元件，建議在生產環境部署前先在測試環境完整驗證所有功能。 