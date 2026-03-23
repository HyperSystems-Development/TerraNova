import type { ReactFlowInstance } from "@xyflow/react";
import { useEditorStore } from "@/stores/editorStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore } from "@/stores/uiStore";
import { useToastStore } from "@/stores/toastStore";

const isAnnotation = (n: { type?: string }) => n.type === "comment" || n.type === "frame";

export async function handleAutoLayout(reactFlow: ReactFlowInstance) {
  const { nodes, edges, setNodes, commitState } = useEditorStore.getState();
  if (nodes.length === 0) return;
  try {
    const graphNodes = nodes.filter((n) => !isAnnotation(n));
    const annotationNodes = nodes.filter(isAnnotation);
    const { autoLayout } = await import("@/utils/autoLayout");
    const layouted = await autoLayout(
      graphNodes,
      edges,
      useSettingsStore.getState().flowDirection,
    );
    setNodes([...layouted, ...annotationNodes]);
    commitState("Auto layout");
    setTimeout(() => {
      const fitNodes = useEditorStore.getState().nodes.filter((n) => !isAnnotation(n));
      reactFlow.fitView({ nodes: fitNodes, padding: 0.1, duration: 300 });
    }, 50);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Auto layout failed:", err);
    useToastStore.getState().addToast(`Auto layout failed: ${errorMessage}`, "error");
  }
}

export async function handleAutoLayoutSelected() {
  const { nodes, edges, setNodes, commitState } = useEditorStore.getState();
  const selectedIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
  if (selectedIds.size < 2) return;
  try {
    const { autoLayoutSelected } = await import("@/utils/autoLayout");
    const layouted = await autoLayoutSelected(
      nodes,
      edges,
      selectedIds,
      useSettingsStore.getState().flowDirection,
    );
    setNodes(layouted);
    commitState("Auto layout selected");
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Auto layout selected failed:", err);
    useToastStore.getState().addToast(`Auto layout failed: ${errorMessage}`, "error");
  }
}

export async function handleTidyUp() {
  const { nodes, setNodes, commitState } = useEditorStore.getState();
  if (nodes.length === 0) return;
  const graphNodes = nodes.filter((n) => !isAnnotation(n));
  const annotationNodes = nodes.filter(isAnnotation);
  const { tidyUp } = await import("@/utils/autoLayout");
  const gridSize = useUIStore.getState().gridSize;
  const tidied = tidyUp(graphNodes, gridSize);
  setNodes([...tidied, ...annotationNodes]);
  commitState("Tidy up");
}
