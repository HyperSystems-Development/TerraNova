import { useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
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

export interface DocNodeGraphProps {
  nodes: DocGraphNode[];
  edges: DocGraphEdge[];
  /** height in px, default 260 */
  height?: number;
}

const NODE_W = 160;

function makeRFNode(n: DocGraphNode): Node {
  const color = CATEGORY_COLORS[n.category ?? "default"] ?? CATEGORY_COLORS.default;
  return {
    id: n.id,
    position: { x: n.x, y: n.y },
    data: { label: n.label, sub: n.sub, color },
    type: "docNode",
    style: { width: NODE_W },
  };
}

function makeRFEdge(e: DocGraphEdge, i: number): Edge {
  return {
    id: e.id ?? `e-${i}`,
    source: e.from,
    target: e.to,
    label: e.label,
    type: "smoothstep",
    style: { stroke: "#6b5f4e", strokeWidth: 2 },
    labelStyle: { fill: "#c4baa8", fontSize: 11 },
    labelBgStyle: { fill: "#1c1a17", fillOpacity: 0.9 },
  };
}

function DocNode({ data }: { data: { label: string; sub?: string; color: string } }) {
  return (
    <div
      style={{ borderColor: data.color, borderWidth: 1.5 }}
      className="rounded border bg-tn-panel text-tn-text select-none overflow-hidden"
    >
      <div
        style={{ background: data.color }}
        className="px-2.5 py-1 text-[13px] font-semibold text-white leading-tight truncate"
      >
        {data.label}
      </div>
      {data.sub && (
        <div className="px-2.5 py-0.5 text-[11px] text-tn-text-muted truncate">{data.sub}</div>
      )}
    </div>
  );
}

const nodeTypes = { docNode: DocNode };

export function DocNodeGraph({ nodes, edges, height = 260 }: DocNodeGraphProps) {
  const rfNodes = useMemo(() => nodes.map(makeRFNode), [nodes]);
  const rfEdges = useMemo(() => edges.map(makeRFEdge), [edges]);

  return (
    <div
      className="my-4 rounded border border-tn-border overflow-hidden"
      style={{ height }}
    >
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
