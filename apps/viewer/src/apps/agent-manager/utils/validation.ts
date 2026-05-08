/**
 * Validation Utilities
 * Validate and normalize workspace data
 */

import type {
  AgentWorkspace,
  TaskTemplate,
  TaskVariable,
  TaskCommand,
  ClaudeCliFlags,
  TaskExecution,
  QueueItem,
} from '../types';
import { generateId, DEFAULT_TEMPLATES } from '../constants';

/**
 * Ensure a value is a string
 */
function ensureString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * Ensure a value is a number
 */
function ensureNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

/**
 * Ensure a value is a boolean
 */
function ensureBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Ensure a value is an array
 */
function ensureArray<T>(value: unknown, validator: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) return [];
  return value.map(validator).filter((item): item is T => item !== null);
}

/**
 * Ensure a value is a string array
 */
function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

/**
 * Validate and normalize CLI flags
 */
function validateCliFlags(raw: unknown): ClaudeCliFlags {
  if (typeof raw !== 'object' || raw === null) {
    return { print: true, model: 'sonnet', maxTurns: 10 };
  }

  const obj = raw as Record<string, unknown>;
  return {
    print: ensureBoolean(obj.print, true),
    model: ensureString(obj.model, 'sonnet'),
    maxTurns: obj.maxTurns !== undefined ? ensureNumber(obj.maxTurns, 10) : undefined,
    systemPrompt: obj.systemPrompt ? ensureString(obj.systemPrompt) : undefined,
    appendSystemPrompt: obj.appendSystemPrompt ? ensureString(obj.appendSystemPrompt) : undefined,
    allowedTools: obj.allowedTools ? ensureStringArray(obj.allowedTools) : undefined,
    disallowedTools: obj.disallowedTools ? ensureStringArray(obj.disallowedTools) : undefined,
    permissionMode: obj.permissionMode ? ensureString(obj.permissionMode) : undefined,
    outputFormat: obj.outputFormat ? ensureString(obj.outputFormat) as ClaudeCliFlags['outputFormat'] : undefined,
    resume: obj.resume ? ensureBoolean(obj.resume) : undefined,
    resumeSession: obj.resumeSession ? ensureString(obj.resumeSession) : undefined,
    dangerouslySkipPermissions: obj.dangerouslySkipPermissions ? ensureBoolean(obj.dangerouslySkipPermissions) : undefined,
    addDir: obj.addDir ? ensureStringArray(obj.addDir) : undefined,
    verbose: obj.verbose ? ensureBoolean(obj.verbose) : undefined,
  };
}

/**
 * Validate and normalize a task variable
 */
function validateVariable(raw: unknown): TaskVariable | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const obj = raw as Record<string, unknown>;
  const name = ensureString(obj.name);
  if (!name) return null;

  return {
    name,
    description: obj.description ? ensureString(obj.description) : undefined,
    defaultValue: obj.defaultValue ? ensureString(obj.defaultValue) : undefined,
    required: ensureBoolean(obj.required, false),
  };
}

/**
 * Validate and normalize a task command
 */
function validateCommand(raw: unknown): TaskCommand | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const obj = raw as Record<string, unknown>;
  const command = ensureString(obj.command);
  if (!command) return null;

  return {
    id: ensureString(obj.id) || generateId(),
    command,
    description: obj.description ? ensureString(obj.description) : undefined,
    continueOnFail: obj.continueOnFail ? ensureBoolean(obj.continueOnFail) : undefined,
  };
}

/**
 * Validate and normalize a task template
 */
function validateTemplate(raw: unknown): TaskTemplate | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const obj = raw as Record<string, unknown>;
  const name = ensureString(obj.name);
  if (!name) return null;

  const now = new Date().toISOString();

  return {
    id: ensureString(obj.id) || generateId(),
    name,
    description: obj.description ? ensureString(obj.description) : undefined,
    icon: obj.icon ? ensureString(obj.icon) : 'Sparkles',
    color: obj.color ? ensureString(obj.color) : '#4ec5ff',
    prompt: ensureString(obj.prompt),
    cliFlags: validateCliFlags(obj.cliFlags),
    workingDirectory: obj.workingDirectory ? ensureString(obj.workingDirectory) : undefined,
    variables: ensureArray(obj.variables, validateVariable),
    preCommands: ensureArray(obj.preCommands, validateCommand),
    postCommands: ensureArray(obj.postCommands, validateCommand),
    createdAt: ensureString(obj.createdAt) || now,
    updatedAt: ensureString(obj.updatedAt) || now,
    tags: obj.tags ? ensureStringArray(obj.tags) : undefined,
  };
}

/**
 * Validate and normalize a queue item
 */
function validateQueueItem(raw: unknown): QueueItem | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const obj = raw as Record<string, unknown>;
  const templateId = ensureString(obj.templateId);
  if (!templateId) return null;

  return {
    id: ensureString(obj.id) || generateId(),
    templateId,
    variables: typeof obj.variables === 'object' && obj.variables !== null
      ? Object.fromEntries(
          Object.entries(obj.variables as Record<string, unknown>)
            .filter(([, v]) => typeof v === 'string')
            .map(([k, v]) => [k, v as string])
        )
      : {},
    addedAt: ensureString(obj.addedAt) || new Date().toISOString(),
  };
}

/**
 * Validate and normalize a task execution (history item)
 */
function validateExecution(raw: unknown): TaskExecution | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const obj = raw as Record<string, unknown>;
  const templateId = ensureString(obj.templateId);
  if (!templateId) return null;

  return {
    id: ensureString(obj.id) || generateId(),
    templateId,
    templateName: ensureString(obj.templateName) || 'Unknown Task',
    resolvedVariables: typeof obj.resolvedVariables === 'object' && obj.resolvedVariables !== null
      ? Object.fromEntries(
          Object.entries(obj.resolvedVariables as Record<string, unknown>)
            .filter(([, v]) => typeof v === 'string')
            .map(([k, v]) => [k, v as string])
        )
      : {},
    resolvedPrompt: ensureString(obj.resolvedPrompt),
    fullCommand: ensureString(obj.fullCommand),
    status: ensureString(obj.status, 'completed') as TaskExecution['status'],
    terminalSessionId: obj.terminalSessionId ? ensureString(obj.terminalSessionId) : undefined,
    preCommandResults: Array.isArray(obj.preCommandResults) ? obj.preCommandResults : [],
    postCommandResults: Array.isArray(obj.postCommandResults) ? obj.postCommandResults : [],
    claudeOutput: obj.claudeOutput ? ensureString(obj.claudeOutput) : undefined,
    exitCode: obj.exitCode !== undefined ? ensureNumber(obj.exitCode, 0) : undefined,
    errorMessage: obj.errorMessage ? ensureString(obj.errorMessage) : undefined,
    startedAt: ensureString(obj.startedAt) || new Date().toISOString(),
    completedAt: obj.completedAt ? ensureString(obj.completedAt) : undefined,
  };
}

/**
 * Validate and normalize workspace data
 * Returns a valid AgentWorkspace object
 */
export function validateWorkspace(raw: unknown, fallbackName = 'New Workspace'): AgentWorkspace {
  if (typeof raw !== 'object' || raw === null) {
    return {
      name: fallbackName,
      version: '1.0',
      templates: [...DEFAULT_TEMPLATES],
      queue: [],
      history: [],
      historyLimit: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const obj = raw as Record<string, unknown>;
  const now = new Date().toISOString();

  return {
    name: ensureString(obj.name) || fallbackName,
    description: obj.description ? ensureString(obj.description) : undefined,
    version: '1.0',
    templates: ensureArray(obj.templates, validateTemplate),
    queue: ensureArray(obj.queue, validateQueueItem),
    history: ensureArray(obj.history, validateExecution),
    historyLimit: obj.historyLimit ? ensureNumber(obj.historyLimit, 100) : 100,
    createdAt: ensureString(obj.createdAt) || now,
    updatedAt: ensureString(obj.updatedAt) || now,
  };
}

/**
 * Check if a file path matches the .agents or AGENTS_*.json pattern
 */
export function isAgentWorkspaceFile(path: string): boolean {
  const name = path.split('/').pop()?.toLowerCase() || '';
  return name.endsWith('.agents') || (name.startsWith('agents_') && name.endsWith('.json'));
}
