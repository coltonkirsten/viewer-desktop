import type { AppDefinition } from '../types';
import { createLazyApp } from '../AppWrapper';

const AirplanePhysicsApp = createLazyApp(() => import('./AirplanePhysics').then(m => ({ default: m.AirplanePhysics })));

export const app: AppDefinition = {
  id: 'airplane-physics',
  name: 'Airplane Physics',
  icon: 'Plane',
  component: AirplanePhysicsApp,
  fileTypes: ['airplane'],
  defaultSize: { width: 1000, height: 700 },
};
