/**
 * useRavenAPI Hook
 * REST API client for RAVEN control panel
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ConnectionConfig,
  RavenStatus,
  AgentList,
  AgentDetail,
  EventList,
  ScheduledEvent,
} from '../types';

interface UseRavenAPIReturn {
  // Connection
  config: ConnectionConfig;
  setConfig: (config: ConnectionConfig) => void;
  isConnected: boolean;
  error: string | null;

  // Status
  status: RavenStatus | null;
  fetchStatus: () => Promise<void>;

  // Agents
  agents: AgentList | null;
  fetchAgents: (filter?: string) => Promise<void>;
  getAgent: (agentId: string) => Promise<AgentDetail | null>;
  spawnAgent: (task: string) => Promise<{ agent_id: string } | null>;
  cancelAgent: (agentId: string) => Promise<boolean>;
  getAgentOutput: (agentId: string, tail?: number) => Promise<string>;

  // Events
  events: EventList | null;
  fetchEvents: () => Promise<void>;
  createEvent: (event: Omit<ScheduledEvent, 'id' | 'created_at' | 'last_run' | 'run_count'>) => Promise<ScheduledEvent | null>;
  updateEvent: (eventId: string, updates: Partial<ScheduledEvent>) => Promise<ScheduledEvent | null>;
  deleteEvent: (eventId: string) => Promise<boolean>;

  // Loading states
  loading: {
    status: boolean;
    agents: boolean;
    events: boolean;
  };
}

const DEFAULT_CONFIG: ConnectionConfig = {
  host: '100.109.10.50',
  port: 8420,
  useSSL: false,
};

export function useRavenAPI(): UseRavenAPIReturn {
  const [config, setConfig] = useState<ConnectionConfig>(() => {
    // Try to load from localStorage
    try {
      const saved = localStorage.getItem('raven-control-config');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore
    }
    return DEFAULT_CONFIG;
  });

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<RavenStatus | null>(null);
  const [agents, setAgents] = useState<AgentList | null>(null);
  const [events, setEvents] = useState<EventList | null>(null);

  const [loading, setLoading] = useState({
    status: false,
    agents: false,
    events: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Save config to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('raven-control-config', JSON.stringify(config));
  }, [config]);

  const getBaseUrl = useCallback(() => {
    const protocol = config.useSSL ? 'https' : 'http';
    return `${protocol}://${config.host}:${config.port}`;
  }, [config]);

  const fetchApi = useCallback(async <T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T | null> => {
    try {
      const response = await fetch(`${getBaseUrl()}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setIsConnected(true);
      setError(null);
      return data as T;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      if (message.includes('fetch')) {
        setIsConnected(false);
      }
      return null;
    }
  }, [getBaseUrl]);

  // Status
  const fetchStatus = useCallback(async () => {
    setLoading(l => ({ ...l, status: true }));
    const data = await fetchApi<RavenStatus>('/status');
    if (data) {
      setStatus(data);
    }
    setLoading(l => ({ ...l, status: false }));
  }, [fetchApi]);

  // Agents
  const fetchAgents = useCallback(async (filter?: string) => {
    setLoading(l => ({ ...l, agents: true }));
    const query = filter ? `?status_filter=${filter}` : '';
    const data = await fetchApi<AgentList>(`/agents${query}`);
    if (data) {
      setAgents(data);
    }
    setLoading(l => ({ ...l, agents: false }));
  }, [fetchApi]);

  const getAgent = useCallback(async (agentId: string): Promise<AgentDetail | null> => {
    return await fetchApi<AgentDetail>(`/agents/${agentId}`);
  }, [fetchApi]);

  const spawnAgent = useCallback(async (task: string): Promise<{ agent_id: string } | null> => {
    return await fetchApi<{ agent_id: string; status: string }>('/agents', {
      method: 'POST',
      body: JSON.stringify({ task }),
    });
  }, [fetchApi]);

  const cancelAgent = useCallback(async (agentId: string): Promise<boolean> => {
    const result = await fetchApi<{ success: boolean }>(`/agents/${agentId}`, {
      method: 'DELETE',
    });
    return result?.success ?? false;
  }, [fetchApi]);

  const getAgentOutput = useCallback(async (agentId: string, tail?: number): Promise<string> => {
    const query = tail ? `?tail=${tail}` : '';
    const result = await fetchApi<{ output: string }>(`/agents/${agentId}/output${query}`);
    return result?.output ?? '';
  }, [fetchApi]);

  // Events
  const fetchEvents = useCallback(async () => {
    setLoading(l => ({ ...l, events: true }));
    const data = await fetchApi<EventList>('/events');
    if (data) {
      setEvents(data);
    }
    setLoading(l => ({ ...l, events: false }));
  }, [fetchApi]);

  const createEvent = useCallback(async (
    event: Omit<ScheduledEvent, 'id' | 'created_at' | 'last_run' | 'run_count'>
  ): Promise<ScheduledEvent | null> => {
    return await fetchApi<ScheduledEvent>('/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }, [fetchApi]);

  const updateEvent = useCallback(async (
    eventId: string,
    updates: Partial<ScheduledEvent>
  ): Promise<ScheduledEvent | null> => {
    return await fetchApi<ScheduledEvent>(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }, [fetchApi]);

  const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
    const result = await fetchApi<{ success: boolean }>(`/events/${eventId}`, {
      method: 'DELETE',
    });
    return result?.success ?? false;
  }, [fetchApi]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    config,
    setConfig,
    isConnected,
    error,

    status,
    fetchStatus,

    agents,
    fetchAgents,
    getAgent,
    spawnAgent,
    cancelAgent,
    getAgentOutput,

    events,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,

    loading,
  };
}
