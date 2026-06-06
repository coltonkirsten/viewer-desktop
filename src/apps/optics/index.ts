import type { AppDefinition } from '../types';
import { createLazyApp } from '../AppWrapper';

const OpticsApp = createLazyApp(() => import('./Optics').then(m => ({ default: m.Optics })));

export const app: AppDefinition = {
  id: 'optics',
  name: 'Optics Simulator',
  icon: 'Flashlight',
  component: OpticsApp,
  fileTypes: ['optics'],
  defaultSize: { width: 1000, height: 700 },
};
