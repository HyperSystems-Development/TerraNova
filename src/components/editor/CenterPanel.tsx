import { memo, useCallback, useRef, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { usePreviewStore } from "@/stores/previewStore";
import { LayoutPresetPicker } from "./LayoutPresetPicker";
import { EditorCanvas } from "./EditorCanvas";
import { BiomeRangeEditor } from "./BiomeRangeEditor";
import { BiomeSectionTabs } from "./BiomeSectionTabs";
import { SettingsEditorView } from "./SettingsEditorView";
import { WeatherEditorView } from "./WeatherEditorView";
import { EnvironmentEditorView } from "./EnvironmentEditorView";
import { JsonEditorView } from "./JsonEditorView";
import { InstanceEditorView } from "./InstanceEditorView";
import { PreviewPanel } from "../preview/PreviewPanel";
import { ComparisonView } from "../preview/ComparisonView";
import { DiagnosticsStrip } from "../preview/DiagnosticsStrip";
import { PipelineIndicator } from "./PipelineIndicator";

const SplitView = memo(function SplitView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const splitRatio = usePreviewStore((s) => s.splitRatio);
  const setSplitRatio = usePreviewStore((s) => s.setSplitRatio);
  const splitDirection = usePreviewStore((s) => s.splitDirection);
  const dragging = useRef(false);
  const isVertical = splitDirection === "vertical";

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = isVertical
        ? Math.max(0.15, Math.min(0.85, (ev.clientX - rect.left) / rect.width))
        : Math.max(0.15, Math.min(0.85, (ev.clientY - rect.top) / rect.height));
      setSplitRatio(ratio);
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [setSplitRatio, isVertical]);

  if (isVertical) {
    return (
      <div ref={containerRef} className="flex flex-row h-full">
        <div style={{ width: `${splitRatio * 100}%` }} className="min-w-0 overflow-hidden">
          <EditorCanvas />
        </div>
        <div
          className="shrink-0 w-1.5 bg-tn-border hover:bg-tn-accent/50 cursor-col-resize transition-colors"
          onMouseDown={onMouseDown}
        />
        <div style={{ flex: 1 }} className="min-w-0 overflow-hidden">
          <PreviewPanel />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      <div style={{ height: `${splitRatio * 100}%` }} className="min-h-0 overflow-hidden">
        <EditorCanvas />
      </div>
      <div
        className="shrink-0 h-1.5 bg-tn-border hover:bg-tn-accent/50 cursor-row-resize transition-colors"
        onMouseDown={onMouseDown}
      />
      <div style={{ flex: 1 }} className="min-h-0 overflow-hidden">
        <PreviewPanel />
      </div>
    </div>
  );
});

/** Density-context view: canvas/preview with floating view-mode overlay */
const DensityView = memo(function DensityView() {
  const viewMode = usePreviewStore((s) => s.viewMode);
  const originalWrapper = useEditorStore((s) => s.originalWrapper);
  const setJsonViewDraft = useEditorStore((s) => s.setJsonViewDraft);

  return (
    <div className="flex flex-col h-full">
      <DiagnosticsStrip />
      <PipelineIndicator />
      <div className="flex-1 min-h-0 relative">
        <LayoutPresetPicker />
        {viewMode === "graph" && <EditorCanvas />}
        {viewMode === "preview" && <PreviewPanel />}
        {viewMode === "split" && <SplitView />}
        {viewMode === "compare" && <ComparisonView />}
        {viewMode === "json" && <JsonEditorView content={originalWrapper} onChange={setJsonViewDraft} />}
      </div>
    </div>
  );
});

export function CenterPanel() {
  const editingContext = useEditorStore((s) => s.editingContext);

  if (editingContext === "NoiseRange") {
    return <NoiseRangeView />;
  }

  if (editingContext === "Settings") {
    return <SettingsEditorView />;
  }

  if (editingContext === "Weather") {
    return <WeatherEditorView />;
  }

  if (editingContext === "Environment") {
    return <EnvironmentEditorView />;
  }

  if (editingContext === "Instance") {
    return <InstanceEditorView />;
  }

  if (editingContext === "RawJson") {
    return <JsonEditorView />;
  }

  if (editingContext === "Biome") {
    return <BiomeView />;
  }

  // Density and other node-graph contexts get the view mode tabs
  if (editingContext) {
    return <DensityView />;
  }

  return <EditorCanvas />;
}

const ROW_H = 28;
const EDITOR_OVERHEAD = 90; // header + coverage strip + column headers
const MIN_EDITOR_H = 160;
const MAX_EDITOR_H = 500;

function defaultEditorHeight(biomeCount: number): number {
  if (biomeCount === 0) return 160;
  // Show ~8–12 rows by default, capped
  const visibleRows = Math.min(biomeCount, 12);
  return Math.max(MIN_EDITOR_H, Math.min(MAX_EDITOR_H, visibleRows * ROW_H + EDITOR_OVERHEAD));
}

/** NoiseRange layout with floating view mode overlay */
const NoiseRangeView = memo(function NoiseRangeView() {
  const viewMode = usePreviewStore((s) => s.viewMode);
  const originalWrapper = useEditorStore((s) => s.originalWrapper);
  const setJsonViewDraft = useEditorStore((s) => s.setJsonViewDraft);
  const biomeCount = useEditorStore((s) => s.biomeRanges.length);
  const [manualHeight, setManualHeight] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const editorHeight = manualHeight ?? defaultEditorHeight(biomeCount);

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = editorHeight;
    const onMouseMove = (ev: MouseEvent) => {
      const maxH = (containerRef.current?.getBoundingClientRect().height ?? 600) * 0.6;
      setManualHeight(Math.max(MIN_EDITOR_H, Math.min(maxH, startH + (ev.clientY - startY))));
    };
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [editorHeight]);

  return (
    <div className="flex flex-col h-full">
      <DiagnosticsStrip />
      <PipelineIndicator />

      {viewMode === "preview" ? (
        <div className="flex-1 min-h-0 relative">
          <LayoutPresetPicker />
          <PreviewPanel />
        </div>
      ) : viewMode === "split" ? (
        <div ref={containerRef} className="flex-1 min-h-0 flex flex-col relative">
          <LayoutPresetPicker />
          <div className="shrink-0" style={{ height: editorHeight }}>
            <BiomeRangeEditor />
          </div>
          <div
            className="shrink-0 h-1 bg-tn-border hover:bg-tn-accent/50 cursor-row-resize transition-colors"
            onMouseDown={onDividerMouseDown}
          />
          <div className="flex-1 min-h-0">
            <SplitView />
          </div>
        </div>
      ) : viewMode === "compare" ? (
        <div className="flex-1 min-h-0 relative">
          <LayoutPresetPicker />
          <ComparisonView />
        </div>
      ) : viewMode === "json" ? (
        <div className="flex-1 min-h-0 relative">
          <LayoutPresetPicker />
          <JsonEditorView content={originalWrapper} onChange={setJsonViewDraft} />
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 min-h-0 flex flex-col relative">
          <LayoutPresetPicker />
          <div className="shrink-0" style={{ height: editorHeight }}>
            <BiomeRangeEditor />
          </div>
          <div
            className="shrink-0 h-1 bg-tn-border hover:bg-tn-accent/50 cursor-row-resize transition-colors"
            onMouseDown={onDividerMouseDown}
          />
          <div className="flex-1 min-h-0">
            <EditorCanvas />
          </div>
        </div>
      )}
    </div>
  );
});

/** Biome layout with section tabs header + floating view mode overlay */
const BiomeView = memo(function BiomeView() {
  const viewMode = usePreviewStore((s) => s.viewMode);
  const originalWrapper = useEditorStore((s) => s.originalWrapper);
  const setJsonViewDraft = useEditorStore((s) => s.setJsonViewDraft);

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 bg-tn-surface border-b border-tn-border overflow-x-auto">
        <BiomeSectionTabs />
      </div>
      <DiagnosticsStrip />
      <PipelineIndicator />
      <div className="flex-1 min-h-0 relative">
        <LayoutPresetPicker />
        {viewMode === "graph" && <EditorCanvas />}
        {viewMode === "preview" && <PreviewPanel />}
        {viewMode === "split" && <SplitView />}
        {viewMode === "compare" && <ComparisonView />}
        {viewMode === "json" && <JsonEditorView content={originalWrapper} onChange={setJsonViewDraft} />}
      </div>
    </div>
  );
});
