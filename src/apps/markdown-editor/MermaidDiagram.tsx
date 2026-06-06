import { useState, useEffect, useCallback, useRef } from 'react';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';

// Dark holographic color palette
const DARK_THEME_COLORS = {
  bg: 'transparent',
  node: '#1a2744',
  nodeAlt: '#1e3a5f',
  deep: '#0d1929',
  accent: '#4a9eff',
  text: '#e0e8f0',
  clusterBg: 'rgba(13, 25, 41, 0.5)',
  clusterBgHex: '#0d1929', // solid fallback for mermaid themeVariables (no rgba)
  edgeLabelBg: '#0d1929',
  critBg: '#5c1a1a',
  critBorder: '#ff4a4a',
  doneBg: '#1a4432',
  doneBorder: '#4aff8a',
};

// CSS injected inside the SVG's own <style> block via themeCSS
const THEME_CSS = `
  .cluster rect { fill: ${DARK_THEME_COLORS.clusterBg} !important; stroke: ${DARK_THEME_COLORS.accent} !important; }
  .cluster text { fill: ${DARK_THEME_COLORS.text} !important; }
  .node rect, .node circle, .node polygon, .node ellipse { fill: ${DARK_THEME_COLORS.node} !important; stroke: ${DARK_THEME_COLORS.accent} !important; }
  .node .label, .nodeLabel, .node text { fill: ${DARK_THEME_COLORS.text} !important; }
  .edgeLabel rect { fill: ${DARK_THEME_COLORS.deep} !important; }
  .edgePath path, .flowchart-link { stroke: ${DARK_THEME_COLORS.accent} !important; }
  marker path { fill: ${DARK_THEME_COLORS.accent} !important; stroke: ${DARK_THEME_COLORS.accent} !important; }
`;

const MERMAID_CONFIG = {
  startOnLoad: false,
  theme: 'base' as const,
  themeCSS: THEME_CSS,
  themeVariables: {
    // Base colors
    darkMode: true,
    background: DARK_THEME_COLORS.bg,

    // Primary - used for main nodes
    primaryColor: DARK_THEME_COLORS.node,
    primaryTextColor: DARK_THEME_COLORS.text,
    primaryBorderColor: DARK_THEME_COLORS.accent,

    // Secondary - used for alternate nodes
    secondaryColor: DARK_THEME_COLORS.nodeAlt,
    secondaryTextColor: DARK_THEME_COLORS.text,
    secondaryBorderColor: DARK_THEME_COLORS.accent,

    // Tertiary - used for third level
    tertiaryColor: DARK_THEME_COLORS.deep,
    tertiaryTextColor: DARK_THEME_COLORS.text,
    tertiaryBorderColor: DARK_THEME_COLORS.accent,

    // Lines and edges
    lineColor: DARK_THEME_COLORS.accent,

    // Text
    textColor: DARK_THEME_COLORS.text,

    // Notes and labels
    noteBkgColor: DARK_THEME_COLORS.node,
    noteTextColor: DARK_THEME_COLORS.text,
    noteBorderColor: DARK_THEME_COLORS.accent,

    // Flowchart specific
    nodeBkg: DARK_THEME_COLORS.node,
    nodeBorder: DARK_THEME_COLORS.accent,
    nodeTextColor: DARK_THEME_COLORS.text,
    mainBkg: DARK_THEME_COLORS.node,

    // Cluster/subgraph — use solid hex; mermaid's color parser rejects rgba()
    clusterBkg: DARK_THEME_COLORS.clusterBgHex,
    clusterBorder: DARK_THEME_COLORS.accent,

    // Labels
    labelBackground: DARK_THEME_COLORS.deep,
    labelTextColor: DARK_THEME_COLORS.text,
    edgeLabelBackground: DARK_THEME_COLORS.edgeLabelBg,

    // Sequence diagram
    actorBkg: DARK_THEME_COLORS.node,
    actorBorder: DARK_THEME_COLORS.accent,
    actorTextColor: DARK_THEME_COLORS.text,
    actorLineColor: DARK_THEME_COLORS.accent,
    signalColor: DARK_THEME_COLORS.accent,
    signalTextColor: DARK_THEME_COLORS.text,
    labelBoxBkgColor: DARK_THEME_COLORS.node,
    labelBoxBorderColor: DARK_THEME_COLORS.accent,
    loopTextColor: DARK_THEME_COLORS.text,
    activationBkgColor: DARK_THEME_COLORS.nodeAlt,
    activationBorderColor: DARK_THEME_COLORS.accent,
    sequenceNumberColor: DARK_THEME_COLORS.text,

    // State diagram
    labelColor: DARK_THEME_COLORS.text,
    altBackground: DARK_THEME_COLORS.nodeAlt,

    // Class diagram
    classText: DARK_THEME_COLORS.text,

    // Pie chart
    pie1: '#4a9eff',
    pie2: '#2d5a8a',
    pie3: '#1a3d5c',
    pie4: '#0d2840',
    pieStrokeColor: DARK_THEME_COLORS.accent,
    pieLegendTextColor: DARK_THEME_COLORS.text,
    pieSectionTextColor: DARK_THEME_COLORS.text,

    // Git graph
    git0: '#4a9eff',
    git1: '#2d5a8a',
    git2: '#1a3d5c',
    git3: '#0d2840',
    gitBranchLabel0: DARK_THEME_COLORS.text,
    gitBranchLabel1: DARK_THEME_COLORS.text,
    gitBranchLabel2: DARK_THEME_COLORS.text,
    gitBranchLabel3: DARK_THEME_COLORS.text,

    // Critical/error
    critBkgColor: DARK_THEME_COLORS.critBg,
    critBorderColor: DARK_THEME_COLORS.critBorder,

    // Done/success
    doneBkgColor: DARK_THEME_COLORS.doneBg,
    doneBorderColor: DARK_THEME_COLORS.doneBorder,

    // Active
    activeBkgColor: DARK_THEME_COLORS.nodeAlt,
    activeBorderColor: DARK_THEME_COLORS.accent,

    // Font
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: '14px',
  },
  securityLevel: 'loose' as const,
};

/**
 * DOM-based post-processing of the SVG rendered by mermaid.
 *
 * This is necessary because:
 * 1. Mermaid diagram source can specify custom light fill colors via `style` directives
 *    (e.g. `style Interface fill:#e1f5ff`) which become inline styles on SVG elements.
 * 2. Inline `style` attributes beat external CSS, even with `!important`.
 * 3. String regex can't reliably catch all color formats (hex, rgb, named, etc.).
 *
 * Using `element.style.setProperty(prop, value, 'important')` sets an inline
 * `!important` declaration, which overrides everything including mermaid's own
 * inline styles and any CSS rules.
 */
function postProcessSvg(svg: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) return svg;

  const setStyle = (el: Element, prop: string, value: string) => {
    (el as SVGElement).style.setProperty(prop, value, 'important');
  };

  // Force dark backgrounds on all cluster/subgraph rects
  doc.querySelectorAll('.cluster rect, .cluster path').forEach((el) => {
    setStyle(el, 'fill', DARK_THEME_COLORS.clusterBg);
    setStyle(el, 'stroke', DARK_THEME_COLORS.accent);
  });

  // Force dark text on all cluster labels
  doc.querySelectorAll('.cluster text, .cluster span').forEach((el) => {
    setStyle(el, 'fill', DARK_THEME_COLORS.text);
    setStyle(el, 'color', DARK_THEME_COLORS.text);
  });

  // Force dark colors on nodes
  doc.querySelectorAll('.node rect, .node circle, .node polygon, .node ellipse, .node path').forEach((el) => {
    setStyle(el, 'fill', DARK_THEME_COLORS.node);
    setStyle(el, 'stroke', DARK_THEME_COLORS.accent);
  });

  // Force light text everywhere
  doc.querySelectorAll('text').forEach((el) => {
    setStyle(el, 'fill', DARK_THEME_COLORS.text);
  });

  // Force dark colors on edges and arrows
  doc.querySelectorAll('.edgePath path, .flowchart-link').forEach((el) => {
    setStyle(el, 'stroke', DARK_THEME_COLORS.accent);
  });
  doc.querySelectorAll('marker path').forEach((el) => {
    setStyle(el, 'fill', DARK_THEME_COLORS.accent);
    setStyle(el, 'stroke', DARK_THEME_COLORS.accent);
  });

  // Force dark edge label backgrounds
  doc.querySelectorAll('.edgeLabel rect').forEach((el) => {
    setStyle(el, 'fill', DARK_THEME_COLORS.deep);
  });
  doc.querySelectorAll('.edgeLabel text, .edgeLabel span').forEach((el) => {
    setStyle(el, 'fill', DARK_THEME_COLORS.text);
    setStyle(el, 'color', DARK_THEME_COLORS.text);
  });

  // Make SVG background transparent
  svgEl.style.setProperty('background', 'transparent', 'important');

  return new XMLSerializer().serializeToString(svgEl);
}

// Initialize mermaid once at module level
mermaid.initialize(MERMAID_CONFIG);

interface MermaidDiagramProps {
  code: string;
  id: string;
}

export function MermaidDiagram({ code, id }: MermaidDiagramProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);

  // Render the mermaid diagram
  useEffect(() => {
    const renderDiagram = async () => {
      const renderId = ++renderIdRef.current;
      setError(null);

      try {
        // Re-initialize mermaid before each render to ensure theme is applied
        mermaid.initialize(MERMAID_CONFIG);

        const uniqueId = `mermaid-md-${id}-${renderId}-${Date.now()}`;
        const { svg } = await mermaid.render(uniqueId, code);

        if (renderId === renderIdRef.current) {
          setSvgContent(postProcessSvg(svg));
        }
      } catch (err) {
        if (renderId === renderIdRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
          setSvgContent(null);
        }
      }
    };

    renderDiagram();
  }, [code, id]);

  // Reset zoom/pan when closing expanded view
  useEffect(() => {
    if (!isExpanded) {
      setZoom(100);
      setPan({ x: 0, y: 0 });
    }
  }, [isExpanded]);

  // Zoom controls
  const handleZoomIn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((z) => Math.min(z + 25, 400));
  }, []);

  const handleZoomOut = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom((z) => Math.max(z - 25, 25));
  }, []);

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom(100);
    setPan({ x: 0, y: 0 });
  }, []);

  // Mouse wheel zoom (with Ctrl/Cmd)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -10 : 10;
      setZoom((z) => Math.min(Math.max(z + delta, 25), 400));
    }
  }, []);

  // Pan handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && isExpanded) {
      e.stopPropagation();
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan, isExpanded]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      e.stopPropagation();
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Close on escape
  useEffect(() => {
    if (!isExpanded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Minimal external CSS safety net — internal SVG styles handle the heavy lifting
  const mermaidStyles = `
    .mermaid-svg-container svg {
      background: transparent !important;
    }
    .mermaid-svg-container text {
      fill: ${DARK_THEME_COLORS.text} !important;
      color: ${DARK_THEME_COLORS.text} !important;
    }
  `;

  if (error) {
    return (
      <div className="my-4 p-4 rounded-lg border border-red-500/50 bg-red-500/10">
        <div className="text-xs text-red-400 mb-2">Mermaid diagram error:</div>
        <pre className="text-xs text-red-300 whitespace-pre-wrap">{error}</pre>
        <details className="mt-2">
          <summary className="text-xs text-[var(--holo-muted)] cursor-pointer hover:text-[var(--holo-text)]">
            Show source
          </summary>
          <pre className="mt-2 text-xs text-[var(--holo-muted)] whitespace-pre-wrap">{code}</pre>
        </details>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div className="my-4 p-4 rounded-lg border border-[var(--holo-border)] bg-[rgba(0,0,0,0.2)] flex items-center justify-center">
        <span className="text-xs text-[var(--holo-muted)]">Loading diagram...</span>
      </div>
    );
  }

  // Inline preview (click to expand)
  if (!isExpanded) {
    return (
      <div
        className="my-4 rounded-lg border border-[var(--holo-border)] bg-[rgba(0,0,0,0.2)] overflow-hidden group cursor-pointer hover:border-[var(--holo-accent)]/50 transition-colors"
        onClick={() => setIsExpanded(true)}
      >
        <style>{mermaidStyles}</style>
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--holo-border)] bg-[rgba(15,15,25,0.5)]">
          <span className="text-xs text-[var(--holo-muted)]">Mermaid Diagram</span>
          <span className="text-xs text-[var(--holo-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
            Click to expand
          </span>
        </div>
        <div className="p-4 flex items-center justify-center max-h-[300px] overflow-hidden">
          <div
            className="mermaid-svg-container"
            dangerouslySetInnerHTML={{ __html: svgContent }}
            style={{
              color: 'var(--holo-text)',
              maxWidth: '100%',
              maxHeight: '280px',
            }}
          />
        </div>
      </div>
    );
  }

  // Expanded modal view with zoom/pan
  return (
    <>
      <style>{mermaidStyles}</style>
      {/* Inline placeholder */}
      <div
        className="my-4 rounded-lg border border-[var(--holo-accent)] bg-[rgba(0,0,0,0.2)] overflow-hidden"
      >
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--holo-border)] bg-[rgba(15,15,25,0.5)]">
          <span className="text-xs text-[var(--holo-accent)]">Mermaid Diagram (expanded)</span>
        </div>
        <div className="p-4 flex items-center justify-center h-[100px]">
          <span className="text-xs text-[var(--holo-muted)]">Viewing in expanded mode...</span>
        </div>
      </div>

      {/* Modal overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
        onClick={() => setIsExpanded(false)}
      >
        <div
          className="relative w-[90vw] h-[85vh] bg-[rgba(15,15,25,0.95)] border border-[var(--holo-border)] rounded-lg overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--holo-border)] bg-[rgba(15,15,25,0.5)]">
            <span className="text-sm text-[var(--holo-text)]">Mermaid Diagram</span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleZoomOut}
                className="p-1.5 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors rounded hover:bg-white/5"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-[var(--holo-muted)] w-12 text-center">{zoom}%</span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors rounded hover:bg-white/5"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-[var(--holo-border)] mx-2" />
              <button
                onClick={handleReset}
                className="p-1.5 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors rounded hover:bg-white/5"
                title="Reset view"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-[var(--holo-border)] mx-2" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="p-1.5 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors rounded hover:bg-white/5"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Diagram container with pan/zoom */}
          <div
            ref={containerRef}
            className="flex-1 overflow-hidden bg-[rgba(0,0,0,0.3)]"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
                transformOrigin: 'center center',
              }}
            >
              <div
                className="mermaid-svg-container"
                dangerouslySetInnerHTML={{ __html: svgContent }}
                style={{
                  color: 'var(--holo-text)',
                }}
              />
            </div>
          </div>

          {/* Help text */}
          <div className="px-3 py-1.5 border-t border-[var(--holo-border)] bg-[rgba(15,15,25,0.5)]">
            <span className="text-xs text-[var(--holo-muted)]">
              Drag to pan • Ctrl/Cmd + scroll to zoom • Esc to close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
