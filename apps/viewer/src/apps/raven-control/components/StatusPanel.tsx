/**
 * StatusPanel Component
 * Displays RAVEN system status with health indicators
 */

import { useEffect } from 'react';
import {
  Activity,
  Clock,
  Cpu,
  MessageSquare,
  Users,
  Bot,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { RavenStatus, ConnectionConfig } from '../types';

interface StatusPanelProps {
  status: RavenStatus | null;
  isConnected: boolean;
  isLoading: boolean;
  config: ConnectionConfig;
  onRefresh: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--';
  }
}

export function StatusPanel({
  status,
  isConnected,
  isLoading,
  config,
  onRefresh,
  collapsed,
  onToggleCollapse,
}: StatusPanelProps) {
  // Auto-refresh every 10 seconds when connected
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(onRefresh, 10000);
    return () => clearInterval(interval);
  }, [isConnected, onRefresh]);

  return (
    <div className="border-b border-[var(--holo-border)] bg-[rgba(15,15,25,0.5)]">
      {/* Header */}
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[var(--holo-accent)]/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          <span className="font-medium">Status</span>
          {isConnected ? (
            <Wifi size={14} className="text-green-400" />
          ) : (
            <WifiOff size={14} className="text-red-400" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--holo-muted)]">
            {config.host}:{config.port}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            disabled={isLoading || !isConnected}
            className="p-1 rounded hover:bg-[var(--holo-accent)]/20 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="px-3 py-2">
          {!isConnected ? (
            <div className="text-center py-4 text-sm text-[var(--holo-muted)]">
              Not connected to RAVEN
            </div>
          ) : !status ? (
            <div className="text-center py-4 text-sm text-[var(--holo-muted)]">
              Loading status...
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {/* Uptime */}
              <div className="flex flex-col items-center gap-1 p-2 rounded bg-[var(--holo-accent)]/5 border border-[var(--holo-border)]">
                <Clock size={16} className="text-[var(--holo-accent)]" />
                <span className="text-sm font-medium">{formatUptime(status.uptime_seconds)}</span>
                <span className="text-xs text-[var(--holo-muted)]">Uptime</span>
              </div>

              {/* Model */}
              <div className="flex flex-col items-center gap-1 p-2 rounded bg-[var(--holo-accent)]/5 border border-[var(--holo-border)]">
                <Cpu size={16} className="text-purple-400" />
                <span className="text-sm font-medium">{status.model}</span>
                <span className="text-xs text-[var(--holo-muted)]">Model</span>
              </div>

              {/* Messages */}
              <div className="flex flex-col items-center gap-1 p-2 rounded bg-[var(--holo-accent)]/5 border border-[var(--holo-border)]">
                <MessageSquare size={16} className="text-blue-400" />
                <span className="text-sm font-medium">{status.message_count}</span>
                <span className="text-xs text-[var(--holo-muted)]">Messages</span>
              </div>

              {/* Agents */}
              <div className="flex flex-col items-center gap-1 p-2 rounded bg-[var(--holo-accent)]/5 border border-[var(--holo-border)]">
                <Bot size={16} className="text-amber-400" />
                <span className="text-sm font-medium">
                  {status.task_agents_running}
                  {status.task_agents_queued > 0 && (
                    <span className="text-[var(--holo-muted)]">+{status.task_agents_queued}</span>
                  )}
                </span>
                <span className="text-xs text-[var(--holo-muted)]">Agents</span>
              </div>
            </div>
          )}

          {/* Sessions list */}
          {status && status.sessions && status.sessions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[var(--holo-border)]">
              <div className="flex items-center gap-1 text-xs text-[var(--holo-muted)] mb-2">
                <Users size={12} />
                <span>Active Sessions ({status.active_sessions})</span>
              </div>
              <div className="space-y-1">
                {status.sessions.slice(0, 3).map((session) => (
                  <div
                    key={session.sender_id}
                    className="flex items-center justify-between text-xs p-1.5 rounded bg-[var(--holo-bg)]"
                  >
                    <span className="font-mono text-[var(--holo-muted)]">
                      {session.sender_id.slice(-4)}
                    </span>
                    <span className="text-[var(--holo-accent)]">{session.model}</span>
                    <span className="text-[var(--holo-muted)]">
                      {formatTimestamp(session.last_activity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
