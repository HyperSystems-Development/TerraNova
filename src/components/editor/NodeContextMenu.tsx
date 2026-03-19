import React from "react";
import { getAvailableHytaleAssetFolders } from "@/utils/hytaleAssetFolders";
import { ContextMenuOverlay, ContextMenuItem, ContextMenuSeparator, ContextMenuSubmenu } from "./ContextMenuPrimitives";
import { alignNodes, distributeNodes } from "@/utils/alignDistribute";
import { getHytaleAssetsInFolder } from "@/utils/getHytaleAssetsInFolder";
import { useEditorStore } from "@/stores/editorStore";
import { useToastStore } from "@/stores/toastStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useLoadingStore } from "@/stores/loadingStore";
import { resolveKeybinding } from "@/config/keybindings";
import { ask } from "@tauri-apps/plugin-dialog";
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

// ---------------------------------------------------------------------------
// Align / Distribute inline panel
// ---------------------------------------------------------------------------

const ALIGN_ACTIONS = [
  {
    dir: "left" as const,
    label: "Align left",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="1" width="1.5" height="16" fill="currentColor" opacity="0.5" />
        <rect x="4" y="3" width="8" height="4" rx="1" fill="currentColor" />
        <rect x="4" y="11" width="11" height="4" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    dir: "centerV" as const,
    label: "Center vertical",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="8.25" y="1" width="1.5" height="16" fill="currentColor" opacity="0.5" />
        <rect x="3" y="3" width="12" height="4" rx="1" fill="currentColor" />
        <rect x="5" y="11" width="8" height="4" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    dir: "right" as const,
    label: "Align right",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="14.5" y="1" width="1.5" height="16" fill="currentColor" opacity="0.5" />
        <rect x="6" y="3" width="8" height="4" rx="1" fill="currentColor" />
        <rect x="3" y="11" width="11" height="4" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    dir: "top" as const,
    label: "Align top",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="2" width="16" height="1.5" fill="currentColor" opacity="0.5" />
        <rect x="3" y="4" width="4" height="8" rx="1" fill="currentColor" />
        <rect x="11" y="4" width="4" height="11" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    dir: "centerH" as const,
    label: "Center horizontal",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="8.25" width="16" height="1.5" fill="currentColor" opacity="0.5" />
        <rect x="3" y="3" width="4" height="12" rx="1" fill="currentColor" />
        <rect x="11" y="5" width="4" height="8" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    dir: "bottom" as const,
    label: "Align bottom",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="14.5" width="16" height="1.5" fill="currentColor" opacity="0.5" />
        <rect x="3" y="3" width="4" height="11" rx="1" fill="currentColor" />
        <rect x="11" y="6" width="4" height="8" rx="1" fill="currentColor" />
      </svg>
    ),
  },
] as const;

const DISTRIBUTE_ACTIONS = [
  {
    axis: "horizontal" as const,
    label: "Distribute horizontally",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="4" width="1.5" height="10" rx="0.75" fill="currentColor" opacity="0.5" />
        <rect x="15.5" y="4" width="1.5" height="10" rx="0.75" fill="currentColor" opacity="0.5" />
        <rect x="7.25" y="4" width="3.5" height="10" rx="1" fill="currentColor" />
        <rect x="3.5" y="6" width="2.5" height="6" rx="1" fill="currentColor" />
        <rect x="12" y="6" width="2.5" height="6" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    axis: "vertical" as const,
    label: "Distribute vertically",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="4" y="1" width="10" height="1.5" rx="0.75" fill="currentColor" opacity="0.5" />
        <rect x="4" y="15.5" width="10" height="1.5" rx="0.75" fill="currentColor" opacity="0.5" />
        <rect x="4" y="7.25" width="10" height="3.5" rx="1" fill="currentColor" />
        <rect x="6" y="3.5" width="6" height="2.5" rx="1" fill="currentColor" />
        <rect x="6" y="12" width="6" height="2.5" rx="1" fill="currentColor" />
      </svg>
    ),
  },
] as const;

function AlignDistributePanel({ selectedIds, onClose }: { selectedIds: Set<string>; onClose: () => void }) {
  const canAlign = selectedIds.size >= 2;
  const canDistribute = selectedIds.size >= 3;

  function applyAlign(dir: (typeof ALIGN_ACTIONS)[number]["dir"]) {
    if (!canAlign) return;
    const { nodes, setNodes, commitState } = useEditorStore.getState();
    const selected = nodes.filter((n) => selectedIds.has(n.id));
    const rest = nodes.filter((n) => !selectedIds.has(n.id));
    setNodes([...rest, ...alignNodes(selected, dir)]);
    commitState(`Align ${dir}`);
    onClose();
  }

  function applyDistribute(axis: "horizontal" | "vertical") {
    if (!canDistribute) return;
    const { nodes, setNodes, commitState } = useEditorStore.getState();
    const selected = nodes.filter((n) => selectedIds.has(n.id));
    const rest = nodes.filter((n) => !selectedIds.has(n.id));
    setNodes([...rest, ...distributeNodes(selected, axis)]);
    commitState(`Distribute ${axis}ly`);
    onClose();
  }

  return (
    <div className="px-2 py-2 flex flex-col gap-2">
      <p className="text-[10px] text-tn-text-muted/50 uppercase tracking-widest px-1">Align</p>
      <div className="grid grid-cols-3 gap-1">
        {ALIGN_ACTIONS.map(({ dir, label, icon }) => (
          <button
            key={dir}
            title={label}
            disabled={!canAlign}
            onClick={() => applyAlign(dir)}
            className={`flex items-center justify-center w-full aspect-square rounded transition-colors ${
              canAlign
                ? "text-tn-text hover:bg-tn-accent/20 hover:text-tn-accent"
                : "text-tn-text-muted/20 cursor-default"
            }`}
          >
            {icon}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-tn-text-muted/50 uppercase tracking-widest px-1 mt-1">Distribute</p>
      <div className="grid grid-cols-2 gap-1">
        {DISTRIBUTE_ACTIONS.map(({ axis, label, icon }) => (
          <button
            key={axis}
            title={label}
            disabled={!canDistribute}
            onClick={() => applyDistribute(axis)}
            className={`flex items-center justify-center w-full aspect-square rounded transition-colors ${
              canDistribute
                ? "text-tn-text hover:bg-tn-accent/20 hover:text-tn-accent"
                : "text-tn-text-muted/20 cursor-default"
            }`}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}

export function NodeContextMenu({ x, y, nodeId, onClose }: NodeContextMenuProps) {
  // Use reactive selectors instead of getState() snapshot to avoid stale data
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const confirmOnNodeDelete = useSettingsStore((s) => s.confirmOnNodeDelete);
  const rightClickedNode = nodes.find((n) => n.id === nodeId);

  // Hytale asset context menu logic
  const hytaleBasePath = "hytale-assets";
  const [availableFolders, setAvailableFolders] = React.useState<string[]>([]);
  const [hytaleAssets, setHytaleAssets] = React.useState<string[]>([]);
  const [assetsLoading, setAssetsLoading] = React.useState(false);
  const [assetsError, setAssetsError] = React.useState<string | null>(null);
  React.useEffect(() => {
    getAvailableHytaleAssetFolders(hytaleBasePath).then(setAvailableFolders);
  }, [hytaleBasePath]);
  // Determine the correct folder for this node
  const nodeTypeToFolder: Record<string, string> = {
    Block: "Common/Blocks",
    BlockTexture: "Common/BlockTextures",
    Character: "Common/Characters",
    Item: "Common/Items",
    Icon: "Common/Icons",
    Language: "Common/Languages",
    Music: "Common/Music",
    NotificationIcon: "Common/NotificationIcons",
    NPC: "Common/NPC",
    Particle: "Common/Particles",
    Resource: "Common/Resources",
    ScreenEffect: "Common/ScreenEffects",
    Sky: "Common/Sky",
    Sound: "Common/Sounds",
    TintGradient: "Common/TintGradients",
    Trail: "Common/Trails",
    UI: "Common/UI",
    VFX: "Common/VFX",
    // Add more mappings as needed
  };
  const correctFolder = nodeTypeToFolder[rightClickedNode?.type ?? ""];
  const canAddHytaleAsset = correctFolder && availableFolders.includes(correctFolder);
  React.useEffect(() => {
    let active = true;
    if (canAddHytaleAsset && correctFolder) {
      setAssetsLoading(true);
      setAssetsError(null);
      // show global loader while listing assets
      useLoadingStore.getState().start("Loading Hytale assets...");
      getHytaleAssetsInFolder(hytaleBasePath, correctFolder)
        .then((assets) => {
          if (!active) return;
          setHytaleAssets(assets);
        })
        .catch(() => {
          if (!active) return;
          setAssetsError("Failed to load assets");
          useToastStore.getState().addToast("Failed to load Hytale assets", "error");
        })
        .finally(() => {
          useLoadingStore.getState().stop();
          if (!active) return;
          setAssetsLoading(false);
        });
    } else {
      setHytaleAssets([]);
    }
    return () => {
      active = false;
    };
  }, [canAddHytaleAsset, correctFolder, hytaleBasePath]);

  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedIds = new Set(selectedNodes.map((n) => n.id));

  // Ensure the right-clicked node is included
  if (!selectedIds.has(nodeId)) {
    selectedIds.add(nodeId);
  }

  const isGroup = rightClickedNode?.type === "group";
  const isRootNode = rightClickedNode?.type === "Root";
  // Annotation nodes (comments/frames) are pure UI overlays — hide graph operations
  const isAnnotation = rightClickedNode?.type === "comment" || rightClickedNode?.type === "frame";
  const rootNode = nodes.find((n) => n.type === "Root");
  const isConnectedToRoot = rootNode
    ? edges.some((e) => e.source === nodeId && e.target === rootNode.id)
    : false;

  return (
    <ContextMenuOverlay x={x} y={y} onClose={onClose}>
      {canAddHytaleAsset && (
        <ContextMenuSubmenu label={`Add Hytale Asset (${correctFolder.split("/").pop()})`}>
          {assetsLoading && (
            <div className="px-3 py-2 text-sm text-tn-text-muted">Loading assets...</div>
          )}
          {assetsError && (
            <div className="px-3 py-2 text-sm text-red-500">{assetsError}</div>
          )}
          {!assetsLoading && !assetsError && hytaleAssets.length > 0 && (
            <>
              {hytaleAssets.map((asset) => (
                <ContextMenuItem
                  key={asset}
                  label={asset}
                  onClick={() => {
                    useToastStore.getState().addToast(`Added Hytale asset: ${asset}`, "success");
                    onClose();
                  }}
                />
              ))}
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem
            label="Browse..."
            onClick={() => {
              useToastStore.getState().addToast(`Browse Hytale asset folder: ${correctFolder}`, "info");
              onClose();
            }}
          />
        </ContextMenuSubmenu>
      )}
      <ContextMenuItem
        label="Cut"
        shortcut="Ctrl+X"
        onClick={() => {
          const s = useEditorStore.getState();
          s.copyNodes();
          s.removeNodes([...selectedIds]);
          onClose();
        }}
      />
      <ContextMenuItem
        label="Copy"
        shortcut="Ctrl+C"
        onClick={() => {
          useEditorStore.getState().copyNodes();
          onClose();
        }}
      />
      <ContextMenuItem
        label="Duplicate"
        shortcut="Ctrl+D"
        onClick={() => {
          useEditorStore.getState().duplicateNodes();
          onClose();
        }}
      />
      <ContextMenuItem
        label="Delete"
        shortcut="Del"
        onClick={() => { void (async () => {
          try {
            if (confirmOnNodeDelete) {
              const yes = await ask(
                `Delete ${selectedIds.size} node${selectedIds.size === 1 ? "" : "s"}?`,
                { title: "Confirm Delete", kind: "warning" },
              );
              if (!yes) return;
            }
            useEditorStore.getState().removeNodes([...selectedIds]);
            onClose();
          } catch {
            useToastStore.getState().addToast("Could not open delete confirmation", "error");
          }
        })(); }}
      />
      {!isAnnotation && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem
            label="Group"
            shortcut="Ctrl+G"
            disabled={selectedIds.size < 2}
            onClick={() => {
              useEditorStore.getState().createGroup([...selectedIds], `Group (${selectedIds.size})`);
              onClose();
            }}
          />
          <ContextMenuItem
            label="Ungroup"
            disabled={!isGroup}
            onClick={() => {
              if (isGroup) useEditorStore.getState().expandGroup(nodeId);
              onClose();
            }}
          />
          <ContextMenuSeparator />
          <ContextMenuItem
            label="Select Upstream"
            shortcut={resolveKeybinding("selectUpstream")}
            onClick={() => {
              const s = useEditorStore.getState();
              const upstream = getUpstreamNodeIds(selectedIds, s.edges);
              const currentSelected = new Set(s.nodes.filter((n) => n.selected).map((n) => n.id));
              if (upstream.size === currentSelected.size && [...upstream].every((id) => currentSelected.has(id))) {
                const tips = new Set([...currentSelected].filter((id) =>
                  !s.edges.some((e) => e.source === id && currentSelected.has(e.target)),
                ));
                s.setNodes(s.nodes.map((n) => ({ ...n, selected: tips.has(n.id) })));
              } else {
                s.setNodes(s.nodes.map((n) => ({ ...n, selected: upstream.has(n.id) })));
              }
              onClose();
            }}
          />
          <ContextMenuItem
            label="Select Downstream"
            shortcut={resolveKeybinding("selectDownstream")}
            onClick={() => {
              const s = useEditorStore.getState();
              const downstream = getDownstreamNodeIds(selectedIds, s.edges);
              const currentSelected = new Set(s.nodes.filter((n) => n.selected).map((n) => n.id));
              if (downstream.size === currentSelected.size && [...downstream].every((id) => currentSelected.has(id))) {
                const roots = new Set([...currentSelected].filter((id) =>
                  !s.edges.some((e) => e.target === id && currentSelected.has(e.source)),
                ));
                s.setNodes(s.nodes.map((n) => ({ ...n, selected: roots.has(n.id) })));
              } else {
                s.setNodes(s.nodes.map((n) => ({ ...n, selected: downstream.has(n.id) })));
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
          <ContextMenuSubmenu label="Align / Distribute" disabled={selectedIds.size < 2}>
            <AlignDistributePanel selectedIds={selectedIds} onClose={onClose} />
          </ContextMenuSubmenu>
          <ContextMenuItem
            label="Select Same Type"
            onClick={() => {
              const { nodes, setNodes } = useEditorStore.getState();
              const nodeType = rightClickedNode?.type ?? rightClickedNode?.data?.type;
              if (!nodeType) { onClose(); return; }
              setNodes(nodes.map((n) => ({
                ...n,
                selected: (n.type ?? (n.data as Record<string, unknown>)?.type) === nodeType,
              })));
              onClose();
            }}
          />
          <ContextMenuSeparator />
          <ContextMenuItem
            label={isConnectedToRoot ? "Clear Root" : "Set as Root"}
            shortcut="Ctrl+T"
            disabled={isRootNode}
            onClick={() => {
              const s = useEditorStore.getState();
              const curRootNode = s.nodes.find((n) => n.type === "Root");
              if (isConnectedToRoot && curRootNode) {
                // Disconnect: remove the edge and clear output
                s.setEdges(s.edges.filter((e) => !(e.source === nodeId && e.target === curRootNode.id)));
                s.setOutputNode(null);
              } else {
                let target = curRootNode;
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
                  s.addNode(target);
                }
                // Remove any existing edge into Root, then wire this node
                const filtered = s.edges.filter((e) => e.target !== target!.id);
                const newEdge: Edge = {
                  id: `${nodeId}-${target.id}`,
                  source: nodeId,
                  sourceHandle: "output",
                  target: target.id,
                  targetHandle: "input",
                };
                s.setEdges([...filtered, newEdge]);
                s.setOutputNode(nodeId);
              }
              onClose();
            }}
          />
        </>
      )}
    </ContextMenuOverlay>
  );
}
