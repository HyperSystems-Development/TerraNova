import { useCallback, useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { useProjectStore } from "@/stores/projectStore";
import { useEditorStore } from "@/stores/editorStore";
import { useBridgeStore } from "@/stores/bridgeStore";
import { usePreviewStore } from "@/stores/previewStore";
import { useUIStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUpdateStore } from "@/stores/updateStore";
import { downloadAndInstall, restartToUpdate } from "@/utils/updater";
import { useStore } from "@xyflow/react";

export function StatusBar() {
  const currentFile = useProjectStore((s) => s.currentFile);
  const isDirty = useProjectStore((s) => s.isDirty);
  const projectPath = useProjectStore((s) => s.projectPath);
  const lastError = useProjectStore((s) => s.lastError);
  const bridgeConnected = useBridgeStore((s) => s.connected);
  const bridgeConnecting = useBridgeStore((s) => s.connecting);
  const viewMode = usePreviewStore((s) => s.viewMode);
  const instantSaveEnabled = useSettingsStore((s) => s.instantSaveEnabled);

  // Node/edge/selection counts
  const nodeCount = useEditorStore((s) => s.nodes.length);
  const edgeCount = useEditorStore((s) => s.edges.length);
  const selectedCount = useEditorStore(
    useCallback((s: { nodes: { selected?: boolean }[] }) => s.nodes.reduce((count, n) => count + (n.selected ? 1 : 0), 0), []),
  );

  // Grid/snap state
  const showGrid = useUIStore((s) => s.showGrid);
  const snapToGrid = useUIStore((s) => s.snapToGrid);

  // App version
  const [appVersion, setAppVersion] = useState<string>("");
  useEffect(() => {
    getVersion().then(setAppVersion);
  }, []);

  // Update state
  const updateStatus = useUpdateStore((s) => s.status);
  const updateVersion = useUpdateStore((s) => s.version);
  const updateProgress = useUpdateStore((s) => s.progress);

  // Zoom level from ReactFlow store
  const zoom = useStore((s) => s.transform[2]);
  const zoomPercent = Math.round((zoom ?? 1) * 100);

  const bridgeColor = bridgeConnected
    ? "text-emerald-400"
    : bridgeConnecting
      ? "text-amber-400"
      : "text-tn-text-muted";

  const isGraphView = viewMode === "graph" || viewMode === "split";

  return (
    <div className="flex items-center h-7 px-3 bg-tn-surface border-t border-tn-border text-xs text-tn-text-muted shrink-0 gap-1">
      {/* File path / error */}
      <span className="truncate min-w-0">
        {lastError ? (
          <span className="text-red-400">{lastError}</span>
        ) : (
          currentFile ? currentFile.replace(projectPath ?? "", ".") : "No file open"
        )}
      </span>

      {/* Node/edge/selection counts */}
      <span className="ml-3 whitespace-nowrap">
        {nodeCount} nodes
      </span>
      <span className="whitespace-nowrap">
        {edgeCount} edges
      </span>
      {selectedCount > 0 && (
        <>
          <span className="text-tn-border mx-1">|</span>
          <span className="whitespace-nowrap text-tn-accent">
            {selectedCount} selected
          </span>
        </>
      )}

      <div className="flex-1" />

      {/* Grid/Snap indicators (only in graph view) */}
      {isGraphView && (
        <>
          <button
            onClick={() => useUIStore.getState().toggleGrid()}
            className={`px-1.5 rounded text-[10px] font-medium ${
              showGrid ? "text-tn-accent" : "text-tn-text-muted/40"
            } hover:bg-tn-accent/10`}
          >
            GRID
          </button>
          <button
            onClick={() => useUIStore.getState().toggleSnap()}
            className={`px-1.5 rounded text-[10px] font-medium ${
              snapToGrid ? "text-tn-accent" : "text-tn-text-muted/40"
            } hover:bg-tn-accent/10`}
          >
            SNAP
          </button>
        </>
      )}

      {/* Zoom percentage */}
      <span className="mx-1 text-[10px] w-8 text-right">{zoomPercent}%</span>

      {/* Bridge */}
      <button
        onClick={() => useBridgeStore.getState().setDialogOpen(true)}
        className="mx-1 flex items-center gap-1 px-1.5 rounded hover:bg-tn-accent/10"
      >
        <span className={bridgeColor}>●</span>
        <span>Bridge</span>
      </button>

      {/* Instant Save indicator */}
      {instantSaveEnabled && (
        <button
          onClick={() => useSettingsStore.getState().toggleInstantSave()}
          className="px-1.5 rounded text-[10px] font-medium text-sky-400 hover:bg-sky-400/10"
          title="Instant Save enabled (Ctrl+Shift+I)"
        >
          INSTANT
        </button>
      )}

      {/* Save state */}
      <span className="mx-1">
        {isDirty ? (
          <span className="text-amber-400">Unsaved</span>
        ) : (
          <span className="text-emerald-400">Saved</span>
        )}
      </span>

      {updateStatus === "available" ? (
        <button
          onClick={downloadAndInstall}
          className="text-tn-accent hover:underline cursor-pointer"
        >
          v{updateVersion} available
        </button>
      ) : updateStatus === "downloading" ? (
        <span className="text-amber-400">Updating {updateProgress}%</span>
      ) : updateStatus === "restarting" ? (
        <span className="text-amber-400">Restarting...</span>
      ) : updateStatus === "ready" ? (
        <button
          onClick={restartToUpdate}
          className="text-emerald-400 hover:underline cursor-pointer"
        >
          Restart to update
        </button>
      ) : (
        <span>v{appVersion}</span>
      )}
    </div>
  );
}
