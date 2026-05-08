/**
 * Raven App Definition
 * Standalone voice assistant management app
 */

import type { AppDefinition } from '../types';
import { createLazyApp } from '../AppWrapper';

const RavenApp = createLazyApp(() => import('./Raven').then(m => ({ default: m.Raven })));

export const app: AppDefinition = {
  id: 'raven',
  name: 'Raven',
  icon: 'Bird',
  component: RavenApp,
  // No fileTypes - this is a standalone app
  defaultSize: { width: 1100, height: 700 },
};
