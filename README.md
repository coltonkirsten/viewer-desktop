# Viewer

A human-AI collaborative workspace. Files are the source of truth; you and AI agents edit the same files in the same windows.

Viewer is an Electron desktop environment with a modular app system. Each window can host any registered app — file explorer, code editor, terminal, markdown canvas, kanban board, 3D scene, PDF viewer, and more. Apps are React components that share a unified file API, window manager, and command palette.

The core idea: instead of a chat panel bolted onto an IDE, the workspace itself is the surface area for AI collaboration. Agents read and write files alongside you, route through a command palette (`Cmd+P`) and inline AI calls, and operate inside the same multi-window UI you use.

---

## Features

- **Modular app system** — drop a folder into `apps/viewer/src/apps/{name}/` with an `index.ts` registration and a React component, and it shows up everywhere the file system or command palette can launch it.
- **Window manager** — multi-window, multi-tab, draggable, resizable, restorable across sessions.
- **Command palette** (`Cmd+P`) — fuzzy-search apps, files, AI agents, and recent items. Routes natural-language queries to AI backends.
- **Built-in apps** — Monaco code editor, terminal (xterm.js), file explorer, markdown editor (Tiptap), mermaid renderer, PDF viewer, kanban (`.kanban` file type), 3D scene viewer (react-three-fiber), node graph (xyflow).
- **AI integrations** — pluggable agent daemons (`apps/agent-daemon/`, `apps/raven-daemon/`) and a Cerebras chat backend (`apps/raven/`) for fast LLM calls. Bring your own keys.

---

## Project Structure

```
.
├── apps/
│   ├── viewer/              ← Electron + React desktop app
│   ├── agent-daemon/        ← Node daemon for routing AI requests
│   ├── raven-daemon/        ← Long-running AI agent daemon
│   └── raven/               ← Python Flask backend (Cerebras-backed chat)
├── app_file_examples/       ← Sample files for built-in app types
├── docs/
├── AGENTS.md                ← Reference for AI agents working in this repo
└── README.md
```

See [`AGENTS.md`](./AGENTS.md) for the in-repo conventions used by AI agents.

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+ (only if running the `apps/raven/` Flask backend)

### Install and run the desktop app

```bash
cd apps/viewer
npm install
npm run dev
```

This launches the Electron viewer in development mode with hot-reload.

### Build a packaged app

```bash
cd apps/viewer
npm run build
npm run package
```

### Run the AI backend (optional)

The `apps/raven/` Flask server provides a Cerebras-backed chat endpoint used by the in-app AI features. It is optional — Viewer runs standalone without it.

```bash
cd apps/raven
pip install -r requirements.txt
cp ../../.env.example .env       # then edit .env with your API keys
export CEREBRAS_API_KEY="csk-..."
export GEMINI_API_KEY="..."
python cerebra.py
```

The server runs on `http://127.0.0.1:5001`.

---

## Building a New App

Two-file pattern in `apps/viewer/src/apps/{your-app}/`:

**`index.ts`**
```typescript
import type { AppDefinition } from '../types';
import { MyApp } from './MyApp';

export const app: AppDefinition = {
  id: 'my-app',
  name: 'My App',
  icon: 'Sparkles',           // any Lucide icon name
  component: MyApp,
  fileTypes: ['xyz'],         // optional: file extensions this app handles
  defaultSize: { width: 400, height: 300 },
};
```

**`MyApp.tsx`**
```typescript
import type { AppProps } from '../types';
import { useAppContext } from '../AppContext';

export function MyApp({ windowId, tabId, filePath, isActive }: AppProps) {
  const { fileApi, setDirty, closeTab } = useAppContext();
  return <div>Hello from My App!</div>;
}
```

Register the app in `apps/viewer/src/apps/index.ts` and it's instantly available in the command palette and (if `fileTypes` is set) as the handler for those extensions.

Full app authoring reference is in [`AGENTS.md`](./AGENTS.md).

---

## Tech Stack

- **Desktop shell**: Electron 33
- **UI**: React 19, Tailwind CSS, Zustand
- **Editor**: Monaco
- **Terminal**: xterm.js
- **Markdown**: Tiptap, react-markdown, mermaid
- **3D**: react-three-fiber, drei
- **Graphs**: xyflow
- **AI backend**: Flask + Cerebras Cloud SDK (Python)

---

## Contributing

PRs welcome. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the workflow and [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) for community norms.

If you find a security issue, see [`SECURITY.md`](./SECURITY.md).

---

## License

[MIT](./LICENSE) © 2026 Colton Kirsten
