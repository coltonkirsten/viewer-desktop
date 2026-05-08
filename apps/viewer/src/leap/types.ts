export type HandChirality = 'left' | 'right';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface RawLeapHand {
  id?: number | string;
  type?: string;
  handType?: string;
  chirality?: string;
  pinchStrength?: number;
  confidence?: number;
  palmPosition?: number[];
  stabilizedPalmPosition?: number[];
}

export interface RawLeapFrame {
  id?: number | string;
  timestamp?: number;
  hands?: RawLeapHand[];
  currentFrameRate?: number;
}

export interface LeapHand {
  id: string;
  chirality: HandChirality;
  pinchStrength: number;
  confidence: number;
  palmPosition: Vector3;
}

export interface LeapFrame {
  id: string;
  timestamp: number;
  hands: LeapHand[];
}

export interface CursorState {
  chirality: HandChirality;
  x: number;
  y: number;
  pinchStrength: number;
  isPinching: boolean;
  isTracked: boolean;
}

export type LeapConnectionStatus = 'disabled' | 'connecting' | 'connected' | 'error';

export interface LeapClientCallbacks {
  onStatus: (status: LeapConnectionStatus, error?: string | null) => void;
  onFrame: (frame: LeapFrame) => void;
}

export interface LeapClientOptions {
  endpoint: string;
  reconnectMs: number;
}

export type InteractionMode = 'pressCandidate' | 'drag' | 'scroll';

export interface ActiveInteraction {
  hand: HandChirality;
  mode: InteractionMode;
  target: Element | null;
  startedAt: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  totalDistance: number;
  hasPointerDown: boolean;
}

export interface PinchTransition {
  hand: HandChirality;
  isPinching: boolean;
  started: boolean;
  ended: boolean;
  pinchStrength: number;
}

export interface PinchThresholds {
  pinchThreshold: number;
  releaseThreshold: number;
}

export interface CursorMappingOptions {
  width: number;
  height: number;
  smoothing: number;
  deadzonePx: number;
  edgePaddingPx: number;
  xMinMm: number;
  xMaxMm: number;
  yMinMm: number;
  yMaxMm: number;
  invertX: boolean;
  invertY: boolean;
  cursorGainX: number;
  cursorGainY: number;
}
