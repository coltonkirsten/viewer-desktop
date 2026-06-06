import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AirplaneProps {
  bankAngle: number;
}

export function Airplane({ bankAngle }: AirplaneProps) {
  const bankRad = THREE.MathUtils.degToRad(bankAngle);
  const exhaustLeftRef = useRef<THREE.Mesh>(null);
  const exhaustRightRef = useRef<THREE.Mesh>(null);
  const navRedRef = useRef<THREE.PointLight>(null);
  const navGreenRef = useRef<THREE.PointLight>(null);

  // Animate engine exhaust flicker
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const flicker = 0.6 + Math.sin(t * 12) * 0.15 + Math.sin(t * 27) * 0.1;
    if (exhaustLeftRef.current) {
      exhaustLeftRef.current.scale.x = flicker;
      exhaustLeftRef.current.scale.y = flicker;
      exhaustLeftRef.current.scale.z = 0.8 + Math.sin(t * 18) * 0.2;
    }
    if (exhaustRightRef.current) {
      exhaustRightRef.current.scale.x = flicker;
      exhaustRightRef.current.scale.y = flicker;
      exhaustRightRef.current.scale.z = 0.8 + Math.sin(t * 18 + 1) * 0.2;
    }
    // Pulse nav lights
    const pulse = 0.6 + Math.sin(t * 3) * 0.4;
    if (navRedRef.current) navRedRef.current.intensity = pulse * 2;
    if (navGreenRef.current) navGreenRef.current.intensity = pulse * 2;
  });

  return (
    <group rotation={[bankRad, 0, 0]}>
      {/* ======= FUSELAGE ======= */}
      {/* Main body - sleek dark fuselage */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.10, 0.16, 2.8, 16]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Fuselage accent stripe (upper) */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.02, 0.025, 2.6, 8]} />
        <meshStandardMaterial color="#e94560" metalness={0.5} roughness={0.4} emissive="#e94560" emissiveIntensity={0.15} />
      </mesh>

      {/* Nose cone - sharp and aggressive */}
      <mesh position={[1.55, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.10, 0.7, 16]} />
        <meshStandardMaterial color="#16213e" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Nose tip - glowing accent */}
      <mesh position={[1.92, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.025, 0.12, 8]} />
        <meshStandardMaterial color="#e94560" emissive="#e94560" emissiveIntensity={0.8} metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Tail taper */}
      <mesh position={[-1.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.16, 0.5, 16]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* ======= COCKPIT ======= */}
      {/* Cockpit canopy - tinted glass bubble */}
      <mesh position={[0.85, 0.13, 0]}>
        <sphereGeometry args={[0.13, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color="#0f3460"
          metalness={0.1}
          roughness={0.05}
          transmission={0.4}
          thickness={0.3}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
        />
      </mesh>
      {/* Cockpit frame */}
      <mesh position={[0.85, 0.18, 0]}>
        <torusGeometry args={[0.11, 0.008, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#e94560" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* ======= MAIN WINGS - swept back ======= */}
      {/* Right wing */}
      <group position={[0, 0, 0]}>
        <mesh position={[-0.1, 0, 1.1]}>
          <boxGeometry args={[0.8, 0.04, 2.2]} />
          <meshStandardMaterial color="#16213e" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Wing leading edge accent */}
        <mesh position={[0.3, 0.005, 1.1]}>
          <boxGeometry args={[0.06, 0.05, 2.0]} />
          <meshStandardMaterial color="#e94560" emissive="#e94560" emissiveIntensity={0.2} metalness={0.5} roughness={0.4} />
        </mesh>
      </group>

      {/* Left wing */}
      <group position={[0, 0, 0]}>
        <mesh position={[-0.1, 0, -1.1]}>
          <boxGeometry args={[0.8, 0.04, 2.2]} />
          <meshStandardMaterial color="#16213e" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Wing leading edge accent */}
        <mesh position={[0.3, 0.005, -1.1]}>
          <boxGeometry args={[0.06, 0.05, 2.0]} />
          <meshStandardMaterial color="#e94560" emissive="#e94560" emissiveIntensity={0.2} metalness={0.5} roughness={0.4} />
        </mesh>
      </group>

      {/* ======= WINGLETS (angled tips) ======= */}
      <mesh position={[-0.15, 0.18, 2.15]} rotation={[0.5, 0, 0.1]}>
        <boxGeometry args={[0.35, 0.35, 0.03]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[-0.15, 0.18, -2.15]} rotation={[-0.5, 0, 0.1]}>
        <boxGeometry args={[0.35, 0.35, 0.03]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* ======= NAVIGATION LIGHTS ======= */}
      {/* Right wing tip - green */}
      <mesh position={[-0.1, 0.02, 2.18]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2.0} />
      </mesh>
      <pointLight ref={navGreenRef} position={[-0.1, 0.02, 2.25]} color="#22c55e" intensity={1.5} distance={3} />

      {/* Left wing tip - red */}
      <mesh position={[-0.1, 0.02, -2.18]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2.0} />
      </mesh>
      <pointLight ref={navRedRef} position={[-0.1, 0.02, -2.25]} color="#ef4444" intensity={1.5} distance={3} />

      {/* ======= HORIZONTAL STABILIZER ======= */}
      <mesh position={[-1.35, 0, 0]}>
        <boxGeometry args={[0.4, 0.03, 1.4]} />
        <meshStandardMaterial color="#16213e" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Stabilizer accent */}
      <mesh position={[-1.15, 0.005, 0]}>
        <boxGeometry args={[0.04, 0.04, 1.2]} />
        <meshStandardMaterial color="#e94560" emissive="#e94560" emissiveIntensity={0.15} metalness={0.5} roughness={0.4} />
      </mesh>

      {/* ======= VERTICAL STABILIZER (Tail Fin) ======= */}
      <mesh position={[-1.35, 0.4, 0]}>
        <boxGeometry args={[0.5, 0.8, 0.03]} />
        <meshStandardMaterial color="#16213e" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Tail fin accent stripe */}
      <mesh position={[-1.2, 0.55, 0.02]}>
        <boxGeometry args={[0.25, 0.15, 0.01]} />
        <meshStandardMaterial color="#e94560" emissive="#e94560" emissiveIntensity={0.3} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Tail light */}
      <mesh position={[-1.6, 0.75, 0]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2.0} />
      </mesh>
      <pointLight position={[-1.6, 0.75, 0]} color="#ffffff" intensity={0.8} distance={2} />

      {/* ======= ENGINES (under wings) ======= */}
      {/* Right engine nacelle */}
      <group position={[0.05, -0.16, 1]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.09, 0.5, 12]} />
          <meshStandardMaterial color="#0f3460" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Engine intake ring */}
        <mesh position={[0.27, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.07, 0.015, 8, 16]} />
          <meshStandardMaterial color="#e94560" metalness={0.7} roughness={0.3} emissive="#e94560" emissiveIntensity={0.3} />
        </mesh>
        {/* Engine exhaust glow */}
        <mesh ref={exhaustRightRef} position={[-0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.06, 0.35, 12]} />
          <meshStandardMaterial
            color="#ff6b35"
            emissive="#ff4500"
            emissiveIntensity={2.5}
            transparent
            opacity={0.7}
          />
        </mesh>
        <pointLight position={[-0.35, 0, 0]} color="#ff6b35" intensity={2} distance={2.5} />
      </group>

      {/* Left engine nacelle */}
      <group position={[0.05, -0.16, -1]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.09, 0.5, 12]} />
          <meshStandardMaterial color="#0f3460" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Engine intake ring */}
        <mesh position={[0.27, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.07, 0.015, 8, 16]} />
          <meshStandardMaterial color="#e94560" metalness={0.7} roughness={0.3} emissive="#e94560" emissiveIntensity={0.3} />
        </mesh>
        {/* Engine exhaust glow */}
        <mesh ref={exhaustLeftRef} position={[-0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.06, 0.35, 12]} />
          <meshStandardMaterial
            color="#ff6b35"
            emissive="#ff4500"
            emissiveIntensity={2.5}
            transparent
            opacity={0.7}
          />
        </mesh>
        <pointLight position={[-0.35, 0, 0]} color="#ff6b35" intensity={2} distance={2.5} />
      </group>

      {/* ======= BELLY DETAIL ======= */}
      <mesh position={[0.2, -0.15, 0]}>
        <boxGeometry args={[1.0, 0.03, 0.3]} />
        <meshStandardMaterial color="#0f3460" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}
