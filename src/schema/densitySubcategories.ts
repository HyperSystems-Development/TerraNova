import type { DensityType } from "./density";

export enum DensitySubcategory {
  Generative = "Generative",
  FilterTransform = "FilterTransform",
  ArithmeticCombinator = "ArithmeticCombinator",
  PositionCoordinate = "PositionCoordinate",
  Terrain = "Terrain",
  ShapeSDF = "ShapeSDF",
}

export const DENSITY_SUBCATEGORY_COLORS: Record<DensitySubcategory, string> = {
  [DensitySubcategory.Generative]: "#4A90D9",       // bright blue — noise sources
  [DensitySubcategory.FilterTransform]: "#7B68AE",   // purple — processing
  [DensitySubcategory.ArithmeticCombinator]: "#2D9B83", // teal — math ops
  [DensitySubcategory.PositionCoordinate]: "#3D8B37",   // green — spatial
  [DensitySubcategory.Terrain]: "#B8763C",            // warm amber — terrain
  [DensitySubcategory.ShapeSDF]: "#C45B84",           // rose — geometric shapes
};

export const DENSITY_NODE_SUBCATEGORY: Record<DensityType, DensitySubcategory> = {
  // Generative (11)
  SimplexNoise2D: DensitySubcategory.Generative,
  SimplexNoise3D: DensitySubcategory.Generative,
  SimplexRidgeNoise2D: DensitySubcategory.Generative,
  SimplexRidgeNoise3D: DensitySubcategory.Generative,
  CellNoise2D: DensitySubcategory.Generative,
  CellNoise3D: DensitySubcategory.Generative,
  FractalNoise2D: DensitySubcategory.Generative,
  FractalNoise3D: DensitySubcategory.Generative,
  FastGradientWarp: DensitySubcategory.Generative,
  PositionsCellNoise: DensitySubcategory.Generative,

  // Filter / Transform (21)
  Clamp: DensitySubcategory.FilterTransform,
  ClampToIndex: DensitySubcategory.FilterTransform,
  Normalizer: DensitySubcategory.FilterTransform,
  DoubleNormalizer: DensitySubcategory.FilterTransform,
  RangeChoice: DensitySubcategory.FilterTransform,
  Interpolate: DensitySubcategory.FilterTransform,
  CurveMapper: DensitySubcategory.FilterTransform,
  SplineFunction: DensitySubcategory.FilterTransform,
  FlatCache: DensitySubcategory.FilterTransform,
  Cache: DensitySubcategory.FilterTransform,
  Wrap: DensitySubcategory.FilterTransform,
  SmoothClamp: DensitySubcategory.FilterTransform,
  SmoothFloor: DensitySubcategory.FilterTransform,
  SmoothCeiling: DensitySubcategory.FilterTransform,
  Floor: DensitySubcategory.FilterTransform,
  Ceiling: DensitySubcategory.FilterTransform,
  GradientWarp: DensitySubcategory.FilterTransform,
  VectorWarp: DensitySubcategory.FilterTransform,
  Passthrough: DensitySubcategory.FilterTransform,
  Debug: DensitySubcategory.FilterTransform,

  // Arithmetic / Combinator (29)
  Constant: DensitySubcategory.ArithmeticCombinator,
  Imported: DensitySubcategory.ArithmeticCombinator,
  Zero: DensitySubcategory.ArithmeticCombinator,
  One: DensitySubcategory.ArithmeticCombinator,
  Sum: DensitySubcategory.ArithmeticCombinator,
  SumSelf: DensitySubcategory.ArithmeticCombinator,
  WeightedSum: DensitySubcategory.ArithmeticCombinator,
  Multiplier: DensitySubcategory.ArithmeticCombinator,
  Inverter: DensitySubcategory.ArithmeticCombinator,
  Abs: DensitySubcategory.ArithmeticCombinator,
  Sqrt: DensitySubcategory.ArithmeticCombinator,
  CubeRoot: DensitySubcategory.ArithmeticCombinator,
  Square: DensitySubcategory.ArithmeticCombinator,
  CubeMath: DensitySubcategory.ArithmeticCombinator,
  Inverse: DensitySubcategory.ArithmeticCombinator,
  Modulo: DensitySubcategory.ArithmeticCombinator,
  Pow: DensitySubcategory.ArithmeticCombinator,
  AmplitudeConstant: DensitySubcategory.ArithmeticCombinator,
  Amplitude: DensitySubcategory.ArithmeticCombinator,
  Conditional: DensitySubcategory.ArithmeticCombinator,
  Switch: DensitySubcategory.ArithmeticCombinator,
  SwitchState: DensitySubcategory.ArithmeticCombinator,
  Mix: DensitySubcategory.ArithmeticCombinator,
  MultiMix: DensitySubcategory.ArithmeticCombinator,
  Min: DensitySubcategory.ArithmeticCombinator,
  Max: DensitySubcategory.ArithmeticCombinator,
  AverageFunction: DensitySubcategory.ArithmeticCombinator,
  SmoothMin: DensitySubcategory.ArithmeticCombinator,
  SmoothMax: DensitySubcategory.ArithmeticCombinator,
  OffsetConstant: DensitySubcategory.ArithmeticCombinator,

  // Position / Coordinate (24)
  XValue: DensitySubcategory.PositionCoordinate,
  YValue: DensitySubcategory.PositionCoordinate,
  ZValue: DensitySubcategory.PositionCoordinate,
  DistanceFromOrigin: DensitySubcategory.PositionCoordinate,
  DistanceFromAxis: DensitySubcategory.PositionCoordinate,
  DistanceFromPoint: DensitySubcategory.PositionCoordinate,
  Distance: DensitySubcategory.PositionCoordinate,
  AngleFromOrigin: DensitySubcategory.PositionCoordinate,
  AngleFromPoint: DensitySubcategory.PositionCoordinate,
  HeightAboveSurface: DensitySubcategory.PositionCoordinate,
  Anchor: DensitySubcategory.PositionCoordinate,
  YOverride: DensitySubcategory.PositionCoordinate,
  XOverride: DensitySubcategory.PositionCoordinate,
  ZOverride: DensitySubcategory.PositionCoordinate,
  BaseHeight: DensitySubcategory.PositionCoordinate,
  Offset: DensitySubcategory.PositionCoordinate,
  Slider: DensitySubcategory.PositionCoordinate,
  Scale: DensitySubcategory.PositionCoordinate,
  Rotator: DensitySubcategory.PositionCoordinate,
  MirroredPosition: DensitySubcategory.PositionCoordinate,
  QuantizedPosition: DensitySubcategory.PositionCoordinate,
  Positions3D: DensitySubcategory.PositionCoordinate,
  PositionsPinch: DensitySubcategory.PositionCoordinate,
  PositionsTwist: DensitySubcategory.PositionCoordinate,
  Angle: DensitySubcategory.PositionCoordinate,

  // Terrain-specific (14)
  SurfaceDensity: DensitySubcategory.Terrain,
  TerrainBoolean: DensitySubcategory.Terrain,
  TerrainMask: DensitySubcategory.Terrain,
  GradientDensity: DensitySubcategory.Terrain,
  BeardDensity: DensitySubcategory.Terrain,
  ColumnDensity: DensitySubcategory.Terrain,
  CaveDensity: DensitySubcategory.Terrain,
  Terrain: DensitySubcategory.Terrain,
  CellWallDistance: DensitySubcategory.Terrain,
  DistanceToBiomeEdge: DensitySubcategory.Terrain,
  Pipeline: DensitySubcategory.Terrain,
  YGradient: DensitySubcategory.Terrain,
  Gradient: DensitySubcategory.Terrain,
  YSampled: DensitySubcategory.Terrain,
  Cache2D: DensitySubcategory.FilterTransform,
  Exported: DensitySubcategory.Terrain,

  // Shape SDF (5 + 2 new)
  Ellipsoid: DensitySubcategory.ShapeSDF,
  Cuboid: DensitySubcategory.ShapeSDF,
  Cylinder: DensitySubcategory.ShapeSDF,
  Plane: DensitySubcategory.ShapeSDF,
  Shell: DensitySubcategory.ShapeSDF,
  Cube: DensitySubcategory.ShapeSDF,
  Axis: DensitySubcategory.ShapeSDF,
};

export function getDensityAccentColor(nodeType: string): string | undefined {
  const sub = DENSITY_NODE_SUBCATEGORY[nodeType as DensityType];
  return sub ? DENSITY_SUBCATEGORY_COLORS[sub] : undefined;
}
