import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { ALL_DEFAULTS, type CategoryDefaultsEntry } from "@/schema/defaults";
import { SNIPPET_CATALOG, placeSnippet, type SnippetDefinition } from "@/schema/snippets";
import { AssetCategory, CATEGORY_COLORS } from "@/schema/types";
import { HANDLE_REGISTRY } from "@/nodes/handleRegistry";
import { BlockIcon } from "@/components/properties/BlockIcon";
import { findCompatibleInterjectHandles } from "@/nodes/handleRegistry";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";
import { useLanguage } from "@/languages/useLanguage";
import { isLegacyTypeKey } from "@/nodes/shared/legacyTypes";

const SNIPPET_COLOR = "#a78bfa";

const CATEGORY_PREFIX: Partial<Record<AssetCategory, string>> = {
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
  [AssetCategory.BlockMask]: "BlockMask",
  [AssetCategory.Directionality]: "Directionality",
};

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
};

const RECENT_KEY = "tn-recent-nodes";
const MAX_RECENT = 8;

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

function resolveNodeTypeKey(entry: CategoryDefaultsEntry): string {
  const prefix = CATEGORY_PREFIX[entry.category];
  return prefix ? `${prefix}:${entry.type}` : entry.type;
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

  // Get compatible categories for connection-aware filtering
  const compatibleCategories = useMemo(() => {
    if (!pendingConnection) return null;
    const { nodeType, handleId } = pendingConnection;
    const defs = HANDLE_REGISTRY[nodeType];
    if (!defs) return null;
    const handleDef = defs.find((h) => h.id === handleId);
    if (!handleDef) return null;
    // Terrain/prop awareness: prioritize block for terrain, plant for prop
    // Block: MaterialProvider, Density, Pattern, etc.
    // Plant: Prop, Pattern (with plant material), etc.
    if (handleDef.category === AssetCategory.MaterialProvider || handleDef.category === AssetCategory.Density) {
      // Terrain connection: prioritize block node types
      return new Set([
        AssetCategory.MaterialProvider,
        AssetCategory.Density,
        AssetCategory.Pattern,
        AssetCategory.BlockMask,
      ]);
    }
    if (handleDef.category === AssetCategory.Prop) {
      // Prop connection: prioritize plant node types
      return new Set([
        AssetCategory.Prop,
        AssetCategory.Pattern,
      ]);
    }
    // Fallback: use original category
    return new Set([handleDef.category]);
  }, [pendingConnection]);

  // Filter node entries
  const filteredNodeEntries = useMemo(() => {
    let entries = ALL_DEFAULTS.filter((e) => isTypeVisible(e.type));

    // Filter out legacy types (not present in Hytale pre-release API)
    entries = entries.filter((e) => !isLegacyTypeKey(resolveNodeTypeKey(e)));

    // Connection-aware filtering: only show types with compatible handles
    if (compatibleCategories && pendingConnection) {
      // Use findCompatibleInterjectHandles to filter node types
      const { nodeId } = pendingConnection;
      // Get connected handles for the node being connected
      const connectedHandles = (() => {
        const { edges } = useEditorStore.getState();
        const connected = new Set<string>();
        for (const e of edges) {
          if (e.source === nodeId && e.sourceHandle) connected.add(e.sourceHandle);
          if (e.target === nodeId && e.targetHandle) connected.add(e.targetHandle);
        }
        return connected;
      })();

      entries = entries.filter((entry) => {
        const typeKey = resolveNodeTypeKey(entry);
        // Use findCompatibleInterjectHandles to check for at least one compatible handle
        const compat = findCompatibleInterjectHandles(
          typeKey,
          Array.from(compatibleCategories)[0],
          Array.from(compatibleCategories)[0],
          connectedHandles,
        );
        return !!compat;
      });
    }

    if (search) {
      entries = entries.filter((e) => matchesSearch(e.type, search));
    }

    return entries.slice(0, 50); // Limit visible results
  }, [search, compatibleCategories, pendingConnection, isTypeVisible, matchesSearch]);

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
        const entry = ALL_DEFAULTS.find((e) => resolveNodeTypeKey(e) === key);
        return entry ?? null;
      })
      .filter(Boolean) as CategoryDefaultsEntry[];
  }, [search]);

  // Build unified display list: Recent → Snippets → All Nodes
  const displayEntries: DisplayEntry[] = useMemo(() => {
    const result: DisplayEntry[] = [];
    for (const e of recentEntries) result.push({ kind: "node", entry: e });
    for (const s of filteredSnippets) result.push({ kind: "snippet", snippet: s });
    for (const e of filteredNodeEntries) result.push({ kind: "node", entry: e });
    return result;
  }, [recentEntries, filteredSnippets, filteredNodeEntries]);

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
        const handles = HANDLE_REGISTRY[nodeTypeKey];
        if (handles) {
          const needsTarget = pendingConnection.handleType === "source";
          const compatHandle = handles.find(
            (h) =>
              h.type === (needsTarget ? "target" : "source") &&
              compatibleCategories?.has(h.category),
          );
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
    [reactFlow, position, pendingConnection, compatibleCategories, onClose],
  );

  const placeSnippetEntry = useCallback(
    (snippet: SnippetDefinition) => {
      const flowPos = reactFlow.screenToFlowPosition({
        x: position.x,
        y: position.y,
      });
      const { nodes, edges } = placeSnippet(snippet, flowPos);
      useEditorStore.getState().addSnippet(nodes, edges);
      onClose();
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

  // Clamp to viewport
  const clampedX = Math.min(position.x, window.innerWidth - 280);
  const clampedY = Math.min(position.y, window.innerHeight - 360);

  // Compute section boundaries for labels
  const recentCount = recentEntries.length;
  const snippetCount = filteredSnippets.length;

  return (
    <div className="fixed inset-0 z-[100]" onMouseDown={onClose}>
      <div
        className="absolute bg-tn-surface border border-tn-border rounded-lg shadow-xl w-[260px] overflow-hidden"
        style={{ left: clampedX, top: clampedY }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3 py-2 text-[11px] text-tn-text-muted font-medium border-b border-tn-border">
          {pendingConnection ? "Connect to..." : "Add Node"}
        </div>

        {/* Search input */}
        <div className="p-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search nodes..."
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
        <div ref={listRef} className="max-h-[280px] overflow-y-auto pb-1">
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
                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-[12px] ${
                      isSelected ? "bg-tn-accent/20" : "hover:bg-white/5"
                    }`}
                    onMouseEnter={() => setSelectedIndex(i)}
                    onClick={() => placeSnippetEntry(de.snippet)}
                    title={de.snippet.description}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: SNIPPET_COLOR }}
                    />
                    <span className="flex-1 truncate">{de.snippet.name}</span>
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

            return (
              <div key={`${i < recentCount ? "r-" : ""}${entry.category}:${entry.type}-${i}`}>
                {isAllNodesStart && !search && (
                  <div className="px-3 py-1 text-[10px] text-tn-text-muted font-medium uppercase tracking-wider mt-1">
                    All Nodes
                  </div>
                )}
                <button
                  className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-[12px] ${
                    isSelected ? "bg-tn-accent/20" : "hover:bg-white/5"
                  }`}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onClick={() => placeNode(entry)}
                  title={pendingConnection
                    ? `Suggested: compatible with ${categoryLabel} (${entry.category})`
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
                  <span className="flex-1 truncate">{getTypeDisplayName(entry.type)}</span>
                  <span className="text-[10px] text-tn-text-muted">{categoryLabel}</span>
                </button>
              </div>
            );
          })}
          {displayEntries.length === 0 && (
            <div className="px-3 py-4 text-center text-[11px] text-tn-text-muted">
              No matching nodes
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
