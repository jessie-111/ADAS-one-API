// backend/index.js
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const readline = require('readline');
const { elkMCPClient } = require('./services/elkMCPClient');
const { ELK_CONFIG, OWASP_REFERENCES, identifyOWASPType } = require('./config/elkConfig');
const { CLOUDFLARE_FIELD_MAPPING, generateAIFieldReference } = require('../cloudflare-field-mapping');

const app = express();
app.use(cors());
app.use(express.json());

// --- 常數設定 ---
const LOG_FILE_PATH = '../CF-http_log.txt';
const TIME_WINDOW_SECONDS = 10;
const ATTACK_THRESHOLD = 20;

// --- 工具函數 ---
// 生成分析 ID
function generateAnalysisId() {
  return Math.random().toString(36).substr(2, 9);
}

// 計算攻擊嚴重程度評分
function calculateAttackSeverity(attack) {
  let score = 0;
  
  // 基礎分數：攻擊來源數量
  score += attack.sourceList.size * 10;
  
  // 流量分數：總位元組數
  score += (attack.totalBytes || 0) / 1000;
  
  // Host header 偽造懲罰（更高風險）
  if (attack.claimedDomain) {
    score += 50;  // 偽造 Host header 是高風險行為
  }
  
  // 敏感路徑攻擊加分
  const targetURL = attack.targetURL || '';
  if (targetURL.includes('.env') || targetURL.includes('config') || 
      targetURL.includes('admin') || targetURL.includes('.git')) {
    score += 30;
  }
  
  return Math.round(score);
}

// 建立攻擊關聯圖
function buildAttackRelationshipGraph(allAttacks) {
  if (!allAttacks || allAttacks.length === 0) {
    return null;
  }

  // 建立IP集群 - 找出多目標攻擊者
  const ipGroups = new Map();
  const domainGroups = new Map();
  const pathTypeGroups = new Map();

  allAttacks.forEach(attack => {
    // 從攻擊ID解析出IP（格式: IP@domain）
    const [sourceIP] = attack.id.split('@');
    
    // IP集群分析
    if (!ipGroups.has(sourceIP)) {
      ipGroups.set(sourceIP, {
        ip: sourceIP,
        targets: [],
        totalSeverity: 0,
        techniques: new Set(),
        isMultiTarget: false
      });
    }
    
    const ipGroup = ipGroups.get(sourceIP);
    ipGroup.targets.push({
      domain: attack.domain,
      claimedDomain: attack.claimedDomain,
      targetURL: attack.targetURL,
      severity: attack.severity
    });
    ipGroup.totalSeverity += attack.severity;
    ipGroup.isMultiTarget = ipGroup.targets.length > 1;
    
    // 分析攻擊技術
    if (attack.claimedDomain) ipGroup.techniques.add('Host偽造');
    if (attack.targetURL?.includes('.env')) ipGroup.techniques.add('環境檔案探測');
    if (attack.targetURL?.includes('config')) ipGroup.techniques.add('配置檔案探測');
    if (attack.targetURL?.includes('admin')) ipGroup.techniques.add('管理介面探測');
    if (attack.targetURL?.includes('.git')) ipGroup.techniques.add('版本控制探測');
    
    // 域名基礎設施分析
    const baseDomain = attack.domain.split('.').slice(-2).join('.');
    if (!domainGroups.has(baseDomain)) {
      domainGroups.set(baseDomain, {
        baseDomain: baseDomain,
        subdomains: new Set(),
        attackers: new Set()
      });
    }
    domainGroups.get(baseDomain).subdomains.add(attack.domain);
    domainGroups.get(baseDomain).attackers.add(sourceIP);
    
    // 攻擊路徑類型分析
    const pathType = categorizeAttackPath(attack.targetURL);
    if (!pathTypeGroups.has(pathType)) {
      pathTypeGroups.set(pathType, {
        type: pathType,
        count: 0,
        examples: []
      });
    }
    const pathGroup = pathTypeGroups.get(pathType);
    pathGroup.count++;
    if (pathGroup.examples.length < 3) {
      pathGroup.examples.push(attack.targetURL);
    }
  });

  // 計算關聯強度
  const correlationStrength = calculateCorrelationStrength(ipGroups, domainGroups);

  return {
    // IP攻擊者分析
    ipClusters: Array.from(ipGroups.values()).map(group => ({
      ...group,
      techniques: Array.from(group.techniques),
      riskLevel: group.totalSeverity > 100 ? 'High' : group.totalSeverity > 50 ? 'Medium' : 'Low'
    })),
    
    // 目標基礎設施分析  
    infrastructureMap: Array.from(domainGroups.values()).map(group => ({
      ...group,
      subdomains: Array.from(group.subdomains),
      attackers: Array.from(group.attackers),
      isTargetedInfrastructure: group.attackers.size > 1 || group.subdomains.size > 2
    })),
    
    // 攻擊模式分析
    attackPatternAnalysis: Array.from(pathTypeGroups.values()),
    
    // 關聯強度評估
    correlationMetrics: {
      strength: correlationStrength,
      multiTargetAttackers: Array.from(ipGroups.values()).filter(g => g.isMultiTarget).length,
      coordinatedAttack: correlationStrength > 0.7,
      infrastructureScope: Array.from(domainGroups.values())[0]?.subdomains?.size || 0
    }
  };
}

// 分類攻擊路徑類型
function categorizeAttackPath(url) {
  if (!url) return 'Unknown';
  
  const path = url.toLowerCase();
  if (path.includes('.env') || path.includes('.config')) return 'Environment Files';
  if (path.includes('config') || path.includes('.yml') || path.includes('.xml')) return 'Configuration Files';
  if (path.includes('admin') || path.includes('wp-admin')) return 'Admin Panels';
  if (path.includes('.git') || path.includes('.svn')) return 'Version Control';
  if (path.includes('phpinfo') || path.includes('info.php')) return 'System Information';
  if (path.includes('firebase') || path.includes('api')) return 'API Configuration';
  if (path.includes('.php') || path.includes('.asp')) return 'Script Files';
  
  return 'Other';
}

// 計算攻擊關聯強度
function calculateCorrelationStrength(ipGroups, domainGroups) {
  let strength = 0;
  
  // 多目標攻擊者加權
  const multiTargetCount = Array.from(ipGroups.values()).filter(g => g.isMultiTarget).length;
  strength += multiTargetCount * 0.3;
  
  // 基礎設施集中度加權
  const infraConcentration = Array.from(domainGroups.values())[0]?.subdomains?.size || 0;
  strength += Math.min(infraConcentration * 0.2, 0.4);
  
  // 攻擊技術多樣性加權
  const totalTechniques = new Set();
  ipGroups.forEach(group => {
    group.techniques.forEach(tech => totalTechniques.add(tech));
  });
  strength += Math.min(totalTechniques.size * 0.1, 0.3);
  
  return Math.min(strength, 1.0);
}

// 載入配置檔案（如果存在）
let config = {};
try {
  config = require('./config.js');
} catch (error) {
  // 配置檔案不存在，使用 UI 設定
}

// 可用的 Gemini 模型
const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' }
];

// 取得可用的模型列表
app.get('/api/models', (_req, res) => {
  res.json(AVAILABLE_MODELS);
});



// 新增：觸發日誌分析的端點
app.post('/api/analyze-log', async (req, res) => {
  console.log('▶️ 收到日誌分析請求...');

  if (!fs.existsSync(LOG_FILE_PATH)) {
    console.error('❌ 錯誤：找不到日誌檔案！');
    return res.status(500).json({ error: '找不到日誌檔案' });
  }

  try {
    const analysisResult = await processLogFile(req.body);
    res.json(analysisResult);
  } catch (error) {
    console.error('❌ 在日誌分析過程中發生錯誤:', error);
    
    // 提供更友善的錯誤訊息
    let errorMessage = '日誌分析失敗';
    if (error.status === 503) {
      errorMessage = 'AI 服務暫時過載，請稍後再試';
    } else if (error.status === 400) {
      errorMessage = 'API Key 無效，請檢查您的 Gemini API Key';
    } else if (error.status === 429) {
      errorMessage = 'API 使用量超過限制，請稍後再試';
    }
    
    res.status(500).json({ 
      error: errorMessage, 
      details: error.message,
      status: error.status 
    });
  }
});


// 原始 AI 分析端點 (現在主要由後端內部呼叫)
app.post('/api/analyze', async (req, res) => {
  try {
    const analysis = await getAIAssessment(req.body);
    res.json(analysis);
  } catch (error) {
    console.error('AI 分析錯誤:', error);
    res.status(500).json({ 
      error: 'AI 分析失敗',
      details: error.message 
    });
  }
});

// 簡化的 AI 測試端點
app.post('/api/test-ai', async (req, res) => {
  try {
    const { apiKey, model } = req.body;
    const useApiKey = apiKey || config.GEMINI_API_KEY;
    const useModel = model || config.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!useApiKey) {
      return res.status(400).json({ error: '缺少 API Key' });
    }

    // 簡單的 AI 測試
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(useApiKey);
    const genModel = genAI.getGenerativeModel({ model: useModel });

    const testPrompt = "請回答：AI 連接測試成功。";
    const result = await genModel.generateContent(testPrompt);
    const response = result.response;
    const text = response.text();

    res.json({
      success: true,
      message: '✅ AI 連接測試成功',
      model: useModel,
      response: text
    });

  } catch (error) {
    console.error('AI 測試錯誤:', error);
    res.status(500).json({ 
      error: 'AI 測試失敗',
      details: error.message 
    });
  }
});

// --- 核心邏輯函式 ---

async function processLogFile(config) {
  const ipRequestCounts = {};
  const detectedAttacks = {};
  const globalStats = {
    totalRequests: 0,
    totalBytes: 0,
    uniqueIPs: new Set(),
    countryCounts: new Map(),
    ipCounts: new Map(),
    uriCounts: new Map(),
    firstTimestamp: null,
    lastTimestamp: null,
    // 新增：攻擊模式統計
    attackPatterns: {
      sensitiveFiles: new Map(), // .env, .git/config, .DS_Store 等
      adminPanels: new Map(),    // wp-admin, phpmyadmin 等
      configFiles: new Map(),    // wp-config.php, web.config 等
      versionControl: new Map(), // .git, .svn, .hg 等
      sqlInjection: new Map(),   // SQL 注入嘗試
      xssAttempts: new Map(),    // XSS 攻擊嘗試
    },
    securityEvents: {
      blockedRequests: 0,
      highRiskRequests: 0,
      wafTriggers: new Map(),
      securityRules: new Map(),
    }
  };

  const fileStream = fs.createReadStream(LOG_FILE_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const logEntry = JSON.parse(line);
      updateGlobalStats(logEntry, globalStats);
      detectAttack(logEntry, ipRequestCounts, detectedAttacks);
    } catch (e) {
      // 忽略解析錯誤
    }
  }

  console.log(`✅ 日誌檔案掃描完畢。偵測到 ${Object.keys(detectedAttacks).length} 起攻擊。`);

  if (Object.keys(detectedAttacks).length > 0) {
    // 處理所有偵測到的攻擊，選擇最嚴重的一起進行詳細分析
    console.log(`🔍 發現 ${Object.keys(detectedAttacks).length} 起攻擊事件:`);
    
    let selectedAttackId = null;
    let selectedAttack = null;
    let maxScore = 0;
    
    // 分析所有攻擊並選擇最嚴重的
    for (const [attackId, attack] of Object.entries(detectedAttacks)) {
      const attackScore = calculateAttackSeverity(attack);
      console.log(`   攻擊 ${attackId}:`);
      console.log(`     域名: ${attack.attackDomain}`);
      console.log(`     來源數: ${attack.sourceList.size}`);
      console.log(`     嚴重程度: ${attackScore}`);
      
      if (attack.claimedDomain) {
        console.log(`     ⚠️  偽造 Host header: ${attack.claimedDomain}`);
      }
      
      if (attackScore > maxScore) {
        maxScore = attackScore;
        selectedAttackId = attackId;
        selectedAttack = attack;
      }
    }
    
    console.log(`\n🎯 選擇分析攻擊: ${selectedAttackId} (嚴重程度: ${maxScore})`);
    
    // 準備所有攻擊的摘要
    const allAttacks = Object.entries(detectedAttacks).map(([id, attack]) => ({
      id: id,
      domain: attack.attackDomain,
      claimedDomain: attack.claimedDomain,
      sourceCount: attack.sourceList.size,
      targetURL: attack.targetURL,
      severity: calculateAttackSeverity(attack)
    }));
    
    const attackData = {
      attackDomain: selectedAttack.attackDomain,
      claimedDomain: selectedAttack.claimedDomain,  // 包含可能偽造的域名
      targetIP: "N/A",
      targetURL: selectedAttack.targetURL,
      attackTrafficGbps: (selectedAttack.totalBytes * 8) / (TIME_WINDOW_SECONDS * 1e9),
      sourceList: Array.from(selectedAttack.sourceList.values()),
      allAttacks: allAttacks,
      attackGraph: buildAttackRelationshipGraph(allAttacks)
    };
    
    // 加入詳細的攻擊模式資訊
    const getTop5 = (map) => Array.from(map.entries()).sort(([, a], [, b]) => b - a).slice(0, 5).map(([key, value]) => ({ item: key, count: value }));
    const detailedAttackData = {
      ...attackData,
      // 基本統計
      totalRequests: globalStats.totalRequests,
      uniqueIPs: globalStats.uniqueIPs.size,
      timeRange: {
        start: globalStats.firstTimestamp ? globalStats.firstTimestamp.toISOString() : 'N/A',
        end: globalStats.lastTimestamp ? globalStats.lastTimestamp.toISOString() : 'N/A',
      },
      // 安全事件統計
      securityEvents: {
        blockedRequests: globalStats.securityEvents.blockedRequests,
        highRiskRequests: globalStats.securityEvents.highRiskRequests,
        topSecurityRules: getTop5(globalStats.securityEvents.securityRules),
      },
      // 攻擊模式分析
      attackPatterns: {
        sensitiveFiles: getTop5(globalStats.attackPatterns.sensitiveFiles),
        adminPanels: getTop5(globalStats.attackPatterns.adminPanels),
        configFiles: getTop5(globalStats.attackPatterns.configFiles),
        versionControl: getTop5(globalStats.attackPatterns.versionControl),
        sqlInjection: getTop5(globalStats.attackPatterns.sqlInjection),
        xssAttempts: getTop5(globalStats.attackPatterns.xssAttempts),
      },
      // 地理和IP分佈
      topCountries: getTop5(globalStats.countryCounts),
      topIPs: getTop5(globalStats.ipCounts),
      topURIs: getTop5(globalStats.uriCounts),
    };
    
    // 顯示關聯圖摘要
    console.log('\n🔗 攻擊關聯圖摘要:');
    if (detailedAttackData.attackGraph) {
      console.log(`關聯強度: ${(detailedAttackData.attackGraph.correlationMetrics.strength * 100).toFixed(1)}%`);
      console.log(`多目標攻擊者: ${detailedAttackData.attackGraph.correlationMetrics.multiTargetAttackers} 個`);
      console.log(`基礎設施規模: ${detailedAttackData.attackGraph.correlationMetrics.infrastructureScope} 個子域名`);
      console.log('IP集群:');
      detailedAttackData.attackGraph.ipClusters.forEach((cluster, index) => {
        console.log(`  ${index + 1}. ${cluster.ip} [${cluster.riskLevel}] - 目標: ${cluster.targets.length}, 技術: ${cluster.techniques.join(', ')}`);
      });
    } else {
      console.log('無關聯圖資料');
    }
    
    const aiAnalysis = await getAIAssessment({ ...config, attackData: detailedAttackData });
    // 將攻擊資料包含在回傳結果中
    return { ...aiAnalysis, attackData };
  } else {
    const getTop5 = (map) => Array.from(map.entries()).sort(([, a], [, b]) => b - a).slice(0, 5).map(([key, value]) => ({ item: key, count: value }));
    
    // 判斷是否為純事件日誌（沒有流量資料）
    const avgBytesPerRequest = globalStats.totalRequests > 0 ? globalStats.totalBytes / globalStats.totalRequests : 0;
    const isEventOnlyLog = globalStats.totalBytes === 0 || avgBytesPerRequest < 100;
    
    if (isEventOnlyLog) {
      // 純事件日誌分析
      const eventData = {
        timeRange: {
          start: globalStats.firstTimestamp ? globalStats.firstTimestamp.toISOString() : 'N/A',
          end: globalStats.lastTimestamp ? globalStats.lastTimestamp.toISOString() : 'N/A',
        },
        totalEvents: globalStats.totalRequests,
        uniqueIPs: globalStats.uniqueIPs.size,
        topCountries: getTop5(globalStats.countryCounts),
        topIPs: getTop5(globalStats.ipCounts),
        topURIs: getTop5(globalStats.uriCounts),
        logType: 'event_only'
      };
      return getAIAssessment({ ...config, eventData });
    } else {
             // 整體摘要分析（包含流量和事件資料）
       const overallData = {
         timeRange: {
           start: globalStats.firstTimestamp ? globalStats.firstTimestamp.toISOString() : 'N/A',
           end: globalStats.lastTimestamp ? globalStats.lastTimestamp.toISOString() : 'N/A',
         },
         totalRequests: globalStats.totalRequests,
         uniqueIPs: globalStats.uniqueIPs.size,
         totalGB: (globalStats.totalBytes / (1024 ** 3)).toFixed(4),
         avgBytesPerRequest: globalStats.totalRequests > 0 ? (globalStats.totalBytes / globalStats.totalRequests).toFixed(2) : 0,
         topCountries: getTop5(globalStats.countryCounts),
         topIPs: getTop5(globalStats.ipCounts),
         topURIs: getTop5(globalStats.uriCounts),
         // 新增：詳細攻擊模式分析
         securityEvents: {
           blockedRequests: globalStats.securityEvents.blockedRequests,
           highRiskRequests: globalStats.securityEvents.highRiskRequests,
           topSecurityRules: getTop5(globalStats.securityEvents.securityRules),
         },
         attackPatterns: {
           sensitiveFiles: getTop5(globalStats.attackPatterns.sensitiveFiles),
           adminPanels: getTop5(globalStats.attackPatterns.adminPanels),
           configFiles: getTop5(globalStats.attackPatterns.configFiles),
           versionControl: getTop5(globalStats.attackPatterns.versionControl),
           sqlInjection: getTop5(globalStats.attackPatterns.sqlInjection),
           xssAttempts: getTop5(globalStats.attackPatterns.xssAttempts),
         },
         logType: 'comprehensive'
       };
      return getAIAssessment({ ...config, overallData });
    }
  }
}

function updateGlobalStats(logEntry, globalStats) {
  globalStats.totalRequests++;
  globalStats.totalBytes += logEntry.EdgeResponseBytes || 0;
  globalStats.uniqueIPs.add(logEntry.ClientIP);
  
  // 時間戳處理
  if (logEntry.EdgeStartTimestamp) {
    try {
      const currentTimestamp = new Date(logEntry.EdgeStartTimestamp);
      if (!isNaN(currentTimestamp.getTime())) {
        if (!globalStats.firstTimestamp || currentTimestamp < globalStats.firstTimestamp) globalStats.firstTimestamp = currentTimestamp;
        if (!globalStats.lastTimestamp || currentTimestamp > globalStats.lastTimestamp) globalStats.lastTimestamp = currentTimestamp;
      }
    } catch (e) {}
  }
  
  // 基本統計
  const { ClientCountry, ClientIP, ClientRequestURI, SecurityAction, WAFAttackScore, WAFSQLiAttackScore, WAFXSSAttackScore, SecurityRuleDescription } = logEntry;
  if (ClientCountry) globalStats.countryCounts.set(ClientCountry, (globalStats.countryCounts.get(ClientCountry) || 0) + 1);
  if (ClientIP) globalStats.ipCounts.set(ClientIP, (globalStats.ipCounts.get(ClientIP) || 0) + 1);
  if (ClientRequestURI) globalStats.uriCounts.set(ClientRequestURI, (globalStats.uriCounts.get(ClientRequestURI) || 0) + 1);
  
  // 安全事件統計
  if (SecurityAction === 'block') globalStats.securityEvents.blockedRequests++;
  if (WAFAttackScore && WAFAttackScore >= 80) globalStats.securityEvents.highRiskRequests++;
  if (SecurityRuleDescription) {
    globalStats.securityEvents.securityRules.set(SecurityRuleDescription, 
      (globalStats.securityEvents.securityRules.get(SecurityRuleDescription) || 0) + 1);
  }
  
  // 攻擊模式分析
  if (ClientRequestURI) {
    const uri = ClientRequestURI.toLowerCase();
    
    // 敏感檔案攻擊
    if (uri.includes('.env') || uri.includes('.ds_store') || uri.includes('.git/config') || 
        uri.includes('.htaccess') || uri.includes('.htpasswd') || uri.includes('robots.txt')) {
      globalStats.attackPatterns.sensitiveFiles.set(ClientRequestURI, 
        (globalStats.attackPatterns.sensitiveFiles.get(ClientRequestURI) || 0) + 1);
    }
    
    // 管理面板攻擊
    if (uri.includes('wp-admin') || uri.includes('wp-login') || uri.includes('phpmyadmin') || 
        uri.includes('/admin') || uri.includes('administrator')) {
      globalStats.attackPatterns.adminPanels.set(ClientRequestURI, 
        (globalStats.attackPatterns.adminPanels.get(ClientRequestURI) || 0) + 1);
    }
    
    // 配置檔案攻擊
    if (uri.includes('wp-config') || uri.includes('web.config') || uri.includes('config.php') ||
        uri.includes('configuration.php') || uri.includes('settings.php')) {
      globalStats.attackPatterns.configFiles.set(ClientRequestURI, 
        (globalStats.attackPatterns.configFiles.get(ClientRequestURI) || 0) + 1);
    }
    
    // 版本控制系統攻擊
    if (uri.includes('.git/') || uri.includes('.svn/') || uri.includes('.hg/') || uri.includes('.bzr/')) {
      globalStats.attackPatterns.versionControl.set(ClientRequestURI, 
        (globalStats.attackPatterns.versionControl.get(ClientRequestURI) || 0) + 1);
    }
  }
  
  // SQL注入攻擊檢測
  if (WAFSQLiAttackScore && WAFSQLiAttackScore >= 90) {
    globalStats.attackPatterns.sqlInjection.set(ClientRequestURI || 'unknown', 
      (globalStats.attackPatterns.sqlInjection.get(ClientRequestURI || 'unknown') || 0) + 1);
  }
  
  // XSS攻擊檢測
  if (WAFXSSAttackScore && WAFXSSAttackScore >= 90) {
    globalStats.attackPatterns.xssAttempts.set(ClientRequestURI || 'unknown', 
      (globalStats.attackPatterns.xssAttempts.get(ClientRequestURI || 'unknown') || 0) + 1);
  }
}

function detectAttack(logEntry, ipRequestCounts, detectedAttacks) {
    const { ClientIP, EdgeStartTimestamp, ClientRequestHost, ClientRequestURI, EdgeResponseBytes, EdgeRequestHost } = logEntry;
    if (!ClientIP || !EdgeStartTimestamp) return;

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
        }
        const attack = detectedAttacks[attackId];
        attack.totalBytes += EdgeResponseBytes || 0;
        const sourceInfo = attack.sourceList.get(ClientIP) || { ip: ClientIP, count: 0, country: logEntry.ClientCountry || 'N/A', asn: logEntry.ClientASN || 'N/A' };
        sourceInfo.count++;
        attack.sourceList.set(ClientIP, sourceInfo);
    }
}

async function getAIAssessment(requestBody) {
  const { apiKey, model, attackData, healthData, eventData, overallData, fieldReference, owaspReferences } = requestBody;
  const useApiKey = apiKey || config.GEMINI_API_KEY;
  const useModel = model || config.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!useApiKey || (!attackData && !healthData && !eventData && !overallData)) {
    throw new Error('缺少必要參數');
  }

  console.log('=== AI 分析請求 ===');
  console.log('使用模型:', useModel);

  const genAI = new GoogleGenerativeAI(useApiKey);
  const genModel = genAI.getGenerativeModel({ model: useModel });
  const analysisId = Math.random().toString(36).substr(2, 9);
  const currentTime = new Date().toLocaleString('zh-TW');
  let prompt;

  if (attackData) {
    console.log('分析類型: 攻擊事件');
    
    // 格式化攻擊模式資訊
    const formatAttackPatterns = (patterns) => {
      const sections = [];
      if (patterns.sensitiveFiles && patterns.sensitiveFiles.length > 0) {
        sections.push(`敏感檔案探測: ${patterns.sensitiveFiles.map(p => `${p.item} (${p.count}次)`).join(', ')}`);
      }
      if (patterns.versionControl && patterns.versionControl.length > 0) {
        sections.push(`版本控制系統攻擊: ${patterns.versionControl.map(p => `${p.item} (${p.count}次)`).join(', ')}`);
      }
      if (patterns.adminPanels && patterns.adminPanels.length > 0) {
        sections.push(`管理面板攻擊: ${patterns.adminPanels.map(p => `${p.item} (${p.count}次)`).join(', ')}`);
      }
      if (patterns.configFiles && patterns.configFiles.length > 0) {
        sections.push(`配置檔案攻擊: ${patterns.configFiles.map(p => `${p.item} (${p.count}次)`).join(', ')}`);
      }
      if (patterns.sqlInjection && patterns.sqlInjection.length > 0) {
        sections.push(`SQL注入嘗試: ${patterns.sqlInjection.map(p => `${p.item} (${p.count}次)`).join(', ')}`);
      }
      if (patterns.xssAttempts && patterns.xssAttempts.length > 0) {
        sections.push(`XSS攻擊嘗試: ${patterns.xssAttempts.map(p => `${p.item} (${p.count}次)`).join(', ')}`);
      }
      return sections.length > 0 ? sections.join('\n- ') : '未檢測到其他特定攻擊模式';
    };
    
    // 格式化 OWASP 分析結果
    const formatOWASPFindings = (findings) => {
      if (!findings || findings.length === 0) {
        return '未檢測到特定的 OWASP 攻擊模式';
      }
      
      const grouped = {};
      findings.forEach(finding => {
        finding.owaspTypes.forEach(type => {
          if (!grouped[type.type]) {
            grouped[type.type] = {
              title: type.title,
              url: type.url,
              description: type.description,
              instances: []
            };
          }
          grouped[type.type].instances.push({
            uri: finding.uri,
            ip: finding.clientIp,
            wafScore: finding.wafScore
          });
        });
      });
      
      return Object.entries(grouped).map(([key, data]) => {
        return `${data.title}:
   - 描述: ${data.description}
   - 參考: ${data.url}
   - 檢測到 ${data.instances.length} 個實例
   - 主要攻擊路徑: ${data.instances.slice(0, 3).map(i => i.uri).join(', ')}`;
      }).join('\n\n');
    };

    prompt = `
作為一個網路安全專家，請深入分析以下攻擊事件，並基於完整的安全資料提供專業見解。

${fieldReference ? `
=== 日誌欄位參考 ===
以下是 Cloudflare 日誌欄位的對應說明，請在分析時參考這些欄位的業務意義：

${fieldReference}

` : ''}

${owaspReferences ? `
=== OWASP Top 10 參考資源 ===
請參考以下 OWASP Top 10 資源來分類和分析攻擊類型：
${owaspReferences.map(ref => `- ${ref}`).join('\n')}

` : ''}

=== 攻擊事件基本資訊 ===
分析ID: ${analysisId}
分析時間: ${currentTime}
時間範圍: ${attackData.timeRange ? `${attackData.timeRange.start} 到 ${attackData.timeRange.end}` : 'N/A'}

=== 主要攻擊事件分析 ===
- 實際目標網域：${attackData.attackDomain}${attackData.claimedDomain ? `
- 攻擊者聲稱目標：${attackData.claimedDomain} (⚠️ 偽造的 Host header)` : ''}
- 目標IP：${attackData.targetIP}
- 攻擊URL：${attackData.targetURL}
- 攻擊流量：${attackData.attackTrafficGbps.toFixed(4)} Gbps
- 主要攻擊來源：${attackData.sourceList.map(src => `${src.ip} (${src.country}, ${src.asn}, ${src.count} 次請求)`).join(', ')}

=== 所有檢測到的攻擊事件 ===
${attackData.allAttacks ? attackData.allAttacks.map((attack, index) => 
`${index + 1}. ${attack.domain}${attack.claimedDomain ? ` (偽造: ${attack.claimedDomain})` : ''}
   - 攻擊來源: ${attack.sourceCount} 個IP
   - 目標路徑: ${attack.targetURL}`).join('\n') : '僅檢測到上述單一攻擊事件'}

=== 攻擊關聯圖分析 ===
${attackData.attackGraph ? `
🔗 關聯強度: ${(attackData.attackGraph.correlationMetrics.strength * 100).toFixed(1)}% ${attackData.attackGraph.correlationMetrics.coordinatedAttack ? '(協調攻擊)' : ''}
📊 多目標攻擊者: ${attackData.attackGraph.correlationMetrics.multiTargetAttackers} 個
🏗️ 基礎設施規模: ${attackData.attackGraph.correlationMetrics.infrastructureScope} 個子域名

🎯 攻擊者IP集群分析:
${attackData.attackGraph.ipClusters.map((cluster, index) => 
`${index + 1}. ${cluster.ip} [${cluster.riskLevel}風險]
   - 攻擊目標數: ${cluster.targets.length}
   - 總嚴重程度: ${cluster.totalSeverity}
   - 使用技術: ${cluster.techniques.join(', ')}
   - 目標域名: ${cluster.targets.map(t => t.domain).join(', ')}`).join('\n')}

🏢 目標基礎設施分析:
${attackData.attackGraph.infrastructureMap.map((infra, index) => 
`${index + 1}. ${infra.baseDomain} ${infra.isTargetedInfrastructure ? '(重點目標)' : ''}
   - 受攻擊子域名: ${infra.subdomains.join(', ')}
   - 攻擊者數量: ${infra.attackers.length}
   - 攻擊者IP: ${infra.attackers.join(', ')}`).join('\n')}

🔍 攻擊模式分佈:
${attackData.attackGraph.attackPatternAnalysis.map(pattern => 
`- ${pattern.type}: ${pattern.count} 次 (範例: ${pattern.examples.slice(0, 2).join(', ')})`).join('\n')}
` : '未建立攻擊關聯圖（單一攻擊事件）'}

=== 攻擊環境統計 ===
- 總請求數: ${attackData.totalRequests ? attackData.totalRequests.toLocaleString() : 'N/A'}
- 涉及獨立IP數: ${attackData.uniqueIPs ? attackData.uniqueIPs.toLocaleString() : 'N/A'}
- 被阻擋請求: ${attackData.securityEvents ? attackData.securityEvents.blockedRequests.toLocaleString() : 'N/A'}
- 高風險請求: ${attackData.securityEvents ? attackData.securityEvents.highRiskRequests.toLocaleString() : 'N/A'}

=== 詳細攻擊模式分析 ===
${attackData.attackPatterns ? formatAttackPatterns(attackData.attackPatterns) : '無詳細攻擊模式資料'}

=== OWASP Top 10 威脅分析 ===
${attackData.owaspFindings ? formatOWASPFindings(attackData.owaspFindings) : '未檢測到特定的 OWASP 攻擊模式'}

=== 地理分佈與來源分析 ===
- Top 5 來源國家: ${attackData.topCountries ? attackData.topCountries.map(c => `${c.item} (${c.count}次)`).join(', ') : 'N/A'}
- Top 5 攻擊來源IP: ${attackData.topIPs ? attackData.topIPs.map(ip => `${ip.item} (${ip.count}次)`).join(', ') : 'N/A'}
- 主要安全規則觸發: ${attackData.securityEvents && attackData.securityEvents.topSecurityRules ? attackData.securityEvents.topSecurityRules.map(r => `${r.item} (${r.count}次)`).join(', ') : 'N/A'}

請提供：
1. 深度攻擊關聯分析 (summary)：基於以上攻擊關聯圖和完整資料，進行專業的威脅評估。重點分析：
   - **攻擊關聯圖解讀**：分析IP集群、基礎設施目標、攻擊模式分佈的關聯性
   - **協調攻擊評估**：評估是否為有組織的協調攻擊，或是散漫的機會主義攻擊  
   - **多目標攻擊分析**：分析單一攻擊者針對多個目標的戰術意圖
   - **基礎設施威脅**：評估整個 twister5.cf 基礎設施面臨的系統性風險
   - **攻擊技術組合**：分析攻擊者使用的技術組合和演進趨勢
   - **Host header 偽造**：特別分析偽造攻擊對基礎設施認知的影響
   - **威脅行為者畫像**：基於關聯分析推斷攻擊者的技術水平和目標
   - **整體威脅等級**：綜合關聯強度、攻擊規模、技術複雜度的威脅評級

2. 關聯式防禦策略 (recommendations)：基於攻擊關聯圖分析，提供7-9個層次化的防禦建議：
   - **IP集群防護**：針對識別出的攻擊者IP集群的阻斷策略
   - **基礎設施加固**：針對整個 twister5.cf 基礎設施的系統性防護
   - **攻擊模式對策**：針對發現的特定攻擊模式（環境檔案、配置檔案等）的防護
   - **Host偽造防護**：專門的 Host header 驗證和偽造檢測機制
   - **關聯檢測增強**：建立跨域名的攻擊關聯監控機制
   - **威脅情報整合**：利用攻擊關聯資訊提升威脅情報效果
   - **事件響應優化**：基於關聯分析的快速事件響應流程

請以繁體中文回答，格式為 JSON：
{
  "summary": "您的專業深度攻擊分析",
  "recommendations": [ "建議1", "建議2", "..." ]
}`;
  } else if (eventData) {
    console.log('分析類型: 純事件日誌');
    prompt = `
作為一個網路安全專家，請分析以下在 ${eventData.timeRange.start} 到 ${eventData.timeRange.end} 期間的純事件日誌資料。此日誌主要記錄安全事件，不包含詳細的流量資訊。

事件摘要：
- 總事件數: ${eventData.totalEvents.toLocaleString()}
- 涉及的獨立 IP 數: ${eventData.uniqueIPs.toLocaleString()}
- Top 5 來源國家: ${eventData.topCountries.map(c => `${c.item} (${c.count.toLocaleString()}次)`).join(', ')}
- Top 5 事件來源 IP: ${eventData.topIPs.map(ip => `${ip.item} (${ip.count.toLocaleString()}次)`).join(', ')}
- Top 5 目標資源: ${eventData.topURIs.map(u => `${u.item} (${u.count.toLocaleString()}次)`).join(', ')}

請提供：
1. 事件分析 (summary)：根據以上事件資料，分析這段時間內的安全事件特徵。評估事件的分佈模式、來源特徵、目標資源等，判斷是否存在潛在的安全威脅或異常行為模式。
2. 安全建議 (recommendations)：基於事件分析結果，提供 4-5 個針對性的安全防護和監控建議。

請以繁體中文回答，格式為 JSON：
{
  "summary": "您的專業事件分析",
  "recommendations": [ "建議1", "建議2", "..." ]
}`;
  } else if (overallData) {
    console.log('分析類型: 整體綜合分析');
    
    // 格式化攻擊模式資訊
    const formatAttackPatterns = (patterns) => {
      const sections = [];
      if (patterns.sensitiveFiles.length > 0) {
        sections.push(`敏感檔案探測: ${patterns.sensitiveFiles.map(p => `${p.item} (${p.count}次)`).join(', ')}`);
      }
      if (patterns.versionControl.length > 0) {
        sections.push(`版本控制系統攻擊: ${patterns.versionControl.map(p => `${p.item} (${p.count}次)`).join(', ')}`);
      }
      if (patterns.adminPanels.length > 0) {
        sections.push(`管理面板攻擊: ${patterns.adminPanels.map(p => `${p.item} (${p.count}次)`).join(', ')}`);
      }
      if (patterns.configFiles.length > 0) {
        sections.push(`配置檔案攻擊: ${patterns.configFiles.map(p => `${p.item} (${p.count}次)`).join(', ')}`);
      }
      if (patterns.sqlInjection.length > 0) {
        sections.push(`SQL注入嘗試: ${patterns.sqlInjection.map(p => `${p.item} (${p.count}次)`).join(', ')}`);
      }
      if (patterns.xssAttempts.length > 0) {
        sections.push(`XSS攻擊嘗試: ${patterns.xssAttempts.map(p => `${p.item} (${p.count}次)`).join(', ')}`);
      }
      return sections.length > 0 ? sections.join('\n- ') : '未檢測到特定攻擊模式';
    };
    
    prompt = `
作為一個網路安全專家，請深入分析以下在 ${overallData.timeRange.start} 到 ${overallData.timeRange.end} 期間的網站安全狀況。此報告包含完整的流量、安全事件和攻擊模式資料。

=== 基本流量統計 ===
- 總請求數: ${overallData.totalRequests.toLocaleString()}
- 獨立訪客 IP 數: ${overallData.uniqueIPs.toLocaleString()}
- 總流量: ${overallData.totalGB} GB
- 平均每請求位元組數: ${overallData.avgBytesPerRequest} bytes
- Top 5 來源國家: ${overallData.topCountries.map(c => `${c.item} (${c.count.toLocaleString()}次)`).join(', ')}
- Top 5 請求來源 IP: ${overallData.topIPs.map(ip => `${ip.item} (${ip.count.toLocaleString()}次)`).join(', ')}

=== 安全事件統計 ===
- 被阻擋的請求: ${overallData.securityEvents.blockedRequests.toLocaleString()}
- 高風險請求: ${overallData.securityEvents.highRiskRequests.toLocaleString()}
- 主要安全規則觸發: ${overallData.securityEvents.topSecurityRules.map(r => `${r.item} (${r.count}次)`).join(', ')}

=== 攻擊模式分析 ===
- ${formatAttackPatterns(overallData.attackPatterns)}

=== 最常被請求的資源 ===
- ${overallData.topURIs.map(u => `${u.item} (${u.count.toLocaleString()}次)`).join(', ')}

請提供：
1. 深度安全分析 (summary)：基於以上詳細資料，提供專業的安全威脅評估。特別關注：
   - 攻擊模式的嚴重程度和威脅等級
   - 敏感檔案探測（如 .env、.git/config、.DS_Store）的風險
   - 版本控制系統攻擊的潛在影響
   - 管理面板和配置檔案攻擊的安全隱患
   - SQL注入和XSS攻擊的威脅程度
   - 地理來源和IP分佈的異常性
   
2. 針對性防護建議 (recommendations)：基於發現的具體攻擊模式，提供 5-6 個精確的安全防護建議，每個建議應直接對應發現的威脅。

請以繁體中文回答，格式為 JSON：
{
  "summary": "您的專業深度安全分析",
  "recommendations": [ "建議1", "建議2", "..." ]
}`;
  } else if (healthData) {
    console.log('分析類型: 網站健康度');
    prompt = `
作為一個網路安全專家，請分析以下在 ${healthData.timeRange.start} 到 ${healthData.timeRange.end} 期間的網站總體流量健康度報告。報告期間內未偵測到符合特定規則的攻擊事件。

流量摘要：
- 總請求數: ${healthData.totalRequests.toLocaleString()}
- 獨立訪客 IP 數: ${healthData.uniqueIPs.toLocaleString()}
- 總流量: ${healthData.totalGB} GB
- Top 5 來源國家: ${healthData.topCountries.map(c => `${c.item} (${c.count.toLocaleString()}次)`).join(', ')}
- Top 5 請求 IP: ${healthData.topIPs.map(ip => `${ip.item} (${ip.count.toLocaleString()}次)`).join(', ')}
- Top 5 被請求頁面: ${healthData.topURIs.map(u => `${u.item} (${u.count.toLocaleString()}次)`).join(', ')}

請提供：
1. 總結報告 (summary)：根據以上數據，評估這段時間的整體網站是否健康。分析來源分佈、請求模式等是否有任何潛在的異常或值得關注的跡象（例如，來自特定國家的請求是否過於集中？某個IP的請求量是否不成比例地高？）。即使沒有偵測到明確攻擊，也請從專業角度提供您的見解。
2. 安全建議 (recommendations)：提供 4-5 個通用的、預防性的安全加固建議，以維持網站的健康和安全。

請以繁體中文回答，格式為 JSON：
{
  "summary": "您的專業分析報告",
  "recommendations": [ "建議1", "建議2", "..." ]
}`;
  }

  // 添加重試機制處理 503 錯誤
  let result;
  let retryCount = 0;
  const maxRetries = 3;
  const retryDelay = 2000; // 2 秒

  while (retryCount < maxRetries) {
    try {
      console.log(`🔄 嘗試 AI 分析 (第 ${retryCount + 1} 次)...`);
      result = await genModel.generateContent(prompt);
      break; // 成功就跳出迴圈
    } catch (error) {
      retryCount++;
      console.log(`⚠️ AI 分析失敗 (第 ${retryCount} 次):`, error.message);
      
      if (error.status === 503 && retryCount < maxRetries) {
        console.log(`⏳ 等待 ${retryDelay / 1000} 秒後重試...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        // 如果不是 503 錯誤或已達到最大重試次數，拋出錯誤
        throw error;
      }
    }
  }

  const response = await result.response;
  let text = response.text().replace(/```json\s*|```\s*/g, '').trim();
  
  try {
    const analysis = JSON.parse(text);
    if (analysis.recommendations && Array.isArray(analysis.recommendations)) {
      analysis.recommendations = analysis.recommendations.map(rec => rec.replace(/^\*\*|\*\*$/g, '').replace(/^["']|["']$/g, '').replace(/^•\s*/, '').trim());
    }
    analysis.metadata = {
      analysisId: analysisId,
      timestamp: currentTime,
      model: useModel,
      isAIGenerated: true
    };
    console.log('✅ AI 分析成功。');
    return analysis;
  } catch (parseError) {
    console.error('JSON 解析錯誤:', parseError);
    // 返回簡化的錯誤對象或原始文本
    return { summary: "AI 回應格式錯誤", recommendations: [text] };
  }
}

// === ELK 資料處理函數 ===

// 處理來自 ELK 的日誌資料
async function processELKLogs(config) {
  const { apiKey, model, timeRange } = config;
  
  try {
    console.log(`🔍 開始處理 ELK 日誌資料 (時間範圍: ${timeRange})...`);
    
    // 從 ELK 獲取日誌資料
    const elkData = await elkMCPClient.queryElasticsearch(timeRange);
    
    if (!elkData.hits || elkData.hits.length === 0) {
      console.log('⚠️  未找到日誌資料');
      return {
        summary: '在指定時間範圍內未找到任何日誌資料',
        recommendations: ['請檢查時間範圍設定或確認 ELK 中是否有資料'],
        metadata: {
          analysisId: generateAnalysisId(),
          timestamp: new Date().toISOString(),
          dataSource: 'elk',
          recordCount: 0
        }
      };
    }
    
    console.log(`📊 成功獲取 ${elkData.hits.length} 筆日誌記錄`);
    
    // 轉換 ELK 資料格式為現有處理邏輯可用的格式
    const logEntries = elkData.hits.map(hit => convertELKToLogEntry(hit.source));
    
    // 使用現有的統計和攻擊檢測邏輯
    const { globalStats, detectedAttacks } = await analyzeLogEntries(logEntries);
    
    // 整合 OWASP 攻擊類型識別
    const owaspAnalysis = analyzeOWASPPatterns(logEntries);
    
    // 決定分析類型並執行 AI 分析
    if (Object.keys(detectedAttacks).length > 0) {
      // 攻擊事件分析 - 選擇最嚴重的攻擊進行詳細分析
      let selectedAttack = null;
      let maxScore = 0;
      
      // 準備所有攻擊的摘要
      const allAttacks = Object.entries(detectedAttacks).map(([id, attack]) => ({
        id: id,
        domain: attack.attackDomain,
        claimedDomain: attack.claimedDomain,
        sourceCount: attack.sourceList.size,
        targetURL: attack.targetURL,
        severity: calculateAttackSeverity(attack)
      }));
      
      // 選擇最嚴重的攻擊
      for (const [attackId, attack] of Object.entries(detectedAttacks)) {
        const attackScore = calculateAttackSeverity(attack);
        if (attackScore > maxScore) {
          maxScore = attackScore;
          selectedAttack = attack;
        }
      }
      
      const attackData = buildAttackData(selectedAttack, globalStats, owaspAnalysis, allAttacks);
      
      console.log('\n🔗 攻擊關聯圖摘要:');
      if (attackData.attackGraph) {
        console.log(`關聯強度: ${(attackData.attackGraph.correlationMetrics.strength * 100).toFixed(1)}%`);
        console.log(`多目標攻擊者: ${attackData.attackGraph.correlationMetrics.multiTargetAttackers} 個`);
        console.log(`基礎設施規模: ${attackData.attackGraph.correlationMetrics.infrastructureScope} 個子域名`);
        console.log('IP集群:');
        attackData.attackGraph.ipClusters.forEach((cluster, index) => {
          console.log(`  ${index + 1}. ${cluster.ip} [${cluster.riskLevel}] - 目標: ${cluster.targets.length}, 技術: ${cluster.techniques.join(', ')}`);
        });
      } else {
        console.log('無關聯圖資料');
      }
      
      const aiAnalysis = await getAIAssessment({ 
        ...config, 
        attackData,
        fieldReference: generateAIFieldReference(),
        owaspReferences: OWASP_REFERENCES.mainReferences
      });
      
      return { ...aiAnalysis, attackData };
    } else if (globalStats.totalBytes === 0 || (globalStats.totalBytes / globalStats.totalRequests) < 100) {
      // 事件型日誌分析
      const eventData = buildEventData(globalStats, owaspAnalysis);
      const aiAnalysis = await getAIAssessment({ 
        ...config, 
        eventData,
        fieldReference: generateAIFieldReference(),
        owaspReferences: OWASP_REFERENCES.mainReferences
      });
      
      return aiAnalysis;
    } else {
      // 整體綜合分析
      const overallData = buildOverallData(globalStats, owaspAnalysis);
      const aiAnalysis = await getAIAssessment({ 
        ...config, 
        overallData,
        fieldReference: generateAIFieldReference(),
        owaspReferences: OWASP_REFERENCES.mainReferences
      });
      
      return aiAnalysis;
    }
    
  } catch (error) {
    console.error('❌ ELK 日誌處理失敗:', error);
    console.error('錯誤堆疊:', error.stack);
    throw error;
  }
}

// 將 ELK 資料轉換為現有日誌格式
function convertELKToLogEntry(elkRecord) {
  return {
    timestamp: elkRecord["@timestamp"],
    EdgeStartTimestamp: elkRecord["EdgeStartTimestamp"] || elkRecord["@timestamp"], // 使用 EdgeStartTimestamp 或 @timestamp
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
    WAFRCEAttackScore: elkRecord["WAFRCEAttackScore"], // 添加 RCE 攻擊分數
    ClientRequestUserAgent: elkRecord["ClientRequestUserAgent"],
    RayID: elkRecord["RayID"]
  };
}

// 分析日誌條目（重構現有邏輯以支援重用）
async function analyzeLogEntries(logEntries) {
  // 初始化統計資料
  const globalStats = {
    totalRequests: 0,
    totalBytes: 0,
    uniqueIPs: new Set(),
    countryCounts: new Map(),
    ipCounts: new Map(),
    uriCounts: new Map(),
    firstTimestamp: null,
    lastTimestamp: null,
    timeRange: null, // 將在處理過程中設定
    securityEvents: {
      blockedRequests: 0,
      highRiskRequests: 0,
      wafTriggers: 0,
      securityRules: new Map()
    },
    attackPatterns: {
      sensitiveFiles: new Map(),
      adminPanels: new Map(),
      configFiles: new Map(),
      versionControl: new Map(),
      sqlInjection: new Map(),
      xssAttempts: new Map()
    }
  };

  const detectedAttacks = {};
  const ipRequestTimes = new Map();

  // 處理每個日誌條目
  for (const entry of logEntries) {
    updateGlobalStats(entry, globalStats);
    detectAttack(entry, ipRequestTimes, detectedAttacks);
  }

  // 設定時間範圍
  if (globalStats.firstTimestamp && globalStats.lastTimestamp) {
    globalStats.timeRange = {
      start: new Date(globalStats.firstTimestamp).toISOString(),
      end: new Date(globalStats.lastTimestamp).toISOString()
    };
  }

  return { globalStats, detectedAttacks };
}

// OWASP 攻擊模式分析
function analyzeOWASPPatterns(logEntries) {
  const owaspFindings = [];
  
  for (const entry of logEntries) {
    const uri = entry.ClientRequestURI || '';
    const userAgent = entry.ClientRequestUserAgent || '';
    const securityRules = entry.SecurityRuleDescription || '';
    
    // 識別 OWASP 攻擊類型
    const detectedTypes = identifyOWASPType(uri, userAgent, securityRules);
    
    if (detectedTypes.length > 0) {
      owaspFindings.push({
        rayId: entry.RayID,
        clientIp: entry.ClientIP,
        uri: uri,
        userAgent: userAgent,
        timestamp: entry.timestamp,
        owaspTypes: detectedTypes,
        wafScore: entry.WAFAttackScore
      });
    }
  }
  
  return owaspFindings;
}

// 建立攻擊資料結構（包含 OWASP 分析和關聯圖）
function buildAttackData(attack, globalStats, owaspAnalysis, allAttacks = null) {
  const getTop5 = (map) => Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([key, value]) => ({ item: key, count: value }));

  // 建立攻擊關聯圖
  const attackGraph = buildAttackRelationshipGraph(allAttacks || []);

  return {
    attackDomain: attack.attackDomain,
    claimedDomain: attack.claimedDomain,  // 包含可能偽造的域名
    targetIP: "N/A",
    targetURL: attack.targetURL,
    attackTrafficGbps: (attack.totalBytes * 8) / (TIME_WINDOW_SECONDS * 1e9),
    sourceList: Array.from(attack.sourceList.values()),
    // 包含所有攻擊的摘要資訊
    allAttacks: allAttacks || null,
    // 新增：攻擊關聯圖
    attackGraph: attackGraph,
    // 基本統計
    totalRequests: globalStats.totalRequests,
    uniqueIPs: globalStats.uniqueIPs.size,
    timeRange: {
      start: globalStats.firstTimestamp ? globalStats.firstTimestamp.toISOString() : 'N/A',
      end: globalStats.lastTimestamp ? globalStats.lastTimestamp.toISOString() : 'N/A',
    },
    // 安全事件統計
    securityEvents: {
      blockedRequests: globalStats.securityEvents.blockedRequests,
      highRiskRequests: globalStats.securityEvents.highRiskRequests,
      topSecurityRules: getTop5(globalStats.securityEvents.securityRules),
    },
    // 攻擊模式分析
    attackPatterns: {
      sensitiveFiles: getTop5(globalStats.attackPatterns.sensitiveFiles),
      adminPanels: getTop5(globalStats.attackPatterns.adminPanels),
      configFiles: getTop5(globalStats.attackPatterns.configFiles),
      versionControl: getTop5(globalStats.attackPatterns.versionControl),
      sqlInjection: getTop5(globalStats.attackPatterns.sqlInjection),
      xssAttempts: getTop5(globalStats.attackPatterns.xssAttempts),
    },
    // 地理和IP分佈
    topCountries: getTop5(globalStats.countryCounts),
    topIPs: getTop5(globalStats.ipCounts),
    topURIs: getTop5(globalStats.uriCounts),
    // OWASP 分析結果
    owaspFindings: owaspAnalysis
  };
}

// 建立事件資料結構
function buildEventData(globalStats, owaspAnalysis) {
  const getTop5 = (map) => {
    if (!map || typeof map.entries !== 'function') return [];
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([key, value]) => ({ item: key, count: value }));
  };

  return {
    totalRequests: globalStats.totalRequests,
    uniqueIPs: globalStats.uniqueIPs.size,
    topCountries: getTop5(globalStats.countryCounts),
    topIPs: getTop5(globalStats.ipCounts),
    topURIs: getTop5(globalStats.uriCounts),
    securityEvents: {
      ...globalStats.securityEvents,
      topSecurityRules: getTop5(globalStats.securityEvents.securityRules)
    },
    attackPatterns: {
      sensitiveFiles: getTop5(globalStats.attackPatterns.sensitiveFiles),
      adminPanels: getTop5(globalStats.attackPatterns.adminPanels),
      configFiles: getTop5(globalStats.attackPatterns.configFiles),
      versionControl: getTop5(globalStats.attackPatterns.versionControl),
      sqlInjection: getTop5(globalStats.attackPatterns.sqlInjection),
      xssAttempts: getTop5(globalStats.attackPatterns.xssAttempts),
      rceAttempts: getTop5(globalStats.attackPatterns.rceAttempts)
    },
    owaspFindings: owaspAnalysis,
    timeRange: globalStats.timeRange || { start: 'N/A', end: 'N/A' }
  };
}

// 建立整體資料結構
function buildOverallData(globalStats, owaspAnalysis) {
  return buildEventData(globalStats, owaspAnalysis); // 相同結構
}


// === 新增 ELK 相關 API 端點 ===

// ELK 連接測試端點
app.get('/api/elk/test-connection', async (req, res) => {
  try {
    const isConnected = await elkMCPClient.testConnection();
    res.json({ 
      connected: isConnected,
      message: isConnected ? 'ELK MCP 連接正常' : 'ELK MCP 連接失敗'
    });
  } catch (error) {
    res.status(500).json({ 
      connected: false, 
      error: error.message 
    });
  }
});

// ELK 資料來源分析端點
app.post('/api/analyze-elk-log', async (req, res) => {
  try {
    const { apiKey, model, timeRange = '1h', dataSource = 'file' } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    let analysisResult;

    if (dataSource === 'elk') {
      // 使用 ELK 作為資料來源
      console.log('🔍 使用 ELK 資料來源進行分析...');
      analysisResult = await processELKLogs({ apiKey, model, timeRange });
    } else {
      // 使用檔案作為資料來源（保持向後相容）
      console.log('📁 使用檔案資料來源進行分析...');
      analysisResult = await processLogFile({ apiKey, model });
    }

    res.json(analysisResult);
  } catch (error) {
    console.error('分析錯誤:', error);
    res.status(500).json({ 
      error: '分析失敗', 
      details: error.message 
    });
  }
});

// 獲取 ELK 統計資料
app.get('/api/elk/stats/:timeRange', async (req, res) => {
  try {
    const timeRange = req.params.timeRange || '1h';
    const stats = await elkMCPClient.getSecurityStats(timeRange);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ 
      error: '獲取統計資料失敗', 
      details: error.message 
    });
  }
});

// 獲取 ELK 統計資料（無參數版本）
app.get('/api/elk/stats', async (req, res) => {
  try {
    const timeRange = '1h';
    const stats = await elkMCPClient.getSecurityStats(timeRange);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ 
      error: '獲取統計資料失敗', 
      details: error.message 
    });
  }
});

// 啟動服務
const port = 8080;
app.listen(port, () => console.log(`Backend API on http://localhost:${port}`));
