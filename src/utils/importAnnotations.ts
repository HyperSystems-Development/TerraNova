import type { Node, Edge } from "@xyflow/react";
import type { ImportMetadata } from "@/utils/hytaleToInternal";

/** Build React Flow comment/frame nodes from Hytale $NodeEditorMetadata. */
export function buildAnnotationNodesFromImportMetadata(
  metadata: ImportMetadata | null | undefined,
): Node[] {
  if (!metadata) return [];

  const nodes: Node[] = [];

  for (const comment of metadata.hytaleComments) {
    nodes.push({
      id: `comment-${crypto.randomUUID()}`,
      type: "comment",
      position: { x: comment.x, y: comment.y },
      data: {
        type: "comment",
        text: comment.text,
        width: comment.width,
        height: comment.height,
      },
      draggable: true,
      selectable: true,
    });
  }

  for (const group of metadata.hytaleGroups) {
    nodes.push({
      id: `frame-${crypto.randomUUID()}`,
      type: "frame",
      position: { x: group.x, y: group.y },
      data: {
        type: "frame",
        name: group.name,
        width: group.width,
        height: group.height,
      },
      draggable: true,
      selectable: true,
      zIndex: -1,
    });
  }

  return nodes;
}

export function hasImportAnnotations(metadata: ImportMetadata | null | undefined): boolean {
  if (!metadata) return false;
  return metadata.hytaleComments.length > 0 || metadata.hytaleGroups.length > 0;
}

/**
 * Auto-layout graph nodes, then append comment/frame nodes at their Hytale positions.
 * Annotations are excluded from layout so they are not lost or repositioned.
 */
export async function mergeImportGraph(
  nodes: Node[],
  edges: Edge[],
  metadata: ImportMetadata | null | undefined,
  layoutFn: (graphNodes: Node[], graphEdges: Edge[]) => Promise<Node[]>,
): Promise<Node[]> {
  const layouted = await layoutFn(nodes, edges);
  const annotations = buildAnnotationNodesFromImportMetadata(metadata);
  return annotations.length > 0 ? [...layouted, ...annotations] : layouted;
}
