import type { Node, Edge } from "@xyflow/react";

export interface ClipboardData {
  version: "1";
  nodes: Node[];
  edges: Edge[];
}

const NODEGRAPH_FENCE_REGEX = /^```nodegraph\s*([\s\S]*?)\s*```$/i;

function isClipboardData(value: unknown): value is ClipboardData {
  return Boolean(
    value &&
    typeof value === "object" &&
    (value as ClipboardData).version === "1" &&
    Array.isArray((value as ClipboardData).nodes) &&
    Array.isArray((value as ClipboardData).edges),
  );
}

function extractClipboardData(value: unknown): ClipboardData | null {
  if (isClipboardData(value)) return value;
  if (
    value &&
    typeof value === "object" &&
    "clipboardData" in value &&
    isClipboardData((value as { clipboardData?: unknown }).clipboardData)
  ) {
    return (value as { clipboardData: ClipboardData }).clipboardData;
  }
  return null;
}

function parseClipboardText(text: string): ClipboardData | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return extractClipboardData(JSON.parse(trimmed));
  } catch {
    // Not direct JSON, continue.
  }

  const fencedMatch = trimmed.match(NODEGRAPH_FENCE_REGEX);
  if (!fencedMatch) return null;

  try {
    return extractClipboardData(JSON.parse(fencedMatch[1].trim()));
  } catch {
    return null;
  }
}

/**
 * Copy the selected nodes and their internal edges to the system clipboard.
 * Returns the ClipboardData for use as an internal fallback.
 */
export function copyNodesToClipboard(
  nodes: Node[],
  edges: Edge[],
  selectedNodeIds?: Iterable<string>,
): ClipboardData | null {
  const selectedIdSet = selectedNodeIds ? new Set(selectedNodeIds) : null;
  const selected = nodes.filter((n) => selectedIdSet ? selectedIdSet.has(n.id) : n.selected);
  if (selected.length === 0) return null;

  const selectedIds = new Set(selected.map((n) => n.id));

  // Keep only edges where both endpoints are in the selection
  const internalEdges = edges.filter(
    (e) => selectedIds.has(e.source) && selectedIds.has(e.target),
  );

  const data: ClipboardData = {
    version: "1",
    nodes: structuredClone(selected),
    edges: structuredClone(internalEdges),
  };

  // Write to system clipboard (fire-and-forget)
  try {
    navigator.clipboard.writeText(JSON.stringify(data));
  } catch {
    // Clipboard API may not be available (e.g. Tauri, non-secure context)
  }

  return data;
}

/**
 * Generate new nodes/edges from clipboard data with fresh UUIDs and offset positions.
 * All pasted nodes are marked as selected.
 */
export function pasteNodesFromClipboard(
  clipboardData: ClipboardData,
  offsetX: number = 50,
  offsetY: number = 50,
): { nodes: Node[]; edges: Edge[] } {
  // Build old-ID → new-ID map
  const idMap = new Map<string, string>();
  for (const node of clipboardData.nodes) {
    idMap.set(node.id, crypto.randomUUID());
  }

  const nodes: Node[] = clipboardData.nodes.map((n) => ({
    ...structuredClone(n),
    id: idMap.get(n.id)!,
    position: { x: n.position.x + offsetX, y: n.position.y + offsetY },
    selected: true,
  }));

  const edges: Edge[] = clipboardData.edges.map((e) => ({
    ...structuredClone(e),
    id: crypto.randomUUID(),
    source: idMap.get(e.source) ?? e.source,
    target: idMap.get(e.target) ?? e.target,
  }));

  return { nodes, edges };
}

/**
 * Read clipboard data from the system clipboard.
 * Returns null if the clipboard doesn't contain valid TerraNova node data.
 */
export async function readClipboardData(): Promise<ClipboardData | null> {
  try {
    const text = await navigator.clipboard.readText();
    return parseClipboardText(text);
  } catch {
    // Clipboard not available
  }
  return null;
}
