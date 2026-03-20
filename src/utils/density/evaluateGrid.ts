import type { Node, Edge } from "@xyflow/react";
import { createEvaluationContext, type DensityGridResult, type EvaluationOptions } from "./evalContext";

/** In-place quickselect — finds the k-th smallest value in O(n) average time. */
function quickselect(arr: Float32Array, k: number): number {
  const a = Float32Array.from(arr); // work on a copy
  let lo = 0;
  let hi = a.length - 1;
  while (lo < hi) {
    const pivot = a[(lo + hi) >> 1];
    let i = lo, j = hi;
    while (i <= j) {
      while (a[i] < pivot) i++;
      while (a[j] > pivot) j--;
      if (i <= j) { const t = a[i]; a[i] = a[j]; a[j] = t; i++; j--; }
    }
    if (k <= j) hi = j;
    else if (k >= i) lo = i;
    else break;
  }
  return a[k];
}

export function evaluateDensityGrid(
  nodes: Node[],
  edges: Edge[],
  resolution: number,
  rangeMin: number,
  rangeMax: number,
  yLevel: number,
  rootNodeId?: string,
  options?: EvaluationOptions,
): DensityGridResult {
  const n = Math.max(1, resolution);
  const values = new Float32Array(n * n);

  const ctx = createEvaluationContext(nodes, edges, rootNodeId, options);
  if (!ctx) {
    return { values, minValue: 0, maxValue: 0, p02Value: 0, p98Value: 0 };
  }

  const step = n > 1 ? (rangeMax - rangeMin) / (n - 1) : 0;
  let minVal = Infinity;
  let maxVal = -Infinity;

  // Clear memo once before the grid loop — cache keys include (x,y,z) so
  // there is no cross-pixel reuse; clearing per-pixel only adds overhead.
  ctx.clearMemo();

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const sx = rangeMin + col * step;
      const sz = rangeMin + row * step;
      const val = ctx.evaluate(ctx.rootId, sx, yLevel, sz);
      values[row * n + col] = val;
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }
  }

  if (!isFinite(minVal)) minVal = 0;
  if (!isFinite(maxVal)) maxVal = 0;

  // Compute 2nd/98th percentile via quickselect (O(n) avg) instead of full sort.
  const p02Value = quickselect(values, Math.floor(values.length * 0.02));
  const p98Value = quickselect(values, Math.min(values.length - 1, Math.floor(values.length * 0.98)));

  return { values, minValue: minVal, maxValue: maxVal, p02Value, p98Value };
}
