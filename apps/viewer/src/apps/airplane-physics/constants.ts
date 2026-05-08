import type { AirplaneState } from './types';

export const DEFAULT_STATE: AirplaneState = {
  forces: {
    lift: 10000,
    weight: 9800,
    thrust: 5000,
    drag: 4500,
  },
  bankAngle: 0,
  showComponents: true,
  showNetForce: true,
};

export const FORCE_LIMITS = {
  lift: { min: 0, max: 20000 },
  weight: { min: 0, max: 20000 },
  thrust: { min: 0, max: 15000 },
  drag: { min: 0, max: 15000 },
};

export const BANK_ANGLE_LIMITS = {
  min: -90,
  max: 90,
};

export const COLORS = {
  lift: '#3b82f6', // Blue
  weight: '#ef4444', // Red
  thrust: '#22c55e', // Green
  drag: '#f97316', // Orange
  liftVertical: '#93c5fd', // Light blue
  liftHorizontal: '#06b6d4', // Cyan
  netForce: '#a855f7', // Purple
};

export const VECTOR_SCALE = 0.0003; // Scale factor for converting force (N) to 3D units
