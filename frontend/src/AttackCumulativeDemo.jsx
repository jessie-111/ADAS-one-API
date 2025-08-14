import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

function formatLocalHM(iso) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function AttackCumulativeDemo() {
  const isoTimes = [
    '2025-08-12T23:00:00.000Z',
    '2025-08-13T00:00:00.000Z',
    '2025-08-13T01:00:00.000Z',
    '2025-08-13T02:00:00.000Z',
    '2025-08-13T03:00:00.000Z',
    '2025-08-13T04:00:00.000Z',
    '2025-08-13T05:00:00.000Z',
    '2025-08-13T06:00:00.000Z',
    '2025-08-13T07:00:00.000Z',
    '2025-08-13T08:00:00.000Z'
  ];

  const data = useMemo(() => {
    // 依 10 個時間點產生隨機數據（示例）
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    return isoTimes.map((iso) => ({
      name: formatLocalHM(iso),
      'SQL注入': rand(10, 60),
      'XSS攻擊': rand(8, 40),
      'RCE遠程指令碼攻擊': rand(5, 25),
      '機器人攻擊': rand(12, 80)
    }));
  }, [isoTimes]);

  return (
    <Box sx={{ p: 3, backgroundColor: '#0b1220', minHeight: '100vh' }}>
      <Card sx={{ borderRadius: 3, backgroundColor: '#1e2837' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
            攻擊統計數量（累積示例）
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
            依時間區間累計 SQL注入／XSS攻擊／RCE遠程指令碼攻擊／機器人攻擊
          </Typography>
          <Box sx={{ width: '100%', height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 8, right: 16, bottom: 32, left: 8 }}
                barCategoryGap="20%"
                barGap="5%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: '#b5b8c6' }} tickMargin={12} />
                <YAxis />
                <Tooltip />
                <Legend verticalAlign="bottom" height={28} wrapperStyle={{ color: '#b5b8c6' }} />
                <Bar dataKey="SQL注入" stackId="a" fill="#ef4444" />
                <Bar dataKey="XSS攻擊" stackId="a" fill="#f97316" />
                <Bar dataKey="RCE遠程指令碼攻擊" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="機器人攻擊" stackId="a" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

