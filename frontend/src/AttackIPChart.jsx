import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import { 
  Search, 
  Refresh, 
  Schedule, 
  Security,
  ErrorOutline 
} from '@mui/icons-material';

const AttackIPChart = () => {
  // 狀態管理
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 時間選擇狀態
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  // 初始化預設時間範圍（最近1小時）
  useEffect(() => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // 格式化為 datetime-local 格式 (YYYY-MM-DDTHH:mm)
    const formatDateTime = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    setStartTime(formatDateTime(oneHourAgo));
    setEndTime(formatDateTime(now));
  }, []);

  // 載入攻擊IP統計資料
  const loadAttackIPData = async () => {
    // 查詢前清除測試數據
    if (data.length > 0 && data[0].name === '192.168.1.100') {
        setData([]);
    }

    if (!startTime || !endTime) {
      setError('請選擇完整的時間範圍');
      return;
    }

    if (new Date(startTime) >= new Date(endTime)) {
      setError('開始時間必須早於結束時間');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // 獲取設定 (包含API Key作為回退方案)
      const apiKey = localStorage.getItem('gemini_api_key'); // 回退方案
      const model = localStorage.getItem('gemini_model') || 'gemini-2.5-flash';
      const dataSource = localStorage.getItem('data_source') || 'elk';

      console.log(`🔍 查詢攻擊IP統計: ${startTime} 到 ${endTime}`);

      // 轉換為 ISO 格式
      const startTimeISO = new Date(startTime).toISOString();
      const endTimeISO = new Date(endTime).toISOString();

      // 調用API (包含API Key作為回退方案)
      const response = await fetch('http://localhost:8080/api/attack-source-stats', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          apiKey, // 回退方案：如果後端環境變數無效，使用這個
          model, 
          dataSource,
          startTime: startTimeISO,
          endTime: endTimeISO
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '載入資料失敗');
      }

      const result = await response.json();
      
      // 處理Top 5 IP資料
      const topIPs = (result.topIPs || []);
      
      if (topIPs.length === 0) {
        setError('在選定的時間範圍內未找到攻擊IP資料');
        setData([]);
      } else {
        // 格式化資料以供圖表使用，確保按攻擊次數排序（從高到低）
        const chartData = topIPs
          .sort((a, b) => b.count - a.count) // 確保從高到低排序
          .slice(0, 5) // 確保只取前5個
          .map((ip, index) => ({
            name: ip.item || `IP-${index}`,
            value: Number(ip.count) || 0, // PieChart需要'value'
            rank: index + 1
          }));
        
        console.log('📊 圖表數據:', chartData);
        setData(chartData);
        console.log(`✅ 成功載入 ${chartData.length} 個攻擊IP統計`);
      }
      
    } catch (err) {
      console.error('載入攻擊IP統計失敗:', err);
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Custom Tooltip for Pie Chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box
          sx={{
            backgroundColor: '#ffffff',
            border: '1px solid #FF7338',
            borderRadius: 1,
            p: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          <Typography sx={{ color: '#333333', fontFamily: 'monospace', fontSize: '14px' }}>
            IP地址: {data.name}
          </Typography>
          <Typography sx={{ color: payload[0].fill, fontWeight: 'bold', fontSize: '14px' }}>
            攻擊次數: {data.value.toLocaleString()} ({(payload[0].percent * 100).toFixed(1)}%)
          </Typography>
        </Box>
      );
    }
    return null;
  };

  // 橘色漸層配色系統
  const COLORS = ['#FF7338', '#FF8C5A', '#FFA57C', '#FFBE9E', '#FFD0B8'];

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* 標題區域 */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, backgroundColor: '#ffffff', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Security sx={{ color: '#FF7338', mr: 2, fontSize: 32 }} />
          <Typography 
            variant="h4" 
            sx={{ 
              color: '#333333', 
              fontWeight: 'bold',
              flex: 1
            }}
          >
            攻擊IP Top 5 圓餅圖
          </Typography>
          <IconButton
            onClick={loadAttackIPData}
            disabled={loading}
            sx={{ 
              color: '#FF7338',
              '&:hover': { backgroundColor: 'rgba(255, 115, 56, 0.1)' }
            }}
            title="重新載入資料"
          >
            <Refresh />
          </IconButton>
        </Box>

        {/* 時間選擇區域 */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            flexWrap: 'wrap',
            backgroundColor: '#f8f9fa',
            p: 2,
            borderRadius: 2,
            border: '1px solid #e0e0e0'
          }}
        >
          <Schedule sx={{ color: '#FF7338' }} />
          <Typography sx={{ color: '#555555', minWidth: 'auto' }}>
            時間範圍：
          </Typography>
          
          <TextField
            label="開始時間"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              minWidth: 200,
              '& .MuiInputLabel-root': { color: '#666666' },
              '& .MuiOutlinedInput-root': {
                color: '#333333',
                backgroundColor: '#ffffff',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#FF7338'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#FF8C5A'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#FF7338'
                }
              }
            }}
          />
          
          <Typography sx={{ color: '#555555' }}>到</Typography>
          
          <TextField
            label="結束時間"
            type="datetime-local"  
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              minWidth: 200,
              '& .MuiInputLabel-root': { color: '#666666' },
              '& .MuiOutlinedInput-root': {
                color: '#333333',
                backgroundColor: '#ffffff',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#FF7338'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#FF8C5A'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#FF7338'
                }
              }
            }}
          />
          
          <Button
            variant="contained"
            size="large"
            onClick={loadAttackIPData}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Search />}
            sx={{ 
              minWidth: 120,
              backgroundColor: '#FF7338',
              '&:hover': {
                backgroundColor: '#FF8C5A'
              },
              '&:disabled': {
                backgroundColor: '#FFBE9E'
              }
            }}
          >
            {loading ? '查詢中...' : '查詢'}
          </Button>
        </Box>
      </Paper>

      {/* 錯誤提示 */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          icon={<ErrorOutline />}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={loadAttackIPData}
              disabled={loading}
            >
              重試
            </Button>
          }
        >
          <Typography variant="h6">載入失敗</Typography>
          <Typography>{error}</Typography>
        </Alert>
      )}

      {/* 圖表區域 */}
      <Paper elevation={3} sx={{ p: 3, backgroundColor: '#ffffff', borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ 
            height: 500, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2
          }}>
            <CircularProgress size={60} sx={{ color: '#FF7338' }} />
            <Typography variant="h6" sx={{ color: '#333333' }}>
              載入攻擊IP統計資料中...
            </Typography>
            <Typography variant="body1" sx={{ color: '#666666' }}>
              正在分析指定時間範圍內的攻擊來源
            </Typography>
          </Box>
        ) : data.length > 0 ? (
          <>
            <Typography variant="h6" gutterBottom sx={{ color: '#333333', mb: 3, fontWeight: 'bold' }}>
              威脅類型分佈
            </Typography>
            <Typography variant="body2" sx={{ color: '#666666', mb: 3 }}>
              檢測到的攻擊來源IP比例
            </Typography>
            
            <Box sx={{ width: '100%', height: 500, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ color: '#333333' }} 
                    formatter={(value, entry) => {
                      const { color } = entry;
                      return <span style={{ color: '#333333', fontSize: '14px' }}>{value}</span>;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            
            {/* 資料摘要 */}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body1" sx={{ color: '#666666' }}>
                圖表顯示在所選時間範圍內攻擊次數最多的 {data.length} 個IP地址比例
              </Typography>
              <Typography variant="body2" sx={{ color: '#999999', mt: 1 }}>
                時間範圍：{new Date(startTime).toLocaleString()} 
                到 {new Date(endTime).toLocaleString()}
              </Typography>
            </Box>
          </>
        ) : (
          <Box sx={{ 
            height: 400, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            textAlign: 'center'
          }}>
            <Security sx={{ fontSize: 64, color: '#FF7338', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#333333', mb: 2 }}>
              請選擇時間範圍並查詢攻擊IP統計
            </Typography>
            <Typography variant="body1" sx={{ color: '#666666' }}>
              設定起始和結束時間，點擊「查詢」按鈕以顯示攻擊來源IP分析圖表
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default AttackIPChart; 