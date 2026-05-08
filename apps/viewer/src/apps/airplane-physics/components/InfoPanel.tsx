import type { AirplaneState } from '../types';
import { calculateLiftComponents, calculateNetForce, formatForce } from '../physics';
import { COLORS } from '../constants';

interface InfoPanelProps {
  state: AirplaneState;
}

interface ForceRowProps {
  label: string;
  value: number;
  color: string;
}

function ForceRow({ label, value, color }: ForceRowProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-gray-300">{label}</span>
      </span>
      <span className="font-mono text-gray-200">{formatForce(value)}</span>
    </div>
  );
}

export function InfoPanel({ state }: InfoPanelProps) {
  const liftComponents = calculateLiftComponents(state.forces.lift, state.bankAngle);
  const netForce = calculateNetForce(state.forces, state.bankAngle);
  const netForceMagnitude = Math.sqrt(netForce.x ** 2 + netForce.y ** 2 + netForce.z ** 2);

  return (
    <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 min-w-[240px] border border-gray-700">
      <h3 className="text-sm font-semibold text-white mb-3">Force Values</h3>

      <div className="space-y-2 text-sm">
        <ForceRow label="Lift" value={state.forces.lift} color={COLORS.lift} />
        <ForceRow label="Weight" value={state.forces.weight} color={COLORS.weight} />
        <ForceRow label="Thrust" value={state.forces.thrust} color={COLORS.thrust} />
        <ForceRow label="Drag" value={state.forces.drag} color={COLORS.drag} />

        {Math.abs(state.bankAngle) > 1 && (
          <>
            <div className="border-t border-gray-700 my-2" />
            <div className="text-xs text-gray-400 mb-1">
              Lift Components (Bank: {state.bankAngle.toFixed(0)}°)
            </div>
            <ForceRow
              label="Vertical"
              value={liftComponents.vertical}
              color={COLORS.liftVertical}
            />
            <ForceRow
              label="Horizontal"
              value={Math.abs(liftComponents.horizontal)}
              color={COLORS.liftHorizontal}
            />
          </>
        )}

        <div className="border-t border-gray-700 my-2" />
        <ForceRow label="Net Force" value={netForceMagnitude} color={COLORS.netForce} />

        <div className="text-xs text-gray-500 mt-2">
          <div>X: {formatForce(netForce.x)} (forward/back)</div>
          <div>Y: {formatForce(netForce.y)} (up/down)</div>
          {Math.abs(state.bankAngle) > 1 && (
            <div>Z: {formatForce(netForce.z)} (turn)</div>
          )}
        </div>
      </div>
    </div>
  );
}
