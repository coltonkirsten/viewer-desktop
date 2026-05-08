/**
 * Settings Component
 * Configuration management for Raven
 */

import { useState, useEffect } from 'react';
import { Save, RefreshCw, Plus, X, Mic, Volume2 } from 'lucide-react';
import { useRavenConfig } from '../../hooks/useRavenConfig';

export function Settings() {
  const {
    config,
    prompts,
    allowedApps,
    audioDevices,
    audioDeviceConfig,
    isLoading,
    updateConfig,
    updatePrompts,
    updateAllowedApps,
    updateAudioDeviceConfig,
    refreshAudioDevices,
    refresh,
  } = useRavenConfig();

  const [localConfig, setLocalConfig] = useState(config);
  const [localPrompt, setLocalPrompt] = useState(
    prompts.voice_assistant?.system_instruction || ''
  );
  const [localApps, setLocalApps] = useState<string[]>(allowedApps);
  const [newApp, setNewApp] = useState('');
  const [localAudioInput, setLocalAudioInput] = useState<number | string | null>(
    audioDeviceConfig.input
  );
  const [localAudioOutput, setLocalAudioOutput] = useState<number | string | null>(
    audioDeviceConfig.output
  );
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state when data loads
  useEffect(() => {
    setLocalConfig(config);
    setLocalPrompt(prompts.voice_assistant?.system_instruction || '');
    setLocalApps(allowedApps);
    setLocalAudioInput(audioDeviceConfig.input);
    setLocalAudioOutput(audioDeviceConfig.output);
  }, [config, prompts, allowedApps, audioDeviceConfig]);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await updateConfig(localConfig);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrompt = async () => {
    setIsSaving(true);
    try {
      await updatePrompts({
        voice_assistant: {
          system_instruction: localPrompt,
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveApps = async () => {
    setIsSaving(true);
    try {
      await updateAllowedApps(localApps);
    } finally {
      setIsSaving(false);
    }
  };

  const addApp = () => {
    if (newApp.trim() && !localApps.includes(newApp.trim())) {
      setLocalApps([...localApps, newApp.trim()]);
      setNewApp('');
    }
  };

  const removeApp = (app: string) => {
    setLocalApps(localApps.filter((a) => a !== app));
  };

  const handleSaveAudioDevices = async () => {
    setIsSaving(true);
    try {
      await updateAudioDeviceConfig({
        input: localAudioInput,
        output: localAudioOutput,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--holo-muted)]">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--holo-border)]">
        <h2 className="text-xl font-semibold text-[var(--holo-text)]">Settings</h2>
        <button
          onClick={refresh}
          className="p-2 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* General Settings */}
        <SettingsSection title="General">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--holo-text)] mb-1">
                Model
              </label>
              <input
                type="text"
                value={localConfig.model || ''}
                onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
                placeholder="models/gemini-2.5-flash-native-audio-preview"
                className="w-full bg-[var(--holo-bg-alt)] border border-[var(--holo-border)] rounded-lg px-3 py-2 text-sm text-[var(--holo-text)] placeholder:text-[var(--holo-muted)] focus:outline-none focus:border-[var(--holo-accent)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--holo-text)] mb-1">
                Voice Name
              </label>
              <input
                type="text"
                value={localConfig.voice_name || ''}
                onChange={(e) => setLocalConfig({ ...localConfig, voice_name: e.target.value })}
                placeholder="Aoede"
                className="w-full bg-[var(--holo-bg-alt)] border border-[var(--holo-border)] rounded-lg px-3 py-2 text-sm text-[var(--holo-text)] placeholder:text-[var(--holo-muted)] focus:outline-none focus:border-[var(--holo-accent)]"
              />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--holo-accent)] text-white rounded-lg hover:bg-[var(--holo-accent)]/80 transition-colors disabled:opacity-50 text-sm"
            >
              <Save size={14} />
              Save
            </button>
          </div>
        </SettingsSection>

        {/* System Prompt */}
        <SettingsSection title="System Prompt">
          <textarea
            value={localPrompt}
            onChange={(e) => setLocalPrompt(e.target.value)}
            placeholder="Enter custom system instruction..."
            rows={6}
            className="w-full bg-[var(--holo-bg-alt)] border border-[var(--holo-border)] rounded-lg px-3 py-2 text-sm text-[var(--holo-text)] placeholder:text-[var(--holo-muted)] focus:outline-none focus:border-[var(--holo-accent)] resize-none font-mono"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handleSavePrompt}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--holo-accent)] text-white rounded-lg hover:bg-[var(--holo-accent)]/80 transition-colors disabled:opacity-50 text-sm"
            >
              <Save size={14} />
              Save
            </button>
          </div>
        </SettingsSection>

        {/* Allowed Apps */}
        <SettingsSection title="Allowed Apps">
          <p className="text-sm text-[var(--holo-muted)] mb-3">
            Apps that Raven is allowed to open via the open_app tool.
          </p>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newApp}
              onChange={(e) => setNewApp(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addApp()}
              placeholder="Add app name..."
              className="flex-1 bg-[var(--holo-bg-alt)] border border-[var(--holo-border)] rounded-lg px-3 py-2 text-sm text-[var(--holo-text)] placeholder:text-[var(--holo-muted)] focus:outline-none focus:border-[var(--holo-accent)]"
            />
            <button
              onClick={addApp}
              className="px-3 py-2 bg-[var(--holo-accent)]/20 text-[var(--holo-accent)] rounded-lg hover:bg-[var(--holo-accent)]/30 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {localApps.map((app) => (
              <span
                key={app}
                className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--holo-bg-alt)] border border-[var(--holo-border)] rounded-lg text-sm text-[var(--holo-text)]"
              >
                {app}
                <button
                  onClick={() => removeApp(app)}
                  className="text-[var(--holo-muted)] hover:text-red-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>

          <div className="flex justify-end mt-3">
            <button
              onClick={handleSaveApps}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--holo-accent)] text-white rounded-lg hover:bg-[var(--holo-accent)]/80 transition-colors disabled:opacity-50 text-sm"
            >
              <Save size={14} />
              Save
            </button>
          </div>
        </SettingsSection>

        {/* Audio Devices */}
        <SettingsSection title="Audio Devices">
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--holo-text)] mb-2">
                <Mic size={16} />
                Input Device (Microphone)
              </label>
              <div className="flex gap-2">
                <select
                  value={localAudioInput ?? ''}
                  onChange={(e) =>
                    setLocalAudioInput(e.target.value === '' ? null : parseInt(e.target.value))
                  }
                  className="flex-1 bg-[var(--holo-bg-alt)] border border-[var(--holo-border)] rounded-lg px-3 py-2 text-sm text-[var(--holo-text)] focus:outline-none focus:border-[var(--holo-accent)]"
                >
                  <option value="">System Default</option>
                  {audioDevices.input.length === 0 && (
                    <option disabled>Loading devices...</option>
                  )}
                  {audioDevices.input.map((device) => (
                    <option key={device.index} value={device.index}>
                      {device.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={refreshAudioDevices}
                  className="p-2 text-[var(--holo-muted)] hover:text-[var(--holo-text)] transition-colors"
                  title="Refresh device list"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--holo-text)] mb-2">
                <Volume2 size={16} />
                Output Device (Speakers)
              </label>
              <select
                value={localAudioOutput ?? ''}
                onChange={(e) =>
                  setLocalAudioOutput(e.target.value === '' ? null : parseInt(e.target.value))
                }
                className="w-full bg-[var(--holo-bg-alt)] border border-[var(--holo-border)] rounded-lg px-3 py-2 text-sm text-[var(--holo-text)] focus:outline-none focus:border-[var(--holo-accent)]"
              >
                <option value="">System Default</option>
                {audioDevices.output.length === 0 && (
                  <option disabled>Loading devices...</option>
                )}
                {audioDevices.output.map((device) => (
                  <option key={device.index} value={device.index}>
                    {device.name}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-[var(--holo-muted)]">
              Changes will take effect when Raven is restarted.
            </p>
          </div>

          <div className="flex justify-end mt-3">
            <button
              onClick={handleSaveAudioDevices}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--holo-accent)] text-white rounded-lg hover:bg-[var(--holo-accent)]/80 transition-colors disabled:opacity-50 text-sm"
            >
              <Save size={14} />
              Save
            </button>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--holo-bg-alt)] rounded-lg border border-[var(--holo-border)] p-4">
      <h3 className="text-sm font-medium text-[var(--holo-muted)] uppercase tracking-wide mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}
