import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
/**
 * パスを解決する（相対パスは絶対パスに変換）
 * より明確で一貫性のあるロジックに修正
 */
export declare function resolvePath(filePath: string): string;
/**
 * タスクツールを登録する
 */
export declare function registerTaskTools(server: McpServer): void;
