import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypePrismPlus from 'rehype-prism-plus';
import { useAppContext } from '../AppContext';
import { useFileWatcher } from '../../hooks/useFileWatcher';
import { CodeEditor } from '../../components/common/CodeEditor';
import { MermaidDiagram } from './MermaidDiagram';
import type { AppProps } from '../types';
import type { Components } from 'react-markdown';

export function MarkdownEditor({ filePath, isActive }: AppProps) {
  const { fileApi, setDirty } = useAppContext();
  const { subscribeToFile } = useFileWatcher();

  const [content, setContent] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSplitView, setShowSplitView] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [externalChangeDetected, setExternalChangeDetected] = useState(false);

  // Search state for preview mode
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Mermaid rendering toggle (enabled by default)
  const [renderMermaid, setRenderMermaid] = useState(true);

  const loadFile = useCallback(async (isReload = false) => {
    if (!filePath) return;

    if (!isReload) {
      setLoading(true);
    }
    setError(null);
    setExternalChangeDetected(false);

    try {
      const data = await fileApi.readFile(filePath);
      setContent(data.content);
      setEditContent(data.content);
      setHasUnsavedChanges(false);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoading(false);
    }
  }, [filePath, fileApi, setDirty]);

  // Initial file load
  useEffect(() => {
    loadFile();
  }, [loadFile]);

  // Subscribe to file changes
  useEffect(() => {
    if (!filePath) return;

    const unsubscribe = subscribeToFile(filePath, () => {
      if (isEditing && hasUnsavedChanges) {
        setExternalChangeDetected(true);
      } else {
        loadFile(true);
      }
    });

    return unsubscribe;
  }, [filePath, subscribeToFile, isEditing, hasUnsavedChanges, loadFile]);

  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges || !filePath) return;

    setSaving(true);
    try {
      await fileApi.writeFile(filePath, editContent);
      setContent(editContent);
      setHasUnsavedChanges(false);
      setDirty(false);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }, [filePath, editContent, hasUnsavedChanges, fileApi, setDirty]);

  const handleContentChange = useCallback((value: string) => {
    setEditContent(value);
    const changed = value !== content;
    setHasUnsavedChanges(changed);
    setDirty(changed);
  }, [content, setDirty]);

  // Search functionality for preview mode
  const performSearch = useCallback((query: string) => {
    if (!query || !previewRef.current) {
      setSearchMatches([]);
      setCurrentMatchIndex(0);
      // Clear any existing highlights
      if (previewRef.current) {
        const marks = previewRef.current.querySelectorAll('mark[data-search-highlight]');
        marks.forEach(mark => {
          const parent = mark.parentNode;
          if (parent) {
            parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
            parent.normalize();
          }
        });
      }
      return;
    }

    const container = previewRef.current;

    // Clear existing highlights first
    const existingMarks = container.querySelectorAll('mark[data-search-highlight]');
    existingMarks.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
        parent.normalize();
      }
    });

    // Find and highlight matches
    const treeWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];
    let node;
    while ((node = treeWalker.nextNode())) {
      textNodes.push(node as Text);
    }

    const matches: Element[] = [];
    const lowerQuery = query.toLowerCase();

    textNodes.forEach(textNode => {
      const text = textNode.textContent || '';
      const lowerText = text.toLowerCase();
      let startIndex = 0;
      let index;

      const fragments: (string | HTMLElement)[] = [];
      let lastEnd = 0;

      while ((index = lowerText.indexOf(lowerQuery, startIndex)) !== -1) {
        if (index > lastEnd) {
          fragments.push(text.slice(lastEnd, index));
        }
        const mark = document.createElement('mark');
        mark.setAttribute('data-search-highlight', 'true');
        mark.className = 'bg-yellow-500/50 text-inherit rounded-sm px-0.5';
        mark.textContent = text.slice(index, index + query.length);
        fragments.push(mark);
        matches.push(mark);
        lastEnd = index + query.length;
        startIndex = index + 1;
      }

      if (fragments.length > 0) {
        if (lastEnd < text.length) {
          fragments.push(text.slice(lastEnd));
        }
        const parent = textNode.parentNode;
        if (parent) {
          fragments.forEach(frag => {
            if (typeof frag === 'string') {
              parent.insertBefore(document.createTextNode(frag), textNode);
            } else {
              parent.insertBefore(frag, textNode);
            }
          });
          parent.removeChild(textNode);
        }
      }
    });

    setSearchMatches(matches.map((_, i) => i));
    if (matches.length > 0) {
      setCurrentMatchIndex(0);
      matches[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      matches[0].className = 'bg-orange-500/70 text-inherit rounded-sm px-0.5';
    }
  }, []);

  const navigateSearch = useCallback((direction: 'next' | 'prev') => {
    if (searchMatches.length === 0 || !previewRef.current) return;

    const marks = previewRef.current.querySelectorAll('mark[data-search-highlight]');
    if (marks.length === 0) return;

    // Reset current highlight
    marks[currentMatchIndex].className = 'bg-yellow-500/50 text-inherit rounded-sm px-0.5';

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentMatchIndex + 1) % marks.length;
    } else {
      newIndex = (currentMatchIndex - 1 + marks.length) % marks.length;
    }

    setCurrentMatchIndex(newIndex);
    marks[newIndex].className = 'bg-orange-500/70 text-inherit rounded-sm px-0.5';
    marks[newIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [searchMatches.length, currentMatchIndex]);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchMatches([]);
    setCurrentMatchIndex(0);
    // Clear highlights
    if (previewRef.current) {
      const marks = previewRef.current.querySelectorAll('mark[data-search-highlight]');
      marks.forEach(mark => {
        const parent = mark.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
          parent.normalize();
        }
      });
    }
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Clear search when switching to edit mode
  useEffect(() => {
    if (isEditing) {
      closeSearch();
    }
  }, [isEditing, closeSearch]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isEditing && hasUnsavedChanges) {
          handleSave();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setIsEditing(!isEditing);
      }
      // Cmd+F for search in preview mode
      if ((e.metaKey || e.ctrlKey) && e.key === 'f' && !isEditing) {
        e.preventDefault();
        setShowSearch(true);
      }
      // Escape to close search
      if (e.key === 'Escape' && showSearch) {
        e.preventDefault();
        closeSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isEditing, hasUnsavedChanges, handleSave, showSearch, closeSearch]);

  // Mermaid diagram counter for unique IDs
  const mermaidCounterRef = useRef(0);

  // Helper to extract text content from React children (handles nested elements from syntax highlighters)
  const extractTextContent = useCallback((node: React.ReactNode): string => {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (!node) return '';
    if (Array.isArray(node)) return node.map(extractTextContent).join('');
    if (typeof node === 'object' && 'props' in node) {
      return extractTextContent((node as React.ReactElement).props.children);
    }
    return '';
  }, []);

  // Custom components for ReactMarkdown to render mermaid diagrams
  const markdownComponents = useMemo<Components>(() => ({
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      // Check if it's a mermaid code block and rendering is enabled
      if (language === 'mermaid' && renderMermaid) {
        // Extract text content recursively (handles syntax-highlighted spans)
        const codeContent = extractTextContent(children).replace(/\n$/, '');
        const diagramId = `md-mermaid-${mermaidCounterRef.current++}`;
        return <MermaidDiagram code={codeContent} id={diagramId} />;
      }

      // Default code block rendering (let rehype-prism-plus handle syntax highlighting)
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    // Also handle pre blocks to prevent double-wrapping for mermaid
    pre({ children, ...props }) {
      // Check if the child is a mermaid diagram (MermaidDiagram component)
      // If so, render it directly without the pre wrapper
      const child = children as React.ReactElement;
      if (child?.type === MermaidDiagram) {
        return <>{children}</>;
      }
      return <pre {...props}>{children}</pre>;
    },
  }), [renderMermaid, extractTextContent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--holo-muted)]">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        {error}
      </div>
    );
  }

  if (content === null) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* External change notification */}
      {externalChangeDetected && (
        <div className="flex items-center justify-between px-3 py-2 bg-amber-500/20 border-b border-amber-500/50">
          <span className="text-xs text-amber-300">
            This file has been modified externally
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadFile(true)}
              className="px-2 py-0.5 text-xs bg-amber-500 text-black rounded hover:bg-amber-400 transition-colors"
            >
              Reload
            </button>
            <button
              onClick={() => setExternalChangeDetected(false)}
              className="px-2 py-0.5 text-xs text-amber-300 hover:text-amber-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--holo-border)] bg-[rgba(15,15,25,0.5)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(false)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              !isEditing
                ? 'bg-[var(--holo-accent)]/30 text-[var(--holo-accent)]'
                : 'text-[var(--holo-muted)] hover:text-[var(--holo-text)]'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              isEditing
                ? 'bg-[var(--holo-accent)]/30 text-[var(--holo-accent)]'
                : 'text-[var(--holo-muted)] hover:text-[var(--holo-text)]'
            }`}
          >
            Edit
          </button>
          {isEditing && (
            <button
              onClick={() => setShowSplitView(!showSplitView)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ml-2 ${
                showSplitView
                  ? 'bg-[var(--holo-accent)]/30 text-[var(--holo-accent)]'
                  : 'text-[var(--holo-muted)] hover:text-[var(--holo-text)]'
              }`}
              title="Toggle split view"
            >
              Split
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Mermaid toggle */}
          <button
            onClick={() => setRenderMermaid(!renderMermaid)}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              renderMermaid
                ? 'bg-[var(--holo-accent)]/30 text-[var(--holo-accent)]'
                : 'text-[var(--holo-muted)] hover:text-[var(--holo-text)]'
            }`}
            title={renderMermaid ? 'Disable mermaid rendering' : 'Enable mermaid rendering'}
          >
            Mermaid
          </button>
          <div className="w-px h-4 bg-[var(--holo-border)]" />
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-400">Unsaved</span>
          )}
          {saving && (
            <span className="text-xs text-[var(--holo-muted)]">Saving...</span>
          )}
          {isEditing && (
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saving}
              className="px-2 py-0.5 text-xs bg-[var(--holo-accent)] rounded hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              Save
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {isEditing ? (
          showSplitView ? (
            // Split view for editing
            <div className="h-full flex">
              <div className="w-1/2 h-full border-r border-[var(--holo-border)]">
                <CodeEditor
                  filePath={filePath || ''}
                  value={editContent}
                  onChange={(value) => handleContentChange(value || '')}
                  isActive={isActive}
                />
              </div>
              <div className="w-1/2 h-full overflow-auto">
                <div className="p-4 prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypePrismPlus]}
                    components={markdownComponents}
                  >
                    {editContent}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            // Editor only
            <div className="h-full">
              <CodeEditor
                filePath={filePath || ''}
                value={editContent}
                onChange={(value) => handleContentChange(value || '')}
                isActive={isActive}
              />
            </div>
          )
        ) : (
          // Preview only with search bar
          <div className="h-full flex flex-col">
            {showSearch && (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--holo-border)] bg-[rgba(15,15,25,0.7)]">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    performSearch(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (e.shiftKey) {
                        navigateSearch('prev');
                      } else {
                        navigateSearch('next');
                      }
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      navigateSearch('prev');
                    }
                  }}
                  placeholder="Search..."
                  className="flex-1 px-2 py-1 text-sm bg-[rgba(0,0,0,0.3)] border border-[var(--holo-border)] rounded text-[var(--holo-text)] placeholder-[var(--holo-muted)] focus:outline-none focus:border-[var(--holo-accent)]"
                />
                <span className="text-xs text-[var(--holo-muted)] min-w-[60px] text-center">
                  {searchMatches.length > 0
                    ? `${currentMatchIndex + 1}/${searchMatches.length}`
                    : searchQuery
                    ? 'No matches'
                    : ''}
                </span>
                <button
                  onClick={() => navigateSearch('prev')}
                  disabled={searchMatches.length === 0}
                  className="px-1.5 py-0.5 text-xs text-[var(--holo-muted)] hover:text-[var(--holo-text)] disabled:opacity-50"
                  title="Previous match (Shift+Enter)"
                >
                  ↑
                </button>
                <button
                  onClick={() => navigateSearch('next')}
                  disabled={searchMatches.length === 0}
                  className="px-1.5 py-0.5 text-xs text-[var(--holo-muted)] hover:text-[var(--holo-text)] disabled:opacity-50"
                  title="Next match (Enter)"
                >
                  ↓
                </button>
                <button
                  onClick={closeSearch}
                  className="px-1.5 py-0.5 text-xs text-[var(--holo-muted)] hover:text-[var(--holo-text)]"
                  title="Close search (Esc)"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex-1 overflow-auto" ref={previewRef}>
              <div className="p-4 prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex, rehypePrismPlus]}
                  components={markdownComponents}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
