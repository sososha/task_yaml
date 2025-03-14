#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTaskResources } from './resources/task-resources.js';
import { registerTaskTools } from './tools/task-tools.js';
import { registerDebugTools } from './tools/debug-tools.js';
import path from 'path';
// デフォルト設定
const DEFAULT_PORT = 3999;
const DEFAULT_PROJECT_ROOT = process.cwd();
const DEFAULT_TASK_PATH = path.join(DEFAULT_PROJECT_ROOT, 'tasks');
// 環境変数の設定
process.env.DEBUG = process.env.DEBUG || 'true';
process.env.PROJECT_ROOT = process.env.PROJECT_ROOT || DEFAULT_PROJECT_ROOT;
process.env.TASK_PATH = process.env.TASK_PATH || DEFAULT_TASK_PATH;
// ポート設定
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;
// 環境変数のログ出力
console.log('=== Environment Variables ===');
console.log(`PORT: ${port}`);
console.log(`PROJECT_ROOT: ${process.env.PROJECT_ROOT}`);
console.log(`TASK_PATH: ${process.env.TASK_PATH}`);
console.log(`DEBUG: ${process.env.DEBUG}`);
console.log(`ALLOW_ROOT_PATHS: ${process.env.ALLOW_ROOT_PATHS || 'false'}`);
console.log(`Current Directory: ${process.cwd()}`);
console.log('===========================');
async function startServer() {
    try {
        console.log('YAML Task MCP Server starting...');
        // MCPサーバーの作成
        const server = new McpServer({
            name: 'yaml-task',
            version: '1.0.0'
        });
        // リソースとツールの登録
        registerTaskResources(server);
        registerTaskTools(server);
        // デバッグツールの登録（常に登録する）
        console.log('Registering debug tools...');
        registerDebugTools(server);
        // サーバーの起動（StdioTransport）
        console.log('Connecting to transport...');
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.log('YAML Task MCP Server started successfully.');
        console.log(`Server running on port ${port}`);
        console.log('Available at: yaml-task');
        console.log('Press Ctrl+C to stop the server.');
    }
    catch (error) {
        console.error('Failed to start YAML Task MCP Server:', error);
        process.exit(1);
    }
}
// サーバー起動
startServer();
//# sourceMappingURL=index.js.map