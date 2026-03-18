import { useId } from "react";
import { FieldTooltip } from "./FieldTooltip";

interface TextFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  description?: string;
  suggestions?: readonly string[];
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export function TextField({ label, value, placeholder, description, suggestions, onChange, onBlur }: TextFieldProps) {
  const listId = useId();
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-tn-text-muted flex items-center gap-1">
        {label}
        {description && <FieldTooltip description={description} />}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        list={suggestions && suggestions.length > 0 ? listId : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="px-2 py-1 text-xs bg-tn-bg border border-tn-border rounded focus:outline-none focus:border-tn-accent/60 transition-colors"
      />
      {suggestions && suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}
