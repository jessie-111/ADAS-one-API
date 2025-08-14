// Cloudflare 文件推薦服務（第一版：白名單映射表）
// - 輸入：意圖或關鍵字
// - 輸出：推薦連結與簡短摘要

const CLOUD_FLARE_DOCS = 'https://developers.cloudflare.com/';
const CF_SEQUENCE_RULES = 'https://developers.cloudflare.com/waf/custom-rules/use-cases/sequence-custom-rules/';

function getMapping() {
  return [
    {
      intents: ['geo blocking', 'country block', 'ip 國別', '國別封鎖', '封鎖特定國別'],
      url: CF_SEQUENCE_RULES,
      title: '建立序列規則與條件（可含國別）',
      summary: '在 Cloudflare WAF 自訂規則中建立序列/條件（如國別、端點順序、時間窗），用以快速封鎖或挑戰來自特定來源的流量。'
    },
    {
      intents: ['default', 'help', 'docs', 'cloudflare'],
      url: CLOUD_FLARE_DOCS,
      title: 'Cloudflare Docs',
      summary: 'Cloudflare 開發文件入口，涵蓋 Workers、WAF、自訂規則、Zero Trust 等設定教學與範例。'
    }
  ];
}

function recommendByIntent(intentsOrText = '') {
  const text = Array.isArray(intentsOrText) ? intentsOrText.join(' ').toLowerCase() : String(intentsOrText || '').toLowerCase();
  const mapping = getMapping();
  for (const m of mapping) {
    if (m.intents.some(k => text.includes(k.toLowerCase()))) return [m];
  }
  // fallback
  return [mapping[mapping.length - 1]];
}

module.exports = {
  recommendByIntent
};

