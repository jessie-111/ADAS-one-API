// 測試 ELK 分析流程的詳細 debug
require('dotenv').config();

const { elkMCPClient } = require('./services/elkMCPClient');
const { ELK_CONFIG } = require('./config/elkConfig');

async function testELKAnalysisFlow() {
  console.log('🔍 測試完整的 ELK 分析流程...');
  console.log('');
  
  try {
    await elkMCPClient.connect();
    console.log('✅ ELK MCP 連接成功');
    
    // 1. 查詢最近的日誌資料
    console.log('\n1. 📊 查詢最近的日誌資料...');
    const timeRange = '24h';
    const elkData = await elkMCPClient.queryElasticsearch(timeRange);
    
    console.log(`查詢結果: 找到 ${elkData.hits.length} 筆記錄`);
    console.log('總記錄數:', elkData.total);
    
    if (elkData.hits.length === 0) {
      console.log('❌ 沒有找到任何記錄');
      return;
    }
    
    // 2. 分析前幾筆記錄的域名資訊
    console.log('\n2. 🔍 分析前 10 筆記錄的域名資訊:');
    const top10 = elkData.hits.slice(0, 10);
    
    const domainStats = new Map();
    
    for (let i = 0; i < top10.length; i++) {
      const hit = top10[i];
      const source = hit.source;
      
      console.log(`\n記錄 ${i + 1}:`);
      console.log('  ID:', hit.id);
      console.log('  timestamp:', source['@timestamp']);
      console.log('  ClientIP:', source.ClientIP);
      console.log('  ClientRequestHost:', source.ClientRequestHost || '❌ 不存在');
      console.log('  EdgeRequestHost:', source.EdgeRequestHost || '❌ 不存在');
      console.log('  ClientRequestURI:', source.ClientRequestURI || 'N/A');
      
      // 統計域名
      const clientHost = source.ClientRequestHost;
      const edgeHost = source.EdgeRequestHost;
      
      if (clientHost) {
        domainStats.set(`Client: ${clientHost}`, (domainStats.get(`Client: ${clientHost}`) || 0) + 1);
      }
      if (edgeHost) {
        domainStats.set(`Edge: ${edgeHost}`, (domainStats.get(`Edge: ${edgeHost}`) || 0) + 1);
      }
    }
    
    console.log('\n📈 域名統計:');
    for (const [domain, count] of domainStats.entries()) {
      console.log(`  ${domain}: ${count} 次`);
    }
    
    // 3. 轉換資料格式
    console.log('\n3. 🔄 轉換 ELK 資料格式...');
    const logEntries = elkData.hits.map((hit, index) => {
      const elkRecord = hit.source;
      const converted = {
        timestamp: elkRecord["@timestamp"],
        EdgeStartTimestamp: elkRecord["EdgeStartTimestamp"] || elkRecord["@timestamp"],
        ClientIP: elkRecord["ClientIP"],
        ClientCountry: elkRecord["ClientCountry"],
        ClientASN: elkRecord["ClientASN"],
        EdgeRequestHost: elkRecord["EdgeRequestHost"], // Cloudflare 實際處理的域名
        ClientRequestHost: elkRecord["ClientRequestHost"], // 客戶端聲稱的域名
        ClientRequestURI: elkRecord["ClientRequestURI"],
        EdgeResponseBytes: elkRecord["EdgeResponseBytes"] || 0,
        EdgeResponseStatus: elkRecord["EdgeResponseStatus"],
        SecurityAction: elkRecord["SecurityAction"],
        SecurityRuleDescription: elkRecord["SecurityRuleDescription"],
        WAFAttackScore: elkRecord["WAFAttackScore"],
        WAFSQLiAttackScore: elkRecord["WAFSQLiAttackScore"],
        WAFXSSAttackScore: elkRecord["WAFXSSAttackScore"],
        WAFRCEAttackScore: elkRecord["WAFRCEAttackScore"],
        ClientRequestUserAgent: elkRecord["ClientRequestUserAgent"],
        RayID: elkRecord["RayID"]
      };
      
      if (index < 3) {
        console.log(`轉換後記錄 ${index + 1}:`, {
          EdgeRequestHost: converted.EdgeRequestHost,
          ClientRequestHost: converted.ClientRequestHost,
          ClientIP: converted.ClientIP
        });
      }
      
      return converted;
    });
    
    console.log(`✅ 轉換完成，共 ${logEntries.length} 筆記錄`);
    
    // 4. 執行攻擊檢測邏輯
    console.log('\n4. 🚨 執行攻擊檢測邏輯...');
    
    const ipRequestCounts = {};
    const detectedAttacks = {};
    const TIME_WINDOW_SECONDS = 10;
    const ATTACK_THRESHOLD = 20;
    
    // 模擬 detectAttack 函數
    for (let i = 0; i < logEntries.length; i++) {
      const logEntry = logEntries[i];
      const { ClientIP, EdgeStartTimestamp, ClientRequestHost, ClientRequestURI, EdgeResponseBytes, EdgeRequestHost } = logEntry;
      
      if (!ClientIP || !EdgeStartTimestamp) continue;

      const timestamp = Math.floor(new Date(EdgeStartTimestamp).getTime() / 1000);
      const windowStart = timestamp - (timestamp % TIME_WINDOW_SECONDS);

      if (!ipRequestCounts[ClientIP]) ipRequestCounts[ClientIP] = [];

      ipRequestCounts[ClientIP] = ipRequestCounts[ClientIP].filter(r => r.windowStart >= windowStart - TIME_WINDOW_SECONDS);

      let currentWindow = ipRequestCounts[ClientIP].find(r => r.windowStart === windowStart);
      if (!currentWindow) {
          currentWindow = { windowStart, count: 0 };
          ipRequestCounts[ClientIP].push(currentWindow);
      }
      currentWindow.count++;

      if (currentWindow.count >= ATTACK_THRESHOLD) {
        // 優先使用 EdgeRequestHost（Cloudflare 實際處理的域名），再使用 ClientRequestHost
        const realHost = EdgeRequestHost || ClientRequestHost || 'unknown-host';
        const clientHost = ClientRequestHost || 'unknown-host';
        
        console.log(`🚨 偵測到攻擊！IP: ${ClientIP}, 請求數: ${currentWindow.count}`);
        console.log(`   EdgeRequestHost: ${EdgeRequestHost}`);
        console.log(`   ClientRequestHost: ${ClientRequestHost}`);
        console.log(`   使用的攻擊域名: ${realHost}`);
        
        // Debug: 記錄可能的 Host header 偽造
        if (EdgeRequestHost && ClientRequestHost && EdgeRequestHost !== ClientRequestHost) {
            console.log(`⚠️ 偵測到 Host header 可能偽造: 實際=${EdgeRequestHost}, 聲稱=${ClientRequestHost}, IP=${ClientIP}`);
        }
        
        const attackId = `${ClientIP}@${realHost}`;
        if (!detectedAttacks[attackId]) {
            detectedAttacks[attackId] = {
                attackDomain: realHost,  // 使用真實的域名
                claimedDomain: clientHost !== realHost ? clientHost : null,  // 記錄聲稱的域名
                targetURL: ClientRequestURI || '/',
                sourceList: new Map(),
                totalBytes: 0,
            };
            console.log(`📝 新建攻擊記錄: ID=${attackId}, 域名=${realHost}`);
        }
        const attack = detectedAttacks[attackId];
        attack.totalBytes += EdgeResponseBytes || 0;
        const sourceInfo = attack.sourceList.get(ClientIP) || { ip: ClientIP, count: 0, country: logEntry.ClientCountry || 'N/A', asn: logEntry.ClientASN || 'N/A' };
        sourceInfo.count++;
        attack.sourceList.set(ClientIP, sourceInfo);
      }
    }
    
    console.log(`\n📊 攻擊檢測結果: 發現 ${Object.keys(detectedAttacks).length} 起攻擊`);
    
    if (Object.keys(detectedAttacks).length > 0) {
      console.log('\n🎯 攻擊詳情:');
      for (const [attackId, attack] of Object.entries(detectedAttacks)) {
        console.log(`  攻擊 ID: ${attackId}`);
        console.log(`    攻擊域名: ${attack.attackDomain}`);
        console.log(`    聲稱域名: ${attack.claimedDomain || '無'}`);
        console.log(`    目標 URL: ${attack.targetURL}`);
        console.log(`    攻擊來源數: ${attack.sourceList.size}`);
      }
      
      // 檢查第一個攻擊的詳細資料
      const firstAttackId = Object.keys(detectedAttacks)[0];
      const firstAttack = detectedAttacks[firstAttackId];
      
      console.log(`\n🔍 第一起攻擊詳細資料:`);
      console.log(`  攻擊 ID: ${firstAttackId}`);
      console.log(`  攻擊域名: ${firstAttack.attackDomain}`);
      console.log(`  聲稱域名: ${firstAttack.claimedDomain}`);
      
      // 這是會傳給 AI 的資料
      const attackData = {
        attackDomain: firstAttack.attackDomain,
        claimedDomain: firstAttack.claimedDomain,
        targetURL: firstAttack.targetURL,
        sourceList: Array.from(firstAttack.sourceList.values())
      };
      
      console.log('\n📤 傳送給 AI 的攻擊資料:');
      console.log('  attackDomain:', attackData.attackDomain);
      console.log('  claimedDomain:', attackData.claimedDomain);
      console.log('  targetURL:', attackData.targetURL);
      console.log('  來源 IP 數量:', attackData.sourceList.length);
    }
    
    // 5. 檢查是否有包含 abc.twister5.cf 的記錄
    console.log('\n5. 🔍 檢查是否有 abc.twister5.cf 記錄:');
    const abcRecords = logEntries.filter(entry => 
      entry.ClientRequestHost === 'abc.twister5.cf' || 
      entry.EdgeRequestHost === 'abc.twister5.cf'
    );
    
    console.log(`找到 ${abcRecords.length} 筆 abc.twister5.cf 記錄`);
    
    if (abcRecords.length > 0) {
      console.log('abc.twister5.cf 記錄詳情:');
      abcRecords.slice(0, 3).forEach((record, index) => {
        console.log(`  記錄 ${index + 1}:`, {
          ClientIP: record.ClientIP,
          EdgeRequestHost: record.EdgeRequestHost,
          ClientRequestHost: record.ClientRequestHost,
          timestamp: record.timestamp
        });
      });
    }
    
    // 6. 檢查是否有包含 adasone1.twister5.cf 的記錄
    console.log('\n6. 🔍 檢查是否有 adasone1.twister5.cf 記錄:');
    const adasoneRecords = logEntries.filter(entry => 
      entry.ClientRequestHost === 'adasone1.twister5.cf' || 
      entry.EdgeRequestHost === 'adasone1.twister5.cf'
    );
    
    console.log(`找到 ${adasoneRecords.length} 筆 adasone1.twister5.cf 記錄`);
    
    if (adasoneRecords.length > 0) {
      console.log('adasone1.twister5.cf 記錄詳情:');
      adasoneRecords.slice(0, 3).forEach((record, index) => {
        console.log(`  記錄 ${index + 1}:`, {
          ClientIP: record.ClientIP,
          EdgeRequestHost: record.EdgeRequestHost,
          ClientRequestHost: record.ClientRequestHost,
          timestamp: record.timestamp
        });
      });
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
    console.error('錯誤詳情:', error.stack);
  } finally {
    await elkMCPClient.disconnect();
    console.log('\n🔌 ELK MCP 連接已關閉');
  }
}

// 執行測試
testELKAnalysisFlow().catch(console.error); 