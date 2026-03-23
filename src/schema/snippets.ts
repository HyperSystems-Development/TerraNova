import type { Node, Edge } from "@xyflow/react";
import { getDefaults } from "./defaults";

// ---------------------------------------------------------------------------
// Snippet data structures
// ---------------------------------------------------------------------------

export interface SnippetNodeDef {
  localId: string;
  type: string;          // React Flow node type key (e.g. "SimplexNoise2D")
  displayType: string;   // data.type value
  fields: Record<string, unknown>;
  offsetX: number;
  offsetY: number;
}

export interface SnippetEdgeDef {
  sourceLocal: string;
  targetLocal: string;
  targetHandle: string;
}

export interface SnippetDefinition {
  id: string;
  name: string;
  description: string;
  nodes: SnippetNodeDef[];
  edges: SnippetEdgeDef[];
}

// ---------------------------------------------------------------------------
// Snippet catalog
// ---------------------------------------------------------------------------

export const SNIPPET_CATALOG: SnippetDefinition[] = [
  {
    id: "ridge-noise-2d",
    name: "Ridge Noise 2D",
    description: "SimplexNoise2D piped through Abs to create ridge-like terrain",
    nodes: [
      {
        localId: "noise",
        type: "SimplexNoise2D",
        displayType: "SimplexNoise2D",
        fields: { ...getDefaults("SimplexNoise2D") },
        offsetX: 0,
        offsetY: 0,
      },
      {
        localId: "abs",
        type: "Abs",
        displayType: "Abs",
        fields: {},
        offsetX: 300,
        offsetY: 0,
      },
    ],
    edges: [
      { sourceLocal: "noise", targetLocal: "abs", targetHandle: "Input" },
    ],
  },
  {
    id: "ridge-noise-3d",
    name: "Ridge Noise 3D",
    description: "SimplexNoise3D piped through Abs to create ridge-like terrain",
    nodes: [
      {
        localId: "noise",
        type: "SimplexNoise3D",
        displayType: "SimplexNoise3D",
        fields: { ...getDefaults("SimplexNoise3D") },
        offsetX: 0,
        offsetY: 0,
      },
      {
        localId: "abs",
        type: "Abs",
        displayType: "Abs",
        fields: {},
        offsetX: 300,
        offsetY: 0,
      },
    ],
    edges: [
      { sourceLocal: "noise", targetLocal: "abs", targetHandle: "Input" },
    ],
  },
  {
    id: "height-gradient",
    name: "Height Gradient",
    description: "CoordinateY normalized to [0,1] range for height-based density",
    nodes: [
      {
        localId: "coordY",
        type: "YValue",
        displayType: "YValue",
        fields: {},
        offsetX: 0,
        offsetY: 0,
      },
      {
        localId: "normalizer",
        type: "Normalizer",
        displayType: "Normalizer",
        fields: { ...getDefaults("Normalizer") },
        offsetX: 300,
        offsetY: 0,
      },
    ],
    edges: [
      { sourceLocal: "coordY", targetLocal: "normalizer", targetHandle: "Input" },
    ],
  },
  {
    id: "linear-transform",
    name: "Linear Transform",
    description: "Scale input by a constant (AmplitudeConstant) then add an offset (Sum + Constant)",
    nodes: [
      {
        localId: "amp",
        type: "AmplitudeConstant",
        displayType: "AmplitudeConstant",
        fields: { ...getDefaults("AmplitudeConstant") },
        offsetX: 0,
        offsetY: 0,
      },
      {
        localId: "offset",
        type: "Constant",
        displayType: "Constant",
        fields: { Value: 0.0 },
        offsetX: 0,
        offsetY: 150,
      },
      {
        localId: "sum",
        type: "Sum",
        displayType: "Sum",
        fields: {},
        offsetX: 300,
        offsetY: 50,
      },
    ],
    edges: [
      { sourceLocal: "amp", targetLocal: "sum", targetHandle: "InputA" },
      { sourceLocal: "offset", targetLocal: "sum", targetHandle: "InputB" },
    ],
  },
  {
    id: "fractal-noise-2d",
    name: "Fractal Noise 2D",
    description: "SimplexNoise2D with 4 octaves for fractal-like detail",
    nodes: [
      {
        localId: "noise",
        type: "SimplexNoise2D",
        displayType: "SimplexNoise2D",
        fields: { ...getDefaults("SimplexNoise2D"), Octaves: 4 },
        offsetX: 0,
        offsetY: 0,
      },
    ],
    edges: [],
  },
  {
    id: "fractal-noise-3d",
    name: "Fractal Noise 3D",
    description: "SimplexNoise3D with 4 octaves for fractal-like detail",
    nodes: [
      {
        localId: "noise",
        type: "SimplexNoise3D",
        displayType: "SimplexNoise3D",
        fields: { ...getDefaults("SimplexNoise3D"), Octaves: 4 },
        offsetX: 0,
        offsetY: 0,
      },
    ],
    edges: [],
  },
];

// ---------------------------------------------------------------------------
// Placement helper
// ---------------------------------------------------------------------------

export function placeSnippet(
  snippet: SnippetDefinition,
  position: { x: number; y: number },
): { nodes: Node[]; edges: Edge[] } {
  // Map local IDs → generated UUIDs
  const idMap = new Map<string, string>();
  for (const nodeDef of snippet.nodes) {
    idMap.set(nodeDef.localId, crypto.randomUUID());
  }

  const nodes: Node[] = snippet.nodes.map((nodeDef) => ({
    id: idMap.get(nodeDef.localId)!,
    type: nodeDef.type,
    position: {
      x: position.x + nodeDef.offsetX,
      y: position.y + nodeDef.offsetY,
    },
    data: {
      type: nodeDef.displayType,
      fields: { ...nodeDef.fields },
    },
    selected: true,
  }));

  const edges: Edge[] = snippet.edges.map((edgeDef) => ({
    id: crypto.randomUUID(),
    source: idMap.get(edgeDef.sourceLocal)!,
    target: idMap.get(edgeDef.targetLocal)!,
    sourceHandle: "output",
    targetHandle: edgeDef.targetHandle,
  }));

  return { nodes, edges };
}
