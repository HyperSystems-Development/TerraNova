import { useEffect, useRef } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useDiagnosticsStore } from "@/stores/diagnosticsStore";
import { analyzeGraph, analyzeBiome } from "@/utils/graphDiagnostics";

/**
 * Subscribes to editor nodes/edges (and biomeConfig) and runs
 * analyzeGraph() + analyzeBiome() on a 300ms debounce,
 * pushing merged results to the shared diagnosticsStore.
 */
export function useGraphDiagnostics() {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const biomeConfig = useEditorStore((s) => s.biomeConfig);
  const setDiagnostics = useDiagnosticsStore((s) => s.setDiagnostics);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const graphDiags = analyzeGraph(nodes, edges);
      const biomeDiags = analyzeBiome(biomeConfig as unknown as Record<string, unknown> | null);
      setDiagnostics([...biomeDiags, ...graphDiags]);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [nodes, edges, biomeConfig, setDiagnostics]);
}
