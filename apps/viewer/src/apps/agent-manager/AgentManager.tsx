/**
 * Agent Manager App
 * Main component for managing Claude Code CLI agents
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Bot,
  Plus,
  Play,
  Save,
  FolderOpen,
  AlertCircle,
  RefreshCw,
  Trash2,
  ListTodo,
  History,
  ChevronRight,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Pause,
  Server,
  ServerOff,
} from 'lucide-react';
import type { AppProps } from '../types';
import { useAppContext } from '../AppContext';
import { useAgentWorkspace } from './hooks/useAgentWorkspace';
import { useAgentExecutionDaemon } from './hooks/useAgentExecutionDaemon';
import { useDaemonStatus } from './hooks/useDaemonStatus';
import type { TaskTemplate, TaskExecution, QueueItem } from './types';
import { createEmptyTemplate, TEMPLATE_ICONS } from './constants';
import { TaskTemplateEditor } from './components/Editor/TaskTemplateEditor';
import { VariableInputDialog } from './components/Dialogs/VariableInputDialog';
import { ExecutionMonitor } from './components/Execution/ExecutionMonitor';
import { useSound } from '../../hooks/useSound';
import * as LucideIcons from 'lucide-react';

// Dynamic icon component
function DynamicIcon({ name, size = 16, className = '' }: { name: string; size?: number; className?: string }) {
  const Icon = (LucideIcons as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
  if (!Icon) return <Bot size={size} className={className} />;
  return <Icon size={size} className={className} />;
}

export function AgentManager({ filePath, isActive }: AppProps) {
  const { fileApi, setDirty, openFile } = useAppContext();
  const { playEvent, playSound } = useSound();

  // Main workspace state
  const {
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
  } = useAgentWorkspace({ filePath, fileApi, setDirty });

  // Daemon status
  const { isConnected: isDaemonConnected, isChecking: isDaemonChecking, runningCount } = useDaemonStatus();

  // Execution state (using daemon)
  const {
    activeExecutions,
    executeTask,
    cancelExecution,
    markComplete,
    isLoading: isExecutionLoading,
    refreshTasks,
  } = useAgentExecutionDaemon({
    onExecutionComplete: (execution) => {
      addToHistory(execution);
      if (execution.status === 'completed') {
        playSound('chime-success');
      } else {
        playSound('blip-low');
      }
    },
  });

  // UI state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [showVariableDialog, setShowVariableDialog] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [isQueueExpanded, setIsQueueExpanded] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [mainPanelMode, setMainPanelMode] = useState<'editor' | 'execution'>('editor');

  // Get selected template
  const selectedTemplate = workspace?.templates.find(t => t.id === selectedTemplateId) || null;

  // Get selected execution from active or history
  const selectedExecution =
    activeExecutions.find(e => e.id === selectedExecutionId) ||
    workspace?.history.find(e => e.id === selectedExecutionId) ||
    null;

  // Handle template selection
  const handleSelectTemplate = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
    setSelectedExecutionId(null);
    setMainPanelMode('editor');
    playEvent('file:select');
  }, [playEvent]);

  // Handle execution selection
  const handleSelectExecution = useCallback((executionId: string) => {
    setSelectedExecutionId(executionId);
    setSelectedTemplateId(null);
    setMainPanelMode('execution');
    playEvent('file:select');
  }, [playEvent]);

  // Handle add new template
  const handleAddTemplate = useCallback(() => {
    const newTemplate = createEmptyTemplate();
    addTemplate(newTemplate);
    setSelectedTemplateId(newTemplate.id);
    setMainPanelMode('editor');
    playEvent('dialog:open');
  }, [addTemplate, playEvent]);

  // Handle run task
  const handleRunTask = useCallback((templateId: string) => {
    const template = workspace?.templates.find(t => t.id === templateId);
    if (!template) return;

    // Check if template has required variables
    const hasRequiredVariables = template.variables.some(v => v.required);

    if (hasRequiredVariables) {
      setPendingTemplateId(templateId);
      setShowVariableDialog(true);
    } else {
      // Execute directly with default variables
      const defaultVars: Record<string, string> = {};
      for (const v of template.variables) {
        if (v.defaultValue) {
          defaultVars[v.name] = v.defaultValue;
        }
      }
      executeTask(template, defaultVars).then((execution) => {
        setSelectedExecutionId(execution.id);
        setMainPanelMode('execution');
        playEvent('shortcut:activate');
      });
    }
  }, [workspace, executeTask, playEvent]);

  // Handle variable dialog submit
  const handleVariableSubmit = useCallback((variables: Record<string, string>, addToQueueInstead: boolean) => {
    if (!pendingTemplateId) return;
    const template = workspace?.templates.find(t => t.id === pendingTemplateId);
    if (!template) return;

    if (addToQueueInstead) {
      addToQueue(pendingTemplateId, variables);
      playSound('blip-double');
      setShowVariableDialog(false);
      setPendingTemplateId(null);
    } else {
      executeTask(template, variables).then((execution) => {
        setSelectedExecutionId(execution.id);
        setMainPanelMode('execution');
        playEvent('shortcut:activate');
        setShowVariableDialog(false);
        setPendingTemplateId(null);
      });
    }
  }, [pendingTemplateId, workspace, executeTask, addToQueue, playEvent, playSound]);

  // Handle run from queue
  const handleRunFromQueue = useCallback((queueItem: QueueItem) => {
    const template = workspace?.templates.find(t => t.id === queueItem.templateId);
    if (!template) return;

    removeFromQueue(queueItem.id);
    executeTask(template, queueItem.variables).then((execution) => {
      setSelectedExecutionId(execution.id);
      setMainPanelMode('execution');
      playEvent('shortcut:activate');
    });
  }, [workspace, removeFromQueue, executeTask, playEvent]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges) {
          saveWorkspace();
          playSound('chime-up');
        }
      }

      // Cmd/Ctrl + N to add new template
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleAddTemplate();
      }

      // Cmd/Ctrl + Enter to run selected task
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (selectedTemplateId) {
          handleRunTask(selectedTemplateId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, hasUnsavedChanges, saveWorkspace, handleAddTemplate, selectedTemplateId, handleRunTask, playSound]);

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--holo-bg)] text-[var(--holo-muted)]">
        <Loader2 size={24} className="animate-spin mr-2" />
        Loading workspace...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 bg-[var(--holo-bg)]">
        <AlertCircle size={48} className="text-red-400" />
        <div className="text-center">
          <h3 className="text-lg font-medium text-red-400 mb-1">Error loading workspace</h3>
          <p className="text-sm text-[var(--holo-muted)]">{error}</p>
        </div>
        <button
          onClick={() => loadWorkspace()}
          className="px-4 py-2 rounded bg-[var(--holo-accent)]/20 text-[var(--holo-accent)] hover:bg-[var(--holo-accent)]/30 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // No workspace state (show file picker prompt)
  if (!workspace) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 bg-[var(--holo-bg)]">
        <Bot size={64} className="text-[var(--holo-accent)]" />
        <div className="text-center">
          <h2 className="text-xl font-medium text-[var(--holo-text)] mb-2">Agent Manager</h2>
          <p className="text-sm text-[var(--holo-muted)]">Open or create an AGENTS_*.json workspace file</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              // Trigger file open dialog
              // This would typically be handled by the viewer's file picker
            }}
            className="flex items-center gap-2 px-4 py-2 rounded bg-[var(--holo-accent)]/20 text-[var(--holo-accent)] hover:bg-[var(--holo-accent)]/30 transition-colors"
          >
            <FolderOpen size={16} />
            Open Workspace
          </button>
        </div>
      </div>
    );
  }

  const pendingTemplate = workspace.templates.find(t => t.id === pendingTemplateId);

  return (
    <div className="h-full flex flex-col bg-[var(--holo-bg)] text-[var(--holo-text)]">
      {/* External change warning */}
      {externalChangeDetected && (
        <div className="flex items-center justify-between px-3 py-2 bg-amber-500/20 border-b border-amber-500/50">
          <span className="text-xs text-amber-300">Workspace was modified externally</span>
          <div className="flex gap-2">
            <button
              onClick={() => loadWorkspace()}
              className="px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
            >
              Reload
            </button>
            <button
              onClick={dismissExternalChange}
              className="px-2 py-0.5 text-xs text-amber-300/70 hover:text-amber-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--holo-border)] bg-[rgba(15,15,25,0.5)]">
        <div className="flex items-center gap-3">
          {/* Daemon status indicator */}
          <div
            className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded ${
              isDaemonChecking
                ? 'bg-yellow-500/20 text-yellow-400'
                : isDaemonConnected
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
            title={
              isDaemonChecking
                ? 'Connecting to daemon...'
                : isDaemonConnected
                ? `Daemon connected${runningCount > 0 ? ` (${runningCount} running)` : ''}`
                : 'Daemon disconnected'
            }
          >
            {isDaemonChecking ? (
              <Loader2 size={12} className="animate-spin" />
            ) : isDaemonConnected ? (
              <Server size={12} />
            ) : (
              <ServerOff size={12} />
            )}
            <span className="hidden sm:inline">
              {isDaemonChecking ? 'Connecting...' : isDaemonConnected ? 'Daemon' : 'Offline'}
            </span>
            {isDaemonConnected && runningCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-green-500/30">
                {runningCount}
              </span>
            )}
          </div>

          <button
            onClick={handleAddTemplate}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-[var(--holo-accent)]/20 text-[var(--holo-accent)] hover:bg-[var(--holo-accent)]/30 transition-colors"
          >
            <Plus size={14} />
            New Task
          </button>
          {selectedTemplateId && (
            <button
              onClick={() => handleRunTask(selectedTemplateId)}
              disabled={!isDaemonConnected}
              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play size={14} />
              Run
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--holo-muted)]">
            {workspace.name}
          </span>
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-400">Unsaved</span>
          )}
          <button
            onClick={saveWorkspace}
            disabled={!hasUnsavedChanges}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-[var(--holo-accent)]/20 text-[var(--holo-accent)] hover:bg-[var(--holo-accent)]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={14} />
            Save
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-[var(--holo-border)] flex flex-col overflow-hidden">
          {/* Templates section */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2">
              <div className="text-xs font-semibold text-[var(--holo-muted)] uppercase tracking-wider mb-2 px-2">
                Templates
              </div>
              <div className="space-y-1">
                {workspace.templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleSelectTemplate(template.id)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                      selectedTemplateId === template.id
                        ? 'bg-[var(--holo-accent)]/20 border-l-2 border-[var(--holo-accent)]'
                        : 'hover:bg-[var(--holo-accent)]/10'
                    }`}
                  >
                    <DynamicIcon
                      name={template.icon || 'Sparkles'}
                      size={14}
                      className={selectedTemplateId === template.id ? 'text-[var(--holo-accent)]' : 'text-[var(--holo-muted)]'}
                    />
                    <span className="text-sm flex-1 truncate">{template.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunTask(template.id);
                      }}
                      className="p-1 rounded hover:bg-[var(--holo-accent)]/20 text-[var(--holo-muted)] hover:text-green-400 transition-colors"
                    >
                      <Play size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Queue section */}
            <div className="border-t border-[var(--holo-border)] p-2">
              <button
                onClick={() => setIsQueueExpanded(!isQueueExpanded)}
                className="flex items-center gap-2 w-full px-2 py-1 text-xs font-semibold text-[var(--holo-muted)] uppercase tracking-wider hover:text-[var(--holo-text)] transition-colors"
              >
                {isQueueExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <ListTodo size={12} />
                Queue ({workspace.queue.length})
              </button>
              {isQueueExpanded && workspace.queue.length > 0 && (
                <div className="mt-2 space-y-1">
                  {workspace.queue.map((item, index) => {
                    const template = workspace.templates.find(t => t.id === item.templateId);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded bg-[rgba(20,20,30,0.5)] text-sm"
                      >
                        <span className="text-[var(--holo-muted)]">{index + 1}.</span>
                        <span className="flex-1 truncate">{template?.name || 'Unknown'}</span>
                        <button
                          onClick={() => handleRunFromQueue(item)}
                          className="p-1 rounded hover:bg-green-500/20 text-[var(--holo-muted)] hover:text-green-400 transition-colors"
                        >
                          <Play size={12} />
                        </button>
                        <button
                          onClick={() => removeFromQueue(item.id)}
                          className="p-1 rounded hover:bg-red-500/20 text-[var(--holo-muted)] hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Running section (actively running, not idle) */}
            {activeExecutions.filter(e => !e.isIdle).length > 0 && (
              <div className="border-t border-[var(--holo-border)] p-2">
                <div className="text-xs font-semibold text-[var(--holo-muted)] uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  Running ({activeExecutions.filter(e => !e.isIdle).length})
                </div>
                <div className="space-y-1">
                  {activeExecutions.filter(e => !e.isIdle).map((execution) => (
                    <div
                      key={execution.id}
                      onClick={() => handleSelectExecution(execution.id)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                        selectedExecutionId === execution.id
                          ? 'bg-[var(--holo-accent)]/20 border-l-2 border-[var(--holo-accent)]'
                          : 'hover:bg-[var(--holo-accent)]/10'
                      }`}
                    >
                      <Loader2 size={14} className="animate-spin text-[var(--holo-accent)]" />
                      <span className="text-sm flex-1 truncate">{execution.templateName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Idle section (waiting for user to mark complete) */}
            {activeExecutions.filter(e => e.isIdle).length > 0 && (
              <div className="border-t border-[var(--holo-border)] p-2">
                <div className="text-xs font-semibold text-[var(--holo-muted)] uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
                  <Pause size={12} className="text-blue-400" />
                  Idle ({activeExecutions.filter(e => e.isIdle).length})
                </div>
                <div className="space-y-1">
                  {activeExecutions.filter(e => e.isIdle).map((execution) => (
                    <div
                      key={execution.id}
                      onClick={() => handleSelectExecution(execution.id)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                        selectedExecutionId === execution.id
                          ? 'bg-[var(--holo-accent)]/20 border-l-2 border-[var(--holo-accent)]'
                          : 'hover:bg-[var(--holo-accent)]/10'
                      }`}
                    >
                      <Pause size={14} className="text-blue-400" />
                      <span className="text-sm flex-1 truncate">{execution.templateName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History section */}
            <div className="border-t border-[var(--holo-border)] p-2">
              <button
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                className="flex items-center gap-2 w-full px-2 py-1 text-xs font-semibold text-[var(--holo-muted)] uppercase tracking-wider hover:text-[var(--holo-text)] transition-colors"
              >
                {isHistoryExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <History size={12} />
                History ({workspace.history.length})
              </button>
              {isHistoryExpanded && workspace.history.length > 0 && (
                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                  {workspace.history.slice(0, 20).map((execution) => (
                    <div
                      key={execution.id}
                      onClick={() => handleSelectExecution(execution.id)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                        selectedExecutionId === execution.id
                          ? 'bg-[var(--holo-accent)]/20 border-l-2 border-[var(--holo-accent)]'
                          : 'hover:bg-[var(--holo-accent)]/10'
                      }`}
                    >
                      {execution.status === 'completed' ? (
                        <CheckCircle size={14} className="text-green-400" />
                      ) : (
                        <XCircle size={14} className="text-red-400" />
                      )}
                      <span className="text-sm flex-1 truncate">{execution.templateName}</span>
                      <span className="text-xs text-[var(--holo-muted)]">
                        {new Date(execution.startedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main panel */}
        <div className="flex-1 overflow-hidden">
          {mainPanelMode === 'editor' && selectedTemplate ? (
            <TaskTemplateEditor
              template={selectedTemplate}
              onUpdate={(updates) => updateTemplate(selectedTemplate.id, updates)}
              onDelete={() => {
                deleteTemplate(selectedTemplate.id);
                setSelectedTemplateId(null);
              }}
              onDuplicate={() => duplicateTemplate(selectedTemplate.id)}
              onRun={() => handleRunTask(selectedTemplate.id)}
            />
          ) : mainPanelMode === 'execution' && selectedExecution ? (
            <ExecutionMonitor
              execution={selectedExecution}
              isActive={activeExecutions.some(e => e.id === selectedExecution.id)}
              onCancel={() => cancelExecution(selectedExecution.id)}
              onMarkComplete={(status) => markComplete(selectedExecution.id, status)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-[var(--holo-muted)]">
              <Bot size={48} />
              <p className="text-sm">Select a task or create a new one</p>
            </div>
          )}
        </div>
      </div>

      {/* Variable input dialog */}
      {showVariableDialog && pendingTemplate && (
        <VariableInputDialog
          template={pendingTemplate}
          onSubmit={handleVariableSubmit}
          onCancel={() => {
            setShowVariableDialog(false);
            setPendingTemplateId(null);
          }}
        />
      )}
    </div>
  );
}
