# Cloudflare Logs - 完整日誌系統

> **來源**: [Cloudflare Logs Documentation](https://developers.cloudflare.com/logs/)
> **類別**: 日誌與監控 - 完整日誌系統
> **更新時間**: 2025/9/9 上午9:47:54

## 📊 系統概述

Cloudflare Logs 提供詳細的日誌記錄，包含由我們產品生成的元數據。這些日誌對於調試、識別配置調整和創建分析非常有幫助，特別是與其他來源（如應用程序伺服器）的日誌結合使用時。

### 🎯 主要用途
- 🔍 **調試**: 識別和解決應用程序問題
- ⚙️ **配置優化**: 根據日誌數據調整設定
- 📈 **分析洞察**: 創建詳細的流量和安全分析
- 🛡️ **安全監控**: 檢測和分析安全威脅

## 🚀 核心功能

### 📤 Logpush
**將請求或事件日誌推送到您的雲端服務提供商**

#### 支援的目的地
- **雲端存儲**:
  - ☁️ Cloudflare R2
  - 🚀 Amazon S3
  - 🔷 Microsoft Azure
  - 🟡 Google Cloud Storage
  - 📊 S3-compatible endpoints

- **分析平台**:
  - 🐕 Datadog
  - 🔍 Elastic
  - 📊 BigQuery
  - 🟢 New Relic
  - 📈 Splunk
  - 📉 Sumo Logic

- **安全平台**:
  - 🛡️ IBM QRadar
  - ☁️ IBM Cloud Logs

- **第三方整合**:
  - 📊 Axiom
  - 🔒 Taegis
  - 🛡️ Exabeam

### ⚡ Instant Logs
**在 Cloudflare 儀表板或 CLI 中即時查看 HTTP 請求日誌**

#### 特色功能
- 🕐 **即時監控**: 實時查看 HTTP 請求
- 🎛️ **儀表板整合**: 直接在 Cloudflare 儀表板中查看
- 💻 **CLI 支援**: 命令列介面訪問
- 🔍 **快速調試**: 即時識別問題

### 📥 Logpull (Legacy)
**通過 REST API 檢索日誌的傳統方法**

#### 功能描述
- 🔄 **HTTP 訪問**: 通過 REST API 消費請求日誌
- 📜 **傳統支援**: 為舊有系統提供兼容性
- 🔧 **API 驅動**: 程序化日誌檢索

## 📋 數據集類型

### 🌍 Zone-scoped Datasets (區域級數據集)

#### DNS Logs (DNS 日誌)
- **用途**: DNS 查詢和響應記錄
- **內容**: 查詢類型、響應時間、解析結果
- **應用**: DNS 性能分析、故障排除

#### Firewall Events (防火牆事件)
- **用途**: 防火牆規則觸發記錄
- **內容**: 阻擋、允許、挑戰等動作
- **應用**: 安全事件分析、規則優化

#### HTTP Requests (HTTP 請求)
- **用途**: 所有 HTTP/HTTPS 請求詳情
- **內容**: WAF 評分、Bot 評分、性能指標
- **應用**: 流量分析、安全監控、性能優化
- **詳細文檔**: 參見 `logs-http-requests.md`

#### NEL Reports (NEL 報告)
- **用途**: Network Error Logging 報告
- **內容**: 網路錯誤和連接問題
- **應用**: 網路健康監控、連接問題診斷

#### Page Shield Events (頁面防護事件)
- **用途**: 前端安全事件記錄
- **內容**: 惡意腳本檢測、CSP 違規
- **應用**: 前端安全監控、供應鏈攻擊防護

#### Spectrum Events (Spectrum 事件)
- **用途**: TCP/UDP 代理事件
- **內容**: 非 HTTP 流量代理記錄
- **應用**: TCP/UDP 流量分析

#### Zaraz Events (Zaraz 事件)
- **用途**: 第三方工具管理事件
- **內容**: 標籤載入、執行記錄
- **應用**: 第三方服務監控

### 🏢 Account-scoped Datasets (帳戶級數據集)

#### Zero Trust 相關
- **Access Requests**: 身份驗證請求記錄
- **Browser Isolation User Actions**: 瀏覽器隔離用戶行為
- **Device Posture Results**: 設備安全狀態檢查
- **Gateway DNS/HTTP/Network**: Gateway 各層級日誌
- **Zero Trust Network Session Logs**: 網路會話記錄
- **SSH Logs**: SSH 連接記錄

#### 安全與合規
- **Audit Logs / Audit Logs V2**: 帳戶變更審計
- **CASB Findings**: 雲端安全狀態發現
- **DLP Forensic Copies**: 資料洩漏防護取證
- **Email Security Alerts**: 郵件安全警報
- **Magic IDS Detections**: 入侵檢測系統

#### 其他服務
- **DNS Firewall Logs**: DNS 防火牆記錄
- **Network Analytics Logs**: 網路分析日誌
- **Sinkhole HTTP Logs**: Sinkhole HTTP 記錄
- **Workers Trace Events**: Workers 執行追蹤

## ⚙️ 高級功能

### 📊 Log Output Options (日誌輸出選項)
- **格式選擇**: JSON, CSV, 自定義格式
- **壓縮選項**: gzip, 原始格式
- **批次處理**: 批量日誌傳輸
- **時間戳**: 統一時間格式

### 🔍 Filters (篩選器)
- **時間範圍**: 指定日誌時間窗口
- **欄位篩選**: 基於特定欄位值過濾
- **條件邏輯**: AND/OR 邏輯組合
- **正則表達式**: 進階模式匹配

### 🛠️ Custom Fields (自定義欄位)
- **Header 提取**: 提取特定 HTTP Headers
- **Cookie 值**: 包含指定 Cookie
- **自定義標籤**: 添加業務相關標識
- **計算欄位**: 基於現有欄位計算新值

### 🚀 Edge Log Delivery (邊緣日誌傳遞)
- **低延遲**: 邊緣節點直接傳送
- **高可用性**: 分散式日誌傳遞
- **負載平衡**: 自動分散傳送負載
- **故障恢復**: 自動重試機制

## 🔧 管理和設定

### 📋 API 配置
- **REST API**: 程序化管理 Logpush 任務
- **cURL 範例**: 命令列管理
- **Python SDK**: Python 程序化管理
- **批量操作**: 大量任務管理

### 🔐 Permissions (權限管理)
- **角色分配**: 不同等級的日誌訪問權限
- **API 令牌**: 安全的 API 訪問控制
- **帳戶層級**: 帳戶和區域權限分離
- **審計追蹤**: 權限使用記錄

## 🔗 相關產品整合

### 📊 Log Explorer
- **直接存儲**: 在 Cloudflare 儀表板直接存儲和探索日誌
- **可視化查詢**: 圖形化日誌分析介面
- **即時搜索**: 快速日誌搜索和篩選

### 📋 Audit Logs
- **變更歷史**: 總結帳戶內變更歷史
- **合規記錄**: 滿足合規和審計要求
- **用戶行為**: 追蹤用戶操作記錄

### 📈 Web Analytics
- **隱私優先**: 不改變 DNS 或使用代理的分析
- **實時數據**: 即時網站流量分析
- **用戶行為**: 訪客行為模式分析

## 🎯 實際使用案例

### 🛡️ 安全監控
```javascript
// 使用 Logpush 到 SIEM 系統
const securityConfig = {
  dataset: "firewall_events",
  destination: "https://siem.company.com/webhook",
  fields: [
    "SecurityAction", "WAFAttackScore",
    "ClientIP", "SecurityRuleID"
  ],
  filter: "SecurityAction ne \"allow\""
};
```

### 📊 性能分析
```javascript
// 監控邊緣性能指標
const perfConfig = {
  dataset: "http_requests",
  destination: "s3://analytics-bucket/performance/",
  fields: [
    "EdgeTimeToFirstByteMs", "OriginResponseDurationMs",
    "CacheCacheStatus", "EdgeResponseStatus"
  ],
  sample_rate: 0.1 // 10% 抽樣
};
```

### 🤖 Bot 管理
```javascript
// Bot 流量分析
const botConfig = {
  dataset: "http_requests",
  destination: "datadog://logs.datadoghq.com",
  fields: [
    "BotScore", "VerifiedBotCategory",
    "BotDetectionIDs", "JSDetectionPassed"
  ],
  filter: "BotScore lt 30" // 可疑 Bot 流量
};
```

## 🏆 最佳實踐

### 📈 數據管理
- **採樣策略**: 對高流量站點使用適當的採樣率
- **欄位選擇**: 只包含必要的欄位以降低成本
- **時間範圍**: 設定合理的日誌保留期
- **壓縮格式**: 使用 gzip 減少傳輸成本

### 🔄 監控和告警
- **傳送監控**: 監控日誌傳送狀態
- **失敗處理**: 設定失敗重試機制
- **容量規劃**: 預估日誌量和存儲需求
- **成本控制**: 監控傳送費用和存儲成本

### 🛡️ 安全考量
- **傳輸加密**: 使用 HTTPS/TLS 傳送日誌
- **身份驗證**: 目的地端點的身份驗證
- **敏感數據**: 避免記錄敏感個人信息
- **存取控制**: 限制日誌存取權限

## 🔧 故障排除

### ⚠️ 常見問題
- **日誌延遲**: 網路或目的地處理延遲
- **丟失日誌**: 目的地不可用或配置錯誤
- **格式錯誤**: 自定義欄位配置問題
- **權限錯誤**: API 令牌或目的地權限不足

### 🔍 診斷工具
- **Logpush 狀態 API**: 檢查任務運行狀態
- **測試傳送**: 發送測試日誌驗證配置
- **錯誤日誌**: 查看傳送錯誤詳情
- **監控儀表板**: Cloudflare 儀表板監控頁面

## 💰 計費和限制

### 計費模式
- **按量計費**: 根據傳送的日誌量計費
- **包含配額**: 部分方案包含免費配額
- **目的地成本**: 目的地服務商的額外費用

### 使用限制
- **最大欄位**: 每個數據集的最大欄位數限制
- **採樣率**: 最小採樣率限制
- **並發任務**: 同時運行的 Logpush 任務數

## 📚 參考資料

### 🔗 相關文檔
- [Logpush Job Setup](https://developers.cloudflare.com/logs/logpush/logpush-job-setup/)
- [Dataset Schemas](https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/)
- [API Reference](https://developers.cloudflare.com/api/operations/logpush-jobs-for-a-zone-list-logpush-jobs)
- [Pricing Information](https://developers.cloudflare.com/logs/pricing/)

### 🛠️ 工具和範例
- [cURL 管理範例](https://developers.cloudflare.com/logs/logpush/examples/manage-logpush-with-curl/)
- [Python SDK 範例](https://developers.cloudflare.com/logs/logpush/examples/manage-logpush-with-python/)
- [JSON 解析指南](https://developers.cloudflare.com/logs/parse-cloudflare-logs-json-data/)

### 📋 更新記錄
- [Change Notices](https://developers.cloudflare.com/logs/reference/change-notices/)
- [Changelog](https://developers.cloudflare.com/logs/changelog/)
- [Security Fields Updates](https://developers.cloudflare.com/logs/reference/change-notices/2023-02-01-updates-to-security-fields/)
