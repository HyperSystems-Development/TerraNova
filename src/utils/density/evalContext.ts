import type { Node, Edge } from "@xyflow/react";
import { getCurveEvaluator, normalizePoints, catmullRomInterpolate } from "../curveEvaluators";
import { evaluateVectorProvider, vec3Normalize, vec3Length } from "../vectorEvaluator";
import {
  createHytaleNoise2D, createHytaleNoise3D,
  createHytaleNoise2DWithGradient, createHytaleNoise3DWithGradient,
} from "../hytaleNoise";
import { mulberry32, hashSeed } from "./prng";
import { voronoiNoise2D, voronoiNoise3D } from "./voronoiNoise";
import { findDensityRoot, getNodeType, UNSUPPORTED_TYPES } from "./evalTypes";
import { buildAllHandlers } from "./handlers";

/* ── Types ────────────────────────────────────────────────────────── */

export interface DensityGridResult {
  values: Float32Array;
  minValue: number;
  maxValue: number;
  /** 2nd percentile value for robust normalization */
  p02Value: number;
  /** 98th percentile value for robust normalization */
  p98Value: number;
}

export interface EvaluationOptions {
  contentFields?: Record<string, number>;
}

export interface EvaluationContext {
  rootId: string;
  evaluate: (nodeId: string, x: number, y: number, z: number) => number;
  clearMemo: () => void;
}

/** Shared evaluation state passed to every handler. */
export interface EvalCtx {
  // Core evaluation
  evaluate: (nodeId: string, x: number, y: number, z: number) => number;
  getInput: (inputs: Map<string, string>, handle: string, x: number, y: number, z: number) => number;

  // Curve helpers
  applyCurve: (curveHandleName: string, inputVal: number, inputs: Map<string, string>) => number;
  applySpline: (fields: Record<string, unknown>, inputVal: number) => number;

  // Noise caches
  getNoise2D: (seed: number) => (x: number, y: number) => number;
  getNoise3D: (seed: number) => (x: number, y: number, z: number) => number;
  getVoronoi2D: (seed: number, cellType?: string, jitter?: number, returnType?: string, distanceFunction?: string) => (x: number, y: number) => number;
  getVoronoi3D: (seed: number, cellType?: string, jitter?: number, returnType?: string, distanceFunction?: string) => (x: number, y: number, z: number) => number;

  // Gradient noise (with analytic derivatives)
  createNoise2DWithGradient: (seed: number) => (x: number, y: number) => { value: number; dx: number; dy: number };
  createNoise3DWithGradient: (seed: number) => (x: number, y: number, z: number) => { value: number; dx: number; dy: number; dz: number };

  // Content fields
  contentFields: Record<string, number>;

  // Mutable context state
  anchorX: number;
  anchorY: number;
  anchorZ: number;
  anchorSet: boolean;
  switchState: number;
  cellWallDist: number;

  // Graph data
  nodeById: Map<string, Node>;
  inputEdges: Map<string, Map<string, string>>;

  // Memoization cache
  memoCache: Map<string, number>;

  // Vector evaluation
  evaluateVectorProvider: typeof evaluateVectorProvider;
  vec3Normalize: typeof vec3Normalize;
  vec3Length: typeof vec3Length;

  // Re-export for handlers
  hashSeed: typeof hashSeed;
}

export type NodeHandler = (
  ctx: EvalCtx,
  fields: Record<string, unknown>,
  inputs: Map<string, string>,
  x: number, y: number, z: number,
) => number;

/* ── Factory ──────────────────────────────────────────────────────── */

export function createEvaluationContext(
  nodes: Node[],
  edges: Edge[],
  rootNodeId?: string,
  options?: EvaluationOptions,
): EvaluationContext | null {
  if (nodes.length === 0) return null;

  let root: Node | null = null;
  if (rootNodeId) {
    root = nodes.find((nd) => nd.id === rootNodeId) ?? null;
  }
  if (!root) {
    root = findDensityRoot(nodes, edges);
  }
  if (!root) return null;

  // Build inputEdges: targetId → Map<handleId, sourceId>
  const inputEdges = new Map<string, Map<string, string>>();
  for (const e of edges) {
    const map = inputEdges.get(e.target) ?? new Map<string, string>();
    const handle = e.targetHandle ?? "Input";
    map.set(handle, e.source);
    inputEdges.set(e.target, map);
  }

  const nodeById = new Map(nodes.map((nd) => [nd.id, nd]));
  const contentFields = options?.contentFields ?? {};

  // Noise caches
  const noise2DCache = new Map<number, (x: number, y: number) => number>();
  const noise3DCache = new Map<number, (x: number, y: number, z: number) => number>();
  const voronoi2DCache = new Map<string, (x: number, y: number) => number>();
  const voronoi3DCache = new Map<string, (x: number, y: number, z: number) => number>();

  function getNoise2D(seed: number): (x: number, y: number) => number {
    let fn = noise2DCache.get(seed);
    if (!fn) {
      fn = createHytaleNoise2D(seed);
      noise2DCache.set(seed, fn);
    }
    return fn;
  }

  function getNoise3D(seed: number): (x: number, y: number, z: number) => number {
    let fn = noise3DCache.get(seed);
    if (!fn) {
      fn = createHytaleNoise3D(seed);
      noise3DCache.set(seed, fn);
    }
    return fn;
  }

  function getVoronoi2D(seed: number, cellType: string = "Euclidean", jitter: number = 1.0, returnType: string = "Distance", distanceFunction: string = "Euclidean"): (x: number, y: number) => number {
    const key = `${seed}:${cellType}:${jitter}:${returnType}:${distanceFunction}`;
    let fn = voronoi2DCache.get(key);
    if (!fn) {
      const rng = mulberry32(seed);
      fn = voronoiNoise2D(rng, cellType, jitter, returnType, distanceFunction, seed);
      voronoi2DCache.set(key, fn);
    }
    return fn;
  }

  function getVoronoi3D(seed: number, cellType: string = "Euclidean", jitter: number = 1.0, returnType: string = "Distance", distanceFunction: string = "Euclidean"): (x: number, y: number, z: number) => number {
    const key = `${seed}:${cellType}:${jitter}:${returnType}:${distanceFunction}`;
    let fn = voronoi3DCache.get(key);
    if (!fn) {
      const rng = mulberry32(seed);
      fn = voronoiNoise3D(rng, cellType, jitter, returnType, distanceFunction, seed);
      voronoi3DCache.set(key, fn);
    }
    return fn;
  }

  const memoCache = new Map<string, number>();
  const visiting = new Set<string>();

  // Build handler map
  const handlers = buildAllHandlers();

  // Build the context object
  const ctx: EvalCtx = {
    evaluate,
    getInput,
    applyCurve,
    applySpline,
    getNoise2D,
    getNoise3D,
    getVoronoi2D,
    getVoronoi3D,
    createNoise2DWithGradient: createHytaleNoise2DWithGradient,
    createNoise3DWithGradient: createHytaleNoise3DWithGradient,
    contentFields,
    anchorX: 0,
    anchorY: 0,
    anchorZ: 0,
    anchorSet: false,
    switchState: 0,
    cellWallDist: Infinity,
    nodeById,
    inputEdges,
    memoCache,
    evaluateVectorProvider,
    vec3Normalize,
    vec3Length,
    hashSeed,
  };

  function applyCurve(curveHandleName: string, inputVal: number, inputs: Map<string, string>): number {
    const curveNodeId = inputs.get(curveHandleName);
    if (!curveNodeId) return inputVal;
    const curveNode = nodeById.get(curveNodeId);
    if (!curveNode) return inputVal;
    const curveData = curveNode.data as Record<string, unknown>;
    const curveType = ((curveData.type as string) ?? "").replace(/^Curve:/, "");
    const curveFields = (curveData.fields as Record<string, unknown>) ?? {};

    if (curveType === "Manual") {
      const rawPoints = curveFields.Points as unknown[] | undefined;
      if (rawPoints && rawPoints.length >= 2) {
        const pts = normalizePoints(rawPoints);
        const sortedPts = pts.sort((a, b) => a.x - b.x);
        const sampled = catmullRomInterpolate(sortedPts, 32);
        const xMin = sortedPts[0].x;
        const xMax = sortedPts[sortedPts.length - 1].x;
        const clampedInput = Math.max(xMin, Math.min(xMax, inputVal));
        let lo = 0;
        let hi = sampled.length - 1;
        while (lo < hi - 1) {
          const mid = (lo + hi) >> 1;
          if (sampled[mid].x <= clampedInput) lo = mid;
          else hi = mid;
        }
        const p0 = sampled[lo];
        const p1 = sampled[hi];
        const dx = p1.x - p0.x;
        const t = dx === 0 ? 0 : (clampedInput - p0.x) / dx;
        return p0.y + (p1.y - p0.y) * t;
      }
      return inputVal;
    }

    const curveFn = getCurveEvaluator(curveType, curveFields);
    return curveFn ? curveFn(inputVal) : inputVal;
  }

  function applySpline(fields: Record<string, unknown>, inputVal: number): number {
    const rawPoints = fields.Points as unknown[] | undefined;
    if (rawPoints && rawPoints.length >= 2) {
      const pts = normalizePoints(rawPoints);
      const sortedPts = pts.sort((a, b) => a.x - b.x);
      const sampled = catmullRomInterpolate(sortedPts, 32);
      const xMin = sortedPts[0].x;
      const xMax = sortedPts[sortedPts.length - 1].x;
      const clampedInput = Math.max(xMin, Math.min(xMax, inputVal));
      let lo = 0;
      let hi = sampled.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (sampled[mid].x <= clampedInput) lo = mid;
        else hi = mid;
      }
      const p0 = sampled[lo];
      const p1 = sampled[hi];
      const dx = p1.x - p0.x;
      const t = dx === 0 ? 0 : (clampedInput - p0.x) / dx;
      return p0.y + (p1.y - p0.y) * t;
    }
    return inputVal;
  }

  function evaluate(nodeId: string, x: number, y: number, z: number): number {
    if (visiting.has(nodeId)) return 0; // cycle guard
    visiting.add(nodeId);

    const node = nodeById.get(nodeId);
    if (!node) {
      visiting.delete(nodeId);
      return 0;
    }

    const data = node.data as Record<string, unknown>;
    const type = getNodeType(node);
    const fields = (data.fields as Record<string, unknown>) ?? {};
    const inputs = inputEdges.get(nodeId) ?? new Map<string, string>();

    let result = 0;

    const handler = handlers.get(type);
    if (handler) {
      result = handler(ctx, fields, inputs, x, y, z);
    } else if (UNSUPPORTED_TYPES.has(type)) {
      result = 0;
    } else {
      // Unknown type — try to follow Input handle
      const src = inputs.get("Input") ?? inputs.get("Inputs[0]");
      result = src ? evaluate(src, x, y, z) : 0;
    }

    visiting.delete(nodeId);
    return result;
  }

  function getInput(inputs: Map<string, string>, handle: string, x: number, y: number, z: number): number {
    const src = inputs.get(handle);
    if (!src) return 0;
    return evaluate(src, x, y, z);
  }

  return {
    rootId: root.id,
    evaluate,
    clearMemo: () => memoCache.clear(),
  };
}
