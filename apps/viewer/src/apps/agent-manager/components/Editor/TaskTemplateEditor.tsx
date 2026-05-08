/**
 * TaskTemplateEditor Component
 * Form for editing task template properties
 */

import { useState, useCallback } from 'react';
import {
  Play,
  Trash2,
  Copy,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { TaskTemplate, TaskVariable, TaskCommand, ClaudeCliFlags } from '../../types';
import {
  TEMPLATE_ICONS,
  TEMPLATE_COLORS,
  AVAILABLE_MODELS,
  PERMISSION_MODES,
  OUTPUT_FORMATS,
  generateId,
} from '../../constants';

interface TaskTemplateEditorProps {
  template: TaskTemplate;
  onUpdate: (updates: Partial<TaskTemplate>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRun: () => void;
}

// Dynamic icon component
function DynamicIcon({ name, size = 16, className = '' }: { name: string; size?: number; className?: string }) {
  const Icon = (LucideIcons as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
  if (!Icon) return <LucideIcons.Sparkles size={size} className={className} />;
  return <Icon size={size} className={className} />;
}

export function TaskTemplateEditor({
  template,
  onUpdate,
  onDelete,
  onDuplicate,
  onRun,
}: TaskTemplateEditorProps) {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    variables: true,
    cliFlags: true,
    commands: true,
    advanced: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Update a CLI flag
  const updateFlag = useCallback(<K extends keyof ClaudeCliFlags>(key: K, value: ClaudeCliFlags[K]) => {
    onUpdate({
      cliFlags: {
        ...template.cliFlags,
        [key]: value,
      },
    });
  }, [template.cliFlags, onUpdate]);

  // Add a variable
  const addVariable = useCallback(() => {
    onUpdate({
      variables: [
        ...template.variables,
        {
          name: `var${template.variables.length + 1}`,
          description: '',
          required: false,
        },
      ],
    });
  }, [template.variables, onUpdate]);

  // Update a variable
  const updateVariable = useCallback((index: number, updates: Partial<TaskVariable>) => {
    const newVariables = [...template.variables];
    newVariables[index] = { ...newVariables[index], ...updates };
    onUpdate({ variables: newVariables });
  }, [template.variables, onUpdate]);

  // Remove a variable
  const removeVariable = useCallback((index: number) => {
    onUpdate({
      variables: template.variables.filter((_, i) => i !== index),
    });
  }, [template.variables, onUpdate]);

  // Add a command
  const addCommand = useCallback((type: 'pre' | 'post') => {
    const key = type === 'pre' ? 'preCommands' : 'postCommands';
    onUpdate({
      [key]: [
        ...template[key],
        {
          id: generateId(),
          command: '',
          description: '',
          continueOnFail: type === 'post',
        },
      ],
    });
  }, [template, onUpdate]);

  // Update a command
  const updateCommand = useCallback((type: 'pre' | 'post', index: number, updates: Partial<TaskCommand>) => {
    const key = type === 'pre' ? 'preCommands' : 'postCommands';
    const commands = [...template[key]];
    commands[index] = { ...commands[index], ...updates };
    onUpdate({ [key]: commands });
  }, [template, onUpdate]);

  // Remove a command
  const removeCommand = useCallback((type: 'pre' | 'post', index: number) => {
    const key = type === 'pre' ? 'preCommands' : 'postCommands';
    onUpdate({
      [key]: template[key].filter((_, i) => i !== index),
    });
  }, [template, onUpdate]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--holo-border)] bg-[rgba(15,15,25,0.5)]">
        <div className="flex items-center gap-3">
          {/* Icon picker */}
          <div className="relative">
            <button
              onClick={() => setShowIconPicker(!showIconPicker)}
              className="p-2 rounded-lg hover:bg-[var(--holo-accent)]/20 transition-colors"
              style={{ color: template.color }}
            >
              <DynamicIcon name={template.icon || 'Sparkles'} size={24} />
            </button>
            {showIconPicker && (
              <div className="absolute top-full left-0 mt-2 p-2 bg-[rgba(20,20,30,0.95)] border border-[var(--holo-border)] rounded-lg shadow-lg z-10 grid grid-cols-5 gap-1">
                {TEMPLATE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => {
                      onUpdate({ icon });
                      setShowIconPicker(false);
                    }}
                    className={`p-2 rounded hover:bg-[var(--holo-accent)]/20 ${
                      template.icon === icon ? 'bg-[var(--holo-accent)]/30' : ''
                    }`}
                  >
                    <DynamicIcon name={icon} size={16} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Color picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-6 h-6 rounded-full border-2 border-[var(--holo-border)]"
              style={{ backgroundColor: template.color }}
            />
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-2 p-2 bg-[rgba(20,20,30,0.95)] border border-[var(--holo-border)] rounded-lg shadow-lg z-10 flex gap-1">
                {TEMPLATE_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      onUpdate({ color });
                      setShowColorPicker(false);
                    }}
                    className={`w-6 h-6 rounded-full ${
                      template.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[rgba(20,20,30,0.95)]' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Name input */}
          <input
            type="text"
            value={template.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="text-lg font-medium bg-transparent border-none outline-none text-[var(--holo-text)] placeholder-[var(--holo-muted)]"
            placeholder="Task name"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRun}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
          >
            <Play size={14} />
            Run
          </button>
          <button
            onClick={onDuplicate}
            className="p-2 rounded hover:bg-[var(--holo-accent)]/20 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
            title="Duplicate"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded hover:bg-red-500/20 text-[var(--holo-muted)] hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-[var(--holo-muted)] mb-1.5">
            Description
          </label>
          <input
            type="text"
            value={template.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="w-full px-3 py-2 bg-[rgba(20,20,30,0.5)] border border-[var(--holo-border)] rounded-lg text-sm text-[var(--holo-text)] placeholder-[var(--holo-muted)] focus:outline-none focus:border-[var(--holo-accent)]"
            placeholder="Brief description of this task"
          />
        </div>

        {/* Prompt */}
        <div>
          <label className="block text-xs font-medium text-[var(--holo-muted)] mb-1.5">
            Prompt
          </label>
          <textarea
            value={template.prompt}
            onChange={(e) => onUpdate({ prompt: e.target.value })}
            className="w-full px-3 py-2 bg-[rgba(20,20,30,0.5)] border border-[var(--holo-border)] rounded-lg text-sm text-[var(--holo-text)] placeholder-[var(--holo-muted)] focus:outline-none focus:border-[var(--holo-accent)] resize-none"
            rows={4}
            placeholder="Enter the prompt for Claude. Use {{variable}} syntax for placeholders."
          />
          <p className="text-xs text-[var(--holo-muted)] mt-1">
            Tip: Use {'{{variableName}}'} to insert variable placeholders
          </p>
        </div>

        {/* Variables Section */}
        <div className="border border-[var(--holo-border)] rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('variables')}
            className="flex items-center justify-between w-full px-4 py-2 bg-[rgba(20,20,30,0.5)] hover:bg-[rgba(30,30,40,0.5)] transition-colors"
          >
            <span className="text-sm font-medium">Variables ({template.variables.length})</span>
            {expandedSections.variables ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {expandedSections.variables && (
            <div className="p-4 space-y-3">
              {template.variables.map((variable, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-[rgba(15,15,25,0.5)] rounded-lg">
                  <GripVertical size={16} className="text-[var(--holo-muted)] mt-2 cursor-grab" />
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={variable.name}
                        onChange={(e) => updateVariable(index, { name: e.target.value.replace(/\s/g, '_') })}
                        className="flex-1 px-2 py-1 bg-[rgba(20,20,30,0.5)] border border-[var(--holo-border)] rounded text-sm text-[var(--holo-text)]"
                        placeholder="Variable name"
                      />
                      <label className="flex items-center gap-1.5 text-xs text-[var(--holo-muted)]">
                        <input
                          type="checkbox"
                          checked={variable.required}
                          onChange={(e) => updateVariable(index, { required: e.target.checked })}
                          className="rounded border-[var(--holo-border)]"
                        />
                        Required
                      </label>
                    </div>
                    <input
                      type="text"
                      value={variable.description || ''}
                      onChange={(e) => updateVariable(index, { description: e.target.value })}
                      className="w-full px-2 py-1 bg-[rgba(20,20,30,0.5)] border border-[var(--holo-border)] rounded text-xs text-[var(--holo-text)]"
                      placeholder="Description"
                    />
                    <input
                      type="text"
                      value={variable.defaultValue || ''}
                      onChange={(e) => updateVariable(index, { defaultValue: e.target.value })}
                      className="w-full px-2 py-1 bg-[rgba(20,20,30,0.5)] border border-[var(--holo-border)] rounded text-xs text-[var(--holo-text)]"
                      placeholder="Default value"
                    />
                  </div>
                  <button
                    onClick={() => removeVariable(index)}
                    className="p-1 rounded hover:bg-red-500/20 text-[var(--holo-muted)] hover:text-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={addVariable}
                className="flex items-center gap-1.5 text-sm text-[var(--holo-accent)] hover:text-[var(--holo-accent-bright)]"
              >
                <Plus size={14} />
                Add Variable
              </button>
            </div>
          )}
        </div>

        {/* CLI Flags Section */}
        <div className="border border-[var(--holo-border)] rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('cliFlags')}
            className="flex items-center justify-between w-full px-4 py-2 bg-[rgba(20,20,30,0.5)] hover:bg-[rgba(30,30,40,0.5)] transition-colors"
          >
            <span className="text-sm font-medium">CLI Flags</span>
            {expandedSections.cliFlags ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {expandedSections.cliFlags && (
            <div className="p-4 grid grid-cols-2 gap-4">
              {/* Print mode */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={template.cliFlags.print ?? false}
                  onChange={(e) => updateFlag('print', e.target.checked)}
                  className="rounded border-[var(--holo-border)]"
                />
                <span className="text-sm">Print mode (-p)</span>
              </label>

              {/* Verbose */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={template.cliFlags.verbose ?? false}
                  onChange={(e) => updateFlag('verbose', e.target.checked)}
                  className="rounded border-[var(--holo-border)]"
                />
                <span className="text-sm">Verbose</span>
              </label>

              {/* Model */}
              <div>
                <label className="block text-xs text-[var(--holo-muted)] mb-1">Model</label>
                <select
                  value={template.cliFlags.model || 'sonnet'}
                  onChange={(e) => updateFlag('model', e.target.value)}
                  className="w-full px-2 py-1.5 bg-[rgba(20,20,30,0.5)] border border-[var(--holo-border)] rounded text-sm"
                >
                  {AVAILABLE_MODELS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Max turns */}
              <div>
                <label className="block text-xs text-[var(--holo-muted)] mb-1">Max Turns</label>
                <input
                  type="number"
                  value={template.cliFlags.maxTurns ?? 10}
                  onChange={(e) => updateFlag('maxTurns', parseInt(e.target.value) || undefined)}
                  min={1}
                  className="w-full px-2 py-1.5 bg-[rgba(20,20,30,0.5)] border border-[var(--holo-border)] rounded text-sm"
                />
              </div>

              {/* Permission mode */}
              <div>
                <label className="block text-xs text-[var(--holo-muted)] mb-1">Permission Mode</label>
                <select
                  value={template.cliFlags.permissionMode || 'default'}
                  onChange={(e) => updateFlag('permissionMode', e.target.value || undefined)}
                  className="w-full px-2 py-1.5 bg-[rgba(20,20,30,0.5)] border border-[var(--holo-border)] rounded text-sm"
                >
                  {PERMISSION_MODES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Output format */}
              <div>
                <label className="block text-xs text-[var(--holo-muted)] mb-1">Output Format</label>
                <select
                  value={template.cliFlags.outputFormat || 'text'}
                  onChange={(e) => updateFlag('outputFormat', e.target.value as ClaudeCliFlags['outputFormat'])}
                  className="w-full px-2 py-1.5 bg-[rgba(20,20,30,0.5)] border border-[var(--holo-border)] rounded text-sm"
                >
                  {OUTPUT_FORMATS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Pre/Post Commands Section */}
        <div className="border border-[var(--holo-border)] rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('commands')}
            className="flex items-center justify-between w-full px-4 py-2 bg-[rgba(20,20,30,0.5)] hover:bg-[rgba(30,30,40,0.5)] transition-colors"
          >
            <span className="text-sm font-medium">
              Commands ({template.preCommands.length + template.postCommands.length})
            </span>
            {expandedSections.commands ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {expandedSections.commands && (
            <div className="p-4 space-y-4">
              {/* Pre-commands */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[var(--holo-muted)]">Pre-Commands</span>
                  <button
                    onClick={() => addCommand('pre')}
                    className="flex items-center gap-1 text-xs text-[var(--holo-accent)]"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
                {template.preCommands.length === 0 ? (
                  <p className="text-xs text-[var(--holo-muted)] italic">No pre-commands</p>
                ) : (
                  <div className="space-y-2">
                    {template.preCommands.map((cmd, index) => (
                      <div key={cmd.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={cmd.command}
                          onChange={(e) => updateCommand('pre', index, { command: e.target.value })}
                          className="flex-1 px-2 py-1.5 bg-[rgba(20,20,30,0.5)] border border-[var(--holo-border)] rounded text-sm font-mono"
                          placeholder="Command to run before task"
                        />
                        <button
                          onClick={() => removeCommand('pre', index)}
                          className="p-1 rounded hover:bg-red-500/20 text-[var(--holo-muted)] hover:text-red-400"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Post-commands */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[var(--holo-muted)]">Post-Commands</span>
                  <button
                    onClick={() => addCommand('post')}
                    className="flex items-center gap-1 text-xs text-[var(--holo-accent)]"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
                {template.postCommands.length === 0 ? (
                  <p className="text-xs text-[var(--holo-muted)] italic">No post-commands</p>
                ) : (
                  <div className="space-y-2">
                    {template.postCommands.map((cmd, index) => (
                      <div key={cmd.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={cmd.command}
                          onChange={(e) => updateCommand('post', index, { command: e.target.value })}
                          className="flex-1 px-2 py-1.5 bg-[rgba(20,20,30,0.5)] border border-[var(--holo-border)] rounded text-sm font-mono"
                          placeholder="Command to run after task"
                        />
                        <label className="flex items-center gap-1 text-xs text-[var(--holo-muted)] whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={cmd.continueOnFail ?? false}
                            onChange={(e) => updateCommand('post', index, { continueOnFail: e.target.checked })}
                          />
                          Continue on fail
                        </label>
                        <button
                          onClick={() => removeCommand('post', index)}
                          className="p-1 rounded hover:bg-red-500/20 text-[var(--holo-muted)] hover:text-red-400"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Advanced Section */}
        <div className="border border-[var(--holo-border)] rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('advanced')}
            className="flex items-center justify-between w-full px-4 py-2 bg-[rgba(20,20,30,0.5)] hover:bg-[rgba(30,30,40,0.5)] transition-colors"
          >
            <span className="text-sm font-medium">Advanced</span>
            {expandedSections.advanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {expandedSections.advanced && (
            <div className="p-4 space-y-4">
              {/* Working directory */}
              <div>
                <label className="block text-xs text-[var(--holo-muted)] mb-1">Working Directory</label>
                <input
                  type="text"
                  value={template.workingDirectory || ''}
                  onChange={(e) => onUpdate({ workingDirectory: e.target.value || undefined })}
                  className="w-full px-2 py-1.5 bg-[rgba(20,20,30,0.5)] border border-[var(--holo-border)] rounded text-sm"
                  placeholder="Leave empty for current directory"
                />
              </div>

              {/* System prompt */}
              <div>
                <label className="block text-xs text-[var(--holo-muted)] mb-1">System Prompt (replaces default)</label>
                <textarea
                  value={template.cliFlags.systemPrompt || ''}
                  onChange={(e) => updateFlag('systemPrompt', e.target.value || undefined)}
                  className="w-full px-2 py-1.5 bg-[rgba(20,20,30,0.5)] border border-[var(--holo-border)] rounded text-sm resize-none"
                  rows={3}
                  placeholder="Custom system prompt"
                />
              </div>

              {/* Append system prompt */}
              <div>
                <label className="block text-xs text-[var(--holo-muted)] mb-1">Append to System Prompt</label>
                <textarea
                  value={template.cliFlags.appendSystemPrompt || ''}
                  onChange={(e) => updateFlag('appendSystemPrompt', e.target.value || undefined)}
                  className="w-full px-2 py-1.5 bg-[rgba(20,20,30,0.5)] border border-[var(--holo-border)] rounded text-sm resize-none"
                  rows={3}
                  placeholder="Additional instructions to append"
                />
              </div>

              {/* Dangerous options */}
              <div className="pt-2 border-t border-[var(--holo-border)]">
                <p className="text-xs text-amber-400 mb-2">Dangerous Options</p>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={template.cliFlags.dangerouslySkipPermissions ?? false}
                    onChange={(e) => updateFlag('dangerouslySkipPermissions', e.target.checked)}
                    className="rounded border-[var(--holo-border)]"
                  />
                  <span className="text-sm text-amber-400">Skip permission prompts</span>
                </label>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs text-[var(--holo-muted)] mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={(template.tags || []).join(', ')}
                  onChange={(e) => onUpdate({
                    tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                  })}
                  className="w-full px-2 py-1.5 bg-[rgba(20,20,30,0.5)] border border-[var(--holo-border)] rounded text-sm"
                  placeholder="review, testing, automation"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
