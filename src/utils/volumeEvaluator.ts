import type { Node, Edge } from "@xyflow/react";
import { createEvaluationContext, type EvaluationOptions } from "./densityEvaluator";

/* ── Types ────────────────────────────────────────────────────────── */

export interface VolumeResult {
  densities: Float32Array;
  resolution: number;
  ySlices: number;
  minValue: number;
  maxValue: number;
}

/* ── Main export ──────────────────────────────────────────────────── */

/**
 * Evaluate a density node graph over a 3D volume.
 * Layout: densities[y * n * n + z * n + x] (Y-major)
 *
 * x, z ∈ [rangeMin, rangeMax]
 * y ∈ [yMin, yMax]
 */
export function evaluateDensityVolume(
  nodes: Node[],
  edges: Edge[],
  resolution: number,
  rangeMin: number,
  rangeMax: number,
  yMin: number,
  yMax: number,
  ySlices: number,
  rootNodeId?: string,
  options?: EvaluationOptions,
): VolumeResult {
  const n = Math.max(1, resolution);
  const ys = Math.max(1, ySlices);
  const densities = new Float32Array(n * n * ys);

  const ctx = createEvaluationContext(nodes, edges, rootNodeId, options);
  if (!ctx) {
    return { densities, resolution: n, ySlices: ys, minValue: 0, maxValue: 0 };
  }

  const stepXZ = n > 1 ? (rangeMax - rangeMin) / (n - 1) : 0;
  const stepY = ys > 1 ? (yMax - yMin) / (ys - 1) : 0;
  let minVal = Infinity;
  let maxVal = -Infinity;

  for (let yi = 0; yi < ys; yi++) {
    const wy = yMin + yi * stepY;
    const yOffset = yi * n * n;

    for (let zi = 0; zi < n; zi++) {
      const wz = rangeMin + zi * stepXZ;

      for (let xi = 0; xi < n; xi++) {
        const wx = rangeMin + xi * stepXZ;

        ctx.clearMemo();
        const val = ctx.evaluate(ctx.rootId, wx, wy, wz);

        const idx = yOffset + zi * n + xi;
        densities[idx] = val;

        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
    }
  }

  if (!isFinite(minVal)) minVal = 0;
  if (!isFinite(maxVal)) maxVal = 0;

  return { densities, resolution: n, ySlices: ys, minValue: minVal, maxValue: maxVal };
}
