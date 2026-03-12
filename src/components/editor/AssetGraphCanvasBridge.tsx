import { useEffect, useMemo, useRef } from "react";
import type { Edge, Node } from "@xyflow/react";
import { useEditorStore } from "@/stores/editorStore";
import { EditorCanvas } from "./EditorCanvas";

interface AssetGraphCanvasBridgeProps {
  nodes: Array<Node<Record<string, unknown>>>;
  edges: Edge[];
  defaultSelectionId: string;
  onNodeDoubleClick?: (nodeId: string) => void;
}

function summarizeNodeFields(data: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  if (typeof data.subtitle === "string" && data.subtitle) {
    fields.Subtitle = data.subtitle;
  }
  if (typeof data.accent === "string") {
    fields.Accent = data.accent;
  }
  if (Array.isArray(data.stats) && data.stats.length > 0) {
    fields.Stats = data.stats.join(" | ");
  }
  if (Array.isArray(data.badges) && data.badges.length > 0) {
    fields.Badges = data.badges.join(", ");
  }

  return fields;
}

function buildGraphSignature(
  nodes: Array<Node<Record<string, unknown>>>,
  edges: Edge[],
): string {
  return JSON.stringify({
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
    })),
  });
}

export function AssetGraphCanvasBridge({
  nodes,
  edges,
  defaultSelectionId,
  onNodeDoubleClick,
}: AssetGraphCanvasBridgeProps) {
  const setNodes = useEditorStore((state) => state.setNodes);
  const setEdges = useEditorStore((state) => state.setEdges);
  const setSelectedNodeId = useEditorStore((state) => state.setSelectedNodeId);
  const lastAppliedSignatureRef = useRef<string | null>(null);

  const displayNodes = useMemo(() => (
    nodes.map((node) => {
      const rawData = (node.data ?? {}) as Record<string, unknown>;
      const label = typeof rawData.label === "string" ? rawData.label : "Asset";

      return {
        ...node,
        type: "structuredAssetCard",
        data: {
          ...rawData,
          type: label,
          fields: summarizeNodeFields(rawData),
        },
      };
    })
  ), [nodes]);
  const graphSignature = useMemo(() => buildGraphSignature(displayNodes, edges), [displayNodes, edges]);

  useEffect(() => {
    if (lastAppliedSignatureRef.current !== graphSignature) {
      setNodes(displayNodes);
      setEdges(edges);
      lastAppliedSignatureRef.current = graphSignature;
    }

    const currentSelectedId = useEditorStore.getState().selectedNodeId;
    const hasCurrentSelection = currentSelectedId
      ? displayNodes.some((node) => node.id === currentSelectedId)
      : false;

    if (!hasCurrentSelection) {
      setSelectedNodeId(defaultSelectionId);
    }
  }, [defaultSelectionId, displayNodes, edges, graphSignature, setEdges, setNodes, setSelectedNodeId]);

  return (
    <EditorCanvas
      mode="inspect"
      showRootDock={false}
      onNodeDoubleClick={(node) => onNodeDoubleClick?.(node.id)}
    />
  );
}
