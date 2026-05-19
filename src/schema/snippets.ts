import type { Node, Edge } from "@xyflow/react";
import { getDefaults } from "./defaults";

// ---------------------------------------------------------------------------
// Snippet data structures
// ---------------------------------------------------------------------------

export interface SnippetNodeDef {
  localId: string;
  type: string;          // React Flow node type key (e.g. "SimplexNoise2D")
  displayType: string;   // data.type value
  label?: string;        // optional friendly name shown on the node
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
  category: string;
  nodes: SnippetNodeDef[];
  edges: SnippetEdgeDef[];
}

// ---------------------------------------------------------------------------
// Snippet catalog
// ---------------------------------------------------------------------------

export const SNIPPET_CATALOG: SnippetDefinition[] = [

  // ── Density ──────────────────────────────────────────────────────────────

  {
    id: "ridge-noise-2d",
    name: "Ridge Noise 2D",
    description: "Abs of 2D noise — sharp ridges and creases on a flat surface",
    category: "Density",
    nodes: [
      { localId: "noise", type: "SimplexNoise2D", displayType: "SimplexNoise2D",
        fields: { ...getDefaults("SimplexNoise2D") }, offsetX: 0, offsetY: 0 },
      { localId: "abs", type: "Abs", displayType: "Abs",
        fields: {}, offsetX: 300, offsetY: 0 },
    ],
    edges: [
      { sourceLocal: "noise", targetLocal: "abs", targetHandle: "Input" },
    ],
  },

  {
    id: "ridge-noise-3d",
    name: "Ridge Noise 3D",
    description: "Abs of 3D noise — sharp ridges and veins through a volumetric density",
    category: "Density",
    nodes: [
      { localId: "noise", type: "SimplexNoise3D", displayType: "SimplexNoise3D",
        fields: { ...getDefaults("SimplexNoise3D") }, offsetX: 0, offsetY: 0 },
      { localId: "abs", type: "Abs", displayType: "Abs",
        fields: {}, offsetX: 300, offsetY: 0 },
    ],
    edges: [
      { sourceLocal: "noise", targetLocal: "abs", targetHandle: "Input" },
    ],
  },

  {
    id: "height-gradient",
    name: "Height Gradient",
    description: "World height mapped to 0–1 — use as a mask for surface fades or layer blending",
    category: "Density",
    nodes: [
      { localId: "coordY", type: "YValue", displayType: "YValue",
        fields: {}, offsetX: 0, offsetY: 0 },
      { localId: "normalizer", type: "Normalizer", displayType: "Normalizer",
        fields: { ...getDefaults("Normalizer") }, offsetX: 300, offsetY: 0 },
    ],
    edges: [
      { sourceLocal: "coordY", targetLocal: "normalizer", targetHandle: "Input" },
    ],
  },

  {
    id: "linear-transform",
    name: "Linear Transform",
    description: "Scale and shift any density — multiply by amplitude then add a constant offset",
    category: "Density",
    nodes: [
      { localId: "amp", type: "AmplitudeConstant", displayType: "AmplitudeConstant",
        fields: { ...getDefaults("AmplitudeConstant") }, offsetX: 0, offsetY: 0 },
      { localId: "offset", type: "Constant", displayType: "Constant",
        fields: { Value: 0.0 }, offsetX: 0, offsetY: 150 },
      { localId: "sum", type: "Sum", displayType: "Sum",
        fields: {}, offsetX: 300, offsetY: 50 },
    ],
    edges: [
      { sourceLocal: "amp",    targetLocal: "sum", targetHandle: "Inputs[0]" },
      { sourceLocal: "offset", targetLocal: "sum", targetHandle: "Inputs[1]" },
    ],
  },

  {
    id: "fractal-noise-2d",
    name: "Fractal Noise 2D",
    description: "2D noise with 4 octaves — layered detail that reads as natural rocky or hilly terrain",
    category: "Density",
    nodes: [
      { localId: "noise", type: "SimplexNoise2D", displayType: "SimplexNoise2D",
        fields: { ...getDefaults("SimplexNoise2D"), Octaves: 4 }, offsetX: 0, offsetY: 0 },
    ],
    edges: [],
  },

  {
    id: "fractal-noise-3d",
    name: "Fractal Noise 3D",
    description: "3D noise with 4 octaves — rich volumetric detail for caves, clouds, or organic masses",
    category: "Density",
    nodes: [
      { localId: "noise", type: "SimplexNoise3D", displayType: "SimplexNoise3D",
        fields: { ...getDefaults("SimplexNoise3D"), Octaves: 4 }, offsetX: 0, offsetY: 0 },
    ],
    edges: [],
  },

  {
    id: "warped-noise",
    name: "Warped Noise",
    description: "2D noise domain-warped by gradient — breaks tiling and adds organic, swirling character",
    category: "Density",
    nodes: [
      { localId: "noise", type: "SimplexNoise2D", displayType: "SimplexNoise2D",
        fields: { ...getDefaults("SimplexNoise2D") }, offsetX: 0, offsetY: 0 },
      { localId: "warp", type: "FastGradientWarp", displayType: "FastGradientWarp",
        fields: { ...getDefaults("FastGradientWarp") }, offsetX: 300, offsetY: 0 },
    ],
    edges: [
      { sourceLocal: "noise", targetLocal: "warp", targetHandle: "Input" },
    ],
  },

  {
    id: "noise-blend",
    name: "Noise Blend",
    description: "Two noise layers mixed by a third — naturally varied transitions between two density types",
    category: "Density",
    nodes: [
      { localId: "noiseA", type: "SimplexNoise2D", displayType: "SimplexNoise2D",
        fields: { ...getDefaults("SimplexNoise2D"), Seed: "A" }, offsetX: 0, offsetY: 0 },
      { localId: "noiseB", type: "SimplexNoise2D", displayType: "SimplexNoise2D",
        fields: { ...getDefaults("SimplexNoise2D"), Seed: "B", Scale: 25 }, offsetX: 0, offsetY: 150 },
      { localId: "factor", type: "SimplexNoise2D", displayType: "SimplexNoise2D",
        fields: { ...getDefaults("SimplexNoise2D"), Seed: "C", Scale: 100 }, offsetX: 0, offsetY: 300 },
      { localId: "blend", type: "Mix", displayType: "Mix",
        fields: {}, offsetX: 350, offsetY: 100 },
    ],
    edges: [
      { sourceLocal: "noiseA",  targetLocal: "blend", targetHandle: "InputA" },
      { sourceLocal: "noiseB",  targetLocal: "blend", targetHandle: "InputB" },
      { sourceLocal: "factor",  targetLocal: "blend", targetHandle: "Factor" },
    ],
  },

  // ── Terrain ───────────────────────────────────────────────────────────────

  {
    id: "solid-wedge",
    name: "Solid Wedge",
    description: "Height × depth product — a low solid ramp that thickens toward one side",
    category: "Terrain",
    nodes: [
      { localId: "coordY", type: "YValue", displayType: "YValue",
        fields: {}, offsetX: 0, offsetY: 0 },
      { localId: "coordZ", type: "ZValue", displayType: "ZValue",
        fields: {}, offsetX: 0, offsetY: 150 },
      { localId: "product", type: "Multiplier", displayType: "Multiplier",
        fields: {}, offsetX: 300, offsetY: 50 },
      { localId: "normalizer", type: "Normalizer", displayType: "Normalizer",
        fields: { ...getDefaults("Normalizer") }, offsetX: 600, offsetY: 50 },
    ],
    edges: [
      { sourceLocal: "coordY",    targetLocal: "product",    targetHandle: "Inputs[0]" },
      { sourceLocal: "coordZ",    targetLocal: "product",    targetHandle: "Inputs[1]" },
      { sourceLocal: "product",   targetLocal: "normalizer", targetHandle: "Input" },
    ],
  },

  {
    id: "noisy-wedge",
    name: "Noisy Wedge",
    description: "Ramp shape with noise added — rough, eroded edge instead of a clean slope",
    category: "Terrain",
    nodes: [
      { localId: "coordY", type: "YValue", displayType: "YValue",
        fields: {}, offsetX: 0, offsetY: 0 },
      { localId: "coordZ", type: "ZValue", displayType: "ZValue",
        fields: {}, offsetX: 0, offsetY: 150 },
      { localId: "product", type: "Multiplier", displayType: "Multiplier",
        fields: {}, offsetX: 300, offsetY: 50 },
      { localId: "noise", type: "SimplexNoise2D", displayType: "SimplexNoise2D",
        fields: { ...getDefaults("SimplexNoise2D"), Scale: 25 }, offsetX: 300, offsetY: 220 },
      { localId: "sum", type: "Sum", displayType: "Sum",
        fields: {}, offsetX: 600, offsetY: 100 },
      { localId: "normalizer", type: "Normalizer", displayType: "Normalizer",
        fields: { ...getDefaults("Normalizer") }, offsetX: 900, offsetY: 100 },
    ],
    edges: [
      { sourceLocal: "coordY",    targetLocal: "product",    targetHandle: "Inputs[0]" },
      { sourceLocal: "coordZ",    targetLocal: "product",    targetHandle: "Inputs[1]" },
      { sourceLocal: "product",   targetLocal: "sum",        targetHandle: "Inputs[0]" },
      { sourceLocal: "noise",     targetLocal: "sum",        targetHandle: "Inputs[1]" },
      { sourceLocal: "sum",       targetLocal: "normalizer", targetHandle: "Input" },
    ],
  },

  {
    id: "scooped-wedge",
    name: "Scooped Wedge",
    description: "Ramp with a hollow carved from the center — like a collapsed arch or eroded lip",
    category: "Terrain",
    nodes: [
      { localId: "coordY",  type: "YValue", displayType: "YValue",
        fields: {}, offsetX: 0, offsetY: 0 },
      { localId: "coordZ",  type: "ZValue", displayType: "ZValue",
        fields: {}, offsetX: 0, offsetY: 150 },
      { localId: "wedge",   type: "Multiplier", displayType: "Multiplier",
        fields: {}, offsetX: 300, offsetY: 50 },
      { localId: "coordX",  type: "XValue", displayType: "XValue",
        fields: {}, offsetX: 300, offsetY: 250 },
      { localId: "scoop",   type: "Multiplier", displayType: "Multiplier",
        fields: {}, offsetX: 600, offsetY: 180 },
      { localId: "smoothmin", type: "SmoothMin", displayType: "SmoothMin",
        fields: { ...getDefaults("SmoothMin") }, offsetX: 900, offsetY: 100 },
      { localId: "normalizer", type: "Normalizer", displayType: "Normalizer",
        fields: { ...getDefaults("Normalizer") }, offsetX: 1200, offsetY: 100 },
    ],
    edges: [
      { sourceLocal: "coordY",    targetLocal: "wedge",      targetHandle: "Inputs[0]" },
      { sourceLocal: "coordZ",    targetLocal: "wedge",      targetHandle: "Inputs[1]" },
      { sourceLocal: "wedge",     targetLocal: "scoop",      targetHandle: "Inputs[0]" },
      { sourceLocal: "coordX",    targetLocal: "scoop",      targetHandle: "Inputs[1]" },
      { sourceLocal: "wedge",     targetLocal: "smoothmin",  targetHandle: "Inputs[0]" },
      { sourceLocal: "scoop",     targetLocal: "smoothmin",  targetHandle: "Inputs[1]" },
      { sourceLocal: "smoothmin", targetLocal: "normalizer", targetHandle: "Input" },
    ],
  },

  {
    id: "slope-terrain",
    name: "Slope / Hillside",
    description: "Height field with noise added — a gently sloped hillside with natural variation",
    category: "Terrain",
    nodes: [
      { localId: "coordY",  type: "YValue", displayType: "YValue",
        fields: {}, offsetX: 0, offsetY: 0 },
      { localId: "noise",   type: "SimplexNoise2D", displayType: "SimplexNoise2D",
        fields: { ...getDefaults("SimplexNoise2D"), Scale: 50 }, offsetX: 0, offsetY: 150 },
      { localId: "sum",     type: "Sum", displayType: "Sum",
        fields: {}, offsetX: 300, offsetY: 50 },
      { localId: "normalizer", type: "Normalizer", displayType: "Normalizer",
        fields: { ...getDefaults("Normalizer") }, offsetX: 600, offsetY: 50 },
    ],
    edges: [
      { sourceLocal: "coordY", targetLocal: "sum",        targetHandle: "Inputs[0]" },
      { sourceLocal: "noise",  targetLocal: "sum",        targetHandle: "Inputs[1]" },
      { sourceLocal: "sum",    targetLocal: "normalizer", targetHandle: "Input" },
    ],
  },

  {
    id: "warped-surface",
    name: "Warped Surface",
    description: "Noise warped and normalized — organic, non-repeating terrain surface ready to use",
    category: "Terrain",
    nodes: [
      { localId: "noise",    type: "SimplexNoise2D", displayType: "SimplexNoise2D",
        fields: { ...getDefaults("SimplexNoise2D") }, offsetX: 0, offsetY: 0 },
      { localId: "warp",     type: "FastGradientWarp", displayType: "FastGradientWarp",
        fields: { ...getDefaults("FastGradientWarp") }, offsetX: 300, offsetY: 0 },
      { localId: "normalizer", type: "Normalizer", displayType: "Normalizer",
        fields: { ...getDefaults("Normalizer") }, offsetX: 600, offsetY: 0 },
    ],
    edges: [
      { sourceLocal: "noise", targetLocal: "warp",       targetHandle: "Input" },
      { sourceLocal: "warp",  targetLocal: "normalizer", targetHandle: "Input" },
    ],
  },

  {
    id: "scooped-wedge-funnel",
    name: "Scooped Wedge Funnel",
    description: "Wide low shape with a shallow center carved out — broad funnel lip or collapsed crater rim",
    category: "Terrain",
    nodes: [
      // Outer branch: BaseHeight -> CurveMapper (taper) -> Cuboid (broad low wedge)
      { localId: "outerHeight",  type: "BaseHeight",    displayType: "BaseHeight",
        fields: { ...getDefaults("BaseHeight"), Distance: true }, offsetX: 0, offsetY: 0 },
      { localId: "outerManual",  type: "Curve:Manual",  displayType: "Curve:Manual",
        fields: { Points: [[0, 0], [0.5, 1], [1, 0]] }, offsetX: 300, offsetY: -120 },
      { localId: "outerCurve",   type: "CurveMapper", displayType: "CurveMapper",
        fields: {}, offsetX: 300, offsetY: 0 },
      { localId: "outerCuboid",  type: "Cuboid",        displayType: "Cuboid",
        fields: { ...getDefaults("Cuboid"), Scale: { x: 1.8, y: 0.48, z: 1.2 } }, offsetX: 600, offsetY: 0 },
      // Inner branch: BaseHeight -> CurveMapper (shallower scoop) -> Cuboid (narrower)
      { localId: "innerHeight",  type: "BaseHeight",    displayType: "BaseHeight",
        fields: { ...getDefaults("BaseHeight"), Distance: true }, offsetX: 0, offsetY: 300 },
      { localId: "innerManual",  type: "Curve:Manual",  displayType: "Curve:Manual",
        fields: { Points: [[0, 0], [0.5, 0.7], [1, 0]] }, offsetX: 300, offsetY: 180 },
      { localId: "innerCurve",   type: "CurveMapper", displayType: "CurveMapper",
        fields: {}, offsetX: 300, offsetY: 300 },
      { localId: "innerCuboid",  type: "Cuboid",        displayType: "Cuboid",
        fields: { ...getDefaults("Cuboid"), Scale: { x: 0.9, y: 0.28, z: 0.7 } }, offsetX: 600, offsetY: 300 },
      // Combine: SmoothMin for soft boolean subtract (outer minus inner scoop)
      { localId: "smoothmin",    type: "SmoothMin",     displayType: "SmoothMin",
        fields: { ...getDefaults("SmoothMin") }, offsetX: 950, offsetY: 130 },
    ],
    edges: [
      // Outer taper: BaseHeight -> CurveMapper (shaped by Manual curve) -> Cuboid
      { sourceLocal: "outerHeight", targetLocal: "outerCurve",  targetHandle: "Input" },
      { sourceLocal: "outerManual", targetLocal: "outerCurve",  targetHandle: "Curve" },
      { sourceLocal: "outerCurve",  targetLocal: "outerCuboid", targetHandle: "Curve" },
      // Inner scoop: BaseHeight -> CurveMapper (shallower) -> smaller Cuboid
      { sourceLocal: "innerHeight", targetLocal: "innerCurve",  targetHandle: "Input" },
      { sourceLocal: "innerManual", targetLocal: "innerCurve",  targetHandle: "Curve" },
      { sourceLocal: "innerCurve",  targetLocal: "innerCuboid", targetHandle: "Curve" },
      // Blend: outer - inner
      { sourceLocal: "outerCuboid", targetLocal: "smoothmin",   targetHandle: "Inputs[0]" },
      { sourceLocal: "innerCuboid", targetLocal: "smoothmin",   targetHandle: "Inputs[1]" },
    ],
  },

  {
    id: "spiral-shell",
    name: "Spiral Shell",
    description: "3D noise rotated then ceiling+negate carved into a shell — the vertical version of the flat rotator+ceiling trick. Adjust AngleDegrees to spin, Ceiling for shell thickness",
    category: "Terrain",
    nodes: [
      { localId: "noise",    type: "SimplexNoise3D",  displayType: "SimplexNoise3D",
        fields: { ...getDefaults("SimplexNoise3D"), Scale: 33 }, offsetX: 0, offsetY: 0 },
      { localId: "rotate",   type: "Rotator", displayType: "Rotator",
        fields: { ...getDefaults("Rotator"), SpinAngle: 45 }, offsetX: 300, offsetY: 0 },
      { localId: "ceiling",  type: "Ceiling",         displayType: "Ceiling",
        fields: { Ceiling: 0.6 }, offsetX: 600, offsetY: 0 },
      { localId: "negate",   type: "Inverter",        displayType: "Inverter",
        fields: {}, offsetX: 900, offsetY: 0 },
    ],
    edges: [
      { sourceLocal: "noise",   targetLocal: "rotate",  targetHandle: "Input" },
      { sourceLocal: "rotate",  targetLocal: "ceiling", targetHandle: "Input" },
      { sourceLocal: "ceiling", targetLocal: "negate",  targetHandle: "Input" },
    ],
  },

  {
    id: "smooth-cave",
    name: "Cave Carve",
    description: "Height mask blended with 3D noise — smooth cave openings that feel naturally eroded",
    category: "Terrain",
    nodes: [
      { localId: "height",  type: "YValue", displayType: "YValue",
        fields: {}, offsetX: 0, offsetY: 0 },
      { localId: "hNorm",   type: "Normalizer", displayType: "Normalizer",
        fields: { ...getDefaults("Normalizer") }, offsetX: 300, offsetY: 0 },
      { localId: "caveNoise", type: "SimplexNoise3D", displayType: "SimplexNoise3D",
        fields: { ...getDefaults("SimplexNoise3D"), Scale: 20, Octaves: 2 }, offsetX: 0, offsetY: 200 },
      { localId: "abs",     type: "Abs", displayType: "Abs",
        fields: {}, offsetX: 300, offsetY: 200 },
      { localId: "smoothmin", type: "SmoothMin", displayType: "SmoothMin",
        fields: { ...getDefaults("SmoothMin") }, offsetX: 600, offsetY: 80 },
    ],
    edges: [
      { sourceLocal: "height",    targetLocal: "hNorm",     targetHandle: "Input" },
      { sourceLocal: "caveNoise", targetLocal: "abs",       targetHandle: "Input" },
      { sourceLocal: "hNorm",     targetLocal: "smoothmin", targetHandle: "Inputs[0]" },
      { sourceLocal: "abs",       targetLocal: "smoothmin", targetHandle: "Inputs[1]" },
    ],
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
      ...(nodeDef.label ? { label: nodeDef.label } : {}),
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
