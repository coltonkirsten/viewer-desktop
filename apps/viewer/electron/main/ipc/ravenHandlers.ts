/**
 * Raven IPC Handlers
 * Handles communication between renderer and raven-daemon
 */

import { ipcMain, BrowserWindow } from 'electron';
import WebSocket from 'ws';
import { getRavenDaemonManager } from '../services/ravenDaemonManager';

let wsConnection: WebSocket | null = null;
let wsReconnectTimeout: NodeJS.Timeout | null = null;
let isConnecting = false;

/**
 * Connect to raven-daemon WebSocket for real-time events
 */
async function connectWebSocket(): Promise<void> {
  // Prevent duplicate connection attempts
  if (isConnecting) {
    console.log('WebSocket connection already in progress, skipping');
    return;
  }

  // Already connected
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected');
    return;
  }

  isConnecting = true;
  const daemonManager = getRavenDaemonManager();

  try {
    // Ensure daemon is running
    await daemonManager.ensureRunning();

    // Close existing connection if not already open
    if (wsConnection && wsConnection.readyState !== WebSocket.CLOSED) {
      wsConnection.close();
      wsConnection = null;
    }

    const wsUrl = daemonManager.getDaemonWsUrl();
    console.log(`Connecting to Raven WebSocket: ${wsUrl}`);

    wsConnection = new WebSocket(wsUrl);
  } catch (error) {
    isConnecting = false;
    throw error;
  }

  wsConnection.on('open', () => {
    console.log('Connected to Raven WebSocket');
    isConnecting = false;

    // Subscribe to all channels
    if (wsConnection) {
      wsConnection.send(JSON.stringify({ type: 'subscribe', channel: 'all' }));
    }
  });

  wsConnection.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      // Broadcast to all renderer windows
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          switch (message.type) {
            case 'status':
              win.webContents.send('raven:status', message.state);
              break;
            case 'transcript':
              win.webContents.send('raven:transcript', message.entry);
              break;
            case 'function-log':
              win.webContents.send('raven:functionLog', message.entry);
              break;
            case 'error':
              win.webContents.send('raven:error', message.message);
              break;
          }
        }
      }
    } catch (error) {
      console.error('Error parsing Raven WebSocket message:', error);
    }
  });

  wsConnection.on('close', () => {
    console.log('Raven WebSocket closed');
    wsConnection = null;
    isConnecting = false;

    // Attempt to reconnect after delay
    if (!wsReconnectTimeout) {
      wsReconnectTimeout = setTimeout(() => {
        wsReconnectTimeout = null;
        connectWebSocket().catch(console.error);
      }, 5000);
    }
  });

  wsConnection.on('error', (error) => {
    console.error('Raven WebSocket error:', error);
    isConnecting = false;
  });
}

/**
 * Register all Raven IPC handlers
 */
export function registerRavenHandlers(): void {
  const daemonManager = getRavenDaemonManager();

  // Status & Control
  ipcMain.handle('raven:status', async () => {
    return daemonManager.request('GET', '/status');
  });

  ipcMain.handle('raven:start', async (_, mode?: string) => {
    const body = mode ? { mode } : {};
    return daemonManager.request('POST', '/start', body);
  });

  ipcMain.handle('raven:stop', async () => {
    return daemonManager.request('POST', '/stop');
  });

  ipcMain.handle('raven:setMode', async (_, mode: string) => {
    return daemonManager.request('POST', '/mode', { mode });
  });

  // Transcripts
  ipcMain.handle('raven:getTranscripts', async (_, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return daemonManager.request('GET', `/transcripts${query}`);
  });

  ipcMain.handle('raven:subscribeTranscripts', async () => {
    await connectWebSocket();
  });

  // Function logs
  ipcMain.handle('raven:getFunctionLogs', async (_, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return daemonManager.request('GET', `/function-logs${query}`);
  });

  // Memories CRUD
  ipcMain.handle('raven:memory:list', async () => {
    return daemonManager.request('GET', '/memories');
  });

  ipcMain.handle('raven:memory:get', async (_, id: string) => {
    return daemonManager.request('GET', `/memories/${id}`);
  });

  ipcMain.handle('raven:memory:create', async (_, data: { text: string; tags?: string[] }) => {
    return daemonManager.request('POST', '/memories', data);
  });

  ipcMain.handle('raven:memory:update', async (_, id: string, data: { text?: string; tags?: string[] }) => {
    return daemonManager.request('PUT', `/memories/${id}`, data);
  });

  ipcMain.handle('raven:memory:delete', async (_, id: string) => {
    return daemonManager.request('DELETE', `/memories/${id}`);
  });

  ipcMain.handle('raven:memory:search', async (_, query: string) => {
    return daemonManager.request('POST', '/memories/search', { query });
  });

  // Tools CRUD
  ipcMain.handle('raven:tool:list', async () => {
    return daemonManager.request('GET', '/tools');
  });

  ipcMain.handle('raven:tool:get', async (_, name: string) => {
    return daemonManager.request('GET', `/tools/${encodeURIComponent(name)}`);
  });

  ipcMain.handle('raven:tool:create', async (_, tool: {
    name: string;
    description: string;
    parameters: unknown[];
    code?: string;
  }) => {
    return daemonManager.request('POST', '/tools', tool);
  });

  ipcMain.handle('raven:tool:update', async (_, name: string, updates: {
    description?: string;
    parameters?: unknown[];
    enabled?: boolean;
    code?: string;
  }) => {
    return daemonManager.request('PUT', `/tools/${encodeURIComponent(name)}`, updates);
  });

  ipcMain.handle('raven:tool:delete', async (_, name: string) => {
    return daemonManager.request('DELETE', `/tools/${encodeURIComponent(name)}`);
  });

  ipcMain.handle('raven:tool:setEnabled', async (_, name: string, enabled: boolean) => {
    return daemonManager.request('PUT', `/tools/${encodeURIComponent(name)}`, { enabled });
  });

  // Configuration
  ipcMain.handle('raven:config:get', async () => {
    return daemonManager.request('GET', '/config');
  });

  ipcMain.handle('raven:config:update', async (_, updates: Record<string, unknown>) => {
    return daemonManager.request('PUT', '/config', updates);
  });

  ipcMain.handle('raven:config:getPrompts', async () => {
    return daemonManager.request('GET', '/config/prompts');
  });

  ipcMain.handle('raven:config:updatePrompts', async (_, prompts: Record<string, unknown>) => {
    return daemonManager.request('PUT', '/config/prompts', prompts);
  });

  ipcMain.handle('raven:config:getAllowedApps', async () => {
    return daemonManager.request('GET', '/config/allowed-apps');
  });

  ipcMain.handle('raven:config:setAllowedApps', async (_, apps: string[]) => {
    return daemonManager.request('PUT', '/config/allowed-apps', { apps });
  });

  // Audio device configuration
  ipcMain.handle('raven:config:getAudioDevices', async () => {
    return daemonManager.request('GET', '/audio-devices');
  });

  ipcMain.handle('raven:config:getAudioDeviceConfig', async () => {
    return daemonManager.request('GET', '/config/audio-devices');
  });

  ipcMain.handle('raven:config:setAudioDeviceConfig', async (_, config: {
    input?: number | string | null;
    output?: number | string | null;
  }) => {
    return daemonManager.request('PUT', '/config/audio-devices', config);
  });

  console.log('Raven handlers registered');
}

/**
 * Clean up Raven handlers and connections
 */
export function cleanupRavenHandlers(): void {
  if (wsReconnectTimeout) {
    clearTimeout(wsReconnectTimeout);
    wsReconnectTimeout = null;
  }

  if (wsConnection) {
    wsConnection.close();
    wsConnection = null;
  }
}
