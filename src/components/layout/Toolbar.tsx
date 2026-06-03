import { useEffect, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useTauriIO } from "@/hooks/useTauriIO";
import { useEditorStore } from "@/stores/editorStore";
import { useUIStore } from "@/stores/uiStore";
import { BridgeDialog } from "@/components/dialogs/BridgeDialog";
import { saveRef } from "@/utils/saveRef";
import { handleAutoLayout, handleAutoLayoutSelected, handleTidyUp } from "@/utils/layoutActions";

const buttonClass = "rounded px-2 py-1 text-[11px] text-tn-text-muted hover:bg-tn-panel hover:text-tn-text";
const activeButtonClass = "rounded px-2 py-1 text-[11px] bg-tn-accent/15 text-tn-accent hover:bg-tn-accent/20";
const disabledButtonClass = "cursor-default rounded px-2 py-1 text-[11px] text-tn-text-muted/40";

export function Toolbar() {
  const { saveFile } = useTauriIO();
  const reactFlow = useReactFlow();

  // Register saveRef so App.tsx can call saveFile from outside ReactFlowProvider
  useEffect(() => {
    saveRef.current = saveFile;
    return () => {
      saveRef.current = null;
    };
  }, [saveFile]);

  // Get selected count for enable/disable logic
  const selectedCount = useEditorStore(
    useCallback(
      (s: { nodes: { selected?: boolean }[] }) =>
        s.nodes.reduce((count, n) => count + (n.selected ? 1 : 0), 0),
      [],
    ),
  );
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const graphNodeCount = useEditorStore(
    useCallback(
      (s: { nodes: { type?: string }[] }) =>
        s.nodes.reduce((count, n) => count + (n.type === "comment" || n.type === "frame" ? 0 : 1), 0),
      [],
    ),
  );
  const showGrid = useUIStore((s) => s.showGrid);
  const snapToGrid = useUIStore((s) => s.snapToGrid);
  const showMinimap = useUIStore((s) => s.showMinimap);
  const toggleGrid = useUIStore((s) => s.toggleGrid);
  const toggleSnap = useUIStore((s) => s.toggleSnap);
  const toggleMinimap = useUIStore((s) => s.toggleMinimap);

  function fitGraph() {
    const graphNodes = useEditorStore.getState().nodes.filter(
      (n) => n.type !== "comment" && n.type !== "frame",
    );
    reactFlow.fitView({ nodes: graphNodes, padding: 0.1, duration: 300 });
  }

  function fitSelection() {
    const { nodes, selectedNodeId: currentSelectedNodeId } = useEditorStore.getState();
    const selectedNodes = nodes.filter((n) => n.selected);
    if (selectedNodes.length === 0 && currentSelectedNodeId) {
      const selectedNode = nodes.find((n) => n.id === currentSelectedNodeId);
      if (selectedNode) selectedNodes.push(selectedNode);
    }
    if (selectedNodes.length === 0) return;
    reactFlow.fitView({
      nodes: selectedNodes.map((n) => ({ id: n.id })),
      padding: 0.2,
      duration: 300,
    });
  }

  return (
    <>
      <div className="flex h-10 items-center border-b border-tn-border bg-tn-surface px-2 shrink-0">
        <div className="flex items-center gap-1">
          <button
            className={buttonClass}
            onClick={() => window.dispatchEvent(new Event("terranova:open-quick-add"))}
            title="Quick Add (Tab)"
          >
            + Add
          </button>
          <button
            className={buttonClass}
            onClick={() => window.dispatchEvent(new Event("terranova:open-node-search"))}
            title="Search Nodes (Ctrl+F)"
          >
            Find
          </button>
          <div className="mx-1 h-4 w-px bg-tn-border" />
          <button
            className={buttonClass}
            onClick={() => handleAutoLayout(reactFlow)}
            title="Auto Layout All (L)"
          >
            Layout All
          </button>
          <button
            className={selectedCount < 2 ? disabledButtonClass : buttonClass}
            onClick={handleAutoLayoutSelected}
            disabled={selectedCount < 2}
            title="Auto Layout Selected (Shift+L)"
          >
            Layout Selected
          </button>
          <button
            className={buttonClass}
            onClick={handleTidyUp}
            title="Tidy Up (Ctrl+Shift+L)"
          >
            Tidy Up
          </button>
          <div className="mx-1 h-4 w-px bg-tn-border" />
          <button
            className={graphNodeCount === 0 ? disabledButtonClass : buttonClass}
            onClick={fitGraph}
            disabled={graphNodeCount === 0}
            title="Fit View (Ctrl+1)"
          >
            Fit
          </button>
          <button
            className={selectedCount === 0 && !selectedNodeId ? disabledButtonClass : buttonClass}
            onClick={fitSelection}
            disabled={selectedCount === 0 && !selectedNodeId}
            title="Zoom to Selection (Ctrl+2)"
          >
            Selection
          </button>
          <button
            className={buttonClass}
            onClick={() => reactFlow.zoomTo(1, { duration: 300 })}
            title="Reset Zoom (Ctrl+0)"
          >
            100%
          </button>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <button
            className={showGrid ? activeButtonClass : buttonClass}
            onClick={toggleGrid}
            aria-pressed={showGrid}
            title="Toggle Grid (G)"
          >
            Grid
          </button>
          <button
            className={snapToGrid ? activeButtonClass : buttonClass}
            onClick={toggleSnap}
            aria-pressed={snapToGrid}
            title="Toggle Snap (Shift+G)"
          >
            Snap
          </button>
          <button
            className={showMinimap ? activeButtonClass : buttonClass}
            onClick={toggleMinimap}
            aria-pressed={showMinimap}
            title="Toggle Minimap"
          >
            Map
          </button>
        </div>
      </div>

      <BridgeDialog />
    </>
  );
}
