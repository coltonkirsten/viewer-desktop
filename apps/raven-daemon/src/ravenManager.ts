/**
 * Raven Manager
 * Manages the lifecycle of the Raven Python process
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as readline from 'readline';
import { v4 as uuidv4 } from 'uuid';
import type {
  RavenState,
  RavenStatus,
  VisualMode,
  TranscriptEntry,
  FunctionLog,
  RavenLogEvent,
  AudioDeviceConfig,
} from './types';

const MAX_TRANSCRIPT_BUFFER = 500;
const MAX_FUNCTION_LOG_BUFFER = 500;

export interface RavenManagerEvents {
  status: (state: RavenState) => void;
  transcript: (entry: TranscriptEntry) => void;
  functionLog: (entry: FunctionLog) => void;
  error: (message: string) => void;
}

export class RavenManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private state: RavenState = { status: 'stopped', visualMode: 'screen' };
  private transcriptBuffer: TranscriptEntry[] = [];
  private functionLogBuffer: FunctionLog[] = [];
  private ravenDir: string;
  private pythonPath: string;

  constructor(ravenDir: string, pythonPath?: string) {
    super();
    this.ravenDir = ravenDir;
    // Default to venv in ravenDir, or use provided path, or fall back to system python
    this.pythonPath = pythonPath ||
      path.join(ravenDir, 'venv', 'bin', 'python') ||
      process.env.PYTHON_PATH ||
      'python3';
  }

  /**
   * Get current Raven state
   */
  getState(): RavenState {
    return { ...this.state };
  }

  /**
   * Get buffered transcripts
   */
  getTranscripts(limit?: number): TranscriptEntry[] {
    const transcripts = [...this.transcriptBuffer];
    if (limit && limit > 0) {
      return transcripts.slice(-limit);
    }
    return transcripts;
  }

  /**
   * Get buffered function logs
   */
  getFunctionLogs(limit?: number): FunctionLog[] {
    const logs = [...this.functionLogBuffer];
    if (limit && limit > 0) {
      return logs.slice(-limit);
    }
    return logs;
  }

  /**
   * Start the Raven process
   */
  async start(mode: VisualMode = 'screen', audioConfig?: AudioDeviceConfig): Promise<RavenState> {
    if (this.state.status === 'running' || this.state.status === 'starting') {
      return this.state;
    }

    this.updateState({ status: 'starting', visualMode: mode });

    try {
      const mainScript = path.join(this.ravenDir, 'main.py');

      console.log(`[RavenManager] Using Python: ${this.pythonPath}`);
      console.log(`[RavenManager] Raven dir: ${this.ravenDir}`);

      // Build command args
      const args = [mainScript, '--mode', mode, '--json-output'];

      // Add audio device args if configured
      if (audioConfig?.input !== null && audioConfig?.input !== undefined) {
        args.push('--audio-input', String(audioConfig.input));
        console.log(`[RavenManager] Audio input: ${audioConfig.input}`);
      }
      if (audioConfig?.output !== null && audioConfig?.output !== undefined) {
        args.push('--audio-output', String(audioConfig.output));
        console.log(`[RavenManager] Audio output: ${audioConfig.output}`);
      }

      // Spawn the Raven process with JSON output
      this.process = spawn(this.pythonPath, args, {
        cwd: this.ravenDir,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Handle stdout (JSON log lines)
      if (this.process.stdout) {
        const rl = readline.createInterface({
          input: this.process.stdout,
          crlfDelay: Infinity,
        });

        rl.on('line', (line) => {
          this.parseLogLine(line);
        });
      }

      // Handle stderr - important for debugging
      if (this.process.stderr) {
        const rl = readline.createInterface({
          input: this.process.stderr,
          crlfDelay: Infinity,
        });

        rl.on('line', (line) => {
          console.error('[Raven stderr]', line);
          // Also emit as error for debugging
          this.emit('error', `Python stderr: ${line}`);
        });
      }

      console.log('[RavenManager] Python process spawned, waiting for output...');

      // Handle process exit
      this.process.on('exit', (code, signal) => {
        console.log(`Raven process exited with code ${code}, signal ${signal}`);
        this.process = null;
        this.updateState({
          status: 'stopped',
          pid: undefined,
          startedAt: undefined,
          error: code !== 0 ? `Exited with code ${code}` : undefined,
        });
      });

      // Handle process error
      this.process.on('error', (error) => {
        console.error('Raven process error:', error);
        this.process = null;
        this.updateState({
          status: 'error',
          error: error.message,
        });
        this.emit('error', error.message);
      });

      // Update state with PID
      this.updateState({
        status: 'running',
        pid: this.process.pid,
        startedAt: new Date().toISOString(),
      });

      return this.state;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.updateState({
        status: 'error',
        error: message,
      });
      this.emit('error', message);
      throw error;
    }
  }

  /**
   * Stop the Raven process
   */
  async stop(): Promise<RavenState> {
    if (!this.process || this.state.status === 'stopped') {
      return this.state;
    }

    this.updateState({ status: 'stopping' });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // Force kill if not stopped after 5 seconds
        if (this.process) {
          console.log('Force killing Raven process');
          this.process.kill('SIGKILL');
        }
      }, 5000);

      if (this.process) {
        this.process.once('exit', () => {
          clearTimeout(timeout);
          this.process = null;
          this.updateState({
            status: 'stopped',
            pid: undefined,
            startedAt: undefined,
          });
          resolve(this.state);
        });

        // Send SIGTERM
        this.process.kill('SIGTERM');

        // Also send 'q' to stdin for graceful shutdown
        if (this.process.stdin) {
          this.process.stdin.write('q\n');
        }
      } else {
        clearTimeout(timeout);
        this.updateState({ status: 'stopped' });
        resolve(this.state);
      }
    });
  }

  /**
   * Set visual mode (requires restart or mode change command)
   */
  async setMode(mode: VisualMode, audioConfig?: AudioDeviceConfig): Promise<RavenState> {
    if (this.state.status !== 'running') {
      this.updateState({ visualMode: mode });
      return this.state;
    }

    // Raven handles mode changes internally via the set_visual_mode tool
    // For now, just restart with new mode
    await this.stop();
    return this.start(mode, audioConfig);
  }

  /**
   * Parse a JSON log line from Raven
   */
  private parseLogLine(line: string): void {
    try {
      const event = JSON.parse(line) as RavenLogEvent;
      this.handleLogEvent(event);
    } catch {
      // Not JSON, might be regular print output
      console.log('[Raven stdout]', line);
    }
  }

  /**
   * Handle a parsed log event
   */
  private handleLogEvent(event: RavenLogEvent): void {
    switch (event.type) {
      case 'status':
        this.handleStatusEvent(event);
        break;

      case 'transcript':
        this.handleTranscriptEvent(event);
        break;

      case 'function_call':
        this.handleFunctionCallEvent(event);
        break;

      case 'function_result':
        this.handleFunctionResultEvent(event);
        break;

      case 'function_error':
        this.handleFunctionErrorEvent(event);
        break;

      case 'mode_change':
        this.updateState({ visualMode: event.new_mode as VisualMode });
        break;

      case 'error':
        this.emit('error', event.message);
        break;
    }
  }

  private handleStatusEvent(event: Extract<RavenLogEvent, { type: 'status' }>): void {
    const statusMap: Record<string, RavenStatus> = {
      'loading_config': 'starting',
      'initialized': 'starting',
      'connecting': 'starting',
      'connected': 'running',
      'running': 'running',
      'stopping': 'stopping',
      'stopped': 'stopped',
      'interrupted': 'stopped',
    };

    const status = statusMap[event.status] || this.state.status;
    const mode = event.mode as VisualMode | undefined;

    this.updateState({
      status,
      ...(mode && { visualMode: mode }),
    });
  }

  private handleTranscriptEvent(event: Extract<RavenLogEvent, { type: 'transcript' }>): void {
    const entry: TranscriptEntry = {
      id: uuidv4(),
      timestamp: event.timestamp,
      speaker: event.speaker as 'user' | 'raven' | 'system',
      text: event.text,
    };

    this.transcriptBuffer.push(entry);
    if (this.transcriptBuffer.length > MAX_TRANSCRIPT_BUFFER) {
      this.transcriptBuffer.shift();
    }

    this.emit('transcript', entry);
  }

  private handleFunctionCallEvent(event: Extract<RavenLogEvent, { type: 'function_call' }>): void {
    const entry: FunctionLog = {
      id: uuidv4(),
      timestamp: event.timestamp,
      functionName: event.name,
      args: event.args,
      callId: event.call_id,
    };

    this.functionLogBuffer.push(entry);
    if (this.functionLogBuffer.length > MAX_FUNCTION_LOG_BUFFER) {
      this.functionLogBuffer.shift();
    }

    this.emit('functionLog', entry);
  }

  private handleFunctionResultEvent(event: Extract<RavenLogEvent, { type: 'function_result' }>): void {
    // Find the matching function call and update it
    const existingLog = this.functionLogBuffer.find(
      log => log.callId === event.call_id && !log.result && !log.error
    );

    if (existingLog) {
      existingLog.result = event.result;
      existingLog.durationMs = event.duration_ms;
      this.emit('functionLog', existingLog);
    } else {
      // Create a new entry if we didn't find the call
      const entry: FunctionLog = {
        id: uuidv4(),
        timestamp: event.timestamp,
        functionName: event.name,
        args: {},
        result: event.result,
        durationMs: event.duration_ms,
        callId: event.call_id,
      };

      this.functionLogBuffer.push(entry);
      if (this.functionLogBuffer.length > MAX_FUNCTION_LOG_BUFFER) {
        this.functionLogBuffer.shift();
      }

      this.emit('functionLog', entry);
    }
  }

  private handleFunctionErrorEvent(event: Extract<RavenLogEvent, { type: 'function_error' }>): void {
    const existingLog = this.functionLogBuffer.find(
      log => log.callId === event.call_id && !log.result && !log.error
    );

    if (existingLog) {
      existingLog.error = event.error;
      this.emit('functionLog', existingLog);
    } else {
      const entry: FunctionLog = {
        id: uuidv4(),
        timestamp: event.timestamp,
        functionName: event.name,
        args: {},
        error: event.error,
        callId: event.call_id,
      };

      this.functionLogBuffer.push(entry);
      if (this.functionLogBuffer.length > MAX_FUNCTION_LOG_BUFFER) {
        this.functionLogBuffer.shift();
      }

      this.emit('functionLog', entry);
    }
  }

  private updateState(updates: Partial<RavenState>): void {
    this.state = { ...this.state, ...updates };
    this.emit('status', this.state);
  }

  /**
   * Clear transcript and function log buffers
   */
  clearBuffers(): void {
    this.transcriptBuffer = [];
    this.functionLogBuffer = [];
  }
}
