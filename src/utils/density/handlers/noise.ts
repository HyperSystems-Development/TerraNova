import type { NodeHandler } from "../evalContext";
import { fbm2D, fbm3D, ridgeFbm2D, ridgeFbm3D } from "../fbm";

/**
 * Resolve the Scale field, with backward-compatible fallback to the legacy
 * Frequency field.  Frequency was a multiplier (higher = finer detail) while
 * Scale is a divisor (higher = coarser detail), so when falling back we
 * invert: Scale = 1 / Frequency.  A Frequency of 0 is treated as Scale 1.
 */
function resolveScale(fields: Record<string, unknown>, fallback = 1.0): number {
  if (fields.Scale != null) return Number(fields.Scale);
  if (fields.Frequency != null) {
    const freq = Number(fields.Frequency);
    return freq !== 0 ? 1.0 / freq : fallback;
  }
  return fallback;
}

/** Resolve Persistence, with fallback to legacy Gain field. */
function resolvePersistence(fields: Record<string, unknown>, fallback = 1.0): number {
  return Number(fields.Persistence ?? fields.Gain ?? fallback);
}

const handleSimplexNoise2D: NodeHandler = (ctx, fields, _inputs, x, _y, z) => {
  const scale = resolveScale(fields);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const octaves = Math.max(1, Number(fields.Octaves ?? 1));
  const lacunarity = Number(fields.Lacunarity ?? 1.0);
  const persistence = resolvePersistence(fields);
  const amp = (fields.Amplitude as number) ?? 1.0;
  const noise = ctx.getNoise2D(seed);
  return fbm2D(noise, x, z, scale, scale, octaves, lacunarity, persistence, seed) * amp;
};

const handleSimplexNoise3D: NodeHandler = (ctx, fields, _inputs, x, y, z) => {
  const scaleXZ = resolveScale({ Scale: fields.ScaleXZ ?? fields.Scale, Frequency: fields.Frequency });
  const scaleY = Number(fields.ScaleY ?? scaleXZ);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const octaves = Math.max(1, Number(fields.Octaves ?? 1));
  const lacunarity = Number(fields.Lacunarity ?? 1.0);
  const persistence = resolvePersistence(fields);
  const amp = (fields.Amplitude as number) ?? 1.0;
  const noise = ctx.getNoise3D(seed);
  return fbm3D(noise, x, y, z, scaleXZ, scaleY, octaves, lacunarity, persistence, seed) * amp;
};

const handleSimplexRidgeNoise2D: NodeHandler = (ctx, fields, _inputs, x, _y, z) => {
  const scale = resolveScale(fields);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const octaves = Math.max(1, Number(fields.Octaves ?? 1));
  const lacunarity = Number(fields.Lacunarity ?? 1.0);
  const persistence = resolvePersistence(fields);
  const noise = ctx.getNoise2D(seed);
  return ridgeFbm2D(noise, x, z, scale, scale, octaves, lacunarity, persistence, seed);
};

const handleSimplexRidgeNoise3D: NodeHandler = (ctx, fields, _inputs, x, y, z) => {
  const scaleXZ = resolveScale({ Scale: fields.ScaleXZ ?? fields.Scale, Frequency: fields.Frequency });
  const scaleY = Number(fields.ScaleY ?? scaleXZ);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const octaves = Math.max(1, Number(fields.Octaves ?? 1));
  const lacunarity = Number(fields.Lacunarity ?? 1.0);
  const persistence = resolvePersistence(fields);
  const noise = ctx.getNoise3D(seed);
  return ridgeFbm3D(noise, x, y, z, scaleXZ, scaleY, octaves, lacunarity, persistence, seed);
};

const handleCellNoise2D: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const scale = resolveScale(fields);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const cellType = (fields.CellType as string) ?? "Euclidean";
  const jitter = Number(fields.Jitter ?? 0.5);
  const octaves = Math.max(1, Number(fields.Octaves ?? 1));
  const lacunarity = Number(fields.Lacunarity ?? 2.0);
  const persistence = resolvePersistence(fields, 0.5);
  const returnType = (fields.ReturnType as string) ?? "Distance";
  const distFunc = (fields.DistanceFunction as string) ?? "Euclidean";
  const noise = ctx.getVoronoi2D(seed, cellType, jitter, returnType, distFunc);
  const sx = scale !== 0 ? x / scale : x;
  const sz = scale !== 0 ? z / scale : z;
  let raw = octaves > 1
    ? fbm2D(noise, x, z, scale, scale, octaves, lacunarity, persistence, seed)
    : noise(sx, sz);
  if (returnType === "Curve") {
    raw = ctx.applyCurve("ReturnCurve", raw, inputs);
  } else if (returnType === "Density") {
    raw = ctx.getInput(inputs, "ReturnDensity", x, y, z) * raw;
  }
  return raw;
};

const handleCellNoise3D: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const scale = resolveScale(fields);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const cellType = (fields.CellType as string) ?? "Euclidean";
  const jitter = Number(fields.Jitter ?? 0.5);
  const octaves = Math.max(1, Number(fields.Octaves ?? 1));
  const lacunarity = Number(fields.Lacunarity ?? 2.0);
  const persistence = resolvePersistence(fields, 0.5);
  const returnType = (fields.ReturnType as string) ?? "Distance";
  const distFunc = (fields.DistanceFunction as string) ?? "Euclidean";
  const noise = ctx.getVoronoi3D(seed, cellType, jitter, returnType, distFunc);
  const sx = scale !== 0 ? x / scale : x;
  const sy = scale !== 0 ? y / scale : y;
  const sz = scale !== 0 ? z / scale : z;
  let raw = octaves > 1
    ? fbm3D(noise, x, y, z, scale, scale, octaves, lacunarity, persistence, seed)
    : noise(sx, sy, sz);
  if (returnType === "Curve") {
    raw = ctx.applyCurve("ReturnCurve", raw, inputs);
  } else if (returnType === "Density") {
    raw = ctx.getInput(inputs, "ReturnDensity", x, y, z) * raw;
  }
  return raw;
};

const handleFractalNoise2D: NodeHandler = (ctx, fields, _inputs, x, _y, z) => {
  const scale = resolveScale(fields);
  const octaves = Math.max(1, Number(fields.Octaves ?? 1));
  const lacunarity = Number(fields.Lacunarity ?? 1.0);
  const persistence = resolvePersistence(fields);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const noise = ctx.getNoise2D(seed);
  return fbm2D(noise, x, z, scale, scale, octaves, lacunarity, persistence, seed);
};

const handleFractalNoise3D: NodeHandler = (ctx, fields, _inputs, x, y, z) => {
  const scaleXZ = resolveScale({ Scale: fields.ScaleXZ ?? fields.Scale, Frequency: fields.Frequency });
  const scaleY = Number(fields.ScaleY ?? scaleXZ);
  const octaves = Math.max(1, Number(fields.Octaves ?? 1));
  const lacunarity = Number(fields.Lacunarity ?? 1.0);
  const persistence = resolvePersistence(fields);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const noise = ctx.getNoise3D(seed);
  return fbm3D(noise, x, y, z, scaleXZ, scaleY, octaves, lacunarity, persistence, seed);
};

export function buildNoiseHandlers(): Map<string, NodeHandler> {
  return new Map<string, NodeHandler>([
    ["SimplexNoise2D", handleSimplexNoise2D],
    ["SimplexNoise3D", handleSimplexNoise3D],
    ["SimplexRidgeNoise2D", handleSimplexRidgeNoise2D],
    ["SimplexRidgeNoise3D", handleSimplexRidgeNoise3D],
    ["CellNoise2D", handleCellNoise2D],
    ["VoronoiNoise2D", handleCellNoise2D],
    ["CellNoise3D", handleCellNoise3D],
    ["VoronoiNoise3D", handleCellNoise3D],
    ["FractalNoise2D", handleFractalNoise2D],
    ["FractalNoise3D", handleFractalNoise3D],
  ]);
}
