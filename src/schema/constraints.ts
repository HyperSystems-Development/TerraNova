import type { FieldConstraint } from "./validation";
import { getSchemaConstraints } from "./schemaLoader";

/**
 * Local constraint overrides — min/max bounds and validation messages
 * that are not (yet) captured in the schema bundle.
 *
 * The bundle provides structural data (required flags, field existence)
 * while these overrides provide numeric range validation. When the bundle
 * gains min/max support, entries here can be removed.
 *
 * NOTE: "Settings" is not in the bundle at all; its constraints are
 * entirely local.
 */
const LOCAL_OVERRIDES: Record<string, Record<string, FieldConstraint>> = {
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

  // Clamping (V2: WallA = upper bound, WallB = lower bound)
  Clamp: {
    WallA: { required: true, message: "Clamp requires WallA (upper bound)" },
    WallB: { required: true, message: "Clamp requires WallB (lower bound)" },
  },
  SmoothClamp: {
    WallA: { required: true, message: "SmoothClamp requires WallA (upper bound)" },
    WallB: { required: true, message: "SmoothClamp requires WallB (lower bound)" },
  },

  // Math
  Pow: {
    Exponent: { required: true, message: "Pow requires an Exponent" },
  },

  // 3D position noise
  Positions3D: {
    Scale: { min: 0, message: "Scale must be >= 0" },
  },

  // Warp
  GradientWarp: {
    WarpScale: { min: 0, message: "WarpScale must be >= 0" },
  },

  // Cell wall distance
  CellWallDistance: {
    Scale: { min: 0, message: "Scale must be >= 0" },
  },

  // Material depth/space types
  DownwardDepth: {
    Depth: { min: 1, message: "Depth must be >= 1" },
  },
  UpwardDepth: {
    Depth: { min: 1, message: "Depth must be >= 1" },
  },
  DownwardSpace: {
    Space: { min: 1, message: "Space must be >= 1" },
  },
  UpwardSpace: {
    Space: { min: 1, message: "Space must be >= 1" },
  },
  Striped: {
    Thickness: { min: 1, message: "Thickness must be >= 1" },
  },

  // Position sampling
  PositionsCellNoise: {
    Scale: { min: 0, message: "Scale must be >= 0" },
  },

  // Gradient
  Gradient: {
    SampleRange: { min: 0, message: "SampleRange must be >= 0" },
  },

  // Cache
  Cache: {
    Capacity: { min: 1, message: "Capacity must be >= 1" },
  },

  // FastGradientWarp
  FastGradientWarp: {
    WarpScale: { min: 0 },
    WarpOctaves: { min: 1 },
  },

  // Static directionality
  Static: {
    Rotation: { min: 0, max: 360, message: "Rotation must be between 0 and 360 degrees" },
  },

  // Settings (not in bundle)
  Settings: {
    CustomConcurrency: { min: -1, max: 32, message: "Must be -1 (auto) or 1-32" },
    BufferCapacityFactor: { min: 0.1, max: 2.0, message: "Must be between 0.1 and 2.0" },
    TargetViewDistance: { min: 64, max: 2048, message: "Must be between 64 and 2048" },
    TargetPlayerCount: { min: 1, max: 64, message: "Must be between 1 and 64" },
  },
};

/**
 * Merge schema-driven constraints with local overrides.
 * Schema provides `required` flags from the bundle; local overrides
 * provide min/max bounds and validation messages.
 */
function mergeConstraints(
  schema: Record<string, FieldConstraint> | null,
  local: Record<string, FieldConstraint> | undefined,
): Record<string, FieldConstraint> | undefined {
  if (!schema && !local) return undefined;
  if (!schema) return local;
  if (!local) return Object.keys(schema).length > 0 ? schema : undefined;

  // Merge: local fields take precedence, but schema required flags fill gaps
  const merged: Record<string, FieldConstraint> = {};

  // Start with schema entries
  for (const [field, constraint] of Object.entries(schema)) {
    merged[field] = { ...constraint };
  }

  // Overlay local overrides
  for (const [field, override] of Object.entries(local)) {
    if (merged[field]) {
      // Merge: local overrides win, but preserve schema required if local doesn't set it
      merged[field] = { ...merged[field], ...override };
    } else {
      merged[field] = { ...override };
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

/**
 * Get field constraints for a node type.
 * Merges schema-driven constraints (required flags from the bundle)
 * with local overrides (min/max bounds, validation messages).
 *
 * This is the primary API for constraint lookup.
 */
export function getConstraints(nodeType: string): Record<string, FieldConstraint> | undefined {
  const schema = getSchemaConstraints(nodeType);
  const local = LOCAL_OVERRIDES[nodeType];
  return mergeConstraints(schema, local);
}

/**
 * Backwards-compatible constraint map.
 * Uses a Proxy so that indexing by type name delegates to getConstraints().
 *
 * Consumers should migrate to getConstraints() for clearer semantics.
 */
export const FIELD_CONSTRAINTS: Record<string, Record<string, FieldConstraint>> = new Proxy(
  {} as Record<string, Record<string, FieldConstraint>>,
  {
    get(_target, prop: string) {
      if (typeof prop !== "string") return undefined;
      return getConstraints(prop) ?? undefined;
    },
    has(_target, prop: string) {
      if (typeof prop !== "string") return false;
      return getConstraints(prop) !== undefined;
    },
    ownKeys() {
      // Return known keys: union of local override keys and all bundle node keys
      const keys = new Set(Object.keys(LOCAL_OVERRIDES));
      // Also include any schema-driven types via getNodeConstraints
      // This is intentionally limited to local keys for iteration;
      // direct property access works for any type via the proxy get trap.
      return [...keys];
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      const value = getConstraints(prop);
      if (value !== undefined) {
        return { configurable: true, enumerable: true, value };
      }
      return undefined;
    },
  },
);

/**
 * Known output ranges for density node types.
 * Used for range-mismatch hints (informational, not hard errors).
 *
 * NOTE: The schema bundle does not include output range data.
 * These remain hardcoded until the bundle gains range metadata.
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
