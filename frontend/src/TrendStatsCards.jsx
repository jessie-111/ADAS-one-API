import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Traffic,
  Public,
  Speed,
  Security
} from '@mui/icons-material';

function TrendStatsCards({ currentData, previousData, statistics, isVisible }) {
  if (!isVisible || !currentData || !previousData || !statistics) {
    return null;
  }

  // 格式化位元組顯示
  const formatBytes = (bytes) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes} B`;
  };

  // 獲取變化趨勢圖標和顏色
  const getTrendInfo = (changeRate) => {
    const rate = parseFloat(changeRate);
    if (rate > 5) {
      return { 
        icon: <TrendingUp />, 
        color: '#ff4757', 
        bgColor: 'rgba(255, 71, 87, 0.1)',
        label: '上升'
      };
    } else if (rate < -5) {
      return { 
        icon: <TrendingDown />, 
        color: '#2ed573', 
        bgColor: 'rgba(46, 213, 115, 0.1)',
        label: '下降'
      };
    } else {
      return { 
        icon: <TrendingFlat />, 
        color: '#70a1ff', 
        bgColor: 'rgba(112, 161, 255, 0.1)',
        label: '穩定'
      };
    }
  };

  // 統計卡片配置
  const statsConfig = [
    {
      title: '總請求流量',
      icon: <Traffic />,
      current: formatBytes(currentData.totalRequestTraffic),
      previous: formatBytes(previousData.totalRequestTraffic),
      changeRate: statistics.trafficChange.changeRate,
      description: '總流量對比'
    },
    {
      title: '攻擊來源 IP 數',
      icon: <Security />,
      current: currentData.totalRequests.toLocaleString(),
      previous: previousData.totalRequests.toLocaleString(),
      changeRate: statistics.requestsChange.changeRate,
      description: '攻擊請求總數變化'
    },
    {
      title: '攻擊IP數量',
      icon: <Public />,
      current: (currentData.attackIPs || 0).toLocaleString(),
      previous: (previousData.attackIPs || 0).toLocaleString(),
      changeRate: statistics.attackIPsChange?.changeRate || '0.00',
      description: '被判定為攻擊行為的IP地址數量'
    },
    {
      title: '平均請求大小',
      icon: <Speed />,
      current: formatBytes(currentData.avgTrafficPerRequest),
      previous: formatBytes(previousData.avgTrafficPerRequest),
      changeRate: statistics.avgTrafficChange.changeRate,
      description: '每個請求的平均流量大小'
    }
  ];

  const StatCard = ({ stat }) => {
    const trendInfo = getTrendInfo(stat.changeRate);
    
    return (
      <Card 
        elevation={3} 
        sx={{ 
          backgroundColor: '#22263a', 
          border: '1px solid #2a2d42',
          height: '100%',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: '#252a40',
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(73, 207, 255, 0.15)'
          }
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* 卡片標題和圖標 */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ 
              p: 1.5, 
              borderRadius: 2, 
              backgroundColor: '#49cfff20',
              color: '#49cfff',
              mr: 2
            }}>
              {stat.icon}
            </Box>
            <Typography variant="h6" sx={{ color: '#49cfff' }}>
              {stat.title}
            </Typography>
          </Box>

          {/* 當前數值 */}
          <Typography variant="h4" sx={{ 
            color: '#fff', 
            fontWeight: 'bold',
            mb: 1,
            lineHeight: 1.2
          }}>
            {stat.current}
          </Typography>

          {/* 上一時期對比 */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="body1" sx={{ color: '#8a8d9a', mr: 1 }}>
              上一時期: {stat.previous}
            </Typography>
          </Box>

          {/* 變化趨勢 */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Chip
              icon={trendInfo.icon}
              label={`${stat.changeRate}%`}
              sx={{
                backgroundColor: trendInfo.bgColor,
                color: trendInfo.color,
                fontWeight: 'bold',
                '& .MuiChip-icon': {
                  color: trendInfo.color
                }
              }}
            />
            <Typography sx={{ 
              fontSize: '0.8rem',
              color: trendInfo.color,
              fontWeight: 'medium'
            }}>
              {trendInfo.label}
            </Typography>
          </Box>

          {/* 描述 */}
          <Typography sx={{ 
            fontSize: '0.8rem',
            color: '#6c7293',
            mt: 1,
            display: 'block',
            lineHeight: 1.4
          }}>
            {stat.description}
          </Typography>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ color: '#49cfff', mb: 2 }}>
        📈 趨勢對比統計
      </Typography>
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
        gap: 2
      }}>
        {statsConfig.map((stat, index) => (
          <StatCard key={index} stat={stat} />
        ))}
      </Box>
    </Box>
  );
}

export default TrendStatsCards; 