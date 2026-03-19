import { FieldTooltip } from "./FieldTooltip";

interface VectorFieldProps {
  label: string;
  value: { x: number; y: number; z: number };
  description?: string;
  onChange: (value: { x: number; y: number; z: number }) => void;
  onBlur?: () => void;
}

export function VectorField({ label, value, description, onChange, onBlur }: VectorFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-tn-text-muted flex items-center gap-1">
        {label}
        {description && <FieldTooltip description={description} />}
      </label>
      <div className="flex gap-1">
        {(["x", "y", "z"] as const).map((axis) => (
          <div key={axis} className="flex-1">
            <label className="text-[10px] text-tn-text-muted uppercase">{axis}</label>
            <input
              type="number"
              value={value[axis]}
              onChange={(e) =>
                onChange({ ...value, [axis]: parseFloat(e.target.value) || 0 })
              }
              onBlur={onBlur}
              className="w-full px-1.5 py-1 text-xs bg-tn-bg border border-tn-border rounded focus:outline-none focus:border-tn-accent/60 transition-colors"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
