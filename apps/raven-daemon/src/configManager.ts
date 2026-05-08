/**
 * Config Manager
 * Handles reading/writing Raven configuration files
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { RavenConfig, PromptsConfig, AudioDeviceConfig } from './types';

const RAVEN_DIR = path.join(os.homedir(), '.raven');
const CONFIG_FILE = path.join(RAVEN_DIR, 'config.json');
const PROMPTS_FILE = path.join(RAVEN_DIR, 'prompts.json');

const DEFAULT_ALLOWED_APPS = [
  'Chrome',
  'Safari',
  'Firefox',
  'Arc',
  'Visual Studio Code',
  'Code',
  'Slack',
  'Spotify',
  'Finder',
  'Notes',
  'Calendar',
  'Messages',
  'Mail',
  'Discord',
  'Notion',
  'Obsidian',
  'Terminal',
  'iTerm',
];

export class ConfigManager {
  constructor() {
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(RAVEN_DIR)) {
      fs.mkdirSync(RAVEN_DIR, { recursive: true });
    }
  }

  /**
   * Get the full configuration
   */
  async getConfig(): Promise<RavenConfig> {
    try {
      if (!fs.existsSync(CONFIG_FILE)) {
        return {
          allowed_apps: DEFAULT_ALLOWED_APPS,
        };
      }

      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(content) as RavenConfig;

      // Ensure allowed_apps has defaults if not set
      if (!config.allowed_apps) {
        config.allowed_apps = DEFAULT_ALLOWED_APPS;
      }

      return config;
    } catch (error) {
      console.error('Error reading config file:', error);
      return {
        allowed_apps: DEFAULT_ALLOWED_APPS,
      };
    }
  }

  /**
   * Update configuration (deep merge)
   */
  async updateConfig(updates: Partial<RavenConfig>): Promise<RavenConfig> {
    const current = await this.getConfig();
    const merged = { ...current, ...updates };

    this.ensureDirectory();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');

    return merged;
  }

  /**
   * Get prompts configuration
   */
  async getPrompts(): Promise<PromptsConfig> {
    try {
      if (!fs.existsSync(PROMPTS_FILE)) {
        return {};
      }

      const content = fs.readFileSync(PROMPTS_FILE, 'utf-8');
      return JSON.parse(content) as PromptsConfig;
    } catch (error) {
      console.error('Error reading prompts file:', error);
      return {};
    }
  }

  /**
   * Update prompts configuration (deep merge)
   */
  async updatePrompts(updates: Partial<PromptsConfig>): Promise<PromptsConfig> {
    const current = await this.getPrompts();

    // Deep merge for nested objects
    const merged: PromptsConfig = { ...current };

    if (updates.voice_assistant) {
      merged.voice_assistant = {
        ...current.voice_assistant,
        ...updates.voice_assistant,
      };
    }

    if (updates.cerebras) {
      merged.cerebras = {
        ...current.cerebras,
        ...updates.cerebras,
      };
    }

    this.ensureDirectory();
    fs.writeFileSync(PROMPTS_FILE, JSON.stringify(merged, null, 2), 'utf-8');

    return merged;
  }

  /**
   * Get allowed apps list
   */
  async getAllowedApps(): Promise<string[]> {
    const config = await this.getConfig();
    return config.allowed_apps || DEFAULT_ALLOWED_APPS;
  }

  /**
   * Set allowed apps list
   */
  async setAllowedApps(apps: string[]): Promise<void> {
    await this.updateConfig({ allowed_apps: apps });
  }

  /**
   * Get audio device configuration
   */
  async getAudioDeviceConfig(): Promise<AudioDeviceConfig> {
    const config = await this.getConfig();
    return {
      input: config.audio_input_device ?? null,
      output: config.audio_output_device ?? null,
    };
  }

  /**
   * Set audio device configuration
   */
  async setAudioDeviceConfig(
    input: number | string | null,
    output: number | string | null
  ): Promise<AudioDeviceConfig> {
    await this.updateConfig({
      audio_input_device: input,
      audio_output_device: output,
    });
    return { input, output };
  }

  /**
   * Get the Raven directory path
   */
  getRavenDir(): string {
    return RAVEN_DIR;
  }
}
