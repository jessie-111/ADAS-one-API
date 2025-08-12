#!/usr/bin/env node
// 攻擊路徑分類測試工具
const { ATTACK_PATH_CATEGORIES, categorizeAttackPathByConfig } = require('../config/elkConfig');

console.log('🔍 攻擊路徑分類測試工具\n');

// 如果有命令行參數，測試指定的 URL
if (process.argv.length > 2) {
  const testUrls = process.argv.slice(2);
  console.log('📝 測試自定義 URL:');
  testUrls.forEach(url => {
    const result = categorizeAttackPathByConfig(url);
    console.log(`  ${url}`);
    console.log(`  └─ ${result.category} (${result.matchedPattern || '無匹配'})`);
    console.log(`     ${result.description}\n`);
  });
} else {
  // 否則顯示所有可用分類和範例
  console.log('📋 目前支援的攻擊類型:');
  Object.entries(ATTACK_PATH_CATEGORIES).forEach(([category, config], index) => {
    console.log(`${index + 1}. ${category}`);
    console.log(`   模式: ${config.patterns.join(', ')}`);
    console.log(`   說明: ${config.description}\n`);
  });

  // 測試每個類型的第一個模式
  console.log('🧪 範例測試:');
  Object.entries(ATTACK_PATH_CATEGORIES).forEach(([category, config]) => {
    const testUrl = `/${config.patterns[0]}`;
    const result = categorizeAttackPathByConfig(testUrl);
    const status = result.category === category ? '✅' : '❌';
    console.log(`${status} ${testUrl} -> ${result.category}`);
  });

  console.log('\n💡 使用方式:');
  console.log('  node scripts/test-attack-categories.js [URL1] [URL2] ...');
  console.log('  範例: node scripts/test-attack-categories.js "/.env" "/admin/login"');
} 