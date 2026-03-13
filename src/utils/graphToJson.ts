import type { Node, Edge } from "@xyflow/react";

export interface V2Asset {
  Type: string;
  [key: string]: unknown;
}

/**
 * Build a V2 JSON asset from a single root node, recursively nesting inputs.
 */
/**
 * Build a V2 JSON asset tree from a node, recursively nesting inputs.
 *
 * Uses `ancestors` (current recursion path) for cycle detection, and `visited`
 * (all serialized node IDs) for disconnected-tree tracking. Shared nodes (DAGs)
 * are serialized once per reference — this matches V2's tree-based JSON format
 * where shared inputs are duplicated inline.
 */
function buildAsset(
  nodeId: string,
  nodeMap: Map<string, Node>,
  incomingEdges: Map<string, { source: string; targetHandle: string }[]>,
  ancestors: Set<string>,
  visited: Set<string>,
): V2Asset | null {
  if (ancestors.has(nodeId)) return null; // actual cycle — break recursion

  const node = nodeMap.get(nodeId);
  if (!node) return null;

  ancestors.add(nodeId);
  visited.add(nodeId);

  const asset: V2Asset = {
    Type: (node.data as Record<string, unknown>).type as string,
    ...((node.data as Record<string, unknown>).fields as Record<string, unknown> ?? {}),
  };

  // Resolve input edges as nested assets
  const incoming = incomingEdges.get(nodeId) ?? [];
  const arrayHandlePattern = /^(.+)\[(\d+)\]$/;
  const arrayCollectors = new Map<string, { index: number; child: V2Asset }[]>();

  for (const { source, targetHandle } of incoming) {
    const child = buildAsset(source, nodeMap, incomingEdges, ancestors, visited);
    if (!child) continue;

    const match = arrayHandlePattern.exec(targetHandle);
    if (match) {
      const baseKey = match[1];
      const index = parseInt(match[2], 10);
      if (!arrayCollectors.has(baseKey)) arrayCollectors.set(baseKey, []);
      arrayCollectors.get(baseKey)!.push({ index, child });
    } else {
      asset[targetHandle] = child;
    }
  }

  for (const [baseKey, items] of arrayCollectors) {
    items.sort((a, b) => a.index - b.index);
    asset[baseKey] = items.map((item) => item.child);
  }

  ancestors.delete(nodeId); // allow re-entry from other paths (DAG support)

  return asset;
}

/**
 * Expand group nodes back to their internal constituents so they serialize
 * as normal asset trees instead of leaking the UI-only "group" type.
 */
function expandGroups(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  let currentNodes = [...nodes];
  let currentEdges = [...edges];
  let changed = true;

  while (changed) {
    changed = false;
    const nextNodes: Node[] = [];
    const nextEdges: Edge[] = [];

    for (const node of currentNodes) {
      if (node.type !== "group") {
        nextNodes.push(node);
        continue;
      }

      changed = true;
      const data = node.data as Record<string, unknown>;
      const internalNodes = (data.internalNodes as Node[]) ?? [];
      const internalEdges = (data.internalEdges as Edge[]) ?? [];
      const connectionMap = (data.externalConnectionMap as {
        originalNodeId: string;
        handleId: string;
        direction: "in" | "out";
      }[]) ?? [];

      // Restore internal nodes (offset to group position)
      const offsetX = node.position.x - (internalNodes[0]?.position.x ?? 0);
      const offsetY = node.position.y - (internalNodes[0]?.position.y ?? 0);
      for (const n of internalNodes) {
        nextNodes.push({
          ...n,
          position: { x: n.position.x + offsetX, y: n.position.y + offsetY },
        });
      }

      // Restore internal edges
      nextEdges.push(...internalEdges);

      // Rewire external edges that pointed to/from the group
      for (const e of currentEdges) {
        if (e.target === node.id) {
          const mapping = connectionMap.find((m) => m.direction === "in" && m.handleId === (e.targetHandle ?? "input"));
          if (mapping) {
            nextEdges.push({ ...e, target: mapping.originalNodeId, targetHandle: mapping.handleId });
          }
        } else if (e.source === node.id) {
          const mapping = connectionMap.find((m) => m.direction === "out" && m.handleId === (e.sourceHandle ?? "output"));
          if (mapping) {
            nextEdges.push({ ...e, source: mapping.originalNodeId, sourceHandle: mapping.handleId });
          }
        }
      }
    }

    // Keep edges that aren't connected to any group node
    if (changed) {
      const groupIds = new Set(currentNodes.filter((n) => n.type === "group").map((n) => n.id));
      for (const e of currentEdges) {
        if (!groupIds.has(e.source) && !groupIds.has(e.target)) {
          nextEdges.push(e);
        }
      }
      currentNodes = nextNodes;
      currentEdges = nextEdges;
    }
  }

  return { nodes: currentNodes, edges: currentEdges };
}

/**
 * Build shared data structures for serialization.
 */
function prepareGraphData(nodes: Node[], edges: Edge[]) {
  // Build adjacency: target node ID → { sourceNodeId, targetHandle }
  const incomingEdges = new Map<string, { source: string; targetHandle: string }[]>();
  for (const edge of edges) {
    const list = incomingEdges.get(edge.target) ?? [];
    list.push({ source: edge.source, targetHandle: edge.targetHandle ?? "input" });
    incomingEdges.set(edge.target, list);
  }

  const nodeMap = new Map<string, Node>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  // Root nodes have no outgoing edges (no one uses them as a source)
  const sourceIds = new Set(edges.map((e) => e.source));
  const rootCandidates = nodes.filter((n) => !sourceIds.has(n.id));

  return { incomingEdges, nodeMap, rootCandidates };
}

/**
 * Convert React Flow graph state into a V2 JSON structure.
 * Returns the first root's asset tree (backwards-compatible convenience wrapper).
 */
export function graphToJson(nodes: Node[], edges: Edge[]): V2Asset | null {
  if (nodes.length === 0) return null;

  const expanded = expandGroups(nodes, edges);
  const { incomingEdges, nodeMap, rootCandidates } = prepareGraphData(expanded.nodes, expanded.edges);

  // Check for user-designated output node first
  const outputNode = expanded.nodes.find(
    (n) => (n.data as Record<string, unknown>)._outputNode === true,
  );

  if (rootCandidates.length === 0 && !outputNode) {
    console.warn("graphToJson: no root node found (all nodes are edge sources); falling back to first node");
  }

  let primaryRoot: Node;
  let otherRoots: Node[];

  if (outputNode) {
    primaryRoot = outputNode;
    otherRoots = rootCandidates.filter((n) => n.id !== outputNode.id);
  } else {
    const roots = rootCandidates.length > 0 ? rootCandidates : [expanded.nodes[0]];
    primaryRoot = roots[0];
    otherRoots = roots.slice(1);
  }

  const ancestors = new Set<string>();
  const visited = new Set<string>();

  // Serialize the primary root tree
  const rootAsset = buildAsset(primaryRoot.id, nodeMap, incomingEdges, ancestors, visited);
  if (!rootAsset) return null;

  // Serialize any disconnected subtrees that weren't visited
  const disconnected: V2Asset[] = [];
  for (const root of otherRoots) {
    if (visited.has(root.id)) continue;
    const subtree = buildAsset(root.id, nodeMap, incomingEdges, ancestors, visited);
    if (subtree) disconnected.push(subtree);
  }

  if (disconnected.length > 0) {
    rootAsset.$DisconnectedTrees = disconnected;
  }

  return rootAsset;
}

/**
 * Convert React Flow graph state into V2 JSON structures for ALL disconnected subtrees.
 * Returns one V2Asset per root node.
 */
export function graphToJsonMulti(nodes: Node[], edges: Edge[]): V2Asset[] {
  if (nodes.length === 0) return [];

  const expanded = expandGroups(nodes, edges);
  const { incomingEdges, nodeMap, rootCandidates } = prepareGraphData(expanded.nodes, expanded.edges);

  const roots = rootCandidates.length > 0 ? rootCandidates : [expanded.nodes[0]];

  // Put the designated output node first if present
  const outputIdx = roots.findIndex(
    (n) => (n.data as Record<string, unknown>)._outputNode === true,
  );
  if (outputIdx > 0) {
    const [outputRoot] = roots.splice(outputIdx, 1);
    roots.unshift(outputRoot);
  }

  const results: V2Asset[] = [];
  for (const root of roots) {
    const asset = buildAsset(root.id, nodeMap, incomingEdges, new Set(), new Set());
    if (asset) results.push(asset);
  }

  return results;
}
