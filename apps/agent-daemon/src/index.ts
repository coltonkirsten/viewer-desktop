/**
 * Agent Task Daemon
 * Standalone Node.js server for executing agent tasks independently of the viewer app
 */

import * as http from 'http';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { TaskManager } from './taskManager';
import type {
  TaskConfig,
  TaskRecord,
  ClientMessage,
  ServerMessage,
  HealthResponse,
  GetOutputResponse,
  CleanupResponse,
  TaskStatus,
} from './types';

// Configuration from environment
const PORT = parseInt(process.env.DAEMON_PORT || '7432', 10);
const DATA_DIR = process.env.DAEMON_DATA_DIR || path.join(os.homedir(), '.config', 'viewer', 'daemon');
const SAVE_INTERVAL = 500; // ms

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

// Write PID file
const pidFile = path.join(DATA_DIR, 'daemon.pid');
fs.writeFileSync(pidFile, process.pid.toString());

// Track connected WebSocket clients and their subscriptions
const clients = new Map<WebSocket, Set<string>>();

// Broadcast a message to clients subscribed to a task
function broadcast(taskId: string, message: ServerMessage): void {
  const messageStr = JSON.stringify(message);
  for (const [client, subscriptions] of clients) {
    if (client.readyState === WebSocket.OPEN) {
      if (subscriptions.has(taskId) || subscriptions.has('*')) {
        client.send(messageStr);
      }
    }
  }
}

// Broadcast to all connected clients
function broadcastAll(message: ServerMessage): void {
  const messageStr = JSON.stringify(message);
  for (const [client] of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  }
}

// Initialize task manager
const taskManager = new TaskManager({
  dataDir: DATA_DIR,
  saveInterval: SAVE_INTERVAL,
  onStatusChange: (task: TaskRecord) => {
    broadcast(task.id, { type: 'status', task });
  },
  onOutput: (taskId: string, chunk: string, offset: number) => {
    broadcast(taskId, { type: 'output', taskId, chunk, offset });
  },
  onCompleted: (taskId: string, exitCode: number) => {
    broadcast(taskId, { type: 'completed', taskId, exitCode });
  },
});

// Reconnect to any tasks that were running when daemon stopped
taskManager.reconnectTasks();

// Track daemon start time for uptime
const startTime = Date.now();

// Parse JSON body from request
function parseBody<T>(req: http.IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {} as T);
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Parse URL query parameters
function parseQuery(url: string): URLSearchParams {
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) return new URLSearchParams();
  return new URLSearchParams(url.slice(queryIndex + 1));
}

// Send JSON response
function sendJson(res: http.ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Send error response
function sendError(res: http.ServerResponse, status: number, message: string): void {
  sendJson(res, status, { error: message });
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const url = req.url || '/';
  const method = req.method || 'GET';

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // Health check
    if (url === '/health' && method === 'GET') {
      const stats = taskManager.getStats();
      const response: HealthResponse = {
        status: 'ok',
        uptime: Date.now() - startTime,
        taskCount: stats.taskCount,
        runningCount: stats.runningCount,
      };
      sendJson(res, 200, response);
      return;
    }

    // Create task
    if (url === '/tasks' && method === 'POST') {
      const body = await parseBody<{ config?: TaskConfig }>(req);
      if (!body.config) {
        sendError(res, 400, 'Missing config');
        return;
      }
      const task = taskManager.createTask(body.config);
      sendJson(res, 201, { task });
      return;
    }

    // List tasks
    if (url.startsWith('/tasks') && method === 'GET' && !url.includes('/tasks/')) {
      const query = parseQuery(url);
      const status = query.get('status') as TaskStatus | null;
      const tasks = taskManager.getAllTasks(status || undefined);
      sendJson(res, 200, { tasks });
      return;
    }

    // Task-specific routes
    const taskMatch = url.match(/^\/tasks\/([^/]+)(\/.*)?$/);
    if (taskMatch) {
      const taskId = taskMatch[1];
      const action = taskMatch[2] || '';

      // Get task
      if (action === '' && method === 'GET') {
        const task = taskManager.getTask(taskId);
        if (!task) {
          sendError(res, 404, 'Task not found');
          return;
        }
        sendJson(res, 200, { task });
        return;
      }

      // Start task
      if (action === '/start' && method === 'POST') {
        try {
          const task = await taskManager.startTask(taskId);
          sendJson(res, 200, { task });
        } catch (e) {
          sendError(res, 400, (e as Error).message);
        }
        return;
      }

      // Cancel task
      if (action === '/cancel' && method === 'POST') {
        try {
          const task = taskManager.cancelTask(taskId);
          sendJson(res, 200, { task });
        } catch (e) {
          sendError(res, 400, (e as Error).message);
        }
        return;
      }

      // Get task output
      if (action === '/output' && method === 'GET') {
        const query = parseQuery(url);
        const offset = parseInt(query.get('offset') || '0', 10);
        const limit = parseInt(query.get('limit') || '1048576', 10);
        try {
          const result = taskManager.getTaskOutput(taskId, offset, limit);
          const response: GetOutputResponse = result;
          sendJson(res, 200, response);
        } catch (e) {
          sendError(res, 404, (e as Error).message);
        }
        return;
      }

      // Delete task
      if (action === '' && method === 'DELETE') {
        try {
          taskManager.deleteTask(taskId);
          sendJson(res, 200, { deleted: true });
        } catch (e) {
          sendError(res, 400, (e as Error).message);
        }
        return;
      }
    }

    // Cleanup tasks
    if (url === '/cleanup' && method === 'POST') {
      const body = await parseBody<{ olderThan?: number; statuses?: TaskStatus[] }>(req);
      const deleted = taskManager.cleanup(body.olderThan, body.statuses);
      const response: CleanupResponse = { deleted };
      sendJson(res, 200, response);
      return;
    }

    // 404 for unknown routes
    sendError(res, 404, 'Not found');
  } catch (e) {
    console.error('Request error:', e);
    sendError(res, 500, 'Internal server error');
  }
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket client connected');
  clients.set(ws, new Set());

  ws.on('message', (data: Buffer) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'subscribe':
          clients.get(ws)?.add(message.taskId);
          break;
        case 'unsubscribe':
          clients.get(ws)?.delete(message.taskId);
          break;
        case 'subscribe-all':
          clients.get(ws)?.add('*');
          break;
        case 'unsubscribe-all':
          clients.get(ws)?.clear();
          break;
      }
    } catch (e) {
      console.error('Invalid WebSocket message:', e);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Start server
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Agent Task Daemon running on http://127.0.0.1:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
  console.log(`PID: ${process.pid}`);
});

// Graceful shutdown
function shutdown(signal: string): void {
  console.log(`\nReceived ${signal}, shutting down...`);

  // Close WebSocket connections
  for (const [client] of clients) {
    client.close();
  }
  clients.clear();

  // Shutdown task manager
  taskManager.shutdown();

  // Remove PID file
  try {
    fs.unlinkSync(pidFile);
  } catch {
    // Ignore
  }

  // Close server
  server.close(() => {
    console.log('Daemon stopped');
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.log('Force exit after timeout');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Export for testing
export { taskManager, server };
