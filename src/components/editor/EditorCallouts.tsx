export interface EditorCalloutItem {
  severity: "error" | "warning" | "info";
  title: string;
  detail: string;
}

const SEVERITY_COLORS: Record<EditorCalloutItem["severity"], string> = {
  error: "text-red-400",
  warning: "text-amber-400",
  info: "text-sky-400",
};

const SEVERITY_BAR: Record<EditorCalloutItem["severity"], string> = {
  error: "bg-red-500",
  warning: "bg-amber-400",
  info: "bg-sky-500",
};

const SEVERITY_ICONS: Record<EditorCalloutItem["severity"], string> = {
  error: "✖",
  warning: "⚠",
  info: "ℹ",
};

export function EditorCalloutSection({
  title,
  items,
  emptyState,
}: {
  title: string;
  items: EditorCalloutItem[];
  emptyState: string;
}) {
  const counts = {
    error: items.filter((i) => i.severity === "error").length,
    warning: items.filter((i) => i.severity === "warning").length,
    info: items.filter((i) => i.severity === "info").length,
  };

  return (
    <div className="rounded border border-tn-border/50 bg-tn-bg/60">
      {/* Header row */}
      <div className="flex items-center gap-2 border-b border-tn-border/40 px-3 py-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted flex-1">{title}</p>
        {counts.error > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-red-400">
            <span>✖</span><span>{counts.error}</span>
          </span>
        )}
        {counts.warning > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400">
            <span>⚠</span><span>{counts.warning}</span>
          </span>
        )}
        {counts.info > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-sky-400">
            <span>ℹ</span><span>{counts.info}</span>
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-[13px] text-emerald-400">✔</span>
          <p className="text-[11px] text-tn-text-muted">{emptyState}</p>
        </div>
      ) : (
        <div>
          {items.map((item, index) => (
            <div
              key={`${item.severity}-${item.title}-${index}`}
              className={`relative flex items-start gap-2.5 px-3 py-2 ${
                index < items.length - 1 ? "border-b border-tn-border/30" : ""
              } hover:bg-white/[0.02] transition-colors`}
            >
              {/* Left accent bar */}
              <div className={`absolute inset-y-0 left-0 w-0.5 rounded-l ${SEVERITY_BAR[item.severity]}`} />
              <span className={`mt-px shrink-0 text-[12px] pl-1 ${SEVERITY_COLORS[item.severity]}`}>
                {SEVERITY_ICONS[item.severity]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-tn-text leading-tight">{item.title}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-tn-text-muted">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EditorTipsSection({
  title,
  tips,
}: {
  title: string;
  tips: string[];
}) {
  return (
    <div className="rounded border border-tn-border/50 bg-tn-bg/60">
      <div className="flex items-center gap-2 border-b border-tn-border/40 px-3 py-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted flex-1">{title}</p>
        <span className="text-[10px] font-mono text-tn-text-muted">{tips.length}</span>
      </div>
      <div>
        {tips.map((tip, index) => (
          <div
            key={`${index}-${tip}`}
            className={`flex items-start gap-2.5 px-3 py-2 ${
              index < tips.length - 1 ? "border-b border-tn-border/30" : ""
            }`}
          >
            <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-tn-accent" />
            <p className="text-[11px] leading-relaxed text-tn-text-muted">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
