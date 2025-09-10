# Cloudflare Logs - HTTP Requests 數據集

> **來源**: [Cloudflare Logs Documentation](https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/zone/http_requests/)
> **類別**: 日誌與監控 - HTTP 請求數據集
> **更新時間**: 2025/9/9 上午9:27:51

## 📊 概述

HTTP requests 數據集包含有關通過 Cloudflare 網絡的所有 HTTP 請求的詳細信息。這些字段對於分析流量模式、安全事件和性能指標至關重要。

## 🛡️ WAF Attack Score 欄位

### WAFAttackScore
- **類型**: `int`
- **描述**: WAF 檢測模組生成的整體請求評分
- **用途**: 評估請求的惡意程度，分數越高表示越可能是攻擊

### 相關 WAF 評分欄位

#### WAFRCEAttackScore
- **類型**: `int`
- **描述**: WAF 對 RCE (Remote Code Execution) 攻擊的評分

#### WAFSQLiAttackScore
- **類型**: `int`
- **描述**: WAF 對 SQLi (SQL Injection) 攻擊的評分

#### WAFXSSAttackScore
- **類型**: `int`
- **描述**: WAF 對 XSS (Cross-Site Scripting) 攻擊的評分

## 🔒 安全相關欄位

### SecurityAction
- **類型**: `string`
- **描述**: 觸發終止動作的安全規則動作（如果有）

### SecurityActions
- **類型**: `array[string]`
- **描述**: Cloudflare 安全產品對此請求執行的動作陣列
- **可能值**: unknown | allow | block | challenge | jschallenge | log | connectionClose | challengeSolved | challengeBypassed | jschallengeSolved | jschallengeBypassed | bypass | managedChallenge | managedChallengeNonInteractiveSolved | managedChallengeInteractiveSolved | managedChallengeBypassed | rewrite | forceConnectionClose | skip

### SecuritySources
- **類型**: `array[string]`
- **描述**: 匹配請求的安全產品陣列
- **可能來源**: unknown | asn | country | ip | ipRange | securityLevel | zoneLockdown | waf | firewallRules | uaBlock | rateLimit | bic | hot | l7ddos | validation | botFight | apiShield | botManagement | dlp | firewallManaged | firewallCustom | apiShieldSchemaValidation | apiShieldTokenValidation | apiShieldSequenceMitigation

## 🤖 Bot 管理欄位

### BotScore
- **類型**: `int`
- **描述**: Cloudflare Bot 管理評分（1-99，1=最可能是機器人，99=最可能是人類）
- **可用性**: 僅限 Bot Management 客戶

### BotDetectionIDs
- **類型**: `array[int]`
- **描述**: 與在請求上進行的 Bot Management 啟發式檢測相關聯的 ID 列表
- **可用性**: 僅限 Bot Management 客戶

### VerifiedBotCategory
- **類型**: `string`
- **描述**: 已驗證機器人的類別

## 🔐 洩漏憑證檢查

### LeakedCredentialCheckResult
- **類型**: `string`
- **描述**: 洩漏憑證檢查的結果
- **可能結果**: password_leaked | username_and_password_leaked | username_password_similar | username_leaked | clean

## 📱 客戶端資訊欄位

### ClientIP
- **類型**: `string`
- **描述**: 發起請求的客戶端 IP 位址

### ClientCountry
- **類型**: `string`
- **描述**: 客戶端 IP 位址對應的國家代碼

### ClientDeviceType
- **類型**: `string`
- **描述**: 客戶端裝置類型

### ClientRequestUserAgent
- **類型**: `string`
- **描述**: 客戶端請求的 User-Agent 標頭

## 🌐 請求資訊欄位

### ClientRequestMethod
- **類型**: `string`
- **描述**: HTTP 請求方法（GET、POST、PUT 等）

### ClientRequestPath
- **類型**: `string`
- **描述**: 請求的路徑部分

### ClientRequestURI
- **類型**: `string`
- **描述**: 完整的請求 URI

### EdgeResponseStatus
- **類型**: `int`
- **描述**: Cloudflare 邊緣回應的 HTTP 狀態碼

## ⚡ 效能指標

### EdgeTimeToFirstByteMs
- **類型**: `int`
- **描述**: 從邊緣到第一個位元組的時間（毫秒）

### OriginResponseDurationMs
- **類型**: `int`
- **描述**: 上游回應時間，從第一個接收請求的數據中心測量

### ClientTCPRTTMs
- **類型**: `int`
- **描述**: 客戶端 TCP 來回時間（毫秒）

## 💾 快取相關欄位

### CacheCacheStatus
- **類型**: `string`
- **描述**: 快取狀態（hit、miss、expired 等）

### CacheResponseBytes
- **類型**: `int`
- **描述**: 從快取回應的位元組數

## ⚙️ Workers 相關欄位

### WorkerScriptName
- **類型**: `string`
- **描述**: 處理請求的 Worker 腳本名稱

### WorkerCPUTime
- **類型**: `int`
- **描述**: 執行 Worker 所花費的時間（微秒）

### WorkerStatus
- **類型**: `string`
- **描述**: Worker 守護程序回傳的狀態

## 🎯 使用案例

### 安全分析
- 使用 `WAFAttackScore` 識別潛在攻擊
- 結合 `SecurityActions` 和 `SecuritySources` 分析安全事件
- 監控 `LeakedCredentialCheckResult` 以檢測憑證洩漏

### 效能監控
- 追蹤 `EdgeTimeToFirstByteMs` 監控邊緣效能
- 使用 `OriginResponseDurationMs` 分析後端效能
- 監控 `CacheCacheStatus` 優化快取策略

### Bot 管理
- 使用 `BotScore` 識別自動化流量
- 結合 `VerifiedBotCategory` 區分良性和惡意機器人
- 分析 `BotDetectionIDs` 了解檢測模式

## ⚠️ 重要注意事項

- 某些欄位僅適用於特定 Cloudflare 產品的客戶
- Bot Management 相關欄位需要開通 Bot Management 功能
- 部分欄位已棄用，建議使用新版本的對應欄位
- 自訂欄位需要透過 Logpush Custom fields 配置

## 📚 相關資源

- [Cloudflare Logpush 文檔](https://developers.cloudflare.com/logs/logpush/)
- [WAF 文檔](https://developers.cloudflare.com/waf/)
- [Bot Management 文檔](https://developers.cloudflare.com/bot-management/)
- [Analytics API](https://developers.cloudflare.com/analytics/)
