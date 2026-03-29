import type { Node, Edge } from "@xyflow/react";
import { EvalStatus } from "@/schema/types";

const UNSUPPORTED_TYPES = new Set([
  "SurfaceDensity",
  "TerrainBoolean",
  "TerrainMask",
  "BeardDensity",
  "ColumnDensity",
  "CaveDensity",
  "DistanceToBiomeEdge",
  "Pipeline",
]);

const APPROXIMATED_TYPES = new Set([
  "PositionsCellNoise",
  "Positions3D",
  "PositionsPinch",
  "PositionsTwist",
  "VectorWarp",
  "Shell",
  "Terrain",
  "HeightAboveSurface",
]);

export function getEvalStatus(type: string): EvalStatus {
  if (UNSUPPORTED_TYPES.has(type)) return EvalStatus.Unsupported;
  if (APPROXIMATED_TYPES.has(type)) return EvalStatus.Approximated;
  return EvalStatus.Full;
}

export { UNSUPPORTED_TYPES };

export const DENSITY_TYPES = new Set([
  "SimplexNoise2D", "SimplexNoise3D", "SimplexRidgeNoise2D", "SimplexRidgeNoise3D",
  "CellNoise2D", "CellNoise3D", "VoronoiNoise2D", "VoronoiNoise3D",
  "FractalNoise2D", "FractalNoise3D",
  "FastGradientWarp", "DomainWarp2D", "DomainWarp3D",
  "Sum", "SumSelf", "WeightedSum", "Multiplier", "Product",
  "Inverter", "Negate", "Abs", "Sqrt", "SquareRoot", "CubeRoot", "Square", "CubeMath", "Inverse", "Modulo",
  "Constant", "Imported", "ImportedValue", "Zero", "One",
  "Clamp", "ClampToIndex", "Normalizer", "DoubleNormalizer", "RangeChoice",
  "AmplitudeConstant", "LinearTransform", "Interpolate",
  "XValue", "YValue", "ZValue", "CoordinateX", "CoordinateY", "CoordinateZ",
  "DistanceFromOrigin", "DistanceFromAxis", "DistanceFromPoint",
  "AngleFromOrigin", "AngleFromPoint", "HeightAboveSurface",
  "CurveMapper", "CurveFunction", "SplineFunction", "FlatCache",
  "Conditional", "Switch", "Mix", "Blend", "MultiMix", "BlendCurve",
  "Min", "Max", "MinFunction", "MaxFunction", "AverageFunction",
  "Cache", "CacheOnce", "Wrap",
  "Slider", "Scale", "Rotator",
  "TranslatedPosition", "ScaledPosition", "RotatedPosition", "MirroredPosition", "QuantizedPosition",
  "SurfaceDensity", "TerrainBoolean", "TerrainMask", "GradientDensity",
  "BeardDensity", "ColumnDensity", "CaveDensity",
  "Debug", "YGradient", "Passthrough",
  "BaseHeight", "Floor", "Ceiling",
  "SmoothClamp", "SmoothFloor", "SmoothMin", "SmoothMax",
  "YOverride", "Anchor", "Exported", "Offset", "Distance",
  "PositionsCellNoise",
  "Pow",
  "XOverride", "ZOverride", "SmoothCeiling", "Gradient",
  "Amplitude", "YSampled", "SwitchState",
  "Positions3D", "PositionsPinch", "PositionsTwist",
  "GradientWarp", "VectorWarp",
  "Terrain", "CellWallDistance", "DistanceToBiomeEdge", "Pipeline",
  "Ellipsoid", "Cuboid", "Cylinder", "Plane", "Shell",
  "Angle",
]);

export function getNodeType(node: Node): string {
  const data = node.data as Record<string, unknown>;
  return (data.type as string) ?? "";
}

export function findDensityRoot(nodes: Node[], edges: Edge[]): Node | null {
  const outputNode = nodes.find(
    (n) => (n.data as Record<string, unknown>)._outputNode === true,
  );
  if (outputNode) return outputNode;

  const tagged = nodes.find(
    (n) => (n.data as Record<string, unknown>)._biomeField === "Terrain",
  );
  if (tagged) return tagged;

  const sourcesWithOutgoing = new Set(edges.map((e) => e.source));
  const terminals = nodes.filter((n) => !sourcesWithOutgoing.has(n.id));

  const terminalDensity = terminals.find((n) => DENSITY_TYPES.has(getNodeType(n)));
  if (terminalDensity) return terminalDensity;

  return nodes.find((n) => DENSITY_TYPES.has(getNodeType(n))) ?? null;
}
