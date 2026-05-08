# Agent Manager API Reference

## Hooks

### useAgentWorkspace

Manages workspace state, file loading/saving, and CRUD operations.

```typescript
import { useAgentWorkspace } from './hooks/useAgentWorkspace';

const {
  // State
  workspace,              // AgentWorkspace | null
  loading,                // boolean
  error,                  // string | null
  hasUnsavedChanges,      // boolean
  externalChangeDetected, // boolean - file changed outside app

  // File operations
  loadWorkspace,          // (silent?: boolean) => Promise<void>
  saveWorkspace,          // () => Promise<void>
  dismissExternalChange,  // () => void

  // Template operations
  addTemplate,            // (template: TaskTemplate) => void
  updateTemplate,         // (id: string, updates: Partial<TaskTemplate>) => void
  deleteTemplate,         // (id: string) => void
  duplicateTemplate,      // (id: string) => void

  // Queue operations
  addToQueue,             // (templateId: string, variables: Record<string, string>) => void
  removeFromQueue,        // (queueItemId: string) => void
  reorderQueue,           // (fromIndex: number, toIndex: number) => void
  clearQueue,             // () => void

  // History operations
  addToHistory,           // (execution: TaskExecution) => void
  clearHistory,           // () => void

  // Direct update
  updateWorkspace,        // (updater: (ws: AgentWorkspace) => AgentWorkspace) => void
} = useAgentWorkspace({
  filePath,               // string | undefined - path to AGENTS_*.json
  fileApi,                // { readFile, writeFile } from useAppContext()
  setDirty,               // (isDirty: boolean) => void from useAppContext()
});
```

### useAgentExecution

Manages task execution with terminal integration.

```typescript
import { useAgentExecution } from './hooks/useAgentExecution';

const {
  activeExecutions,       // TaskExecution[] - currently running tasks
  executeTask,            // (template: TaskTemplate, variables: Record<string, string>) => TaskExecution
  cancelExecution,        // (executionId: string) => void
  getExecutionOutput,     // (executionId: string) => string
} = useAgentExecution({
  onExecutionComplete,    // (execution: TaskExecution) => void
  onExecutionStart,       // (execution: TaskExecution) => void
});
```

## Utilities

### commandBuilder.ts

Build Claude CLI commands from templates.

```typescript
import { buildClaudeCommand, buildFlagsArray, escapeShellArg } from './utils/commandBuilder';

// Build complete command
const { command, resolvedPrompt } = buildClaudeCommand(template, variables);
// command: "claude -p --model sonnet 'Review src/main.ts for bugs'"
// resolvedPrompt: "Review src/main.ts for bugs"

// Build just the flags array
const flags = buildFlagsArray(template.cliFlags);
// ['-p', '--model', 'sonnet', '--max-turns', '5']

// Escape a shell argument
const safe = escapeShellArg("file with spaces.ts");
// "'file with spaces.ts'"
```

### variableResolver.ts

Resolve `{{variable}}` placeholders in strings.

```typescript
import {
  extractVariables,
  resolveVariables,
  getBuiltInVariables,
  mergeVariables,
  validateVariables,
} from './utils/variableResolver';

// Extract variable names from text
const vars = extractVariables("Review {{filepath}} for {{focus}}");
// ['filepath', 'focus']

// Resolve variables in text
const resolved = resolveVariables(
  "Review {{filepath}} for bugs",
  { filepath: 'src/main.ts' }
);
// "Review src/main.ts for bugs"

// Get built-in variables
const builtIn = getBuiltInVariables();
// { timestamp: '2025-...', date: '2025-01-01' }

// Merge user variables with built-ins
const all = mergeVariables({ filepath: 'src/main.ts' }, '/project');
// { timestamp: '...', date: '...', workspaceRoot: '/project', filepath: 'src/main.ts' }

// Check if required variables are filled
const { valid, missing } = validateVariables(
  "Review {{filepath}}",
  { filepath: '' },
  ['filepath']
);
// { valid: false, missing: ['filepath'] }
```

### validation.ts

Validate and normalize workspace data.

```typescript
import { validateWorkspace, isAgentWorkspaceFile } from './utils/validation';

// Validate and normalize workspace JSON
const workspace = validateWorkspace(rawJson, 'Fallback Name');
// Returns valid AgentWorkspace with defaults filled in

// Check if a path is an AGENTS file
const isAgent = isAgentWorkspaceFile('/path/to/AGENTS_project.json');
// true
```

## Components

### TaskTemplateEditor

Form for editing task template properties.

```typescript
import { TaskTemplateEditor } from './components/Editor/TaskTemplateEditor';

<TaskTemplateEditor
  template={selectedTemplate}           // TaskTemplate
  onUpdate={(updates) => {...}}         // (Partial<TaskTemplate>) => void
  onDelete={() => {...}}                // () => void
  onDuplicate={() => {...}}             // () => void
  onRun={() => {...}}                   // () => void
/>
```

### VariableInputDialog

Modal for entering variable values before execution.

```typescript
import { VariableInputDialog } from './components/Dialogs/VariableInputDialog';

<VariableInputDialog
  template={template}                   // TaskTemplate
  onSubmit={(vars, addToQueue) => {...}}  // (Record<string, string>, boolean) => void
  onCancel={() => {...}}                // () => void
/>
```

### ExecutionMonitor

Live execution status with embedded terminal.

```typescript
import { ExecutionMonitor } from './components/Execution/ExecutionMonitor';

<ExecutionMonitor
  execution={execution}                 // TaskExecution
  isActive={true}                       // boolean - is this the focused execution
  onCancel={() => {...}}                // () => void
/>
```

## Constants

```typescript
import {
  generateId,           // () => string - unique ID generator
  createEmptyWorkspace, // (name: string) => AgentWorkspace
  createEmptyTemplate,  // () => TaskTemplate
  DEFAULT_TEMPLATES,    // TaskTemplate[] - starter templates
  TEMPLATE_ICONS,       // string[] - available Lucide icon names
  TEMPLATE_COLORS,      // string[] - available hex colors
  AVAILABLE_MODELS,     // { value, label }[] - model options
  PERMISSION_MODES,     // { value, label }[] - permission mode options
  OUTPUT_FORMATS,       // { value, label }[] - output format options
} from './constants';
```
