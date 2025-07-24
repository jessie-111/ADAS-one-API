import React, { useRef, useEffect, useState } from "react";
import { Network } from "vis-network";

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

  // 1. 建立中心資訊節點（顯示關聯強度）- 固定位置
  const centerNodeId = nodeId++;
  const correlationStrength = (attackGraph.correlationMetrics.strength * 100).toFixed(1);
  nodes.push({
    id: centerNodeId,
    label: `攻擊關聯分析\n強度: ${correlationStrength}%\n${attackGraph.correlationMetrics.coordinatedAttack ? '協調攻擊' : '散漫攻擊'}\n多目標者: ${attackGraph.correlationMetrics.multiTargetAttackers}個`,
    color: attackGraph.correlationMetrics.coordinatedAttack ? "#ff4757" : "#ffa502",
    size: 40,
    font: { size: 16, color: "#fff" },
    shape: "diamond",
    // 固定在畫面中心
    fixed: {
      x: true,
      y: true
    },
    x: 0,
    y: 0,
    physics: false  // 不受物理引擎影響
  });

  // 2. 建立 IP 攻擊者集群節點
  const ipNodeIds = new Map();
  attackGraph.ipClusters.forEach(cluster => {
    const ipNodeId = nodeId++;
    ipNodeIds.set(cluster.ip, ipNodeId);
    
    const riskColor = colors[cluster.riskLevel.toLowerCase() + 'Risk'] || colors.lowRisk;
    const techniques = cluster.techniques.length > 0 ? `\n技術: ${cluster.techniques.slice(0, 2).join(', ')}` : '';
    const isMultiTarget = cluster.isMultiTarget ? ' [多目標]' : '';
    
    nodes.push({
      id: ipNodeId,
      label: `${cluster.ip}${isMultiTarget}\n[${cluster.riskLevel}風險]\n目標: ${cluster.targets.length}個${techniques}`,
      color: riskColor,
      size: 25 + cluster.totalSeverity * 0.1,
      font: { size: 14, color: "#fff" },
      shape: "box"
    });

    // 連接到中心節點
    edges.push({
      from: ipNodeId,
      to: centerNodeId,
      label: `威脅${cluster.totalSeverity}`,
      color: riskColor,
      width: Math.max(2, cluster.targets.length),
      dashes: cluster.isMultiTarget ? false : true
    });
  });

  // 3. 建立基礎設施目標節點
  const domainNodeIds = new Map();
  attackGraph.infrastructureMap.forEach(infra => {
    // 為每個子域名建立節點
    infra.subdomains.forEach(subdomain => {
      const domainNodeId = nodeId++;
      domainNodeIds.set(subdomain, domainNodeId);
      
      const isTargeted = infra.isTargetedInfrastructure;
      const attackerCount = infra.attackers.length;
      
      nodes.push({
        id: domainNodeId,
        label: `${subdomain}\n攻擊者: ${attackerCount}個${isTargeted ? '\n[重點目標]' : ''}`,
        color: isTargeted ? colors.infrastructure : colors.centralHub,
        size: 20 + attackerCount * 3,
        font: { size: 13, color: "#fff" },
        shape: "ellipse"
      });

      // 連接攻擊者到目標域名
      infra.attackers.forEach(attackerIP => {
        const attackerNodeId = ipNodeIds.get(attackerIP);
        if (attackerNodeId) {
          // 找到對應的攻擊資訊
          const cluster = attackGraph.ipClusters.find(c => c.ip === attackerIP);
          const targetInfo = cluster?.targets?.find(t => t.domain === subdomain);
          
          edges.push({
            from: attackerNodeId,
            to: domainNodeId,
            label: targetInfo?.targetURL?.split('/').pop() || 'attack',
            color: targetInfo?.claimedDomain ? colors.hostFake : "#49cfff",
            width: targetInfo?.claimedDomain ? 4 : 2,
            dashes: targetInfo?.claimedDomain ? [5, 5] : false,
            arrows: { to: { enabled: true, scaleFactor: 1.2 } }
          });
        }
      });
    });
  });

  // 4. 建立攻擊模式分析節點
  if (attackGraph.attackPatternAnalysis && attackGraph.attackPatternAnalysis.length > 0) {
    const patternNodeId = nodeId++;
    const topPatterns = attackGraph.attackPatternAnalysis
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    nodes.push({
      id: patternNodeId,
      label: `攻擊模式分析\n${topPatterns.map(p => `${p.type}: ${p.count}次`).join('\n')}`,
      color: colors.attackPath,
      size: 30,
      font: { size: 12, color: "#fff" },
      shape: "triangle"
    });

    // 連接到中心節點
    edges.push({
      from: centerNodeId,
      to: patternNodeId,
      label: "模式分析",
      color: colors.attackPath,
      width: 2,
      dashes: [10, 5]
    });
  }

  // 5. 特殊標記：Host header 偽造攻擊
  const fakeHostAttacks = attackGraph.ipClusters.filter(cluster => 
    cluster.techniques.includes('Host偽造')
  );
  
  if (fakeHostAttacks.length > 0) {
    const fakeHostNodeId = nodeId++;
    nodes.push({
      id: fakeHostNodeId,
      label: `Host Header 偽造\n檢測到 ${fakeHostAttacks.length} 個攻擊者\n使用偽造技術`,
      color: colors.hostFake,
      size: 25,
      font: { size: 12, color: "#fff" },
      shape: "star"
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
          width: 3,
          dashes: [3, 3]
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  useEffect(() => {
    // 從localStorage獲取設定
    const apiKey = localStorage.getItem('gemini_api_key');
    const model = localStorage.getItem('gemini_model');
    const dataSource = localStorage.getItem('data_source') || 'file';
    const timeRange = localStorage.getItem('elk_time_range') || '1h';

    // 根據資料來源選擇對應的 API 端點
    const endpoint = dataSource === 'elk' ? 
      "http://localhost:8080/api/analyze-elk-log" : 
      "http://localhost:8080/api/analyze-log";

    // 呼叫日誌分析端點
    fetch(endpoint, {
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
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(result => {
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
      })
      .catch(error => {
        console.error('載入攻擊資料失敗:', error);
        setAnalysisError(`無法載入攻擊資料: ${error.message}`);
      });
  }, []);

  // 移除原本的AI分析useEffect，因為現在直接從analyze-log端點獲取

  useEffect(() => {
    if (ref.current && graphData) {
      ref.current.innerHTML = "";
      new Network(
        ref.current,
        { nodes: graphData.nodes, edges: graphData.edges },
        {
          nodes: {
            font: { color: "#fff", size: 14, face: "Arial" },
            borderWidth: 2,
            shadow: true,
            shape: "box",
            margin: 15,
            scaling: {
              min: 10,
              max: 50
            }
          },
          edges: {
            color: "#49cfff",
            arrows: { to: { enabled: true, scaleFactor: 1 } },
            font: { color: "#fff", align: "middle", size: 12 },
            width: 2,
            smooth: {
              type: "dynamic",
              roundness: 0.5
            },
            scaling: {
              min: 1,
              max: 5
            }
          },
          physics: {
            enabled: false  // 完全禁用物理引擎，節點固定不動
          },
          layout: {
            improvedLayout: true,
            clusterThreshold: 150
          },
          interaction: {
            hover: true,
            tooltipDelay: 200,
            zoomView: true,
            dragView: true
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
          '攻擊關聯調查圖 - 多事件關聯分析' : 
          'DDoS 攻擊情境 - 關聯調查圖'
        }
      </h3>
              <div
          ref={ref}
          style={{
            height: attackData?.attackGraph ? 600 : 420,
            width: "100%",
            background: "#1a1b2d",
            borderRadius: 8
          }}
        />
        
        {/* 圖例說明 - 只在有關聯圖時顯示 */}
        {attackData?.attackGraph && (
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
              <div><span style={{ color: '#ff4757' }}>●</span> 高風險攻擊者 (High)</div>
              <div><span style={{ color: '#ff6b47' }}>●</span> 中風險攻擊者 (Medium)</div>
              <div><span style={{ color: '#ffa502' }}>●</span> 低風險攻擊者 (Low)</div>
              <div><span style={{ color: '#3742fa' }}>●</span> 重點目標基礎設施</div>
              <div><span style={{ color: '#70a1ff' }}>●</span> 一般目標基礎設施</div>
              <div><span style={{ color: '#5f27cd' }}>▲</span> 攻擊模式分析</div>
              <div><span style={{ color: '#ff3838' }}>★</span> Host Header 偽造</div>
              <div><span style={{ color: '#ff4757' }}>♦</span> 關聯強度中心</div>
            </div>
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#8b8ca3' }}>
              • 節點大小代表威脅程度 • 線條粗細代表攻擊強度 • 虛線代表偽造攻擊
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
        {isAnalyzing ? (
          <div style={{ textAlign: 'center', color: '#49cfff' }}>
            <strong>🤖 AI 正在分析攻擊資料...</strong>
          </div>
        ) : analysisError ? (
          <div style={{ color: '#ff5858' }}>
            <strong>⚠️ {analysisError}</strong>
          </div>
        ) : aiAnalysis ? (
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
                  <strong>IP 攻擊者集群:</strong>
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
        ) : (
          <div style={{ color: '#b5b8c6' }}>
            <strong>等待載入攻擊資料...</strong>
          </div>
        )}
      </div>
    </div>
  );
}

