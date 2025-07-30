import React, { useRef, useEffect, useState } from "react";
import { Network } from "vis-network";
import { 
  Button, 
  CircularProgress, 
  Alert, 
  AlertTitle, 
  Paper, 
  Typography, 
  Box 
} from '@mui/material';
import { Psychology } from '@mui/icons-material';

// 建立攻擊關聯圖的函數
function buildAttackRelationshipGraph(attackGraph, attackData) {
  const nodes = [];
  const edges = [];
  let nodeId = 1;

  // 顏色配置
  const colors = {
    highRisk: "#ff4757",    // 高風險 IP - 紅色
    mediumRisk: "#ff6b47",  // 中風險 IP - 橙色  
    lowRisk: "#ffa502",     // 低風險 IP - 黃色
    infrastructure: "#3742fa", // 基礎設施 - 藍色
    centralHub: "#70a1ff",     // 中心樞紐 - 淺藍色
    attackPath: "#5f27cd",     // 攻擊路徑 - 紫色
    hostFake: "#ff3838"        // Host偽造 - 深紅色
  };

  // 🎯 圓形分層佈局配置
  const LAYOUT_CONFIG = {
    CENTER: { x: 0, y: 0 },           // 中心節點
    IP_RADIUS: 250,                   // IP攻擊者圓形半徑  
    INFRA_RADIUS: 400,               // 基礎設施圓形半徑
    PATTERN_POSITION: { x: 300, y: -300 }, // 攻擊模式分析位置
    HOST_FAKE_POSITION: { x: -300, y: -300 } // Host偽造位置
  };

  // 工具函數：計算圓形分佈座標
  const getCircularPosition = (index, total, radius, centerX = 0, centerY = 0) => {
    const angle = (2 * Math.PI * index) / total;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  };

  // 1. 建立中心資訊節點（顯示關聯強度）- 固定在中心
  const centerNodeId = nodeId++;
  const correlationStrength = (attackGraph.correlationMetrics.strength * 100).toFixed(1);
  const optimizedInfo = attackGraph.correlationMetrics.optimized ? 
    `\n[Top ${attackGraph.correlationMetrics.displayedIPs}/${attackGraph.correlationMetrics.totalIPs} IP]` : '';
  
  nodes.push({
    id: centerNodeId,
    label: `攻擊關聯分析\n強度: ${correlationStrength}%\n${attackGraph.correlationMetrics.coordinatedAttack ? '協調攻擊' : '散漫攻擊'}\n多目標者: ${attackGraph.correlationMetrics.multiTargetAttackers}個${optimizedInfo}`,
    color: attackGraph.correlationMetrics.coordinatedAttack ? "#ff4757" : "#ffa502",
    size: 45,
    font: { size: 14, color: "#fff", face: "Arial Bold" },
    shape: "diamond",
    // 固定在畫面中心
    fixed: { x: true, y: true },
    x: LAYOUT_CONFIG.CENTER.x,
    y: LAYOUT_CONFIG.CENTER.y,
    physics: false
  });

  // 2. 建立 IP 攻擊者集群節點 - 內圈圓形分佈
  const ipNodeIds = new Map();
  const ipClusters = attackGraph.ipClusters;
  
  ipClusters.forEach((cluster, index) => {
    const ipNodeId = nodeId++;
    ipNodeIds.set(cluster.ip, ipNodeId);
    
    // 計算圓形分佈位置
    const position = getCircularPosition(index, ipClusters.length, LAYOUT_CONFIG.IP_RADIUS);
    
    const riskColor = colors[cluster.riskLevel.toLowerCase() + 'Risk'] || colors.lowRisk;
    const techniques = cluster.techniques.length > 0 ? `\n技術: ${cluster.techniques.slice(0, 2).join(', ')}` : '';
    const isMultiTarget = cluster.isMultiTarget ? ' [多目標]' : '';
    
    nodes.push({
      id: ipNodeId,
      label: `${cluster.ip}${isMultiTarget}\n[${cluster.riskLevel}風險]\n目標: ${cluster.targets.length}個${techniques}`,
      color: riskColor,
      size: Math.max(25, 20 + cluster.totalSeverity * 0.08),
      font: { size: 12, color: "#fff", face: "Arial" },
      shape: "box",
      // 固定在計算出的圓形位置
      fixed: { x: true, y: true },
      x: position.x,
      y: position.y,
      physics: false
    });

    // 連接到中心節點
    edges.push({
      from: ipNodeId,
      to: centerNodeId,
      label: `威脅${cluster.totalSeverity}`,
      color: riskColor,
      width: Math.max(2, Math.min(6, cluster.targets.length)),
      dashes: cluster.isMultiTarget ? false : true,
      arrows: { to: { enabled: true, scaleFactor: 1.0 } },
      smooth: { type: "continuous" }
    });
  });

  // 3. 建立基礎設施目標節點 - 外圈圓形分佈
  const domainNodeIds = new Map();
  const allSubdomains = [];
  
  // 收集所有子域名
  attackGraph.infrastructureMap.forEach(infra => {
    infra.subdomains.forEach(subdomain => {
      allSubdomains.push({
        subdomain: subdomain,
        isTargeted: infra.isTargetedInfrastructure,
        attackerCount: infra.attackers.length,
        attackers: infra.attackers
      });
    });
  });
  
  allSubdomains.forEach((domainInfo, index) => {
    const domainNodeId = nodeId++;
    domainNodeIds.set(domainInfo.subdomain, domainNodeId);
    
    // 計算外圈圓形分佈位置
    const position = getCircularPosition(index, allSubdomains.length, LAYOUT_CONFIG.INFRA_RADIUS);
    
    nodes.push({
      id: domainNodeId,
      label: `${domainInfo.subdomain}\n攻擊者: ${domainInfo.attackerCount}個${domainInfo.isTargeted ? '\n[重點目標]' : ''}`,
      color: domainInfo.isTargeted ? colors.infrastructure : colors.centralHub,
      size: Math.max(20, 15 + domainInfo.attackerCount * 2.5),
      font: { size: 11, color: "#fff", face: "Arial" },
      shape: "ellipse",
      // 固定在計算出的外圈位置
      fixed: { x: true, y: true },
      x: position.x,
      y: position.y,
      physics: false
    });

    // 連接攻擊者到目標域名
    domainInfo.attackers.forEach(attackerIP => {
      const attackerNodeId = ipNodeIds.get(attackerIP);
      if (attackerNodeId) {
        // 找到對應的攻擊資訊
        const cluster = attackGraph.ipClusters.find(c => c.ip === attackerIP);
        const targetInfo = cluster?.targets?.find(t => t.domain === domainInfo.subdomain);
        
        edges.push({
          from: attackerNodeId,
          to: domainNodeId,
          label: targetInfo?.targetURL?.split('/').pop() || 'attack',
          color: targetInfo?.claimedDomain ? colors.hostFake : "#49cfff",
          width: targetInfo?.claimedDomain ? 3 : 1.5,
          dashes: targetInfo?.claimedDomain ? [5, 5] : false,
          arrows: { to: { enabled: true, scaleFactor: 1.0 } },
          smooth: { type: "continuous" },
          font: { size: 10, color: "#fff" }
        });
      }
    });
  });

  // 4. 建立攻擊模式分析節點 - 固定在右上角
  if (attackGraph.attackPatternAnalysis && attackGraph.attackPatternAnalysis.length > 0) {
    const patternNodeId = nodeId++;
    const topPatterns = attackGraph.attackPatternAnalysis
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    nodes.push({
      id: patternNodeId,
      label: `攻擊模式分析\n${topPatterns.map(p => `${p.type}: ${p.count}次`).join('\n')}`,
      color: colors.attackPath,
      size: 35,
      font: { size: 11, color: "#fff", face: "Arial" },
      shape: "triangle",
      // 固定在右上角位置
      fixed: { x: true, y: true },
      x: LAYOUT_CONFIG.PATTERN_POSITION.x,
      y: LAYOUT_CONFIG.PATTERN_POSITION.y,
      physics: false
    });

    // 連接到中心節點
    edges.push({
      from: centerNodeId,
      to: patternNodeId,
      label: "模式分析",
      color: colors.attackPath,
      width: 2,
      dashes: [8, 4],
      arrows: { to: { enabled: true, scaleFactor: 1.0 } },
      smooth: { type: "continuous" },
      font: { size: 10, color: "#fff" }
    });
  }

  // 5. 特殊標記：Host header 偽造攻擊 - 固定在左上角
  const fakeHostAttacks = attackGraph.ipClusters.filter(cluster => 
    cluster.techniques.includes('Host偽造')
  );
  
  if (fakeHostAttacks.length > 0) {
    const fakeHostNodeId = nodeId++;
    nodes.push({
      id: fakeHostNodeId,
      label: `Host Header 偽造\n檢測到 ${fakeHostAttacks.length} 個攻擊者\n使用偽造技術`,
      color: colors.hostFake,
      size: 30,
      font: { size: 11, color: "#fff", face: "Arial" },
      shape: "star",
      // 固定在左上角位置
      fixed: { x: true, y: true },
      x: LAYOUT_CONFIG.HOST_FAKE_POSITION.x,
      y: LAYOUT_CONFIG.HOST_FAKE_POSITION.y,
      physics: false
    });

    // 連接偽造攻擊者
    fakeHostAttacks.forEach(cluster => {
      const attackerNodeId = ipNodeIds.get(cluster.ip);
      if (attackerNodeId) {
        edges.push({
          from: attackerNodeId,
          to: fakeHostNodeId,
          label: "偽造",
          color: colors.hostFake,
          width: 2.5,
          dashes: [4, 4],
          arrows: { to: { enabled: true, scaleFactor: 1.0 } },
          smooth: { type: "continuous" },
          font: { size: 10, color: "#fff" }
        });
      }
    });
  }

  return { nodes, edges };
}

export default function DDoSGraph() {
  const ref = useRef(null);
  const [graphData, setGraphData] = useState(null);
  const [attackData, setAttackData] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analysisState, setAnalysisState] = useState({
    hasStarted: false,
    isLoading: false,
    isComplete: false,
    error: null
  });

  // AI 分析處理函數
  const handleAIAnalysis = async () => {
    setAnalysisState({
      hasStarted: true,
      isLoading: true,
      isComplete: false,
      error: null
    });

    try {
      // 從localStorage獲取設定
      const apiKey = localStorage.getItem('gemini_api_key');
      const model = localStorage.getItem('gemini_model');
      const dataSource = localStorage.getItem('data_source') || 'file';
      const timeRange = localStorage.getItem('elk_time_range') || '1h';

      // 檢查必要設定
      if (!apiKey) {
        throw new Error('請先在「AI分析設定」頁面設定 Gemini API Key');
      }

      // 根據資料來源選擇對應的 API 端點
      const endpoint = dataSource === 'elk' ? 
        "http://localhost:8080/api/analyze-elk-log" : 
        "http://localhost:8080/api/analyze-log";

      // 呼叫日誌分析端點
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          model,
          dataSource,
          timeRange
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = '分析失敗，請檢查設定';
        
        // 根據 HTTP 狀態碼提供更友善的錯誤提示
        switch (response.status) {
          case 400:
            errorMessage = 'Gemini API Key 無效或已過期';
            break;
          case 429:
            errorMessage = 'API 使用量超出限制，請稍後再試';
            break;
          case 500:
            errorMessage = '服務器內部錯誤，請檢查日誌檔案';
            break;
          default:
            errorMessage = `HTTP ${response.status}: ${errorText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // 從分析結果中提取攻擊資料
      if (result.attackData) {
        const a = result.attackData;
        setAttackData(a);
        
        // 檢查是否有攻擊關聯圖資料
        if (a.attackGraph && a.attackGraph.ipClusters && a.attackGraph.ipClusters.length > 0) {
          // 新版：建立攻擊關聯圖
          const { nodes, edges } = buildAttackRelationshipGraph(a.attackGraph, a);
          setGraphData({ nodes, edges });
        } else {
          // 舊版：建立單一攻擊事件圖形（向後相容）
          const nodes = [
            { id: 1, label: `Domain:\n${a.attackDomain}`, color: "#49cfff" },
            { id: 2, label: `Target IP:\n${a.targetIP}`, color: "#36a2c0" },
            { id: 3, label: `Attack URL:\n${a.targetURL.split('/').pop()}`, color: "#5bf1a1" }
          ];
          const edges = [
            { from: 1, to: 2, label: "resolves to" },
            { from: 2, to: 3, label: "target", dashes: true }
          ];
          
          a.sourceList.forEach((src, i) => {
            const nid = 4 + i;
            nodes.push({
              id: nid,
              label: `${src.ip}\n[${src.country}]\n${src.asn}`,
              color: ["#ff5858", "#ffb948", "#b18bfc"][i % 3]
            });
            edges.push({ from: nid, to: 2, label: "attack" });
          });
          
          setGraphData({ nodes, edges });
        }
      } else {
        // 沒有攻擊資料時，顯示健康狀態的圖形
        const nodes = [
          { id: 1, label: "網站流量\n健康狀態", color: "#5bf1a1" },
          { id: 2, label: "無攻擊偵測", color: "#36a2c0" }
        ];
        const edges = [
          { from: 1, to: 2, label: "安全", color: "#5bf1a1" }
        ];
        setGraphData({ nodes, edges });
      }
      
      // 設定AI分析結果
      if (result.summary && result.recommendations) {
        setAiAnalysis({
          summary: result.summary,
          recommendations: result.recommendations,
          metadata: result.metadata
        });
      }

      setAnalysisState(prev => ({
        ...prev,
        isLoading: false,
        isComplete: true
      }));

    } catch (error) {
      console.error('AI 分析失敗:', error);
      setAnalysisState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
    }
  };

  // 圖表渲染 useEffect

  useEffect(() => {
    if (ref.current && graphData) {
      ref.current.innerHTML = "";
      new Network(
        ref.current,
        { nodes: graphData.nodes, edges: graphData.edges },
        {
          nodes: {
            font: { color: "#fff", size: 12, face: "Arial" },
            borderWidth: 2,
            shadow: {
              enabled: true,
              color: 'rgba(0,0,0,0.5)',
              size: 10,
              x: 2,
              y: 2
            },
            shape: "box",
            margin: 12,
            scaling: {
              min: 15,
              max: 50
            }
          },
          edges: {
            color: "#49cfff",
            arrows: { 
              to: { 
                enabled: true, 
                scaleFactor: 0.8,
                type: 'arrow'
              } 
            },
            font: { 
              color: "#fff", 
              align: "middle", 
              size: 10,
              strokeWidth: 2,
              strokeColor: "#1a1b2d"
            },
            width: 2,
            smooth: {
              enabled: true,
              type: "continuous",
              roundness: 0.3
            },
            scaling: {
              min: 1,
              max: 4
            }
          },
          physics: {
            enabled: false  // 完全禁用物理引擎，保持圓形分層佈局
          },
          layout: {
            randomSeed: 2,  // 固定隨機種子，確保佈局一致
            improvedLayout: false,
            hierarchical: false
          },
          interaction: {
            hover: true,
            tooltipDelay: 300,
            zoomView: true,
            dragView: true,
            dragNodes: false,  // 禁止拖拽節點
            selectConnectedEdges: false
          },
          configure: {
            enabled: false
          }
        }
      );
    }
  }, [graphData]);

  return (
    <div
      style={{
        background: "#22263a",
        color: "#fff",
        padding: 20,
        borderRadius: 10,
        width: 900,
        margin: "2rem auto"
      }}
    >
      <h3 style={{ color: "#49cfff" }}>
        {attackData?.attackGraph ? 
          `攻擊關聯調查圖 - ${attackData.attackGraph.correlationMetrics.optimized ? 
            `Top ${attackData.attackGraph.correlationMetrics.displayedIPs} 關鍵攻擊者` : 
            '多事件關聯分析'}` : 
          'DDoS 攻擊情境 - 關聯調查圖'
        }
      </h3>
      
      {/* AI 分析按鈕 */}
      <Box sx={{ mb: 2, textAlign: 'center' }}>
        <Button
          variant="contained"
          color="success"
          size="large"
          onClick={handleAIAnalysis}
          disabled={analysisState.isLoading}
          startIcon={analysisState.isLoading ? <CircularProgress size={20} color="inherit" /> : <Psychology />}
          sx={{
            background: 'linear-gradient(45deg, #2E7D32, #4CAF50)',
            boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
            fontSize: '16px',
            padding: '12px 24px',
            '&:hover': {
              background: 'linear-gradient(45deg, #1B5E20, #388E3C)',
            },
            '&:disabled': {
              background: 'linear-gradient(45deg, #424242, #616161)',
            }
          }}
        >
          {analysisState.isLoading ? 'AI 分析中...' : '🤖 AI一鍵安全分析'}
        </Button>
      </Box>

      {/* 分析狀態提示 */}
      {analysisState.isLoading && (
        <Alert severity="info" sx={{ mb: 2, background: '#1a4067', color: '#fff' }}>
          <AlertTitle>AI 正在分析中</AlertTitle>
          正在處理日誌資料並生成攻擊關聯圖，請稍候...
        </Alert>
      )}

      {analysisState.error && (
        <Alert severity="error" sx={{ mb: 2, background: '#5c2e2e', color: '#fff' }}>
          <AlertTitle>分析失敗</AlertTitle>
          {analysisState.error}
        </Alert>
      )}

      {/* 未開始分析時的提示界面 */}
      {!analysisState.hasStarted && (
        <Paper elevation={3} sx={{ 
          p: 4, 
          textAlign: 'center', 
          mb: 2, 
          background: '#181a28',
          color: '#fff',
          border: '1px solid #49cfff'
        }}>
          <Psychology sx={{ fontSize: 48, color: '#49cfff', mb: 2 }} />
          <Typography variant="h6" gutterBottom sx={{ color: '#49cfff' }}>
            準備開始 AI 安全分析
          </Typography>
          <Typography variant="body1" sx={{ color: '#b5b8c6' }}>
            點擊上方按鈕，讓 AI 為您分析 DDoS 攻擊模式並生成關聯圖
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', color: '#8b8ca3', mt: 1, display: 'block' }}>
            💡 請確保已在「AI分析設定」頁面配置 Gemini API Key
          </Typography>
        </Paper>
      )}
      {/* 關聯圖容器 - 只在有數據時顯示 */}
      {analysisState.isComplete && graphData && (
        <div
          ref={ref}
          style={{
            height: attackData?.attackGraph ? 600 : 420,
            width: "100%",
            background: "#1a1b2d",
            borderRadius: 8
          }}
        />
      )}
        
        {/* 圖例說明 - 只在有關聯圖時顯示 */}
        {analysisState.isComplete && attackData?.attackGraph && (
          <div style={{
            marginTop: '10px',
            padding: '10px',
            background: '#181a28',
            borderRadius: 6,
            fontSize: '12px',
            color: '#b5b8c6'
          }}>
            <strong style={{ color: '#49cfff' }}>🗺️ 圖例說明：</strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px', marginTop: '6px' }}>
              <div><span style={{ color: '#ff4757' }}>●</span> 高風險攻擊者 (內圈)</div>
              <div><span style={{ color: '#ff6b47' }}>●</span> 中風險攻擊者 (內圈)</div>
              <div><span style={{ color: '#ffa502' }}>●</span> 低風險攻擊者 (內圈)</div>
              <div><span style={{ color: '#3742fa' }}>●</span> 重點目標基礎設施 (外圈)</div>
              <div><span style={{ color: '#70a1ff' }}>●</span> 一般目標基礎設施 (外圈)</div>
              <div><span style={{ color: '#5f27cd' }}>▲</span> 攻擊模式分析 (右上)</div>
              <div><span style={{ color: '#ff3838' }}>★</span> Host Header 偽造 (左上)</div>
              <div><span style={{ color: '#ff4757' }}>♦</span> 關聯強度中心</div>
            </div>
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#8b8ca3' }}>
              • 圓形分層佈局：內圈IP攻擊者 → 中心關聯分析 → 外圈目標基礎設施 • 節點大小代表威脅程度 • 線條粗細代表攻擊強度
            </div>
          </div>
        )}
      <div
        style={{
          marginTop: 16,
          background: "#181a28",
          borderRadius: 8,
          padding: 12
        }}
      >
        {analysisState.isComplete && aiAnalysis ? (
          <>
            <strong>🤖 AI 事件概述：</strong>
            <div style={{ 
              margin: '8px 0', 
              padding: '8px', 
              background: '#22263a', 
              borderRadius: 4,
              lineHeight: 1.5
            }}>
              {typeof aiAnalysis.summary === 'string' ? aiAnalysis.summary : (
                typeof aiAnalysis.summary === 'object' && aiAnalysis.summary !== null ? (
                  <div>
                    {Object.entries(aiAnalysis.summary).map(([key, value]) => (
                      <div key={key} style={{ marginBottom: '8px' }}>
                        <strong style={{ color: '#49cfff' }}>
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                        </strong>
                        <div style={{ marginLeft: '10px', marginTop: '4px' }}>
                          {typeof value === 'string' ? value : JSON.stringify(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  String(aiAnalysis.summary || '分析結果格式異常')
                )
              )}
            </div>
            <strong>🛡️ AI 防禦建議：</strong>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              {Array.isArray(aiAnalysis.recommendations) ? aiAnalysis.recommendations.map((rec, index) => (
                <li key={index} style={{ 
                  marginBottom: '8px',
                  lineHeight: '1.4',
                  listStyleType: 'disc'
                }}>
                  {typeof rec === 'string' ? rec.replace(/^[•\-\*]\s*/, '').trim() : (
                    typeof rec === 'object' && rec !== null ? (
                      <div>
                        {Object.entries(rec).map(([key, value]) => (
                          <div key={key}>
                            <strong>{key.replace(/_/g, ' ')}:</strong> {String(value)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      String(rec || '建議格式異常')
                    )
                  )}
                </li>
              )) : (
                <li style={{ color: '#ff5858' }}>建議列表格式異常</li>
              )}
            </ul>
            
            {/* 顯示攻擊關聯圖統計資訊 */}
            {attackData?.attackGraph && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: '#1a1b2d',
                borderRadius: 4,
                fontSize: '13px',
                color: '#b5b8c6',
                borderLeft: '3px solid #ff4757'
              }}>
                <strong style={{ color: '#ff4757' }}>🔗 攻擊關聯圖統計：</strong>
                
                {/* 優化提示資訊 */}
                {attackData.attackGraph.correlationMetrics.optimized && (
                  <div style={{
                    marginTop: '6px',
                    padding: '6px 8px',
                    background: '#2a2d42',
                    borderRadius: 3,
                    fontSize: '12px',
                    color: '#ffa502',
                    borderLeft: '2px solid #ffa502'
                  }}>
                    ⚡ 性能優化：顯示 Top {attackData.attackGraph.correlationMetrics.displayedIPs} 個最嚴重攻擊IP 
                    （總計檢測到 {attackData.attackGraph.correlationMetrics.totalIPs} 個攻擊IP）
                  </div>
                )}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                  <div>
                    <strong>關聯強度:</strong> {(attackData.attackGraph.correlationMetrics.strength * 100).toFixed(1)}%
                  </div>
                  <div>
                    <strong>多目標攻擊者:</strong> {attackData.attackGraph.correlationMetrics.multiTargetAttackers} 個
                  </div>
                  <div>
                    <strong>基礎設施規模:</strong> {attackData.attackGraph.correlationMetrics.infrastructureScope} 個子域名
                  </div>
                  <div>
                    <strong>攻擊類型:</strong> {attackData.attackGraph.correlationMetrics.coordinatedAttack ? '協調攻擊' : '散漫攻擊'}
                  </div>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <strong>Top {attackData.attackGraph.correlationMetrics.displayedIPs} 攻擊者IP集群:</strong>
                  <div style={{ marginLeft: '10px', fontSize: '12px' }}>
                    {attackData.attackGraph.ipClusters.map((cluster, index) => (
                      <div key={index} style={{ marginBottom: '4px' }}>
                        • {cluster.ip} [{cluster.riskLevel}] - 目標:{cluster.targets.length}個, 技術:{cluster.techniques.join(', ')}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <strong>攻擊模式分佈:</strong>
                  <div style={{ marginLeft: '10px', fontSize: '12px' }}>
                    {attackData.attackGraph.attackPatternAnalysis.slice(0, 3).map((pattern, index) => (
                      <div key={index} style={{ marginBottom: '2px' }}>
                        • {pattern.type}: {pattern.count} 次
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 顯示 AI 分析驗證資訊 */}
            {aiAnalysis.metadata && (
              <div style={{
                marginTop: '16px',
                padding: '8px',
                background: '#1a1b2d',
                borderRadius: 4,
                fontSize: '12px',
                color: '#b5b8c6',
                borderLeft: '3px solid #49cfff'
              }}>
                <strong style={{ color: '#49cfff' }}>🔍 AI 分析驗證：</strong>
                <div>分析ID: {aiAnalysis.metadata.analysisId}</div>
                <div>分析時間: {aiAnalysis.metadata.timestamp}</div>
                <div>AI 模型: {aiAnalysis.metadata.model}</div>
                <div>回應時間: {aiAnalysis.metadata.responseTime}</div>
                <div>真實 AI 生成: {aiAnalysis.metadata.isAIGenerated ? '✅ 是' : '❌ 否'}</div>
              </div>
            )}
          </>
        ) : analysisState.hasStarted && !analysisState.isComplete && !analysisState.error ? (
          <div style={{ color: '#b5b8c6', textAlign: 'center', padding: '20px' }}>
            <strong>⏳ 正在處理分析結果...</strong>
          </div>
        ) : null}
      </div>
    </div>
  );
}

