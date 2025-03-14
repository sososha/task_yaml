# YAML Task Management MCP Server

YAMLベースのタスク管理システムを提供するModel Context Protocol (MCP) サーバーです。標準的なYAML形式でタスクを管理できます。

## 機能

- 標準YAML形式を使用したタスク管理
- シンプルで直感的なタスク構造のサポート
- タスクの詳細情報（説明、優先度、タグ、依存関係など）
- 進捗状況の追跡と表示
- MCPを通じたタスク管理機能の提供

## インストール

```bash
# リポジトリのクローン
git clone https://github.com/sososha/task_yaml.git
cd task_yaml

# 依存パッケージのインストールとビルド
cd mcp-server/yaml-task-mcp
npm install
npm run build
cd ../..
```

## 使い方

### サーバーの起動

```bash
# 起動スクリプトを使用
./start-yaml-task-mcp.sh

# または環境変数で設定を変更して起動
PORT=4000 PROJECT_ROOT=/path/to/your/project TASK_PATH=/path/to/your/tasks ./start-yaml-task-mcp.sh
```

デフォルトでは、サーバーはポート3999で起動します。

### 環境設定

`.env.yaml-task-mcp` ファイルで以下の設定ができます：

```
PROJECT_ROOT=/Users/yourusername/path/to/project
TASK_PATH=/Users/yourusername/path/to/project/tasks
PORT=3999
DEBUG=true
```

### Cursorエディタでの使用

1. Cursorエディタをインストールします（https://cursor.sh/）
2. 以下の内容で `mcp.json` ファイルをプロジェクトルートに作成します：

```json
{
  "mcpServers": {
    "yaml-task": {
      "command": "/bin/sh",
      "args": ["start-yaml-task-mcp.sh"],
      "cwd": "/path/to/task_yaml",
      "env": {
        "PROJECT_ROOT": "${workspaceRoot}",
        "TASK_PATH": "${workspaceRoot}/tasks"
      }
    }
  }
}
```

3. Cursorエディタを再起動します
4. 以下のプロンプトでYAMLタスク管理を使用できます：

```
@mcp yaml-task create-task {"title": "新しいタスク", "status": "not_started", "file": "tasks/main.yaml"}
```

## タスク形式

タスクは標準YAML形式で管理され、次のような構造を持ちます：

```yaml
tasks:
  - id: "d24e84e7-eb37-4b64-b5a4-d64f710c9c5d"
    title: "タスクの例"
    status: "not_started"
    details:
      description: "タスクの説明をここに記述"
      priority: "HIGH"
      tags:
        - "例"
        - "タスク"
  - id: "b07e5860-5ff2-4d75-be9c-be8599cc7392"
    title: "別のタスク"
    status: "in_progress"
    dependencies:
      - "d24e84e7-eb37-4b64-b5a4-d64f710c9c5d"
    details:
      description: "別のタスクの説明"
      priority: "MEDIUM"
      tags:
        - "例"
        - "別"
```

## MCPツール

- `create-task`: 新しいタスクを作成
  - パラメータ: title, status, file, parentId, details
  
- `update-task`: 既存のタスクを更新
  - パラメータ: id, title, status, file, parentId, details

## Cursorでの使用例

```
# 新しいタスクを作成
@mcp yaml-task create-task {
  "title": "設計書を作成する",
  "status": "not_started",
  "file": "tasks/main.yaml",
  "details": {
    "description": "プロジェクトの設計書を作成する",
    "priority": "HIGH",
    "tags": ["設計", "ドキュメント"]
  }
}

# タスクを更新
@mcp yaml-task update-task {
  "id": "d24e84e7-eb37-4b64-b5a4-d64f710c9c5d",
  "status": "in_progress",
  "file": "tasks/main.yaml"
}
```

## 対応タスクステータス

- `not_started`: 未着手
- `in_progress`: 進行中
- `review`: レビュー中
- `done`: 完了
- `completed`: 完全に完了
- `blocked`: ブロック中
- `cancelled`: キャンセル

## ライセンス

MIT 