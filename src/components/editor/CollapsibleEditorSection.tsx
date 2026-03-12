import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

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
    <section className="rounded-lg border border-tn-border/70 bg-tn-surface/45 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-white/5"
      >
        <div className="min-w-0 flex items-start gap-3">
          {icon && (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-tn-border/50 bg-tn-bg/70 text-tn-accent">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tn-text">{title}</p>
              {badge && (
                <span className="rounded border border-tn-border/50 bg-tn-bg/60 px-1.5 py-0.5 text-[10px] font-mono text-tn-text-muted">
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="mt-1 text-[11px] leading-relaxed text-tn-text-muted">{description}</p>
            )}
          </div>
        </div>
        <span className="shrink-0 rounded border border-tn-border/50 bg-tn-bg/60 px-2 py-1 text-[10px] font-medium text-tn-text-muted">
          <span className="flex items-center gap-1.5">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {open ? "Hide" : "Show"}
          </span>
        </span>
      </button>
      {open && (
        <div className="border-t border-tn-border/40 px-3 py-3">
          {children}
        </div>
      )}
    </section>
  );
}
