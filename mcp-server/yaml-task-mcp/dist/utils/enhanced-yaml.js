import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
// タスクステータスのアイコン表現
export const STATUS_ICONS = {
    completed: "✅",
    done: "✅",
    in_progress: "🔄",
    not_started: "⬜", // ここが重要：not_startedには⬜を使用
    blocked: "🚫",
    cancelled: "❌",
    review: "👀"
};
// インクルード機能用のカスタムスキーマ
const includeType = new yaml.Type('!include', {
    kind: 'scalar',
    resolve: (data) => typeof data === 'string',
    construct: (filePath, baseDir) => {
        try {
            const fullPath = baseDir ? path.join(baseDir, filePath) : filePath;
            const content = fs.readFileSync(fullPath, 'utf8');
            return loadWithIncludes(content, path.dirname(fullPath));
        }
        catch (error) {
            console.error(`インクルード処理エラー: ${error.message}`);
            return null;
        }
    }
});
// js-yamlのスキーマ作成
const includeSchema = yaml.DEFAULT_SCHEMA.extend({ explicit: [includeType] });
// インクルード機能付きYAML読み込み
function loadWithIncludes(content, baseDir) {
    try {
        const data = yaml.load(content, {
            schema: includeSchema,
            filename: baseDir
        });
        return data;
    }
    catch (error) {
        console.error(`YAML解析エラー: ${error.message}`);
        return null;
    }
}
// YAML形式の検証
export function isValidYaml(content) {
    try {
        yaml.load(content);
        return true;
    }
    catch (error) {
        return false;
    }
}
// YAMLデータの読み込み（インクルード処理付き）
export function loadFromFile(filePath) {
    try {
        const fullPath = path.resolve(filePath);
        // カスタムフォーマットの変換（問題のある形式を修正）
        const content = fs.readFileSync(fullPath, 'utf8');
        // ❌マークなどを含む非標準フォーマットを修正
        const cleanedContent = content.replace(/- (❌|⬜|🔄|✅) id: "([^"]+)" title: "([^"]+)"/g, (match, icon, id, title) => {
            let status;
            switch (icon) {
                case '❌':
                    status = 'not_started';
                    break;
                case '⬜':
                    status = 'not_started';
                    break;
                case '🔄':
                    status = 'in_progress';
                    break;
                case '✅':
                    status = 'completed';
                    break;
                default: status = 'unknown';
            }
            // 標準的なYAML形式に変換
            return `- id: "${id}"\n    title: "${title}"\n    status: "${status}"`;
        });
        return loadWithIncludes(cleanedContent, path.dirname(fullPath));
    }
    catch (error) {
        console.error(`ファイル読み込みエラー: ${error.message}`);
        return null;
    }
}
// タスクの表示用フォーマット（カスタム順序対応）
export function formatTask(task) {
    if (!task)
        return '';
    // ステータスアイコン
    const status = task.status;
    const statusIcon = STATUS_ICONS[status] || '⬜';
    // タイトル
    const title = task.title || '無題タスク';
    // ID（6桁パディング）
    const id = task.id ? String(task.id).padEnd(6, ' ') : '------';
    // コメント
    const comment = task.details?.description || '';
    // 指定順序で整形
    return `${statusIcon} ${title} [${id}] ${comment}`;
}
// YAMLとして保存（フロースタイルオプション付き）
export function dumpAsYaml(data, filePath, useFlowStyle = false) {
    try {
        const yamlStr = yaml.dump(data, {
            flowLevel: useFlowStyle ? 1 : -1,
            noRefs: true,
            noCompatMode: true
        });
        fs.writeFileSync(filePath, yamlStr, 'utf8');
        return true;
    }
    catch (error) {
        console.error(`YAML保存エラー: ${error.message}`);
        return false;
    }
}
// JSONとして保存
export function dumpAsJson(data, filePath, pretty = false) {
    try {
        const jsonStr = pretty
            ? JSON.stringify(data, null, 2)
            : JSON.stringify(data);
        fs.writeFileSync(filePath, jsonStr, 'utf8');
        return true;
    }
    catch (error) {
        console.error(`JSON保存エラー: ${error.message}`);
        return false;
    }
}
// 標準的なYAML形式での保存（タスク専用）
export function dumpAsOneLine(data, filePath) {
    try {
        // タスク配列の場合
        if (Array.isArray(data)) {
            // 標準的なYAML形式でダンプ
            const tasksObject = { tasks: data };
            const yamlStr = yaml.dump(tasksObject, {
                noRefs: true,
                noCompatMode: true
            });
            fs.writeFileSync(filePath, yamlStr, 'utf8');
            return true;
        }
        // オブジェクトの場合
        else if (data && typeof data === 'object') {
            // データの深いコピーを作成して操作
            const clonedData = JSON.parse(JSON.stringify(data));
            // tasks配列内の各タスクの処理
            if (Array.isArray(clonedData.tasks)) {
                // タイトルから❌マークなどを削除するだけでなく、
                // タスクが正しい構造（id, title, statusプロパティを持つオブジェクト）になるようにする
                clonedData.tasks = clonedData.tasks.map((task) => {
                    // オブジェクトでない場合はスキップ
                    if (!task || typeof task !== 'object')
                        return task;
                    // タイトルから❌マークなどを削除
                    if (task.title && typeof task.title === 'string') {
                        task.title = task.title.replace(/^(❌|⬜|🔄|✅)\s*/, '');
                    }
                    // 必ずstatusプロパティを持つようにする
                    if (!task.status) {
                        task.status = 'not_started';
                    }
                    return task;
                });
            }
            // 標準的なYAMLでダンプ - ネストした構造を維持
            const yamlStr = yaml.dump(clonedData, {
                noRefs: true,
                noCompatMode: true
            });
            fs.writeFileSync(filePath, yamlStr, 'utf8');
            return true;
        }
        // その他のケース
        console.error('サポートされていないデータ形式です');
        return false;
    }
    catch (error) {
        console.error(`YAML保存エラー: ${error.message}`);
        return false;
    }
}
//# sourceMappingURL=enhanced-yaml.js.map