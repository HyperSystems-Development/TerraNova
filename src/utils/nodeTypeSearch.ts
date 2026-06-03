import type { Node } from "@xyflow/react";
import type { CategoryDefaultsEntry } from "@/schema/defaults";
import type { BaseNodeData } from "@/nodes/shared/BaseNode";
import { resolveNodeTypeKey } from "@/utils/nodeTypeKeys";

/** All type keys to match when searching palette / quick-add entries. */
export function getEntrySearchTypeKeys(entry: CategoryDefaultsEntry): string[] {
  const bare = entry.type;
  const prefixed = resolveNodeTypeKey(entry);
  return bare === prefixed ? [bare] : [bare, prefixed];
}

export function entryMatchesSearch(
  entry: CategoryDefaultsEntry,
  query: string,
  matchesSearch: (typeName: string, query: string) => boolean,
): boolean {
  return getEntrySearchTypeKeys(entry).some((key) => matchesSearch(key, query));
}

/** Type keys for an on-canvas node (React Flow type + data.type). */
export function getGraphNodeSearchTypeKeys(node: Node): string[] {
  const data = node.data as unknown as BaseNodeData;
  const internalType = data.type ?? "";
  const rfType = node.type ?? "";
  const keys = new Set<string>();
  if (internalType) keys.add(internalType);
  if (rfType) keys.add(rfType);
  return [...keys];
}

export function graphNodeMatchesSearch(
  node: Node,
  query: string,
  matchesSearch: (typeName: string, query: string) => boolean,
): boolean {
  return getGraphNodeSearchTypeKeys(node).some((key) => matchesSearch(key, query));
}

export function graphNodeMatchesTypeFilter(
  node: Node,
  typeQuery: string,
  getTypeDisplayName: (internalType: string) => string,
): boolean {
  const q = typeQuery.toLowerCase();
  return getGraphNodeSearchTypeKeys(node).some((key) => {
    if (key.toLowerCase().includes(q)) return true;
    return getTypeDisplayName(key).toLowerCase().includes(q);
  });
}
