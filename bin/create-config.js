#!/usr/bin/env node

/**
 * YAML Task MCP 設定ファイル生成スクリプト
 * 
 * このスクリプトは、パッケージのインストール後に実行され、
 * 必要な設定ファイルを生成します。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM環境で__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// パッケージのルートディレクトリを特定
const packageRoot = path.resolve(__dirname, '..');
const userDir = process.cwd();

// 実行権限を付与
try {
  const scriptPath = path.resolve(__dirname, 'yaml-task-mcp.js');
  fs.chmodSync(scriptPath, '755');
  console.log('実行スクリプトに実行権限を付与しました。');
} catch (error) {
  console.warn('実行権限の付与に失敗しましたが、処理を続行します:', error.message);
}

// MCP設定ファイルのサンプルを作成
try {
  const mcpJsonPath = path.resolve(userDir, 'mcp.json');
  
  // 既存のファイルがあるか確認
  let mcpConfig = { mcpServers: {} };
  
  if (fs.existsSync(mcpJsonPath)) {
    try {
      const existingContent = fs.readFileSync(mcpJsonPath, 'utf8');
      mcpConfig = JSON.parse(existingContent);
    } catch (e) {
      console.warn('既存のmcp.jsonの解析に失敗しました。新しく作成します。');
    }
  }
  
  // yaml-taskの設定を追加
  mcpConfig.mcpServers = mcpConfig.mcpServers || {};
  
  if (!mcpConfig.mcpServers['yaml-task']) {
    mcpConfig.mcpServers['yaml-task'] = {
      "command": "yaml-task-mcp",
      "env": {
        "PROJECT_ROOT": "${workspaceRoot}",
        "TASK_PATH": "${workspaceRoot}/tasks"
      }
    };
    
    // ファイルを書き出し
    fs.writeFileSync(mcpJsonPath, JSON.stringify(mcpConfig, null, 2), 'utf8');
    console.log(`mcp.jsonを作成しました: ${mcpJsonPath}`);
  } else {
    console.log('mcp.jsonにyaml-task設定が既に存在します。スキップします。');
  }
} catch (error) {
  console.error('mcp.jsonの作成中にエラーが発生しました:', error);
}

console.log('YAML Task MCP のセットアップが完了しました！');
console.log('');
console.log('使用方法:');
console.log('  1. コマンドラインから直接起動: yaml-task-mcp');
console.log('  2. Cursorエディタでの使用: @mcp yaml-task コマンド');
console.log('');
console.log('詳細な使用方法はドキュメントを参照してください。');
console.log(''); 