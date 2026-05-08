# Agent Manager

A viewer app for managing Claude Code CLI agents - creating task templates, executing them with pre/post commands, monitoring live output, and managing task queues.

## Features

- **Task Templates** - Create reusable task configurations with prompts, CLI flags, and variables
- **Variable Placeholders** - Use `{{variable}}` syntax for dynamic values filled at runtime
- **Pre/Post Commands** - Run shell commands before and after Claude tasks
- **Live Monitoring** - Embedded terminal for interactive mode, output capture for print mode
- **Queue Management** - Queue tasks for later execution
- **Execution History** - Track completed and failed executions

## Quick Start

1. **Open the app** - Create or open an `AGENTS_*.json` file
2. **Create a template** - Click "+ New Task" in the toolbar
3. **Configure the task** - Set prompt, variables, CLI flags, and commands
4. **Run** - Click the play button or press `Cmd+Enter`

## File Format

Workspaces are stored as `AGENTS_{name}.json` files. See [file-format.md](./file-format.md) for the full schema.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + S` | Save workspace |
| `Cmd/Ctrl + Enter` | Run selected task |
| `Cmd/Ctrl + N` | New task template |
| `Escape` | Cancel / close dialog |

## Default Templates

New workspaces include three starter templates:

1. **Code Review** - Review files for bugs, security issues, and improvements
2. **Test Runner** - Run tests and fix failures (with git stash pre/post commands)
3. **Task Creator** - Meta-task that uses Claude to generate new templates

## Architecture

```
agent-manager/
├── AgentManager.tsx      # Main component with sidebar + main panel layout
├── hooks/
│   ├── useAgentWorkspace.ts   # File load/save, template CRUD, queue management
│   └── useAgentExecution.ts   # Task execution with terminal integration
├── components/
│   ├── Editor/TaskTemplateEditor.tsx    # Template editing form
│   ├── Dialogs/VariableInputDialog.tsx  # Variable input before execution
│   └── Execution/ExecutionMonitor.tsx   # Live terminal + status display
└── utils/
    ├── commandBuilder.ts     # Build Claude CLI commands from templates
    ├── variableResolver.ts   # Resolve {{var}} placeholders
    └── validation.ts         # Validate and normalize workspace data
```

See [api.md](./api.md) for detailed documentation of hooks and utilities.
