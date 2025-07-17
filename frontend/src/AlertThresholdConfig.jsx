import React, { useState } from "react";

export default function AlertThresholdConfig() {
  // 預設值可參考趨勢圖資料推算，讓建議值與實際數據呼應
  const suggestFlowChange = 1500; // Mbps，依據流量趨勢高低變化約5倍正常
  const suggestIPReq = 120;       // 依據攻擊流量疊加模擬每IP每分鐘連線數較高
  const suggestErrCount = 6;      // 依據平均每分鐘攻擊時段內異常次數略高標

  const [flowThreshold, setFlowThreshold] = useState(suggestFlowChange);
  const [ipThreshold, setIPThreshold] = useState(suggestIPReq);
  const [errThreshold, setErrThreshold] = useState(suggestErrCount);

  return (
    <div
      style={{
        background: "#22263a",
        color: "#fff",
        borderRadius: 10,
        padding: 24,
        minWidth: 650,
        maxWidth: 900,
        margin: "auto"
      }}
    >
      <h3 style={{ color: "#49cfff" }}>告警閾值設定</h3>

      <div style={{ margin: "32px 0 18px 0" }}>
        <table style={{
          width: "100%", borderCollapse: "separate", borderSpacing: "0 18px"
        }}>
          <tbody>

            {/* 1. 總流量異常增減 */}
            <tr>
              <td style={{ width: "36%", fontWeight: "bold" }}>流量變動監控</td>
              <td>
                <span>每 5 分鐘檢測流量變化超過</span>
                <input
                  type="number"
                  value={flowThreshold}
                  min="0"
                  step="1"
                  onChange={e => {
                    const value = e.target.value;
                    setFlowThreshold(value === '' ? 0 : Number(value));
                  }}
                  onKeyDown={e => {
                    // 允許數字、退格、刪除、箭頭鍵、Tab鍵
                    if (![8, 9, 46, 37, 38, 39, 40].includes(e.keyCode) && 
                        (e.keyCode < 48 || e.keyCode > 57) && 
                        (e.keyCode < 96 || e.keyCode > 105)) {
                      e.preventDefault();
                    }
                  }}
                  style={{
                    width: 80, margin: "0 8px", borderRadius: 5,
                    background: "#181a28", color: "#fff", border: "1px solid #49cfff",
                    padding: "6px 8px", fontSize: "14px", outline: "none"
                  }}
                />
                <span>Mbps，並持續 10 分鐘</span>
              </td>
            </tr>

            {/* 2. IP 封鎖/頻率警示 */}
            <tr>
              <td style={{ fontWeight: "bold" }}>IP 高頻訪問警示</td>
              <td>
                <span>單一 IP 每分鐘連續訪問域名超過</span>
                <input
                  type="number"
                  value={ipThreshold}
                  min="0"
                  step="1"
                  onChange={e => {
                    const value = e.target.value;
                    setIPThreshold(value === '' ? 0 : Number(value));
                  }}
                  onKeyDown={e => {
                    // 允許數字、退格、刪除、箭頭鍵、Tab鍵
                    if (![8, 9, 46, 37, 38, 39, 40].includes(e.keyCode) && 
                        (e.keyCode < 48 || e.keyCode > 57) && 
                        (e.keyCode < 96 || e.keyCode > 105)) {
                      e.preventDefault();
                    }
                  }}
                  style={{
                    width: 80, margin: "0 8px", borderRadius: 5,
                    background: "#181a28", color: "#fff", border: "1px solid #49cfff",
                    padding: "6px 8px", fontSize: "14px", outline: "none"
                  }}
                />
                <span>次，觸發告警</span>
              </td>
            </tr>

            {/* 3. HTTP 400/500 異常檢測 */}
            <tr>
              <td style={{ fontWeight: "bold" }}>HTTP 異常代碼警示</td>
              <td>
                <span>每分鐘偵測 http 400/500 代碼連續出現超過</span>
                <input
                  type="number"
                  value={errThreshold}
                  min="0"
                  step="1"
                  onChange={e => {
                    const value = e.target.value;
                    setErrThreshold(value === '' ? 0 : Number(value));
                  }}
                  onKeyDown={e => {
                    // 允許數字、退格、刪除、箭頭鍵、Tab鍵
                    if (![8, 9, 46, 37, 38, 39, 40].includes(e.keyCode) && 
                        (e.keyCode < 48 || e.keyCode > 57) && 
                        (e.keyCode < 96 || e.keyCode > 105)) {
                      e.preventDefault();
                    }
                  }}
                  style={{
                    width: 80, margin: "0 8px", borderRadius: 5,
                    background: "#181a28", color: "#fff", border: "1px solid #49cfff",
                    padding: "6px 8px", fontSize: "14px", outline: "none"
                  }}
                />
                <span>次，觸發告警</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        style={{
          background: "#181a28",
          marginTop: 30,
          borderRadius: 8,
          padding: "20px 18px"
        }}
      >
        <strong style={{ color: "#5bf1a1", fontSize: 17 }}>建議閾值：</strong>
        <ul>
          <li>流量變動建議：{suggestFlowChange} Mbps</li>
          <li>IP 訪問次數：{suggestIPReq} 次/分鐘</li>
          <li>HTTP 400/500 異常告警：{suggestErrCount} 次/分鐘</li>
        </ul>
        <div style={{
          fontSize: 13, color: "#b5b8c6", marginTop: 12, lineHeight: 1.5
        }}>
          (實際還須依照實際情況調整，此數值為圖表撈取之建議值)
        </div>
      </div>
    </div>
  );
}

