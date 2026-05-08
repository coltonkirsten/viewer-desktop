/**
 * Agent Manager Types
 * TypeScript interfaces for the Agent Manager app
 */

/**
 * Variable placeholder that can be used in task configurations
 * Filled at execution time with {{variableName}} syntax
 */
export interface TaskVariable {
  name: string;
  description?: string;
  defaultValue?: string;
  required: boolean;
}

/**
 * CLI flag configuration for Claude Code
 * Maps to the various command-line flags available
 */
export interface ClaudeCliFlags {
  print?: boolean;                                        // -p: Non-interactive mode
  model?: 'sonnet' | 'opus' | 'haiku' | string;          // --model
  maxTurns?: number;                                      // --max-turns
  systemPrompt?: string;                                  // --system-prompt (replaces default)
  appendSystemPrompt?: string;                            // --append-system-prompt (adds to default)
  allowedTools?: string[];                                // --allowedTools (comma-separated)
  disallowedTools?: string[];                             // --disallowedTools (comma-separated)
  permissionMode?: 'strict' | 'default' | string;         // --permission-mode
  outputFormat?: 'text' | 'json' | 'stream-json';         // --output-format
  resume?: boolean;                                       // -c: Resume most recent conversation
  resumeSession?: string;                                 // -r: Resume specific session
  dangerouslySkipPermissions?: boolean;                   // --dangerously-skip-permissions
  addDir?: string[];                                      // --add-dir
  verbose?: boolean;                                      // --verbose
}

/**
 * A command to run before or after the main Claude task
 */
export interface TaskCommand {
  id: string;
  command: string;
  description?: string;
  continueOnFail?: boolean;  // For post-commands only
}

/**
 * Reusable task template definition
 */
export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  icon?: string;              // Lucide icon name
  color?: string;             // Accent color for UI
  prompt: string;             // Can contain {{variables}}
  cliFlags: ClaudeCliFlags;
  workingDirectory?: string;  // Can use variables like {{projectRoot}}
  variables: TaskVariable[];
  preCommands: TaskCommand[]; // Fail = abort entire task
  postCommands: TaskCommand[];
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

/**
 * Execution status states
 */
export type ExecutionStatus =
  | 'pending'
  | 'running-pre'      // Running pre-commands
  | 'running-main'     // Running Claude command
  | 'running-post'     // Running post-commands
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Pre/Post command execution result
 */
export interface CommandResult {
  commandId: string;
  command: string;
  exitCode: number;
  output: string;
  startedAt: string;
  completedAt: string;
}

/**
 * A single execution of a task
 */
export interface TaskExecution {
  id: string;
  templateId: string;
  templateName: string;                     // Snapshot of name at execution time
  resolvedVariables: Record<string, string>;
  resolvedPrompt: string;                   // Prompt with variables filled in
  fullCommand: string;                      // Complete CLI command that was run
  status: ExecutionStatus;
  terminalSessionId?: string;               // For interactive mode
  preCommandResults: CommandResult[];
  postCommandResults: CommandResult[];
  claudeOutput?: string;                    // For print mode, captured output
  exitCode?: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  isIdle?: boolean;                         // True when no terminal output for 3+ seconds
}

/**
 * Queue item for pending executions
 */
export interface QueueItem {
  id: string;
  templateId: string;
  variables: Record<string, string>;
  addedAt: string;
}

/**
 * Root workspace file structure (AGENTS_{name}.json)
 */
export interface AgentWorkspace {
  name: string;
  description?: string;
  version: '1.0';
  templates: TaskTemplate[];
  queue: QueueItem[];
  history: TaskExecution[];
  historyLimit?: number;                   // Max history items to keep (default: 100)
  createdAt: string;
  updatedAt: string;
}

/**
 * Default values for new templates
 */
export const DEFAULT_CLI_FLAGS: ClaudeCliFlags = {
  print: true,
  model: 'sonnet',
  maxTurns: 10,
};

/**
 * Default history limit
 */
export const DEFAULT_HISTORY_LIMIT = 100;
