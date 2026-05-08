/**
 * useTranscripts Hook
 * Manages real-time transcript streaming
 */

import { useState, useEffect, useRef } from 'react';
import type { TranscriptEntry } from '../types';

const MAX_TRANSCRIPTS = 500;

export function useTranscripts() {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Load history
    window.electron.raven
      .getTranscripts(100)
      .then(({ transcripts: history }) => {
        setTranscripts(history);
      })
      .catch((error) => {
        console.error('Failed to load transcripts:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Subscribe to real-time updates
    const unsubscribe = window.electron.raven.onTranscript((entry) => {
      setTranscripts((prev) => {
        const next = [...prev, entry];
        if (next.length > MAX_TRANSCRIPTS) {
          return next.slice(-MAX_TRANSCRIPTS);
        }
        return next;
      });
    });

    return unsubscribe;
  }, []);

  const clear = () => {
    setTranscripts([]);
  };

  return { transcripts, isLoading, clear, scrollRef };
}
