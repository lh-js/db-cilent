#!/usr/bin/env node

/**
 * 检查 mysql2 的所有依赖，确保它们都在 package.json 中
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// mysql2 及其所有依赖
const requiredDeps = [
  'mysql2',
  'sqlstring',
  'denque',
  'lru.min',
  'iconv-lite',
  'named-placeholders',
  'generate-function',
  'long',
  'seq-queue',
  'safer-buffer',
];

const missingDeps = [];

requiredDeps.forEach(dep => {
  if (!packageJson.dependencies[dep]) {
    missingDeps.push(dep);
  }
});

if (missingDeps.length > 0) {
  console.error('❌ 缺少以下依赖:');
  missingDeps.forEach(dep => console.error(`  - ${dep}`));
  console.error('\n运行以下命令安装:');
  console.error(`pnpm add ${missingDeps.join(' ')}`);
  process.exit(1);
} else {
  console.log('✅ 所有必需的依赖都已安装');
}

