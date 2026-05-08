/**
 * AgentsPanel Component
 * List of task agents with status and management
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Square,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import type { AgentList, AgentSummary } from '../types';

interface AgentsPanelProps {
  agents: AgentList | null;
  isLoading: boolean;
  onRefresh: () => void;
  onSpawn: (task: string) => Promise<void>;
  onCancel: (agentId: string) => Promise<void>;
  onSelect: (agentId: string) => void;
  selectedAgentId: string | null;
}

// Animated pulsing dot for running status
function PulsingDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-3 w-3">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-3 w-3 ${color}`} />
    </span>
  );
}

const STATUS_ICONS: Record<string, JSX.Element> = {
  running: <PulsingDot color="bg-blue-400" />,
  completed: <CheckCircle size={12} className="text-green-400" />,
  failed: <XCircle size={12} className="text-red-400" />,
  cancelled: <Square size={12} className="text-amber-400" />,
  queued: <Clock size={12} className="text-[var(--holo-muted)] animate-pulse" />,
};

const STATUS_COLORS: Record<string, string> = {
  running: 'border-l-blue-400',
  completed: 'border-l-green-400',
  failed: 'border-l-red-400',
  cancelled: 'border-l-amber-400',
  queued: 'border-l-[var(--holo-muted)]',
};

function formatRuntime(seconds?: number): string {
  if (!seconds) return '--';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

export function AgentsPanel({
  agents,
  isLoading,
  onRefresh,
  onSpawn,
  onCancel,
  onSelect,
  selectedAgentId,
}: AgentsPanelProps) {
  const [showSpawnForm, setShowSpawnForm] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [filter, setFilter] = useState<'all' | 'running' | 'completed'>('all');
  const [isSpawning, setIsSpawning] = useState(false);
  const [spawnError, setSpawnError] = useState<string | null>(null);
  const [spawnSuccess, setSpawnSuccess] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(onRefresh, 5000);
    return () => clearInterval(interval);
  }, [onRefresh]);

  const handleSpawn = async () => {
    if (!taskInput.trim()) return;
    setIsSpawning(true);
    setSpawnError(null);
    setSpawnSuccess(false);
    try {
      await onSpawn(taskInput.trim());
      setTaskInput('');
      setSpawnSuccess(true);
      // Show success briefly then close form
      setTimeout(() => {
        setShowSpawnForm(false);
        setSpawnSuccess(false);
      }, 1000);
      onRefresh();
    } catch (err) {
      setSpawnError(err instanceof Error ? err.message : 'Failed to spawn agent');
    } finally {
      setIsSpawning(false);
    }
  };

  const handleCancelWithConfirm = async (agentId: string) => {
    if (cancelConfirm !== agentId) {
      // First click - ask for confirmation
      setCancelConfirm(agentId);
      // Auto-clear confirmation after 3 seconds
      setTimeout(() => setCancelConfirm(null), 3000);
      return;
    }
    // Second click - actually cancel
    setCancelingId(agentId);
    try {
      await onCancel(agentId);
      onRefresh();
    } finally {
      setCancelingId(null);
      setCancelConfirm(null);
    }
  };

  const filteredAgents = agents?.agents.filter(agent => {
    if (filter === 'all') return true;
    if (filter === 'running') return agent.status === 'running' || agent.status === 'queued';
    if (filter === 'completed') return agent.status === 'completed' || agent.status === 'failed' || agent.status === 'cancelled';
    return true;
  }) ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--holo-border)]">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-[var(--holo-accent)]" />
          <span className="text-sm font-medium">Agents</span>
          {agents && (
            <span className="text-xs text-[var(--holo-muted)]">
              {agents.running_count} running
              {agents.queued_count > 0 && `, ${agents.queued_count} queued`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSpawnForm(!showSpawnForm)}
            className={`p-1 rounded transition-colors ${
              showSpawnForm
                ? 'bg-[var(--holo-accent)]/20 text-[var(--holo-accent)]'
                : 'hover:bg-[var(--holo-accent)]/10'
            }`}
            title="Spawn new agent"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1 rounded hover:bg-[var(--holo-accent)]/10 disabled:opacity-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Spawn form */}
      {showSpawnForm && (
        <div className={`p-2 border-b border-[var(--holo-border)] transition-colors ${
          spawnSuccess ? 'bg-green-500/10' : spawnError ? 'bg-red-500/10' : 'bg-[var(--holo-accent)]/5'
        }`}>
          <textarea
            value={taskInput}
            onChange={(e) => {
              setTaskInput(e.target.value);
              setSpawnError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.metaKey && taskInput.trim()) {
                handleSpawn();
              }
            }}
            placeholder="Enter task for the agent... (Cmd+Enter to spawn)"
            className={`w-full p-2 text-sm bg-[var(--holo-bg)] border rounded resize-none focus:outline-none transition-colors ${
              spawnError
                ? 'border-red-500 focus:border-red-500'
                : spawnSuccess
                  ? 'border-green-500 focus:border-green-500'
                  : 'border-[var(--holo-border)] focus:border-[var(--holo-accent)]'
            }`}
            rows={3}
            autoFocus
            disabled={isSpawning}
          />
          {spawnError && (
            <div className="flex items-center gap-1 mt-1 text-xs text-red-400">
              <AlertTriangle size={12} />
              {spawnError}
            </div>
          )}
          {spawnSuccess && (
            <div className="flex items-center gap-1 mt-1 text-xs text-green-400">
              <CheckCircle size={12} />
              Agent spawned successfully!
            </div>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setShowSpawnForm(false);
                setSpawnError(null);
                setSpawnSuccess(false);
              }}
              disabled={isSpawning}
              className="px-2 py-1 text-xs text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSpawn}
              disabled={!taskInput.trim() || isSpawning}
              className={`px-3 py-1 text-xs rounded transition-all flex items-center gap-1.5 ${
                isSpawning
                  ? 'bg-[var(--holo-accent)]/30 text-[var(--holo-accent)]'
                  : spawnSuccess
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-[var(--holo-accent)]/20 text-[var(--holo-accent)] hover:bg-[var(--holo-accent)]/30'
              } disabled:opacity-50`}
            >
              {isSpawning ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Spawning...
                </>
              ) : spawnSuccess ? (
                <>
                  <CheckCircle size={12} />
                  Spawned!
                </>
              ) : (
                'Spawn Agent'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex px-2 py-1 gap-1 border-b border-[var(--holo-border)]">
        {(['all', 'running', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              filter === f
                ? 'bg-[var(--holo-accent)]/20 text-[var(--holo-accent)]'
                : 'text-[var(--holo-muted)] hover:text-[var(--holo-text)]'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto">
        {!agents ? (
          <div className="p-4 text-center text-sm text-[var(--holo-muted)]">
            Loading agents...
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="p-4 text-center text-sm text-[var(--holo-muted)]">
            No agents found
          </div>
        ) : (
          <div className="divide-y divide-[var(--holo-border)]">
            {filteredAgents.map((agent) => (
              <AgentListItem
                key={agent.agent_id}
                agent={agent}
                isSelected={agent.agent_id === selectedAgentId}
                onSelect={() => onSelect(agent.agent_id)}
                onCancel={agent.status === 'running' || agent.status === 'queued'
                  ? () => handleCancelWithConfirm(agent.agent_id)
                  : undefined
                }
                isCanceling={cancelingId === agent.agent_id}
                isConfirmingCancel={cancelConfirm === agent.agent_id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface AgentListItemProps {
  agent: AgentSummary;
  isSelected: boolean;
  onSelect: () => void;
  onCancel?: () => void;
  isCanceling?: boolean;
  isConfirmingCancel?: boolean;
}

function AgentListItem({
  agent,
  isSelected,
  onSelect,
  onCancel,
  isCanceling = false,
  isConfirmingCancel = false,
}: AgentListItemProps) {
  return (
    <div
      onClick={onSelect}
      className={`
        px-3 py-2 cursor-pointer border-l-2 transition-all duration-200
        ${STATUS_COLORS[agent.status] || 'border-l-transparent'}
        ${isSelected ? 'bg-[var(--holo-accent)]/10 border-l-[var(--holo-accent)]' : 'hover:bg-[var(--holo-accent)]/5'}
        ${isCanceling ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {STATUS_ICONS[agent.status]}
          <span className="font-mono text-xs text-[var(--holo-accent)]">
            {agent.agent_id}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {agent.status === 'running' && (
            <span className="text-xs text-[var(--holo-muted)]">
              {formatRuntime(agent.runtime_seconds)}
            </span>
          )}
          {agent.status === 'queued' && agent.queue_position && (
            <span className="text-xs text-[var(--holo-muted)]">
              #{agent.queue_position}
            </span>
          )}
          {onCancel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              disabled={isCanceling}
              className={`px-1.5 py-0.5 rounded text-xs transition-all flex items-center gap-1 ${
                isCanceling
                  ? 'bg-red-500/20 text-red-400'
                  : isConfirmingCancel
                    ? 'bg-red-500/30 text-red-300 animate-pulse'
                    : 'hover:bg-red-500/20 text-red-400'
              }`}
              title={isConfirmingCancel ? 'Click again to confirm' : 'Cancel agent'}
            >
              {isCanceling ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Square size={10} />
              )}
              {isConfirmingCancel && <span>Confirm?</span>}
            </button>
          )}
        </div>
      </div>

      <div className="mt-1 text-xs text-[var(--holo-muted)] truncate">
        {agent.task_summary}
      </div>
    </div>
  );
}
