import type { Node, Edge } from "@xyflow/react";
import { createVolumeWorkerInstance } from "./volumeWorkerClient";
import { DEFAULT_WORLD_HEIGHT } from "@/constants";

// ---------------------------------------------------------------------------
// Feature 1: Auto-fit Y Bounds — scan density grid after coarse pass
// ---------------------------------------------------------------------------

export interface YBoundsResult {
  worldYMin: number;
  worldYMax: number;
  hasSolids: boolean;
}

/**
 * Threshold above which a Y slice is considered "fully underground" —
 * not interesting to frame the camera around.
 */
const UNDERGROUND_FRACTION = 0.92;

/**
 * Scans a density grid (Y-major layout: densities[yi * n * n + zi * n + xi])
 * to find the surface band — Y slices where solid/air transitions happen —
 * then frames the view around that band instead of the raw solid bounding box.
 *
 * For terrain graphs this avoids showing a massive underground block with the
 * interesting surface barely visible at the top.  For SDFs floating in space
 * every non-empty slice is a "surface" slice so the result is equivalent to a
 * simple bounding box.
 */
export function scanDensityGridYBounds(
  densities: Float32Array,
  resolution: number,
  ySlices: number,
  yMin: number,
  yMax: number,
  padding?: { belowBlocks?: number; aboveFraction?: number; aboveMinBlocks?: number },
): YBoundsResult {
  const n = resolution;
  const totalPerSlice = n * n;
  const belowPad = padding?.belowBlocks ?? 12;
  const aboveFrac = padding?.aboveFraction ?? 0.20;
  const aboveMinPad = padding?.aboveMinBlocks ?? 10;

  // 1. Count solid voxels per Y slice
  const solidCounts = new Uint32Array(ySlices);
  for (let yi = 0; yi < ySlices; yi++) {
    const base = yi * n * n;
    let count = 0;
    for (let zi = 0; zi < n; zi++) {
      const rowBase = base + zi * n;
      for (let xi = 0; xi < n; xi++) {
        if (densities[rowBase + xi] >= 0) count++;
      }
    }
    solidCounts[yi] = count;
  }

  // 2. Find first/last slice with any solid
  let firstSolid = -1;
  let lastSolid = -1;
  for (let yi = 0; yi < ySlices; yi++) {
    if (solidCounts[yi] > 0) {
      if (firstSolid < 0) firstSolid = yi;
      lastSolid = yi;
    }
  }

  if (firstSolid < 0) {
    return { worldYMin: yMin, worldYMax: yMax, hasSolids: false };
  }

  // 3. Identify the "surface band" — slices that are NOT fully underground.
  //    A slice with solid fraction >= UNDERGROUND_FRACTION that sits below a
  //    less-solid slice is dense underground and not interesting to frame.
  //    Walk upward from firstSolid to find where the surface begins.
  let surfaceBottom = firstSolid;
  for (let yi = firstSolid; yi <= lastSolid; yi++) {
    const fraction = solidCounts[yi] / totalPerSlice;
    if (fraction < UNDERGROUND_FRACTION) {
      // This slice has a mix of solid and air — surface starts here (or earlier).
      // Back up one slice so we include the transition edge.
      surfaceBottom = Math.max(firstSolid, yi - 1);
      break;
    }
    // Still fully underground — keep walking up
    surfaceBottom = yi;
  }

  // 4. Find the top of the surface band (last slice with any solid).
  //    For the top we always use lastSolid — there's no "fully air" problem.
  const surfaceTop = lastSolid;

  // 5. Convert to world Y with asymmetric padding:
  //    - Below: small fixed amount (some underground context)
  //    - Above: proportional + minimum (sky space)
  const yRange = yMax - yMin;
  const sliceToWorld = (slice: number) => yMin + (slice / ySlices) * yRange;

  const rawMin = sliceToWorld(surfaceBottom);
  const rawMax = sliceToWorld(surfaceTop + 1);
  const surfaceSpan = rawMax - rawMin;
  const abovePad = Math.max(surfaceSpan * aboveFrac, aboveMinPad);

  const worldYMin = Math.max(0, Math.floor(rawMin - belowPad));
  const worldYMax = Math.min(DEFAULT_WORLD_HEIGHT, Math.ceil(rawMax + abovePad));

  return { worldYMin, worldYMax, hasSolids: true };
}

// ---------------------------------------------------------------------------
// Graph hash — detect when graph output could change
// ---------------------------------------------------------------------------

/**
 * Computes a hash string from graph topology + field values.
 * Changes when graph output could change, but NOT when only Y bounds change.
 */
export function computeGraphHash(nodes: Node[], edges: Edge[]): string {
  const parts: string[] = [];

  // Sort nodes by ID for determinism
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  for (const node of sorted) {
    parts.push(node.id);
    parts.push(String(node.type ?? ""));
    // Include field values (these affect evaluation output)
    const fields = (node.data as Record<string, unknown>)?.fields;
    if (fields && typeof fields === "object") {
      const fieldKeys = Object.keys(fields as Record<string, unknown>).sort();
      for (const k of fieldKeys) {
        parts.push(k);
        parts.push(JSON.stringify((fields as Record<string, unknown>)[k]));
      }
    }
  }

  // Include edge topology
  const sortedEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));
  for (const e of sortedEdges) {
    parts.push(`${e.source}->${e.target}:${e.sourceHandle ?? ""}:${e.targetHandle ?? ""}`);
  }

  // Simple string hash — doesn't need to be cryptographic
  const str = parts.join("|");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return hash.toString(36);
}

// ---------------------------------------------------------------------------
// Feature 2: Fit to Content — scan full 3D bounds
// ---------------------------------------------------------------------------

export interface Bounds3DResult {
  worldXMin: number;
  worldXMax: number;
  worldYMin: number;
  worldYMax: number;
  worldZMin: number;
  worldZMax: number;
  hasSolids: boolean;
}

/**
 * Scans a density grid for the 3D bounding box of content, using surface-aware
 * Y logic (same as scanDensityGridYBounds) so terrain graphs don't get a Y min
 * pinned to bedrock.
 */
export function scanDensityGrid3DBounds(
  densities: Float32Array,
  resolution: number,
  ySlices: number,
  rangeMin: number,
  rangeMax: number,
  yMin: number,
  yMax: number,
): Bounds3DResult {
  const n = resolution;
  const totalPerSlice = n * n;

  // Track XZ bounds + per-slice solid counts in one pass
  let minXi = n, maxXi = -1;
  let minZi = n, maxZi = -1;
  const solidCounts = new Uint32Array(ySlices);

  for (let yi = 0; yi < ySlices; yi++) {
    const yBase = yi * n * n;
    let count = 0;
    for (let zi = 0; zi < n; zi++) {
      const rowBase = yBase + zi * n;
      for (let xi = 0; xi < n; xi++) {
        if (densities[rowBase + xi] >= 0) {
          count++;
          if (xi < minXi) minXi = xi;
          if (xi > maxXi) maxXi = xi;
          if (zi < minZi) minZi = zi;
          if (zi > maxZi) maxZi = zi;
        }
      }
    }
    solidCounts[yi] = count;
  }

  if (maxXi < 0) {
    return {
      worldXMin: rangeMin, worldXMax: rangeMax,
      worldYMin: yMin, worldYMax: yMax,
      worldZMin: rangeMin, worldZMax: rangeMax,
      hasSolids: false,
    };
  }

  // Surface-aware Y bounds (same logic as scanDensityGridYBounds)
  let firstSolid = -1;
  let lastSolid = -1;
  for (let yi = 0; yi < ySlices; yi++) {
    if (solidCounts[yi] > 0) {
      if (firstSolid < 0) firstSolid = yi;
      lastSolid = yi;
    }
  }

  let surfaceBottom = firstSolid;
  for (let yi = firstSolid; yi <= lastSolid; yi++) {
    if (solidCounts[yi] / totalPerSlice < UNDERGROUND_FRACTION) {
      surfaceBottom = Math.max(firstSolid, yi - 1);
      break;
    }
    surfaceBottom = yi;
  }

  const xzRange = rangeMax - rangeMin;
  const yRange = yMax - yMin;
  const toWorldXZ = (idx: number) => rangeMin + (idx / n) * xzRange;
  const toWorldY = (idx: number) => yMin + (idx / ySlices) * yRange;

  const xzPad = 8;
  const yPadBelow = 12;
  const yPadAbove = 10;

  return {
    worldXMin: Math.max(-256, Math.floor(toWorldXZ(minXi) - xzPad)),
    worldXMax: Math.min(256, Math.ceil(toWorldXZ(maxXi + 1) + xzPad)),
    worldYMin: Math.max(0, Math.floor(toWorldY(surfaceBottom) - yPadBelow)),
    worldYMax: Math.min(DEFAULT_WORLD_HEIGHT, Math.ceil(toWorldY(lastSolid + 1) + yPadAbove)),
    worldZMin: Math.max(-256, Math.floor(toWorldXZ(minZi) - xzPad)),
    worldZMax: Math.min(256, Math.ceil(toWorldXZ(maxZi + 1) + xzPad)),
    hasSolids: true,
  };
}

/**
 * Runs a full-volume probe using a separate worker instance.
 * Evaluates at low resolution over Y 0-256, XZ ±128 to find where content exists.
 */
export async function runFitToContent(
  nodes: Node[],
  edges: Edge[],
  contentFields: Record<string, number>,
  outputNodeId?: string,
  selectedNodeId?: string,
): Promise<Bounds3DResult | null> {
  const worker = createVolumeWorkerInstance();

  try {
    const result = await worker.evaluate({
      nodes,
      edges,
      resolution: 16,
      rangeMin: -128,
      rangeMax: 128,
      yMin: 0,
      yMax: DEFAULT_WORLD_HEIGHT,
      ySlices: 64,
      rootNodeId: selectedNodeId ?? outputNodeId,
      options: { contentFields },
    });

    return scanDensityGrid3DBounds(
      result.densities,
      result.resolution,
      result.ySlices,
      -128, 128, 0, DEFAULT_WORLD_HEIGHT,
    );
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Feature 3: Graph-Aware Defaults — static analysis of node types
// ---------------------------------------------------------------------------

export type ConfidenceLevel = "high" | "medium" | "low";

export interface GraphDefaultsResult {
  suggestedYMin: number;
  suggestedYMax: number;
  suggestedRangeMin: number;
  suggestedRangeMax: number;
  confidence: ConfidenceLevel;
  reason: string;
}

/**
 * Statically analyzes graph node types to suggest good Y bounds and XZ range
 * before evaluation starts.
 */
export function analyzeGraphDefaults(
  nodes: Node[],
  _edges: Edge[],
  contentFields: Record<string, number>,
): GraphDefaultsResult {
  // Priority 1: BaseHeight nodes
  for (const node of nodes) {
    const type = (node.data as Record<string, unknown>)?.type as string | undefined;
    if (type === "BaseHeight") {
      const fields = (node.data as Record<string, unknown>)?.fields as Record<string, unknown> | undefined;
      const name = (fields?.BaseHeightName as string) ?? "Base";
      const baseY = contentFields[name] ?? 100;
      return {
        suggestedYMin: Math.max(0, Math.floor(baseY - 50)),
        suggestedYMax: Math.min(DEFAULT_WORLD_HEIGHT, Math.ceil(baseY + 50)),
        suggestedRangeMin: -64,
        suggestedRangeMax: 64,
        confidence: "high",
        reason: `BaseHeight "${name}" = ${baseY}`,
      };
    }
  }

  // Priority 2: SDF shapes — read scale fields, center around origin
  for (const node of nodes) {
    const type = (node.data as Record<string, unknown>)?.type as string | undefined;
    if (type === "Ellipsoid" || type === "Cuboid" || type === "Cylinder") {
      const fields = (node.data as Record<string, unknown>)?.fields as Record<string, unknown> | undefined;
      const scale = (fields?.Scale ?? fields?.Radius ?? fields?.Size) as
        { x?: number; y?: number; z?: number } | undefined;
      const sx = Number(scale?.x ?? 1) || 1;
      const sy = Number(scale?.y ?? 1) || 1;
      const sz = Number(scale?.z ?? 1) || 1;

      let maxExtent = Math.max(sx, sy, sz);
      if (type === "Cylinder") {
        const height = Number(fields?.Height ?? 2);
        const radius = Number(fields?.Radius ?? 1) || 1;
        maxExtent = Math.max(height / 2, radius);
      }

      const range = Math.ceil(maxExtent * 1.5);
      return {
        suggestedYMin: Math.max(0, -range),
        suggestedYMax: Math.min(DEFAULT_WORLD_HEIGHT, range),
        suggestedRangeMin: -range,
        suggestedRangeMax: range,
        confidence: "high",
        reason: `SDF shape "${type}" extent ~${maxExtent}`,
      };
    }
  }

  // Priority 3: Y-dependent nodes
  for (const node of nodes) {
    const type = (node.data as Record<string, unknown>)?.type as string | undefined;
    if (type === "YGradient" || type === "GradientDensity" || type === "CoordinateY") {
      const fields = (node.data as Record<string, unknown>)?.fields as Record<string, unknown> | undefined;
      const fromY = Number(fields?.FromY ?? 0);
      const toY = Number(fields?.ToY ?? DEFAULT_WORLD_HEIGHT);
      const pad = Math.max((toY - fromY) * 0.1, 8);
      return {
        suggestedYMin: Math.max(0, Math.floor(fromY - pad)),
        suggestedYMax: Math.min(DEFAULT_WORLD_HEIGHT, Math.ceil(toY + pad)),
        suggestedRangeMin: -64,
        suggestedRangeMax: 64,
        confidence: "medium",
        reason: `Y-dependent node "${type}" range ${fromY}-${toY}`,
      };
    }
  }

  // Priority 4: Noise frequency heuristic
  for (const node of nodes) {
    const type = (node.data as Record<string, unknown>)?.type as string | undefined;
    if (type?.includes("Noise")) {
      const fields = (node.data as Record<string, unknown>)?.fields as Record<string, unknown> | undefined;
      const freq = Number(fields?.Frequency ?? 0.01);
      if (freq > 0) {
        const range = Math.min(DEFAULT_WORLD_HEIGHT, Math.ceil(2 / freq));
        return {
          suggestedYMin: 0,
          suggestedYMax: Math.min(DEFAULT_WORLD_HEIGHT, range),
          suggestedRangeMin: Math.max(-256, -range),
          suggestedRangeMax: Math.min(DEFAULT_WORLD_HEIGHT, range),
          confidence: "medium",
          reason: `Noise frequency ${freq} → range ~${range}`,
        };
      }
    }
  }

  // Priority 5: Fallback — use contentFields["Base"] as center
  const baseY = contentFields["Base"] ?? 100;
  return {
    suggestedYMin: Math.max(0, Math.floor(baseY - 50)),
    suggestedYMax: Math.min(DEFAULT_WORLD_HEIGHT, Math.ceil(baseY + 50)),
    suggestedRangeMin: -64,
    suggestedRangeMax: 64,
    confidence: "low",
    reason: `Fallback: Base height = ${baseY}`,
  };
}
