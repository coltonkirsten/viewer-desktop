import { OrbitControls, Grid } from '@react-three/drei';
import { Airplane } from './Airplane';
import { ForceVectors } from './ForceVectors';
import type { AirplaneState } from './types';

interface SceneProps {
  state: AirplaneState;
}

export function Scene({ state }: SceneProps) {
  return (
    <>
      {/* Lighting - dramatic three-point setup */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow color="#ffffff" />
      <directionalLight position={[-5, 5, -5]} intensity={0.4} color="#6b8cff" />
      <directionalLight position={[0, -3, 0]} intensity={0.15} color="#ff6b35" />

      {/* Sky color - deep gradient feel */}
      <color attach="background" args={['#0a0a1a']} />
      <fog attach="fog" args={['#0a0a1a', 20, 50]} />

      {/* Ground grid */}
      <Grid
        position={[0, -3, 0]}
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a1a3e"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#e94560"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      {/* Airplane model */}
      <Airplane bankAngle={state.bankAngle} />

      {/* Force vectors */}
      <ForceVectors
        forces={state.forces}
        bankAngle={state.bankAngle}
        showComponents={state.showComponents}
        showNetForce={state.showNetForce}
      />

      {/* Camera controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={30}
        target={[0, 0, 0]}
      />
    </>
  );
}
