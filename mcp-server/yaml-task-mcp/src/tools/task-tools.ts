import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { v4 as uuidv4 } from 'uuid';
import yaml from 'js-yaml';
import { z } from 'zod';
import { fileURLToPath } from 'url';
import { loadFromFile, dumpAsYaml, dumpAsOneLine, dumpAsJson } from '../utils/enhanced-yaml.js';

// ESモジュールでの__dirname相当の取得
// Node.js 20.11 以降では import.meta.dirname が使用可能
const _dirname = import.meta.dirname || 
  (typeof import.meta.url !== 'undefined' ? path.dirname(fileURLToPath(import.meta.url)) : process.cwd());

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

// 環境変数からプロジェクトルートとタスクパスを取得
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();
const TASK_PATH = process.env.TASK_PATH || path.join(PROJECT_ROOT, 'tasks');
const DEBUG = process.env.DEBUG === 'true';
const ALLOW_ROOT_PATHS = process.env.ALLOW_ROOT_PATHS === 'true';

function debugLog(...args: any[]): void {
  if (DEBUG) {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * パスを解決する（相対パスは絶対パスに変換）
 * より明確で一貫性のあるロジックに修正
 */
export function resolvePath(filePath: string): string {
  if (DEBUG) {
    console.log(`[DEBUG] Resolving path: ${filePath}`);
    console.log(`[DEBUG] Current dir: ${process.cwd()}`);
    console.log(`[DEBUG] PROJECT_ROOT: ${PROJECT_ROOT}`);
    console.log(`[DEBUG] TASK_PATH: ${TASK_PATH}`);
  }
  
  // PROJECT_ROOTが不適切に設定されている場合の修正（例：ルートディレクトリ）
  let effectiveProjectRoot = PROJECT_ROOT;
  if (PROJECT_ROOT === '/' || PROJECT_ROOT === '') {
    // 現在のディレクトリを実効的なプロジェクトルートとして使用
    effectiveProjectRoot = process.cwd();
    if (DEBUG) console.log(`[DEBUG] PROJECT_ROOT is set to root directory, using current directory instead: ${effectiveProjectRoot}`);
  }
  
  // 実効的なタスクパスの計算
  let effectiveTaskPath = TASK_PATH;
  if (TASK_PATH === '/tasks' || TASK_PATH.startsWith('/tasks/')) {
    // タスクパスも修正
    effectiveTaskPath = path.join(effectiveProjectRoot, 'tasks');
    if (DEBUG) console.log(`[DEBUG] TASK_PATH is incorrectly set to /tasks, using ${effectiveTaskPath} instead`);
  }
  
  // 空のパスチェック
  if (!filePath) {
    const defaultPath = path.join(effectiveTaskPath, 'main.yaml');
    if (DEBUG) console.log(`[DEBUG] Empty path, using default: ${defaultPath}`);
    return defaultPath;
  }
  
  // パスの正規化
  filePath = filePath.trim();
  
  // Case 1: 絶対パス - すでに完全なパス
  if (path.isAbsolute(filePath)) {
    if (DEBUG) console.log(`[DEBUG] Path is absolute: ${filePath}`);
    
    // 特別な処理: /tasks パスは常に許可
    if (filePath === '/tasks' || filePath.startsWith('/tasks/')) {
      const relativePath = filePath.substring(1); // 先頭の / を削除
      const safePath = path.join(effectiveProjectRoot, relativePath);
      if (DEBUG) console.log(`[DEBUG] Special handling for /tasks path: ${filePath} -> ${safePath}`);
      return safePath;
    }
    
    // セキュリティチェック: ルートディレクトリへのアクセス制限
    if (!ALLOW_ROOT_PATHS && !filePath.startsWith(effectiveProjectRoot)) {
      if (DEBUG) console.log(`[DEBUG] Access to root path not allowed, redirecting to PROJECT_ROOT`);
      
      // その他の制限付きパスはPROJECT_ROOT内に制限
      const safePath = path.join(effectiveProjectRoot, path.basename(filePath));
      if (DEBUG) console.log(`[DEBUG] Restricting to PROJECT_ROOT: ${filePath} -> ${safePath}`);
      return safePath;
    }
    
    // 制限がない場合は絶対パスをそのまま返す
    return filePath;
  }
  
  // Case 2: "tasks/" で始まるパス -> TASK_PATHを基準とする
  if (filePath.startsWith('tasks/') || filePath === 'tasks') {
    // "tasks/" の部分をTASK_PATHに置き換える
    const taskRelativePath = filePath.replace(/^tasks\/?/, '');
    const resolvedPath = path.join(effectiveTaskPath, taskRelativePath);
    if (DEBUG) console.log(`[DEBUG] tasks/ prefix resolved to: ${resolvedPath}`);
    return resolvedPath;
  }
  
  // Case 3: "./" で始まるパス -> カレントディレクトリを基準とする
  if (filePath.startsWith('./') || filePath === '.') {
    const resolvedPath = path.resolve(filePath);
    if (DEBUG) console.log(`[DEBUG] ./ prefix resolved to: ${resolvedPath}`);
    return resolvedPath;
  }

  // Case 4: 単純なファイル名やディレクトリ名 -> PROJECT_ROOTを基準とする  
  // `main.yaml` や `subtasks/task1.yaml` など
  const resolvedPath = path.join(effectiveProjectRoot, filePath);
  if (DEBUG) console.log(`[DEBUG] Simple path resolved relative to PROJECT_ROOT: ${resolvedPath}`);
  return resolvedPath;
}

/**
 * タスクを作成する
 */
async function createTask(
  title: string,
  status: string = 'not_started',
  file: string,
  parentId?: string,
  details?: any
): Promise<Task> {
  try {
    if (!title) throw new Error('タイトルは必須です');
    if (!file) throw new Error('ファイルパスは必須です');

    // パスを正規化
    const resolvedPath = resolvePath(file);
    debugLog(`Creating task in file: ${resolvedPath}`);

    // 必要なディレクトリを作成
    const directory = path.dirname(resolvedPath);
    await fs.mkdir(directory, { recursive: true });

    // 詳細情報の調整（undefinedではなく空オブジェクトを使用）
    const taskDetails = details || {};

    // タスクを作成
    const result = await createTaskWithPath(
      resolvedPath,
      title,
      status,
      parentId,
      taskDetails
    );

    return result;
  } catch (error: any) {
    console.error(`タスク作成に失敗しました: ${error.message}`);
    throw error;
  }
}

/**
 * パスが確定した後のタスク作成処理（内部関数）
 */
async function createTaskWithPath(
  file: string,
  title: string,
  status: string,
  parentId?: string,
  details?: any
): Promise<any> {
  try {
    if (!file) {
      throw new Error('ファイルパスが指定されていません');
    }

    const taskId = uuidv4();
    const now = new Date().toISOString();
    const taskStatus = status || 'not_started';

    // 新しいタスクオブジェクト
    const newTask = {
      id: taskId,
      title,
      status: taskStatus,
      parentId,
      details: details || {}
    };

    // ファイルが存在するかチェック
    try {
      let existingData: any = { tasks: [] };
      
      if (fsSync.existsSync(file)) {
        // 既存のファイルを読み込む
        const loadedData = await loadFromFile(file);
        if (loadedData && typeof loadedData === 'object') {
          // tasksプロパティがあればそれを使用、なければ空の配列
          existingData = loadedData;
          if (!Array.isArray(existingData.tasks)) {
            existingData.tasks = [];
          }
        }
      } else {
        // ディレクトリが存在しない場合は作成
        const dir = path.dirname(file);
        if (!fsSync.existsSync(dir)) {
          fsSync.mkdirSync(dir, { recursive: true });
        }
      }

      // 新しいタスクを追加
      existingData.tasks.push(newTask);

      // 更新したデータを保存
      const fileExt = path.extname(file).toLowerCase();
      let saveResult = false;
      
      if (fileExt === '.json') {
        saveResult = dumpAsJson(existingData, file, true);
      } else {
        // 標準的なYAML形式で保存
        saveResult = dumpAsYaml(existingData, file);
      }

      if (!saveResult) {
        throw new Error('タスクの保存に失敗しました');
      }

      console.log(`タスクが作成されました: ${title}`);
      return {
        id: taskId,
        title,
        status: taskStatus,
        file
      };
    } catch (error: any) {
      console.error(`タスク作成エラー: ${error.message}`);
      throw error;
    }
  } catch (error: any) {
    console.error(`タスク作成エラー（全体）: ${error.message}`);
    throw error;
  }
}

/**
 * タスクを更新する
 */
async function updateTask(id: string, changes: Partial<Task>, file: string): Promise<Task | null> {
  try {
    if (!id || !file) {
      throw new Error('タスクIDとファイルパスが必要です');
    }

    // ファイルからタスクを読み込む
    if (!fsSync.existsSync(file)) {
      throw new Error(`ファイルが存在しません: ${file}`);
    }
    
    // ファイルからデータを読み込む
    const existingData = await loadFromFile(file);
    if (!existingData || typeof existingData !== 'object') {
      throw new Error('不正なファイル形式です');
    }
    
    // tasksプロパティをチェック
    if (!Array.isArray(existingData.tasks)) {
      throw new Error('タスクが見つかりません（tasks配列が存在しません）');
    }
    
    // IDに一致するタスクを検索
    const taskIndex = existingData.tasks.findIndex((task: any) => task.id === id);
    if (taskIndex === -1) {
      throw new Error(`ID ${id} のタスクが見つかりません`);
    }
    
    // タスクを更新
    const updatedTask = {
      ...existingData.tasks[taskIndex],
      ...changes
    };
    
    // 更新したタスクを配列に戻す
    existingData.tasks[taskIndex] = updatedTask;
    
    // ファイル拡張子で保存方法を分ける
    const extension = path.extname(file).toLowerCase();
    let saveResult = false;
    
    if (extension === '.json') {
      // JSONとして保存
      saveResult = dumpAsJson(existingData, file, true);
    } else {
      // 標準的なYAML形式で保存
      saveResult = dumpAsYaml(existingData, file);
    }
    
    if (!saveResult) {
      throw new Error('タスクの保存に失敗しました');
    }
    
    console.log(`タスクが更新されました: ${updatedTask.id}`);
    return updatedTask;
  } catch (error: any) {
    console.error(`タスク更新エラー: ${error.message}`);
    throw error;
  }
}

/**
 * タスクを削除する
 */
async function deleteTask(id: string, file: string): Promise<boolean> {
  try {
    // パスを正規化
    const resolvedPath = resolvePath(file);
    debugLog(`Deleting task from file: ${resolvedPath}`);
    
    // ファイルが存在するか確認
    if (!fsSync.existsSync(resolvedPath)) {
      console.error(`Task file not found: ${resolvedPath}`);
      throw new Error(`Task file not found: ${resolvedPath}`);
    }
    
    // ファイルから既存のタスクを読み込む
    let tasks: Task[] = [];
    try {
      const content = await fs.readFile(resolvedPath, 'utf-8');
      
      // ファイル拡張子で処理を分ける
      const extension = path.extname(resolvedPath).toLowerCase();
      if (extension === '.json') {
        tasks = JSON.parse(content);
      } else if (extension === '.yaml' || extension === '.yml') {
        tasks = yaml.load(content) as Task[];
      } else {
        throw new Error(`Unsupported file extension: ${extension}`);
      }
    } catch (error) {
      console.error(`Error reading task file: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Error reading task file: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // タスクを見つける
    const initialLength = tasks.length;
    tasks = tasks.filter(task => task.id !== id);
    
    if (tasks.length === initialLength) {
      // タスクが見つからなかった
      console.error(`Task not found with ID: ${id}`);
      return false;
    }
    
    debugLog(`Removed task: ${id}`);
    
    // ファイルに保存
    const extension = path.extname(resolvedPath).toLowerCase();
    if (extension === '.json') {
      await fs.writeFile(resolvedPath, JSON.stringify(tasks, null, 2), 'utf-8');
    } else if (extension === '.yaml' || extension === '.yml') {
      await fs.writeFile(resolvedPath, yaml.dump(tasks), 'utf-8');
    } else {
      throw new Error(`Unsupported file extension: ${extension}`);
    }
    
    debugLog(`Task file saved after deletion: ${resolvedPath}`);
    return true;
  } catch (error) {
    console.error('Error in deleteTask:', error);
    throw error;
  }
}

/**
 * 初期テンプレートを作成する
 */
async function createInitialTemplate(projectName: string, projectDescription: string, basePath: string): Promise<string> {
  try {
    // 詳細なデバッグログ
    console.log('=== createInitialTemplate ===');
    console.log(`basePath: "${basePath}"`);
    console.log(`process.cwd(): "${process.cwd()}"`);
    console.log(`PROJECT_ROOT: "${PROJECT_ROOT}"`);
    console.log(`TASK_PATH: "${TASK_PATH}"`);
    
    // テンプレートディレクトリチェックをスキップ
    console.log('Skipping template directory check for now');
    
    // 絶対パスを解決（特にbasePath='.'のケースを慎重に扱う）
    let baseDir: string;
    if (path.isAbsolute(basePath)) {
      // 絶対パスの場合、危険なパス（ルートディレクトリなど）を確認
      if (basePath.startsWith('/') && !basePath.startsWith(process.cwd()) && !process.env.ALLOW_ROOT_PATHS) {
        // 安全なパスに変換: ルートから始まるパスをカレントディレクトリからの相対パスに変更
        baseDir = path.join(process.cwd(), basePath.substring(1));
        console.log(`Converting potentially unsafe path to safe path: ${basePath} -> ${baseDir}`);
      } else {
        // 安全な絶対パスの場合はそのまま使用
        baseDir = basePath;
        console.log(`Using absolute basePath: ${baseDir}`);
      }
    } else if (basePath === '.') {
      // '.'の場合はPROJECT_ROOTが指定されていればそれを使用、なければカレントディレクトリを使用
      baseDir = PROJECT_ROOT !== process.cwd() && PROJECT_ROOT !== '/' ? PROJECT_ROOT : process.cwd();
      console.log(`Using PROJECT_ROOT for '.': ${baseDir}`);
    } else {
      // その他の相対パスは現在のPROJECT_ROOTがある場合はそこからの相対パス
      // PROJECT_ROOTが無効な場合はカレントディレクトリからの相対パスとして解決
      const startDir = PROJECT_ROOT !== '/' ? PROJECT_ROOT : process.cwd();
      baseDir = path.resolve(startDir, basePath);
      console.log(`Resolved relative path: ${baseDir}`);
    }
    
    // 念のためbaseDirが/だけの場合は修正（システムルートへの書き込みを防止）
    if (baseDir === '/' && !process.env.ALLOW_ROOT_PATHS) {
      baseDir = process.cwd();
      console.log(`Warning: baseDir was '/', changed to current directory: ${baseDir}`);
    }
    
    // tasksディレクトリの絶対パスを生成
    const taskDir = path.join(baseDir, 'tasks');
    console.log(`Tasks directory path: ${taskDir}`);
    
    // ディレクトリが存在するか確認
    let dirExists = false;
    try {
      const stats = fsSync.statSync(taskDir);
      dirExists = stats.isDirectory();
      console.log(`Tasks directory exists: ${dirExists}`);
    } catch (err: any) {
      console.log(`Tasks directory does not exist yet: ${err.message}`);
    }
    
    // ディレクトリが存在しない場合は作成
    if (!dirExists) {
      try {
        // 親ディレクトリも含めて再帰的に作成
        console.log(`Creating directory with mkdirSync: ${taskDir}`);
        fsSync.mkdirSync(taskDir, { recursive: true });
        console.log(`Successfully created tasks directory: ${taskDir}`);
      } catch (dirError: any) {
        console.error(`Error creating tasks directory (${taskDir}):`, dirError);
        // エラーメッセージをより詳細に
        throw new Error(`Failed to create tasks directory (${taskDir}): ${dirError.message} (code: ${dirError.code})`);
      }
    }
    
    // 作成できたか再度確認
    try {
      const stats = fsSync.statSync(taskDir);
      console.log(`Final directory check - exists: ${stats.isDirectory()}`);
    } catch (err: any) {
      console.error(`Final directory check failed: ${err.message}`);
      throw new Error(`Directory creation verification failed: ${err.message}`);
    }
    
    // 初期タスクデータ
    const initialTasks: Task[] = [
      {
        id: uuidv4(),
        title: 'プロジェクト初期設定',
        status: 'completed',
        details: {
          description: 'プロジェクトの初期設定を完了する',
          priority: 'HIGH',
          completionDate: new Date().toISOString().split('T')[0],
          tags: ['setup']
        }
      },
      {
        id: uuidv4(),
        title: '要件定義',
        status: 'in_progress',
        details: {
          description: 'プロジェクトの要件を定義する',
          priority: 'HIGH',
          startDate: new Date().toISOString().split('T')[0],
          tags: ['planning']
        }
      },
      {
        id: uuidv4(),
        title: '開発環境構築',
        status: 'not_started',
        details: {
          description: '開発環境を構築する',
          priority: 'MEDIUM',
          dependencies: ['プロジェクト初期設定'],
          tags: ['setup', 'dev']
        }
      }
    ];
    
    // ファイルパス
    const filePath = path.join(taskDir, 'main.yaml');
    console.log(`Creating task file at: ${filePath}`);
    
    // ファイルに保存
    await fs.writeFile(filePath, yaml.dump(initialTasks), 'utf-8');
    console.log(`Created initial tasks file: ${filePath}`);
    
    // READMEも作成
    const readmePath = path.join(taskDir, 'README.md');
    const readmeContent = `# ${projectName} タスク管理\n\n${projectDescription}\n\n## 使用方法\n\n以下のコマンドを使用してタスクを管理できます：\n\n1. タスク一覧表示: \`@mcp yaml-task tasks://list?file=tasks/main.yaml\`\n2. タスク詳細表示: \`@mcp yaml-task tasks://detail/[タスクID]?file=tasks/main.yaml\`\n3. タスク進捗レポート: \`@mcp yaml-task tasks://report?file=tasks/main.yaml\`\n`;
    await fs.writeFile(readmePath, readmeContent, 'utf-8');
    console.log(`Created README file: ${readmePath}`);
    
    return filePath;
  } catch (error: any) {
    // より詳細なエラーログ
    console.error('=== Error in createInitialTemplate ===');
    console.error(`Error type: ${error.constructor.name}`);
    console.error(`Error message: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
    if (error.code) console.error(`Error code: ${error.code}`);
    if (error.path) console.error(`Error path: ${error.path}`);
    throw error;
  }
}
/**
 * タスクツールを登録する
 */
export function registerTaskTools(server: McpServer): void {
  // タスク作成ツール
  server.tool(
    'create-task',
    {
      title: z.string().describe('タスクのタイトル'),
      parentId: z.string().optional().describe('親タスクのID（オプション）'),
      status: z.enum(['not_started', 'in_progress', 'review', 'done', 'completed', 'blocked', 'cancelled']).describe('タスクのステータス'),
      details: z.object({
        description: z.string().optional().describe('タスクの説明'),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().describe('優先度'),
        startDate: z.string().optional().describe('開始日'),
        dueDate: z.string().optional().describe('期限日'),
        dependencies: z.array(z.string()).optional().describe('依存タスク'),
        concerns: z.array(z.string()).optional().describe('懸念事項'),
        implementation: z.string().optional().describe('実装詳細'),
        tags: z.array(z.string()).optional().describe('タグ')
      }).optional().describe('タスクの詳細情報'),
      file: z.string().default('tasks/main.yaml').describe('タスクを保存するファイルパス')
    },
    async (params) => {
      try {
        const { title, parentId, status, details, file } = params;
        
        const task = await createTask(title, status, file, parentId, details);
        
        return {
          content: [{
            type: 'text',
            text: `✅ タスク「${title}」を作成しました。\n\nID: \`${task.id}\``
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `タスク作成エラー: ${error instanceof Error ? error.message : String(error)}`
          }],
          error: true
        };
      }
    }
  );
  
  // タスク更新ツール
  server.tool(
    'update-task',
    {
      id: z.string().describe('更新するタスクのID'),
      title: z.string().optional().describe('新しいタイトル（オプション）'),
      status: z.enum(['not_started', 'in_progress', 'review', 'done', 'completed', 'blocked', 'cancelled']).optional().describe('新しいステータス（オプション）'),
      parentId: z.string().optional().describe('新しい親タスクID（オプション）'),
      details: z.object({
        description: z.string().optional().describe('タスクの説明'),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().describe('優先度'),
        startDate: z.string().optional().describe('開始日'),
        dueDate: z.string().optional().describe('期限日'),
        completionDate: z.string().optional().describe('完了日'),
        dependencies: z.array(z.string()).optional().describe('依存タスク'),
        concerns: z.array(z.string()).optional().describe('懸念事項'),
        implementation: z.string().optional().describe('実装詳細'),
        tags: z.array(z.string()).optional().describe('タグ'),
        comments: z.array(z.string()).optional().describe('コメント')
      }).optional().describe('新しい詳細情報（オプション）'),
      file: z.string().default('tasks/main.yaml').describe('タスクファイルのパス')
    },
    async (params) => {
      try {
        const { id, title, status, parentId, details, file } = params;
        const updates: Partial<Task> = {};
        
        if (title) updates.title = title;
        if (status) updates.status = status;
        if (parentId) updates.parentId = parentId;
        if (details) updates.details = details;
        
        const updatedTask = await updateTask(id, updates, file);
        
        if (!updatedTask) {
          return {
            content: [{
              type: 'text',
              text: `タスクID: ${id} が見つかりませんでした。`
            }],
            error: true
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: `✅ タスク「${updatedTask.title}」を更新しました。\n\nID: \`${updatedTask.id}\``
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `タスク更新エラー: ${error instanceof Error ? error.message : String(error)}`
          }],
          error: true
        };
      }
    }
  );
}
