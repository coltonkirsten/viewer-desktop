import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../AppContext';
import { useFileWatcher } from '../../hooks/useFileWatcher';
import { CodeEditor } from '../../components/common/CodeEditor';
import type { AppProps } from '../types';

export function JsonViewer({ filePath, isActive }: AppProps) {
  const { fileApi, setDirty } = useAppContext();
  const { subscribeToFile } = useFileWatcher();

  const [content, setContent] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [externalChangeDetected, setExternalChangeDetected] = useState(false);

  const loadFile = useCallback(async (isReload = false) => {
    if (!filePath) return;

    if (!isReload) {
      setLoading(true);
    }
    setError(null);
    setExternalChangeDetected(false);

    try {
      const data = await fileApi.readFile(filePath);
      setContent(data.content);
      setEditContent(data.content);
      setHasUnsavedChanges(false);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  }, [filePath, fileApi, setDirty]);

  // Initial file load
  useEffect(() => {
    loadFile();
  }, [loadFile]);

  // Subscribe to file changes
  useEffect(() => {
    if (!filePath) return;

    const unsubscribe = subscribeToFile(filePath, () => {
      if (isEditing && hasUnsavedChanges) {
        setExternalChangeDetected(true);
      } else {
        loadFile(true);
      }
    });

    return unsubscribe;
  }, [filePath, subscribeToFile, isEditing, hasUnsavedChanges, loadFile]);

  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges || !filePath) return;

    setSaving(true);
    try {
      await fileApi.writeFile(filePath, editContent);
      setContent(editContent);
      setHasUnsavedChanges(false);
      setDirty(false);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }, [filePath, editContent, hasUnsavedChanges, fileApi, setDirty]);

  const handleContentChange = useCallback((value: string) => {
    setEditContent(value);
    const changed = value !== content;
    setHasUnsavedChanges(changed);
    setDirty(changed);
  }, [content, setDirty]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isEditing && hasUnsavedChanges) {
          handleSave();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setIsEditing(!isEditing);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isEditing, hasUnsavedChanges, handleSave]);

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

  if (content === null) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* External change notification */}
      {externalChangeDetected && (
        <div className="flex items-center justify-between px-3 py-2 bg-amber-500/20 border-b border-amber-500/50">
          <span className="text-xs text-amber-300">
            This file has been modified externally
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadFile(true)}
              className="px-2 py-0.5 text-xs bg-amber-500 text-black rounded hover:bg-amber-400 transition-colors"
            >
              Reload
            </button>
            <button
              onClick={() => setExternalChangeDetected(false)}
              className="px-2 py-0.5 text-xs text-amber-300 hover:text-amber-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--holo-border)] bg-[rgba(15,15,25,0.5)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(false)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              !isEditing
                ? 'bg-[var(--holo-accent)]/30 text-[var(--holo-accent)]'
                : 'text-[var(--holo-muted)] hover:text-[var(--holo-text)]'
            }`}
          >
            View
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              isEditing
                ? 'bg-[var(--holo-accent)]/30 text-[var(--holo-accent)]'
                : 'text-[var(--holo-muted)] hover:text-[var(--holo-text)]'
            }`}
          >
            Edit
          </button>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-400">Unsaved</span>
          )}
          {saving && (
            <span className="text-xs text-[var(--holo-muted)]">Saving...</span>
          )}
          {isEditing && (
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saving}
              className="px-2 py-0.5 text-xs bg-[var(--holo-accent)] rounded hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              Save
            </button>
          )}
        </div>
      </div>

      {/* Editor with JSON language */}
      <div className="flex-1 overflow-hidden">
        <CodeEditor
          filePath={filePath || ''}
          value={isEditing ? editContent : content}
          onChange={isEditing ? (value) => handleContentChange(value || '') : undefined}
          readOnly={!isEditing}
        />
      </div>
    </div>
  );
}
