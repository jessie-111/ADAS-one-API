import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  AlertTitle,
  CircularProgress,
  LinearProgress,
  Chip,
  Paper
} from '@mui/material';
import {
  Timeline,
  Psychology,
  CheckCircle,
  Error,
  Schedule
} from '@mui/icons-material';
import TrafficComparisonChart from './TrafficComparisonChart';
import TrendStatsCards from './TrendStatsCards';
import TrendAnalysisResults from './TrendAnalysisResults';

function AttackTrendComparison() {
  const [timeRange, setTimeRange] = useState('7d');
  const [trendData, setTrendData] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  
  // 載入狀態管理
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    isComplete: false,
    error: null
  });

  // 分批查詢進度狀態
  const [queryProgress, setQueryProgress] = useState({
    totalBatches: 0,
    completedBatches: 0,
    currentBatch: 0,
    failedBatches: 0,
    method: 'single', // 'single' 或 'batch'
    details: []
  });
  
  // AI分析狀態管理
  const [analysisState, setAnalysisState] = useState({
    isLoading: false,
    isComplete: false,
    error: null
  });

  // 時間範圍選項
  const TIME_RANGES = [
    { value: '1h', label: '1小時對比', display: '1小時 vs 上1小時' },
    { value: '6h', label: '6小時對比', display: '6小時 vs 上6小時' },
    { value: '1d', label: '1天對比', display: '今天 vs 昨天' },
    { value: '3d', label: '3天對比', display: '近3天 vs 上3天' },
    { value: '7d', label: '7天對比', display: '本週 vs 上週' },
    { value: '30d', label: '30天對比', display: '本月 vs 上月' }
  ];

  // 載入趨勢圖表資料
  const handleLoadTrendData = async () => {
    setLoadingState({ isLoading: true, isComplete: false, error: null });
    
    // 重置進度狀態
    setQueryProgress({
      totalBatches: 0,
      completedBatches: 0,
      currentBatch: 0,
      failedBatches: 0,
      method: 'single',
      details: []
    });
    
    try {
      console.log(`🔍 載入 ${timeRange} 趨勢對比資料...`);
      
      const response = await fetch('http://localhost:8080/api/load-trend-comparison', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ timeRange })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // 如果有查詢進度信息，也要顯示
        if (errorData.queryInfo) {
          setQueryProgress({
            totalBatches: errorData.queryInfo.totalBatches || 0,
            completedBatches: errorData.queryInfo.completedBatches || 0,
            currentBatch: 0,
            failedBatches: errorData.queryInfo.failedBatches || 0,
            method: errorData.queryInfo.totalBatches > 1 ? 'batch' : 'single',
            details: errorData.queryInfo.progressLog || []
          });
        }
        
        throw new Error(errorData.error || `載入失敗: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('✅ 趨勢資料載入成功:', result);
      
      // 處理查詢進度信息
      if (result.queryInfo) {
        setQueryProgress({
          totalBatches: result.queryInfo.totalBatches || 1,
          completedBatches: result.queryInfo.successfulBatches || 1,
          currentBatch: result.queryInfo.totalBatches || 1,
          failedBatches: result.queryInfo.failedBatches || 0,
          method: result.queryInfo.queryMethod || 'single',
          details: result.queryInfo.progressLog || []
        });
      }
      
      setTrendData(result);
      setLoadingState({ isLoading: false, isComplete: true, error: null });
      
      // 清除之前的AI分析結果
      setAiAnalysis(null);
      setAnalysisState({ isLoading: false, isComplete: false, error: null });
      
    } catch (error) {
      console.error('❌ 趨勢資料載入失敗:', error);
      setLoadingState({ isLoading: false, isComplete: false, error: error.message });
    }
  };

  // AI 趨勢分析
  const handleAITrendAnalysis = async () => {
    if (!trendData) {
      setAnalysisState(prev => ({ ...prev, error: '請先載入趨勢圖表資料' }));
      return;
    }
    
    setAnalysisState({ isLoading: true, isComplete: false, error: null });

    try {
      console.log('🤖 開始 AI 趨勢分析...');
      
      const apiKey = localStorage.getItem('gemini_api_key');
      const model = localStorage.getItem('gemini_model') || 'gemini-1.5-pro';
      
      if (!apiKey) {
        throw new Error('請先在「AI分析設定」頁面設定 Gemini API Key');
      }

      const response = await fetch('http://localhost:8080/api/analyze-attack-trends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey,
          model,
          currentData: trendData.currentPeriod,
          previousData: trendData.previousPeriod,
          periods: trendData.periods
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI分析失敗');
      }

      const result = await response.json();
      
      console.log('✅ AI趨勢分析完成');
      
      setAiAnalysis(result.trendAnalysis);
      try {
        const recommendations = [];
        if (result?.trendAnalysis?.cloudflareRecommendations) {
          for (const rec of result.trendAnalysis.cloudflareRecommendations) {
            if (typeof rec === 'string') recommendations.push(rec);
            else if (rec?.action) recommendations.push(rec.action);
          }
        }
        window.dispatchEvent(new CustomEvent('ai:analysisContext', {
          detail: {
            title: 'AI 趨勢分析建議',
            recommendations
          }
        }));
      } catch (e) {
        // 靜默
      }
      setAnalysisState({ isLoading: false, isComplete: true, error: null });
      
    } catch (error) {
      console.error('❌ AI趨勢分析失敗:', error);
      setAnalysisState({ isLoading: false, isComplete: false, error: error.message });
    }
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#22263a', color: '#fff', borderRadius: 2, minHeight: '100vh' }}>
      {/* 頁面標題 */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ 
          color: '#49cfff', 
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2
        }}>
          <Timeline fontSize="large" />
          攻擊趨勢對比分析
        </Typography>
        <Typography variant="h6" sx={{ color: '#8a8d9a' }}>
          攻擊流量趨勢深度對比
        </Typography>
      </Box>
      
      {/* 控制區域 */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: 3, 
        mb: 4,
        p: 3,
        backgroundColor: '#1a1b2d',
        borderRadius: 2,
        border: '1px solid #2a2d42'
      }}>
        <FormControl sx={{ minWidth: 250 }}>
          <InputLabel sx={{ color: '#b5b8c6' }}>選擇對比時間範圍</InputLabel>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            sx={{ 
              color: '#fff', 
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#49cfff'
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#49cfff'
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#49cfff'
              }
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: '#1a1b2d',
                  border: '1px solid #2a2d42'
                }
              }
            }}
          >
            {TIME_RANGES.map(range => (
              <MenuItem 
                key={range.value} 
                value={range.value}
                sx={{ 
                  color: '#fff',
                  '&:hover': {
                    backgroundColor: '#2a2d42'
                  }
                }}
              >
                {range.display}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleLoadTrendData}
          disabled={loadingState.isLoading}
          startIcon={loadingState.isLoading ? <CircularProgress size={20} color="inherit" /> : <Timeline />}
          sx={{ 
            minWidth: 200,
            py: 1.5,
            backgroundColor: '#49cfff',
            '&:hover': {
              backgroundColor: '#3a9bd1'
            }
          }}
        >
          {loadingState.isLoading ? '載入中...' : '📊 載入趨勢圖表'}
        </Button>
      </Box>

      {/* 錯誤提示 */}
      {loadingState.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>載入失敗</AlertTitle>
          {loadingState.error}
        </Alert>
      )}

      {/* 查詢進度顯示 */}
      {(loadingState.isLoading || queryProgress.totalBatches > 0) && (
        <Paper sx={{ 
          p: 3, 
          mb: 3, 
          backgroundColor: '#1a1b2d', 
          border: '1px solid #2a2d42',
          borderRadius: 2 
        }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#49cfff', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Schedule />
            查詢進度 {queryProgress.method === 'batch' ? '(分批查詢)' : '(單次查詢)'}
          </Typography>
          
          {queryProgress.totalBatches > 1 && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#b5b8c6', minWidth: 100 }}>
                  批次進度:
                </Typography>
                <Box sx={{ flexGrow: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={queryProgress.totalBatches > 0 ? (queryProgress.completedBatches / queryProgress.totalBatches) * 100 : 0}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#2a2d42',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: queryProgress.failedBatches > 0 ? '#ff9800' : '#49cfff'
                      }
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: '#fff', minWidth: 80 }}>
                  {queryProgress.completedBatches}/{queryProgress.totalBatches}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                <Chip 
                  icon={<CheckCircle />} 
                  label={`成功: ${queryProgress.completedBatches}`}
                  size="small"
                  sx={{ 
                    backgroundColor: '#4caf50', 
                    color: '#fff',
                    '& .MuiChip-icon': { color: '#fff' }
                  }}
                />
                {queryProgress.failedBatches > 0 && (
                  <Chip 
                    icon={<Error />} 
                    label={`失敗: ${queryProgress.failedBatches}`}
                    size="small"
                    sx={{ 
                      backgroundColor: '#f44336', 
                      color: '#fff',
                      '& .MuiChip-icon': { color: '#fff' }
                    }}
                  />
                )}
                <Chip 
                  label={`總記錄: ${trendData?.queryInfo?.totalRecords || 0}`}
                  size="small"
                  sx={{ backgroundColor: '#2a2d42', color: '#b5b8c6' }}
                />
              </Box>
            </>
          )}
          
          {loadingState.isLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={20} sx={{ color: '#49cfff' }} />
              <Typography variant="body2" sx={{ color: '#b5b8c6' }}>
                {queryProgress.method === 'batch' 
                  ? `正在處理批次查詢... (${timeRange} 範圍)`
                  : `正在載入數據... (${timeRange} 範圍)`}
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* 統計卡片 */}
      <TrendStatsCards 
        currentData={trendData?.currentPeriod}
        previousData={trendData?.previousPeriod}
        statistics={trendData?.statistics}
        isVisible={loadingState.isComplete && trendData}
      />

      {/* 趨勢對比圖表 */}
      <TrafficComparisonChart 
        chartData={trendData?.comparisonChart}
        isLoading={loadingState.isLoading}
      />

      {/* AI 趨勢分析按鈕 */}
      {loadingState.isComplete && trendData && (
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Button
            variant="contained"
            color="success"
            size="large"
            onClick={handleAITrendAnalysis}
            disabled={analysisState.isLoading}
            startIcon={analysisState.isLoading ? <CircularProgress size={20} color="inherit" /> : <Psychology />}
            sx={{
              background: 'linear-gradient(45deg, #2E7D32, #4CAF50)',
              boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
              fontSize: '16px',
              padding: '12px 32px',
              minWidth: 220,
              '&:hover': {
                background: 'linear-gradient(45deg, #1B5E20, #388E3C)',
                boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)',
              },
              '&:disabled': {
                background: 'linear-gradient(45deg, #424242, #616161)',
              }
            }}
          >
            {analysisState.isLoading ? 'AI 分析中...' : '🤖 AI 趨勢分析'}
          </Button>
          
          {/* 分析說明 */}
          <Typography variant="body1" sx={{ color: '#8a8d9a', mt: 2 }}>
            點擊按鈕進行深度 AI 分析，比較兩個時期的攻擊模式變化和威脅趨勢
          </Typography>
        </Box>
      )}

      {/* AI 分析狀態提示 */}
      {analysisState.isLoading && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>🤖 AI 正在分析趨勢變化</AlertTitle>
          正在比較兩個時期的攻擊資料並生成深度趨勢分析報告，請稍候...
        </Alert>
      )}

      {analysisState.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>AI 分析失敗</AlertTitle>
          {analysisState.error}
        </Alert>
      )}

      {/* AI 分析結果 */}
      {analysisState.isComplete && aiAnalysis && (
        <TrendAnalysisResults analysis={aiAnalysis} />
      )}

      {/* 無資料時的提示 */}
      {!loadingState.isLoading && !loadingState.isComplete && !loadingState.error && (
        <Box sx={{ 
          textAlign: 'center', 
          py: 8,
          backgroundColor: '#1a1b2d',
          borderRadius: 2,
          border: '2px dashed #2a2d42'
        }}>
          <Timeline sx={{ fontSize: 80, color: '#2a2d42', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#6c7293', mb: 2 }}>
            開始攻擊趨勢對比分析
          </Typography>
          <Typography variant="body1" sx={{ color: '#8a8d9a', mb: 3 }}>
            選擇時間範圍後，點擊「載入趨勢圖表」按鈕開始分析
          </Typography>
          <Typography variant="body1" sx={{ color: '#6c7293' }}>
            系統將自動對比兩個時期的攻擊流量資料
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default AttackTrendComparison; 