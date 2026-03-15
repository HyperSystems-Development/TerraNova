/**
 * Contextual guidance tips for node types.
 * Displayed in the PropertyPanel to help users understand
 * non-obvious behavior, output ranges, and common pitfalls.
 */

export interface NodeTip {
  message: string;
  severity: "info" | "warning";
}

/**
 * Map of V2 Type name → contextual tips.
 * Keys match the `data.type` field on nodes (not the prefixed node type key).
 */
export const NODE_TIPS: Record<string, NodeTip[]> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Core Noise
  // ═══════════════════════════════════════════════════════════════════════════
  SimplexNoise2D: [
    {
      message:
        "Simplex noise outputs values in [-Amplitude, +Amplitude]. Use a Normalizer to remap to [0, 1] if needed.",
      severity: "info",
    },
  ],
  SimplexNoise3D: [
    {
      message:
        "Simplex noise outputs values in [-Amplitude, +Amplitude]. Use a Normalizer to remap to [0, 1] if needed.",
      severity: "info",
    },
  ],
  SimplexRidgeNoise2D: [
    {
      message:
        "Ridge noise folds negative values into positive, producing outputs in [0, Amplitude]. Peaks form at the fold lines.",
      severity: "info",
    },
  ],
  SimplexRidgeNoise3D: [
    {
      message:
        "Ridge noise folds negative values into positive, producing outputs in [0, Amplitude]. Peaks form at the fold lines.",
      severity: "info",
    },
  ],
  VoronoiNoise2D: [
    {
      message:
        "Voronoi/Cell noise outputs values in the range [0, ~1] by default. The exact range depends on the ReturnType. Use a Normalizer to remap if needed.",
      severity: "info",
    },
  ],
  VoronoiNoise3D: [
    {
      message:
        "Voronoi/Cell noise outputs values in the range [0, ~1] by default. The exact range depends on the ReturnType. Use a Normalizer to remap if needed.",
      severity: "info",
    },
  ],
  FractalNoise2D: [
    {
      message:
        "Fractal noise layers multiple octaves of simplex noise. Output range grows with Octaves and Gain — normalize downstream if needed.",
      severity: "info",
    },
  ],
  FractalNoise3D: [
    {
      message:
        "Fractal noise layers multiple octaves of simplex noise in 3D. Output range grows with Octaves and Gain — normalize downstream if needed.",
      severity: "info",
    },
  ],
  DomainWarp2D: [
    {
      message:
        "Distorts the input coordinate space before sampling. Higher Amplitude values produce more dramatic warping. Useful for organic terrain variation.",
      severity: "info",
    },
  ],
  DomainWarp3D: [
    {
      message:
        "Distorts the 3D input coordinate space before sampling. Higher Amplitude values produce more dramatic warping effects.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Arithmetic
  // ═══════════════════════════════════════════════════════════════════════════
  Sum: [
    {
      message:
        "Adds all connected inputs together. Output range is the sum of all input ranges — may need clamping or normalization.",
      severity: "info",
    },
  ],
  SumSelf: [
    {
      message:
        "Adds the input to itself Count times. Equivalent to multiplying by Count. Useful for amplifying a signal.",
      severity: "info",
    },
  ],
  WeightedSum: [
    {
      message:
        "Adds inputs together, each multiplied by its corresponding weight. Weights do not need to sum to 1.",
      severity: "info",
    },
  ],
  Product: [
    {
      message:
        "Multiplies all connected inputs together. If any input is 0, the output is 0. Useful for masking one density by another.",
      severity: "info",
    },
  ],
  Negate: [
    {
      message:
        "Flips the sign of the input: positive becomes negative and vice versa. Useful for inverting terrain shapes.",
      severity: "info",
    },
  ],
  Abs: [
    {
      message:
        "Returns the absolute value of the input. Negative values become positive, creating fold patterns at zero crossings.",
      severity: "info",
    },
  ],
  SquareRoot: [
    {
      message:
        "Returns the square root of the input. Negative inputs will produce NaN — ensure the input is non-negative or use Abs first.",
      severity: "warning",
    },
  ],
  CubeRoot: [
    {
      message:
        "Returns the cube root of the input. Unlike SquareRoot, this works with negative values.",
      severity: "info",
    },
  ],
  Square: [
    {
      message:
        "Squares the input (x * x). Always produces non-negative output. Values between -1 and 1 shrink, values outside grow rapidly.",
      severity: "info",
    },
  ],
  CubeMath: [
    {
      message:
        "Cubes the input (x * x * x). Preserves the sign — positive inputs stay positive, negative stay negative.",
      severity: "info",
    },
  ],
  Inverse: [
    {
      message:
        "Returns 1/x. Input values near zero will produce extremely large outputs — consider clamping the input first.",
      severity: "warning",
    },
  ],
  Modulo: [
    {
      message:
        "Returns the remainder after dividing the input by Divisor. Creates repeating patterns. Output range is [0, Divisor).",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Additional Math
  // ═══════════════════════════════════════════════════════════════════════════
  AmplitudeConstant: [
    {
      message:
        "Multiplies the input by a constant Value. Equivalent to a Product node with one input being a Constant, but more efficient.",
      severity: "info",
    },
  ],
  Pow: [
    {
      message:
        "Raises the input to the given Exponent while preserving sign. Exponent > 1 steepens (pushes values toward 0); Exponent < 1 flattens (pushes values toward 1).",
      severity: "info",
    },
  ],
  SmoothClamp: [
    {
      message:
        "Like Clamp but with smooth polynomial transitions at the boundaries. The Smoothness parameter controls how gradual the transition is.",
      severity: "info",
    },
  ],
  SmoothFloor: [
    {
      message:
        "Applies a smooth lower bound to the input. Values below the Threshold are smoothly brought up. Higher Smoothness creates a softer curve.",
      severity: "info",
    },
  ],
  SmoothMin: [
    {
      message:
        "Smooth minimum of two inputs. Unlike hard Min, this creates a gradual blend near where the inputs are equal — useful for organic terrain merging.",
      severity: "info",
    },
  ],
  SmoothMax: [
    {
      message:
        "Smooth maximum of two inputs. Unlike hard Max, this creates a gradual blend near where the inputs are equal — useful for organic terrain union.",
      severity: "info",
    },
  ],
  Anchor: [
    {
      message:
        "Evaluates the input at the fixed position (0, 0, 0) regardless of the current sample position. Captures a single value from the input.",
      severity: "info",
    },
  ],
  YOverride: [
    {
      message:
        "Evaluates the input with Y replaced by OverrideY. Useful for sampling 3D noise at a fixed height to create 2D patterns from 3D sources.",
      severity: "info",
    },
  ],
  BaseHeight: [
    {
      message:
        "Reads a named height value from the WorldStructures content fields. When Distance is true, outputs the signed distance from that height.",
      severity: "info",
    },
  ],
  PositionsCellNoise: [
    {
      message:
        "Cell/Voronoi noise approximation used for position-based sampling. Outputs distance-to-nearest-cell-point values.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Additional Operations
  // ═══════════════════════════════════════════════════════════════════════════
  SmoothCeiling: [
    {
      message:
        "Applies a smooth upper bound to the input. Values above the Threshold are smoothly brought down. Higher Smoothness creates a softer curve.",
      severity: "info",
    },
  ],
  Gradient: [
    {
      message:
        "Computes the directional derivative of the input density along the Axis direction using finite differences.",
      severity: "info",
    },
  ],
  Amplitude: [
    {
      message:
        "Multiplies the Input by a second connected Amplitude signal. Like AmplitudeConstant but the amplitude varies spatially.",
      severity: "info",
    },
  ],
  XOverride: [
    {
      message:
        "Evaluates the input with X replaced by OverrideX. Useful for sampling at a fixed X coordinate to create YZ-plane patterns.",
      severity: "info",
    },
  ],
  ZOverride: [
    {
      message:
        "Evaluates the input with Z replaced by OverrideZ. Useful for sampling at a fixed Z coordinate to create XY-plane patterns.",
      severity: "info",
    },
  ],
  YSampled: [
    {
      message:
        "Evaluates the Input at a Y position determined by the YProvider input. The Y coordinate comes from evaluating the provider at (x,y,z).",
      severity: "info",
    },
  ],
  SwitchState: [
    {
      message:
        "Outputs a constant State integer. Connect to a Switch node to select which input case is active.",
      severity: "info",
    },
  ],
  Positions3D: [
    {
      message:
        "3D cell noise for position sampling. Outputs distance-to-nearest-cell-point in all 3 dimensions.",
      severity: "info",
    },
  ],
  PositionsPinch: [
    {
      message:
        "Pinches the input positions toward the Y axis. Strength controls how aggressively horizontal coordinates are compressed.",
      severity: "info",
    },
  ],
  PositionsTwist: [
    {
      message:
        "Twists the input positions around the Y axis. The twist amount increases with Y coordinate, creating a spiral effect.",
      severity: "info",
    },
  ],
  GradientWarp: [
    {
      message:
        "Displaces sample positions along the numerical gradient of a secondary density input. Creates organic, flow-like distortion.",
      severity: "info",
    },
  ],
  VectorWarp: [
    {
      message:
        "Displaces sample positions by a connected vector field. More general than GradientWarp — supports arbitrary displacement directions.",
      severity: "info",
    },
  ],
  Terrain: [
    {
      message:
        "Outputs the terrain density at the sample position. Context-dependent — requires a terrain pipeline to be defined.",
      severity: "warning",
    },
  ],
  CellWallDistance: [
    {
      message:
        "Outputs the distance to the nearest cell wall in a Voronoi pattern. Useful for creating wall/border effects between cells.",
      severity: "info",
    },
  ],
  DistanceToBiomeEdge: [
    {
      message:
        "Outputs the distance to the nearest biome boundary. Context-dependent — requires biome data from the server.",
      severity: "warning",
    },
  ],
  Pipeline: [
    {
      message:
        "Evaluates a sequence of density operations in order. Context-dependent — represents a chained processing pipeline.",
      severity: "warning",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Constants & References
  // ═══════════════════════════════════════════════════════════════════════════
  Constant: [
    {
      message:
        "Outputs a fixed value everywhere, regardless of position. Useful as a static input to combinators or as a threshold source.",
      severity: "info",
    },
  ],
  ImportedValue: [
    {
      message:
        "References a named value exported from another asset file. The Name must exactly match an ExportAs name in the source file.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Clamping & Range
  // ═══════════════════════════════════════════════════════════════════════════
  Clamp: [
    {
      message:
        "Restricts output to [Min, Max]. Values outside this range are clamped to the nearest bound.",
      severity: "info",
    },
  ],
  ClampToIndex: [
    {
      message:
        "Clamps the input to integer indices within [Min, Max]. Useful for mapping density to discrete block palette indices.",
      severity: "info",
    },
  ],
  Normalizer: [
    {
      message:
        "Maps values from SourceRange to TargetRange linearly. Common use: [-1, 1] → [0, 1] for noise normalization.",
      severity: "info",
    },
  ],
  DoubleNormalizer: [
    {
      message:
        "Two-segment normalizer: values in SourceRangeA map to TargetRangeA, values in SourceRangeB map to TargetRangeB. Useful for asymmetric remapping.",
      severity: "info",
    },
  ],
  RangeChoice: [
    {
      message:
        "Selects between two inputs based on whether a condition exceeds the Threshold. Similar to Conditional but may blend at the boundary.",
      severity: "info",
    },
  ],
  LinearTransform: [
    {
      message:
        "Applies a linear function: output = (input * Scale) + Offset. Use Scale to amplify/shrink and Offset to shift up/down.",
      severity: "info",
    },
  ],
  Interpolate: [
    {
      message:
        "Linearly interpolates between Input A and Input B using the Factor input (0 = A, 1 = B). Factor values outside [0, 1] extrapolate.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Position-Based
  // ═══════════════════════════════════════════════════════════════════════════
  CoordinateX: [
    {
      message:
        "Outputs the world X coordinate of the sample position. Produces a gradient that increases along the X axis.",
      severity: "info",
    },
  ],
  CoordinateY: [
    {
      message:
        "Outputs the world Y coordinate (height). Produces a vertical gradient — useful as a base for terrain height functions.",
      severity: "info",
    },
  ],
  CoordinateZ: [
    {
      message:
        "Outputs the world Z coordinate of the sample position. Produces a gradient that increases along the Z axis.",
      severity: "info",
    },
  ],
  DistanceFromOrigin: [
    {
      message:
        "Outputs the 3D distance from the world origin (0, 0, 0). Creates a spherical gradient centered at the origin.",
      severity: "info",
    },
  ],
  DistanceFromAxis: [
    {
      message:
        "Outputs the distance from the specified Axis (e.g. Y). Creates a cylindrical gradient — useful for radial island falloff.",
      severity: "info",
    },
  ],
  DistanceFromPoint: [
    {
      message:
        "Outputs the 3D distance from a specified Point. Creates a spherical gradient centered at that point.",
      severity: "info",
    },
  ],
  AngleFromOrigin: [
    {
      message:
        "Outputs the angle (in radians) from the world origin in the XZ plane. Useful for creating rotational/spiral patterns.",
      severity: "info",
    },
  ],
  AngleFromPoint: [
    {
      message:
        "Outputs the angle (in radians) from a specified Point in the XZ plane. Useful for spiral or radial segment patterns.",
      severity: "info",
    },
  ],
  HeightAboveSurface: [
    {
      message:
        "Outputs the height above (positive) or below (negative) the terrain surface. Depends on the terrain density being defined first.",
      severity: "warning",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Curves & Splines
  // ═══════════════════════════════════════════════════════════════════════════
  CurveFunction: [
    {
      message:
        "Remaps the input through a curve. Connect a Curve node to define the remapping shape (e.g. ease-in, ease-out, custom).",
      severity: "info",
    },
  ],
  SplineFunction: [
    {
      message:
        "Remaps the input using a spline defined by control points. Values between points are interpolated smoothly.",
      severity: "info",
    },
  ],
  FlatCache: [
    {
      message:
        "Caches the input value at a 2D (XZ) position. Subsequent 3D samples at the same XZ position reuse the cached value. Useful for optimizing surface-dependent calculations.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Combinators
  // ═══════════════════════════════════════════════════════════════════════════
  Conditional: [
    {
      message:
        "When the Condition input exceeds the Threshold, outputs the True input; otherwise outputs the False input. This is a hard switch — use Blend for smooth transitions.",
      severity: "info",
    },
  ],
  Switch: [
    {
      message:
        "Selects between multiple inputs based on a selector value. Each input corresponds to an index — the selector chooses which one to output.",
      severity: "info",
    },
  ],
  Blend: [
    {
      message:
        "Smoothly interpolates between Input A and Input B using the Factor input (0 = A, 1 = B).",
      severity: "info",
    },
  ],
  BlendCurve: [
    {
      message:
        "Blends between two inputs using a curve-shaped factor. The curve controls how the blend transitions between A and B.",
      severity: "info",
    },
  ],
  MinFunction: [
    {
      message:
        "Outputs the minimum of all connected inputs. Useful for carving operations — the lower value 'wins' and creates subtractive shapes.",
      severity: "info",
    },
  ],
  MaxFunction: [
    {
      message:
        "Outputs the maximum of all connected inputs. Useful for union operations — the higher value 'wins' and creates additive shapes.",
      severity: "info",
    },
  ],
  AverageFunction: [
    {
      message:
        "Outputs the arithmetic average of all connected inputs. Produces a smoother result than any single input.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Sampling / Transforms
  // ═══════════════════════════════════════════════════════════════════════════
  CacheOnce: [
    {
      message:
        "Caches the input value at the first sample point and reuses it for all subsequent evaluations. Prevents redundant computation.",
      severity: "info",
    },
  ],
  Wrap: [
    {
      message:
        "Wraps the input value within a range, creating repeating patterns. Values that exceed the range wrap around to the start.",
      severity: "info",
    },
  ],
  TranslatedPosition: [
    {
      message:
        "Shifts the sample position by the Translation vector before evaluating the child. Use to offset noise patterns or terrain features.",
      severity: "info",
    },
  ],
  ScaledPosition: [
    {
      message:
        "Multiplies the sample position by the Scale vector before evaluating the child. Larger scale values compress features, smaller values stretch them.",
      severity: "warning",
    },
  ],
  RotatedPosition: [
    {
      message:
        "Rotates the sample position around the Y axis by AngleDegrees before evaluating the child. Useful for rotating terrain features.",
      severity: "info",
    },
  ],
  MirroredPosition: [
    {
      message:
        "Mirrors the sample position across the specified Axis. Creates symmetrical terrain features.",
      severity: "info",
    },
  ],
  QuantizedPosition: [
    {
      message:
        "Snaps the sample position to a grid defined by StepSize. Creates blocky, stepped terrain patterns.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Terrain-Specific
  // ═══════════════════════════════════════════════════════════════════════════
  SurfaceDensity: [
    {
      message:
        "Outputs the density value at the terrain surface height. Changes to the terrain density function will shift this value — downstream props using surface-relative positions will be affected.",
      severity: "warning",
    },
  ],
  TerrainBoolean: [
    {
      message:
        "Combines two terrain volumes using a boolean Operation (Union, Intersection, Subtraction). Order matters for Subtraction — the second input is subtracted from the first.",
      severity: "warning",
    },
  ],
  TerrainMask: [
    {
      message:
        "Creates a density mask from the terrain surface. Outputs 1 where terrain is solid and 0 where it is air.",
      severity: "info",
    },
  ],
  GradientDensity: [
    {
      message:
        "Creates a vertical gradient from FromY to ToY. Values transition from 1 (solid) at FromY to 0 (air) at ToY. Commonly used as the base terrain shape.",
      severity: "info",
    },
  ],
  BeardDensity: [
    {
      message:
        "Generates stalactite/stalagmite-like hanging density below a surface. Used for creating cave ceiling features and overhangs.",
      severity: "info",
    },
  ],
  ColumnDensity: [
    {
      message:
        "Generates vertical column-shaped density. Creates pillar-like terrain structures.",
      severity: "info",
    },
  ],
  CaveDensity: [
    {
      message:
        "Generates cave-shaped negative density. Radius controls the cave size. Typically combined with terrain via Min or TerrainBoolean subtraction.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Special
  // ═══════════════════════════════════════════════════════════════════════════
  Debug: [
    {
      message:
        "Passes the input through unchanged but logs its value with the given Label. Use for diagnosing density values during development.",
      severity: "info",
    },
  ],
  YGradient: [
    {
      message:
        "Creates a vertical gradient from FromY to ToY, identical to GradientDensity. Values transition from 1 at FromY to 0 at ToY.",
      severity: "info",
    },
  ],
  Passthrough: [
    {
      message:
        "Passes the input value through unchanged. Useful as a placeholder or for organizing the graph without affecting values.",
      severity: "info",
    },
  ],
  Zero: [
    {
      message:
        "Always outputs 0. Useful as a constant zero input to combinators.",
      severity: "info",
    },
  ],
  One: [
    {
      message:
        "Always outputs 1. Useful as a constant one input to combinators or as a 'fully solid' density.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // CURVES
  // ═══════════════════════════════════════════════════════════════════════════
  // Note: Curve types share names with density types (Constant, Sum, Clamp, etc.)
  // but are differentiated by category in the node graph. These tips apply when
  // the node is a Curve category node. Since NODE_TIPS is keyed by type name only,
  // shared names (Constant, Sum, Clamp, Blend) use the density-category tip.
  // Curve-specific types get their own entries below.
  Manual: [
    {
      message:
        "Define the curve shape by adding control points manually. Points are interpolated to create a smooth curve.",
      severity: "info",
    },
  ],
  DistanceExponential: [
    {
      message:
        "Creates a curve that falls off exponentially based on distance. The Exponent controls how sharp the falloff is.",
      severity: "info",
    },
  ],
  DistanceS: [
    {
      message:
        "Creates an S-shaped (sigmoid) curve based on distance within the given Range. Smooth transition from 0 to 1.",
      severity: "info",
    },
  ],
  Multiplier: [
    {
      message:
        "Multiplies all connected curve inputs together. If any input is 0, the output is 0.",
      severity: "info",
    },
  ],
  Inverter: [
    {
      message:
        "Inverts the curve: output = 1 - input. A value of 0 becomes 1, and 1 becomes 0.",
      severity: "info",
    },
  ],
  Not: [
    {
      message:
        "Boolean NOT for curves: outputs 1 when input is 0, and 0 when input is non-zero. Hard threshold at 0.",
      severity: "info",
    },
  ],
  LinearRemap: [
    {
      message:
        "Linearly remaps the curve from SourceRange to TargetRange. Values outside the source range are extrapolated.",
      severity: "info",
    },
  ],
  Noise: [
    {
      message:
        "Generates a noise-based curve using the given Frequency and Seed. Adds natural variation to otherwise smooth curves.",
      severity: "info",
    },
  ],
  Cache: [
    {
      message:
        "Caches the curve evaluation result to avoid recomputing. Use when the same curve is referenced multiple times.",
      severity: "info",
    },
  ],
  StepFunction: [
    {
      message:
        "Quantizes the curve into discrete steps. The Steps parameter controls how many levels the output is divided into.",
      severity: "info",
    },
  ],
  Threshold: [
    {
      message:
        "Outputs 1 when the input exceeds the Threshold, and 0 otherwise. Creates a hard binary cutoff.",
      severity: "info",
    },
  ],
  SmoothStep: [
    {
      message:
        "Smooth Hermite interpolation between 0 and 1 over the range [Edge0, Edge1]. Values below Edge0 output 0, above Edge1 output 1.",
      severity: "info",
    },
  ],
  Power: [
    {
      message:
        "Raises the input to the given Exponent. Exponent > 1 creates a steeper curve; Exponent < 1 creates a flatter curve.",
      severity: "info",
    },
  ],
  Imported: [
    {
      message:
        "References a named value exported from another asset file. The Name must exactly match an ExportAs name in the source file.",
      severity: "info",
    },
  ],
  Exported: [
    {
      message:
        "Exports this node's output with the given Name, making it available for import in other asset files.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // MATERIAL PROVIDERS
  // ═══════════════════════════════════════════════════════════════════════════
  // Note: Constant, Conditional, Blend already have entries above.
  SpaceAndDepth: [
    {
      message:
        "Assigns materials by depth using ordered Layers. Each layer has a thickness type and a material. Connect layer nodes (ConstantThickness, NoiseThickness, etc.) to the Layers[] handles.",
      severity: "info",
    },
  ],
  WeightedRandom: [
    {
      message:
        "Randomly selects a material from the Entries list based on their Weights. Higher weight means higher probability of selection.",
      severity: "info",
    },
  ],
  HeightGradient: [
    {
      message:
        "Transitions between two materials based on Y height within the specified Range. Low material at Range.Min, High material at Range.Max.",
      severity: "info",
    },
  ],
  NoiseSelector: [
    {
      message:
        "Uses noise to select between materials. When noise exceeds Threshold, one material is used; otherwise the other.",
      severity: "info",
    },
  ],
  Solid: [
    {
      message:
        "Always outputs the specified solid Material. Use as a leaf node in material provider trees.",
      severity: "info",
    },
  ],
  Empty: [
    {
      message:
        "Outputs no material (air). Use to represent empty space in material decisions.",
      severity: "info",
    },
  ],
  Surface: [
    {
      message:
        "Provides the material at the terrain surface. Context-dependent — uses the surface material defined by the terrain pipeline.",
      severity: "info",
    },
  ],
  Cave: [
    {
      message:
        "Provides the material for cave surfaces. Context-dependent — uses the cave material defined by the terrain pipeline.",
      severity: "info",
    },
  ],
  Cluster: [
    {
      message:
        "Groups materials into clusters of the given Radius. Creates patches of the same material rather than per-block variation.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERNS
  // ═══════════════════════════════════════════════════════════════════════════
  Floor: [
    {
      message:
        "Applies the sub-pattern to the top surface of terrain. Depth controls how many blocks down from the surface are affected.",
      severity: "info",
    },
  ],
  Ceiling: [
    {
      message:
        "Applies the sub-pattern to the underside of terrain (cave ceilings, overhangs). Depth controls how many blocks up are affected.",
      severity: "info",
    },
  ],
  Wall: [
    {
      message:
        "Applies a pattern to vertical surfaces (walls, cliff faces). Detects blocks adjacent to air horizontally.",
      severity: "info",
    },
  ],
  // Note: Surface is a shared name; pattern Surface tip:
  // (already covered by Material Surface above — both mean "surface-relative")
  Gap: [
    {
      message:
        "Creates a gap (empty space) of the specified Size in blocks. Useful for spacing between pattern elements.",
      severity: "info",
    },
  ],
  BlockType: [
    {
      message:
        "Matches or places a single block Material type. Use as a leaf node in pattern trees.",
      severity: "info",
    },
  ],
  BlockSet: [
    {
      message:
        "Matches or places any block from a set of block types. Use for patterns that accept multiple block materials.",
      severity: "info",
    },
  ],
  Cuboid: [
    {
      message:
        "Defines a box-shaped region from Min to Max coordinates. Blocks inside the cuboid get the specified Material.",
      severity: "info",
    },
  ],
  Offset: [
    {
      message:
        "Shifts the sub-pattern by the Offset vector {x, y, z}. Use to reposition a pattern without changing its shape.",
      severity: "info",
    },
  ],
  Union: [
    {
      message:
        "Combines multiple patterns — a block matches if it matches any of the input patterns. Logical OR.",
      severity: "info",
    },
  ],
  Intersection: [
    {
      message:
        "Intersects multiple patterns — a block matches only if it matches all input patterns. Logical AND.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITION PROVIDERS
  // ═══════════════════════════════════════════════════════════════════════════
  List: [
    {
      message:
        "Provides positions from an explicit list of {x, y, z} coordinates. Use for hand-placed features.",
      severity: "info",
    },
  ],
  Mesh2D: [
    {
      message:
        "Generates a 2D grid of positions at the specified Resolution (spacing in blocks). Jitter adds random offset to break regularity.",
      severity: "info",
    },
  ],
  Mesh3D: [
    {
      message:
        "Generates a 3D grid of positions at the specified Resolution (spacing in blocks). Jitter adds random offset to break regularity.",
      severity: "info",
    },
  ],
  FieldFunction: [
    {
      message:
        "Filters positions from a child provider — keeps only positions where the density field exceeds the Threshold.",
      severity: "info",
    },
  ],
  Occurrence: [
    {
      message:
        "Filters positions using a density FieldFunction and a Seed for deterministic randomization.",
      severity: "info",
    },
  ],
  // Note: Offset, Union, Conditional already have entries for other categories
  SimpleHorizontal: [
    {
      message:
        "Constrains a child position provider to positions within the specified RangeY vertical band.",
      severity: "info",
    },
  ],
  DensityBased: [
    {
      message:
        "Places positions where a density function exceeds the Threshold. Higher density areas get more placements.",
      severity: "info",
    },
  ],
  SurfaceProjection: [
    {
      message:
        "Projects positions onto the terrain surface. Each XZ position is moved to the surface Y coordinate.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPS
  // ═══════════════════════════════════════════════════════════════════════════
  Box: [
    {
      message:
        "Places a solid box of the given Size {x, y, z} using the specified Material. Origin is at the bottom center.",
      severity: "info",
    },
  ],
  Column: [
    {
      message:
        "Places a vertical column of the given Height using the specified Material. Extends upward from the placement position.",
      severity: "info",
    },
  ],
  // Note: Cluster already has a material-category entry
  Density: [
    {
      message:
        "Uses a density function to define the prop shape. Blocks where density is positive are filled with the specified Material.",
      severity: "info",
    },
  ],
  Prefab: [
    {
      message:
        "Places a predefined structure from the asset pack. Supports Scanner, Pattern, BlockMask, and Directionality connections for placement control.",
      severity: "info",
    },
    {
      message:
        "WeightedPrefabPaths allows multiple prefab variants with different weights. MoldingDirection controls how the prefab adapts to terrain contours.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // SCANNERS
  // ═══════════════════════════════════════════════════════════════════════════
  Origin: [
    {
      message:
        "Scans only the origin position (0, 0, 0) or the position provided by the parent. The simplest scanner — one sample point.",
      severity: "info",
    },
  ],
  ColumnLinear: [
    {
      message:
        "When RelativeToPosition is true, Range Min/Max are offsets from the position's Y coordinate, not absolute world coordinates. E.g., Range [-10, 10] scans 10 blocks above and below the position.",
      severity: "warning",
    },
  ],
  ColumnRandom: [
    {
      message:
        "Range Min/Max define the Y bounds for random sampling. If positions are surface-relative, these are offsets from surface Y.",
      severity: "info",
    },
  ],
  Area: [
    {
      message:
        "The Area scanner uses a cuboid (box) shape defined by Size {x, y, z} — not a circle. For a square scan area, set equal x and z values.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSIGNMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  // Note: Constant and FieldFunction have general entries above
  Sandwich: [
    {
      message:
        "Stacks two assignments vertically: Top is used above the surface, Bottom is used below. Useful for different prop placement above/below ground.",
      severity: "info",
    },
  ],
  Weighted: [
    {
      message:
        "Randomly selects an assignment from the Entries list based on their Weights. Higher weight means higher selection probability.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // VECTOR PROVIDERS
  // ═══════════════════════════════════════════════════════════════════════════
  // Note: Constant, Cache, Imported, Exported have entries above
  "Vector:Constant": [
    {
      message:
        "Outputs a fixed 3D point (X, Y, Z) everywhere. Used for directions, offsets, and spatial references.",
      severity: "info",
    },
  ],
  DensityGradient: [
    {
      message:
        "Computes the gradient (direction of steepest increase) of the connected density function. Points away from solid terrain into air.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // ENVIRONMENT PROVIDERS
  // ═══════════════════════════════════════════════════════════════════════════
  Default: [
    {
      message:
        "Uses the default environment settings. No additional configuration needed.",
      severity: "info",
    },
  ],
  Biome: [
    {
      message:
        "Sets the environment to a specific biome by BiomeId. The biome must be defined in the asset pack.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // TINT PROVIDERS
  // ═══════════════════════════════════════════════════════════════════════════
  // Note: Constant and Gradient already have entries above (shared key with density types)

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOCK MASKS
  // ═══════════════════════════════════════════════════════════════════════════
  All: [
    {
      message:
        "Matches all block types. Use when a pattern or operation should apply to every block regardless of type.",
      severity: "info",
    },
  ],
  None: [
    {
      message:
        "Matches no block types. Use as a default or placeholder when no blocks should be affected.",
      severity: "info",
    },
  ],
  Single: [
    {
      message:
        "Matches a single specific block type. Set BlockType to the material identifier (e.g. 'stone').",
      severity: "info",
    },
  ],
  Set: [
    {
      message:
        "Matches any block type in the BlockTypes list. Use for operations that should affect multiple specific materials.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // DIRECTIONALITY
  // ═══════════════════════════════════════════════════════════════════════════
  Uniform: [
    {
      message:
        "No directional bias — equal probability in all directions. Use when placement orientation doesn't matter.",
      severity: "info",
    },
  ],
  Directional: [
    {
      message:
        "Biases placement toward the specified Direction vector. Use to align features like vines or roots with a specific direction.",
      severity: "info",
    },
  ],
  Normal: [
    {
      message:
        "Aligns placement with the surface normal direction. Features will point outward from the terrain surface.",
      severity: "info",
    },
  ],
  Static: [
    {
      message:
        "Applies a fixed rotation angle with no randomization. Connect a Pattern to control which surface positions receive this directionality.",
      severity: "info",
    },
  ],
  Random: [
    {
      message:
        "Randomizes the placement direction using the given Seed. Each position gets a different random direction.",
      severity: "info",
    },
  ],
  Pattern: [
    {
      message:
        "Determines placement direction from a connected Pattern. InitialDirection sets the default facing. Seed provides variation.",
      severity: "info",
    },
  ],
  DensityDelimited: [
    {
      message:
        "Selects the environment or tint based on a connected density function with delimiters. Areas above/below thresholds get different settings.",
      severity: "info",
    },
  ],
  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — New Pre-Release Types
  // ═══════════════════════════════════════════════════════════════════════════
  OffsetConstant: [
    {
      message:
        "Adds a constant Value to the input. Equivalent to a Sum node with one input being a Constant, but more efficient.",
      severity: "info",
    },
  ],
  Cube: [
    {
      message:
        "Signed distance field for an axis-aligned cube centered at the origin. Connect a Curve to shape the SDF falloff.",
      severity: "info",
    },
  ],
  Axis: [
    {
      message:
        "Signed distance field for an infinite (or anchored) axis line. The Axis vector defines the direction. Connect a Curve to shape the SDF falloff.",
      severity: "info",
    },
  ],
  Angle: [
    {
      message:
        "Outputs the angle (in degrees) between the sample position vector and the connected VectorProvider. Useful for directional masking and angular patterns.",
      severity: "info",
    },
  ],
  Cache2D: [
    {
      message:
        "Caches the input at a 2D (XZ) position, similar to FlatCache. Subsequent 3D samples at the same XZ reuse the cached value.",
      severity: "info",
    },
  ],

  // Shape SDFs
  Ellipsoid: [
    {
      message: "Signed distance field for an axis-aligned ellipsoid centered at the origin. Returns negative values inside, positive outside.",
      severity: "info",
    },
  ],
  Cylinder: [
    {
      message: "Signed distance field for a cylinder along the Y axis, centered at the origin. Returns negative inside, positive outside.",
      severity: "info",
    },
  ],
  Plane: [
    {
      message: "Signed distance from an infinite plane defined by a normal vector and distance from origin. Positive values are above the plane.",
      severity: "info",
    },
  ],
  Shell: [
    {
      message: "Signed distance field for a hollow spherical shell. Returns negative between inner and outer radius, positive outside.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // DENSITY — Missing Tips
  // ═══════════════════════════════════════════════════════════════════════════
  Distance: [
    {
      message:
        "Outputs the Euclidean distance between two connected density inputs evaluated at the sample position. Useful for comparing two signals.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // MATERIAL — Missing Tips
  // ═══════════════════════════════════════════════════════════════════════════
  Queue: [
    {
      message:
        "Evaluates material providers in order and returns the first non-empty result. Useful for fallback chains where later entries fill gaps left by earlier ones.",
      severity: "info",
    },
  ],
  Solidity: [
    {
      message:
        "Outputs a material based on the solidity of the block position — whether it is solid terrain or air. Context-dependent.",
      severity: "info",
    },
  ],
  DownwardDepth: [
    {
      message:
        "Measures how many solid blocks exist downward from the current position. Returns a material based on the Depth.",
      severity: "info",
    },
  ],
  UpwardDepth: [
    {
      message:
        "Measures how many solid blocks exist upward from the current position. Returns a material based on the ceiling Depth.",
      severity: "info",
    },
  ],
  DownwardSpace: [
    {
      message:
        "Measures how many air blocks exist below the current position. Useful for detecting open caves or voids beneath.",
      severity: "info",
    },
  ],
  UpwardSpace: [
    {
      message:
        "Measures how many air blocks exist above the current position. Useful for detecting open sky or cave height.",
      severity: "info",
    },
  ],
  Striped: [
    {
      message:
        "Creates alternating horizontal stripes of connected materials. Thickness controls stripe width in blocks. Seed varies the pattern.",
      severity: "info",
    },
  ],
  TerrainDensity: [
    {
      message:
        "Selects material based on the terrain density value at the block position. Context-dependent — requires terrain density to be defined.",
      severity: "info",
    },
  ],
  ConstantThickness: [
    {
      message:
        "Defines a layer with a fixed thickness in blocks. Used as a child of SpaceAndDepth to define a uniform material layer.",
      severity: "info",
    },
  ],
  NoiseThickness: [
    {
      message:
        "Defines a layer whose thickness varies using noise. Creates organic, uneven layer boundaries.",
      severity: "info",
    },
  ],
  RangeThickness: [
    {
      message:
        "Defines a layer whose thickness is randomly chosen between RangeMin and RangeMax for each position. Creates varied but bounded layers.",
      severity: "info",
    },
  ],
  WeightedThickness: [
    {
      message:
        "Defines a layer whose thickness is randomly chosen from a weighted list of possible values. Higher weight values are selected more often.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // CONDITIONS — Missing Tips
  // ═══════════════════════════════════════════════════════════════════════════
  AlwaysTrueCondition: [
    {
      message:
        "Always evaluates to true. Use as a placeholder or default condition that never filters anything out.",
      severity: "info",
    },
  ],
  EqualsCondition: [
    {
      message:
        "Evaluates to true when the context value exactly equals the specified Value. ContextToCheck selects which property to test.",
      severity: "info",
    },
  ],
  GreaterThanCondition: [
    {
      message:
        "Evaluates to true when the context value exceeds the Threshold. ContextToCheck selects which property to test.",
      severity: "info",
    },
  ],
  SmallerThanCondition: [
    {
      message:
        "Evaluates to true when the context value is below the Threshold. ContextToCheck selects which property to test.",
      severity: "info",
    },
  ],
  AndCondition: [
    {
      message:
        "Evaluates to true only when all connected child conditions are true. Logical AND of conditions.",
      severity: "info",
    },
  ],
  OrCondition: [
    {
      message:
        "Evaluates to true when any connected child condition is true. Logical OR of conditions.",
      severity: "info",
    },
  ],
  NotCondition: [
    {
      message:
        "Inverts the child condition — true becomes false and false becomes true. Logical NOT.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERNS — Missing Tips
  // ═══════════════════════════════════════════════════════════════════════════
  And: [
    {
      message:
        "Logical AND of two patterns — a block matches only if both input patterns match at that position.",
      severity: "info",
    },
  ],
  Or: [
    {
      message:
        "Logical OR of two patterns — a block matches if either input pattern matches at that position.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITIONS — Missing Tips
  // ═══════════════════════════════════════════════════════════════════════════
  Bound: [
    {
      message:
        "Filters positions from a child provider, keeping only those within the bounding box defined by Min and Max. Positions outside are discarded.",
      severity: "info",
    },
  ],
  Framework: [
    {
      message:
        "Provides positions from the structural framework grid. Context-dependent — requires framework data from the world generation pipeline.",
      severity: "info",
    },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPS — Missing Tips
  // ═══════════════════════════════════════════════════════════════════════════
  PondFiller: [
    {
      message:
        "Fills enclosed depressions with the specified Material (typically water). Scans downward to find the fill level and flood-fills the area.",
      severity: "info",
    },
  ],
};
