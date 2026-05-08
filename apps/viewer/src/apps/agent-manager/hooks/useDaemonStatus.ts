/**
 * useDaemonStatus Hook
 * Monitors the connection status of the agent task daemon
 */

import { useState, useEffect, useCallback } from 'react';

interface DaemonStatus {
  isConnected: boolean;
  isChecking: boolean;
  runningCount: number;
  error?: string;
}

export function useDaemonStatus(): DaemonStatus {
  const [status, setStatus] = useState<DaemonStatus>({
    isConnected: false,
    isChecking: true,
    runningCount: 0,
  });

  const checkStatus = useCallback(async () => {
    try {
      // Try to list tasks - this will start the daemon if needed
      const tasks = await window.electron.agentTask.list();
      const runningCount = tasks.filter((t) => t.status.startsWith('running')).length;

      setStatus({
        isConnected: true,
        isChecking: false,
        runningCount,
      });
    } catch (error) {
      setStatus({
        isConnected: false,
        isChecking: false,
        runningCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, []);

  // Initial check and periodic polling
  useEffect(() => {
    checkStatus();

    // Poll every 5 seconds
    const interval = setInterval(checkStatus, 5000);

    // Also subscribe to task status updates to keep count accurate
    const unsubStatus = window.electron.agentTask.onStatus(() => {
      checkStatus();
    });

    const unsubCompleted = window.electron.agentTask.onCompleted(() => {
      checkStatus();
    });

    return () => {
      clearInterval(interval);
      unsubStatus();
      unsubCompleted();
    };
  }, [checkStatus]);

  return status;
}
