import { FieldTooltip } from "./FieldTooltip";

interface SliderFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  /** When true, the number input accepts any value beyond the slider range */
  allowInputOverflow?: boolean;
  onChange: (value: number) => void;
  onBlur?: () => void;
}

export function SliderField({ label, value, min = -100, max = 100, step = 0.01, description, allowInputOverflow, onChange, onBlur }: SliderFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-tn-text-muted flex items-center gap-1">
        {label}
        {description && <FieldTooltip description={description} />}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.min(value, max)}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onBlur={onBlur}
          className="flex-1 accent-tn-accent h-1.5 cursor-pointer"
        />
        <input
          type="number"
          value={value}
          min={min}
          max={allowInputOverflow ? undefined : max}
          step={step}
          onChange={(e) => {
            const raw = parseFloat(e.target.value);
            if (Number.isNaN(raw)) return;
            onChange(allowInputOverflow ? Math.max(min, raw) : Math.max(min, Math.min(max, raw)));
          }}
          onBlur={onBlur}
          className="w-16 shrink-0 px-1.5 py-1 text-xs bg-tn-bg border border-tn-border rounded text-right focus:outline-none focus:border-tn-accent/60 transition-colors"
        />
      </div>
    </div>
  );
}
