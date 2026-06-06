import { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import type { AppProps } from '../types';
import { useAppContext } from '../AppContext';
import { Scene } from './Scene';
import { ControlPanel } from './components/ControlPanel';
import { InfoPanel } from './components/InfoPanel';
import type { AirplaneState } from './types';
import { DEFAULT_STATE } from './constants';

export function AirplanePhysics({ filePath, isActive }: AppProps) {
  const { fileApi, setDirty } = useAppContext();
  const [state, setState] = useState<AirplaneState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(!!filePath);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load file on mount
  useEffect(() => {
    if (!filePath) {
      setIsLoading(false);
      return;
    }

    const loadFile = async () => {
      try {
        const { content } = await fileApi.readFile(filePath);
        const parsed = JSON.parse(content);
        setState({
          forces: parsed.forces || DEFAULT_STATE.forces,
          bankAngle: parsed.bankAngle ?? DEFAULT_STATE.bankAngle,
          showComponents: parsed.showComponents ?? DEFAULT_STATE.showComponents,
          showNetForce: parsed.showNetForce ?? DEFAULT_STATE.showNetForce,
        });
      } catch (err) {
        console.error('Failed to load airplane file:', err);
        setState(DEFAULT_STATE);
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [filePath, fileApi]);

  // Handle state changes
  const handleStateChange = useCallback((newState: AirplaneState) => {
    setState(newState);
    if (filePath) {
      setHasUnsavedChanges(true);
      setDirty(true);
    }
  }, [filePath, setDirty]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setState(DEFAULT_STATE);
    if (filePath) {
      setHasUnsavedChanges(true);
      setDirty(true);
    }
  }, [filePath, setDirty]);

  // Save file on Cmd+S
  useEffect(() => {
    if (!isActive || !filePath) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        try {
          const content = JSON.stringify(state, null, 2);
          await fileApi.writeFile(filePath, content);
          setHasUnsavedChanges(false);
          setDirty(false);
        } catch (err) {
          console.error('Failed to save:', err);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, filePath, state, fileApi, setDirty]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-gray-900">
      {/* 3D Canvas */}
      <div className="flex-1 relative">
        <Canvas
          camera={{
            position: [8, 5, 8],
            fov: 50,
            near: 0.1,
            far: 100,
          }}
        >
          <Scene state={state} />
        </Canvas>

        {/* Info panel overlay */}
        <InfoPanel state={state} />

        {/* Legend */}
        <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
          <h4 className="text-xs font-semibold text-white mb-2">Vector Legend</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 rounded" style={{ backgroundColor: '#3b82f6' }} />
              <span className="text-gray-300">Lift</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 rounded" style={{ backgroundColor: '#ef4444' }} />
              <span className="text-gray-300">Weight</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 rounded" style={{ backgroundColor: '#22c55e' }} />
              <span className="text-gray-300">Thrust</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 rounded" style={{ backgroundColor: '#f97316' }} />
              <span className="text-gray-300">Drag</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 rounded opacity-70" style={{ backgroundColor: '#93c5fd' }} />
              <span className="text-gray-300">Lift (V)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 rounded opacity-70" style={{ backgroundColor: '#06b6d4' }} />
              <span className="text-gray-300">Lift (H)</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <span className="w-3 h-1 rounded" style={{ backgroundColor: '#a855f7' }} />
              <span className="text-gray-300">Net Force</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="absolute top-4 right-72 text-xs text-gray-500">
          Drag to rotate • Scroll to zoom • Cmd+S to save
        </div>
      </div>

      {/* Control panel */}
      <ControlPanel
        state={state}
        onChange={handleStateChange}
        onReset={handleReset}
      />
    </div>
  );
}
