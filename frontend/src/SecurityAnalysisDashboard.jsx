import React, { useState, useEffect, useMemo } from "react";
import { 
  Button, 
  CircularProgress, 
  Alert, 
  AlertTitle, 
  Paper, 
  Typography, 
  Box,
  Grid,
  Card,
  CardContent,
  TextField,
  FormControlLabel,
  Checkbox,
  Stack
} from '@mui/material';
import { Psychology, Security, Speed, Block, Public } from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

import useContainerWidth from './hooks/useContainerWidth';
import { buildTicks, buildSeriesWithTimestamps, formatTickWithPattern } from './utils/timeAxis';

// === 時間軸輔助：生成連續時間序列與整點刻度（6小時測試重點，但不硬編碼具體時間） ===
// 移除未使用的輔助函式（已以 utils/timeAxis 統一處理）

// 統計卡片組件
const StatsCard = ({ title, value, subtitle, icon, trend, color = "primary" }) => (
  <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' }}>
    <CardContent sx={{ color: 'white', textAlign: 'center', py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        {icon}
      </Box>
      <Typography variant="h4" component="h2" sx={{ fontWeight: 'bold', mb: 1 }}>
        {value}
      </Typography>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.8 }}>
        {subtitle}
      </Typography>
      {trend && (
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" sx={{ color: trend.startsWith('+') ? '#10b981' : '#ef4444' }}>
            {trend}
          </Typography>
        </Box>
      )}
    </CardContent>
  </Card>
);

// 攻擊統計數量（堆疊累計）圖表組件
const SecurityBlockingChart = ({ data, timeRange }) => {
  const { ref } = useContainerWidth();
  // 使用後端提供的動態時間序列數據
  const chartData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const startMs = timeRange?.start ? new Date(timeRange.start).getTime() : Date.now() - 6 * 60 * 60 * 1000;
  const endMs = timeRange?.end ? new Date(timeRange.end).getTime() : Date.now();
  const series = useMemo(() => buildSeriesWithTimestamps(chartData, startMs, endMs), [chartData, startMs, endMs]);
  // 類別軸資料（與示範累積圖一致）：name 以 HH:mm 顯示
  const displaySeries = useMemo(() => series.map((it) => ({ ...it, name: formatTickWithPattern(it.timestamp, 'HH:mm') })), [series]);

  return (
    <Card sx={{ 
      height: '100%',
      borderRadius: 3,
      backgroundColor: '#1e2837',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
      '&:hover': {
        boxShadow: '0 8px 12px rgba(0, 0, 0, 0.4)'
      }
    }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
          攻擊統計數量
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
          依時間區間累計 SQL注入／XSS攻擊／RCE遠程指令碼攻擊／機器人攻擊
        </Typography>
        <Box ref={ref} sx={{ width: '100%', height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={displaySeries}
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
  );
};

// 性能優化趨勢圖表組件  
const PerformanceTrendChart = ({ data, timeRange }) => {
  const { ref, width } = useContainerWidth();
  // 使用後端提供的性能趨勢數據
  const chartData = (data && data.blockingRate && data.blockingRate.data) ? data.blockingRate.data : [];
  const startMs = timeRange?.start ? new Date(timeRange.start).getTime() : Date.now() - 6 * 60 * 60 * 1000;
  const endMs = timeRange?.end ? new Date(timeRange.end).getTime() : Date.now();
  const series = useMemo(() => buildSeriesWithTimestamps(chartData, startMs, endMs), [chartData, startMs, endMs]);
  const tickInfo = useMemo(() => buildTicks(startMs, endMs, width), [startMs, endMs, width]);

  return (
    <Card sx={{ 
      height: '100%',
      borderRadius: 3,
      backgroundColor: '#1e2837',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
      '&:hover': {
        boxShadow: '0 8px 12px rgba(0, 0, 0, 0.4)'
      }
    }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
          性能優化趨勢
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
          響應時間與防護執行率趨勢
        </Typography>
        <Box ref={ref} sx={{ width: '100%', height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              type="number"
              scale="time"
              dataKey="timestamp"
              domain={[startMs, endMs]}
              ticks={tickInfo.ticks}
              interval={0}
              tickFormatter={(v) => formatTickWithPattern(v, 'HH:mm')}
              minTickGap={12}
              tickMargin={14}
              padding={{ left: 12, right: 12 }}
            />
            <YAxis />
            <Tooltip labelFormatter={(v) => formatTickWithPattern(v, tickInfo.format)} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="防護執行率" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 2 }}
              connectNulls
            />
            <Line 
              type="monotone" 
              dataKey="響應時間" 
              stroke="#ef4444" 
              strokeWidth={3}
              dot={{ fill: '#ef4444', strokeWidth: 2 }}
              connectNulls
            />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

// 威脅類型分佈圖表組件
const ThreatDistributionChart = ({ data }) => {
  const chartData = data ? Object.entries(data).map(([name, info]) => ({
    name,
    value: info.percentage || info.count || 0
  })) : [
    { name: 'SQL注入', value: 40 },
    { name: 'XSS攻擊', value: 30 },
    { name: 'CSRF', value: 20 },
    { name: '其他攻擊', value: 10 }
  ];

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#6b7280', '#8b5cf6', '#06b6d4'];

  return (
    <Card sx={{ 
      height: '100%',
      borderRadius: 3,
      backgroundColor: '#1e2837',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
      '&:hover': {
        boxShadow: '0 8px 12px rgba(0, 0, 0, 0.4)'
      }
    }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
          威脅類型分佈
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
          基於OWASP Top 10的攻擊類型分析
        </Typography>
        <ResponsiveContainer width="100%" height={340}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={90}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// 流量統計圖表組件
const TrafficStatsChart = ({ data, timeRange }) => {
  const { ref } = useContainerWidth();
  // 使用後端提供的流量時間序列數據
  const chartData = Array.isArray(data) ? data : [];
  const startMs = timeRange?.start ? new Date(timeRange.start).getTime() : Date.now() - 6 * 60 * 60 * 1000;
  const endMs = timeRange?.end ? new Date(timeRange.end).getTime() : Date.now();
  const series = useMemo(() => buildSeriesWithTimestamps(chartData, startMs, endMs), [chartData, startMs, endMs]);
  // 類別軸資料：name 以 HH:mm 顯示，避免初次寬度為 0 造成時間刻度抽樣問題
  const displaySeries = useMemo(() => series.map((it) => ({ ...it, name: formatTickWithPattern(it.timestamp, 'HH:mm') })), [series]);

  return (
    <Card sx={{ 
      height: '100%',
      borderRadius: 3,
      backgroundColor: '#1e2837',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
      '&:hover': {
        boxShadow: '0 8px 12px rgba(0, 0, 0, 0.4)'
      }
    }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
          流量處理統計
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
          正常流量與惡意流量處理情況
        </Typography>
        <Box ref={ref} sx={{ width: '100%', height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displaySeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" tickMargin={12} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="正常流量"
              stackId="1"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.8}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="惡意流量"
              stackId="1"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.8}
              connectNulls
            />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

const SecurityAnalysisDashboard = ({ aiConfig }) => {
  const [loading, setLoading] = useState(false);
  const [securityData, setSecurityData] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [error, setError] = useState(null);
  // 自訂時間控制
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [oneTimeOnly, setOneTimeOnly] = useState(true);

  // 深色主題輸入框樣式
  const darkInputSx = {
    minWidth: 240,
    '& .MuiInputBase-root': {
      backgroundColor: '#111827',
      color: '#e5e7eb',
      caretColor: '#60a5fa'
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: '#3b82f6',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#60a5fa',
    },
    '& .MuiInputLabel-root': {
      color: '#93c5fd',
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: '#60a5fa',
    },
    '& .MuiSvgIcon-root': {
      color: '#60a5fa',
    },
    '& .MuiInputBase-input::placeholder': {
      color: '#93c5fd',
      opacity: 0.7,
    },
    // 美化 datetime 本機日曆圖示（僅 WebKit 有效）
    '& input[type="datetime-local"]::-webkit-calendar-picker-indicator': {
      filter: 'invert(61%) sepia(55%) saturate(671%) hue-rotate(182deg) brightness(99%) contrast(103%)',
      opacity: 0.9
    },
  };

  const toLocalInput = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const MM = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const HH = pad(d.getHours());
      const mm = pad(d.getMinutes());
      return `${yyyy}-${MM}-${dd}T${HH}:${mm}`;
    } catch { return ''; }
  };
  const toISO = (localStr) => {
    if (!localStr) return '';
    const d = new Date(localStr);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  };

  // 載入防護分析數據
  const loadSecurityData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 載入防護分析數據...');
      
      // 取得時間範圍設定（優先使用當前輸入，其次 localStorage）
      let timeRange = localStorage.getItem('elk_time_range') || 'auto';
      let customStartTime = localStorage.getItem('elk_custom_start_time') || undefined;
      let customEndTime = localStorage.getItem('elk_custom_end_time') || undefined;
      if (customStart && customEnd) {
        const sISO = toISO(customStart);
        const eISO = toISO(customEnd);
        if (sISO && eISO) {
          timeRange = 'custom';
          customStartTime = sISO;
          customEndTime = eISO;
        }
      }
      
      // 構建請求體，只包含有效值
      const requestBody = {
        timeRange,
        dataSource: 'elk'
      };
      
      // 只有當自定義時間存在且有效時才添加
      if (customStartTime && customStartTime !== 'null') {
        requestBody.startTime = customStartTime;
      }
      if (customEndTime && customEndTime !== 'null') {
        requestBody.endTime = customEndTime;
      }

      const response = await fetch('http://localhost:8080/api/security-analysis-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '載入防護分析數據失敗');
      }

      const data = await response.json();
      setSecurityData(data);
      
      console.log('✅ 防護分析數據載入完成');
      
    } catch (error) {
      console.error('❌ 載入防護分析數據失敗:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      if (oneTimeOnly) {
        localStorage.removeItem('elk_custom_start_time');
        localStorage.removeItem('elk_custom_end_time');
        localStorage.setItem('elk_time_range', 'auto');
      }
    }
  };

  // 統合的 AI 智慧防護分析功能
  const handleCombinedAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 開始 AI 智慧防護分析...');
      
      // 第一步：載入防護分析數據
      console.log('📊 正在載入數據...');
      
      // 獲取時間範圍配置
      let timeRange = localStorage.getItem('elk_time_range') || 'auto';
      let customStartTime = localStorage.getItem('elk_custom_start_time') || undefined;
      let customEndTime = localStorage.getItem('elk_custom_end_time') || undefined;
      if (customStart && customEnd) {
        const sISO = toISO(customStart);
        const eISO = toISO(customEnd);
        if (sISO && eISO) {
          timeRange = 'custom';
          customStartTime = sISO;
          customEndTime = eISO;
        }
      }
      
      // 構建請求體，只包含有效值
      const requestBody = {
        timeRange,
        dataSource: 'elk'
      };
      
      // 只有當自定義時間存在且有效時才添加
      if (customStartTime && customStartTime !== 'null') {
        requestBody.startTime = customStartTime;
      }
      if (customEndTime && customEndTime !== 'null') {
        requestBody.endTime = customEndTime;
      }

      const dataResponse = await fetch('http://localhost:8080/api/security-analysis-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!dataResponse.ok) {
        const errorData = await dataResponse.json();
        throw new Error(errorData.error || '載入防護分析數據失敗');
      }

      const data = await dataResponse.json();
      setSecurityData(data);
      
      console.log('✅ 數據載入完成，開始 AI 分析...');
      
      // 第二步：執行 AI 分析
      const { provider, gemini, ollama } = aiConfig;
      let apiKey, model, apiUrl;

      if (provider === 'gemini') {
        apiKey = gemini.apiKey;
        model = gemini.selectedModel || 'gemini-2.0-flash-exp';
      } else if (provider === 'ollama') {
        apiUrl = ollama.apiUrl;
        model = ollama.selectedModel;
      }

      if (!apiKey && provider === 'gemini') {
        throw new Error('請先在 AI 分析設定中配置 Gemini API Key');
      }

      if (!model) {
        throw new Error('請先選擇 AI 模型');
      }

      // 構建AI分析請求體
      const aiRequestBody = {
        provider,
        model,
        timeRange
      };
      
      // 添加API配置
      if (provider === 'gemini' && apiKey) {
        aiRequestBody.apiKey = apiKey;
      }
      if (provider === 'ollama' && apiUrl) {
        aiRequestBody.apiUrl = apiUrl;
      }
      
      // 只有當自定義時間存在且有效時才添加
      if (customStartTime && customStartTime !== 'null') {
        aiRequestBody.startTime = customStartTime;
      }
      if (customEndTime && customEndTime !== 'null') {
        aiRequestBody.endTime = customEndTime;
      }

      const aiResponse = await fetch('http://localhost:8080/api/security-analysis-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(aiRequestBody)
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json();
        throw new Error(errorData.error || 'AI 分析失敗');
      }

      const analysis = await aiResponse.json();
      setAiAnalysis(analysis);
      try {
        const recommendations = [];
        if (analysis?.cloudflareRecommendations) {
          for (const rec of analysis.cloudflareRecommendations) {
            if (typeof rec === 'string') recommendations.push(rec);
            else if (rec?.action) recommendations.push(rec.action);
          }
        }
        window.dispatchEvent(new CustomEvent('ai:analysisContext', {
          detail: {
            title: 'AI 防護分析建議',
            recommendations
          }
        }));
      } catch (e) {
        // 靜默處理
      }
      
      console.log('✅ AI 智慧防護分析完成');
      
    } catch (error) {
      console.error('❌ AI 智慧防護分析失敗:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 組件初始化 - 不自動載入數據，改為手動觸發
  useEffect(() => {
    // 頁面初始化時不執行任何自動分析
    console.log('🎯 防護分析頁面已載入，等待用戶手動觸發分析');
    // 載入已有自訂區間
    const s = localStorage.getItem('elk_custom_start_time');
    const e = localStorage.getItem('elk_custom_end_time');
    if (s) setCustomStart(toLocalInput(s));
    if (e) setCustomEnd(toLocalInput(e));
  }, []);

  return (
    <Box sx={{ 
      p: 2, 
      backgroundColor: '#0f1419',
      minHeight: '100vh',
      color: '#ffffff'
    }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#ffffff', fontWeight: 'bold' }}>
          🛡️ 防護分析
        </Typography>
        <Typography variant="subtitle1" sx={{ color: '#94a3b8' }}>
          基於網站防護效能分析與AI智能建議
        </Typography>
      </Box>

      {/* 自訂時間 + AI 智慧防護分析按鈕 */}
      <Box sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              label="開始時間"
              type="datetime-local"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              sx={darkInputSx}
            />
            <TextField
              label="結束時間"
              type="datetime-local"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              sx={darkInputSx}
            />
            <Button variant="outlined" onClick={() => {
              // 寫入 localStorage，供本次分析使用
              if (!customStart || !customEnd) { setError('請選擇起訖時間'); return; }
              const sISO = toISO(customStart); const eISO = toISO(customEnd);
              if (!sISO || !eISO) { setError('時間格式無效'); return; }
              if (new Date(eISO).getTime() <= new Date(sISO).getTime()) { setError('結束時間必須大於開始時間'); return; }
              localStorage.setItem('elk_time_range', 'custom');
              localStorage.setItem('elk_custom_start_time', sISO);
              localStorage.setItem('elk_custom_end_time', eISO);
            }} disabled={loading}>套用</Button>
            <Button variant="text" color="inherit" onClick={() => {
              localStorage.removeItem('elk_custom_start_time');
              localStorage.removeItem('elk_custom_end_time');
              localStorage.setItem('elk_time_range', 'auto');
              setCustomStart(''); setCustomEnd('');
            }} disabled={loading}>清除</Button>
            <FormControlLabel control={<Checkbox checked={oneTimeOnly} onChange={(e)=>setOneTimeOnly(e.target.checked)} />} label="僅此次分析" sx={{ color: '#9ca3af' }} />
          </Stack>
          <Box sx={{ textAlign: { xs: 'center', md: 'right' } }}>
            <Button
              variant="contained"
              onClick={handleCombinedAnalysis}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Psychology />}
              sx={{
                background: 'linear-gradient(45deg, #FF6B6B 30%, #4ECDC4 90%)',
                boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
              }}
              title="一鍵執行完整的防護數據載入與AI智能分析"
            >
              {loading ? '分析中...' : '🤖 AI智慧防護分析'}
            </Button>
          </Box>
        </Stack>
      </Box>

      {/* 錯誤提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>錯誤</AlertTitle>
          {error}
        </Alert>
      )}

      {/* 空狀態提示 */}
      {!securityData && !loading && (
        <Box sx={{ 
          textAlign: 'center', 
          py: 8, 
          mb: 4,
          background: 'linear-gradient(135deg, #1e2837 0%, #374151 100%)',
          borderRadius: 2,
          border: '2px dashed #6b7280'
        }}>
          <Typography variant="h5" sx={{ mb: 2, color: '#e2e8f0' }}>
            📊 歡迎使用防護分析系統
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: '#94a3b8' }}>
            點擊「AI智慧防護分析」按鈕開始分析您的網站防護狀況
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              📈 攻擊阻擋統計 | 🛡️ 威脅類型分析 | 📊 流量處理統計 | 🤖 AI 智能建議
            </Typography>
          </Box>
        </Box>
      )}

      {/* 統計卡片 */}
      {securityData && (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatsCard
                title="攻擊防護執行率"
                value={`${securityData.blockingRate || 0}%`}
                subtitle=""
                icon={<Block sx={{ fontSize: 40, color: '#10b981' }} />}
                trend=""
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatsCard
                title="邊緣響應時間"
                value={`${securityData.avgResponseTime || 7}ms`}
                subtitle="平均邊緣響應時間"
                icon={<Speed sx={{ fontSize: 40, color: '#3b82f6' }} />}
                trend="-12.5%"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatsCard
                title="攻擊次數"
                value={securityData.totalAttacks?.toLocaleString() || '202'}
                subtitle="檢測攻擊次數"
                icon={<Security sx={{ fontSize: 40, color: '#ef4444' }} />}
                trend="-13.7%"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatsCard
                title="保護網站"
                value={securityData.protectedSites?.toLocaleString() || '13,200'}
                subtitle="保護正常訪問網址數量"
                icon={<Public sx={{ fontSize: 40, color: '#8b5cf6' }} />}
                trend="+5.6%"
              />
            </Grid>
          </Grid>

          {/* 圖表區域 - 緊湊統一佈局 */}
          <Grid container spacing={4} sx={{ mb: 4 }}>
            {/* 第一排：均勻分配 */}
            <Grid size={{ xs: 12, md: 6 }}>
              <SecurityBlockingChart data={securityData.attackTypeStats} timeRange={securityData.timeRange} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <PerformanceTrendChart data={securityData.performanceTrend} timeRange={securityData.timeRange} />
            </Grid>
            
            {/* 第二排：均勻分配 */}
            <Grid size={{ xs: 12, md: 6 }}>
              <ThreatDistributionChart data={securityData.threatDistribution} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TrafficStatsChart data={securityData.trafficStats.data} timeRange={securityData.timeRange} />
            </Grid>
          </Grid>
        </>
      )}

      {/* AI 專業建議區域 */}
      {aiAnalysis && (
        <>
          <Grid container spacing={4} sx={{ mb: 4 }}>
            {/* Cloudflare 設定建議 */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ 
                p: 3, 
                background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)', 
                color: 'white',
                borderRadius: 3,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                '&:hover': {
                  boxShadow: '0 8px 12px rgba(0, 0, 0, 0.4)'
                }
              }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  ⚙️ Cloudflare 專業設定建議
                </Typography>
                {aiAnalysis.cloudflareRecommendations && aiAnalysis.cloudflareRecommendations.length > 0 ? (
                  <Box>
                    {aiAnalysis.cloudflareRecommendations.slice(0, 4).map((rec, index) => (
                      <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#60a5fa' }}>
                          {rec.category}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>
                          {rec.action}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" sx={{ 
                            bgcolor: rec.priority === '高' ? '#ef4444' : rec.priority === '中' ? '#f59e0b' : '#10b981',
                            px: 1, 
                            py: 0.25, 
                            borderRadius: 0.5,
                            fontSize: '0.7rem'
                          }}>
                            優先級: {rec.priority}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    暫無專業設定建議
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* 行動計劃建議 */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ 
                p: 3, 
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', 
                color: 'white',
                borderRadius: 3,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                '&:hover': {
                  boxShadow: '0 8px 12px rgba(0, 0, 0, 0.4)'
                }
              }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  🎯 專業行動計劃建議
                </Typography>
                {aiAnalysis.nextSteps ? (
                  <Box>
                    {Object.entries(aiAnalysis.nextSteps).map(([timeframe, steps]) => (
                      <Box key={timeframe} sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: '#86efac' }}>
                          {timeframe === 'immediate' && '🚨 立即執行'}
                          {timeframe === 'shortTerm' && '⏰ 短期優化'}
                          {timeframe === 'mediumTerm' && '📈 中期策略'}
                          {timeframe === 'longTerm' && '🎯 長期規劃'}
                        </Typography>
                        <Box sx={{ ml: 2 }}>
                          {steps.slice(0, 2).map((step, stepIndex) => (
                            <Typography key={stepIndex} variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>
                              • {step}
                            </Typography>
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    暫無行動計劃建議
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      )}

      {/* AI 分析結果 */}
      {aiAnalysis && (
        <Paper sx={{ p: 3, mt: 3, background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)', color: 'white' }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Psychology sx={{ mr: 1 }} />
            AI 防護分析報告
          </Typography>
          
          {/* 攻擊概要 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>📊 防護效能概要</Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
              {typeof aiAnalysis.summary === 'string' ? (
                aiAnalysis.summary
              ) : (
                aiAnalysis.summary && typeof aiAnalysis.summary === 'object' ? (
                  <Box component="div" sx={{ whiteSpace: 'normal' }}>
                    {Object.entries(aiAnalysis.summary).map(([key, value]) => (
                      <Box component="div" key={key} sx={{ mb: 1 }}>
                        <Typography component="span" variant="subtitle2" sx={{ fontWeight: 'bold', mr: 1 }}>
                          {key === 'overallPerformance' && '整體防護效能'}
                          {key === 'threatIdentification' && '威脅識別'}
                          {key === 'performanceSecurityBalance' && '效能與安全平衡'}
                          {key === 'trendInterpretation' && '趨勢解讀'}
                          {!['overallPerformance','threatIdentification','performanceSecurityBalance','trendInterpretation'].includes(key) && key}
                        </Typography>
                        <Typography component="span" variant="body1">{String(value)}</Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  String(aiAnalysis.summary || '')
                )
              )}
            </Typography>
          </Box>

          {/* 圖表分析 */}
          {aiAnalysis.chartAnalysis && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>📈 圖表分析解讀</Typography>
              {Object.entries(aiAnalysis.chartAnalysis).map(([key, analysis]) => (
                <Box key={key} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {key === 'attackTypes' && '攻擊類型統計'}
                    {key === 'threatDistribution' && '威脅分佈分析'}
                    {key === 'performanceTrend' && '性能趨勢分析'}
                    {key === 'trafficStats' && '流量統計分析'}
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2, opacity: 0.9 }}>
                    {typeof analysis === 'string' ? analysis : (
                      analysis && typeof analysis === 'object'
                        ? Object.values(analysis).join('\n')
                        : String(analysis)
                    )}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Cloudflare 建議 */}
          {aiAnalysis.cloudflareRecommendations && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>⚙️ Cloudflare 設定建議</Typography>
              {aiAnalysis.cloudflareRecommendations.map((rec, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {rec.category} - 優先級: {rec.priority}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>
                    {rec.action}
                  </Typography>
                  {rec.steps && (
                    <Box sx={{ ml: 2 }}>
                      {rec.steps.map((step, stepIndex) => (
                        <Typography key={stepIndex} variant="body2" sx={{ opacity: 0.8 }}>
                          {stepIndex + 1}. {step}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {/* 下一步建議 */}
          {aiAnalysis.nextSteps && (
            <Box>
              <Typography variant="h6" gutterBottom>🎯 下一步行動計劃</Typography>
              {Object.entries(aiAnalysis.nextSteps).map(([timeframe, steps]) => (
                <Box key={timeframe} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {timeframe === 'immediate' && '立即執行'}
                    {timeframe === 'shortTerm' && '短期計劃 (1-7天)'}
                    {timeframe === 'mediumTerm' && '中期計劃 (1-4週)'}
                    {timeframe === 'longTerm' && '長期規劃 (1-3個月)'}
                  </Typography>
                  <Box sx={{ ml: 2 }}>
                    {steps.map((step, stepIndex) => (
                      <Typography key={stepIndex} variant="body2" sx={{ opacity: 0.9 }}>
                        • {step}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default SecurityAnalysisDashboard;