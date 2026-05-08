/**
 * VariableInputDialog Component
 * Modal dialog for entering variable values before execution
 */

import { useState, useCallback, useEffect } from 'react';
import { X, Play, ListPlus } from 'lucide-react';
import type { TaskTemplate } from '../../types';

interface VariableInputDialogProps {
  template: TaskTemplate;
  onSubmit: (variables: Record<string, string>, addToQueue: boolean) => void;
  onCancel: () => void;
}

export function VariableInputDialog({
  template,
  onSubmit,
  onCancel,
}: VariableInputDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  // Initialize values with defaults
  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const variable of template.variables) {
      initial[variable.name] = variable.defaultValue || '';
    }
    setValues(initial);
  }, [template.variables]);

  // Update a value
  const updateValue = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Check if all required variables are filled
  const isValid = useCallback(() => {
    for (const variable of template.variables) {
      if (variable.required && !values[variable.name]?.trim()) {
        return false;
      }
    }
    return true;
  }, [template.variables, values]);

  // Handle submit
  const handleSubmit = useCallback((addToQueue: boolean) => {
    if (!isValid()) return;
    onSubmit(values, addToQueue);
  }, [values, isValid, onSubmit]);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSubmit(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, handleSubmit]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[rgba(20,20,30,0.98)] border border-[var(--holo-border)] rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--holo-border)]">
          <div>
            <h2 className="text-lg font-medium text-[var(--holo-text)]">
              {template.name}
            </h2>
            <p className="text-xs text-[var(--holo-muted)] mt-0.5">
              Fill in the required variables to run this task
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-[var(--holo-accent)]/20 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Variables form */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {template.variables.map((variable) => (
            <div key={variable.name}>
              <label className="flex items-baseline gap-2 mb-1.5">
                <span className="text-sm font-medium text-[var(--holo-text)]">
                  {variable.name}
                </span>
                {variable.required && (
                  <span className="text-xs text-red-400">required</span>
                )}
              </label>
              {variable.description && (
                <p className="text-xs text-[var(--holo-muted)] mb-1.5">
                  {variable.description}
                </p>
              )}
              <input
                type="text"
                value={values[variable.name] || ''}
                onChange={(e) => updateValue(variable.name, e.target.value)}
                className={`w-full px-3 py-2 bg-[rgba(15,15,25,0.5)] border rounded-lg text-sm text-[var(--holo-text)] placeholder-[var(--holo-muted)] focus:outline-none transition-colors ${
                  variable.required && !values[variable.name]?.trim()
                    ? 'border-red-500/50 focus:border-red-500'
                    : 'border-[var(--holo-border)] focus:border-[var(--holo-accent)]'
                }`}
                placeholder={variable.defaultValue || `Enter ${variable.name}...`}
                autoFocus={template.variables.indexOf(variable) === 0}
              />
            </div>
          ))}

          {template.variables.length === 0 && (
            <p className="text-sm text-[var(--holo-muted)] text-center py-4">
              This task has no variables. Click Run to start.
            </p>
          )}
        </div>

        {/* Preview */}
        {template.prompt && (
          <div className="px-5 pb-4">
            <div className="text-xs text-[var(--holo-muted)] mb-1">Preview:</div>
            <div className="p-3 bg-[rgba(15,15,25,0.5)] border border-[var(--holo-border)] rounded-lg text-xs font-mono text-[var(--holo-text)] max-h-24 overflow-y-auto whitespace-pre-wrap">
              {template.prompt.replace(/\{\{(\w+)\}\}/g, (_, name) => {
                return values[name] || `{{${name}}}`;
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[var(--holo-border)] bg-[rgba(15,15,25,0.3)]">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={!isValid()}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[var(--holo-accent)]/20 text-[var(--holo-accent)] hover:bg-[var(--holo-accent)]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ListPlus size={16} />
            Add to Queue
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={!isValid()}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play size={16} />
            Run Now
          </button>
        </div>
      </div>
    </div>
  );
}
