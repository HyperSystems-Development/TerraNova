import { useMemo, useState, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Handle,
  Position,
  MarkerType,
  useReactFlow,
  type Node,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ClipboardData } from "@/utils/clipboard";

// Category colour palette matching densitySubcategories.ts
const CATEGORY_COLORS: Record<string, string> = {
  generative:  "#4A90D9",
  filter:      "#7B68AE",
  math:        "#2D9B83",
  position:    "#3D8B37",
  terrain:     "#B8763C",
  shape:       "#C45B84",
  material:    "#C87D3A",
  prop:        "#C76B6B",
  scanner:     "#5AACA6",
  biome:       "#4E9E8F",
  worldstruct: "#5A6FA0",
  framework:   "#8C8878",
  output:      "#b5924c",
  curve:       "#A67EB8",
  default:     "#4A90D9",
};

export interface DocGraphNode {
  id: string;
  label: string;
  category?: string;
  sub?: string;
  x: number;
  y: number;
}

export interface DocGraphEdge {
  id?: string;
  from: string;
  to: string;
  label?: string;
}

export interface DocGraphStep {
  nodeId: string;
  text: string;
}

export interface DocNodeGraphProps {
  nodes: DocGraphNode[];
  edges: DocGraphEdge[];
  height?: number;
  steps?: DocGraphStep[];
  clipboardData?: ClipboardData;
  outputNodeId?: string | null;
}

const NODE_W = 200;
// Docs were authored with 160px-wide nodes. Scale x positions so wider nodes don't overlap.
const X_SCALE = 1.6;

function makeRFNode(n: DocGraphNode, focusedId: string | null, hasSteps: boolean): Node {
  const color = CATEGORY_COLORS[n.category ?? "default"] ?? CATEGORY_COLORS.default;
  return {
    id: n.id,
    position: { x: n.x * X_SCALE, y: n.y },
    data: { label: n.label, sub: n.sub, category: n.category, color, focused: focusedId === n.id, hasSteps },
    type: "docNode",
    style: { width: NODE_W },
  };
}

function makeRFEdge(e: DocGraphEdge, i: number, focusedId: string | null, hasSteps: boolean): Edge {
  const dimmed = hasSteps && focusedId !== null && e.from !== focusedId && e.to !== focusedId;
  const active = hasSteps && focusedId !== null && !dimmed;
  const color = dimmed ? "#3a3428" : active ? "#b5924c" : "#6b5f4e";
  return {
    id: e.id ?? `e-${i}`,
    source: e.from,
    target: e.to,
    label: e.label,
    type: "docEdge",
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 18, height: 18 },
    style: {
      stroke: color,
      strokeWidth: active ? 2.5 : 2,
      opacity: dimmed ? 0.25 : 1,
      strokeDasharray: active ? "6 3" : undefined,
      animation: active ? "edge-flow 0.6s linear infinite" : undefined,
    },
    data: { dimmed },
  };
}

function DocEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  label, style, markerEnd, data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
  });

  // Offset label toward the source end (30% along) to avoid landing on midpoint nodes
  const lx = sourceX + (labelX - sourceX) * 0.55;
  const ly = sourceY + (labelY - sourceY) * 0.55;

  const dimmed = data?.dimmed as boolean | undefined;
  const textColor = dimmed ? "#4a4438" : "#c4baa8";
  const bgColor = "#1c1a17";
  const borderColor = dimmed ? "#2e2b25" : "#4a4438";

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd as string} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`,
              pointerEvents: "none",
              zIndex: 9999,
              background: bgColor,
              color: textColor,
              border: `1px solid ${borderColor}`,
              borderRadius: 6,
              fontSize: 11,
              padding: "3px 8px",
              whiteSpace: "nowrap",
              lineHeight: 1.4,
            }}
            className="nodrag nopan"
          >
            {label as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

function DocNode({ data }: { data: { label: string; sub?: string; color: string; category?: string; focused: boolean; hasSteps: boolean } }) {
  const dimmed = data.hasSteps && !data.focused;
  const glow = data.focused ? `0 0 0 2px ${data.color}, 0 0 16px ${data.color}88` : undefined;
  const handleStyle = { background: data.color, border: "2px solid #1c1a17", width: 10, height: 10, borderRadius: "50%" };
  return (
    <div
      style={{
        borderColor: data.focused ? data.color : `${data.color}88`,
        borderWidth: data.focused ? 2 : 1.5,
        opacity: dimmed ? 0.3 : 1,
        boxShadow: glow,
        transition: "opacity 0.2s, box-shadow 0.2s, border-color 0.2s",
      }}
      className="rounded-md border bg-tn-panel text-tn-text select-none overflow-hidden"
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />
      {/* Colored header */}
      <div style={{ background: data.color }} className="px-3 py-1.5 text-[13px] font-semibold text-white leading-tight truncate">
        {data.label}
      </div>
      {/* Sub-label + category badge row */}
      <div className="flex items-center justify-between gap-1 px-2.5 py-1 min-h-[22px]">
        {data.sub
          ? <span className="text-[11px] text-tn-text-muted truncate flex-1">{data.sub}</span>
          : <span className="flex-1" />
        }
        {data.category && (
          <span
            style={{ color: data.color, borderColor: `${data.color}44`, background: `${data.color}14` }}
            className="text-[9px] font-medium uppercase tracking-wider border rounded px-1 py-px shrink-0 leading-tight"
          >
            {data.category}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
  );
}

const nodeTypes = { docNode: DocNode };
const edgeTypes = { docEdge: DocEdge };

function DocFlowInner({
  rfNodes,
  rfEdges,
  focusedId,
  initialFocusId,
}: {
  rfNodes: Node[];
  rfEdges: Edge[];
  focusedId: string | null;
  initialFocusId: string | null;
}) {
  const { fitView } = useReactFlow();

  // Fit to first step on mount (no animation so it is instant)
  useEffect(() => {
    if (initialFocusId) {
      fitView({ nodes: [{ id: initialFocusId }], duration: 0, padding: 0.6, minZoom: 0.5, maxZoom: 1.2 });
    } else {
      fitView({ duration: 0, padding: 0.3, minZoom: 0.4, maxZoom: 1.2 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount only

  // Pan to focused node whenever the step changes
  useEffect(() => {
    if (focusedId) {
      fitView({ nodes: [{ id: focusedId }], duration: 300, padding: 0.6, minZoom: 0.5, maxZoom: 1.2 });
    }
  }, [focusedId, fitView]);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.3, minZoom: 0.4, maxZoom: 1.5 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      zoomOnDoubleClick={false}
      proOptions={{ hideAttribution: true }}
      style={{ background: "#1c1a17" }}
    >
      <Background color="#4a4438" gap={20} variant={BackgroundVariant.Dots} />
    </ReactFlow>
  );
}

export function DocNodeGraph({ nodes, edges, height = 260, steps }: DocNodeGraphProps) {
  const [stepIndex, setStepIndex] = useState(0);

  const hasSteps = steps !== undefined && steps.length > 0;
  const focusedId = hasSteps ? steps[stepIndex].nodeId : null;
  const initialFocusId = hasSteps ? steps[0].nodeId : null;

  const rfNodes = useMemo(
    () => nodes.map((n) => makeRFNode(n, focusedId, hasSteps)),
    [nodes, focusedId, hasSteps],
  );
  const rfEdges = useMemo(
    () => edges.map((e, i) => makeRFEdge(e, i, focusedId, hasSteps)),
    [edges, focusedId, hasSteps],
  );

  return (
    <div className="my-4 rounded border border-tn-border overflow-hidden">
      <div style={{ height }}>
        <ReactFlowProvider>
          <DocFlowInner
            rfNodes={rfNodes}
            rfEdges={rfEdges}
            focusedId={focusedId}
            initialFocusId={initialFocusId}
          />
        </ReactFlowProvider>
      </div>

      {hasSteps && (
        <div
          className="border-t border-tn-border bg-tn-panel/60 px-4 pt-2 pb-3"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setStepIndex((s) => Math.max(0, s - 1));
            if (e.key === "ArrowRight") setStepIndex((s) => Math.min(steps.length - 1, s + 1));
          }}
          tabIndex={0}
        >
          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex-1 h-1 rounded-full bg-tn-border overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${((stepIndex + 1) / steps.length) * 100}%`,
                  background: "var(--tn-accent, #b5924c)",
                }}
              />
            </div>
            <span className="text-[11px] text-tn-text-muted shrink-0" aria-live="polite">
              {stepIndex + 1} / {steps.length}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                className="px-2.5 py-0.5 text-xs rounded border border-tn-border text-tn-text-muted hover:bg-tn-accent/10 hover:text-tn-text disabled:opacity-30 transition-colors"
                disabled={stepIndex === 0}
                onClick={() => setStepIndex((s) => s - 1)}
              >
                ←
              </button>
              <button
                type="button"
                className="px-2.5 py-0.5 text-xs rounded border border-tn-border text-tn-text-muted hover:bg-tn-accent/10 hover:text-tn-text disabled:opacity-30 transition-colors"
                disabled={stepIndex === steps.length - 1}
                onClick={() => setStepIndex((s) => s + 1)}
              >
                →
              </button>
            </div>
          </div>
          <p className="text-sm text-tn-text leading-relaxed whitespace-normal break-words">
            {steps[stepIndex].text}
          </p>
        </div>
      )}
    </div>
  );
}

/** Parse a JSON nodegraph block from a markdown fenced code block. */
export function parseNodeGraph(src: string): DocNodeGraphProps | null {
  try {
    const parsed = JSON.parse(src) as DocNodeGraphProps;
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null;
    return parsed;
  } catch {
    return null;
  }
}
