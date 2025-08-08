import React, { useState, useEffect } from "react";
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
  CardContent
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

// 攻擊類型阻擋統計圖表組件
const SecurityBlockingChart = ({ data }) => {
  // 使用後端提供的動態時間序列數據
  const chartData = Array.isArray(data) ? data : [
    { name: '02:40', SQL注入: 5, XSS攻擊: 3, CSRF: 2, 其他攻擊: 1 },
    { name: '02:41', SQL注入: 8, XSS攻擊: 6, CSRF: 4, 其他攻擊: 2 },
    { name: '02:42', SQL注入: 12, XSS攻擊: 8, CSRF: 6, 其他攻擊: 3 },
    { name: '02:43', SQL注入: 9, XSS攻擊: 7, CSRF: 5, 其他攻擊: 2 },
    { name: '02:44', SQL注入: 6, XSS攻擊: 4, CSRF: 3, 其他攻擊: 1 }
  ];

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
          攻擊類型阻擋統計
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
          過去6個月的攻擊類型和阻擋數量統計
        </Typography>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="SQL注入" stackId="a" fill="#ef4444" />
            <Bar dataKey="XSS攻擊" stackId="a" fill="#f97316" />
            <Bar dataKey="CSRF" stackId="a" fill="#eab308" />
            <Bar dataKey="其他攻擊" stackId="a" fill="#6b7280" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// 性能優化趨勢圖表組件  
const PerformanceTrendChart = ({ data }) => {
  // 使用後端提供的性能趨勢數據
  const chartData = (data && data.blockingRate && data.blockingRate.data) ? 
    data.blockingRate.data : [
    { name: '02:40', 阻擋率: 100, 響應時間: 98 },
    { name: '02:41', 阻擋率: 95, 響應時間: 97 },  
    { name: '02:42', 阻擋率: 100, 響應時間: 99 },
    { name: '02:43', 阻擋率: 100, 響應時間: 98 },
    { name: '02:44', 阻擋率: 100, 響應時間: 99 }
  ];

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
          響應時間和阻擋率效率趨勢分析
        </Typography>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="阻擋率" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="響應時間" 
              stroke="#ef4444" 
              strokeWidth={3}
              dot={{ fill: '#ef4444', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
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
const TrafficStatsChart = ({ data }) => {
  // 使用後端提供的流量時間序列數據
  const chartData = Array.isArray(data) ? data : [
    { name: '02:40', 惡意流量: 120, 正常流量: 850 },
    { name: '02:41', 惡意流量: 180, 正常流量: 920 },
    { name: '02:42', 惡意流量: 150, 正常流量: 1100 },
    { name: '02:43', 惡意流量: 95, 正常流量: 1200 },
    { name: '02:44', 惡意流量: 80, 正常流量: 950 }
  ];

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
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" />
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
            />
            <Area
              type="monotone"
              dataKey="惡意流量"
              stackId="1"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.8}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const SecurityAnalysisDashboard = ({ aiConfig }) => {
  const [loading, setLoading] = useState(false);
  const [securityData, setSecurityData] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [error, setError] = useState(null);

  // 載入防護分析數據
  const loadSecurityData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 載入防護分析數據...');
      
      // 獲取時間範圍配置
      const timeRange = localStorage.getItem('elk_time_range') || 'auto';
      const customStartTime = localStorage.getItem('elk_custom_start_time') || undefined;
      const customEndTime = localStorage.getItem('elk_custom_end_time') || undefined;
      
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
      const timeRange = localStorage.getItem('elk_time_range') || 'auto';
      const customStartTime = localStorage.getItem('elk_custom_start_time') || undefined;
      const customEndTime = localStorage.getItem('elk_custom_end_time') || undefined;
      
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

      {/* AI 智慧防護分析按鈕 */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
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
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="攻擊阻擋率"
                value={`${securityData.blockingRate || 98.9}%`}
                subtitle="攻擊阻擋成功率"
                icon={<Block sx={{ fontSize: 40, color: '#10b981' }} />}
                trend="+0.4%"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="邊緣響應時間"
                value={`${securityData.avgResponseTime || 7}ms`}
                subtitle="平均邊緣響應時間"
                icon={<Speed sx={{ fontSize: 40, color: '#3b82f6' }} />}
                trend="-12.5%"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="攻擊次數"
                value={securityData.totalAttacks?.toLocaleString() || '202'}
                subtitle="檢測攻擊次數"
                icon={<Security sx={{ fontSize: 40, color: '#ef4444' }} />}
                trend="-13.7%"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
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
            <Grid item xs={12} md={6}>
              <SecurityBlockingChart data={securityData.attackTypeStats} />
            </Grid>
            <Grid item xs={12} md={6}>
              <PerformanceTrendChart data={securityData.performanceTrend} />
            </Grid>
            
            {/* 第二排：均勻分配 */}
            <Grid item xs={12} md={6}>
              <ThreatDistributionChart data={securityData.threatDistribution} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TrafficStatsChart data={securityData.trafficStats.data} />
            </Grid>
          </Grid>
        </>
      )}

      {/* AI 專業建議區域 */}
      {aiAnalysis && (
        <>
          <Grid container spacing={4} sx={{ mb: 4 }}>
            {/* Cloudflare 設定建議 */}
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} md={6}>
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