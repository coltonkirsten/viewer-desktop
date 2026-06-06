import { useState, useEffect, useCallback, useRef } from 'react';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, AlertCircle } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { useFileWatcher } from '../../hooks/useFileWatcher';
import type { AppProps } from '../types';

// Initialize mermaid with dark theme matching holographic design
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#4a9eff',
    primaryTextColor: '#e0e0e0',
    primaryBorderColor: '#4a9eff',
    lineColor: '#4a9eff',
    secondaryColor: '#1a1a2e',
    tertiaryColor: '#0a0a0f',
    background: '#0a0a0f',
    mainBkg: '#1a1a2e',
    secondBkg: '#0f0f1a',
    nodeBorder: '#4a9eff',
    clusterBkg: '#1a1a2e',
    clusterBorder: '#4a9eff',
    titleColor: '#e0e0e0',
    edgeLabelBackground: '#1a1a2e',
    nodeTextColor: '#e0e0e0',
  },
  fontFamily: 'inherit',
  securityLevel: 'loose',
});

export function MermaidViewer({ filePath }: AppProps) {
  const { fileApi } = useAppContext();
  const { subscribeToFile } = useFileWatcher();

  const [content, setContent] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);

  const loadFile = useCallback(async (isReload = false) => {
    if (!filePath) return;

    if (!isReload) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await fileApi.readFile(filePath);
      setContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
      setLoading(false);
    }
  }, [filePath, fileApi]);

  // Render mermaid diagram
  const renderDiagram = useCallback(async () => {
    if (!content) return;

    const renderId = ++renderIdRef.current;
    setError(null);

    try {
      // Generate unique ID for this render
      const id = `mermaid-diagram-${renderId}-${Date.now()}`;

      // Parse and render mermaid diagram
      const { svg } = await mermaid.render(id, content);

      // Only update if this is the latest render
      if (renderId === renderIdRef.current) {
        setSvgContent(svg);
        setLoading(false);
      }
    } catch (err) {
      if (renderId === renderIdRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram';
        setError(errorMessage);
        setSvgContent(null);
        setLoading(false);
      }
    }
  }, [content]);

  // Initial file load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFile();
  }, [loadFile]);

  // Render diagram when content changes
  useEffect(() => {
    if (content) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      renderDiagram();
    }
  }, [content, renderDiagram]);

  // Subscribe to file changes
  useEffect(() => {
    if (!filePath) return;

    const unsubscribe = subscribeToFile(filePath, () => {
      loadFile(true);
    });

    return unsubscribe;
  }, [filePath, subscribeToFile, loadFile]);

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 400));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 25));
  const handleReset = () => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  };
  const handleReload = () => loadFile(true);

  // Mouse wheel zoom (with Ctrl/Cmd)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      setZoom((z) => Math.min(Math.max(z + delta, 25), 400));
    }
  }, []);

  // Pan handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (loading && !svgContent) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--holo-muted)]">
        Loading diagram...
      </div>
    );
  }

  const fileName = filePath?.split('/').pop() || 'Diagram';

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--holo-border)] bg-[rgba(15,15,25,0.5)]">
        <span className="text-xs text-[var(--holo-muted)]">{fileName}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-[var(--holo-muted)] w-12 text-center">{zoom}%</span>
          <button
            onClick={handleZoomIn}
            className="p-1 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-[var(--holo-border)] mx-1" />
          <button
            onClick={handleReset}
            className="p-1 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
            title="Fit to view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleReload}
            className="p-1 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
            title="Reload"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error bar */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 border-b border-red-500/50">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-300 truncate">{error}</span>
        </div>
      )}

      {/* Diagram container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-[rgba(0,0,0,0.3)]"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={diagramRef}
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
            transformOrigin: 'center center',
          }}
        >
          {svgContent && (
            <div
              className="mermaid-svg-container"
              dangerouslySetInnerHTML={{ __html: svgContent }}
              style={{
                // Ensure SVG inherits proper colors
                color: 'var(--holo-text)',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
