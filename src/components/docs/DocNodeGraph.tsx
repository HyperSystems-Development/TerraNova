import { useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Category colour palette matching the actual subcategory colors from densitySubcategories.ts
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
  /** category key from CATEGORY_COLORS */
  category?: string;
  /** subtitle shown below the label */
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
  /** which node id this step focuses on */
  nodeId: string;
  /** explanation shown below the diagram */
  text: string;
}

export interface DocNodeGraphProps {
  nodes: DocGraphNode[];
  edges: DocGraphEdge[];
  /** height in px, default 260 */
  height?: number;
  /** if provided, enables walkthrough mode */
  steps?: DocGraphStep[];
}

const NODE_W = 160;

function makeRFNode(n: DocGraphNode, focusedId: string | null, hasSteps: boolean): Node {
  const color = CATEGORY_COLORS[n.category ?? "default"] ?? CATEGORY_COLORS.default;
  const focused = focusedId === n.id;
  return {
    id: n.id,
    position: { x: n.x, y: n.y },
    data: { label: n.label, sub: n.sub, color, focused, hasSteps },
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
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 18, height: 18 },
    style: { stroke: color, strokeWidth: 2, opacity: dimmed ? 0.3 : 1 },
    labelStyle: { fill: dimmed ? "#4a4438" : "#c4baa8", fontSize: 11 },
    labelBgStyle: { fill: "#1c1a17", fillOpacity: 0.9 },
  };
}

function DocNode({ data }: { data: { label: string; sub?: string; color: string; focused?: boolean; hasSteps?: boolean } }) {
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
      <div
        style={{ background: data.color }}
        className="px-2.5 py-1 text-[13px] font-semibold text-white leading-tight truncate"
      >
        {data.label}
      </div>
      {data.sub && (
        <div className="px-2.5 py-0.5 text-[11px] text-tn-text-muted truncate">{data.sub}</div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: "#6b5f4e", border: "none", width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes = { docNode: DocNode };

export function DocNodeGraph({ nodes, edges, height = 260, steps }: DocNodeGraphProps) {
  const [stepIndex, setStepIndex] = useState(0);

  const hasSteps = !!steps && steps.length > 0;
  const focusedId = hasSteps ? (steps[stepIndex]?.nodeId ?? null) : null;

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
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3, minZoom: 0.5, maxZoom: 1.2 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            proOptions={{ hideAttribution: true }}
            style={{ background: "#1c1a17" }}
          >
            <Background color="#4a4438" gap={20} variant={BackgroundVariant.Dots} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {hasSteps && steps && (
        <div className="border-t border-tn-border bg-tn-panel/60 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-tn-text-muted">
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
          <p className="text-sm text-tn-text leading-relaxed">{steps[stepIndex]?.text}</p>
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
