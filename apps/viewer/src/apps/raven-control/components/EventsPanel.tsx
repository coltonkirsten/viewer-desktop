/**
 * EventsPanel Component
 * Scheduled events management
 */

import { useState } from 'react';
import {
  Calendar,
  Plus,
  RefreshCw,
  Clock,
  Repeat,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from 'lucide-react';
import type { EventList, ScheduledEvent } from '../types';

interface EventsPanelProps {
  events: EventList | null;
  isLoading: boolean;
  onRefresh: () => void;
  onCreate: (event: Omit<ScheduledEvent, 'id' | 'created_at' | 'last_run' | 'run_count'>) => Promise<void>;
  onUpdate: (eventId: string, updates: Partial<ScheduledEvent>) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function formatNextRun(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return 'Overdue';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  } catch {
    return '--';
  }
}

function formatRecurrence(event: ScheduledEvent): string {
  if (!event.recurrence) return 'One-time';

  const { type, interval, time_of_day, days_of_week } = event.recurrence;

  // Format time nicely (HH:MM -> 9:00 AM)
  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch {
      return time;
    }
  };

  const timeStr = time_of_day ? ` at ${formatTime(time_of_day)}` : '';

  switch (type) {
    case 'daily':
      return interval === 1 ? `Daily${timeStr}` : `Every ${interval} days${timeStr}`;
    case 'weekly':
      if (days_of_week && days_of_week.length > 0) {
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const days = days_of_week.map(d => dayNames[d]).join(', ');
        return `${days}${timeStr}`;
      }
      return interval === 1 ? `Weekly${timeStr}` : `Every ${interval} weeks${timeStr}`;
    case 'monthly':
      return interval === 1 ? `Monthly${timeStr}` : `Every ${interval} months${timeStr}`;
    case 'interval':
      return `Every ${interval} min`;
    default:
      return 'Recurring';
  }
}

export function EventsPanel({
  events,
  isLoading,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
  collapsed,
  onToggleCollapse,
}: EventsPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between px-3 py-2 border-t border-[var(--holo-border)] hover:bg-[var(--holo-accent)]/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          <Calendar size={14} className="text-[var(--holo-accent)]" />
          <span className="text-sm font-medium">Events</span>
          {events && (
            <span className="text-xs text-[var(--holo-muted)]">
              {events.total}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowForm(!showForm);
            }}
            className="p-1 rounded hover:bg-[var(--holo-accent)]/10 transition-colors"
            title="Add event"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            disabled={isLoading}
            className="p-1 rounded hover:bg-[var(--holo-accent)]/10 disabled:opacity-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="max-h-[200px] overflow-y-auto">
          {/* Create form */}
          {showForm && (
            <CreateEventForm
              onCreate={onCreate}
              onClose={() => setShowForm(false)}
            />
          )}

          {/* Event list */}
          {!events ? (
            <div className="p-3 text-center text-xs text-[var(--holo-muted)]">
              Loading events...
            </div>
          ) : events.events.length === 0 ? (
            <div className="p-3 text-center text-xs text-[var(--holo-muted)]">
              No scheduled events
            </div>
          ) : (
            <div className="divide-y divide-[var(--holo-border)]">
              {events.events.map((event) => (
                <EventItem
                  key={event.id}
                  event={event}
                  isEditing={editingId === event.id}
                  onEdit={() => setEditingId(event.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface EventItemProps {
  event: ScheduledEvent;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (eventId: string, updates: Partial<ScheduledEvent>) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
}

function EventItem({
  event,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: EventItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Edit state
  const [editDescription, setEditDescription] = useState(event.description);
  const [editTask, setEditTask] = useState(event.task);
  const [editNextRun, setEditNextRun] = useState(
    event.next_run ? new Date(event.next_run).toISOString().slice(0, 16) : ''
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onUpdate(event.id, { enabled: !event.enabled });
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setIsDeleting(true);
    try {
      await onDelete(event.id);
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleSave = async () => {
    if (!editDescription.trim() || !editTask.trim()) return;
    setIsSaving(true);
    try {
      await onUpdate(event.id, {
        description: editDescription.trim(),
        task: editTask.trim(),
        next_run: editNextRun ? new Date(editNextRun).toISOString() : undefined,
      });
      onCancelEdit();
    } finally {
      setIsSaving(false);
    }
  };

  // Edit mode view
  if (isEditing) {
    return (
      <div className="px-3 py-2 bg-[var(--holo-accent)]/5">
        <div className="space-y-2">
          <input
            type="text"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Description"
            className="w-full px-2 py-1 text-xs bg-[var(--holo-bg)] border border-[var(--holo-border)] rounded focus:outline-none focus:border-[var(--holo-accent)]"
            autoFocus
          />
          <textarea
            value={editTask}
            onChange={(e) => setEditTask(e.target.value)}
            placeholder="Task prompt"
            className="w-full px-2 py-1 text-xs bg-[var(--holo-bg)] border border-[var(--holo-border)] rounded resize-none focus:outline-none focus:border-[var(--holo-accent)]"
            rows={2}
          />
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={editNextRun}
              onChange={(e) => setEditNextRun(e.target.value)}
              className="flex-1 px-2 py-1 text-xs bg-[var(--holo-bg)] border border-[var(--holo-border)] rounded focus:outline-none focus:border-[var(--holo-accent)]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancelEdit}
              className="p-1 rounded hover:bg-[var(--holo-accent)]/10 transition-colors"
              title="Cancel"
            >
              <X size={14} />
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !editDescription.trim() || !editTask.trim()}
              className="p-1 rounded hover:bg-green-500/10 text-green-400 transition-colors disabled:opacity-50"
              title="Save"
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Normal view
  return (
    <div className={`px-3 py-2 ${!event.enabled ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {event.recurrence ? (
              <Repeat size={12} className="text-purple-400 flex-shrink-0" />
            ) : (
              <Clock size={12} className="text-blue-400 flex-shrink-0" />
            )}
            <span className="text-sm truncate">{event.description}</span>
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--holo-muted)]">
            <span>Next: {formatNextRun(event.next_run)}</span>
            <span>{formatRecurrence(event)}</span>
            {event.run_count > 0 && <span>Runs: {event.run_count}</span>}
          </div>
        </div>

        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-[var(--holo-accent)]/10 transition-colors"
            title="Edit"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={handleToggle}
            disabled={isToggling}
            className="p-1 rounded hover:bg-[var(--holo-accent)]/10 transition-colors"
            title={event.enabled ? 'Disable' : 'Enable'}
          >
            {event.enabled ? (
              <ToggleRight size={14} className="text-green-400" />
            ) : (
              <ToggleLeft size={14} className="text-[var(--holo-muted)]" />
            )}
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`p-1 rounded transition-colors ${
              confirmDelete
                ? 'bg-red-500/20 text-red-400 animate-pulse'
                : 'hover:bg-red-500/10 text-red-400'
            }`}
            title={confirmDelete ? 'Click again to confirm' : 'Delete'}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

interface CreateEventFormProps {
  onCreate: (event: Omit<ScheduledEvent, 'id' | 'created_at' | 'last_run' | 'run_count'>) => Promise<void>;
  onClose: () => void;
}

function CreateEventForm({ onCreate, onClose }: CreateEventFormProps) {
  const [description, setDescription] = useState('');
  const [task, setTask] = useState('');
  const [nextRun, setNextRun] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !task.trim() || !nextRun) return;

    setIsSubmitting(true);
    try {
      await onCreate({
        sender_id: 'control-panel',
        description: description.trim(),
        task: task.trim(),
        next_run: new Date(nextRun).toISOString(),
        enabled: true,
        recurrence: isRecurring ? {
          type: 'daily',
          interval: 1,
          time_of_day: '09:00',
        } : undefined,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 border-b border-[var(--holo-border)] bg-[var(--holo-accent)]/5">
      <div className="space-y-2">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="w-full px-2 py-1 text-xs bg-[var(--holo-bg)] border border-[var(--holo-border)] rounded focus:outline-none focus:border-[var(--holo-accent)]"
          autoFocus
        />
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Task prompt"
          className="w-full px-2 py-1 text-xs bg-[var(--holo-bg)] border border-[var(--holo-border)] rounded resize-none focus:outline-none focus:border-[var(--holo-accent)]"
          rows={2}
        />
        <input
          type="datetime-local"
          value={nextRun}
          onChange={(e) => setNextRun(e.target.value)}
          className="w-full px-2 py-1 text-xs bg-[var(--holo-bg)] border border-[var(--holo-border)] rounded focus:outline-none focus:border-[var(--holo-accent)]"
        />
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="rounded"
          />
          Repeat daily
        </label>
      </div>

      <div className="flex justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-2 py-1 text-xs text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!description.trim() || !task.trim() || !nextRun || isSubmitting}
          className="px-2 py-1 text-xs bg-[var(--holo-accent)]/20 text-[var(--holo-accent)] rounded hover:bg-[var(--holo-accent)]/30 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? 'Creating...' : 'Create'}
        </button>
      </div>
    </form>
  );
}
