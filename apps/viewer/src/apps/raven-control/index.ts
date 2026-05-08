import type { AppDefinition } from '../types';
import { createLazyApp } from '../AppWrapper';

const RavenControlApp = createLazyApp(() =>
  import('./RavenControl').then((m) => ({ default: m.RavenControl }))
);

export const app: AppDefinition = {
  id: 'raven-control',
  name: 'Raven Control',
  icon: 'Bird',
  component: RavenControlApp,
  defaultSize: { width: 1200, height: 800 },
};
