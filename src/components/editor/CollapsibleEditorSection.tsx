import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleEditorSectionProps {
  title: string;
  description?: string;
  open: boolean;
  onToggle: () => void;
  badge?: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function CollapsibleEditorSection({
  title,
  description,
  open,
  onToggle,
  badge,
  icon,
  children,
}: CollapsibleEditorSectionProps) {
  return (
    <section className="rounded-lg border border-tn-border bg-tn-surface/60 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${title.toLowerCase().replace(/\s+/g, "-")}-content`}
        className="w-full px-3 py-2 text-left transition-colors hover:bg-tn-accent/8 flex flex-col"
      >
        <div className="flex min-w-0 items-center gap-2">
          {icon && <span className="text-tn-text-muted">{icon}</span>}
          <span className={`transition-transform duration-150 ${open ? "rotate-0" : "-rotate-90"}`} aria-hidden="true">
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-tn-text-muted" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-tn-text">{title}</span>
          {badge && (
            <span className="ml-auto rounded border border-tn-border bg-tn-bg px-1.5 py-0.5 text-[10px] font-mono text-tn-text-muted">
              {badge}
            </span>
          )}
        </div>
        {description && !open && (
          <p className="pl-[1.375rem] pt-0.5 text-[10px] leading-relaxed text-tn-text-muted/70">
            {description}
          </p>
        )}
      </button>
      {open && (
        <div id={`${title.toLowerCase().replace(/\s+/g, "-")}-content`} className="border-t border-tn-border/50 px-3 py-3">
          {description && (
            <p className="mb-3 text-[11px] leading-relaxed text-tn-text-muted">{description}</p>
          )}
          {children}
        </div>
      )}
    </section>
  );
}
