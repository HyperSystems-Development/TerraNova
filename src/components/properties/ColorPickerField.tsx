interface ColorPickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorPickerField({ label, value, onChange }: ColorPickerFieldProps) {
  const displayValue = value.toUpperCase();

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-tn-text-muted">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 rounded border border-tn-border bg-transparent cursor-pointer shrink-0 p-0.5"
          aria-label={label}
        />
        <input
          type="text"
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="flex-1 px-2 py-1 text-xs bg-tn-bg border border-tn-border rounded font-mono tracking-wide focus:outline-none focus:border-tn-accent/60 transition-colors"
        />
      </div>
    </div>
  );
}
