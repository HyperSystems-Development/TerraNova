import { useEffect, useRef } from "react";
import { usePreviewStore } from "@/stores/previewStore";
import { useEditorStore } from "@/stores/editorStore";
import { createWorkerInstance, type WorkerInstance } from "@/utils/densityWorkerClient";
import { useConfigStore } from "@/stores/configStore";

/**
 * Dual evaluation hook for Comparison mode.
 * Creates up to two independent worker instances and evaluates both panes.
 * When maxWorkerThreads <= 2, falls back to sequential evaluation with a
 * single shared worker to reduce CPU usage.
 */
export function useComparisonEvaluation() {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const contentFields = useEditorStore((s) => s.contentFields);
  const resolution = usePreviewStore((s) => s.resolution);
  const rangeMin = usePreviewStore((s) => s.rangeMin);
  const rangeMax = usePreviewStore((s) => s.rangeMax);
  const yLevel = usePreviewStore((s) => s.yLevel);
  const viewMode = usePreviewStore((s) => s.viewMode);
  const compareNodeA = usePreviewStore((s) => s.compareNodeA);
  const compareNodeB = usePreviewStore((s) => s.compareNodeB);
  const setCompareValuesA = usePreviewStore((s) => s.setCompareValuesA);
  const setCompareValuesB = usePreviewStore((s) => s.setCompareValuesB);
  const setCompareLoadingA = usePreviewStore((s) => s.setCompareLoadingA);
  const setCompareLoadingB = usePreviewStore((s) => s.setCompareLoadingB);
  const debounceMs = useConfigStore((s) => s.debounceMs);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workerARef = useRef<WorkerInstance | null>(null);
  const workerBRef = useRef<WorkerInstance | null>(null);
  const evalIdRef = useRef(0);

  // Lazy-init workers — only create a second worker when thread budget allows
  if (!workerARef.current) workerARef.current = createWorkerInstance();

  useEffect(() => {
    if (viewMode !== "compare") return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (nodes.length === 0) {
        setCompareValuesA(null, 0, 0);
        setCompareValuesB(null, 0, 0);
        return;
      }

      const evalId = ++evalIdRef.current;
      const baseParams = { nodes, edges, resolution, rangeMin, rangeMax, yLevel, options: { contentFields } };
      const maxThreads = useConfigStore.getState().maxWorkerThreads;

      // When thread budget allows (>= 3), use parallel workers
      const useParallel = maxThreads >= 3;
      if (useParallel && !workerBRef.current) {
        workerBRef.current = createWorkerInstance();
      }

      if (useParallel) {
        // ── Parallel evaluation ──
        const evalA = compareNodeA
          ? (async () => {
              setCompareLoadingA(true);
              try {
                const result = await workerARef.current!.evaluate({
                  ...baseParams,
                  rootNodeId: compareNodeA,
                });
                if (evalId === evalIdRef.current) {
                  setCompareValuesA(result.values, result.minValue, result.maxValue);
                }
              } catch (err) {
                if (err !== "cancelled" && evalId === evalIdRef.current) {
                  setCompareValuesA(null, 0, 0);
                }
              } finally {
                if (evalId === evalIdRef.current) setCompareLoadingA(false);
              }
            })()
          : Promise.resolve();

        const evalB = compareNodeB
          ? (async () => {
              setCompareLoadingB(true);
              try {
                const result = await workerBRef.current!.evaluate({
                  ...baseParams,
                  rootNodeId: compareNodeB,
                });
                if (evalId === evalIdRef.current) {
                  setCompareValuesB(result.values, result.minValue, result.maxValue);
                }
              } catch (err) {
                if (err !== "cancelled" && evalId === evalIdRef.current) {
                  setCompareValuesB(null, 0, 0);
                }
              } finally {
                if (evalId === evalIdRef.current) setCompareLoadingB(false);
              }
            })()
          : Promise.resolve();

        await Promise.all([evalA, evalB]);
      } else {
        // ── Sequential evaluation — uses a single worker ──
        const worker = workerARef.current!;

        if (compareNodeA) {
          setCompareLoadingA(true);
          try {
            const result = await worker.evaluate({ ...baseParams, rootNodeId: compareNodeA });
            if (evalId === evalIdRef.current) {
              setCompareValuesA(result.values, result.minValue, result.maxValue);
            }
          } catch (err) {
            if (err !== "cancelled" && evalId === evalIdRef.current) {
              setCompareValuesA(null, 0, 0);
            }
          } finally {
            if (evalId === evalIdRef.current) setCompareLoadingA(false);
          }
        }

        if (compareNodeB && evalId === evalIdRef.current) {
          setCompareLoadingB(true);
          try {
            const result = await worker.evaluate({ ...baseParams, rootNodeId: compareNodeB });
            if (evalId === evalIdRef.current) {
              setCompareValuesB(result.values, result.minValue, result.maxValue);
            }
          } catch (err) {
            if (err !== "cancelled" && evalId === evalIdRef.current) {
              setCompareValuesB(null, 0, 0);
            }
          } finally {
            if (evalId === evalIdRef.current) setCompareLoadingB(false);
          }
        }
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      workerARef.current?.cancel();
      workerBRef.current?.cancel();
    };
  }, [nodes, edges, contentFields, resolution, rangeMin, rangeMax, yLevel, viewMode, compareNodeA, compareNodeB,
      setCompareValuesA, setCompareValuesB, setCompareLoadingA, setCompareLoadingB, debounceMs]);
}
