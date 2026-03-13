import type { FieldConstraint } from "./validation";
import { getSchemaConstraints } from "./schemaLoader";

/**
 * Per-type field constraints for inline validation.
 * Keys are V2 Type names, values are field → constraint mappings.
 */
export const FIELD_CONSTRAINTS: Record<string, Record<string, FieldConstraint>> = {
  // Noise generators
  SimplexNoise2D: {
    Scale: { min: 0, max: 10000, message: "Scale must be >= 0" },
    Octaves: { min: 1, message: "Octaves must be >= 1" },
    Lacunarity: { min: 0, message: "Lacunarity must be >= 0" },
    Persistence: { min: 0, max: 1, message: "Persistence should be between 0 and 1" },
  },
  SimplexNoise3D: {
    Scale: { min: 0, max: 10000, message: "Scale must be >= 0" },
    Octaves: { min: 1, message: "Octaves must be >= 1" },
    Lacunarity: { min: 0, message: "Lacunarity must be >= 0" },
    Persistence: { min: 0, max: 1, message: "Persistence should be between 0 and 1" },
  },
  CellNoise2D: {
    Scale: { min: 0, max: 10000, message: "Scale must be >= 0" },
  },
  CellNoise3D: {
    Scale: { min: 0, max: 10000, message: "Scale must be >= 0" },
  },

  // Constants
  Constant: {
    Value: { required: true, message: "Constant must have a Value" },
  },

  // Clamping
  Clamp: {
    Min: { required: true, message: "Clamp requires Min" },
    Max: { required: true, message: "Clamp requires Max" },
  },
  SmoothClamp: {
    Min: { required: true, message: "SmoothClamp requires Min" },
    Max: { required: true, message: "SmoothClamp requires Max" },
    Smoothness: { min: 0, message: "Smoothness must be >= 0" },
  },

  // Math
  Pow: {
    Exponent: { required: true, message: "Pow requires an Exponent" },
  },
  OffsetConstant: {
    Value: { required: true },
  },
  AmplitudeConstant: {
    Value: { required: true },
  },

  // Smooth operations (Smoothness constraints)
  SmoothFloor: {
    Smoothness: { min: 0, message: "Smoothness must be >= 0" },
  },
  SmoothMin: {
    Smoothness: { min: 0, message: "Smoothness must be >= 0" },
  },
  SmoothMax: {
    Smoothness: { min: 0, message: "Smoothness must be >= 0" },
  },

  // Additional smooth operations
  SmoothCeiling: {
    Smoothness: { min: 0, message: "Smoothness must be >= 0" },
  },

  // Position overrides
  XOverride: {
    OverrideX: { required: true },
  },
  ZOverride: {
    OverrideZ: { required: true },
  },

  // 3D position noise
  Positions3D: {
    Frequency: { min: 0, message: "Frequency must be > 0" },
  },

  // Warp
  GradientWarp: {
    WarpScale: { min: 0, message: "WarpScale must be >= 0" },
  },

  // Cell wall distance
  CellWallDistance: {
    Frequency: { min: 0, message: "Frequency must be > 0" },
  },

  // Material depth/space types
  DownwardDepth: {
    MaxDepth: { min: 1, message: "MaxDepth must be >= 1" },
  },
  UpwardDepth: {
    MaxDepth: { min: 1, message: "MaxDepth must be >= 1" },
  },
  DownwardSpace: {
    MaxSpace: { min: 1, message: "MaxSpace must be >= 1" },
  },
  UpwardSpace: {
    MaxSpace: { min: 1, message: "MaxSpace must be >= 1" },
  },
  Striped: {
    Thickness: { min: 1, message: "Thickness must be >= 1" },
  },

  // Position sampling
  PositionsCellNoise: {
    Frequency: { min: 0, message: "Frequency must be > 0" },
  },

  // Gradient
  Gradient: {
    FromY: { required: true },
    ToY: { required: true },
  },

  // Cache
  Cache: {
    Capacity: { min: 1, message: "Capacity must be >= 1" },
  },

  // Imported
  Imported: {
    Name: { required: true, message: "Imported requires a Name" },
  },

  // FastGradientWarp
  FastGradientWarp: {
    WarpScale: { min: 0 },
    WarpOctaves: { min: 1 },
  },

  // Scale
  Scale: {
    X: { required: true },
    Y: { required: true },
    Z: { required: true },
  },

  // Static directionality
  Static: {
    Rotation: { min: 0, max: 360, message: "Rotation must be between 0 and 360 degrees" },
  },

  // Settings
  Settings: {
    CustomConcurrency: { min: -1, max: 32, message: "Must be -1 (auto) or 1-32" },
    BufferCapacityFactor: { min: 0.1, max: 2.0, message: "Must be between 0.1 and 2.0" },
    TargetViewDistance: { min: 64, max: 2048, message: "Must be between 64 and 2048" },
    TargetPlayerCount: { min: 1, max: 64, message: "Must be between 1 and 64" },
  },
};

/**
 * Get field constraints for a node type.
 * Local overrides take precedence, schema fills gaps.
 */
export function getConstraints(nodeType: string): Record<string, FieldConstraint> | undefined {
  return FIELD_CONSTRAINTS[nodeType] ?? getSchemaConstraints(nodeType) ?? undefined;
}

/**
 * Known output ranges for density node types.
 * Used for range-mismatch hints (informational, not hard errors).
 */
export const OUTPUT_RANGES: Record<string, [number, number]> = {
  SimplexNoise2D: [-1, 1],
  SimplexNoise3D: [-1, 1],
  SimplexRidgeNoise2D: [-1, 1],
  SimplexRidgeNoise3D: [-1, 1],
  VoronoiNoise2D: [0, 1],
  VoronoiNoise3D: [0, 1],
  FractalNoise2D: [-1, 1],
  FractalNoise3D: [-1, 1],
  Constant: [-Infinity, Infinity],
  Zero: [0, 0],
  One: [1, 1],
  Abs: [0, Infinity],
  Normalizer: [0, 1],
  Clamp: [-Infinity, Infinity],
  Negate: [-Infinity, Infinity],
  CoordinateX: [-Infinity, Infinity],
  CoordinateY: [-Infinity, Infinity],
  CoordinateZ: [-Infinity, Infinity],
};
