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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  LinearProgress
} from '@mui/material';
import { 
  Download, 
  Delete, 
  Schedule, 
  Storage, 
  Info, 
  GetApp,
  History,
  Settings,
  DataUsage
} from '@mui/icons-material';

const DataExportDashboard = ({ aiConfig }) => {
  // 狀態管理
  const [timeRange, setTimeRange] = useState('1h');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [exportOptions, setExportOptions] = useState({
    includeRawData: true,
    includeStats: true,
    includeCharts: true
  });
  const [exportHistory, setExportHistory] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState('');
  const [estimatedSize, setEstimatedSize] = useState('');

  // 深色主題樣式
  const darkInputSx = {
    '& .MuiOutlinedInput-root': {
      color: '#ffffff',
      '& fieldset': { borderColor: '#374151' },
      '&:hover fieldset': { borderColor: '#6b7280' },
      '&.Mui-focused fieldset': { borderColor: '#3b82f6' }
    },
    '& .MuiInputLabel-root': { color: '#9ca3af' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' }
  };

  // 載入匯出歷史
  useEffect(() => {
    loadExportHistory();
  }, []);

  // 預估檔案大小
  useEffect(() => {
    estimateFileSize();
  }, [timeRange, customStart, customEnd, exportOptions]);

  const loadExportHistory = () => {
    try {
      const history = JSON.parse(localStorage.getItem('exportHistory') || '[]');
      // 清理超過一天的記錄
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const validHistory = history.filter(item => new Date(item.exportTime) > oneDayAgo);
      // 限制最多3個檔案
      const limitedHistory = validHistory.slice(0, 3);
      
      setExportHistory(limitedHistory);
      // 更新localStorage
      localStorage.setItem('exportHistory', JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('載入匯出歷史失敗:', error);
    }
  };

  const estimateFileSize = () => {
    // 簡單的大小預估邏輯
    let size = 'N/A';
    if (timeRange === '1h') size = '1-5 MB';
    else if (timeRange === '6h') size = '5-20 MB';
    else if (timeRange === '24h') size = '20-100 MB';
    else if (timeRange === '7d') size = '100-500 MB';
    else if (customStart && customEnd) {
      const hours = Math.abs(new Date(customEnd) - new Date(customStart)) / (1000 * 60 * 60);
      if (hours <= 1) size = '1-5 MB';
      else if (hours <= 6) size = '5-20 MB';
      else if (hours <= 24) size = '20-100 MB';
      else size = '100+ MB';
    }
    setEstimatedSize(size);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setError('');

    try {
      setExportProgress(20);
      
      const requestBody = {
        timeRange: timeRange === 'custom' ? undefined : timeRange,
        startTime: timeRange === 'custom' ? customStart : undefined,
        endTime: timeRange === 'custom' ? customEnd : undefined,
        options: exportOptions
      };

      setExportProgress(50);

      const response = await fetch('http://localhost:8080/api/security-data-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      setExportProgress(80);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '匯出失敗');
      }

      // 獲取檔案名稱
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition?.split('filename="')[1]?.split('"')[0] || 'security_export.json';

      // 下載檔案
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      setExportProgress(100);

      // 更新匯出歷史
      const newExport = {
        id: Date.now(),
        filename: filename,
        size: `${(blob.size / (1024 * 1024)).toFixed(2)} MB`,
        exportTime: new Date().toISOString(),
        timeRange: timeRange === 'custom' ? `${customStart} ~ ${customEnd}` : timeRange,
        options: exportOptions
      };

      const updatedHistory = [newExport, ...exportHistory.slice(0, 2)]; // 保持最多3個
      setExportHistory(updatedHistory);
      localStorage.setItem('exportHistory', JSON.stringify(updatedHistory));

      // 重置進度
      setTimeout(() => {
        setExportProgress(0);
        setIsExporting(false);
      }, 1000);

    } catch (error) {
      console.error('匯出失敗:', error);
      setError(error.message);
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleDeleteHistory = (id) => {
    const updatedHistory = exportHistory.filter(item => item.id !== id);
    setExportHistory(updatedHistory);
    localStorage.setItem('exportHistory', JSON.stringify(updatedHistory));
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('zh-TW');
  };

  return (
    <Box sx={{ 
      p: 2, 
      backgroundColor: '#0f1419',
      minHeight: '100vh',
      color: '#ffffff'
    }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#ffffff', fontWeight: 'bold' }}>
          📁 資料匯出
        </Typography>
        <Typography variant="subtitle1" sx={{ color: '#94a3b8' }}>
          匯出防護分析資料為 JSON 格式檔案
        </Typography>
      </Box>

      {/* 錯誤提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>匯出錯誤</AlertTitle>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* 時間範圍設定區 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ 
            height: '100%',
            borderRadius: 3,
            backgroundColor: '#1e2837',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#ffffff', display: 'flex', alignItems: 'center' }}>
                <Schedule sx={{ mr: 1, color: '#3b82f6' }} />
                時間範圍設定
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2, ...darkInputSx }}>
                <InputLabel>時間範圍</InputLabel>
                <Select
                  value={timeRange}
                  label="時間範圍"
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  <MenuItem value="1h">最近 1 小時</MenuItem>
                  <MenuItem value="6h">最近 6 小時</MenuItem>
                  <MenuItem value="24h">最近 24 小時</MenuItem>
                  <MenuItem value="7d">最近 7 天</MenuItem>
                  <MenuItem value="custom">自訂範圍</MenuItem>
                </Select>
              </FormControl>

              {timeRange === 'custom' && (
                <Stack spacing={2}>
                  <TextField
                    label="開始時間"
                    type="datetime-local"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    sx={darkInputSx}
                  />
                  <TextField
                    label="結束時間"
                    type="datetime-local"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    sx={darkInputSx}
                  />
                </Stack>
              )}

              <Box sx={{ mt: 2, p: 2, backgroundColor: '#374151', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                  <DataUsage sx={{ mr: 1, fontSize: 16 }} />
                  預估檔案大小: <Chip label={estimatedSize} size="small" sx={{ ml: 1 }} />
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 匯出選項設定區 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ 
            height: '100%',
            borderRadius: 3,
            backgroundColor: '#1e2837',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#ffffff', display: 'flex', alignItems: 'center' }}>
                <Settings sx={{ mr: 1, color: '#10b981' }} />
                匯出選項
              </Typography>
              
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeStats}
                      onChange={(e) => setExportOptions({...exportOptions, includeStats: e.target.checked})}
                      sx={{ color: '#9ca3af' }}
                    />
                  }
                  label="統計摘要資料"
                  sx={{ color: '#e2e8f0' }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeRawData}
                      onChange={(e) => setExportOptions({...exportOptions, includeRawData: e.target.checked})}
                      sx={{ color: '#9ca3af' }}
                    />
                  }
                  label="原始日誌資料"
                  sx={{ color: '#e2e8f0' }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeCharts}
                      onChange={(e) => setExportOptions({...exportOptions, includeCharts: e.target.checked})}
                      sx={{ color: '#9ca3af' }}
                    />
                  }
                  label="圖表資料"
                  sx={{ color: '#e2e8f0' }}
                />
              </Stack>

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleExport}
                  disabled={isExporting}
                  startIcon={isExporting ? <CircularProgress size={20} /> : <GetApp />}
                  sx={{
                    background: isExporting 
                      ? 'linear-gradient(45deg, #6b7280 30%, #9ca3af 90%)'
                      : 'linear-gradient(45deg, #10b981 30%, #059669 90%)',
                    py: 1.5,
                    fontSize: '1.1rem'
                  }}
                >
                  {isExporting ? '匯出中...' : '開始匯出'}
                </Button>
                
                {isExporting && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={exportProgress} 
                      sx={{ 
                        height: 8, 
                        borderRadius: 4,
                        backgroundColor: '#374151',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#10b981'
                        }
                      }} 
                    />
                    <Typography variant="body2" sx={{ color: '#9ca3af', textAlign: 'center', mt: 1 }}>
                      {exportProgress}%
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 下載管理區 */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ 
            borderRadius: 3,
            backgroundColor: '#1e2837',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#ffffff', display: 'flex', alignItems: 'center' }}>
                <History sx={{ mr: 1, color: '#f59e0b' }} />
                匯出歷史 (最近 {exportHistory.length}/3 個檔案)
              </Typography>
              
              {exportHistory.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" sx={{ color: '#9ca3af' }}>
                    尚無匯出記錄
                  </Typography>
                </Box>
              ) : (
                <List>
                  {exportHistory.map((item) => (
                    <ListItem key={item.id} sx={{ 
                      backgroundColor: '#374151', 
                      borderRadius: 1, 
                      mb: 1,
                      '&:last-child': { mb: 0 }
                    }}>
                      <ListItemText
                        primary={
                          <Typography sx={{ color: '#ffffff' }}>
                            {item.filename}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                              {formatDateTime(item.exportTime)} • {item.size} • {item.timeRange}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          onClick={() => handleDeleteHistory(item.id)}
                          sx={{ color: '#ef4444' }}
                        >
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 資訊提示區 */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ 
            borderRadius: 3,
            backgroundColor: '#1e2837',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#ffffff', display: 'flex', alignItems: 'center' }}>
                <Info sx={{ mr: 1, color: '#6366f1' }} />
                功能說明
              </Typography>
              
              <Stack spacing={1}>
                <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                  • <strong>統計摘要資料</strong>: 包含攻擊類型分佈、阻擋率、響應時間等統計資訊
                </Typography>
                <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                  • <strong>原始日誌資料</strong>: 完整的 Cloudflare 安全事件原始記錄
                </Typography>
                <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                  • <strong>圖表資料</strong>: 用於重現視覺化圖表的時間序列資料
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af', mt: 2 }}>
                  💡 匯出檔案會自動包含時間範圍和匯出選項的詳細資訊
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                  📁 匯出歷史僅保存 24 小時，最多 3 個檔案
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DataExportDashboard;
