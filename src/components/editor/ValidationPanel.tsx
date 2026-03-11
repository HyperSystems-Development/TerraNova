import type { KeyboardEvent } from "react";
import { useReactFlow } from "@xyflow/react";
import { useDiagnosticsStore } from "@/stores/diagnosticsStore";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";
import type { GraphDiagnostic, DiagnosticSeverity } from "@/utils/graphDiagnostics";
import {
  fillDelimiterGaps,
  normalizeDelimiterRanges,
  resolveDelimiterEnvironmentDefaults,
} from "@/utils/environmentDelimiters";

const SEVERITY_ORDER: DiagnosticSeverity[] = ["error", "warning", "info"];

const SEVERITY_COLORS: Record<DiagnosticSeverity, string> = {
  error: "text-red-400",
  warning: "text-yellow-400",
  info: "text-blue-400",
};

const SEVERITY_ICONS: Record<DiagnosticSeverity, string> = {
  error: "\u2716",
  warning: "\u26A0",
  info: "\u2139",
};

const SEVERITY_LABELS: Record<DiagnosticSeverity, string> = {
  error: "Errors",
  warning: "Warnings",
  info: "Info",
};

export function ValidationPanel() {
  const diagnostics = useDiagnosticsStore((s) => s.diagnostics);
  const assetValidationBadge = useDiagnosticsStore((s) => s.assetValidationBadge);
  const nodes = useEditorStore((s) => s.nodes);
  const biomeConfig = useEditorStore((s) => s.biomeConfig);
  const setBiomeConfig = useEditorStore((s) => s.setBiomeConfig);
  const setSelectedNodeId = useEditorStore((s) => s.setSelectedNodeId);
  const setEditingContext = useEditorStore((s) => s.setEditingContext);
  const switchBiomeSection = useEditorStore((s) => s.switchBiomeSection);
  const updateNodeField = useEditorStore((s) => s.updateNodeField);
  const commitState = useEditorStore((s) => s.commitState);
  const setDirty = useProjectStore((s) => s.setDirty);
  const reactFlow = useReactFlow();

  // Group by severity
  const grouped = new Map<DiagnosticSeverity, GraphDiagnostic[]>();
  for (const d of diagnostics) {
    const list = grouped.get(d.severity);
    if (list) {
      list.push(d);
    } else {
      grouped.set(d.severity, [d]);
    }
  }

  const counts = {
    error: grouped.get("error")?.length ?? 0,
    warning: grouped.get("warning")?.length ?? 0,
    info: grouped.get("info")?.length ?? 0,
  };

  function handleClick(d: GraphDiagnostic) {
    if (d.nodeId) {
      setSelectedNodeId(d.nodeId);
      reactFlow.fitView({
        nodes: [{ id: d.nodeId }],
        padding: 0.3,
        duration: 300,
      });
      return;
    }

    if (!d.biomeSection) return;

    setEditingContext("Biome");
    switchBiomeSection(d.biomeSection);

    const sectionOutputId = useEditorStore.getState().biomeSections?.[d.biomeSection]?.outputNodeId ?? null;
    if (sectionOutputId) {
      setSelectedNodeId(sectionOutputId);
      reactFlow.fitView({
        nodes: [{ id: sectionOutputId }],
        padding: 0.3,
        duration: 300,
      });
    } else {
      setSelectedNodeId(null);
    }
  }

  function updateDelimiterNode(
    nodeId: string,
    updater: (delimiters: unknown[]) => Array<Record<string, unknown>>,
    label: string,
  ) {
    const node = nodes.find((entry) => entry.id === nodeId);
    if (!node) return;
    const data = node.data as Record<string, unknown>;
    const fields = (data.fields as Record<string, unknown> | undefined) ?? {};
    const nextDelimiters = updater(Array.isArray(fields.Delimiters) ? fields.Delimiters : []);
    updateNodeField(nodeId, "Delimiters", nextDelimiters);
    setDirty(true);
    commitState(label);
  }

  function getDelimiterIndex(diagnostic: GraphDiagnostic): number | null {
    const delimiterIndex = diagnostic.meta?.delimiterIndex;
    return typeof delimiterIndex === "number" ? delimiterIndex : null;
  }

  function getFixLabel(diagnostic: GraphDiagnostic): string | null {
    const rawType = typeof diagnostic.meta?.rawType === "string" ? diagnostic.meta.rawType : null;
    switch (diagnostic.code) {
      case "env-delimiter-invalid-range":
      case "env-delimiter-overlap":
        return "Normalize ranges";
      case "env-delimiter-gap":
        return "Fill gaps";
      case "env-delimiter-missing-environment":
      case "biome-environment-missing-ref-name":
      case "biome-environment-missing-provider":
      case "biome-environment-no-constants":
        return "Use Default";
      case "env-delimiter-unsupported-provider":
        return rawType === "Imported" || rawType === "Exported" ? "Use Default" : null;
      default:
        return null;
    }
  }

  function handleFix(diagnostic: GraphDiagnostic) {
    switch (diagnostic.code) {
      case "env-delimiter-invalid-range":
      case "env-delimiter-overlap":
        if (diagnostic.nodeId) {
          updateDelimiterNode(
            diagnostic.nodeId,
            normalizeDelimiterRanges,
            "Normalize environment delimiters",
          );
        }
        return;
      case "env-delimiter-gap":
        if (diagnostic.nodeId) {
          updateDelimiterNode(
            diagnostic.nodeId,
            fillDelimiterGaps,
            "Fill environment delimiter gaps",
          );
        }
        return;
      case "env-delimiter-missing-environment":
        if (diagnostic.nodeId) {
          const delimiterIndex = getDelimiterIndex(diagnostic);
          updateDelimiterNode(
            diagnostic.nodeId,
            (delimiters) => resolveDelimiterEnvironmentDefaults(
              delimiters,
              delimiterIndex === null ? undefined : [delimiterIndex],
            ),
            "Resolve delimiter environments to Default",
          );
        }
        return;
      case "env-delimiter-unsupported-provider":
        if (
          diagnostic.nodeId
          && (diagnostic.meta?.rawType === "Imported" || diagnostic.meta?.rawType === "Exported")
        ) {
          const delimiterIndex = getDelimiterIndex(diagnostic);
          updateDelimiterNode(
            diagnostic.nodeId,
            (delimiters) => resolveDelimiterEnvironmentDefaults(
              delimiters,
              delimiterIndex === null ? undefined : [delimiterIndex],
            ),
            "Resolve unsupported environment refs to Default",
          );
        }
        return;
      case "biome-environment-missing-ref-name":
      case "biome-environment-missing-provider":
      case "biome-environment-no-constants":
        if (!biomeConfig) return;
        setBiomeConfig({
          ...biomeConfig,
          EnvironmentProvider: { Type: "Default" },
        });
        setDirty(true);
        commitState("Use default biome environment");
        return;
      default:
        return;
    }
  }

  function handleIssueKeyDown(event: KeyboardEvent<HTMLDivElement>, diagnostic: GraphDiagnostic) {
    if (!diagnostic.nodeId && !diagnostic.biomeSection) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleClick(diagnostic);
  }

  if (diagnostics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-tn-text-muted gap-2 px-4">
        <span className="text-2xl text-green-400">{"\u2714"}</span>
        <span className="text-xs">No issues found</span>
        <span className="rounded border border-tn-border bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-tn-text-muted">
          {assetValidationBadge.label}
        </span>
        {assetValidationBadge.detail && (
          <span className="text-[10px] text-tn-text-muted/70 text-center">
            {assetValidationBadge.detail}
          </span>
        )}
      </div>
    );
  }

  const summaryParts = [
    counts.error > 0 && `${counts.error} error${counts.error > 1 ? "s" : ""}`,
    counts.warning > 0 && `${counts.warning} warning${counts.warning > 1 ? "s" : ""}`,
    counts.info > 0 && `${counts.info} info`,
  ].filter(Boolean);

  return (
    <div className="flex flex-col h-full">
      {/* Summary header */}
      <div className="shrink-0 px-3 py-2 border-b border-tn-border text-[11px] text-tn-text-muted flex flex-col gap-1">
        <div>{summaryParts.join(", ")}</div>
        <div className="flex items-center gap-2">
          <span className="rounded border border-tn-border bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-tn-text-muted">
            {assetValidationBadge.label}
          </span>
          {assetValidationBadge.detail && (
            <span className="text-[10px] text-tn-text-muted/70">
              {assetValidationBadge.detail}
            </span>
          )}
        </div>
      </div>

      {/* Grouped diagnostics */}
      <div className="flex-1 overflow-y-auto">
        {SEVERITY_ORDER.map((severity) => {
          const items = grouped.get(severity);
          if (!items || items.length === 0) return null;
          return (
            <div key={severity} className="mb-1">
              <div className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${SEVERITY_COLORS[severity]}`}>
                {SEVERITY_LABELS[severity]} ({items.length})
              </div>
              {items.map((d, i) => (
                <div
                  key={`${severity}-${i}`}
                  onClick={d.nodeId || d.biomeSection ? () => handleClick(d) : undefined}
                  onKeyDown={(event) => handleIssueKeyDown(event, d)}
                  role={d.nodeId || d.biomeSection ? "button" : undefined}
                  tabIndex={d.nodeId || d.biomeSection ? 0 : -1}
                  className={`w-full text-left px-3 py-1 text-[11px] hover:bg-white/5 transition-colors flex items-start gap-1.5 ${
                    d.nodeId || d.biomeSection ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <span className={`shrink-0 ${SEVERITY_COLORS[severity]}`}>
                    {SEVERITY_ICONS[severity]}
                  </span>
                  <span className="flex-1 flex flex-col gap-0.5">
                    <span className="text-tn-text-muted leading-tight">{d.message}</span>
                    <span className="flex flex-wrap gap-1 text-[10px] text-tn-text-muted/70 uppercase tracking-wide">
                      {d.field && <span>{d.field}</span>}
                      {getDelimiterIndex(d) !== null && <span>{`Delimiter [${getDelimiterIndex(d)}]`}</span>}
                      {d.biomeSection && <span>{`Jump to ${d.biomeSection}`}</span>}
                    </span>
                  </span>
                  {getFixLabel(d) && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleFix(d);
                      }}
                      className="shrink-0 rounded border border-tn-border bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-tn-text-muted hover:bg-white/10"
                    >
                      {getFixLabel(d)}
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
