import type { Forces, LiftComponents, NetForce } from './types';

export function calculateLiftComponents(
  liftMagnitude: number,
  bankAngleDegrees: number
): LiftComponents {
  const bankAngleRad = (bankAngleDegrees * Math.PI) / 180;
  return {
    vertical: liftMagnitude * Math.cos(bankAngleRad),
    horizontal: liftMagnitude * Math.sin(bankAngleRad),
  };
}

export function calculateNetForce(
  forces: Forces,
  bankAngleDegrees: number
): NetForce {
  const liftComponents = calculateLiftComponents(forces.lift, bankAngleDegrees);
  return {
    x: forces.thrust - forces.drag,
    y: liftComponents.vertical - forces.weight,
    z: liftComponents.horizontal,
  };
}

export function formatForce(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}kN`;
  }
  return `${value.toFixed(0)}N`;
}
