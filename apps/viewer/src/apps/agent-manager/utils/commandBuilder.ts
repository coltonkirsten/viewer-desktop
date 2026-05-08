/**
 * Command Builder
 * Builds Claude CLI commands from task templates
 */

import type { TaskTemplate, ClaudeCliFlags } from '../types';
import { resolveVariables } from './variableResolver';

/**
 * Escape a string for safe shell usage
 * Uses single quotes and escapes internal single quotes
 */
export function escapeShellArg(arg: string): string {
  // If the string is simple (alphanumeric, dashes, underscores, dots, slashes), no quotes needed
  if (/^[\w./-]+$/.test(arg)) {
    return arg;
  }
  // Otherwise, wrap in single quotes and escape any internal single quotes
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Build CLI flags array from configuration
 */
export function buildFlagsArray(flags: ClaudeCliFlags): string[] {
  const parts: string[] = [];

  // Print mode
  if (flags.print) {
    parts.push('-p');
  }

  // Model
  if (flags.model) {
    parts.push('--model', flags.model);
  }

  // Max turns
  if (flags.maxTurns !== undefined && flags.maxTurns > 0) {
    parts.push('--max-turns', String(flags.maxTurns));
  }

  // System prompts
  if (flags.systemPrompt) {
    parts.push('--system-prompt', escapeShellArg(flags.systemPrompt));
  }
  if (flags.appendSystemPrompt) {
    parts.push('--append-system-prompt', escapeShellArg(flags.appendSystemPrompt));
  }

  // Tools
  if (flags.allowedTools && flags.allowedTools.length > 0) {
    parts.push('--allowedTools', flags.allowedTools.join(','));
  }
  if (flags.disallowedTools && flags.disallowedTools.length > 0) {
    parts.push('--disallowedTools', flags.disallowedTools.join(','));
  }

  // Permission mode
  if (flags.permissionMode && flags.permissionMode !== 'default') {
    parts.push('--permission-mode', flags.permissionMode);
  }

  // Output format
  if (flags.outputFormat && flags.outputFormat !== 'text') {
    parts.push('--output-format', flags.outputFormat);
  }

  // Resume
  if (flags.resume) {
    parts.push('-c');
  }
  if (flags.resumeSession) {
    parts.push('-r', escapeShellArg(flags.resumeSession));
  }

  // Dangerous skip permissions
  if (flags.dangerouslySkipPermissions) {
    parts.push('--dangerously-skip-permissions');
  }

  // Add directories
  if (flags.addDir && flags.addDir.length > 0) {
    for (const dir of flags.addDir) {
      parts.push('--add-dir', escapeShellArg(dir));
    }
  }

  // Verbose
  if (flags.verbose) {
    parts.push('--verbose');
  }

  return parts;
}

/**
 * Build the complete Claude CLI command from a template
 */
export function buildClaudeCommand(
  template: TaskTemplate,
  variables: Record<string, string>
): { command: string; resolvedPrompt: string } {
  // Resolve variables in the prompt
  const resolvedPrompt = resolveVariables(template.prompt, variables);

  // Build the command parts
  const parts: string[] = ['claude'];

  // Add all flags
  parts.push(...buildFlagsArray(template.cliFlags));

  // Add the prompt as the final argument
  parts.push(escapeShellArg(resolvedPrompt));

  return {
    command: parts.join(' '),
    resolvedPrompt,
  };
}

/**
 * Build a pre/post command with variable resolution
 */
export function buildShellCommand(
  command: string,
  variables: Record<string, string>
): string {
  return resolveVariables(command, variables);
}

/**
 * Format a command for display (truncate long prompts)
 */
export function formatCommandForDisplay(command: string, maxLength = 100): string {
  if (command.length <= maxLength) {
    return command;
  }
  return command.substring(0, maxLength - 3) + '...';
}
