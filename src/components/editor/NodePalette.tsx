import { useState, useCallback, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { AssetCategory, CATEGORY_COLORS } from "@/schema/types";
import { ALL_DEFAULTS, type CategoryDefaultsEntry } from "@/schema/defaults";
import { SNIPPET_CATALOG, placeSnippet, type SnippetDefinition } from "@/schema/snippets";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";
import { useDragStore } from "@/stores/dragStore";
import { useLanguage } from "@/languages/useLanguage";
import { NODE_TIPS } from "@/schema/nodeTips";
import {
  DensitySubcategory,
  DENSITY_SUBCATEGORY_COLORS,
  DENSITY_NODE_SUBCATEGORY,
} from "@/schema/densitySubcategories";
import type { DensityType } from "@/schema/density";
import { isBridgeNode } from "@/data/bridgeRegistry";
import { isPaletteTypeKeyVisible } from "@/nodes/shared/legacyTypes";

const SNIPPET_COLOR = "#a78bfa";
const ROOT_PALETTE_COLOR = "#8B4450";

/** Human-readable category labels */
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

/** Category order for display */
const CATEGORY_ORDER: AssetCategory[] = [
  AssetCategory.Density,
  AssetCategory.Curve,
  AssetCategory.MaterialProvider,
  AssetCategory.Pattern,
  AssetCategory.PositionProvider,
  AssetCategory.Prop,
  AssetCategory.Scanner,
  AssetCategory.Assignment,
  AssetCategory.VectorProvider,
  AssetCategory.EnvironmentProvider,
  AssetCategory.TintProvider,
  AssetCategory.BlockMask,
  AssetCategory.Directionality,
];

/** Map from category → prefix used in node type registry */
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

/** Human-readable subcategory labels for density nodes */
const DENSITY_SUB_LABELS: Record<DensitySubcategory, string> = {
  [DensitySubcategory.Generative]: "Generative",
  [DensitySubcategory.FilterTransform]: "Filter / Transform",
  [DensitySubcategory.ArithmeticCombinator]: "Arithmetic",
  [DensitySubcategory.PositionCoordinate]: "Position",
  [DensitySubcategory.Terrain]: "Terrain",
  [DensitySubcategory.ShapeSDF]: "Shape SDF",
};

/** Display order for density subcategories */
const DENSITY_SUB_ORDER: DensitySubcategory[] = [
  DensitySubcategory.Generative,
  DensitySubcategory.ArithmeticCombinator,
  DensitySubcategory.FilterTransform,
  DensitySubcategory.PositionCoordinate,
  DensitySubcategory.Terrain,
  DensitySubcategory.ShapeSDF,
];

/** Group density entries by subcategory */
function groupDensityBySub(
  entries: CategoryDefaultsEntry[],
): Map<DensitySubcategory, CategoryDefaultsEntry[]> {
  const map = new Map<DensitySubcategory, CategoryDefaultsEntry[]>();
  for (const entry of entries) {
    const sub = DENSITY_NODE_SUBCATEGORY[entry.type as DensityType];
    if (!sub) continue;
    const list = map.get(sub) ?? [];
    list.push(entry);
    map.set(sub, list);
  }
  return map;
}

/** Resolve the React Flow node type key from category + type name */
function resolveNodeTypeKey(entry: CategoryDefaultsEntry): string {
  const prefix = CATEGORY_PREFIX[entry.category];
  return prefix ? `${prefix}:${entry.type}` : entry.type;
}

/** Group entries by category */
function groupByCategory(
  entries: CategoryDefaultsEntry[],
): Map<AssetCategory, CategoryDefaultsEntry[]> {
  const map = new Map<AssetCategory, CategoryDefaultsEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.category) ?? [];
    list.push(entry);
    map.set(entry.category, list);
  }
  return map;
}

/** Map editing context string back to AssetCategory enum */
const CONTEXT_TO_CATEGORY: Record<string, AssetCategory> = {
  Density: AssetCategory.Density,
  Curve: AssetCategory.Curve,
  MaterialProvider: AssetCategory.MaterialProvider,
  Pattern: AssetCategory.Pattern,
  PositionProvider: AssetCategory.PositionProvider,
  Prop: AssetCategory.Prop,
  Scanner: AssetCategory.Scanner,
  Assignment: AssetCategory.Assignment,
  VectorProvider: AssetCategory.VectorProvider,
  EnvironmentProvider: AssetCategory.EnvironmentProvider,
  TintProvider: AssetCategory.TintProvider,
  BlockMask: AssetCategory.BlockMask,
  Directionality: AssetCategory.Directionality,
};

export function NodePalette() {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<AssetCategory>>(() => new Set(Object.values(AssetCategory)));
  const [snippetsCollapsed, setSnippetsCollapsed] = useState<Set<string>>(() => new Set(SNIPPET_CATALOG.map((s) => s.category)));
  const [collapsedSubs, setCollapsedSubs] = useState<Set<DensitySubcategory>>(() => new Set());
  const addNode = useEditorStore((s) => s.addNode);
  const addSnippet = useEditorStore((s) => s.addSnippet);
  const setDirty = useProjectStore((s) => s.setDirty);
  const editingContext = useEditorStore((s) => s.editingContext);
  const reactFlow = useReactFlow();
  const { isTypeVisible, getTypeDisplayName, matchesSearch } = useLanguage();

  const didDragRef = useRef(false);
  const clickStaggerRef = useRef(0);

  const visibleDefaults = ALL_DEFAULTS.filter((e) =>
    isTypeVisible(e.type) && isPaletteTypeKeyVisible(resolveNodeTypeKey(e))
  );
  const grouped = groupByCategory(visibleDefaults);
  const hasSearch = search.trim().length > 0;

  // Filter snippets by search (name or description)
  const filteredSnippets = hasSearch
    ? SNIPPET_CATALOG.filter((s) => {
        const lq = search.trim().toLowerCase();
        return s.name.toLowerCase().includes(lq) || s.description.toLowerCase().includes(lq);
      })
    : SNIPPET_CATALOG;

  // Group snippets by category
  const groupedSnippets = filteredSnippets.reduce((acc, snippet) => {
    acc[snippet.category] = acc[snippet.category] || [];
    acc[snippet.category].push(snippet);
    return acc;
  }, {} as Record<string, SnippetDefinition[]>);

  // Context-aware category ordering: pinned category first
  const contextCategory = editingContext ? CONTEXT_TO_CATEGORY[editingContext] : null;
  const sortedCategoryOrder = contextCategory
    ? [contextCategory, ...CATEGORY_ORDER.filter((c) => c !== contextCategory)]
    : CATEGORY_ORDER;

  const toggleCategory = useCallback((cat: AssetCategory) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const toggleSub = useCallback((sub: DensitySubcategory) => {
    setCollapsedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(sub)) next.delete(sub);
      else next.add(sub);
      return next;
    });
  }, []);

  function getViewportCenter() {
    const viewportEl = document.querySelector(".react-flow__viewport")?.parentElement;
    const centerX = viewportEl ? viewportEl.clientWidth / 2 : 400;
    const centerY = viewportEl ? viewportEl.clientHeight / 2 : 300;
    const stagger = clickStaggerRef.current * 30;
    clickStaggerRef.current = (clickStaggerRef.current + 1) % 10;
    return reactFlow.screenToFlowPosition({
      x: centerX + stagger,
      y: centerY + stagger,
    });
  }

  function handleClick(entry: CategoryDefaultsEntry) {
    // Suppress click if a drag just completed
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    const position = getViewportCenter();
    const nodeTypeKey = resolveNodeTypeKey(entry);
    addNode({
      id: crypto.randomUUID(),
      type: nodeTypeKey,
      position,
      data: { type: entry.type, fields: { ...entry.defaults } },
    });
    setDirty(true);
  }

  function handleSnippetClick(snippet: SnippetDefinition) {
    const position = getViewportCenter();
    const { nodes, edges } = placeSnippet(snippet, position);
    addSnippet(nodes, edges);
  }

  function handleRootClick() {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    const position = getViewportCenter();
    addNode({
      id: crypto.randomUUID(),
      type: "Root",
      position,
      data: { type: "Root", fields: {} },
    });
    setDirty(true);
  }

  function handleMouseDown(e: React.MouseEvent, entry: CategoryDefaultsEntry) {
    // Only initiate drag on left button
    if (e.button !== 0) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let dragStarted = false;

    const nodeTypeKey = resolveNodeTypeKey(entry);
    const data = {
      nodeType: nodeTypeKey,
      displayType: entry.type,
      defaults: entry.defaults,
    };

    function onMouseMove(ev: MouseEvent) {
      if (!dragStarted) {
        // Only start dragging after moving beyond a 5px threshold
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (dx * dx + dy * dy < 25) return;
        dragStarted = true;
        didDragRef.current = true;
        useDragStore.getState().startDrag(data);
      }
      useDragStore.getState().updateCursor(ev.clientX, ev.clientY);
    }

    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      // If drag never started, this was a click — endDrag is a no-op
      if (!dragStarted) return;
      // endDrag handled by EditorCanvas mouseup if released on canvas,
      // otherwise cancel the drag here
      if (useDragStore.getState().isDragging) {
        useDragStore.getState().endDrag();
      }
      // Reset didDragRef after a microtask so the synchronous click event
      // (same-element release) is still suppressed, but future clicks aren't eaten
      setTimeout(() => { didDragRef.current = false; }, 0);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-2 border-b border-tn-border">
        <div className="relative">
          <input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1 text-sm bg-tn-bg border border-tn-border rounded pr-6"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-tn-text-muted hover:text-tn-text text-xs leading-none"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto p-1">
        {sortedCategoryOrder.map((cat) => {
          const entries = grouped.get(cat);
          if (!entries) return null;

          const filteredEntries = hasSearch
            ? entries.filter((e) => matchesSearch(e.type, search) || matchesSearch(resolveNodeTypeKey(e), search))
            : entries;

          if (hasSearch && filteredEntries.length === 0) return null;

          const isCollapsed = collapsed.has(cat) && !hasSearch;
          const color = CATEGORY_COLORS[cat];
          const label = CATEGORY_LABELS[cat] ?? cat;
          const isContextMatch = contextCategory === cat;
          const isDimmed = contextCategory !== null && !isContextMatch && !hasSearch;

          return (
            <div key={cat} className="mb-1" style={{ opacity: isDimmed ? 0.75 : 1 }}>
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat)}
                className={`w-full text-left px-2 py-1.5 text-xs font-semibold flex items-center gap-2 hover:bg-tn-panel/50 rounded ${
                  isContextMatch && !hasSearch ? "bg-tn-panel/30" : ""
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="flex-1">{label}</span>
                <span className="text-tn-text-muted text-[10px]">
                  {filteredEntries.length}
                </span>
                <span className="text-tn-text-muted text-[10px]">
                  {isCollapsed ? "▸" : "▾"}
                </span>
              </button>

              {/* Entries */}
              {!isCollapsed && cat === AssetCategory.Density && (() => {
                const subGrouped = groupDensityBySub(filteredEntries);
                return (
                  <div className="ml-2">
                    {DENSITY_SUB_ORDER.map((sub) => {
                      const subEntries = subGrouped.get(sub);
                      if (!subEntries || subEntries.length === 0) return null;
                      const subColor = DENSITY_SUBCATEGORY_COLORS[sub];
                      const subLabel = DENSITY_SUB_LABELS[sub];
                      const isSubCollapsed = collapsedSubs.has(sub) && !hasSearch;
                      return (
                        <div key={sub} className="mb-0.5">
                          <button
                            onClick={() => toggleSub(sub)}
                            className="w-full text-left px-2 py-1 text-[11px] font-semibold flex items-center gap-1.5 hover:bg-tn-panel/50 rounded"
                          >
                            <span
                              className="w-2 h-2 rounded-sm shrink-0"
                              style={{ backgroundColor: subColor }}
                            />
                            <span className="flex-1 text-tn-text/80">{subLabel}</span>
                            <span className="text-tn-text-muted text-[10px]">{subEntries.length}</span>
                            <span className="text-tn-text-muted text-[10px]">
                              {isSubCollapsed ? "▸" : "▾"}
                            </span>
                          </button>
                          {!isSubCollapsed && (
                            <div className="ml-2">
                              {subEntries.map((entry) => {
                                const nodeKey = resolveNodeTypeKey(entry);
                                const tips = NODE_TIPS[nodeKey] ?? NODE_TIPS[entry.type];
                                const tipText = tips?.[0]?.message;
                                const rfDisplay = getTypeDisplayName(nodeKey);
                                const entryDisplayName = (rfDisplay !== nodeKey) ? rfDisplay : getTypeDisplayName(entry.type);
                                return (
                                  <button
                                    key={`${cat}:${entry.type}`}
                                    onClick={() => handleClick(entry)}
                                    onMouseDown={(e) => handleMouseDown(e, entry)}
                                    title={tipText}
                                    className="w-full text-left px-2 py-1 text-sm hover:bg-tn-panel/50 rounded flex items-center gap-2 cursor-grab active:cursor-grabbing"
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ backgroundColor: subColor }}
                                    />
                                    <span className="truncate">{entryDisplayName}</span>
                                    {isBridgeNode(entry.type) && (
                                      <span className="text-[9px] text-tn-text-muted opacity-60 shrink-0">⇄</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              {!isCollapsed && cat !== AssetCategory.Density && (
                <div className="ml-2">
                  {filteredEntries.map((entry) => {
                    const nodeKey = resolveNodeTypeKey(entry);
                    const tips = NODE_TIPS[nodeKey] ?? NODE_TIPS[entry.type];
                    const tipText = tips?.[0]?.message;
                    const rfDisplay = getTypeDisplayName(nodeKey);
                    const entryDisplayName = (rfDisplay !== nodeKey) ? rfDisplay : getTypeDisplayName(entry.type);
                    return (
                      <button
                        key={`${cat}:${entry.type}`}
                        onClick={() => handleClick(entry)}
                        onMouseDown={(e) => handleMouseDown(e, entry)}
                        title={tipText}
                        className="w-full text-left px-2 py-1 text-sm hover:bg-tn-panel/50 rounded flex items-center gap-2 cursor-grab active:cursor-grabbing"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate">{entryDisplayName}</span>
                        {isBridgeNode(entry.type) && (
                          <span className="text-[9px] text-tn-text-muted opacity-60 shrink-0">⇄</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Root node */}
        {(!hasSearch || "root".includes(search.trim().toLowerCase())) && (
          <div className="mb-1">
            <button
              onClick={handleRootClick}
              title="Graph output — connect a node into this to mark it as the root"
              className="w-full text-left px-2 py-1.5 text-xs font-semibold flex items-center gap-2 hover:bg-tn-panel/50 rounded"
            >
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: ROOT_PALETTE_COLOR }}
              />
              <span className="flex-1">Root</span>
            </button>
          </div>
        )}

        {/* Snippets section grouped by category */}
        {Object.entries(groupedSnippets).map(([category, snippets]) => {
          const isCategoryCollapsed = snippetsCollapsed.has(category) && !hasSearch;
          return (
            <div key={category} className="mb-1">
              <button
                onClick={() => setSnippetsCollapsed((prev) => {
                  const next = new Set(prev);
                  if (next.has(category)) next.delete(category);
                  else next.add(category);
                  return next;
                })}
                className="w-full text-left px-2 py-1.5 text-xs font-semibold flex items-center gap-2 hover:bg-tn-panel/50 rounded"
              >
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: SNIPPET_COLOR }} />
                <span className="flex-1">Snippets · {category}</span>
                <span className="text-tn-text-muted text-[10px]">{snippets.length}</span>
                <span className="text-tn-text-muted text-[10px]">{isCategoryCollapsed ? "▸" : "▾"}</span>
              </button>
              {!isCategoryCollapsed && (
                <div className="ml-2">
                  {snippets.map((snippet) => (
                    <button
                      key={snippet.id}
                      onClick={() => handleSnippetClick(snippet)}
                      title={snippet.description}
                      className="w-full text-left px-2 py-1 hover:bg-tn-panel/50 rounded flex items-start gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: SNIPPET_COLOR }} />
                      <span className="flex flex-col min-w-0">
                        <span className="text-sm truncate">{snippet.name}</span>
                        <span className="text-[10px] text-tn-text-muted truncate">{snippet.description}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty search state */}
        {hasSearch && filteredSnippets.length === 0 && !"root".includes(search.trim().toLowerCase()) && sortedCategoryOrder.every((cat) => {
          const entries = grouped.get(cat);
          if (!entries) return true;
          return entries.filter((e) => matchesSearch(e.type, search) || matchesSearch(resolveNodeTypeKey(e), search)).length === 0;
        }) && (
          <p className="text-center text-tn-text-muted text-xs py-6">No nodes found</p>
        )}
      </div>
    </div>
  );
}
