import { RotateCcw } from 'lucide-react';
import type { AirplaneState } from '../types';
import { FORCE_LIMITS, BANK_ANGLE_LIMITS, COLORS } from '../constants';

interface ControlPanelProps {
  state: AirplaneState;
  onChange: (state: AirplaneState) => void;
  onReset: () => void;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  color: string;
  unit?: string;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, color, unit = 'N', onChange }: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        <span className="text-sm font-mono text-gray-400">
          {value.toFixed(0)}{unit}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, #374151 ${percentage}%, #374151 100%)`,
          }}
        />
      </div>
    </div>
  );
}

export function ControlPanel({ state, onChange, onReset }: ControlPanelProps) {
  const updateForce = (key: keyof typeof state.forces, value: number) => {
    onChange({
      ...state,
      forces: { ...state.forces, [key]: value },
    });
  };

  return (
    <div className="w-64 bg-gray-900/95 p-4 flex flex-col h-full border-l border-gray-700">
      <h2 className="text-lg font-semibold text-white mb-4">Force Controls</h2>

      {/* Force sliders */}
      <Slider
        label="Lift"
        value={state.forces.lift}
        min={FORCE_LIMITS.lift.min}
        max={FORCE_LIMITS.lift.max}
        color={COLORS.lift}
        onChange={(v) => updateForce('lift', v)}
      />

      <Slider
        label="Weight"
        value={state.forces.weight}
        min={FORCE_LIMITS.weight.min}
        max={FORCE_LIMITS.weight.max}
        color={COLORS.weight}
        onChange={(v) => updateForce('weight', v)}
      />

      <Slider
        label="Thrust"
        value={state.forces.thrust}
        min={FORCE_LIMITS.thrust.min}
        max={FORCE_LIMITS.thrust.max}
        color={COLORS.thrust}
        onChange={(v) => updateForce('thrust', v)}
      />

      <Slider
        label="Drag"
        value={state.forces.drag}
        min={FORCE_LIMITS.drag.min}
        max={FORCE_LIMITS.drag.max}
        color={COLORS.drag}
        onChange={(v) => updateForce('drag', v)}
      />

      <div className="border-t border-gray-700 my-4" />

      {/* Bank angle */}
      <Slider
        label="Bank Angle"
        value={state.bankAngle}
        min={BANK_ANGLE_LIMITS.min}
        max={BANK_ANGLE_LIMITS.max}
        color="#a855f7"
        unit="°"
        onChange={(v) => onChange({ ...state, bankAngle: v })}
      />

      <div className="border-t border-gray-700 my-4" />

      {/* Toggles */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={state.showComponents}
            onChange={(e) => onChange({ ...state, showComponents: e.target.checked })}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
          />
          <span className="text-sm text-gray-300">Show Lift Components</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={state.showNetForce}
            onChange={(e) => onChange({ ...state, showNetForce: e.target.checked })}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500"
          />
          <span className="text-sm text-gray-300">Show Net Force</span>
        </label>
      </div>

      <div className="flex-1" />

      {/* Reset button */}
      <button
        onClick={onReset}
        className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
      >
        <RotateCcw size={16} />
        Reset
      </button>
    </div>
  );
}
