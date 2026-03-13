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
  children,
}: CollapsibleEditorSectionProps) {
  return (
    <section className="rounded-lg border border-tn-border/70 bg-tn-surface/45 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/5"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-tn-text-muted" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-tn-text-muted" />
        )}
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-tn-text">{title}</span>
        {badge && (
          <span className="rounded border border-tn-border/50 bg-tn-bg/60 px-1.5 py-0.5 text-[10px] font-mono text-tn-text-muted">
            {badge}
          </span>
        )}
        {description && !open && (
          <span className="ml-1 min-w-0 truncate text-[10px] text-tn-text-muted">{description}</span>
        )}
      </button>
      {open && (
        <div className="border-t border-tn-border/40 px-3 py-3">
          {description && (
            <p className="mb-3 text-[11px] leading-relaxed text-tn-text-muted">{description}</p>
          )}
          {children}
        </div>
      )}
    </section>
  );
}
