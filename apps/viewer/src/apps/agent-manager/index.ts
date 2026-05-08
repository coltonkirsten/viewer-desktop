import type { AppDefinition } from '../types';
import { createLazyApp } from '../AppWrapper';

const AgentManagerApp = createLazyApp(() => import('./AgentManager').then(m => ({ default: m.AgentManager })));

export const app: AppDefinition = {
  id: 'agent-manager',
  name: 'Agents',
  icon: 'Bot',
  component: AgentManagerApp,
  fileTypes: ['agents'],
  defaultSize: { width: 1200, height: 800 },
};
