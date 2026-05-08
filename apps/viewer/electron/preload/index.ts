import { contextBridge, ipcRenderer } from 'electron';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  modified: string;
  size: number;
  extension?: string;
  children?: FileNode[];
}

export interface FileReadResponse {
  path: string;
  content: string;
  modified: string;
  isImage?: boolean;
}

export interface FileChangeEvent {
  type: 'file-changed' | 'file-created' | 'file-deleted';
  path: string;
}

export interface ViewerConfig {
  windows: unknown[];
  expandedDirs?: string[];
}

export interface TerminalCreateResponse {
  sessionId: string;
  shell: string;
  cwd: string;
}

export interface TerminalDataEvent {
  sessionId: string;
  data: string;
}

export interface TerminalExitEvent {
  sessionId: string;
  exitCode: number;
}

export interface TerminalShellsResponse {
  shells: string[];
  defaultShell: string;
}

// Agent Task types
export interface AgentTaskConfig {
  command: string;
  cwd: string;
  env?: Record<string, string>;
  preCommands?: string[];
  postCommands?: string[];
  continueOnPreFail?: boolean;
  continueOnPostFail?: boolean;
  metadata?: {
    templateId?: string;
    templateName?: string;
    [key: string]: unknown;
  };
}

export interface AgentTaskStage {
  index: number;
  total: number;
  type: 'pre' | 'main' | 'post';
}

export type AgentTaskStatus =
  | 'pending'
  | 'running-pre'
  | 'running-main'
  | 'running-post'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentTaskRecord {
  id: string;
  config: AgentTaskConfig;
  status: AgentTaskStatus;
  stage?: AgentTaskStage;
  pid?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  exitCode?: number;
  outputFile: string;
  error?: string;
}

export interface AgentTaskOutputResponse {
  output: string;
  offset: number;
  hasMore: boolean;
}

export interface AgentTaskOutputEvent {
  taskId: string;
  chunk: string;
  offset: number;
}

export interface AgentTaskCompletedEvent {
  taskId: string;
  exitCode: number;
}

export interface AgentTaskErrorEvent {
  taskId?: string;
  message: string;
}

// Raven types
export type RavenStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
export type VisualMode = 'camera' | 'screen' | 'none';

export interface RavenState {
  status: RavenStatus;
  pid?: number;
  visualMode: VisualMode;
  startedAt?: string;
  error?: string;
}

export interface TranscriptEntry {
  id: string;
  timestamp: string;
  speaker: 'user' | 'raven' | 'system';
  text: string;
}

export interface FunctionLog {
  id: string;
  timestamp: string;
  functionName: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  durationMs?: number;
  callId?: string;
}

export interface Memory {
  id: string;
  text: string;
  tags: string[];
  created_at: string;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  enabled: boolean;
  isBuiltIn: boolean;
  filePath?: string;
  parameters: ToolParameter[];
}

export interface RavenConfig {
  model?: string;
  voice_name?: string;
  allowed_apps?: string[];
}

export interface PromptsConfig {
  voice_assistant?: {
    system_instruction?: string;
    function_descriptions?: Record<string, string>;
  };
  cerebras?: {
    system_instruction?: string;
  };
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

// MCP Types
export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface ClaudeSettings {
  mcpServers?: Record<string, McpServerConfig>;
}

export type McpServerStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface McpServerInfo {
  id: string;
  config: McpServerConfig;
  status: McpServerStatus;
  error?: string;
  serverInfo?: {
    name?: string;
    version?: string;
  };
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface McpMessage {
  timestamp: number;
  serverId: string;
  direction: 'sent' | 'received';
  message: JsonRpcRequest | JsonRpcResponse | JsonRpcNotification;
}

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number | string;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

const electronAPI = {
  // File system operations
  fs: {
    getTree: (options?: { showHidden?: boolean }): Promise<{ tree: FileNode }> =>
      ipcRenderer.invoke('fs:getTree', options),

    getChildren: (dirPath: string, options?: { showHidden?: boolean }): Promise<{ children: FileNode[] }> =>
      ipcRenderer.invoke('fs:getChildren', dirPath, options),

    watchDir: (dirPath: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('fs:watchDir', dirPath),

    unwatchDir: (dirPath: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('fs:unwatchDir', dirPath),

    readFile: (path: string): Promise<FileReadResponse> =>
      ipcRenderer.invoke('fs:readFile', path),

    writeFile: (path: string, content: string): Promise<void> =>
      ipcRenderer.invoke('fs:writeFile', path, content),

    createFile: (path: string, type: 'file' | 'directory'): Promise<void> =>
      ipcRenderer.invoke('fs:createFile', path, type),

    deleteFile: (path: string): Promise<void> =>
      ipcRenderer.invoke('fs:deleteFile', path),

    rename: (oldPath: string, newPath: string): Promise<void> =>
      ipcRenderer.invoke('fs:rename', oldPath, newPath),

    onChange: (callback: (event: FileChangeEvent) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: FileChangeEvent) =>
        callback(data);
      ipcRenderer.on('fs:onChange', handler);
      return () => {
        ipcRenderer.removeListener('fs:onChange', handler);
      };
    },
  },

  // App operations
  app: {
    getRootDir: (): Promise<string | null> => ipcRenderer.invoke('app:getRootDir'),

    hasWorkspace: (): Promise<boolean> => ipcRenderer.invoke('app:hasWorkspace'),

    setRootDir: (path: string): Promise<string> =>
      ipcRenderer.invoke('app:setRootDir', path),

    openFolderDialog: (addToExisting = false): Promise<{ path: string; addToExisting: boolean } | null> =>
      ipcRenderer.invoke('dialog:openFolder', addToExisting),

    onRootDirChanged: (callback: (path: string, addToExisting: boolean) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, path: string, addToExisting: boolean) =>
        callback(path, addToExisting);
      ipcRenderer.on('app:rootDirChanged', handler);
      return () => {
        ipcRenderer.removeListener('app:rootDirChanged', handler);
      };
    },

    onInitialFolder: (callback: (path: string) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, path: string) =>
        callback(path);
      ipcRenderer.on('app:initialFolder', handler);
      return () => {
        ipcRenderer.removeListener('app:initialFolder', handler);
      };
    },

    onMenuNewTerminal: (callback: () => void): (() => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:new-terminal', handler);
      return () => {
        ipcRenderer.removeListener('menu:new-terminal', handler);
      };
    },

    onMenuCloseWorkspace: (callback: () => void): (() => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:close-workspace', handler);
      return () => {
        ipcRenderer.removeListener('menu:close-workspace', handler);
      };
    },

    onMenuCloseTab: (callback: () => void): (() => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:close-tab', handler);
      return () => {
        ipcRenderer.removeListener('menu:close-tab', handler);
      };
    },

    onMenuOpenSearch: (callback: () => void): (() => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:open-search', handler);
      return () => {
        ipcRenderer.removeListener('menu:open-search', handler);
      };
    },

    onMenuToggleExplorer: (callback: () => void): (() => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:toggle-explorer', handler);
      return () => {
        ipcRenderer.removeListener('menu:toggle-explorer', handler);
      };
    },

    onMenuTileWindows: (callback: () => void): (() => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:tile-windows', handler);
      return () => {
        ipcRenderer.removeListener('menu:tile-windows', handler);
      };
    },

    onMenuMaximizeWindow: (callback: () => void): (() => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:maximize-window', handler);
      return () => {
        ipcRenderer.removeListener('menu:maximize-window', handler);
      };
    },

    onMenuPrevTab: (callback: () => void): (() => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:prev-tab', handler);
      return () => {
        ipcRenderer.removeListener('menu:prev-tab', handler);
      };
    },

    onMenuNextTab: (callback: () => void): (() => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:next-tab', handler);
      return () => {
        ipcRenderer.removeListener('menu:next-tab', handler);
      };
    },

    onMenuFocusUp: (callback: () => void): (() => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:focus-up', handler);
      return () => {
        ipcRenderer.removeListener('menu:focus-up', handler);
      };
    },

    onMenuFocusDown: (callback: () => void): (() => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:focus-down', handler);
      return () => {
        ipcRenderer.removeListener('menu:focus-down', handler);
      };
    },

    onMenuFocusLeft: (callback: () => void): (() => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:focus-left', handler);
      return () => {
        ipcRenderer.removeListener('menu:focus-left', handler);
      };
    },

    onMenuFocusRight: (callback: () => void): (() => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:focus-right', handler);
      return () => {
        ipcRenderer.removeListener('menu:focus-right', handler);
      };
    },

    onMenuNewProject: (callback: () => void): (() => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:new-project', handler);
      return () => {
        ipcRenderer.removeListener('menu:new-project', handler);
      };
    },

    onMenuLayoutPreset: (callback: (preset: string) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, preset: string) => callback(preset);
      ipcRenderer.on('menu:layout-preset', handler);
      return () => {
        ipcRenderer.removeListener('menu:layout-preset', handler);
      };
    },

    onMenuOpenClaudePalette: (callback: () => void): (() => void) => {
      const handler = () => callback();
      ipcRenderer.on('menu:open-claude-palette', handler);
      return () => {
        ipcRenderer.removeListener('menu:open-claude-palette', handler);
      };
    },
  },

  // Config operations
  config: {
    load: (): Promise<ViewerConfig | null> => ipcRenderer.invoke('config:load'),

    save: (config: ViewerConfig): Promise<void> =>
      ipcRenderer.invoke('config:save', config),
  },

  // Terminal operations
  terminal: {
    create: (cwd?: string, shell?: string): Promise<TerminalCreateResponse> =>
      ipcRenderer.invoke('terminal:create', cwd, shell),

    write: (sessionId: string, data: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('terminal:write', sessionId, data),

    resize: (sessionId: string, cols: number, rows: number): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('terminal:resize', sessionId, cols, rows),

    kill: (sessionId: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('terminal:kill', sessionId),

    getShells: (): Promise<TerminalShellsResponse> =>
      ipcRenderer.invoke('terminal:getShells'),

    getSession: (sessionId: string): Promise<{ id: string; shell: string; cwd: string } | null> =>
      ipcRenderer.invoke('terminal:getSession', sessionId),

    onData: (callback: (event: TerminalDataEvent) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: TerminalDataEvent) =>
        callback(data);
      ipcRenderer.on('terminal:data', handler);
      return () => {
        ipcRenderer.removeListener('terminal:data', handler);
      };
    },

    onExit: (callback: (event: TerminalExitEvent) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: TerminalExitEvent) =>
        callback(data);
      ipcRenderer.on('terminal:exit', handler);
      return () => {
        ipcRenderer.removeListener('terminal:exit', handler);
      };
    },
  },

  // Browser operations
  browser: {
    openExternal: (url: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('browser:openExternal', url),
  },

  // Leap service operations
  leap: {
    status: (): Promise<{
      running: boolean;
      managed: boolean;
      pid: number | null;
      path: string;
    }> => ipcRenderer.invoke('leap:status'),

    ensureService: (enabled: boolean): Promise<{
      running: boolean;
      managed: boolean;
      pid: number | null;
      path: string;
    }> => ipcRenderer.invoke('leap:ensureService', enabled),
  },

  // Agent task operations (via daemon)
  agentTask: {
    // Create a new task (returns pending task)
    create: (config: AgentTaskConfig): Promise<AgentTaskRecord> =>
      ipcRenderer.invoke('agent-task:create', config),

    // Start a pending task
    start: (taskId: string): Promise<AgentTaskRecord> =>
      ipcRenderer.invoke('agent-task:start', taskId),

    // Cancel a running task
    cancel: (taskId: string): Promise<AgentTaskRecord> =>
      ipcRenderer.invoke('agent-task:cancel', taskId),

    // Get a single task by ID
    get: (taskId: string): Promise<AgentTaskRecord | null> =>
      ipcRenderer.invoke('agent-task:get', taskId),

    // List all tasks (optionally filter by status)
    list: (filter?: { status?: AgentTaskStatus }): Promise<AgentTaskRecord[]> =>
      ipcRenderer.invoke('agent-task:list', filter),

    // Get task output (with pagination support)
    getOutput: (
      taskId: string,
      opts?: { offset?: number; limit?: number }
    ): Promise<AgentTaskOutputResponse> =>
      ipcRenderer.invoke('agent-task:output', taskId, opts),

    // Delete a completed task
    delete: (taskId: string): Promise<void> =>
      ipcRenderer.invoke('agent-task:delete', taskId),

    // Cleanup old tasks
    cleanup: (opts?: { olderThan?: number; statuses?: AgentTaskStatus[] }): Promise<{ deleted: string[] }> =>
      ipcRenderer.invoke('agent-task:cleanup', opts),

    // Subscribe to task updates (for WebSocket)
    subscribe: (taskId: string): Promise<void> =>
      ipcRenderer.invoke('agent-task:subscribe', taskId),

    // Unsubscribe from task updates
    unsubscribe: (taskId: string): Promise<void> =>
      ipcRenderer.invoke('agent-task:unsubscribe', taskId),

    // Event: Task status changed
    onStatus: (callback: (task: AgentTaskRecord) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, task: AgentTaskRecord) =>
        callback(task);
      ipcRenderer.on('agent-task:status', handler);
      return () => {
        ipcRenderer.removeListener('agent-task:status', handler);
      };
    },

    // Event: Task output received
    onOutput: (callback: (event: AgentTaskOutputEvent) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: AgentTaskOutputEvent) =>
        callback(data);
      ipcRenderer.on('agent-task:output', handler);
      return () => {
        ipcRenderer.removeListener('agent-task:output', handler);
      };
    },

    // Event: Task completed
    onCompleted: (callback: (event: AgentTaskCompletedEvent) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: AgentTaskCompletedEvent) =>
        callback(data);
      ipcRenderer.on('agent-task:completed', handler);
      return () => {
        ipcRenderer.removeListener('agent-task:completed', handler);
      };
    },

    // Event: Error occurred
    onError: (callback: (event: AgentTaskErrorEvent) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: AgentTaskErrorEvent) =>
        callback(data);
      ipcRenderer.on('agent-task:error', handler);
      return () => {
        ipcRenderer.removeListener('agent-task:error', handler);
      };
    },
  },

  // Raven operations
  raven: {
    // Status & Control
    getStatus: (): Promise<RavenState> =>
      ipcRenderer.invoke('raven:status'),

    start: (mode?: VisualMode): Promise<RavenState> =>
      ipcRenderer.invoke('raven:start', mode),

    stop: (): Promise<RavenState> =>
      ipcRenderer.invoke('raven:stop'),

    setMode: (mode: VisualMode): Promise<RavenState> =>
      ipcRenderer.invoke('raven:setMode', mode),

    // Transcripts
    getTranscripts: (limit?: number): Promise<{ transcripts: TranscriptEntry[] }> =>
      ipcRenderer.invoke('raven:getTranscripts', limit),

    subscribeTranscripts: (): Promise<void> =>
      ipcRenderer.invoke('raven:subscribeTranscripts'),

    onTranscript: (callback: (entry: TranscriptEntry) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, entry: TranscriptEntry) => callback(entry);
      ipcRenderer.on('raven:transcript', handler);
      return () => ipcRenderer.removeListener('raven:transcript', handler);
    },

    // Function logs
    getFunctionLogs: (limit?: number): Promise<{ logs: FunctionLog[] }> =>
      ipcRenderer.invoke('raven:getFunctionLogs', limit),

    onFunctionLog: (callback: (entry: FunctionLog) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, entry: FunctionLog) => callback(entry);
      ipcRenderer.on('raven:functionLog', handler);
      return () => ipcRenderer.removeListener('raven:functionLog', handler);
    },

    // Status events
    onStatusChange: (callback: (state: RavenState) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, state: RavenState) => callback(state);
      ipcRenderer.on('raven:status', handler);
      return () => ipcRenderer.removeListener('raven:status', handler);
    },

    // Error events
    onError: (callback: (message: string) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, message: string) => callback(message);
      ipcRenderer.on('raven:error', handler);
      return () => ipcRenderer.removeListener('raven:error', handler);
    },

    // Memory operations
    memory: {
      list: (): Promise<{ memories: Memory[] }> =>
        ipcRenderer.invoke('raven:memory:list'),

      get: (id: string): Promise<Memory | null> =>
        ipcRenderer.invoke('raven:memory:get', id),

      create: (text: string, tags?: string[]): Promise<Memory> =>
        ipcRenderer.invoke('raven:memory:create', { text, tags }),

      update: (id: string, data: { text?: string; tags?: string[] }): Promise<Memory> =>
        ipcRenderer.invoke('raven:memory:update', id, data),

      delete: (id: string): Promise<{ success: boolean }> =>
        ipcRenderer.invoke('raven:memory:delete', id),

      search: (query: string): Promise<{ memories: Memory[] }> =>
        ipcRenderer.invoke('raven:memory:search', query),
    },

    // Tool operations
    tool: {
      list: (): Promise<{ tools: ToolDefinition[] }> =>
        ipcRenderer.invoke('raven:tool:list'),

      get: (name: string): Promise<ToolDefinition | null> =>
        ipcRenderer.invoke('raven:tool:get', name),

      create: (tool: {
        name: string;
        description: string;
        parameters: ToolParameter[];
        code?: string;
      }): Promise<ToolDefinition> =>
        ipcRenderer.invoke('raven:tool:create', tool),

      update: (name: string, updates: {
        description?: string;
        parameters?: ToolParameter[];
        enabled?: boolean;
        code?: string;
      }): Promise<ToolDefinition> =>
        ipcRenderer.invoke('raven:tool:update', name, updates),

      delete: (name: string): Promise<{ success: boolean }> =>
        ipcRenderer.invoke('raven:tool:delete', name),

      setEnabled: (name: string, enabled: boolean): Promise<void> =>
        ipcRenderer.invoke('raven:tool:setEnabled', name, enabled),
    },

    // Config operations
    config: {
      get: (): Promise<RavenConfig> =>
        ipcRenderer.invoke('raven:config:get'),

      update: (updates: Partial<RavenConfig>): Promise<RavenConfig> =>
        ipcRenderer.invoke('raven:config:update', updates),

      getPrompts: (): Promise<PromptsConfig> =>
        ipcRenderer.invoke('raven:config:getPrompts'),

      updatePrompts: (prompts: Partial<PromptsConfig>): Promise<PromptsConfig> =>
        ipcRenderer.invoke('raven:config:updatePrompts', prompts),

      getAllowedApps: (): Promise<{ apps: string[] }> =>
        ipcRenderer.invoke('raven:config:getAllowedApps'),

      setAllowedApps: (apps: string[]): Promise<{ apps: string[] }> =>
        ipcRenderer.invoke('raven:config:setAllowedApps', apps),

      getAudioDevices: (): Promise<{
        input: Array<{ index: number; name: string; isInput: boolean; isOutput: boolean }>;
        output: Array<{ index: number; name: string; isInput: boolean; isOutput: boolean }>;
      }> =>
        ipcRenderer.invoke('raven:config:getAudioDevices'),

      getAudioDeviceConfig: (): Promise<{
        input: number | string | null;
        output: number | string | null;
      }> =>
        ipcRenderer.invoke('raven:config:getAudioDeviceConfig'),

      setAudioDeviceConfig: (config: {
        input?: number | string | null;
        output?: number | string | null;
      }): Promise<{
        input: number | string | null;
        output: number | string | null;
      }> =>
        ipcRenderer.invoke('raven:config:setAudioDeviceConfig', config),
    },
  },

  // MCP operations
  mcp: {
    // Load settings from ~/.claude/settings.json
    loadSettings: (): Promise<ClaudeSettings> =>
      ipcRenderer.invoke('mcp:loadSettings'),

    // List all configured servers with status
    listServers: (): Promise<McpServerInfo[]> =>
      ipcRenderer.invoke('mcp:listServers'),

    // Get status of a single server
    getServerStatus: (serverId: string): Promise<McpServerInfo | null> =>
      ipcRenderer.invoke('mcp:getServerStatus', serverId),

    // Start a server
    startServer: (serverId: string): Promise<McpServerInfo> =>
      ipcRenderer.invoke('mcp:startServer', serverId),

    // Stop a server
    stopServer: (serverId: string): Promise<void> =>
      ipcRenderer.invoke('mcp:stopServer', serverId),

    // Restart a server
    restartServer: (serverId: string): Promise<McpServerInfo> =>
      ipcRenderer.invoke('mcp:restartServer', serverId),

    // List tools from a server
    listTools: (serverId: string): Promise<McpTool[]> =>
      ipcRenderer.invoke('mcp:listTools', serverId),

    // Call a tool
    callTool: (serverId: string, toolName: string, args: Record<string, unknown>): Promise<unknown> =>
      ipcRenderer.invoke('mcp:callTool', serverId, toolName, args),

    // List resources from a server
    listResources: (serverId: string): Promise<McpResource[]> =>
      ipcRenderer.invoke('mcp:listResources', serverId),

    // Read a resource
    readResource: (serverId: string, uri: string): Promise<unknown> =>
      ipcRenderer.invoke('mcp:readResource', serverId, uri),

    // List prompts from a server
    listPrompts: (serverId: string): Promise<McpPrompt[]> =>
      ipcRenderer.invoke('mcp:listPrompts', serverId),

    // Get a prompt
    getPrompt: (serverId: string, promptName: string, args?: Record<string, string>): Promise<unknown> =>
      ipcRenderer.invoke('mcp:getPrompt', serverId, promptName, args),

    // Send raw JSON-RPC message
    sendRaw: (serverId: string, message: JsonRpcRequest | JsonRpcNotification): Promise<void> =>
      ipcRenderer.invoke('mcp:sendRaw', serverId, message),

    // Event: Server status changed
    onStatusChange: (callback: (info: McpServerInfo) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, info: McpServerInfo) => callback(info);
      ipcRenderer.on('mcp:statusChange', handler);
      return () => ipcRenderer.removeListener('mcp:statusChange', handler);
    },

    // Event: JSON-RPC message sent/received
    onMessage: (callback: (message: McpMessage) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, message: McpMessage) => callback(message);
      ipcRenderer.on('mcp:message', handler);
      return () => ipcRenderer.removeListener('mcp:message', handler);
    },

    // Event: Notification from server
    onNotification: (callback: (data: { serverId: string; notification: JsonRpcNotification }) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: { serverId: string; notification: JsonRpcNotification }) => callback(data);
      ipcRenderer.on('mcp:notification', handler);
      return () => ipcRenderer.removeListener('mcp:notification', handler);
    },
  },

  // Claude Command Palette operations
  claude: {
    query: (prompt: string, context: { cwd: string; currentFile?: string; model?: string; resume?: string; openFiles?: string[] }): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('claude:query', prompt, context),

    abort: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('claude:abort'),

    getAuthStatus: (): Promise<{ authenticated: boolean; email?: string }> =>
      ipcRenderer.invoke('claude:auth-status'),

    onStream: (callback: (message: ClaudeStreamMessage) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, message: ClaudeStreamMessage) => callback(message);
      ipcRenderer.on('claude:stream', handler);
      return () => ipcRenderer.removeListener('claude:stream', handler);
    },
  },

  // Control bridge operations
  control: {
    bridgeReady: (): Promise<void> =>
      ipcRenderer.invoke('control:bridge-ready'),
  },

  // Whisper dictation operations
  whisper: {
    setApiKey: (apiKey: string | null): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('whisper:setApiKey', apiKey),

    transcribe: (
      audioData: ArrayBuffer,
      language: string | null
    ): Promise<{ success: boolean; text?: string; error?: string }> =>
      ipcRenderer.invoke('whisper:transcribe', audioData, language),

    hasApiKey: (): Promise<{ hasKey: boolean }> =>
      ipcRenderer.invoke('whisper:hasApiKey'),
  },
};

contextBridge.exposeInMainWorld('electron', electronAPI);

// Export type for use in renderer
export type ElectronAPI = typeof electronAPI;
