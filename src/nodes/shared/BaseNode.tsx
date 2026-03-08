import { Component, Fragment, memo } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Handle, useStore, type NodeProps, type Node } from "@xyflow/react";
import type { HandleDef } from "./handles";
import { getHandleColor, INPUT_HANDLE_COLOR } from "./handles";
import { AssetCategory, CATEGORY_COLORS, EvalStatus } from "@/schema/types";
import { ROW_H, handleTop, inputPosition, outputPosition, inputSide, outputSide } from "./nodeLayout";
import { usePreviewStore } from "@/stores/previewStore";
import { NodeThumbnail } from "@/components/nodes/NodeThumbnail";
import { useLanguage } from "@/languages/useLanguage";
import { getEvalStatus } from "@/utils/densityEvaluator";
import { NODE_TIPS } from "@/schema/nodeTips";
import { useDiagnosticsStore } from "@/stores/diagnosticsStore";
import { useDragStore } from "@/stores/dragStore";
import { isAcceptableTarget } from "@/hooks/useConnectionSuggestions";
import type { DiagnosticSeverity } from "@/utils/graphDiagnostics";
import { useSettingsStore } from "@/stores/settingsStore";
import { getDensityAccentColor } from "@/schema/densitySubcategories";
import { HANDLE_REGISTRY } from "@/nodes/handleRegistry";
import { isLegacyTypeKey } from "@/nodes/shared/legacyTypes";
import { getBridgeInfo } from "@/data/bridgeRegistry";
import { getSchemaPortDescription } from "@/schema/schemaLoader";

/** Tiny error boundary scoped to a single node body.  Prevents one
 *  bad field value (e.g. object rendered as React child) from crashing
 *  the entire React tree. */
class NodeBodyBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state: { error: string | null } = { error: null };
  static getDerivedStateFromError(err: Error) { return { error: err.message }; }
  componentDidCatch(err: Error, info: ErrorInfo) { console.error("Node render error:", err, info.componentStack); }
  render() {
    if (this.state.error) {
      return <div className="text-[10px] text-red-400 px-1 py-0.5 break-words">{this.state.error}</div>;
    }
    return this.props.children;
  }
}

const CATEGORY_LABELS: Partial<Record<AssetCategory, string>> = {
  [AssetCategory.Density]: "Density",
  [AssetCategory.Curve]: "Curve",
  [AssetCategory.MaterialProvider]: "Material",
  [AssetCategory.Pattern]: "Pattern",
  [AssetCategory.PositionProvider]: "Position",
  [AssetCategory.Prop]: "Prop",
  [AssetCategory.Scanner]: "Scanner",
  [AssetCategory.Assignment]: "Assignment",
  [AssetCategory.VectorProvider]: "Vector",
  [AssetCategory.EnvironmentProvider]: "Environment",
  [AssetCategory.TintProvider]: "Tint",
  [AssetCategory.BlockMask]: "Block Mask",
  [AssetCategory.Directionality]: "Directionality",
};

const EVAL_STATUS_COLORS: Record<EvalStatus, string> = {
  [EvalStatus.Full]: "#4ade80",        // green
  [EvalStatus.Approximated]: "#facc15", // yellow
  [EvalStatus.Unsupported]: "#f87171",  // red
};

const EVAL_STATUS_LABELS: Record<EvalStatus, string> = {
  [EvalStatus.Full]: "Preview: accurate",
  [EvalStatus.Approximated]: "Preview: approximated",
  [EvalStatus.Unsupported]: "Preview: not available (context-dependent)",
};

const VALIDATION_BADGE_COLORS: Record<DiagnosticSeverity, string> = {
  error: "#f87171",
  warning: "#facc15",
  info: "#60a5fa",
};

// Pre-computed shadow strings to avoid re-creating on every render
const SHADOW_OUTPUT = "0 0 0 2px #f59e0b, 0 0 12px rgba(245,158,11,0.4), 0 2px 8px rgba(0,0,0,0.4)";
const SHADOW_SELECTED = "0 0 0 2px #f59e0b, 0 2px 8px rgba(0,0,0,0.4)";
const SHADOW_DEFAULT = "0 2px 8px rgba(0,0,0,0.4)";

/** Returns true if the label conveys meaningful type info beyond generic "Input"/"Output". */
function isLabelSignificant(label: string): boolean {
  if (label === "Input" || label === "Output") return false;
  if (/^Input \d+$/.test(label) || /^Output \d+$/.test(label)) return false;
  if (/^Input [A-Z]$/.test(label)) return false;
  if (/^Entry \d+$/.test(label)) return false;
  return true;
}

export interface BaseNodeData extends Record<string, unknown> {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- field values are mixed primitives displayed in JSX
  fields: Record<string, any>;
}

export type TypedNode = Node<BaseNodeData>;
export type TypedNodeProps = NodeProps<TypedNode>;

interface BaseNodeProps extends NodeProps {
  category: AssetCategory;
  handles: HandleDef[];
  children?: React.ReactNode;
}

export const BaseNode = memo(function BaseNode({ id, type, data, selected, category, handles, children }: BaseNodeProps) {
  const nodeData = data as unknown as BaseNodeData;
  const headerColor = CATEGORY_COLORS[category];
  const showThumbnails = usePreviewStore((s) => s.showInlinePreviews);
  const { getTypeDisplayName } = useLanguage();
  const rfType = type ?? nodeData.type;
  const rfDisplayName = getTypeDisplayName(rfType);
  const displayName = (rfDisplayName !== rfType) ? rfDisplayName : getTypeDisplayName(nodeData.type);
  const flowDirection = useSettingsStore((s) => s.flowDirection);
  const inPos = inputPosition(flowDirection);
  const outPos = outputPosition(flowDirection);
  const inSide = inputSide(flowDirection);
  const outSide = outputSide(flowDirection);

  const isOutputNode = !!(data as Record<string, unknown>)._outputNode;
  const isDensity = category === AssetCategory.Density;
  const densitySubColor = isDensity ? getDensityAccentColor(nodeData.type) : undefined;
  const effectiveColor = densitySubColor ?? headerColor;
  const evalStatus = isDensity ? getEvalStatus(nodeData.type) : null;
  const bridgeInfo = getBridgeInfo(nodeData.type);
  const bridgeToColor = bridgeInfo ? CATEGORY_COLORS[bridgeInfo.to] : null;
  const tips = NODE_TIPS[rfType] ?? NODE_TIPS[nodeData.type];
  const headerTip = tips?.[0]?.message;

  // Determine legacy status — density nodes use bare type, others use "Category:Type"
  const CATEGORY_TO_PREFIX: Partial<Record<AssetCategory, string>> = {
    [AssetCategory.Curve]: "Curve",
    [AssetCategory.MaterialProvider]: "Material",
    [AssetCategory.Pattern]: "Pattern",
    [AssetCategory.PositionProvider]: "Position",
    [AssetCategory.Prop]: "Prop",
    [AssetCategory.EnvironmentProvider]: "Environment",
    [AssetCategory.TintProvider]: "Tint",
    [AssetCategory.Directionality]: "Directionality",
    [AssetCategory.Scanner]: "Scanner",
  };
  const legacyPrefix = CATEGORY_TO_PREFIX[category];
  const legacyKey = legacyPrefix ? `${legacyPrefix}:${nodeData.type}` : nodeData.type;
  const isLegacy = isLegacyTypeKey(legacyKey);

  // Connection suggestion highlight
  const connectingCategory = useDragStore((s) => s.connectingCategory);
  const isConnectionTarget = connectingCategory
    ? isAcceptableTarget(connectingCategory, category)
    : null;

  // Validation badge
  const nodeDiags = useDiagnosticsStore((s) => s.byNodeId.get(id));
  const topSeverity: DiagnosticSeverity | null = nodeDiags
    ? nodeDiags.some((d) => d.severity === "error") ? "error"
    : nodeDiags.some((d) => d.severity === "warning") ? "warning"
    : "info"
    : null;
  const badgeTooltip = nodeDiags?.[0]?.message;

  const inputs = handles.filter((h) => h.type === "target");
  const outputs = handles.filter((h) => h.type === "source");
  const showIndex = inputs.length >= 2;
  const showOutputIndex = outputs.length >= 2;
  const maxRows = Math.max(inputs.length, outputs.length);

  // Derive array slot index from this node's downstream connection
  const nodeIndex = useStore((s) => {
    for (const edge of s.edges) {
      if (edge.source !== id) continue;
      const th = edge.targetHandle;
      if (!th) continue;
      // Array-indexed handles (e.g. Inputs[2] → 2)
      const m = /\[(\d+)\]/.exec(th);
      if (m) return parseInt(m[1]);
      // Named handles — look up position in target's input list
      const tn = s.nodes.find((n) => n.id === edge.target);
      if (!tn) continue;
      const tt = ((tn.data as Record<string, unknown>).type as string) ?? "";
      const defs = HANDLE_REGISTRY[tt];
      if (!defs) continue;
      const targetInputs = defs.filter((h) => h.type === "target");
      const idx = targetInputs.findIndex((h) => h.id === th);
      if (idx >= 0) return idx;
    }
    return null;
  });

  return (
    <div
      className="rounded-md min-w-[200px] max-w-[280px] transition-opacity duration-150"
      style={{
        background: "#262320",
        boxShadow: isConnectionTarget === true
          ? `0 0 0 2px ${effectiveColor}, 0 0 14px ${effectiveColor}66`
          : isOutputNode
          ? SHADOW_OUTPUT
          : selected
          ? SHADOW_SELECTED
          : SHADOW_DEFAULT,
        opacity: isConnectionTarget === false ? 0.35 : 1,
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-1.5 text-xs font-semibold text-white text-left flex items-center gap-1.5"
        title={headerTip}
        style={{
          background: bridgeToColor
            ? `linear-gradient(90deg, ${effectiveColor} 60%, ${bridgeToColor} 100%)`
            : effectiveColor,
          borderRadius: "5px 5px 0 0",
        }}
      >
        <div className="flex-1 min-w-0">
          {nodeIndex !== null && <span className="opacity-60">[{nodeIndex}] </span>}
          {displayName}
          {displayName !== nodeData.type && (
            <span className="block text-[9px] font-normal opacity-50">{nodeData.type}</span>
          )}
        </div>
        {isOutputNode && (
          <span
            className="shrink-0 px-1 py-px rounded text-[8px] font-bold leading-none"
            style={{ backgroundColor: "#f59e0b", color: "#000" }}
          >
            ROOT
          </span>
        )}
        {isLegacy && (
          <span
            className="shrink-0 px-1 py-px rounded text-[8px] font-bold leading-none"
            style={{ backgroundColor: "#d97706", color: "#000" }}
            title="Legacy type: not present in the Hytale pre-release API"
          >
            LEGACY
          </span>
        )}
        {bridgeInfo && (
          <span
            className="shrink-0 px-1 py-px rounded text-[8px] font-bold leading-none"
            style={{ backgroundColor: bridgeToColor ?? "#888", color: "#fff" }}
            title={`Bridge: accepts ${CATEGORY_LABELS[bridgeInfo.to] ?? bridgeInfo.to} inputs`}
          >
            ⇄
          </span>
        )}
        {topSeverity && (
          <div className="group relative shrink-0">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: VALIDATION_BADGE_COLORS[topSeverity] }}
            />
            <div className="pointer-events-none absolute z-50 opacity-0 group-hover:opacity-100
              transition-opacity duration-150 bg-[#1c1a17] border border-tn-border rounded
              px-2 py-1 text-[10px] whitespace-nowrap right-0 top-full mt-1 font-normal max-w-[200px] break-words">
              {badgeTooltip}
            </div>
          </div>
        )}
        {evalStatus && evalStatus !== EvalStatus.Full && (
          <div className="group relative shrink-0">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: EVAL_STATUS_COLORS[evalStatus] }}
            />
            <div className="pointer-events-none absolute z-50 opacity-0 group-hover:opacity-100
              transition-opacity duration-150 bg-[#1c1a17] border border-tn-border rounded
              px-2 py-1 text-[10px] whitespace-nowrap right-0 top-full mt-1 font-normal">
              {EVAL_STATUS_LABELS[evalStatus]}
            </div>
          </div>
        )}
      </div>

      {/* Handle zone */}
      {maxRows > 0 && (
        <div className="relative" style={{ height: maxRows * ROW_H }}>
          {/* Input handles + labels + tooltips */}
          {inputs.map((handle, i) => {
            const portDesc = getSchemaPortDescription(nodeData.type, handle.id);
            return (
            <Fragment key={handle.id}>
              <div className="group" style={{ position: "absolute", [inSide]: -7, top: handleTop(i), transform: "translateY(-50%)" }}>
                <Handle
                  type="target"
                  position={inPos}
                  id={handle.id}
                  style={{
                    background: INPUT_HANDLE_COLOR,
                    width: 14,
                    height: 14,
                    border: "2px solid rgba(0,0,0,0.4)",
                    position: "relative",
                    top: 0,
                    [inSide]: 0,
                  }}
                />
                <div className={`pointer-events-none absolute z-50 opacity-0 group-hover:opacity-100
                  transition-opacity duration-150 bg-[#1c1a17] border border-tn-border rounded
                  px-2 py-1 text-[10px] ${portDesc ? "max-w-[220px] whitespace-normal" : "whitespace-nowrap"} ${inSide}-4 top-1/2 -translate-y-1/2`}>
                  <span className="font-medium text-tn-text">{showIndex ? `[${i}] ${handle.label}` : handle.label}</span>
                  <span className="text-tn-text-muted ml-1">({CATEGORY_LABELS[handle.category] ?? handle.category})</span>
                  {portDesc && (
                    <div className="text-tn-text-muted mt-0.5 text-[9px]">{portDesc}</div>
                  )}
                </div>
              </div>
              {(isLabelSignificant(handle.label) || showIndex) && (
                <div
                  className={`absolute ${inSide}-4 text-xs text-tn-text-muted`}
                  style={{ top: handleTop(i), transform: "translateY(-50%)" }}
                >
                  {showIndex
                    ? isLabelSignificant(handle.label) ? `[${i}] ${handle.label}` : `[${i}]`
                    : handle.label}
                </div>
              )}
            </Fragment>
          );
          })}

          {/* Output handles + labels + tooltips */}
          {outputs.map((handle, i) => {
            const outPortDesc = getSchemaPortDescription(nodeData.type, handle.id);
            return (
            <Fragment key={handle.id}>
              <div className="group" style={{ position: "absolute", [outSide]: -7, top: handleTop(i), transform: "translateY(-50%)" }}>
                <Handle
                  type="source"
                  position={outPos}
                  id={handle.id}
                  style={{
                    background: getHandleColor(handle.category),
                    width: 14,
                    height: 14,
                    border: "2px solid rgba(0,0,0,0.4)",
                    position: "relative",
                    top: 0,
                    [outSide]: 0,
                  }}
                />
                <div className={`pointer-events-none absolute z-50 opacity-0 group-hover:opacity-100
                  transition-opacity duration-150 bg-[#1c1a17] border border-tn-border rounded
                  px-2 py-1 text-[10px] ${outPortDesc ? "max-w-[220px] whitespace-normal" : "whitespace-nowrap"} ${outSide}-4 top-1/2 -translate-y-1/2`}>
                  <span className="font-medium text-tn-text">{showOutputIndex ? `[${i}] ${handle.label}` : handle.label}</span>
                  <span className="text-tn-text-muted ml-1">({CATEGORY_LABELS[handle.category] ?? handle.category})</span>
                  {outPortDesc && (
                    <div className="text-tn-text-muted mt-0.5 text-[9px]">{outPortDesc}</div>
                  )}
                </div>
              </div>
              {(isLabelSignificant(handle.label) || showOutputIndex) && (
                <div
                  className={`absolute ${outSide}-4 text-xs text-tn-text-muted`}
                  style={{ top: handleTop(i), transform: "translateY(-50%)" }}
                >
                  {showOutputIndex
                    ? isLabelSignificant(handle.label) ? `[${i}] ${handle.label}` : `[${i}]`
                    : handle.label}
                </div>
              )}
            </Fragment>
            );
          })}
        </div>
      )}

      {/* Children zone */}
      {children && (
        <div
          className="px-3 py-2 text-xs"
          style={{
            borderTop: maxRows > 0 ? `1px solid ${effectiveColor}33` : undefined,
          }}
        >
          <NodeBodyBoundary>{children}</NodeBodyBoundary>
        </div>
      )}

      {/* Inline thumbnail zone */}
      {showThumbnails && isDensity && (
        <div
          className="px-3 pt-1 pb-2 flex justify-center"
          style={{ borderTop: `1px solid ${effectiveColor}33` }}
        >
          <NodeThumbnail nodeId={id} />
        </div>
      )}
    </div>
  );
});
