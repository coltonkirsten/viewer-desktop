import {
  MousePointer2,
  Sun,
  Minus,
  Triangle,
  Trash2,
  RotateCcw,
  Save,
  PanelRightOpen,
  PanelRightClose,
} from 'lucide-react';
import type { Tool } from '../types';

interface ToolbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  onDelete: () => void;
  onReset: () => void;
  onSave: () => void;
  onTogglePanel: () => void;
  canDelete: boolean;
  canSave: boolean;
  panelOpen: boolean;
}

interface ToolButtonProps {
  id: Tool;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  currentTool: Tool;
  onClick: (tool: Tool) => void;
}

function ToolButton({ id, icon: Icon, label, currentTool, onClick }: ToolButtonProps) {
  const isActive = currentTool === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`p-2 rounded-lg transition-all ${
        isActive
          ? 'bg-[var(--holo-accent)] text-black'
          : 'bg-[rgba(60,60,80,0.8)] text-[var(--holo-text)] hover:bg-[rgba(80,80,100,0.8)]'
      }`}
      title={label}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

function Separator() {
  return <div className="w-px h-6 bg-[var(--holo-border)]" />;
}

// Custom icons for curved mirrors
function ConcaveMirrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 4 Q12 12, 6 20" />
      <line x1="6" y1="4" x2="4" y2="5" />
      <line x1="6" y1="8" x2="4" y2="9" />
      <line x1="6" y1="12" x2="4" y2="12" />
      <line x1="6" y1="16" x2="4" y2="15" />
      <line x1="6" y1="20" x2="4" y2="19" />
    </svg>
  );
}

function ConvexMirrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 4 Q12 12, 18 20" />
      <line x1="18" y1="4" x2="20" y2="5" />
      <line x1="18" y1="8" x2="20" y2="9" />
      <line x1="18" y1="12" x2="20" y2="12" />
      <line x1="18" y1="16" x2="20" y2="15" />
      <line x1="18" y1="20" x2="20" y2="19" />
    </svg>
  );
}

function ConvergingLensIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="12" rx="4" ry="10" />
      <line x1="12" y1="2" x2="8" y2="5" />
      <line x1="12" y1="2" x2="16" y2="5" />
      <line x1="12" y1="22" x2="8" y2="19" />
      <line x1="12" y1="22" x2="16" y2="19" />
    </svg>
  );
}

function DivergingLensIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 2 Q12 12, 8 22" />
      <path d="M16 2 Q12 12, 16 22" />
      <line x1="8" y1="2" x2="4" y2="5" />
      <line x1="8" y1="2" x2="12" y2="5" />
      <line x1="8" y1="22" x2="4" y2="19" />
      <line x1="8" y1="22" x2="12" y2="19" />
    </svg>
  );
}

export function Toolbar({
  tool,
  onToolChange,
  onDelete,
  onReset,
  onSave,
  onTogglePanel,
  canDelete,
  canSave,
  panelOpen,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 border-b border-[var(--holo-border)] bg-[rgba(20,20,35,0.9)]">
      {/* Selection */}
      <ToolButton
        id="select"
        icon={MousePointer2}
        label="Select (move elements)"
        currentTool={tool}
        onClick={onToolChange}
      />

      <Separator />

      {/* Light */}
      <ToolButton
        id="light"
        icon={Sun}
        label="Add Light Source"
        currentTool={tool}
        onClick={onToolChange}
      />

      <Separator />

      {/* Mirrors */}
      <ToolButton
        id="flat-mirror"
        icon={Minus}
        label="Draw Flat Mirror"
        currentTool={tool}
        onClick={onToolChange}
      />
      <button
        onClick={() => onToolChange('concave-mirror')}
        className={`p-2 rounded-lg transition-all ${
          tool === 'concave-mirror'
            ? 'bg-[var(--holo-accent)] text-black'
            : 'bg-[rgba(60,60,80,0.8)] text-[var(--holo-text)] hover:bg-[rgba(80,80,100,0.8)]'
        }`}
        title="Draw Concave Mirror"
      >
        <ConcaveMirrorIcon className="w-5 h-5" />
      </button>
      <button
        onClick={() => onToolChange('convex-mirror')}
        className={`p-2 rounded-lg transition-all ${
          tool === 'convex-mirror'
            ? 'bg-[var(--holo-accent)] text-black'
            : 'bg-[rgba(60,60,80,0.8)] text-[var(--holo-text)] hover:bg-[rgba(80,80,100,0.8)]'
        }`}
        title="Draw Convex Mirror"
      >
        <ConvexMirrorIcon className="w-5 h-5" />
      </button>

      <Separator />

      {/* Lenses */}
      <button
        onClick={() => onToolChange('converging-lens')}
        className={`p-2 rounded-lg transition-all ${
          tool === 'converging-lens'
            ? 'bg-[var(--holo-accent)] text-black'
            : 'bg-[rgba(60,60,80,0.8)] text-[var(--holo-text)] hover:bg-[rgba(80,80,100,0.8)]'
        }`}
        title="Add Converging Lens"
      >
        <ConvergingLensIcon className="w-5 h-5" />
      </button>
      <button
        onClick={() => onToolChange('diverging-lens')}
        className={`p-2 rounded-lg transition-all ${
          tool === 'diverging-lens'
            ? 'bg-[var(--holo-accent)] text-black'
            : 'bg-[rgba(60,60,80,0.8)] text-[var(--holo-text)] hover:bg-[rgba(80,80,100,0.8)]'
        }`}
        title="Add Diverging Lens"
      >
        <DivergingLensIcon className="w-5 h-5" />
      </button>

      <Separator />

      {/* Prism */}
      <ToolButton
        id="prism"
        icon={Triangle}
        label="Add Prism"
        currentTool={tool}
        onClick={onToolChange}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <button
        onClick={onSave}
        disabled={!canSave}
        className="p-2 rounded-lg bg-[rgba(60,60,80,0.8)] text-[var(--holo-text)] hover:bg-[var(--holo-accent)] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        title="Save (Cmd+S)"
      >
        <Save className="w-5 h-5" />
      </button>
      <button
        onClick={onDelete}
        disabled={!canDelete}
        className="p-2 rounded-lg bg-[rgba(60,60,80,0.8)] text-[var(--holo-text)] hover:bg-red-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        title="Delete Selected (Del)"
      >
        <Trash2 className="w-5 h-5" />
      </button>
      <button
        onClick={onReset}
        className="p-2 rounded-lg bg-[rgba(60,60,80,0.8)] text-[var(--holo-text)] hover:bg-[rgba(80,80,100,0.8)] transition-all"
        title="Reset Scene"
      >
        <RotateCcw className="w-5 h-5" />
      </button>

      <Separator />

      <button
        onClick={onTogglePanel}
        className="p-2 rounded-lg bg-[rgba(60,60,80,0.8)] text-[var(--holo-text)] hover:bg-[rgba(80,80,100,0.8)] transition-all"
        title={panelOpen ? 'Hide Properties Panel' : 'Show Properties Panel'}
      >
        {panelOpen ? (
          <PanelRightClose className="w-5 h-5" />
        ) : (
          <PanelRightOpen className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
