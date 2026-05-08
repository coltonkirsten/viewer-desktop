/**
 * Raven Daemon
 * HTTP + WebSocket server for managing the Raven voice assistant
 */

import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { RavenManager } from './ravenManager';
import { MemoryManager } from './memoryManager';
import { ConfigManager } from './configManager';
import { ToolManager } from './toolManager';
import { spawn } from 'child_process';
import type {
  RavenState,
  VisualMode,
  HealthResponse,
  StartRequest,
  SetModeRequest,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  SearchMemoryRequest,
  CreateToolRequest,
  UpdateToolRequest,
  ClientMessage,
  ServerMessage,
  AudioDevice,
  AudioDeviceConfig,
} from './types';

const PORT = parseInt(process.env.RAVEN_DAEMON_PORT || '7433', 10);
const RAVEN_DIR = process.env.RAVEN_DIR || path.resolve(__dirname, '../../raven');

// Find Python executable - check multiple locations
function findPython(): string {
  // 1. Explicit PYTHON_PATH env var
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
    return process.env.PYTHON_PATH;
  }

  // 2. venv in raven directory
  const venvPython = path.join(RAVEN_DIR, 'venv', 'bin', 'python');
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }

  // 3. Original raven location venv (for dev)
  const originalVenvPython = path.join(
    process.env.HOME || '',
    'jarvis voice test',
    'venv',
    'bin',
    'python'
  );
  if (fs.existsSync(originalVenvPython)) {
    return originalVenvPython;
  }

  // 4. Fall back to system python
  return 'python3';
}

const PYTHON_PATH = findPython();
console.log(`[Raven Daemon] Python path: ${PYTHON_PATH}`);

/**
 * Enumerate audio devices via Python/PyAudio
 * Uses a separate script file to avoid shell escaping issues
 */
async function getAudioDevices(): Promise<{ input: AudioDevice[]; output: AudioDevice[] }> {
  const listDevicesScript = path.join(RAVEN_DIR, 'raven_core', 'list_devices.py');

  return new Promise((resolve) => {
    const proc = spawn(PYTHON_PATH, [listDevicesScript], { cwd: RAVEN_DIR });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data;
    });

    proc.stderr.on('data', (data) => {
      stderr += data;
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error('Failed to enumerate audio devices:', stderr);
        resolve({ input: [], output: [] });
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (e) {
        console.error('Failed to parse audio devices JSON:', e);
        resolve({ input: [], output: [] });
      }
    });

    proc.on('error', (err) => {
      console.error('Failed to spawn audio device enumeration:', err);
      resolve({ input: [], output: [] });
    });
  });
}

// Initialize managers
const ravenManager = new RavenManager(RAVEN_DIR, PYTHON_PATH);
const memoryManager = new MemoryManager();
const configManager = new ConfigManager();
const toolManager = new ToolManager();

// WebSocket clients with their subscriptions
interface WsClient {
  ws: WebSocket;
  subscriptions: Set<string>;
}
const wsClients: Set<WsClient> = new Set();

// Server start time for uptime
const startTime = Date.now();

/**
 * Parse JSON body from request
 */
function parseBody<T>(req: http.IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        if (!body) {
          resolve({} as T);
        } else {
          resolve(JSON.parse(body) as T);
        }
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response
 */
function sendJson(res: http.ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Send error response
 */
function sendError(res: http.ServerResponse, statusCode: number, message: string): void {
  sendJson(res, statusCode, { error: message });
}

/**
 * Broadcast message to subscribed WebSocket clients
 */
function broadcast(channel: string, message: ServerMessage): void {
  const data = JSON.stringify(message);
  for (const client of wsClients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      if (client.subscriptions.has('all') || client.subscriptions.has(channel)) {
        client.ws.send(data);
      }
    }
  }
}

// Set up RavenManager event handlers
ravenManager.on('status', (state: RavenState) => {
  broadcast('status', { type: 'status', state });
});

ravenManager.on('transcript', (entry) => {
  broadcast('transcripts', { type: 'transcript', entry });
});

ravenManager.on('functionLog', (entry) => {
  broadcast('function-logs', { type: 'function-log', entry });
});

ravenManager.on('error', (message) => {
  broadcast('status', { type: 'error', message });
});

/**
 * Handle HTTP requests
 */
async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const method = req.method || 'GET';
  const pathname = url.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // Health check
    if (pathname === '/health' && method === 'GET') {
      const response: HealthResponse = {
        status: 'ok',
        ravenStatus: ravenManager.getState().status,
        uptime: Date.now() - startTime,
      };
      sendJson(res, 200, response);
      return;
    }

    // Raven status
    if (pathname === '/status' && method === 'GET') {
      sendJson(res, 200, ravenManager.getState());
      return;
    }

    // Start Raven
    if (pathname === '/start' && method === 'POST') {
      const body = await parseBody<StartRequest>(req);
      // Get audio device config to pass to Raven
      const audioConfig = await configManager.getAudioDeviceConfig();
      const state = await ravenManager.start(body.mode as VisualMode, audioConfig);
      sendJson(res, 200, state);
      return;
    }

    // Stop Raven
    if (pathname === '/stop' && method === 'POST') {
      const state = await ravenManager.stop();
      sendJson(res, 200, state);
      return;
    }

    // Set visual mode
    if (pathname === '/mode' && method === 'POST') {
      const body = await parseBody<SetModeRequest>(req);
      if (!body.mode || !['camera', 'screen', 'none'].includes(body.mode)) {
        sendError(res, 400, 'Invalid mode. Must be camera, screen, or none');
        return;
      }
      // Get audio device config to pass to Raven on restart
      const audioConfig = await configManager.getAudioDeviceConfig();
      const state = await ravenManager.setMode(body.mode, audioConfig);
      sendJson(res, 200, state);
      return;
    }

    // Get transcripts
    if (pathname === '/transcripts' && method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '100', 10);
      const transcripts = ravenManager.getTranscripts(limit);
      sendJson(res, 200, { transcripts });
      return;
    }

    // Get function logs
    if (pathname === '/function-logs' && method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '100', 10);
      const logs = ravenManager.getFunctionLogs(limit);
      sendJson(res, 200, { logs });
      return;
    }

    // Memories routes
    if (pathname === '/memories' && method === 'GET') {
      const memories = await memoryManager.list();
      sendJson(res, 200, { memories });
      return;
    }

    if (pathname === '/memories' && method === 'POST') {
      const body = await parseBody<CreateMemoryRequest>(req);
      if (!body.text) {
        sendError(res, 400, 'text is required');
        return;
      }
      const memory = await memoryManager.create(body.text, body.tags);
      sendJson(res, 201, memory);
      return;
    }

    if (pathname === '/memories/search' && method === 'POST') {
      const body = await parseBody<SearchMemoryRequest>(req);
      if (!body.query) {
        sendError(res, 400, 'query is required');
        return;
      }
      const memories = await memoryManager.search(body.query);
      sendJson(res, 200, { memories });
      return;
    }

    const memoryMatch = pathname.match(/^\/memories\/([^/]+)$/);
    if (memoryMatch) {
      const id = memoryMatch[1];

      if (method === 'GET') {
        const memory = await memoryManager.get(id);
        if (!memory) {
          sendError(res, 404, 'Memory not found');
          return;
        }
        sendJson(res, 200, memory);
        return;
      }

      if (method === 'PUT') {
        const body = await parseBody<UpdateMemoryRequest>(req);
        const memory = await memoryManager.update(id, body);
        if (!memory) {
          sendError(res, 404, 'Memory not found');
          return;
        }
        sendJson(res, 200, memory);
        return;
      }

      if (method === 'DELETE') {
        const deleted = await memoryManager.delete(id);
        if (!deleted) {
          sendError(res, 404, 'Memory not found');
          return;
        }
        sendJson(res, 200, { success: true });
        return;
      }
    }

    // Tools routes
    if (pathname === '/tools' && method === 'GET') {
      const tools = await toolManager.listAll();
      sendJson(res, 200, { tools });
      return;
    }

    if (pathname === '/tools' && method === 'POST') {
      const body = await parseBody<CreateToolRequest>(req);
      if (!body.name || !body.description) {
        sendError(res, 400, 'name and description are required');
        return;
      }
      try {
        const tool = await toolManager.create(body);
        sendJson(res, 201, tool);
      } catch (error) {
        sendError(res, 400, error instanceof Error ? error.message : 'Failed to create tool');
      }
      return;
    }

    const toolMatch = pathname.match(/^\/tools\/([^/]+)$/);
    if (toolMatch) {
      const name = decodeURIComponent(toolMatch[1]);

      if (method === 'GET') {
        const tool = await toolManager.get(name);
        if (!tool) {
          sendError(res, 404, 'Tool not found');
          return;
        }
        sendJson(res, 200, tool);
        return;
      }

      if (method === 'PUT') {
        const body = await parseBody<UpdateToolRequest>(req);
        try {
          const tool = await toolManager.update(name, body);
          if (!tool) {
            sendError(res, 404, 'Tool not found');
            return;
          }
          sendJson(res, 200, tool);
        } catch (error) {
          sendError(res, 400, error instanceof Error ? error.message : 'Failed to update tool');
        }
        return;
      }

      if (method === 'DELETE') {
        try {
          const deleted = await toolManager.delete(name);
          if (!deleted) {
            sendError(res, 404, 'Tool not found');
            return;
          }
          sendJson(res, 200, { success: true });
        } catch (error) {
          sendError(res, 400, error instanceof Error ? error.message : 'Failed to delete tool');
        }
        return;
      }
    }

    // Config routes
    if (pathname === '/config' && method === 'GET') {
      const config = await configManager.getConfig();
      sendJson(res, 200, config);
      return;
    }

    if (pathname === '/config' && method === 'PUT') {
      const body = await parseBody<Record<string, unknown>>(req);
      const config = await configManager.updateConfig(body);
      sendJson(res, 200, config);
      return;
    }

    if (pathname === '/config/prompts' && method === 'GET') {
      const prompts = await configManager.getPrompts();
      sendJson(res, 200, prompts);
      return;
    }

    if (pathname === '/config/prompts' && method === 'PUT') {
      const body = await parseBody<Record<string, unknown>>(req);
      const prompts = await configManager.updatePrompts(body);
      sendJson(res, 200, prompts);
      return;
    }

    if (pathname === '/config/allowed-apps' && method === 'GET') {
      const apps = await configManager.getAllowedApps();
      sendJson(res, 200, { apps });
      return;
    }

    if (pathname === '/config/allowed-apps' && method === 'PUT') {
      const body = await parseBody<{ apps: string[] }>(req);
      if (!Array.isArray(body.apps)) {
        sendError(res, 400, 'apps must be an array');
        return;
      }
      await configManager.setAllowedApps(body.apps);
      sendJson(res, 200, { apps: body.apps });
      return;
    }

    // Audio device routes
    if (pathname === '/audio-devices' && method === 'GET') {
      try {
        const devices = await getAudioDevices();
        sendJson(res, 200, devices);
      } catch (error) {
        sendError(res, 500, error instanceof Error ? error.message : 'Failed to enumerate devices');
      }
      return;
    }

    if (pathname === '/config/audio-devices' && method === 'GET') {
      const config = await configManager.getAudioDeviceConfig();
      sendJson(res, 200, config);
      return;
    }

    if (pathname === '/config/audio-devices' && method === 'PUT') {
      const body = await parseBody<{ input?: number | string | null; output?: number | string | null }>(req);
      const config = await configManager.setAudioDeviceConfig(
        body.input ?? null,
        body.output ?? null
      );
      sendJson(res, 200, config);
      return;
    }

    // Not found
    sendError(res, 404, 'Not found');
  } catch (error) {
    console.error('Request error:', error);
    sendError(res, 500, error instanceof Error ? error.message : 'Internal server error');
  }
}

/**
 * Handle WebSocket connections
 */
function handleWebSocket(ws: WebSocket): void {
  const client: WsClient = {
    ws,
    subscriptions: new Set(),
  };
  wsClients.add(client);

  console.log('WebSocket client connected');

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString()) as ClientMessage;

      if (message.type === 'subscribe') {
        client.subscriptions.add(message.channel);
        console.log(`Client subscribed to: ${message.channel}`);
      } else if (message.type === 'unsubscribe') {
        client.subscriptions.delete(message.channel);
        console.log(`Client unsubscribed from: ${message.channel}`);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    wsClients.delete(client);
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    wsClients.delete(client);
  });

  // Send current state
  ws.send(JSON.stringify({
    type: 'status',
    state: ravenManager.getState(),
  }));
}

// Create HTTP server
const server = http.createServer(handleRequest);

// Create WebSocket server
const wss = new WebSocketServer({ server });
wss.on('connection', handleWebSocket);

// Write PID file
const dataDir = process.env.RAVEN_DAEMON_DATA_DIR || configManager.getRavenDir();
const pidFile = path.join(dataDir, 'daemon.pid');
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(pidFile, String(process.pid));

// Handle shutdown
function shutdown(): void {
  console.log('Shutting down Raven daemon...');

  // Clean up PID file
  try {
    fs.unlinkSync(pidFile);
  } catch {
    // Ignore
  }

  // Stop Raven if running
  ravenManager.stop().finally(() => {
    // Close all WebSocket connections
    for (const client of wsClients) {
      client.ws.close();
    }

    // Close servers
    wss.close();
    server.close(() => {
      process.exit(0);
    });
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Raven daemon listening on http://0.0.0.0:${PORT}`);
  console.log(`Raven directory: ${RAVEN_DIR}`);
  console.log(`PID file: ${pidFile}`);
});
