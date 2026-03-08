/**
 * Per-type field descriptions for hover tooltips.
 * Displayed next to field labels in the PropertyPanel to help
 * users understand what each field controls and how changing it
 * affects the output.
 *
 * Structure: Record<TypeName, Record<FieldName, description | FieldDescription>>
 *
 * Field values can be a simple string (short tooltip) or a FieldDescription
 * object with an extended property for help-mode documentation.
 */

export interface FieldDescription {
  short: string;
  extended: string;
}

/** Return the short description string from a field description entry */
export function getShortDescription(entry: string | FieldDescription): string {
  return typeof entry === "string" ? entry : entry.short;
}

/** Return the extended description string (or short if none) */
export function getExtendedDescription(entry: string | FieldDescription): string {
  if (typeof entry === "string") return entry;
  return entry.extended || entry.short;
}

import { getSchemaDescriptions } from "./schemaLoader";

/**
 * Get field descriptions for a node type.
 * Local overrides take precedence, schema fills gaps.
 */
export function getFieldDescriptions(nodeType: string): Record<string, string | FieldDescription> | undefined {
  const local = FIELD_DESCRIPTIONS[nodeType];
  const schema = getSchemaDescriptions(nodeType);
  if (local && schema) {
    // Merge: local wins, schema fills gaps
    return { ...schema, ...local };
  }
  return local ?? (schema as Record<string, string | FieldDescription> | undefined) ?? undefined;
}

export const FIELD_DESCRIPTIONS: Record<string, Record<string, string | FieldDescription>> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Core Noise
  // ═══════════════════════════════════════════════════════════════════════════
  SimplexNoise2D: {
    Frequency: {
      short: "Controls feature size. Lower values produce larger, smoother features; higher values create smaller, more detailed noise.",
      extended: "Frequency determines the spatial rate of change of the noise function. A Frequency of 0.01 means one full noise cycle spans ~100 blocks. In Hytale mode this field is displayed as Scale (1/Frequency) — a Scale of 100 means the same thing. Common values: 0.001–0.005 for terrain base shape, 0.01–0.05 for surface detail, 0.1+ for fine grain texture.",
    },
    Amplitude: {
      short: "Scales the output range to [-Amplitude, +Amplitude]. Larger values create more extreme density differences.",
      extended: "Amplitude controls the vertical extent of the noise output. An Amplitude of 1.0 outputs values in [-1, 1]. For terrain height, this maps directly to block height variation — an Amplitude of 30 with a gradient creates hills up to 30 blocks tall. The final terrain shape depends on how this amplitude interacts with downstream nodes like Normalizer or Clamp.",
    },
    Seed: "Random seed for noise generation. Different seeds produce different patterns; same seed always produces the same result.",
    Octaves: {
      short: "Number of noise layers to combine. More octaves add finer detail but increase computation cost.",
      extended: "Each octave adds a layer of noise at increasingly higher frequency and lower amplitude (controlled by Lacunarity and Gain). 1 octave = smooth rolling hills. 4 octaves = natural-looking terrain with both large features and small details. 6+ octaves = very detailed but expensive. The output range grows with more octaves: for Gain=0.5, the theoretical max is Amplitude * (1 + 0.5 + 0.25 + ...) ≈ Amplitude * 2.",
    },
    Lacunarity: "Frequency multiplier between successive octaves. Values > 1 make each octave finer. Default 2.0 doubles frequency per octave.",
    Gain: {
      short: "Amplitude multiplier between successive octaves. Values < 1 (typical: 0.5) make each octave contribute less, creating a natural falloff.",
      extended: "Gain (also called Persistence in some systems) controls how much each successive octave contributes. At Gain=0.5 (default), each octave has half the amplitude of the previous one, producing natural-looking fractal detail. Higher Gain (e.g. 0.7) makes fine details more prominent. Lower Gain (e.g. 0.3) keeps only the broad shape. In Hytale mode this field may be displayed as Persistence.",
    },
  },
  SimplexNoise3D: {
    Frequency: "Controls feature size in 3D. Lower values produce larger, smoother features; higher values create smaller, more detailed noise.",
    Amplitude: "Scales the output range to [-Amplitude, +Amplitude]. Larger values create more extreme density differences.",
    Seed: "Random seed for noise generation. Different seeds produce different patterns; same seed always produces the same result.",
    Octaves: "Number of noise layers to combine. More octaves add finer detail but increase computation cost.",
    Lacunarity: "Frequency multiplier between successive octaves. Values > 1 make each octave finer. Default 2.0 doubles frequency per octave.",
    Gain: "Amplitude multiplier between successive octaves. Values < 1 (typical: 0.5) make each octave contribute less.",
  },
  SimplexRidgeNoise2D: {
    Frequency: "Controls feature size. Lower values produce wider ridges spaced further apart; higher values create tighter, more frequent ridges.",
    Amplitude: "Scales the ridge peaks. Output range is [0, Amplitude] since negative values are folded positive.",
    Seed: "Random seed for noise generation. Different seeds produce different ridge patterns.",
    Octaves: "Number of noise layers. More octaves add finer ridge detail.",
  },
  SimplexRidgeNoise3D: {
    Frequency: "Controls feature size in 3D. Lower values produce wider ridges; higher values create tighter ridges.",
    Amplitude: "Scales the ridge peaks. Output range is [0, Amplitude] since negative values are folded positive.",
    Seed: "Random seed for noise generation. Different seeds produce different 3D ridge patterns.",
    Octaves: "Number of noise layers. More octaves add finer ridge detail.",
  },
  VoronoiNoise2D: {
    Frequency: "Controls cell size. Lower values create larger cells; higher values create smaller, more numerous cells.",
    Seed: "Random seed for cell point generation. Different seeds rearrange the cell pattern.",
  },
  VoronoiNoise3D: {
    Frequency: "Controls cell size in 3D. Lower values create larger cells; higher values create smaller, more numerous cells.",
    Seed: "Random seed for cell point generation. Different seeds rearrange the 3D cell pattern.",
  },
  FractalNoise2D: {
    Frequency: "Base frequency of the first octave. Controls overall feature size.",
    Octaves: "Number of noise layers. Each octave adds finer detail at increasing frequency.",
    Lacunarity: "Frequency multiplier between octaves. Default 2.0 doubles frequency each octave.",
    Gain: "Amplitude multiplier between octaves. Default 0.5 halves amplitude each octave for natural falloff.",
  },
  FractalNoise3D: {
    Frequency: "Base frequency of the first octave in 3D. Controls overall feature size.",
    Octaves: "Number of noise layers. Each octave adds finer detail at increasing frequency.",
    Lacunarity: "Frequency multiplier between octaves. Default 2.0 doubles frequency each octave.",
    Gain: "Amplitude multiplier between octaves. Default 0.5 halves amplitude each octave for natural falloff.",
  },
  DomainWarp2D: {
    Amplitude: "How far sample positions are displaced. Higher values create more dramatic coordinate distortion.",
  },
  DomainWarp3D: {
    Amplitude: "How far sample positions are displaced in 3D. Higher values create more dramatic coordinate distortion.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Arithmetic
  // ═══════════════════════════════════════════════════════════════════════════
  SumSelf: {
    Count: "How many times the input is added to itself. A count of 3 is equivalent to multiplying the input by 3.",
  },
  Modulo: {
    Divisor: "The divisor for the modulo operation. Output repeats every Divisor units, creating periodic patterns.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Constants & References
  // ═══════════════════════════════════════════════════════════════════════════
  Constant: {
    Value: "The fixed value output everywhere. Use 0 for empty/air, positive values for solid density, negative for below-surface.",
  },
  ImportedValue: {
    Name: "References a named value exported from another asset file. Must exactly match an ExportAs name in the source file.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Additional Math
  // ═══════════════════════════════════════════════════════════════════════════
  AmplitudeConstant: {
    Value: "Constant multiplier applied to the input. Output = Input * Value. Use to scale a density signal by a fixed amount.",
  },
  Pow: {
    Exponent: "Power to raise the input to. Sign is preserved: output = sign(x) * |x|^Exponent. Values > 1 steepen, values < 1 flatten.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Smooth Operations
  // ═══════════════════════════════════════════════════════════════════════════
  SmoothClamp: {
    Min: "Minimum allowed output value (soft boundary). The transition near Min is smoothed by the Smoothness factor.",
    Max: "Maximum allowed output value (soft boundary). The transition near Max is smoothed by the Smoothness factor.",
    Smoothness: "Controls how gradual the clamping transition is. Higher values create softer edges; 0 is equivalent to a hard clamp.",
  },
  SmoothFloor: {
    Threshold: "The floor value below which the input is smoothly clamped. Acts as a soft lower bound.",
    Smoothness: "Controls how gradual the floor transition is. Higher values create a softer curve near the threshold.",
  },
  SmoothMin: {
    Smoothness: "Controls blending radius between the two inputs. Higher values create a smoother, more gradual minimum. 0 is equivalent to hard min.",
  },
  SmoothMax: {
    Smoothness: "Controls blending radius between the two inputs. Higher values create a smoother, more gradual maximum. 0 is equivalent to hard max.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Position Overrides & Sampling
  // ═══════════════════════════════════════════════════════════════════════════
  YOverride: {
    OverrideY: "The fixed Y coordinate to use when evaluating the input. The input is sampled at (x, OverrideY, z) instead of (x, y, z).",
  },
  BaseHeight: {
    BaseHeightName: "Name of the content field to read (e.g. 'Base', 'Water', 'Bedrock'). Must match a field defined in WorldStructures.",
    Distance: "When true, outputs the signed distance from the base height (y - baseY). When false, outputs the base height value itself.",
  },
  PositionsCellNoise: {
    Frequency: "Controls the cell size of the noise pattern. Lower values create larger cells.",
    Seed: "Random seed for noise generation. Different seeds produce different cell patterns.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Additional Operations
  // ═══════════════════════════════════════════════════════════════════════════
  SmoothCeiling: {
    Threshold: "The ceiling value above which the input is smoothly clamped. Acts as a soft upper bound.",
    Smoothness: "Controls how gradual the ceiling transition is. Higher values create a softer curve near the threshold.",
  },
  Gradient: {
    FromY: "Y coordinate where the gradient outputs 0 (bottom of the transition).",
    ToY: "Y coordinate where the gradient outputs 1 (top of the transition).",
    From: "Starting color of the gradient as a hex string (e.g. '#ffffff' for white).",
    To: "Ending color of the gradient as a hex string (e.g. '#000000' for black).",
  },
  XOverride: {
    OverrideX: "The fixed X coordinate to use when evaluating the input. The input is sampled at (OverrideX, y, z) instead of (x, y, z).",
  },
  ZOverride: {
    OverrideZ: "The fixed Z coordinate to use when evaluating the input. The input is sampled at (x, y, OverrideZ) instead of (x, y, z).",
  },
  SwitchState: {
    State: "The integer state value output by this node. Connect to a Switch node's selector to control which input is selected.",
  },
  Positions3D: {
    Frequency: "Controls the cell size of the 3D noise pattern. Lower values create larger cells.",
    Seed: "Random seed for noise generation. Different seeds produce different cell patterns.",
  },
  PositionsPinch: {
    Strength: "How strongly positions are pinched toward the center. Higher values create more extreme compression.",
  },
  PositionsTwist: {
    Angle: "Twist angle in degrees. Positions are rotated around the Y axis proportionally to their Y coordinate.",
  },
  GradientWarp: {
    WarpScale: "How far sample positions are displaced along the gradient. Higher values create more dramatic distortion.",
  },
  FastGradientWarp: {
    WarpFactor: "Displacement magnitude multiplier. Higher values create stronger warping distortion.",
    WarpScale: "Base frequency of the internal warp noise. Lower values produce larger, smoother distortion patterns.",
    WarpOctaves: "Number of noise octaves for the warp. More octaves add finer detail to the distortion pattern.",
    WarpLacunarity: "Frequency multiplier between warp octaves. Default 2.0 doubles frequency per octave.",
    WarpPersistence: "Amplitude decay per warp octave. Default 0.5 halves amplitude each octave for natural falloff.",
    WarpSeed: "Seed for the internal warp noise. Different seeds produce different distortion patterns.",
    Is2D: "When true, warping is computed in 2D (XZ plane only), ignoring the Y coordinate.",
  },
  CellWallDistance: {
    Frequency: "Controls the cell size. Lower values create larger cells with more distant walls.",
    Seed: "Random seed for cell generation. Different seeds produce different cell layouts.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Clamping & Range
  // ═══════════════════════════════════════════════════════════════════════════
  Clamp: {
    Min: "Minimum allowed output value. Any input below this is raised to Min.",
    Max: "Maximum allowed output value. Any input above this is lowered to Max.",
  },
  ClampToIndex: {
    Min: "Minimum index value (typically 0). Input values below this are clamped up.",
    Max: "Maximum index value (typically 255). Input values above this are clamped down.",
  },
  Normalizer: {
    SourceRange: "The expected input range {Min, Max}. Values in this range are mapped to TargetRange.",
    TargetRange: "The desired output range {Min, Max}. SourceRange is linearly mapped to this range.",
  },
  DoubleNormalizer: {
    SourceRangeA: "First segment input range. Values in this range map to TargetRangeA.",
    TargetRangeA: "First segment output range. SourceRangeA maps linearly to this range.",
    SourceRangeB: "Second segment input range. Values in this range map to TargetRangeB.",
    TargetRangeB: "Second segment output range. SourceRangeB maps linearly to this range.",
  },
  RangeChoice: {
    Threshold: "The boundary value. When the condition exceeds this, one input is selected; otherwise the other.",
  },
  LinearTransform: {
    Scale: "Multiplier applied to the input. Values > 1 amplify, values < 1 attenuate, negative values invert.",
    Offset: "Constant added after scaling. Shifts the entire output range up (positive) or down (negative).",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Position-Based
  // ═══════════════════════════════════════════════════════════════════════════
  DistanceFromAxis: {
    Axis: "Which world axis to measure distance from (X, Y, or Z). Y creates a horizontal cylinder gradient.",
  },
  DistanceFromPoint: {
    Point: "The {x, y, z} world coordinate to measure distance from. Creates a spherical gradient centered here.",
  },
  AngleFromPoint: {
    Point: "The {x, y, z} world coordinate to measure angle from in the XZ plane.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Curves & Splines
  // ═══════════════════════════════════════════════════════════════════════════
  SplineFunction: {
    Points: "Control points {x, y} defining the spline shape. The input value is the x-axis, output is the interpolated y-axis value.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Combinators
  // ═══════════════════════════════════════════════════════════════════════════
  Conditional: {
    Threshold: "The boundary value. When the Condition input exceeds this, TrueInput is used; otherwise FalseInput.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Sampling / Transforms
  // ═══════════════════════════════════════════════════════════════════════════
  TranslatedPosition: {
    Translation: "Offset vector {x, y, z} to shift the sample position. Positive X moves noise east, positive Y moves noise up, positive Z moves noise south.",
  },
  ScaledPosition: {
    Scale: "Scale vector {x, y, z} to multiply the sample position. Values < 1 stretch features larger; values > 1 compress features smaller.",
  },
  RotatedPosition: {
    AngleDegrees: "Rotation angle around the Y axis in degrees. 90 rotates features a quarter turn.",
  },
  MirroredPosition: {
    Axis: "Which axis to mirror across (X, Y, or Z). Features on the negative side are reflected to the positive side.",
  },
  QuantizedPosition: {
    StepSize: "Grid spacing in blocks. Positions are snapped to multiples of this value, creating a stepped/blocky effect.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Terrain-Specific
  // ═══════════════════════════════════════════════════════════════════════════
  TerrainBoolean: {
    Operation: "Boolean operation: Union (combine), Intersection (overlap only), or Subtraction (carve second from first).",
  },
  GradientDensity: {
    FromY: "Y coordinate where density is 1 (fully solid). Typically the bottom of the terrain.",
    ToY: "Y coordinate where density is 0 (fully air). Typically the top/surface height.",
  },
  CaveDensity: {
    Radius: "Radius of the cave in blocks. Larger values create wider cave tunnels.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Special
  // ═══════════════════════════════════════════════════════════════════════════
  Debug: {
    Label: "Text label printed alongside the debug output. Use a descriptive name to identify this debug point in logs.",
  },
  YGradient: {
    FromY: "Y coordinate where the gradient outputs 1 (fully solid).",
    ToY: "Y coordinate where the gradient outputs 0 (fully air).",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CURVES
  // ═══════════════════════════════════════════════════════════════════════════
  Manual: {
    Points: "Array of {x, y} control points defining the curve shape. Points are interpolated to create a smooth curve.",
  },
  // Curve Constant shares key with Density Constant — Constant.Value already defined above
  DistanceExponential: {
    Exponent: "Controls falloff steepness. Exponent 1 = linear, 2 = quadratic (fast falloff), 0.5 = square root (slow falloff).",
    Range: "Distance range {Min, Max} over which the exponential falloff applies.",
  },
  DistanceS: {
    Range: "Distance range {Min, Max} over which the S-curve transitions from 0 to 1.",
  },
  // Curve Clamp shares key with Density Clamp — Clamp.Min/Max already defined above
  LinearRemap: {
    SourceRange: "Expected input range {Min, Max}. Values in this range are mapped to TargetRange.",
    TargetRange: "Desired output range {Min, Max}. SourceRange is linearly mapped to this range.",
  },
  Noise: {
    Frequency: "Controls noise feature size on the curve. Lower values produce broader variation; higher values create rapid fluctuation.",
    Seed: "Random seed for noise generation. Different seeds produce different noise patterns on the curve.",
  },
  StepFunction: {
    Steps: "Number of discrete levels. Input range [0, 1] is divided into this many equal steps (e.g. 4 steps → values snap to 0, 0.25, 0.5, 0.75, 1).",
  },
  Threshold: {
    Threshold: "Cut-off value. Input above this outputs 1; input below outputs 0. Creates a hard binary transition.",
  },
  SmoothStep: {
    Edge0: "Lower edge of the smooth transition. Input values below this output 0.",
    Edge1: "Upper edge of the smooth transition. Input values above this output 1.",
  },
  Power: {
    Exponent: "Power to raise the input to. Values > 1 steepen the curve (push midtones darker); values < 1 flatten it (push midtones lighter).",
  },
  Imported: {
    Name: "References a named value exported from another asset file. Must exactly match an ExportAs name in the source file.",
  },
  Exported: {
    Name: "The name to export this node's output as. Other files can import this value by referencing this name.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MATERIAL PROVIDERS
  // ═══════════════════════════════════════════════════════════════════════════
  SpaceAndDepth: {
    DepthThreshold: "Number of blocks below the surface where the material switches from Solid to Empty. Higher values extend solid material deeper.",
    LayerContext: "Which surface to measure depth from: DEPTH_INTO_FLOOR (down from surface) or DEPTH_INTO_CEILING (up from ceiling).",
    MaxExpectedDepth: "Maximum depth in blocks that the layer stack extends. Layers beyond this depth use the last material.",
  },
  HeightGradient: {
    Range: "Y-height range {Min, Max} over which the gradient transitions between Low and High materials.",
  },
  NoiseSelector: {
    Frequency: "Controls noise feature size for the material selection pattern.",
    Threshold: "Noise boundary value. Areas where noise exceeds this get one material; below get the other.",
  },
  Solid: {
    Material: "Block material identifier (e.g. 'stone', 'dirt', 'grass'). Must match a material defined in the asset pack.",
  },
  Cluster: {
    Radius: "Radius of material clusters in blocks. Larger values create bigger, more uniform patches.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERNS
  // ═══════════════════════════════════════════════════════════════════════════
  Floor: {
    Depth: "How many blocks down from the surface are affected. A depth of 3 replaces the top 3 layers.",
  },
  Ceiling: {
    Depth: "How many blocks up from the ceiling surface are affected. A depth of 2 replaces the bottom 2 layers of overhangs.",
  },
  Gap: {
    Size: "Size of the gap in blocks. Defines the amount of empty space inserted.",
  },
  BlockType: {
    Material: "Block material identifier (e.g. 'stone', 'dirt'). Must match a material defined in the asset pack.",
  },
  Cuboid: {
    Min: "Lower corner {x, y, z} of the box region in world or relative coordinates.",
    Max: "Upper corner {x, y, z} of the box region in world or relative coordinates.",
    Material: "Block material used to fill the cuboid. Must match a material defined in the asset pack.",
    Size: "Half-extents along each axis. The SDF returns the signed distance from the box surface.",
  },
  Offset: {
    Offset: "Displacement vector {x, y, z} to shift the sub-pattern. Positive values move in the positive axis direction.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITION PROVIDERS
  // ═══════════════════════════════════════════════════════════════════════════
  List: {
    Positions: "Array of {x, y, z} world coordinates where features will be placed.",
  },
  Mesh2D: {
    Resolution: "Grid spacing in blocks between adjacent positions. Lower values create denser grids.",
    Jitter: "Random offset applied to each grid point (0 = perfect grid, 1 = up to one cell of random displacement).",
  },
  Mesh3D: {
    Resolution: "Grid spacing in blocks between adjacent positions in all 3 axes.",
    Jitter: "Random offset applied to each grid point (0 = perfect grid, 1 = up to one cell of random displacement).",
  },
  FieldFunction: {
    Threshold: "Minimum density value required to keep a position. Positions with density below this are discarded.",
  },
  Occurrence: {
    Chance: "Probability (0 to 1) that each position is kept. 0.5 means roughly half of positions are randomly removed.",
  },
  SimpleHorizontal: {
    Spacing: "Distance in blocks between positions on the horizontal grid.",
    Jitter: "Random horizontal offset applied to each position (0 = uniform grid, higher = more random).",
  },
  DensityBased: {
    Threshold: "Minimum density value required for a position to be placed. Higher values are more selective.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPS
  // ═══════════════════════════════════════════════════════════════════════════
  Box: {
    Size: "Dimensions {x, y, z} of the box in blocks. Each axis defines the box extent in that direction.",
    Material: "Block material used to fill the box. Must match a material defined in the asset pack.",
  },
  Column: {
    Height: "Height of the column in blocks, extending upward from the placement position.",
    Material: "Block material used for the column. Must match a material defined in the asset pack.",
  },
  Prefab: {
    Path: "File path to the prefab asset within the asset pack (e.g. 'props/oak_tree.json').",
    WeightedPrefabPaths: "List of prefab paths with weights. Higher-weight paths are chosen more often when multiple are present.",
    LegacyPath: "When true, uses the legacy single-path format instead of WeightedPrefabPaths.",
    LoadEntities: "Whether to load entity data embedded in the prefab. Disable to place only blocks.",
    MoldingDirection: "Direction to mold the prefab to the terrain surface: NONE (no molding), UP, DOWN, NORTH, SOUTH, EAST, or WEST.",
    MoldingChildren: "When true, child prefabs are also molded to the terrain surface along with the parent.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCANNERS
  // ═══════════════════════════════════════════════════════════════════════════
  ColumnLinear: {
    StepSize: "Y-axis increment between sample points. Smaller values increase resolution but cost more computation.",
    Range: "Y-axis bounds {Min, Max} for sampling. When relative to position, these are offsets from the position's Y coordinate.",
  },
  ColumnRandom: {
    Count: "Number of random Y positions to sample within the Range.",
    Range: "Y-axis bounds {Min, Max} for random sampling. When surface-relative, these are offsets from surface Y.",
  },
  Area: {
    Size: "Cuboid dimensions {x, y, z} defining the 3D scan volume in blocks. This is a box, not a sphere.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSIGNMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  // Constant Assignment has no user-editable scalar fields (Prop is a connection)
  // FieldFunction Assignment:
  // (Threshold is shared with FieldFunction position provider key above)
  // Sandwich and Weighted have no scalar fields (connections only)

  // ═══════════════════════════════════════════════════════════════════════════
  // VECTOR PROVIDERS
  // ═══════════════════════════════════════════════════════════════════════════
  "Vector:Constant": {
    Value: "The fixed 3D point {x, y, z}. In Hytale, this corresponds to a Point3D object with X, Y, Z fields.",
  },
  // DensityGradient, Cache have no user-editable scalar fields (connections only)

  // ═══════════════════════════════════════════════════════════════════════════
  // ENVIRONMENT PROVIDERS
  // ═══════════════════════════════════════════════════════════════════════════
  Biome: {
    BiomeId: "Identifier of the biome to apply. Must match a biome ID defined in the asset pack.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TINT PROVIDERS
  // ═══════════════════════════════════════════════════════════════════════════
  // Constant Tint shares key with Density Constant
  // Note: Gradient fields merged into Density section above

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOCK MASKS
  // ═══════════════════════════════════════════════════════════════════════════
  Single: {
    BlockType: "Block type identifier to match (e.g. 'stone'). Must match a material defined in the asset pack.",
  },
  Set: {
    BlockTypes: "Array of block type identifiers to match. Any block matching one of these types passes the mask.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DIRECTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════
  Directional: {
    Direction: "Direction vector {x, y, z} to bias placement toward. Does not need to be normalized — the engine normalizes it.",
  },
  Static: {
    Rotation: "Fixed rotation angle in degrees (0-360). The prefab is placed at exactly this rotation with no randomization.",
  },
  Random: {
    Seed: "Random seed for direction generation. Different seeds produce different random directions; same seed always reproduces the same result.",
  },
  Pattern: {
    InitialDirection: "Default compass direction (NORTH, SOUTH, EAST, WEST) before pattern-based adjustment.",
    Seed: "Random seed for directional variation within the pattern.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MATERIAL — New Types
  // ═══════════════════════════════════════════════════════════════════════════
  DownwardDepth: {
    MaxDepth: "Maximum depth in blocks to measure downward from the surface. Limits how deep the measurement goes.",
  },
  UpwardDepth: {
    MaxDepth: "Maximum depth in blocks to measure upward from the ceiling. Limits how high the measurement goes.",
  },
  DownwardSpace: {
    MaxSpace: "Maximum distance in blocks to measure open space downward. Counts air blocks below the surface.",
  },
  UpwardSpace: {
    MaxSpace: "Maximum distance in blocks to measure open space upward. Counts air blocks above the floor.",
  },
  Striped: {
    Thickness: "Thickness of each material stripe in blocks. Alternating stripes of connected materials.",
    Seed: "Random seed for stripe pattern variation.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITION — New Types
  // ═══════════════════════════════════════════════════════════════════════════
  Bound: {
    Min: "Lower corner {x, y, z} of the bounding box. Positions outside this are discarded.",
    Max: "Upper corner {x, y, z} of the bounding box. Positions outside this are discarded.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROP — New Types
  // ═══════════════════════════════════════════════════════════════════════════
  PondFiller: {
    Material: "Block material used to fill the pond (typically water). Must match a material defined in the asset pack.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════
  Settings: {
    CustomConcurrency: "Number of threads for worldgen. -1 = auto (uses all available cores).",
    BufferCapacityFactor: "Memory multiplier for chunk buffer allocation. Higher values use more RAM but may reduce chunk loading stalls.",
    TargetViewDistance: "Maximum render distance in blocks. Higher values generate more terrain but use more CPU/memory.",
    TargetPlayerCount: "Expected number of simultaneous players. Affects buffer pre-allocation sizing.",
    StatsCheckpoints: "Y-coordinate values at which terrain statistics are sampled for debugging/profiling.",
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — New Pre-Release Types
  // ═══════════════════════════════════════════════════════════════════════════
  OffsetConstant: {
    Value: "Constant offset added to the input. Output = Input + Value. Use to shift a density signal by a fixed amount.",
  },
  Angle: {
    Vector: "Static reference vector {x, y, z} for angle computation.",
    VectorProvider: "Optional dynamic vector provider that overrides the static Vector.",
    IsAxis: "Whether the reference is treated as an axis (angle measured in 0-180 range).",
  },
  Axis: {
    Axis: "Unit direction vector {x, y, z} defining the axis of the SDF. Default (0, 1, 0) creates a vertical axis.",
    IsAnchored: "When true, the axis is anchored at the origin. When false, the axis extends infinitely in both directions.",
  },

  // Shape SDFs
  Ellipsoid: {
    Radius: "Half-extents along each axis. The SDF returns the signed distance from the ellipsoid surface.",
  },
  Cylinder: {
    Radius: "Radius of the cylinder cross-section in the XZ plane.",
    Height: "Total height of the cylinder along the Y axis.",
  },
  Plane: {
    Normal: "Unit normal vector defining the plane orientation.",
    Distance: "Signed distance of the plane from the origin along the normal.",
  },
  Shell: {
    InnerRadius: "Inner radius of the spherical shell.",
    OuterRadius: "Outer radius of the spherical shell.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MATERIAL — Missing Entries
  // ═══════════════════════════════════════════════════════════════════════════
  ConstantThickness: {
    Thickness: "Fixed layer thickness in blocks. This layer always has exactly this many blocks of its material.",
  },
  RangeThickness: {
    RangeMin: "Minimum possible layer thickness in blocks.",
    RangeMax: "Maximum possible layer thickness in blocks. Actual thickness is randomly chosen between Min and Max.",
    Seed: "Random seed for thickness variation. Same seed produces same thickness pattern.",
  },
  WeightedThickness: {
    PossibleThicknesses: "Array of {Weight, Thickness} entries. Higher Weight means higher probability of that thickness being selected.",
    Seed: "Random seed for weighted selection. Same seed produces same choices.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONDITIONS — Missing Entries
  // ═══════════════════════════════════════════════════════════════════════════
  EqualsCondition: {
    ContextToCheck: "Which context property to evaluate (e.g. SPACE_ABOVE_FLOOR, DEPTH_INTO_FLOOR).",
    Value: "The exact value to compare against. Condition is true only when the context equals this value.",
  },
  GreaterThanCondition: {
    ContextToCheck: "Which context property to evaluate (e.g. SPACE_ABOVE_FLOOR, DEPTH_INTO_FLOOR).",
    Threshold: "Condition is true when the context value exceeds this threshold.",
  },
  SmallerThanCondition: {
    ContextToCheck: "Which context property to evaluate (e.g. SPACE_ABOVE_FLOOR, DEPTH_INTO_FLOOR).",
    Threshold: "Condition is true when the context value is below this threshold.",
  },

};
