/**
 * Single source of truth for all legacy type keys — node types that existed
 * in earlier versions of Hytale's worldgen API but are no longer present in
 * the pre-release. Legacy nodes still load and render correctly but are
 * hidden from the Quick Add palette and display an amber LEGACY badge.
 */
export const LEGACY_TYPE_KEYS: ReadonlySet<string> = new Set([
  // Density (39 legacy)
  "SimplexRidgeNoise2D", "SimplexRidgeNoise3D",
  "FractalNoise2D", "FractalNoise3D",
  "SumSelf", "WeightedSum", "CubeRoot", "CubeMath",
  "Inverse", "Modulo", "ClampToIndex", "DoubleNormalizer",
  "Interpolate", "DistanceFromOrigin", "DistanceFromAxis",
  "DistanceFromPoint", "AngleFromOrigin", "AngleFromPoint",
  "HeightAboveSurface", "MirroredPosition", "QuantizedPosition",
  "Conditional", "AverageFunction",
  "SurfaceDensity", "TerrainBoolean", "TerrainMask",
  "GradientDensity", "BeardDensity", "ColumnDensity", "CaveDensity",
  "SplineFunction", "FlatCache", "Wrap",
  "Zero", "One", "Debug", "Passthrough", "YGradient", "Amplitude",
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
  // Positions (4 + 2 deprecated 2026.03.05)
  "Position:SurfaceProjection", "Position:Exported",
  "Position:Conditional", "Position:DensityBased",
  // Positions (deprecated 2026.03.05 — replaced by SquareGrid2d + Scaler + Jitter chain)
  "Position:Mesh2D", "Position:Mesh3D",
  // Props (4 + 3 deprecated 2026.03.05)
  "Prop:Surface", "Prop:Cave", "Prop:Conditional", "Prop:Exported",
  // Props (deprecated 2026.03.05 — replaced by Cuboid + Locator + Mask wrappers)
  "Prop:Box", "Prop:Column", "Prop:Cluster",
  // Scanners (deprecated 2026.03.05 — replaced by Linear, Random, Radial, Queue, Direct)
  "Scanner:ColumnLinear", "Scanner:ColumnRandom", "Scanner:Area", "Scanner:Origin",
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
  ["FlatCache",           "Cache2D"],
  ["Zero",                "Slider"],
  ["One",                 "Slider"],
  ["Amplitude",           "AmplitudeConstant"],
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
