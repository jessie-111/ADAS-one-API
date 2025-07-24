# AI 分析系統 ELK + OWASP 整合技術規劃

## 📋 專案概述

### 目標
將現有的 AI 攻擊分析系統升級，整合 ELK Stack 和 OWASP Top 10 標準，實現：
1. 透過 MCP 協議直接從 ELK 撈取即時日誌資料
2. 保持現有 AI 分析邏輯不變
3. 加入欄位對應表提升查詢精準度
4. 整合 OWASP Top 10 標準進行專業攻擊分類

### 現有系統狀況
- ✅ AI 分析邏輯完整，準確度達 95%
- ✅ 前端 React 介面完善
- ✅ 後端 Node.js API 服務穩定
- ⚠️ 目前使用 txt 檔案分析，需升級為即時 ELK 資料

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
```

### 技術堆疊
- **前端**: React.js (保持不變)
- **後端**: Node.js + Express (保持不變)
- **AI 服務**: Google Gemini API (保持不變)
- **新增**: Elasticsearch MCP Server (Docker)
- **新增**: OWASP 資料服務
- **資料庫**: ELK Stack (Elasticsearch + Logstash + Kibana)

---

## 📋 詳細實作計劃

### Phase 1: ELK MCP 整合準備 (2-3天)

#### 1.1 環境準備和驗證
**負責人**: DevOps 工程師  
**工作項目**:
```bash
# 1. ELK Server 設定檢查
- 確認 elasticsearch.yml 網路設定 (network.host: 0.0.0.0)
- 驗證 API Key 或用戶認證設定
- 測試外部連接能力 (curl http://elk-server:9200/_cluster/health)

# 2. MCP Server 部署
docker run --rm \
  -e ES_URL=http://your-elk-server:9200 \
  -e ES_API_KEY=your-api-key \
  -p 8080:8080 \
  docker.elastic.co/mcp/elasticsearch http

# 3. 連接驗證
curl http://localhost:8080/ping
curl http://localhost:8080/mcp
```

**完成標準**: MCP Server 能成功連接到 ELK 並回應健康檢查

#### 1.2 MCP 客戶端開發
**負責人**: 後端工程師  
**新增檔案結構**:
```
backend/
├── services/
│   ├── mcpClient.js          // MCP 通信客戶端
│   ├── elkQueryBuilder.js    // ELK 查詢建構器
│   └── fieldMapper.js        // 欄位對應服務
├── config/
│   ├── elkFields.js          // 欄位對應表
│   └── mcpConfig.js          // MCP 配置
└── utils/
    └── queryTemplates.js     // 查詢模板
```

**核心功能**:
```javascript
// services/mcpClient.js 主要功能
class MCPClient {
  async search(elkQuery) {
    // 透過 MCP 執行 Elasticsearch 查詢
  }
  
  async listIndices() {
    // 列出可用的索引
  }
  
  async getMappings(index) {
    // 獲取索引的欄位映射
  }
}
```

### Phase 2: 欄位對應表建立 (1-2天)

#### 2.1 ELK 欄位對應表設計
**負責人**: 安全工程師 + 後端工程師  
**檔案**: `config/elkFields.js`

**結構範例**:
```javascript
const ELK_FIELD_MAPPING = {
  // 基本時間和識別
  timestamp: {
    elk_field: "@timestamp",
    data_type: "date",
    description: "事件發生的精確時間",
    ai_context: "用於分析攻擊時序和頻率模式",
    example: "2024-12-18T10:30:45.123Z"
  },
  
  // 來源資訊
  source_ip: {
    elk_field: "source.ip",
    data_type: "ip",
    description: "攻擊來源的IP地址",
    ai_context: "用於識別攻擊來源、地理分佈和IP聲譽分析",
    example: "192.168.1.100"
  },
  
  // 請求資訊
  request_uri: {
    elk_field: "url.path",
    data_type: "keyword",
    description: "HTTP請求的完整URI路徑",
    ai_context: "用於識別攻擊目標和攻擊模式（如敏感檔案存取）",
    example: "/.env, /.git/config, /wp-admin/login.php"
  },
  
  // 安全事件
  security_action: {
    elk_field: "security.action",
    data_type: "keyword", 
    description: "安全系統採取的動作",
    ai_context: "用於評估防護效果和攻擊嚴重程度",
    example: "block, allow, alert, drop"
  },
  
  waf_attack_score: {
    elk_field: "security.waf.attack_score",
    data_type: "integer",
    description: "WAF系統評估的攻擊分數(0-100)",
    ai_context: "用於量化攻擊威脅等級，分數越高威脅越大",
    example: "85, 95, 100"
  }
};
```

#### 2.2 AI 欄位理解服務
**負責人**: AI 工程師  
**功能**: 將欄位對應表轉換為 AI 可理解的格式

```javascript
// services/fieldContextService.js
class FieldContextService {
  generateAIFieldReference() {
    // 將欄位對應表轉換為AI可理解的格式
    return Object.entries(ELK_FIELD_MAPPING)
      .map(([logical_name, config]) => {
        return `${logical_name}:
  - ELK欄位: ${config.elk_field}
  - 資料類型: ${config.data_type}  
  - 業務意義: ${config.description}
  - 分析用途: ${config.ai_context}
  - 範例值: ${config.example}`;
      }).join('\n\n');
  }
}
```

### Phase 3: ELK 查詢整合 (2-3天)

#### 3.1 智能查詢生成器
**負責人**: 後端工程師 + AI 工程師  
**功能**: 根據分析需求自動生成 Elasticsearch 查詢

```javascript
// services/elkQueryBuilder.js
class ELKQueryBuilder {
  async generateQueryFromPrompt(analysisPrompt) {
    const fieldReference = this.fieldContext.generateAIFieldReference();
    
    const queryGenerationPrompt = `
作為 Elasticsearch 查詢專家，請根據分析需求和欄位對應表生成精確的查詢。

=== ELK 欄位對應表 ===
${fieldReference}

=== 分析需求 ===
${analysisPrompt}

請生成標準的 Elasticsearch Query DSL...`;

    return await this.callAIForQuery(queryGenerationPrompt);
  }
}
```

#### 3.2 查詢模板系統
**負責人**: 後端工程師  
**功能**: 預定義常用的安全分析查詢模板

```javascript
// utils/queryTemplates.js
const QUERY_TEMPLATES = {
  security_overview: {
    description: "全面安全威脅概覽",
    template: {
      query: {
        bool: {
          must: [
            { range: { "@timestamp": { gte: "now-1h" } } },
            { terms: { "security.action": ["block", "alert"] } }
          ]
        }
      },
      aggs: {
        attack_types: { terms: { field: "security.rule.description.keyword" } },
        source_ips: { terms: { field: "source.ip" } }
      }
    }
  }
};
```

### Phase 4: OWASP 整合服務 (2-3天)

#### 4.1 OWASP 資料服務
**負責人**: 安全工程師 + 後端工程師  
**資料來源**:
- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Cheat Sheets Series](https://cheatsheetseries.owasp.org/)

```javascript
// services/owaspDataService.js
class OWASPDataService {
  constructor() {
    this.dataSources = {
      top10: "https://owasp.org/Top10/",
      testing_guide: "https://owasp.org/www-project-web-security-testing-guide/",
      cheat_sheets: "https://cheatsheetseries.owasp.org/"
    };
  }

  async analyzeAttacks(attackEvents) {
    // 根據攻擊事件查詢對應的 OWASP 分類
    // 返回攻擊類型、風險等級、防護建議
  }
}
```

#### 4.2 攻擊事件檢測器
**負責人**: 安全工程師  
**功能**: 從 ELK 結果中識別攻擊事件

```javascript
// services/attackEventDetector.js
class AttackEventDetector {
  detectAttackEvents(elkResults) {
    // 檢測邏輯:
    // 1. security.action === 'block'
    // 2. waf.attack_score > 80
    // 3. 敏感檔案存取模式
    // 4. 異常請求頻率
  }
}
```

### Phase 5: AI 分析流程整合 (1-2天)

#### 5.1 現有 AI 邏輯保持不變
**重要**: 現有的 `getAIAssessment` 函數和 prompt 邏輯完全保持不變

#### 5.2 新的資料流程
**負責人**: 全端工程師  

```javascript
// 新的分析流程
async function enhancedAnalyzeLog(request) {
  // 1. 使用 AI 生成 ELK 查詢
  const elkQuery = await queryBuilder.generateQueryFromPrompt(
    "分析最近1小時的安全威脅，重點關注攻擊模式和異常行為"
  );

  // 2. 透過 MCP 執行查詢
  const elkResults = await mcpExecutor.executeQuery(elkQuery);

  // 3. 檢測攻擊事件
  const attackEvents = attackDetector.detectAttackEvents(elkResults);

  // 4. 如果發現攻擊，查詢 OWASP 資料
  let owaspAnalysis = null;
  if (attackEvents.length > 0) {
    owaspAnalysis = await owaspService.analyzeAttacks(attackEvents);
  }

  // 5. 使用現有的 AI 分析邏輯（完全不變）
  const aiAnalysis = await getAIAssessment({
    ...request,
    elkData: elkResults,
    attackEvents: attackEvents,
    owaspContext: owaspAnalysis  // 新增 OWASP 上下文
  });

  return {
    ...aiAnalysis,
    elk_source: true,
    attack_events_count: attackEvents.length,
    owasp_analysis: owaspAnalysis
  };
}
```

---

## 🔧 技術可行性評估

### ✅ 高度可行的部分
| 項目 | 可行性 | 理由 |
|-----|-------|------|
| MCP 整合 | 95% | 官方支援，技術成熟 |
| 欄位對應 | 90% | 結構化資料，容易實作 |
| AI 查詢生成 | 85% | 利用現有 AI 服務 |
| OWASP 資料爬取 | 80% | 公開資料，可透過爬蟲獲取 |

### ⚠️ 需要注意的挑戰
1. **API 速率限制** - 需要實作快取和重試機制
2. **OWASP 資料解析** - 需要智能解析 HTML 內容
3. **查詢效能** - 大量資料查詢可能影響 ELK 效能
4. **錯誤處理** - 需要完整的 fallback 機制

### 🛡️ 風險控制措施
1. **Fallback 機制** - MCP 失敗時回退到現有檔案分析
2. **快取策略** - OWASP 資料本地快取，減少網路依賴
3. **效能監控** - 監控 ELK 查詢效能，設置合理限制
4. **分階段部署** - 先實作基礎功能，再逐步增加進階功能

---

## 📊 開發時程規劃

### 整體時程表
| Phase | 工作內容 | 預估時間 | 負責團隊 | 關鍵里程碑 |
|-------|---------|---------|---------|-----------|
| Phase 1 | MCP 整合 | 2-3天 | DevOps + 後端 | MCP 連接測試成功 |
| Phase 2 | 欄位對應表 | 1-2天 | 安全 + 後端 | AI 能理解欄位意義 |
| Phase 3 | ELK 查詢 | 2-3天 | 後端 + AI | 自動查詢生成成功 |
| Phase 4 | OWASP 整合 | 2-3天 | 安全 + 後端 | 攻擊分類功能完成 |
| Phase 5 | AI 流程整合 | 1-2天 | 全端 | 完整流程測試通過 |

**總開發時間：8-13 天**

### 里程碑檢查點
- **Week 1 End**: Phase 1-2 完成，基礎 MCP 連接和欄位對應
- **Week 2 Mid**: Phase 3-4 完成，查詢生成和 OWASP 整合
- **Week 2 End**: Phase 5 完成，完整系統測試

---

## 🚀 實作優先級建議

### 第一優先級（必須實作）
1. **MCP 基礎整合** - Phase 1
2. **欄位對應表** - Phase 2
3. **基本 ELK 查詢** - Phase 3 基礎部分

### 第二優先級（重要功能）
1. **智能查詢生成** - Phase 3 進階部分
2. **OWASP 基礎整合** - Phase 4 基礎部分

### 第三優先級（增強功能）
1. **完整 OWASP 分析** - Phase 4 進階部分
2. **AI 流程優化** - Phase 5

---

## 💰 成本評估

### 開發成本
- **人力成本**: 2-3 名工程師 × 2 週 = 4-6 人週
- **基礎設施**: Docker 容器資源（最小）
- **API 成本**: 現有 Gemini API 使用量增加約 20%

### 運營成本
- **MCP Server**: Docker 容器運行成本（約 $10/月）
- **ELK 查詢**: 可能增加 ELK 負載，需監控
- **OWASP 資料**: 免費公開資料，無額外成本

---

## 🧪 測試策略

### 單元測試
- MCP 客戶端連接測試
- 欄位對應邏輯測試
- 查詢生成功能測試
- OWASP 資料解析測試

### 整合測試
- ELK → MCP → AI 完整流程測試
- 攻擊事件檢測準確性測試
- OWASP 分類正確性測試

### 效能測試
- 大量資料查詢效能測試
- 並發請求處理能力測試
- 記憶體使用量監控

### 安全測試
- API Key 安全性檢查
- 資料傳輸加密驗證
- 存取權限控制測試

---

## 📈 預期效益

### 技術效益
1. **即時性提升** - 從檔案分析升級為即時 ELK 資料分析
2. **準確性提升** - 透過欄位對應表提升查詢精準度
3. **專業性提升** - 整合 OWASP 標準進行攻擊分類
4. **擴展性提升** - 可處理更大規模的日誌資料

### 業務效益
1. **分析深度** - 從 95% 提升至 98% 的攻擊識別準確度
2. **回應速度** - 即時威脅檢測和告警
3. **標準化** - 符合業界 OWASP 安全標準
4. **可維護性** - 結構化的欄位對應和查詢邏輯

---

## 🤝 團隊分工建議

### 角色分工
| 角色 | 主要職責 | 參與 Phase |
|-----|---------|-----------|
| **DevOps 工程師** | ELK 環境配置、MCP Server 部署 | Phase 1 |
| **後端工程師** | MCP 客戶端、查詢建構器開發 | Phase 1, 3, 5 |
| **安全工程師** | 欄位對應表、OWASP 整合、攻擊檢測邏輯 | Phase 2, 4 |
| **AI 工程師** | 查詢生成邏輯、AI 分析流程優化 | Phase 2, 3, 5 |
| **全端工程師** | 系統整合、測試、部署 | Phase 5 |

### 溝通機制
- **每日站會**: 追蹤開發進度和問題
- **週度回顧**: 檢視里程碑完成狀況
- **技術討論**: 遇到技術難題時的即時討論

---

## 📝 下一步行動

### 立即行動項目
1. [ ] **確認 ELK Server 設定** - DevOps 團隊檢查網路和認證配置
2. [ ] **評估現有日誌欄位** - 安全團隊整理現有 ELK 索引結構
3. [ ] **準備開發環境** - 後端團隊準備 MCP 測試環境
4. [ ] **資源分配確認** - 專案經理確認人力和時程安排

### 決策點
1. **是否立即開始 Phase 1？** - 需要團隊確認資源可用性
2. **OWASP 整合深度？** - 決定實作到什麼程度（基礎 vs 進階）
3. **測試策略確認？** - 確定測試環境和測試資料準備方式

### 會議議程建議
1. 技術可行性討論（30分鐘）
2. 時程和資源確認（20分鐘）
3. 風險評估和應對策略（20分鐘）
4. 分工和溝通機制確認（10分鐘）

---

## 📚 參考資料

### 技術文檔
- [Elasticsearch MCP Server](https://github.com/elastic/mcp-server-elasticsearch)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [Elasticsearch Query DSL](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html)

### API 文檔
- [Google Gemini API](https://ai.google.dev/docs)
- [Elasticsearch REST API](https://www.elastic.co/guide/en/elasticsearch/reference/current/rest-apis.html)

---

*文檔版本：v1.0*  
*建立日期：2025-07-22*  
*更新日期：2025-07-22*  
*負責人：AI 開發團隊* 