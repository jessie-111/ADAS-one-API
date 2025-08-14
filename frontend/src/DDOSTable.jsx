import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  Button,
  IconButton
} from '@mui/material';
import { Refresh, ErrorOutline } from '@mui/icons-material';

const DDOSTable = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 根據  獲取風險等級和顏色
  const getRiskLevel = (wafScore) => {
    if (wafScore === null || wafScore === undefined) {
      return { level: '未知', color: '#ffffff' };
    }
    
    if (wafScore >= 80) {
      return { level: '高風險', color: '#ff4757' }; // 紅色
    } else if (wafScore >= 50) {
      return { level: '中風險', color: '#ffa502' }; // 橘色
    } else if (wafScore >= 20) {
      return { level: '低風險', color: '#9c88ff' }; // 紫色
    } else {
      return { level: '正常', color: '#ffffff' }; // 白色
    }
  };

  const getStatusColor = (status) => {
    if (status >= 500) return '#ff4757'; // 紅色
    if (status >= 400) return '#ffa502'; // 橘色
    if (status >= 300) return '#9c88ff'; // 紫色
    if (status >= 200) return '#2ed573'; // 綠色
    return '#ffffff'; // 白色
  };

  // 檢查ELK連接狀態
  const checkELKConnection = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/elk/test-connection');
      const result = await response.json();
      return result.connected;
    } catch (error) {
      console.error('ELK連接檢查失敗:', error);
      return false;
    }
  };

  // 載入攻擊統計資料
  const loadAttackStats = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 獲取配置 (包含API Key作為回退方案)
      const apiKey = localStorage.getItem('gemini_api_key'); // 回退方案
      const model = localStorage.getItem('gemini_model') || 'gemini-2.5-flash';
      const dataSource = 'elk'; // 固定使用 ELK 資料來源
      const timeRange = localStorage.getItem('elk_time_range') || 'auto';

      // 檢查 ELK 連接狀態
      console.log('🔍 檢查 ELK 連接狀態...');
      
      const isConnected = await checkELKConnection();
      if (!isConnected) {
        setError('ELK 連接不可用，正在嘗試重新連接...');
        console.log('⚠️ ELK 連接不可用，嘗試建立連接...');
        
        // 給ELK一些時間來建立連接
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 再次檢查連接
        const retryConnection = await checkELKConnection();
        if (!retryConnection) {
          throw new Error('ELK 連接失敗。請到「資料來源」頁面檢查 ELK 設定。');
        }
      }
      
      console.log('✅ ELK 連接狀態正常');

      // 使用專門的攻擊來源統計API (包含回退方案)
      const response = await fetch('http://localhost:8080/api/attack-source-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, model, dataSource, timeRange }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '載入資料失敗');
      }

      const result = await response.json();
      setData(result);
      setError('');
      console.log('✅ 攻擊來源統計資料載入成功');
    } catch (err) {
      console.error('載入攻擊統計失敗:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttackStats();
  }, []);

  // 創建統計表格組件
  const StatTable = ({ title, data, columns, keyField = 'item' }) => (
    <Paper sx={{ p: 2, height: '400px', backgroundColor: '#f8f9fa' }}>
      <Typography 
        variant="h6" 
        gutterBottom 
        sx={{ 
          fontWeight: 'bold', 
          color: '#2c3e50',
          borderBottom: '2px solid #3498db',
          pb: 1,
          mb: 2
        }}
      >
        {title}
      </Typography>
      <TableContainer sx={{ height: '320px', overflowY: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell 
                  key={col.field}
                  sx={{ 
                    fontWeight: 'bold',
                    backgroundColor: '#ecf0f1',
                    color: '#2c3e50'
                  }}
                >
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data && data.length > 0 ? (
              data.map((row, index) => (
                <TableRow key={index} hover>
                  {columns.map((col) => (
                    <TableCell key={col.field}>
                      {col.render ? col.render(row) : (row[col.field] || 'N/A')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  <Typography color="textSecondary">暫無資料</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>載入攻擊統計資料中...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ m: 2 }}
        icon={<ErrorOutline />}
        action={
          <Button
            color="inherit"
            size="small"
            startIcon={<Refresh />}
            onClick={loadAttackStats}
            disabled={loading}
          >
            重新載入
          </Button>
        }
      >
        <Typography variant="h6">載入失敗</Typography>
        <Typography>{error}</Typography>
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
          點擊「重新載入」按鈕再次嘗試，或檢查系統設定。
        </Typography>
      </Alert>
    );
  }

  // 準備表格資料
  const topIPs = data?.topIPs || [];
  const topCountries = data?.topCountries || [];
  const topURIs = data?.topURIs || [];
  const topDomains = data?.topDomains || [];
  const httpStatusStats = data?.httpStatusStats || [];

  return (
    <Box sx={{ p: 3, backgroundColor: '#ffffff', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 'bold', 
            color: '#2c3e50',
            mr: 2
          }}
        >
          攻擊來源統計分析
        </Typography>
        <IconButton
          onClick={loadAttackStats}
          disabled={loading}
          sx={{ 
            color: '#2c3e50',
            '&:hover': { backgroundColor: 'rgba(44, 62, 80, 0.1)' }
          }}
          title="重新載入資料"
        >
          <Refresh />
        </IconButton>
      </Box>

      <Grid container spacing={3}>
        {/* 來源 IP 統計 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <StatTable
            title="來源 IP"
            data={topIPs.slice(0, 5)}
            columns={[
              { 
                field: 'item', 
                label: '來源 IP',
                render: (row) => (
                  <Typography 
                    sx={{ 
                      color: '#3498db', 
                      fontWeight: 'bold',
                      fontFamily: 'monospace'
                    }}
                  >
                    {row.item}
                  </Typography>
                )
              },
              { 
                field: 'count', 
                label: '次數',
                render: (row) => (
                  <Chip 
                    label={row.count.toLocaleString()} 
                    color="primary" 
                    size="small" 
                  />
                )
              }
            ]}
          />
        </Grid>

        {/* 目標主機統計 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <StatTable
            title="主機"
            data={topDomains.slice(0, 10)}
            columns={[
              { 
                field: 'domain', 
                label: '主機',
                render: (row) => (
                  <Typography 
                    sx={{ 
                      color: '#3498db', 
                      fontWeight: 'bold'
                    }}
                  >
                    {row.domain || 'N/A'}
                  </Typography>
                )
              },
              { 
                field: 'sourceCount', 
                label: '次數',
                render: (row) => (
                  <Chip 
                    label={row.sourceCount || 0} 
                    color="secondary" 
                    size="small" 
                  />
                )
              }
            ]}
          />
        </Grid>

        {/* 路徑統計 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <StatTable
            title="路徑"
            data={topURIs.slice(0, 10)}
            columns={[
              { 
                field: 'item', 
                label: '路徑',
                render: (row) => (
                  <Typography 
                    sx={{ 
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      wordBreak: 'break-all'
                    }}
                  >
                    {row.item}
                  </Typography>
                )
              },
              { 
                field: 'count', 
                label: '次數',
                render: (row) => (
                  <Chip 
                    label={row.count.toLocaleString()} 
                    color="info" 
                    size="small" 
                  />
                )
              }
            ]}
          />
        </Grid>

        {/* 連線狀態代碼（風險等級） */}
        <Grid size={{ xs: 12, md: 6 }}>
          <StatTable
            title="HTTP 狀態碼"
            data={httpStatusStats.slice(0, 10)}
            columns={[
              { 
                field: 'status', 
                label: '狀態碼',
                render: (row) => {
                  const color = getStatusColor(row.status);
                  return (
                    <Chip 
                      label={row.status}
                      sx={{ 
                        backgroundColor: color,
                        color: color === '#ffffff' ? '#000000' : '#ffffff',
                        fontWeight: 'bold'
                      }}
                      size="small"
                    />
                  );
                }
              },
              { 
                field: 'count', 
                label: '次數',
                render: (row) => (
                  <Chip 
                    label={row.count.toLocaleString()} 
                    color="default" 
                    size="small" 
                  />
                )
              }
            ]}
          />
        </Grid>
      </Grid>

      {/* 來源國家統計 */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 2, backgroundColor: '#f8f9fa' }}>
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                fontWeight: 'bold', 
                color: '#2c3e50',
                borderBottom: '2px solid #3498db',
                pb: 1,
                mb: 2
              }}
            >
              來源城市與國家
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {topCountries.map((country, index) => (
                <Chip
                  key={index}
                  label={`${country.item} (${country.count.toLocaleString()})`}
                  color="primary"
                  variant="outlined"
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DDOSTable; 