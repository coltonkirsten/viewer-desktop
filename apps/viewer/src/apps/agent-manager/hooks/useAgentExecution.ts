/**
 * useAgentExecution Hook
 * Manages execution of Claude CLI tasks with pre/post commands
 *
 * This is the LEGACY implementation that runs tasks in the renderer process.
 * Tasks are lost when the app is closed.
 *
 * For persistent background tasks, use useAgentExecutionDaemon instead.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { TaskTemplate, TaskExecution, CommandResult, ExecutionStatus } from '../types';
import { buildClaudeCommand, buildShellCommand } from '../utils/commandBuilder';
import { mergeVariables } from '../utils/variableResolver';
import { generateId } from '../constants';

// Feature flag to switch between implementations
// Set to true to use the new daemon-based execution
export const USE_DAEMON_EXECUTION = true;

// Re-export the daemon hook for easy switching
export { useAgentExecutionDaemon, useTaskOutput } from './useAgentExecutionDaemon';

// Maximum output buffer size (5MB) to prevent memory issues with long-running tasks
const MAX_OUTPUT_SIZE = 5 * 1024 * 1024;
// Minimum time between React state updates for terminal output (ms)
const OUTPUT_UPDATE_THROTTLE_MS = 150;

interface UseAgentExecutionOptions {
  onExecutionComplete?: (execution: TaskExecution) => void;
  onExecutionStart?: (execution: TaskExecution) => void;
}

interface UseAgentExecutionReturn {
  activeExecutions: TaskExecution[];
  executeTask: (template: TaskTemplate, variables: Record<string, string>) => TaskExecution;
  cancelExecution: (executionId: string) => void;
  markComplete: (executionId: string, status: 'completed' | 'failed') => Promise<void>;
  getExecutionOutput: (executionId: string) => string;
}

interface ExecutionContext {
  execution: TaskExecution;
  template: TaskTemplate;
  terminalSessionId?: string;
  outputBuffer: string[];
  outputBufferSize: number; // Track size to avoid recalculating
  exitCode?: number;
  lastDataTime: number;
  lastUpdateTime: number; // For throttling React updates
  pendingUpdate: boolean; // Whether an update is scheduled
  idleInterval?: ReturnType<typeof setInterval>;
  unsubscribeData?: () => void;
  unsubscribeExit?: () => void;
}

export function useAgentExecution({
  onExecutionComplete,
  onExecutionStart,
}: UseAgentExecutionOptions = {}): UseAgentExecutionReturn {
  const [activeExecutions, setActiveExecutions] = useState<TaskExecution[]>([]);
  const executionContexts = useRef<Map<string, ExecutionContext>>(new Map());
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      // Kill all active terminal sessions
      for (const [, ctx] of executionContexts.current) {
        if (ctx.terminalSessionId) {
          window.electron.terminal.kill(ctx.terminalSessionId).catch(() => {});
        }
        ctx.unsubscribeData?.();
        ctx.unsubscribeExit?.();
        if (ctx.idleInterval) clearInterval(ctx.idleInterval);
      }
    };
  }, []);

  // Update execution state
  const updateExecution = useCallback((executionId: string, updates: Partial<TaskExecution>) => {
    // Skip updates if component is unmounted
    if (!isMounted.current) return;

    setActiveExecutions((prev) =>
      prev.map((e) => (e.id === executionId ? { ...e, ...updates } : e))
    );

    const ctx = executionContexts.current.get(executionId);
    if (ctx) {
      ctx.execution = { ...ctx.execution, ...updates };
    }
  }, []);

  // Complete execution (move to history)
  const completeExecution = useCallback((executionId: string, status: 'completed' | 'failed' | 'cancelled', exitCode?: number, errorMessage?: string) => {
    const ctx = executionContexts.current.get(executionId);
    if (!ctx) return;

    const completedExecution: TaskExecution = {
      ...ctx.execution,
      status,
      exitCode,
      errorMessage,
      claudeOutput: ctx.outputBuffer.join(''),
      completedAt: new Date().toISOString(),
    };

    // Cleanup
    ctx.unsubscribeData?.();
    ctx.unsubscribeExit?.();
    if (ctx.idleInterval) clearInterval(ctx.idleInterval);
    executionContexts.current.delete(executionId);

    // Remove from active
    setActiveExecutions((prev) => prev.filter((e) => e.id !== executionId));

    // Notify
    onExecutionComplete?.(completedExecution);
  }, [onExecutionComplete]);

  // Run a shell command and return result
  const runShellCommand = useCallback(async (
    command: string,
    variables: Record<string, string>,
    workingDir?: string
  ): Promise<CommandResult> => {
    const resolvedCommand = buildShellCommand(command, variables);
    const startedAt = new Date().toISOString();

    return new Promise(async (resolve) => {
      const outputBuffer: string[] = [];

      try {
        // Create a terminal session for this command
        const { sessionId } = await window.electron.terminal.create(workingDir);

        // Subscribe to output
        const unsubscribeData = window.electron.terminal.onData((event) => {
          if (event.sessionId === sessionId) {
            outputBuffer.push(event.data);
          }
        });

        // Subscribe to exit
        const unsubscribeExit = window.electron.terminal.onExit((event) => {
          if (event.sessionId === sessionId) {
            unsubscribeData();
            unsubscribeExit();

            resolve({
              commandId: generateId(),
              command: resolvedCommand,
              exitCode: event.exitCode,
              output: outputBuffer.join(''),
              startedAt,
              completedAt: new Date().toISOString(),
            });
          }
        });

        // Send the command with a newline to execute it
        await window.electron.terminal.write(sessionId, resolvedCommand + '\n');
        // Send exit to close the shell when command completes
        await window.electron.terminal.write(sessionId, 'exit\n');
      } catch (error) {
        resolve({
          commandId: generateId(),
          command: resolvedCommand,
          exitCode: 1,
          output: error instanceof Error ? error.message : 'Unknown error',
          startedAt,
          completedAt: new Date().toISOString(),
        });
      }
    });
  }, []);

  // Execute a task
  const executeTask = useCallback((template: TaskTemplate, variables: Record<string, string>): TaskExecution => {
    // Merge with built-in variables
    const mergedVars = mergeVariables(variables);

    // Build the Claude command
    const { command, resolvedPrompt } = buildClaudeCommand(template, mergedVars);

    // Create execution record
    const execution: TaskExecution = {
      id: generateId(),
      templateId: template.id,
      templateName: template.name,
      resolvedVariables: mergedVars,
      resolvedPrompt,
      fullCommand: command,
      status: 'pending',
      preCommandResults: [],
      postCommandResults: [],
      startedAt: new Date().toISOString(),
    };

    // Create context
    const ctx: ExecutionContext = {
      execution,
      template,
      outputBuffer: [],
      outputBufferSize: 0,
      lastDataTime: Date.now(),
      lastUpdateTime: 0,
      pendingUpdate: false,
    };
    executionContexts.current.set(execution.id, ctx);

    // Add to active executions
    setActiveExecutions((prev) => [...prev, execution]);
    onExecutionStart?.(execution);

    // Start the execution pipeline
    (async () => {
      const executionId = execution.id;

      try {
        // 1. Run pre-commands
        if (template.preCommands.length > 0) {
          updateExecution(executionId, { status: 'running-pre' });

          for (const preCmd of template.preCommands) {
            const result = await runShellCommand(preCmd.command, mergedVars, template.workingDirectory);

            const currentCtx = executionContexts.current.get(executionId);
            if (!currentCtx) return; // Cancelled

            currentCtx.execution.preCommandResults.push(result);
            updateExecution(executionId, {
              preCommandResults: [...currentCtx.execution.preCommandResults]
            });

            // Pre-command failure aborts the task
            if (result.exitCode !== 0) {
              completeExecution(executionId, 'failed', result.exitCode, `Pre-command failed: ${preCmd.command}`);
              return;
            }
          }
        }

        // 2. Run main Claude command
        updateExecution(executionId, { status: 'running-main' });

        // Create terminal session for Claude
        const { sessionId } = await window.electron.terminal.create(template.workingDirectory);

        const currentCtx = executionContexts.current.get(executionId);
        if (!currentCtx) return; // Cancelled

        currentCtx.terminalSessionId = sessionId;
        updateExecution(executionId, { terminalSessionId: sessionId });

        // Subscribe to output with throttling and buffer size capping
        currentCtx.unsubscribeData = window.electron.terminal.onData((event) => {
          if (event.sessionId !== sessionId) return;

          const ctx = executionContexts.current.get(executionId);
          if (!ctx) return;

          // Add data to buffer and track size
          ctx.outputBuffer.push(event.data);
          ctx.outputBufferSize += event.data.length;
          ctx.lastDataTime = Date.now();

          // Cap buffer size to prevent memory issues (silent truncation)
          while (ctx.outputBuffer.length > 1 && ctx.outputBufferSize > MAX_OUTPUT_SIZE) {
            const removed = ctx.outputBuffer.shift();
            if (removed) ctx.outputBufferSize -= removed.length;
          }

          // Throttle React state updates to prevent renderer overload
          const now = Date.now();
          if (!ctx.pendingUpdate && (now - ctx.lastUpdateTime > OUTPUT_UPDATE_THROTTLE_MS)) {
            ctx.pendingUpdate = true;
            requestAnimationFrame(() => {
              const latestCtx = executionContexts.current.get(executionId);
              if (!latestCtx || !isMounted.current) return;

              latestCtx.pendingUpdate = false;
              latestCtx.lastUpdateTime = Date.now();
              updateExecution(executionId, {
                claudeOutput: latestCtx.outputBuffer.join(''),
                isIdle: false
              });
            });
          }
        });

        // Start idle detection interval
        currentCtx.idleInterval = setInterval(() => {
          const ctx = executionContexts.current.get(executionId);
          if (!ctx || !ctx.execution.status.startsWith('running')) {
            if (ctx?.idleInterval) clearInterval(ctx.idleInterval);
            return;
          }
          const elapsed = Date.now() - ctx.lastDataTime;
          if (elapsed > 3000 && !ctx.execution.isIdle) {
            updateExecution(executionId, { isIdle: true });
          }
        }, 1000);

        // Subscribe to exit
        currentCtx.unsubscribeExit = window.electron.terminal.onExit(async (event) => {
          if (event.sessionId !== sessionId) return;

          const ctx = executionContexts.current.get(executionId);
          if (!ctx) return;

          ctx.exitCode = event.exitCode;

          // 3. Run post-commands if main command succeeded or has continueOnFail
          if (template.postCommands.length > 0) {
            updateExecution(executionId, { status: 'running-post' });

            for (const postCmd of template.postCommands) {
              const result = await runShellCommand(postCmd.command, mergedVars, template.workingDirectory);

              const postCtx = executionContexts.current.get(executionId);
              if (!postCtx) return; // Cancelled

              postCtx.execution.postCommandResults.push(result);
              updateExecution(executionId, {
                postCommandResults: [...postCtx.execution.postCommandResults]
              });

              // Post-command failure only aborts if continueOnFail is false
              if (result.exitCode !== 0 && !postCmd.continueOnFail) {
                completeExecution(executionId, 'failed', result.exitCode, `Post-command failed: ${postCmd.command}`);
                return;
              }
            }
          }

          // Complete the execution
          const finalStatus = event.exitCode === 0 ? 'completed' : 'failed';
          completeExecution(executionId, finalStatus, event.exitCode);
        });

        // Send the Claude command
        await window.electron.terminal.write(sessionId, command + '\n');

      } catch (error) {
        completeExecution(
          executionId,
          'failed',
          1,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    })();

    return execution;
  }, [updateExecution, completeExecution, runShellCommand, onExecutionStart]);

  // Cancel an execution
  const cancelExecution = useCallback((executionId: string) => {
    const ctx = executionContexts.current.get(executionId);
    if (!ctx) return;

    // Kill terminal session if exists
    if (ctx.terminalSessionId) {
      window.electron.terminal.kill(ctx.terminalSessionId).catch(() => {});
    }

    completeExecution(executionId, 'cancelled');
  }, [completeExecution]);

  // Manually mark an execution as complete
  const markComplete = useCallback(async (executionId: string, status: 'completed' | 'failed') => {
    const ctx = executionContexts.current.get(executionId);
    if (!ctx) return;

    // Clean up terminal session
    if (ctx.terminalSessionId) {
      ctx.unsubscribeData?.();
      ctx.unsubscribeExit?.();
      await window.electron.terminal.kill(ctx.terminalSessionId).catch(() => {});
    }

    // If in running-main and there are post-commands, run them
    if (ctx.execution.status === 'running-main' && ctx.template.postCommands?.length > 0) {
      updateExecution(executionId, { status: 'running-post' });

      for (const postCmd of ctx.template.postCommands) {
        const result = await runShellCommand(postCmd.command, ctx.execution.resolvedVariables, ctx.template.workingDirectory);

        const postCtx = executionContexts.current.get(executionId);
        if (!postCtx) return; // Cancelled during post-commands

        postCtx.execution.postCommandResults.push(result);
        updateExecution(executionId, {
          postCommandResults: [...postCtx.execution.postCommandResults]
        });

        if (result.exitCode !== 0 && !postCmd.continueOnFail) {
          completeExecution(executionId, 'failed', result.exitCode, `Post-command failed: ${postCmd.command}`);
          return;
        }
      }
    }

    // Complete the execution
    completeExecution(executionId, status, undefined);
  }, [updateExecution, completeExecution, runShellCommand]);

  // Get output for an execution
  const getExecutionOutput = useCallback((executionId: string): string => {
    const ctx = executionContexts.current.get(executionId);
    return ctx?.outputBuffer.join('') || '';
  }, []);

  return {
    activeExecutions,
    executeTask,
    cancelExecution,
    markComplete,
    getExecutionOutput,
  };
}
