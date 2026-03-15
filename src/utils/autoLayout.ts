import type { Node, Edge } from "@xyflow/react";
import { NODE_WIDTH, NODE_HEIGHT } from "@/constants";
import * as _graphlibModule from "@dagrejs/graphlib";

// @dagrejs/dagre's ESM bundle contains a CJS require() shim that throws
// "Dynamic require of '@dagrejs/graphlib' is not supported" in browsers.
// The shim fires during module evaluation, so we must polyfill require()
// before dagre is ever imported. Static import of graphlib above guarantees
// it's available here at module scope.
const _graphlib = (_graphlibModule as any).default ?? _graphlibModule;
if (!(globalThis as any).require) {
  (globalThis as any).require = (id: string) => {
    if (id === "@dagrejs/graphlib") return _graphlib;
    throw new Error(`Dynamic require of "${id}" is not supported`);
  };
}

/**
 * Tidy up node positions by snapping to grid and resolving overlaps.
 * Preserves relative arrangement — nodes stay roughly where they were.
 */
export function tidyUp(nodes: Node[], gridSize: number = 20): Node[] {
  if (nodes.length === 0) return nodes;

  const gap = gridSize;
  const cellW = NODE_WIDTH + gap;
  const cellH = NODE_HEIGHT + gap;

  // Snap each node to the nearest grid position
  const snapped = nodes.map((node) => ({
    ...node,
    position: {
      x: Math.round(node.position.x / gridSize) * gridSize,
      y: Math.round(node.position.y / gridSize) * gridSize,
    },
  }));

  // Sort by position (y then x) for deterministic ordering
  const sorted = snapped
    .map((n, i) => ({ node: n, origIndex: i }))
    .sort((a, b) => {
      const dy = a.node.position.y - b.node.position.y;
      if (dy !== 0) return dy;
      return a.node.position.x - b.node.position.x;
    });

  // Resolve overlaps: for each node, check against all previously placed nodes
  const placed: { x: number; y: number }[] = [];
  const result = new Array<Node>(snapped.length);

  for (const { node, origIndex } of sorted) {
    let { x, y } = node.position;
    let attempts = 0;
    const maxAttempts = nodes.length * 2;

    while (attempts < maxAttempts) {
      const overlaps = placed.some(
        (p) => Math.abs(p.x - x) < cellW && Math.abs(p.y - y) < cellH,
      );
      if (!overlaps) break;
      // Shift right first, then down
      x += gridSize;
      if (attempts > 0 && attempts % 5 === 0) {
        x = node.position.x;
        y += gridSize;
      }
      attempts++;
    }

    placed.push({ x, y });
    result[origIndex] = { ...node, position: { x, y } };
  }

  return result;
}

let dagreLib: typeof import("@dagrejs/dagre") | null = null;

/**
 * Lazily import dagre. The require polyfill is already set up at module
 * scope above, so dagre's CJS shim will find graphlib when it evaluates.
 */
async function ensureDagre() {
  if (dagreLib) return dagreLib;

  const dagreMod = await import("@dagrejs/dagre");
  const dagre = (dagreMod as any).default ?? dagreMod;
  dagre.graphlib = _graphlib;
  dagreLib = dagre;
  return dagreLib;
}

/**
 * Automatically layout nodes using dagre.
 * Returns new node array with updated positions.
 */
export async function autoLayout(
  nodes: Node[],
  edges: Edge[],
  direction: "LR" | "RL" | "TB" = "LR",
): Promise<Node[]> {
  const dagre = await ensureDagre();

  const g = new dagre!.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 50,
    ranksep: 80,
    edgesep: 20,
  });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter(
    (e) => e.source !== e.target && nodeIds.has(e.source) && nodeIds.has(e.target),
  );
  if (validEdges.length < edges.length) {
    console.warn(
      `autoLayout: filtered ${edges.length - validEdges.length} invalid edge(s) (dangling or self-loop)`,
    );
  }

  for (const edge of validEdges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre!.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}

/**
 * Layout only the selected nodes while preserving unselected node positions.
 * The layouted selection is repositioned to the bounding box center of the
 * original selection so it doesn't jump to the origin.
 */
export async function autoLayoutSelected(
  allNodes: Node[],
  edges: Edge[],
  selectedIds: Set<string>,
  direction: "LR" | "RL" | "TB" = "LR",
): Promise<Node[]> {
  if (selectedIds.size === 0) return allNodes;

  const selectedNodes = allNodes.filter((n) => selectedIds.has(n.id));
  if (selectedNodes.length <= 1) return allNodes;

  // Edges where both endpoints are in the selection (excluding self-loops)
  const subEdges = edges.filter(
    (e) => e.source !== e.target && selectedIds.has(e.source) && selectedIds.has(e.target),
  );

  // Compute original bounding-box center of the selection
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  for (const n of selectedNodes) {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + NODE_WIDTH);
    maxY = Math.max(maxY, n.position.y + NODE_HEIGHT);
  }
  const origCenterX = (minX + maxX) / 2;
  const origCenterY = (minY + maxY) / 2;

  // Run dagre on the subset
  const dagre = await ensureDagre();

  const g = new dagre!.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 50,
    ranksep: 80,
    edgesep: 20,
  });

  for (const node of selectedNodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of subEdges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre!.layout(g);

  // Compute layouted bounding-box center
  let lMinX = Infinity, lMinY = Infinity;
  let lMaxX = -Infinity, lMaxY = -Infinity;
  for (const node of selectedNodes) {
    const pos = g.node(node.id);
    const x = pos.x - NODE_WIDTH / 2;
    const y = pos.y - NODE_HEIGHT / 2;
    lMinX = Math.min(lMinX, x);
    lMinY = Math.min(lMinY, y);
    lMaxX = Math.max(lMaxX, x + NODE_WIDTH);
    lMaxY = Math.max(lMaxY, y + NODE_HEIGHT);
  }
  const layoutCenterX = (lMinX + lMaxX) / 2;
  const layoutCenterY = (lMinY + lMaxY) / 2;

  // Offset to reposition layout at the original center
  const offsetX = origCenterX - layoutCenterX;
  const offsetY = origCenterY - layoutCenterY;

  // Build a map of new positions for selected nodes
  const newPositions = new Map<string, { x: number; y: number }>();
  for (const node of selectedNodes) {
    const pos = g.node(node.id);
    newPositions.set(node.id, {
      x: pos.x - NODE_WIDTH / 2 + offsetX,
      y: pos.y - NODE_HEIGHT / 2 + offsetY,
    });
  }

  return allNodes.map((node) => {
    const newPos = newPositions.get(node.id);
    if (newPos) {
      return { ...node, position: newPos };
    }
    return node;
  });
}
