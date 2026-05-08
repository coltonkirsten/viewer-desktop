export interface Forces {
  lift: number;
  weight: number;
  thrust: number;
  drag: number;
}

export interface AirplaneState {
  forces: Forces;
  bankAngle: number; // Degrees (-90 to +90)
  showComponents: boolean;
  showNetForce: boolean;
}

export interface LiftComponents {
  vertical: number;
  horizontal: number;
}

export interface NetForce {
  x: number; // Thrust - Drag
  y: number; // Vertical lift - Weight
  z: number; // Horizontal lift component
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}
