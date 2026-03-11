import { lazy, Suspense, useCallback, useRef, useState, useEffect } from "react";
import { MaterialLegend } from "./MaterialLegend";
import { usePreviewStore } from "@/stores/previewStore";
import { usePreviewEvaluation } from "@/hooks/usePreviewEvaluation";
import { useVoxelEvaluation } from "@/hooks/useVoxelEvaluation";
import { useWorldPreview } from "@/hooks/useWorldPreview";
import { usePositionOverlay } from "@/hooks/usePositionOverlay";
import { Heatmap2D } from "./Heatmap2D";
import { ThresholdedHeatmap } from "./ThresholdedHeatmap";
import { PreviewControls } from "./PreviewControls";
import { StatisticsPanel } from "./StatisticsPanel";
import { CrossSectionPlot } from "./CrossSectionPlot";

// Lazy-load heavy 3D components to avoid loading Three.js until needed
const Preview3D = lazy(() => import("./Preview3D").then(m => ({ default: m.Preview3D })));
const VoxelPreview3D = lazy(() => import("./VoxelPreview3D").then(m => ({ default: m.VoxelPreview3D })));

function Preview3DFallback() {
  return (
    <div className="flex items-center justify-center h-full text-sm text-tn-text-muted">
      Loading 3D preview...
    </div>
  );
}

export function PreviewPanel() {
    // MaterialLegend position state (persisted)
    const [legendPos, setLegendPos] = useState<{ x: number; y: number }>(() => {
      const saved = localStorage.getItem("tn-materialLegendPos");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === "number" && typeof parsed.y === "number") {
            return parsed;
          }
        } catch {}
      }
      // Default: top left
      return { x: 16, y: 16 };
    });
    const [legendVisible, setLegendVisible] = useState(true); // debug toggle

    // Persist legend position on change
    useEffect(() => {
      localStorage.setItem("tn-materialLegendPos", JSON.stringify(legendPos));
    }, [legendPos]);
  usePreviewEvaluation();
  useVoxelEvaluation();
  useWorldPreview();
  usePositionOverlay();

  const mode = usePreviewStore((s) => s.mode);
  const values = usePreviewStore((s) => s.values);
  const isLoading = usePreviewStore((s) => s.isLoading);
  const previewError = usePreviewStore((s) => s.previewError);
  const showCrossSection = usePreviewStore((s) => s.showCrossSection);
  const crossSectionLine = usePreviewStore((s) => s.crossSectionLine);
  const showThresholdView = usePreviewStore((s) => s.showThresholdView);
  const isVoxelLoading = usePreviewStore((s) => s.isVoxelLoading);
  const voxelError = usePreviewStore((s) => s.voxelError);
  const voxelDensities = usePreviewStore((s) => s.voxelDensities);
  const isWorldLoading = usePreviewStore((s) => s.isWorldLoading);
  const worldError = usePreviewStore((s) => s.worldError);
  const voxelMeshData = usePreviewStore((s) => s.voxelMeshData);
  const viewMode = usePreviewStore((s) => s.viewMode);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isSplitMode = viewMode === "split";
  const [controlsCollapsed, setControlsCollapsed] = useState(isSplitMode);

  // Auto-collapse/expand when switching between split and full preview
  useEffect(() => {
    setControlsCollapsed(isSplitMode);
  }, [isSplitMode]);

  const handle3DCanvasRef = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
  }, []);

  const fidelityScore = usePreviewStore((s) => s.fidelityScore);
  const anyLoading = isLoading || isVoxelLoading || isWorldLoading;
  const anyError = previewError || voxelError || worldError;
  const hasData = mode === "world"
    ? !!voxelMeshData
    : mode === "voxel"
      ? !!voxelDensities
      : !!values;

  return (
    <div className="flex h-full overflow-hidden bg-tn-bg">
      {/* Controls sidebar — collapsible */}
      <div
        className={`shrink-0 border-r border-tn-border transition-all duration-150 ${
          controlsCollapsed ? "w-8" : "w-64"
        }`}
      >
        {controlsCollapsed ? (
          <button
            onClick={() => setControlsCollapsed(false)}
            className="flex items-center justify-center w-full h-full hover:bg-white/5 transition-colors"
            title="Expand controls"
          >
            <svg className="w-4 h-4 text-tn-text-muted" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3l5 5-5 5" />
            </svg>
          </button>
        ) : (
          <div className="h-full flex flex-col overflow-y-auto">
            <button
              onClick={() => setControlsCollapsed(true)}
              className="shrink-0 flex items-center justify-end px-2 py-1 hover:bg-white/5 transition-colors"
              title="Collapse controls"
            >
              <svg className="w-3.5 h-3.5 text-tn-text-muted" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3l-5 5 5 5" />
              </svg>
            </button>
            <PreviewControls canvasRef={canvasRef} />
            {/* MATERIALS section in Debug sidebar ONLY */}
              {/* ...existing code... */}
            {mode !== "voxel" && mode !== "world" && <StatisticsPanel />}
          </div>
        )}
      </div>

      {/* Main preview area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 min-h-0 relative">
          {/* Material legend — draggable, debug toggle */}
          {legendVisible && hasData && (
            null
          )}
          {anyLoading && (
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2 py-1 bg-tn-panel/90 rounded text-xs text-tn-text-muted">
              <span className="inline-block w-3 h-3 border-2 border-tn-accent border-t-transparent rounded-full animate-spin" />
              Evaluating...
            </div>
          )}
          {fidelityScore < 100 && hasData && (
            <div
              className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded text-[10px] font-medium"
              style={{
                backgroundColor: fidelityScore >= 90 ? "#4ade8033" : fidelityScore >= 70 ? "#facc1533" : "#f8717133",
                color: fidelityScore >= 90 ? "#4ade80" : fidelityScore >= 70 ? "#facc15" : "#f87171",
              }}
              title="Percentage of nodes with fully accurate evaluation"
            >
              Fidelity: {fidelityScore}%
            </div>
          )}

          {anyError && !hasData && (
            <div className="flex items-center justify-center h-full p-4">
              <p className="text-xs text-red-400 max-w-md text-center whitespace-pre-line">{anyError}</p>
            </div>
          )}

          {!hasData && !anyError && !anyLoading && (
            <div className="flex items-center justify-center h-full text-sm text-tn-text-muted">
              No preview data — open a density file to get started
            </div>
          )}

          {/* 2D mode */}
          {mode === "2d" && values && (
            showThresholdView
              ? <ThresholdedHeatmap ref={canvasRef} />
              : <Heatmap2D ref={canvasRef} />
          )}

          {/* 3D heightfield mode */}
          {mode === "3d" && values && (
            <Suspense fallback={<Preview3DFallback />}>
              <Preview3D onCanvasRef={handle3DCanvasRef} />
            </Suspense>
          )}

          {/* Voxel mode */}
          {mode === "voxel" && (voxelDensities || isVoxelLoading) && (
            <Suspense fallback={<Preview3DFallback />}>
              <VoxelPreview3D onCanvasRef={handle3DCanvasRef} />
            </Suspense>
          )}

          {/* World mode — reuses VoxelPreview3D with server chunk data */}
          {mode === "world" && (voxelMeshData || isWorldLoading) && (
            <Suspense fallback={<Preview3DFallback />}>
              <VoxelPreview3D onCanvasRef={handle3DCanvasRef} />
            </Suspense>
          )}
        </div>

        {/* Cross-section plot below main preview */}
        {mode === "2d" && showCrossSection && crossSectionLine && values && (
          <CrossSectionPlot />
        )}
      </div>
    </div>
  );
}
