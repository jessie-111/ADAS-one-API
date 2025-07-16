import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, CartesianGrid } from "recharts";

const trendData = [
  // 時間、正常流量（單位Mbps）、攻擊流量（單位Gbps，注意數值較大！）
  { time: "00:00", normal: 220, attack: 0 },
  { time: "00:10", normal: 227, attack: 0 },
  { time: "00:20", normal: 218, attack: 0 },
  { time: "00:30", normal: 226, attack: 320 },
  { time: "00:40", normal: 235, attack: 3120 },
  { time: "00:50", normal: 210, attack: 5600 },
  { time: "01:00", normal: 225, attack: 5200 },
  { time: "01:10", normal: 229, attack: 2140 },
  { time: "01:20", normal: 230, attack: 420 },
  { time: "01:30", normal: 228, attack: 0 },
  { time: "01:40", normal: 222, attack: 0 }
];

export default function TrafficTrend() {
  return (
    <div
      style={{
        background: "#22263a",
        color: "#fff",
        borderRadius: 10,
        padding: 20,
        width: 900,
        margin: "auto"
      }}
    >
      <h3 style={{ color: "#49cfff" }}>流量總覽趨勢圖</h3>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={trendData} margin={{ left: 32, right: 32, top: 16, bottom: 8 }}>
          <defs>
            <linearGradient id="attack" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff5858" stopOpacity={0.7}/>
              <stop offset="90%" stopColor="#ff5858" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="normal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#49cfff" stopOpacity={0.6}/>
              <stop offset="90%" stopColor="#49cfff" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#33384b" vertical={false} />
          <XAxis dataKey="time" stroke="#aaa" />
          <YAxis stroke="#aaa" label={{ value: "Mbps / Gbps", fill: "#bbb", fontSize: 14, angle: -90, position: "insideLeft" }} />
          <Tooltip contentStyle={{ background: "#23243a", border: "none", color: "#49cfff" }}/>
          <Legend />
          <Area type="monotone" dataKey="normal" stroke="#49cfff" fill="url(#normal)" name="正常流量 (Mbps)" />
          <Area type="monotone" dataKey="attack" stroke="#ff5858" fill="url(#attack)" name="攻擊流量 (Mbps相當比例)" />
        </AreaChart>
      </ResponsiveContainer>
      <ul style={{ margin: "32px 0 0 0", background: "#181a28", borderRadius: 8, padding: 16 }}>
        <li>紅色區域為攻擊流量高峰，與安全關聯圖之告警時段一致。</li>
        <li>正常流量穩定（220Mbps），攻擊瞬間暴增，總流量可高達 5.6Gbps。</li>
        <li>此圖能輔助告警事件調查時，佐證行為趨勢與發生時間點。</li>
      </ul>
    </div>
  );
}

