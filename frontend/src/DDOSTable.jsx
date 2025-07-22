import React from 'react';
import { Typography, Paper } from '@mui/material';

const DDOSTable = () => {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">攻擊來源</Typography>
      <Typography variant="body1">
        攻擊來源的詳細表格將在此處顯示。
      </Typography>
    </Paper>
  );
};

export default DDOSTable; 