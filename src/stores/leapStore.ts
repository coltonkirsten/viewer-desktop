import { create } from 'zustand';
import type { LeapConnectionStatus } from '../leap/types';

interface LeapRuntimeState {
  connectionStatus: LeapConnectionStatus;
  error: string | null;
  endpoint: string;
  trackedHands: number;
  lastFrameAt: number | null;
}

interface LeapRuntimeStore extends LeapRuntimeState {
  setStatus: (status: LeapConnectionStatus, error?: string | null) => void;
  setEndpoint: (endpoint: string) => void;
  setTrackedHands: (count: number, timestamp: number | null) => void;
  reset: () => void;
}

const DEFAULT_STATE: LeapRuntimeState = {
  connectionStatus: 'disabled',
  error: null,
  endpoint: '',
  trackedHands: 0,
  lastFrameAt: null,
};

export const useLeapStore = create<LeapRuntimeStore>((set) => ({
  ...DEFAULT_STATE,

  setStatus: (connectionStatus, error = null) => {
    set({ connectionStatus, error });
  },

  setEndpoint: (endpoint) => {
    set({ endpoint });
  },

  setTrackedHands: (trackedHands, lastFrameAt) => {
    set({ trackedHands, lastFrameAt });
  },

  reset: () => {
    set(DEFAULT_STATE);
  },
}));
