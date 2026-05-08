/**
 * Raven Daemon Manager
 * Manages the lifecycle of the raven-daemon process
 */

import { spawn, ChildProcess } from 'child_process';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';

const DEFAULT_PORT = 7433;
const HEALTH_CHECK_TIMEOUT = 5000;
const HEALTH_CHECK_INTERVAL = 100;

export class RavenDaemonManager {
  private port: number;
  private dataDir: string;
  private daemonProcess: ChildProcess | null = null;
  private isStarting = false;

  constructor(port: number = DEFAULT_PORT) {
    this.port = port;
    this.dataDir = path.join(app.getPath('userData'), 'raven-daemon');

    // Ensure data directory exists
    fs.mkdirSync(this.dataDir, { recursive: true });
  }

  /**
   * Get the daemon URL
   */
  getDaemonUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  /**
   * Get the daemon WebSocket URL
   */
  getDaemonWsUrl(): string {
    return `ws://127.0.0.1:${this.port}`;
  }

  /**
   * Check if daemon is running via health check
   */
  async isDaemonRunning(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: this.port,
          path: '/health',
          method: 'GET',
          timeout: 1000,
        },
        (res) => {
          resolve(res.statusCode === 200);
        }
      );

      req.on('error', () => {
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }

  /**
   * Wait for daemon to become healthy
   */
  private async waitForHealth(timeout: number = HEALTH_CHECK_TIMEOUT): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await this.isDaemonRunning()) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, HEALTH_CHECK_INTERVAL));
    }

    return false;
  }

  /**
   * Start the daemon process
   */
  private async startDaemon(): Promise<void> {
    // Find the daemon entry point
    let daemonPath: string | null = null;

    const possiblePaths = [
      // Development: sibling package relative to viewer root
      path.resolve(__dirname, '../../../..', 'raven-daemon/dist/index.js'),
      // Alternative: from app.getAppPath()
      path.resolve(app.getAppPath(), '..', 'raven-daemon/dist/index.js'),
      // Monorepo root structure
      path.resolve(process.cwd(), '..', 'raven-daemon/dist/index.js'),
      path.resolve(process.cwd(), 'apps/raven-daemon/dist/index.js'),
    ];

    for (const tryPath of possiblePaths) {
      console.log(`Checking raven daemon path: ${tryPath}`);
      if (fs.existsSync(tryPath)) {
        daemonPath = tryPath;
        break;
      }
    }

    // Try node_modules path (production)
    if (!daemonPath) {
      try {
        daemonPath = require.resolve('@root/raven-daemon/dist/index.js');
      } catch {
        // Fallback to relative path from app resources
        const fallbackPath = path.join(app.getAppPath(), 'raven-daemon', 'dist', 'index.js');
        if (fs.existsSync(fallbackPath)) {
          daemonPath = fallbackPath;
        }
      }
    }

    if (!daemonPath) {
      throw new Error(`Raven daemon not found. Searched paths:\n${possiblePaths.join('\n')}`);
    }

    // Find the raven Python directory
    let ravenDir: string | null = null;
    const ravenPaths = [
      path.resolve(__dirname, '../../../..', 'raven'),
      path.resolve(app.getAppPath(), '..', 'raven'),
      path.resolve(process.cwd(), '..', 'raven'),
      path.resolve(process.cwd(), 'apps/raven'),
    ];

    for (const tryPath of ravenPaths) {
      if (fs.existsSync(path.join(tryPath, 'main.py'))) {
        ravenDir = tryPath;
        break;
      }
    }

    if (!ravenDir) {
      throw new Error(`Raven Python directory not found. Searched paths:\n${ravenPaths.join('\n')}`);
    }

    console.log(`Starting raven daemon from: ${daemonPath}`);
    console.log(`Raven Python directory: ${ravenDir}`);

    // Spawn the daemon process
    this.daemonProcess = spawn('node', [daemonPath], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        RAVEN_DAEMON_PORT: String(this.port),
        RAVEN_DAEMON_DATA_DIR: this.dataDir,
        RAVEN_DIR: ravenDir,
      },
    });

    // Detach from parent so it survives app exit
    this.daemonProcess.unref();

    console.log(`Raven daemon process started with PID: ${this.daemonProcess.pid}`);
  }

  /**
   * Ensure daemon is running, starting it if needed
   */
  async ensureRunning(): Promise<void> {
    // Check if already running
    if (await this.isDaemonRunning()) {
      return;
    }

    // Prevent concurrent startup attempts
    if (this.isStarting) {
      while (this.isStarting) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return;
    }

    this.isStarting = true;

    try {
      // Check for stale PID file
      const pidFile = path.join(this.dataDir, 'daemon.pid');
      if (fs.existsSync(pidFile)) {
        const pid = parseInt(fs.readFileSync(pidFile, 'utf-8'), 10);
        if (!isNaN(pid)) {
          // Check if process is still running
          try {
            process.kill(pid, 0);
            // Process exists, wait a bit for it to become healthy
            if (await this.waitForHealth(2000)) {
              console.log(`Connected to existing raven daemon (PID: ${pid})`);
              return;
            }
          } catch {
            // Process doesn't exist, clean up PID file
            fs.unlinkSync(pidFile);
          }
        }
      }

      // Start daemon
      await this.startDaemon();

      // Wait for daemon to become healthy
      if (!(await this.waitForHealth())) {
        throw new Error('Raven daemon failed to start within timeout');
      }

      console.log('Raven daemon started and healthy');
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * Stop the daemon process
   */
  async stopDaemon(): Promise<void> {
    const pidFile = path.join(this.dataDir, 'daemon.pid');
    if (fs.existsSync(pidFile)) {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf-8'), 10);
      if (!isNaN(pid)) {
        try {
          process.kill(pid, 'SIGTERM');
          console.log(`Sent SIGTERM to raven daemon (PID: ${pid})`);
        } catch {
          // Process already dead
        }
      }
    }

    // Also kill our spawned process if it exists
    if (this.daemonProcess) {
      try {
        this.daemonProcess.kill('SIGTERM');
      } catch {
        // Ignore
      }
      this.daemonProcess = null;
    }
  }

  /**
   * Make an HTTP request to the daemon
   */
  async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    await this.ensureRunning();

    return new Promise((resolve, reject) => {
      const options: http.RequestOptions = {
        hostname: '127.0.0.1',
        port: this.port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
            } else {
              resolve(parsed as T);
            }
          } catch {
            reject(new Error(`Invalid JSON response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }
}

// Singleton instance
let ravenDaemonManager: RavenDaemonManager | null = null;

export function getRavenDaemonManager(): RavenDaemonManager {
  if (!ravenDaemonManager) {
    ravenDaemonManager = new RavenDaemonManager();
  }
  return ravenDaemonManager;
}
