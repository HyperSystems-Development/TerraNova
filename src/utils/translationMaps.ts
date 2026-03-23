/**
 * Shared translation maps used by the import pipeline (hytaleToInternal.ts),
 * graph builder (jsonToGraph.ts), and export pipeline (internalToHytale.ts).
 */

// ---------------------------------------------------------------------------
// Inputs[] → named handle mapping (V2 type name → ordered handle names)
// ---------------------------------------------------------------------------
// Shared map used by both the import pipeline and graph builder to convert
// Inputs[] array indices into named target handles for edges.

export const HYTALE_ARRAY_TO_NAMED: Record<string, string[]> = {
  // Single-input types (V2 names)
  Inverter: ["Input"], CurveMapper: ["Input"], Cache: ["Input"],
  Abs: ["Input"], Sqrt: ["Input"], Cube: ["Input"],
  CubeRoot: ["Input"], Inverse: ["Input"], Modulo: ["Input"],
  Clamp: ["Input"], SmoothClamp: ["Input"], Normalizer: ["Input"],
  AmplitudeConstant: ["Input"], FlatCache: ["Input"], Cache2D: ["Input"],
  FastGradientWarp: ["Input"], Scale: ["Input"], Slider: ["Input"],
  Rotator: ["Input"], MirroredPosition: ["Input"], QuantizedPosition: ["Input"],
  SurfaceDensity: ["Input"], TerrainMask: ["Input"], BeardDensity: ["Input"],
  ColumnDensity: ["Input"], CaveDensity: ["Input"], Debug: ["Input"],
  Passthrough: ["Input"], Wrap: ["Input"], SplineFunction: ["Input"],
  Pow: ["Input"], SumSelf: ["Input"], Exported: ["Input"],
  Imported: ["Input"], YOverride: ["Input"], XOverride: ["Input"],
  ZOverride: ["Input"], Floor: ["Input"], Ceiling: ["Input"],
  SmoothCeiling: ["Input"], SmoothFloor: ["Input"], Anchor: ["Input"],
  PositionsPinch: ["Input"], PositionsTwist: ["Input"],
  GradientDensity: ["Input"], Gradient: ["Input"], YGradient: ["Input"],
  ClampToIndex: ["Input"], DoubleNormalizer: ["Input"],
  // Legacy single-input types (pre-V2 names, kept for old save file compat)
  Negate: ["Input"], CurveFunction: ["Input"], CacheOnce: ["Input"],
  SquareRoot: ["Input"], CubeMath: ["Input"], LinearTransform: ["Input"],
  DomainWarp2D: ["Input"], DomainWarp3D: ["Input"],
  ScaledPosition: ["Input"], TranslatedPosition: ["Input"],
  RotatedPosition: ["Input"], Square: ["Input"], ImportedValue: ["Input"],
  // 2-input types
  Offset: ["Input", "Offset"],
  GradientWarp: ["Input", "WarpSource"],
  VectorWarp: ["Input", "WarpVector"],
  Amplitude: ["Input", "Amplitude"],
  YSampled: ["Input", "YProvider"],
  WeightedSum: ["Inputs[0]", "Inputs[1]"],
  // 3-input types (V2 names)
  Mix: ["InputA", "InputB", "Factor"],
  MultiMix: ["InputA", "InputB", "Factor"],
  // 3-input types (legacy pre-V2 names, kept for old save file compat)
  Blend: ["InputA", "InputB", "Factor"],
  BlendCurve: ["InputA", "InputB", "Factor"],
  Interpolate: ["InputA", "InputB", "Factor"],
  // Conditional variants
  Conditional: ["Condition", "TrueInput", "FalseInput"],
  RangeChoice: ["Condition", "TrueInput", "FalseInput"],
};

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
