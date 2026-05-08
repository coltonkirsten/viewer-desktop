# Viewer Control — Agent Guidelines

> You have a display. Use it. When something is relevant, show it. When it stops being relevant, clean it up. The user should never have to ask you to open or close things — you just do it, like Jarvis.

## Core Philosophy

You are working inside a project that has a **viewer application** running alongside you. The viewer is your display surface — it can render markdown, code, diagrams, images, PDFs, HTML, and more. You control it with the `viewer-ctl` CLI.

**Show, don't tell.** If you mention a file, open it. If you create a diagram, display it. If you write an HTML report, show it. The user is looking at the viewer — put things there instead of dumping text into the terminal.

---

## Behavior Rules

### 1. Proactively show relevant content

When your work produces or references something visual, open it in the viewer automatically.

**Do this:**
- You create a mermaid diagram → write the `.mmd` file → `viewer-ctl open diagram.mmd`
- You generate an HTML report → write the `.html` file → `viewer-ctl open report.html`
- You're explaining a file → `viewer-ctl open src/auth/login.ts` so the user can see it
- You find relevant docs → `viewer-ctl open docs/architecture.md`
- The user asks about images → `viewer-ctl open assets/logo.png`

**Don't do this:**
- Open every file you read during research (too noisy)
- Open files the user didn't ask about and aren't directly relevant
- Open the same file twice (viewer-ctl deduplicates, but be intentional)

### 2. Check before you act

Before opening files, check what's already visible. Don't flood the viewer.

```bash
# See what's already open
viewer-ctl list
```

Use the output to decide whether to open new windows or reuse existing ones.

### 3. Arrange windows thoughtfully

When showing multiple related files, arrange them so the user can see everything at once.

```bash
# Show two files side by side
viewer-ctl open src/api/routes.ts src/api/handlers.ts
viewer-ctl layout split

# Show three related files
viewer-ctl open src/model.ts src/controller.ts src/view.ts
viewer-ctl layout thirds

# Show four files in quadrants
viewer-ctl open file1.ts file2.ts file3.ts file4.ts
viewer-ctl layout quarters

# Auto-tile everything that's open
viewer-ctl layout tile
```

When showing a single important file, use focus layout:
```bash
viewer-ctl open README.md
viewer-ctl layout focus
```

### 4. Clean up when done

If you opened windows for a specific task and that task is complete, close them. Don't leave stale windows cluttering the viewer.

```bash
# Check what's open
viewer-ctl list
# Close a window you no longer need
viewer-ctl close --window <window-id>
```

Use your judgment — if the user might still want to look at something, leave it open. If it was temporary scaffolding (a diagram you generated to explain something), close it when the conversation moves on.

### 5. Create visualizations when they help

The viewer supports mermaid diagrams (`.mmd`), HTML (`.html`), and markdown (`.md`). When a visual explanation would be clearer than text, create one and show it.

**Architecture overview:**
```bash
cat > /tmp/architecture.mmd << 'EOF'
graph TD
    A[Client] --> B[API Gateway]
    B --> C[Auth Service]
    B --> D[User Service]
    C --> E[(Database)]
    D --> E
EOF
viewer-ctl open /tmp/architecture.mmd
```

**Rich report:**
```bash
cat > /tmp/analysis.html << 'EOF'
<html><body style="background:#0a0a0f;color:#e0e0e0;font-family:monospace;padding:2rem">
<h1>Code Analysis</h1>
<!-- your content -->
</body></html>
EOF
viewer-ctl open /tmp/analysis.html
```

**Summary document:**
```bash
cat > /tmp/summary.md << 'EOF'
# Investigation Summary
- Found 3 issues in auth module
- ...
EOF
viewer-ctl open /tmp/summary.md
```

Prefer writing temp files to `/tmp/` for generated content that isn't part of the project. For content the user wants to keep, write it to the project directory and open it.

### 6. Use the right app for the job

The viewer auto-detects file types, but you can force a specific app:

```bash
# Force a file to open in a specific viewer
viewer-ctl open data.json              # auto-detects json-viewer
viewer-ctl open styles.css             # auto-detects text-editor
viewer-ctl open diagram.mmd           # auto-detects mermaid-viewer

# Open standalone apps
viewer-ctl open --app settings         # Settings panel
viewer-ctl open --app terminal         # New terminal
viewer-ctl open --app browser          # Web browser
viewer-ctl open --app calculator       # Calculator
viewer-ctl open --app knowledge-graph  # Mind map
```

### 7. Be tasteful

Not everything needs to be shown. Use the viewer when it genuinely helps the user understand or interact with something. A few well-chosen windows are better than a wall of open files.

**Good judgment:**
- User asks "what does the auth flow look like?" → Create a mermaid diagram and open it
- User asks "fix the bug in login.ts" → Open login.ts so they can see your changes, maybe open the test file in split view
- User asks "summarize this codebase" → Create a markdown summary and open it, maybe with an architecture diagram in split view

**Bad judgment:**
- User asks "fix the typo on line 5" → Don't open the file, just fix it
- You're reading 20 files to understand the codebase → Don't open any of them, just do your research
- User asks a simple factual question → Don't open anything

---

## CLI Reference

All commands output JSON by default (for agent parsing). Add `--human` for colored human-readable output.

### `viewer-ctl status`

Check if the viewer is running. **Call this before other commands** if you're unsure.

```bash
viewer-ctl status
# → {"ok":true,"status":"running","port":7434,"pid":12345,"bridgeReady":true}
```

Exit code 0 if running, 1 if not.

### `viewer-ctl open <path> [<path2> ...]`

Open one or more files. The viewer auto-detects the right app from the file extension.

```bash
# Single file
viewer-ctl open src/App.tsx
# → {"ok":true,"windowId":"window-3","tabId":"tab-7","appId":"text-editor"}

# Multiple files (opens as tabs)
viewer-ctl open src/App.tsx src/main.ts README.md
# → {"ok":true,"opened":[...], "errors":[]}

# Open a directory as a workspace
viewer-ctl open /path/to/project
# → {"ok":true,"workspaceId":"workspace-2"}
```

If a file is already open, it focuses the existing tab instead of creating a duplicate.

### `viewer-ctl open --app <app-id>`

Open a standalone app (no file needed).

```bash
viewer-ctl open --app settings
viewer-ctl open --app terminal
viewer-ctl open --app browser
viewer-ctl open --app calculator
viewer-ctl open --app knowledge-graph
viewer-ctl open --app mcp-inspector
```

### `viewer-ctl list`

Get the full state of all workspaces, windows, and tabs.

```bash
viewer-ctl list
# → {"ok":true,"workspaces":[{"id":"workspace-1","name":"my-project","isActive":true,"windows":[...]}],...}
```

Each window contains its tabs with `id`, `title`, `filePath`, `appId`, and `isActive`.

### `viewer-ctl apps`

List all available apps and their supported file types.

```bash
viewer-ctl apps
# → {"ok":true, ...} with array of {id, name, fileTypes, defaultSize}
```

### `viewer-ctl layout <preset>`

Arrange windows using a layout preset.

| Preset | Description |
|--------|-------------|
| `focus` | Single focused window, others minimized |
| `split` | Two windows side by side |
| `thirds` | Three windows in equal columns |
| `quarters` | Four windows in a 2x2 grid |
| `tile` | Auto-tile all open windows |

```bash
viewer-ctl layout split
# → {"ok":true,"success":true}
```

### `viewer-ctl close --window <id> [--tab <id>]`

Close a window or a specific tab within a window.

```bash
# Close entire window
viewer-ctl close --window window-3

# Close specific tab
viewer-ctl close --window window-3 --tab tab-7
```

Get window/tab IDs from `viewer-ctl list`.

### `viewer-ctl focus <window-id>`

Bring a window to the front.

```bash
viewer-ctl focus window-3
```

### `viewer-ctl workspace <path|list>`

Open a directory as a workspace or list open workspaces.

```bash
# Open/switch to workspace
viewer-ctl workspace /path/to/project

# List open workspaces
viewer-ctl workspace list
```

### `viewer-ctl terminal [--cwd <dir>]`

Open a new terminal window.

```bash
# Default terminal
viewer-ctl terminal

# Terminal in specific directory
viewer-ctl terminal --cwd /path/to/dir
```

### `viewer-ctl terminal --write <session-id> --data <text>`

Write text to an existing terminal session.

```bash
viewer-ctl terminal --write terminal-1 --data "npm test"
```

---

## Supported File Types

| Extension | App | What it does |
|-----------|-----|-------------|
| `.md`, `.markdown` | Markdown Editor | Rendered markdown with edit mode |
| `.json` | JSON Viewer | Syntax-highlighted JSON tree |
| `.pdf` | PDF Viewer | Document viewer |
| `.png`, `.jpg`, `.gif`, `.svg`, `.webp`, `.ico`, `.bmp` | Image Viewer | Image display |
| `.html`, `.htm` | HTML Preview | Rendered HTML page |
| `.mmd`, `.mermaid` | Mermaid Viewer | Rendered diagrams (flowcharts, sequence, etc.) |
| `.tex`, `.latex` | LaTeX Viewer | Rendered LaTeX |
| `.kanban`, `kb_*.json` | Kanban Board | Task board |
| `.agents`, `AGENTS_*.json` | Agent Manager | Task templates |
| `.api` | API Manager | API request testing |
| `.mindmap` | Knowledge Graph | Mind map visualization |
| `.js`, `.ts`, `.tsx`, `.py`, `.go`, `.rs`, `.c`, `.cpp`, etc. | Text Editor | Monaco code editor |
| Everything else | Text Editor | Fallback |

---

## Quick Patterns

**"Show me the relevant files for X"**
```bash
viewer-ctl open src/auth/login.ts src/auth/middleware.ts src/auth/types.ts
viewer-ctl layout thirds
```

**"Create a visual overview of this system"**
```bash
cat > /tmp/system-overview.mmd << 'EOF'
graph TD
    subgraph Frontend
        A[React App] --> B[Store]
    end
    subgraph Backend
        C[API] --> D[DB]
    end
    A --> C
EOF
viewer-ctl open /tmp/system-overview.mmd
```

**"Open settings"**
```bash
viewer-ctl open --app settings
```

**"I made changes to these files, show the user"**
```bash
viewer-ctl open src/components/Header.tsx src/components/Footer.tsx
viewer-ctl layout split
```

**"Clean up after a task"**
```bash
# Get current state
viewer-ctl list
# Close windows that are no longer needed
viewer-ctl close --window window-5
viewer-ctl close --window window-6
```

**"Check if viewer is available before acting"**
```bash
viewer-ctl status && viewer-ctl open result.html
```
