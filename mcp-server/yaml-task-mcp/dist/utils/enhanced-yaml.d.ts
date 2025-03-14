export declare const STATUS_ICONS: {
    completed: string;
    done: string;
    in_progress: string;
    not_started: string;
    blocked: string;
    cancelled: string;
    review: string;
};
export declare function isValidYaml(content: string): boolean;
export declare function loadFromFile(filePath: string): any;
export declare function formatTask(task: any): string;
export declare function dumpAsYaml(data: any, filePath: string, useFlowStyle?: boolean): boolean;
export declare function dumpAsJson(data: any, filePath: string, pretty?: boolean): boolean;
export declare function dumpAsOneLine(data: any, filePath: string): boolean;
