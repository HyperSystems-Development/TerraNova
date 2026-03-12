import { ContextMenuOverlay, ContextMenuItem, ContextMenuSeparator } from "./ContextMenuPrimitives";
import { useEditorStore } from "@/stores/editorStore";
import { useToastStore } from "@/stores/toastStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { resolveKeybinding } from "@/config/keybindings";
import type { Node, Edge } from "@xyflow/react";

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  onClose: () => void;
}

/** BFS forward from a set of node IDs to find all downstream node IDs */
function getDownstreamNodeIds(startIds: Set<string>, edges: Edge[]): Set<string> {
  const visited = new Set<string>();
  const queue = [...startIds];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const edge of edges) {
      if (edge.source === current && !visited.has(edge.target)) {
        queue.push(edge.target);
      }
    }
  }
  return visited;
}

/** BFS backward from a set of node IDs to find all upstream node IDs */
function getUpstreamNodeIds(startIds: Set<string>, edges: Edge[]): Set<string> {
  const visited = new Set<string>();
  const queue = [...startIds];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const edge of edges) {
      if (edge.target === current && !visited.has(edge.source)) {
        queue.push(edge.source);
      }
    }
  }
  return visited;
}

export function NodeContextMenu({ x, y, nodeId, onClose }: NodeContextMenuProps) {
  const store = useEditorStore.getState();
  const selectedNodes = store.nodes.filter((n) => n.selected);
  const selectedIds = new Set(selectedNodes.map((n) => n.id));

  // Ensure the right-clicked node is included
  if (!selectedIds.has(nodeId)) {
    selectedIds.add(nodeId);
  }

  const rightClickedNode = store.nodes.find((n) => n.id === nodeId);
  const isGroup = rightClickedNode?.type === "group";
  const isRootNode = rightClickedNode?.type === "Root";
  const rootNode = store.nodes.find((n) => n.type === "Root");
  const isConnectedToRoot = rootNode
    ? store.edges.some((e) => e.source === nodeId && e.target === rootNode.id)
    : false;

  return (
    <ContextMenuOverlay x={x} y={y} onClose={onClose}>
      <ContextMenuItem
        label="Cut"
        shortcut="Ctrl+X"
        onClick={() => {
          store.copyNodes();
          store.removeNodes([...selectedIds]);
          onClose();
        }}
      />
      <ContextMenuItem
        label="Copy"
        shortcut="Ctrl+C"
        onClick={() => {
          store.copyNodes();
          onClose();
        }}
      />
      <ContextMenuItem
        label="Duplicate"
        shortcut="Ctrl+D"
        onClick={() => {
          store.duplicateNodes();
          onClose();
        }}
      />
      <ContextMenuItem
        label="Delete"
        shortcut="Del"
        onClick={() => {
          store.removeNodes([...selectedIds]);
          onClose();
        }}
      />
      <ContextMenuSeparator />
      <ContextMenuItem
        label="Group"
        shortcut="Ctrl+G"
        disabled={selectedIds.size < 2}
        onClick={() => {
          store.createGroup([...selectedIds], `Group (${selectedIds.size})`);
          onClose();
        }}
      />
      <ContextMenuItem
        label="Ungroup"
        disabled={!isGroup}
        onClick={() => {
          if (isGroup) store.expandGroup(nodeId);
          onClose();
        }}
      />
      <ContextMenuSeparator />
      <ContextMenuItem
        label="Select Upstream"
        shortcut={resolveKeybinding("selectUpstream")}
        onClick={() => {
          const upstream = getUpstreamNodeIds(selectedIds, store.edges);
          const currentSelected = new Set(store.nodes.filter((n) => n.selected).map((n) => n.id));
          if (upstream.size === currentSelected.size && [...upstream].every((id) => currentSelected.has(id))) {
            // Toggle off: keep only the most-downstream nodes (tips) in the selection
            const tips = new Set([...currentSelected].filter((id) =>
              !store.edges.some((e) => e.source === id && currentSelected.has(e.target)),
            ));
            store.setNodes(store.nodes.map((n) => ({ ...n, selected: tips.has(n.id) })));
          } else {
            store.setNodes(store.nodes.map((n) => ({ ...n, selected: upstream.has(n.id) })));
          }
          onClose();
        }}
      />
      <ContextMenuItem
        label="Select Downstream"
        shortcut={resolveKeybinding("selectDownstream")}
        onClick={() => {
          const downstream = getDownstreamNodeIds(selectedIds, store.edges);
          const currentSelected = new Set(store.nodes.filter((n) => n.selected).map((n) => n.id));
          if (downstream.size === currentSelected.size && [...downstream].every((id) => currentSelected.has(id))) {
            // Toggle off: keep only the most-upstream nodes (roots) in the selection
            const roots = new Set([...currentSelected].filter((id) =>
              !store.edges.some((e) => e.target === id && currentSelected.has(e.source)),
            ));
            store.setNodes(store.nodes.map((n) => ({ ...n, selected: roots.has(n.id) })));
          } else {
            store.setNodes(store.nodes.map((n) => ({ ...n, selected: downstream.has(n.id) })));
          }
          onClose();
        }}
      />
      <ContextMenuSeparator />
      <ContextMenuItem
        label="Auto Layout Selected"
        disabled={selectedIds.size < 2}
        onClick={async () => {
          onClose();
          const { nodes, edges, setNodes, commitState } = useEditorStore.getState();
          try {
            const { autoLayoutSelected } = await import("@/utils/autoLayout");
            const layouted = await autoLayoutSelected(nodes, edges, selectedIds, useSettingsStore.getState().flowDirection);
            setNodes(layouted);
            commitState("Auto layout selected");
          } catch (err) {
            if (import.meta.env.DEV) console.error("Auto layout failed:", err);
            useToastStore.getState().addToast("Auto layout failed", "error");
          }
        }}
      />
      <ContextMenuSeparator />
      <ContextMenuItem
        label={isConnectedToRoot ? "Clear Root" : "Set as Root"}
        shortcut="Ctrl+T"
        disabled={isRootNode}
        onClick={() => {
          if (isConnectedToRoot && rootNode) {
            // Disconnect: remove the edge and clear output
            store.setEdges(store.edges.filter((e) => !(e.source === nodeId && e.target === rootNode.id)));
            store.setOutputNode(null);
          } else {
            let target = rootNode;
            // Create Root node if none exists
            if (!target) {
              const rootId = crypto.randomUUID();
              const clickedPos = rightClickedNode?.position ?? { x: 0, y: 0 };
              target = {
                id: rootId,
                type: "Root",
                position: { x: clickedPos.x + 300, y: clickedPos.y },
                data: { type: "Root", fields: {} },
              } as Node;
              store.addNode(target);
            }
            // Remove any existing edge into Root, then wire this node
            const filtered = store.edges.filter((e) => e.target !== target!.id);
            const newEdge: Edge = {
              id: `${nodeId}-${target.id}`,
              source: nodeId,
              sourceHandle: "output",
              target: target.id,
              targetHandle: "input",
            };
            store.setEdges([...filtered, newEdge]);
            store.setOutputNode(nodeId);
          }
          onClose();
        }}
      />
    </ContextMenuOverlay>
  );
}
