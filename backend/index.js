// backend/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const readline = require('readline');
const { elkMCPClient } = require('./services/elkMCPClient');
const { ELK_CONFIG, OWASP_REFERENCES, identifyOWASPType } = require('./config/elkConfig');
const { CLOUDFLARE_FIELD_MAPPING, generateAIFieldReference } = require('../cloudflare-field-mapping');
const TrendAnalysisService = require('./services/trendAnalysisService');
const { SECURITY_CONFIG, validateSecurityConfig, isValidApiKey } = require('./config/security');
const OllamaClient = require('./services/ollamaClient');
const { AIProviderManager } = require('./services/aiProviderManager');
const { recommendByIntent } = require('./services/docRecommendationService');

const app = express();

// 驗證安全配置
const securityConfig = validateSecurityConfig();
// 時區格式化輔助：依客戶端 offset 分鐘轉為本地時間字串（YYYY-MM-DD HH:mm）
function formatClientLocal(isoString, clientOffsetMinutes) {
  try {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (Number.isFinite(clientOffsetMinutes)) {
      // local = UTC + offsetMinutes
      const shifted = new Date(d.getTime() + clientOffsetMinutes * 60 * 1000);
      const pad = (n) => n.toString().padStart(2, '0');
      return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())} ${pad(shifted.getHours())}:${pad(shifted.getMinutes())}`;
    }
    // 無 offset 時退回原字串的精簡表示
    return isoString;
  } catch (e) {
    return isoString || '';
  }
}


// 安全中間件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS配置
app.use(cors({
  origin: securityConfig.app.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 速率限制
const limiter = rateLimit({
  windowMs: securityConfig.rateLimit.windowMs,
  max: securityConfig.rateLimit.max,
  message: {
    error: '請求過於頻繁，請稍後再試',
    retryAfter: Math.ceil(securityConfig.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// JSON解析中間件
app.use(express.json({ limit: securityConfig.validation.maxRequestSize }));

// 請求日誌中間件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 初始化趨勢分析服務
const trendAnalysisService = new TrendAnalysisService();

// --- 常數設定 ---
const LOG_FILE_PATH = '../CF-http_log.txt';
const TIME_WINDOW_SECONDS = 10;
// 移除攻擊閾值限制，因為 Cloudflare 已經做了初步判斷
// const ATTACK_THRESHOLD = 20;

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

  // 🎯 優化：只選擇 Top 5 攻擊IP來避免關聯圖過於複雜
  const sortedIpGroups = Array.from(ipGroups.values())
    .sort((a, b) => b.totalSeverity - a.totalSeverity)
    .slice(0, 5); // 只取前5個最嚴重的攻擊IP
  
  console.log(`🔍 關聯圖優化：從 ${ipGroups.size} 個攻擊IP中選擇Top 5進行顯示`);
  sortedIpGroups.forEach((group, index) => {
    console.log(`  ${index + 1}. ${group.ip} - 嚴重程度: ${group.totalSeverity}, 目標數: ${group.targets.length}`);
  });
  
  // 重新建立優化後的 ipGroups 和相關的 domainGroups
  const optimizedIpGroups = new Map();
  const optimizedDomainGroups = new Map();
  
  sortedIpGroups.forEach(group => {
    optimizedIpGroups.set(group.ip, group);
    
    // 重新計算相關的域名資訊
    group.targets.forEach(target => {
      const baseDomain = target.domain.split('.').slice(-2).join('.');
      if (!optimizedDomainGroups.has(baseDomain)) {
        optimizedDomainGroups.set(baseDomain, {
          baseDomain: baseDomain,
          subdomains: new Set(),
          attackers: new Set()
        });
      }
      optimizedDomainGroups.get(baseDomain).subdomains.add(target.domain);
      optimizedDomainGroups.get(baseDomain).attackers.add(group.ip);
    });
  });

  // 計算關聯強度（使用優化後的資料）
  const correlationStrength = calculateCorrelationStrength(optimizedIpGroups, optimizedDomainGroups);

  return {
    // IP攻擊者分析（僅Top 5）
    ipClusters: Array.from(optimizedIpGroups.values()).map(group => ({
      ...group,
      techniques: Array.from(group.techniques),
      riskLevel: group.totalSeverity > 100 ? 'High' : group.totalSeverity > 50 ? 'Medium' : 'Low'
    })),
    
    // 目標基礎設施分析（基於Top 5 IP）
    infrastructureMap: Array.from(optimizedDomainGroups.values()).map(group => ({
      ...group,
      subdomains: Array.from(group.subdomains),
      attackers: Array.from(group.attackers),
      isTargetedInfrastructure: group.attackers.size > 1 || group.subdomains.size > 2
    })),
    
    // 攻擊模式分析（保留完整資料用於統計）
    attackPatternAnalysis: Array.from(pathTypeGroups.values()),
    
    // 關聯強度評估
    correlationMetrics: {
      strength: correlationStrength,
      multiTargetAttackers: Array.from(optimizedIpGroups.values()).filter(g => g.isMultiTarget).length,
      coordinatedAttack: correlationStrength > 0.7,
      infrastructureScope: Array.from(optimizedDomainGroups.values())[0]?.subdomains?.size || 0,
      // 新增：顯示優化資訊
      totalIPs: ipGroups.size,
      displayedIPs: optimizedIpGroups.size,
      optimized: ipGroups.size > 5
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
    if (group.techniques) {
      group.techniques.forEach(tech => totalTechniques.add(tech));
    }
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

// 可用的 Gemini 模型 (2.5 系列)
const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' }
];

// 取得可用的模型列表
app.get('/api/models', (_req, res) => {
  res.json(AVAILABLE_MODELS);
});

// Ollama 模型列表 API
app.post('/api/ollama/models', async (req, res) => {
  try {
    const { apiUrl = 'http://localhost:11434' } = req.body;
    console.log(`🔍 獲取 Ollama 模型列表: ${apiUrl}`);
    
    const ollamaClient = new OllamaClient(apiUrl);
    const result = await ollamaClient.getModels();
    
    console.log(`✅ 成功獲取 ${result.count} 個 Ollama 模型`);
    res.json(result);
  } catch (error) {
    console.error('❌ 獲取 Ollama 模型失敗:', error.message);
    res.status(500).json({ 
      error: '獲取模型列表失敗', 
      details: error.message 
    });
  }
});

// Ollama 連接測試 API
app.post('/api/test-ai/ollama', async (req, res) => {
  try {
    const { apiUrl = 'http://localhost:11434' } = req.body;
    console.log(`🧪 測試 Ollama 連接: ${apiUrl}`);
    
    const ollamaClient = new OllamaClient(apiUrl);
    const result = await ollamaClient.testConnection();
    
    console.log('✅ Ollama 連接測試成功');
    res.json(result);
  } catch (error) {
    console.error('❌ Ollama 連接測試失敗:', error.message);
    res.status(500).json({ 
      error: '連接測試失敗', 
      details: error.message 
    });
  }
});

// /api/analyze-log 端點已移除，統一使用 ELK 即時模式


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
    const useModel = model || config.GEMINI_MODEL || 'gemini-1.5-flash';

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
  const detectedAttacks = {};
  const globalStats = {
    totalRequests: 0,
    totalBytes: 0,
    uniqueIPs: new Set(),
    countryCounts: new Map(),
    ipCounts: new Map(),
    uriCounts: new Map(),
    httpStatusCounts: new Map(),
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
      detectAttack(logEntry, null, detectedAttacks); // 不再需要 ipRequestCounts
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
    // 將攻擊資料包含在回傳結果中，並包含WAF分數資料
    return { 
      ...aiAnalysis, 
      attackData,
      wafScoreData: globalStats.wafScoreData || [],
      globalStats,
    };
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
      const aiAnalysis = await getAIAssessment({ ...config, eventData });
      return { 
        ...aiAnalysis, 
        wafScoreData: globalStats.wafScoreData || [],
        globalStats,
      };
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
      const aiAnalysis = await getAIAssessment({ ...config, overallData });
      return { 
        ...aiAnalysis, 
        wafScoreData: globalStats.wafScoreData || [],
        globalStats,
      };
    }
  }
}

function updateGlobalStats(logEntry, globalStats) {
  globalStats.totalRequests++;
  globalStats.totalBytes += logEntry.EdgeResponseBytes || 0;
  globalStats.uniqueIPs.add(logEntry.ClientIP);
  
  // 時間戳處理
  try {
    // 優先使用轉換後的事件時間（對齊 @timestamp），無則回退 EdgeStartTimestamp
    const ts = logEntry.timestamp || logEntry.EdgeStartTimestamp;
    if (ts) {
      const currentTimestamp = new Date(ts);
      if (!isNaN(currentTimestamp.getTime())) {
        if (!globalStats.firstTimestamp || currentTimestamp < globalStats.firstTimestamp) globalStats.firstTimestamp = currentTimestamp;
        if (!globalStats.lastTimestamp || currentTimestamp > globalStats.lastTimestamp) globalStats.lastTimestamp = currentTimestamp;
      }
    }
  } catch (e) {}
  
  // 收集WAF分數資料
  if (!globalStats.wafScoreData) globalStats.wafScoreData = [];
  if (logEntry.ClientRequestURI && logEntry.WAFAttackScore !== undefined) {
    globalStats.wafScoreData.push({
      uri: logEntry.ClientRequestURI,
      wafScore: logEntry.WAFAttackScore || 0,
      clientIP: logEntry.ClientIP,
      timestamp: logEntry.EdgeStartTimestamp
    });
  }
  
  // 基本統計
  const { ClientCountry, ClientIP, ClientRequestURI, SecurityAction, WAFAttackScore, WAFSQLiAttackScore, WAFXSSAttackScore, SecurityRuleDescription } = logEntry;
  if (ClientCountry) globalStats.countryCounts.set(ClientCountry, (globalStats.countryCounts.get(ClientCountry) || 0) + 1);
  if (ClientIP) globalStats.ipCounts.set(ClientIP, (globalStats.ipCounts.get(ClientIP) || 0) + 1);
  if (ClientRequestURI) globalStats.uriCounts.set(ClientRequestURI, (globalStats.uriCounts.get(ClientRequestURI) || 0) + 1);
  if (logEntry.EdgeResponseStatus) {
    globalStats.httpStatusCounts.set(logEntry.EdgeResponseStatus, (globalStats.httpStatusCounts.get(logEntry.EdgeResponseStatus) || 0) + 1);
  }
  
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

function detectAttack(logEntry, unused, detectedAttacks) {
    const { ClientIP, EdgeStartTimestamp, ClientRequestHost, ClientRequestURI, EdgeResponseBytes, EdgeRequestHost } = logEntry;
    if (!ClientIP || !EdgeStartTimestamp) return;

    // 移除閾值判斷，直接基於每個請求來檢測潛在攻擊
    // 因為資料來源已經是經過 Cloudflare 篩選的，不需要額外的頻率閾值
    
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

async function getAIAssessment(requestBody) {
  const { provider, apiKey, model, apiUrl, attackData, healthData, eventData, overallData, fieldReference, owaspReferences } = requestBody;
  
  // 設定預設值和驗證
  const aiProvider = provider || 'gemini';
  let aiClient;
  let useModel = model; // 統一在這裡聲明 useModel
  
  try {
    const aiProviderManager = new AIProviderManager();
    
    if (aiProvider === 'gemini') {
      const useApiKey = apiKey || config.GEMINI_API_KEY;
      useModel = model || config.GEMINI_MODEL || 'gemini-2.5-flash';
      
      if (!useApiKey) {
        throw new Error('Gemini API key is required');
      }
      
      aiClient = aiProviderManager.getProvider('gemini', {
        apiKey: useApiKey,
        model: useModel
      });
      console.log('=== AI 分析請求 (Gemini) ===');
      console.log('使用模型:', useModel);
      
    } else if (aiProvider === 'ollama') {
      const useApiUrl = apiUrl || 'http://localhost:11434';
      useModel = model;
      
      if (!useModel) {
        throw new Error('Ollama model is required');
      }
      
      aiClient = aiProviderManager.getProvider('ollama', {
        apiUrl: useApiUrl,
        model: useModel
      });
      console.log('=== AI 分析請求 (Ollama) ===');
      console.log('使用 API URL:', useApiUrl);
      console.log('使用模型:', useModel);
      
    } else {
      throw new Error(`不支援的 AI 提供商: ${aiProvider}`);
    }
    
    if (!attackData && !healthData && !eventData && !overallData) {
      throw new Error('缺少分析資料');
    }
    
  } catch (error) {
    console.error('❌ AI 客戶端初始化失敗:', error.message);
    throw error;
  }
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

**重要：請務必嚴格按照以下JSON格式回答，不要添加任何其他文字或說明：**

{
  "summary": "您的專業深度安全分析",
  "recommendations": [ "建議1", "建議2", "建議3", "建議4", "建議5" ]
}

**注意：請直接回應JSON，不要有"好的"、"作為專家"等開頭語句**`;
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

**重要：請務必嚴格按照以下JSON格式回答，不要添加任何其他文字或說明：**

{
  "summary": "您的專業分析報告",
  "recommendations": [ "建議1", "建議2", "建議3", "建議4", "建議5" ]
}

**注意：請直接回應JSON，不要有"好的"、"作為專家"等開頭語句**`;
  }

  // 添加重試機制處理 503 錯誤
  let result;
  let text;
  let retryCount = 0;
  const maxRetries = 3;
  const retryDelay = 2000; // 2 秒

  while (retryCount < maxRetries) {
    try {
      console.log(`🔄 嘗試 AI 分析 (第 ${retryCount + 1} 次)...`);
      
      if (aiProvider === 'gemini') {
        result = await aiClient.generateContent(prompt);
        // ✅ 修正：aiProviderManager返回的是{text, model, responseTime}格式
        if (!result || !result.text) {
          throw new Error('AI 回應格式異常：缺少 text 屬性');
        }
        text = result.text.replace(/```json\s*|```\s*/g, '').trim();
      } else if (aiProvider === 'ollama') {
        result = await aiClient.generateContent(useModel, prompt);
        if (!result || !result.text) {
          throw new Error('AI 回應格式異常：缺少 text 屬性');
        }
        text = result.text.replace(/```json\s*|```\s*/g, '').trim();
      }
      
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
  
  // 嘗試從非JSON回應中提取JSON部分
  if (!text.startsWith('{') && text.includes('{')) {
    const jsonStart = text.indexOf('{');
    text = text.substring(jsonStart);
  }
  
  try {
    const analysis = JSON.parse(text);
    
    // 確保必要的屬性存在且格式正確
    if (!analysis.summary) {
      analysis.summary = "AI 分析完成，但摘要格式異常";
    } else if (typeof analysis.summary === 'object') {
      // 如果 summary 是物件，將其轉換為可讀的字串
      if (analysis.summary !== null) {
        const summaryParts = [];
        for (const [key, value] of Object.entries(analysis.summary)) {
          const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          summaryParts.push(`**${formattedKey}**: ${String(value)}`);
        }
        analysis.summary = summaryParts.join('\n\n');
      } else {
        analysis.summary = "AI 分析完成，但摘要格式異常";
      }
    }
    
    if (!analysis.recommendations) {
      analysis.recommendations = ["請檢查系統安全設定"];
    } else if (!Array.isArray(analysis.recommendations)) {
      // 如果 recommendations 不是陣列，轉換為陣列
      analysis.recommendations = [String(analysis.recommendations)];
    }
    
    // 安全地處理 recommendations 陣列
    if (analysis.recommendations && Array.isArray(analysis.recommendations)) {
      analysis.recommendations = analysis.recommendations.map(rec => {
        // 確保每個建議都是字串類型
        if (typeof rec === 'string') {
          return rec.replace(/^\*\*|\*\*$/g, '').replace(/^["']|["']$/g, '').replace(/^•\s*/, '').trim();
        } else if (typeof rec === 'object' && rec !== null) {
          // 如果是物件，嘗試轉換為字串
          return JSON.stringify(rec);
        } else {
          // 其他類型轉為字串
          return String(rec || '').trim();
        }
      }).filter(rec => rec.length > 0); // 過濾空字串
    } else {
      // 如果recommendations不是陣列，轉換為陣列
      analysis.recommendations = [String(analysis.recommendations || "請檢查系統安全設定")];
    }
    
    analysis.metadata = {
      analysisId: analysisId,
      timestamp: currentTime,
      provider: aiProvider,
      model: model,
      isAIGenerated: true
    };
    console.log('✅ AI 分析成功。');
    return analysis;
  } catch (parseError) {
    console.error('JSON 解析錯誤:', parseError);
    console.log('原始回應內容 (前200字元):', text.substring(0, 200));
    
    // 嘗試從自然語言回應中提取有用信息
    let summary = text;
    let recommendations = [];
    
    // 如果回應太長，截取前500字元作為摘要
    if (summary.length > 500) {
      summary = summary.substring(0, 500) + '...';
    }
    
    // 嘗試提取建議（尋找列表格式的文字）
    const suggestionPatterns = ['建議', '建議', '應該', '需要', '可以', '推薦'];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 0) {
        // 檢查是否包含建議關鍵字
        for (const pattern of suggestionPatterns) {
          if (trimmedLine.includes(pattern) && trimmedLine.length > 10) {
            recommendations.push(trimmedLine);
            break;
          }
        }
        // 檢查是否是列表項目
        if ((trimmedLine.startsWith('-') || trimmedLine.startsWith('•') || trimmedLine.startsWith('*')) && trimmedLine.length > 5) {
          recommendations.push(trimmedLine.replace(/^[-•*]\s*/, ''));
        }
      }
    }
    
    // 如果沒有找到建議，使用預設建議
    if (recommendations.length === 0) {
      recommendations = [
        '檢查防火牆設定是否適當',
        '監控異常流量模式',
        '定期更新安全規則',
        '加強訪問控制機制'
      ];
    }
    
    return {
      summary: summary,
      recommendations: recommendations.slice(0, 10), // 最多10個建議
      metadata: {
        analysisId: analysisId,
        timestamp: currentTime,
        model: useModel,
        isAIGenerated: true,
        parseError: true,
        originalResponse: text.substring(0, 100) // 保留原始回應的前100字元供調試
      }
    };
  }
}

// === ELK 資料處理函數 ===

// 處理來自 ELK 的日誌資料
async function processELKLogs(config) {
  const { apiKey, model, timeRange, startTime, endTime } = config;
  
  try {
    if (startTime && endTime) {
      console.log(`🔍 開始處理 ELK 日誌資料 (自定義時間範圍: ${startTime} 到 ${endTime})...`);
    } else {
      console.log(`🔍 開始處理 ELK 日誌資料 (時間範圍: ${timeRange})...`);
    }
    
    // 確保ELK連接狀態
    console.log('🔄 確保 ELK MCP 連接狀態...');
    await elkMCPClient.ensureConnection();
    console.log('✅ ELK MCP 連接確認完成');
    
    // 從 ELK 獲取日誌資料
    let elkData;
    try {
      // 如果有自定義時間範圍，使用自定義查詢方法
      if (startTime && endTime) {
        elkData = await elkMCPClient.queryElasticsearchCustomTime(startTime, endTime);
      } else {
        elkData = await elkMCPClient.queryElasticsearch(timeRange);
      }
    } catch (queryError) {
      console.error('❌ ELK 查詢執行失敗:', queryError);
      throw new Error(`ELK 查詢失敗: ${queryError.message}。請檢查 ELK 配置或網路連接。`);
    }
    
    if (!elkData) {
      throw new Error('ELK 查詢返回空結果，請檢查 Elasticsearch 服務狀態');
    }
    
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
        },
        // 為攻擊來源統計提供空資料
        topIPs: [],
        topCountries: [],
        topURIs: [],
        topDomains: [],
        wafScoreStats: [],
        globalStats: { httpStatusCounts: new Map() },
      };
    }
    
    console.log(`📊 成功獲取 ${elkData.hits.length} 筆日誌記錄`);
    
    // 轉換 ELK 資料格式為現有處理邏輯可用的格式（放寬過濾條件）
    const validHits = elkData.hits.filter(hit => hit && hit.source);
    console.log(`🔍 過濾後有效記錄數: ${validHits.length}/${elkData.hits.length}`);
    
    const logEntries = validHits
      .map(hit => convertELKToLogEntry(hit.source))
      .filter(entry => entry !== null); // 過濾掉轉換失敗的記錄
    
    console.log(`✅ 成功轉換記錄數: ${logEntries.length}/${validHits.length}`);
    
    if (logEntries.length === 0) {
      console.warn('⚠️ 沒有有效的日誌記錄可供分析');
      throw new Error('沒有有效的日誌記錄可供分析');
    }
    
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
      
      return { 
        ...aiAnalysis, 
        attackData,
        wafScoreData: globalStats.wafScoreData || [],
        globalStats,
      };
    } else if (globalStats.totalBytes === 0 || (globalStats.totalBytes / globalStats.totalRequests) < 100) {
      // 事件型日誌分析
      const eventData = buildEventData(globalStats, owaspAnalysis);
      const aiAnalysis = await getAIAssessment({ 
        ...config, 
        eventData,
        fieldReference: generateAIFieldReference(),
        owaspReferences: OWASP_REFERENCES.mainReferences
      });
      
      return { 
        ...aiAnalysis, 
        wafScoreData: globalStats.wafScoreData || [],
        globalStats,
      };
    } else {
      // 整體綜合分析
      const overallData = buildOverallData(globalStats, owaspAnalysis);
      const aiAnalysis = await getAIAssessment({ 
        ...config, 
        overallData,
        fieldReference: generateAIFieldReference(),
        owaspReferences: OWASP_REFERENCES.mainReferences
      });
      
      return { 
        ...aiAnalysis, 
        wafScoreData: globalStats.wafScoreData || [],
        globalStats,
      };
    }
    
  } catch (error) {
    console.error('❌ ELK 日誌處理失敗:', error);
    console.error('錯誤堆疊:', error.stack);
    throw error;
  }
}

// 將 ELK 資料轉換為現有日誌格式
function convertELKToLogEntry(elkRecord) {
  try {
    // 檢查記錄是否存在
    if (!elkRecord) {
      console.warn('⚠️ ELK記錄為空，跳過此記錄');
      return null;
    }

    // 多重時間字段支援，優先級由高到低
    const timestamp = elkRecord["@timestamp"] || 
                     elkRecord["EdgeStartTimestamp"] || 
                     elkRecord["timestamp"] || 
                     new Date().toISOString();

    // 如果所有時間字段都缺失，記錄警告但不跳過記錄
    if (!elkRecord["@timestamp"] && !elkRecord["EdgeStartTimestamp"] && !elkRecord["timestamp"]) {
      console.warn('⚠️ ELK記錄缺少時間字段，使用當前時間作為備用');
    }

    return {
      timestamp: timestamp,
      EdgeStartTimestamp: elkRecord["EdgeStartTimestamp"] || timestamp, // 使用 EdgeStartTimestamp 或備用時間
      ClientIP: elkRecord["ClientIP"] || 'unknown',
      ClientCountry: elkRecord["ClientCountry"] || 'unknown',
      ClientASN: elkRecord["ClientASN"] || 'unknown',
      ZoneName: elkRecord["ZoneName"] || '',
      EdgeRequestHost: elkRecord["EdgeRequestHost"] || '', // Cloudflare 實際處理的域名
      ClientRequestHost: elkRecord["ClientRequestHost"] || '', // 客戶端聲稱的域名
      ClientRequestURI: elkRecord["ClientRequestURI"] || '/',
      EdgeResponseBytes: elkRecord["EdgeResponseBytes"] || 0,
      EdgeTimeToFirstByteMs: elkRecord["EdgeTimeToFirstByteMs"] || 0,
      ClientRequestBytes: elkRecord["ClientRequestBytes"] || 0, // 新增：客戶端請求位元組數
      EdgeResponseStatus: elkRecord["EdgeResponseStatus"] || 0,
      SecurityAction: elkRecord["SecurityAction"] || '',
      SecurityRuleDescription: elkRecord["SecurityRuleDescription"] || '',
      WAFAttackScore: elkRecord["WAFAttackScore"] || 0,
      WAFSQLiAttackScore: elkRecord["WAFSQLiAttackScore"] || 0,
      WAFXSSAttackScore: elkRecord["WAFXSSAttackScore"] || 0,
      WAFRCEAttackScore: elkRecord["WAFRCEAttackScore"] || 0, // 添加 RCE 攻擊分數
      BotScore: elkRecord["BotScore"] || 0,
      ClientRequestUserAgent: elkRecord["ClientRequestUserAgent"] || '',
      RayID: elkRecord["RayID"] || ''
    };
  } catch (error) {
    console.error('❌ ELK記錄轉換失敗:', error);
    return null;
  }
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
    httpStatusCounts: new Map(),
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

  // 處理每個日誌條目
  for (const entry of logEntries) {
    updateGlobalStats(entry, globalStats);
    detectAttack(entry, null, detectedAttacks); // 不再需要 ipRequestTimes
  }

  // 設定時間範圍
  if (globalStats.firstTimestamp && globalStats.lastTimestamp) {
    // 保險：確保 start < end，若反轉則交換
    let startTs = globalStats.firstTimestamp;
    let endTs = globalStats.lastTimestamp;
    if (endTs.getTime() < startTs.getTime()) {
      const tmp = startTs; startTs = endTs; endTs = tmp;
    }
    globalStats.timeRange = {
      start: new Date(startTs).toISOString(),
      end: new Date(endTs).toISOString()
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

// ELK 資料來源分析端點 (統一使用 ELK 即時模式)
app.post('/api/analyze-elk-log', async (req, res) => {
  try {
    const { provider, apiKey, model, apiUrl, timeRange = '1h' } = req.body;
    
    // 根據不同的 AI 提供商進行驗證
    if (provider === 'gemini') {
      if (!apiKey) {
        return res.status(400).json({ error: 'Gemini API key is required' });
      }
      if (!model) {
        return res.status(400).json({ error: 'Gemini model is required' });
      }
    } else if (provider === 'ollama') {
      if (!apiUrl) {
        return res.status(400).json({ error: 'Ollama API URL is required' });
      }
      if (!model) {
        return res.status(400).json({ error: 'Ollama model is required' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid AI provider. Must be "gemini" or "ollama"' });
    }

    // 統一使用 ELK 作為資料來源
    console.log(`🔍 使用 ELK 資料來源進行分析... (AI 提供商: ${provider})`);
    const analysisResult = await processELKLogs({ provider, apiKey, model, apiUrl, timeRange });

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

// === 攻擊趨勢對比分析 API ===

// 載入趨勢對比資料
app.post('/api/load-trend-comparison', async (req, res) => {
  const { timeRange } = req.body;
  
  try {
    console.log(`🔍 開始載入趨勢對比資料 (時間範圍: ${timeRange})...`);
    
    // 計算對比時間區間
    const periods = trendAnalysisService.calculateComparisonPeriods(timeRange);
    
    console.log(`當前時期: ${periods.current.start.toISOString()} - ${periods.current.end.toISOString()}`);
    console.log(`上一時期: ${periods.previous.start.toISOString()} - ${periods.previous.end.toISOString()}`);

    // 進度追蹤回調
    const progressUpdates = [];
    const progressCallback = (update) => {
      progressUpdates.push({
        ...update,
        timestamp: new Date().toISOString()
      });
      console.log(`📋 查詢進度: ${update.description || update.type} - ${update.batchIndex}/${update.totalBatches}`);
    };

    // 查詢實際ELK資料並分割為兩個時期
    const allLogData = await queryActualELKData(timeRange, 0, progressCallback);
    
    if (allLogData.length === 0) {
      throw new Error('未找到任何日誌資料，請檢查ELK連接或數據範圍');
    }

    // 將資料按時間排序並分割為兩個相等時期
    const sortedData = allLogData.sort((a, b) => 
      new Date(a.EdgeStartTimestamp || a.timestamp) - new Date(b.EdgeStartTimestamp || b.timestamp)
    );
    
    const midpoint = Math.floor(sortedData.length / 2);
    const previousData = sortedData.slice(0, midpoint);
    const currentData = sortedData.slice(midpoint);
    
    // 計算實際時間範圍
    const actualPeriods = calculateActualPeriods(previousData, currentData, timeRange);

    console.log(`✅ 數據分割完成:`);
    console.log(`上一時期: ${previousData.length} 筆記錄 (${actualPeriods.previous.start} - ${actualPeriods.previous.end})`);
    console.log(`當前時期: ${currentData.length} 筆記錄 (${actualPeriods.current.start} - ${actualPeriods.current.end})`);

    // 基於ClientRequestBytes生成流量統計
    const currentAnalysis = trendAnalysisService.analyzePeriodTraffic(currentData, actualPeriods.current);
    const previousAnalysis = trendAnalysisService.analyzePeriodTraffic(previousData, actualPeriods.previous);
    
    // 生成單一對比圖表資料
    const comparisonChart = trendAnalysisService.generateTrafficComparisonChart(
      currentAnalysis, 
      previousAnalysis, 
      actualPeriods
    );

    // 計算對比統計
    const statistics = trendAnalysisService.calculateComparisonStats(currentAnalysis, previousAnalysis);

    console.log(`✅ 趨勢對比資料載入完成`);
    console.log(`當前時期: ${currentAnalysis.totalRequests} 次請求, ${trendAnalysisService.formatBytes(currentAnalysis.totalRequestTraffic)} 流量`);
    console.log(`上一時期: ${previousAnalysis.totalRequests} 次請求, ${trendAnalysisService.formatBytes(previousAnalysis.totalRequestTraffic)} 流量`);

    res.json({
      success: true,
      periods: actualPeriods,
      currentPeriod: currentAnalysis,
      previousPeriod: previousAnalysis,
      comparisonChart,
      statistics,
      queryInfo: {
        totalBatches: progressUpdates.length > 0 ? progressUpdates[progressUpdates.length - 1].totalBatches : 1,
        successfulBatches: progressUpdates.filter(p => p.type === 'batch_complete' && p.success).length,
        failedBatches: progressUpdates.filter(p => p.type === 'batch_error').length,
        totalRecords: allLogData.length,
        queryMethod: progressUpdates.length > 1 ? 'batch' : 'single',
        progressLog: progressUpdates
      }
    });

  } catch (error) {
    console.error('❌ 趨勢資料載入失敗:', error);
    
    // 提供更詳細的錯誤信息
    const errorResponse = { 
      error: error.message,
      details: '趨勢對比資料載入失敗',
      timeRange: timeRange
    };
    
    // 如果有進度信息，也包含在錯誤響應中
    if (progressUpdates && progressUpdates.length > 0) {
      errorResponse.queryInfo = {
        totalBatches: progressUpdates[progressUpdates.length - 1]?.totalBatches || 0,
        completedBatches: progressUpdates.filter(p => p.type === 'batch_complete').length,
        failedBatches: progressUpdates.filter(p => p.type === 'batch_error').length,
        progressLog: progressUpdates
      };
    }
    
    res.status(500).json(errorResponse);
  }
});

// AI 趨勢分析
app.post('/api/analyze-attack-trends', async (req, res) => {
  const { apiKey, model, currentData, previousData, periods } = req.body;
  
  try {
    console.log('🤖 開始 AI 趨勢分析...');
    
    if (!apiKey) {
      throw new Error('請先在「AI分析設定」頁面設定 Gemini API Key');
    }
    
    if (!currentData || !previousData) {
      throw new Error('請先載入趨勢圖表資料');
    }

    // 建構AI分析提示詞
    const analysisPrompt = trendAnalysisService.buildTrendAnalysisPrompt(currentData, previousData, periods);
    
    console.log('📝 生成 AI 分析提示詞...');
    
    // 調用Gemini AI分析
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model: model || 'gemini-1.5-pro' });
    
    const result = await geminiModel.generateContent(analysisPrompt);
    const response = await result.response;
    const trendAnalysis = response.text();

    console.log('✅ AI 趨勢分析完成');

    res.json({
      success: true,
      trendAnalysis,
      metadata: {
        analysisId: generateAnalysisId(),
        timestamp: new Date().toISOString(),
        model: model || 'gemini-1.5-pro',
        isAIGenerated: true,
        analysisType: 'traffic_trend_comparison'
      }
    });

  } catch (error) {
    console.error('❌ AI趨勢分析失敗:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'AI趨勢分析失敗'
    });
  }
});

// === 分批查詢策略實施 ===

// 智能時間分割函數
function splitTimeRangeForBatchQuery(timeRange) {
  const strategies = {
    '1h': { batchSize: '30m', maxBatches: 2 },
    '6h': { batchSize: '2h', maxBatches: 3 },
    '1d': { batchSize: '6h', maxBatches: 4 },
    '3d': { batchSize: '1d', maxBatches: 3 },
    '7d': { batchSize: '1d', maxBatches: 7 },
    '30d': { batchSize: '3d', maxBatches: 10 }
  };

  const strategy = strategies[timeRange] || { batchSize: '1d', maxBatches: 3 };
  
  console.log(`📊 時間分割策略: ${timeRange} → ${strategy.maxBatches}個 ${strategy.batchSize} 批次`);
  
  return strategy;
}

// 計算時間範圍的毫秒數
function parseTimeRangeToMs(timeRange) {
  const unit = timeRange.slice(-1);
  const value = parseInt(timeRange.slice(0, -1));
  
  const multipliers = {
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000
  };
  
  return value * (multipliers[unit] || multipliers['h']);
}

// 生成分批時間段
function generateTimeBatches(timeRange) {
  const strategy = splitTimeRangeForBatchQuery(timeRange);
  const now = new Date();
  const totalMs = parseTimeRangeToMs(timeRange);
  const batchMs = parseTimeRangeToMs(strategy.batchSize);
  
  const batches = [];
  let currentEnd = now;
  
  for (let i = 0; i < strategy.maxBatches; i++) {
    const currentStart = new Date(currentEnd.getTime() - batchMs);
    
    // 確保不超過總時間範圍
    if (now.getTime() - currentStart.getTime() > totalMs) {
      const adjustedStart = new Date(now.getTime() - totalMs);
      if (adjustedStart.getTime() < currentEnd.getTime()) {
        batches.push({
          start: adjustedStart,
          end: currentEnd,
          batchIndex: i + 1,
          totalBatches: strategy.maxBatches,
          description: `批次 ${i + 1}/${strategy.maxBatches}`
        });
      }
      break;
    }
    
    batches.push({
      start: currentStart,
      end: currentEnd,
      batchIndex: i + 1,
      totalBatches: strategy.maxBatches,
      description: `批次 ${i + 1}/${strategy.maxBatches}`
    });
    
    currentEnd = currentStart;
  }
  
  // 反轉順序，從最早的時間開始
  batches.reverse();
  batches.forEach((batch, index) => {
    batch.batchIndex = index + 1;
    batch.description = `批次 ${index + 1}/${batches.length}`;
  });
  
  return batches;
}

// 分批查詢ELK數據
async function queryELKDataInBatches(timeRange, progressCallback = null) {
  console.log(`🚀 開始分批查詢 ELK 數據 (時間範圍: ${timeRange})`);
  
  // 檢查是否需要分批查詢
  const shouldUseBatch = ['6h', '1d', '3d', '7d', '30d'].includes(timeRange);
  
  if (!shouldUseBatch) {
    console.log(`📝 時間範圍 ${timeRange} 無需分批，使用原始查詢`);
    return await querySingleBatch(timeRange, 1, 1, progressCallback);
  }
  
  const batches = generateTimeBatches(timeRange);
  const allResults = [];
  let successCount = 0;
  let partialFailures = [];
  
  console.log(`📋 生成 ${batches.length} 個查詢批次:`);
  batches.forEach(batch => {
    console.log(`  ${batch.description}: ${batch.start.toISOString()} - ${batch.end.toISOString()}`);
  });
  
  for (const batch of batches) {
    try {
      if (progressCallback) {
        progressCallback({
          type: 'batch_start',
          batchIndex: batch.batchIndex,
          totalBatches: batch.totalBatches,
          description: batch.description,
          timeRange: `${batch.start.toISOString()} - ${batch.end.toISOString()}`
        });
      }
      
      console.log(`🔍 執行 ${batch.description} 查詢...`);
      console.log(`   時間範圍: ${batch.start.toISOString()} - ${batch.end.toISOString()}`);
      
      const batchResult = await queryCustomTimeRangeBatch(batch.start, batch.end, batch.batchIndex, batch.totalBatches);
      
      if (batchResult && batchResult.length > 0) {
        allResults.push(...batchResult);
        successCount++;
        console.log(`✅ ${batch.description} 查詢成功，獲得 ${batchResult.length} 筆記錄`);
      } else {
        console.log(`⚠️ ${batch.description} 查詢無數據`);
      }
      
      if (progressCallback) {
        progressCallback({
          type: 'batch_complete',
          batchIndex: batch.batchIndex,
          totalBatches: batch.totalBatches,
          recordCount: batchResult ? batchResult.length : 0,
          success: true
        });
      }
      
    } catch (error) {
      console.error(`❌ ${batch.description} 查詢失敗:`, error.message);
      partialFailures.push({
        batch: batch.description,
        error: error.message,
        timeRange: `${batch.start.toISOString()} - ${batch.end.toISOString()}`
      });
      
      if (progressCallback) {
        progressCallback({
          type: 'batch_error',
          batchIndex: batch.batchIndex,
          totalBatches: batch.totalBatches,
          error: error.message
        });
      }
      
      // 如果是超時錯誤，繼續嘗試其他批次
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        console.log(`⏭️ 跳過超時的批次，繼續處理剩餘批次...`);
        continue;
      }
      
      // 其他錯誤也繼續嘗試
      console.log(`⏭️ 跳過失敗的批次，繼續處理剩餘批次...`);
    }
    
    // 批次間加入短暫延遲，避免過度負載
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 結果統計
  console.log(`📊 分批查詢完成統計:`);
  console.log(`   成功批次: ${successCount}/${batches.length}`);
  console.log(`   總記錄數: ${allResults.length}`);
  console.log(`   失敗批次: ${partialFailures.length}`);
  
  if (partialFailures.length > 0) {
    console.log(`⚠️ 部分批次查詢失敗:`);
    partialFailures.forEach(failure => {
      console.log(`   - ${failure.batch}: ${failure.error}`);
    });
  }
  
  // 按時間排序合併結果
  if (allResults.length > 0) {
    allResults.sort((a, b) => 
      new Date(a.EdgeStartTimestamp || a.timestamp) - new Date(b.EdgeStartTimestamp || b.timestamp)
    );
    console.log(`✅ 數據合併完成，時間範圍: ${allResults[0]?.EdgeStartTimestamp} - ${allResults[allResults.length-1]?.EdgeStartTimestamp}`);
  }
  
  // 如果完全沒有數據，拋出錯誤
  if (allResults.length === 0) {
    const errorMsg = partialFailures.length > 0 
      ? `所有批次查詢失敗。主要錯誤: ${partialFailures[0].error}`
      : '未找到任何數據';
    throw new Error(errorMsg);
  }
  
  // 如果部分失敗但有數據，記錄警告
  if (partialFailures.length > 0 && allResults.length > 0) {
    console.log(`⚠️ 注意：部分數據缺失，但已獲得 ${allResults.length} 筆有效記錄進行分析`);
  }
  
  return allResults;
}

// 查詢單個時間批次
async function queryCustomTimeRangeBatch(startTime, endTime, batchIndex, totalBatches) {
  try {
    console.log(`🔍 查詢批次 ${batchIndex}/${totalBatches}: ${startTime.toISOString()} - ${endTime.toISOString()}`);
    
    // 計算批次時間範圍以優化查詢大小
    const timeDiff = endTime.getTime() - startTime.getTime();
    const hours = timeDiff / (1000 * 60 * 60);
    let batchSizeKey = '1d';
    
    if (hours <= 0.5) batchSizeKey = '30m';
    else if (hours <= 1) batchSizeKey = '1h';
    else if (hours <= 2) batchSizeKey = '2h';
    else if (hours <= 6) batchSizeKey = '6h';
    else if (hours <= 24) batchSizeKey = '1d';
    else batchSizeKey = '3d';
    
    const querySize = getBatchQuerySizeByTimeRange(batchSizeKey);
    console.log(`📏 批次 ${batchIndex} 時間跨度: ${hours.toFixed(1)}小時，查詢大小: ${querySize}`);
    
    // 使用自定義時間範圍查詢
    const elkData = await elkMCPClient.queryElasticsearchCustomTime(
      startTime.toISOString(),
      endTime.toISOString(),
      {} // 目前使用預設查詢大小，未來可以優化
    );
    
    if (!elkData.hits || elkData.hits.length === 0) {
      console.log(`📭 批次 ${batchIndex} 無數據`);
      return [];
    }
    
    console.log(`📊 批次 ${batchIndex} 獲得 ${elkData.hits.length} 筆原始記錄`);
    
    // 轉換數據格式（放寬過濾條件）
    const validHits = elkData.hits.filter(hit => hit && hit.source);
    const logEntries = validHits
      .map(hit => convertELKToLogEntry(hit.source))
      .filter(entry => entry !== null);
    
    console.log(`✅ 批次 ${batchIndex} 成功轉換 ${logEntries.length} 筆有效記錄`);
    
    return logEntries;
    
  } catch (error) {
    console.error(`❌ 批次 ${batchIndex} 查詢失敗:`, error.message);
    
    // 增強錯誤處理：提供具體的錯誤分類
    if (error.message.includes('timeout') || error.message.includes('timed out')) {
      throw new Error(`批次 ${batchIndex} 查詢超時，建議縮小時間範圍`);
    }
    
    if (error.message.includes('Connection') || error.message.includes('MCP')) {
      throw new Error(`批次 ${batchIndex} 連接失敗，請檢查ELK服務狀態`);
    }
    
    throw new Error(`批次 ${batchIndex} 查詢失敗: ${error.message}`);
  }
}

// 單批次查詢（用於小時間範圍）
async function querySingleBatch(timeRange, batchIndex, totalBatches, progressCallback = null) {
  try {
    if (progressCallback) {
      progressCallback({
        type: 'batch_start',
        batchIndex,
        totalBatches,
        description: `單次查詢 ${timeRange}`,
        timeRange: timeRange
      });
    }
    
    const elkData = await elkMCPClient.queryElasticsearch(timeRange);
    
    if (!elkData.hits || elkData.hits.length === 0) {
      if (progressCallback) {
        progressCallback({
          type: 'batch_complete',
          batchIndex,
          totalBatches,
          recordCount: 0,
          success: true
        });
      }
      return [];
    }
    
    const validHits = elkData.hits.filter(hit => hit && hit.source && hit.source["@timestamp"]);
    const logEntries = validHits
      .map(hit => convertELKToLogEntry(hit.source))
      .filter(entry => entry !== null);
    
    if (progressCallback) {
      progressCallback({
        type: 'batch_complete',
        batchIndex,
        totalBatches,
        recordCount: logEntries.length,
        success: true
      });
    }
    
    return logEntries;
    
  } catch (error) {
    if (progressCallback) {
      progressCallback({
        type: 'batch_error',
        batchIndex,
        totalBatches,
        error: error.message
      });
    }
    throw error;
  }
}

// 查詢實際ELK資料（基於現有數據範圍）- 使用分批策略
async function queryActualELKData(timeRange, retryCount = 0, progressCallback = null) {
  console.log(`🔍 查詢實際ELK資料 (範圍: ${timeRange}, 嘗試: ${retryCount + 1})...`);
  
  try {
    // 使用新的分批查詢策略
    const logEntries = await queryELKDataInBatches(timeRange, progressCallback);
    
    if (!logEntries || logEntries.length === 0) {
      console.log('⚠️ 未找到ELK日誌資料');
      return [];
    }
    
    console.log(`✅ 分批查詢完成，總共獲得 ${logEntries.length} 筆記錄`);
    console.log(`📅 數據時間範圍: ${logEntries[0]?.EdgeStartTimestamp} - ${logEntries[logEntries.length-1]?.EdgeStartTimestamp}`);
    
    return logEntries;
    
  } catch (error) {
    console.error(`❌ 查詢實際ELK資料失敗 (嘗試 ${retryCount + 1}):`, error.message);
    
    // 如果是部分數據錯誤但有結果，嘗試降級處理
    if (error.message.includes('部分數據缺失') && retryCount === 0) {
      console.log('⚠️ 檢測到部分數據缺失，但可能仍有可用數據，繼續處理...');
      // 這種情況下，分批查詢函數會返回可用的數據
      // 所以這個錯誤可能不會到達這裡，但保留作為安全網
    }
    
    // 對於超時錯誤，提供更友好的建議
    if (error.message.includes('timeout') || error.message.includes('timed out')) {
      const suggestion = timeRange === '30d' 
        ? '請嘗試7天範圍' 
        : timeRange === '7d' 
        ? '請嘗試3天範圍' 
        : '請嘗試1天範圍';
      
      throw new Error(`查詢超時：${timeRange} 範圍仍然過大。${suggestion}，或稍後再試。`);
    }
    
    // 對於其他錯誤，提供具體的解決建議
    throw new Error(`數據查詢失敗：${error.message}。建議檢查ELK連接或嘗試較小的時間範圍。`);
  }
}

// 根據時間範圍獲取單批次查詢大小（優化後的分批策略）
function getBatchQuerySizeByTimeRange(batchSize) {
  const sizeMap = {
    '30m': 1500,  // 30分鐘批次
    '1h': 2000,   // 1小時批次
    '2h': 2500,   // 2小時批次
    '6h': 3000,   // 6小時批次
    '1d': 3500,   // 1天批次
    '3d': 4000    // 3天批次（最大批次）
  };
  console.log(`📊 批次大小 ${batchSize} 對應查詢大小: ${sizeMap[batchSize] || 3000}`);
  return sizeMap[batchSize] || 3000;
}

// 計算實際時間範圍
function calculateActualPeriods(previousData, currentData, timeRange) {
  const getTimeRange = (data) => {
    if (data.length === 0) return { start: null, end: null };
    
    const timestamps = data.map(entry => new Date(entry.EdgeStartTimestamp || entry.timestamp));
    const start = new Date(Math.min(...timestamps));
    const end = new Date(Math.max(...timestamps));
    
    return { start, end };
  };
  
  const previousRange = getTimeRange(previousData);
  const currentRange = getTimeRange(currentData);
  
  const formatDateRange = (start, end) => {
    if (!start || !end) return 'N/A';
    
    const formatDate = (date) => {
      return date.toLocaleDateString('zh-TW', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    
    return `${formatDate(start)} - ${formatDate(end)}`;
  };
  
  return {
    current: {
      start: currentRange.start,
      end: currentRange.end,
      label: `當前時期 (${formatDateRange(currentRange.start, currentRange.end)})`
    },
    previous: {
      start: previousRange.start,
      end: previousRange.end,
      label: `上一時期 (${formatDateRange(previousRange.start, previousRange.end)})`
    }
  };
}

// 查詢特定時期的ELK資料（舊方法，保留備用）
async function queryELKPeriodData(period) {
  try {
    console.log(`🔍 查詢時期資料: ${period.start.toISOString()} - ${period.end.toISOString()}`);
    
    // 確保 ELK 連接已建立
    await elkMCPClient.ensureConnection();
    
    // 建構時間範圍查詢
    const query = {
      query: {
        range: {
          "@timestamp": {
            gte: period.start.toISOString(),
            lte: period.end.toISOString()
          }
        }
      },
      sort: [{ "@timestamp": { order: "asc" } }],
      size: 10000 // 根據需要調整
    };

    console.log('📊 執行自定義時間範圍查詢...');
    console.log('查詢時間範圍:', period.start.toISOString(), 'to', period.end.toISOString());
    console.log('索引:', ELK_CONFIG.elasticsearch.index);

    // 使用HTTP協議調用 MCP 工具
    const result = await elkMCPClient.callHttpTool('search', {
      index: ELK_CONFIG.elasticsearch.index,
      query_body: query
    });

    if (result.isError) {
      throw new Error(`ELK查詢失敗: ${result.content[0]?.text || 'Unknown error'}`);
    }

    // 處理 MCP Server 的回應 (複製現有邏輯)
    const responseText = result.content[0]?.text || '';
    console.log('MCP Server 回應 (摘要):', responseText.substring(0, 200) + '...');
    
    // 檢查是否有第二個 content（實際的資料）
    const dataText = result.content[1]?.text || responseText;
    console.log('實際資料長度:', dataText.length, '前 100 字元:', dataText.substring(0, 100));
    
    let records;
    
    try {
      // 首先嘗試解析為記錄陣列（最常見的情況）
      records = JSON.parse(dataText);
      if (Array.isArray(records)) {
        console.log(`✅ 解析為記錄陣列，找到 ${records.length} 筆記錄`);
        return records.map(record => convertELKToLogEntry(record));
      } else {
        // 如果不是陣列，可能是標準 Elasticsearch 格式
        console.log('⚠️ 回應不是陣列格式，嘗試提取hits');
        const hits = records.hits?.hits || [];
        console.log(`✅ 從hits中找到 ${hits.length} 筆記錄`);
        const valid = hits.filter(h => h && h._source);
        return valid.map(h => convertELKToLogEntry(h._source));
      }
    } catch (e) {
      // 如果都無法解析，嘗試從摘要中提取數字
      console.log('⚠️ 無法解析JSON格式，嘗試解析摘要');
      const match = responseText.match(/Total results: (\d+)/);
      if (match) {
        const totalCount = parseInt(match[1]);
        console.log(`從摘要中發現 ${totalCount} 筆記錄，但無法解析詳細資料`);
        // 返回空陣列但記錄數量
        return [];
      }
      console.log('⚠️ 無法解析任何資料，回傳空陣列');
      return [];
    }
    
  } catch (error) {
    console.error(`❌ 查詢時期資料失敗:`, error);
    throw error;
  }
}

// 調試端點：檢查時間分組問題
app.get('/api/debug/time-grouping', async (req, res) => {
  try {
    console.log('🔍 開始調試時間分組...');
    
    // 查詢少量實際數據
    const elkData = await elkMCPClient.queryElasticsearch('auto');
    
    if (!elkData.hits || elkData.hits.length === 0) {
      return res.json({ error: '沒有找到數據' });
    }
    
    // 轉換前10筆數據
    const logEntries = elkData.hits.slice(0, 10).map(hit => convertELKToLogEntry(hit.source));
    
    // 分析時間分組
    const results = [];
    const groupInterval = 24 * 60 * 60 * 1000; // 1天
    
    logEntries.forEach((entry, i) => {
      const timestamp = new Date(entry.EdgeStartTimestamp || entry.timestamp);
      const timeKey = Math.floor(timestamp.getTime() / groupInterval) * groupInterval;
      const requestBytes = parseInt(entry.ClientRequestBytes) || 0;
      
      results.push({
        index: i,
        originalTimestamp: entry.EdgeStartTimestamp,
        parsedTimestamp: timestamp.toISOString(),
        timeKey: new Date(timeKey).toISOString(),
        clientRequestBytes: requestBytes,
        clientIP: entry.ClientIP
      });
    });
    
    res.json({
      message: '時間分組調試',
      totalRecords: elkData.hits.length,
      sampleData: results,
      groupInterval: `${groupInterval}ms (${groupInterval / (24*60*60*1000)}天)`
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 輸入驗證中間件（支援 custom 並在 custom 時要求起訖時間）
const validateTimeRange = [
  body('timeRange')
    .optional()
    .customSanitizer((v) => typeof v === 'string' ? v.trim().toLowerCase() : v)
    .custom((value) => {
      if (value === undefined) return true;
      if (typeof value === 'string' && (value === 'auto' || value === 'custom' || /^(\d+)[mhd]$/.test(value))) {
        return true;
      }
      throw new Error('時間範圍格式不正確');
    }),
  body('startTime')
    .custom((value, { req }) => {
      const { timeRange } = req.body;
      if (timeRange === 'custom') {
        if (!value) throw new Error('開始時間為必填');
        const d = new Date(value);
        if (isNaN(d.getTime())) throw new Error('開始時間格式不正確');
      } else if (value) {
        const d = new Date(value);
        if (isNaN(d.getTime())) throw new Error('開始時間格式不正確');
      }
      return true;
    }),
  body('endTime')
    .custom((value, { req }) => {
      const { timeRange, startTime } = req.body;
      if (timeRange === 'custom') {
        if (!value) throw new Error('結束時間為必填');
        const end = new Date(value);
        if (isNaN(end.getTime())) throw new Error('結束時間格式不正確');
        const start = new Date(startTime);
        if (!isNaN(start.getTime()) && end.getTime() <= start.getTime()) {
          throw new Error('結束時間必須大於開始時間');
        }
      } else if (value) {
        const d = new Date(value);
        if (isNaN(d.getTime())) throw new Error('結束時間格式不正確');
      }
      return true;
    })
];

// 新增：攻擊來源統計API (安全版本)
app.post('/api/attack-source-stats', validateTimeRange, async (req, res) => {
  try {
    // 驗證輸入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: '輸入驗證失敗', 
        details: errors.array().map(err => err.msg)
      });
    }

    const { model, dataSource = 'file', timeRange = 'auto', startTime, endTime, apiKey: clientApiKey } = req.body;
    
    // 使用後端環境變數中的API Key，如果無效則回退到客戶端提供的API Key（臨時方案）
    let apiKey = securityConfig.gemini.apiKey;
    let usingClientKey = false;
    
    if (!isValidApiKey(apiKey)) {
      console.warn('⚠️  後端API Key無效，嘗試使用客戶端提供的API Key（臨時方案）');
      apiKey = clientApiKey;
      usingClientKey = true;
      
      if (!isValidApiKey(apiKey)) {
        console.error('❌ 沒有有效的API Key可用');
        return res.status(400).json({ 
          error: 'API Key設置錯誤', 
          hint: '請設置後端環境變數GEMINI_API_KEY，或在前端AI設定中輸入API Key' 
        });
      }
    }
    
    if (usingClientKey) {
      console.log('🔑 使用客戶端提供的API Key（建議設置後端環境變數以提高安全性）');
    }

    console.log(`📊 開始載入攻擊來源統計 (資料來源: ${dataSource})`);
    
    // 驗證時間範圍
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffHours = (end - start) / (1000 * 60 * 60);
      
      if (diffHours <= 0) {
        return res.status(400).json({ error: '結束時間必須晚於開始時間' });
      }
      
      if (diffHours > securityConfig.validation.maxTimeRangeHours) {
        return res.status(400).json({ 
          error: `時間範圍不能超過${securityConfig.validation.maxTimeRangeHours}小時` 
        });
      }
      
      console.log(`🕐 使用自定義時間範圍: ${startTime} 到 ${endTime} (${diffHours.toFixed(1)}小時)`);
    } else {
      console.log(`🕐 使用預設時間範圍: ${timeRange}`);
    }
    
    let analysisResult;
    
    if (dataSource === 'elk') {
      // 傳遞安全的配置到processELKLogs
      analysisResult = await processELKLogs({ 
        apiKey, 
        model: model || securityConfig.gemini.model, 
        timeRange, 
        startTime, 
        endTime 
      });
    } else {
      analysisResult = await processLogFile({ 
        apiKey, 
        model: model || securityConfig.gemini.model 
      });
    }

    // 提取攻擊來源統計資料
    const attackData = analysisResult.attackData;
    if (!attackData) {
      return res.json({
        topIPs: [],
        topCountries: [],
        topURIs: [],
        topDomains: [],
        httpStatusStats: [],
      });
    }

    // 處理 HTTP 狀態碼統計
    const globalStats = analysisResult.globalStats || {};
    const httpStatusStats = globalStats.httpStatusCounts ? 
      Array.from(globalStats.httpStatusCounts.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count)
      : [];

    res.json({
      topIPs: attackData.topIPs || [],
      topCountries: attackData.topCountries || [],
      topURIs: attackData.topURIs || [],
      topDomains: attackData.allAttacks || [],
      httpStatusStats: httpStatusStats,
      totalRequests: attackData.totalRequests || 0,
      uniqueIPs: attackData.uniqueIPs || 0
    });

  } catch (error) {
    console.error('❌ 攻擊來源統計失敗:', error);
    res.status(500).json({ 
      error: '攻擊來源統計失敗', 
      details: error.message 
    });
  }
});

// ELK 連接預熱（可選）
async function warmupELKConnection() {
  try {
    console.log('🔥 開始 ELK 連接預熱...');
    
    // 檢查是否配置了ELK
    if (!ELK_CONFIG.mcp.serverUrl || ELK_CONFIG.mcp.serverUrl.includes('localhost')) {
      console.log('⚠️ 跳過 ELK 預熱：未配置生產環境 ELK 服務器');
      return;
    }
    
    // 嘗試建立連接（不強制要求成功）
    const connected = await elkMCPClient.testConnection();
    if (connected) {
      console.log('✅ ELK 連接預熱成功');
    } else {
      console.log('⚠️ ELK 連接預熱失敗，但不影響系統啟動');
    }
  } catch (error) {
    console.log('⚠️ ELK 連接預熱失敗:', error.message);
    console.log('💡 系統將在首次使用時建立 ELK 連接');
  }
}

// 啟動服務
const port = 8080;
app.listen(port, async () => {
  console.log(`🚀 Backend API 已啟動: http://localhost:${port}`);
  console.log('📊 DDoS 攻擊圖表分析系統已就緒');
  
  // 異步執行ELK預熱（不阻塞啟動）
  setTimeout(() => {
    warmupELKConnection().catch(err => {
      console.log('ELK預熱過程出錯（可忽略）:', err.message);
    });
  }, 1000); // 等待1秒後開始預熱
});

// === 防護分析相關API ===

// 處理防護分析數據
async function processSecurityAnalysisData(config) {
  const { timeRange, startTime, endTime } = config;
  
  try {
    console.log('🔍 開始處理防護分析數據...');
    
    // 確保ELK連接狀態
    await elkMCPClient.ensureConnection();
    
    // 進度追蹤回調
    const progressCallback = (update) => {
      console.log(`📋 防護分析查詢進度: ${update.description || update.type} - ${update.batchIndex || 0}/${update.totalBatches || 1}`);
    };
    
    // 從 ELK 獲取日誌資料 - 使用分段查詢功能
    let logEntries;
    if (startTime && endTime) {
      // 自定義時間範圍 - 直接查詢（通常較短範圍）
      const elkData = await elkMCPClient.queryElasticsearchCustomTime(startTime, endTime);
      if (!elkData || !elkData.hits) {
        throw new Error('無法獲取ELK數據');
      }
      console.log(`📊 成功獲取 ${elkData.hits.length} 筆日誌資料`);
      
      // 轉換為日誌條目（先過濾有效 hit，避免空記錄造成大量警告）
      const validHits = elkData.hits.filter(hit => 
        hit && hit.source && (hit.source["@timestamp"] || hit.source["EdgeStartTimestamp"]) 
      );
      logEntries = validHits.map(hit => convertELKToLogEntry(hit.source));
    } else {
      // 使用分段查詢功能 - 支援長時間範圍且無2小時限制
      console.log(`🚀 使用分段查詢功能處理時間範圍: ${timeRange}`);
      logEntries = await queryActualELKData(timeRange, 0, progressCallback);
      
      if (!logEntries || logEntries.length === 0) {
        throw new Error('無法獲取ELK數據或數據為空');
      }
      
      console.log(`📊 分段查詢成功獲取 ${logEntries.length} 筆日誌資料`);
    }

    // 計算防護分析統計
    const securityStats = calculateSecurityStats(logEntries, { start: startTime || null, end: endTime || null });
    
    return securityStats;
    
  } catch (error) {
    console.error('❌ 防護分析數據處理失敗:', error);
    throw error;
  }
}

// === AI 對話端點（統一聊天） ===
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, context, requestDocSuggestions, requestPlanScaffold } = req.body || {};
    const { provider, apiKey, model, apiUrl } = req.body || {};

    const aiProvider = provider || 'gemini';
    const aiProviderManager = new AIProviderManager();
    let aiClient;

    if (aiProvider === 'gemini') {
      if (!apiKey) return res.status(400).json({ error: '缺少 Gemini API Key' });
      const useModel = model || 'gemini-2.5-flash';
      aiClient = aiProviderManager.getProvider('gemini', { apiKey, model: useModel });
    } else if (aiProvider === 'ollama') {
      if (!apiUrl || !model) return res.status(400).json({ error: '缺少 Ollama API URL 或模型' });
      aiClient = aiProviderManager.getProvider('ollama', { apiUrl, model });
    } else {
      return res.status(400).json({ error: `不支援的 AI 提供商: ${aiProvider}` });
    }

    const systemIntro = [
      '你是 Cloudflare 安全與設定向導。',
      '輸出順序：先概要、再分步、最後提供文件與風險/回滾。',
      '若使用者需要 Cloudflare 設定，請附對應操作文件。'
    ].join('\n');

    let docBlocks = [];
    if (requestDocSuggestions) {
      const intents = [];
      if (context?.analysisContext?.recommendations) intents.push(...context.analysisContext.recommendations);
      if (message) intents.push(message);
      const recs = recommendByIntent(intents);
      docBlocks = recs.map(r => `文件：${r.title}\n連結：${r.url}\n摘要：${r.summary}`);
    }

    const planScaffold = requestPlanScaffold ? '請依據上下文，輸出「步驟清單」與「風險與回滾建議」。' : '';

    const prompt = [
      systemIntro,
      context?.analysisContext ? `上下文：${JSON.stringify(context.analysisContext).slice(0, 2000)}` : '',
      message ? `使用者：${message}` : '',
      docBlocks.length ? `參考文件：\n${docBlocks.join('\n\n')}` : '',
      planScaffold
    ].filter(Boolean).join('\n\n');

    let resultText = '';
    if (aiProvider === 'gemini') {
      const gen = await aiClient.generateContent(prompt);
      resultText = gen?.text || '';
    } else {
      const gen = await aiClient.generateContent(model, prompt);
      resultText = gen?.text || '';
    }

    return res.json({
      reply: resultText || '（沒有產生內容）',
      docs: docBlocks
    });
  } catch (err) {
    console.error('AI 聊天端點錯誤:', err);
    return res.status(500).json({ error: 'AI 聊天失敗' });
  }
});

// === 動態時間軸輔助函數 ===

// 根據時間範圍選擇最適合的分組間隔
function getOptimalTimeInterval(startTime, endTime, timeSpanMs) {
  const hours = timeSpanMs / (1000 * 60 * 60);
  const days = hours / 24;
  
  let interval, format, intervalCount;
  
  // 增加調試信息
  console.log(`⏰ 時間範圍調試: timeSpanMs=${timeSpanMs}, hours=${hours.toFixed(2)}, days=${days.toFixed(2)}`);
  
  if (hours <= 1) {
    // 1小時內：每5分鐘
    interval = 5 * 60 * 1000;
    format = 'HH:mm';
    intervalCount = Math.ceil(hours * 12); // 12個5分鐘間隔/小時
  } else if (hours <= 6) {
    // 6小時內：每15分鐘
    interval = 15 * 60 * 1000;
    format = 'HH:mm';
    intervalCount = Math.ceil(hours * 4); // 4個15分鐘間隔/小時
  } else if (hours <= 24) {
    // 24小時內：每小時
    interval = 60 * 60 * 1000;
    format = 'HH:mm';
    intervalCount = Math.ceil(hours);
  } else if (days <= 7) {
    // 🎯 修復：7天內按天分組，優先判斷天數而非小時數
    interval = 24 * 60 * 60 * 1000;
    format = 'MM-DD';
    intervalCount = Math.ceil(days);
    console.log(`📅 使用每日分組: ${intervalCount}天`);
  } else if (days <= 30) {
    // 30天內：每週
    interval = 7 * 24 * 60 * 60 * 1000;
    format = '第W週';
    intervalCount = Math.ceil(days / 7);
  } else {
    // 超過30天：每月
    interval = 30 * 24 * 60 * 60 * 1000;
    format = 'MM月';
    intervalCount = Math.ceil(days / 30);
  }
  
  // 生成時間標籤
  const labels = [];
  let currentTime = new Date(startTime);
  
  console.log(`📊 生成間隔: interval=${interval}ms (${interval/(1000*60*60)}小時), format=${format}, maxCount=${Math.min(intervalCount, 20)}`);
  console.log(`🕐 開始時間: ${startTime.toISOString()}, 結束時間: ${endTime.toISOString()}`);
  
  for (let i = 0; i < Math.min(intervalCount, 50); i++) { // 🎯 修復：增加到50個時間點上限
    const timeKey = Math.floor(currentTime.getTime() / interval) * interval;
    
    labels.push({
      timestamp: new Date(currentTime),
      label: formatTimeLabel(currentTime, format),
      key: timeKey
    });
    
    console.log(`  時間點${i+1}: ${currentTime.toISOString()} -> ${formatTimeLabel(currentTime, format)}`);
    
    currentTime = new Date(currentTime.getTime() + interval);
    
    // 🎯 修復：更寬鬆的結束條件，避免過早終止
    if (currentTime.getTime() > endTime.getTime() + interval) break;
  }
  
  // 🎯 修復：備用方案，確保至少有1個時間點
  if (labels.length === 0) {
    console.warn('⚠️ 生成0個時間點，使用備用方案');
    labels.push({
      timestamp: new Date(startTime),
      label: formatTimeLabel(new Date(startTime), format),
      key: startTime.getTime()
    });
    
    // 如果時間範圍足夠，再加一個結束時間點
    if (endTime.getTime() - startTime.getTime() > interval) {
      labels.push({
        timestamp: new Date(endTime),
        label: formatTimeLabel(new Date(endTime), format),
        key: endTime.getTime()
      });
    }
  }
  
  console.log(`✅ 最終生成 ${labels.length} 個時間點`);
  return { interval, format, labels };
}

// 格式化時間標籤
function formatTimeLabel(date, format) {
  const pad = (n) => n.toString().padStart(2, '0');
  
  switch (format) {
    case 'HH:mm':
      return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    case 'MM-DD':
      return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    case '第W週':
      const weekNum = Math.ceil(date.getDate() / 7);
      return `第${weekNum}週`;
    case 'MM月':
      return `${date.getMonth() + 1}月`;
    default:
      return date.toISOString().substring(0, 16);
  }
}

// 生成攻擊類型時間序列數據
function generateAttackTimeSeriesData(attackEntries, labels, interval, format) {
  const timeSeriesData = [];
  
  labels.forEach(labelInfo => {
    const timeKey = labelInfo.key;
    const nextTimeKey = timeKey + interval;
    
    // 過濾此時間段內的攻擊事件
    const attacksInPeriod = attackEntries.filter(entry => {
      const entryTime = new Date(entry.timestamp).getTime();
      return entryTime >= timeKey && entryTime < nextTimeKey;
    });
    
    // 統計四種攻擊類型（優先序：RCE > SQLi > XSS > Bot；僅在對應分數低於門檻時計入）
    const counts = {
      name: labelInfo.label,
      'SQL注入': 0,
      'XSS攻擊': 0,
      'RCE遠程指令碼攻擊': 0,
      '機器人攻擊': 0
    };
    
    attacksInPeriod.forEach(entry => {
      const rceLow = (entry.WAFRCEAttackScore ?? 100) < 50;
      const sqliLow = (entry.WAFSQLiAttackScore ?? 100) < 50;
      const xssLow = (entry.WAFXSSAttackScore ?? 100) < 50;
      const botLow = (entry.BotScore ?? 99) < 30;
      if (rceLow) counts['RCE遠程指令碼攻擊']++;
      else if (sqliLow) counts['SQL注入']++;
      else if (xssLow) counts['XSS攻擊']++;
      else if (botLow) counts['機器人攻擊']++;
      // 若皆不命中則不計入（避免誤分類）
    });
    
    timeSeriesData.push(counts);
  });
  
  return timeSeriesData;
}

// 生成性能趨勢數據
function generatePerformanceTrendData(logEntries, labels, interval, format) {
  const trendData = [];
  
  labels.forEach(labelInfo => {
    const timeKey = labelInfo.key;
    const nextTimeKey = timeKey + interval;
    
    // 過濾此時間段內的請求
    const requestsInPeriod = logEntries.filter(entry => {
      const entryTime = new Date(entry.timestamp).getTime();
      return entryTime >= timeKey && entryTime < nextTimeKey;
    });
    
    if (requestsInPeriod.length === 0) {
      trendData.push({
        name: labelInfo.label,
        阻擋率: 0,
        響應時間: 0
      });
      return;
    }
    
    // 計算阻擋率
    const blockedCount = requestsInPeriod.filter(entry => entry.SecurityAction === 'block').length;
    const blockingRate = ((blockedCount / requestsInPeriod.length) * 100).toFixed(1);
    
    // 計算平均響應時間（轉換為性能指標：響應時間越短分數越高）
    const responseTimes = requestsInPeriod
      .map(entry => parseInt(entry.EdgeTimeToFirstByteMs) || 0)
      .filter(time => time > 0);
    
    const avgResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    
    // 將響應時間轉換為性能分數（越低越好，轉換為0-100分）
    const responseTimeScore = avgResponseTime > 0 ? 
      Math.max(0, 100 - (avgResponseTime / 10)) : 100;
    
    trendData.push({
      name: labelInfo.label,
      阻擋率: parseFloat(blockingRate),
      響應時間: Math.round(responseTimeScore)
    });
  });
  
  return {
    responseTime: { trend: 'improving', data: trendData },
    blockingRate: { trend: 'stable', data: trendData }
  };
}

// 生成流量時間序列數據
function generateTrafficTimeSeriesData(logEntries, attackEntries, labels, interval, format) {
  const trafficData = [];
  
  labels.forEach(labelInfo => {
    const timeKey = labelInfo.key;
    const nextTimeKey = timeKey + interval;
    
    // 過濾此時間段內的請求
    const requestsInPeriod = logEntries.filter(entry => {
      const entryTime = new Date(entry.timestamp).getTime();
      return entryTime >= timeKey && entryTime < nextTimeKey;
    });
    
    const attacksInPeriod = attackEntries.filter(entry => {
      const entryTime = new Date(entry.timestamp).getTime();
      return entryTime >= timeKey && entryTime < nextTimeKey;
    });
    
    // 計算流量統計
    const totalTraffic = requestsInPeriod.reduce((sum, entry) => {
      return sum + (parseInt(entry.ClientRequestBytes) || 0);
    }, 0);
    
    const maliciousTraffic = attacksInPeriod.reduce((sum, entry) => {
      return sum + (parseInt(entry.ClientRequestBytes) || 0);
    }, 0);
    
    const normalTraffic = totalTraffic - maliciousTraffic;
    
    trafficData.push({
      name: labelInfo.label,
      正常流量: Math.round(normalTraffic / 1024), // 轉換為KB
      惡意流量: Math.round(maliciousTraffic / 1024) // 轉換為KB
    });
  });
  
  return trafficData;
}

// 計算防護分析統計數據
function calculateSecurityStats(logEntries, forcedRange) {
  console.log('📊 開始計算防護分析統計...');
  
  const stats = {
    totalRequests: logEntries.length,
    timeRange: {
      start: null,
      end: null
    },
    blockingRate: 0,
    blockedRequestsCount: 0,
    challengeRequestsCount: 0,
    avgResponseTime: 0,
    totalAttacks: 0,
    protectedSites: 0,
    attackTypeStats: {},
    threatDistribution: {},
    performanceTrend: {
      responseTime: { trend: 'improving', data: [] },
      blockingRate: { trend: 'stable', data: [] }
    },
    trafficStats: {
      totalBytes: 0,
      maliciousBytes: 0,
      data: []
    }
  };

  // 設定時間範圍：優先使用使用者選取（forcedRange），否則用資料實際範圍
  if (forcedRange && forcedRange.start && forcedRange.end) {
    const startIso = new Date(forcedRange.start).toISOString();
    const endIso = new Date(forcedRange.end).toISOString();
    stats.timeRange.start = startIso;
    stats.timeRange.end = endIso;
  } else if (logEntries.length > 0) {
    const timestamps = logEntries.map(entry => new Date(entry.timestamp)).sort((a,b)=>a-b);
    stats.timeRange.start = timestamps[0].toISOString();
    stats.timeRange.end = timestamps[timestamps.length - 1].toISOString();
  }

  // 事件歸因：優先以防護動作（block/challenge）判定，其次以低分門檻（任一項）判定
  const classifiedAttackEntries = [];
  const ruleDescCount = new Map();

  for (const entry of logEntries) {
    const actionsArr = Array.isArray(entry.SecurityActions) ? entry.SecurityActions : [];
    const isActionBlockedOrChallenged = (
      entry.SecurityAction === 'block' ||
      entry.SecurityAction === 'challenge' ||
      actionsArr.includes('block') || actionsArr.includes('challenge')
    );

    const sqliLow = (entry.WAFSQLiAttackScore ?? 100) < 50;
    const xssLow = (entry.WAFXSSAttackScore ?? 100) < 50;
    const rceLow = (entry.WAFRCEAttackScore ?? 100) < 50;
    const botLow = (entry.BotScore ?? 99) < 30;
    const anyLow = sqliLow || xssLow || rceLow || botLow;

    let attackEvent = null;
    if (isActionBlockedOrChallenged) {
      const subtype = (entry.SecurityAction === 'challenge' || actionsArr.includes('challenge')) ? 'challenge' : 'block';
      const reason = entry.SecurityRuleDescription || '';
      if (reason) ruleDescCount.set(reason, (ruleDescCount.get(reason) || 0) + 1);
      attackEvent = { category: 'action_blocked', subtype, reason };
    } else if (anyLow) {
      // 低分類別優先序：RCE > SQLi > XSS > Bot
      let subtype = 'bot';
      if (rceLow) subtype = 'rce';
      else if (sqliLow) subtype = 'sqli';
      else if (xssLow) subtype = 'xss';
      else if (botLow) subtype = 'bot';
      attackEvent = { category: 'low_score', subtype, reason: 'score_threshold' };
    }

    if (attackEvent) {
      classifiedAttackEntries.push({ ...entry, attackEvent });
    }
  }

  const attackEntries = classifiedAttackEntries;
  stats.totalAttacks = attackEntries.length;

  // 計算阻擋率
  const blockedRequests = logEntries.filter(entry => entry.SecurityAction === 'block').length;
  const challengeRequests = logEntries.filter(entry => entry.SecurityAction === 'challenge').length;
  stats.blockedRequestsCount = blockedRequests;
  stats.challengeRequestsCount = challengeRequests;
  const blockedOrChallenged = blockedRequests + challengeRequests;
  // 暫存「全量」視角的阻擋率，稍後會以「已評估」口徑覆寫 stats.blockingRate
  const blockingRateAllTmp = stats.totalRequests > 0 ? ((blockedOrChallenged / stats.totalRequests) * 100).toFixed(1) : 0;
  stats.blockingRate = blockingRateAllTmp;

  // 計算平均響應時間
  const responseTimes = logEntries
    .map(entry => parseInt(entry.EdgeTimeToFirstByteMs) || 0)
    .filter(time => time > 0);
  
  stats.avgResponseTime = responseTimes.length > 0 ? 
    Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;

  // 計算保護的網站數（修正：以 ZoneName 去重更準確）
  const uniqueZones = new Set(logEntries.map(entry => entry.ZoneName).filter(Boolean));
  stats.protectedSites = uniqueZones.size;

  // === 新增：安全動作統計與「已評估口徑」 ===
  const actionCounts = { block: 0, challenge: 0, allow: 0, log: 0, skip: 0, unknown: 0 };
  let evaluatedRequests = 0;
  let lowScoreHits = 0;
  
  for (const entry of logEntries) {
    const actionRaw = (entry.SecurityAction || '').toString().toLowerCase();
    let action = 'unknown';
    if (actionRaw === 'block') action = 'block';
    else if (actionRaw === 'challenge') action = 'challenge';
    else if (actionRaw === 'allow') action = 'allow';
    else if (actionRaw === 'log') action = 'log';
    else if (actionRaw === 'skip') action = 'skip';
    actionCounts[action] = (actionCounts[action] || 0) + 1;
    
    const hasAnyScoreField = [
      entry.WAFAttackScore,
      entry.WAFSQLiAttackScore,
      entry.WAFXSSAttackScore,
      entry.WAFRCEAttackScore,
      entry.BotScore
    ].some(v => v !== undefined && v !== null);
    
    const isEvaluatedAction = (action === 'block' || action === 'challenge' || action === 'allow' || action === 'log');
    if (isEvaluatedAction) {
      evaluatedRequests++;
    } else if (hasAnyScoreField && action !== 'skip') {
      // 沒有明確動作，但有分數；且非 skip → 也納入已評估
      evaluatedRequests++;
    }
    
    const isLow = (entry.WAFSQLiAttackScore ?? 100) < 50
               || (entry.WAFXSSAttackScore ?? 100) < 50
               || (entry.WAFRCEAttackScore ?? 100) < 50
               || (entry.BotScore ?? 99) < 30;
    if (isLow) lowScoreHits++;
  }
  
  const total = stats.totalRequests || 0;
  const denomEval = evaluatedRequests || 0;
  const toPct = (num, den) => den > 0 ? parseFloat(((num / den) * 100).toFixed(1)) : 0;
  
  stats.securityActionStats = {
    counts: { ...actionCounts, evaluatedRequests, lowScoreHits },
    rates: {
      enforcementRateAll: toPct(actionCounts.block + actionCounts.challenge, total),
      enforcementRateEvaluated: toPct(actionCounts.block + actionCounts.challenge, denomEval),
      blockRateEvaluated: toPct(actionCounts.block, denomEval),
      challengeRateEvaluated: toPct(actionCounts.challenge, denomEval),
      allowRateEvaluated: toPct(actionCounts.allow, denomEval),
      logRateEvaluated: toPct(actionCounts.log, denomEval),
      lowScoreRateEvaluated: toPct(lowScoreHits, denomEval),
      skipRateAll: toPct(actionCounts.skip, total),
      evaluatedShare: toPct(denomEval, total)
    }
  };
  // 覆寫主要顯示用阻擋率：採用「已評估口徑」(block+challenge)/evaluatedRequests
  if (stats.securityActionStats?.rates?.enforcementRateEvaluated !== undefined) {
    stats.blockingRateAll = blockingRateAllTmp; // 保留全量視角供前端參考
    stats.blockingRate = stats.securityActionStats.rates.enforcementRateEvaluated;
  }

  // 計算攻擊類型統計（新分類）
  const labelMap = {
    block: '被防護阻擋',
    challenge: '被防護阻擋',
    sqli: 'SQL注入',
    xss: 'XSS攻擊',
    rce: 'RCE遠程指令碼攻擊',
    bot: '機器人攻擊'
  };
  attackEntries.forEach(entry => {
    const subtype = entry.attackEvent?.subtype;
    const label = labelMap[subtype] || '被防護阻擋';
    stats.attackTypeStats[label] = (stats.attackTypeStats[label] || 0) + 1;
  });

  // 計算威脅分佈（新分類）
  if (attackEntries.length > 0) {
    const counts = new Map();
    attackEntries.forEach(e => {
      const subtype = e.attackEvent?.subtype;
      const label = labelMap[subtype] || '被防護阻擋';
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    for (const [label, count] of counts.entries()) {
      stats.threatDistribution[label] = {
        count,
        percentage: parseFloat(((count / attackEntries.length) * 100).toFixed(1))
      };
    }
  }

  // 封鎖原因Top（可供前端選擇性展示）
  if (ruleDescCount.size > 0) {
    stats.topSecurityRuleDescriptions = Array.from(ruleDescCount.entries())
      .map(([rule, count]) => ({ rule, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  // 計算流量統計
  stats.trafficStats.totalBytes = logEntries.reduce((total, entry) => {
    return total + (parseInt(entry.ClientRequestBytes) || 0);
  }, 0);

  stats.trafficStats.maliciousBytes = attackEntries.reduce((total, entry) => {
    return total + (parseInt(entry.ClientRequestBytes) || 0);
  }, 0);

  // === 動態時間軸生成 ===
  console.log('📈 開始生成動態時間軸數據...');
  
  if (logEntries.length > 0) {
    let startTime = new Date(stats.timeRange.start);
    let endTime = new Date(stats.timeRange.end);
    // 再保險：若出現反轉，交換後再生成時間軸
    if (endTime.getTime() < startTime.getTime()) {
      const tmp = startTime; startTime = endTime; endTime = tmp;
    }
    const timeSpanMs = endTime.getTime() - startTime.getTime();
    
    // 根據時間範圍智能選擇分組間隔
    const { interval, format, labels } = getOptimalTimeInterval(startTime, endTime, timeSpanMs);
    console.log(`🕐 使用時間間隔: ${interval}ms, 格式: ${format}`);
    
    // 生成攻擊類型時間序列數據
    stats.attackTypeStats = generateAttackTimeSeriesData(attackEntries, labels, interval, format);
    
    // 生成性能趨勢數據
    stats.performanceTrend = generatePerformanceTrendData(logEntries, labels, interval, format);
    
    // 生成流量時間序列數據
    stats.trafficStats.data = generateTrafficTimeSeriesData(logEntries, attackEntries, labels, interval, format);
    
    console.log(`✅ 生成了 ${labels.length} 個時間點的數據`);
  }

  console.log('✅ 防護分析統計計算完成');
  console.log(`   - 總請求: ${stats.totalRequests}`);
  console.log(`   - 攻擊事件: ${stats.totalAttacks}`);
  console.log(`   - 阻擋率: ${stats.blockingRate}%`);
  console.log(`   - 平均響應時間: ${stats.avgResponseTime}ms`);
  
  return stats;
}

// 建立防護分析AI提示詞
function buildSecurityAnalysisPrompt(securityData) {
  const formatAttackTypes = (attackTypes) => {
    return Object.entries(attackTypes)
      .map(([type, count]) => `  - ${type}: ${count} 次`)
      .join('\n');
  };

  const formatThreatDistribution = (threats) => {
    return Object.entries(threats)
      .map(([type, data]) => `  - ${type}: ${data.count} 次 (${data.percentage}%)`)
      .join('\n');
  };

  return `
作為一個專業的安全專家，請分析以下防護效能數據並提供專業建議（自然語言、無 JSON、無代碼、無欄位名）。

=== 防護統計總覽 ===
時間範圍: ${securityData.timeRange.start} 到 ${securityData.timeRange.end}
- 🛡️ 攻擊阻擋率: ${securityData.blockingRate}% 
- ⚡ 平均響應時間: ${securityData.avgResponseTime}ms
- 🚨 攻擊事件總數: ${securityData.totalAttacks.toLocaleString()} 次
- 🌐 受保護網站數: ${securityData.protectedSites} 個
- 📊 總請求數: ${securityData.totalRequests.toLocaleString()} 次

=== 攻擊類型分析 ===
${formatAttackTypes(securityData.attackTypeStats)}

=== 威脅分佈 (OWASP 分類) ===
${formatThreatDistribution(securityData.threatDistribution)}

=== 流量統計 ===
- 總流量: ${(securityData.trafficStats.totalBytes / (1024 * 1024)).toFixed(2)} MB
- 惡意流量: ${(securityData.trafficStats.maliciousBytes / (1024 * 1024)).toFixed(2)} MB
- 惡意流量佔比: ${((securityData.trafficStats.maliciousBytes / securityData.trafficStats.totalBytes) * 100).toFixed(2)}%

請使用以下標記段落輸出（繁體中文，自然語言，無 JSON、無代碼、無欄位名）：
【摘要】
（6 行內，總結整體防護效能、主要威脅、性能平衡與趨勢）

【圖表分析】
- 攻擊類型：...
- 威脅分佈：...
- 性能趨勢：...
- 流量統計：...

【建議】
- （最多 3 條，按優先級）

【下一步】
- 立即：...
- 短期：...
- 中期：...
- 長期：...
`;
}

// 自然語言分段解析器：從標記文本中抽取摘要/圖表分析/建議/下一步
function parseAnalysisFromMarkedText(naturalText) {
  if (typeof naturalText !== 'string' || naturalText.trim().length === 0) {
    return null;
  }

  const text = naturalText.replace(/\r\n/g, '\n');

  // 支援多種標題變體
  const patterns = {
    summary: /(【\s*(摘要|總結)\s*】|^\s*(摘要|總結)\s*[:：])/m,
    charts: /(【\s*圖表分析\s*】|^\s*圖表分析\s*[:：])/m,
    recommends: /(【\s*建議\s*】|^\s*建議\s*[:：])/m,
    next: /(【\s*下一步\s*】|^\s*下一步\s*[:：])/m
  };

  // 找到各段落起始位置
  const findIndex = (regex) => {
    const m = text.match(regex);
    return m ? text.indexOf(m[0]) : -1;
  };
  const idx = {
    summary: findIndex(patterns.summary),
    charts: findIndex(patterns.charts),
    recommends: findIndex(patterns.recommends),
    next: findIndex(patterns.next)
  };

  // 若完全找不到任何標記，回退 null 讓呼叫端採用其他策略
  const anyFound = Object.values(idx).some((v) => v >= 0);
  if (!anyFound) return null;

  // 按出現順序排序，切片
  const keysInOrder = Object.entries(idx)
    .filter(([, v]) => v >= 0)
    .sort((a, b) => a[1] - b[1])
    .map(([k]) => k);

  const slices = {};
  for (let i = 0; i < keysInOrder.length; i++) {
    const key = keysInOrder[i];
    const start = idx[key];
    const end = i + 1 < keysInOrder.length ? idx[keysInOrder[i + 1]] : text.length;
    // 去掉標題本身
    const sectionText = text
      .slice(start, end)
      .replace(patterns[key], '')
      .trim();
    slices[key] = sectionText;
  }

  // 解析圖表分析中的關鍵子段
  const chartAnalysis = { attackTypes: '', threatDistribution: '', performanceTrend: '', trafficStats: '' };
  if (slices.charts) {
    const lines = slices.charts.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (/攻擊類型/.test(line) && !chartAnalysis.attackTypes) chartAnalysis.attackTypes = line.replace(/^[-•・\s]*/, '');
      else if (/(威脅|威胁|風險)分佈/.test(line) && !chartAnalysis.threatDistribution) chartAnalysis.threatDistribution = line.replace(/^[-•・\s]*/, '');
      else if (/性能|效能|趨勢/.test(line) && !chartAnalysis.performanceTrend) chartAnalysis.performanceTrend = line.replace(/^[-•・\s]*/, '');
      else if (/流量/.test(line) && !chartAnalysis.trafficStats) chartAnalysis.trafficStats = line.replace(/^[-•・\s]*/, '');
    }
    // 若全空，則將整段放入 attackTypes 作為兜底
    if (!chartAnalysis.attackTypes && !chartAnalysis.threatDistribution && !chartAnalysis.performanceTrend && !chartAnalysis.trafficStats) {
      chartAnalysis.attackTypes = slices.charts;
    }
  }

  // 解析建議為陣列（最多 3 條）
  const cloudflareRecommendations = [];
  if (slices.recommends) {
    const lines = slices.recommends.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (/^[-•・\d+\.\)]\s*/.test(line) || line.length > 0) {
        cloudflareRecommendations.push({ category: '建議', priority: '中', action: line.replace(/^[-•・\d+\.\)]\s*/, ''), steps: [] });
      }
      if (cloudflareRecommendations.length >= 3) break;
    }
  }

  // 下一步分流
  const nextSteps = { immediate: [], shortTerm: [], mediumTerm: [], longTerm: [] };
  if (slices.next) {
    const section = slices.next;
    const buckets = [
      { key: 'immediate', rx: /(立即|馬上|立刻)[:：]?/ },
      { key: 'shortTerm', rx: /(短期|1-7天|一週內)[:：]?/ },
      { key: 'mediumTerm', rx: /(中期|1-4週|一個月內)[:：]?/ },
      { key: 'longTerm', rx: /(長期|1-3個月|三個月內)[:：]?/ }
    ];
    let matchedAny = false;
    for (const bucket of buckets) {
      const m = section.match(new RegExp(`${bucket.rx.source}[\\s\S]*?(?=(立即|馬上|立刻|短期|1-7天|一週內|中期|1-4週|一個月內|長期|1-3個月|三個月內)[:：]?|$)`, 'm'));
      if (m) {
        matchedAny = true;
        const content = m[0].replace(bucket.rx, '').trim();
        const items = content.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 5);
        nextSteps[bucket.key] = items;
      }
    }
    if (!matchedAny) {
      // 無子標題時，整段當短期
      nextSteps.shortTerm = section.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 5);
    }
  }

  const summary = (slices.summary || '').split('\n').slice(0, 6).join('\n');

  return {
    summary: summary || '分析完成。',
    chartAnalysis,
    cloudflareRecommendations,
    nextSteps
  };
}

// 防護分析統計API端點
app.post('/api/security-analysis-stats', validateTimeRange, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: '輸入驗證失敗',
        details: errors.array()
      });
    }

    const { timeRange, startTime, endTime, dataSource, clientOffsetMinutes, clientTz } = req.body;
    
    if (dataSource !== 'elk') {
      return res.status(400).json({ error: '目前僅支援 ELK 資料來源' });
    }

    console.log('📊 開始載入防護分析統計...');
    if (startTime && endTime) {
      const reqStartUtc = new Date(startTime).toISOString();
      const reqEndUtc = new Date(endTime).toISOString();
      const reqStartLocal = formatClientLocal(reqStartUtc, clientOffsetMinutes);
      const reqEndLocal = formatClientLocal(reqEndUtc, clientOffsetMinutes);
      console.log(`🕐 Requested (UTC): ${reqStartUtc} → ${reqEndUtc}`);
      console.log(`🕐 Requested (${clientTz || 'client local'}): ${reqStartLocal} → ${reqEndLocal}`);
    }
    
    const securityStats = await processSecurityAnalysisData({
      timeRange,
      startTime,
      endTime
    });

    // 附帶資料時間範圍（雙格式）供前端參考
    if (securityStats?.timeRange?.start && securityStats?.timeRange?.end) {
      const dataStartUtc = new Date(securityStats.timeRange.start).toISOString();
      const dataEndUtc = new Date(securityStats.timeRange.end).toISOString();
      const dataStartLocal = formatClientLocal(dataStartUtc, clientOffsetMinutes);
      const dataEndLocal = formatClientLocal(dataEndUtc, clientOffsetMinutes);
      console.log(`📊 Data (UTC): ${dataStartUtc} → ${dataEndUtc}`);
      console.log(`📊 Data (${clientTz || 'client local'}): ${dataStartLocal} → ${dataEndLocal}`);
    }
    res.json(securityStats);
    
  } catch (error) {
    console.error('❌ 防護分析統計失敗:', error);
    res.status(500).json({ 
      error: error.message,
      details: '防護分析統計載入失敗'
    });
  }
});

// 防護分析AI分析API端點
app.post('/api/security-analysis-ai', async (req, res) => {
  try {
    const { provider, apiKey, model, apiUrl, timeRange, startTime, endTime, clientOffsetMinutes, clientTz } = req.body;
    
    console.log('🤖 開始防護分析AI分析...');
    if (startTime && endTime) {
      const reqStartUtc = new Date(startTime).toISOString();
      const reqEndUtc = new Date(endTime).toISOString();
      const reqStartLocal = formatClientLocal(reqStartUtc, clientOffsetMinutes);
      const reqEndLocal = formatClientLocal(reqEndUtc, clientOffsetMinutes);
      console.log(`🕐 Requested (UTC): ${reqStartUtc} → ${reqEndUtc}`);
      console.log(`🕐 Requested (${clientTz || 'client local'}): ${reqStartLocal} → ${reqEndLocal}`);
    }
    
    // 獲取防護分析數據
    const securityData = await processSecurityAnalysisData({
      timeRange,
      startTime,
      endTime
    });

    // 無攻擊早返回（作法A）：block/challenge 皆為 0 時，直接回傳規則化結果，不呼叫 AI
    const noBlock = (securityData.blockedRequestsCount || 0) === 0;
    const noChallenge = (securityData.challengeRequestsCount || 0) === 0;
    const noAttacks = (securityData.totalAttacks || 0) === 0;
    if (noAttacks && noBlock && noChallenge) {
      const summary = '目前選定時間窗內未偵測到任何被阻擋或挑戰的攻擊事件（block/challenge 皆為 0）。請持續關注網站健康度與安全指標。';
      return res.json({
        summary,
        chartAnalysis: {
          attackTypes: '未偵測到攻擊樣本',
          threatDistribution: '未偵測到攻擊樣本',
          performanceTrend: '無需額外處置'
        },
        cloudflareRecommendations: [],
        nextSteps: {
          immediate: [
            '持續監控 WAF/Firewall 事件與整體流量趨勢',
            '設定告警門檻，當阻擋率或 WAF 分數異常時通知'
          ],
          shortTerm: [
            '定期審視自訂規則與受保護區域設定',
            '檢查 Bot 管理策略與異常行為偵測報表'
          ]
        },
        metadata: {
          isAIGenerated: false,
          analysisType: 'security_analysis',
          provider: provider,
          model: model || null,
          timeRange: securityData.timeRange
        }
      });
    }

    // 建立AI提示詞（加入已評估口徑的提示與數字，並加上自然語言輸出約束）
    const sa = securityData.securityActionStats || {};
    const counts = sa.counts || {};
    const rates = sa.rates || {};
    const evaluatedSummary = [
      `已評估請求佔比約 ${rates.evaluatedShare ?? 0}%`,
      `防護執行率（已評估）約 ${rates.enforcementRateEvaluated ?? 0}%（阻擋 ${rates.blockRateEvaluated ?? 0}%、挑戰 ${rates.challengeRateEvaluated ?? 0}%）`,
      `允許 ${rates.allowRateEvaluated ?? 0}%、記錄 ${rates.logRateEvaluated ?? 0}%、低分命中率 ${rates.lowScoreRateEvaluated ?? 0}%、跳過率（全量） ${rates.skipRateAll ?? 0}%`
    ].join('\n');
    
    const systemGuard = [
      '僅使用自然語言輸出，不得輸出 JSON、代碼、鍵名或查詢語法。',
      '請務必使用以下標記段落作答：【摘要】【圖表分析】【建議】【下一步】（可省略不存在的段落）。',
      '避免出現技術欄位名（如 SecurityAction、WAF*、BotScore、@timestamp 等）。',
      '以「已評估口徑」為主要依據，僅在數值顯著偏高時給出升級處置建議；否則以監控與告警建議為主。',
      '輸出最長 6 行重點 + 最多 3 項建議，不要表格或代碼區塊。'
    ].join('\n');
    
    const prompt = [
      buildSecurityAnalysisPrompt(securityData),
      '',
      '口徑重點（僅供參考，請用自然語言轉述）：',
      evaluatedSummary,
      '',
      '輸出規則：',
      systemGuard
    ].join('\n');
    
    // 執行AI分析
    let analysis;
    const aiProviderManager = new AIProviderManager();
    
    if (provider === 'gemini') {
      if (!apiKey) {
        throw new Error('請提供 Gemini API Key');
      }
      
      const aiClient = aiProviderManager.getProvider('gemini', {
        apiKey: apiKey,
        model: model || 'gemini-2.0-flash-exp'
      });
      
      const result = await aiClient.generateContent(prompt);
      // ✅ 修正：aiProviderManager返回的是{text, model, responseTime}格式
      if (!result || !result.text) {
        throw new Error('AI 回應格式異常：缺少 text 屬性');
      }
      const text = result.text;
      
      // 優先使用自然語言分段解析（方案C）
      analysis = parseAnalysisFromMarkedText(text);
      
      // 若分段解析失敗，嘗試 JSON（兼容歷史提示）
      if (!analysis) {
        try {
          const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            analysis = JSON.parse(jsonMatch[1]);
            console.log('✅ 從markdown代碼塊成功解析JSON');
          } else {
            analysis = JSON.parse(text);
            console.log('✅ 直接解析JSON成功');
          }
        } catch (e) {
          // 最終回退：以全文為摘要
          console.info('ℹ️ 使用自然語言摘要回退');
          analysis = {
            summary: text.trim() || '分析完成。',
            chartAnalysis: {},
            cloudflareRecommendations: [],
            nextSteps: {}
          };
        }
      }
      
    } else if (provider === 'ollama') {
      if (!model) {
        throw new Error('請提供 Ollama 模型名稱');
      }
      
      const aiClient = aiProviderManager.getProvider('ollama', {
        apiUrl: apiUrl || 'http://localhost:11434',
        model: model
      });
      
      // 正確傳入模型與提示詞，並取得標準化結果格式
      const result = await aiClient.generateContent(model, prompt);
      if (!result || !result.text) {
        throw new Error('AI 回應格式異常：缺少 text 屬性');
      }
      const responseText = result.text;
      
      // 優先使用自然語言分段解析（方案C）
      analysis = parseAnalysisFromMarkedText(responseText);
      
      // 若分段解析失敗，嘗試 JSON（兼容歷史提示）
      if (!analysis) {
        try {
          const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            analysis = JSON.parse(jsonMatch[1]);
            console.log('✅ Ollama從markdown代碼塊成功解析JSON');
          } else {
            analysis = JSON.parse(responseText);
            console.log('✅ Ollama直接解析JSON成功');
          }
        } catch (e) {
          // 最終回退：以全文為摘要
          console.info('ℹ️ 使用自然語言摘要回退 (Ollama)');
          analysis = {
            summary: responseText.trim() || '分析完成。',
            chartAnalysis: {},
            cloudflareRecommendations: [],
            nextSteps: {}
          };
        }
      }
    } else {
      throw new Error(`不支援的AI提供商: ${provider}`);
    }

    // 添加元數據
    analysis.metadata = {
      analysisId: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      provider: provider,
      model: model,
      isAIGenerated: true,
      analysisType: 'security_analysis'
    };

    // 輸出資料實際範圍（UTC 與客戶端時區）
    if (securityData?.timeRange?.start && securityData?.timeRange?.end) {
      const dataStartUtc = new Date(securityData.timeRange.start).toISOString();
      const dataEndUtc = new Date(securityData.timeRange.end).toISOString();
      const dataStartLocal = formatClientLocal(dataStartUtc, clientOffsetMinutes);
      const dataEndLocal = formatClientLocal(dataEndUtc, clientOffsetMinutes);
      console.log(`📊 Data (UTC): ${dataStartUtc} → ${dataEndUtc}`);
      console.log(`📊 Data (${clientTz || 'client local'}): ${dataStartLocal} → ${dataEndLocal}`);
    }
    console.log('✅ 防護分析AI分析完成');
    
    res.json(analysis);
    
  } catch (error) {
    console.error('❌ 防護分析AI分析失敗:', error);
    res.status(500).json({ 
      error: error.message,
      details: '防護分析AI分析失敗'
    });
  }
});

