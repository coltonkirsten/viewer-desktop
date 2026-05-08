/**
 * useFunctionLogs Hook
 * Manages function call log history
 */

import { useState, useEffect } from 'react';
import type { FunctionLog } from '../types';

const MAX_LOGS = 500;

export function useFunctionLogs() {
  const [logs, setLogs] = useState<FunctionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    // Load history
    window.electron.raven
      .getFunctionLogs(100)
      .then(({ logs: history }) => {
        setLogs(history);
      })
      .catch((error) => {
        console.error('Failed to load function logs:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Subscribe to real-time updates
    const unsubscribe = window.electron.raven.onFunctionLog((entry) => {
      setLogs((prev) => {
        // Check if this is an update to an existing log (same callId)
        const existingIndex = prev.findIndex((log) => log.callId === entry.callId);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = entry;
          return updated;
        }

        // Add new log
        const next = [...prev, entry];
        if (next.length > MAX_LOGS) {
          return next.slice(-MAX_LOGS);
        }
        return next;
      });
    });

    return unsubscribe;
  }, []);

  const filteredLogs = filter
    ? logs.filter((log) =>
        log.functionName.toLowerCase().includes(filter.toLowerCase())
      )
    : logs;

  const clear = () => {
    setLogs([]);
  };

  return { logs: filteredLogs, allLogs: logs, isLoading, filter, setFilter, clear };
}
