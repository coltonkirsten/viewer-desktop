import type {
  HandChirality,
  LeapClientCallbacks,
  LeapClientOptions,
  LeapConnectionStatus,
  LeapFrame,
  RawLeapFrame,
  RawLeapHand,
} from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toChirality(hand: RawLeapHand): HandChirality | null {
  const raw = (hand.type || hand.handType || hand.chirality || '').toLowerCase();
  if (raw.includes('left')) return 'left';
  if (raw.includes('right')) return 'right';
  return null;
}

function toPalmPosition(hand: RawLeapHand): { x: number; y: number; z: number } | null {
  const candidate = hand.stabilizedPalmPosition || hand.palmPosition;
  if (!Array.isArray(candidate) || candidate.length < 3) {
    return null;
  }

  const [x, y, z] = candidate;
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
    return null;
  }

  return { x, y, z };
}

function normalizeFrame(raw: RawLeapFrame): LeapFrame | null {
  if (!Array.isArray(raw.hands)) {
    return null;
  }

  const hands = raw.hands
    .map((hand) => {
      const chirality = toChirality(hand);
      const palm = toPalmPosition(hand);
      if (!chirality || !palm) return null;

      const pinchStrength = clamp(
        typeof hand.pinchStrength === 'number' ? hand.pinchStrength : 0,
        0,
        1
      );

      const confidence = clamp(
        typeof hand.confidence === 'number' ? hand.confidence : 1,
        0,
        1
      );

      return {
        id: String(hand.id ?? `${chirality}-${Math.round(palm.x)}-${Math.round(palm.y)}`),
        chirality,
        pinchStrength,
        confidence,
        palmPosition: palm,
      };
    })
    .filter((hand): hand is NonNullable<typeof hand> => Boolean(hand));

  if (hands.length === 0) {
    return {
      id: String(raw.id ?? Date.now()),
      timestamp: Date.now(),
      hands: [],
    };
  }

  return {
    id: String(raw.id ?? Date.now()),
    timestamp: Date.now(),
    hands,
  };
}

function buildEndpointCandidates(endpoint: string): string[] {
  const trimmed = endpoint.trim();
  if (!trimmed) {
    return ['ws://127.0.0.1:6437/v7.json', 'ws://127.0.0.1:6437/v6.json'];
  }

  const deduped = new Set<string>();

  const add = (value: string) => {
    if (value.trim()) {
      deduped.add(value.trim());
    }
  };

  add(trimmed);

  if (trimmed.includes('/v7.json')) {
    add(trimmed.replace('/v7.json', '/v6.json'));
  } else if (trimmed.includes('/v6.json')) {
    add(trimmed.replace('/v6.json', '/v7.json'));
  } else if (trimmed.endsWith('/')) {
    add(`${trimmed}v7.json`);
    add(`${trimmed}v6.json`);
  } else {
    add(`${trimmed}/v7.json`);
    add(`${trimmed}/v6.json`);
  }

  return Array.from(deduped);
}

export class LeapWebSocketClient {
  private callbacks: LeapClientCallbacks;
  private options: LeapClientOptions;
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = true;
  private connectAttemptId = 0;
  private reconnectAttemptCount = 0;
  private currentStatus: LeapConnectionStatus = 'disabled';
  private currentError: string | null = null;
  private lastConnectedEndpoint: string | null = null;
  private endpointProbeIndex = 0;

  constructor(options: LeapClientOptions, callbacks: LeapClientCallbacks) {
    this.options = options;
    this.callbacks = callbacks;
  }

  updateOptions(options: LeapClientOptions) {
    const changed =
      options.endpoint !== this.options.endpoint || options.reconnectMs !== this.options.reconnectMs;

    this.options = options;

    if (changed && !this.stopped) {
      this.reconnectNow();
    }
  }

  connect() {
    this.stopped = false;
    this.clearReconnectTimer();
    this.reconnectAttemptCount = 0;
    this.endpointProbeIndex = 0;
    this.setStatus('connecting', null);
    this.tryEndpoints(true);
  }

  disconnect() {
    this.stopped = true;
    this.clearReconnectTimer();
    this.connectAttemptId += 1;
    this.reconnectAttemptCount = 0;
    this.lastConnectedEndpoint = null;
    this.endpointProbeIndex = 0;

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disabled', null);
  }

  private reconnectNow() {
    if (this.stopped) return;

    this.connectAttemptId += 1;
    this.clearReconnectTimer();
    this.reconnectAttemptCount = 0;
    this.lastConnectedEndpoint = null;
    this.endpointProbeIndex = 0;

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('connecting', null);
    this.tryEndpoints(true);
  }

  private tryEndpoints(probeAll: boolean) {
    const attemptId = ++this.connectAttemptId;
    const endpoints = buildEndpointCandidates(this.options.endpoint);

    if (endpoints.length === 0) {
      this.setStatus('error', 'No Leap endpoint configured');
      this.scheduleReconnect();
      return;
    }

    if (this.lastConnectedEndpoint) {
      const preferredIndex = endpoints.indexOf(this.lastConnectedEndpoint);
      if (preferredIndex > 0) {
        const [preferred] = endpoints.splice(preferredIndex, 1);
        endpoints.unshift(preferred);
      }
    }

    if (probeAll) {
      this.connectWithFallback(attemptId, endpoints, 0);
      return;
    }

    const index = this.endpointProbeIndex % endpoints.length;
    const endpoint = endpoints[index];
    this.endpointProbeIndex = (index + 1) % endpoints.length;
    this.connectWithFallback(attemptId, [endpoint], 0);
  }

  private connectWithFallback(attemptId: number, endpoints: string[], index: number) {
    if (this.stopped || attemptId !== this.connectAttemptId) {
      return;
    }

    if (index >= endpoints.length) {
      this.setStatus('error', 'Leap service unavailable');
      this.scheduleReconnect();
      return;
    }

    const endpoint = endpoints[index];

    let opened = false;

    try {
      const ws = new WebSocket(endpoint);

      ws.onopen = () => {
        if (this.stopped || attemptId !== this.connectAttemptId) {
          ws.close();
          return;
        }

        opened = true;
        this.ws = ws;
        this.lastConnectedEndpoint = endpoint;
        this.reconnectAttemptCount = 0;
        this.setStatus('connected', null);
      };

      ws.onmessage = (event) => {
        if (attemptId !== this.connectAttemptId) return;

        const parsed = this.parseFrame(event.data);
        if (parsed) {
          this.callbacks.onFrame(parsed);
        }
      };

      ws.onerror = () => {
        // Wait for onclose to handle fallback/reconnect.
      };

      ws.onclose = (event) => {
        if (attemptId !== this.connectAttemptId || this.stopped) return;

        if (this.ws === ws) {
          this.ws = null;
        }

        if (!opened) {
          this.connectWithFallback(attemptId, endpoints, index + 1);
          return;
        }

        const reason =
          event.reason || `Leap socket closed (code ${event.code || 'unknown'})`;
        this.setStatus('error', reason);
        this.scheduleReconnect();
      };
    } catch (error) {
      if (attemptId !== this.connectAttemptId) return;

      this.connectWithFallback(attemptId, endpoints, index + 1);
      if (error instanceof Error && index === endpoints.length - 1) {
        this.setStatus('error', error.message);
        this.scheduleReconnect();
      }
    }
  }

  private parseFrame(payload: string | ArrayBuffer): LeapFrame | null {
    if (typeof payload !== 'string') {
      return null;
    }

    try {
      const raw = JSON.parse(payload) as RawLeapFrame;
      return normalizeFrame(raw);
    } catch {
      return null;
    }
  }

  private scheduleReconnect() {
    if (this.stopped) return;

    this.clearReconnectTimer();
    const baseDelay = Math.max(500, this.options.reconnectMs);
    const delay = Math.min(baseDelay * 2 ** this.reconnectAttemptCount, 30000);
    this.reconnectAttemptCount += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.tryEndpoints(false);
    }, delay);
  }

  private clearReconnectTimer() {
    if (!this.reconnectTimer) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private setStatus(status: LeapConnectionStatus, error: string | null) {
    if (status === this.currentStatus && error === this.currentError) {
      return;
    }

    this.currentStatus = status;
    this.currentError = error;
    this.callbacks.onStatus(status, error);
  }
}
