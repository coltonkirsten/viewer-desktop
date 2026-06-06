import { useState, useEffect, useCallback } from 'react';
import { Eye, Code, RefreshCw } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { useFileWatcher } from '../../hooks/useFileWatcher';
import type { AppProps } from '../types';
import { parseLatex } from './latexParser';
import 'katex/dist/katex.min.css';

type ViewMode = 'preview' | 'source' | 'split';

export function LatexViewer({ filePath, isActive }: AppProps) {
  const { fileApi } = useAppContext();
  const { subscribeToFile } = useFileWatcher();

  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [externalChangeDetected, setExternalChangeDetected] = useState(false);

  const loadFile = useCallback(async () => {
    if (!filePath) return;

    setLoading(true);
    setError(null);
    setExternalChangeDetected(false);

    try {
      const data = await fileApi.readFile(filePath);
      setContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  }, [filePath, fileApi]);

  useEffect(() => {
    loadFile();
  }, [loadFile]);

  // Watch for external file changes
  useEffect(() => {
    if (!filePath) return;
    const unsubscribe = subscribeToFile(filePath, () => {
      if (isActive) {
        setExternalChangeDetected(true);
      }
    });
    return unsubscribe;
  }, [filePath, isActive, subscribeToFile]);

  const handleReload = () => {
    loadFile();
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setViewMode((mode) => {
          if (mode === 'preview') return 'source';
          if (mode === 'source') return 'split';
          return 'preview';
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--holo-muted)]">
        Loading LaTeX document...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        {error}
      </div>
    );
  }

  const fileName = filePath?.split('/').pop() || 'LaTeX';

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--holo-border)] bg-[rgba(15,15,25,0.5)]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--holo-muted)] truncate max-w-[200px]">
            {fileName}
          </span>
          {externalChangeDetected && (
            <button
              onClick={handleReload}
              className="flex items-center gap-1 px-2 py-0.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-400/10 rounded"
            >
              <RefreshCw className="w-3 h-3" />
              File changed - reload
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('preview')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'preview'
                ? 'bg-[var(--holo-accent)] text-white'
                : 'text-[var(--holo-muted)] hover:text-[var(--holo-text)]'
            }`}
            title="Preview (Cmd+E to cycle)"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('source')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'source'
                ? 'bg-[var(--holo-accent)] text-white'
                : 'text-[var(--holo-muted)] hover:text-[var(--holo-text)]'
            }`}
            title="Source"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              viewMode === 'split'
                ? 'bg-[var(--holo-accent)] text-white'
                : 'text-[var(--holo-muted)] hover:text-[var(--holo-text)]'
            }`}
            title="Split view"
          >
            Split
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Source view */}
        {(viewMode === 'source' || viewMode === 'split') && (
          <div
            className={`${
              viewMode === 'split' ? 'w-1/2 border-r border-[var(--holo-border)]' : 'w-full'
            } overflow-auto`}
          >
            <pre className="p-4 text-sm font-mono text-[var(--holo-text)] leading-relaxed whitespace-pre-wrap">
              {content}
            </pre>
          </div>
        )}

        {/* Preview view */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className={`${
              viewMode === 'split' ? 'w-1/2' : 'w-full'
            } overflow-auto bg-[rgba(255,255,255,0.02)]`}
          >
            <div className="max-w-3xl mx-auto p-8 text-[var(--holo-text)]">
              {parseLatex(content)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
