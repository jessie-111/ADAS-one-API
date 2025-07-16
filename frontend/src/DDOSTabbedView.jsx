import React, { useState } from "react";
import DDoSGraph from "./DDoSGraph";
import TrafficTrend from "./TrafficTrend";
import AlertThresholdConfig from "./AlertThresholdConfig";

const tabs = [
  { label: "關聯圖", component: DDoSGraph },
  { label: "流量趨勢", component: TrafficTrend },
  { label: "告警閾值設定", component: AlertThresholdConfig }
];

export default function DDOSTabbedView() {
  const [active, setActive] = useState(0);

  const TabComponent = tabs[active].component;

  return (
    <div style={{ width: 950, margin: "2rem auto", background: "#111526", borderRadius: 16, paddingBottom: 32 }}>
      <div style={{ display: "flex", borderBottom: "2px solid #23243a" }}>
        {tabs.map((t, i) => (
          <div
            key={t.label}
            style={{
              flex: 1,
              cursor: "pointer",
              padding: "20px 0",
              textAlign: "center",
              color: active === i ? "#49cfff" : "#fff",
              fontWeight: "bold",
              fontSize: 18,
              background: active === i ? "#181a28" : "transparent",
              borderBottom: active === i ? "4px solid #49cfff" : "4px solid transparent"
            }}
            onClick={() => setActive(i)}
          >
            {t.label}
          </div>
        ))}
      </div>
      <div style={{ padding: "16px 0" }}>
        <TabComponent />
      </div>
    </div>
  );
}

