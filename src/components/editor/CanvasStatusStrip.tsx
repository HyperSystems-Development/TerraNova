import { memo, useMemo } from "react";
import { useStore } from "@xyflow/react";
import { useEditorStore } from "@/stores/editorStore";
import { useUIStore } from "@/stores/uiStore";
import { useLanguage } from "@/languages/useLanguage";
import type { BaseNodeData } from "@/nodes/shared/BaseNode";

const ROOT_HIDDEN_CONTEXTS = new Set(["NoiseRange", "Settings", "RawJson"]);

function getNodeTypeLabel(data: unknown): string {
  const typed = data as Partial<BaseNodeData> | undefined;
  return typeof typed?.type === "string" && typed.type.length > 0 ? typed.type : "Node";
}

function getCustomLabel(data: unknown): string | null {
  const record = data as Record<string, unknown> | undefined;
  return typeof record?.label === "string" && record.label.trim().length > 0
    ? record.label
    : null;
}

export const CanvasStatusStrip = memo(function CanvasStatusStrip() {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const editingContext = useEditorStore((s) => s.editingContext);
  const showGrid = useUIStore((s) => s.showGrid);
  const snapToGrid = useUIStore((s) => s.snapToGrid);
  const showMinimap = useUIStore((s) => s.showMinimap);
  const zoom = useStore((s) => s.transform[2]);
  const { getTypeDisplayName } = useLanguage();

  const graphNodes = useMemo(
    () => nodes.filter((node) => node.type !== "comment" && node.type !== "frame"),
    [nodes],
  );
  const selectedNodes = useMemo(
    () => {
      const selected = nodes.filter((node) => node.selected);
      if (selected.length > 0 || !selectedNodeId) return selected;
      const fallback = nodes.find((node) => node.id === selectedNodeId);
      return fallback ? [fallback] : [];
    },
    [nodes, selectedNodeId],
  );

  const selectionLabel = useMemo(() => {
    if (selectedNodes.length === 0) return "No selection";
    if (selectedNodes.length > 1) return `${selectedNodes.length} selected`;

    const node = selectedNodes[0];
    const customLabel = getCustomLabel(node.data);
    const typeLabel = getNodeTypeLabel(node.data);
    const displayName = getTypeDisplayName(typeLabel);
    return customLabel ? `${customLabel} (${displayName})` : displayName;
  }, [selectedNodes, getTypeDisplayName]);

  const rootLabel = useMemo(() => {
    if (editingContext && ROOT_HIDDEN_CONTEXTS.has(editingContext)) return null;
    const rootNode = nodes.find((node) => node.type === "Root");
    if (!rootNode) return "Root missing";
    const rootEdge = edges.find((edge) => edge.target === rootNode.id);
    if (!rootEdge) return "Root unwired";
    const sourceNode = nodes.find((node) => node.id === rootEdge.source);
    return sourceNode
      ? `Root: ${getTypeDisplayName(getNodeTypeLabel(sourceNode.data))}`
      : "Root wired";
  }, [editingContext, edges, nodes, getTypeDisplayName]);

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[min(680px,calc(100%-24px))]">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-tn-border/70 bg-tn-surface/88 px-2.5 py-1.5 text-[10px] text-tn-text-muted shadow-lg backdrop-blur-sm">
        <span className="font-semibold text-tn-text">{editingContext ?? "Graph"}</span>
        <span className="truncate text-tn-text max-w-[240px]">{selectionLabel}</span>
        <span className="border-l border-tn-border/70 pl-1.5">{graphNodes.length} nodes</span>
        <span>{edges.length} wires</span>
        <span className="border-l border-tn-border/70 pl-1.5">{Math.round(zoom * 100)}%</span>
        <span>Grid {showGrid ? "on" : "off"}</span>
        <span>Snap {snapToGrid ? "on" : "off"}</span>
        <span>Map {showMinimap ? "on" : "off"}</span>
        {rootLabel && <span className="border-l border-tn-border/70 pl-1.5">{rootLabel}</span>}
      </div>
    </div>
  );
});
