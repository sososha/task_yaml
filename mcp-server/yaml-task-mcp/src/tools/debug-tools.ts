import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

// パス解決関数の参照（既存のものを再利用）
import { resolvePath } from './task-tools.js';

/**
 * デバッグ用ツールを登録する
 */
export function registerDebugTools(server: McpServer): void {
  // 環境変数情報の取得
  server.tool(
    'debug-environment',
    { dummy: z.string().optional() },
    async () => {
      const env = {
        PROJECT_ROOT: process.env.PROJECT_ROOT || '未設定',
        TASK_PATH: process.env.TASK_PATH || '未設定',
        DEBUG: process.env.DEBUG || 'false',
        ALLOW_ROOT_PATHS: process.env.ALLOW_ROOT_PATHS || 'false',
        NODE_ENV: process.env.NODE_ENV || '未設定',
        cwd: process.cwd(),
        platform: process.platform,
        nodeVersion: process.version
      };
      
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify(env, null, 2) 
        }]
      };
    }
  );

  // パス解決テスト
  server.tool(
    'debug-path-resolution',
    { 
      path: z.string().describe('テストするパス')
    },
    async ({ path: testPath }) => {
      try {
        // 現在の実装でのパス解決
        const resolvedPath = resolvePath(testPath);
        
        // パス解決情報
        const pathInfo = {
          originalPath: testPath,
          resolvedPath: resolvedPath,
          isAbsolute: path.isAbsolute(testPath),
          exists: fs.existsSync(resolvedPath),
          isFile: fs.existsSync(resolvedPath) ? fs.statSync(resolvedPath).isFile() : false,
          isDirectory: fs.existsSync(resolvedPath) ? fs.statSync(resolvedPath).isDirectory() : false
        };

        // 代替パス解決方法のテスト
        const alternativeResolutions = {
          joinWithCwd: path.join(process.cwd(), testPath),
          joinWithProjectRoot: path.join(process.env.PROJECT_ROOT || process.cwd(), testPath),
          joinWithTaskPath: path.join(process.env.TASK_PATH || path.join(process.cwd(), 'tasks'), testPath),
          resolve: path.resolve(testPath),
          normalized: path.normalize(testPath)
        };
        
        // 存在チェック
        const existenceChecks = {
          originalExists: fs.existsSync(testPath),
          joinWithCwdExists: fs.existsSync(alternativeResolutions.joinWithCwd),
          joinWithProjectRootExists: fs.existsSync(alternativeResolutions.joinWithProjectRoot),
          joinWithTaskPathExists: fs.existsSync(alternativeResolutions.joinWithTaskPath),
          resolveExists: fs.existsSync(alternativeResolutions.resolve),
          normalizedExists: fs.existsSync(alternativeResolutions.normalized)
        };
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              pathInfo,
              alternativeResolutions,
              existenceChecks
            }, null, 2) 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `パス解決エラー: ${error instanceof Error ? error.message : String(error)}` 
          }]
        };
      }
    }
  );

  // ディレクトリ内容を表示
  server.tool(
    'debug-list-directory',
    { 
      path: z.string().describe('リストするディレクトリパス')
    },
    async ({ path: dirPath }) => {
      try {
        const resolvedPath = resolvePath(dirPath);
        
        if (!fs.existsSync(resolvedPath)) {
          return {
            content: [{ 
              type: 'text', 
              text: `パス ${resolvedPath} が存在しません` 
            }]
          };
        }
        
        if (!fs.statSync(resolvedPath).isDirectory()) {
          return {
            content: [{ 
              type: 'text', 
              text: `パス ${resolvedPath} はディレクトリではありません` 
            }]
          };
        }
        
        const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
        const contents = entries.map(entry => ({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          path: path.join(resolvedPath, entry.name),
          size: entry.isFile() ? fs.statSync(path.join(resolvedPath, entry.name)).size : null
        }));
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              path: dirPath,
              resolvedPath,
              contents
            }, null, 2) 
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `ディレクトリ一覧エラー: ${error instanceof Error ? error.message : String(error)}` 
          }]
        };
      }
    }
  );
} 