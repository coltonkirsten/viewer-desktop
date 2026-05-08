/**
 * useRavenConfig Hook
 * Manages Raven configuration
 */

import { useState, useEffect, useCallback } from 'react';
import type { RavenConfig, PromptsConfig, AudioDevice, AudioDeviceConfig } from '../types';

export function useRavenConfig() {
  const [config, setConfig] = useState<RavenConfig>({});
  const [prompts, setPrompts] = useState<PromptsConfig>({});
  const [allowedApps, setAllowedApps] = useState<string[]>([]);
  const [audioDevices, setAudioDevices] = useState<{ input: AudioDevice[]; output: AudioDevice[] }>({
    input: [],
    output: [],
  });
  const [audioDeviceConfig, setAudioDeviceConfig] = useState<AudioDeviceConfig>({
    input: null,
    output: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load critical config first (fast operations)
      const [configResult, promptsResult, appsResult, deviceConfigResult] = await Promise.all([
        window.electron.raven.config.get(),
        window.electron.raven.config.getPrompts(),
        window.electron.raven.config.getAllowedApps(),
        window.electron.raven.config.getAudioDeviceConfig(),
      ]);
      setConfig(configResult);
      setPrompts(promptsResult);
      setAllowedApps(appsResult.apps);
      setAudioDeviceConfig(deviceConfigResult);
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setIsLoading(false);
    }

    // Load audio devices in background (potentially slow - involves Python subprocess)
    window.electron.raven.config.getAudioDevices()
      .then(setAudioDevices)
      .catch((err) => console.error('Failed to load audio devices:', err));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateConfig = useCallback(async (updates: Partial<RavenConfig>) => {
    try {
      const newConfig = await window.electron.raven.config.update(updates);
      setConfig(newConfig);
      return newConfig;
    } catch (error) {
      console.error('Failed to update config:', error);
      throw error;
    }
  }, []);

  const updatePrompts = useCallback(async (updates: Partial<PromptsConfig>) => {
    try {
      const newPrompts = await window.electron.raven.config.updatePrompts(updates);
      setPrompts(newPrompts);
      return newPrompts;
    } catch (error) {
      console.error('Failed to update prompts:', error);
      throw error;
    }
  }, []);

  const updateAllowedApps = useCallback(async (apps: string[]) => {
    try {
      const result = await window.electron.raven.config.setAllowedApps(apps);
      setAllowedApps(result.apps);
      return result.apps;
    } catch (error) {
      console.error('Failed to update allowed apps:', error);
      throw error;
    }
  }, []);

  const updateAudioDeviceConfig = useCallback(async (newConfig: Partial<AudioDeviceConfig>) => {
    try {
      const result = await window.electron.raven.config.setAudioDeviceConfig({
        input: newConfig.input ?? audioDeviceConfig.input,
        output: newConfig.output ?? audioDeviceConfig.output,
      });
      setAudioDeviceConfig(result);
      return result;
    } catch (error) {
      console.error('Failed to update audio device config:', error);
      throw error;
    }
  }, [audioDeviceConfig]);

  const refreshAudioDevices = useCallback(async () => {
    try {
      const devices = await window.electron.raven.config.getAudioDevices();
      setAudioDevices(devices);
      return devices;
    } catch (error) {
      console.error('Failed to refresh audio devices:', error);
      throw error;
    }
  }, []);

  return {
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
  };
}
