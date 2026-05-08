/**
 * Memories Component
 * CRUD interface for Raven's memory/notes system
 */

import { useState } from 'react';
import { Search, Plus, X, Edit2, Trash2, Tag, RefreshCw } from 'lucide-react';
import { useMemories } from '../../hooks/useMemories';
import type { Memory } from '../../types';

export function Memories() {
  const {
    memories,
    isLoading,
    searchQuery,
    setSearchQuery,
    create,
    update,
    remove,
    refresh,
  } = useMemories();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--holo-muted)]">
        Loading memories...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--holo-border)]">
        <h2 className="text-xl font-semibold text-[var(--holo-text)]">Memories</h2>
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
            Add Memory
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-[var(--holo-border)]">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--holo-muted)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--holo-bg-alt)] border border-[var(--holo-border)] rounded-lg text-[var(--holo-text)] placeholder:text-[var(--holo-muted)] focus:outline-none focus:border-[var(--holo-accent)]"
          />
        </div>
      </div>

      {/* Memory list */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {isCreating && (
          <MemoryEditor
            onSave={async (text, tags) => {
              await create(text, tags);
              setIsCreating(false);
            }}
            onCancel={() => setIsCreating(false)}
          />
        )}

        {memories.length === 0 ? (
          <div className="text-center text-[var(--holo-muted)] py-8">
            {searchQuery ? 'No matching memories.' : 'No memories yet. Add your first one!'}
          </div>
        ) : (
          memories.map((memory) =>
            editingId === memory.id ? (
              <MemoryEditor
                key={memory.id}
                memory={memory}
                onSave={async (text, tags) => {
                  await update(memory.id, { text, tags });
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onEdit={() => setEditingId(memory.id)}
                onDelete={() => remove(memory.id)}
              />
            )
          )
        )}
      </div>
    </div>
  );
}

interface MemoryCardProps {
  memory: Memory;
  onEdit: () => void;
  onDelete: () => void;
}

function MemoryCard({ memory, onEdit, onDelete }: MemoryCardProps) {
  const date = new Date(memory.created_at).toLocaleDateString();

  return (
    <div className="bg-[var(--holo-bg-alt)] rounded-lg border border-[var(--holo-border)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[var(--holo-text)] whitespace-pre-wrap">{memory.text}</p>
          {memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {memory.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--holo-accent)]/10 text-[var(--holo-accent)] text-xs rounded-full"
                >
                  <Tag size={10} />
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="text-xs text-[var(--holo-muted)] mt-2">
            ID: {memory.id} &bull; {date}
          </div>
        </div>

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
      </div>
    </div>
  );
}

interface MemoryEditorProps {
  memory?: Memory;
  onSave: (text: string, tags: string[]) => Promise<void>;
  onCancel: () => void;
}

function MemoryEditor({ memory, onSave, onCancel }: MemoryEditorProps) {
  const [text, setText] = useState(memory?.text || '');
  const [tagsInput, setTagsInput] = useState(memory?.tags.join(', ') || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!text.trim()) return;
    setIsSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await onSave(text.trim(), tags);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[var(--holo-bg-alt)] rounded-lg border border-[var(--holo-accent)] p-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter memory text..."
        rows={3}
        className="w-full bg-[var(--holo-bg)] border border-[var(--holo-border)] rounded-lg p-3 text-sm text-[var(--holo-text)] placeholder:text-[var(--holo-muted)] focus:outline-none focus:border-[var(--holo-accent)] resize-none"
      />

      <input
        type="text"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="Tags (comma-separated)"
        className="w-full mt-2 bg-[var(--holo-bg)] border border-[var(--holo-border)] rounded-lg px-3 py-2 text-sm text-[var(--holo-text)] placeholder:text-[var(--holo-muted)] focus:outline-none focus:border-[var(--holo-accent)]"
      />

      <div className="flex justify-end gap-2 mt-3">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!text.trim() || isSaving}
          className="px-3 py-1.5 text-sm bg-[var(--holo-accent)] text-white rounded-lg hover:bg-[var(--holo-accent)]/80 transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : memory ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  );
}
