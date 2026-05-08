import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import { registerFileHandlers } from './ipc/fileHandlers';
import { registerConfigHandlers } from './ipc/configHandlers';
import { registerTerminalHandlers, cleanupTerminalSessions } from './ipc/terminalHandlers';
import { registerBrowserHandlers } from './ipc/browserHandlers';
import { registerAgentTaskHandlers, cleanupAgentTaskHandlers } from './ipc/agentTaskHandlers';
import { registerRavenHandlers, cleanupRavenHandlers } from './ipc/ravenHandlers';
import { registerMcpHandlers, cleanupMcpHandlers } from './ipc/mcpHandlers';
import { registerLeapServiceHandlers, cleanupLeapServiceHandlers } from './ipc/leapServiceHandlers';
import { registerClaudeHandlers, cleanupClaudeHandlers } from './ipc/claudeHandlers';
import { registerWhisperHandlers, cleanupWhisperHandlers } from './ipc/whisperHandlers';
import { FileWatcherService } from './services/fileWatcher';
import { ControlServer } from './services/controlServer';
import { createApplicationMenu } from './menu';

let mainWindow: BrowserWindow | null = null;
let fileWatcher: FileWatcherService | null = null;
let controlServer: ControlServer | null = null;

// Root directory - starts as null (no workspace), set when user opens a folder
let rootDir: string | null = null;

// Parse CLI arguments for folder path
function getInitialFolderFromArgs(): string | null {
  // Skip first two args (electron executable and script path)
  const args = process.argv.slice(2);

  for (const arg of args) {
    // Skip flags
    if (arg.startsWith('-')) continue;

    // Check if it's a valid directory
    const resolvedPath = resolve(arg);
    if (existsSync(resolvedPath)) {
      return resolvedPath;
    }
  }

  return null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: false, // Required for preload to work in electron-vite
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true, // Enable webview tag for browser app
    },
  });

  // Intercept Cmd/Ctrl+Arrow keys BEFORE they reach the renderer (Monaco)
  // This ensures window navigation shortcuts work even when Monaco has focus
  // Monaco aggressively captures these keys for cursor navigation, but we want
  // them for window switching. The 'before-input-event' fires before the
  // renderer's DOM event handlers, bypassing Monaco entirely.
  const isMac = process.platform === 'darwin';
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Check for CmdOrCtrl (meta on Mac, control on Windows/Linux)
    const modifierActive = isMac ? input.meta : input.control;

    if (input.type === 'keyDown' && modifierActive && !input.alt && !input.shift) {
      // Handle Cmd+/ for Claude Command Palette
      if (input.key === '/') {
        event.preventDefault();
        mainWindow?.webContents.send('menu:open-claude-palette');
        return;
      }

      const arrowKeys: Record<string, string> = {
        'ArrowUp': 'menu:focus-up',
        'ArrowDown': 'menu:focus-down',
        'ArrowLeft': 'menu:focus-left',
        'ArrowRight': 'menu:focus-right',
      };

      const menuEvent = arrowKeys[input.key];
      if (menuEvent) {
        event.preventDefault();
        mainWindow?.webContents.send(menuEvent);
      }
    }
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Clean up terminal sessions and file watcher BEFORE the window closes
  // This prevents "Render frame was disposed" errors from async IPC sends
  mainWindow.on('close', () => {
    if (fileWatcher) {
      void fileWatcher.stop(); // Fire and forget - window is closing
    }
    cleanupTerminalSessions();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Set up file watcher (only if we have a root dir)
  fileWatcher = new FileWatcherService();
  if (rootDir) {
    void fileWatcher.start(rootDir, mainWindow);
  }

  // Create application menu
  const menu = createApplicationMenu(mainWindow, () => openFolderDialog(), () => openFolderDialog(true));
  Menu.setApplicationMenu(menu);

  // Register Claude handlers
  registerClaudeHandlers(mainWindow);
}

async function openFolderDialog(addToExisting = false) {
  if (!mainWindow) return;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: addToExisting ? 'Add Folder to Workspace' : 'Open Folder',
  });

  if (!result.canceled && result.filePaths[0]) {
    const newRootDir = result.filePaths[0];
    await changeRootDir(newRootDir);
    // Send event with flag indicating if this is adding to existing workspaces
    mainWindow.webContents.send('app:rootDirChanged', newRootDir, addToExisting);
  }
}

async function changeRootDir(newRootDir: string) {
  rootDir = newRootDir;
  if (fileWatcher && mainWindow) {
    if (rootDir) {
      await fileWatcher.changeRoot(newRootDir, mainWindow);
    }
  } else if (fileWatcher && mainWindow && newRootDir) {
    // Start watcher if it wasn't running
    await fileWatcher.start(newRootDir, mainWindow);
  }
}

// Register IPC handlers
function registerIpcHandlers() {
  // App-related handlers
  ipcMain.handle('app:getRootDir', () => rootDir);

  // Check if we have an active workspace
  ipcMain.handle('app:hasWorkspace', () => rootDir !== null);

  ipcMain.handle('app:setRootDir', async (_, newRootDir: string) => {
    await changeRootDir(newRootDir);
    return rootDir;
  });

  ipcMain.handle('dialog:openFolder', async (_, addToExisting = false) => {
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: addToExisting ? 'Add Folder to Workspace' : 'Open Folder',
    });

    if (!result.canceled && result.filePaths[0]) {
      await changeRootDir(result.filePaths[0]);
      return { path: result.filePaths[0], addToExisting };
    }
    return null;
  });

  // Register file operation handlers
  registerFileHandlers(() => rootDir);

  // Watch/unwatch directory handlers for lazy loading
  ipcMain.handle('fs:watchDir', async (_, dirPath: string) => {
    if (fileWatcher) {
      await fileWatcher.watchDirectory(dirPath);
    }
    return { success: true };
  });

  ipcMain.handle('fs:unwatchDir', async (_, dirPath: string) => {
    if (fileWatcher) {
      await fileWatcher.unwatchDirectory(dirPath);
    }
    return { success: true };
  });

  // Register config handlers
  registerConfigHandlers();

  // Register terminal handlers
  registerTerminalHandlers(() => mainWindow, () => rootDir);

  // Register browser handlers
  registerBrowserHandlers();

  // Register agent task handlers (daemon proxy)
  registerAgentTaskHandlers();

  // Register Raven handlers
  registerRavenHandlers();

  // Register MCP handlers
  registerMcpHandlers(() => mainWindow);

  // Register Leap service handlers
  registerLeapServiceHandlers();

  // Register Whisper handlers
  registerWhisperHandlers(() => mainWindow);
}

// App lifecycle
app.whenReady().then(() => {
  // Check for CLI folder argument
  const initialFolder = getInitialFolderFromArgs();
  if (initialFolder) {
    rootDir = initialFolder;
  }

  registerIpcHandlers();
  createWindow();

  // Start the control server for CLI/agent control
  controlServer = new ControlServer({
    getMainWindow: () => mainWindow,
    getRootDir: () => rootDir,
  });
  controlServer.start().catch(err => console.error('[ControlServer] Failed to start:', err));

  // If we have an initial folder from CLI, notify renderer after window is ready
  if (initialFolder && mainWindow) {
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow?.webContents.send('app:initialFolder', initialFolder);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (fileWatcher) {
    void fileWatcher.stop();
  }
  cleanupTerminalSessions();
  cleanupLeapServiceHandlers();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (fileWatcher) {
    void fileWatcher.stop();
  }
  if (controlServer) {
    controlServer.stop();
  }
  cleanupTerminalSessions();
  cleanupAgentTaskHandlers();
  cleanupRavenHandlers();
  cleanupMcpHandlers();
  cleanupLeapServiceHandlers();
  cleanupClaudeHandlers();
  cleanupWhisperHandlers();
});
