/**
 * AgentCard Component
 * Displays a single agent's streaming output with Claude Code-style formatting
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Square,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import type { AgentStreamData } from '../types';

interface AgentCardProps {
  stream: AgentStreamData;
  isSelected: boolean;
  onSelect: () => void;
  onCancel?: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

// Animated pulsing dot for running status
function PulsingDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-3.5 w-3.5">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${color}`} />
    </span>
  );
}

// Parse output to identify tool calls and their results
interface OutputSegment {
  type: 'text' | 'tool_call' | 'tool_result' | 'thinking' | 'error';
  content: string;
  toolName?: string;
  collapsed?: boolean;
}

function parseOutput(output: string): OutputSegment[] {
  const segments: OutputSegment[] = [];
  const lines = output.split('\n');
  let currentSegment: OutputSegment | null = null;

  for (const line of lines) {
    // Tool call detection patterns
    if (line.includes('Read tool') || line.includes('Reading file')) {
      if (currentSegment) segments.push(currentSegment);
      currentSegment = { type: 'tool_call', content: line, toolName: 'Read' };
    } else if (line.includes('Write tool') || line.includes('Writing file')) {
      if (currentSegment) segments.push(currentSegment);
      currentSegment = { type: 'tool_call', content: line, toolName: 'Write' };
    } else if (line.includes('Edit tool') || line.includes('Editing file')) {
      if (currentSegment) segments.push(currentSegment);
      currentSegment = { type: 'tool_call', content: line, toolName: 'Edit' };
    } else if (line.includes('Bash tool') || line.includes('Running command')) {
      if (currentSegment) segments.push(currentSegment);
      currentSegment = { type: 'tool_call', content: line, toolName: 'Bash' };
    } else if (line.includes('Glob tool') || line.includes('Searching for')) {
      if (currentSegment) segments.push(currentSegment);
      currentSegment = { type: 'tool_call', content: line, toolName: 'Glob' };
    } else if (line.includes('Grep tool') || line.includes('Searching content')) {
      if (currentSegment) segments.push(currentSegment);
      currentSegment = { type: 'tool_call', content: line, toolName: 'Grep' };
    } else if (line.includes('WebFetch') || line.includes('Fetching URL')) {
      if (currentSegment) segments.push(currentSegment);
      currentSegment = { type: 'tool_call', content: line, toolName: 'WebFetch' };
    } else if (line.startsWith('Error:') || line.includes('error')) {
      if (currentSegment) segments.push(currentSegment);
      currentSegment = { type: 'error', content: line };
    } else if (currentSegment) {
      currentSegment.content += '\n' + line;
    } else {
      currentSegment = { type: 'text', content: line };
    }
  }

  if (currentSegment) {
    segments.push(currentSegment);
  }

  return segments;
}

function formatRuntime(seconds?: number): string {
  if (!seconds) return '--';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

const STATUS_ICONS: Record<string, JSX.Element> = {
  running: <PulsingDot color="bg-blue-400" />,
  completed: <CheckCircle size={14} className="text-green-400" />,
  failed: <XCircle size={14} className="text-red-400" />,
  cancelled: <Square size={14} className="text-amber-400" />,
  queued: <Clock size={14} className="text-[var(--holo-muted)] animate-pulse" />,
};

const TOOL_COLORS: Record<string, string> = {
  Read: 'text-blue-400',
  Write: 'text-green-400',
  Edit: 'text-amber-400',
  Bash: 'text-purple-400',
  Glob: 'text-cyan-400',
  Grep: 'text-cyan-400',
  WebFetch: 'text-pink-400',
};

export function AgentCard({
  stream,
  isSelected,
  onSelect,
  onCancel,
  expanded = false,
  onToggleExpand,
}: AgentCardProps) {
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // Handle cancel with confirmation
  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onCancel) return;

    if (!cancelConfirm) {
      setCancelConfirm(true);
      // Auto-clear confirmation after 3 seconds
      setTimeout(() => setCancelConfirm(false), 3000);
      return;
    }

    setIsCanceling(true);
    try {
      await onCancel();
    } finally {
      setIsCanceling(false);
      setCancelConfirm(false);
    }
  };

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (autoScroll && outputRef.current && stream.status === 'running') {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [stream.output, autoScroll, stream.status]);

  // Detect user scroll to disable auto-scroll
  const handleScroll = () => {
    if (!outputRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = outputRef.current;
    // If user scrolled up more than 50px from bottom, disable auto-scroll
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
  };

  const segments = useMemo(() => parseOutput(stream.output), [stream.output]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(stream.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const borderColor = stream.status === 'running'
    ? 'border-blue-500/50'
    : stream.status === 'completed'
      ? 'border-green-500/30'
      : stream.status === 'failed'
        ? 'border-red-500/30'
        : stream.status === 'cancelled'
          ? 'border-amber-500/30'
          : 'border-[var(--holo-border)]';

  return (
    <div
      className={`
        rounded-lg border transition-all duration-200
        ${isSelected
          ? 'border-[var(--holo-accent)] bg-[var(--holo-accent)]/5 shadow-lg shadow-[var(--holo-accent)]/10'
          : `${borderColor} bg-[rgba(15,15,25,0.5)] hover:border-[var(--holo-accent)]/50`
        }
        ${isCanceling ? 'opacity-60' : ''}
      `}
    >
      {/* Header */}
      <div
        onClick={onSelect}
        className="flex items-center justify-between px-3 py-2 cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          {STATUS_ICONS[stream.status] || STATUS_ICONS.running}
          <span className="font-mono text-sm text-[var(--holo-accent)]">
            {stream.agent_id}
          </span>
          <span className="text-xs text-[var(--holo-muted)] truncate">
            {stream.task_summary}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {stream.status === 'running' && onCancel && (
            <button
              onClick={handleCancel}
              disabled={isCanceling}
              className={`px-1.5 py-0.5 rounded text-xs transition-all flex items-center gap-1 ${
                isCanceling
                  ? 'bg-red-500/20 text-red-400'
                  : cancelConfirm
                    ? 'bg-red-500/30 text-red-300 animate-pulse'
                    : 'hover:bg-red-500/20 text-red-400'
              }`}
              title={cancelConfirm ? 'Click again to confirm' : 'Cancel agent'}
            >
              {isCanceling ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Square size={10} />
              )}
              {cancelConfirm && <span>Confirm?</span>}
            </button>
          )}
          <button
            onClick={handleCopy}
            className={`p-1 rounded transition-all ${
              copied ? 'bg-green-500/20' : 'hover:bg-[var(--holo-accent)]/20'
            }`}
            title={copied ? 'Copied!' : 'Copy output'}
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          </button>
          {onToggleExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className={`p-1 rounded transition-all ${
                expanded ? 'bg-[var(--holo-accent)]/20 text-[var(--holo-accent)]' : 'hover:bg-[var(--holo-accent)]/20'
              }`}
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          )}
        </div>
      </div>

      {/* Output */}
      <div
        ref={outputRef}
        onScroll={handleScroll}
        className={`
          px-3 pb-3 overflow-y-auto font-mono text-xs leading-relaxed
          ${expanded ? 'max-h-[400px]' : 'max-h-[200px]'}
        `}
      >
        {segments.map((segment, i) => (
          <div key={i} className="whitespace-pre-wrap">
            {segment.type === 'tool_call' && (
              <div className="my-1">
                <span className={`font-bold ${TOOL_COLORS[segment.toolName!] || 'text-[var(--holo-accent)]'}`}>
                  [{segment.toolName}]
                </span>
                <span className="text-[var(--holo-muted)] ml-2">
                  {segment.content.split('\n')[0]}
                </span>
              </div>
            )}
            {segment.type === 'error' && (
              <div className="my-1 text-red-400 bg-red-500/10 px-2 py-1 rounded">
                {segment.content}
              </div>
            )}
            {segment.type === 'text' && (
              <span className="text-[var(--holo-text)]">{segment.content}</span>
            )}
          </div>
        ))}

        {/* Cursor indicator for running agents */}
        {stream.status === 'running' && (
          <span className="inline-block w-2 h-4 bg-[var(--holo-accent)] animate-pulse ml-1" />
        )}
      </div>

      {/* Footer */}
      {stream.started_at && (
        <div className="px-3 py-1.5 border-t border-[var(--holo-border)] text-xs text-[var(--holo-muted)] flex justify-between">
          <span>Started: {new Date(stream.started_at).toLocaleTimeString()}</span>
          {!autoScroll && stream.status === 'running' && (
            <button
              onClick={() => setAutoScroll(true)}
              className="text-[var(--holo-accent)] hover:underline"
            >
              Resume auto-scroll
            </button>
          )}
        </div>
      )}
    </div>
  );
}
