import type { Node, Edge } from "@xyflow/react";
import { createEvaluationContext, type DensityGridResult, type EvaluationOptions } from "./evalContext";

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
    return { values, minValue: 0, maxValue: 0 };
  }

  const step = n > 1 ? (rangeMax - rangeMin) / (n - 1) : 0;
  let minVal = Infinity;
  let maxVal = -Infinity;

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const sx = rangeMin + col * step;
      const sz = rangeMin + row * step;

      ctx.clearMemo();

      const val = ctx.evaluate(ctx.rootId, sx, yLevel, sz);
      values[row * n + col] = val;
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }
  }

  if (!isFinite(minVal)) minVal = 0;
  if (!isFinite(maxVal)) maxVal = 0;

  return { values, minValue: minVal, maxValue: maxVal };
}
