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
}

const NODE_W = 200;
// Docs were authored with 160px-wide nodes. Scale x positions so wider nodes don't overlap.
const X_SCALE = 1.6;

function makeRFNode(n: DocGraphNode, focusedId: string | null, hasSteps: boolean): Node {
  const color = CATEGORY_COLORS[n.category ?? "default"] ?? CATEGORY_COLORS.default;
  return {
    id: n.id,
    position: { x: n.x * X_SCALE, y: n.y },
    data: { label: n.label, sub: n.sub, color, focused: focusedId === n.id, hasSteps },
    type: "docNode",
    style: { width: NODE_W },
  };
}

function makeRFEdge(e: DocGraphEdge, i: number, focusedId: string | null, hasSteps: boolean): Edge {
  const dimmed = hasSteps && focusedId !== null && e.from !== focusedId && e.to !== focusedId;
  const color = dimmed ? "#3a3428" : "#6b5f4e";
  return {
    id: e.id ?? `e-${i}`,
    source: e.from,
    target: e.to,
    label: e.label,
    type: "docEdge",
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 18, height: 18 },
    style: { stroke: color, strokeWidth: 2, opacity: dimmed ? 0.3 : 1 },
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

function DocNode({ data }: { data: { label: string; sub?: string; color: string; focused: boolean; hasSteps: boolean } }) {
  const dimmed = data.hasSteps && !data.focused;
  const glow = data.focused ? `0 0 0 2.5px ${data.color}, 0 0 18px ${data.color}99` : undefined;
  return (
    <div
      style={{
        borderColor: data.color,
        borderWidth: 1.5,
        opacity: dimmed ? 0.35 : 1,
        boxShadow: glow,
        transition: "opacity 0.2s, box-shadow 0.2s",
      }}
      className="rounded border bg-tn-panel text-tn-text select-none overflow-hidden"
    >
      <Handle type="target" position={Position.Left} style={{ background: "#6b5f4e", border: "none", width: 8, height: 8 }} />
      <div style={{ background: data.color }} className="px-3 py-1.5 text-[13px] font-semibold text-white leading-tight truncate">
        {data.label}
      </div>
      {data.sub && (
        <div className="px-3 py-1 text-[11px] text-tn-text-muted truncate">{data.sub}</div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: "#6b5f4e", border: "none", width: 8, height: 8 }} />
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
          className="border-t border-tn-border bg-tn-panel/60 px-4 py-3"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setStepIndex((s) => Math.max(0, s - 1));
            if (e.key === "ArrowRight") setStepIndex((s) => Math.min(steps.length - 1, s + 1));
          }}
          tabIndex={0}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-tn-text-muted" aria-live="polite">
              Step {stepIndex + 1} of {steps.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-3 py-1 text-xs rounded border border-tn-border text-tn-text-muted hover:bg-tn-accent/10 hover:text-tn-text disabled:opacity-30"
                disabled={stepIndex === 0}
                onClick={() => setStepIndex((s) => s - 1)}
              >
                ← Prev
              </button>
              <button
                type="button"
                className="px-3 py-1 text-xs rounded border border-tn-border text-tn-text-muted hover:bg-tn-accent/10 hover:text-tn-text disabled:opacity-30"
                disabled={stepIndex === steps.length - 1}
                onClick={() => setStepIndex((s) => s + 1)}
              >
                Next →
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
