import { Sun, Square, Circle, Triangle } from 'lucide-react';
import type { LightSource, Mirror, Lens, Prism, OpticalElement } from '../types';
import { UI } from '../constants';

interface PropertiesPanelProps {
  isOpen: boolean;
  selectedLight: LightSource | null;
  selectedElement: OpticalElement | null;
  onUpdateLight: (id: string, updates: Partial<LightSource>) => void;
  onUpdateElement: (id: string, kind: OpticalElement['kind'], updates: Record<string, unknown>) => void;
}

function PropertySection({ children, title, icon: Icon }: { children: React.ReactNode; title: string; icon: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[var(--holo-accent)]">
        <Icon size={14} />
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-[var(--holo-muted)]">{label}</label>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      min={min}
      max={max}
      step={step}
      className="w-full px-3 py-2 text-sm bg-[rgba(0,0,0,0.35)] border border-[var(--holo-border)] rounded focus:outline-none focus:border-[var(--holo-accent)]"
    />
  );
}

function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  showValue = true,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  showValue?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="flex-1 accent-[var(--holo-accent)]"
      />
      {showValue && (
        <span className="text-xs text-[var(--holo-muted)] w-12 text-right">
          {typeof value === 'number' ? value.toFixed(step < 1 ? 2 : 0) : value}
        </span>
      )}
    </div>
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded border border-[var(--holo-border)] cursor-pointer"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2 text-sm bg-[rgba(0,0,0,0.35)] border border-[var(--holo-border)] rounded focus:outline-none focus:border-[var(--holo-accent)]"
      />
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-lg border border-[var(--holo-border)] overflow-hidden">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 px-3 py-1.5 text-xs transition-colors ${
            value === option.value
              ? 'bg-[var(--holo-accent)] text-black'
              : 'bg-[rgba(0,0,0,0.35)] text-[var(--holo-text)] hover:bg-[rgba(60,60,80,0.8)]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function LightProperties({
  light,
  onUpdate,
}: {
  light: LightSource;
  onUpdate: (updates: Partial<LightSource>) => void;
}) {
  return (
    <PropertySection title="Light Source" icon={Sun}>
      <div className="grid grid-cols-2 gap-2">
        <PropertyRow label="X Position">
          <NumberInput
            value={Math.round(light.position.x)}
            onChange={(x) => onUpdate({ position: { ...light.position, x } })}
          />
        </PropertyRow>
        <PropertyRow label="Y Position">
          <NumberInput
            value={Math.round(light.position.y)}
            onChange={(y) => onUpdate({ position: { ...light.position, y } })}
          />
        </PropertyRow>
      </div>

      <PropertyRow label={`Angle (${Math.round((light.angle * 180) / Math.PI)}°)`}>
        <Slider
          value={(light.angle * 180) / Math.PI}
          onChange={(deg) => onUpdate({ angle: (deg * Math.PI) / 180 })}
          min={-180}
          max={180}
          step={1}
        />
      </PropertyRow>

      <PropertyRow label={`Spread (${Math.round((light.spread * 180) / Math.PI)}°)`}>
        <Slider
          value={(light.spread * 180) / Math.PI}
          onChange={(deg) => onUpdate({ spread: (deg * Math.PI) / 180 })}
          min={0}
          max={180}
          step={1}
        />
      </PropertyRow>

      <PropertyRow label="Ray Count">
        <Slider
          value={light.rayCount}
          onChange={(rayCount) => onUpdate({ rayCount: Math.round(rayCount) })}
          min={UI.RAY_COUNT_MIN}
          max={UI.RAY_COUNT_MAX}
          step={1}
        />
      </PropertyRow>

      <PropertyRow label="Color">
        <ColorInput value={light.color} onChange={(color) => onUpdate({ color })} />
      </PropertyRow>
    </PropertySection>
  );
}

function MirrorProperties({
  mirror,
  onUpdate,
}: {
  mirror: Mirror;
  onUpdate: (updates: Partial<Mirror>) => void;
}) {
  return (
    <PropertySection title="Mirror" icon={Square}>
      <PropertyRow label="Type">
        <SegmentedControl
          value={mirror.type}
          options={[
            { value: 'flat', label: 'Flat' },
            { value: 'concave', label: 'Concave' },
            { value: 'convex', label: 'Convex' },
          ]}
          onChange={(type) => onUpdate({ type, curvature: type === 'flat' ? 0 : mirror.curvature || 100 })}
        />
      </PropertyRow>

      {mirror.type !== 'flat' && (
        <PropertyRow label="Curvature Radius">
          <Slider
            value={mirror.curvature}
            onChange={(curvature) => onUpdate({ curvature })}
            min={50}
            max={500}
            step={10}
          />
        </PropertyRow>
      )}

      <div className="grid grid-cols-2 gap-2">
        <PropertyRow label="Start X">
          <NumberInput
            value={Math.round(mirror.start.x)}
            onChange={(x) => onUpdate({ start: { ...mirror.start, x } })}
          />
        </PropertyRow>
        <PropertyRow label="Start Y">
          <NumberInput
            value={Math.round(mirror.start.y)}
            onChange={(y) => onUpdate({ start: { ...mirror.start, y } })}
          />
        </PropertyRow>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <PropertyRow label="End X">
          <NumberInput
            value={Math.round(mirror.end.x)}
            onChange={(x) => onUpdate({ end: { ...mirror.end, x } })}
          />
        </PropertyRow>
        <PropertyRow label="End Y">
          <NumberInput
            value={Math.round(mirror.end.y)}
            onChange={(y) => onUpdate({ end: { ...mirror.end, y } })}
          />
        </PropertyRow>
      </div>
    </PropertySection>
  );
}

function LensProperties({
  lens,
  onUpdate,
}: {
  lens: Lens;
  onUpdate: (updates: Partial<Lens>) => void;
}) {
  return (
    <PropertySection title="Lens" icon={Circle}>
      <PropertyRow label="Type">
        <SegmentedControl
          value={lens.type}
          options={[
            { value: 'converging', label: 'Converging' },
            { value: 'diverging', label: 'Diverging' },
          ]}
          onChange={(type) => onUpdate({ type })}
        />
      </PropertyRow>

      <div className="grid grid-cols-2 gap-2">
        <PropertyRow label="X Position">
          <NumberInput
            value={Math.round(lens.position.x)}
            onChange={(x) => onUpdate({ position: { ...lens.position, x } })}
          />
        </PropertyRow>
        <PropertyRow label="Y Position">
          <NumberInput
            value={Math.round(lens.position.y)}
            onChange={(y) => onUpdate({ position: { ...lens.position, y } })}
          />
        </PropertyRow>
      </div>

      <PropertyRow label="Height">
        <Slider
          value={lens.height}
          onChange={(height) => onUpdate({ height })}
          min={30}
          max={300}
          step={5}
        />
      </PropertyRow>

      <PropertyRow label="Focal Length">
        <Slider
          value={lens.focalLength}
          onChange={(focalLength) => onUpdate({ focalLength })}
          min={20}
          max={300}
          step={5}
        />
      </PropertyRow>
    </PropertySection>
  );
}

function PrismProperties({
  prism,
  onUpdate,
}: {
  prism: Prism;
  onUpdate: (updates: Partial<Prism>) => void;
}) {
  return (
    <PropertySection title="Prism" icon={Triangle}>
      <div className="grid grid-cols-2 gap-2">
        <PropertyRow label="X Position">
          <NumberInput
            value={Math.round(prism.position.x)}
            onChange={(x) => onUpdate({ position: { ...prism.position, x } })}
          />
        </PropertyRow>
        <PropertyRow label="Y Position">
          <NumberInput
            value={Math.round(prism.position.y)}
            onChange={(y) => onUpdate({ position: { ...prism.position, y } })}
          />
        </PropertyRow>
      </div>

      <PropertyRow label={`Rotation (${Math.round((prism.rotation * 180) / Math.PI)}°)`}>
        <Slider
          value={(prism.rotation * 180) / Math.PI}
          onChange={(deg) => onUpdate({ rotation: (deg * Math.PI) / 180 })}
          min={0}
          max={360}
          step={1}
        />
      </PropertyRow>

      <PropertyRow label="Size">
        <Slider
          value={prism.sideLength}
          onChange={(sideLength) => onUpdate({ sideLength })}
          min={30}
          max={200}
          step={5}
        />
      </PropertyRow>

      <PropertyRow label="Refractive Index">
        <Slider
          value={prism.refractiveIndex}
          onChange={(refractiveIndex) => onUpdate({ refractiveIndex })}
          min={1.3}
          max={2.0}
          step={0.01}
        />
      </PropertyRow>
    </PropertySection>
  );
}

export function PropertiesPanel({
  isOpen,
  selectedLight,
  selectedElement,
  onUpdateLight,
  onUpdateElement,
}: PropertiesPanelProps) {
  const hasSelection = selectedLight || selectedElement;

  return (
    <div
      className={`
        ${isOpen ? 'w-[280px]' : 'w-0'}
        transition-all duration-200 overflow-hidden
        border-l border-[var(--holo-border)]
        bg-[rgba(15,15,25,0.95)]
        flex-shrink-0
      `}
    >
      <div className="w-[280px] h-full overflow-y-auto p-4 space-y-6">
        {!hasSelection ? (
          <div className="text-center py-8">
            <div className="text-[var(--holo-muted)] text-sm">No selection</div>
            <div className="text-[var(--holo-muted)] text-xs mt-2">
              Select an element to edit its properties
            </div>
          </div>
        ) : (
          <>
            {selectedLight && (
              <LightProperties
                light={selectedLight}
                onUpdate={(updates) => onUpdateLight(selectedLight.id, updates)}
              />
            )}

            {selectedElement?.kind === 'mirror' && (
              <MirrorProperties
                mirror={selectedElement.data}
                onUpdate={(updates) => onUpdateElement(selectedElement.data.id, 'mirror', updates)}
              />
            )}

            {selectedElement?.kind === 'lens' && (
              <LensProperties
                lens={selectedElement.data}
                onUpdate={(updates) => onUpdateElement(selectedElement.data.id, 'lens', updates)}
              />
            )}

            {selectedElement?.kind === 'prism' && (
              <PrismProperties
                prism={selectedElement.data}
                onUpdate={(updates) => onUpdateElement(selectedElement.data.id, 'prism', updates)}
              />
            )}
          </>
        )}

        {/* Help section */}
        <div className="pt-4 border-t border-[var(--holo-border)]">
          <div className="text-xs text-[var(--holo-muted)] space-y-1">
            <div className="font-semibold text-[var(--holo-text)] mb-2">Keyboard Shortcuts</div>
            <div>← → : Rotate light</div>
            <div>↑ ↓ : Adjust ray count</div>
            <div>Del : Delete selected</div>
            <div>Cmd+S : Save</div>
          </div>
        </div>
      </div>
    </div>
  );
}
