import type { FileNode, FileReadResponse, ViewerConfig, WSEvent } from './index';

export interface FileChangeEvent {
  type: 'file-changed' | 'file-created' | 'file-deleted';
  path: string;
}

// Claude types
export interface ClaudeStreamMessage {
  type: 'assistant' | 'user' | 'result' | 'system' | 'stream_event';
  uuid?: string;
  session_id?: string;
  message?: {
    content?: Array<{
      type: 'text' | 'tool_use' | 'tool_result';
      text?: string;
      name?: string;
      input?: unknown;
    }>;
  };
  event?: {
    delta?: {
      type: string;
      text?: string;
    };
  };
  is_error?: boolean;
  errors?: string[];
  result?: string;
}

export interface ClaudeAPI {
  query: (prompt: string, context: { cwd: string; currentFile?: string; model?: string; resume?: string; openFiles?: string[] }) => Promise<{ success: boolean }>;
  abort: () => Promise<{ success: boolean }>;
  getAuthStatus: () => Promise<{ authenticated: boolean; email?: string }>;
  onStream: (callback: (message: ClaudeStreamMessage) => void) => () => void;
}

export interface ControlAPI {
  bridgeReady: () => Promise<void>;
}

export interface ElectronAPI {
  fs: {
    getTree: () => Promise<{ tree: FileNode }>;
    getChildren: (dirPath: string) => Promise<{ children: FileNode[] }>;
    watchDir: (dirPath: string) => Promise<{ success: boolean }>;
    unwatchDir: (dirPath: string) => Promise<{ success: boolean }>;
    readFile: (path: string) => Promise<FileReadResponse & { isImage?: boolean }>;
    writeFile: (path: string, content: string) => Promise<void>;
    createFile: (path: string, type: 'file' | 'directory') => Promise<void>;
    deleteFile: (path: string) => Promise<void>;
    rename: (oldPath: string, newPath: string) => Promise<void>;
    onChange: (callback: (event: FileChangeEvent) => void) => () => void;
  };
  app: {
    getRootDir: () => Promise<string>;
    setRootDir: (path: string) => Promise<string>;
    openFolderDialog: () => Promise<string | null>;
    onRootDirChanged: (callback: (path: string) => void) => () => void;
    onMenuOpenClaudePalette: (callback: () => void) => () => void;
  };
  config: {
    load: () => Promise<ViewerConfig | null>;
    save: (config: ViewerConfig) => Promise<void>;
  };
  terminal: {
    create: (cwd?: string, shell?: string) => Promise<{ sessionId: string; shell: string; cwd: string }>;
    write: (sessionId: string, data: string) => Promise<{ success: boolean }>;
    resize: (sessionId: string, cols: number, rows: number) => Promise<{ success: boolean }>;
    kill: (sessionId: string) => Promise<{ success: boolean }>;
    getShells: () => Promise<{ shells: string[]; defaultShell: string }>;
    onData: (callback: (event: { sessionId: string; data: string }) => void) => () => void;
    onExit: (callback: (event: { sessionId: string; exitCode: number }) => void) => () => void;
  };
  browser: {
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
  };
  leap: {
    status: () => Promise<{
      running: boolean;
      managed: boolean;
      pid: number | null;
      path: string;
    }>;
    ensureService: (enabled: boolean) => Promise<{
      running: boolean;
      managed: boolean;
      pid: number | null;
      path: string;
    }>;
  };
  claude: ClaudeAPI;
  control: ControlAPI;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
