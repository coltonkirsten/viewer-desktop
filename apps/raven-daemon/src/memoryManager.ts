/**
 * Memory Manager
 * Handles CRUD operations for Raven's memory/notes system
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import type { Memory, NotesFile } from './types';

const RAVEN_DIR = path.join(os.homedir(), '.raven');
const NOTES_FILE = path.join(RAVEN_DIR, 'notes.json');

export class MemoryManager {
  private notesCache: Memory[] | null = null;

  constructor() {
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(RAVEN_DIR)) {
      fs.mkdirSync(RAVEN_DIR, { recursive: true });
    }
  }

  private readNotes(): Memory[] {
    if (this.notesCache !== null) {
      return this.notesCache;
    }

    try {
      if (!fs.existsSync(NOTES_FILE)) {
        this.notesCache = [];
        return [];
      }

      const content = fs.readFileSync(NOTES_FILE, 'utf-8');
      const data: NotesFile = JSON.parse(content);
      this.notesCache = data.notes || [];
      return this.notesCache;
    } catch (error) {
      console.error('Error reading notes file:', error);
      this.notesCache = [];
      return [];
    }
  }

  private writeNotes(notes: Memory[]): void {
    try {
      this.ensureDirectory();
      const data: NotesFile = { notes };
      fs.writeFileSync(NOTES_FILE, JSON.stringify(data, null, 2), 'utf-8');
      this.notesCache = notes;
    } catch (error) {
      console.error('Error writing notes file:', error);
      throw error;
    }
  }

  /**
   * List all memories
   */
  async list(): Promise<Memory[]> {
    const notes = this.readNotes();
    // Return sorted by created_at, newest first
    return [...notes].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Get a single memory by ID
   */
  async get(id: string): Promise<Memory | null> {
    const notes = this.readNotes();
    return notes.find(n => n.id === id) || null;
  }

  /**
   * Create a new memory
   */
  async create(text: string, tags: string[] = []): Promise<Memory> {
    const notes = this.readNotes();

    const memory: Memory = {
      id: uuidv4().slice(0, 8),
      text,
      tags,
      created_at: new Date().toISOString(),
    };

    notes.unshift(memory);
    this.writeNotes(notes);

    return memory;
  }

  /**
   * Update an existing memory
   */
  async update(id: string, updates: { text?: string; tags?: string[] }): Promise<Memory | null> {
    const notes = this.readNotes();
    const index = notes.findIndex(n => n.id === id);

    if (index === -1) {
      return null;
    }

    const memory = notes[index];
    if (updates.text !== undefined) {
      memory.text = updates.text;
    }
    if (updates.tags !== undefined) {
      memory.tags = updates.tags;
    }

    notes[index] = memory;
    this.writeNotes(notes);

    return memory;
  }

  /**
   * Delete a memory by ID
   */
  async delete(id: string): Promise<boolean> {
    const notes = this.readNotes();
    const initialLength = notes.length;
    const filtered = notes.filter(n => n.id !== id);

    if (filtered.length === initialLength) {
      return false;
    }

    this.writeNotes(filtered);
    return true;
  }

  /**
   * Search memories by query (text and tags)
   */
  async search(query: string): Promise<Memory[]> {
    const notes = this.readNotes();
    const lowerQuery = query.toLowerCase();

    return notes.filter(n =>
      n.text.toLowerCase().includes(lowerQuery) ||
      n.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    ).sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Get total count of memories
   */
  async count(): Promise<number> {
    return this.readNotes().length;
  }

  /**
   * Invalidate cache (force re-read from disk)
   */
  invalidateCache(): void {
    this.notesCache = null;
  }
}
