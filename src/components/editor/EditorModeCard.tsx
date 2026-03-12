interface EditorModeCardProps {
  eyebrow: string;
  title: string;
  description: string;
  stats?: string[];
  actionLabel: string;
  onAction: () => void;
}

export function EditorModeCard({
  eyebrow,
  title,
  description,
  stats = [],
  actionLabel,
  onAction,
}: EditorModeCardProps) {
  return (
    <div className="rounded border border-tn-border/50 bg-tn-bg/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">{eyebrow}</p>
          <p className="mt-1 text-[12px] font-semibold text-tn-text">{title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-tn-text-muted">{description}</p>
        </div>
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded border border-tn-accent/40 px-2.5 py-1.5 text-[10px] font-medium text-tn-accent transition-colors hover:bg-tn-accent/10"
        >
          {actionLabel}
        </button>
      </div>
      {stats.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {stats.map((stat) => (
            <span
              key={stat}
              className="rounded border border-tn-border/50 bg-tn-surface/50 px-2 py-1 text-[10px] text-tn-text-muted"
            >
              {stat}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
