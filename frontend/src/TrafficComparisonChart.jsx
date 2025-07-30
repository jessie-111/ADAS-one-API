import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Paper,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';

function TrafficComparisonChart({ chartData, isLoading }) {
  // 載入狀態
  if (isLoading) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ 
          height: 400, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2
        }}>
          <CircularProgress size={60} sx={{ color: '#49cfff' }} />
          <Typography variant="h6" sx={{ color: '#b5b8c6' }}>
            載入攻擊流量趨勢圖表中...
          </Typography>
          <Typography variant="body1" sx={{ color: '#8a8d9a' }}>
            正在查詢並分析兩個時期的流量資料
          </Typography>
        </Box>
      </Paper>
    );
  }

  // 無資料狀態
  if (!chartData || !chartData.data || chartData.data.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: '#b5b8c6', mb: 2 }}>
          📊 請先選擇時間範圍並載入趨勢圖表
        </Typography>
        <Typography variant="body1" sx={{ color: '#8a8d9a' }}>
          選擇時間區間後，點擊「載入趨勢圖表」按鈕以顯示攻擊流量對比分析
        </Typography>
      </Paper>
    );
  }

  // 格式化流量顯示
  const formatTraffic = (bytes) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes} B`;
  };

  // 自定義 Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{
          backgroundColor: '#1a1b2d',
          border: '1px solid #49cfff',
          borderRadius: '8px',
          padding: '12px',
          color: '#fff',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
        }}>
          <Typography variant="subtitle2" sx={{ color: '#49cfff', mb: 1 }}>
            {label}
          </Typography>
          {payload.map((entry, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: entry.color,
                  borderRadius: '50%',
                  mr: 1
                }}
              />
              <Typography variant="body1" sx={{ color: '#fff' }}>
                {entry.name}: <strong>{formatTraffic(entry.value)}</strong>
              </Typography>
            </Box>
          ))}
        </Box>
      );
    }
    return null;
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, backgroundColor: '#22263a' }}>
      <Typography variant="h6" gutterBottom sx={{ color: '#49cfff', mb: 2 }}>
        📊 攻擊請求流量趨勢對比圖
      </Typography>
      
      <ResponsiveContainer width="100%" height={400}>
        <LineChart 
          data={chartData.data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d42" />
          <XAxis 
            dataKey="timeLabel" 
            stroke="#b5b8c6"
            fontSize={12}
            tick={{ fill: '#b5b8c6' }}
          />
          <YAxis 
            stroke="#b5b8c6"
            fontSize={12}
            tick={{ fill: '#b5b8c6' }}
            tickFormatter={formatTraffic}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ 
              color: '#b5b8c6',
              paddingTop: '20px'
            }}
          />
          
          {/* 當前時期線條 - 實線 */}
          <Line 
            type="monotone" 
            dataKey="currentPeriod" 
            stroke="#ff4757" 
            strokeWidth={3}
            name={chartData.currentLabel}
            dot={{ 
              fill: '#ff4757', 
              strokeWidth: 2, 
              r: 4,
              stroke: '#fff'
            }}
            activeDot={{ 
              r: 6, 
              stroke: '#ff4757', 
              strokeWidth: 2,
              fill: '#fff'
            }}
          />
          
          {/* 上一時期線條 - 虛線 */}
          <Line 
            type="monotone" 
            dataKey="previousPeriod" 
            stroke="#70a1ff" 
            strokeWidth={2}
            strokeDasharray="8 4"
            name={chartData.previousLabel}
            dot={{ 
              fill: '#70a1ff', 
              strokeWidth: 2, 
              r: 3,
              stroke: '#fff'
            }}
            activeDot={{ 
              r: 5, 
              stroke: '#70a1ff', 
              strokeWidth: 2,
              fill: '#fff'
            }}
          />
        </LineChart>
      </ResponsiveContainer>
      
      {/* 圖表說明 */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ 
            width: 24, 
            height: 3, 
            backgroundColor: '#ff4757', 
            mr: 1,
            borderRadius: '2px'
          }} />
          <Typography sx={{ fontSize: '0.8rem', color: '#b5b8c6' }}>
            {chartData.currentLabel}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ 
            width: 24, 
            height: 3, 
            mr: 1,
            borderRadius: '2px',
            backgroundImage: 'repeating-linear-gradient(to right, #70a1ff 0, #70a1ff 8px, transparent 8px, transparent 12px)'
          }} />
          <Typography sx={{ fontSize: '0.8rem', color: '#b5b8c6' }}>
            {chartData.previousLabel}
          </Typography>
        </Box>
      </Box>

      {/* 圖表描述 */}
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body1" sx={{ color: '#8a8d9a' }}>
          此圖表顯示兩個時期的攻擊請求流量對比，
          實線表示當前時期，虛線表示上一時期。
        </Typography>
      </Box>
    </Paper>
  );
}

export default TrafficComparisonChart; 