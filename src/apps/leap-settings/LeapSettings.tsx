import { Hand } from 'lucide-react';
import { InputSettings } from '../settings/components/InputSettings';

export function LeapSettings() {
  return (
    <div className="h-full flex flex-col bg-[rgba(10,10,20,0.95)]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--holo-border)]">
        <Hand size={18} className="text-[var(--holo-accent)]" />
        <h1 className="text-sm font-medium text-[var(--holo-text)]">Leap Settings</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <InputSettings />
      </div>
    </div>
  );
}

export default LeapSettings;
