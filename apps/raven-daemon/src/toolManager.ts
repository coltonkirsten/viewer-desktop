/**
 * Tool Manager
 * Handles CRUD operations for Raven tools (built-in and custom)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { ToolDefinition, ToolParameter, ToolsConfig, CustomToolConfig } from './types';

const RAVEN_DIR = path.join(os.homedir(), '.raven');
const TOOLS_CONFIG_FILE = path.join(RAVEN_DIR, 'tools.json');
const CUSTOM_TOOLS_DIR = path.join(RAVEN_DIR, 'custom_tools');

// Built-in tools from Raven Python
const BUILT_IN_TOOLS: ToolDefinition[] = [
  {
    name: 'get_current_time',
    description: 'Get the current date and time',
    enabled: true,
    isBuiltIn: true,
    parameters: [],
  },
  {
    name: 'remember_note',
    description: 'Store a note in memory for later retrieval',
    enabled: true,
    isBuiltIn: true,
    parameters: [
      { name: 'text', type: 'string', description: 'The note text to remember', required: true },
      { name: 'tags', type: 'array', description: 'Optional tags for categorization', required: false },
    ],
  },
  {
    name: 'search_notes',
    description: 'Search through stored notes',
    enabled: true,
    isBuiltIn: true,
    parameters: [
      { name: 'query', type: 'string', description: 'Search query', required: true },
    ],
  },
  {
    name: 'list_notes',
    description: 'List recent notes',
    enabled: true,
    isBuiltIn: true,
    parameters: [
      { name: 'limit', type: 'number', description: 'Maximum number of notes to return', required: false },
    ],
  },
  {
    name: 'delete_note',
    description: 'Delete a note by ID',
    enabled: true,
    isBuiltIn: true,
    parameters: [
      { name: 'note_id', type: 'string', description: 'The ID of the note to delete', required: true },
    ],
  },
  {
    name: 'open_url',
    description: 'Open a URL in the default browser',
    enabled: true,
    isBuiltIn: true,
    parameters: [
      { name: 'url', type: 'string', description: 'The URL to open', required: true },
    ],
  },
  {
    name: 'open_app',
    description: 'Open an application (macOS only, whitelisted apps)',
    enabled: true,
    isBuiltIn: true,
    parameters: [
      { name: 'app_name', type: 'string', description: 'Name of the app to open', required: true },
    ],
  },
  {
    name: 'set_visual_mode',
    description: 'Switch between camera, screen capture, or no visual input',
    enabled: true,
    isBuiltIn: true,
    parameters: [
      { name: 'mode', type: 'string', description: 'Visual mode: camera, screen, or none', required: true },
    ],
  },
  {
    name: 'call_cerebra',
    description: 'Generate HTML/UI content via Cerebras AI',
    enabled: true,
    isBuiltIn: true,
    parameters: [
      { name: 'prompt', type: 'string', description: 'Prompt for HTML generation', required: true },
      { name: 'update_frontend', type: 'boolean', description: 'Whether to push to frontend', required: false },
    ],
  },
  {
    name: 'no_response',
    description: 'Allow Raven to stay silent when not directly addressed',
    enabled: true,
    isBuiltIn: true,
    parameters: [],
  },
];

export class ToolManager {
  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(RAVEN_DIR)) {
      fs.mkdirSync(RAVEN_DIR, { recursive: true });
    }
    if (!fs.existsSync(CUSTOM_TOOLS_DIR)) {
      fs.mkdirSync(CUSTOM_TOOLS_DIR, { recursive: true });
    }
  }

  private readToolsConfig(): ToolsConfig {
    try {
      if (!fs.existsSync(TOOLS_CONFIG_FILE)) {
        return { disabled: [], custom: [] };
      }

      const content = fs.readFileSync(TOOLS_CONFIG_FILE, 'utf-8');
      return JSON.parse(content) as ToolsConfig;
    } catch (error) {
      console.error('Error reading tools config:', error);
      return { disabled: [], custom: [] };
    }
  }

  private writeToolsConfig(config: ToolsConfig): void {
    this.ensureDirectories();
    fs.writeFileSync(TOOLS_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  }

  /**
   * List all tools (built-in and custom)
   */
  async listAll(): Promise<ToolDefinition[]> {
    const config = this.readToolsConfig();
    const disabledSet = new Set(config.disabled);

    // Built-in tools with enabled/disabled state
    const builtIn = BUILT_IN_TOOLS.map(tool => ({
      ...tool,
      enabled: !disabledSet.has(tool.name),
    }));

    // Custom tools
    const custom = config.custom.map(ct => ({
      name: ct.name,
      description: ct.description,
      enabled: ct.enabled,
      isBuiltIn: false,
      filePath: path.join(CUSTOM_TOOLS_DIR, `${ct.name}.py`),
      parameters: ct.parameters,
    }));

    return [...builtIn, ...custom];
  }

  /**
   * Get a single tool by name
   */
  async get(name: string): Promise<ToolDefinition | null> {
    const tools = await this.listAll();
    return tools.find(t => t.name === name) || null;
  }

  /**
   * Create a custom tool
   */
  async create(tool: {
    name: string;
    description: string;
    parameters: ToolParameter[];
    code?: string;
  }): Promise<ToolDefinition> {
    const config = this.readToolsConfig();

    // Check if tool already exists
    const existingBuiltIn = BUILT_IN_TOOLS.find(t => t.name === tool.name);
    if (existingBuiltIn) {
      throw new Error(`Cannot create tool: ${tool.name} is a built-in tool`);
    }

    const existingCustom = config.custom.find(t => t.name === tool.name);
    if (existingCustom) {
      throw new Error(`Tool already exists: ${tool.name}`);
    }

    // Add to config
    const customTool: CustomToolConfig = {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      enabled: true,
    };
    config.custom.push(customTool);
    this.writeToolsConfig(config);

    // Write Python file if code provided
    if (tool.code) {
      const pyPath = path.join(CUSTOM_TOOLS_DIR, `${tool.name}.py`);
      fs.writeFileSync(pyPath, tool.code, 'utf-8');
    }

    return {
      name: tool.name,
      description: tool.description,
      enabled: true,
      isBuiltIn: false,
      filePath: path.join(CUSTOM_TOOLS_DIR, `${tool.name}.py`),
      parameters: tool.parameters,
    };
  }

  /**
   * Update a tool
   */
  async update(name: string, updates: {
    description?: string;
    parameters?: ToolParameter[];
    enabled?: boolean;
    code?: string;
  }): Promise<ToolDefinition | null> {
    const config = this.readToolsConfig();

    // Check if built-in tool
    const builtIn = BUILT_IN_TOOLS.find(t => t.name === name);
    if (builtIn) {
      // Only allow enabling/disabling built-in tools
      if (updates.enabled !== undefined) {
        if (updates.enabled) {
          config.disabled = config.disabled.filter(n => n !== name);
        } else {
          if (!config.disabled.includes(name)) {
            config.disabled.push(name);
          }
        }
        this.writeToolsConfig(config);
      }

      return {
        ...builtIn,
        enabled: updates.enabled !== undefined ? updates.enabled : !config.disabled.includes(name),
      };
    }

    // Update custom tool
    const customIndex = config.custom.findIndex(t => t.name === name);
    if (customIndex === -1) {
      return null;
    }

    const customTool = config.custom[customIndex];
    if (updates.description !== undefined) {
      customTool.description = updates.description;
    }
    if (updates.parameters !== undefined) {
      customTool.parameters = updates.parameters;
    }
    if (updates.enabled !== undefined) {
      customTool.enabled = updates.enabled;
    }

    config.custom[customIndex] = customTool;
    this.writeToolsConfig(config);

    // Update Python file if code provided
    if (updates.code !== undefined) {
      const pyPath = path.join(CUSTOM_TOOLS_DIR, `${name}.py`);
      fs.writeFileSync(pyPath, updates.code, 'utf-8');
    }

    return {
      name: customTool.name,
      description: customTool.description,
      enabled: customTool.enabled,
      isBuiltIn: false,
      filePath: path.join(CUSTOM_TOOLS_DIR, `${name}.py`),
      parameters: customTool.parameters,
    };
  }

  /**
   * Delete a custom tool
   */
  async delete(name: string): Promise<boolean> {
    // Cannot delete built-in tools
    const builtIn = BUILT_IN_TOOLS.find(t => t.name === name);
    if (builtIn) {
      throw new Error(`Cannot delete built-in tool: ${name}`);
    }

    const config = this.readToolsConfig();
    const initialLength = config.custom.length;
    config.custom = config.custom.filter(t => t.name !== name);

    if (config.custom.length === initialLength) {
      return false;
    }

    this.writeToolsConfig(config);

    // Delete Python file if exists
    const pyPath = path.join(CUSTOM_TOOLS_DIR, `${name}.py`);
    if (fs.existsSync(pyPath)) {
      fs.unlinkSync(pyPath);
    }

    return true;
  }

  /**
   * Enable or disable a tool
   */
  async setEnabled(name: string, enabled: boolean): Promise<void> {
    await this.update(name, { enabled });
  }

  /**
   * Get Python code for a custom tool
   */
  async getCode(name: string): Promise<string | null> {
    const pyPath = path.join(CUSTOM_TOOLS_DIR, `${name}.py`);
    if (!fs.existsSync(pyPath)) {
      return null;
    }
    return fs.readFileSync(pyPath, 'utf-8');
  }
}
