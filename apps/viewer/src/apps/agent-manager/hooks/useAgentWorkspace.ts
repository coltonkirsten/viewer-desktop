/**
 * useAgentWorkspace Hook
 * Manages loading, saving, and state tracking for agent workspace files
 */

import { useState, useCallback, useEffect } from 'react';
import type { AgentWorkspace, TaskTemplate, QueueItem, TaskExecution } from '../types';
import { validateWorkspace, isAgentWorkspaceFile } from '../utils/validation';
import { createEmptyWorkspace, generateId } from '../constants';
import { useFileWatcher } from '../../../hooks/useFileWatcher';

/**
 * Check if a file path is valid for loading (exists and is an AGENTS file)
 */
function isValidAgentFilePath(path: string | undefined): path is string {
  if (!path) return false;
  // Must be an absolute path (starts with /) or a proper AGENTS file
  return path.startsWith('/') && isAgentWorkspaceFile(path);
}

interface UseAgentWorkspaceOptions {
  filePath?: string;
  fileApi: {
    readFile: (path: string) => Promise<{ content: string }>;
    writeFile: (path: string, content: string) => Promise<void>;
  };
  setDirty: (isDirty: boolean) => void;
}

interface UseAgentWorkspaceReturn {
  workspace: AgentWorkspace | null;
  loading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  externalChangeDetected: boolean;

  // File operations
  loadWorkspace: (silent?: boolean) => Promise<void>;
  saveWorkspace: () => Promise<void>;
  dismissExternalChange: () => void;

  // Template operations
  addTemplate: (template: TaskTemplate) => void;
  updateTemplate: (templateId: string, updates: Partial<TaskTemplate>) => void;
  deleteTemplate: (templateId: string) => void;
  duplicateTemplate: (templateId: string) => void;

  // Queue operations
  addToQueue: (templateId: string, variables: Record<string, string>) => void;
  removeFromQueue: (queueItemId: string) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;

  // History operations
  addToHistory: (execution: TaskExecution) => void;
  clearHistory: () => void;

  // Direct workspace update (for complex changes)
  updateWorkspace: (updater: (ws: AgentWorkspace) => AgentWorkspace) => void;
}

export function useAgentWorkspace({
  filePath,
  fileApi,
  setDirty,
}: UseAgentWorkspaceOptions): UseAgentWorkspaceReturn {
  const [workspace, setWorkspace] = useState<AgentWorkspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [externalChangeDetected, setExternalChangeDetected] = useState(false);

  const { subscribeToFile } = useFileWatcher();

  const dedupeHistory = useCallback((ws: AgentWorkspace): AgentWorkspace => {
    if (!ws.history || ws.history.length === 0) return ws;
    const seen = new Set<string>();
    const history = ws.history.filter((e) => {
      if (!e?.id) return false;
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
    return history.length === ws.history.length ? ws : { ...ws, history };
  }, []);

  // Load workspace from file
  const loadWorkspace = useCallback(async (silent = false) => {
    // Only load if we have a valid AGENTS file path
    if (!isValidAgentFilePath(filePath)) {
      // No valid file - create empty workspace
      setWorkspace(createEmptyWorkspace('New Workspace'));
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const data = await fileApi.readFile(filePath);
      const parsed = JSON.parse(data.content);
      const validated = validateWorkspace(parsed, 'Workspace');
      setWorkspace(dedupeHistory(validated));
      setHasUnsavedChanges(false);
      setDirty(false);
      setExternalChangeDetected(false);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load workspace');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [filePath, fileApi, setDirty]);

  // Save workspace to file
  const saveWorkspace = useCallback(async () => {
    if (!filePath || !workspace) return;

    try {
      const payload = {
        ...workspace,
        updatedAt: new Date().toISOString(),
      };
      await fileApi.writeFile(filePath, JSON.stringify(payload, null, 2));
      setHasUnsavedChanges(false);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workspace');
    }
  }, [filePath, workspace, fileApi, setDirty]);

  // Mark as dirty
  const markDirty = useCallback((next: AgentWorkspace) => {
    setWorkspace(next);
    setHasUnsavedChanges(true);
    setDirty(true);
  }, [setDirty]);

  // Update workspace with a function
  const updateWorkspace = useCallback((updater: (ws: AgentWorkspace) => AgentWorkspace) => {
    if (!workspace) return;
    const next = updater(workspace);
    if (next === workspace) return;
    markDirty(next);
  }, [workspace, markDirty]);

  // Template operations
  const addTemplate = useCallback((template: TaskTemplate) => {
    updateWorkspace(ws => ({
      ...ws,
      templates: [...ws.templates, template],
    }));
  }, [updateWorkspace]);

  const updateTemplate = useCallback((templateId: string, updates: Partial<TaskTemplate>) => {
    updateWorkspace(ws => ({
      ...ws,
      templates: ws.templates.map(t =>
        t.id === templateId
          ? { ...t, ...updates, updatedAt: new Date().toISOString() }
          : t
      ),
    }));
  }, [updateWorkspace]);

  const deleteTemplate = useCallback((templateId: string) => {
    updateWorkspace(ws => ({
      ...ws,
      templates: ws.templates.filter(t => t.id !== templateId),
      // Also remove any queue items for this template
      queue: ws.queue.filter(q => q.templateId !== templateId),
    }));
  }, [updateWorkspace]);

  const duplicateTemplate = useCallback((templateId: string) => {
    if (!workspace) return;
    const template = workspace.templates.find(t => t.id === templateId);
    if (!template) return;

    const now = new Date().toISOString();
    const duplicate: TaskTemplate = {
      ...template,
      id: generateId(),
      name: `${template.name} (copy)`,
      createdAt: now,
      updatedAt: now,
    };

    addTemplate(duplicate);
  }, [workspace, addTemplate]);

  // Queue operations
  const addToQueue = useCallback((templateId: string, variables: Record<string, string>) => {
    updateWorkspace(ws => ({
      ...ws,
      queue: [
        ...ws.queue,
        {
          id: generateId(),
          templateId,
          variables,
          addedAt: new Date().toISOString(),
        },
      ],
    }));
  }, [updateWorkspace]);

  const removeFromQueue = useCallback((queueItemId: string) => {
    updateWorkspace(ws => ({
      ...ws,
      queue: ws.queue.filter(q => q.id !== queueItemId),
    }));
  }, [updateWorkspace]);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    updateWorkspace(ws => {
      const newQueue = [...ws.queue];
      const [removed] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, removed);
      return { ...ws, queue: newQueue };
    });
  }, [updateWorkspace]);

  const clearQueue = useCallback(() => {
    updateWorkspace(ws => ({ ...ws, queue: [] }));
  }, [updateWorkspace]);

  // History operations
  const addToHistory = useCallback((execution: TaskExecution) => {
    updateWorkspace(ws => {
      const existingIndex = ws.history.findIndex(e => e.id === execution.id);

      if (existingIndex === 0) {
        const existing = ws.history[0];
        const isSame =
          existing.status === execution.status &&
          existing.completedAt === execution.completedAt &&
          existing.exitCode === execution.exitCode &&
          existing.errorMessage === execution.errorMessage;
        if (isSame) return ws;
      }

      const limit = ws.historyLimit || 100;
      const without = ws.history.filter(e => e.id !== execution.id);
      const newHistory = [execution, ...without].slice(0, limit);
      return { ...ws, history: newHistory };
    });
  }, [updateWorkspace]);

  const clearHistory = useCallback(() => {
    updateWorkspace(ws => ({ ...ws, history: [] }));
  }, [updateWorkspace]);

  const dismissExternalChange = useCallback(() => {
    setExternalChangeDetected(false);
  }, []);

  // Initial load
  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  // Watch for external changes
  useEffect(() => {
    if (!isValidAgentFilePath(filePath)) return;

    const unsubscribe = subscribeToFile(filePath, () => {
      if (hasUnsavedChanges) {
        setExternalChangeDetected(true);
      } else {
        loadWorkspace(true);
      }
    });

    return unsubscribe;
  }, [filePath, subscribeToFile, hasUnsavedChanges, loadWorkspace]);

  return {
    workspace,
    loading,
    error,
    hasUnsavedChanges,
    externalChangeDetected,
    loadWorkspace,
    saveWorkspace,
    dismissExternalChange,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    addToHistory,
    clearHistory,
    updateWorkspace,
  };
}
