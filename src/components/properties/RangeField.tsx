import { FieldTooltip } from "./FieldTooltip";
import { SliderField } from "./SliderField";

interface RangeFieldProps {
  label: string;
  value: { Min: number; Max: number };
  description?: string;
  onChange: (value: { Min: number; Max: number }) => void;
  onBlur?: () => void;
}

export function RangeField({ label, value, description, onChange, onBlur }: RangeFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-tn-text-muted flex items-center gap-1">
        {label}
        {description && <FieldTooltip description={description} />}
      </label>
      <SliderField
        label="Min"
        value={value.Min}
        min={-3}
        max={3}
        step={0.01}
        allowInputOverflow
        onChange={(v) => onChange({ ...value, Min: v })}
        onBlur={onBlur}
      />
      <SliderField
        label="Max"
        value={value.Max}
        min={-3}
        max={3}
        step={0.01}
        allowInputOverflow
        onChange={(v) => onChange({ ...value, Max: v })}
        onBlur={onBlur}
      />
    </div>
  );
}
