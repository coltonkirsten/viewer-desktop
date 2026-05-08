/**
 * useMemories Hook
 * Manages memory/notes CRUD operations
 */

import { useState, useEffect, useCallback } from 'react';
import type { Memory } from '../types';

export function useMemories() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = searchQuery
        ? await window.electron.raven.memory.search(searchQuery)
        : await window.electron.raven.memory.list();
      setMemories(result.memories);
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (text: string, tags?: string[]) => {
    try {
      const memory = await window.electron.raven.memory.create(text, tags);
      setMemories((prev) => [memory, ...prev]);
      return memory;
    } catch (error) {
      console.error('Failed to create memory:', error);
      throw error;
    }
  }, []);

  const update = useCallback(async (id: string, data: { text?: string; tags?: string[] }) => {
    try {
      const memory = await window.electron.raven.memory.update(id, data);
      setMemories((prev) => prev.map((m) => (m.id === id ? memory : m)));
      return memory;
    } catch (error) {
      console.error('Failed to update memory:', error);
      throw error;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await window.electron.raven.memory.delete(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (error) {
      console.error('Failed to delete memory:', error);
      throw error;
    }
  }, []);

  return {
    memories,
    isLoading,
    searchQuery,
    setSearchQuery,
    create,
    update,
    remove,
    refresh,
  };
}
