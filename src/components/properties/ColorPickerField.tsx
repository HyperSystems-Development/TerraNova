interface ColorPickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorPickerField({ label, value, onChange }: ColorPickerFieldProps) {
  const displayValue = value.toUpperCase();

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-tn-text-muted">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 rounded border border-tn-border bg-transparent cursor-pointer"
          aria-label={label}
        />
        <div
          className="h-5 w-5 rounded border border-tn-border/80 shrink-0"
          style={{ backgroundColor: value }}
          aria-hidden
        />
        <input
          type="text"
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="flex-1 px-2 py-1 text-xs bg-tn-bg border border-tn-border rounded font-mono tracking-wide"
        />
      </div>
    </div>
  );
}
