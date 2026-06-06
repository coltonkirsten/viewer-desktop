import { useMemo } from 'react';
import * as THREE from 'three';
import type { Forces, NetForce } from './types';
import { calculateLiftComponents, calculateNetForce } from './physics';
import { COLORS, VECTOR_SCALE } from './constants';

interface ArrowProps {
  start: THREE.Vector3;
  direction: THREE.Vector3;
  length: number;
  color: string;
  opacity?: number;
  dashed?: boolean;
}

function Arrow({ start, direction, length, color, opacity = 1, dashed = false }: ArrowProps) {
  const normalizedDir = direction.clone().normalize();
  const headLength = Math.min(length * 0.2, 0.3);
  const headWidth = headLength * 0.5;

  // Create the shaft
  const shaftGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.03, 0.03, length - headLength, 8);
    geo.translate(0, (length - headLength) / 2, 0);
    return geo;
  }, [length, headLength]);

  // Create the arrowhead
  const headGeometry = useMemo(() => {
    const geo = new THREE.ConeGeometry(headWidth, headLength, 8);
    geo.translate(0, length - headLength / 2, 0);
    return geo;
  }, [length, headLength, headWidth]);

  // Calculate rotation to align with direction
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalizedDir);
    return q;
  }, [normalizedDir]);

  const euler = useMemo(() => {
    const e = new THREE.Euler();
    e.setFromQuaternion(quaternion);
    return e;
  }, [quaternion]);

  if (length < 0.1) return null;

  return (
    <group position={start} rotation={euler}>
      <mesh geometry={shaftGeometry}>
        <meshStandardMaterial
          color={color}
          transparent={opacity < 1 || dashed}
          opacity={opacity}
        />
      </mesh>
      <mesh geometry={headGeometry}>
        <meshStandardMaterial
          color={color}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}

interface ForceVectorsProps {
  forces: Forces;
  bankAngle: number;
  showComponents: boolean;
  showNetForce: boolean;
}

export function ForceVectors({ forces, bankAngle, showComponents, showNetForce }: ForceVectorsProps) {
  const origin = new THREE.Vector3(0, 0, 0);
  const bankRad = THREE.MathUtils.degToRad(bankAngle);

  // Lift direction (perpendicular to wings, tilts with bank)
  const liftDir = useMemo(() => {
    return new THREE.Vector3(0, Math.cos(bankRad), Math.sin(bankRad));
  }, [bankRad]);

  // Lift component directions
  const liftComponents = useMemo(() => calculateLiftComponents(forces.lift, bankAngle), [forces.lift, bankAngle]);

  // Net force calculation
  const netForce: NetForce = useMemo(() => calculateNetForce(forces, bankAngle), [forces, bankAngle]);
  const netForceMagnitude = Math.sqrt(netForce.x ** 2 + netForce.y ** 2 + netForce.z ** 2);
  const netForceDir = useMemo(() => {
    if (netForceMagnitude < 1) return new THREE.Vector3(0, 1, 0);
    return new THREE.Vector3(netForce.x, netForce.y, netForce.z).normalize();
  }, [netForce, netForceMagnitude]);

  return (
    <group>
      {/* Lift - perpendicular to wings (blue) */}
      <Arrow
        start={origin}
        direction={liftDir}
        length={forces.lift * VECTOR_SCALE}
        color={COLORS.lift}
      />

      {/* Weight - always downward (red) */}
      <Arrow
        start={origin}
        direction={new THREE.Vector3(0, -1, 0)}
        length={forces.weight * VECTOR_SCALE}
        color={COLORS.weight}
      />

      {/* Thrust - forward (green) */}
      <Arrow
        start={origin}
        direction={new THREE.Vector3(1, 0, 0)}
        length={forces.thrust * VECTOR_SCALE}
        color={COLORS.thrust}
      />

      {/* Drag - backward (orange) */}
      <Arrow
        start={origin}
        direction={new THREE.Vector3(-1, 0, 0)}
        length={forces.drag * VECTOR_SCALE}
        color={COLORS.drag}
      />

      {/* Lift Components (when banked and enabled) */}
      {showComponents && Math.abs(bankAngle) > 1 && (
        <>
          {/* Vertical component of lift (light blue, semi-transparent) */}
          <Arrow
            start={origin}
            direction={new THREE.Vector3(0, 1, 0)}
            length={Math.abs(liftComponents.vertical) * VECTOR_SCALE}
            color={COLORS.liftVertical}
            opacity={0.7}
            dashed
          />

          {/* Horizontal component of lift (cyan, semi-transparent) */}
          <Arrow
            start={origin}
            direction={new THREE.Vector3(0, 0, bankAngle > 0 ? 1 : -1)}
            length={Math.abs(liftComponents.horizontal) * VECTOR_SCALE}
            color={COLORS.liftHorizontal}
            opacity={0.7}
            dashed
          />
        </>
      )}

      {/* Net Force (purple) */}
      {showNetForce && netForceMagnitude > 100 && (
        <Arrow
          start={origin}
          direction={netForceDir}
          length={netForceMagnitude * VECTOR_SCALE}
          color={COLORS.netForce}
          opacity={0.9}
        />
      )}
    </group>
  );
}
