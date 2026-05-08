/**
 * Transcripts Component
 * Real-time conversation transcript display
 */

import { useEffect, useRef } from 'react';
import { User, Bot, Info, Trash2 } from 'lucide-react';
import { useTranscripts } from '../../hooks/useTranscripts';

export function Transcripts() {
  const { transcripts, isLoading, clear } = useTranscripts();
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  // Auto-scroll to bottom when new transcripts arrive
  useEffect(() => {
    if (shouldAutoScroll.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcripts]);

  // Track scroll position to pause auto-scroll when user scrolls up
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    shouldAutoScroll.current = isAtBottom;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--holo-muted)]">
        Loading transcripts...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--holo-border)]">
        <h2 className="text-xl font-semibold text-[var(--holo-text)]">Transcripts</h2>
        <button
          onClick={clear}
          className="flex items-center gap-2 px-3 py-1 text-sm text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
        >
          <Trash2 size={14} />
          Clear
        </button>
      </div>

      {/* Transcript list */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto p-4 space-y-3"
      >
        {transcripts.length === 0 ? (
          <div className="text-center text-[var(--holo-muted)] py-8">
            No transcripts yet. Start Raven to begin a conversation.
          </div>
        ) : (
          transcripts.map((entry) => (
            <TranscriptEntry key={entry.id} entry={entry} />
          ))
        )}
      </div>

      {/* Auto-scroll indicator */}
      {!shouldAutoScroll.current && (
        <button
          onClick={() => {
            shouldAutoScroll.current = true;
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
          }}
          className="absolute bottom-4 right-4 bg-[var(--holo-accent)] text-white px-3 py-1 rounded-full text-sm shadow-lg"
        >
          Scroll to bottom
        </button>
      )}
    </div>
  );
}

interface TranscriptEntryProps {
  entry: {
    id: string;
    timestamp: string;
    speaker: 'user' | 'raven' | 'system';
    text: string;
  };
}

function TranscriptEntry({ entry }: TranscriptEntryProps) {
  const speakerConfig = {
    user: {
      icon: <User size={16} />,
      label: 'You',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      iconColor: 'text-blue-400',
    },
    raven: {
      icon: <Bot size={16} />,
      label: 'Raven',
      bgColor: 'bg-[var(--holo-accent)]/10',
      borderColor: 'border-[var(--holo-accent)]/30',
      iconColor: 'text-[var(--holo-accent)]',
    },
    system: {
      icon: <Info size={16} />,
      label: 'System',
      bgColor: 'bg-gray-500/10',
      borderColor: 'border-gray-500/30',
      iconColor: 'text-gray-400',
    },
  };

  const config = speakerConfig[entry.speaker];
  const time = new Date(entry.timestamp).toLocaleTimeString();

  return (
    <div className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={config.iconColor}>{config.icon}</span>
        <span className="font-medium text-sm text-[var(--holo-text)]">{config.label}</span>
        <span className="text-xs text-[var(--holo-muted)] ml-auto">{time}</span>
      </div>
      <p className="text-sm text-[var(--holo-text)] whitespace-pre-wrap">{entry.text}</p>
    </div>
  );
}
