import React, { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import DDoSGraph from './DDoSGraph';
import AlertThresholdConfig from './AlertThresholdConfig';
import AISettingsConfig from './AISettingsConfig';
import DataSourceConfig from './DataSourceConfig';
import DDOSTable from './DDOSTable'; // 假設這個檔案存在
import AttackTrendComparison from './AttackTrendComparison';
import AttackIPChart from './AttackIPChart';

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
  const [aiConfig, setAiConfig] = useState({ apiKey: '', model: '' });

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="DDoS Attack Analysis Tabs">
          <Tab label="攻擊關聯圖" />
          <Tab label="攻擊來源" />
          <Tab label="攻擊IP圖表" />
          <Tab label="攻擊趨勢對比" />
          <Tab label="資料來源" />
          <Tab label="警報閾值設定" />
          <Tab label="AI分析設定" />
        </Tabs>
      </Box>
      
      <TabPanel value={value} index={0}>
        <DDoSGraph />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <DDOSTable />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <AttackIPChart />
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

