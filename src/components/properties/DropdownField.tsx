interface DropdownFieldProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export function DropdownField({ label, value, options, onChange }: DropdownFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-tn-text-muted">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 text-xs text-tn-text bg-tn-bg border border-tn-border rounded focus:outline-none focus:border-tn-accent/60 transition-colors"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
