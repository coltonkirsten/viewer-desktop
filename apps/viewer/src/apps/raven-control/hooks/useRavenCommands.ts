/**
 * useRavenCommands Hook
 * API client for RAVEN slash commands (model, restart, clear)
 */

import { useState, useCallback, useEffect } from 'react';
import type { ConnectionConfig } from '../types';

type Model = 'haiku' | 'sonnet' | 'opus';

interface CommandsState {
  currentModel: Model | null;
  loading: {
    model: boolean;
    restart: boolean;
    clear: boolean;
  };
  feedback: {
    type: 'success' | 'error' | null;
    message: string | null;
  };
}

interface UseRavenCommandsReturn extends CommandsState {
  fetchModel: () => Promise<void>;
  setModel: (model: Model) => Promise<boolean>;
  restart: () => Promise<boolean>;
  clearContext: () => Promise<boolean>;
  clearFeedback: () => void;
}

export function useRavenCommands(config: ConnectionConfig): UseRavenCommandsReturn {
  const [state, setState] = useState<CommandsState>({
    currentModel: null,
    loading: {
      model: false,
      restart: false,
      clear: false,
    },
    feedback: {
      type: null,
      message: null,
    },
  });

  const getBaseUrl = useCallback(() => {
    const protocol = config.useSSL ? 'https' : 'http';
    return `${protocol}://${config.host}:${config.port}`;
  }, [config]);

  const fetchApi = useCallback(async <T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<{ data: T | null; error: string | null }> => {
    try {
      const response = await fetch(`${getBaseUrl()}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        return { data: null, error: `HTTP ${response.status}: ${text}` };
      }

      const data = await response.json();
      return { data: data as T, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { data: null, error: message };
    }
  }, [getBaseUrl]);

  const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
    setState(s => ({ ...s, feedback: { type, message } }));
    // Auto-clear after 3 seconds
    setTimeout(() => {
      setState(s => ({ ...s, feedback: { type: null, message: null } }));
    }, 3000);
  }, []);

  const clearFeedback = useCallback(() => {
    setState(s => ({ ...s, feedback: { type: null, message: null } }));
  }, []);

  // Fetch current model
  const fetchModel = useCallback(async () => {
    setState(s => ({ ...s, loading: { ...s.loading, model: true } }));
    const { data, error } = await fetchApi<{ model: Model; success: boolean }>('/commands/model');

    if (data?.success) {
      setState(s => ({
        ...s,
        currentModel: data.model,
        loading: { ...s.loading, model: false }
      }));
    } else {
      setState(s => ({ ...s, loading: { ...s.loading, model: false } }));
      if (error) showFeedback('error', error);
    }
  }, [fetchApi, showFeedback]);

  // Set model
  const setModel = useCallback(async (model: Model): Promise<boolean> => {
    setState(s => ({ ...s, loading: { ...s.loading, model: true } }));
    const { data, error } = await fetchApi<{ success: boolean; model: Model; message: string }>(
      '/commands/model',
      {
        method: 'POST',
        body: JSON.stringify({ args: model }),
      }
    );

    setState(s => ({ ...s, loading: { ...s.loading, model: false } }));

    if (data?.success) {
      setState(s => ({ ...s, currentModel: data.model }));
      showFeedback('success', `Switched to ${model}`);
      return true;
    } else {
      showFeedback('error', error || 'Failed to change model');
      return false;
    }
  }, [fetchApi, showFeedback]);

  // Restart RAVEN
  const restart = useCallback(async (): Promise<boolean> => {
    setState(s => ({ ...s, loading: { ...s.loading, restart: true } }));
    const { data, error } = await fetchApi<{ success: boolean; message: string }>(
      '/commands/restart',
      { method: 'POST', body: JSON.stringify({}) }
    );

    setState(s => ({ ...s, loading: { ...s.loading, restart: false } }));

    if (data?.success) {
      showFeedback('success', 'RAVEN restarting...');
      return true;
    } else {
      showFeedback('error', error || 'Failed to restart');
      return false;
    }
  }, [fetchApi, showFeedback]);

  // Clear context
  const clearContext = useCallback(async (): Promise<boolean> => {
    setState(s => ({ ...s, loading: { ...s.loading, clear: true } }));
    const { data, error } = await fetchApi<{ success: boolean; message: string }>(
      '/commands/clear',
      { method: 'POST', body: JSON.stringify({}) }
    );

    setState(s => ({ ...s, loading: { ...s.loading, clear: false } }));

    if (data?.success) {
      showFeedback('success', 'Context cleared');
      return true;
    } else {
      showFeedback('error', error || 'Failed to clear context');
      return false;
    }
  }, [fetchApi, showFeedback]);

  // Fetch model on mount
  useEffect(() => {
    fetchModel();
  }, [fetchModel]);

  return {
    ...state,
    fetchModel,
    setModel,
    restart,
    clearContext,
    clearFeedback,
  };
}
