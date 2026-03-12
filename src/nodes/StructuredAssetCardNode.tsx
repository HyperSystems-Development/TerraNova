import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

interface StructuredAssetCardData extends Record<string, unknown> {
  label?: string;
  subtitle?: string;
  accent?: string;
  stats?: string[];
  badges?: string[];
}

type StructuredAssetCard = Node<StructuredAssetCardData, "structuredAssetCard">;

export function StructuredAssetCardNode({
  data,
  selected,
}: NodeProps<StructuredAssetCard>) {
  const label = typeof data.label === "string" ? data.label : "Asset";
  const subtitle = typeof data.subtitle === "string" ? data.subtitle : "";
  const accent = typeof data.accent === "string" ? data.accent : "#6b7280";
  const stats = Array.isArray(data.stats) ? data.stats.filter((entry): entry is string => typeof entry === "string") : [];
  const badges = Array.isArray(data.badges) ? data.badges.filter((entry): entry is string => typeof entry === "string") : [];

  return (
    <div
      className={`min-w-[220px] max-w-[240px] rounded-xl border bg-tn-surface/95 shadow-[0_14px_42px_rgba(0,0,0,0.28)] backdrop-blur-sm ${
        selected ? "border-tn-accent ring-1 ring-tn-accent/55" : "border-tn-border/70"
      }`}
      style={{
        boxShadow: selected
          ? `0 0 0 1px ${accent}55, 0 16px 42px rgba(0, 0, 0, 0.35)`
          : undefined,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!h-2.5 !w-2.5 !border-2 !border-tn-surface"
        style={{ background: accent }}
        isConnectable={false}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!h-2.5 !w-2.5 !border-2 !border-tn-surface"
        style={{ background: accent }}
        isConnectable={false}
      />

      <div className="border-b border-tn-border/50 px-3 py-2">
        <div className="flex items-start gap-2">
          <div
            className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
          />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-tn-text">
              {label}
            </p>
            {subtitle && (
              <p className="mt-1 text-[10px] leading-snug text-tn-text-muted">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {stats.length > 0 && (
        <div className="space-y-1 px-3 py-2">
          {stats.map((stat) => (
            <p key={stat} className="text-[10px] leading-snug text-tn-text-muted">
              {stat}
            </p>
          ))}
        </div>
      )}

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t border-tn-border/40 px-3 py-2">
          {badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-tn-border/50 bg-tn-bg/60 px-2 py-0.5 text-[9px] uppercase tracking-wider text-tn-text-muted"
            >
              {badge}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
