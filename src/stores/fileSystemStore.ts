import { create } from 'zustand';
import type { FileNode } from '../types';
import { soundEngine } from '../audio';

// Helper to immutably update a node in the tree
function updateTreeNode(
  tree: FileNode,
  targetPath: string,
  updater: (node: FileNode) => FileNode
): FileNode {
  if (tree.path === targetPath) {
    return updater(tree);
  }

  if (tree.children && targetPath.startsWith(tree.path + '/')) {
    return {
      ...tree,
      children: tree.children.map((child) =>
        updateTreeNode(child, targetPath, updater)
      ),
    };
  }

  return tree;
}

interface SelectOptions {
  shift?: boolean;
  meta?: boolean;
  visibleNodes?: FileNode[];  // Required for shift-select range
}

interface FileSystemStore {
  tree: FileNode | null;
  selectedPaths: Set<string>;
  lastSelectedPath: string | null;  // For shift-click range selection
  expandedDirs: Set<string>;
  loadedDirs: Set<string>;    // Directories whose children have been fetched
  loadingDirs: Set<string>;   // Directories currently being fetched
  rootDir: string;
  loading: boolean;
  error: string | null;
  showHidden: boolean;        // Whether to show hidden files/folders

  // Actions
  setTree: (tree: FileNode) => void;
  selectPath: (path: string | null, options?: SelectOptions) => void;
  selectPaths: (paths: string[]) => void;
  toggleSelection: (path: string) => void;
  clearSelection: () => void;
  toggleDir: (path: string) => void;
  expandDir: (path: string) => void;
  collapseDir: (path: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setRootDir: (rootDir: string) => void;
  setShowHidden: (show: boolean) => void;
  toggleShowHidden: () => void;
  refreshTree: () => Promise<void>;
  initRootDir: () => Promise<void>;

  // Lazy loading actions
  loadChildren: (path: string, options?: { skipPrefetch?: boolean }) => Promise<void>;
  insertChildren: (parentPath: string, children: FileNode[]) => void;
  prefetchGrandchildren: (parentPath: string) => void;
}

export const useFileSystemStore = create<FileSystemStore>((set, get) => ({
  tree: null,
  selectedPaths: new Set<string>(),
  lastSelectedPath: null,
  expandedDirs: new Set<string>(),
  loadedDirs: new Set<string>(),
  loadingDirs: new Set<string>(),
  rootDir: '',
  loading: false,
  error: null,
  showHidden: false,

  setTree: (tree) => {
    // When setting a new tree, mark the root as loaded (since depth 1 is included)
    set((state) => ({
      tree,
      loadedDirs: new Set([tree.path]),
      loadingDirs: new Set(),
    }));
  },

  selectPath: (path, options) => {
    soundEngine.playEvent('file:select');

    if (path === null) {
      set({ selectedPaths: new Set(), lastSelectedPath: null });
      return;
    }

    const { shift, meta, visibleNodes } = options || {};

    if (meta) {
      // Cmd/Ctrl+click: Toggle selection
      set((state) => {
        const newSelected = new Set(state.selectedPaths);
        if (newSelected.has(path)) {
          newSelected.delete(path);
        } else {
          newSelected.add(path);
        }
        return { selectedPaths: newSelected, lastSelectedPath: path };
      });
    } else if (shift && visibleNodes) {
      // Shift+click: Range select
      const { lastSelectedPath } = get();
      if (lastSelectedPath && visibleNodes.length > 0) {
        const startIdx = visibleNodes.findIndex(n => n.path === lastSelectedPath);
        const endIdx = visibleNodes.findIndex(n => n.path === path);

        if (startIdx !== -1 && endIdx !== -1) {
          const [min, max] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
          const rangePaths = visibleNodes.slice(min, max + 1).map(n => n.path);
          set((state) => ({
            selectedPaths: new Set([...state.selectedPaths, ...rangePaths]),
          }));
          return;
        }
      }
      // Fallback to single select if no valid range
      set({ selectedPaths: new Set([path]), lastSelectedPath: path });
    } else {
      // Plain click: Single select
      set({ selectedPaths: new Set([path]), lastSelectedPath: path });
    }
  },

  selectPaths: (paths) => {
    soundEngine.playEvent('file:select');
    set({
      selectedPaths: new Set(paths),
      lastSelectedPath: paths.length > 0 ? paths[paths.length - 1] : null
    });
  },

  toggleSelection: (path) => {
    set((state) => {
      const newSelected = new Set(state.selectedPaths);
      if (newSelected.has(path)) {
        newSelected.delete(path);
      } else {
        newSelected.add(path);
      }
      return { selectedPaths: newSelected, lastSelectedPath: path };
    });
  },

  clearSelection: () => {
    set({ selectedPaths: new Set(), lastSelectedPath: null });
  },

  toggleDir: (path) => {
    const { loadedDirs, loadChildren } = get();
    const isExpanding = !get().expandedDirs.has(path);

    set((state) => {
      const newExpanded = new Set(state.expandedDirs);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
        soundEngine.playEvent('folder:collapse');
      } else {
        newExpanded.add(path);
        soundEngine.playEvent('folder:expand');
      }
      return { expandedDirs: newExpanded };
    });

    // Lazy load children if expanding and not yet loaded
    if (isExpanding && !loadedDirs.has(path)) {
      loadChildren(path);
    }
  },

  expandDir: (path) => {
    const { loadedDirs, loadChildren } = get();

    soundEngine.playEvent('folder:expand');
    set((state) => {
      const newExpanded = new Set(state.expandedDirs);
      newExpanded.add(path);
      return { expandedDirs: newExpanded };
    });

    // Lazy load children if not yet loaded
    if (!loadedDirs.has(path)) {
      loadChildren(path);
    }
  },

  collapseDir: (path) => {
    soundEngine.playEvent('folder:collapse');
    set((state) => {
      const newExpanded = new Set(state.expandedDirs);
      newExpanded.delete(path);
      return { expandedDirs: newExpanded };
    });
  },

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  setRootDir: (rootDir) => {
    set({
      rootDir,
      expandedDirs: new Set([rootDir]),
      loadedDirs: new Set(),
      loadingDirs: new Set(),
    });
  },

  setShowHidden: (show) => {
    set({
      showHidden: show,
      loadedDirs: new Set(),  // Clear cache to force reload
    });
    get().refreshTree();
  },

  toggleShowHidden: () => {
    const { showHidden, refreshTree } = get();
    set({
      showHidden: !showHidden,
      loadedDirs: new Set(),  // Clear cache to force reload
    });
    refreshTree();
  },

  initRootDir: async () => {
    const rootDir = await window.electron.app.getRootDir();
    set({
      rootDir,
      expandedDirs: new Set([rootDir]),
      loadedDirs: new Set(),
      loadingDirs: new Set(),
    });
  },

  refreshTree: async () => {
    const { setLoading, setError, setTree, expandedDirs, loadChildren, showHidden } = get();
    setLoading(true);
    setError(null);

    try {
      const data = await window.electron.fs.getTree({ showHidden });
      setTree(data.tree);

      // Re-load children for all expanded directories to restore state
      // (setTree resets loadedDirs, so expanded folders lose their children)
      const expandedPaths = Array.from(expandedDirs);
      for (const path of expandedPaths) {
        // Skip root (already loaded with tree)
        if (path !== data.tree.path) {
          loadChildren(path, { skipPrefetch: true });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file tree');
    } finally {
      setLoading(false);
    }
  },

  // Load children of a directory (with optional prefetch control)
  loadChildren: async (path, options?: { skipPrefetch?: boolean }) => {
    const { loadedDirs, loadingDirs, insertChildren, prefetchGrandchildren, showHidden } = get();

    // Skip if already loaded or currently loading
    if (loadedDirs.has(path) || loadingDirs.has(path)) {
      return;
    }

    // Mark as loading
    set((state) => ({
      loadingDirs: new Set(state.loadingDirs).add(path),
    }));

    try {
      const { children } = await window.electron.fs.getChildren(path, { showHidden });

      // Insert children into tree
      insertChildren(path, children);

      // Start watching this directory
      await window.electron.fs.watchDir(path);

      // Mark as loaded
      set((state) => {
        const newLoaded = new Set(state.loadedDirs).add(path);
        const newLoading = new Set(state.loadingDirs);
        newLoading.delete(path);
        return { loadedDirs: newLoaded, loadingDirs: newLoading };
      });

      // Prefetch grandchildren in background for smooth navigation
      // Skip if this is already a prefetch call to prevent cascading
      if (!options?.skipPrefetch) {
        prefetchGrandchildren(path);
      }
    } catch (err) {
      console.error('Failed to load children:', err);
      set((state) => {
        const newLoading = new Set(state.loadingDirs);
        newLoading.delete(path);
        return { loadingDirs: newLoading };
      });
    }
  },

  // Insert children into the tree at a specific path
  insertChildren: (parentPath, children) => {
    set((state) => {
      if (!state.tree) return state;

      const newTree = updateTreeNode(state.tree, parentPath, (node) => ({
        ...node,
        children,
      }));

      return { tree: newTree };
    });
  },

  // Prefetch grandchildren for smoother navigation (only 1 level deep)
  prefetchGrandchildren: (parentPath) => {
    const { tree, loadedDirs, loadChildren } = get();
    if (!tree) return;

    // Find the parent node
    const findNode = (node: FileNode, targetPath: string): FileNode | null => {
      if (node.path === targetPath) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child, targetPath);
          if (found) return found;
        }
      }
      return null;
    };

    const parentNode = findNode(tree, parentPath);
    if (!parentNode?.children) return;

    // Use requestIdleCallback or setTimeout to avoid blocking UI
    const prefetchFn = () => {
      for (const child of parentNode.children || []) {
        if (child.type === 'directory' && !loadedDirs.has(child.path)) {
          // Load in background with skipPrefetch to prevent cascading
          loadChildren(child.path, { skipPrefetch: true });
        }
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(prefetchFn, { timeout: 2000 });
    } else {
      setTimeout(prefetchFn, 100);
    }
  },
}));

// File operations helper using Electron IPC
export const fileApi = {
  async readFile(path: string): Promise<{ content: string; modified: string; isImage?: boolean }> {
    return window.electron.fs.readFile(path);
  },

  async writeFile(path: string, content: string): Promise<void> {
    await window.electron.fs.writeFile(path, content);
  },

  async createFile(path: string): Promise<void> {
    await window.electron.fs.createFile(path, 'file');
  },

  async createDir(path: string): Promise<void> {
    await window.electron.fs.createFile(path, 'directory');
  },

  async deleteFile(path: string): Promise<void> {
    await window.electron.fs.deleteFile(path);
  },

  async rename(oldPath: string, newPath: string): Promise<void> {
    await window.electron.fs.rename(oldPath, newPath);
  },
};
