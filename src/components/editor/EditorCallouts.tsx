export interface EditorCalloutItem {
  severity: "error" | "warning" | "info";
  title: string;
  detail: string;
}

function calloutStyles(severity: EditorCalloutItem["severity"]) {
  switch (severity) {
    case "error":
      return {
        container: "border-red-500/40 bg-red-500/8",
        dot: "bg-red-400",
        label: "text-red-300",
      };
    case "warning":
      return {
        container: "border-amber-500/40 bg-amber-500/8",
        dot: "bg-amber-300",
        label: "text-amber-200",
      };
    default:
      return {
        container: "border-sky-500/35 bg-sky-500/8",
        dot: "bg-sky-300",
        label: "text-sky-200",
      };
  }
}

export function EditorCalloutSection({
  title,
  items,
  emptyState,
}: {
  title: string;
  items: EditorCalloutItem[];
  emptyState: string;
}) {
  return (
    <div className="rounded border border-tn-border/50 bg-tn-bg/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">{title}</p>
        <span className="text-[10px] font-mono text-tn-text-muted">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="rounded border border-dashed border-tn-border/50 bg-tn-surface/20 px-3 py-2 text-[11px] text-tn-text-muted">
          {emptyState}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => {
            const styles = calloutStyles(item.severity);
            return (
              <div
                key={`${item.severity}-${item.title}-${index}`}
                className={`rounded border px-3 py-2 ${styles.container}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`} />
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${styles.label}`}>
                    {item.severity}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-medium text-tn-text">{item.title}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-tn-text-muted">{item.detail}</p>
              </div>
            );
          })}
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
    <div className="rounded border border-tn-border/50 bg-tn-bg/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">{title}</p>
        <span className="text-[10px] font-mono text-tn-text-muted">{tips.length}</span>
      </div>
      <div className="space-y-2">
        {tips.map((tip, index) => (
          <div key={`${index}-${tip}`} className="rounded border border-tn-border/40 bg-tn-surface/35 px-3 py-2">
            <div className="flex items-start gap-2">
              <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-tn-accent" />
              <p className="text-[11px] leading-relaxed text-tn-text-muted">{tip}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
