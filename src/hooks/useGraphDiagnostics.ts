import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useDiagnosticsStore } from "@/stores/diagnosticsStore";
import { useProjectStore } from "@/stores/projectStore";
import { analyzeGraph, analyzeBiome } from "@/utils/graphDiagnostics";
import {
  buildAssetValidationBadge,
  type AssetReferenceKind,
  resolveAssetValidationLookup,
} from "@/utils/environmentAssetLookup";

/**
 * Subscribes to editor nodes/edges (and biomeConfig) and runs
 * analyzeGraph() + analyzeBiome() on a 300ms debounce,
 * pushing merged results to the shared diagnosticsStore.
 */
export function useGraphDiagnostics() {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const biomeConfig = useEditorStore((s) => s.biomeConfig);
  const currentFile = useProjectStore((s) => s.currentFile);
  const projectPath = useProjectStore((s) => s.projectPath);
  const setDiagnostics = useDiagnosticsStore((s) => s.setDiagnostics);
  const setAssetValidationBadge = useDiagnosticsStore((s) => s.setAssetValidationBadge);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [knownAssetNames, setKnownAssetNames] = useState<Record<AssetReferenceKind, string[]> | null>(null);

  useEffect(() => {
    let disposed = false;
    void resolveAssetValidationLookup(currentFile, projectPath)
      .then((lookup) => {
        if (disposed) return;
        setKnownAssetNames(lookup.namesByKind);
        setAssetValidationBadge(lookup.badge);
      })
      .catch(() => {
        if (disposed) return;
        setKnownAssetNames(null);
        setAssetValidationBadge(buildAssetValidationBadge({}));
      });

    return () => {
      disposed = true;
    };
  }, [currentFile, projectPath, setAssetValidationBadge]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const graphDiags = analyzeGraph(nodes, edges, knownAssetNames);
      const biomeDiags = analyzeBiome(
        biomeConfig as unknown as Record<string, unknown> | null,
        knownAssetNames,
      );
      setDiagnostics([...biomeDiags, ...graphDiags]);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [nodes, edges, biomeConfig, knownAssetNames, setDiagnostics]);
}
