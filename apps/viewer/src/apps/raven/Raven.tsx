/**
 * Raven Voice Assistant App
 * Main component for managing Raven voice assistant
 */

import { useState } from 'react';
import type { AppProps } from '../types';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Transcripts } from './components/Transcripts/Transcripts';
import { FunctionLogs } from './components/FunctionLogs/FunctionLogs';
import { Memories } from './components/Memories/Memories';
import { Tools } from './components/Tools/Tools';
import { Settings } from './components/Settings/Settings';
import { useRavenStatus } from './hooks/useRavenStatus';
import type { Section } from './types';

export function Raven({ isActive }: AppProps) {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const { state, start, stop, setMode } = useRavenStatus();

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard state={state} onStart={start} onStop={stop} onSetMode={setMode} />;
      case 'transcripts':
        return <Transcripts />;
      case 'function-logs':
        return <FunctionLogs />;
      case 'memories':
        return <Memories />;
      case 'tools':
        return <Tools />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard state={state} onStart={start} onStop={stop} onSetMode={setMode} />;
    }
  };

  return (
    <div className="h-full flex bg-[var(--holo-bg)] text-[var(--holo-text)]">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        ravenStatus={state.status}
      />
      <div className="flex-1 overflow-hidden relative">{renderSection()}</div>
    </div>
  );
}
