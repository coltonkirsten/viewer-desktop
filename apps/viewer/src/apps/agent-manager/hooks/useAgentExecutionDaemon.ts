/**
 * useAgentExecutionDaemon Hook
 * Manages execution of Claude CLI tasks via the background daemon
 * Tasks persist across app restarts
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { TaskTemplate, TaskExecution, ExecutionStatus } from '../types';
import { buildClaudeCommand } from '../utils/commandBuilder';
import { mergeVariables, resolveVariables } from '../utils/variableResolver';
import type {
  AgentTaskRecord,
  AgentTaskConfig,
  AgentTaskOutputEvent,
  AgentTaskCompletedEvent,
} from '@/types/electron';

interface UseAgentExecutionDaemonOptions {
  onExecutionComplete?: (execution: TaskExecution) => void;
  onExecutionStart?: (execution: TaskExecution) => void;
  workingDirectory?: string;
}

interface UseAgentExecutionDaemonReturn {
  /** All tasks from daemon (running + recent completed) */
  tasks: AgentTaskRecord[];
  /** Active executions in UI-compatible format */
  activeExecutions: TaskExecution[];
  /** Execute a new task */
  executeTask: (template: TaskTemplate, variables: Record<string, string>) => Promise<TaskExecution>;
  /** Cancel a running task */
  cancelExecution: (executionId: string) => Promise<void>;
  /** Mark a task as complete (triggers post-commands via daemon) */
  markComplete: (executionId: string, status: 'completed' | 'failed') => Promise<void>;
  /** Get output for a task */
  getExecutionOutput: (executionId: string) => string;
  /** Loading state */
  isLoading: boolean;
  /** Refresh task list from daemon */
  refreshTasks: () => Promise<void>;
}

// Map daemon task to UI TaskExecution format
function daemonTaskToExecution(task: AgentTaskRecord): TaskExecution {
  return {
    id: task.id,
    templateId: task.config.metadata?.templateId as string || '',
    templateName: task.config.metadata?.templateName as string || 'Unknown',
    resolvedVariables: {},
    resolvedPrompt: '',
    fullCommand: task.config.command,
    status: task.status as ExecutionStatus,
    preCommandResults: [],
    postCommandResults: [],
    startedAt: task.startedAt || task.createdAt,
    completedAt: task.completedAt,
    exitCode: task.exitCode,
    errorMessage: task.error,
    isIdle: false,
    // We'll populate claudeOutput separately via getOutput
  };
}

export function useAgentExecutionDaemon({
  onExecutionComplete,
  onExecutionStart,
  workingDirectory,
}: UseAgentExecutionDaemonOptions = {}): UseAgentExecutionDaemonReturn {
  const [tasks, setTasks] = useState<AgentTaskRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const outputCache = useRef<Map<string, string>>(new Map());
  const isMounted = useRef(true);
  const completionNotified = useRef<Set<string>>(new Set());

  // Store callbacks in refs to avoid re-running effects when they change
  const onExecutionCompleteRef = useRef(onExecutionComplete);
  const onExecutionStartRef = useRef(onExecutionStart);

  // Keep refs up to date
  useEffect(() => {
    onExecutionCompleteRef.current = onExecutionComplete;
  }, [onExecutionComplete]);

  useEffect(() => {
    onExecutionStartRef.current = onExecutionStart;
  }, [onExecutionStart]);

  // Load tasks from daemon
  const refreshTasks = useCallback(async () => {
    try {
      const daemonTasks = await window.electron.agentTask.list();
      if (isMounted.current) {
        setTasks(daemonTasks);
      }
    } catch (error) {
      console.error('Failed to load tasks from daemon:', error);
    }
  }, []);

  // Initial load and subscriptions
  useEffect(() => {
    isMounted.current = true;

    // Load initial tasks
    (async () => {
      setIsLoading(true);
      await refreshTasks();
      setIsLoading(false);
    })();

    // Subscribe to task status updates
    const unsubStatus = window.electron.agentTask.onStatus((task) => {
      if (!isMounted.current) return;

      let previousStatus: string | undefined;
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.id === task.id);
        if (idx >= 0) {
          previousStatus = prev[idx]?.status;
          const updated = [...prev];
          updated[idx] = task;
          return updated;
        }
        return [...prev, task];
      });

      // Notify on completion
      const isTerminal =
        task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled';
      const wasTerminal =
        previousStatus === 'completed' || previousStatus === 'failed' || previousStatus === 'cancelled';

      if (isTerminal && !wasTerminal && !completionNotified.current.has(task.id)) {
        completionNotified.current.add(task.id);
        onExecutionCompleteRef.current?.(daemonTaskToExecution(task));
      }
    });

    // Subscribe to output updates
    const unsubOutput = window.electron.agentTask.onOutput((event: AgentTaskOutputEvent) => {
      if (!isMounted.current) return;

      // Update output cache
      const current = outputCache.current.get(event.taskId) || '';
      outputCache.current.set(event.taskId, current + event.chunk);
    });

    // Subscribe to completion events
    const unsubCompleted = window.electron.agentTask.onCompleted((event: AgentTaskCompletedEvent) => {
      if (!isMounted.current) return;

      // Refresh to get final state
      refreshTasks();
    });

    return () => {
      isMounted.current = false;
      unsubStatus();
      unsubOutput();
      unsubCompleted();
    };
  }, [refreshTasks]);

  // Execute a task via daemon
  const executeTask = useCallback(
    async (template: TaskTemplate, variables: Record<string, string>): Promise<TaskExecution> => {
      // Merge with built-in variables
      const mergedVars = mergeVariables(variables);

      // Build the Claude command
      const { command, resolvedPrompt } = buildClaudeCommand(template, mergedVars);

      // Build pre/post command strings
      const preCommands = template.preCommands?.map((c) =>
        resolveVariables(c.command, mergedVars)
      );
      const postCommands = template.postCommands?.map((c) =>
        resolveVariables(c.command, mergedVars)
      );

      // Get the working directory - fall back to root dir from electron
      let cwd = template.workingDirectory || workingDirectory;
      if (!cwd) {
        try {
          cwd = await window.electron.app.getRootDir() || '/tmp';
        } catch {
          cwd = '/tmp';
        }
      }

      // Create task config for daemon
      const config: AgentTaskConfig = {
        command,
        cwd,
        preCommands,
        postCommands,
        continueOnPreFail: false,
        continueOnPostFail: template.postCommands?.some((c) => c.continueOnFail) || false,
        metadata: {
          templateId: template.id,
          templateName: template.name,
        },
      };

      // Create task in daemon
      const task = await window.electron.agentTask.create(config);

      // Start the task
      const startedTask = await window.electron.agentTask.start(task.id);

      // Create UI execution record
      const execution: TaskExecution = {
        id: startedTask.id,
        templateId: template.id,
        templateName: template.name,
        resolvedVariables: mergedVars,
        resolvedPrompt,
        fullCommand: command,
        status: startedTask.status as ExecutionStatus,
        preCommandResults: [],
        postCommandResults: [],
        startedAt: startedTask.startedAt || startedTask.createdAt,
      };

      // Notify
      onExecutionStartRef.current?.(execution);

      // Add to local state
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.id === startedTask.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = startedTask;
          return updated;
        }
        return [...prev, startedTask];
      });

      return execution;
    },
    [workingDirectory]
  );

  // Cancel a task
  const cancelExecution = useCallback(async (executionId: string) => {
    try {
      await window.electron.agentTask.cancel(executionId);
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
  }, []);

  // Mark task as complete (for interactive tasks)
  const markComplete = useCallback(
    async (executionId: string, status: 'completed' | 'failed') => {
      // For now, we just cancel - the daemon handles completion naturally
      // In the future, we might want to add a "force complete" API
      if (status === 'failed') {
        await cancelExecution(executionId);
      }
      // For 'completed', we let the process finish naturally
    },
    [cancelExecution]
  );

  // Get output for a task
  const getExecutionOutput = useCallback((executionId: string): string => {
    // Return from cache if available
    const cached = outputCache.current.get(executionId);
    if (cached) return cached;

    // Otherwise trigger async load (for reconnecting to running tasks)
    window.electron.agentTask.getOutput(executionId).then((response) => {
      outputCache.current.set(executionId, response.output);
    });

    return '';
  }, []);

  // Convert daemon tasks to UI format
  const activeExecutions = tasks
    .filter((t) => t.status.startsWith('running') || t.status === 'pending')
    .map(daemonTaskToExecution);

  return {
    tasks,
    activeExecutions,
    executeTask,
    cancelExecution,
    markComplete,
    getExecutionOutput,
    isLoading,
    refreshTasks,
  };
}

/**
 * Hook to get live output for a specific task
 */
export function useTaskOutput(taskId: string | null): string {
  const [output, setOutput] = useState('');

  useEffect(() => {
    if (!taskId) {
      setOutput('');
      return;
    }

    // Load existing output
    window.electron.agentTask.getOutput(taskId).then((response) => {
      setOutput(response.output);
    });

    // Subscribe to new output
    const unsub = window.electron.agentTask.onOutput((event) => {
      if (event.taskId === taskId) {
        setOutput((prev) => prev + event.chunk);
      }
    });

    return unsub;
  }, [taskId]);

  return output;
}
