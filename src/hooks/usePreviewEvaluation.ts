import { useEffect, useRef } from "react";
import { usePreviewStore } from "@/stores/previewStore";
import { useEditorStore } from "@/stores/editorStore";
import { evaluateInWorker, cancelEvaluation } from "@/utils/densityWorkerClient";
import { computeFidelityScore } from "@/utils/graphDiagnostics";
import { useConfigStore } from "@/stores/configStore";

/**
 * Auto-evaluation hook for the preview panel.
 * Watches graph changes and preview control changes, then triggers
 * evaluation via the Web Worker with debouncing and cancellation.
 */
export function usePreviewEvaluation() {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const contentFields = useEditorStore((s) => s.contentFields);
  const outputNodeId = useEditorStore((s) => s.outputNodeId);
  const resolution = usePreviewStore((s) => s.resolution);
  const rangeMin = usePreviewStore((s) => s.rangeMin);
  const rangeMax = usePreviewStore((s) => s.rangeMax);
  const yLevel = usePreviewStore((s) => s.yLevel);
  const selectedPreviewNodeId = usePreviewStore((s) => s.selectedPreviewNodeId);
  const viewMode = usePreviewStore((s) => s.viewMode);
  const autoRefresh = usePreviewStore((s) => s.autoRefresh);
  const setValues = usePreviewStore((s) => s.setValues);
  const setLoading = usePreviewStore((s) => s.setLoading);
  const setPreviewError = usePreviewStore((s) => s.setPreviewError);
  const debounceMs = useConfigStore((s) => s.debounceMs);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const evalIdRef = useRef(0);

  useEffect(() => {
    // Only auto-evaluate when preview is visible and auto-refresh is on
    if (viewMode === "graph" || !autoRefresh) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (nodes.length === 0) {
        setValues(null, 0, 0);
        setPreviewError(null);
        return;
      }

      const evalId = ++evalIdRef.current;
      setLoading(true);
      setPreviewError(null);

      try {
        const result = await evaluateInWorker({
          nodes,
          edges,
          resolution,
          rangeMin,
          rangeMax,
          yLevel,
          rootNodeId: selectedPreviewNodeId ?? outputNodeId ?? undefined,
          options: { contentFields },
        });

        // Only apply if this is still the latest evaluation
        if (evalId === evalIdRef.current) {
          setValues(result.values, result.minValue, result.maxValue);
          usePreviewStore.getState().setFidelityScore(computeFidelityScore(nodes));
        }
      } catch (err) {
        if (err === "cancelled") return; // expected
        if (evalId === evalIdRef.current) {
          setValues(null, 0, 0);
          setPreviewError(`Preview evaluation failed: ${err}`);
        }
      } finally {
        if (evalId === evalIdRef.current) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      cancelEvaluation();
    };
  }, [nodes, edges, contentFields, outputNodeId, resolution, rangeMin, rangeMax, yLevel, selectedPreviewNodeId, viewMode, autoRefresh, setValues, setLoading, setPreviewError, debounceMs]);
}

/**
 * Trigger a manual evaluation (ignores autoRefresh).
 */
export function triggerManualEvaluation() {
  const { resolution, rangeMin, rangeMax, yLevel, selectedPreviewNodeId, setValues, setLoading, setPreviewError } = usePreviewStore.getState();
  const { nodes, edges, contentFields, outputNodeId } = useEditorStore.getState();

  if (nodes.length === 0) {
    setValues(null, 0, 0);
    return;
  }

  setLoading(true);
  setPreviewError(null);

  evaluateInWorker({
    nodes,
    edges,
    resolution,
    rangeMin,
    rangeMax,
    yLevel,
    rootNodeId: selectedPreviewNodeId ?? outputNodeId ?? undefined,
    options: { contentFields },
  })
    .then((result) => {
      setValues(result.values, result.minValue, result.maxValue);
    })
    .catch((err) => {
      if (err === "cancelled") return;
      setValues(null, 0, 0);
      setPreviewError(`Preview evaluation failed: ${err}`);
    })
    .finally(() => {
      setLoading(false);
    });
}
