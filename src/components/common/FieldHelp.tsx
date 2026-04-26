import { useUIStore } from "@/stores/uiStore";

interface FieldHelpProps {
  description: string;
  children: React.ReactNode;
}

export function FieldHelp({ description, children }: FieldHelpProps) {
  const helpMode = useUIStore((s) => s.helpMode);

  return (
    <div className="relative">
      {children}
      {helpMode && (
        <div className="mt-1 text-xs text-tn-text-muted leading-relaxed">
          {description}
        </div>
      )}
    </div>
  );
}
