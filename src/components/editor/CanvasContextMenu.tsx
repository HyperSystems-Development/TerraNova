import { useReactFlow } from "@xyflow/react";
import { ContextMenuOverlay, ContextMenuItem, ContextMenuSeparator } from "./ContextMenuPrimitives";
import { useEditorStore } from "@/stores/editorStore";
import { useUIStore } from "@/stores/uiStore";
import { useToastStore } from "@/stores/toastStore";
import { useSettingsStore } from "@/stores/settingsStore";

interface CanvasContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onQuickAdd: () => void;
}

export function CanvasContextMenu({ x, y, onClose, onQuickAdd }: CanvasContextMenuProps) {
  const reactFlow = useReactFlow();
  const hasClipboard = useEditorStore((s) => s._clipboardData !== null);

  return (
    <ContextMenuOverlay x={x} y={y} onClose={onClose}>
      <ContextMenuItem
        label="Add Node..."
        shortcut="Tab"
        onClick={() => {
          onClose();
          onQuickAdd();
        }}
      />
      <ContextMenuItem
        label="Add Comment"
        onClick={() => {
          const flowPos = reactFlow.screenToFlowPosition({ x, y });
          const id = `comment-${crypto.randomUUID()}`;
          const { nodes, setNodes, commitState } = useEditorStore.getState();
          setNodes([
            ...nodes,
            {
              id,
              type: "comment",
              position: flowPos,
              data: { type: "comment", text: "", width: 200, height: 80 },
              draggable: true,
              selectable: true,
            },
          ]);
          commitState("Add comment");
          onClose();
        }}
      />
      <ContextMenuItem
        label="Add Frame"
        onClick={() => {
          const flowPos = reactFlow.screenToFlowPosition({ x, y });
          const id = `frame-${crypto.randomUUID()}`;
          const { nodes, setNodes, commitState } = useEditorStore.getState();
          setNodes([
            {
              id,
              type: "frame",
              position: flowPos,
              data: { type: "frame", name: "", width: 400, height: 300 },
              draggable: true,
              selectable: true,
              zIndex: -1,
            },
            ...nodes,
          ]);
          commitState("Add frame");
          onClose();
        }}
      />
      <ContextMenuSeparator />
      <ContextMenuItem
        label="Paste"
        shortcut="Ctrl+V"
        disabled={!hasClipboard}
        onClick={() => {
          useEditorStore.getState().pasteNodes();
          onClose();
        }}
      />
      <ContextMenuItem
        label="Select All"
        shortcut="Ctrl+A"
        onClick={() => {
          const nodes = useEditorStore.getState().nodes;
          useEditorStore.getState().setNodes(nodes.map((n) => ({ ...n, selected: true })));
          onClose();
        }}
      />
      <ContextMenuSeparator />
      <ContextMenuItem
        label="Fit View"
        shortcut="Ctrl+1"
        onClick={() => {
          reactFlow.fitView({ padding: 0.1, duration: 300 });
          onClose();
        }}
      />
      <ContextMenuItem
        label="Auto Layout"
        onClick={async () => {
          onClose();
          const { nodes, edges, setNodes, commitState } = useEditorStore.getState();
          if (nodes.length === 0) return;
          try {
            const { autoLayout } = await import("@/utils/autoLayout");
            const layouted = await autoLayout(nodes, edges, useSettingsStore.getState().flowDirection);
            setNodes(layouted);
            commitState("Auto layout");
          } catch (err) {
            if (import.meta.env.DEV) console.error("Auto layout failed:", err);
            useToastStore.getState().addToast("Auto layout failed", "error");
          }
        }}
      />
      <ContextMenuSeparator />
      <ContextMenuItem
        label="Toggle Grid"
        shortcut="G"
        onClick={() => {
          useUIStore.getState().toggleGrid();
          onClose();
        }}
      />
      <ContextMenuItem
        label="Toggle Snap"
        shortcut="Shift+G"
        onClick={() => {
          useUIStore.getState().toggleSnap();
          onClose();
        }}
      />
    </ContextMenuOverlay>
  );
}
