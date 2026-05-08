# Agent Workspace File Format

Agent workspaces are stored as JSON files matching the pattern `AGENTS_*.json`.

## Schema

```typescript
interface AgentWorkspace {
  name: string;                    // Display name
  description?: string;            // Optional description
  version: '1.0';                  // Schema version
  templates: TaskTemplate[];       // Task definitions
  queue: QueueItem[];              // Pending executions
  history: TaskExecution[];        // Completed executions
  historyLimit?: number;           // Max history items (default: 100)
  createdAt: string;               // ISO timestamp
  updatedAt: string;               // ISO timestamp
}
```

## Task Template

```typescript
interface TaskTemplate {
  id: string;                      // Unique identifier
  name: string;                    // Display name
  description?: string;            // Optional description
  icon?: string;                   // Lucide icon name (e.g., 'Search', 'TestTube')
  color?: string;                  // Hex color for UI accent
  prompt: string;                  // Claude prompt (supports {{variables}})
  cliFlags: ClaudeCliFlags;        // CLI configuration
  workingDirectory?: string;       // Optional cwd (supports variables)
  variables: TaskVariable[];       // Variable definitions
  preCommands: TaskCommand[];      // Commands to run before Claude
  postCommands: TaskCommand[];     // Commands to run after Claude
  createdAt: string;               // ISO timestamp
  updatedAt: string;               // ISO timestamp
  tags?: string[];                 // Optional categorization tags
}
```

## CLI Flags

```typescript
interface ClaudeCliFlags {
  print?: boolean;                 // -p: Non-interactive mode
  model?: string;                  // --model: sonnet, opus, haiku, or full name
  maxTurns?: number;               // --max-turns: Limit agentic turns
  systemPrompt?: string;           // --system-prompt: Replace default
  appendSystemPrompt?: string;     // --append-system-prompt: Add to default
  allowedTools?: string[];         // --allowedTools: Comma-separated list
  disallowedTools?: string[];      // --disallowedTools: Comma-separated list
  permissionMode?: string;         // --permission-mode: strict, default
  outputFormat?: string;           // --output-format: text, json, stream-json
  resume?: boolean;                // -c: Resume most recent conversation
  resumeSession?: string;          // -r: Resume specific session
  dangerouslySkipPermissions?: boolean;  // Skip permission prompts
  addDir?: string[];               // --add-dir: Additional working directories
  verbose?: boolean;               // --verbose: Enable verbose logging
}
```

## Variables

```typescript
interface TaskVariable {
  name: string;                    // Variable name (used as {{name}})
  description?: string;            // Help text for users
  defaultValue?: string;           // Pre-filled value
  required: boolean;               // Must be filled before execution
}
```

### Built-in Variables

These are automatically available in all templates:

| Variable | Description |
|----------|-------------|
| `{{timestamp}}` | Current ISO timestamp |
| `{{date}}` | Current date (YYYY-MM-DD) |
| `{{workspaceRoot}}` | Workspace root directory |

## Commands

```typescript
interface TaskCommand {
  id: string;                      // Unique identifier
  command: string;                 // Shell command (supports variables)
  description?: string;            // Optional description
  continueOnFail?: boolean;        // For post-commands: continue if this fails
}
```

## Queue Item

```typescript
interface QueueItem {
  id: string;                      // Unique identifier
  templateId: string;              // Reference to template
  variables: Record<string, string>;  // Filled variable values
  addedAt: string;                 // ISO timestamp
}
```

## Execution Record

```typescript
interface TaskExecution {
  id: string;                      // Unique identifier
  templateId: string;              // Reference to template
  templateName: string;            // Snapshot of template name
  resolvedVariables: Record<string, string>;  // Variables used
  resolvedPrompt: string;          // Prompt with variables filled in
  fullCommand: string;             // Complete CLI command
  status: ExecutionStatus;         // Current state
  terminalSessionId?: string;      // For interactive mode
  preCommandResults: CommandResult[];   // Pre-command outcomes
  postCommandResults: CommandResult[];  // Post-command outcomes
  claudeOutput?: string;           // Captured output (print mode)
  exitCode?: number;               // Process exit code
  errorMessage?: string;           // Error description if failed
  startedAt: string;               // ISO timestamp
  completedAt?: string;            // ISO timestamp
}

type ExecutionStatus =
  | 'pending'
  | 'running-pre'      // Running pre-commands
  | 'running-main'     // Running Claude command
  | 'running-post'     // Running post-commands
  | 'completed'
  | 'failed'
  | 'cancelled';
```

## Example File

```json
{
  "name": "My Project",
  "description": "Agent tasks for my-project",
  "version": "1.0",
  "templates": [
    {
      "id": "review-1",
      "name": "Code Review",
      "icon": "Search",
      "color": "#4ec5ff",
      "prompt": "Review {{filepath}} for bugs and improvements",
      "cliFlags": {
        "print": true,
        "model": "sonnet",
        "maxTurns": 5
      },
      "variables": [
        { "name": "filepath", "required": true }
      ],
      "preCommands": [],
      "postCommands": [],
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "queue": [],
  "history": [],
  "historyLimit": 100,
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```
