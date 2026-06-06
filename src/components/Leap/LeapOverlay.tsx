import type { CursorState } from '../../leap/types';
import type { LeapCrosshairStyle } from '../../stores/settingsStore';

interface LeapOverlayProps {
  cursors: CursorState[];
  showCrosshairs: boolean;
  crosshairStyle: LeapCrosshairStyle;
}

export function LeapOverlay({ cursors, showCrosshairs, crosshairStyle }: LeapOverlayProps) {
  const tracked = cursors.filter((cursor) => cursor.isTracked);

  return (
    <div className="leap-overlay fixed inset-0 pointer-events-none z-[9998]">
      {showCrosshairs &&
        tracked.map((cursor) => (
          <div
            key={cursor.chirality}
            className={`leap-crosshair leap-crosshair-${crosshairStyle} ${cursor.chirality === 'left' ? 'leap-crosshair-left' : 'leap-crosshair-right'} ${cursor.isPinching ? 'is-pinching' : ''}`}
            style={{
              transform: `translate(${cursor.x - 17}px, ${cursor.y - 17}px)`,
            }}
          >
            <div className="leap-crosshair-center" />
            <div className="leap-crosshair-ring" />
            <div className="leap-crosshair-arms" />
          </div>
        ))}
    </div>
  );
}
