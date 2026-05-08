/**
 * Agent Task Daemon Types
 * Shared interfaces for the daemon API
 */

/**
 * Configuration for creating a new task
 */
export interface TaskConfig {
  /** Main command to execute (e.g., Claude CLI command) */
  command: string;
  /** Working directory for command execution */
  cwd: string;
  /** Optional environment variables */
  env?: Record<string, string>;
  /** Commands to run before the main command */
  preCommands?: string[];
  /** Commands to run after the main command */
  postCommands?: string[];
  /** Continue to main command even if pre-commands fail */
  continueOnPreFail?: boolean;
  /** Continue even if post-commands fail */
  continueOnPostFail?: boolean;
  /** Arbitrary metadata for UI reference (not used by daemon) */
  metadata?: {
    templateId?: string;
    templateName?: string;
    [key: string]: unknown;
  };
}

/**
 * Execution status states
 */
export type TaskStatus =
  | 'pending'      // Task created but not started
  | 'running-pre'  // Running pre-commands
  | 'running-main' // Running main command
  | 'running-post' // Running post-commands
  | 'completed'    // Successfully completed
  | 'failed'       // Failed with error
  | 'cancelled';   // Cancelled by user

/**
 * Current execution stage info
 */
export interface TaskStage {
  /** Index of current command (0-based) */
  index: number;
  /** Total commands in this stage */
  total: number;
  /** Stage type */
  type: 'pre' | 'main' | 'post';
}

/**
 * A task record representing a single execution
 */
export interface TaskRecord {
  /** Unique task identifier */
  id: string;
  /** Task configuration */
  config: TaskConfig;
  /** Current execution status */
  status: TaskStatus;
  /** Current execution stage (if running) */
  stage?: TaskStage;
  /** Process ID of running command (for reconnection) */
  pid?: number;
  /** ISO timestamp when task was created */
  createdAt: string;
  /** ISO timestamp when task started executing */
  startedAt?: string;
  /** ISO timestamp when task completed */
  completedAt?: string;
  /** Exit code of the last command */
  exitCode?: number;
  /** Path to output log file */
  outputFile: string;
  /** Error message if failed */
  error?: string;
}

/**
 * WebSocket message types from client to server
 */
export type ClientMessage =
  | { type: 'subscribe'; taskId: string }
  | { type: 'unsubscribe'; taskId: string }
  | { type: 'subscribe-all' }
  | { type: 'unsubscribe-all' };

/**
 * WebSocket message types from server to client
 */
export type ServerMessage =
  | { type: 'status'; task: TaskRecord }
  | { type: 'output'; taskId: string; chunk: string; offset: number }
  | { type: 'completed'; taskId: string; exitCode: number }
  | { type: 'error'; taskId?: string; message: string };

/**
 * HTTP API request/response types
 */
export interface CreateTaskRequest {
  config: TaskConfig;
}

export interface CreateTaskResponse {
  task: TaskRecord;
}

export interface ListTasksRequest {
  status?: TaskStatus;
}

export interface ListTasksResponse {
  tasks: TaskRecord[];
}

export interface GetOutputRequest {
  offset?: number;
  limit?: number;
}

export interface GetOutputResponse {
  output: string;
  offset: number;
  hasMore: boolean;
}

export interface CleanupRequest {
  /** Delete tasks older than this many milliseconds */
  olderThan?: number;
  /** Only delete tasks with these statuses */
  statuses?: TaskStatus[];
}

export interface CleanupResponse {
  deleted: string[];
}

export interface HealthResponse {
  status: 'ok';
  uptime: number;
  taskCount: number;
  runningCount: number;
}

/**
 * Daemon configuration
 */
export interface DaemonConfig {
  /** HTTP/WebSocket port */
  port: number;
  /** Data directory for state and output files */
  dataDir: string;
  /** How often to save state (ms) */
  saveInterval: number;
}

/**
 * Persisted daemon state
 */
export interface DaemonState {
  version: '1.0';
  tasks: TaskRecord[];
  lastUpdated: string;
}
