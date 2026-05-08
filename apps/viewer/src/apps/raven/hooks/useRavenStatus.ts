/**
 * useRavenStatus Hook
 * Manages Raven process status and control
 */

import { useState, useEffect, useCallback } from 'react';
import type { RavenState, VisualMode } from '../types';

export function useRavenStatus() {
  const [state, setState] = useState<RavenState>({
    status: 'stopped',
    visualMode: 'screen',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial status
  useEffect(() => {
    window.electron.raven
      .getStatus()
      .then((status) => {
        setState(status);
      })
      .catch((error) => {
        console.error('Failed to get Raven status:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Subscribe to status changes
    const unsubscribe = window.electron.raven.onStatusChange((newState) => {
      setState(newState);
    });

    // Subscribe to WebSocket updates
    window.electron.raven.subscribeTranscripts().catch(console.error);

    return unsubscribe;
  }, []);

  const start = useCallback(async (mode?: VisualMode) => {
    try {
      setState((s) => ({ ...s, status: 'starting' }));
      const newState = await window.electron.raven.start(mode);
      setState(newState);
      return newState;
    } catch (error) {
      console.error('Failed to start Raven:', error);
      setState((s) => ({ ...s, status: 'error', error: String(error) }));
      throw error;
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      setState((s) => ({ ...s, status: 'stopping' }));
      const newState = await window.electron.raven.stop();
      setState(newState);
      return newState;
    } catch (error) {
      console.error('Failed to stop Raven:', error);
      throw error;
    }
  }, []);

  const setMode = useCallback(async (mode: VisualMode) => {
    try {
      const newState = await window.electron.raven.setMode(mode);
      setState(newState);
      return newState;
    } catch (error) {
      console.error('Failed to set mode:', error);
      throw error;
    }
  }, []);

  return { state, isLoading, start, stop, setMode };
}
