// ELK MCP 連接全面診斷工具
// 測試各個連接環節並提供詳細的診斷信息

const { ELK_CONFIG } = require('../config/elkConfig');
const { elkMCPClient } = require('../services/elkMCPClient');
const https = require('https');
const http = require('http');
const { URL } = require('url');

console.log('🔍 開始 ELK MCP 連接全面診斷...\n');

// 簡單的fetch替代函數（使用原生http/https）
function simpleFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 5000
    };
    
    if (isHttps) {
      requestOptions.rejectUnauthorized = false; // 忽略SSL證書驗證（測試用）
    }
    
    const req = httpModule.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const response = {
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: new Map(Object.entries(res.headers)),
          text: () => Promise.resolve(data),
          json: () => {
            try {
              return Promise.resolve(JSON.parse(data));
            } catch (e) {
              return Promise.reject(e);
            }
          }
        };
        resolve(response);
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// 診斷結果收集
const diagnosis = {
  httpConnectivity: null,
  mcpServerStatus: null,
  elasticsearchAccess: null,
  mcpProtocolTest: null,
  queryExecution: null,
  overallStatus: 'PENDING'
};

// 1. 測試基本HTTP連接
async function testHttpConnectivity() {
  console.log('📡 測試 1: 基本 HTTP 連接');
  console.log(`   目標: ${ELK_CONFIG.mcp.serverUrl}`);
  
  try {
    const response = await simpleFetch(ELK_CONFIG.mcp.serverUrl, {
      method: 'GET',
      timeout: 5000
    });
    
    console.log(`   ✅ HTTP 連接成功 (狀態: ${response.status})`);
    diagnosis.httpConnectivity = {
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers)
    };
    
  } catch (error) {
    console.log(`   ❌ HTTP 連接失敗: ${error.message}`);
    diagnosis.httpConnectivity = {
      success: false,
      error: error.message,
      code: error.code
    };
  }
  console.log('');
}

// 2. 測試MCP Server狀態
async function testMCPServerStatus() {
  console.log('🌐 測試 2: MCP Server 狀態');
  
  const endpoints = [
    { name: 'Root', path: '' },
    { name: 'Health Check', path: '/health' },
    { name: 'Ping', path: '/ping' },
    { name: 'MCP Endpoint', path: '/mcp' }
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    const url = `${ELK_CONFIG.mcp.serverUrl}${endpoint.path}`;
    console.log(`   測試 ${endpoint.name}: ${url}`);
    
    try {
      const response = await simpleFetch(url, {
        method: 'GET',
        timeout: 5000
      });
      
      const contentType = response.headers.get('content-type');
      let responseText = '';
      
      if (contentType && contentType.includes('application/json')) {
        responseText = await response.json();
      } else {
        responseText = await response.text();
      }
      
      console.log(`   ✅ ${endpoint.name} 成功 (${response.status})`);
      results[endpoint.name] = {
        success: true,
        status: response.status,
        contentType,
        response: responseText
      };
      
    } catch (error) {
      console.log(`   ❌ ${endpoint.name} 失敗: ${error.message}`);
      results[endpoint.name] = {
        success: false,
        error: error.message
      };
    }
  }
  
  diagnosis.mcpServerStatus = results;
  console.log('');
}

// 3. 測試直接 Elasticsearch 訪問
async function testElasticsearchAccess() {
  console.log('🔍 測試 3: 直接 Elasticsearch 訪問');
  console.log(`   目標: ${ELK_CONFIG.elasticsearch.host}`);
  console.log(`   索引: ${ELK_CONFIG.elasticsearch.index}`);
  
  try {
    // 測試 Elasticsearch 根端點
    const rootResponse = await simpleFetch(ELK_CONFIG.elasticsearch.host, {
      method: 'GET',
      headers: {
        'Authorization': `ApiKey ${ELK_CONFIG.elasticsearch.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    if (rootResponse.ok) {
      const esInfo = await rootResponse.json();
      console.log(`   ✅ Elasticsearch 連接成功`);
      console.log(`   版本: ${esInfo.version?.number || 'N/A'}`);
      console.log(`   集群: ${esInfo.cluster_name || 'N/A'}`);
      
      // 測試索引訪問
      const indexUrl = `${ELK_CONFIG.elasticsearch.host}/${ELK_CONFIG.elasticsearch.index}/_search`;
      const searchResponse = await simpleFetch(indexUrl, {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${ELK_CONFIG.elasticsearch.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: { match_all: {} },
          size: 1
        }),
        timeout: 10000
      });
      
      if (searchResponse.ok) {
        const searchResult = await searchResponse.json();
        console.log(`   ✅ 索引查詢成功，找到 ${searchResult.hits?.total?.value || 0} 筆記錄`);
        
        diagnosis.elasticsearchAccess = {
          success: true,
          version: esInfo.version?.number,
          clusterName: esInfo.cluster_name,
          indexAccess: true,
          totalRecords: searchResult.hits?.total?.value || 0
        };
      } else {
        console.log(`   ⚠️ 索引查詢失敗 (${searchResponse.status})`);
        diagnosis.elasticsearchAccess = {
          success: true,
          version: esInfo.version?.number,
          clusterName: esInfo.cluster_name,
          indexAccess: false,
          indexError: `HTTP ${searchResponse.status}`
        };
      }
      
    } else {
      throw new Error(`HTTP ${rootResponse.status}: ${rootResponse.statusText}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Elasticsearch 訪問失敗: ${error.message}`);
    diagnosis.elasticsearchAccess = {
      success: false,
      error: error.message
    };
  }
  console.log('');
}

// 4. 測試MCP協議
async function testMCPProtocol() {
  console.log('🔌 測試 4: MCP 協議測試');
  console.log(`   協議模式: ${ELK_CONFIG.mcp.protocol}`);
  
  if (ELK_CONFIG.mcp.protocol === 'proxy') {
    console.log(`   代理命令: ${ELK_CONFIG.mcp.proxyCommand}`);
    console.log(`   代理參數: ${ELK_CONFIG.mcp.proxyArgs.join(' ')}`);
  }
  
  try {
    // 測試MCP連接建立
    console.log('   嘗試建立 MCP 連接...');
    const connected = await elkMCPClient.testConnection();
    
    if (connected) {
      console.log('   ✅ MCP 協議連接成功');
      diagnosis.mcpProtocolTest = {
        success: true,
        protocol: ELK_CONFIG.mcp.protocol,
        connected: true
      };
    } else {
      console.log('   ❌ MCP 協議連接失敗');
      diagnosis.mcpProtocolTest = {
        success: false,
        protocol: ELK_CONFIG.mcp.protocol,
        connected: false,
        error: 'Connection test returned false'
      };
    }
    
  } catch (error) {
    console.log(`   ❌ MCP 協議測試失敗: ${error.message}`);
    diagnosis.mcpProtocolTest = {
      success: false,
      protocol: ELK_CONFIG.mcp.protocol,
      error: error.message,
      stack: error.stack
    };
  }
  console.log('');
}

// 5. 測試實際查詢執行
async function testQueryExecution() {
  console.log('⚡ 測試 5: 實際查詢執行');
  
  try {
    console.log('   執行 Elasticsearch 查詢...');
    const queryResult = await elkMCPClient.queryElasticsearch('1h');
    
    if (queryResult && queryResult.hits) {
      console.log(`   ✅ 查詢執行成功，返回 ${queryResult.hits.length} 筆記錄`);
      diagnosis.queryExecution = {
        success: true,
        recordCount: queryResult.hits.length,
        timeRange: '1h'
      };
    } else {
      console.log('   ⚠️ 查詢執行成功但無數據');
      diagnosis.queryExecution = {
        success: true,
        recordCount: 0,
        timeRange: '1h',
        noData: true
      };
    }
    
  } catch (error) {
    console.log(`   ❌ 查詢執行失敗: ${error.message}`);
    diagnosis.queryExecution = {
      success: false,
      error: error.message,
      timeRange: '1h'
    };
  }
  console.log('');
}

// 生成診斷報告
function generateDiagnosisReport() {
  console.log('📋 診斷報告');
  console.log('=' .repeat(50));
  
  const tests = [
    { name: 'HTTP 基本連接', key: 'httpConnectivity' },
    { name: 'MCP Server 狀態', key: 'mcpServerStatus' },
    { name: 'Elasticsearch 直接訪問', key: 'elasticsearchAccess' },
    { name: 'MCP 協議測試', key: 'mcpProtocolTest' },
    { name: '查詢執行測試', key: 'queryExecution' }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  tests.forEach(test => {
    const result = diagnosis[test.key];
    if (result) {
      const status = result.success ? '✅ 通過' : '❌ 失敗';
      console.log(`${test.name}: ${status}`);
      if (result.success) passedTests++;
      if (result.error) {
        console.log(`   錯誤: ${result.error}`);
      }
    } else {
      console.log(`${test.name}: ⚠️ 未測試`);
    }
  });
  
  console.log('-' .repeat(50));
  console.log(`總計: ${passedTests}/${totalTests} 項測試通過`);
  
  // 判斷整體狀態
  if (passedTests === totalTests) {
    diagnosis.overallStatus = 'HEALTHY';
    console.log('🎉 整體狀態: 健康 - ELK MCP 連接完全正常');
  } else if (passedTests >= totalTests * 0.6) {
    diagnosis.overallStatus = 'DEGRADED';
    console.log('⚠️  整體狀態: 降級 - 部分功能可能受影響');
  } else {
    diagnosis.overallStatus = 'FAILED';
    console.log('💥 整體狀態: 失敗 - ELK MCP 連接存在嚴重問題');
  }
  
  // 提供修復建議
  generateFixSuggestions();
}

// 生成修復建議
function generateFixSuggestions() {
  console.log('\n🔧 修復建議');
  console.log('=' .repeat(50));
  
  if (!diagnosis.httpConnectivity?.success) {
    console.log('1. HTTP 連接問題:');
    console.log('   - 檢查 ELK MCP Server 是否正在運行');
    console.log('   - 確認服務器地址和端口是否正確');
    console.log('   - 檢查網路連接和防火牆設定');
    console.log('   - 嘗試: curl http://10.168.10.250:8080');
  }
  
  if (!diagnosis.elasticsearchAccess?.success) {
    console.log('2. Elasticsearch 訪問問題:');
    console.log('   - 檢查 Elasticsearch 服務是否運行');
    console.log('   - 驗證 API Key 是否有效');
    console.log('   - 確認索引名稱是否正確');
    console.log('   - 檢查 SSL 憑證設定');
  }
  
  if (!diagnosis.mcpProtocolTest?.success) {
    console.log('3. MCP 協議問題:');
    console.log('   - 檢查 mcp-proxy 工具是否安裝');
    console.log('   - 確認 MCP Server 支援的協議版本');
    console.log('   - 嘗試切換到 stdio 模式');
    console.log('   - 安裝命令: uv tool install mcp-proxy');
  }
  
  if (!diagnosis.queryExecution?.success) {
    console.log('4. 查詢執行問題:');
    console.log('   - 檢查索引權限設定');
    console.log('   - 確認索引中是否有數據');
    console.log('   - 調整查詢時間範圍');
    console.log('   - 檢查 Elasticsearch 查詢語法');
  }
  
  console.log('\n📞 如需進一步協助:');
  console.log('   - 檢查系統日誌: journalctl -u elasticsearch');
  console.log('   - 檢查 Docker 容器: docker ps | grep elastic');
  console.log('   - 測試 MCP 工具: mcp-proxy --version');
}

// 主要診斷流程
async function runDiagnosis() {
  try {
    await testHttpConnectivity();
    await testMCPServerStatus();
    await testElasticsearchAccess();
    await testMCPProtocol();
    await testQueryExecution();
    
    generateDiagnosisReport();
    
    // 輸出完整診斷資料 (JSON格式，便於調試)
    console.log('\n🔍 詳細診斷資料:');
    console.log(JSON.stringify(diagnosis, null, 2));
    
  } catch (error) {
    console.error('❌ 診斷過程發生錯誤:', error);
    process.exit(1);
  }
}

// 執行診斷
runDiagnosis().then(() => {
  console.log('\n✅ 診斷完成');
  process.exit(diagnosis.overallStatus === 'HEALTHY' ? 0 : 1);
}); 