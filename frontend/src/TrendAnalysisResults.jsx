import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Divider,
  Chip
} from '@mui/material';
import {
  Psychology,
  Timeline,
  TrendingUp,
  Security
} from '@mui/icons-material';

function TrendAnalysisResults({ analysis }) {
  if (!analysis) {
    return null;
  }

  // 將分析文字按段落分割
  const formatAnalysisText = (text) => {
    if (!text) return [];
    
    // 分割段落並清理空白行
    const paragraphs = text.split('\n').filter(line => line.trim());
    const formattedParagraphs = [];
    let currentSection = { title: '', content: [] };
    
    paragraphs.forEach(paragraph => {
      const trimmed = paragraph.trim();
      
      // 檢查是否是標題（包含**或數字開頭）
      if (trimmed.match(/^\*\*.*\*\*/) || trimmed.match(/^\d+\./) || trimmed.match(/^#+\s/)) {
        // 如果有累積的內容，先加入前一個section
        if (currentSection.title || currentSection.content.length > 0) {
          formattedParagraphs.push(currentSection);
        }
        
        // 開始新的section
        currentSection = {
          title: trimmed.replace(/\*\*/g, '').replace(/^#+\s/, '').replace(/^\d+\.\s*/, ''),
          content: []
        };
      } else if (trimmed) {
        // 加入內容
        currentSection.content.push(trimmed);
      }
    });
    
    // 加入最後一個section
    if (currentSection.title || currentSection.content.length > 0) {
      formattedParagraphs.push(currentSection);
    }
    
    return formattedParagraphs;
  };

  const formattedSections = formatAnalysisText(analysis);

  return (
    <Paper elevation={3} sx={{ p: 4, mb: 3, backgroundColor: '#22263a' }}>
      {/* 標題區域 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Box sx={{ 
          p: 2, 
          borderRadius: 3, 
          backgroundColor: '#4CAF50',
          color: '#fff',
          mr: 2
        }}>
          <Psychology fontSize="large" />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ color: '#49cfff', fontWeight: 'bold' }}>
            🤖 AI 攻擊趨勢分析報告
          </Typography>
          <Typography variant="body1" sx={{ color: '#8a8d9a', mt: 0.5 }}>
            深度流量趨勢對比分析
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: '#2a2d42', mb: 3 }} />

      {/* 分析內容 */}
      <Box sx={{ lineHeight: 1.8 }}>
        {formattedSections.map((section, index) => (
          <Box key={index} sx={{ mb: 3 }}>
            {/* Section標題 */}
            {section.title && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ 
                  color: '#49cfff',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  {section.title.includes('流量') && <Timeline />}
                  {section.title.includes('趨勢') && <TrendingUp />}
                  {section.title.includes('威脅') && <Security />}
                  {section.title}
                </Typography>
              </Box>
            )}
            
            {/* Section內容 */}
            {section.content.map((paragraph, pIndex) => {
              // 檢查是否是重點項目（以 - 或 • 開頭）
              if (paragraph.match(/^[-•]\s/)) {
                return (
                  <Box key={pIndex} sx={{ ml: 2, mb: 1 }}>
                    <Typography variant="body1" sx={{ 
                      color: '#e8eaed',
                      display: 'flex',
                      alignItems: 'flex-start'
                    }}>
                      <Box sx={{ 
                        width: 6, 
                        height: 6, 
                        backgroundColor: '#49cfff', 
                        borderRadius: '50%',
                        mt: 1,
                        mr: 2,
                        flexShrink: 0
                      }} />
                      {paragraph.replace(/^[-•]\s/, '')}
                    </Typography>
                  </Box>
                );
              }
              
              // 檢查是否包含百分比或數字（突出顯示）
              const hasNumbers = paragraph.match(/\d+(\.\d+)?%|\d+(\.\d+)?\s*(GB|MB|KB|B|次|個|IP)/);
              
              return (
                <Typography 
                  key={pIndex} 
                  variant="body1" 
                  sx={{ 
                    color: '#e8eaed',
                    mb: 2,
                    textAlign: 'justify',
                    backgroundColor: hasNumbers ? 'rgba(73, 207, 255, 0.05)' : 'transparent',
                    padding: hasNumbers ? '12px 16px' : '0',
                    borderRadius: hasNumbers ? 2 : 0,
                    border: hasNumbers ? '1px solid rgba(73, 207, 255, 0.2)' : 'none'
                  }}
                >
                  {paragraph}
                </Typography>
              );
            })}
          </Box>
        ))}
      </Box>

      {/* 底部資訊 */}
      <Divider sx={{ borderColor: '#2a2d42', my: 3 }} />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label="AI 生成"
            size="small"
            sx={{
              backgroundColor: 'rgba(76, 175, 80, 0.2)',
              color: '#4CAF50',
              fontWeight: 'bold'
            }}
          />
          <Chip
            label="趨勢對比分析"
            size="small"
            sx={{
              backgroundColor: 'rgba(73, 207, 255, 0.2)',
              color: '#49cfff',
              fontWeight: 'bold'
            }}
          />
        </Box>
        
        <Typography sx={{ fontSize: '0.8rem', color: '#6c7293' }}>
          攻擊流量趨勢深度分析
        </Typography>
      </Box>
    </Paper>
  );
}

export default TrendAnalysisResults; 