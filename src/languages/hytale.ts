import type { LanguageDefinition } from "./types";

const safeInverse = (v: number): number => (v === 0 ? 0 : 1 / v);

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

  fieldDisplayNames: {
    Clamp: { Min: "WallB", Max: "WallA" },
    SmoothClamp: { Min: "WallB", Max: "WallA" },
    RotatedPosition: { AngleDegrees: "SpinAngle" },
    DomainWarp2D: { Amplitude: "WarpFactor" },
    DomainWarp3D: { Amplitude: "WarpFactor" },
    SimplexNoise2D: { Gain: "Persistence" },
    SimplexNoise3D: { Gain: "Persistence" },
  },

  fieldTransforms: {
    SimplexNoise2D: {
      Frequency: {
        displayName: "Scale",
        toDisplay: safeInverse,
        fromDisplay: safeInverse,
      },
    },
    SimplexNoise3D: {
      Frequency: {
        displayName: "Scale",
        toDisplay: safeInverse,
        fromDisplay: safeInverse,
      },
    },
    VoronoiNoise2D: {
      Frequency: {
        displayName: "Scale",
        toDisplay: safeInverse,
        fromDisplay: safeInverse,
      },
    },
    VoronoiNoise3D: {
      Frequency: {
        displayName: "Scale",
        toDisplay: safeInverse,
        fromDisplay: safeInverse,
      },
    },
  },

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
