// Core geometry types
export interface Point {
  x: number;
  y: number;
}

export interface Ray {
  origin: Point;
  angle: number; // radians
}

export interface Segment {
  start: Point;
  end: Point;
}

// Light source
export interface LightSource {
  id: string;
  position: Point;
  angle: number; // direction in radians
  spread: number; // spread angle for multiple rays
  rayCount: number; // 1-50
  color: string; // hex color for rays
}

// Mirror types
export type MirrorType = 'flat' | 'concave' | 'convex';

export interface Mirror {
  id: string;
  type: MirrorType;
  start: Point;
  end: Point;
  curvature: number; // radius of curvature (0 for flat)
}

// Lens types
export type LensType = 'converging' | 'diverging';

export interface Lens {
  id: string;
  type: LensType;
  position: Point; // center position
  height: number; // lens height
  focalLength: number; // positive for converging, negative for diverging
}

// Prism
export interface Prism {
  id: string;
  position: Point; // centroid position
  rotation: number; // rotation in radians
  apexAngle: number; // angle at apex (typically 60 degrees)
  sideLength: number; // size of prism
  refractiveIndex: number; // 1.5-1.7 typically
}

// Union types for elements
export type OpticalElement =
  | { kind: 'mirror'; data: Mirror }
  | { kind: 'lens'; data: Lens }
  | { kind: 'prism'; data: Prism };

export type ElementKind = 'mirror' | 'lens' | 'prism';

// Tool types
export type Tool =
  | 'select'
  | 'light'
  | 'flat-mirror'
  | 'concave-mirror'
  | 'convex-mirror'
  | 'converging-lens'
  | 'diverging-lens'
  | 'prism';

// Scene file format
export interface OpticsScene {
  version: 1;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  lights: LightSource[];
  elements: OpticalElement[];
  settings: SceneSettings;
}

export interface SceneSettings {
  showGrid: boolean;
  gridSize: number;
  maxBounces: number;
  rayLength: number;
}

// Interaction state
export interface DragState {
  id: string;
  elementType: 'light' | ElementKind;
  offset: Point;
}

export interface DrawState {
  start: Point;
  tool: Tool;
}

export interface SelectionState {
  id: string;
  elementType: 'light' | ElementKind;
}

// Render context
export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  selectedId: string | null;
  hoveredId: string | null;
  showGrid: boolean;
  gridSize: number;
}

// Hit result from ray tracing
export interface HitResult {
  point: Point;
  distance: number;
  element: OpticalElement;
  normal?: number;
}
