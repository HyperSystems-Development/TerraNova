import type { Node, Edge } from "@xyflow/react";
import { mulberry32 } from "./density/prng";

/* ── Types ────────────────────────────────────────────────────────── */

export interface EvaluatedPosition {
  x: number;
  z: number;
  weight: number;
}

export interface WorldRange {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/* ── Constants ────────────────────────────────────────────────────── */

const MAX_POSITIONS = 10_000;

/** All known position provider type names (canonical list). */
export const POSITION_TYPE_NAMES = [
  "Mesh2D", "Mesh3D", "SimpleHorizontal", "List",
  "Occurrence", "Offset", "Union", "Cache",
  "SurfaceProjection", "FieldFunction", "Conditional",
  "DensityBased", "BaseHeight", "Anchor", "Bound",
  "SquareGrid2d", "SquareGrid3d", "TriangularGrid2d",
  "Scaler", "Jitter2d", "Jitter3d", "Clusters",
  "Framework", "Exported", "Imported", "Empty",
] as const;

const POSITION_TYPES = new Set<string>(POSITION_TYPE_NAMES);

/* ── Root-finding ─────────────────────────────────────────────────── */

function getNodeType(node: Node): string {
  const data = node.data as Record<string, unknown>;
  const rawType = (data.type as string) ?? "";
  return rawType.replace(/^Position:/, "");
}

/**
 * Find the root position provider node.
 * Strategy:
 *   1. Look for a node tagged with `_biomeField === "Positions"`
 *   2. Fall back to: among nodes with no outgoing edges, find one with a position type
 *   3. Fall back to: any node whose React Flow type starts with "Position:" or data.type is a position type
 */
function findPositionRoot(nodes: Node[], edges: Edge[]): Node | null {
  // Strategy 1: explicit tag
  const tagged = nodes.find(
    (n) => (n.data as Record<string, unknown>)._biomeField === "Positions",
  );
  if (tagged) return tagged;

  // Strategy 2: terminal nodes (no outgoing edges) with position types
  const sourcesWithOutgoing = new Set(edges.map((e) => e.source));
  const terminals = nodes.filter((n) => !sourcesWithOutgoing.has(n.id));

  const terminalPos = terminals.find((n) => {
    const type = getNodeType(n);
    const rfType = (n.type ?? "").replace(/^Position:/, "");
    return POSITION_TYPES.has(type) || POSITION_TYPES.has(rfType);
  });
  if (terminalPos) return terminalPos;

  // Strategy 3: any node with a position type (prefer React Flow type prefix)
  const prefixed = nodes.find((n) => (n.type ?? "").startsWith("Position:"));
  if (prefixed) {
    // Find the root of the position subgraph — walk downstream from this node
    // to find the terminal position node
    const posNodes = nodes.filter((n) =>
      (n.type ?? "").startsWith("Position:") || POSITION_TYPES.has(getNodeType(n)),
    );
    const posTerminal = posNodes.find((n) => !sourcesWithOutgoing.has(n.id));
    if (posTerminal) return posTerminal;
    return prefixed;
  }

  // Strategy 4: any node with a known position data.type
  const anyPos = nodes.find((n) => POSITION_TYPES.has(getNodeType(n)));
  return anyPos ?? null;
}

/* ── Main export ──────────────────────────────────────────────────── */

/**
 * Evaluate a PositionProvider node graph and return 2D positions.
 * Pure function — no side effects, deterministic given the same seed.
 */
export function evaluatePositions(
  nodes: Node[],
  edges: Edge[],
  range: WorldRange,
  seed: number,
  rootNodeId?: string,
): EvaluatedPosition[] {
  if (nodes.length === 0) return [];

  let root: Node | null = null;
  if (rootNodeId) {
    root = nodes.find((n) => n.id === rootNodeId) ?? null;
  }
  if (!root) {
    root = findPositionRoot(nodes, edges);
  }
  if (!root) return [];

  // Build inputEdges: targetId -> Map<handle, sourceId>
  const inputEdges = new Map<string, Map<string, string>>();
  for (const e of edges) {
    const map = inputEdges.get(e.target) ?? new Map<string, string>();
    const handle = e.targetHandle ?? "Input";
    map.set(handle, e.source);
    inputEdges.set(e.target, map);
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  // NOTE: A single shared RNG instance means evaluation is order-dependent — adding/removing
  // an upstream node shifts the RNG sequence for all downstream nodes. Deterministic for a
  // given graph, but structurally fragile. Per-node seeding would isolate RNG per node.
  const rng = mulberry32(seed);

  const visited = new Set<string>();

  function evaluate(nodeId: string): EvaluatedPosition[] {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);

    const node = nodeById.get(nodeId);
    if (!node) return [];

    const data = node.data as Record<string, unknown>;
    const rawType = (data.type as string) ?? "";
    const type = rawType.replace(/^Position:/, "");
    const fields = (data.fields as Record<string, unknown>) ?? {};
    const inputs = inputEdges.get(nodeId) ?? new Map<string, string>();

    let result: EvaluatedPosition[];

    switch (type) {
      case "Mesh2D":
      case "Mesh3D":
      case "SquareGrid2d":
      case "SquareGrid3d":
      case "TriangularGrid2d": {
        const { spacing, jitter } = resolveGridSettings(fields, inputs);
        result = generateGrid(range, spacing, jitter, rng);
        break;
      }

      case "SimpleHorizontal": {
        // V2: RangeY constrains Y band; preview approximates as passthrough
        const upstream = getFirstUpstream(inputs, ["PositionProvider", "Positions"]);
        result = upstream.length > 0 ? upstream : generateGrid(range, 16, 0, rng);
        break;
      }

      case "List": {
        const positions = (fields.Positions as Array<{ x: number; y?: number; z: number }>) ?? [];
        result = positions
          .filter((p) => p.x >= range.minX && p.x <= range.maxX && p.z >= range.minZ && p.z <= range.maxZ)
          .map((p) => ({ x: p.x, z: p.z, weight: 1 }));
        break;
      }

      case "Occurrence": {
        // V2: density FieldFunction filters positions; preview uses 50% random
        const upstream = getFirstUpstream(inputs, ["PositionProvider", "Positions"]);
        result = upstream.filter(() => rng() < 0.5);
        break;
      }

      case "Offset": {
        const offset = (fields.Offset as { x?: number; y?: number; z?: number }) ?? {};
        const dx = offset.x ?? 0;
        const dz = offset.z ?? 0;
        const upstream = getFirstUpstream(inputs, ["PositionProvider", "Positions"]);
        result = upstream.map((p) => ({ x: p.x + dx, z: p.z + dz, weight: p.weight }));
        break;
      }

      case "Union": {
        result = [];
        for (let i = 0; inputs.has(`Providers[${i}]`) || inputs.has(`Positions[${i}]`); i++) {
          result.push(...getFirstUpstream(inputs, [`Providers[${i}]`, `Positions[${i}]`]));
        }
        break;
      }

      case "Cache":
      case "SurfaceProjection": {
        result = getFirstUpstream(inputs, ["PositionProvider", "Positions", "Input"]);
        break;
      }

      case "FieldFunction": {
        const upstream = getFirstUpstream(inputs, ["PositionProvider", "Positions"]);
        result = upstream.map((p) => ({ ...p, weight: 0.5 }));
        break;
      }

      case "Conditional": {
        // Only follows TrueInput — FalseInput is ignored since the evaluator
        // cannot evaluate the boolean condition at design time.
        result = getUpstream(inputs, "TrueInput");
        break;
      }

      case "DensityBased": {
        result = generateGrid(range, 16, 0, rng).map((p) => ({ ...p, weight: 0.5 }));
        break;
      }

      case "BaseHeight":
      case "Anchor": {
        result = getFirstUpstream(inputs, ["PositionProvider", "Positions"]);
        break;
      }

      case "Bound": {
        const bounds = fields.Bounds as {
          MinX?: number; MaxX?: number; MinZ?: number; MaxZ?: number;
          minX?: number; maxX?: number; minZ?: number; maxZ?: number;
        } | undefined;
        const minX = Number(bounds?.MinX ?? bounds?.minX ?? -Infinity);
        const maxX = Number(bounds?.MaxX ?? bounds?.maxX ?? Infinity);
        const minZ = Number(bounds?.MinZ ?? bounds?.minZ ?? -Infinity);
        const maxZ = Number(bounds?.MaxZ ?? bounds?.maxZ ?? Infinity);
        result = getFirstUpstream(inputs, ["PositionProvider", "Positions"])
          .filter((p) => p.x >= minX && p.x <= maxX && p.z >= minZ && p.z <= maxZ);
        break;
      }

      case "Scaler": {
        const scale = resolveScaleVector(fields, inputs);
        result = getFirstUpstream(inputs, ["Positions", "PositionProvider"])
          .map((p) => ({ x: p.x * scale.x, z: p.z * scale.z, weight: p.weight }));
        break;
      }

      case "Jitter2d":
      case "Jitter3d": {
        const magnitude = Number(fields.Magnitude ?? fields.Jitter ?? 0);
        result = getFirstUpstream(inputs, ["Positions", "PositionProvider"])
          .map((p) => ({
            x: p.x + (rng() * 2 - 1) * magnitude,
            z: p.z + (rng() * 2 - 1) * magnitude,
            weight: p.weight,
          }));
        break;
      }

      case "Clusters": {
        result = getFirstUpstream(inputs, ["Positions", "PositionProvider", "Distributor", "Cluster"]);
        break;
      }

      case "Empty":
      case "Framework": {
        result = [];
        break;
      }

      case "Exported": {
        const inputSrc = inputs.get("Input");
        if (inputSrc) {
          result = evaluate(inputSrc);
        } else {
          result = [];
        }
        break;
      }

      case "Imported": {
        result = [];
        break;
      }

      default: {
        // Unknown type — try to follow any PositionProvider or Input handle
        const src = inputs.get("PositionProvider") ?? inputs.get("Positions") ?? inputs.get("Input");
        result = src ? evaluate(src) : [];
        break;
      }
    }

    // Hard cap
    if (result.length > MAX_POSITIONS) {
      result = result.slice(0, MAX_POSITIONS);
    }

    // NOTE: Removing from visited allows the same node to be evaluated multiple times
    // via different paths (e.g. two Union inputs). For DAGs this means the same leaf
    // consumes different RNG state per path, producing subtly different results than
    // Hytale's engine (which uses Cache for memoization). For tree-structured graphs
    // (the common case) this is correct. Future enhancement: memoize by nodeId.
    visited.delete(nodeId);
    return result;
  }

  function getUpstream(
    inputs: Map<string, string>,
    handle: string,
  ): EvaluatedPosition[] {
    const src = inputs.get(handle);
    if (!src) return [];
    return evaluate(src);
  }

  function getFirstUpstream(
    inputs: Map<string, string>,
    handles: string[],
  ): EvaluatedPosition[] {
    for (const handle of handles) {
      const result = getUpstream(inputs, handle);
      if (result.length > 0) return result;
    }
    return [];
  }

  function getInputFields(
    inputs: Map<string, string>,
    handle: string,
  ): Record<string, unknown> | undefined {
    const src = inputs.get(handle);
    if (!src) return undefined;
    const inputNode = nodeById.get(src);
    return (inputNode?.data as Record<string, unknown> | undefined)?.fields as Record<string, unknown> | undefined;
  }

  function resolveGridSettings(
    fields: Record<string, unknown>,
    inputs: Map<string, string>,
  ): { spacing: number; jitter: number } {
    const pointGenerator =
      getInputFields(inputs, "PointGenerator") ??
      (fields.PointGenerator as Record<string, unknown> | undefined) ??
      {};

    const directResolution = Number(fields.Resolution ?? NaN);
    const scaleX = Number(pointGenerator.ScaleX ?? fields.ScaleX ?? directResolution);
    const scaleZ = Number(pointGenerator.ScaleZ ?? fields.ScaleZ ?? directResolution);
    const spacing = Number.isFinite(directResolution)
      ? directResolution
      : averageFinite(scaleX, scaleZ, 16);
    const jitter = Number(pointGenerator.Jitter ?? fields.Jitter ?? 0);

    return { spacing, jitter };
  }

  function resolveScaleVector(
    fields: Record<string, unknown>,
    inputs: Map<string, string>,
  ): { x: number; z: number } {
    const scaleInput = getInputFields(inputs, "Scale");
    const value = (scaleInput?.Value ?? fields.Scale) as { x?: number; y?: number; z?: number } | number | undefined;
    if (typeof value === "number") return { x: value, z: value };
    return {
      x: Number(value?.x ?? 1),
      z: Number(value?.z ?? value?.x ?? 1),
    };
  }

  return evaluate(root.id);
}

/* ── Grid generator ───────────────────────────────────────────────── */

function generateGrid(
  range: WorldRange,
  spacing: number,
  jitter: number,
  rng: () => number,
): EvaluatedPosition[] {
  if (spacing <= 0) return [];
  spacing = Math.max(spacing, 1);

  const positions: EvaluatedPosition[] = [];
  const halfJitter = jitter * spacing * 0.5;

  for (let x = range.minX; x < range.maxX; x += spacing) {
    for (let z = range.minZ; z < range.maxZ; z += spacing) {
      const jx = halfJitter > 0 ? (rng() * 2 - 1) * halfJitter : 0;
      const jz = halfJitter > 0 ? (rng() * 2 - 1) * halfJitter : 0;
      positions.push({ x: x + jx, z: z + jz, weight: 1 });

      if (positions.length >= MAX_POSITIONS) return positions;
    }
  }

  return positions;
}

function averageFinite(a: number, b: number, fallback: number): number {
  const values = [a, b].filter(Number.isFinite);
  if (values.length === 0) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
