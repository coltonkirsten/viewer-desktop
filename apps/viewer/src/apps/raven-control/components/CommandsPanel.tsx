/**
 * CommandsPanel - Controls for RAVEN slash commands
 * Model selector, restart, clear context
 */

import { useState } from 'react';
import {
  Settings2,
  RefreshCw,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useRavenCommands } from '../hooks/useRavenCommands';
import type { ConnectionConfig } from '../types';

interface CommandsPanelProps {
  config: ConnectionConfig;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

type Model = 'haiku' | 'sonnet' | 'opus';

const MODELS: { value: Model; label: string; desc: string }[] = [
  { value: 'haiku', label: 'Haiku', desc: 'Fast & cheap' },
  { value: 'sonnet', label: 'Sonnet', desc: 'Balanced' },
  { value: 'opus', label: 'Opus', desc: 'Most capable' },
];

export function CommandsPanel({
  config,
  collapsed = false,
  onToggleCollapse,
}: CommandsPanelProps) {
  const commands = useRavenCommands(config);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Handle restart with confirmation
  const handleRestart = async () => {
    if (!confirmRestart) {
      setConfirmRestart(true);
      setTimeout(() => setConfirmRestart(false), 3000);
      return;
    }
    setConfirmRestart(false);
    await commands.restart();
  };

  // Handle clear with confirmation
  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setConfirmClear(false);
    await commands.clearContext();
  };

  return (
    <div className="border-b border-[var(--holo-border)]">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[rgba(255,255,255,0.02)]"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          {collapsed ? (
            <ChevronRight size={14} className="text-[var(--holo-muted)]" />
          ) : (
            <ChevronDown size={14} className="text-[var(--holo-muted)]" />
          )}
          <Settings2 size={14} className="text-[var(--holo-accent)]" />
          <span>Commands</span>
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="px-3 pb-3 space-y-3">
          {/* Feedback message */}
          {commands.feedback.type && (
            <div
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                commands.feedback.type === 'success'
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              {commands.feedback.type === 'success' ? (
                <Check size={12} />
              ) : (
                <AlertCircle size={12} />
              )}
              {commands.feedback.message}
            </div>
          )}

          {/* Model Selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--holo-muted)] uppercase tracking-wide">
              Model
            </label>
            <div className="flex gap-1">
              {MODELS.map((model) => (
                <button
                  key={model.value}
                  onClick={() => commands.setModel(model.value)}
                  disabled={commands.loading.model}
                  className={`
                    flex-1 px-2 py-1.5 text-xs rounded transition-all
                    ${
                      commands.currentModel === model.value
                        ? 'bg-[var(--holo-accent)]/20 text-[var(--holo-accent)] border border-[var(--holo-accent)]/50'
                        : 'bg-[rgba(255,255,255,0.03)] text-[var(--holo-muted)] border border-transparent hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--holo-text)]'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  title={model.desc}
                >
                  {commands.loading.model && commands.currentModel === model.value ? (
                    <Loader2 size={12} className="animate-spin mx-auto" />
                  ) : (
                    model.label
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {/* Clear Context */}
            <button
              onClick={handleClear}
              disabled={commands.loading.clear}
              className={`
                flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded transition-all
                ${
                  confirmClear
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 animate-pulse'
                    : 'bg-[rgba(255,255,255,0.03)] text-[var(--holo-muted)] border border-transparent hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--holo-text)]'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {commands.loading.clear ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Trash2 size={12} />
              )}
              {confirmClear ? 'Confirm?' : 'Clear'}
            </button>

            {/* Restart */}
            <button
              onClick={handleRestart}
              disabled={commands.loading.restart}
              className={`
                flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded transition-all
                ${
                  confirmRestart
                    ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
                    : 'bg-[rgba(255,255,255,0.03)] text-[var(--holo-muted)] border border-transparent hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--holo-text)]'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {commands.loading.restart ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              {confirmRestart ? 'Confirm?' : 'Restart'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
