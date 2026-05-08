/**
 * FunctionLogs Component
 * Display function call history with expandable details
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Search, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useFunctionLogs } from '../../hooks/useFunctionLogs';
import type { FunctionLog } from '../../types';

export function FunctionLogs() {
  const { logs, isLoading, filter, setFilter, clear } = useFunctionLogs();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--holo-muted)]">
        Loading function logs...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--holo-border)]">
        <h2 className="text-xl font-semibold text-[var(--holo-text)]">Function Logs</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--holo-muted)]"
            />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by function..."
              className="pl-8 pr-3 py-1 text-sm bg-[var(--holo-bg-alt)] border border-[var(--holo-border)] rounded-lg text-[var(--holo-text)] placeholder:text-[var(--holo-muted)] focus:outline-none focus:border-[var(--holo-accent)]"
            />
          </div>
          <button
            onClick={clear}
            className="flex items-center gap-2 px-3 py-1 text-sm text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
          >
            <Trash2 size={14} />
            Clear
          </button>
        </div>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {logs.length === 0 ? (
          <div className="text-center text-[var(--holo-muted)] py-8">
            {filter ? 'No matching function calls.' : 'No function calls yet.'}
          </div>
        ) : (
          logs.map((log) => <FunctionLogEntry key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}

function FunctionLogEntry({ log }: { log: FunctionLog }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const time = new Date(log.timestamp).toLocaleTimeString();
  const hasResult = log.result !== undefined;
  const hasError = log.error !== undefined;

  return (
    <div className="bg-[var(--holo-bg-alt)] rounded-lg border border-[var(--holo-border)] overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-[var(--holo-bg)] transition-colors"
      >
        {isExpanded ? (
          <ChevronDown size={16} className="text-[var(--holo-muted)]" />
        ) : (
          <ChevronRight size={16} className="text-[var(--holo-muted)]" />
        )}

        <span className="font-mono text-sm text-[var(--holo-accent)]">{log.functionName}</span>

        <div className="flex items-center gap-2 ml-auto">
          {hasError ? (
            <XCircle size={14} className="text-red-400" />
          ) : hasResult ? (
            <CheckCircle size={14} className="text-green-400" />
          ) : (
            <Clock size={14} className="text-yellow-400 animate-pulse" />
          )}

          {log.durationMs !== undefined && (
            <span className="text-xs text-[var(--holo-muted)]">{log.durationMs}ms</span>
          )}

          <span className="text-xs text-[var(--holo-muted)]">{time}</span>
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-[var(--holo-border)] p-3 space-y-3">
          {/* Arguments */}
          <div>
            <div className="text-xs font-medium text-[var(--holo-muted)] uppercase tracking-wide mb-1">
              Arguments
            </div>
            <pre className="text-xs font-mono bg-[var(--holo-bg)] p-2 rounded overflow-auto max-h-32">
              {JSON.stringify(log.args, null, 2)}
            </pre>
          </div>

          {/* Result */}
          {hasResult && (
            <div>
              <div className="text-xs font-medium text-[var(--holo-muted)] uppercase tracking-wide mb-1">
                Result
              </div>
              <pre className="text-xs font-mono bg-[var(--holo-bg)] p-2 rounded overflow-auto max-h-32 text-green-400">
                {JSON.stringify(log.result, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {hasError && (
            <div>
              <div className="text-xs font-medium text-red-400 uppercase tracking-wide mb-1">
                Error
              </div>
              <pre className="text-xs font-mono bg-red-500/10 p-2 rounded overflow-auto max-h-32 text-red-400">
                {log.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
