# Viewer App Development Guide

> Complete reference for AI coding agents building apps in the viewer system.

## Quick Start

Create a new app in `src/apps/{your-app}/` with two files:

### 1. `index.ts` - App Definition

```typescript
import type { AppDefinition } from '../types';
import { MyApp } from './MyApp';

export const app: AppDefinition = {
  id: 'my-app',
  name: 'My App',
  icon: 'Sparkles',
  component: MyApp,
  fileTypes: ['xyz'],                          // Optional: file extensions
  defaultSize: { width: 600, height: 400 },    // Optional: initial size
};
```

### 2. `MyApp.tsx` - Component

```typescript
import { useEffect, useState } from 'react';
import type { AppProps } from '../types';
import { useAppContext } from '../AppContext';

export function MyApp({ windowId, tabId, filePath, isActive }: AppProps) {
  const { fileApi, setDirty, closeTab, openFile, openWindow } = useAppContext();

  return (
    <div className="h-full flex flex-col bg-[var(--holo-bg)]">
      {/* Your app UI */}
    </div>
  );
}
```

That's it. The app is auto-discovered via `import.meta.glob` - no registration needed.

---

## Architecture Overview

### App Discovery System

```
src/apps/
├── index.ts              # Auto-discovers all apps via import.meta.glob
├── types.ts              # AppDefinition, AppProps, AppContextValue
├── AppContext.tsx        # Provider wrapping each app
├── AppWrapper.tsx        # Error boundary + Suspense
├── fileMatchers.ts       # Extension → app matching
└── {app-name}/
    ├── index.ts          # exports { app: AppDefinition }
    └── {AppName}.tsx     # React component
```

### Key Types

```typescript
interface AppDefinition {
  id: string;                              // Unique identifier
  name: string;                            // Display name (Cmd+P search)
  icon: string;                            // Lucide icon name (PascalCase)
  component: ComponentType<AppProps>;
  fileTypes?: string[];                    // File extensions this app handles
  defaultSize?: { width: number; height: number };
}

interface AppProps {
  windowId: string;
  tabId: string;
  filePath?: string;                       // File path if file-based
  isActive: boolean;                       // Is this tab currently visible
}

interface AppContextValue {
  windowId: string;
  tabId: string;
  openFile: (path: string) => void;
  openWindow: (appId: string, filePath?: string) => void;
  closeTab: () => void;
  setDirty: (isDirty: boolean) => void;
  fileApi: {
    readFile: (path: string) => Promise<{ content: string; isImage?: boolean }>;
    writeFile: (path: string, content: string) => Promise<void>;
  };
}
```

---

## Holographic Design System

The viewer uses a futuristic holographic aesthetic. **All apps MUST follow these patterns.**

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--holo-bg` | `#0a0a0f` | Deep space background |
| `--holo-panel` | `rgba(20, 20, 30, 0.8)` | Panel/card backgrounds |
| `--holo-border` | `rgba(100, 150, 255, 0.2)` | Subtle borders |
| `--holo-glow` | `rgba(100, 150, 255, 0.4)` | Glow effects |
| `--holo-accent` | `#4a9eff` | Primary accent (cyan-blue) |
| `--holo-text` | `#e0e0e0` | Primary text |
| `--holo-muted` | `#888888` | Secondary/disabled text |

### Using Colors in Tailwind

```tsx
// Backgrounds
className="bg-[var(--holo-bg)]"
className="bg-[var(--holo-panel)]"
className="bg-[rgba(15,15,25,0.5)]"      // Toolbar bg

// Borders
className="border border-[var(--holo-border)]"

// Text
className="text-[var(--holo-text)]"
className="text-[var(--holo-muted)]"
className="text-[var(--holo-accent)]"

// Accent with opacity
className="bg-[var(--holo-accent)]/20"   // 20% opacity
className="bg-[var(--holo-accent)]/30"   // 30% opacity
```

### Glass Morphism Effect

The signature holographic panel style:

```tsx
className="bg-[rgba(20,20,30,0.8)] backdrop-blur-[12px] border border-[var(--holo-border)]"
```

For subtle panel variations:
```tsx
// Darker panel
className="bg-[rgba(10,10,20,0.9)] border border-[var(--holo-border)]"

// Lighter/hover state
className="bg-[rgba(30,30,45,0.8)] border border-[var(--holo-border)]"
```

### Glow Effects

```css
/* Subtle glow */
box-shadow: 0 0 10px rgba(100, 150, 255, 0.08);

/* Medium glow (hover) */
box-shadow: 0 0 15px rgba(100, 150, 255, 0.15);

/* Strong glow (focus) */
box-shadow: 0 0 25px rgba(100, 150, 255, 0.3),
            0 0 50px rgba(100, 150, 255, 0.15);

/* Tailwind utility classes */
className="shadow-[0_0_10px_rgba(100,150,255,0.08)]"
className="hover:shadow-[0_0_15px_rgba(100,150,255,0.15)]"
```

### Status Colors

```tsx
// Success
className="text-green-400"
className="bg-green-500/10 border-green-500/30"

// Warning
className="text-amber-300"
className="bg-amber-500/20 border-amber-500/50"

// Error
className="text-red-400"
className="bg-red-500/10 border-red-500/30"

// Info (uses accent)
className="text-[var(--holo-accent)]"
className="bg-[var(--holo-accent)]/10 border-[var(--holo-accent)]/30"
```

---

## UI Component Patterns

### App Container

Every app should fill its container:

```tsx
export function MyApp({ isActive }: AppProps) {
  return (
    <div className="h-full w-full flex flex-col bg-[var(--holo-bg)] text-[var(--holo-text)]">
      {/* Content */}
    </div>
  );
}
```

### Toolbar

Standard toolbar at the top of file-based apps:

```tsx
<div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--holo-border)] bg-[rgba(15,15,25,0.5)]">
  {/* Left side: tabs, mode toggles */}
  <div className="flex items-center gap-2">
    <button
      onClick={() => setMode('view')}
      className={`px-2 py-0.5 text-xs rounded transition-colors ${
        mode === 'view'
          ? 'bg-[var(--holo-accent)]/30 text-[var(--holo-accent)]'
          : 'text-[var(--holo-muted)] hover:text-[var(--holo-text)]'
      }`}
    >
      View
    </button>
    <button
      onClick={() => setMode('edit')}
      className={`px-2 py-0.5 text-xs rounded transition-colors ${
        mode === 'edit'
          ? 'bg-[var(--holo-accent)]/30 text-[var(--holo-accent)]'
          : 'text-[var(--holo-muted)] hover:text-[var(--holo-text)]'
      }`}
    >
      Edit
    </button>
  </div>

  {/* Right side: status, actions */}
  <div className="flex items-center gap-2">
    {hasUnsavedChanges && (
      <span className="text-xs text-amber-400">Unsaved</span>
    )}
    <button
      onClick={handleSave}
      disabled={!hasUnsavedChanges}
      className="px-2 py-0.5 text-xs rounded bg-[var(--holo-accent)]/20 text-[var(--holo-accent)] hover:bg-[var(--holo-accent)]/30 disabled:opacity-50 transition-colors"
    >
      Save
    </button>
  </div>
</div>
```

### Buttons

```tsx
// Primary action button
<button className="px-3 py-1.5 rounded bg-[var(--holo-accent)] text-white hover:brightness-110 active:scale-95 transition-all">
  Primary
</button>

// Secondary/ghost button
<button className="px-3 py-1.5 rounded border border-[var(--holo-border)] text-[var(--holo-text)] hover:bg-[var(--holo-accent)]/10 hover:border-[var(--holo-accent)]/30 transition-colors">
  Secondary
</button>

// Icon button
<button className="p-1.5 rounded hover:bg-[var(--holo-accent)]/20 text-[var(--holo-muted)] hover:text-[var(--holo-accent)] transition-colors">
  <Icon size={16} />
</button>

// Toggle button (active/inactive)
<button
  className={`px-2 py-0.5 text-xs rounded transition-colors ${
    isActive
      ? 'bg-[var(--holo-accent)]/30 text-[var(--holo-accent)]'
      : 'text-[var(--holo-muted)] hover:text-[var(--holo-text)]'
  }`}
>
  Toggle
</button>

// Disabled state
<button disabled className="... disabled:opacity-50 disabled:cursor-not-allowed">
```

### Inputs

```tsx
// Text input
<input
  type="text"
  className="w-full px-3 py-2 rounded bg-[rgba(10,10,20,0.8)] border border-[var(--holo-border)] text-[var(--holo-text)] placeholder-[var(--holo-muted)] focus:outline-none focus:border-[var(--holo-accent)] transition-colors"
  placeholder="Enter text..."
/>

// Search input with icon
<div className="relative">
  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--holo-muted)]" />
  <input
    type="text"
    className="w-full pl-8 pr-3 py-1.5 text-sm rounded bg-[rgba(10,10,20,0.8)] border border-[var(--holo-border)] text-[var(--holo-text)] placeholder-[var(--holo-muted)] focus:outline-none focus:border-[var(--holo-accent)]"
    placeholder="Search..."
  />
</div>
```

### Cards/Panels

```tsx
// Standard card
<div className="rounded-lg bg-[var(--holo-panel)] border border-[var(--holo-border)] p-4">
  <h3 className="text-sm font-medium text-[var(--holo-text)] mb-2">Card Title</h3>
  <p className="text-xs text-[var(--holo-muted)]">Card content</p>
</div>

// Interactive card
<div className="rounded-lg bg-[var(--holo-panel)] border border-[var(--holo-border)] p-4 hover:border-[var(--holo-accent)]/30 hover:shadow-[0_0_15px_rgba(100,150,255,0.1)] cursor-pointer transition-all">
  {/* Content */}
</div>

// Elevated card (with glow)
<div className="rounded-lg bg-[var(--holo-panel)] border border-[var(--holo-border)] p-4 shadow-[0_0_20px_rgba(100,150,255,0.15)]">
  {/* Content */}
</div>
```

### Lists/Items

```tsx
// List container
<div className="flex flex-col divide-y divide-[var(--holo-border)]">
  {items.map(item => (
    <div
      key={item.id}
      className="px-3 py-2 hover:bg-[var(--holo-accent)]/10 cursor-pointer transition-colors"
    >
      <span className="text-sm text-[var(--holo-text)]">{item.name}</span>
    </div>
  ))}
</div>

// Selected item
<div className="px-3 py-2 bg-[var(--holo-accent)]/20 border-l-2 border-[var(--holo-accent)]">
  {/* Content */}
</div>
```

### Loading States

```tsx
// Centered loading
<div className="flex items-center justify-center h-full">
  <div className="flex flex-col items-center gap-3">
    <div className="w-6 h-6 border-2 border-[var(--holo-accent)]/30 border-t-[var(--holo-accent)] rounded-full animate-spin" />
    <span className="text-sm text-[var(--holo-muted)]">Loading...</span>
  </div>
</div>

// Inline loading
<span className="text-xs text-[var(--holo-muted)] animate-pulse">Loading...</span>
```

### Empty States

```tsx
<div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
  <FileQuestion size={48} className="text-[var(--holo-muted)]" />
  <div>
    <h3 className="text-lg font-medium text-[var(--holo-text)] mb-1">No file selected</h3>
    <p className="text-sm text-[var(--holo-muted)]">Open a file to get started</p>
  </div>
</div>
```

### Error States

```tsx
<div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
  <AlertCircle size={48} className="text-red-400" />
  <div>
    <h3 className="text-lg font-medium text-red-400 mb-1">Error loading file</h3>
    <p className="text-sm text-[var(--holo-muted)]">{error.message}</p>
  </div>
  <button
    onClick={retry}
    className="px-4 py-2 rounded bg-[var(--holo-accent)]/20 text-[var(--holo-accent)] hover:bg-[var(--holo-accent)]/30 transition-colors"
  >
    Retry
  </button>
</div>
```

### Notification Banner

```tsx
// Warning banner (e.g., external file change)
<div className="flex items-center justify-between px-3 py-2 bg-amber-500/20 border-b border-amber-500/50">
  <span className="text-xs text-amber-300">
    File was modified externally
  </span>
  <div className="flex items-center gap-2">
    <button
      onClick={reload}
      className="px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
    >
      Reload
    </button>
    <button
      onClick={dismiss}
      className="px-2 py-0.5 text-xs rounded text-amber-300/70 hover:text-amber-300 transition-colors"
    >
      Dismiss
    </button>
  </div>
</div>
```

---

## Common Patterns

### File-Based App Template

Complete template for apps that work with files:

```tsx
import { useEffect, useState, useCallback } from 'react';
import type { AppProps } from '../types';
import { useAppContext } from '../AppContext';
import { useFileWatcher } from '../../hooks/useFileWatcher';

export function MyFileApp({ filePath, isActive }: AppProps) {
  const { fileApi, setDirty } = useAppContext();
  const { subscribeToFile } = useFileWatcher();

  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [externalChange, setExternalChange] = useState(false);

  // Load file
  const loadFile = useCallback(async (silent = false) => {
    if (!filePath) return;
    if (!silent) setLoading(true);
    try {
      const data = await fileApi.readFile(filePath);
      setContent(data.content);
      setError(null);
      setExternalChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  }, [filePath, fileApi]);

  // Initial load
  useEffect(() => {
    loadFile();
  }, [loadFile]);

  // Watch for external changes
  useEffect(() => {
    if (!filePath) return;
    return subscribeToFile(filePath, () => {
      if (hasUnsavedChanges) {
        setExternalChange(true);
      } else {
        loadFile(true);
      }
    });
  }, [filePath, hasUnsavedChanges, loadFile, subscribeToFile]);

  // Track dirty state
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
    setDirty(true);
  }, [setDirty]);

  // Save file
  const handleSave = useCallback(async () => {
    if (!filePath || content === null) return;
    try {
      await fileApi.writeFile(filePath, content);
      setHasUnsavedChanges(false);
      setDirty(false);
    } catch (err) {
      console.error('Failed to save:', err);
    }
  }, [filePath, content, fileApi, setDirty]);

  // Keyboard shortcuts (only when active)
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleSave]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--holo-muted)]">
        Loading...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* External change notification */}
      {externalChange && (
        <div className="flex items-center justify-between px-3 py-2 bg-amber-500/20 border-b border-amber-500/50">
          <span className="text-xs text-amber-300">File modified externally</span>
          <div className="flex gap-2">
            <button
              onClick={() => loadFile(true)}
              className="px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
            >
              Reload
            </button>
            <button
              onClick={() => setExternalChange(false)}
              className="px-2 py-0.5 text-xs text-amber-300/70 hover:text-amber-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--holo-border)] bg-[rgba(15,15,25,0.5)]">
        <div className="flex items-center gap-2">
          {/* Left controls */}
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-400">Unsaved</span>
          )}
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className="px-2 py-0.5 text-xs rounded bg-[var(--holo-accent)]/20 text-[var(--holo-accent)] hover:bg-[var(--holo-accent)]/30 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Your app content here */}
      </div>
    </div>
  );
}
```

### Standalone App Template

For apps without file association (calculator, browser, etc.):

```tsx
import { useEffect, useState } from 'react';
import type { AppProps } from '../types';
import { useAppContext } from '../AppContext';

export function MyStandaloneApp({ isActive }: AppProps) {
  const { openFile, openWindow } = useAppContext();
  const [state, setState] = useState(/* initial state */);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle app-specific shortcuts
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return (
    <div className="h-full flex flex-col bg-[var(--holo-bg)] text-[var(--holo-text)]">
      {/* Your app UI */}
    </div>
  );
}
```

### Using the CodeEditor Component

For code/text editing, use the shared Monaco wrapper:

```tsx
import { CodeEditor } from '../../components/common/CodeEditor';

<CodeEditor
  filePath={filePath}           // For language detection
  value={content}
  onChange={handleContentChange}
  readOnly={false}
  isActive={isActive}
/>
```

---

## Keyboard Navigation

Apps should support intuitive keyboard navigation, especially arrow keys for navigating lists, grids, and focusable elements. This improves accessibility and provides a fluid, professional UX.

### Arrow Key Navigation Pattern

```tsx
const [selectedIndex, setSelectedIndex] = useState(0);

useEffect(() => {
  if (!isActive) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(items.length - 1, prev + 1));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        // Handle left navigation (e.g., collapse, previous column)
        break;
      case 'ArrowRight':
        e.preventDefault();
        // Handle right navigation (e.g., expand, next column)
        break;
      case 'Enter':
        e.preventDefault();
        // Activate/select current item
        handleSelect(items[selectedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        // Clear selection or close
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isActive, selectedIndex, items]);
```

### Grid Navigation (2D)

For grid layouts like calculators or image galleries:

```tsx
const [position, setPosition] = useState({ row: 0, col: 0 });
const columns = 4;  // Grid columns

useEffect(() => {
  if (!isActive) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setPosition(p => ({ ...p, row: Math.max(0, p.row - 1) }));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setPosition(p => ({ ...p, row: Math.min(rows - 1, p.row + 1) }));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setPosition(p => ({ ...p, col: Math.max(0, p.col - 1) }));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setPosition(p => ({ ...p, col: Math.min(columns - 1, p.col + 1) }));
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isActive, rows]);
```

### Auto-Scroll to Selection

When navigating lists, ensure the selected item stays visible:

```tsx
const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

useEffect(() => {
  itemRefs.current[selectedIndex]?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
  });
}, [selectedIndex]);

// In render:
{items.map((item, index) => (
  <div
    key={item.id}
    ref={el => itemRefs.current[index] = el}
    className={`... ${index === selectedIndex ? 'bg-[var(--holo-accent)]/20' : ''}`}
  >
    {item.name}
  </div>
))}
```

### When to Implement Arrow Navigation

| App Type | Navigation |
|----------|------------|
| Lists/file browsers | Up/Down to navigate, Enter to select/open |
| Grids/galleries | All arrows for 2D movement |
| Tab interfaces | Left/Right between tabs |
| Tree views | Up/Down to move, Left to collapse, Right to expand |
| Dialogs/modals | Tab between fields, Escape to close |
| Editors | Defer to Monaco/native input handling |

---

## Sound Integration

The viewer has a built-in sound engine for audio feedback. Apps should play sounds for meaningful interactions to enhance the holographic, futuristic feel.

### Using the useSound Hook

```tsx
import { useSound } from '../../hooks/useSound';

export function MyApp({ isActive }: AppProps) {
  const { playEvent, playSound } = useSound();

  const handleItemSelect = () => {
    playEvent('file:select');  // Play a system event sound
    // ... selection logic
  };

  const handleCustomAction = () => {
    playSound('blip-high');  // Play a specific sound preset
    // ... action logic
  };

  return (/* ... */);
}
```

### Available System Events

Use `playEvent()` for standard interactions:

| Event | When to Use |
|-------|-------------|
| `'file:select'` | Selecting an item in a list |
| `'file:open'` | Opening/activating an item |
| `'folder:expand'` | Expanding a collapsible section |
| `'folder:collapse'` | Collapsing a section |
| `'dialog:open'` | Opening a modal/dialog |
| `'dialog:close'` | Closing a modal/dialog |
| `'dialog:confirm'` | Confirming an action |
| `'dialog:cancel'` | Canceling an action |
| `'tab:switch'` | Switching between tabs/views |
| `'search:navigate'` | Navigating search results (arrow keys) |
| `'shortcut:activate'` | Triggering a keyboard shortcut |
| `'drag:start'` | Starting a drag operation |
| `'drag:end'` | Ending a drag operation |

### Sound Categories

For custom sounds via `playSound()`, use preset IDs:

| Category | Sound IDs | Use For |
|----------|-----------|---------|
| Tap | `tap-soft`, `tap-bright` | Button clicks, selections |
| Blip | `blip-high`, `blip-low`, `blip-double` | Quick feedback, toggles |
| Chime | `chime-up`, `chime-down`, `chime-success` | Completions, notifications |
| Slide | `slide-up`, `slide-down` | Transitions, value changes |
| Whoosh | `whoosh-in`, `whoosh-out` | Fast movements, swipes |

### When to Add Sounds

**DO play sounds for:**
- User-initiated selections and navigations
- Mode changes and toggles
- Successful saves or completions
- Opening/closing panels
- Drag and drop interactions
- Keyboard navigation between items

**DON'T play sounds for:**
- Automatic/background operations
- Hover states (too frequent)
- Every keystroke in text input
- Loading states
- Errors (unless it's a critical alert)

### Sound + Navigation Example

Combining arrow navigation with sound feedback:

```tsx
const { playEvent } = useSound();
const [selectedIndex, setSelectedIndex] = useState(0);

useEffect(() => {
  if (!isActive) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (selectedIndex > 0) {
          setSelectedIndex(prev => prev - 1);
          playEvent('search:navigate');  // Feedback for navigation
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (selectedIndex < items.length - 1) {
          setSelectedIndex(prev => prev + 1);
          playEvent('search:navigate');
        }
        break;
      case 'Enter':
        e.preventDefault();
        playEvent('file:open');  // Feedback for selection
        handleSelect(items[selectedIndex]);
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isActive, selectedIndex, items, playEvent]);
```

---

## Typography

### Font Stack

- **UI Text**: Inter, system-ui, sans-serif
- **Monospace**: DepartureMono, Monaco, Consolas, monospace

### Text Sizes

| Class | Usage |
|-------|-------|
| `text-xs` | Labels, badges, meta info |
| `text-sm` | Secondary text, descriptions |
| `text-base` | Body text (default) |
| `text-lg` | Headings, emphasis |
| `text-xl` | Section titles |
| `text-2xl`+ | Large headings |

### Text Styling

```tsx
// Primary text
<span className="text-[var(--holo-text)]">Primary</span>

// Muted text
<span className="text-[var(--holo-muted)]">Muted</span>

// Accent text
<span className="text-[var(--holo-accent)]">Accent</span>

// Code/monospace
<code className="font-mono text-sm bg-[rgba(0,0,0,0.3)] px-1.5 py-0.5 rounded">
  code
</code>
```

---

## Icons

Use [Lucide React](https://lucide.dev/icons/) icons with PascalCase names.

```tsx
import { FileText, Settings, Search, X, ChevronRight } from 'lucide-react';

// Standard icon sizes
<Icon size={14} />  // Small (inline, buttons)
<Icon size={16} />  // Default
<Icon size={20} />  // Medium
<Icon size={24} />  // Large

// Icon colors
<Icon className="text-[var(--holo-muted)]" />
<Icon className="text-[var(--holo-accent)]" />
```

---

## Animations & Transitions

### Standard Transitions

```tsx
// Color transitions (buttons, hovers)
className="transition-colors"

// All properties
className="transition-all duration-150"

// Specific duration
className="transition-all duration-200"
className="transition-all duration-300"
```

### Common Animations

```tsx
// Fade in
className="animate-[fadeIn_0.2s_ease-out]"

// Pulse (loading)
className="animate-pulse"

// Spin (loading indicator)
className="animate-spin"

// Scale on click
className="active:scale-95"

// Hover brightness
className="hover:brightness-110"
```

### Window Animations (CSS)

```css
/* Window enter animation */
@keyframes windowEnter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Window tiling transition */
.window-tiling {
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              top 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## Critical Rules

### 1. Always Check `isActive`

Keyboard listeners MUST be guarded:

```tsx
useEffect(() => {
  if (!isActive) return;  // CRITICAL: Don't register when inactive

  const handleKeyDown = (e: KeyboardEvent) => {
    // ...
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isActive, /* other deps */]);
```

### 2. Track Dirty State

Always notify the system of unsaved changes:

```tsx
const handleChange = (newContent: string) => {
  setContent(newContent);
  setHasUnsavedChanges(true);
  setDirty(true);  // Tell the system
};

const handleSave = async () => {
  await fileApi.writeFile(filePath, content);
  setHasUnsavedChanges(false);
  setDirty(false);  // Tell the system
};
```

### 3. Handle External File Changes

Subscribe to file changes and notify users:

```tsx
useEffect(() => {
  if (!filePath) return;
  return subscribeToFile(filePath, () => {
    if (hasUnsavedChanges) {
      setExternalChange(true);  // Show notification
    } else {
      loadFile(true);  // Auto-reload
    }
  });
}, [filePath, hasUnsavedChanges]);
```

### 4. Use Semantic Colors

Never hardcode colors. Always use CSS variables:

```tsx
// GOOD
className="text-[var(--holo-text)]"
className="bg-[var(--holo-accent)]/20"

// BAD
className="text-gray-200"
className="bg-blue-500"
```

### 5. Fill Container

Apps must fill their container:

```tsx
// GOOD
<div className="h-full w-full flex flex-col">

// BAD
<div className="h-screen">  // Don't use h-screen
<div>                        // No height specified
```

### 6. App ID Consistency

Keep IDs stable for backwards compatibility:

```tsx
// These apps use legacy IDs
'markdown-viewer'  // not 'markdown-editor'
'text-viewer'      // not 'text-editor'
```

---

## File Type Matching

### Priority Order

1. Special patterns (e.g., `kb_*.json` → kanban-board)
2. Extension matching via `fileTypes` array
3. Fallback to text-editor

### Registering File Types

```typescript
export const app: AppDefinition = {
  id: 'my-app',
  name: 'My App',
  fileTypes: ['xyz', 'abc'],  // Handles .xyz and .abc files
  // ...
};
```

### Special Cases

Some patterns need special handling in `fileMatchers.ts`:

```typescript
// Example: kb_*.json files always open in kanban
if (fileName.startsWith('kb_') && fileName.endsWith('.json')) {
  return appRegistry.get('kanban-board');
}
```

---

## State Management

### Zustand Store Access

```tsx
import { useWorkspaceStore } from '../../stores/workspaceStore';

const {
  openWindow,
  closeWindow,
  focusWindow,
  addTab,
  removeTab,
  tileWindows,
} = useWorkspaceStore();
```

### Common Operations

```tsx
// Open a new window with an app
openWindow({ appId: 'calculator' });

// Open a file in a new tab
openFile('/path/to/file.md');

// Open a file in a new window
openWindow({ appId: 'markdown-viewer', filePath: '/path/to/file.md' });
```

---

## Checklist for New Apps

- [ ] Created `src/apps/{app-name}/index.ts` with AppDefinition
- [ ] Created `src/apps/{app-name}/{AppName}.tsx` component
- [ ] Using holographic color variables (not hardcoded colors)
- [ ] Container fills height (`h-full`)
- [ ] Keyboard shortcuts guarded by `isActive`
- [ ] Arrow key navigation for lists/grids (where applicable)
- [ ] Sound feedback for interactions (`useSound` hook)
- [ ] Dirty state tracked with `setDirty()`
- [ ] External file changes handled (if file-based)
- [ ] Loading and error states implemented
- [ ] Lucide icon specified (PascalCase name)
- [ ] Transitions on interactive elements

---

## Example Apps to Reference

| App | Path | Type | Notable Features |
|-----|------|------|------------------|
| Calculator | `src/apps/calculator/` | Standalone | Keyboard input, grid layout |
| Markdown Editor | `src/apps/markdown-editor/` | File-based | View/edit modes, search, CodeEditor |
| JSON Viewer | `src/apps/json-viewer/` | File-based | Monaco integration |
| Kanban Board | `src/apps/kanban-board/` | File-based | Drag-drop (dnd-kit), complex state |
| Terminal | `src/apps/terminal/` | Standalone | xterm.js, PTY integration |
| Browser | `src/apps/browser/` | Standalone | WebView, dynamic title |

---

## Additional Resources

- **Lucide Icons**: https://lucide.dev/icons/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Monaco Editor**: https://microsoft.github.io/monaco-editor/
- **Zustand**: https://zustand-demo.pmnd.rs/
