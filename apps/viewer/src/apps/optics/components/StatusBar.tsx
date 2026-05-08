import type { Tool } from '../types';

interface StatusBarProps {
  lightCount: number;
  elementCount: number;
  selectedId: string | null;
  selectedType: 'light' | 'mirror' | 'lens' | 'prism' | null;
  tool: Tool;
  hasUnsavedChanges: boolean;
  filePath: string | null;
}

const toolHints: Record<Tool, string> = {
  select: 'Click to select, drag to move',
  light: 'Click to place light source',
  'flat-mirror': 'Click and drag to draw mirror',
  'concave-mirror': 'Click and drag to draw concave mirror',
  'convex-mirror': 'Click and drag to draw convex mirror',
  'converging-lens': 'Click to place converging lens',
  'diverging-lens': 'Click to place diverging lens',
  prism: 'Click to place prism',
};

export function StatusBar({
  lightCount,
  elementCount,
  selectedId,
  selectedType,
  tool,
  hasUnsavedChanges,
  filePath,
}: StatusBarProps) {
  return (
    <div className="px-3 py-1.5 text-xs text-[var(--holo-muted)] border-t border-[var(--holo-border)] bg-[rgba(20,20,35,0.9)] flex items-center gap-4">
      <span>Lights: {lightCount}</span>
      <span>Elements: {elementCount}</span>

      {selectedId && selectedType && (
        <span className="text-[var(--holo-accent)]">
          Selected: {selectedType}
        </span>
      )}

      {tool !== 'select' && (
        <span className="text-[var(--holo-accent)]">{toolHints[tool]}</span>
      )}

      {selectedType === 'light' && tool === 'select' && (
        <span>Arrow keys: rotate / adjust rays</span>
      )}

      <div className="flex-1" />

      {hasUnsavedChanges && (
        <span className="text-amber-300">Unsaved changes</span>
      )}

      {filePath && (
        <span className="text-[var(--holo-muted)] truncate max-w-[200px]">
          {filePath.split('/').pop()}
        </span>
      )}
    </div>
  );
}
