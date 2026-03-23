/**
 * Schema-driven defaults for all node types.
 *
 * The bundle (terranova-bundle.json) is the single source of truth.
 * A legacy fallback map covers types not yet present in the bundle
 * so that existing behaviour is preserved.
 */

import { AssetCategory } from "./types";
import {
  getNodeDefaults,
  getAllSchemaTypes,
  getSchemaCategory,
} from "./schemaLoader";

type DefaultFields = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Legacy fallback defaults — used when a type is absent from the bundle.
// Keyed by the full type key (bare name for Density, "Prefix:Name" otherwise).
// ---------------------------------------------------------------------------

const LEGACY_DENSITY: Record<string, DefaultFields> = {
  // V2 field names — the bundle is the source of truth; legacy entries
  // serve as fallbacks for types not (yet) in the bundle.
  SimplexNoise2D: { Scale: 1.0, Seed: "A", Octaves: 1, Lacunarity: 1.0, Persistence: 1.0 },
  SimplexNoise3D: { Scale: 1.0, Seed: "A", Octaves: 1, Lacunarity: 1.0, Persistence: 1.0 },
  SimplexRidgeNoise2D: { Scale: 100.0, Seed: "A", Octaves: 1, Lacunarity: 1.0, Persistence: 1.0 },
  SimplexRidgeNoise3D: { Scale: 100.0, Seed: "A", Octaves: 1, Lacunarity: 1.0, Persistence: 1.0 },
  VoronoiNoise2D: { Scale: 100.0, Seed: "A" },
  VoronoiNoise3D: { Scale: 100.0, Seed: "A" },
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
  Constant: { Value: 0.0 },
  ImportedValue: { Name: "" },
  Clamp: { WallA: 1e15, WallB: -1e15 },
  ClampToIndex: { WallA: 255, WallB: 0 },
  Normalizer: { SourceRange: { Min: -1, Max: 1 }, TargetRange: { Min: 0, Max: 1 } },
  DoubleNormalizer: { SourceRangeA: { Min: -1, Max: 0 }, TargetRangeA: { Min: 0, Max: 0.5 }, SourceRangeB: { Min: 0, Max: 1 }, TargetRangeB: { Min: 0.5, Max: 1 } },
  RangeChoice: { Threshold: 0.5 },
  LinearTransform: { Scale: 1.0, Offset: 0.0 },
  Interpolate: {},
  CoordinateX: {},
  CoordinateY: {},
  CoordinateZ: {},
  DistanceFromOrigin: {},
  DistanceFromAxis: { Axis: "Y" },
  DistanceFromPoint: { Point: { x: 0, y: 0, z: 0 } },
  AngleFromOrigin: {},
  AngleFromPoint: { Point: { x: 0, y: 0, z: 0 } },
  HeightAboveSurface: {},
  CurveFunction: {},
  SplineFunction: { Points: [] },
  FlatCache: {},
  Conditional: { Threshold: 0.0 },
  Switch: { SwitchCases: [] },
  Blend: {},
  BlendCurve: {},
  MinFunction: {},
  MaxFunction: {},
  AverageFunction: {},
  CacheOnce: { Capacity: 3 },
  Wrap: {},
  TranslatedPosition: { Translation: { x: 0, y: 0, z: 0 } },
  ScaledPosition: { Scale: { x: 1, y: 1, z: 1 } },
  RotatedPosition: { AngleDegrees: 0 },
  MirroredPosition: { Axis: "X" },
  QuantizedPosition: { StepSize: 1.0 },
  SurfaceDensity: {},
  TerrainBoolean: { Operation: "Union" },
  TerrainMask: {},
  GradientDensity: { FromY: 0, ToY: 256 },
  BeardDensity: {},
  ColumnDensity: {},
  CaveDensity: { Radius: 4.0 },
  FractalNoise2D: { Scale: 1.0, Octaves: 1, Lacunarity: 1.0, Persistence: 1.0 },
  FractalNoise3D: { Scale: 1.0, Octaves: 1, Lacunarity: 1.0, Persistence: 1.0 },
  DomainWarp2D: { WarpFactor: 1.0 },
  DomainWarp3D: { WarpFactor: 1.0 },
  SmoothClamp: { WallA: 1.0, WallB: 0.0 },
  SmoothFloor: { WallA: 0.0, WallB: 0.1 },
  SmoothMin: {},
  SmoothMax: {},
  AmplitudeConstant: {},
  Pow: { Exponent: 1.0 },
  Floor: {},
  Ceiling: {},
  Anchor: { Reversed: false },
  YOverride: { OverrideY: 0 },
  BaseHeight: { BaseHeightName: "Base", Distance: false },
  Offset: {},
  Distance: {},
  PositionsCellNoise: { Scale: 100.0, Seed: "A" },
  SmoothCeiling: { WallA: 1.0, WallB: 0.1 },
  Gradient: { Axis: { x: 0, y: 1, z: 0 }, SampleRange: 1.0 },
  Amplitude: {},
  YSampled: { SampleDistance: 4.0, SampleOffset: 0.0 },
  SwitchState: { State: 0 },
  MultiMix: { Keys: [0, 1] },
  Positions3D: { Scale: 100.0, Seed: "A" },
  PositionsPinch: { Strength: 1.0 },
  PositionsTwist: { Angle: 0.0 },
  XOverride: { OverrideX: 0 },
  ZOverride: { OverrideZ: 0 },
  GradientWarp: { WarpFactor: 1.0, SampleRange: 1.0, "2D": false, YFor2D: 0.0 },
  FastGradientWarp: { WarpFactor: 1.0, Seed: "A", WarpScale: 1.0, WarpOctaves: 3, WarpLacunarity: 2.0, WarpPersistence: 0.5, "2D": false },
  VectorWarp: { WarpFactor: 1.0 },
  Terrain: {},
  CellWallDistance: { Scale: 100.0, Seed: "A" },
  DistanceToBiomeEdge: {},
  Pipeline: {},
  OffsetConstant: {},
  Cache2D: {},
  Exported: { Name: "", SingleInstance: false },
  Angle: { Vector: { x: 0, y: 1, z: 0 }, IsAxis: false },
  Cube: {},
  Axis: { Axis: { x: 0, y: 1, z: 0 }, IsAnchored: false },
  Ellipsoid: { Scale: { x: 1, y: 1, z: 1 }, NewYAxis: { x: 0, y: 1, z: 0 }, SpinAngle: 0 },
  Cuboid: { Scale: { x: 1, y: 1, z: 1 }, NewYAxis: { x: 0, y: 1, z: 0 }, SpinAngle: 0 },
  Cylinder: { Radius: 1.0, Height: 2.0, NewYAxis: { x: 0, y: 1, z: 0 }, SpinAngle: 0 },
  Plane: { Normal: { x: 0, y: 1, z: 0 }, IsAnchored: false },
  Shell: { Axis: { x: 0, y: 1, z: 0 }, Mirror: false },
  Debug: { Label: "" },
  YGradient: { FromY: 0, ToY: 256 },
  Passthrough: {},
  Zero: {},
  One: {},
};

const LEGACY_CURVE: Record<string, DefaultFields> = {
  Manual: { Points: [] },
  Constant: { Value: 0.0 },
  DistanceExponential: { Exponent: 2.0, Range: { Min: 0, Max: 1 } },
  DistanceS: { ExponentA: 1.0, ExponentB: 1.0, Transition: 1.0, Range: 1.0, TransitionSmooth: 1.0 },
  Multiplier: {},
  Sum: {},
  Inverter: {},
  Not: {},
  Clamp: { WallA: 1.0, WallB: 0.0 },
  LinearRemap: { SourceRange: { Min: 0, Max: 1 }, TargetRange: { Min: 0, Max: 1 } },
  Noise: { Scale: 100.0, Seed: "A" },
  Cache: {},
  Blend: {},
  StepFunction: { Steps: 4 },
  Threshold: { Threshold: 0.5 },
  SmoothStep: { Edge0: 0.0, Edge1: 1.0 },
  Power: { Exponent: 2.0 },
  Floor: {},
  Ceiling: {},
  SmoothFloor: { WallA: 0.0, WallB: 0.1 },
  SmoothCeiling: { WallA: 1.0, WallB: 0.1 },
  SmoothClamp: { WallA: 1.0, WallB: 0.0 },
  Min: {},
  Max: {},
  SmoothMin: {},
  SmoothMax: {},
  Imported: { Name: "" },
  Exported: { Name: "" },
};

const LEGACY_MATERIAL: Record<string, DefaultFields> = {
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
  DownwardDepth: { Depth: 1 },
  UpwardDepth: { Depth: 1 },
  DownwardSpace: { Space: 1 },
  UpwardSpace: { Space: 1 },
  SimpleHorizontal: { Spacing: 4 },
  Striped: { Thickness: 1, Seed: "A" },
  TerrainDensity: {},
  Imported: { Name: "" },
  Exported: { Name: "" },
  ConstantThickness: { Thickness: 1 },
  NoiseThickness: {},
  RangeThickness: { RangeMin: 1, RangeMax: 3, Seed: "" },
  WeightedThickness: { PossibleThicknesses: [{ Weight: 1, Thickness: 3 }], Seed: "" },
};

const LEGACY_CONDITION: Record<string, DefaultFields> = {
  AlwaysTrueCondition: {},
  EqualsCondition: { ContextToCheck: "SPACE_ABOVE_FLOOR", Value: 0 },
  GreaterThanCondition: { ContextToCheck: "SPACE_ABOVE_FLOOR", Threshold: 0 },
  SmallerThanCondition: { ContextToCheck: "SPACE_ABOVE_FLOOR", Threshold: 0 },
  AndCondition: {},
  OrCondition: {},
  NotCondition: {},
};

const LEGACY_PATTERN: Record<string, DefaultFields> = {
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

const LEGACY_POSITION: Record<string, DefaultFields> = {
  List: { Positions: [] },
  Mesh2D: { Resolution: 16, Jitter: 0.0 },
  Mesh3D: { Resolution: 16, Jitter: 0.0 },
  FieldFunction: { Threshold: 0.5 },
  Occurrence: { Seed: "" },
  Offset: { Offset: { x: 0, y: 0, z: 0 } },
  Union: {},
  SimpleHorizontal: { RangeY: { Min: 0, Max: 256 } },
  Cache: { SectionSize: 32, CacheSize: 100 },
  Conditional: { Threshold: 0.5 },
  DensityBased: { Threshold: 0.5 },
  SurfaceProjection: {},
  BaseHeight: { MinYRead: -1.0, MaxYRead: 1.0, BedName: "" },
  Anchor: { Reversed: false },
  Bound: { Bounds: { MinX: -64, MaxX: 64, MinY: 0, MaxY: 256, MinZ: -64, MaxZ: 64 } },
  Framework: {},
  SquareGrid2d: {},
  SquareGrid3d: {},
  Scaler: {},
  Jitter2d: { Magnitude: 14.0, Seed: "" },
  Jitter3d: { Magnitude: 14.0, Seed: "" },
  TriangularGrid2d: {},
  Clusters: { ClusterBounds: { X: 4, Y: 4, Z: 4 } },
  Empty: {},
  Imported: { Name: "" },
  Exported: { Name: "" },
};

const LEGACY_PROP: Record<string, DefaultFields> = {
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

const LEGACY_SCANNER: Record<string, DefaultFields> = {
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

const LEGACY_ASSIGNMENT: Record<string, DefaultFields> = {
  Constant: {},
  FieldFunction: { Threshold: 0.5 },
  Sandwich: {},
  Weighted: {},
  Imported: { Name: "" },
};

const LEGACY_VECTOR: Record<string, DefaultFields> = {
  Constant: { Value: { x: 0, y: 1, z: 0 } },
  DensityGradient: { SampleDistance: 1.0 },
  Cache: {},
  Exported: { Name: "" },
  Imported: { Name: "" },
};

const LEGACY_ENVIRONMENT: Record<string, DefaultFields> = {
  Default: {},
  Biome: { BiomeId: "" },
  Constant: {},
  DensityDelimited: {},
  Imported: { Name: "" },
  Exported: { Name: "" },
};

const LEGACY_TINT: Record<string, DefaultFields> = {
  Constant: { Color: "#ffffff" },
  Gradient: { From: "#ffffff", To: "#000000" },
  DensityDelimited: {},
  Imported: { Name: "" },
  Exported: { Name: "" },
};

const LEGACY_BLOCK_MASK: Record<string, DefaultFields> = {
  All: {},
  None: {},
  Single: { BlockType: "Rock_Lime_Cobble" },
  Set: { BlockTypes: [] },
  Imported: { Name: "" },
};

const LEGACY_DIRECTIONALITY: Record<string, DefaultFields> = {
  Uniform: {},
  Directional: { Direction: { x: 0, y: 1, z: 0 } },
  Normal: {},
  Static: { Rotation: 0 },
  Random: { Seed: "A" },
  Pattern: { InitialDirection: "NORTH", Seed: "A" },
  Imported: { Name: "" },
};

// Flat legacy map keyed by full type key (bare name for Density, "Prefix:Name" for others)
const LEGACY_FLAT: Record<string, DefaultFields> = {};

function populateLegacyFlat() {
  // Density types use bare names
  for (const [k, v] of Object.entries(LEGACY_DENSITY)) {
    LEGACY_FLAT[k] = v;
  }
  // Prefixed categories
  const prefixedMaps: [string, Record<string, DefaultFields>][] = [
    ["Curve", LEGACY_CURVE],
    ["MaterialProvider", LEGACY_MATERIAL],
    ["Condition", LEGACY_CONDITION],
    ["Pattern", LEGACY_PATTERN],
    ["PositionProvider", LEGACY_POSITION],
    ["Prop", LEGACY_PROP],
    ["Scanner", LEGACY_SCANNER],
    ["Assignment", LEGACY_ASSIGNMENT],
    ["VectorProvider", LEGACY_VECTOR],
    ["EnvironmentProvider", LEGACY_ENVIRONMENT],
    ["TintProvider", LEGACY_TINT],
    ["BlockMask", LEGACY_BLOCK_MASK],
    ["Directionality", LEGACY_DIRECTIONALITY],
  ];
  for (const [prefix, map] of prefixedMaps) {
    for (const [k, v] of Object.entries(map)) {
      LEGACY_FLAT[`${prefix}:${k}`] = v;
    }
  }
}
populateLegacyFlat();

// ---------------------------------------------------------------------------
// Primary API: getDefaults(typeKey)
// ---------------------------------------------------------------------------

/**
 * Get default field values for a node type.
 * Checks the schema bundle first; falls back to legacy hardcoded values.
 *
 * @param typeKey - Full type key (e.g. "SimplexNoise2D", "Curve:Manual", "MaterialProvider:Constant")
 */
export function getDefaults(typeKey: string): DefaultFields {
  const legacy = LEGACY_FLAT[typeKey] ?? {};
  const bundleDefaults = getNodeDefaults(typeKey);

  // Merge: legacy underneath, bundle on top (bundle wins on conflicts)
  if (Object.keys(bundleDefaults).length > 0) {
    return { ...legacy, ...bundleDefaults };
  }

  return legacy;
}

// ---------------------------------------------------------------------------
// Backwards-compatible category exports via Proxy
// ---------------------------------------------------------------------------

/**
 * Try to get bundle defaults for a key, but only if the bundle entry's
 * category matches the expected one. Returns null if no match.
 */
function getBundleDefaultsForCategory(
  bundleKey: string,
  expectedCategory: AssetCategory,
): DefaultFields | null {
  const cat = getSchemaCategory(bundleKey);
  if (cat !== expectedCategory) return null;
  const defaults = getNodeDefaults(bundleKey);
  // getNodeDefaults returns {} for types with no fields (valid) or unknown types
  // We trust the category check to distinguish "exists with no fields" from "not found"
  return defaults;
}

/**
 * Create a Proxy that delegates property access to the schema bundle,
 * falling back to the legacy map when the bundle doesn't have the type
 * (or when the bundle entry belongs to a different category).
 *
 * When the bundle has the type with matching category, its defaults
 * are merged on top of legacy values so that fields not yet in the
 * bundle still resolve from the legacy map.
 */
function createCategoryProxy(
  legacyMap: Record<string, DefaultFields>,
  expectedCategory: AssetCategory,
  bundlePrefix?: string,
): Record<string, DefaultFields> {
  return new Proxy(legacyMap, {
    get(_target, prop: string) {
      if (typeof prop === "symbol") return undefined;
      const legacy = legacyMap[prop] ?? {};

      // Try bundle with the prefixed key first, then bare key
      let bundleDefaults: DefaultFields | null = null;
      if (bundlePrefix) {
        bundleDefaults = getBundleDefaultsForCategory(`${bundlePrefix}:${prop}`, expectedCategory);
      }
      if (bundleDefaults === null) {
        bundleDefaults = getBundleDefaultsForCategory(prop, expectedCategory);
      }

      if (bundleDefaults !== null) {
        // Merge: legacy underneath, bundle on top (bundle wins on conflicts)
        return { ...legacy, ...bundleDefaults };
      }
      return legacy;
    },
    has(_target, prop: string) {
      if (typeof prop === "symbol") return false;
      if (prop in legacyMap) return true;
      // Check bundle with category validation
      if (bundlePrefix) {
        if (getBundleDefaultsForCategory(`${bundlePrefix}:${prop}`, expectedCategory) !== null) return true;
      }
      return getBundleDefaultsForCategory(prop, expectedCategory) !== null;
    },
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, prop) {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
  });
}

// Density has no prefix in the bundle — bare type names
export const DENSITY_DEFAULTS: Record<string, DefaultFields> = createCategoryProxy(LEGACY_DENSITY, AssetCategory.Density);
export const CURVE_DEFAULTS: Record<string, DefaultFields> = createCategoryProxy(LEGACY_CURVE, AssetCategory.Curve, "Curve");
export const MATERIAL_DEFAULTS: Record<string, DefaultFields> = createCategoryProxy(LEGACY_MATERIAL, AssetCategory.MaterialProvider, "MaterialProvider");
export const CONDITION_DEFAULTS: Record<string, DefaultFields> = createCategoryProxy(LEGACY_CONDITION, AssetCategory.MaterialProvider, "Condition");
export const PATTERN_DEFAULTS: Record<string, DefaultFields> = createCategoryProxy(LEGACY_PATTERN, AssetCategory.Pattern, "Pattern");
export const POSITION_DEFAULTS: Record<string, DefaultFields> = createCategoryProxy(LEGACY_POSITION, AssetCategory.PositionProvider, "PositionProvider");
export const PROP_DEFAULTS: Record<string, DefaultFields> = createCategoryProxy(LEGACY_PROP, AssetCategory.Prop, "Prop");
export const SCANNER_DEFAULTS: Record<string, DefaultFields> = createCategoryProxy(LEGACY_SCANNER, AssetCategory.Scanner, "Scanner");
export const ASSIGNMENT_DEFAULTS: Record<string, DefaultFields> = createCategoryProxy(LEGACY_ASSIGNMENT, AssetCategory.Assignment, "Assignment");
export const VECTOR_DEFAULTS: Record<string, DefaultFields> = createCategoryProxy(LEGACY_VECTOR, AssetCategory.VectorProvider, "VectorProvider");
export const ENVIRONMENT_DEFAULTS: Record<string, DefaultFields> = createCategoryProxy(LEGACY_ENVIRONMENT, AssetCategory.EnvironmentProvider, "EnvironmentProvider");
export const TINT_DEFAULTS: Record<string, DefaultFields> = createCategoryProxy(LEGACY_TINT, AssetCategory.TintProvider, "TintProvider");
export const BLOCK_MASK_DEFAULTS: Record<string, DefaultFields> = createCategoryProxy(LEGACY_BLOCK_MASK, AssetCategory.BlockMask, "BlockMask");
export const DIRECTIONALITY_DEFAULTS: Record<string, DefaultFields> = createCategoryProxy(LEGACY_DIRECTIONALITY, AssetCategory.Directionality, "Directionality");

// ---------------------------------------------------------------------------
// ALL_DEFAULTS — aggregate entry list for the palette and UI components
// ---------------------------------------------------------------------------

export interface CategoryDefaultsEntry {
  type: string;
  category: AssetCategory;
  defaults: DefaultFields;
}

/** Category prefix map used for building ALL_DEFAULTS from legacy entries */
const CATEGORY_PREFIX: Record<string, AssetCategory> = {
  Curve: AssetCategory.Curve,
  MaterialProvider: AssetCategory.MaterialProvider,
  Pattern: AssetCategory.Pattern,
  PositionProvider: AssetCategory.PositionProvider,
  Prop: AssetCategory.Prop,
  Scanner: AssetCategory.Scanner,
  Assignment: AssetCategory.Assignment,
  VectorProvider: AssetCategory.VectorProvider,
  EnvironmentProvider: AssetCategory.EnvironmentProvider,
  TintProvider: AssetCategory.TintProvider,
  BlockMask: AssetCategory.BlockMask,
  Directionality: AssetCategory.Directionality,
};

function buildEntries(
  record: Record<string, DefaultFields>,
  category: AssetCategory,
  bundlePrefix?: string,
): CategoryDefaultsEntry[] {
  return Object.keys(record).map((type) => {
    // Resolve defaults through the bundle (with fallback)
    const fullKey = bundlePrefix ? `${bundlePrefix}:${type}` : type;
    return {
      type,
      category,
      defaults: getDefaults(fullKey),
    };
  });
}

function buildLocalEntries(): CategoryDefaultsEntry[] {
  return [
    ...buildEntries(LEGACY_DENSITY, AssetCategory.Density),
    ...buildEntries(LEGACY_CURVE, AssetCategory.Curve, "Curve"),
    ...buildEntries(LEGACY_MATERIAL, AssetCategory.MaterialProvider, "MaterialProvider"),
    ...buildEntries(LEGACY_PATTERN, AssetCategory.Pattern, "Pattern"),
    ...buildEntries(LEGACY_POSITION, AssetCategory.PositionProvider, "PositionProvider"),
    ...buildEntries(LEGACY_PROP, AssetCategory.Prop, "Prop"),
    ...buildEntries(LEGACY_SCANNER, AssetCategory.Scanner, "Scanner"),
    ...buildEntries(LEGACY_ASSIGNMENT, AssetCategory.Assignment, "Assignment"),
    ...buildEntries(LEGACY_VECTOR, AssetCategory.VectorProvider, "VectorProvider"),
    ...buildEntries(LEGACY_ENVIRONMENT, AssetCategory.EnvironmentProvider, "EnvironmentProvider"),
    ...buildEntries(LEGACY_TINT, AssetCategory.TintProvider, "TintProvider"),
    ...buildEntries(LEGACY_BLOCK_MASK, AssetCategory.BlockMask, "BlockMask"),
    ...buildEntries(LEGACY_DIRECTIONALITY, AssetCategory.Directionality, "Directionality"),
  ];
}

// Build set of locally-registered type keys for dedup with schema entries
const localEntries = buildLocalEntries();
const localTypeSet = new Set(localEntries.map((e) => {
  if (e.category === AssetCategory.Density) return e.type;
  const prefix = Object.entries(CATEGORY_PREFIX).find(([, cat]) => cat === e.category)?.[0];
  return prefix ? `${prefix}:${e.type}` : e.type;
}));

// Add schema-derived entries for types not covered by legacy
function buildSchemaEntries(): CategoryDefaultsEntry[] {
  const entries: CategoryDefaultsEntry[] = [];
  for (const nodeType of getAllSchemaTypes()) {
    if (localTypeSet.has(nodeType)) continue;

    const category = getSchemaCategory(nodeType);
    if (!category) continue;

    entries.push({
      type: nodeType,
      category,
      defaults: getDefaults(nodeType),
    });
  }
  return entries;
}

export const ALL_DEFAULTS: CategoryDefaultsEntry[] = [
  ...localEntries,
  ...buildSchemaEntries(),
];
