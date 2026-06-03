/**
 * Preserve Hytale editor fields TerraNova does not edit on the canvas.
 */

export interface PreservedNodeEditorMetadata {
  $WorkspaceID?: unknown;
  $Links?: unknown;
  $FloatingNodes?: unknown;
}

/** Extract workspace/link/floating-node state from imported $NodeEditorMetadata. */
export function extractPreservedNodeEditorMetadata(
  raw?: Record<string, unknown> | null,
): PreservedNodeEditorMetadata | null {
  if (!raw || typeof raw !== "object") return null;

  const preserved: PreservedNodeEditorMetadata = {};
  if ("$WorkspaceID" in raw) {
    preserved.$WorkspaceID = raw.$WorkspaceID;
  }
  if ("$Links" in raw) {
    preserved.$Links = raw.$Links;
  }
  if ("$FloatingNodes" in raw) {
    preserved.$FloatingNodes = raw.$FloatingNodes;
  }

  return Object.keys(preserved).length > 0 ? preserved : null;
}

export function mergePreservedNodeEditorMetadata(
  generated: Record<string, unknown>,
  preserved?: PreservedNodeEditorMetadata | null,
): Record<string, unknown> {
  if (!preserved) return generated;

  if (preserved.$WorkspaceID !== undefined) {
    generated.$WorkspaceID = preserved.$WorkspaceID;
  }
  if (preserved.$Links !== undefined) {
    generated.$Links = preserved.$Links;
  }
  if (preserved.$FloatingNodes !== undefined) {
    generated.$FloatingNodes = preserved.$FloatingNodes;
  }

  return generated;
}
