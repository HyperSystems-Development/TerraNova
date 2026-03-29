import type { LanguageDefinition } from "./types";

/**
 * Display name overrides for internal type names.
 * Since internal names now match V2, most types display as-is. Only types
 * whose display name genuinely differs from the type key need entries here.
 */
const TYPE_DISPLAY_NAMES: Record<string, string> = {
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
    Rotator: { AngleDegrees: "SpinAngle" },
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
