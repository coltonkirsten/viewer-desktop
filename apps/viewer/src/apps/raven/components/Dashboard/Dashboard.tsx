/**
 * Dashboard Component
 * Raven status overview and control
 */

import { Play, Square, Camera, Monitor, EyeOff, RefreshCw } from 'lucide-react';
import type { RavenState, VisualMode } from '../../types';

interface DashboardProps {
  state: RavenState;
  onStart: (mode?: VisualMode) => Promise<void>;
  onStop: () => Promise<void>;
  onSetMode: (mode: VisualMode) => Promise<void>;
}

export function Dashboard({ state, onStart, onStop, onSetMode }: DashboardProps) {
  const isRunning = state.status === 'running';
  const isTransitioning = state.status === 'starting' || state.status === 'stopping';

  const handleStartStop = async () => {
    if (isRunning) {
      await onStop();
    } else {
      await onStart(state.visualMode);
    }
  };

  const handleModeChange = async (mode: VisualMode) => {
    await onSetMode(mode);
  };

  return (
    <div className="h-full p-6 overflow-auto">
      <h2 className="text-xl font-semibold text-[var(--holo-text)] mb-6">Dashboard</h2>

      {/* Status Card */}
      <div className="bg-[var(--holo-bg-alt)] rounded-lg border border-[var(--holo-border)] p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-[var(--holo-text)]">Status</h3>
            <p className="text-sm text-[var(--holo-muted)] mt-1">
              {state.status === 'running'
                ? `Running since ${new Date(state.startedAt || '').toLocaleTimeString()}`
                : state.status === 'error'
                ? state.error
                : `Current status: ${state.status}`}
            </p>
          </div>

          <button
            onClick={handleStartStop}
            disabled={isTransitioning}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium
              transition-colors duration-150 disabled:opacity-50
              ${
                isRunning
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              }
            `}
          >
            {isTransitioning ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : isRunning ? (
              <Square size={18} />
            ) : (
              <Play size={18} />
            )}
            {isRunning ? 'Stop' : 'Start'}
          </button>
        </div>

        {state.pid && (
          <div className="text-xs text-[var(--holo-muted)]">PID: {state.pid}</div>
        )}
      </div>

      {/* Visual Mode Card */}
      <div className="bg-[var(--holo-bg-alt)] rounded-lg border border-[var(--holo-border)] p-6 mb-6">
        <h3 className="text-lg font-medium text-[var(--holo-text)] mb-4">Visual Mode</h3>
        <p className="text-sm text-[var(--holo-muted)] mb-4">
          Choose how Raven captures visual input
        </p>

        <div className="grid grid-cols-3 gap-3">
          <ModeButton
            icon={<Camera size={24} />}
            label="Camera"
            description="Use webcam"
            mode="camera"
            currentMode={state.visualMode}
            onSelect={handleModeChange}
            disabled={isTransitioning}
          />
          <ModeButton
            icon={<Monitor size={24} />}
            label="Screen"
            description="Capture screen"
            mode="screen"
            currentMode={state.visualMode}
            onSelect={handleModeChange}
            disabled={isTransitioning}
          />
          <ModeButton
            icon={<EyeOff size={24} />}
            label="None"
            description="Voice only"
            mode="none"
            currentMode={state.visualMode}
            onSelect={handleModeChange}
            disabled={isTransitioning}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Mode" value={state.visualMode} />
        <StatCard
          title="Status"
          value={state.status}
          valueColor={state.status === 'running' ? 'text-green-400' : undefined}
        />
        <StatCard title="PID" value={state.pid?.toString() || '-'} />
      </div>
    </div>
  );
}

interface ModeButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  mode: VisualMode;
  currentMode: VisualMode;
  onSelect: (mode: VisualMode) => void;
  disabled?: boolean;
}

function ModeButton({
  icon,
  label,
  description,
  mode,
  currentMode,
  onSelect,
  disabled,
}: ModeButtonProps) {
  const isSelected = mode === currentMode;

  return (
    <button
      onClick={() => onSelect(mode)}
      disabled={disabled}
      className={`
        p-4 rounded-lg border text-center transition-colors duration-150
        disabled:opacity-50
        ${
          isSelected
            ? 'bg-[var(--holo-accent)]/20 border-[var(--holo-accent)] text-[var(--holo-accent)]'
            : 'border-[var(--holo-border)] text-[var(--holo-muted)] hover:border-[var(--holo-accent)]/50'
        }
      `}
    >
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="font-medium text-sm">{label}</div>
      <div className="text-xs opacity-60 mt-1">{description}</div>
    </button>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  valueColor?: string;
}

function StatCard({ title, value, valueColor }: StatCardProps) {
  return (
    <div className="bg-[var(--holo-bg-alt)] rounded-lg border border-[var(--holo-border)] p-4">
      <div className="text-xs text-[var(--holo-muted)] uppercase tracking-wide">{title}</div>
      <div className={`text-lg font-medium mt-1 ${valueColor || 'text-[var(--holo-text)]'}`}>
        {value}
      </div>
    </div>
  );
}
