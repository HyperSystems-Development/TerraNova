import type { Node, Edge } from "@xyflow/react";
import { DENSITY_DEFAULTS } from "./defaults";

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
      { localId: "noise", type: "SimplexNoise2D", displayType: "SimplexNoise2D", label: "Ridge Source",
        fields: { ...DENSITY_DEFAULTS.SimplexNoise2D }, offsetX: 0, offsetY: 0 },
      { localId: "abs", type: "Abs", displayType: "Abs", label: "Ridge Fold",
        fields: {}, offsetX: 300, offsetY: 0 },
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
      { localId: "noise", type: "SimplexNoise3D", displayType: "SimplexNoise3D", label: "Ridge Source",
        fields: { ...DENSITY_DEFAULTS.SimplexNoise3D }, offsetX: 0, offsetY: 0 },
      { localId: "abs", type: "Abs", displayType: "Abs", label: "Ridge Fold",
        fields: {}, offsetX: 300, offsetY: 0 },
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
      { localId: "coordY", type: "CoordinateY", displayType: "CoordinateY", label: "World Height",
        fields: {}, offsetX: 0, offsetY: 0 },
      { localId: "normalizer", type: "Normalizer", displayType: "Normalizer", label: "Remap 0–1",
        fields: { ...DENSITY_DEFAULTS.Normalizer }, offsetX: 300, offsetY: 0 },
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
      { localId: "amp", type: "AmplitudeConstant", displayType: "AmplitudeConstant", label: "Scale",
        fields: { ...DENSITY_DEFAULTS.AmplitudeConstant }, offsetX: 0, offsetY: 0 },
      { localId: "offset", type: "Constant", displayType: "Constant", label: "Offset",
        fields: { Value: 0.0 }, offsetX: 0, offsetY: 150 },
      { localId: "sum", type: "Sum", displayType: "Sum", label: "Output",
        fields: {}, offsetX: 300, offsetY: 50 },
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
        fields: { ...DENSITY_DEFAULTS.SimplexNoise2D, Octaves: 4 },
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
        fields: { ...DENSITY_DEFAULTS.SimplexNoise3D, Octaves: 4 },
        offsetX: 0,
        offsetY: 0,
      },
    ],
    edges: [],
  },

  {
    id: "warped-noise",
    name: "Warped Noise",
    description: "2D noise domain-warped by gradient — breaks tiling and adds organic, swirling character",
    category: "Density",
    nodes: [
      { localId: "noise", type: "SimplexNoise2D", displayType: "SimplexNoise2D", label: "Base Noise",
        fields: { ...DENSITY_DEFAULTS.SimplexNoise2D }, offsetX: 0, offsetY: 0 },
      { localId: "warp", type: "FastGradientWarp", displayType: "FastGradientWarp", label: "Gradient Warp",
        fields: { ...DENSITY_DEFAULTS.FastGradientWarp }, offsetX: 300, offsetY: 0 },
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
      { localId: "noiseA", type: "SimplexNoise2D", displayType: "SimplexNoise2D", label: "Layer A",
        fields: { ...DENSITY_DEFAULTS.SimplexNoise2D, Seed: "A" }, offsetX: 0, offsetY: 0 },
      { localId: "noiseB", type: "SimplexNoise2D", displayType: "SimplexNoise2D", label: "Layer B",
        fields: { ...DENSITY_DEFAULTS.SimplexNoise2D, Seed: "B", Scale: 25 }, offsetX: 0, offsetY: 150 },
      { localId: "factor", type: "SimplexNoise2D", displayType: "SimplexNoise2D", label: "Blend Mask",
        fields: { ...DENSITY_DEFAULTS.SimplexNoise2D, Seed: "C", Scale: 100 }, offsetX: 0, offsetY: 300 },
      { localId: "blend", type: "Blend", displayType: "Blend", label: "Mix",
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
      { localId: "coordY", type: "CoordinateY", displayType: "CoordinateY", label: "Height",
        fields: {}, offsetX: 0, offsetY: 0 },
      { localId: "coordZ", type: "CoordinateZ", displayType: "CoordinateZ", label: "Depth",
        fields: {}, offsetX: 0, offsetY: 150 },
      { localId: "product", type: "Product", displayType: "Product", label: "Wedge Shape",
        fields: {}, offsetX: 300, offsetY: 50 },
      { localId: "normalizer", type: "Normalizer", displayType: "Normalizer", label: "Normalize",
        fields: { ...DENSITY_DEFAULTS.Normalizer }, offsetX: 600, offsetY: 50 },
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
      { localId: "coordY", type: "CoordinateY", displayType: "CoordinateY", label: "Height",
        fields: {}, offsetX: 0, offsetY: 0 },
      { localId: "coordZ", type: "CoordinateZ", displayType: "CoordinateZ", label: "Depth",
        fields: {}, offsetX: 0, offsetY: 150 },
      { localId: "product", type: "Product", displayType: "Product", label: "Wedge Shape",
        fields: {}, offsetX: 300, offsetY: 50 },
      { localId: "noise", type: "SimplexNoise2D", displayType: "SimplexNoise2D", label: "Edge Erosion",
        fields: { ...DENSITY_DEFAULTS.SimplexNoise2D, Scale: 25 }, offsetX: 300, offsetY: 220 },
      { localId: "sum", type: "Sum", displayType: "Sum", label: "Add Noise",
        fields: {}, offsetX: 600, offsetY: 100 },
      { localId: "normalizer", type: "Normalizer", displayType: "Normalizer", label: "Normalize",
        fields: { ...DENSITY_DEFAULTS.Normalizer }, offsetX: 900, offsetY: 100 },
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
      { localId: "coordY",  type: "CoordinateY", displayType: "CoordinateY", label: "Height",
        fields: {}, offsetX: 0, offsetY: 0 },
      { localId: "coordZ",  type: "CoordinateZ", displayType: "CoordinateZ", label: "Depth",
        fields: {}, offsetX: 0, offsetY: 150 },
      { localId: "wedge",   type: "Product", displayType: "Product", label: "Wedge Shape",
        fields: {}, offsetX: 300, offsetY: 50 },
      { localId: "coordX",  type: "CoordinateX", displayType: "CoordinateX", label: "Width",
        fields: {}, offsetX: 300, offsetY: 250 },
      { localId: "scoop",   type: "Product", displayType: "Product", label: "Scoop Shape",
        fields: {}, offsetX: 600, offsetY: 180 },
      { localId: "smoothmin", type: "SmoothMin", displayType: "SmoothMin", label: "Soft Carve",
        fields: { ...DENSITY_DEFAULTS.SmoothMin }, offsetX: 900, offsetY: 100 },
      { localId: "normalizer", type: "Normalizer", displayType: "Normalizer", label: "Normalize",
        fields: { ...DENSITY_DEFAULTS.Normalizer }, offsetX: 1200, offsetY: 100 },
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
      { localId: "coordY",  type: "CoordinateY", displayType: "CoordinateY", label: "Height",
        fields: {}, offsetX: 0, offsetY: 0 },
      { localId: "noise",   type: "SimplexNoise2D", displayType: "SimplexNoise2D", label: "Surface Detail",
        fields: { ...DENSITY_DEFAULTS.SimplexNoise2D, Scale: 50 }, offsetX: 0, offsetY: 150 },
      { localId: "sum",     type: "Sum", displayType: "Sum", label: "Slope + Noise",
        fields: {}, offsetX: 300, offsetY: 50 },
      { localId: "normalizer", type: "Normalizer", displayType: "Normalizer", label: "Normalize",
        fields: { ...DENSITY_DEFAULTS.Normalizer }, offsetX: 600, offsetY: 50 },
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
      { localId: "noise",    type: "SimplexNoise2D", displayType: "SimplexNoise2D", label: "Base Terrain",
        fields: { ...DENSITY_DEFAULTS.SimplexNoise2D }, offsetX: 0, offsetY: 0 },
      { localId: "warp",     type: "FastGradientWarp", displayType: "FastGradientWarp", label: "Distort",
        fields: { ...DENSITY_DEFAULTS.FastGradientWarp }, offsetX: 300, offsetY: 0 },
      { localId: "normalizer", type: "Normalizer", displayType: "Normalizer", label: "Normalize",
        fields: { ...DENSITY_DEFAULTS.Normalizer }, offsetX: 600, offsetY: 0 },
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
      // Outer branch: BaseHeight → CurveFunction (taper) → Cuboid (broad low wedge)
      { localId: "outerHeight",  type: "BaseHeight",    displayType: "BaseHeight",    label: "Outer Height",
        fields: { ...DENSITY_DEFAULTS.BaseHeight, Distance: true }, offsetX: 0, offsetY: 0 },
      { localId: "outerManual",  type: "Curve:Manual",  displayType: "Curve:Manual",  label: "Outer Taper",
        fields: { Points: [[0, 0], [0.5, 1], [1, 0]] }, offsetX: 300, offsetY: -120 },
      { localId: "outerCurve",   type: "CurveFunction", displayType: "CurveFunction", label: "Outer Curve",
        fields: {}, offsetX: 300, offsetY: 0 },
      { localId: "outerCuboid",  type: "Cuboid",        displayType: "Cuboid",        label: "Outer Shell",
        fields: { ...DENSITY_DEFAULTS.Cuboid, Scale: { x: 1.8, y: 0.48, z: 1.2 } }, offsetX: 600, offsetY: 0 },
      // Inner branch: BaseHeight → CurveFunction (shallower scoop) → Cuboid (narrower)
      { localId: "innerHeight",  type: "BaseHeight",    displayType: "BaseHeight",    label: "Inner Height",
        fields: { ...DENSITY_DEFAULTS.BaseHeight, Distance: true }, offsetX: 0, offsetY: 300 },
      { localId: "innerManual",  type: "Curve:Manual",  displayType: "Curve:Manual",  label: "Inner Scoop",
        fields: { Points: [[0, 0], [0.5, 0.7], [1, 0]] }, offsetX: 300, offsetY: 180 },
      { localId: "innerCurve",   type: "CurveFunction", displayType: "CurveFunction", label: "Inner Curve",
        fields: {}, offsetX: 300, offsetY: 300 },
      { localId: "innerCuboid",  type: "Cuboid",        displayType: "Cuboid",        label: "Inner Shell",
        fields: { ...DENSITY_DEFAULTS.Cuboid, Scale: { x: 0.9, y: 0.28, z: 0.7 } }, offsetX: 600, offsetY: 300 },
      // Combine: SmoothMin for soft boolean subtract (outer minus inner scoop)
      { localId: "smoothmin",    type: "SmoothMin",     displayType: "SmoothMin",     label: "Carve Funnel",
        fields: { ...DENSITY_DEFAULTS.SmoothMin }, offsetX: 950, offsetY: 130 },
    ],
    edges: [
      // Outer taper: BaseHeight → CurveFunction (shaped by Manual curve) → Cuboid
      { sourceLocal: "outerHeight", targetLocal: "outerCurve",  targetHandle: "Input" },
      { sourceLocal: "outerManual", targetLocal: "outerCurve",  targetHandle: "Curve" },
      { sourceLocal: "outerCurve",  targetLocal: "outerCuboid", targetHandle: "Curve" },
      // Inner scoop: BaseHeight → CurveFunction (shallower) → smaller Cuboid
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
    description: "3D noise twisted around the Y axis — rotation angle increases with height for a true vertical corkscrew. Adjust Angle to control twist rate, Ceiling for shell thickness",
    category: "Terrain",
    nodes: [
      { localId: "noise",   type: "SimplexNoise3D", displayType: "SimplexNoise3D", label: "Shell Noise",
        fields: { ...DENSITY_DEFAULTS.SimplexNoise3D, Scale: 33 }, offsetX: 0, offsetY: 0 },
      { localId: "twist",   type: "PositionsTwist", displayType: "PositionsTwist", label: "Corkscrew",
        fields: { ...DENSITY_DEFAULTS.PositionsTwist, Angle: 45.0 }, offsetX: 300, offsetY: 0 },
      { localId: "ceiling", type: "Ceiling",        displayType: "Ceiling",        label: "Shell Thickness",
        fields: { Ceiling: 0.6 }, offsetX: 600, offsetY: 0 },
      { localId: "negate",  type: "Negate",         displayType: "Negate",         label: "Solid Inside",
        fields: {}, offsetX: 900, offsetY: 0 },
    ],
    edges: [
      { sourceLocal: "noise",   targetLocal: "twist",   targetHandle: "Input" },
      { sourceLocal: "twist",   targetLocal: "ceiling", targetHandle: "Input" },
      { sourceLocal: "ceiling", targetLocal: "negate",  targetHandle: "Input" },
    ],
  },

  {
    id: "double-helix",
    name: "Double Helix",
    description: "Two intertwined helical tubes — offset strands twisted around the Y axis. Adjust Angle for twist rate, Translation X for strand separation, Ceiling for tube thickness",
    category: "Terrain",
    nodes: [
      // Shared noise source
      { localId: "noise",    type: "SimplexNoise3D",     displayType: "SimplexNoise3D",     label: "Helix Noise",
        fields: { ...DENSITY_DEFAULTS.SimplexNoise3D, Scale: 8 }, offsetX: 0, offsetY: 100 },

      // Strand A: offset +X, twist, threshold
      { localId: "transA",   type: "TranslatedPosition", displayType: "TranslatedPosition", label: "Strand A Offset",
        fields: { Translation: { x: 4, y: 0, z: 0 } }, offsetX: 300, offsetY: 0 },
      { localId: "twistA",   type: "PositionsTwist",     displayType: "PositionsTwist",     label: "Strand A Twist",
        fields: { ...DENSITY_DEFAULTS.PositionsTwist, Angle: 60.0 }, offsetX: 600, offsetY: 0 },
      { localId: "ceilA",    type: "Ceiling",            displayType: "Ceiling",            label: "Strand A Tube",
        fields: { Ceiling: 0.3 }, offsetX: 900, offsetY: 0 },
      { localId: "negA",     type: "Negate",             displayType: "Negate",             label: "Strand A Solid",
        fields: {}, offsetX: 1200, offsetY: 0 },

      // Strand B: offset -X, same twist rate, 180° out of phase
      { localId: "transB",   type: "TranslatedPosition", displayType: "TranslatedPosition", label: "Strand B Offset",
        fields: { Translation: { x: -4, y: 0, z: 0 } }, offsetX: 300, offsetY: 200 },
      { localId: "twistB",   type: "PositionsTwist",     displayType: "PositionsTwist",     label: "Strand B Twist",
        fields: { ...DENSITY_DEFAULTS.PositionsTwist, Angle: 60.0 }, offsetX: 600, offsetY: 200 },
      { localId: "ceilB",    type: "Ceiling",            displayType: "Ceiling",            label: "Strand B Tube",
        fields: { Ceiling: 0.3 }, offsetX: 900, offsetY: 200 },
      { localId: "negB",     type: "Negate",             displayType: "Negate",             label: "Strand B Solid",
        fields: {}, offsetX: 1200, offsetY: 200 },

      // Union both strands
      { localId: "union",    type: "SmoothMax",          displayType: "SmoothMax",          label: "Union Strands",
        fields: { ...DENSITY_DEFAULTS.SmoothMax, Smoothness: 0.5 }, offsetX: 1500, offsetY: 100 },
    ],
    edges: [
      // Strand A: noise → transA → twistA → ceilA → negA
      { sourceLocal: "noise",  targetLocal: "transA", targetHandle: "Input" },
      { sourceLocal: "transA", targetLocal: "twistA", targetHandle: "Input" },
      { sourceLocal: "twistA", targetLocal: "ceilA",  targetHandle: "Input" },
      { sourceLocal: "ceilA",  targetLocal: "negA",   targetHandle: "Input" },
      // Strand B: noise → transB → twistB → ceilB → negB
      { sourceLocal: "noise",  targetLocal: "transB", targetHandle: "Input" },
      { sourceLocal: "transB", targetLocal: "twistB", targetHandle: "Input" },
      { sourceLocal: "twistB", targetLocal: "ceilB",  targetHandle: "Input" },
      { sourceLocal: "ceilB",  targetLocal: "negB",   targetHandle: "Input" },
      // Union
      { sourceLocal: "negA",   targetLocal: "union",  targetHandle: "Inputs[0]" },
      { sourceLocal: "negB",   targetLocal: "union",  targetHandle: "Inputs[1]" },
    ],
  },

  {
    id: "smooth-cave",
    name: "Cave Carve",
    description: "Height mask blended with 3D noise — smooth cave openings that feel naturally eroded",
    category: "Terrain",
    nodes: [
      { localId: "height",  type: "CoordinateY",    displayType: "CoordinateY",    label: "Height",
        fields: {}, offsetX: 0, offsetY: 0 },
      { localId: "hNorm",   type: "Normalizer",     displayType: "Normalizer",     label: "Height Mask",
        fields: { ...DENSITY_DEFAULTS.Normalizer }, offsetX: 300, offsetY: 0 },
      { localId: "caveNoise", type: "SimplexNoise3D", displayType: "SimplexNoise3D", label: "Cave Shape",
        fields: { ...DENSITY_DEFAULTS.SimplexNoise3D, Scale: 20, Octaves: 2 }, offsetX: 0, offsetY: 200 },
      { localId: "abs",     type: "Abs",            displayType: "Abs",            label: "Cave Ridge",
        fields: {}, offsetX: 300, offsetY: 200 },
      { localId: "smoothmin", type: "SmoothMin",    displayType: "SmoothMin",      label: "Blend Carve",
        fields: { ...DENSITY_DEFAULTS.SmoothMin }, offsetX: 600, offsetY: 80 },
    ],
    edges: [
      { sourceLocal: "height",    targetLocal: "hNorm",     targetHandle: "Input" },
      { sourceLocal: "caveNoise", targetLocal: "abs",       targetHandle: "Input" },
      { sourceLocal: "hNorm",     targetLocal: "smoothmin", targetHandle: "Inputs[0]" },
      { sourceLocal: "abs",       targetLocal: "smoothmin", targetHandle: "Inputs[1]" },
    ],
  },

  {
    id: "voronoi-cracks",
    name: "Voronoi Cracks",
    description: "Cell wall distance negated — sharp crack-like seams between Voronoi cells, great for cracked earth or stone veins",
    category: "Terrain",
    nodes: [
      { localId: "cell",    type: "CellWallDistance", displayType: "CellWallDistance", label: "Cell Walls",
        fields: { ...DENSITY_DEFAULTS.CellWallDistance, Frequency: 0.05 }, offsetX: 0, offsetY: 0 },
      { localId: "abs",     type: "Abs",              displayType: "Abs",              label: "Crack Width",
        fields: {}, offsetX: 300, offsetY: 0 },
      { localId: "negate",  type: "Negate",           displayType: "Negate",           label: "Solid Cracks",
        fields: {}, offsetX: 600, offsetY: 0 },
    ],
    edges: [
      { sourceLocal: "cell",   targetLocal: "abs",    targetHandle: "Input" },
      { sourceLocal: "abs",    targetLocal: "negate", targetHandle: "Input" },
    ],
  },

  {
    id: "radial-gradient",
    name: "Radial Gradient",
    description: "Distance from Y axis normalized to 0–1 — a radial mask that fades from center outward, ideal for pillars or craters",
    category: "Terrain",
    nodes: [
      { localId: "dist",       type: "DistanceFromAxis", displayType: "DistanceFromAxis", label: "Radial Distance",
        fields: { ...DENSITY_DEFAULTS.DistanceFromAxis, Axis: "Y" }, offsetX: 0, offsetY: 0 },
      { localId: "normalizer", type: "Normalizer",       displayType: "Normalizer",       label: "Normalize Radial",
        fields: { ...DENSITY_DEFAULTS.Normalizer }, offsetX: 300, offsetY: 0 },
      { localId: "negate",     type: "Negate",           displayType: "Negate",           label: "Center Fill",
        fields: {}, offsetX: 600, offsetY: 0 },
    ],
    edges: [
      { sourceLocal: "dist",   targetLocal: "normalizer", targetHandle: "Input" },
      { sourceLocal: "normalizer", targetLocal: "negate", targetHandle: "Input" },
    ],
  },

  {
    id: "terraced-slope",
    name: "Terraced Slope",
    description: "Quantized height field — steps instead of a smooth ramp, like carved stone terraces or layered sediment",
    category: "Terrain",
    nodes: [
      { localId: "height",  type: "CoordinateY",       displayType: "CoordinateY",       label: "Height",
        fields: {}, offsetX: 0, offsetY: 0 },
      { localId: "quant",   type: "QuantizedPosition", displayType: "QuantizedPosition", label: "Terrace Steps",
        fields: { ...DENSITY_DEFAULTS.QuantizedPosition, StepSize: 8.0 }, offsetX: 300, offsetY: 0 },
      { localId: "noise",   type: "SimplexNoise2D",    displayType: "SimplexNoise2D",    label: "Edge Roughness",
        fields: { ...DENSITY_DEFAULTS.SimplexNoise2D, Scale: 15 }, offsetX: 300, offsetY: 200 },
      { localId: "sum",     type: "Sum",               displayType: "Sum",               label: "Add Detail",
        fields: {}, offsetX: 600, offsetY: 80 },
      { localId: "normalizer", type: "Normalizer",     displayType: "Normalizer",        label: "Normalize",
        fields: { ...DENSITY_DEFAULTS.Normalizer }, offsetX: 900, offsetY: 80 },
    ],
    edges: [
      { sourceLocal: "height", targetLocal: "quant",      targetHandle: "Input" },
      { sourceLocal: "quant",  targetLocal: "sum",        targetHandle: "Inputs[0]" },
      { sourceLocal: "noise",  targetLocal: "sum",        targetHandle: "Inputs[1]" },
      { sourceLocal: "sum",    targetLocal: "normalizer", targetHandle: "Input" },
    ],
  },

  {
    id: "symmetric-terrain",
    name: "Symmetric Terrain",
    description: "Mirrored noise — bilaterally symmetric terrain for structured landscapes, dungeons, or mirrored cave systems",
    category: "Terrain",
    nodes: [
      { localId: "mirror",  type: "MirroredPosition", displayType: "MirroredPosition", label: "Mirror X",
        fields: { ...DENSITY_DEFAULTS.MirroredPosition, Axis: "X" }, offsetX: 0, offsetY: 0 },
      { localId: "noiseA",  type: "SimplexNoise3D",   displayType: "SimplexNoise3D",   label: "Primary Shape",
        fields: { ...DENSITY_DEFAULTS.SimplexNoise3D, Scale: 30, Octaves: 3 }, offsetX: 300, offsetY: 0 },
      { localId: "noiseB",  type: "SimplexNoise2D",   displayType: "SimplexNoise2D",   label: "Surface Detail",
        fields: { ...DENSITY_DEFAULTS.SimplexNoise2D, Scale: 10, Seed: "B" }, offsetX: 300, offsetY: 200 },
      { localId: "sum",     type: "Sum",              displayType: "Sum",              label: "Combine",
        fields: {}, offsetX: 600, offsetY: 80 },
      { localId: "normalizer", type: "Normalizer",    displayType: "Normalizer",       label: "Normalize",
        fields: { ...DENSITY_DEFAULTS.Normalizer }, offsetX: 900, offsetY: 80 },
    ],
    edges: [
      { sourceLocal: "mirror", targetLocal: "noiseA",     targetHandle: "Input" },
      { sourceLocal: "noiseA", targetLocal: "sum",        targetHandle: "Inputs[0]" },
      { sourceLocal: "noiseB", targetLocal: "sum",        targetHandle: "Inputs[1]" },
      { sourceLocal: "sum",    targetLocal: "normalizer", targetHandle: "Input" },
    ],
  },

  {
    id: "radial-stripes",
    name: "Radial Stripes",
    description: "Angle from origin run through Modulo — repeating wedge sectors like sunburst rays or sliced pie patterns",
    category: "Terrain",
    nodes: [
      { localId: "angle",    type: "AngleFromOrigin", displayType: "AngleFromOrigin", label: "Polar Angle",
        fields: {}, offsetX: 0, offsetY: 0 },
      { localId: "modulo",   type: "Modulo",          displayType: "Modulo",          label: "Stripe Repeat",
        fields: { Modulus: 45.0 }, offsetX: 300, offsetY: 0 },
      { localId: "normalizer", type: "Normalizer",    displayType: "Normalizer",      label: "Normalize",
        fields: { ...DENSITY_DEFAULTS.Normalizer }, offsetX: 600, offsetY: 0 },
    ],
    edges: [
      { sourceLocal: "angle",  targetLocal: "modulo",     targetHandle: "Input" },
      { sourceLocal: "modulo", targetLocal: "normalizer", targetHandle: "Input" },
    ],
  },

  {
    id: "stalactites",
    name: "Stalactites",
    description: "Beard density with 3D noise — downward-hanging spikes that look like cave stalactites or roots",
    category: "Terrain",
    nodes: [
      { localId: "noise",  type: "SimplexNoise3D", displayType: "SimplexNoise3D", label: "Spike Shape",
        fields: { ...DENSITY_DEFAULTS.SimplexNoise3D, Scale: 12, Octaves: 2 }, offsetX: 0, offsetY: 0 },
      { localId: "beard",  type: "BeardDensity",   displayType: "BeardDensity",   label: "Drape Down",
        fields: {}, offsetX: 300, offsetY: 0 },
    ],
    edges: [
      { sourceLocal: "noise", targetLocal: "beard", targetHandle: "Input" },
    ],
  },

  {
    id: "height-threshold",
    name: "Height Threshold",
    description: "Hard cutoff at a specific height — everything below the threshold is solid, everything above is air. A clean foundation for layered terrain",
    category: "Terrain",
    nodes: [
      { localId: "height",    type: "CoordinateY",  displayType: "CoordinateY",  label: "World Height",
        fields: {}, offsetX: 0, offsetY: 0 },
      { localId: "threshold", type: "Constant",     displayType: "Constant",     label: "Cut Height",
        fields: { Value: 64.0 }, offsetX: 0, offsetY: 150 },
      { localId: "noise",     type: "SimplexNoise2D", displayType: "SimplexNoise2D", label: "Edge Noise",
        fields: { ...DENSITY_DEFAULTS.SimplexNoise2D, Scale: 20 }, offsetX: 0, offsetY: 300 },
      { localId: "mask",      type: "Conditional",  displayType: "Conditional",  label: "Apply Threshold",
        fields: {}, offsetX: 350, offsetY: 100 },
    ],
    edges: [
      { sourceLocal: "height",    targetLocal: "mask", targetHandle: "Condition" },
      { sourceLocal: "threshold", targetLocal: "mask", targetHandle: "TrueInput" },
      { sourceLocal: "noise",     targetLocal: "mask", targetHandle: "FalseInput" },
    ],
  },

  {
    id: "vertical-gradient-shape",
    name: "Vertical Gradient Shape",
    description: "Gradient density from Y-min to Y-max — a smooth vertical density that fades top to bottom, useful as a base layer or blend mask",
    category: "Density",
    nodes: [
      { localId: "grad",       type: "GradientDensity", displayType: "GradientDensity", label: "Height Gradient",
        fields: { ...DENSITY_DEFAULTS.GradientDensity, FromY: 0, ToY: 128 }, offsetX: 0, offsetY: 0 },
      { localId: "noise",      type: "SimplexNoise2D",  displayType: "SimplexNoise2D",  label: "Surface Noise",
        fields: { ...DENSITY_DEFAULTS.SimplexNoise2D, Scale: 30 }, offsetX: 0, offsetY: 150 },
      { localId: "sum",        type: "Sum",             displayType: "Sum",             label: "Add Detail",
        fields: {}, offsetX: 300, offsetY: 50 },
      { localId: "normalizer", type: "Normalizer",      displayType: "Normalizer",      label: "Normalize",
        fields: { ...DENSITY_DEFAULTS.Normalizer }, offsetX: 600, offsetY: 50 },
    ],
    edges: [
      { sourceLocal: "grad",  targetLocal: "sum",        targetHandle: "Inputs[0]" },
      { sourceLocal: "noise", targetLocal: "sum",        targetHandle: "Inputs[1]" },
      { sourceLocal: "sum",   targetLocal: "normalizer", targetHandle: "Input" },
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
