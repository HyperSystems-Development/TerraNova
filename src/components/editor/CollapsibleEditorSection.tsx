import type { ReactNode } from "react";

interface CollapsibleEditorSectionProps {
  title: string;
  description?: string;
  open: boolean;
  onToggle: () => void;
  badge?: string;
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
    <section className="rounded border border-tn-border/60 bg-tn-surface/35">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-white/5"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-tn-text-muted">{title}</p>
            {badge && (
              <span className="rounded border border-tn-border/50 bg-tn-bg/60 px-1.5 py-0.5 text-[10px] font-mono text-tn-text-muted">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-[11px] text-tn-text-muted">{description}</p>
          )}
        </div>
        <span className="shrink-0 rounded border border-tn-border/50 px-2 py-0.5 text-[10px] text-tn-text-muted">
          {open ? "Hide" : "Show"}
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
