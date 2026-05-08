# AGENTS.md

> Quick reference for AI agents working in this directory.

## What Is This?

A human-AI collaborative workspace. Files are the source of truth. You and the human edit the same files.

## Directory Map

```
/root
├── AGENTS.md              ← You are here
├── project_vision.md      ← Full vision & philosophy
├── personal_context/      ← User identity, preferences
├── projects/
│   ├── active/            ← Current work
│   ├── ideas/             ← Experiments
│   └── archived/          ← Paused/done
├── apps/                  ← UI applications
├── tools/                 ← Shared commands & scripts
└── inbox/                 ← Unsorted items
```

## Before You Start

1. Read `personal_context/user-profile.md` to understand who you're working with
2. Read `personal_context/preferences.md` for operational preferences, style guides, and settings
3. Check `project.json` in any project before modifying it
4. Ask if uncertain about structure changes

## Project Rules

- Every project has a `project.json` (required)
- Structure within projects is flexible
- Update `currentState` in `project.json` after significant work

## Conventions

| Pattern    | Example                                      |
| ---------- | -------------------------------------------- |
| Naming     | `kebab-case` for directories and files       |
| Links      | `[[project-name]]` wiki-style cross-refs     |
| Data files | `.json` for structured data, `.md` for prose |

## Do's and Don'ts

**DO:**

- Read docs before acting
- Explain structural changes
- Update docs when you change things
- Use `inbox/` for quick captures

**DON'T:**

- Create top-level directories without discussion
- Delete files without explicit instruction
- Guess when you can ask

## Quick Commands

| Task                     | Location                              |
| ------------------------ | ------------------------------------- |
| Add a new active project | `projects/active/{name}/project.json` |
| Quick note/brain dump    | `inbox/`                              |
| New shared tool          | `tools/commands/` or `tools/scripts/` |
| Build a UI app           | `apps/{app-name}/`                    |

## Building Viewer Apps

The viewer (`apps/viewer/`) has a modular app system. Apps are isolated components that render inside windows. Two app types exist: **standalone apps** (no file) and **file-based apps** (open specific file types).

### Quick Start

Create a folder in `apps/viewer/src/apps/{your-app}/` with two files:

**1. `index.ts`** - App definition
```typescript
import type { AppDefinition } from '../types';
import { MyApp } from './MyApp';

export const app: AppDefinition = {
  id: 'my-app',           // Unique identifier (kebab-case)
  name: 'My App',         // Display name (shown in Cmd+P search)
  icon: 'Sparkles',       // Lucide icon name (PascalCase)
  component: MyApp,       // Your React component
  fileTypes: ['xyz'],     // Optional: file extensions this app handles
  defaultSize: { width: 400, height: 300 },
};
```

**2. `MyApp.tsx`** - Your component
```typescript
import type { AppProps } from '../types';
import { useAppContext } from '../AppContext';

export function MyApp({ windowId, tabId, filePath, isActive }: AppProps) {
  const { fileApi, setDirty, closeTab } = useAppContext();

  // Your app logic here
  return <div>Hello from My App!</div>;
}
```

### App Props

| Prop | Type | Description |
|------|------|-------------|
| `windowId` | string | Current window ID (unique per window) |
| `tabId` | string | Current tab ID (unique per tab) |
| `filePath` | string \| undefined | File path if opened from file; app ID if standalone app |
| `isActive` | boolean | Whether this tab is currently visible/focused |

### App Context (useAppContext) - Complete API

| Method/Prop | Type | Description |
|-------------|------|-------------|
| `windowId` | string | Current window ID |
| `tabId` | string | Current tab ID |
| `fileApi.readFile(path)` | Promise<{content, isImage?}> | Read file (detects images) |
| `fileApi.writeFile(path, content)` | Promise<void> | Write file to disk |
| `setDirty(isDirty)` | void | Mark tab as having unsaved changes (shows indicator) |
| `updateTab(updates)` | void | Update tab metadata: `{title?, filePath?}` |
| `setSuspended(isSuspended)` | void | Unmount app to save resources (important for long-running apps) |
| `closeTab()` | void | Close current tab |
| `openFile(path)` | void | Open file in new tab within current window (auto-detects app type) |
| `openWindow(appId, filePath?)` | void | Open new window with app (standalone or file-based) |

### App Types & Patterns

#### File-Based Apps
Apps that associate with specific file types. Auto-opened when user opens matching files.

```typescript
export const app: AppDefinition = {
  id: 'markdown-editor',
  name: 'Markdown',
  icon: 'FileText',
  component: MarkdownEditor,
  fileTypes: ['md', 'markdown'],  // Will open .md files
  defaultSize: { width: 800, height: 600 },
};
```

**Key behavior:** `filePath` will be the file path. Implement file watching if needed.

#### Standalone Apps
Apps that run independently (calculator, terminal, agent manager). No file association.

```typescript
export const app: AppDefinition = {
  id: 'calculator',
  name: 'Calculator',
  icon: 'Calculator',
  component: Calculator,
  // NO fileTypes field
  defaultSize: { width: 320, height: 480 },
};
```

**Key behavior:** `filePath` will be the `appId` (e.g., 'calculator'). Use this to persist state.

#### Daemon-Style Apps
Long-running apps that coordinate external processes or services (e.g., Agent Manager controlling background daemon).

```typescript
export const app: AppDefinition = {
  id: 'agent-manager',
  name: 'Agents',
  icon: 'Bot',
  component: AgentManager,
  fileTypes: ['agents'],  // Open AGENTS_*.json files
  defaultSize: { width: 1200, height: 800 },
};
```

**Key patterns:**
- Use custom hooks to manage daemon connection/status (e.g., `useDaemonStatus`, `useAgentExecutionDaemon`)
- Implement connection health checks
- Use `setSuspended()` when app is hidden to pause daemon polling
- Show connection status in UI (connected/disconnected/checking)
- Handle graceful reconnection on daemon restart

### Styling Guide

All apps must follow the holographic Iron Man design system. Use CSS variables for theming:

```typescript
// CSS Variables (defined in root viewer stylesheet)
const colors = {
  background: 'var(--holo-bg)',        // Main dark background
  text: 'var(--holo-text)',            // Primary text
  muted: 'var(--holo-muted)',          // Dimmed text
  accent: 'var(--holo-accent)',        // Highlight color
  border: 'var(--holo-border)',        // Border color
};

// Example usage in JSX:
<div className="h-full flex flex-col bg-[var(--holo-bg)] text-[var(--holo-text)]">
  <button className="bg-[var(--holo-accent)]/20 text-[var(--holo-accent)] hover:bg-[var(--holo-accent)]/30">
    Action
  </button>
</div>
```

**Design principles:**
- Dark theme with high-contrast accents
- Translucent panels (`bg-[rgba(15,15,25,0.5)]`)
- Subtle glows on interactive elements
- Smooth transitions (use `transition-colors`, `transition-opacity`)
- Generous whitespace, clean typography
- Status indicators use semantic colors: green (success), red (error), yellow (warning), blue (info)

**Example status indicator:**
```typescript
<div className={`px-2 py-1 text-xs rounded ${
  isDaemonConnected
    ? 'bg-green-500/20 text-green-400'
    : 'bg-red-500/20 text-red-400'
}`}>
  {isDaemonConnected ? 'Connected' : 'Offline'}
</div>
```

### Common Patterns

**Performance: Pause work when tab is inactive**
```typescript
useEffect(() => {
  if (!isActive) return;  // Skip expensive operations

  // Poll data, run timers, etc.
}, [isActive]);
```

**Dirty state tracking**
```typescript
useEffect(() => {
  setDirty(hasChanges);
}, [hasChanges, setDirty]);
```

**File I/O with error handling**
```typescript
const { fileApi } = useAppContext();

const loadFile = async () => {
  try {
    const { content } = await fileApi.readFile(filePath);
    setContent(content);
  } catch (error) {
    console.error('Failed to load:', error);
  }
};
```

**Update tab title (for standalone apps)**
```typescript
const { updateTab } = useAppContext();

useEffect(() => {
  updateTab({ title: `My App - ${someState}` });
}, [someState, updateTab]);
```

### Tips & Best Practices

- Apps are auto-discovered via `import.meta.glob` - just create the folder, no registration needed
- Apps are wrapped in ErrorBoundary - exceptions won't crash the viewer
- Use `isActive` to pause expensive operations when tab is hidden
- Use `setSuspended()` for resource-intensive apps (frees memory when hidden)
- Icons use [Lucide React](https://lucide.dev/icons/) names (PascalCase) - search by name on lucide.dev
- Keep app folder structure flat unless complexity demands organization
- For file-based apps, consider watching file for external changes
- File type detection is automatic in `openFile()` based on registered `fileTypes`

### Example Apps (Reference)

- `apps/viewer/src/apps/calculator/` - Standalone app (no file, pure UI state)
- `apps/viewer/src/apps/markdown-editor/` - File-based app (.md files)
- `apps/viewer/src/apps/terminal/` - System integration (subprocess spawning)
- `apps/viewer/src/apps/agent-manager/` - Daemon-style (manages background processes)
- `apps/viewer/src/apps/json-viewer/` - File-based (.json files, read-only)
- `apps/viewer/src/apps/image-viewer/` - File-based (image formats)

### Launching Apps

**User-initiated:**
- Cmd+P → Search app name → Enter
- Double-click file to open with matching app

**Programmatic:**
```typescript
const { openWindow, openFile } = useAppContext();

// Open standalone app in new window
openWindow('calculator');

// Open file in new window (auto-detects app type)
openWindow('markdown-editor', '/path/to/file.md');

// Open file in new tab (current window)
openFile('/path/to/file.md');
```

## Need More Context?

- **Full vision**: `projects/active/personal_os/notebook/project_vision.md`
- **Personal OS ideas**: `projects/active/personal_os/notebook/ideas.md`
- **User identity**: `personal_context/user-profile.md`
- **User preferences & settings**: `personal_context/preferences.md` (keep updated!)
- **Specific project**: `projects/{status}/{name}/project.json`
- **Viewer architecture**: `apps/viewer/` (React + Electron + Zustand)
