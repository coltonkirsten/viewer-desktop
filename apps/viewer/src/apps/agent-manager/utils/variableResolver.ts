/**
 * Variable Resolver
 * Resolves {{variable}} placeholders in strings
 */

/**
 * Regex to match {{variableName}} placeholders
 */
const VARIABLE_REGEX = /\{\{(\w+)\}\}/g;

/**
 * Extract all variable names from a string
 */
export function extractVariables(text: string): string[] {
  const matches = text.matchAll(VARIABLE_REGEX);
  const variables = new Set<string>();
  for (const match of matches) {
    variables.add(match[1]);
  }
  return Array.from(variables);
}

/**
 * Resolve variables in a string with provided values
 */
export function resolveVariables(
  text: string,
  variables: Record<string, string>
): string {
  return text.replace(VARIABLE_REGEX, (match, name) => {
    if (name in variables) {
      return variables[name];
    }
    // Keep the placeholder if no value provided
    return match;
  });
}

/**
 * Get built-in variables with their current values
 */
export function getBuiltInVariables(): Record<string, string> {
  const now = new Date();
  return {
    timestamp: now.toISOString(),
    date: now.toISOString().split('T')[0],
  };
}

/**
 * Check if all required variables have values
 */
export function validateVariables(
  text: string,
  variables: Record<string, string>,
  requiredVariables: string[]
): { valid: boolean; missing: string[] } {
  const usedVariables = extractVariables(text);
  const missing: string[] = [];

  for (const name of usedVariables) {
    if (requiredVariables.includes(name) && !variables[name]) {
      missing.push(name);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Merge user variables with built-in variables
 * User variables take precedence
 */
export function mergeVariables(
  userVariables: Record<string, string>,
  workspaceRoot?: string
): Record<string, string> {
  const builtIn = getBuiltInVariables();

  if (workspaceRoot) {
    builtIn.workspaceRoot = workspaceRoot;
  }

  return {
    ...builtIn,
    ...userVariables,
  };
}
