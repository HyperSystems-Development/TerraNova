import type { Node, Edge } from "@xyflow/react";
import { evaluateDensityVolume } from "../utils/volumeEvaluator";
import type { EvaluationOptions } from "../utils/densityEvaluator";

export interface VolumeWorkerRequest {
  nodes: Node[];
  edges: Edge[];
  resolution: number;
  rangeMin: number;
  rangeMax: number;
  yMin: number;
  yMax: number;
  ySlices: number;
  rootNodeId?: string;
  options?: EvaluationOptions;
}

export interface VolumeWorkerResponse {
  densities: Float32Array;
  resolution: number;
  ySlices: number;
  minValue: number;
  maxValue: number;
}

export interface VolumeWorkerError {
  error: string;
}

self.onmessage = (e: MessageEvent<VolumeWorkerRequest>) => {
  try {
    const { nodes, edges, resolution, rangeMin, rangeMax, yMin, yMax, ySlices, rootNodeId, options } = e.data;
    const result = evaluateDensityVolume(nodes, edges, resolution, rangeMin, rangeMax, yMin, yMax, ySlices, rootNodeId, options);
    // Transfer the Float32Array buffer for zero-copy
    (self as unknown as Worker).postMessage(
      {
        densities: result.densities,
        resolution: result.resolution,
        ySlices: result.ySlices,
        minValue: result.minValue,
        maxValue: result.maxValue,
      } satisfies VolumeWorkerResponse,
      [result.densities.buffer],
    );
  } catch (err) {
    (self as unknown as Worker).postMessage({
      error: err instanceof Error ? err.message : String(err),
    } satisfies VolumeWorkerError);
  }
};
