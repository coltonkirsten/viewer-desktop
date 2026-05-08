/**
 * Task Manager
 * Manages task lifecycle, process spawning, and state persistence
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type {
  TaskConfig,
  TaskRecord,
  TaskStatus,
  DaemonState,
  TaskStage,
} from './types';

export interface TaskManagerOptions {
  dataDir: string;
  saveInterval: number;
  onStatusChange?: (task: TaskRecord) => void;
  onOutput?: (taskId: string, chunk: string, offset: number) => void;
  onCompleted?: (taskId: string, exitCode: number) => void;
}

interface RunningTask {
  task: TaskRecord;
  process?: ChildProcess;
  outputFd?: number;
  outputOffset: number;
  tailInterval?: NodeJS.Timeout;
}

export class TaskManager {
  private tasks: Map<string, TaskRecord> = new Map();
  private runningTasks: Map<string, RunningTask> = new Map();
  private dataDir: string;
  private outputDir: string;
  private stateFile: string;
  private saveTimeout: NodeJS.Timeout | null = null;
  private saveInterval: number;
  private onStatusChange?: (task: TaskRecord) => void;
  private onOutput?: (taskId: string, chunk: string, offset: number) => void;
  private onCompleted?: (taskId: string, exitCode: number) => void;

  constructor(options: TaskManagerOptions) {
    this.dataDir = options.dataDir;
    this.outputDir = path.join(this.dataDir, 'output');
    this.stateFile = path.join(this.dataDir, 'tasks.json');
    this.saveInterval = options.saveInterval;
    this.onStatusChange = options.onStatusChange;
    this.onOutput = options.onOutput;
    this.onCompleted = options.onCompleted;

    // Ensure directories exist
    fs.mkdirSync(this.outputDir, { recursive: true });

    // Load existing state
    this.loadState();
  }

  /**
   * Load persisted state from disk
   */
  private loadState(): void {
    try {
      if (fs.existsSync(this.stateFile)) {
        const content = fs.readFileSync(this.stateFile, 'utf-8');
        const state: DaemonState = JSON.parse(content);
        for (const task of state.tasks) {
          this.tasks.set(task.id, task);
        }
        console.log(`Loaded ${this.tasks.size} tasks from state file`);
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }

  /**
   * Save state to disk (debounced)
   */
  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveState();
    }, this.saveInterval);
  }

  /**
   * Immediately save state to disk
   */
  private saveState(): void {
    try {
      const state: DaemonState = {
        version: '1.0',
        tasks: Array.from(this.tasks.values()),
        lastUpdated: new Date().toISOString(),
      };
      fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  /**
   * Create a new task (but don't start it yet)
   */
  createTask(config: TaskConfig): TaskRecord {
    const id = uuidv4();
    const outputFile = path.join(this.outputDir, `${id}.log`);

    const task: TaskRecord = {
      id,
      config,
      status: 'pending',
      createdAt: new Date().toISOString(),
      outputFile,
    };

    this.tasks.set(id, task);
    this.scheduleSave();
    this.onStatusChange?.(task);

    return task;
  }

  /**
   * Start executing a task
   */
  async startTask(taskId: string): Promise<TaskRecord> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status !== 'pending') {
      throw new Error(`Task ${taskId} is not in pending state`);
    }

    task.startedAt = new Date().toISOString();

    // Initialize running task context
    const runningTask: RunningTask = {
      task,
      outputOffset: 0,
    };
    this.runningTasks.set(taskId, runningTask);

    // Create output file
    fs.writeFileSync(task.outputFile, '');

    // Execute the task pipeline
    this.executePipeline(taskId).catch((error) => {
      console.error(`Task ${taskId} pipeline error:`, error);
      this.failTask(taskId, error.message);
    });

    return task;
  }

  /**
   * Execute the full task pipeline (pre -> main -> post)
   */
  private async executePipeline(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const config = task.config;

    // 1. Run pre-commands
    if (config.preCommands && config.preCommands.length > 0) {
      this.updateTask(taskId, { status: 'running-pre' });

      for (let i = 0; i < config.preCommands.length; i++) {
        const stage: TaskStage = { index: i, total: config.preCommands.length, type: 'pre' };
        this.updateTask(taskId, { stage });

        const exitCode = await this.runCommand(taskId, config.preCommands[i], config.cwd, config.env);

        if (exitCode !== 0 && !config.continueOnPreFail) {
          this.failTask(taskId, `Pre-command ${i + 1} failed with exit code ${exitCode}`);
          return;
        }
      }
    }

    // 2. Run main command
    this.updateTask(taskId, {
      status: 'running-main',
      stage: { index: 0, total: 1, type: 'main' },
    });

    const mainExitCode = await this.runCommand(taskId, config.command, config.cwd, config.env);

    // 3. Run post-commands
    if (config.postCommands && config.postCommands.length > 0) {
      this.updateTask(taskId, { status: 'running-post' });

      for (let i = 0; i < config.postCommands.length; i++) {
        const stage: TaskStage = { index: i, total: config.postCommands.length, type: 'post' };
        this.updateTask(taskId, { stage });

        const exitCode = await this.runCommand(taskId, config.postCommands[i], config.cwd, config.env);

        if (exitCode !== 0 && !config.continueOnPostFail) {
          this.failTask(taskId, `Post-command ${i + 1} failed with exit code ${exitCode}`);
          return;
        }
      }
    }

    // Complete the task
    this.completeTask(taskId, mainExitCode);
  }

  /**
   * Run a single command and return its exit code
   */
  private runCommand(
    taskId: string,
    command: string,
    cwd: string,
    env?: Record<string, string>
  ): Promise<number> {
    return new Promise((resolve) => {
      const task = this.tasks.get(taskId);
      const runningTask = this.runningTasks.get(taskId);
      if (!task || !runningTask) {
        resolve(1);
        return;
      }

      // Open output file for appending
      const fd = fs.openSync(task.outputFile, 'a');
      runningTask.outputFd = fd;

      // Write command header to output
      const header = `\n=== Running: ${command} ===\n`;
      fs.writeSync(fd, header);
      runningTask.outputOffset += header.length;
      this.onOutput?.(taskId, header, runningTask.outputOffset - header.length);

      // Spawn the command
      const proc = spawn('sh', ['-c', command], {
        cwd,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...env },
      });

      runningTask.process = proc;
      task.pid = proc.pid;
      this.scheduleSave();

      // Handle stdout
      proc.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        fs.writeSync(fd, chunk);
        const offset = runningTask.outputOffset;
        runningTask.outputOffset += chunk.length;
        this.onOutput?.(taskId, chunk, offset);
      });

      // Handle stderr
      proc.stderr?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        fs.writeSync(fd, chunk);
        const offset = runningTask.outputOffset;
        runningTask.outputOffset += chunk.length;
        this.onOutput?.(taskId, chunk, offset);
      });

      // Handle process exit
      proc.on('exit', (code) => {
        fs.closeSync(fd);
        runningTask.outputFd = undefined;
        runningTask.process = undefined;
        task.pid = undefined;
        resolve(code ?? 1);
      });

      // Handle process error
      proc.on('error', (error) => {
        const errMsg = `\nProcess error: ${error.message}\n`;
        fs.writeSync(fd, errMsg);
        fs.closeSync(fd);
        runningTask.outputFd = undefined;
        runningTask.process = undefined;
        task.pid = undefined;
        resolve(1);
      });
    });
  }

  /**
   * Update task fields and notify listeners
   */
  private updateTask(taskId: string, updates: Partial<TaskRecord>): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    Object.assign(task, updates);
    this.tasks.set(taskId, task);
    this.scheduleSave();
    this.onStatusChange?.(task);
  }

  /**
   * Mark task as completed
   */
  private completeTask(taskId: string, exitCode: number): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = exitCode === 0 ? 'completed' : 'failed';
    task.exitCode = exitCode;
    task.completedAt = new Date().toISOString();
    task.stage = undefined;

    this.runningTasks.delete(taskId);
    this.scheduleSave();
    this.onStatusChange?.(task);
    this.onCompleted?.(taskId, exitCode);
  }

  /**
   * Mark task as failed with error message
   */
  private failTask(taskId: string, error: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'failed';
    task.error = error;
    task.completedAt = new Date().toISOString();
    task.stage = undefined;

    this.runningTasks.delete(taskId);
    this.scheduleSave();
    this.onStatusChange?.(task);
    this.onCompleted?.(taskId, task.exitCode ?? 1);
  }

  /**
   * Cancel a running task
   */
  cancelTask(taskId: string): TaskRecord {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const runningTask = this.runningTasks.get(taskId);
    if (runningTask?.process) {
      // Kill the process group
      try {
        process.kill(-runningTask.process.pid!, 'SIGTERM');
      } catch {
        // Process may already be dead
        try {
          runningTask.process.kill('SIGTERM');
        } catch {
          // Ignore
        }
      }
    }

    task.status = 'cancelled';
    task.completedAt = new Date().toISOString();
    task.stage = undefined;

    this.runningTasks.delete(taskId);
    this.scheduleSave();
    this.onStatusChange?.(task);

    return task;
  }

  /**
   * Get a task by ID
   */
  getTask(taskId: string): TaskRecord | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks, optionally filtered by status
   */
  getAllTasks(status?: TaskStatus): TaskRecord[] {
    const tasks = Array.from(this.tasks.values());
    if (status) {
      return tasks.filter((t) => t.status === status);
    }
    return tasks;
  }

  /**
   * Get task output from file
   */
  getTaskOutput(
    taskId: string,
    offset: number = 0,
    limit: number = 1024 * 1024
  ): { output: string; offset: number; hasMore: boolean } {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (!fs.existsSync(task.outputFile)) {
      return { output: '', offset: 0, hasMore: false };
    }

    const stats = fs.statSync(task.outputFile);
    const fileSize = stats.size;

    if (offset >= fileSize) {
      return { output: '', offset, hasMore: false };
    }

    const fd = fs.openSync(task.outputFile, 'r');
    const readSize = Math.min(limit, fileSize - offset);
    const buffer = Buffer.alloc(readSize);
    fs.readSync(fd, buffer, 0, readSize, offset);
    fs.closeSync(fd);

    return {
      output: buffer.toString('utf-8'),
      offset: offset + readSize,
      hasMore: offset + readSize < fileSize,
    };
  }

  /**
   * Delete a task and its output file
   */
  deleteTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Can't delete running tasks
    if (task.status.startsWith('running')) {
      throw new Error(`Cannot delete running task: ${taskId}`);
    }

    // Delete output file
    if (fs.existsSync(task.outputFile)) {
      fs.unlinkSync(task.outputFile);
    }

    this.tasks.delete(taskId);
    this.scheduleSave();
  }

  /**
   * Cleanup old completed tasks
   */
  cleanup(olderThan?: number, statuses?: TaskStatus[]): string[] {
    const now = Date.now();
    const deleted: string[] = [];
    const targetStatuses = statuses || ['completed', 'failed', 'cancelled'];

    for (const [taskId, task] of this.tasks) {
      if (!targetStatuses.includes(task.status)) continue;

      const completedAt = task.completedAt ? new Date(task.completedAt).getTime() : 0;
      if (olderThan && now - completedAt < olderThan) continue;

      // Delete output file
      if (fs.existsSync(task.outputFile)) {
        try {
          fs.unlinkSync(task.outputFile);
        } catch {
          // Ignore
        }
      }

      this.tasks.delete(taskId);
      deleted.push(taskId);
    }

    if (deleted.length > 0) {
      this.scheduleSave();
    }

    return deleted;
  }

  /**
   * Reconnect to running tasks after daemon restart
   */
  reconnectTasks(): void {
    for (const [taskId, task] of this.tasks) {
      if (!task.status.startsWith('running')) continue;

      if (task.pid && this.isProcessRunning(task.pid)) {
        console.log(`Task ${taskId} still running (PID ${task.pid}), starting output tail`);
        this.startOutputTail(taskId);
      } else {
        console.log(`Task ${taskId} process not found, marking as failed`);
        task.status = 'failed';
        task.error = 'Process terminated while daemon was offline';
        task.completedAt = new Date().toISOString();
        this.onStatusChange?.(task);
      }
    }
    this.scheduleSave();
  }

  /**
   * Check if a process is still running
   */
  private isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Start tailing output file for a reconnected task
   */
  private startOutputTail(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    let lastSize = 0;
    if (fs.existsSync(task.outputFile)) {
      lastSize = fs.statSync(task.outputFile).size;
    }

    const runningTask: RunningTask = {
      task,
      outputOffset: lastSize,
    };

    // Poll for new output
    runningTask.tailInterval = setInterval(() => {
      if (!fs.existsSync(task.outputFile)) return;

      const currentSize = fs.statSync(task.outputFile).size;
      if (currentSize > lastSize) {
        const fd = fs.openSync(task.outputFile, 'r');
        const buffer = Buffer.alloc(currentSize - lastSize);
        fs.readSync(fd, buffer, 0, buffer.length, lastSize);
        fs.closeSync(fd);

        const chunk = buffer.toString('utf-8');
        this.onOutput?.(taskId, chunk, lastSize);
        lastSize = currentSize;
        runningTask.outputOffset = currentSize;
      }

      // Check if process is still running
      if (task.pid && !this.isProcessRunning(task.pid)) {
        clearInterval(runningTask.tailInterval!);
        this.runningTasks.delete(taskId);

        // Mark as completed (we don't know the real exit code)
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
        this.scheduleSave();
        this.onStatusChange?.(task);
        this.onCompleted?.(taskId, 0);
      }
    }, 500);

    this.runningTasks.set(taskId, runningTask);
  }

  /**
   * Shutdown the task manager
   */
  shutdown(): void {
    // Save state immediately
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveState();

    // Stop all tail intervals
    for (const [, runningTask] of this.runningTasks) {
      if (runningTask.tailInterval) {
        clearInterval(runningTask.tailInterval);
      }
    }
  }

  /**
   * Get stats for health check
   */
  getStats(): { taskCount: number; runningCount: number } {
    const tasks = Array.from(this.tasks.values());
    return {
      taskCount: tasks.length,
      runningCount: tasks.filter((t) => t.status.startsWith('running')).length,
    };
  }
}
