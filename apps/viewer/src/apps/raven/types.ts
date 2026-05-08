/**
 * Raven App Types
 */

export type RavenStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
export type VisualMode = 'camera' | 'screen' | 'none';

export interface RavenState {
  status: RavenStatus;
  pid?: number;
  visualMode: VisualMode;
  startedAt?: string;
  error?: string;
}

export interface TranscriptEntry {
  id: string;
  timestamp: string;
  speaker: 'user' | 'raven' | 'system';
  text: string;
}

export interface FunctionLog {
  id: string;
  timestamp: string;
  functionName: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  durationMs?: number;
  callId?: string;
}

export interface Memory {
  id: string;
  text: string;
  tags: string[];
  created_at: string;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  enabled: boolean;
  isBuiltIn: boolean;
  filePath?: string;
  parameters: ToolParameter[];
}

export interface AudioDevice {
  index: number;
  name: string;
  isInput: boolean;
  isOutput: boolean;
}

export interface AudioDeviceConfig {
  input: number | string | null;
  output: number | string | null;
}

export interface RavenConfig {
  model?: string;
  voice_name?: string;
  allowed_apps?: string[];
  audio_input_device?: number | string | null;
  audio_output_device?: number | string | null;
}

export interface PromptsConfig {
  voice_assistant?: {
    system_instruction?: string;
    function_descriptions?: Record<string, string>;
  };
  cerebras?: {
    system_instruction?: string;
  };
}

export type Section = 'dashboard' | 'transcripts' | 'function-logs' | 'memories' | 'tools' | 'settings';
