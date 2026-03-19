import { FieldTooltip } from "./FieldTooltip";

interface ToggleFieldProps {
  label: string;
  value: boolean;
  description?: string;
  onChange: (value: boolean) => void;
}

export function ToggleField({ label, value, description, onChange }: ToggleFieldProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-[11px] text-tn-text-muted flex items-center gap-1">
        {label}
        {description && <FieldTooltip description={description} />}
      </label>
      <button
        onClick={() => onChange(!value)}
        className={`relative shrink-0 w-8 h-4 rounded-full transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-tn-accent/50 ${
          value ? "bg-tn-accent" : "bg-tn-border/80"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-tn-text transition-transform duration-150 ${
            value ? "translate-x-4" : ""
          }`}
        />
      </button>
    </div>
  );
}
