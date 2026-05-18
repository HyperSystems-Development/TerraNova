import type { BaseFields, RangeDouble } from "./types";

/**
 * All 68 V2 Density Function types.
 * Each type name matches the V2 JSON "Type" field exactly.
 */
export type DensityType =
  // Core noise
  | "SimplexNoise2D"
  | "SimplexNoise3D"
  | "SimplexRidgeNoise2D"
  | "SimplexRidgeNoise3D"
  | "CellNoise2D"
  | "CellNoise3D"
  // Arithmetic
  | "Sum"
  | "SumSelf"
  | "WeightedSum"
  | "Multiplier"
  | "Inverter"
  | "Abs"
  | "Sqrt"
  | "CubeRoot"
  | "Square"
  | "CubeMath"
  | "Inverse"
  | "Modulo"
  // Constants & references
  | "Constant"
  | "Imported"
  // Clamping & range
  | "Clamp"
  | "ClampToIndex"
  | "Normalizer"
  | "DoubleNormalizer"
  | "RangeChoice"
  | "Interpolate"
  // Position-based
  | "XValue"
  | "YValue"
  | "ZValue"
  | "DistanceFromOrigin"
  | "DistanceFromAxis"
  | "DistanceFromPoint"
  | "AngleFromOrigin"
  | "AngleFromPoint"
  | "HeightAboveSurface"
  // Curves & splines
  | "CurveMapper"
  | "SplineFunction"
  | "FlatCache"
  // Combinators
  | "Conditional"
  | "Switch"
  | "Mix"
  | "MultiMix"
  | "Min"
  | "Max"
  | "AverageFunction"
  // Sampling / transforms
  | "Cache"
  | "Wrap"
  | "Slider"
  | "Scale"
  | "Rotator"
  | "MirroredPosition"
  | "QuantizedPosition"
  // Terrain-specific
  | "SurfaceDensity"
  | "TerrainBoolean"
  | "TerrainMask"
  | "GradientDensity"
  | "BeardDensity"
  | "ColumnDensity"
  | "CaveDensity"
  | "FractalNoise2D"
  | "FractalNoise3D"
  | "FastGradientWarp"
  // Smooth operations
  | "SmoothClamp"
  | "SmoothFloor"
  | "SmoothMin"
  | "SmoothMax"
  // Additional math
  | "AmplitudeConstant"
  | "Pow"
  | "Floor"
  | "Ceiling"
  // Position overrides & sampling
  | "Anchor"
  | "YOverride"
  | "XOverride"
  | "ZOverride"
  | "BaseHeight"
  | "Offset"
  | "Distance"
  | "PositionsCellNoise"
  // Additional operations
  | "SmoothCeiling"
  | "Gradient"
  | "Amplitude"
  | "YSampled"
  | "SwitchState"
  | "Positions3D"
  | "PositionsPinch"
  | "PositionsTwist"
  // Warp types
  | "GradientWarp"
  | "VectorWarp"
  // Context-dependent
  | "Terrain"
  | "CellWallDistance"
  | "DistanceToBiomeEdge"
  | "Pipeline"
  // New pre-release types
  | "OffsetConstant"
  | "Cache2D"
  | "Exported"
  | "Angle"
  // Shape SDFs
  | "Cube"
  | "Axis"
  | "Ellipsoid"
  | "Cuboid"
  | "Cylinder"
  | "Plane"
  | "Shell"
  // Special
  | "Debug"
  | "YGradient"
  | "Passthrough"
  | "Zero"
  | "One";

/** Base density function fields */
export interface DensityFields extends BaseFields {
  Type: DensityType;
}

/** Noise parameters shared by simplex/voronoi types (V2 field names) */
export interface NoiseParams {
  Scale?: number;
  Seed?: number | string;
  Octaves?: number;
  Lacunarity?: number;
  Persistence?: number;
}

/** SimplexNoise2D/3D */
export interface SimplexNoise extends DensityFields, NoiseParams {
  Type: "SimplexNoise2D" | "SimplexNoise3D";
}

/** Constant value */
export interface ConstantDensity extends DensityFields {
  Type: "Constant";
  Value?: number;
}

/** Sum of multiple inputs */
export interface SumDensity extends DensityFields {
  Type: "Sum";
  Inputs?: DensityFields[];
}

/** Weighted sum */
export interface WeightedSumDensity extends DensityFields {
  Type: "WeightedSum";
  Inputs?: DensityFields[];
  Weights?: number[];
}

/** Clamp input between WallB (lower) and WallA (upper) */
export interface ClampDensity extends DensityFields {
  Type: "Clamp";
  Input?: DensityFields;
  WallA?: number;
  WallB?: number;
}

/** Normalize input from source range to target range */
export interface NormalizerDensity extends DensityFields {
  Type: "Normalizer";
  Input?: DensityFields;
  SourceRange?: RangeDouble;
  TargetRange?: RangeDouble;
}

/** AmplitudeConstant: value * scale + offset */
export interface AmplitudeConstantDensity extends DensityFields {
  Type: "AmplitudeConstant";
  Input?: DensityFields;
  Scale?: number;
  Offset?: number;
}

/** Conditional branching */
export interface ConditionalDensity extends DensityFields {
  Type: "Conditional";
  Condition?: DensityFields;
  Threshold?: number;
  TrueInput?: DensityFields;
  FalseInput?: DensityFields;
}

/** Multiplier: product of multiple inputs */
export interface MultiplierDensity extends DensityFields {
  Type: "Multiplier";
  Inputs?: DensityFields[];
}

/** Inverter: negate input */
export interface InverterDensity extends DensityFields {
  Type: "Inverter";
  Input?: DensityFields;
}

/** Interpolate between two inputs */
export interface InterpolateDensity extends DensityFields {
  Type: "Interpolate";
  InputA?: DensityFields;
  InputB?: DensityFields;
  Factor?: DensityFields;
}

/** Y-axis gradient */
export interface YGradientDensity extends DensityFields {
  Type: "YGradient";
  FromY?: number;
  ToY?: number;
}

/** CurveMapper: applies a curve to an input */
export interface CurveMapperDensity extends DensityFields {
  Type: "CurveMapper";
  Input?: DensityFields;
  Curve?: unknown;
}

/** Union of all density types for type narrowing */
export type AnyDensity =
  | SimplexNoise
  | ConstantDensity
  | SumDensity
  | WeightedSumDensity
  | ClampDensity
  | NormalizerDensity
  | AmplitudeConstantDensity
  | ConditionalDensity
  | MultiplierDensity
  | InverterDensity
  | InterpolateDensity
  | YGradientDensity
  | CurveMapperDensity
  | DensityFields;
