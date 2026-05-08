/**
 * Agent Task IPC Handlers
 * Proxies requests from renderer to the daemon process
 */

import { ipcMain, BrowserWindow } from 'electron';
import WebSocket from 'ws';
import { getDaemonManager, DaemonManager } from '../services/daemonManager';

// Re-export types for convenience
export interface TaskConfig {
  command: string;
  cwd: string;
  env?: Record<string, string>;
  preCommands?: string[];
  postCommands?: string[];
  continueOnPreFail?: boolean;
  continueOnPostFail?: boolean;
  metadata?: {
    templateId?: string;
    templateName?: string;
    [key: string]: unknown;
  };
}

export interface TaskRecord {
  id: string;
  config: TaskConfig;
  status: 'pending' | 'running-pre' | 'running-main' | 'running-post' | 'completed' | 'failed' | 'cancelled';
  stage?: { index: number; total: number; type: 'pre' | 'main' | 'post' };
  pid?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  exitCode?: number;
  outputFile: string;
  error?: string;
}

interface ServerMessage {
  type: 'status' | 'output' | 'completed' | 'error';
  task?: TaskRecord;
  taskId?: string;
  chunk?: string;
  offset?: number;
  exitCode?: number;
  message?: string;
}

let daemonManager: DaemonManager;
let wsConnection: WebSocket | null = null;
let wsReconnectTimer: NodeJS.Timeout | null = null;
let wsConnectPromise: Promise<void> | null = null;

/**
 * Connect to daemon WebSocket for real-time events
 * Returns a promise that resolves when connected (or rejects on failure)
 */
async function connectWebSocket(): Promise<void> {
  // If already connected, return immediately
  if (wsConnection?.readyState === WebSocket.OPEN) {
    return;
  }

  // If connection in progress, wait for it
  if (wsConnectPromise) {
    return wsConnectPromise;
  }

  wsConnectPromise = new Promise<void>(async (resolve, reject) => {
    try {
      // Ensure daemon is running
      await daemonManager.ensureRunning();

      const wsUrl = daemonManager.getDaemonWsUrl();
      console.log(`Connecting to daemon WebSocket: ${wsUrl}`);

      const ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      ws.on('open', () => {
        clearTimeout(timeout);
        console.log('WebSocket connected to daemon');
        wsConnection = ws;
        wsConnectPromise = null;

        // Subscribe to all task updates
        ws.send(JSON.stringify({ type: 'subscribe-all' }));
        resolve();
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message: ServerMessage = JSON.parse(data.toString());

          // Broadcast to all renderer windows
          BrowserWindow.getAllWindows().forEach((win) => {
            if (!win.isDestroyed()) {
              switch (message.type) {
                case 'status':
                  win.webContents.send('agent-task:status', message.task);
                  break;
                case 'output':
                  win.webContents.send('agent-task:output', {
                    taskId: message.taskId,
                    chunk: message.chunk,
                    offset: message.offset,
                  });
                  break;
                case 'completed':
                  win.webContents.send('agent-task:completed', {
                    taskId: message.taskId,
                    exitCode: message.exitCode,
                  });
                  break;
                case 'error':
                  win.webContents.send('agent-task:error', {
                    taskId: message.taskId,
                    message: message.message,
                  });
                  break;
              }
            }
          });
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket disconnected from daemon');
        wsConnection = null;
        wsConnectPromise = null;

        // Attempt to reconnect after delay
        if (!wsReconnectTimer) {
          wsReconnectTimer = setTimeout(() => {
            wsReconnectTimer = null;
            connectWebSocket().catch(console.error);
          }, 2000);
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        console.error('WebSocket error:', error);
        wsConnectPromise = null;
        reject(error);
      });
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      wsConnectPromise = null;
      reject(error);
    }
  });

  return wsConnectPromise;
}

/**
 * Disconnect WebSocket
 */
function disconnectWebSocket(): void {
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }

  if (wsConnection) {
    wsConnection.close();
    wsConnection = null;
  }
}

/**
 * Register all agent task IPC handlers
 */
export function registerAgentTaskHandlers(): void {
  daemonManager = getDaemonManager();

  // Create task
  ipcMain.handle('agent-task:create', async (_, config: TaskConfig) => {
    const response = await daemonManager.request<{ task: TaskRecord }>(
      'POST',
      '/tasks',
      { config }
    );
    return response.task;
  });

  // Start task
  ipcMain.handle('agent-task:start', async (_, taskId: string) => {
    // Ensure WebSocket is connected BEFORE starting the task
    // so we don't miss any output
    try {
      await connectWebSocket();
    } catch (e) {
      console.error('Failed to connect WebSocket before starting task:', e);
      // Continue anyway - we can still start the task
    }

    const response = await daemonManager.request<{ task: TaskRecord }>(
      'POST',
      `/tasks/${taskId}/start`
    );

    return response.task;
  });

  // Cancel task
  ipcMain.handle('agent-task:cancel', async (_, taskId: string) => {
    const response = await daemonManager.request<{ task: TaskRecord }>(
      'POST',
      `/tasks/${taskId}/cancel`
    );
    return response.task;
  });

  // Get task
  ipcMain.handle('agent-task:get', async (_, taskId: string) => {
    const response = await daemonManager.request<{ task: TaskRecord }>(
      'GET',
      `/tasks/${taskId}`
    );
    return response.task;
  });

  // List tasks
  ipcMain.handle('agent-task:list', async (_, filter?: { status?: string }) => {
    const query = filter?.status ? `?status=${filter.status}` : '';
    const response = await daemonManager.request<{ tasks: TaskRecord[] }>(
      'GET',
      `/tasks${query}`
    );

    // Connect WebSocket if there are running tasks (await to ensure it's ready)
    const hasRunning = response.tasks.some((t) => t.status.startsWith('running') || t.status === 'pending');
    if (hasRunning) {
      try {
        await connectWebSocket();
      } catch (e) {
        console.error('Failed to connect WebSocket:', e);
      }
    }

    return response.tasks;
  });

  // Get task output
  ipcMain.handle(
    'agent-task:output',
    async (_, taskId: string, opts?: { offset?: number; limit?: number }) => {
      const params = new URLSearchParams();
      if (opts?.offset !== undefined) params.set('offset', String(opts.offset));
      if (opts?.limit !== undefined) params.set('limit', String(opts.limit));
      const query = params.toString() ? `?${params.toString()}` : '';

      const response = await daemonManager.request<{
        output: string;
        offset: number;
        hasMore: boolean;
      }>('GET', `/tasks/${taskId}/output${query}`);

      return response;
    }
  );

  // Delete task
  ipcMain.handle('agent-task:delete', async (_, taskId: string) => {
    await daemonManager.request('DELETE', `/tasks/${taskId}`);
  });

  // Cleanup tasks
  ipcMain.handle(
    'agent-task:cleanup',
    async (_, opts?: { olderThan?: number; statuses?: string[] }) => {
      const response = await daemonManager.request<{ deleted: string[] }>(
        'POST',
        '/cleanup',
        opts || {}
      );
      return response;
    }
  );

  // Subscribe to task (connects WebSocket if needed)
  ipcMain.handle('agent-task:subscribe', async (_, taskId: string) => {
    await connectWebSocket();
    if (wsConnection?.readyState === WebSocket.OPEN) {
      wsConnection.send(JSON.stringify({ type: 'subscribe', taskId }));
    }
  });

  // Unsubscribe from task
  ipcMain.handle('agent-task:unsubscribe', async (_, taskId: string) => {
    if (wsConnection?.readyState === WebSocket.OPEN) {
      wsConnection.send(JSON.stringify({ type: 'unsubscribe', taskId }));
    }
  });

  console.log('Agent task handlers registered');
}

/**
 * Cleanup function to be called on app quit
 */
export function cleanupAgentTaskHandlers(): void {
  disconnectWebSocket();
}
