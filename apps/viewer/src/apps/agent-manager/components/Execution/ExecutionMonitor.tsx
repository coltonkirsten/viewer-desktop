/**
 * ExecutionMonitor Component
 * Shows live execution status with embedded terminal for interactive mode
 */

import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import {
  XCircle,
  CheckCircle,
  Loader2,
  Clock,
  Terminal,
  AlertTriangle,
  Copy,
  ChevronDown,
  ChevronRight,
  Pause,
} from 'lucide-react';
import { useState } from 'react';
import type { TaskExecution, CommandResult } from '../../types';
import { useTaskOutput } from '../../hooks/useAgentExecutionDaemon';

interface ExecutionMonitorProps {
  execution: TaskExecution;
  isActive: boolean;
  onCancel?: () => void;
  onMarkComplete?: (status: 'completed' | 'failed') => void;
}

// Status badge component
function StatusBadge({ status, isIdle = false }: { status: TaskExecution['status']; isIdle?: boolean }) {
  // If running-main and idle, show "Idle" status
  if (status === 'running-main' && isIdle) {
    return (
      <div className="flex items-center gap-2 text-blue-400">
        <Pause size={16} />
        <span className="text-sm font-medium">Idle</span>
      </div>
    );
  }

  const config = {
    pending: { icon: Clock, color: 'text-gray-400', label: 'Pending' },
    'running-pre': { icon: Loader2, color: 'text-amber-400', label: 'Running pre-commands', spin: true },
    'running-main': { icon: Loader2, color: 'text-[var(--holo-accent)]', label: 'Running', spin: true },
    'running-post': { icon: Loader2, color: 'text-amber-400', label: 'Running post-commands', spin: true },
    completed: { icon: CheckCircle, color: 'text-green-400', label: 'Completed' },
    failed: { icon: XCircle, color: 'text-red-400', label: 'Failed' },
    cancelled: { icon: AlertTriangle, color: 'text-amber-400', label: 'Cancelled' },
  };

  const { icon: Icon, color, label, spin } = config[status] || config.pending;

  return (
    <div className={`flex items-center gap-2 ${color}`}>
      <Icon size={16} className={spin ? 'animate-spin' : ''} />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

// Command result display
function CommandResultView({ result, type }: { result: CommandResult; type: 'pre' | 'post' }) {
  const [expanded, setExpanded] = useState(false);
  const success = result.exitCode === 0;

  return (
    <div className="border border-[var(--holo-border)] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-2 bg-[rgba(20,20,30,0.5)] hover:bg-[rgba(30,30,40,0.5)] transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="text-xs font-mono">{result.command}</span>
        </div>
        <div className={`flex items-center gap-1 text-xs ${success ? 'text-green-400' : 'text-red-400'}`}>
          {success ? <CheckCircle size={12} /> : <XCircle size={12} />}
          Exit: {result.exitCode}
        </div>
      </button>
      {expanded && result.output && (
        <div className="p-2 bg-[rgba(10,10,15,0.5)] max-h-32 overflow-y-auto">
          <pre className="text-xs font-mono text-[var(--holo-muted)] whitespace-pre-wrap">
            {result.output}
          </pre>
        </div>
      )}
    </div>
  );
}

export function ExecutionMonitor({
  execution,
  isActive,
  onCancel,
  onMarkComplete,
}: ExecutionMonitorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const isInitializedRef = useRef(false);
  const [showDetails, setShowDetails] = useState(false);

  // For daemon-based tasks (no terminalSessionId), get live output via hook
  const hasTerminalSession = !!execution.terminalSessionId;
  const daemonOutput = useTaskOutput(hasTerminalSession ? null : execution.id);

  // Use daemon output if available, otherwise fall back to execution.claudeOutput
  const displayOutput = hasTerminalSession ? execution.claudeOutput : (daemonOutput || execution.claudeOutput);

  // Terminal data handler
  const handleTerminalData = useCallback((event: { sessionId: string; data: string }) => {
    if (event.sessionId === execution.terminalSessionId && terminalRef.current) {
      terminalRef.current.write(event.data);
    }
  }, [execution.terminalSessionId]);

  // Terminal exit handler
  const handleTerminalExit = useCallback((event: { sessionId: string; exitCode: number }) => {
    if (event.sessionId === execution.terminalSessionId && terminalRef.current) {
      terminalRef.current.write(`\r\n\x1b[90m[Process exited with code ${event.exitCode}]\x1b[0m\r\n`);
    }
  }, [execution.terminalSessionId]);

  // Initialize terminal when we have a session ID
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current || !execution.terminalSessionId) return;

    const terminal = new XTerm({
      theme: {
        background: '#0a0a0f',
        foreground: '#e0e0e0',
        cursor: '#00ffff',
        cursorAccent: '#0a0a0f',
        selectionBackground: 'rgba(0, 255, 255, 0.3)',
        selectionForeground: '#ffffff',
        black: '#000000',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#bd93f9',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#f8f8f2',
        brightBlack: '#6272a4',
        brightRed: '#ff6e6e',
        brightGreen: '#69ff94',
        brightYellow: '#ffffa5',
        brightBlue: '#d6acff',
        brightMagenta: '#ff92df',
        brightCyan: '#a4ffff',
        brightWhite: '#ffffff',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      cursorBlink: true,
      cursorStyle: 'block',
      allowTransparency: true,
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(containerRef.current);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    isInitializedRef.current = true;

    // Restore previous output if available (when switching back to this execution)
    if (execution.claudeOutput) {
      terminal.write(execution.claudeOutput);
    }

    // Fit after a frame
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
        if (execution.terminalSessionId) {
          window.electron.terminal.resize(execution.terminalSessionId, terminal.cols, terminal.rows);
        }
      } catch (e) {
        console.error('Failed to fit terminal:', e);
      }
    });

    // Handle user input
    terminal.onData((data) => {
      if (execution.terminalSessionId) {
        window.electron.terminal.write(execution.terminalSessionId, data);
      }
    });

    // Handle resize
    terminal.onResize(({ cols, rows }) => {
      if (execution.terminalSessionId) {
        window.electron.terminal.resize(execution.terminalSessionId, cols, rows);
      }
    });

    // Subscribe to events
    const unsubscribeData = window.electron.terminal.onData(handleTerminalData);
    const unsubscribeExit = window.electron.terminal.onExit(handleTerminalExit);

    return () => {
      unsubscribeData();
      unsubscribeExit();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      isInitializedRef.current = false;
    };
  }, [execution.terminalSessionId, handleTerminalData, handleTerminalExit]);

  // Handle resize
  useEffect(() => {
    if (!containerRef.current || !fitAddonRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && terminalRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch (e) {
          // Ignore
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Focus terminal when active
  useEffect(() => {
    if (isActive && terminalRef.current) {
      terminalRef.current.focus();
    }
  }, [isActive]);

  // Copy output to clipboard
  const copyOutput = useCallback(() => {
    if (displayOutput) {
      navigator.clipboard.writeText(displayOutput);
    }
  }, [displayOutput]);

  const isRunning = execution.status.startsWith('running');
  const hasTerminal = !!execution.terminalSessionId;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--holo-border)] bg-[rgba(15,15,25,0.5)]">
        <div className="flex items-center gap-4">
          <StatusBadge status={execution.status} isIdle={execution.isIdle ?? false} />
          <span className="text-sm text-[var(--holo-muted)]">
            {execution.templateName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {displayOutput && (
            <button
              onClick={copyOutput}
              className="p-2 rounded hover:bg-[var(--holo-accent)]/20 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
              title="Copy output"
            >
              <Copy size={16} />
            </button>
          )}
          {isRunning && onMarkComplete && (
            <>
              <button
                onClick={() => onMarkComplete('completed')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
              >
                <CheckCircle size={14} />
                Mark Complete
              </button>
              <button
                onClick={() => onMarkComplete('failed')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
              >
                <XCircle size={14} />
                Mark Failed
              </button>
            </>
          )}
          {isRunning && onCancel && (
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <XCircle size={14} />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Info bar */}
      <div className="px-4 py-2 border-b border-[var(--holo-border)] bg-[rgba(10,10,15,0.3)]">
        <div className="flex items-center justify-between text-xs text-[var(--holo-muted)]">
          <div className="flex items-center gap-4">
            <span>Started: {new Date(execution.startedAt).toLocaleTimeString()}</span>
            {execution.completedAt && (
              <span>Completed: {new Date(execution.completedAt).toLocaleTimeString()}</span>
            )}
            {execution.exitCode !== undefined && (
              <span className={execution.exitCode === 0 ? 'text-green-400' : 'text-red-400'}>
                Exit code: {execution.exitCode}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 hover:text-[var(--holo-text)]"
          >
            {showDetails ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Details
          </button>
        </div>
      </div>

      {/* Details panel */}
      {showDetails && (
        <div className="border-b border-[var(--holo-border)] bg-[rgba(10,10,15,0.3)] p-4 space-y-4 max-h-64 overflow-y-auto">
          {/* Command */}
          <div>
            <div className="text-xs text-[var(--holo-muted)] mb-1">Command:</div>
            <code className="text-xs font-mono text-[var(--holo-text)] bg-[rgba(20,20,30,0.5)] px-2 py-1 rounded block overflow-x-auto">
              {execution.fullCommand}
            </code>
          </div>

          {/* Resolved prompt */}
          <div>
            <div className="text-xs text-[var(--holo-muted)] mb-1">Prompt:</div>
            <div className="text-xs text-[var(--holo-text)] bg-[rgba(20,20,30,0.5)] p-2 rounded whitespace-pre-wrap max-h-24 overflow-y-auto">
              {execution.resolvedPrompt}
            </div>
          </div>

          {/* Variables */}
          {Object.keys(execution.resolvedVariables).length > 0 && (
            <div>
              <div className="text-xs text-[var(--holo-muted)] mb-1">Variables:</div>
              <div className="text-xs space-y-1">
                {Object.entries(execution.resolvedVariables).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-[var(--holo-accent)]">{key}:</span>
                    <span className="text-[var(--holo-text)]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pre-command results */}
          {execution.preCommandResults.length > 0 && (
            <div>
              <div className="text-xs text-[var(--holo-muted)] mb-2">Pre-commands:</div>
              <div className="space-y-2">
                {execution.preCommandResults.map((result) => (
                  <CommandResultView key={result.commandId} result={result} type="pre" />
                ))}
              </div>
            </div>
          )}

          {/* Post-command results */}
          {execution.postCommandResults.length > 0 && (
            <div>
              <div className="text-xs text-[var(--holo-muted)] mb-2">Post-commands:</div>
              <div className="space-y-2">
                {execution.postCommandResults.map((result) => (
                  <CommandResultView key={result.commandId} result={result} type="post" />
                ))}
              </div>
            </div>
          )}

          {/* Error message */}
          {execution.errorMessage && (
            <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              {execution.errorMessage}
            </div>
          )}
        </div>
      )}

      {/* Terminal or output display */}
      <div className="flex-1 overflow-hidden">
        {hasTerminal ? (
          <div ref={containerRef} className="h-full w-full bg-[#0a0a0f] p-1" />
        ) : displayOutput ? (
          <div className="h-full overflow-y-auto p-4 bg-[#0a0a0f]">
            <pre className="text-sm font-mono text-[var(--holo-text)] whitespace-pre-wrap">
              {displayOutput}
            </pre>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-[var(--holo-muted)]">
            <Terminal size={48} />
            <p className="text-sm">
              {isRunning ? 'Waiting for output...' : 'No output available'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
