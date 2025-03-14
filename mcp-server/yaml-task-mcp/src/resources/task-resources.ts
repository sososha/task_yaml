import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import yaml from 'js-yaml';
import { z } from 'zod';

// タスクのインターフェース
interface Task {
  id: string;
  title: string;
  parentId?: string;
  status: string;
  details?: {
    description?: string;
    priority?: string;
    startDate?: string;
    dueDate?: string;
    completionDate?: string;
    dependencies?: string[];
    concerns?: string[];
    implementation?: string;
    tags?: string[];
    comments?: string[];
  };
  children?: Task[];
}

// パラメータの型定義
interface ResourceParams {
  [key: string]: string | number | boolean | object | null | undefined;
}

/**
 * タスクファイルを読み込む
 */
async function loadTaskFile(filePath: string): Promise<Task[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // ファイル拡張子で処理を分ける
    const extension = path.extname(filePath).toLowerCase();
    if (extension === '.json') {
      return JSON.parse(content) as Task[];
    } else if (extension === '.yaml' || extension === '.yml') {
      return yaml.load(content) as Task[];
    } else {
      throw new Error(`Unsupported file extension: ${extension}`);
    }
  } catch (error) {
    console.error(`Error loading task file: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * タスクをフォーマットする
 */
function formatTask(task: Task): string {
  let result = `# ${task.title} (ID: ${task.id})\n`;
  result += `Status: ${task.status}\n\n`;
  
  if (task.details) {
    if (task.details.description) {
      result += `## Description\n${task.details.description}\n\n`;
    }
    
    if (task.details.priority) {
      result += `Priority: ${task.details.priority}\n\n`;
    }
    
    if (task.details.startDate || task.details.dueDate || task.details.completionDate) {
      result += `## Dates\n`;
      if (task.details.startDate) result += `- Start: ${task.details.startDate}\n`;
      if (task.details.dueDate) result += `- Due: ${task.details.dueDate}\n`;
      if (task.details.completionDate) result += `- Completed: ${task.details.completionDate}\n`;
      result += '\n';
    }
    
    if (task.details.dependencies && task.details.dependencies.length > 0) {
      result += `## Dependencies\n`;
      task.details.dependencies.forEach(dep => {
        result += `- ${dep}\n`;
      });
      result += '\n';
    }
    
    if (task.details.concerns && task.details.concerns.length > 0) {
      result += `## Concerns\n`;
      task.details.concerns.forEach(concern => {
        result += `- ${concern}\n`;
      });
      result += '\n';
    }
    
    if (task.details.implementation) {
      result += `## Implementation Details\n${task.details.implementation}\n\n`;
    }
    
    if (task.details.tags && task.details.tags.length > 0) {
      result += `## Tags\n${task.details.tags.join(', ')}\n\n`;
    }
    
    if (task.details.comments && task.details.comments.length > 0) {
      result += `## Comments\n`;
      task.details.comments.forEach(comment => {
        result += `- ${comment}\n`;
      });
      result += '\n';
    }
  }
  
  return result;
}

/**
 * 進捗レポートを生成する
 */
function generateProgressReport(tasks: Task[]): string {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed' || task.status === 'done').length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : '0.0';
  
  let report = `# Project Progress Report\n\n`;
  report += `Total Tasks: ${totalTasks}\n`;
  report += `Completed Tasks: ${completedTasks}\n`;
  report += `Completion Rate: ${completionRate}%\n\n`;
  
  // 簡単なグラフ表示
  report += `Progress: [${'#'.repeat(Math.floor(Number(completionRate) / 5))}${'.'.repeat(20 - Math.floor(Number(completionRate) / 5))}] ${completionRate}%\n\n`;
  
  // タスクステータス概要
  const statusCounts: Record<string, number> = {};
  tasks.forEach(task => {
    statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
  });
  
  report += `## Status Summary\n\n`;
  for (const [status, count] of Object.entries(statusCounts)) {
    report += `- ${status}: ${count} tasks (${(count / totalTasks * 100).toFixed(1)}%)\n`;
  }
  
  return report;
}

/**
 * タスクリソースを登録する
 */
export function registerTaskResources(server: McpServer): void {
  // タスク一覧リソース
  server.resource(
    'tasks-list',
    'tasks://list',
    async (uri: URL, extra: RequestHandlerExtra) => {
      // URLからクエリパラメータを取得
      const params = new URLSearchParams(uri.search);
      const filePath = params.get('file') || 'tasks/main.yaml';
      
      try {
        // 環境変数からプロジェクトルートとタスクパスを取得
        const projectRoot = process.env.PROJECT_ROOT || process.cwd();
        
        // パスを解決
        let resolvedPath: string;
        if (path.isAbsolute(filePath)) {
          // 絶対パス
          resolvedPath = filePath;
        } else if (filePath.startsWith('tasks/') || filePath === 'tasks') {
          // tasks/ で始まるパス
          const taskPath = process.env.TASK_PATH || path.join(projectRoot, 'tasks');
          const basePath = path.dirname(taskPath);
          resolvedPath = path.join(basePath, filePath);
        } else {
          // その他の相対パス
          resolvedPath = path.join(projectRoot, filePath);
        }
        
        if (process.env.DEBUG === 'true') {
          console.log(`[DEBUG] Loading tasks from: ${resolvedPath}`);
        }
        
        const tasks = await loadTaskFile(resolvedPath);
        
        if (tasks.length === 0) {
          return {
            contents: [{
              uri: uri.href,
              mimeType: 'text/markdown',
              text: '# Tasks\n\nNo tasks found in the specified file.'
            }]
          };
        }
        
        let content = '# Tasks\n\n';
        
        tasks.forEach(task => {
          content += `- [${task.status === 'completed' || task.status === 'done' ? 'x' : ' '}] ${task.title} (ID: ${task.id})\n`;
        });
        
        content += '\n\n';
        content += generateProgressReport(tasks);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'text/markdown',
            text: content
          }]
        };
      } catch (error) {
        console.error(`Error loading tasks: ${error instanceof Error ? error.message : String(error)}`);
        return {
          error: true,
          contents: [{
            uri: uri.href,
            mimeType: 'text/plain',
            text: `Error loading tasks: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
  
  // タスク詳細リソース
  server.resource(
    'tasks-detail',
    'tasks://detail/:taskId',
    async (uri: URL, extra: RequestHandlerExtra) => {
      // URLからパスパラメータとクエリパラメータを取得
      const pathParts = uri.pathname.split('/');
      const taskId = pathParts[pathParts.length - 1];
      const params = new URLSearchParams(uri.search);
      const filePath = params.get('file') || 'tasks/main.yaml';
      
      try {
        // 環境変数からプロジェクトルートとタスクパスを取得
        const projectRoot = process.env.PROJECT_ROOT || process.cwd();
        
        // パスを解決
        let resolvedPath: string;
        if (path.isAbsolute(filePath)) {
          // 絶対パス
          resolvedPath = filePath;
        } else if (filePath.startsWith('tasks/') || filePath === 'tasks') {
          // tasks/ で始まるパス
          const taskPath = process.env.TASK_PATH || path.join(projectRoot, 'tasks');
          const basePath = path.dirname(taskPath);
          resolvedPath = path.join(basePath, filePath);
        } else {
          // その他の相対パス
          resolvedPath = path.join(projectRoot, filePath);
        }
        
        if (process.env.DEBUG === 'true') {
          console.log(`[DEBUG] Loading task detail from: ${resolvedPath}`);
        }
        
        const tasks = await loadTaskFile(resolvedPath);
        const task = tasks.find(t => t.id === taskId);
        
        if (!task) {
          return {
            error: true,
            contents: [{
              uri: uri.href,
              mimeType: 'text/plain',
              text: `Task with ID ${taskId} not found.`
            }]
          };
        }
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'text/markdown',
            text: formatTask(task)
          }]
        };
      } catch (error) {
        console.error(`Error loading task details: ${error instanceof Error ? error.message : String(error)}`);
        return {
          error: true,
          contents: [{
            uri: uri.href,
            mimeType: 'text/plain',
            text: `Error loading task details: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
  
  // プロジェクト進捗レポートリソース
  server.resource(
    'tasks-report',
    'tasks://report',
    async (uri: URL, extra: RequestHandlerExtra) => {
      // URLからクエリパラメータを取得
      const params = new URLSearchParams(uri.search);
      const filePath = params.get('file') || 'tasks/main.yaml';
      
      try {
        const tasks = await loadTaskFile(filePath);
        const report = generateProgressReport(tasks);
        
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'text/markdown',
            text: report
          }]
        };
      } catch (error) {
        return {
          error: true,
          contents: [{
            uri: uri.href,
            mimeType: 'text/plain',
            text: `Error generating progress report: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
} 