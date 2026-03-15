import type { Node, Edge } from "@xyflow/react";
import { evaluateDensityGrid, type EvaluationOptions } from "../utils/densityEvaluator";

console.log("[densityWorker] initialized");

export interface DensityWorkerRequest {
  nodes: Node[];
  edges: Edge[];
  resolution: number;
  rangeMin: number;
  rangeMax: number;
  yLevel: number;
  rootNodeId?: string;
  options?: EvaluationOptions;
}

export interface DensityWorkerResponse {
  values: Float32Array;
  minValue: number;
  maxValue: number;
  p02Value: number;
  p98Value: number;
}

export interface DensityWorkerError {
  error: string;
}

self.onmessage = (e: MessageEvent<DensityWorkerRequest>) => {
  try {
    const { nodes, edges, resolution, rangeMin, rangeMax, yLevel, rootNodeId, options } = e.data;
    console.log("[densityWorker] received message, nodes:", nodes.length, "resolution:", resolution);
    const result = evaluateDensityGrid(nodes, edges, resolution, rangeMin, rangeMax, yLevel, rootNodeId, options);
    // Transfer the Float32Array buffer for zero-copy
    (self as unknown as Worker).postMessage(
      { values: result.values, minValue: result.minValue, maxValue: result.maxValue, p02Value: result.p02Value, p98Value: result.p98Value } satisfies DensityWorkerResponse,
      [result.values.buffer],
    );
  } catch (err) {
    (self as unknown as Worker).postMessage({
      error: err instanceof Error ? err.message : String(err),
    } satisfies DensityWorkerError);
  }
};
