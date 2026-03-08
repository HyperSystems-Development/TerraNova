import type { NodeHandler } from "../evalContext";
import { fbm2D, fbm3D, ridgeFbm2D, ridgeFbm3D } from "../fbm";

const handleSimplexNoise2D: NodeHandler = (ctx, fields, _inputs, x, _y, z) => {
  const freq = Number(fields.Frequency ?? 1.0);
  const amp = Number(fields.Amplitude ?? 1.0);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const octaves = Math.max(1, Number(fields.Octaves ?? 4));
  const lacunarity = Number(fields.Lacunarity ?? 2.0);
  const gain = Number(fields.Gain ?? 0.5);
  const noise = ctx.getNoise2D(seed);
  return fbm2D(noise, x, z, freq, octaves, lacunarity, gain, seed) * amp;
};

const handleSimplexNoise3D: NodeHandler = (ctx, fields, _inputs, x, y, z) => {
  const freq = Number(fields.Frequency ?? 1.0);
  const amp = Number(fields.Amplitude ?? 1.0);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const octaves = Math.max(1, Number(fields.Octaves ?? 4));
  const lacunarity = Number(fields.Lacunarity ?? 2.0);
  const gain = Number(fields.Gain ?? 0.5);
  const noise = ctx.getNoise3D(seed);
  return fbm3D(noise, x, y, z, freq, octaves, lacunarity, gain, seed) * amp;
};

const handleSimplexRidgeNoise2D: NodeHandler = (ctx, fields, _inputs, x, _y, z) => {
  const freq = Number(fields.Frequency ?? 0.01);
  const amp = Number(fields.Amplitude ?? 1.0);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const octaves = Math.max(1, Number(fields.Octaves ?? 1));
  const noise = ctx.getNoise2D(seed);
  return ridgeFbm2D(noise, x, z, freq, octaves, seed) * amp;
};

const handleSimplexRidgeNoise3D: NodeHandler = (ctx, fields, _inputs, x, y, z) => {
  const freq = Number(fields.Frequency ?? 0.01);
  const amp = Number(fields.Amplitude ?? 1.0);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const octaves = Math.max(1, Number(fields.Octaves ?? 1));
  const noise = ctx.getNoise3D(seed);
  return ridgeFbm3D(noise, x, y, z, freq, octaves, seed) * amp;
};

const handleVoronoiNoise2D: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const freq = Number(fields.Frequency ?? 0.01);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const cellType = (fields.CellType as string) ?? "Euclidean";
  const jitter = Number(fields.Jitter ?? 1.0);
  const octaves = Math.max(1, Number(fields.Octaves ?? 1));
  const lacunarity = Number(fields.Lacunarity ?? 2.0);
  const gain = Number(fields.Gain ?? 0.5);
  const returnType = (fields.ReturnType as string) ?? "Distance";
  const noise = ctx.getVoronoi2D(seed, cellType, jitter);
  let raw = octaves > 1
    ? fbm2D(noise, x, z, freq, octaves, lacunarity, gain, seed)
    : noise(x * freq, z * freq);
  if (returnType === "Curve") {
    raw = ctx.applyCurve("ReturnCurve", raw, inputs);
  } else if (returnType === "Density") {
    raw = ctx.getInput(inputs, "ReturnDensity", x, y, z) * raw;
  }
  return raw;
};

const handleVoronoiNoise3D: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const freq = Number(fields.Frequency ?? 0.01);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const cellType = (fields.CellType as string) ?? "Euclidean";
  const jitter = Number(fields.Jitter ?? 1.0);
  const octaves = Math.max(1, Number(fields.Octaves ?? 1));
  const lacunarity = Number(fields.Lacunarity ?? 2.0);
  const gain = Number(fields.Gain ?? 0.5);
  const returnType = (fields.ReturnType as string) ?? "Distance";
  const noise = ctx.getVoronoi3D(seed, cellType, jitter);
  let raw = octaves > 1
    ? fbm3D(noise, x, y, z, freq, octaves, lacunarity, gain, seed)
    : noise(x * freq, y * freq, z * freq);
  if (returnType === "Curve") {
    raw = ctx.applyCurve("ReturnCurve", raw, inputs);
  } else if (returnType === "Density") {
    raw = ctx.getInput(inputs, "ReturnDensity", x, y, z) * raw;
  }
  return raw;
};

const handleFractalNoise2D: NodeHandler = (ctx, fields, _inputs, x, _y, z) => {
  const freq = Number(fields.Frequency ?? 1.0);
  const octaves = Math.max(1, Number(fields.Octaves ?? 4));
  const lacunarity = Number(fields.Lacunarity ?? 2.0);
  const gain = Number(fields.Gain ?? 0.5);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const noise = ctx.getNoise2D(seed);
  return fbm2D(noise, x, z, freq, octaves, lacunarity, gain, seed);
};

const handleFractalNoise3D: NodeHandler = (ctx, fields, _inputs, x, y, z) => {
  const freq = Number(fields.Frequency ?? 1.0);
  const octaves = Math.max(1, Number(fields.Octaves ?? 4));
  const lacunarity = Number(fields.Lacunarity ?? 2.0);
  const gain = Number(fields.Gain ?? 0.5);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const noise = ctx.getNoise3D(seed);
  return fbm3D(noise, x, y, z, freq, octaves, lacunarity, gain, seed);
};

export function buildNoiseHandlers(): Map<string, NodeHandler> {
  return new Map<string, NodeHandler>([
    ["SimplexNoise2D", handleSimplexNoise2D],
    ["SimplexNoise3D", handleSimplexNoise3D],
    ["SimplexRidgeNoise2D", handleSimplexRidgeNoise2D],
    ["SimplexRidgeNoise3D", handleSimplexRidgeNoise3D],
    ["VoronoiNoise2D", handleVoronoiNoise2D],
    ["VoronoiNoise3D", handleVoronoiNoise3D],
    ["FractalNoise2D", handleFractalNoise2D],
    ["FractalNoise3D", handleFractalNoise3D],
  ]);
}
