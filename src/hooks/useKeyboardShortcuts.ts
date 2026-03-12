import { useEffect } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { matchesKeybinding } from "@/config/keybindings";

interface ShortcutCallbacks {
  onSearchOpen: () => void;
  onQuickAdd: () => void;
  disabled?: boolean;
}

/**
 * Register keyboard shortcuts for the editor canvas.
 * File/Edit shortcuts (Ctrl+S, Ctrl+Z, etc.) are handled in Toolbar.tsx.
 * This hook handles canvas-specific shortcuts.
 */
export function useKeyboardShortcuts({ onSearchOpen, onQuickAdd, disabled = false }: ShortcutCallbacks) {
  const redo = useEditorStore((s) => s.redo);

  useEffect(() => {
    if (disabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;

      // Don't intercept shortcuts when typing in inputs
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      // Tab — open quick-add dialog
      if (matchesKeybinding("quickAdd", e)) {
        e.preventDefault();
        onQuickAdd();
        return;
      }

      // Shift+A — open quick-add dialog (Blender convention)
      if (matchesKeybinding("quickAddAlt", e)) {
        e.preventDefault();
        onQuickAdd();
        return;
      }

      // Ctrl+F — open node search
      if (matchesKeybinding("search", e)) {
        e.preventDefault();
        onSearchOpen();
        return;
      }

      // Ctrl+A — select all nodes
      if (matchesKeybinding("selectAll", e)) {
        e.preventDefault();
        const nodes = useEditorStore.getState().nodes;
        const selected = nodes.map((n) => ({ ...n, selected: true }));
        useEditorStore.getState().setNodes(selected);
        return;
      }

      // Ctrl+Y — redo (alternative)
      if (matchesKeybinding("redoAlt", e)) {
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl+C — copy selected nodes
      if (matchesKeybinding("copy", e)) {
        e.preventDefault();
        useEditorStore.getState().copyNodes();
        return;
      }

      // Ctrl+V — paste nodes
      if (matchesKeybinding("paste", e)) {
        e.preventDefault();
        useEditorStore.getState().pasteNodes();
        return;
      }

      // Ctrl+D — duplicate selected nodes
      if (matchesKeybinding("duplicate", e)) {
        e.preventDefault();
        useEditorStore.getState().duplicateNodes();
        return;
      }

      // Ctrl+X — cut (copy + delete)
      if (matchesKeybinding("cut", e)) {
        e.preventDefault();
        const store = useEditorStore.getState();
        store.copyNodes();
        const selectedIds = store.nodes.filter((n) => n.selected).map((n) => n.id);
        if (selectedIds.length > 0) {
          store.removeNodes(selectedIds);
        }
        return;
      }

      // Ctrl+G — create group from selected nodes
      if (matchesKeybinding("group", e)) {
        e.preventDefault();
        const store = useEditorStore.getState();
        const selectedIds = store.nodes
          .filter((n) => n.selected)
          .map((n) => n.id);
        if (selectedIds.length >= 2) {
          store.createGroup(selectedIds, `Group (${selectedIds.length})`);
        }
        return;
      }

      // Ctrl+T — wire selected node → Root node
      if (matchesKeybinding("toggleRoot", e)) {
        e.preventDefault();
        const store = useEditorStore.getState();
        const selectedNode = store.nodes.find((n) => n.selected);
        if (!selectedNode || selectedNode.type === "Root") return;

        let rootNode = store.nodes.find((n) => n.type === "Root");

        // Check if selected node is already connected to Root — toggle off
        if (rootNode) {
          const existingEdge = store.edges.find(
            (edge) => edge.source === selectedNode.id && edge.target === rootNode!.id,
          );
          if (existingEdge) {
            // Disconnect: remove the edge and clear output
            store.setEdges(store.edges.filter((edge) => edge.id !== existingEdge.id));
            store.setOutputNode(null);
            return;
          }
        }

        // Create Root node if none exists
        if (!rootNode) {
          const rootId = crypto.randomUUID();
          const newRoot: import("@xyflow/react").Node = {
            id: rootId,
            type: "Root",
            position: {
              x: selectedNode.position.x + 300,
              y: selectedNode.position.y,
            },
            data: { type: "Root", fields: {} },
          };
          store.addNode(newRoot);
          rootNode = newRoot;
        }

        // Remove any existing edge into Root (only one source at a time)
        const filtered = store.edges.filter((edge) => edge.target !== rootNode!.id);

        // Create edge from selected → Root
        const newEdge: import("@xyflow/react").Edge = {
          id: `${selectedNode.id}-${rootNode.id}`,
          source: selectedNode.id,
          sourceHandle: "output",
          target: rootNode.id,
          targetHandle: "input",
        };

        store.setEdges([...filtered, newEdge]);
        store.setOutputNode(selectedNode.id);
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [disabled, redo, onSearchOpen, onQuickAdd]);
}
