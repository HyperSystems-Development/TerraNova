import type { Node, Edge } from "@xyflow/react";
import { evaluateDensityGrid, type EvaluationOptions } from "../utils/densityEvaluator";
import type { DensityWorkerRequest, DensityWorkerResponse, DensityWorkerError } from "../workers/densityWorker";

const WORKER_TIMEOUT_MS = 30_000;

function isDebug(): boolean {
  try {
    return import.meta.env.DEV || localStorage.getItem("tn-debug-workers") === "1";
  } catch {
    return false;
  }
}

function log(...args: unknown[]) {
  if (isDebug()) console.log("[densityWorkerClient]", ...args);
}

function warn(...args: unknown[]) {
  console.warn("[densityWorkerClient]", ...args);
}

export interface EvalParams {
  nodes: Node[];
  edges: Edge[];
  resolution: number;
  rangeMin: number;
  rangeMax: number;
  yLevel: number;
  rootNodeId?: string;
  options?: EvaluationOptions;
}

export interface EvalResult {
  values: Float32Array;
  minValue: number;
  maxValue: number;
  p02Value: number;
  p98Value: number;
}

export interface WorkerInstance {
  evaluate: (params: EvalParams) => Promise<EvalResult>;
  cancel: () => void;
}

function evaluateOnMainThread(params: EvalParams): EvalResult {
  const result = evaluateDensityGrid(
    params.nodes,
    params.edges,
    params.resolution,
    params.rangeMin,
    params.rangeMax,
    params.yLevel,
    params.rootNodeId,
    params.options,
  );
  return { values: result.values, minValue: result.minValue, maxValue: result.maxValue, p02Value: result.p02Value, p98Value: result.p98Value };
}

/**
 * Create an independent worker instance with its own evaluate/cancel pair.
 * Used by ComparisonView to run two evaluations in parallel.
 */
export function createWorkerInstance(): WorkerInstance {
  let worker: Worker | null = null;
  let workerFailed = false;
  let pendingReject: ((reason: unknown) => void) | null = null;

  function getWorker(): Worker | null {
    if (workerFailed) return null;
    if (!worker) {
      try {
        worker = new Worker(new URL("../workers/densityWorker.ts", import.meta.url), {
          type: "module",
        });
        worker.addEventListener("error", (e) => {
          warn("Worker global error:", e.message);
        });
        log("Worker constructed successfully");
      } catch (err) {
        warn("Failed to construct Worker, will use main-thread fallback:", err);
        workerFailed = true;
        return null;
      }
    }
    return worker;
  }

  function cancel(): void {
    if (pendingReject) {
      pendingReject("cancelled");
      pendingReject = null;
    }
  }

  function evaluate(params: EvalParams): Promise<EvalResult> {
    cancel();

    const w = getWorker();
    if (!w) {
      log("Using main-thread fallback (worker unavailable)");
      return new Promise<EvalResult>((resolve, reject) => {
        try {
          resolve(evaluateOnMainThread(params));
        } catch (err) {
          reject(err);
        }
      });
    }

    return new Promise<EvalResult>((resolve, reject) => {
      pendingReject = reject;

      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const onMessage = (e: MessageEvent<DensityWorkerResponse | DensityWorkerError>) => {
        cleanup();
        if ("error" in e.data) {
          reject(new Error(e.data.error));
        } else {
          log("Worker returned result, values length:", e.data.values.length);
          resolve({
            values: e.data.values,
            minValue: e.data.minValue,
            maxValue: e.data.maxValue,
            p02Value: e.data.p02Value,
            p98Value: e.data.p98Value,
          });
        }
      };

      const onError = (e: ErrorEvent) => {
        cleanup();
        warn("Worker error during evaluation:", e.message);
        warn("Falling back to main-thread evaluation");
        try {
          resolve(evaluateOnMainThread(params));
        } catch (fallbackErr) {
          reject(fallbackErr);
        }
      };

      function cleanup() {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        w!.removeEventListener("message", onMessage);
        w!.removeEventListener("error", onError);
        if (pendingReject === reject) pendingReject = null;
      }

      w.addEventListener("message", onMessage);
      w.addEventListener("error", onError);

      timeoutId = setTimeout(() => {
        cleanup();
        warn(`Worker timed out after ${WORKER_TIMEOUT_MS}ms, falling back to main-thread evaluation`);
        try {
          resolve(evaluateOnMainThread(params));
        } catch (fallbackErr) {
          reject(fallbackErr);
        }
      }, WORKER_TIMEOUT_MS);

      const request: DensityWorkerRequest = {
        nodes: params.nodes,
        edges: params.edges,
        resolution: params.resolution,
        rangeMin: params.rangeMin,
        rangeMax: params.rangeMax,
        yLevel: params.yLevel,
        rootNodeId: params.rootNodeId,
        options: params.options,
      };

      log("Posting message to worker, nodes:", params.nodes.length, "resolution:", params.resolution);
      w.postMessage(request);
    });
  }

  return { evaluate, cancel };
}

// ── Default singleton instance (used by the main preview) ──

const defaultInstance = createWorkerInstance();

/**
 * Cancel any in-flight evaluation. The promise from the previous
 * evaluateInWorker call will reject with "cancelled".
 */
export function cancelEvaluation(): void {
  defaultInstance.cancel();
}

/**
 * Evaluate the density grid in a background Web Worker.
 * Only one evaluation runs at a time — calling again cancels the previous.
 */
export function evaluateInWorker(params: EvalParams): Promise<EvalResult> {
  return defaultInstance.evaluate(params);
}
