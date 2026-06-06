import { ipcMain } from 'electron';
import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import net from 'net';

// Override with VIEWER_LEAP_SERVICE_PATH env var if your build lives elsewhere.
// Default points at the bundled UltraleapTrackingWebSocket build relative to the repo root.
const LEAP_SERVICE_PATH =
  process.env.VIEWER_LEAP_SERVICE_PATH ||
  path.resolve(__dirname, '../../../../../UltraleapTrackingWebSocket/build/Ultraleap-Tracking-WS');
const LEAP_SERVICE_PORT = 6437;
const SOCKET_TIMEOUT_MS = 350;

interface LeapServiceStatus {
  running: boolean;
  managed: boolean;
  pid: number | null;
  path: string;
  /** Set when the service is unavailable (e.g. the tracking binary is missing). */
  error?: string;
}

let leapProcess: ChildProcess | null = null;

function isManagedProcessRunning(): boolean {
  return Boolean(leapProcess && leapProcess.exitCode === null && !leapProcess.killed);
}

function isPortOpen(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (open: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };

    socket.setTimeout(SOCKET_TIMEOUT_MS);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

async function getServiceStatus(): Promise<LeapServiceStatus> {
  const managedRunning = isManagedProcessRunning();
  if (managedRunning) {
    return {
      running: true,
      managed: true,
      pid: leapProcess?.pid ?? null,
      path: LEAP_SERVICE_PATH,
    };
  }

  const externalRunning = await isPortOpen(LEAP_SERVICE_PORT);
  return {
    running: externalRunning,
    managed: false,
    pid: null,
    path: LEAP_SERVICE_PATH,
  };
}

async function startManagedService(): Promise<LeapServiceStatus> {
  if (isManagedProcessRunning()) {
    return getServiceStatus();
  }

  if (!existsSync(LEAP_SERVICE_PATH)) {
    // The Ultraleap tracking binary isn't installed/bundled. Rather than throwing
    // (which spams the renderer with errors), report the service as unavailable.
    return {
      running: false,
      managed: false,
      pid: null,
      path: LEAP_SERVICE_PATH,
      error: `Leap service binary not found: ${LEAP_SERVICE_PATH}`,
    };
  }

  const alreadyRunning = await isPortOpen(LEAP_SERVICE_PORT);
  if (alreadyRunning) {
    return getServiceStatus();
  }

  leapProcess = spawn(LEAP_SERVICE_PATH, [], {
    stdio: 'ignore',
  });

  leapProcess.once('exit', () => {
    leapProcess = null;
  });

  return getServiceStatus();
}

async function stopManagedService(): Promise<LeapServiceStatus> {
  if (isManagedProcessRunning()) {
    try {
      leapProcess?.kill('SIGTERM');
    } catch (error) {
      console.error('Failed to stop Leap service process:', error);
    }
  }

  leapProcess = null;
  return getServiceStatus();
}

export function registerLeapServiceHandlers(): void {
  ipcMain.handle('leap:status', async () => {
    return getServiceStatus();
  });

  ipcMain.handle('leap:ensureService', async (_, enabled: boolean) => {
    if (enabled) {
      return startManagedService();
    }
    return stopManagedService();
  });
}

export function cleanupLeapServiceHandlers(): void {
  if (!isManagedProcessRunning()) {
    leapProcess = null;
    return;
  }

  try {
    leapProcess?.kill('SIGTERM');
  } catch (error) {
    console.error('Failed to cleanup Leap service process:', error);
  } finally {
    leapProcess = null;
  }
}
