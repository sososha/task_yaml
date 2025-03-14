# YAML Task Management MCP Server

YAMLベースのタスク管理システムを提供するModel Context Protocol (MCP) サーバーです。

## 機能

- YAMLファイルを使用したタスク管理
- 階層的なタスク構造のサポート
- タスクの詳細情報（説明、優先度、依存関係など）
- 進捗状況の追跡と可視化
- プロジェクト分析による自動タスク生成
- MCPを通じたタスク管理機能の提供

## インストール

```bash
# グローバルインストール（推奨）
npm install -g yaml-task-mcp

# または、ローカルインストール
git clone https://github.com/yourusername/yaml-task-mcp.git
cd yaml-task-mcp
npm install
npm run build
```

## 使い方

### サーバーの起動

```bash
# グローバルインストールした場合
yaml-task-mcp

# ローカルインストールした場合
npm start

# オプションでポート指定
PORT=4000 yaml-task-mcp
```

デフォルトでは、サーバーはポート3000で起動します。

### Cursorエディタでの使用

1. Cursorエディタをインストールします（https://cursor.sh/）
2. 以下のいずれかの方法でMCP設定を行います：

#### A. グローバルインストールの場合

以下の内容で `~/.config/cursor/mcp.json` ファイルを作成します（Windowsの場合は `%APPDATA%\cursor\mcp.json`）：

```json
{
  "mcpServers": {
    "yaml-task": {
      "command": "npx",
      "args": ["--yes", "yaml-task-mcp"],
      "env": {}
    }
  }
}
```

#### B. ローカルインストールの場合

以下の内容で `~/.config/cursor/mcp.json` ファイルを作成します（パスは適宜変更してください）：

```json
{
  "mcpServers": {
    "yaml-task": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/yaml-task-mcp",
      "env": {
        "PORT": "3000"
      }
    }
  }
}
```

3. Cursorエディタを再起動します
4. 以下のプロンプトでYAMLタスク管理を使用できます：

```
@mcp yaml-task help
```

### 環境変数

- `PORT`: サーバーのポート番号（デフォルト: 3000）
- `TASK_CONFIG_PATH`: 設定ファイルのパス（デフォルト: `./.task-config.yaml`）

### 設定ファイル

`.task-config.yaml` ファイルで以下の設定ができます：

```yaml
port: 3000
defaultTaskFile: tasks/main.yaml
tasksDirectory: ./tasks
```

## MCPリソース

- `tasks://list?file=<ファイル名>`: タスクの一覧表示
- `tasks://detail/{taskId}?file=<ファイル名>`: 特定のタスクの詳細表示
- `tasks://report?file=<ファイル名>`: プロジェクトの進捗レポート

## MCPツール

- `create-task`: 新しいタスクを作成
- `update-task`: 既存のタスクを更新
- `delete-task`: タスクを削除
- `update-task-progress`: タスクの進捗状態を更新
- `batch-update-tasks`: 複数のタスクを一括して更新
- `initialize-task-environment`: タスク管理環境を初期化
- `analyze-project-and-create-tasks`: プロジェクトを分析し、タスクを自動生成

## MCPプロンプト

- `create-task-guide`: タスク作成の使い方ガイド
- `update-task-guide`: タスク更新の使い方ガイド
- `update-task-progress-guide`: タスク進捗更新の使い方ガイド
- `batch-update-tasks-guide`: タスク一括更新の使い方ガイド
- `initialize-task-environment-guide`: タスク環境初期化の使い方ガイド
- `analyze-project-guide`: プロジェクト分析の使い方ガイド
- `help`: 全体のヘルプ表示

## Cursorでの使用例

```
# タスク一覧を表示
@mcp yaml-task tasks://list?file=tasks/main.yaml

# タスク作成ガイドを表示
@mcp yaml-task create-task-guide

# 新しいタスクを作成
@mcp yaml-task create-task {
  "title": "設計書を作成する",
  "status": "not_started",
  "details": {
    "description": "プロジェクトの設計書を作成する",
    "priority": "HIGH"
  }
}

# プロジェクト分析を実行
@mcp yaml-task analyze-project-and-create-tasks {
  "projectPath": "./src",
  "outputFile": "tasks/project-analysis.yaml"
}
```

## ディレクトリ構造

```
yaml-task-mcp/
├── src/
│   ├── models/        # データモデル定義
│   ├── services/      # ビジネスロジック
│   ├── resources/     # MCPリソース
│   ├── tools/         # MCPツール
│   ├── prompts/       # MCPプロンプト
│   ├── types/         # 型定義
│   └── index.ts       # エントリーポイント
├── examples/          # 設定例
│   ├── cursor-mcp.json        # Cursor用MCP設定
│   └── cursor-local-mcp.json  # ローカル開発用設定
├── tasks/             # タスクファイル保存ディレクトリ
├── tsconfig.json      # TypeScript設定
├── package.json       # プロジェクト設定
└── README.md          # このファイル
```

## ライセンス

ISC 