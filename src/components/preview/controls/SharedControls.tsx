import { usePreviewStore } from "@/stores/previewStore";
import { useEditorStore } from "@/stores/editorStore";
import { useBridgeStore } from "@/stores/bridgeStore";
import { triggerManualEvaluation } from "@/hooks/usePreviewEvaluation";
import { COLORMAPS } from "@/utils/colormaps";

interface SharedControlsProps {
  canExport?: boolean;
  onExport?: () => void | Promise<void>;
}

export function SharedControls({ canExport = false, onExport }: SharedControlsProps) {
  const mode = usePreviewStore((s) => s.mode);
  const setMode = usePreviewStore((s) => s.setMode);
  const autoRefresh = usePreviewStore((s) => s.autoRefresh);
  const setAutoRefresh = usePreviewStore((s) => s.setAutoRefresh);
  const isLoading = usePreviewStore((s) => s.isLoading);
  const isVoxelLoading = usePreviewStore((s) => s.isVoxelLoading);
  const isWorldLoading = usePreviewStore((s) => s.isWorldLoading);
  const previewError = usePreviewStore((s) => s.previewError);
  const worldError = usePreviewStore((s) => s.worldError);
  const colormap = usePreviewStore((s) => s.colormap);
  const setColormap = usePreviewStore((s) => s.setColormap);
  const selectedPreviewNodeId = usePreviewStore((s) => s.selectedPreviewNodeId);
  const setSelectedPreviewNodeId = usePreviewStore((s) => s.setSelectedPreviewNodeId);

  const bridgeConnected = useBridgeStore((s) => s.connected);
  const nodes = useEditorStore((s) => s.nodes);
  const outputNodeId = useEditorStore((s) => s.outputNodeId);

  return (
    <>
      {/* Mode toggle */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setMode("2d")}
          className={`px-2.5 py-1 text-xs rounded ${
            mode === "2d" ? "bg-tn-accent text-white" : "bg-tn-panel text-tn-text-muted"
          }`}
        >
          2D
        </button>
        <button
          onClick={() => setMode("3d")}
          className={`px-2.5 py-1 text-xs rounded ${
            mode === "3d" ? "bg-tn-accent text-white" : "bg-tn-panel text-tn-text-muted"
          }`}
        >
          3D
        </button>
        <button
          onClick={() => setMode("voxel")}
          className={`px-2.5 py-1 text-xs rounded ${
            mode === "voxel" ? "bg-tn-accent text-white" : "bg-tn-panel text-tn-text-muted"
          }`}
        >
          Voxel
        </button>
        <button
          onClick={() => setMode("world")}
          disabled={!bridgeConnected}
          className={`px-2.5 py-1 text-xs rounded ${
            mode === "world" ? "bg-tn-accent text-white" : "bg-tn-panel text-tn-text-muted"
          } disabled:opacity-40`}
          title={bridgeConnected ? "Server world preview" : "Connect to bridge first"}
        >
          World
        </button>
        {(isLoading || isVoxelLoading || isWorldLoading) && (
          <span className="inline-block w-3 h-3 border-2 border-tn-accent border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {(previewError || worldError) && (
        <p className="text-xs text-red-400 whitespace-pre-line">{previewError || worldError}</p>
      )}

      {/* Auto-refresh + manual evaluate */}
      {mode !== "world" && (
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-tn-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-tn-accent w-3 h-3"
            />
            Auto
          </label>
          <button
            onClick={triggerManualEvaluation}
            disabled={isLoading}
            className="px-2 py-0.5 text-[11px] rounded bg-tn-panel text-tn-text-muted hover:text-tn-text hover:bg-white/10 disabled:opacity-40 transition-colors"
          >
            Evaluate
          </button>
        </div>
      )}

      {/* Colormap selector */}
      {mode !== "voxel" && mode !== "world" && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-tn-text-muted">Colormap</label>
          <select
            value={colormap}
            onChange={(e) => setColormap(e.target.value as typeof colormap)}
            className="bg-tn-panel border border-tn-border rounded px-2 py-1 text-[11px] text-tn-text"
          >
            {COLORMAPS.map((cm) => (
              <option key={cm.id} value={cm.id}>{cm.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Preview Target */}
      {mode !== "world" && <div className="flex flex-col gap-1">
        <label className="text-[10px] text-tn-text-muted">Preview Target</label>
        <select
          value={selectedPreviewNodeId ?? "__auto__"}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedPreviewNodeId(val === "__auto__" ? null : val);
          }}
          className="bg-tn-panel border border-tn-border rounded px-2 py-1 text-[11px] text-tn-text"
        >
          <option value="__auto__">
            {outputNodeId ? "Auto (designated output)" : "Auto (terminal node)"}
          </option>
          {nodes.map((n) => {
            const data = n.data as Record<string, unknown>;
            const typeName = (data?.type as string) ?? n.type ?? "Node";
            const isOutput = n.id === outputNodeId;
            return (
              <option key={n.id} value={n.id}>
                {isOutput ? "\u2605 " : ""}{typeName} ({n.id})
              </option>
            );
          })}
        </select>
      </div>}

      {/* Export PNG */}
      <button
        onClick={() => {
          void onExport?.();
        }}
        disabled={!canExport}
        className="px-2 py-1 text-[11px] rounded bg-tn-panel text-tn-text-muted hover:text-tn-text hover:bg-white/10 disabled:opacity-40 transition-colors border border-tn-border"
      >
        Export PNG
      </button>
    </>
  );
}
