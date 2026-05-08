/**
 * LiveStream Component
 * Real-time streaming view of agent output with Claude Code-style formatting
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Radio,
  WifiOff,
  Wifi,
  Loader2,
  Bot,
  Trash2,
  Maximize2,
  Minimize2,
  ArrowLeft,
  FileText,
  MessageSquare,
  ArrowDownLeft,
  ArrowUpRight,
  Wrench,
  AlertCircle,
  Play,
  Square,
  Bird,
} from 'lucide-react';
import type { RavenActivityEvent } from '../hooks/useRavenStream';
import type {
  ConnectionStatus,
  StreamMessage,
  AgentStreamData,
  AgentDetail,
  ConnectionConfig,
} from '../types';
import { AgentCard } from './AgentCard';

interface LiveStreamProps {
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  config: ConnectionConfig;
  onConnect: (config: ConnectionConfig) => void;
  onDisconnect: () => void;
  agentStreams: Map<string, AgentStreamData>;
  runningAgents: Array<{ agent_id: string; task_summary: string }>;
  messages: StreamMessage[];
  ravenActivity: RavenActivityEvent[];
  onClearMessages: () => void;
  onClearRavenActivity: () => void;
  onCancelAgent?: (agentId: string) => Promise<void>;
  onConfigChange: (config: ConnectionConfig) => void;
  selectedAgentId?: string | null;
  getAgentDetails?: (agentId: string) => Promise<AgentDetail | null>;
}

type TabType = 'raven' | 'agents';

const CONNECTION_STATUS_COLORS: Record<ConnectionStatus, string> = {
  disconnected: 'text-[var(--holo-muted)]',
  connecting: 'text-amber-400',
  connected: 'text-green-400',
  error: 'text-red-400',
};

const CONNECTION_STATUS_ICONS: Record<ConnectionStatus, JSX.Element> = {
  disconnected: <WifiOff size={14} />,
  connecting: <Loader2 size={14} className="animate-spin" />,
  connected: <Wifi size={14} />,
  error: <WifiOff size={14} />,
};

// Activity item component for displaying RAVEN activity
function ActivityItem({ activity }: { activity: RavenActivityEvent }) {
  const [expanded, setExpanded] = useState(false);
  const time = new Date(activity.timestamp).toLocaleTimeString();

  const getIcon = () => {
    switch (activity.activity_type) {
      case 'message_received':
        return <ArrowDownLeft size={12} className="text-blue-400" />;
      case 'message_sent':
        return <ArrowUpRight size={12} className="text-green-400" />;
      case 'tool_call':
        return <Wrench size={12} className="text-amber-400" />;
      case 'processing_start':
        return <Play size={12} className="text-purple-400" />;
      case 'processing_end':
        return <Square size={12} className="text-purple-400" />;
      case 'error':
        return <AlertCircle size={12} className="text-red-400" />;
      case 'warning':
        return <AlertCircle size={12} className="text-amber-400" />;
      default:
        return <MessageSquare size={12} className="text-[var(--holo-muted)]" />;
    }
  };

  const getSummary = () => {
    const content = activity.content as Record<string, string>;
    switch (activity.activity_type) {
      case 'message_received':
        return `From: ${content.sender_id?.slice(-4) || '???'} - "${(content.preview || content.text || '').slice(0, 50)}..."`;
      case 'message_sent':
        return `To: ${content.recipient?.slice(-4) || '???'} - "${(content.preview || content.text || '').slice(0, 50)}..."`;
      case 'tool_call':
        return `${content.tool_name || 'Unknown tool'}(${JSON.stringify(content.args || {}).slice(0, 40)}...)`;
      case 'processing_start':
        return 'Started processing...';
      case 'processing_end':
        return `Completed (${content.duration || '?'}ms)`;
      case 'error':
        return content.message || content.error || 'Error occurred';
      case 'warning':
        return content.message || 'Warning';
      default:
        return activity.activity_type;
    }
  };

  return (
    <div
      className={`px-2 py-1.5 rounded text-xs border-l-2 cursor-pointer transition-colors ${
        activity.activity_type === 'error' ? 'border-red-400 bg-red-500/5 hover:bg-red-500/10' :
        activity.activity_type === 'warning' ? 'border-amber-400 bg-amber-500/5 hover:bg-amber-500/10' :
        activity.activity_type === 'tool_call' ? 'border-amber-400/50 bg-[rgba(15,15,25,0.5)] hover:bg-[rgba(15,15,25,0.8)]' :
        'border-[var(--holo-border)] bg-[rgba(15,15,25,0.3)] hover:bg-[rgba(15,15,25,0.5)]'
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className="text-[var(--holo-muted)] font-mono">{time}</span>
        <span className="flex-1 truncate">{getSummary()}</span>
      </div>
      {expanded && (
        <pre className="mt-2 p-2 rounded bg-[rgba(0,0,0,0.3)] text-[10px] overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(activity.content, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function LiveStream({
  connectionStatus,
  connectionError,
  config,
  onConnect,
  onDisconnect,
  agentStreams,
  runningAgents,
  messages,
  ravenActivity,
  onClearMessages,
  onClearRavenActivity,
  onCancelAgent,
  onConfigChange,
  selectedAgentId: externalSelectedAgentId,
  getAgentDetails,
}: LiveStreamProps) {
  const [activeTab, setActiveTab] = useState<TabType>('raven');
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [localSelectedAgentId, setLocalSelectedAgentId] = useState<string | null>(null);
  const [agentDetails, setAgentDetails] = useState<AgentDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const activityEndRef = useRef<HTMLDivElement>(null);

  // Use external selection or local selection
  const selectedAgentId = externalSelectedAgentId ?? localSelectedAgentId;

  // Auto-scroll to latest activity
  useEffect(() => {
    if (activityEndRef.current && activeTab === 'raven') {
      activityEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ravenActivity.length, activeTab]);

  // Fetch agent details when an agent is selected externally
  useEffect(() => {
    if (externalSelectedAgentId && getAgentDetails) {
      setLoadingDetails(true);
      getAgentDetails(externalSelectedAgentId)
        .then(setAgentDetails)
        .finally(() => setLoadingDetails(false));
    } else if (!externalSelectedAgentId) {
      setAgentDetails(null);
    }
  }, [externalSelectedAgentId, getAgentDetails]);

  // Get active streams sorted by activity
  const activeStreams = useMemo(() => {
    const streams = Array.from(agentStreams.values());
    // Sort: running first, then by output length (most active)
    return streams.sort((a, b) => {
      if (a.status === 'running' && b.status !== 'running') return -1;
      if (a.status !== 'running' && b.status === 'running') return 1;
      return b.output.length - a.output.length;
    });
  }, [agentStreams]);

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setConfirmClear(false);
    if (activeTab === 'raven') {
      onClearRavenActivity();
    } else {
      onClearMessages();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[rgba(10,10,18,0.95)]">
      {/* Header with tabs */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--holo-border)]">
        <div className="flex items-center gap-4">
          {/* Tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('raven')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
                activeTab === 'raven'
                  ? 'bg-[var(--holo-accent)]/20 text-[var(--holo-accent)]'
                  : 'text-[var(--holo-muted)] hover:text-[var(--holo-text)] hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <Bird size={14} />
              RAVEN
              {ravenActivity.length > 0 && (
                <span className="px-1 py-0.5 text-[10px] rounded bg-[var(--holo-accent)]/30">
                  {ravenActivity.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
                activeTab === 'agents'
                  ? 'bg-[var(--holo-accent)]/20 text-[var(--holo-accent)]'
                  : 'text-[var(--holo-muted)] hover:text-[var(--holo-text)] hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <Bot size={14} />
              Agents
              {activeStreams.filter(s => s.status === 'running').length > 0 && (
                <span className="px-1 py-0.5 text-[10px] rounded bg-blue-500/30">
                  {activeStreams.filter(s => s.status === 'running').length}
                </span>
              )}
            </button>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-2">
            <span className={CONNECTION_STATUS_COLORS[connectionStatus]}>
              {CONNECTION_STATUS_ICONS[connectionStatus]}
            </span>
            <span className="text-xs text-[var(--holo-muted)]">
              {config.host}:{config.port}
            </span>
            {connectionError && (
              <span className="text-xs text-red-400">{connectionError}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Clear button with confirmation */}
          <button
            onClick={handleClear}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              confirmClear
                ? 'bg-red-500/20 text-red-400 animate-pulse'
                : 'hover:bg-[var(--holo-accent)]/10 text-[var(--holo-muted)]'
            }`}
            title="Clear"
          >
            <Trash2 size={12} />
            {confirmClear ? 'Confirm?' : 'Clear'}
          </button>

          {/* Connection toggle */}
          {connectionStatus === 'connected' ? (
            <button
              onClick={onDisconnect}
              className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => onConnect(config)}
              disabled={connectionStatus === 'connecting'}
              className="px-2 py-1 text-xs bg-[var(--holo-accent)]/20 text-[var(--holo-accent)] rounded hover:bg-[var(--holo-accent)]/30 disabled:opacity-50 transition-colors"
            >
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Stream content */}
      <div className="flex-1 overflow-y-auto p-4">
        {connectionStatus !== 'connected' ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-[var(--holo-muted)]">
            <WifiOff size={48} />
            <div className="text-center">
              <p className="text-sm">Not connected to RAVEN</p>
              <p className="text-xs mt-1">Click Connect to start streaming</p>
            </div>
          </div>
        ) : activeTab === 'raven' ? (
          // RAVEN Activity tab
          ravenActivity.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-[var(--holo-muted)]">
              <Bird size={48} />
              <div className="text-center">
                <p className="text-sm">No activity yet</p>
                <p className="text-xs mt-1">RAVEN activity will stream here in real-time</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {ravenActivity.map((activity, i) => (
                <ActivityItem key={`${activity.timestamp}-${i}`} activity={activity} />
              ))}
              <div ref={activityEndRef} />
            </div>
          )
        ) : externalSelectedAgentId && agentDetails ? (
          // Show selected agent details view
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--holo-border)]">
              <FileText size={16} className="text-[var(--holo-accent)]" />
              <span className="font-mono text-sm text-[var(--holo-accent)]">
                {agentDetails.agent_id}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded ${
                agentDetails.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                agentDetails.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                agentDetails.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                agentDetails.status === 'cancelled' ? 'bg-amber-500/20 text-amber-400' :
                'bg-[var(--holo-muted)]/20 text-[var(--holo-muted)]'
              }`}>
                {agentDetails.status}
              </span>
            </div>

            <div className="mb-4">
              <div className="text-xs text-[var(--holo-muted)] mb-1">Full Task</div>
              <div className="p-3 rounded bg-[rgba(15,15,25,0.8)] border border-[var(--holo-border)] text-sm whitespace-pre-wrap">
                {agentDetails.task}
              </div>
            </div>

            {agentDetails.partial_output || agentDetails.result_preview ? (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="text-xs text-[var(--holo-muted)] mb-1">Output</div>
                <div className="flex-1 p-3 rounded bg-[rgba(15,15,25,0.8)] border border-[var(--holo-border)] text-xs font-mono overflow-y-auto whitespace-pre-wrap">
                  {agentDetails.partial_output || agentDetails.result_preview}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[var(--holo-muted)] text-sm">
                No output available yet
              </div>
            )}

            {agentDetails.started_at && (
              <div className="mt-3 pt-3 border-t border-[var(--holo-border)] text-xs text-[var(--holo-muted)] flex gap-4">
                <span>Started: {new Date(agentDetails.started_at).toLocaleString()}</span>
                {agentDetails.runtime_seconds && (
                  <span>Runtime: {agentDetails.runtime_seconds}s</span>
                )}
              </div>
            )}
          </div>
        ) : loadingDetails ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-[var(--holo-muted)]">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-sm">Loading agent details...</p>
          </div>
        ) : activeStreams.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-[var(--holo-muted)]">
            <Bot size={48} />
            <div className="text-center">
              <p className="text-sm">No active agents</p>
              <p className="text-xs mt-1">Agent output will appear here when running</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {activeStreams.map((stream) => (
              <AgentCard
                key={stream.agent_id}
                stream={stream}
                isSelected={selectedAgentId === stream.agent_id}
                onSelect={() => setLocalSelectedAgentId(
                  selectedAgentId === stream.agent_id ? null : stream.agent_id
                )}
                onCancel={
                  stream.status === 'running' && onCancelAgent
                    ? () => onCancelAgent(stream.agent_id)
                    : undefined
                }
                expanded={expandedAgent === stream.agent_id}
                onToggleExpand={() => setExpandedAgent(
                  expandedAgent === stream.agent_id ? null : stream.agent_id
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="px-4 py-1.5 border-t border-[var(--holo-border)] flex items-center justify-between text-xs text-[var(--holo-muted)]">
        <span>
          {connectionStatus === 'connected' ? (
            <>Connected to ws://{config.host}:{config.port}</>
          ) : (
            connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)
          )}
        </span>
        <span>
          {messages.length} messages
        </span>
      </div>
    </div>
  );
}
