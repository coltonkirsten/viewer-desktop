/**
 * Agent Manager Constants
 * Default templates and values
 */

import type { TaskTemplate, AgentWorkspace } from './types';

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Pre-made task templates included with new workspaces
 */
export const DEFAULT_TEMPLATES: TaskTemplate[] = [
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Review code for bugs, security issues, and improvements',
    icon: 'Search',
    color: '#4ec5ff',
    prompt: 'Review the following file for bugs, security issues, and potential improvements: {{filepath}}',
    cliFlags: {
      print: true,
      model: 'sonnet',
      maxTurns: 5,
    },
    variables: [
      {
        name: 'filepath',
        description: 'Path to the file to review',
        required: true,
      },
    ],
    preCommands: [],
    postCommands: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['review', 'quality'],
  },
  {
    id: 'test-runner',
    name: 'Test Runner',
    description: 'Run tests and fix any failures found',
    icon: 'TestTube',
    color: '#6de3b6',
    prompt: 'Run the test suite. If any tests fail, analyze the failures and fix them.',
    cliFlags: {
      print: false,
      model: 'sonnet',
      maxTurns: 15,
    },
    variables: [],
    preCommands: [
      {
        id: 'pre-1',
        command: 'git stash',
        description: 'Stash uncommitted changes',
      },
    ],
    postCommands: [
      {
        id: 'post-1',
        command: 'git stash pop',
        description: 'Restore stashed changes',
        continueOnFail: true,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['testing', 'fix'],
  },
  {
    id: 'task-creator',
    name: 'Task Creator',
    description: 'Meta-task: Create a new agent task template',
    icon: 'Wand',
    color: '#f5c76b',
    prompt: `Create a detailed task template for the following task: {{description}}

The template should include:
- An appropriate name and description
- The main prompt with any necessary variable placeholders using {{variableName}} syntax
- Appropriate CLI flags (model, maxTurns, print mode, etc.)
- Any useful pre-commands or post-commands
- Variable definitions with descriptions

Output the template as a JSON object that matches this structure:
{
  "name": "...",
  "description": "...",
  "prompt": "...",
  "cliFlags": { ... },
  "variables": [ ... ],
  "preCommands": [ ... ],
  "postCommands": [ ... ]
}`,
    cliFlags: {
      print: true,
      model: 'opus',
    },
    variables: [
      {
        name: 'description',
        description: 'Description of the task you want to create',
        required: true,
      },
    ],
    preCommands: [],
    postCommands: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['meta', 'automation'],
  },
];

/**
 * Create a new empty workspace
 */
export function createEmptyWorkspace(name: string): AgentWorkspace {
  const now = new Date().toISOString();
  return {
    name,
    description: '',
    version: '1.0',
    templates: [...DEFAULT_TEMPLATES],
    queue: [],
    history: [],
    historyLimit: 100,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a new empty template
 */
export function createEmptyTemplate(): TaskTemplate {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: 'New Task',
    description: '',
    icon: 'Sparkles',
    color: '#4ec5ff',
    prompt: '',
    cliFlags: {
      print: true,
      model: 'sonnet',
      maxTurns: 10,
    },
    variables: [],
    preCommands: [],
    postCommands: [],
    createdAt: now,
    updatedAt: now,
    tags: [],
  };
}

/**
 * Available Lucide icons for task templates
 */
export const TEMPLATE_ICONS = [
  'Sparkles',
  'Search',
  'TestTube',
  'Wand',
  'Bot',
  'Code',
  'FileCode',
  'GitBranch',
  'Bug',
  'Hammer',
  'Wrench',
  'Rocket',
  'Zap',
  'Terminal',
  'Database',
  'Server',
  'Cloud',
  'Shield',
  'Lock',
  'Eye',
] as const;

/**
 * Available colors for task templates
 */
export const TEMPLATE_COLORS = [
  '#4ec5ff', // Cyan (default)
  '#6de3b6', // Green
  '#f5c76b', // Yellow
  '#ff6b9d', // Pink
  '#a78bfa', // Purple
  '#fb923c', // Orange
  '#ef4444', // Red
  '#94a3b8', // Gray
] as const;

/**
 * Available models
 */
export const AVAILABLE_MODELS = [
  { value: 'sonnet', label: 'Sonnet (Fast)' },
  { value: 'opus', label: 'Opus (Powerful)' },
  { value: 'haiku', label: 'Haiku (Quick)' },
] as const;

/**
 * Permission modes
 */
export const PERMISSION_MODES = [
  { value: 'default', label: 'Default' },
  { value: 'strict', label: 'Strict' },
] as const;

/**
 * Output formats
 */
export const OUTPUT_FORMATS = [
  { value: 'text', label: 'Text' },
  { value: 'json', label: 'JSON' },
  { value: 'stream-json', label: 'Stream JSON' },
] as const;
