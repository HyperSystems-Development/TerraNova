import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { ALL_DEFAULTS, type CategoryDefaultsEntry } from "@/schema/defaults";
import { SNIPPET_CATALOG, placeSnippet, type SnippetDefinition } from "@/schema/snippets";
import { AssetCategory, CATEGORY_COLORS } from "@/schema/types";
import { findHandleDef, getHandles } from "@/nodes/handleRegistry";
import type { HandleDef } from "@/nodes/shared/handles";
import { BlockIcon } from "@/components/properties/BlockIcon";
import { useEditorStore } from "@/stores/editorStore";
import { useToastStore } from "@/stores/toastStore";
import { useProjectStore } from "@/stores/projectStore";
import { useLanguage } from "@/languages/useLanguage";
import { isPaletteTypeKeyVisible } from "@/nodes/shared/legacyTypes";
import { entryMatchesSearch } from "@/utils/nodeTypeSearch";
import { resolveNodeTypeKey } from "@/utils/nodeTypeKeys";
import connectionsData from "@/data/connections.json";

export { resolveNodeTypeKey } from "@/utils/nodeTypeKeys";

const SNIPPET_COLOR = "#a78bfa";

const CATEGORY_LABELS: Partial<Record<AssetCategory, string>> = {
  [AssetCategory.Density]: "Density",
  [AssetCategory.Curve]: "Curve",
  [AssetCategory.MaterialProvider]: "Material",
  [AssetCategory.Pattern]: "Pattern",
  [AssetCategory.PositionProvider]: "Position",
  [AssetCategory.Prop]: "Prop",
  [AssetCategory.Scanner]: "Scanner",
  [AssetCategory.Assignment]: "Assignment",
  [AssetCategory.VectorProvider]: "Vector",
  [AssetCategory.EnvironmentProvider]: "Environment",
  [AssetCategory.TintProvider]: "Tint",
  [AssetCategory.BlockMask]: "Block Mask",
  [AssetCategory.Directionality]: "Directionality",
  [AssetCategory.PropDistribution]: "Prop Distribution",
  [AssetCategory.Condition]: "Condition",
  [AssetCategory.Layer]: "Layer",
  [AssetCategory.PointGenerator]: "Point Generator",
  [AssetCategory.Terrain]: "Terrain",
  [AssetCategory.CaveGenerator]: "Cave Generator",
  [AssetCategory.Generator]: "Generator",
  [AssetCategory.Biome]: "Biome",
  [AssetCategory.WorldStructure]: "World Structure",
};

const RECENT_KEY = "tn-recent-nodes";
const MAX_RECENT = 8;
const QUICK_ADD_WIDTH = 360;
const QUICK_ADD_HEIGHT = 430;
const QUICK_ADD_MARGIN = 12;
const connectionMatrix = connectionsData.connectionMatrix as Record<string, Record<string, number>>;

function getRecentTypes(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentType(typeKey: string) {
  try {
    const recent = getRecentTypes().filter((t) => t !== typeKey);
    recent.unshift(typeKey);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // Ignore
  }
}

export function canConnectHandleCategories(
  sourceCategory: AssetCategory,
  targetCategory: AssetCategory,
): boolean {
  return sourceCategory === targetCategory ||
    (connectionMatrix[sourceCategory]?.[targetCategory] ?? 0) > 0;
}

export function findCompatibleHandleForPendingConnection(
  typeKey: string,
  pendingConnection: PendingConnection,
): HandleDef | null {
  const pendingHandle = findHandleDef(pendingConnection.nodeType, pendingConnection.handleId);
  if (!pendingHandle) return null;

  const needsTarget = pendingConnection.handleType === "source";
  const handles = getHandles(typeKey);

  return handles.find((handle) => {
    if (handle.type !== (needsTarget ? "target" : "source")) return false;
    return needsTarget
      ? canConnectHandleCategories(pendingHandle.category, handle.category)
      : canConnectHandleCategories(handle.category, pendingHandle.category);
  }) ?? null;
}

export interface PendingConnection {
  nodeId: string;
  handleId: string;
  handleType: "source" | "target";
  nodeType: string;
}

interface QuickAddDialogProps {
  open: boolean;
  position: { x: number; y: number };
  pendingConnection?: PendingConnection | null;
  onClose: () => void;
}

/** Unified display entry: either a node or a snippet */
type DisplayEntry =
  | { kind: "node"; entry: CategoryDefaultsEntry }
  | { kind: "snippet"; snippet: SnippetDefinition };

interface QuickAddDisplaySections {
  entries: DisplayEntry[];
  recentCount: number;
  snippetCount: number;
  nodeCount: number;
}

export function buildQuickAddDisplaySections(
  recentEntries: CategoryDefaultsEntry[],
  filteredSnippets: SnippetDefinition[],
  filteredNodeEntries: CategoryDefaultsEntry[],
  pendingConnection?: PendingConnection | null,
): QuickAddDisplaySections {
  const entries: DisplayEntry[] = [];
  const recentKeys = new Set<string>();
  const showRecents = !pendingConnection;

  if (showRecents) {
    for (const entry of recentEntries) {
      entries.push({ kind: "node", entry });
      recentKeys.add(resolveNodeTypeKey(entry));
    }
  }

  if (!pendingConnection) {
    for (const snippet of filteredSnippets) {
      entries.push({ kind: "snippet", snippet });
    }
  }

  let nodeCount = 0;
  for (const entry of filteredNodeEntries) {
    if (showRecents && recentKeys.has(resolveNodeTypeKey(entry))) continue;
    entries.push({ kind: "node", entry });
    nodeCount += 1;
  }

  return {
    entries,
    recentCount: showRecents ? recentKeys.size : 0,
    snippetCount: pendingConnection ? 0 : filteredSnippets.length,
    nodeCount,
  };
}

export function clampQuickAddPosition(
  position: { x: number; y: number },
  viewport: { width: number; height: number },
): { x: number; y: number } {
  const maxX = Math.max(QUICK_ADD_MARGIN, viewport.width - QUICK_ADD_WIDTH - QUICK_ADD_MARGIN);
  const maxY = Math.max(QUICK_ADD_MARGIN, viewport.height - QUICK_ADD_HEIGHT - QUICK_ADD_MARGIN);
  return {
    x: Math.max(QUICK_ADD_MARGIN, Math.min(position.x, maxX)),
    y: Math.max(QUICK_ADD_MARGIN, Math.min(position.y, maxY)),
  };
}

export function QuickAddDialog({ open, position, pendingConnection, onClose }: QuickAddDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const reactFlow = useReactFlow();
  const { isTypeVisible, getTypeDisplayName, matchesSearch } = useLanguage();

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const pendingHandleDef = useMemo(() => {
    if (!pendingConnection) return null;
    return findHandleDef(pendingConnection.nodeType, pendingConnection.handleId) ?? null;
  }, [pendingConnection]);

  // Filter node entries
  const filteredNodeEntries = useMemo(() => {
    let entries = ALL_DEFAULTS.filter((e) => isTypeVisible(e.type));

    // Filter out legacy and non-canonical aliases for new-node creation.
    entries = entries.filter((e) => isPaletteTypeKeyVisible(resolveNodeTypeKey(e)));

    // Connection-aware filtering: only show types that have a compatible handle
    if (pendingConnection) {
      entries = entries.filter((entry) => {
        const typeKey = resolveNodeTypeKey(entry);
        return findCompatibleHandleForPendingConnection(typeKey, pendingConnection) !== null;
      });
    }

    if (search) {
      entries = entries.filter((e) => entryMatchesSearch(e, search, matchesSearch));
    }

    return entries.slice(0, 50); // Limit visible results
  }, [search, pendingConnection, isTypeVisible, matchesSearch]);

  // Filter snippet entries
  const filteredSnippets = useMemo(() => {
    // Don't show snippets when connection-aware filtering is active
    if (pendingConnection) return [];
    if (!search) return SNIPPET_CATALOG;
    const q = search.trim().toLowerCase();
    return SNIPPET_CATALOG.filter((s) => s.name.toLowerCase().includes(q));
  }, [search, pendingConnection]);

  // Recent nodes (shown when search is empty)
  const recentEntries = useMemo(() => {
    if (search) return [];
    const recentKeys = getRecentTypes();
    return recentKeys
      .map((key) => {
        if (!isPaletteTypeKeyVisible(key)) return null;
        const entry = ALL_DEFAULTS.find((e) => resolveNodeTypeKey(e) === key);
        return entry ?? null;
      })
      .filter(Boolean) as CategoryDefaultsEntry[];
  }, [search]);

  // Build unified display list: Recent -> Snippets -> All Nodes.
  // Recents are hidden for wire-drop quick-add so stale entries cannot bypass compatibility filtering.
  const displaySections = useMemo(
    () => buildQuickAddDisplaySections(
      recentEntries,
      filteredSnippets,
      filteredNodeEntries,
      pendingConnection,
    ),
    [recentEntries, filteredSnippets, filteredNodeEntries, pendingConnection],
  );
  const displayEntries = displaySections.entries;

  // Clamp selected index
  useEffect(() => {
    if (selectedIndex >= displayEntries.length) {
      setSelectedIndex(Math.max(0, displayEntries.length - 1));
    }
  }, [displayEntries.length, selectedIndex]);

  const placeNode = useCallback(
    (entry: CategoryDefaultsEntry) => {
      const flowPos = reactFlow.screenToFlowPosition({
        x: position.x,
        y: position.y,
      });

      const nodeTypeKey = resolveNodeTypeKey(entry);
      const nodeId = crypto.randomUUID();

      useEditorStore.getState().addNode({
        id: nodeId,
        type: nodeTypeKey,
        position: flowPos,
        data: { type: entry.type, fields: { ...entry.defaults } },
      });

      addRecentType(nodeTypeKey);
      useProjectStore.getState().setDirty(true);

      // Auto-connect if pending connection
      if (pendingConnection) {
        const handles = getHandles(nodeTypeKey);
        if (handles.length) {
          const needsTarget = pendingConnection.handleType === "source";
          const compatHandle = findCompatibleHandleForPendingConnection(nodeTypeKey, pendingConnection);
          if (compatHandle) {
            const connection = needsTarget
              ? {
                  source: pendingConnection.nodeId,
                  sourceHandle: pendingConnection.handleId,
                  target: nodeId,
                  targetHandle: compatHandle.id,
                }
              : {
                  source: nodeId,
                  sourceHandle: compatHandle.id,
                  target: pendingConnection.nodeId,
                  targetHandle: pendingConnection.handleId,
                };
            useEditorStore.getState().onConnect(connection);
          }
        }
      }

      onClose();
    },
    [reactFlow, position, pendingConnection, onClose],
  );

  const placeSnippetEntry = useCallback(
    (snippet: SnippetDefinition) => {
      try {
        const flowPos = reactFlow.screenToFlowPosition({
          x: position.x,
          y: position.y,
        });
        const { nodes, edges } = placeSnippet(snippet, flowPos);
        useEditorStore.getState().addSnippet(nodes, edges);
        onClose();
      } catch (err) {
        if (import.meta.env.DEV) console.error("Failed to place snippet:", err);
        useToastStore.getState().addToast("Failed to place snippet", "error");
      }
    },
    [reactFlow, position, onClose],
  );

  function handleSelect(entry: DisplayEntry) {
    if (entry.kind === "snippet") {
      placeSnippetEntry(entry.snippet);
    } else {
      placeNode(entry.entry);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, displayEntries.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "PageDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 6, displayEntries.length - 1));
        break;
      case "PageUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 6, 0));
        break;
      case "Home":
        e.preventDefault();
        setSelectedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setSelectedIndex(Math.max(0, displayEntries.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (displayEntries[selectedIndex]) {
          handleSelect(displayEntries[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  const clamped = clampQuickAddPosition(position, {
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Compute section boundaries for labels
  const recentCount = displaySections.recentCount;
  const snippetCount = displaySections.snippetCount;

  return (
    <div className="fixed inset-0 z-[100]" onMouseDown={onClose}>
      <div
        className="absolute bg-tn-surface border border-tn-border rounded-lg shadow-xl overflow-hidden"
        style={{ left: clamped.x, top: clamped.y, width: QUICK_ADD_WIDTH }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-tn-border">
          <div className="text-[11px] text-tn-text-muted font-semibold">
            {pendingConnection ? "Connect compatible node" : "Add node"}
          </div>
          <div className="mt-0.5 text-[10px] text-tn-text-muted/70">
            {pendingConnection
              ? "Filtered to nodes with a matching handle."
              : "Recent choices, snippets, and every visible node type."}
          </div>
        </div>

        {/* Search input */}
        <div className="p-2">
          <input
            ref={inputRef}
            type="text"
            placeholder={pendingConnection ? "Search compatible nodes..." : "Search nodes or snippets..."}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1.5 text-[12px] bg-tn-bg border border-tn-border rounded focus:border-tn-accent focus:outline-none"
          />
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto pb-1">
          {/* Recent label */}
          {!search && recentCount > 0 && (
            <div className="px-3 py-1 text-[10px] text-tn-text-muted font-medium uppercase tracking-wider">
              Recent
            </div>
          )}

          {displayEntries.map((de, i) => {
            const isSelected = i === selectedIndex;

            // Section labels
            const isSnippetStart = i === recentCount && snippetCount > 0;
            const isAllNodesStart =
              i === recentCount + snippetCount && filteredNodeEntries.length > 0 && (recentCount > 0 || snippetCount > 0);

            if (de.kind === "snippet") {
              return (
                <div key={`snippet-${de.snippet.id}`}>
                  {isSnippetStart && (
                    <div className="px-3 py-1 text-[10px] text-tn-text-muted font-medium uppercase tracking-wider mt-1">
                      Snippets
                    </div>
                  )}
                  <button
                    className={`w-full text-left px-3 py-2 flex items-start gap-2 text-[12px] ${
                      isSelected ? "bg-tn-accent/20" : "hover:bg-white/5"
                    }`}
                    onMouseEnter={() => setSelectedIndex(i)}
                    onClick={() => placeSnippetEntry(de.snippet)}
                    title={de.snippet.description}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                      style={{ backgroundColor: SNIPPET_COLOR }}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate">{de.snippet.name}</span>
                      <span className="block truncate text-[10px] text-tn-text-muted/70">
                        {de.snippet.description}
                      </span>
                    </span>
                    <span className="text-[10px]" style={{ color: SNIPPET_COLOR }}>
                      Snippet
                    </span>
                  </button>
                </div>
              );
            }

            const entry = de.entry;
            const color = CATEGORY_COLORS[entry.category];
            const categoryLabel = CATEGORY_LABELS[entry.category] ?? entry.category;
            const pendingCategoryLabel = pendingHandleDef
              ? (CATEGORY_LABELS[pendingHandleDef.category] ?? pendingHandleDef.category)
              : categoryLabel;

            return (
              <div key={`${i < recentCount ? "r-" : ""}${entry.category}:${entry.type}-${i}`}>
                {isAllNodesStart && !search && (
                  <div className="px-3 py-1 text-[10px] text-tn-text-muted font-medium uppercase tracking-wider mt-1">
                    All Nodes
                  </div>
                )}
                <button
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 text-[12px] ${
                    isSelected ? "bg-tn-accent/20" : "hover:bg-white/5"
                  }`}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onClick={() => placeNode(entry)}
                  title={pendingConnection
                    ? `Suggested: compatible with ${pendingCategoryLabel} (${pendingHandleDef?.category ?? entry.category})`
                    : undefined}
                >
                  {/* Show BlockIcon if materialId is available, else fallback to colored dot */}
                  {entry.category === AssetCategory.MaterialProvider ? (
                    <BlockIcon
                      materialId={
                        entry.defaults && typeof entry.defaults.Material === "string" && entry.defaults.Material.length > 0
                          ? entry.defaults.Material
                          : "Soil_Grass"
                      }
                      size={20}
                      className="shrink-0"
                    />
                  ) : (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{getTypeDisplayName(entry.type)}</span>
                    <span className="block truncate text-[10px] text-tn-text-muted/60">{entry.type}</span>
                  </span>
                  <span className="text-[10px] text-tn-text-muted">{categoryLabel}</span>
                </button>
              </div>
            );
          })}
          {displayEntries.length === 0 && (
            <div className="px-4 py-6 text-center text-[11px] text-tn-text-muted">
              <div className="font-medium text-tn-text">No matching nodes</div>
              <div className="mt-1 text-tn-text-muted/70">
                {pendingConnection
                  ? "Try a broader search or drop the wire on the canvas without filtering."
                  : "Try a type name, category, or snippet name."}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-tn-border px-3 py-1.5 text-[10px] text-tn-text-muted/70">
          <span>{displayEntries.length} shown</span>
          <span>Enter place | Esc close</span>
        </div>
      </div>
    </div>
  );
}
