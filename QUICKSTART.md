# Quickstart

Get Viewer running locally in about five minutes.

## 1. Prerequisites

- macOS, Linux, or Windows with WSL
- **Node.js 18+** and npm — `node -v` to check
- **Python 3.10+** (only if you want the Cerebras chat backend) — `python3 --version` to check
- Git

## 2. Clone the repo

```bash
git clone https://github.com/coltonkirsten/viewer.git
cd viewer
```

## 3. Run the desktop app

```bash
cd apps/viewer
npm install
npm run dev
```

That's it. An Electron window should open with the workspace.

The first install pulls a lot of native modules (electron-rebuild, node-pty, parcel watcher) so give it a couple minutes.

## 4. Try it out

Once the window is open:

- **`Cmd+P`** — open the command palette. Type to search apps, files, and commands.
- **Drag a file** into a window to open it with the right app for that file type.
- **Right-click the workspace** for the new-window menu.
- Built-in apps include: file explorer, Monaco code editor, terminal, markdown editor, kanban (`.kanban` files), PDF viewer, mermaid renderer, 3D scene viewer, node graph.

Sample files for each app type live in [`app_file_examples/`](./app_file_examples/) — drag them in to try.

## 5. (Optional) Enable AI features

Viewer has three AI-related backends. Enable any subset:

### Cerebras chat backend (`apps/raven/`)

```bash
cd apps/raven
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then edit .env and add your keys
python3 main.py
```

Get a Cerebras key at [cloud.cerebras.ai](https://cloud.cerebras.ai). Optional: a Gemini key from [Google AI Studio](https://aistudio.google.com/apikey).

### Agent daemons (`apps/agent-daemon/`, `apps/raven-daemon/`)

These are Node daemons that wrap Claude Agent SDK / MCP tooling. Each has its own `package.json`:

```bash
cd apps/agent-daemon
npm install
npm start
```

Add an Anthropic key (`ANTHROPIC_API_KEY`) to your shell or to a local `.env` before starting.

### Ultraleap hand tracking (optional)

If you have an Ultraleap sensor, build the WebSocket service in `UltraleapTrackingWebSocket/` per its README, then either keep it at the repo-relative path (default) or set `VIEWER_LEAP_SERVICE_PATH=/absolute/path/to/Ultraleap-Tracking-WS` in your environment before launching the viewer.

## 6. Build your own app

The whole point of Viewer is that adding an app is short.

1. Create `apps/viewer/src/apps/myapp/` with an `index.ts` and a React component.
2. Register the app in `apps/viewer/src/apps/registry.ts`.
3. Reload — your app shows up in the command palette and is launchable from the workspace.

See [`AGENTS.md`](./AGENTS.md) for conventions and [`app_file_examples/`](./app_file_examples/) for working examples.

## Troubleshooting

- **`electron-rebuild` fails on install**: usually a Python or build-tools version issue. On macOS, `xcode-select --install`. On Linux, install `build-essential` and `python3-dev`.
- **`node-pty` build error**: same fix — needs system build tools.
- **Window opens blank**: kill the dev server (`Ctrl+C`), `rm -rf apps/viewer/node_modules apps/viewer/dist`, reinstall.
- **Port already in use**: another Vite or Electron instance is running. `pkill -f electron` or change the dev port in `apps/viewer/electron.vite.config.ts`.

## Where to go next

- [`README.md`](./README.md) — full feature overview and project layout.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — how to send PRs.
- [`AGENTS.md`](./AGENTS.md) — repo conventions for AI agents and human contributors alike.

Happy hacking.
