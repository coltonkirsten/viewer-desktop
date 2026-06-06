import type { CursorMappingOptions, HandChirality, LeapHand } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

export interface CursorPoint {
  x: number;
  y: number;
}

export type CursorStateMap = Partial<Record<HandChirality, CursorPoint>>;

function normalizeAxis(value: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  return clamp((value - min) / (max - min), 0, 1);
}

function applyGain(normalized: number, gain: number): number {
  const clampedGain = clamp(gain, 0.2, 3);
  return clamp(0.5 + (normalized - 0.5) * clampedGain, 0, 1);
}

export function mapHandToCursor(
  hand: LeapHand,
  options: CursorMappingOptions,
  previous: CursorPoint | null
): CursorPoint {
  const rawX = normalizeAxis(hand.palmPosition.x, options.xMinMm, options.xMaxMm);
  const rawY = normalizeAxis(hand.palmPosition.y, options.yMinMm, options.yMaxMm);

  const adjustedX = applyGain(options.invertX ? 1 - rawX : rawX, options.cursorGainX);
  const adjustedY = applyGain(options.invertY ? rawY : 1 - rawY, options.cursorGainY);

  const maxPadX = Math.max(0, options.width * 0.45);
  const maxPadY = Math.max(0, options.height * 0.45);
  const padX = clamp(options.edgePaddingPx, 0, maxPadX);
  const padY = clamp(options.edgePaddingPx, 0, maxPadY);
  const usableWidth = Math.max(1, options.width - padX * 2);
  const usableHeight = Math.max(1, options.height - padY * 2);

  const target = {
    x: padX + adjustedX * usableWidth,
    y: padY + adjustedY * usableHeight,
  };

  if (!previous) {
    return target;
  }

  const alpha = clamp(options.smoothing, 0, 1);
  const smoothed = {
    x: lerp(previous.x, target.x, alpha),
    y: lerp(previous.y, target.y, alpha),
  };

  if (distance(previous.x, previous.y, smoothed.x, smoothed.y) < clamp(options.deadzonePx, 0, 25)) {
    return previous;
  }

  return smoothed;
}

export function mapHandsToCursors(
  hands: LeapHand[],
  options: CursorMappingOptions,
  previous: CursorStateMap
): CursorStateMap {
  const next: CursorStateMap = {};

  for (const hand of hands) {
    const prior = previous[hand.chirality] ?? null;
    next[hand.chirality] = mapHandToCursor(hand, options, prior);
  }

  return next;
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}
