import type { DensityType } from "./density";
import type { CurveType } from "./curves";
import type { MaterialProviderType, ConditionType } from "./material";
import type { PatternType } from "./patterns";
import type { PositionProviderType } from "./positions";
import type { PropType } from "./props";
import type { ScannerType } from "./scanners";
import type { AssignmentType } from "./assignments";
import type { VectorProviderType } from "./vectors";
import type { EnvironmentProviderType, TintProviderType, BlockMaskType, DirectionalityType } from "./environment";

type DefaultFields = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Density defaults
// ---------------------------------------------------------------------------

export const DENSITY_DEFAULTS: Record<DensityType, DefaultFields> = {
  // Core noise
  SimplexNoise2D: { Scale: 1.0, Amplitude: 1.0, Seed: "A", Octaves: 1, Lacunarity: 1.0, Persistence: 1.0 },
  SimplexNoise3D: { Scale: 1.0, Amplitude: 1.0, Seed: "A", Octaves: 1, Lacunarity: 1.0, Persistence: 1.0 },
  SimplexRidgeNoise2D: { Scale: 100.0, Amplitude: 1.0, Seed: "A", Octaves: 1, Lacunarity: 1.0, Persistence: 1.0 },
  SimplexRidgeNoise3D: { Scale: 100.0, Amplitude: 1.0, Seed: "A", Octaves: 1, Lacunarity: 1.0, Persistence: 1.0 },
  VoronoiNoise2D: { Scale: 100.0, Seed: "A" },
  VoronoiNoise3D: { Scale: 100.0, Seed: "A" },
  // Arithmetic
  Sum: {},
  SumSelf: { Count: 2 },
  WeightedSum: {},
  Product: {},
  Negate: {},
  Abs: {},
  SquareRoot: {},
  CubeRoot: {},
  Square: {},
  CubeMath: {},
  Inverse: {},
  Modulo: { Divisor: 1.0 },
  // Constants
  Constant: { Value: 0.0 },
  ImportedValue: { Name: "" },
  // Clamping & range
  Clamp: { Min: -1e15, Max: 1e15 },
  ClampToIndex: { Min: 0, Max: 255 },
  Normalizer: { SourceRange: { Min: -1, Max: 1 }, TargetRange: { Min: 0, Max: 1 } },
  DoubleNormalizer: { SourceRangeA: { Min: -1, Max: 0 }, TargetRangeA: { Min: 0, Max: 0.5 }, SourceRangeB: { Min: 0, Max: 1 }, TargetRangeB: { Min: 0.5, Max: 1 } },
  RangeChoice: { Threshold: 0.5 },
  LinearTransform: { Scale: 1.0, Offset: 0.0 },
  Interpolate: {},
  // Position-based
  CoordinateX: {},
  CoordinateY: {},
  CoordinateZ: {},
  DistanceFromOrigin: {},
  DistanceFromAxis: { Axis: "Y" },
  DistanceFromPoint: { Point: { x: 0, y: 0, z: 0 } },
  AngleFromOrigin: {},
  AngleFromPoint: { Point: { x: 0, y: 0, z: 0 } },
  HeightAboveSurface: {},
  // Curves & splines
  CurveFunction: {},
  SplineFunction: { Points: [] },
  FlatCache: {},
  // Combinators
  Conditional: { Threshold: 0.0 },
  Switch: {},
  Blend: {},
  BlendCurve: {},
  MinFunction: {},
  MaxFunction: {},
  AverageFunction: {},
  // Sampling / transforms
  CacheOnce: {},
  Wrap: {},
  TranslatedPosition: { Translation: { x: 0, y: 0, z: 0 } },
  ScaledPosition: { Scale: { x: 1, y: 1, z: 1 } },
  RotatedPosition: { AngleDegrees: 0 },
  MirroredPosition: { Axis: "X" },
  QuantizedPosition: { StepSize: 1.0 },
  // Terrain-specific
  SurfaceDensity: {},
  TerrainBoolean: { Operation: "Union" },
  TerrainMask: {},
  GradientDensity: { FromY: 0, ToY: 256 },
  BeardDensity: {},
  ColumnDensity: {},
  CaveDensity: { Radius: 4.0 },
  FractalNoise2D: { Scale: 1.0, Octaves: 1, Lacunarity: 1.0, Persistence: 1.0 },
  FractalNoise3D: { Scale: 1.0, Octaves: 1, Lacunarity: 1.0, Persistence: 1.0 },
  DomainWarp2D: { Amplitude: 1.0 },
  DomainWarp3D: { Amplitude: 1.0 },
  // Smooth operations
  SmoothClamp: { Min: 0.0, Max: 1.0, Smoothness: 0.1 },
  SmoothFloor: { Threshold: 0.0, Smoothness: 0.1 },
  SmoothMin: { Smoothness: 1.0 },
  SmoothMax: { Smoothness: 1.0 },
  // Additional math
  AmplitudeConstant: { Value: 1.0 },
  Pow: { Exponent: 2.0 },
  Floor: { Floor: 0 },
  Ceiling: { Ceiling: 1 },
  // Position overrides & sampling
  Anchor: {},
  YOverride: { OverrideY: 0 },
  BaseHeight: { BaseHeightName: "Base", Distance: false },
  Offset: {},
  Distance: {},
  PositionsCellNoise: { Frequency: 0.01, Seed: "A" },
  // Additional operations
  SmoothCeiling: { Threshold: 1.0, Smoothness: 0.1 },
  Gradient: { FromY: 0, ToY: 256 },
  Amplitude: {},
  YSampled: { SampleDistance: 4.0, SampleOffset: 0.0 },
  SwitchState: { State: 0 },
  MultiMix: { Keys: [0, 1] },
  Positions3D: { Frequency: 0.01, Seed: "A" },
  PositionsPinch: { Strength: 1.0 },
  PositionsTwist: { Angle: 0.0 },
  // Position overrides
  XOverride: { OverrideX: 0 },
  ZOverride: { OverrideZ: 0 },
  // Warp types
  GradientWarp: { WarpFactor: 1.0, WarpScale: 1.0, SampleRange: 1.0, Is2D: false, YFor2D: 0.0 },
  FastGradientWarp: { WarpFactor: 1.0, WarpSeed: "A", WarpScale: 1.0, WarpOctaves: 3, WarpLacunarity: 2.0, WarpPersistence: 0.5, Is2D: false },
  VectorWarp: { WarpFactor: 1.0 },
  // Context-dependent
  Terrain: {},
  CellWallDistance: { Frequency: 0.01, Seed: "A" },
  DistanceToBiomeEdge: {},
  Pipeline: {},
  // New pre-release types
  OffsetConstant: { Value: 0.0 },
  Cache2D: {},
  Exported: { Name: "", SingleInstance: false },
  Angle: { Vector: { x: 0, y: 1, z: 0 }, IsAxis: false },
  // Shape SDFs
  Cube: {},
  Axis: { Axis: { x: 0, y: 1, z: 0 }, IsAnchored: false },
  Ellipsoid: { Scale: { x: 1, y: 1, z: 1 }, NewYAxis: { x: 0, y: 1, z: 0 }, SpinAngle: 0 },
  Cuboid: { Scale: { x: 1, y: 1, z: 1 }, NewYAxis: { x: 0, y: 1, z: 0 }, SpinAngle: 0 },
  Cylinder: { Radius: 1.0, Height: 2.0, NewYAxis: { x: 0, y: 1, z: 0 }, SpinAngle: 0 },
  Plane: { Normal: { x: 0, y: 1, z: 0 }, Distance: 0.0 },
  Shell: { Axis: { x: 0, y: 1, z: 0 }, Mirror: false },
  // Special
  Debug: { Label: "" },
  YGradient: { FromY: 0, ToY: 256 },
  Passthrough: {},
  Zero: {},
  One: {},
};

// ---------------------------------------------------------------------------
// Curve defaults
// ---------------------------------------------------------------------------

export const CURVE_DEFAULTS: Record<CurveType, DefaultFields> = {
  Manual: { Points: [] },
  Constant: { Value: 0.0 },
  DistanceExponential: { Exponent: 2.0, Range: { Min: 0, Max: 1 } },
  DistanceS: { ExponentA: 1.0, ExponentB: 1.0, Transition: 1.0, Range: 1.0, TransitionSmooth: 1.0 },
  Multiplier: {},
  Sum: {},
  Inverter: {},
  Not: {},
  Clamp: { Min: 0.0, Max: 1.0 },
  LinearRemap: { SourceRange: { Min: 0, Max: 1 }, TargetRange: { Min: 0, Max: 1 } },
  Noise: { Frequency: 0.01, Seed: "A" },
  Cache: {},
  Blend: {},
  StepFunction: { Steps: 4 },
  Threshold: { Threshold: 0.5 },
  SmoothStep: { Edge0: 0.0, Edge1: 1.0 },
  Power: { Exponent: 2.0 },
  Floor: {},
  Ceiling: {},
  SmoothFloor: { Smoothness: 0.1 },
  SmoothCeiling: { Smoothness: 0.1 },
  SmoothClamp: { Min: 0.0, Max: 1.0, Smoothness: 0.1 },
  Min: {},
  Max: {},
  SmoothMin: { Smoothness: 1.0 },
  SmoothMax: { Smoothness: 1.0 },
  Imported: { Name: "" },
  Exported: { Name: "" },
};

// ---------------------------------------------------------------------------
// Material Provider defaults
// ---------------------------------------------------------------------------

export const MATERIAL_DEFAULTS: Record<MaterialProviderType, DefaultFields> = {
  Constant: { Material: "Rock_Lime_Cobble" },
  SpaceAndDepth: { LayerContext: "DEPTH_INTO_FLOOR", MaxExpectedDepth: 16 },
  WeightedRandom: {},
  Conditional: { Threshold: 0.5 },
  Blend: {},
  HeightGradient: { Range: { Min: 0, Max: 256 } },
  NoiseSelector: { Frequency: 0.01, Threshold: 0.5 },
  Solid: { Material: "Rock_Lime_Cobble" },
  Empty: {},
  Surface: {},
  Cave: {},
  Cluster: { Radius: 3 },
  Queue: {},
  FieldFunction: {},
  Solidity: {},
  DownwardDepth: { MaxDepth: 16 },
  UpwardDepth: { MaxDepth: 16 },
  DownwardSpace: { MaxSpace: 16 },
  UpwardSpace: { MaxSpace: 16 },
  SimpleHorizontal: { Spacing: 4 },
  Striped: { Thickness: 1, Seed: "A" },
  TerrainDensity: {},
  Imported: { Name: "" },
  Exported: { Name: "" },
  // Layer sub-asset types
  ConstantThickness: { Thickness: 3 },
  NoiseThickness: {},
  RangeThickness: { RangeMin: 1, RangeMax: 5, Seed: "" },
  WeightedThickness: { PossibleThicknesses: [{ Weight: 1, Thickness: 3 }], Seed: "" },
};

// ---------------------------------------------------------------------------
// Condition defaults
// ---------------------------------------------------------------------------

export const CONDITION_DEFAULTS: Record<ConditionType, DefaultFields> = {
  AlwaysTrueCondition: {},
  EqualsCondition: { ContextToCheck: "SPACE_ABOVE_FLOOR", Value: 0 },
  GreaterThanCondition: { ContextToCheck: "SPACE_ABOVE_FLOOR", Threshold: 0 },
  SmallerThanCondition: { ContextToCheck: "SPACE_ABOVE_FLOOR", Threshold: 0 },
  AndCondition: {},
  OrCondition: {},
  NotCondition: {},
};

// ---------------------------------------------------------------------------
// Pattern defaults
// ---------------------------------------------------------------------------

export const PATTERN_DEFAULTS: Record<PatternType, DefaultFields> = {
  Floor: { Depth: 1 },
  Ceiling: { Depth: 1 },
  Wall: {},
  Surface: {},
  BlockType: { Material: "Rock_Lime_Cobble" },
  BlockSet: {},
  Cuboid: { Min: { x: 0, y: 0, z: 0 }, Max: { x: 1, y: 1, z: 1 } },
  Offset: { Offset: { x: 0, y: 0, z: 0 } },
  Conditional: { Threshold: 0.5 },
  Blend: {},
  Union: {},
  Intersection: {},
  And: {},
  Or: {},
  Not: {},
  Constant: { Value: true },
  FieldFunction: { Threshold: 0.5 },
  Imported: { Name: "" },
  Exported: { Name: "" },
};

// ---------------------------------------------------------------------------
// Position Provider defaults
// ---------------------------------------------------------------------------

export const POSITION_DEFAULTS: Record<PositionProviderType, DefaultFields> = {
  List: { Positions: [] },
  Mesh2D: { Resolution: 16, Jitter: 0.0 },
  Mesh3D: { Resolution: 16, Jitter: 0.0 },
  FieldFunction: { Threshold: 0.5 },
  Occurrence: { Chance: 0.5 },
  Offset: { Offset: { x: 0, y: 0, z: 0 } },
  Union: {},
  SimpleHorizontal: { Spacing: 16, Jitter: 0.0 },
  Cache: {},
  Conditional: { Threshold: 0.5 },
  DensityBased: { Threshold: 0.5 },
  SurfaceProjection: {},
  BaseHeight: {},
  Anchor: {},
  Bound: { Min: { x: -64, y: 0, z: -64 }, Max: { x: 64, y: 256, z: 64 } },
  Framework: {},
  SquareGrid2d: {},
  SquareGrid3d: {},
  Scaler: { Scale: { x: 40, y: 40, z: 40 } },
  Jitter2d: { Magnitude: 14.0, Seed: "A" },
  Jitter3d: { Magnitude: 14.0, Seed: "A" },
  TriangularGrid2d: {},
  Clusters: { ClusterBounds: { X: 4, Y: 4, Z: 4 } },
  Empty: {},
  Imported: { Name: "" },
  Exported: { Name: "" },
};

// ---------------------------------------------------------------------------
// Prop defaults
// ---------------------------------------------------------------------------

export const PROP_DEFAULTS: Record<PropType, DefaultFields> = {
  Box: { Size: { x: 1, y: 1, z: 1 }, Material: "Rock_Lime_Cobble" },
  Column: { Height: 4, Material: "Rock_Lime_Cobble" },
  Cluster: {},
  Density: {},
  Prefab: {
    WeightedPrefabPaths: [{ Path: "", Weight: 1 }],
    LegacyPath: false,
    LoadEntities: true,
    MoldingDirection: "NONE",
    MoldingChildren: false,
  },
  Conditional: { Threshold: 0.5 },
  WeightedRandom: {},
  Weighted: {},
  Union: {},
  Surface: {},
  Cave: {},
  PondFiller: { Material: "Water" },
  Queue: {},
  Offset: { Offset: { x: 0, y: 0, z: 0 } },
  Cuboid: { Bounds: { PointA: [0, 0, 0], PointB: [1, 1, 1] } },
  Manual: { Blocks: [] },
  Locator: { PlacementCap: 1 },
  Mask: {},
  RandomRotator: { HorizontalRotations: true, Seed: "A" },
  StaticRotator: { Rotation: { Yaw: "None", Pitch: "None", Roll: "None" } },
  Orienter: { Seed: "A" },
  DensitySelector: {},
  UniquePrefab: {
    WeightedPrefabPaths: [{ Path: "", Weight: 1 }],
    LegacyPath: false,
    LoadEntities: true,
    UniqueScope: "WORLD",
  },
  Imported: { Name: "" },
  Exported: { Name: "" },
};

// ---------------------------------------------------------------------------
// Scanner defaults
// ---------------------------------------------------------------------------

export const SCANNER_DEFAULTS: Record<ScannerType, DefaultFields> = {
  Origin: {},
  ColumnLinear: { StepSize: 1, Range: { Min: 0, Max: 256 } },
  ColumnRandom: { Count: 8, Range: { Min: 0, Max: 256 } },
  Area: { Size: { x: 16, y: 16, z: 16 } },
  Linear: { Axis: "Y", Range: { Min: 0, Max: 256 }, AscendingOrder: true },
  Random: { Axis: "Y", Range: { Min: 0, Max: 256 }, Seed: "A" },
  Radial: { Bounds: { PointA: [0, 0, 0], PointB: [16, 16, 16] } },
  Queue: {},
  Direct: {},
  Imported: { Name: "" },
};

// ---------------------------------------------------------------------------
// Assignment defaults
// ---------------------------------------------------------------------------

export const ASSIGNMENT_DEFAULTS: Record<AssignmentType, DefaultFields> = {
  Constant: {},
  FieldFunction: { Threshold: 0.5 },
  Sandwich: {},
  Weighted: {},
  Imported: { Name: "" },
};

// ---------------------------------------------------------------------------
// Vector Provider defaults
// ---------------------------------------------------------------------------

export const VECTOR_DEFAULTS: Record<VectorProviderType, DefaultFields> = {
  Constant: { Value: { x: 0, y: 1, z: 0 } },
  DensityGradient: {},
  Cache: {},
  Exported: { Name: "" },
  Imported: { Name: "" },
};

// ---------------------------------------------------------------------------
// Environment / Tint / BlockMask / Directionality defaults
// ---------------------------------------------------------------------------

export const ENVIRONMENT_DEFAULTS: Record<EnvironmentProviderType, DefaultFields> = {
  Default: {},
  Biome: { BiomeId: "" },
  Constant: {},
  DensityDelimited: {},
  Imported: { Name: "" },
  Exported: { Name: "" },
};

export const TINT_DEFAULTS: Record<TintProviderType, DefaultFields> = {
  Constant: { Color: "#ffffff" },
  Gradient: { From: "#ffffff", To: "#000000" },
  DensityDelimited: {},
  Imported: { Name: "" },
  Exported: { Name: "" },
};

export const BLOCK_MASK_DEFAULTS: Record<BlockMaskType, DefaultFields> = {
  All: {},
  None: {},
  Single: { BlockType: "Rock_Lime_Cobble" },
  Set: { BlockTypes: [] },
  Imported: { Name: "" },
};

export const DIRECTIONALITY_DEFAULTS: Record<DirectionalityType, DefaultFields> = {
  Uniform: {},
  Directional: { Direction: { x: 0, y: 1, z: 0 } },
  Normal: {},
  Static: { Rotation: 0 },
  Random: { Seed: "A" },
  Pattern: { InitialDirection: "NORTH", Seed: "A" },
  Imported: { Name: "" },
};

// ---------------------------------------------------------------------------
// Aggregate all defaults for the palette
// ---------------------------------------------------------------------------

import { AssetCategory } from "./types";
import { getAllSchemaTypes, getSchemaDefaults, getSchemaCategory } from "./schemaLoader";

export interface CategoryDefaultsEntry {
  type: string;
  category: AssetCategory;
  defaults: DefaultFields;
}

function buildEntries(
  record: Record<string, DefaultFields>,
  category: AssetCategory,
): CategoryDefaultsEntry[] {
  return Object.entries(record).map(([type, defaults]) => ({
    type,
    category,
    defaults,
  }));
}

const LOCAL_DEFAULTS: CategoryDefaultsEntry[] = [
  ...buildEntries(DENSITY_DEFAULTS, AssetCategory.Density),
  ...buildEntries(CURVE_DEFAULTS, AssetCategory.Curve),
  ...buildEntries(MATERIAL_DEFAULTS, AssetCategory.MaterialProvider),
  ...buildEntries(PATTERN_DEFAULTS, AssetCategory.Pattern),
  ...buildEntries(POSITION_DEFAULTS, AssetCategory.PositionProvider),
  ...buildEntries(PROP_DEFAULTS, AssetCategory.Prop),
  ...buildEntries(SCANNER_DEFAULTS, AssetCategory.Scanner),
  ...buildEntries(ASSIGNMENT_DEFAULTS, AssetCategory.Assignment),
  ...buildEntries(VECTOR_DEFAULTS, AssetCategory.VectorProvider),
  ...buildEntries(ENVIRONMENT_DEFAULTS, AssetCategory.EnvironmentProvider),
  ...buildEntries(TINT_DEFAULTS, AssetCategory.TintProvider),
  ...buildEntries(BLOCK_MASK_DEFAULTS, AssetCategory.BlockMask),
  ...buildEntries(DIRECTIONALITY_DEFAULTS, AssetCategory.Directionality),
];

// Build set of locally-registered types (including prefixed curve/material/etc.)
const localTypeSet = new Set(LOCAL_DEFAULTS.map((e) => {
  if (e.category === AssetCategory.Density) return e.type;
  // Map category to prefix
  const prefix: Record<string, string> = {
    [AssetCategory.Curve]: "Curve",
    [AssetCategory.MaterialProvider]: "Material",
    [AssetCategory.Pattern]: "Pattern",
    [AssetCategory.PositionProvider]: "Position",
    [AssetCategory.Prop]: "Prop",
    [AssetCategory.Scanner]: "Scanner",
    [AssetCategory.Assignment]: "Assignment",
    [AssetCategory.VectorProvider]: "Vector",
    [AssetCategory.EnvironmentProvider]: "Environment",
    [AssetCategory.TintProvider]: "Tint",
    [AssetCategory.BlockMask]: "BlockMask",
    [AssetCategory.Directionality]: "Directionality",
  };
  return `${prefix[e.category] ?? ""}:${e.type}`;
}));

// Add schema-derived entries for types not locally registered
function buildSchemaEntries(): CategoryDefaultsEntry[] {
  const entries: CategoryDefaultsEntry[] = [];
  for (const nodeType of getAllSchemaTypes()) {
    // Skip types that are already locally registered
    if (localTypeSet.has(nodeType)) continue;

    const category = getSchemaCategory(nodeType);
    if (!category) continue;

    const defaults = getSchemaDefaults(nodeType) ?? {};
    entries.push({ type: nodeType, category, defaults });
  }
  return entries;
}

export const ALL_DEFAULTS: CategoryDefaultsEntry[] = [
  ...LOCAL_DEFAULTS,
  ...buildSchemaEntries(),
];
