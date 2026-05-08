/**
 * Raven Daemon Types
 */

// Raven process status
export type RavenStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

// Visual mode options
export type VisualMode = 'camera' | 'screen' | 'none';

// Raven state
export interface RavenState {
  status: RavenStatus;
  pid?: number;
  visualMode: VisualMode;
  startedAt?: string;
  error?: string;
}

// Transcript entry (from Raven stdout)
export interface TranscriptEntry {
  id: string;
  timestamp: string;
  speaker: 'user' | 'raven' | 'system';
  text: string;
}

// Function call log
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

// Memory/Note
export interface Memory {
  id: string;
  text: string;
  tags: string[];
  created_at: string;
}

// Notes file structure
export interface NotesFile {
  notes: Memory[];
}

// Tool parameter
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
}

// Tool definition
export interface ToolDefinition {
  name: string;
  description: string;
  enabled: boolean;
  isBuiltIn: boolean;
  filePath?: string;
  parameters: ToolParameter[];
}

// Tools config file structure
export interface ToolsConfig {
  disabled: string[];
  custom: CustomToolConfig[];
}

export interface CustomToolConfig {
  name: string;
  description: string;
  parameters: ToolParameter[];
  enabled: boolean;
}

// Audio device info
export interface AudioDevice {
  index: number;
  name: string;
  isInput: boolean;
  isOutput: boolean;
}

// Audio device configuration
export interface AudioDeviceConfig {
  input: number | string | null;
  output: number | string | null;
}

// Raven configuration
export interface RavenConfig {
  model?: string;
  voice_name?: string;
  allowed_apps?: string[];
  audio_input_device?: number | string | null;
  audio_output_device?: number | string | null;
}

// Prompts configuration
export interface PromptsConfig {
  voice_assistant?: {
    system_instruction?: string;
    function_descriptions?: Record<string, string>;
  };
  cerebras?: {
    system_instruction?: string;
  };
}

// JSON log events from Raven Python
export type RavenLogEvent =
  | { type: 'status'; timestamp: string; status: string; mode?: string; model?: string; voice?: string }
  | { type: 'transcript'; timestamp: string; speaker: string; text: string }
  | { type: 'function_call'; timestamp: string; name: string; args: Record<string, unknown>; call_id?: string }
  | { type: 'function_result'; timestamp: string; name: string; result: Record<string, unknown>; duration_ms?: number; call_id?: string }
  | { type: 'function_error'; timestamp: string; name: string; error: string; call_id?: string }
  | { type: 'mode_change'; timestamp: string; old_mode: string; new_mode: string }
  | { type: 'error'; timestamp: string; message: string; errors?: string[] };

// WebSocket client message
export type ClientMessage =
  | { type: 'subscribe'; channel: 'transcripts' | 'function-logs' | 'status' | 'all' }
  | { type: 'unsubscribe'; channel: string };

// WebSocket server message
export type ServerMessage =
  | { type: 'status'; state: RavenState }
  | { type: 'transcript'; entry: TranscriptEntry }
  | { type: 'function-log'; entry: FunctionLog }
  | { type: 'error'; message: string };

// HTTP API request/response types
export interface StartRequest {
  mode?: VisualMode;
}

export interface SetModeRequest {
  mode: VisualMode;
}

export interface CreateMemoryRequest {
  text: string;
  tags?: string[];
}

export interface UpdateMemoryRequest {
  text?: string;
  tags?: string[];
}

export interface SearchMemoryRequest {
  query: string;
}

export interface CreateToolRequest {
  name: string;
  description: string;
  parameters: ToolParameter[];
  code?: string;
}

export interface UpdateToolRequest {
  description?: string;
  parameters?: ToolParameter[];
  enabled?: boolean;
  code?: string;
}

export interface HealthResponse {
  status: 'ok';
  ravenStatus: RavenStatus;
  uptime: number;
}
