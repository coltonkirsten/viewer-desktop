/**
 * Raven Sidebar Component
 */

import {
  LayoutDashboard,
  MessageSquare,
  Activity,
  Brain,
  Wrench,
  Settings,
} from 'lucide-react';
import type { Section, RavenStatus } from '../../types';

interface SidebarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  ravenStatus: RavenStatus;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  section: Section;
  activeSection: Section;
  onClick: (section: Section) => void;
}

function NavItem({ icon, label, section, activeSection, onClick }: NavItemProps) {
  const isActive = activeSection === section;

  return (
    <button
      onClick={() => onClick(section)}
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
        transition-colors duration-150
        ${
          isActive
            ? 'bg-[var(--holo-accent)]/20 text-[var(--holo-accent)]'
            : 'text-[var(--holo-muted)] hover:bg-[var(--holo-bg-alt)] hover:text-[var(--holo-text)]'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StatusIndicator({ status }: { status: RavenStatus }) {
  const statusColors: Record<RavenStatus, string> = {
    stopped: 'bg-gray-500',
    starting: 'bg-yellow-500 animate-pulse',
    running: 'bg-green-500',
    stopping: 'bg-yellow-500 animate-pulse',
    error: 'bg-red-500',
  };

  const statusLabels: Record<RavenStatus, string> = {
    stopped: 'Stopped',
    starting: 'Starting...',
    running: 'Running',
    stopping: 'Stopping...',
    error: 'Error',
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
      <span className="text-xs text-[var(--holo-muted)]">{statusLabels[status]}</span>
    </div>
  );
}

export function Sidebar({ activeSection, onSectionChange, ravenStatus }: SidebarProps) {
  return (
    <div className="w-48 flex flex-col bg-[var(--holo-bg-alt)] border-r border-[var(--holo-border)]">
      <div className="p-4 border-b border-[var(--holo-border)]">
        <h1 className="text-lg font-semibold text-[var(--holo-accent)]">RAVEN</h1>
        <p className="text-xs text-[var(--holo-muted)] mt-1">Voice Assistant</p>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        <NavItem
          icon={<LayoutDashboard size={18} />}
          label="Dashboard"
          section="dashboard"
          activeSection={activeSection}
          onClick={onSectionChange}
        />
        <NavItem
          icon={<MessageSquare size={18} />}
          label="Transcripts"
          section="transcripts"
          activeSection={activeSection}
          onClick={onSectionChange}
        />
        <NavItem
          icon={<Activity size={18} />}
          label="Function Logs"
          section="function-logs"
          activeSection={activeSection}
          onClick={onSectionChange}
        />
        <NavItem
          icon={<Brain size={18} />}
          label="Memories"
          section="memories"
          activeSection={activeSection}
          onClick={onSectionChange}
        />
        <NavItem
          icon={<Wrench size={18} />}
          label="Tools"
          section="tools"
          activeSection={activeSection}
          onClick={onSectionChange}
        />
        <NavItem
          icon={<Settings size={18} />}
          label="Settings"
          section="settings"
          activeSection={activeSection}
          onClick={onSectionChange}
        />
      </nav>

      <div className="border-t border-[var(--holo-border)]">
        <StatusIndicator status={ravenStatus} />
      </div>
    </div>
  );
}
