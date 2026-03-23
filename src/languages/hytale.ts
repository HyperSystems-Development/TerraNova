import type { LanguageDefinition } from "./types";

/**
 * Display name overrides for internal type names that differ from V2 names.
 * Types not listed here display as-is (most V2 types are already their own display name).
 */
const TYPE_DISPLAY_NAMES: Record<string, string> = {
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
  "Vector:Constant": "Point3D",
};

export const hytaleLanguage: LanguageDefinition = {
  id: "hytale",
  displayName: "Hytale",
  description:
    "Exact Hytale worldgen names and terminology. Matches the official documentation and JSON format 1:1.",

  typeDisplayNames: TYPE_DISPLAY_NAMES,

  // V2 field names are used internally, so no display-name overrides are needed.
  // Legacy files are migrated at load time (migration.ts) to V2 field names.
  fieldDisplayNames: {
    RotatedPosition: { AngleDegrees: "SpinAngle" },
  },

  // No field value transforms needed — internal values now match V2 directly.
  fieldTransforms: {},

  hiddenTypes: new Set([
    "SimplexRidgeNoise2D",
    "SimplexRidgeNoise3D",
    "FractalNoise2D",
    "FractalNoise3D",
    "GradientDensity",
    "LinearTransform",
    "Conditional",
    "HeightGradient",
    "DensityBased",
    "DomainWarp3D",
  ]),
};
