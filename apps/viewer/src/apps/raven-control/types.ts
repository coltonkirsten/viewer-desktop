/**
 * Types for Raven Control Panel
 */

// ============ Status Types ============

export interface SessionInfo {
  sender_id: string;
  session_id: string;
  model: string;
  created_at: string;
  last_activity: string;
}

export interface RavenStatus {
  status: string;
  uptime_seconds: number;
  started_at: string;
  model: string;
  message_count: number;
  active_sessions: number;
  sessions: SessionInfo[];
  task_agents_running: number;
  task_agents_queued: number;
}

// ============ Agent Types ============

export interface AgentSummary {
  agent_id: string;
  task_summary: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'queued';
  model: string;
  started_at?: string;
  completed_at?: string;
  runtime_seconds?: number;
  queue_position?: number;
  queued_at?: string;
}

export interface AgentDetail extends AgentSummary {
  task: string;
  pid?: number;
  output_file?: string;
  partial_output?: string;
  result_preview?: string;
}

export interface AgentList {
  agents: AgentSummary[];
  total: number;
  running_count: number;
  queued_count: number;
}

// ============ Event Types ============

export interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly' | 'interval';
  interval: number;
  days_of_week?: number[];
  day_of_month?: number;
  time_of_day: string;
}

export interface ScheduledEvent {
  id: string;
  sender_id: string;
  task: string;
  next_run: string;
  description: string;
  created_at: string;
  recurrence?: RecurrenceRule;
  enabled: boolean;
  last_run?: string;
  run_count: number;
}

export interface EventList {
  events: ScheduledEvent[];
  total: number;
}

// ============ WebSocket Stream Types ============

export type StreamMessageType =
  | 'connected'
  | 'heartbeat'
  | 'agent_output'
  | 'agent_status'
  | 'raven_activity'
  | 'running_agents'
  | 'subscribed';

export interface StreamMessage {
  type: StreamMessageType;
  agent_id?: string;
  content?: string;
  status?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  message?: string;
  agents?: Array<{ agent_id: string; task_summary: string }>;
}

// ============ Connection Types ============

export interface ConnectionConfig {
  host: string;
  port: number;
  useSSL: boolean;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// ============ UI State Types ============

export interface AgentStreamData {
  agent_id: string;
  task_summary: string;
  status: string;
  output: string;
  started_at?: string;
}

export interface PanelState {
  statusCollapsed: boolean;
  eventsCollapsed: boolean;
  commandsCollapsed: boolean;
  selectedAgentId: string | null;
}
