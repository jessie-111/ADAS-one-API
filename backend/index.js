// backend/index.js
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());

// 範例 DDoS 輸出
app.get('/api/attack', (_req, res) => {
  res.json({
    attackDomain: "example.com",
    targetIP: "203.0.113.5",
    targetURL: "http://example.com/login",
    attackTrafficGbps: 5.6,
    sourceList: [
      { ip: "192.168.1.10", country: "US", asn: "AS15169" },
      { ip: "192.168.1.11", country: "CN", asn: "AS4134" },
      { ip: "192.168.1.12", country: "RU", asn: "AS1239" }
    ]
  });
});

// 啟動服務
const port = 8080;
app.listen(port, () => console.log(`Backend API on http://localhost:${port}`));
