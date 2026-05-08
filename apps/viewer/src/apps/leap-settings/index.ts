import type { AppDefinition } from '../types';
import { createLazyApp } from '../AppWrapper';

const LeapSettingsApp = createLazyApp(() =>
  import('./LeapSettings').then((m) => ({ default: m.LeapSettings }))
);

export const app: AppDefinition = {
  id: 'leap-settings',
  name: 'Leap Settings',
  icon: 'Hand',
  component: LeapSettingsApp,
  defaultSize: { width: 720, height: 620 },
};
