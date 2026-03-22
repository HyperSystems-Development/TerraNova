/**
 * Migration utility: converts old TerraNova internal naming conventions
 * to V2 (Hytale-native) type and field names.
 *
 * Used when loading saved TerraNova project files that use the legacy
 * internal naming scheme, so they can be upgraded to use V2 names directly.
 */

// ---------------------------------------------------------------------------
// Type rename map: old TerraNova name → V2 name (23 entries)
// ---------------------------------------------------------------------------

const TYPE_RENAME_MAP: Record<string, string> = {
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
  SquareRoot: "Sqrt",
  DomainWarp2D: "FastGradientWarp",
  DomainWarp3D: "FastGradientWarp",
  ScaledPosition: "Scale",
  TranslatedPosition: "Slider",
  RotatedPosition: "Rotator",
  VoronoiNoise2D: "CellNoise2D",
  VoronoiNoise3D: "CellNoise3D",
  LinearTransform: "AmplitudeConstant",
  BlendCurve: "MultiMix",
  CubeMath: "Cube",
  Square: "Pow",
};

// ---------------------------------------------------------------------------
// Invented type conversions: old type → { V2 type, extra fields to set }
// ---------------------------------------------------------------------------

const INVENTED_TYPE_MAP: Record<string, { type: string; fields?: Record<string, unknown> }> = {
  Zero: { type: "Constant", fields: { Value: 0.0 } },
  One: { type: "Constant", fields: { Value: 1.0 } },
  FractalNoise2D: { type: "SimplexNoise2D" },
  FractalNoise3D: { type: "SimplexNoise3D" },
  GradientDensity: { type: "Gradient" },
  AverageFunction: { type: "Mix" },
  FlatCache: { type: "Cache2D" },
  DistanceFromOrigin: { type: "Distance" },
  DistanceFromAxis: { type: "Distance" },
  DistanceFromPoint: { type: "Distance" },
  AngleFromOrigin: { type: "Angle" },
  AngleFromPoint: { type: "Angle" },
};

// ---------------------------------------------------------------------------
// Un-replaceable types: no V2 equivalent exists
// ---------------------------------------------------------------------------

const UNREPLACEABLE_TYPES = new Set([
  "SumSelf",
  "CubeRoot",
  "Inverse",
  "Modulo",
  "Wrap",
  "SplineFunction",
  "ClampToIndex",
  "RangeChoice",
  "Interpolate",
  "DoubleNormalizer",
  "Debug",
  "Passthrough",
  "YGradient",
  "HeightAboveSurface",
  "SimplexRidgeNoise2D",
  "SimplexRidgeNoise3D",
  "SurfaceDensity",
  "TerrainBoolean",
  "TerrainMask",
  "BeardDensity",
  "ColumnDensity",
  "CaveDensity",
  "MirroredPosition",
  "QuantizedPosition",
  "Conditional",
  "WeightedSum",
]);

// ---------------------------------------------------------------------------
// Noise types that get Frequency→Scale and Gain→Persistence conversions
// ---------------------------------------------------------------------------

const NOISE_TYPES = new Set([
  "SimplexNoise2D",
  "SimplexNoise3D",
  "CellNoise2D",
  "CellNoise3D",
  // Old names that map to noise types
  "VoronoiNoise2D",
  "VoronoiNoise3D",
  "FractalNoise2D",
  "FractalNoise3D",
]);

// ---------------------------------------------------------------------------
// All old type names (union of rename map keys + invented keys + unreplaceable)
// ---------------------------------------------------------------------------

const OLD_TYPE_NAMES = new Set([
  ...Object.keys(TYPE_RENAME_MAP),
  ...Object.keys(INVENTED_TYPE_MAP),
  ...UNREPLACEABLE_TYPES,
]);

// Old field names that indicate legacy TerraNova naming
const OLD_FIELD_NAMES = new Set([
  "Frequency",
  "Gain",
  "SourceRange",
  "TargetRange",
  "AngleDegrees",
  "WarpSeed",
  "Is2D",
]);

// ---------------------------------------------------------------------------
// Field conversion helpers
// ---------------------------------------------------------------------------

function convertNoiseFields(result: Record<string, unknown>): void {
  if ("Frequency" in result) {
    const freq = result.Frequency as number;
    result.Scale = freq !== 0 ? 1 / freq : 1;
    delete result.Frequency;
  }
  if ("Gain" in result) {
    result.Persistence = result.Gain;
    delete result.Gain;
  }
}

function convertClampFields(result: Record<string, unknown>): void {
  // Min → WallB, Max → WallA (matches existing CLAMP_FIELD_MAP)
  if ("Min" in result) {
    result.WallB = result.Min;
    delete result.Min;
  }
  if ("Max" in result) {
    result.WallA = result.Max;
    delete result.Max;
  }
}

function convertSmoothnessToRange(result: Record<string, unknown>): void {
  if ("Smoothness" in result) {
    result.Range = result.Smoothness;
    delete result.Smoothness;
  }
}

function convertThresholdToLimit(result: Record<string, unknown>): void {
  if ("Threshold" in result) {
    result.Limit = result.Threshold;
    delete result.Threshold;
  }
}

function convertNormalizerFields(result: Record<string, unknown>): void {
  const sourceRange = result.SourceRange as { Min: number; Max: number } | undefined;
  if (sourceRange && typeof sourceRange === "object") {
    result.FromMin = sourceRange.Min;
    result.FromMax = sourceRange.Max;
    delete result.SourceRange;
  }
  const targetRange = result.TargetRange as { Min: number; Max: number } | undefined;
  if (targetRange && typeof targetRange === "object") {
    result.ToMin = targetRange.Min;
    result.ToMax = targetRange.Max;
    delete result.TargetRange;
  }
}

function convertScaledPositionFields(result: Record<string, unknown>): void {
  const scale = result.Scale as { x: number; y: number; z: number } | undefined;
  if (scale && typeof scale === "object" && "x" in scale) {
    result.ScaleX = scale.x;
    result.ScaleY = scale.y;
    result.ScaleZ = scale.z;
    delete result.Scale;
  }
}

function convertTranslatedPositionFields(result: Record<string, unknown>): void {
  const translation = result.Translation as { x: number; y: number; z: number } | undefined;
  if (translation && typeof translation === "object" && "x" in translation) {
    result.SlideX = translation.x;
    result.SlideY = translation.y;
    result.SlideZ = translation.z;
    delete result.Translation;
  }
}

function convertRotatedPositionFields(result: Record<string, unknown>): void {
  if ("AngleDegrees" in result) {
    result.SpinAngle = result.AngleDegrees;
    delete result.AngleDegrees;
  }
}

function convertDomainWarpFields(result: Record<string, unknown>): void {
  if ("WarpSeed" in result) {
    result.Seed = result.WarpSeed;
    delete result.WarpSeed;
  }
  if ("Is2D" in result) {
    result["2D"] = result.Is2D;
    delete result.Is2D;
  }
}

function convertCurvePoints(result: Record<string, unknown>): void {
  if ("Points" in result && Array.isArray(result.Points)) {
    result.Points = (result.Points as Record<string, unknown>[]).map((pt) => {
      // Convert {x, y} → {In, Out} if using old format
      if ("x" in pt && "y" in pt && !("In" in pt)) {
        return { In: pt.x, Out: pt.y };
      }
      return pt;
    });
  }
}

function convertFloorField(result: Record<string, unknown>): void {
  if ("Floor" in result) {
    result.Limit = result.Floor;
    delete result.Floor;
  }
}

function convertCeilingField(result: Record<string, unknown>): void {
  if ("Ceiling" in result) {
    result.Limit = result.Ceiling;
    delete result.Ceiling;
  }
}

// ---------------------------------------------------------------------------
// Main migration function
// ---------------------------------------------------------------------------

/**
 * Migrates a node from old TerraNova internal naming to V2 (Hytale-native) names.
 *
 * @param node - A node object with a `Type` field
 * @returns The migrated node with V2 names, or null if the type is un-replaceable
 */
export function migrateToV2Names(
  node: Record<string, unknown>,
): Record<string, unknown> | null {
  const oldType = node.Type as string;

  // Un-replaceable types have no V2 equivalent
  if (UNREPLACEABLE_TYPES.has(oldType)) {
    return null;
  }

  // Start with a shallow copy
  const result: Record<string, unknown> = { ...node };

  // --- Determine the target V2 type ---

  // Check invented type map first (these override TYPE_RENAME_MAP)
  const invented = INVENTED_TYPE_MAP[oldType];
  if (invented) {
    result.Type = invented.type;
    if (invented.fields) {
      Object.assign(result, invented.fields);
    }
  }
  // Check the standard rename map
  else if (oldType in TYPE_RENAME_MAP) {
    result.Type = TYPE_RENAME_MAP[oldType];
  }
  // Otherwise, type is already V2-named — leave as-is

  const v2Type = result.Type as string;

  // --- Special type-specific field injections ---

  // DomainWarp2D/3D → FastGradientWarp with 2D flag
  if (oldType === "DomainWarp2D") {
    result["2D"] = true;
  } else if (oldType === "DomainWarp3D") {
    result["2D"] = false;
  }

  // Square → Pow with Exponent=2.0
  if (oldType === "Square") {
    result.Exponent = 2.0;
  }

  // --- Per-type field conversions ---

  // Noise field conversions (Frequency→Scale, Gain→Persistence)
  if (NOISE_TYPES.has(oldType) || NOISE_TYPES.has(v2Type)) {
    convertNoiseFields(result);
  }

  // Clamp / SmoothClamp: Min/Max → WallA/WallB
  if (v2Type === "Clamp" || v2Type === "SmoothClamp") {
    convertClampFields(result);
  }

  // SmoothClamp/SmoothMin/SmoothMax: Smoothness → Range
  if (v2Type === "SmoothClamp" || v2Type === "SmoothMin" || v2Type === "SmoothMax") {
    convertSmoothnessToRange(result);
  }

  // SmoothFloor/SmoothCeiling: Threshold → Limit
  if (v2Type === "SmoothFloor" || v2Type === "SmoothCeiling") {
    convertThresholdToLimit(result);
  }

  // Floor density: Floor field → Limit
  if (v2Type === "Floor") {
    convertFloorField(result);
  }

  // Ceiling density: Ceiling field → Limit
  if (v2Type === "Ceiling") {
    convertCeilingField(result);
  }

  // Normalizer: SourceRange/TargetRange → flat fields
  if (v2Type === "Normalizer") {
    convertNormalizerFields(result);
  }

  // ScaledPosition → Scale: vector decomposition
  if (oldType === "ScaledPosition") {
    convertScaledPositionFields(result);
  }

  // TranslatedPosition → Slider: vector decomposition
  if (oldType === "TranslatedPosition") {
    convertTranslatedPositionFields(result);
  }

  // RotatedPosition → Rotator: angle rename
  if (oldType === "RotatedPosition") {
    convertRotatedPositionFields(result);
  }

  // DomainWarp fields: WarpSeed → Seed, Is2D → 2D
  if (oldType === "DomainWarp2D" || oldType === "DomainWarp3D") {
    convertDomainWarpFields(result);
  }

  // Curve points: {x, y} → {In, Out}
  if (v2Type === "CurveMapper" || oldType === "CurveFunction") {
    convertCurvePoints(result);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Detection: is this node using old TerraNova naming?
// ---------------------------------------------------------------------------

/**
 * Detects whether a node uses old TerraNova internal naming conventions
 * by checking for known old type names or field names.
 */
export function isOldTerraNovaNaming(node: Record<string, unknown>): boolean {
  const type = node.Type as string | undefined;

  // Check if the type name itself is an old name
  if (type && OLD_TYPE_NAMES.has(type)) {
    return true;
  }

  // Check for old field names
  for (const key of Object.keys(node)) {
    if (OLD_FIELD_NAMES.has(key)) {
      return true;
    }
  }

  return false;
}
