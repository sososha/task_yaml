#!/bin/bash

# YAML Task MCPサーバー起動スクリプト
# 推奨設定でサーバーを起動します

# カレントディレクトリをプロジェクトルートに設定
cd "$(dirname "$0")"

# 環境変数を.envファイルから読み込む
if [ -f .env.yaml-task-mcp ]; then
  source .env.yaml-task-mcp
  echo "環境設定を .env.yaml-task-mcp から読み込みました"
else
  # .envファイルがない場合はデフォルト設定を使用
  PROJECT_ROOT="$(pwd)"
  TASK_PATH="$(pwd)/tasks"
  PORT=3999
  DEBUG=true
  echo "デフォルト環境設定を使用します"
fi

echo "=== 環境設定 ==="
echo "PROJECT_ROOT: $PROJECT_ROOT"
echo "TASK_PATH: $TASK_PATH"
echo "PORT: $PORT"
echo "DEBUG: $DEBUG"
echo "================="

# MCPサーバーを起動
echo "YAML Task MCPサーバーを起動します..."
PROJECT_ROOT="$PROJECT_ROOT" \
TASK_PATH="$TASK_PATH" \
PORT="$PORT" \
DEBUG="$DEBUG" \
node mcp-server/yaml-task-mcp/dist/index.js 