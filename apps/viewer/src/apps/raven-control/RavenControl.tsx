/**
 * Raven Control Panel
 * Real-time control panel for RAVEN autonomous assistant
 */

import { useState, useEffect, useCallback } from 'react';
import { Bird, Settings, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import type { AppProps } from '../types';
import { useRavenAPI } from './hooks/useRavenAPI';
import { useRavenStream } from './hooks/useRavenStream';
import { StatusPanel } from './components/StatusPanel';
import { AgentsPanel } from './components/AgentsPanel';
import { EventsPanel } from './components/EventsPanel';
import { CommandsPanel } from './components/CommandsPanel';
import { LiveStream } from './components/LiveStream';
import type { PanelState } from './types';

export function RavenControl({ isActive }: AppProps) {
  // API hook for REST endpoints
  const api = useRavenAPI();

  // Stream hook for WebSocket
  const stream = useRavenStream();

  // UI state
  const [panelState, setPanelState] = useState<PanelState>({
    statusCollapsed: false,
    eventsCollapsed: true,
    commandsCollapsed: false,
    selectedAgentId: null,
  });

  // Initial data fetch
  useEffect(() => {
    if (api.isConnected) {
      api.fetchStatus();
      api.fetchAgents();
      api.fetchEvents();
    }
  }, [api.isConnected]);

  // Auto-connect to stream when API is connected
  useEffect(() => {
    if (api.isConnected && stream.status === 'disconnected') {
      stream.connect(api.config);
    }
  }, [api.isConnected, stream.status, api.config]);

  // Handle config changes
  const handleConfigChange = useCallback((config: typeof api.config) => {
    api.setConfig(config);
  }, [api.setConfig]);

  // Spawn agent handler
  const handleSpawnAgent = useCallback(async (task: string) => {
    const result = await api.spawnAgent(task);
    if (result) {
      api.fetchAgents();
      stream.requestRunningAgents();
    }
  }, [api, stream]);

  // Cancel agent handler
  const handleCancelAgent = useCallback(async (agentId: string) => {
    const success = await api.cancelAgent(agentId);
    if (success) {
      api.fetchAgents();
    }
  }, [api]);

  // Event handlers
  const handleCreateEvent = useCallback(async (event: Parameters<typeof api.createEvent>[0]) => {
    const result = await api.createEvent(event);
    if (result) {
      api.fetchEvents();
    }
  }, [api]);

  const handleUpdateEvent = useCallback(async (eventId: string, updates: Parameters<typeof api.updateEvent>[1]) => {
    const result = await api.updateEvent(eventId, updates);
    if (result) {
      api.fetchEvents();
    }
  }, [api]);

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    const success = await api.deleteEvent(eventId);
    if (success) {
      api.fetchEvents();
    }
  }, [api]);

  // Select agent handler
  const handleSelectAgent = useCallback((agentId: string) => {
    setPanelState(s => ({ ...s, selectedAgentId: agentId }));
    stream.subscribeToAgent(agentId);
  }, [stream]);

  // Toggle panel handlers
  const toggleStatusCollapse = useCallback(() => {
    setPanelState(s => ({ ...s, statusCollapsed: !s.statusCollapsed }));
  }, []);

  const toggleEventsCollapse = useCallback(() => {
    setPanelState(s => ({ ...s, eventsCollapsed: !s.eventsCollapsed }));
  }, []);

  const toggleCommandsCollapse = useCallback(() => {
    setPanelState(s => ({ ...s, commandsCollapsed: !s.commandsCollapsed }));
  }, []);

  // Connection test on mount
  useEffect(() => {
    api.fetchStatus();
  }, []);

  // Not connected state
  if (!api.isConnected && !api.loading.status) {
    return (
      <div className="h-full flex flex-col bg-[var(--holo-bg)] text-[var(--holo-text)]">
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="relative">
            <Bird size={64} className="text-[var(--holo-accent)]" />
            <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle size={14} className="text-red-400" />
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-xl font-medium mb-2">Raven Control</h2>
            <p className="text-sm text-[var(--holo-muted)]">
              Could not connect to RAVEN at {api.config.host}:{api.config.port}
            </p>
            {api.error && (
              <p className="text-xs text-red-400 mt-2">{api.error}</p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={api.config.host}
                onChange={(e) => api.setConfig({ ...api.config, host: e.target.value })}
                className="px-3 py-2 text-sm bg-[rgba(15,15,25,0.8)] border border-[var(--holo-border)] rounded focus:outline-none focus:border-[var(--holo-accent)]"
                placeholder="Host"
              />
              <input
                type="number"
                value={api.config.port}
                onChange={(e) => api.setConfig({ ...api.config, port: parseInt(e.target.value) || 8420 })}
                className="w-24 px-3 py-2 text-sm bg-[rgba(15,15,25,0.8)] border border-[var(--holo-border)] rounded focus:outline-none focus:border-[var(--holo-accent)]"
                placeholder="Port"
              />
            </div>
            <button
              onClick={() => api.fetchStatus()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--holo-accent)]/20 text-[var(--holo-accent)] rounded hover:bg-[var(--holo-accent)]/30 transition-colors"
            >
              <RefreshCw size={16} />
              Connect
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (api.loading.status && !api.status) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--holo-bg)] text-[var(--holo-muted)]">
        <Loader2 size={24} className="animate-spin mr-2" />
        Connecting to RAVEN...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--holo-bg)] text-[var(--holo-text)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--holo-border)] bg-[rgba(15,15,25,0.5)]">
        <div className="flex items-center gap-2">
          <Bird size={20} className="text-[var(--holo-accent)]" />
          <span className="font-medium">Raven Control</span>
        </div>
      </div>

      {/* Main content - 3 column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Status + Agents + Events */}
        <div className="w-72 flex flex-col border-r border-[var(--holo-border)] bg-[rgba(15,15,25,0.3)]">
          {/* Status Panel */}
          <StatusPanel
            status={api.status}
            isConnected={api.isConnected}
            isLoading={api.loading.status}
            config={api.config}
            onRefresh={api.fetchStatus}
            collapsed={panelState.statusCollapsed}
            onToggleCollapse={toggleStatusCollapse}
          />

          {/* Commands Panel */}
          <CommandsPanel
            config={api.config}
            collapsed={panelState.commandsCollapsed}
            onToggleCollapse={toggleCommandsCollapse}
          />

          {/* Agents Panel */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <AgentsPanel
              agents={api.agents}
              isLoading={api.loading.agents}
              onRefresh={api.fetchAgents}
              onSpawn={handleSpawnAgent}
              onCancel={handleCancelAgent}
              onSelect={handleSelectAgent}
              selectedAgentId={panelState.selectedAgentId}
            />
          </div>

          {/* Events Panel */}
          <EventsPanel
            events={api.events}
            isLoading={api.loading.events}
            onRefresh={api.fetchEvents}
            onCreate={handleCreateEvent}
            onUpdate={handleUpdateEvent}
            onDelete={handleDeleteEvent}
            collapsed={panelState.eventsCollapsed}
            onToggleCollapse={toggleEventsCollapse}
          />
        </div>

        {/* Right panel - Live Stream */}
        <div className="flex-1 overflow-hidden">
          <LiveStream
            connectionStatus={stream.status}
            connectionError={stream.error}
            config={api.config}
            onConnect={stream.connect}
            onDisconnect={stream.disconnect}
            agentStreams={stream.agentStreams}
            runningAgents={stream.runningAgents}
            messages={stream.messages}
            ravenActivity={stream.ravenActivity}
            onClearMessages={stream.clearMessages}
            onClearRavenActivity={stream.clearRavenActivity}
            onCancelAgent={handleCancelAgent}
            onConfigChange={handleConfigChange}
            selectedAgentId={panelState.selectedAgentId}
            getAgentDetails={api.getAgent}
          />
        </div>
      </div>
    </div>
  );
}
