import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useEditorStore } from "@/stores/editorStore";
import { useLanguage } from "@/languages/useLanguage";
import type { BaseNodeData } from "@/nodes/shared/BaseNode";
import { graphNodeMatchesSearch, graphNodeMatchesTypeFilter } from "@/utils/nodeTypeSearch";

interface NodeSearchDialogProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResult {
  nodeId: string;
  displayType: string;
  internalType: string;
  label: string | null;
  position: { x: number; y: number };
  selected: boolean;
}

const MAX_VISIBLE_RESULTS = 60;

export function NodeSearchDialog({ open, onClose }: NodeSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useEditorStore((s) => s.setSelectedNodeId);
  const reactFlow = useReactFlow();
  const { getTypeDisplayName, matchesSearch } = useLanguage();

  const toSearchResult = useCallback((n: typeof nodes[number]): SearchResult => {
    const data = n.data as unknown as BaseNodeData;
    const internalType = data.type ?? "";
    return {
      nodeId: n.id,
      displayType: getTypeDisplayName(internalType),
      internalType,
      label: ((n.data as Record<string, unknown>).label as string) ?? null,
      position: n.position,
      selected: !!n.selected || n.id === selectedNodeId,
    };
  }, [getTypeDisplayName, selectedNodeId]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const matches: SearchResult[] = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return nodes.map(toSearchResult);

    // Parse prefix filters
    const typePrefix = trimmed.match(/^type:(\S+)$/i);
    const connectedPrefix = trimmed.match(/^connected:(\S+)$/i);

    if (connectedPrefix) {
      // Find all nodes connected to the specified node ID
      const targetId = connectedPrefix[1];
      const connectedIds = new Set<string>();
      for (const edge of edges) {
        if (edge.source === targetId) connectedIds.add(edge.target);
        if (edge.target === targetId) connectedIds.add(edge.source);
      }
      return nodes
        .filter((n) => connectedIds.has(n.id))
        .map(toSearchResult);
    }

    if (typePrefix) {
      const typeQuery = typePrefix[1];
      return nodes
        .filter((n) => graphNodeMatchesTypeFilter(n, typeQuery, getTypeDisplayName))
        .map(toSearchResult);
    }

    // Default: search by type name (language-aware), custom label, field values, and node ID
    return nodes
      .filter((n) => {
        const data = n.data as unknown as BaseNodeData;
        const customLabel = ((n.data as Record<string, unknown>).label as string) ?? "";

        if (graphNodeMatchesSearch(n, trimmed, matchesSearch)) return true;

        // Custom label search
        if (customLabel && customLabel.toLowerCase().includes(trimmed.toLowerCase())) return true;

        // Node ID search
        if (n.id.toLowerCase().includes(trimmed.toLowerCase())) return true;

        // Field value search
        for (const val of Object.values(data.fields ?? {})) {
          if (String(val).toLowerCase().includes(trimmed.toLowerCase())) return true;
        }

        return false;
      })
      .map(toSearchResult);
  }, [query, nodes, edges, getTypeDisplayName, matchesSearch, toSearchResult]);

  const visibleMatches = useMemo(
    () => matches.slice(0, MAX_VISIBLE_RESULTS),
    [matches],
  );

  // Clamp selected index when results change
  useEffect(() => {
    if (selectedIndex >= visibleMatches.length) {
      setSelectedIndex(Math.max(0, visibleMatches.length - 1));
    }
  }, [visibleMatches.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  function selectNode(nodeId: string) {
    setSelectedNodeId(nodeId);
    useEditorStore.getState().setNodes(
      nodes.map((n) => ({ ...n, selected: n.id === nodeId })),
    );
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      reactFlow.fitView({
        nodes: [node],
        duration: 300,
        padding: 0.5,
      });
    }
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, visibleMatches.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "PageDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 8, visibleMatches.length - 1));
        break;
      case "PageUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 8, 0));
        break;
      case "Home":
        e.preventDefault();
        setSelectedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setSelectedIndex(Math.max(0, visibleMatches.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (visibleMatches[selectedIndex]) {
          selectNode(visibleMatches[selectedIndex].nodeId);
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  }

  if (!open) return null;

  const showDualName = (result: SearchResult) =>
    result.displayType !== result.internalType;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[440px] bg-tn-panel border border-tn-border rounded-lg shadow-2xl overflow-hidden">
        <div className="p-3 border-b border-tn-border">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search nodes... (type:noise or connected:nodeId)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 text-sm bg-tn-bg border border-tn-border rounded focus:border-tn-accent focus:outline-none"
          />
          <div className="mt-1.5 text-[10px] text-tn-text-muted flex gap-3">
            <span>{matches.length} result{matches.length !== 1 ? "s" : ""}</span>
            <span className="text-tn-text-muted/50">Arrows navigate | Enter select | Esc close</span>
          </div>
        </div>
        <div ref={listRef} className="max-h-[300px] overflow-y-auto">
          {nodes.length === 0 && (
            <div className="px-3 py-4 text-sm text-tn-text-muted text-center">
              No nodes in this graph yet
            </div>
          )}
          {nodes.length > 0 && matches.length === 0 && query.trim() && (
            <div className="px-3 py-4 text-sm text-tn-text-muted text-center">
              No matching nodes found
            </div>
          )}
          {visibleMatches.map((result, i) => {
            const isSelected = i === selectedIndex;
            return (
              <button
                key={result.nodeId}
                onClick={() => selectNode(result.nodeId)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                  isSelected ? "bg-tn-accent/20" : "hover:bg-white/5"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium truncate">{result.displayType}</span>
                    {result.selected && (
                      <span className="rounded bg-tn-accent/15 px-1 text-[9px] text-tn-accent">
                        Selected
                      </span>
                    )}
                    {showDualName(result) && (
                      <span className="text-[10px] text-tn-text-muted truncate">
                        ({result.internalType})
                      </span>
                    )}
                  </div>
                  {result.label && (
                    <div className="text-[10px] text-tn-accent truncate">{result.label}</div>
                  )}
                </div>
                <span className="text-tn-text-muted text-[10px] shrink-0">
                  ({Math.round(result.position.x)}, {Math.round(result.position.y)})
                </span>
              </button>
            );
          })}
          {matches.length > MAX_VISIBLE_RESULTS && (
            <div className="px-3 py-2 text-xs text-tn-text-muted text-center">
              +{matches.length - MAX_VISIBLE_RESULTS} more results
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
