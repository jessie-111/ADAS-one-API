import React, { useRef, useEffect, useState } from "react";
import { Network } from "vis-network";

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
          
          // 建立圖形節點和邊
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
            font: { color: "#fff", size: 20, face: "Arial" },
            borderWidth: 3,
            shadow: true,
            shape: "box",
            margin: 28
          },
          edges: {
            color: "#49cfff",
            arrows: { to: { enabled: true, scaleFactor: 1 } },
            font: { color: "#fff", align: "middle", size: 14 },
            width: 2,
            smooth: {
              type: "dynamic"
            }
          },
          physics: {
            enabled: true,
            barnesHut: {
              gravitationalConstant: -30000,
              centralGravity: 0.3,
              springLength: 180,
              springConstant: 0.05,
              damping: 0.09
            },
            stabilization: {
              enabled: true,
              iterations: 400
            }
          },
          layout: {
            improvedLayout: true
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
      <h3 style={{ color: "#49cfff" }}>DDoS 攻擊情境 - 關聯調查圖</h3>
      <div
        ref={ref}
        style={{
          height: 420,
          width: "100%",
          background: "#1a1b2d",
          borderRadius: 8
        }}
      />
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
              {aiAnalysis.summary}
            </div>
            <strong>🛡️ AI 防禦建議：</strong>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              {aiAnalysis.recommendations.map((rec, index) => (
                <li key={index} style={{ 
                  marginBottom: '8px',
                  lineHeight: '1.4',
                  listStyleType: 'disc'
                }}>
                  {rec.replace(/^[•\-\*]\s*/, '').trim()}
                </li>
              ))}
            </ul>
            
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

