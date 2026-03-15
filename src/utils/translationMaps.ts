/**
 * Bidirectional translation maps between TerraNova internal format and Hytale native JSON.
 * All mappings derived from 9 real biome files + decompiled worldgen docs.
 */

// ---------------------------------------------------------------------------
// Type name mappings (Internal ↔ Hytale)
// ---------------------------------------------------------------------------

export const INTERNAL_TO_HYTALE_TYPES: Record<string, string> = {
  // Confirmed from real files
  Product: "Multiplier",
  Negate: "Inverter",
  CurveFunction: "CurveMapper",
  CacheOnce: "Cache",
  ImportedValue: "Imported",
  Blend: "Mix",
  MinFunction: "Min",
  MaxFunction: "Max",
  CoordinateX: "XValue",
  CoordinateY: "YValue",
  CoordinateZ: "ZValue",
  VoronoiNoise2D: "CellNoise2D",
  VoronoiNoise3D: "CellNoise3D",
  SquareRoot: "Sqrt",
  DomainWarp2D: "FastGradientWarp",
  DomainWarp3D: "FastGradientWarp",
  ScaledPosition: "Scale",
  TranslatedPosition: "Slider",
  RotatedPosition: "Rotator",
  LinearTransform: "AmplitudeConstant",
  BlendCurve: "MultiMix",
  Square: "Pow",
  CubeMath: "Cube",
};

/** Auto-reversed mapping: Hytale → Internal */
export const HYTALE_TO_INTERNAL_TYPES: Record<string, string> = Object.fromEntries(
  Object.entries(INTERNAL_TO_HYTALE_TYPES).map(([k, v]) => [v, k]),
);

// FastGradientWarp is its own internal type (not collapsed to DomainWarp2D).
// Remove the auto-reversed entry which would incorrectly alias it.
delete HYTALE_TO_INTERNAL_TYPES["FastGradientWarp"];

// ---------------------------------------------------------------------------
// Density input handle mapping (named handles → Inputs[] array order)
// ---------------------------------------------------------------------------

/**
 * Maps TerraNova named input handles to their Inputs[] array order for Hytale export.
 * Only density types that use named handles need entries here.
 * Types that already use Inputs[] arrays (Product, Sum variadic, etc.) are omitted.
 */
export const DENSITY_NAMED_TO_ARRAY: Record<string, string[]> = {
  // 1-input types
  Negate: ["Input"],
  CurveFunction: ["Input"],
  CacheOnce: ["Input"],
  Abs: ["Input"],
  SquareRoot: ["Input"],
  CubeMath: ["Input"],
  CubeRoot: ["Input"],
  Inverse: ["Input"],
  Modulo: ["Input"],
  Clamp: ["Input"],
  SmoothClamp: ["Input"],
  Normalizer: ["Input"],
  LinearTransform: ["Input"],
  FlatCache: ["Input"],
  DomainWarp2D: ["Input"],
  DomainWarp3D: ["Input"],
  FastGradientWarp: ["Input"],
  ScaledPosition: ["Input"],
  TranslatedPosition: ["Input"],
  RotatedPosition: ["Input"],
  MirroredPosition: ["Input"],
  QuantizedPosition: ["Input"],
  SurfaceDensity: ["Input"],
  TerrainMask: ["Input"],
  BeardDensity: ["Input"],
  ColumnDensity: ["Input"],
  CaveDensity: ["Input"],
  Debug: ["Input"],
  Passthrough: ["Input"],
  Wrap: ["Input"],
  SplineFunction: ["Input"],
  Square: ["Input"],
  // SumSelf (1 input)
  SumSelf: ["Input"],
  // Additional single-input types (needed for Hytale import handle mapping)
  Exported: ["Input"],
  ImportedValue: ["Input"],
  YOverride: ["Input"],
  XOverride: ["Input"],
  ZOverride: ["Input"],
  Floor: ["Input"],
  Ceiling: ["Input"],
  AmplitudeConstant: ["Input"],
  Pow: ["Input"],
  SmoothCeiling: ["Input"],
  SmoothFloor: ["Input"],
  Anchor: ["Input"],
  PositionsPinch: ["Input"],
  PositionsTwist: ["Input"],
  GradientDensity: ["Input"],
  Gradient: ["Input"],
  YGradient: ["Input"],
  ClampToIndex: ["Input"],
  DoubleNormalizer: ["Input"],
  OffsetConstant: ["Input"],
  Cache2D: ["Input"],
  // 2-input types (Sum uses Inputs[] natively via compound handles)
  Offset: ["Input", "Offset"],
  GradientWarp: ["Input", "WarpSource"],
  VectorWarp: ["Input", "WarpVector"],
  Amplitude: ["Input", "Amplitude"],
  YSampled: ["Input", "YProvider"],
  WeightedSum: ["Inputs[0]", "Inputs[1]"],
  // 3-input types
  Blend: ["InputA", "InputB", "Factor"],
  BlendCurve: ["InputA", "InputB", "Factor"],
  Interpolate: ["InputA", "InputB", "Factor"],
  // Conditional: Condition, TrueInput, FalseInput
  Conditional: ["Condition", "TrueInput", "FalseInput"],
  RangeChoice: ["Condition", "TrueInput", "FalseInput"],
};

/**
 * Reverse: given a Hytale type, get the named handles for Inputs[] indices.
 * Uses the Hytale type name (after mapping).
 */
export const HYTALE_ARRAY_TO_NAMED: Record<string, string[]> = {};

// Build reverse map using Hytale type names
for (const [internalType, handles] of Object.entries(DENSITY_NAMED_TO_ARRAY)) {
  const hytaleType = INTERNAL_TO_HYTALE_TYPES[internalType] ?? internalType;
  // Don't overwrite if already set (first wins for collisions like DomainWarp2D/3D)
  if (!(hytaleType in HYTALE_ARRAY_TO_NAMED)) {
    HYTALE_ARRAY_TO_NAMED[hytaleType] = handles;
  }
  // Also store by internal type for direct lookups
  if (!(internalType in HYTALE_ARRAY_TO_NAMED)) {
    HYTALE_ARRAY_TO_NAMED[internalType] = handles;
  }
}

// ---------------------------------------------------------------------------
// $NodeId prefix rules
// ---------------------------------------------------------------------------

/** Density types that use "Type.Density-uuid" instead of "TypeDensityNode-uuid" */
const DOT_DENSITY_TYPES = new Set([
  "CurveMapper", "Cache", "BaseHeight", "Imported", "Exported",
  "Mix", "YOverride", "YValue", "Scale", "Rotator", "Slider",
  "FastGradientWarp", "Pow", "Sqrt", "MultiMix", "Gradient",
]);

/** Prop types that use "TypeProp-uuid" (concatenated) instead of "Type.Prop-uuid" */
const CONCAT_PROP_TYPES = new Set(["Box"]);

export const NODE_ID_PREFIX_RULES = {
  density: (type: string): string =>
    DOT_DENSITY_TYPES.has(type) ? `${type}.Density` : `${type}DensityNode`,
  material: (type: string): string => `${type}MaterialProvider`,
  sadLayer: (type: string): string => `${type}SADMP`,
  sadCondition: (type: string): string => `${type}SADMP`,
  curve: (_type: string): string => `${_type}Curve`,
  curvePoint: (): string => "CurvePoint",
  materialLeaf: (): string => "Material",
  pattern: (type: string): string => `${type}.Pattern`,
  scanner: (type: string): string => `${type}.Scanner`,
  assignment: (type: string): string => `${type}.Assignments`,
  position: (type: string): string => `${type}Positions`,
  pointGenerator: (type: string): string => `${type}PointGenerator`,
  prop: (type: string): string =>
    CONCAT_PROP_TYPES.has(type) ? `${type}Prop` : `${type}.Prop`,
  directionality: (type: string): string => `${type}.Directionality`,
  environment: (type: string): string => `${type}.EnvironmentProvider`,
  tint: (type: string): string => `${type}.TintProvider`,
  blockMask: (type: string): string => `${type}.BlockMask`,
  biome: (): string => "Biome",
  terrain: (): string => "Terrain",
  runtime: (): string => "Runtime",
  delimiter: (parentType: string): string => `Delimiter${parentType}`,
  returnType: (type: string): string => `${type}PCNReturnType`,
  distanceFunction: (): string => "PCNDistanceFunction",
  decimalRange: (): string => "Decimal.Range",
  weight: (): string => "Weight.Weighted.Assignments",
};

// ---------------------------------------------------------------------------
// Field category inference (maps parent field → node category for NodeId)
// ---------------------------------------------------------------------------

/**
 * Maps a parent field name to the category used for $NodeId prefix generation.
 * Used when inferring category from structural position in JSON.
 */
export const FIELD_TO_CATEGORY: Record<string, string> = {
  Density: "density",
  DensityFunction: "density",
  FieldFunction: "density",
  Input: "density",
  InputA: "density",
  InputB: "density",
  Condition: "density",
  TrueInput: "density",
  FalseInput: "density",
  Factor: "density",
  Offset: "density",
  WarpSource: "density",
  WarpVector: "density",
  Amplitude: "density",
  YProvider: "density",
  Inputs: "density",
  MaterialProvider: "material",
  Solid: "material",
  Empty: "material",
  Low: "material",
  High: "material",
  Material: "material",
  Materials: "material",
  Curve: "curve",
  Pattern: "pattern",
  SubPattern: "pattern",
  Floor: "pattern",
  Ceiling: "pattern",
  Surface: "pattern",
  Positions: "position",
  PositionProvider: "position",
  Scanner: "scanner",
  ChildScanner: "scanner",
  Prop: "prop",
  Assignments: "assignment",
  Top: "assignment",
  Bottom: "assignment",
  VectorProvider: "vector",
  Vector: "vector",
  NewYAxis: "vector",
  Queue: "material",
  Layers: "sadLayer",
  BlockMask: "blockMask",
  Directionality: "directionality",
  EnvironmentProvider: "environment",
  TintProvider: "tint",
  DistanceFunction: "distanceFunction",
  ReturnType: "returnType",
};

// ---------------------------------------------------------------------------
// Clamp/SmoothClamp field renames
// ---------------------------------------------------------------------------

export const CLAMP_FIELD_MAP: Record<string, string> = {
  Min: "WallB",
  Max: "WallA",
};

export const CLAMP_FIELD_REVERSE: Record<string, string> = {
  WallA: "Max",
  WallB: "Min",
};

// ---------------------------------------------------------------------------
// Normalizer field flattening
// ---------------------------------------------------------------------------

export const NORMALIZER_FIELDS_EXPORT = {
  flat: ["FromMin", "FromMax", "ToMin", "ToMax"] as const,
  nested: {
    SourceRange: { Min: "FromMin", Max: "FromMax" },
    TargetRange: { Min: "ToMin", Max: "ToMax" },
  },
};

// ---------------------------------------------------------------------------
// Types that get Skip: false on export
// ---------------------------------------------------------------------------

export const SKIP_FIELD_CATEGORIES = new Set([
  "density", "position", "scanner", "pattern", "prop",
]);
