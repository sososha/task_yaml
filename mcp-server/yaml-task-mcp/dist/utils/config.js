import fs from 'fs';
/**
 * デフォルト設定
 */
const defaultConfig = {
    taskDir: './tasks',
    defaultTaskFile: 'main.yaml',
    templateFile: 'template.yaml',
};
/**
 * 設定を読み込む
 */
export function loadConfig(configPath) {
    let config = { ...defaultConfig };
    try {
        if (configPath && fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            const userConfig = JSON.parse(configData);
            config = { ...config, ...userConfig };
        }
    }
    catch (error) {
        console.warn(`Config loading error: ${error instanceof Error ? error.message : String(error)}`);
        console.warn('Using default configuration.');
    }
    return config;
}
//# sourceMappingURL=config.js.map