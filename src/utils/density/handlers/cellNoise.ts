import type { NodeHandler } from "../evalContext";

const handlePositionsCellNoise: NodeHandler = (ctx, fields, _inputs, x, _y, z) => {
  const scale = Number(fields.Scale ?? 1.0);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const returnType = (fields.ReturnType as string) ?? "Distance";
  const distFn = (fields.DistanceFunction as string) ?? "Euclidean";
  // V2 CellNoiseField doubles jitter: jitter *= 2.0
  const jitter = Number(fields.Jitter ?? 0.5) * 2.0;
  const noise = ctx.getVoronoi2D(seed, returnType, jitter, returnType, distFn);
  const sx = scale !== 0 ? x / scale : x;
  const sz = scale !== 0 ? z / scale : z;
  const raw = noise(sx, sz);
  // Approximate cell wall distance from the raw value
  ctx.cellWallDist = Math.max(0, 0.5 - Math.abs(raw + 0.5));
  return raw;
};

const handleCellWallDistance: NodeHandler = (ctx) => {
  if (ctx.cellWallDist < Infinity) {
    return ctx.cellWallDist;
  }
  return 0;
};

const handlePositions3D: NodeHandler = (ctx, fields, _inputs, x, y, z) => {
  const scale = Number(fields.Scale ?? 1.0);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const returnType = (fields.ReturnType as string) ?? "Distance";
  const distFn = (fields.DistanceFunction as string) ?? "Euclidean";
  const jitter = Number(fields.Jitter ?? 0.5) * 2.0;
  const noise = ctx.getVoronoi3D(seed, returnType, jitter, returnType, distFn);
  const sx = scale !== 0 ? x / scale : x;
  const sy = scale !== 0 ? y / scale : y;
  const sz = scale !== 0 ? z / scale : z;
  return noise(sx, sy, sz);
};

export function buildCellNoiseHandlers(): Map<string, NodeHandler> {
  return new Map<string, NodeHandler>([
    ["PositionsCellNoise", handlePositionsCellNoise],
    ["CellWallDistance", handleCellWallDistance],
    ["Positions3D", handlePositions3D],
  ]);
}
