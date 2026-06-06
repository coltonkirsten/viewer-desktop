import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { AppProps } from '../types';
import { useAppContext } from '../AppContext';
import { useFileWatcher } from '../../hooks/useFileWatcher';
import type {
  Point,
  Tool,
  LightSource,
  OpticalElement,
  OpticsScene,
  DragState,
  RenderContext,
} from './types';
import { DEFAULTS, UI } from './constants';
import { traceRay, generateRaysFromLight, distance } from './physics';
import { render } from './renderer';
import { Toolbar } from './components/Toolbar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { StatusBar } from './components/StatusBar';

function createDefaultScene(): OpticsScene {
  const now = new Date().toISOString();
  return {
    version: 1,
    name: 'Untitled Scene',
    createdAt: now,
    updatedAt: now,
    lights: [
      {
        id: crypto.randomUUID(),
        position: { x: 100, y: 300 },
        angle: 0,
        spread: DEFAULTS.light.spread,
        rayCount: DEFAULTS.light.rayCount,
        color: DEFAULTS.light.color,
      },
    ],
    elements: [
      {
        kind: 'mirror',
        data: {
          id: crypto.randomUUID(),
          type: 'flat',
          start: { x: 400, y: 200 },
          end: { x: 400, y: 400 },
          curvature: 0,
        },
      },
    ],
    settings: { ...DEFAULTS.settings },
  };
}

function ensureSceneShape(raw: unknown): OpticsScene {
  const now = new Date().toISOString();

  if (!raw || typeof raw !== 'object') {
    return createDefaultScene();
  }

  const data = raw as Partial<OpticsScene>;

  return {
    version: 1,
    name: data.name || 'Untitled Scene',
    description: data.description,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    lights: Array.isArray(data.lights)
      ? data.lights.map((l) => ({
          id: l.id || crypto.randomUUID(),
          position: l.position || { x: 100, y: 300 },
          angle: l.angle ?? 0,
          spread: l.spread ?? DEFAULTS.light.spread,
          rayCount: l.rayCount ?? DEFAULTS.light.rayCount,
          color: l.color || DEFAULTS.light.color,
        }))
      : createDefaultScene().lights,
    elements: Array.isArray(data.elements)
      ? data.elements.map((el) => {
          if (el.kind === 'mirror') {
            return {
              kind: 'mirror' as const,
              data: {
                id: el.data.id || crypto.randomUUID(),
                type: el.data.type || 'flat',
                start: el.data.start || { x: 0, y: 0 },
                end: el.data.end || { x: 100, y: 0 },
                curvature: el.data.curvature ?? 0,
              },
            };
          } else if (el.kind === 'lens') {
            return {
              kind: 'lens' as const,
              data: {
                id: el.data.id || crypto.randomUUID(),
                type: el.data.type || 'converging',
                position: el.data.position || { x: 300, y: 300 },
                height: el.data.height ?? DEFAULTS.lens.height,
                focalLength: el.data.focalLength ?? DEFAULTS.lens.focalLength,
              },
            };
          } else if (el.kind === 'prism') {
            return {
              kind: 'prism' as const,
              data: {
                id: el.data.id || crypto.randomUUID(),
                position: el.data.position || { x: 300, y: 300 },
                rotation: el.data.rotation ?? DEFAULTS.prism.rotation,
                apexAngle: el.data.apexAngle ?? DEFAULTS.prism.apexAngle,
                sideLength: el.data.sideLength ?? DEFAULTS.prism.sideLength,
                refractiveIndex: el.data.refractiveIndex ?? DEFAULTS.prism.refractiveIndex,
              },
            };
          }
          return el;
        })
      : [],
    settings: {
      showGrid: data.settings?.showGrid ?? DEFAULTS.settings.showGrid,
      gridSize: data.settings?.gridSize ?? DEFAULTS.settings.gridSize,
      maxBounces: data.settings?.maxBounces ?? DEFAULTS.settings.maxBounces,
      rayLength: data.settings?.rayLength ?? DEFAULTS.settings.rayLength,
    },
  };
}

export function Optics({ filePath, isActive }: AppProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef<Point | null>(null);

  const { fileApi, setDirty } = useAppContext();
  const { subscribeToFile } = useFileWatcher();

  // Scene state (persisted)
  const [scene, setScene] = useState<OpticsScene | null>(null);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);

  // UI state
  const [tool, setTool] = useState<Tool>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [drawing, setDrawing] = useState<Point | null>(null);
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(true);

  // File state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [externalChangeDetected, setExternalChangeDetected] = useState(false);

  // Derived state
  const lights = useMemo(() => scene?.lights || [], [scene]);
  const elements = useMemo(() => scene?.elements || [], [scene]);
  const settings = scene?.settings || DEFAULTS.settings;

  // Find selected items
  const selectedLight = useMemo(
    () => lights.find((l) => l.id === selectedId) || null,
    [lights, selectedId]
  );
  const selectedElement = useMemo(
    () => elements.find((el) => el.data.id === selectedId) || null,
    [elements, selectedId]
  );
  const selectedType = selectedLight
    ? 'light'
    : selectedElement?.kind || null;

  // Load scene
  const loadScene = useCallback(
    async (path: string, isReload = false) => {
      if (!path) return;
      if (!isReload) setLoading(true);
      setError(null);
      setExternalChangeDetected(false);

      try {
        const data = await fileApi.readFile(path);
        const parsed = ensureSceneShape(JSON.parse(data.content));
        setScene(parsed);
        setCurrentFilePath(path);
        setHasUnsavedChanges(false);
        setDirty(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load scene');
      } finally {
        setLoading(false);
      }
    },
    [fileApi, setDirty]
  );

  // Initialize
  useEffect(() => {
    if (filePath && filePath.endsWith('.optics')) {
      setCurrentFilePath(filePath);
      loadScene(filePath);
    } else {
      // No file - create default scene
      setScene(createDefaultScene());
      setLoading(false);
    }
  }, [filePath, loadScene]);

  // File watcher
  useEffect(() => {
    if (!currentFilePath) return;

    const unsubscribe = subscribeToFile(currentFilePath, () => {
      if (hasUnsavedChanges) {
        setExternalChangeDetected(true);
      } else {
        loadScene(currentFilePath, true);
      }
    });

    return unsubscribe;
  }, [currentFilePath, subscribeToFile, hasUnsavedChanges, loadScene]);

  // Save scene
  const handleSave = useCallback(async () => {
    if (!scene || !currentFilePath) return;
    setError(null);

    try {
      const payload = {
        ...scene,
        updatedAt: new Date().toISOString(),
      };
      await fileApi.writeFile(currentFilePath, JSON.stringify(payload, null, 2));
      setScene(payload);
      setHasUnsavedChanges(false);
      setDirty(false);
      setExternalChangeDetected(false);
    } catch (err) {
      console.error('Failed to save scene:', err);
      setError('Unable to save scene');
    }
  }, [scene, currentFilePath, fileApi, setDirty]);

  // Mark dirty helper
  const markDirty = useCallback(
    (updatedScene: OpticsScene) => {
      setScene(updatedScene);
      setHasUnsavedChanges(true);
      setDirty(true);
    },
    [setDirty]
  );

  // Update light
  const updateLight = useCallback(
    (id: string, updates: Partial<LightSource>) => {
      if (!scene) return;
      markDirty({
        ...scene,
        lights: scene.lights.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      });
    },
    [scene, markDirty]
  );

  // Update element
  const updateElement = useCallback(
    (id: string, kind: OpticalElement['kind'], updates: Record<string, unknown>) => {
      if (!scene) return;
      markDirty({
        ...scene,
        elements: scene.elements.map((el) =>
          el.data.id === id && el.kind === kind
            ? ({ ...el, data: { ...el.data, ...updates } } as OpticalElement)
            : el
        ),
      });
    },
    [scene, markDirty]
  );

  // Delete selected
  const deleteSelected = useCallback(() => {
    if (!scene || !selectedId) return;
    markDirty({
      ...scene,
      lights: scene.lights.filter((l) => l.id !== selectedId),
      elements: scene.elements.filter((el) => el.data.id !== selectedId),
    });
    setSelectedId(null);
  }, [scene, selectedId, markDirty]);

  // Reset scene
  const resetScene = useCallback(() => {
    setScene(createDefaultScene());
    setSelectedId(null);
    setHasUnsavedChanges(true);
    setDirty(true);
  }, [setDirty]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges && currentFilePath) {
          handleSave();
        }
      }

      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        deleteSelected();
      }

      // Light controls
      if (selectedLight) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          updateLight(selectedLight.id, { angle: selectedLight.angle - UI.ROTATION_STEP });
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          updateLight(selectedLight.id, { angle: selectedLight.angle + UI.ROTATION_STEP });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          updateLight(selectedLight.id, {
            rayCount: Math.min(UI.RAY_COUNT_MAX, selectedLight.rayCount + 1),
          });
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          updateLight(selectedLight.id, {
            rayCount: Math.max(UI.RAY_COUNT_MIN, selectedLight.rayCount - 1),
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, selectedId, selectedLight, hasUnsavedChanges, currentFilePath, handleSave, deleteSelected, updateLight]);

  // Mouse helpers
  const getMousePos = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const findElementAt = (pos: Point): { type: 'light' | 'mirror' | 'lens' | 'prism'; id: string } | null => {
    // Check lights
    for (const light of lights) {
      const d = distance(pos, light.position);
      if (d < UI.HIT_THRESHOLD_LIGHT) {
        return { type: 'light', id: light.id };
      }
    }

    // Check elements
    for (const element of elements) {
      if (element.kind === 'mirror') {
        const mirror = element.data;
        const dx = mirror.end.x - mirror.start.x;
        const dy = mirror.end.y - mirror.start.y;
        const len2 = dx * dx + dy * dy;
        const t = Math.max(0, Math.min(1, ((pos.x - mirror.start.x) * dx + (pos.y - mirror.start.y) * dy) / len2));
        const projX = mirror.start.x + t * dx;
        const projY = mirror.start.y + t * dy;
        const dist = Math.sqrt((pos.x - projX) ** 2 + (pos.y - projY) ** 2);
        if (dist < UI.HIT_THRESHOLD_MIRROR) {
          return { type: 'mirror', id: mirror.id };
        }
      } else if (element.kind === 'lens') {
        const lens = element.data;
        const dx = Math.abs(pos.x - lens.position.x);
        const dy = Math.abs(pos.y - lens.position.y);
        if (dx < UI.HIT_THRESHOLD_LENS && dy < lens.height / 2 + 10) {
          return { type: 'lens', id: lens.id };
        }
      } else if (element.kind === 'prism') {
        const prism = element.data;
        const d = distance(pos, prism.position);
        if (d < prism.sideLength / 2 + UI.HIT_THRESHOLD_PRISM) {
          return { type: 'prism', id: prism.id };
        }
      }
    }

    return null;
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scene) return;
    const pos = getMousePos(e);

    if (tool === 'select') {
      const hit = findElementAt(pos);
      if (hit) {
        setSelectedId(hit.id);
        if (hit.type === 'light') {
          const light = lights.find((l) => l.id === hit.id);
          if (light) {
            setDragging({
              id: hit.id,
              elementType: 'light',
              offset: { x: pos.x - light.position.x, y: pos.y - light.position.y },
            });
          }
        } else if (hit.type === 'mirror') {
          const mirror = elements.find((el) => el.kind === 'mirror' && el.data.id === hit.id);
          if (mirror && mirror.kind === 'mirror') {
            const centerX = (mirror.data.start.x + mirror.data.end.x) / 2;
            const centerY = (mirror.data.start.y + mirror.data.end.y) / 2;
            setDragging({
              id: hit.id,
              elementType: 'mirror',
              offset: { x: pos.x - centerX, y: pos.y - centerY },
            });
          }
        } else if (hit.type === 'lens') {
          const lens = elements.find((el) => el.kind === 'lens' && el.data.id === hit.id);
          if (lens && lens.kind === 'lens') {
            setDragging({
              id: hit.id,
              elementType: 'lens',
              offset: { x: pos.x - lens.data.position.x, y: pos.y - lens.data.position.y },
            });
          }
        } else if (hit.type === 'prism') {
          const prism = elements.find((el) => el.kind === 'prism' && el.data.id === hit.id);
          if (prism && prism.kind === 'prism') {
            setDragging({
              id: hit.id,
              elementType: 'prism',
              offset: { x: pos.x - prism.data.position.x, y: pos.y - prism.data.position.y },
            });
          }
        }
      } else {
        setSelectedId(null);
      }
    } else if (tool === 'light') {
      const newLight: LightSource = {
        id: crypto.randomUUID(),
        position: pos,
        angle: 0,
        spread: DEFAULTS.light.spread,
        rayCount: DEFAULTS.light.rayCount,
        color: DEFAULTS.light.color,
      };
      markDirty({ ...scene, lights: [...scene.lights, newLight] });
      setSelectedId(newLight.id);
      setTool('select');
    } else if (tool === 'flat-mirror' || tool === 'concave-mirror' || tool === 'convex-mirror') {
      setDrawing(pos);
    } else if (tool === 'converging-lens' || tool === 'diverging-lens') {
      const newLens = {
        kind: 'lens' as const,
        data: {
          id: crypto.randomUUID(),
          type: tool === 'converging-lens' ? ('converging' as const) : ('diverging' as const),
          position: pos,
          height: DEFAULTS.lens.height,
          focalLength: DEFAULTS.lens.focalLength,
        },
      };
      markDirty({ ...scene, elements: [...scene.elements, newLens] });
      setSelectedId(newLens.data.id);
      setTool('select');
    } else if (tool === 'prism') {
      const newPrism = {
        kind: 'prism' as const,
        data: {
          id: crypto.randomUUID(),
          position: pos,
          rotation: DEFAULTS.prism.rotation,
          apexAngle: DEFAULTS.prism.apexAngle,
          sideLength: DEFAULTS.prism.sideLength,
          refractiveIndex: DEFAULTS.prism.refractiveIndex,
        },
      };
      markDirty({ ...scene, elements: [...scene.elements, newPrism] });
      setSelectedId(newPrism.data.id);
      setTool('select');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!scene) return;
    const pos = getMousePos(e);
    lastMousePos.current = pos;

    // Update hover state
    if (!dragging && !drawing) {
      const hit = findElementAt(pos);
      setHoveredId(hit?.id || null);
    }

    // Dragging
    if (dragging) {
      const newX = pos.x - dragging.offset.x;
      const newY = pos.y - dragging.offset.y;

      if (dragging.elementType === 'light') {
        markDirty({
          ...scene,
          lights: scene.lights.map((l) =>
            l.id === dragging.id ? { ...l, position: { x: newX, y: newY } } : l
          ),
        });
      } else if (dragging.elementType === 'mirror') {
        const mirror = scene.elements.find(
          (el) => el.kind === 'mirror' && el.data.id === dragging.id
        );
        if (mirror && mirror.kind === 'mirror') {
          const centerX = (mirror.data.start.x + mirror.data.end.x) / 2;
          const centerY = (mirror.data.start.y + mirror.data.end.y) / 2;
          const dx = newX - centerX;
          const dy = newY - centerY;
          markDirty({
            ...scene,
            elements: scene.elements.map((el) =>
              el.kind === 'mirror' && el.data.id === dragging.id
                ? {
                    ...el,
                    data: {
                      ...el.data,
                      start: { x: el.data.start.x + dx, y: el.data.start.y + dy },
                      end: { x: el.data.end.x + dx, y: el.data.end.y + dy },
                    },
                  }
                : el
            ),
          });
        }
      } else if (dragging.elementType === 'lens') {
        markDirty({
          ...scene,
          elements: scene.elements.map((el) =>
            el.kind === 'lens' && el.data.id === dragging.id
              ? { ...el, data: { ...el.data, position: { x: newX, y: newY } } }
              : el
          ),
        });
      } else if (dragging.elementType === 'prism') {
        markDirty({
          ...scene,
          elements: scene.elements.map((el) =>
            el.kind === 'prism' && el.data.id === dragging.id
              ? { ...el, data: { ...el.data, position: { x: newX, y: newY } } }
              : el
          ),
        });
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!scene) return;
    const pos = getMousePos(e);

    if (drawing) {
      const dx = pos.x - drawing.x;
      const dy = pos.y - drawing.y;
      if (dx * dx + dy * dy > UI.MIN_MIRROR_LENGTH * UI.MIN_MIRROR_LENGTH) {
        const mirrorType =
          tool === 'flat-mirror' ? 'flat' : tool === 'concave-mirror' ? 'concave' : 'convex';
        const newMirror = {
          kind: 'mirror' as const,
          data: {
            id: crypto.randomUUID(),
            type: mirrorType as 'flat' | 'concave' | 'convex',
            start: drawing,
            end: pos,
            curvature: mirrorType === 'flat' ? 0 : 100,
          },
        };
        markDirty({ ...scene, elements: [...scene.elements, newMirror] });
        setSelectedId(newMirror.data.id);
      }
      setDrawing(null);
      setTool('select');
    }

    setDragging(null);
  };

  // Generate ray paths
  const rayPaths = useMemo(() => {
    const paths: Point[][] = [];
    for (const light of lights) {
      const rays = generateRaysFromLight(light);
      for (const ray of rays) {
        const traced = traceRay(ray, elements, settings.maxBounces, settings.rayLength);
        paths.push(...traced);
      }
    }
    return paths;
  }, [lights, elements, settings.maxBounces, settings.rayLength]);

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const renderCtx: RenderContext = {
      ctx,
      width: canvas.width,
      height: canvas.height,
      selectedId,
      hoveredId,
      showGrid: settings.showGrid,
      gridSize: settings.gridSize,
    };

    render(
      renderCtx,
      lights,
      elements,
      rayPaths,
      drawing,
      lastMousePos.current
    );
  }, [lights, elements, rayPaths, selectedId, hoveredId, settings, drawing]);

  // Resize and redraw
  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--holo-muted)]">
        <Loader2 className="animate-spin mr-2" size={18} />
        Loading scene...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-[rgba(15,15,25,0.65)] border border-[var(--holo-border)] rounded-lg shadow-lg p-5 max-w-lg w-full">
          <div className="flex items-center gap-2 text-amber-300">
            <AlertTriangle size={18} />
            <span className="text-sm font-semibold">Unable to load scene</span>
          </div>
          <p className="mt-2 text-sm text-[var(--holo-muted)]">{error}</p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => currentFilePath && loadScene(currentFilePath, true)}
              className="px-3 py-1.5 text-sm bg-[var(--holo-accent)] rounded hover:opacity-90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[rgba(10,10,20,0.95)]">
      {/* External change notification */}
      {externalChangeDetected && (
        <div className="px-3 py-2 bg-amber-500/15 border-b border-amber-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-amber-200">
            <AlertTriangle size={14} />
            <span>This file changed elsewhere.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => currentFilePath && loadScene(currentFilePath, true)}
              className="px-2 py-1 text-xs bg-amber-400 text-black rounded hover:bg-amber-300 transition"
            >
              Reload
            </button>
            <button
              onClick={() => setExternalChangeDetected(false)}
              className="px-2 py-1 text-xs text-amber-200 hover:text-amber-50"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <Toolbar
        tool={tool}
        onToolChange={setTool}
        onDelete={deleteSelected}
        onReset={resetScene}
        onSave={handleSave}
        onTogglePanel={() => setPropertiesPanelOpen(!propertiesPanelOpen)}
        canDelete={!!selectedId}
        canSave={hasUnsavedChanges && !!currentFilePath}
        panelOpen={propertiesPanelOpen}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              setDragging(null);
              setHoveredId(null);
            }}
            className="absolute inset-0 cursor-crosshair"
          />
        </div>

        {/* Properties panel */}
        <PropertiesPanel
          isOpen={propertiesPanelOpen}
          selectedLight={selectedLight}
          selectedElement={selectedElement}
          onUpdateLight={updateLight}
          onUpdateElement={updateElement}
        />
      </div>

      {/* Status bar */}
      <StatusBar
        lightCount={lights.length}
        elementCount={elements.length}
        selectedId={selectedId}
        selectedType={selectedType}
        tool={tool}
        hasUnsavedChanges={hasUnsavedChanges}
        filePath={currentFilePath}
      />
    </div>
  );
}
