/**
 * useTools Hook
 * Manages tool CRUD operations
 */

import { useState, useEffect, useCallback } from 'react';
import type { ToolDefinition, ToolParameter } from '../types';

export function useTools() {
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const { tools: toolList } = await window.electron.raven.tool.list();
      setTools(toolList);
    } catch (error) {
      console.error('Failed to load tools:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (tool: {
      name: string;
      description: string;
      parameters: ToolParameter[];
      code?: string;
    }) => {
      try {
        const newTool = await window.electron.raven.tool.create(tool);
        setTools((prev) => [...prev, newTool]);
        return newTool;
      } catch (error) {
        console.error('Failed to create tool:', error);
        throw error;
      }
    },
    []
  );

  const update = useCallback(
    async (
      name: string,
      updates: {
        description?: string;
        parameters?: ToolParameter[];
        enabled?: boolean;
        code?: string;
      }
    ) => {
      try {
        const tool = await window.electron.raven.tool.update(name, updates);
        setTools((prev) => prev.map((t) => (t.name === name ? tool : t)));
        return tool;
      } catch (error) {
        console.error('Failed to update tool:', error);
        throw error;
      }
    },
    []
  );

  const remove = useCallback(async (name: string) => {
    try {
      await window.electron.raven.tool.delete(name);
      setTools((prev) => prev.filter((t) => t.name !== name));
    } catch (error) {
      console.error('Failed to delete tool:', error);
      throw error;
    }
  }, []);

  const setEnabled = useCallback(async (name: string, enabled: boolean) => {
    try {
      await window.electron.raven.tool.setEnabled(name, enabled);
      setTools((prev) =>
        prev.map((t) => (t.name === name ? { ...t, enabled } : t))
      );
    } catch (error) {
      console.error('Failed to toggle tool:', error);
      throw error;
    }
  }, []);

  const builtInTools = tools.filter((t) => t.isBuiltIn);
  const customTools = tools.filter((t) => !t.isBuiltIn);

  return {
    tools,
    builtInTools,
    customTools,
    isLoading,
    create,
    update,
    remove,
    setEnabled,
    refresh,
  };
}
