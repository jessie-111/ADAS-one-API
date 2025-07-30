import React, { useState } from 'react';
import { Tabs, Tab, Box, CircularProgress, Button, Typography, Alert, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Security, CheckCircleOutline } from '@mui/icons-material';
import DDoSGraph from './DDoSGraph';
import TrafficTrend from './TrafficTrend';
import AlertThresholdConfig from './AlertThresholdConfig';
import AISettingsConfig from './AISettingsConfig';
import DataSourceConfig from './DataSourceConfig';
import DDOSTable from './DDOSTable'; // 假設這個檔案存在
import AttackTrendComparison from './AttackTrendComparison';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const DDOSTabbedView = () => {
  const [value, setValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState('');
  const [aiConfig, setAiConfig] = useState({ apiKey: '', model: '' });

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
  
  const handleAnalyzeLog = async () => {
    setIsLoading(true);
    setError('');
    setAnalysisResult(null);
    try {
      const response = await fetch('http://localhost:8080/api/analyze-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiConfig),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '分析失敗');
      }
      const result = await response.json();
      setAnalysisResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 2 }}>
        <Tabs value={value} onChange={handleChange} aria-label="DDoS Attack Analysis Tabs">
          <Tab label="攻擊關聯圖" />
          <Tab label="攻擊來源" />
          <Tab label="流量趨勢" />
          <Tab label="攻擊趨勢對比" />
          <Tab label="資料來源" />
          <Tab label="警報閾值設定" />
          <Tab label="AI分析設定" />
        </Tabs>
        <Button
          variant="contained"
          color="primary"
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <Security />}
          onClick={handleAnalyzeLog}
          disabled={isLoading}
        >
          {isLoading ? '分析中...' : '分析日誌檔案'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
      
      {analysisResult && (
        <Paper elevation={3} sx={{ m: 2, p: 2 }}>
          <Typography variant="h6" gutterBottom>AI 分析報告</Typography>
          <Typography variant="body1" paragraph><strong>總結：</strong> {analysisResult.summary}</Typography>
          <Typography variant="h6" gutterBottom>建議措施：</Typography>
          <List>
            {analysisResult.recommendations.map((rec, index) => (
              <ListItem key={index}>
                <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                <ListItemText primary={rec} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
      
      <TabPanel value={value} index={0}>
        <DDoSGraph />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <DDOSTable />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <TrafficTrend />
      </TabPanel>
      <TabPanel value={value} index={3}>
        <AttackTrendComparison />
      </TabPanel>
      <TabPanel value={value} index={4}>
        <DataSourceConfig />
      </TabPanel>
      <TabPanel value={value} index={5}>
        <AlertThresholdConfig />
      </TabPanel>
      <TabPanel value={value} index={6}>
        <AISettingsConfig onConfigChange={setAiConfig} />
      </TabPanel>
    </Box>
  );
};

export default DDOSTabbedView;

