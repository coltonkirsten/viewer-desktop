/**
 * Tools Component
 * Tool management with enable/disable and CRUD for custom tools
 */

import { useState } from 'react';
import { Plus, RefreshCw, ToggleLeft, ToggleRight, Edit2, Trash2, Wrench, Lock } from 'lucide-react';
import { useTools } from '../../hooks/useTools';
import type { ToolDefinition, ToolParameter } from '../../types';

export function Tools() {
  const { builtInTools, customTools, isLoading, create, update, remove, setEnabled, refresh } =
    useTools();
  const [isCreating, setIsCreating] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolDefinition | null>(null);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--holo-muted)]">
        Loading tools...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--holo-border)]">
        <h2 className="text-xl font-semibold text-[var(--holo-text)]">Tools</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="p-2 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--holo-accent)]/20 text-[var(--holo-accent)] rounded-lg hover:bg-[var(--holo-accent)]/30 transition-colors"
          >
            <Plus size={16} />
            Create Tool
          </button>
        </div>
      </div>

      {/* Tool editor modal */}
      {(isCreating || editingTool) && (
        <ToolEditor
          tool={editingTool || undefined}
          onSave={async (data) => {
            if (editingTool) {
              await update(editingTool.name, data);
            } else {
              await create({
                name: data.name!,
                description: data.description!,
                parameters: data.parameters || [],
                code: data.code,
              });
            }
            setIsCreating(false);
            setEditingTool(null);
          }}
          onCancel={() => {
            setIsCreating(false);
            setEditingTool(null);
          }}
        />
      )}

      {/* Tool list */}
      <div className="flex-1 overflow-auto p-4">
        {/* Built-in tools */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-[var(--holo-muted)] uppercase tracking-wide mb-3 flex items-center gap-2">
            <Lock size={14} />
            Built-in Tools
          </h3>
          <div className="space-y-2">
            {builtInTools.map((tool) => (
              <ToolCard
                key={tool.name}
                tool={tool}
                onToggle={() => setEnabled(tool.name, !tool.enabled)}
                isBuiltIn
              />
            ))}
          </div>
        </div>

        {/* Custom tools */}
        <div>
          <h3 className="text-sm font-medium text-[var(--holo-muted)] uppercase tracking-wide mb-3 flex items-center gap-2">
            <Wrench size={14} />
            Custom Tools
          </h3>
          {customTools.length === 0 ? (
            <div className="text-center text-[var(--holo-muted)] py-4 text-sm">
              No custom tools yet. Create your first one!
            </div>
          ) : (
            <div className="space-y-2">
              {customTools.map((tool) => (
                <ToolCard
                  key={tool.name}
                  tool={tool}
                  onToggle={() => setEnabled(tool.name, !tool.enabled)}
                  onEdit={() => setEditingTool(tool)}
                  onDelete={() => remove(tool.name)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ToolCardProps {
  tool: ToolDefinition;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isBuiltIn?: boolean;
}

function ToolCard({ tool, onToggle, onEdit, onDelete, isBuiltIn }: ToolCardProps) {
  return (
    <div className="bg-[var(--holo-bg-alt)] rounded-lg border border-[var(--holo-border)] p-3">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className={`transition-colors ${tool.enabled ? 'text-green-400' : 'text-[var(--holo-muted)]'}`}
        >
          {tool.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-[var(--holo-text)]">{tool.name}</span>
            {isBuiltIn && (
              <span className="px-1.5 py-0.5 bg-[var(--holo-muted)]/20 text-[var(--holo-muted)] text-xs rounded">
                built-in
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--holo-muted)] truncate">{tool.description}</p>
        </div>

        {!isBuiltIn && (
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="p-1.5 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-[var(--holo-muted)] hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {tool.parameters.length > 0 && (
        <div className="mt-2 pl-9">
          <div className="text-xs text-[var(--holo-muted)]">
            Parameters: {tool.parameters.map((p) => p.name).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}

interface ToolEditorProps {
  tool?: ToolDefinition;
  onSave: (data: {
    name?: string;
    description?: string;
    parameters?: ToolParameter[];
    code?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

function ToolEditor({ tool, onSave, onCancel }: ToolEditorProps) {
  const [name, setName] = useState(tool?.name || '');
  const [description, setDescription] = useState(tool?.description || '');
  const [code, setCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!tool;

  const handleSave = async () => {
    if (!isEditing && !name.trim()) return;
    if (!description.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        name: isEditing ? undefined : name.trim(),
        description: description.trim(),
        parameters: [],
        code: code.trim() || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--holo-bg)] border border-[var(--holo-border)] rounded-lg w-full max-w-lg mx-4 max-h-[80vh] overflow-auto">
        <div className="p-4 border-b border-[var(--holo-border)]">
          <h3 className="text-lg font-medium text-[var(--holo-text)]">
            {isEditing ? 'Edit Tool' : 'Create Tool'}
          </h3>
        </div>

        <div className="p-4 space-y-4">
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-[var(--holo-text)] mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my_custom_tool"
                className="w-full bg-[var(--holo-bg-alt)] border border-[var(--holo-border)] rounded-lg px-3 py-2 text-sm text-[var(--holo-text)] placeholder:text-[var(--holo-muted)] focus:outline-none focus:border-[var(--holo-accent)]"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--holo-text)] mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this tool do?"
              rows={2}
              className="w-full bg-[var(--holo-bg-alt)] border border-[var(--holo-border)] rounded-lg px-3 py-2 text-sm text-[var(--holo-text)] placeholder:text-[var(--holo-muted)] focus:outline-none focus:border-[var(--holo-accent)] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--holo-text)] mb-1">
              Python Code (optional)
            </label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="def my_custom_tool(args):\n    return {'result': 'success'}"
              rows={6}
              className="w-full bg-[var(--holo-bg-alt)] border border-[var(--holo-border)] rounded-lg px-3 py-2 font-mono text-sm text-[var(--holo-text)] placeholder:text-[var(--holo-muted)] focus:outline-none focus:border-[var(--holo-accent)] resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-[var(--holo-border)]">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || (!isEditing && !name.trim()) || !description.trim()}
            className="px-4 py-2 text-sm bg-[var(--holo-accent)] text-white rounded-lg hover:bg-[var(--holo-accent)]/80 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
