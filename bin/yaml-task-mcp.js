#!/usr/bin/env node

/**
 * YAML Task MCP コマンドラインツール
 * 
 * このスクリプトは、yaml-task-mcp コマンドのエントリーポイントとして機能します。
 * NPMでグローバルインストールしたり、リポジトリから直接インストールする場合に使用します。
 */

import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import fs from 'fs';

// ESM環境で__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// パッケージのルートディレクトリを特定
const packageRoot = resolve(__dirname, '..');

// デフォルト設定
const defaultConfig = {
  PROJECT_ROOT: process.cwd(),
  TASK_PATH: `${process.cwd()}/tasks`,
  PORT: 3999,
  DEBUG: false
};

// 環境設定ファイルの読み込み
function loadConfig() {
  const configPath = resolve(process.cwd(), '.env.yaml-task-mcp');
  const config = { ...defaultConfig };
  
  if (fs.existsSync(configPath)) {
    console.log('環境設定を .env.yaml-task-mcp から読み込みました');
    
    const envContent = fs.readFileSync(configPath, 'utf8');
    envContent.split('\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
          config[key.trim()] = value.trim();
        }
      }
    });
  } else {
    console.log('デフォルト環境設定を使用します');
  }
  
  return config;
}

// MCPサーバーを起動
function startServer() {
  const config = loadConfig();
  
  console.log('=== 環境設定 ===');
  console.log(`PROJECT_ROOT: ${config.PROJECT_ROOT}`);
  console.log(`TASK_PATH: ${config.TASK_PATH}`);
  console.log(`PORT: ${config.PORT}`);
  console.log(`DEBUG: ${config.DEBUG}`);
  console.log('=================');
  
  // タスクディレクトリの確認と作成
  if (!fs.existsSync(config.TASK_PATH)) {
    console.log(`タスクディレクトリ ${config.TASK_PATH} が存在しないため作成します...`);
    fs.mkdirSync(config.TASK_PATH, { recursive: true });
    
    // サンプルYAMLファイルの作成
    const sampleTaskPath = resolve(config.TASK_PATH, 'main.yaml');
    if (!fs.existsSync(sampleTaskPath)) {
      const sampleContent = `tasks:
  - id: "sample-task-001"
    title: "サンプルタスク"
    status: "not_started"
    details:
      description: "これはサンプルタスクです。"
      priority: "MEDIUM"
      tags:
        - "サンプル"
        - "テスト"
`;
      fs.writeFileSync(sampleTaskPath, sampleContent, 'utf8');
      console.log(`サンプルタスクファイルを作成しました: ${sampleTaskPath}`);
    }
  }
  
  console.log('YAML Task MCPサーバーを起動します...');
  
  // MCPサーバーの起動
  const serverPath = resolve(packageRoot, 'mcp-server/yaml-task-mcp/dist/index.js');
  
  process.env.PROJECT_ROOT = config.PROJECT_ROOT;
  process.env.TASK_PATH = config.TASK_PATH;
  process.env.PORT = config.PORT;
  process.env.DEBUG = config.DEBUG;
  
  // 直接プロセスを置き換えてサーバーを起動
  const server = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: process.env
  });
  
  server.on('close', (code) => {
    console.log(`MCPサーバーが終了しました (コード: ${code})`);
  });
}

// 処理開始
try {
  startServer();
} catch (error) {
  console.error('エラーが発生しました:', error);
  process.exit(1);
} 