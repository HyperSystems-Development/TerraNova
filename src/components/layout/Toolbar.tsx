import { useEffect, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useTauriIO } from "@/hooks/useTauriIO";
import { useEditorStore } from "@/stores/editorStore";
import { BridgeDialog } from "@/components/dialogs/BridgeDialog";
import { saveRef } from "@/utils/saveRef";
import { handleAutoLayout, handleAutoLayoutSelected, handleTidyUp } from "@/utils/layoutActions";

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

  return (
    <>
      <div className="flex h-10 items-center border-b border-tn-border bg-tn-surface px-2 shrink-0">
        <div className="flex items-center gap-1">
          <button
            className="rounded px-2 py-1 text-[11px] text-tn-text-muted hover:bg-tn-surface"
            onClick={() => handleAutoLayout(reactFlow)}
            title="Auto Layout All (L)"
          >
            Layout All
          </button>
          <button
            className={`rounded px-2 py-1 text-[11px] ${
              selectedCount < 2
                ? "cursor-default text-tn-text-muted/40"
                : "text-tn-text-muted hover:bg-tn-surface"
            }`}
            onClick={handleAutoLayoutSelected}
            disabled={selectedCount < 2}
            title="Auto Layout Selected (Shift+L)"
          >
            Layout Selected
          </button>
          <button
            className="rounded px-2 py-1 text-[11px] text-tn-text-muted hover:bg-tn-surface"
            onClick={handleTidyUp}
            title="Tidy Up (Ctrl+Shift+L)"
          >
            Tidy Up
          </button>
        </div>

        <div className="flex-1" />
      </div>

      <BridgeDialog />
    </>
  );
}
