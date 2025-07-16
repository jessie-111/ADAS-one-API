import React, { useRef, useEffect, useState } from "react";
import { Network } from "vis-network";

export default function DDoSGraph() {
  const ref = useRef(null);
  const [graphData, setGraphData] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8080/api/attack")
      .then(res => res.json())
      .then(a => {
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
      });
  }, []);

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
        <strong>事件概述：</strong>
        <ul>
          <li>目標網域：example.com (203.0.113.5)</li>
          <li>攻擊流量：5.6 Gbps，針對 /login</li>
          <li>攻擊來源：US/CN/RU 不同 ASN</li>
        </ul>
        <strong>防禦建議：</strong>
        <ul>
          <li>啟用 WAF 並自動限流、封鎖惡意IP</li>
          <li>導入 CDN/流量清洗、設警報閾值</li>
          <li>SOC 監控異常來源並自動事件調查</li>
        </ul>
      </div>
    </div>
  );
}

