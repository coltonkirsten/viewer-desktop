import type { LightSource, Mirror, Lens, Prism, SceneSettings } from './types';

// Physics constants
export const PHYSICS = {
  MAX_BOUNCES: 50,
  RAY_LENGTH: 2000,
  EPSILON: 0.0001,
  MIN_HIT_DISTANCE: 0.001,
  DEFAULT_REFRACTIVE_INDEX: 1.5,
  AIR_REFRACTIVE_INDEX: 1.0,
} as const;

// Default element values
export const DEFAULTS = {
  light: {
    spread: Math.PI / 6,
    rayCount: 5,
    color: '#ffdc64',
  } satisfies Partial<LightSource>,

  mirror: {
    curvature: 0,
  } satisfies Partial<Mirror>,

  lens: {
    height: 100,
    focalLength: 80,
  } satisfies Partial<Lens>,

  prism: {
    apexAngle: Math.PI / 3, // 60 degrees
    sideLength: 80,
    refractiveIndex: 1.52,
    rotation: 0,
  } satisfies Partial<Prism>,

  settings: {
    showGrid: true,
    gridSize: 50,
    maxBounces: 50,
    rayLength: 2000,
  } satisfies SceneSettings,
} as const;

// UI constants
export const UI = {
  LIGHT_RADIUS: 10,
  LIGHT_SELECTED_RADIUS: 12,
  HIT_THRESHOLD_LIGHT: 15,
  HIT_THRESHOLD_MIRROR: 10,
  HIT_THRESHOLD_LENS: 20,
  HIT_THRESHOLD_PRISM: 15,
  MIN_MIRROR_LENGTH: 10,
  ROTATION_STEP: 0.1,
  RAY_COUNT_MIN: 1,
  RAY_COUNT_MAX: 50,
} as const;

// Colors
export const COLORS = {
  background: 'rgba(5, 5, 15, 1)',
  grid: 'rgba(50, 50, 80, 0.3)',

  mirror: '#8888ff',
  mirrorSelected: '#00ffff',
  mirrorHatching: 'rgba(136, 136, 255, 0.5)',
  mirrorHatchingSelected: 'rgba(0, 255, 255, 0.5)',

  lens: '#88ff88',
  lensSelected: '#00ffff',

  prism: '#ff88ff',
  prismFill: 'rgba(200, 100, 255, 0.1)',
  prismSelected: '#00ffff',

  light: '#ffcc00',
  lightSelected: '#ffff00',
  lightDirection: '#ff8800',

  rayStart: 'rgba(255, 220, 100, 0.9)',
  rayEnd: 'rgba(255, 220, 100, 0.1)',

  preview: 'rgba(136, 136, 255, 0.5)',
} as const;
