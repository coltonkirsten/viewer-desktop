/**
 * useRavenStream Hook
 * WebSocket streaming for live agent output
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ConnectionConfig,
  ConnectionStatus,
  StreamMessage,
  AgentStreamData,
} from '../types';

// Types for RAVEN activity events
export interface RavenActivityEvent {
  activity_type: 'message_received' | 'message_sent' | 'processing_start' | 'processing_end' | 'tool_call' | 'error' | 'warning' | 'status_change' | 'session_resume' | 'session_new';
  content: Record<string, unknown>;
  timestamp: string;
}

interface UseRavenStreamReturn {
  // Connection
  status: ConnectionStatus;
  connect: (config: ConnectionConfig) => void;
  disconnect: () => void;
  error: string | null;

  // Stream data
  messages: StreamMessage[];
  agentStreams: Map<string, AgentStreamData>;
  runningAgents: Array<{ agent_id: string; task_summary: string }>;
  ravenActivity: RavenActivityEvent[];

  // Commands
  requestRunningAgents: () => void;
  subscribeToAgent: (agentId: string) => void;
  clearMessages: () => void;
  clearRavenActivity: () => void;
}

const MAX_MESSAGES = 1000;
const RECONNECT_DELAY = 3000;

const MAX_RAVEN_ACTIVITY = 200;

export function useRavenStream(): UseRavenStreamReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [agentStreams, setAgentStreams] = useState<Map<string, AgentStreamData>>(new Map());
  const [runningAgents, setRunningAgents] = useState<Array<{ agent_id: string; task_summary: string }>>([]);
  const [ravenActivity, setRavenActivity] = useState<RavenActivityEvent[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const configRef = useRef<ConnectionConfig | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const shouldReconnectRef = useRef(true);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: StreamMessage = JSON.parse(event.data);

      // Add to messages log
      setMessages(prev => {
        const updated = [...prev, data];
        // Limit message history
        if (updated.length > MAX_MESSAGES) {
          return updated.slice(-MAX_MESSAGES);
        }
        return updated;
      });

      // Handle different message types
      switch (data.type) {
        case 'agent_output':
          if (data.agent_id && data.content) {
            setAgentStreams(prev => {
              const updated = new Map(prev);
              const existing = updated.get(data.agent_id!) || {
                agent_id: data.agent_id!,
                task_summary: '',
                status: 'running',
                output: '',
              };
              updated.set(data.agent_id!, {
                ...existing,
                output: existing.output + data.content,
              });
              return updated;
            });
          }
          break;

        case 'agent_status':
          if (data.agent_id) {
            setAgentStreams(prev => {
              const updated = new Map(prev);
              const existing = updated.get(data.agent_id!);
              if (existing) {
                updated.set(data.agent_id!, {
                  ...existing,
                  status: data.status || 'unknown',
                });
              }
              return updated;
            });

            // Remove from running agents if completed
            if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
              setRunningAgents(prev => prev.filter(a => a.agent_id !== data.agent_id));
            }
          }
          break;

        case 'running_agents':
          if (data.agents) {
            setRunningAgents(data.agents);
            // Initialize streams for running agents
            setAgentStreams(prev => {
              const updated = new Map(prev);
              for (const agent of data.agents!) {
                if (!updated.has(agent.agent_id)) {
                  updated.set(agent.agent_id, {
                    agent_id: agent.agent_id,
                    task_summary: agent.task_summary,
                    status: 'running',
                    output: '',
                  });
                }
              }
              return updated;
            });
          }
          break;

        case 'heartbeat':
          // Just keep-alive, no action needed
          break;

        case 'connected':
          setError(null);
          break;

        case 'raven_activity':
          // Handle RAVEN activity events
          // Server broadcasts: {type: "raven_activity", activity_type: "...", content: {...}, timestamp: "..."}
          const activity: RavenActivityEvent = {
            activity_type: (data.activity_type as RavenActivityEvent['activity_type']) || 'status_change',
            content: (data.content as Record<string, unknown>) || {},
            timestamp: data.timestamp || new Date().toISOString(),
          };
          setRavenActivity(prev => {
            const updated = [...prev, activity];
            if (updated.length > MAX_RAVEN_ACTIVITY) {
              return updated.slice(-MAX_RAVEN_ACTIVITY);
            }
            return updated;
          });
          break;
      }
    } catch (err) {
      console.error('Failed to parse stream message:', err);
    }
  }, []);

  const connect = useCallback((config: ConnectionConfig) => {
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    clearReconnectTimeout();
    configRef.current = config;
    shouldReconnectRef.current = true;

    const protocol = config.useSSL ? 'wss' : 'ws';
    const url = `${protocol}://${config.host}:${config.port}/ws/stream`;

    setStatus('connecting');
    setError(null);

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setStatus('connected');
        setError(null);
        // Request list of running agents
        ws.send(JSON.stringify({ command: 'get_running' }));
      };

      ws.onmessage = handleMessage;

      ws.onerror = () => {
        setStatus('error');
        setError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        setStatus('disconnected');
        wsRef.current = null;

        if (event.code !== 1000 && event.code !== 1001) {
          setError(`Connection closed: ${event.reason || `code ${event.code}`}`);
        }

        // Auto-reconnect if not intentionally disconnected
        if (shouldReconnectRef.current && configRef.current) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            if (configRef.current && shouldReconnectRef.current) {
              connect(configRef.current);
            }
          }, RECONNECT_DELAY);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, [handleMessage, clearReconnectTimeout]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearReconnectTimeout();

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }

    setStatus('disconnected');
    setError(null);
  }, [clearReconnectTimeout]);

  const requestRunningAgents = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: 'get_running' }));
    }
  }, []);

  const subscribeToAgent = useCallback((agentId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: 'subscribe', agent_id: agentId }));
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setAgentStreams(new Map());
  }, []);

  const clearRavenActivity = useCallback(() => {
    setRavenActivity([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldReconnectRef.current = false;
      clearReconnectTimeout();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [clearReconnectTimeout]);

  return {
    status,
    connect,
    disconnect,
    error,
    messages,
    agentStreams,
    runningAgents,
    ravenActivity,
    requestRunningAgents,
    subscribeToAgent,
    clearMessages,
    clearRavenActivity,
  };
}
