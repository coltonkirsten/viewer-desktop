import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { useFileWatcher } from '../../hooks/useFileWatcher';
import { useSettingsStore, ACCENT_COLORS } from '../../stores/settingsStore';
import type { AppProps } from '../types';

export function HtmlPreview({ filePath }: AppProps) {
  const { fileApi } = useAppContext();
  const { subscribeToFile } = useFileWatcher();
  const accentColor = useSettingsStore(s => s.settings.theme.accentColor);
  const accentRgb = ACCENT_COLORS[accentColor].rgb;

  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFile = useCallback(async () => {
    if (!filePath) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fileApi.readFile(filePath);
      setContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  }, [filePath, fileApi]);

  // Initial file load
  useEffect(() => {
    loadFile();
  }, [loadFile]);

  // Subscribe to file changes
  useEffect(() => {
    if (!filePath) return;

    const unsubscribe = subscribeToFile(filePath, () => {
      loadFile();
    });

    return unsubscribe;
  }, [filePath, subscribeToFile, loadFile]);

  const scrollbarStyle = useMemo(() => `<style data-viewer-scrollbar>
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: rgba(20, 20, 30, 0.5); }
::-webkit-scrollbar-thumb { background: rgba(${accentRgb}, 0.3); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgba(${accentRgb}, 0.5); }
</style>`, [accentRgb]);

  const srcDoc = useMemo(() => {
    if (content === null) return null;
    if (/<head[\s>]/i.test(content)) {
      return content.replace(/<head([\s>])/i, `<head$1${scrollbarStyle}`);
    }
    return scrollbarStyle + content;
  }, [content, scrollbarStyle]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--holo-muted)]">
        Loading...
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

  if (srcDoc === null) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--holo-border)] bg-[rgba(15,15,25,0.5)]">
        <span className="text-xs text-[var(--holo-muted)] truncate max-w-[80%]">
          {filePath}
        </span>
        <button
          onClick={loadFile}
          className="p-1 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* iframe preview */}
      <div className="flex-1">
        <iframe
          srcDoc={srcDoc}
          className="w-full h-full border-0"
          title="HTML Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
