import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
  Chip,
  CircularProgress
} from '@mui/material';
import { Storage, CheckCircle, Error } from '@mui/icons-material';

const DataSourceConfig = () => {
  const [timeRange, setTimeRange] = useState(() => {
    return localStorage.getItem('elk_time_range') || 'auto';
  });
  const [elkConnectionStatus, setElkConnectionStatus] = useState('unknown');
  const [testing, setTesting] = useState(false);

  // 儲存設定到 localStorage
  useEffect(() => {
    localStorage.setItem('elk_time_range', timeRange);
  }, [timeRange]);

  // 設定數據源為ELK
  useEffect(() => {
    localStorage.setItem('data_source', 'elk');
  }, []);

  // 測試 ELK 連接
  const testElkConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch('http://localhost:8080/api/elk/test-connection');
      const result = await response.json();
      
      setElkConnectionStatus(result.connected ? 'connected' : 'disconnected');
      
      // 顯示結果訊息
      if (result.connected) {
        console.log('✅ ELK 連接成功');
      } else {
        console.error('❌ ELK 連接失敗:', result.error);
      }
    } catch (error) {
      console.error('ELK 連接測試失敗:', error);
      setElkConnectionStatus('error');
    } finally {
      setTesting(false);
    }
  };

  // 自動測試連接
  useEffect(() => {
    testElkConnection();
  }, []);

  const getConnectionStatusChip = () => {
    switch (elkConnectionStatus) {
      case 'connected':
        return (
          <Chip
            icon={<CheckCircle />}
            label="已連接"
            color="success"
            size="small"
          />
        );
      case 'disconnected':
      case 'error':
        return (
          <Chip
            icon={<Error />}
            label="連接失敗"
            color="error"
            size="small"
          />
        );
      default:
        return (
          <Chip
            label="未知狀態"
            color="default"
            size="small"
          />
        );
    }
  };

  const timeRangeOptions = [
    { value: 'auto', label: '🔍 智能自動（推薦）' },
    { value: '15m', label: '15 分鐘' },
    { value: '30m', label: '30 分鐘' },
    { value: '1h', label: '1 小時' },
    { value: '2h', label: '2 小時' },
    { value: '6h', label: '6 小時' },
    { value: '12h', label: '12 小時' },
    { value: '24h', label: '24 小時' },
    { value: '7d', label: '7 天' }
  ];

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          📊 資料來源配置
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Storage fontSize="medium" />
          <Typography variant="body1">
            ELK Stack (Elasticsearch)
          </Typography>
          {getConnectionStatusChip()}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <TextField
            select
            label="時間範圍"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            SelectProps={{
              native: true,
            }}
            size="small"
            sx={{ minWidth: 120 }}
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </TextField>
          
          <Button
            variant="outlined"
            onClick={testElkConnection}
            disabled={testing}
            startIcon={testing ? <CircularProgress size={16} /> : null}
          >
            {testing ? '測試中...' : '測試連接'}
          </Button>
        </Box>

        {elkConnectionStatus === 'connected' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ ELK MCP Server 連接正常，可以開始分析！
          </Alert>
        )}

        {(elkConnectionStatus === 'disconnected' || elkConnectionStatus === 'error') && (
          <Alert severity="error" sx={{ mb: 2 }}>
            ❌ ELK MCP Server 連接失敗。請確認：
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>Docker 是否正在運行</li>
              <li>Elasticsearch MCP Server 容器是否啟動</li>
              <li>網路連接是否正常</li>
              <li>ELK API Key 是否已正確設定</li>
            </ul>
          </Alert>
        )}

        <Alert severity="info">
          <strong>ELK 整合功能：</strong>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>🔍 直接從 Elasticsearch 查詢 Cloudflare 日誌</li>
            <li>📋 使用完整的欄位對應表進行智能分析</li>
            <li>🛡️ 整合 OWASP Top 10 威脅分類</li>
            <li>📊 支援即時統計和聚合查詢</li>
          </ul>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default DataSourceConfig; 