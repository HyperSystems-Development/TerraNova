/**
 * Single source of truth for all legacy type keys — node types that existed
 * in earlier versions of Hytale's worldgen API but are no longer present in
 * the pre-release. Legacy nodes still load and render correctly but are
 * hidden from the Quick Add palette and display an amber LEGACY badge.
 */
export const LEGACY_TYPE_KEYS: ReadonlySet<string> = new Set([
  // Density (43 legacy — all removed from the registry)
  "SimplexRidgeNoise2D", "SimplexRidgeNoise3D",
  "FractalNoise2D", "FractalNoise3D",
  "VoronoiNoise2D", "VoronoiNoise3D",
  "SumSelf", "WeightedSum", "Square", "CubeRoot", "CubeMath",
  "Inverse", "Modulo", "ClampToIndex", "DoubleNormalizer",
  "RangeChoice", "Interpolate", "DistanceFromOrigin", "DistanceFromAxis",
  "DistanceFromPoint", "AngleFromOrigin", "AngleFromPoint",
  "HeightAboveSurface", "MirroredPosition", "QuantizedPosition",
  "Conditional", "AverageFunction",
  "SurfaceDensity", "TerrainBoolean", "TerrainMask",
  "GradientDensity", "BeardDensity", "ColumnDensity", "CaveDensity",
  "SplineFunction", "FlatCache", "Wrap",
  "Zero", "One", "Debug", "Passthrough", "YGradient", "Amplitude",
  // Density — old names replaced by V2 names
  "Product", "Negate", "SquareRoot", "ImportedValue", "LinearTransform",
  "CoordinateX", "CoordinateY", "CoordinateZ", "CurveFunction",
  "Blend", "BlendCurve", "MinFunction", "MaxFunction",
  "CacheOnce", "TranslatedPosition", "ScaledPosition", "RotatedPosition",
  "DomainWarp2D", "DomainWarp3D",
  // Curves (9)
  "Curve:Noise", "Curve:StepFunction", "Curve:Threshold",
  "Curve:SmoothStep", "Curve:Power", "Curve:LinearRemap",
  "Curve:Cache", "Curve:Exported", "Curve:Blend",
  // Materials (10)
  "Material:Solid", "Material:Empty", "Material:Exported",
  "Material:Conditional", "Material:Blend", "Material:HeightGradient",
  "Material:NoiseSelector", "Material:Surface", "Material:Cave", "Material:Cluster",
  // Patterns (5)
  "Pattern:Exported", "Pattern:Conditional", "Pattern:Blend",
  "Pattern:Union", "Pattern:Intersection",
  // Positions (4)
  "Position:SurfaceProjection", "Position:Exported",
  "Position:Conditional", "Position:DensityBased",
  // Props (4)
  "Prop:Surface", "Prop:Cave", "Prop:Conditional", "Prop:Exported",
  // Environment (1 — Environment:Imported is an active V2 type)
  "Environment:Exported",
  // Tint (1 — Tint:Imported is an active V2 type)
  "Tint:Exported",
  // Directionality (3)
  "Directionality:Uniform", "Directionality:Directional", "Directionality:Normal",
]);

/**
 * Check whether a full node type key (e.g. "SimplexRidgeNoise2D" or "Curve:Noise")
 * is a legacy type that is no longer in the Hytale pre-release API.
 */
export function isLegacyTypeKey(typeKey: string): boolean {
  return LEGACY_TYPE_KEYS.has(typeKey);
}

/**
 * Type keys that are still registered for loading old projects, but should not
 * be offered for newly-created graphs because the current Hytale API exposes a
 * clearer canonical V2 name.
 */
export const NON_CANONICAL_PALETTE_TYPE_KEYS: ReadonlySet<string> = new Set([
  // Density aliases kept for backwards compatibility with old TerraNova files.
  "Product",
  "Negate",
  "CurveFunction",
  "CacheOnce",
  "ImportedValue",
  "Blend",
  "MinFunction",
  "MaxFunction",
  "CoordinateX",
  "CoordinateY",
  "CoordinateZ",
  "SquareRoot",
  "DomainWarp2D",
  "DomainWarp3D",
  "LinearTransform",
  "BlendCurve",
  "TranslatedPosition",
  "ScaledPosition",
  "RotatedPosition",

  // Current Javadocs expose Cache2dDensityAsset_Deprecated. Keep loading it,
  // but prefer CacheDensityAsset for newly-created graphs.
  "Cache2D",

  // Layer sub-assets now have their own category; keep old material-prefixed
  // layer nodes loadable but prefer Layer:* for newly-created graphs.
  "Material:ConstantThickness",
  "Material:NoiseThickness",
  "Material:RangeThickness",
  "Material:WeightedThickness",
]);

/**
 * Whether a type should be offered in new-node UI surfaces.
 * Existing projects can still load registered legacy/non-canonical nodes.
 */
export function isPaletteTypeKeyVisible(typeKey: string): boolean {
  return !isLegacyTypeKey(typeKey) && !NON_CANONICAL_PALETTE_TYPE_KEYS.has(typeKey);
}

/**
 * Maps a legacy type key to its closest modern replacement, where a safe 1:1
 * substitution exists. Returns null when no direct replacement is available
 * (the user must manually recreate the node with the correct modern type).
 *
 * Replacement keys use the same full-key format as the legacy keys.
 */
export const LEGACY_TYPE_REPLACEMENTS: ReadonlyMap<string, string> = new Map([
  // Density — direct functional equivalents
  ["SimplexRidgeNoise2D", "SimplexNoise2D"],
  ["SimplexRidgeNoise3D", "SimplexNoise3D"],
  ["FractalNoise2D",      "SimplexNoise2D"],
  ["FractalNoise3D",      "SimplexNoise3D"],
  ["DoubleNormalizer",    "Normalizer"],
  ["AverageFunction",     "Mix"],
  ["Interpolate",         "Mix"],
  ["GradientDensity",     "Gradient"],
  ["YGradient",           "Gradient"],
  ["DistanceFromOrigin",  "Distance"],
  ["DistanceFromPoint",   "Distance"],
  ["DistanceFromAxis",    "Distance"],
  ["AngleFromOrigin",     "Angle"],
  ["AngleFromPoint",      "Angle"],
  ["FlatCache",           "Cache"],
  ["Zero",                "Constant"],
  ["One",                 "Constant"],
  ["Amplitude",           "AmplitudeConstant"],
  ["VoronoiNoise2D",     "CellNoise2D"],
  ["VoronoiNoise3D",     "CellNoise3D"],
  // Old names → V2 names
  ["Product",             "Multiplier"],
  ["Negate",              "Inverter"],
  ["SquareRoot",          "Sqrt"],
  ["ImportedValue",       "Imported"],
  ["LinearTransform",     "AmplitudeConstant"],
  ["CoordinateX",         "XValue"],
  ["CoordinateY",         "YValue"],
  ["CoordinateZ",         "ZValue"],
  ["CurveFunction",       "CurveMapper"],
  ["Blend",               "Mix"],
  ["BlendCurve",          "MultiMix"],
  ["MinFunction",         "Min"],
  ["MaxFunction",         "Max"],
  ["CacheOnce",           "Cache"],
  ["TranslatedPosition",  "Slider"],
  ["ScaledPosition",      "Scale"],
  ["RotatedPosition",     "Rotator"],
  ["DomainWarp2D",        "FastGradientWarp"],
  ["DomainWarp3D",        "FastGradientWarp"],
  // Curves — direct functional equivalents
  ["Curve:Blend",         "Curve:Sum"],
  ["Curve:Cache",         "Curve:Manual"],
  ["Curve:Noise",         "Curve:Manual"],
  ["Curve:StepFunction",  "Curve:Manual"],
  ["Curve:Threshold",     "Curve:Manual"],
  ["Curve:SmoothStep",    "Curve:Manual"],
  ["Curve:Power",         "Curve:Manual"],
  ["Curve:LinearRemap",   "Curve:Manual"],
]);

/**
 * Returns the modern replacement type key for a legacy type key, or null if
 * no direct replacement is available.
 */
export function getLegacyReplacement(typeKey: string): string | null {
  return LEGACY_TYPE_REPLACEMENTS.get(typeKey) ?? null;
}
