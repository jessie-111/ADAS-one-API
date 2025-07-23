// ELK MCP 客戶端服務
// 處理與 Elasticsearch MCP Server 的通信

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
const { spawn } = require('child_process');
const { ELK_CONFIG } = require('../config/elkConfig');
const { CLOUDFLARE_FIELD_MAPPING } = require('../../cloudflare-field-mapping');

// 使用全域 fetch (Node.js 18+ 內建)
const fetch = globalThis.fetch;

class ElkMCPClient {
  constructor() {
    this.client = null;
    this.connected = false;
    this.retryCount = 0;
    this.sessionId = null;
    this.serverCapabilities = {};
  }

  // 建立 HTTP 傳輸
  async createHttpTransport() {
    // 先測試 MCP Server 是否可用
    await this.testHttpConnection();
    
    // 建立 MCP 會話
    await this.createHttpSession();
    
    console.log('HTTP MCP 傳輸已準備就緒');
    return null; // 使用自定義的 HTTP 調用邏輯
  }

  // 建立 HTTP MCP 會話
  async createHttpSession() {
    try {
      const sessionUrl = `${ELK_CONFIG.mcp.serverUrl}/mcp`;
      console.log('建立 MCP 會話...');
      
      // 發送初始化請求建立會話
      const response = await fetch(sessionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          id: 1,
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            clientInfo: {
              name: 'ddos-analyzer',
              version: '1.0.0'
            }
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ MCP 會話建立成功');
      
      // 儲存會話資訊
      this.sessionId = result.id || 'default';
      this.serverCapabilities = result.result?.capabilities || {};
      
      return true;
    } catch (error) {
      console.error('❌ MCP 會話建立失敗:', error.message);
      throw error;
    }
  }

  // 測試 HTTP 連接
  async testHttpConnection() {
    try {
      const pingUrl = `${ELK_CONFIG.mcp.serverUrl}/ping`;
      console.log(`測試 MCP Server 連接: ${pingUrl}`);
      
      const response = await fetch(pingUrl, {
        method: 'GET',
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log('✅ MCP Server HTTP 連接測試成功');
      return true;
    } catch (error) {
      console.error('❌ MCP Server HTTP 連接測試失敗:', error.message);
      throw new Error(`無法連接到 MCP Server: ${error.message}`);
    }
  }

  // 直接 HTTP 工具調用
  async callHttpTool(toolName, args = {}) {
    try {
      const mcpUrl = `${ELK_CONFIG.mcp.serverUrl}/mcp`;
      console.log(`調用 MCP 工具: ${toolName}`);
      
      // 使用 MCP JSON-RPC 格式
      const requestId = Date.now();
      const response = await fetch(mcpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          id: requestId,
          params: {
            name: toolName,
            arguments: args
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(`MCP Error: ${result.error.message}`);
      }
      
      return result.result;
    } catch (error) {
      console.error(`❌ 工具調用失敗 (${toolName}):`, error.message);
      throw error;
    }
  }

  // 獲取工具列表
  async listTools() {
    if (ELK_CONFIG.mcp.protocol === 'http') {
      try {
        const mcpUrl = `${ELK_CONFIG.mcp.serverUrl}/mcp`;
        console.log('獲取 MCP 工具列表...');
        
        const requestId = Date.now();
        const response = await fetch(mcpUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/list',
            id: requestId
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
          throw new Error(`MCP Error: ${result.error.message}`);
        }
        
        return result.result;
      } catch (error) {
        console.error('❌ 工具列表獲取失敗:', error.message);
        // 回退到已知的工具列表
        return {
          tools: [
            { name: 'list_indices', description: '列出所有可用的 Elasticsearch 索引' },
            { name: 'get_mappings', description: '獲取特定索引的欄位映射' },
            { name: 'search', description: '執行 Elasticsearch 查詢 DSL' },
            { name: 'esql', description: '執行 ES|QL 查詢' },
            { name: 'get_shards', description: '獲取索引分片資訊' }
          ]
        };
      }
    } else {
      // stdio 模式：使用 MCP 客戶端
      return await this.client.listTools();
    }
  }

  // 連接到 MCP Server
  async connect() {
    try {
      console.log(`正在連接 ELK MCP Server (${ELK_CONFIG.mcp.protocol})...`);
      console.log(`Server URL: ${ELK_CONFIG.mcp.serverUrl}`);
      
      let transport;
      
      // 根據協議類型建立不同的傳輸方式
      if (ELK_CONFIG.mcp.protocol === 'proxy') {
        // 使用 mcp-proxy 橋接 HTTP 到 stdio
        console.log('使用 mcp-proxy 橋接到 HTTP MCP Server...');
        transport = new StdioClientTransport({
          command: ELK_CONFIG.mcp.proxyCommand,
          args: ELK_CONFIG.mcp.proxyArgs
        });
      } else {
        // 直接 stdio 傳輸
        transport = new StdioClientTransport({
          command: ELK_CONFIG.mcp.serverCommand,
          args: ELK_CONFIG.mcp.serverArgs
        });
      }

      // 建立客戶端
      this.client = new Client({
        name: "ddos-analyzer",
        version: "1.0.0"
      }, {
        capabilities: {
          tools: {}
        }
      });

      // 連接到服務器
      await this.client.connect(transport);
      this.connected = true;
      this.retryCount = 0;
      
      console.log('✅ ELK MCP Server 連接成功');
      return true;
    } catch (error) {
      console.error('❌ ELK MCP Server 連接失敗:', error.message);
      this.connected = false;
      
      // 重試邏輯
      if (this.retryCount < ELK_CONFIG.mcp.retryAttempts) {
        this.retryCount++;
        console.log(`🔄 重試連接 (${this.retryCount}/${ELK_CONFIG.mcp.retryAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * this.retryCount));
        return await this.connect();
      }
      
      throw error;
    }
  }

  // 斷開連接
  async disconnect() {
    if (this.client && this.connected) {
      try {
        await this.client.close();
        this.connected = false;
        console.log('🔌 ELK MCP Server 連接已關閉');
      } catch (error) {
        console.error('關閉 MCP 連接時發生錯誤:', error.message);
      }
    }
  }

  // 確保連接狀態
  async ensureConnection() {
    if (!this.connected || !this.client) {
      await this.connect();
    }
  }

  // 建構 Elasticsearch 查詢
  buildElasticsearchQuery(timeRange = '1h', filters = {}) {
    // 智能時間範圍查詢策略
    let query;
    
    if (timeRange === 'auto' || timeRange === '1h') {
      // 自動模式：查詢最近的資料，不限特定時間範圍
      console.log('🔍 使用自動時間範圍，查詢最新資料...');
      query = {
        query: {
          match_all: {}
        },
        sort: [
          {
            "@timestamp": {
              order: "desc"
            }
          }
        ],
        size: 1000  // 增加資料量以確保涵蓋所有攻擊事件
      };
    } else {
      // 傳統時間範圍查詢
      const now = new Date();
      const timeRangeMs = this.parseTimeRange(timeRange);
      const fromTime = new Date(now.getTime() - timeRangeMs);
      
      console.log('🔍 使用指定時間範圍:', fromTime.toISOString(), 'to', now.toISOString());
      query = {
        query: {
          range: {
            "@timestamp": {
              gte: fromTime.toISOString(),
              lte: now.toISOString()
            }
          }
        },
        sort: [
          {
            "@timestamp": {
              order: "desc"
            }
          }
        ],
        size: 1000
      };
    }

    // 添加額外的篩選條件（如果需要的話）
    if (Object.keys(filters).length > 0) {
      // 將簡單查詢轉換為 bool 查詢以支援篩選
      if (query.query.match_all) {
        query.query = {
          bool: {
            must: [{ match_all: {} }],
            filter: []
          }
        };
      } else if (query.query.range) {
        const rangeQuery = query.query.range;
        query.query = {
          bool: {
            must: [{ range: rangeQuery }],
            filter: []
          }
        };
      }

      if (filters.clientIp && CLOUDFLARE_FIELD_MAPPING.client_ip) {
        query.query.bool.filter.push({
          term: { [CLOUDFLARE_FIELD_MAPPING.client_ip.elk_field]: filters.clientIp }
        });
      }

      if (filters.securityAction && CLOUDFLARE_FIELD_MAPPING.security_action) {
        query.query.bool.filter.push({
          term: { [CLOUDFLARE_FIELD_MAPPING.security_action.elk_field]: filters.securityAction }
        });
      }
      if (filters.minWafScore && CLOUDFLARE_FIELD_MAPPING.waf_attack_score) {
        query.query.bool.filter.push({
          range: {
            [CLOUDFLARE_FIELD_MAPPING.waf_attack_score.elk_field]: {
              lte: filters.minWafScore // WAF分數越低越危險
            }
          }
        });
      }
    }

    return query;
  }

  // 解析時間範圍
  parseTimeRange(timeRange) {
    const unit = timeRange.slice(-1);
    const value = parseInt(timeRange.slice(0, -1));
    
    const multipliers = {
      'm': 60 * 1000,      // 分鐘
      'h': 60 * 60 * 1000, // 小時
      'd': 24 * 60 * 60 * 1000 // 天
    };

    return value * (multipliers[unit] || multipliers['h']);
  }

  // 獲取必要的欄位清單
  getRequiredFields() {
    return Object.values(CLOUDFLARE_FIELD_MAPPING).map(field => field.elk_field);
  }

  // 執行 Elasticsearch 查詢
  async queryElasticsearch(timeRange = '1h', filters = {}) {
    await this.ensureConnection();

    try {
      const query = this.buildElasticsearchQuery(timeRange, filters);
      
      console.log('📊 執行 Elasticsearch 查詢...');
      console.log('查詢範圍:', timeRange);
      console.log('篩選條件:', filters);
      console.log('索引:', ELK_CONFIG.elasticsearch.index);
      console.log('查詢內容:', JSON.stringify(query, null, 2));

      // 使用 MCP 工具執行查詢
      const result = await this.client.callTool({
        name: 'search',
        arguments: {
          index: ELK_CONFIG.elasticsearch.index,
          query_body: query
        }
      });

      if (result.isError) {
        throw new Error(`Elasticsearch 查詢錯誤: ${result.content[0]?.text || 'Unknown error'}`);
      }

      // 處理 MCP Server 的文本回應
      const responseText = result.content[0]?.text || '';
      console.log('MCP Server 回應 (摘要):', responseText.substring(0, 200) + '...');
      
      // 檢查是否有第二個 content（實際的資料）
      const dataText = result.content[1]?.text || responseText;
      console.log('實際資料長度:', dataText.length, '前 100 字元:', dataText.substring(0, 100));
      
      // 嘗試解析 JSON 回應
      let responseData;
      try {
        // 首先嘗試解析為記錄陣列（最常見的情況）
        const records = JSON.parse(dataText);
        if (Array.isArray(records)) {
          console.log(`✅ 解析為記錄陣列，找到 ${records.length} 筆記錄`);
          return {
            total: records.length,
            hits: records.map((record, index) => ({
              id: record.RayID || record._id || index.toString(),
              source: record,
              timestamp: record["@timestamp"]
            }))
          };
        } else {
          // 如果不是陣列，可能是標準 Elasticsearch 格式
          responseData = records;
        }
      } catch (e) {
        // 如果都無法解析，嘗試從摘要中提取數字
        console.log('回應不是 JSON 格式，嘗試解析摘要');
        const match = responseText.match(/Total results: (\d+)/);
        if (match) {
          const totalCount = parseInt(match[1]);
          console.log(`從摘要中發現 ${totalCount} 筆記錄，但無法解析詳細資料`);
          // 如果有資料但無法解析，回傳簡化的模擬資料
          if (totalCount > 0) {
            return {
              total: totalCount,
              hits: [],
              summary: `發現 ${totalCount} 筆記錄，但資料格式無法解析`
            };
          }
        }
        return {
          total: 0,
          hits: [],
          summary: responseText
        };
      }
      
      // 處理標準 Elasticsearch 回應格式
      const hits = responseData.hits?.hits || [];

      console.log(`✅ 查詢完成，找到 ${hits.length} 筆記錄`);
      
      return {
        total: responseData.hits?.total?.value || hits.length,
        hits: hits.map(hit => ({
          id: hit._id,
          source: hit._source,
          timestamp: hit._source["@timestamp"]
        }))
      };

    } catch (error) {
      console.error('❌ Elasticsearch 查詢失敗:', error.message);
      throw error;
    }
  }

  // 獲取攻擊相關的日誌
  async getAttackLogs(timeRange = '1h') {
    return await this.queryElasticsearch(timeRange, {
      minWafScore: 80, // WAF 分數 80 以下視為攻擊
      securityAction: 'block' // 被阻擋的請求
    });
  }

  // 獲取特定 IP 的活動
  async getIPActivity(clientIp, timeRange = '1h') {
    return await this.queryElasticsearch(timeRange, {
      clientIp: clientIp
    });
  }

  // 獲取安全事件統計
  async getSecurityStats(timeRange = '1h') {
    await this.ensureConnection();

    try {
      // 建構聚合查詢
      const aggregationQuery = {
        query: {
          range: {
            "@timestamp": {
              gte: `now-${timeRange}`,
              lte: 'now'
            }
          }
        },
        aggs: {
          security_actions: {
            terms: {
              field: CLOUDFLARE_FIELD_MAPPING.security_action.elk_field,
              size: 10
            }
          },
          top_countries: {
            terms: {
              field: CLOUDFLARE_FIELD_MAPPING.client_country.elk_field,
              size: 10
            }
          },
          top_ips: {
            terms: {
              field: CLOUDFLARE_FIELD_MAPPING.client_ip.elk_field,
              size: 10
            }
          },
          waf_score_stats: {
            stats: {
              field: CLOUDFLARE_FIELD_MAPPING.waf_attack_score.elk_field
            }
          }
        },
        size: 0
      };

      const result = await this.client.callTool({
        name: 'elasticsearch_query',
        arguments: {
          index: ELK_CONFIG.elasticsearch.index,
          query: JSON.stringify(aggregationQuery)
        }
      });

      if (result.isError) {
        throw new Error(`統計查詢錯誤: ${result.content[0]?.text || 'Unknown error'}`);
      }

      const responseData = JSON.parse(result.content[0]?.text || '{}');
      return responseData.aggregations || {};

    } catch (error) {
      console.error('❌ 安全統計查詢失敗:', error.message);
      throw error;
    }
  }

  // 檢查連接狀態
  isConnected() {
    return this.connected && this.client;
  }

  // 測試連接
  async testConnection() {
    try {
      await this.ensureConnection();
      
      // 執行簡單的測試查詢
      const testResult = await this.client.callTool({
        name: 'search',
        arguments: {
          index: ELK_CONFIG.elasticsearch.index,
          query_body: {
            query: { match_all: {} },
            size: 1
          }
        }
      });

      return !testResult.isError;
    } catch (error) {
      console.error('連接測試失敗:', error.message);
      return false;
    }
  }
}

// 建立單例實例
const elkMCPClient = new ElkMCPClient();

// 優雅關閉處理
process.on('SIGINT', async () => {
  console.log('\n正在關閉 ELK MCP 連接...');
  await elkMCPClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n正在關閉 ELK MCP 連接...');
  await elkMCPClient.disconnect();
  process.exit(0);
});

module.exports = { ElkMCPClient, elkMCPClient }; 