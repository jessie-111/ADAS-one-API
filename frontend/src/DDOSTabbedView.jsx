import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import SecurityAnalysisDashboard from './SecurityAnalysisDashboard';
import AlertThresholdConfig from './AlertThresholdConfig';
import AISettingsConfig from './AISettingsConfig';
import DataSourceConfig from './DataSourceConfig';
import AttackTrendComparison from './AttackTrendComparison';
import DataExportDashboard from './DataExportDashboard';


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
        <Box sx={{ p: 1 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const DDOSTabbedView = () => {
  const [value, setValue] = useState(0);
  const [aiConfig, setAiConfig] = useState({
    provider: 'gemini',
    gemini: { apiKey: '', selectedModel: '' },
    ollama: { apiUrl: 'http://localhost:11434', selectedModel: '' }
  });

  // 從 localStorage 載入 AI 設定
  useEffect(() => {
    console.log('🔄 載入 AI 設定從 localStorage...');
    
    // 載入 AI 提供商選擇
    const savedProvider = localStorage.getItem('ai_provider') || 'gemini';
    
    // 載入 Gemini 配置
    const savedGeminiApiKey = localStorage.getItem('gemini_api_key') || '';
    const savedGeminiModel = localStorage.getItem('gemini_model') || '';
    
    // 載入 Ollama 配置
    const savedOllamaUrl = localStorage.getItem('ollama_api_url') || 'http://localhost:11434';
    const savedOllamaModel = localStorage.getItem('ollama_model') || '';
    
    // 更新 aiConfig 狀態
    const newAiConfig = {
      provider: savedProvider,
      gemini: { 
        apiKey: savedGeminiApiKey,
        selectedModel: savedGeminiModel 
      },
      ollama: { 
        apiUrl: savedOllamaUrl,
        selectedModel: savedOllamaModel 
      }
    };
    
    setAiConfig(newAiConfig);
    console.log('✅ AI 設定載入完成:', {
      provider: savedProvider,
      hasGeminiKey: !!savedGeminiApiKey,
      geminiModel: savedGeminiModel,
      ollamaUrl: savedOllamaUrl,
      ollamaModel: savedOllamaModel
    });
  }, []);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="DDoS Attack Analysis Tabs">
          <Tab label="防護分析" />
          <Tab label="攻擊趨勢對比" />
          <Tab label="資料來源" />
          <Tab label="警報閾值設定" />
          <Tab label="AI分析設定" />
          <Tab label="資料匯出" />
        </Tabs>
      </Box>
      
      <TabPanel value={value} index={0}>
        <SecurityAnalysisDashboard aiConfig={aiConfig} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <AttackTrendComparison />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <DataSourceConfig />
      </TabPanel>
      <TabPanel value={value} index={3}>
        <AlertThresholdConfig />
      </TabPanel>
      <TabPanel value={value} index={4}>
        <AISettingsConfig onConfigChange={setAiConfig} />
      </TabPanel>
      <TabPanel value={value} index={5}>
        <DataExportDashboard aiConfig={aiConfig} />
      </TabPanel>
    </Box>
  );
};

export default DDOSTabbedView;

