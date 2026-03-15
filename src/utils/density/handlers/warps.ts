import type { NodeHandler } from "../evalContext";
import { domainWarpProgressive2D, domainWarpProgressive3D } from "../fastNoiseLiteWarp";

const handlePositionsPinch: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const strength = Number(fields.Strength ?? 1.0);
  const dist = Math.sqrt(x * x + z * z);
  const pinchFactor = dist > 0 ? Math.pow(dist, strength) / dist : 1;
  return ctx.getInput(inputs, "Input", x * pinchFactor, y, z * pinchFactor);
};

const handlePositionsTwist: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const angle = Number(fields.Angle ?? 0);
  const rad = (angle * Math.PI / 180) * y;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return ctx.getInput(inputs, "Input", x * cos - z * sin, y, x * sin + z * cos);
};

const handleGradientWarp: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const warpFactor = Number(fields.WarpFactor ?? fields.WarpScale ?? 1.0);
  const eps = Number(fields.SampleRange ?? 1.0);
  const is2D = fields.Is2D === true;
  const yFor2D = Number(fields.YFor2D ?? 0.0);
  const inv2e = 1.0 / (2.0 * eps);
  const sampleY = is2D ? yFor2D : y;

  const dfdx = (ctx.getInput(inputs, "WarpSource", x + eps, sampleY, z)
              - ctx.getInput(inputs, "WarpSource", x - eps, sampleY, z)) * inv2e;
  const dfdz = (ctx.getInput(inputs, "WarpSource", x, sampleY, z + eps)
              - ctx.getInput(inputs, "WarpSource", x, sampleY, z - eps)) * inv2e;

  let wx = x + warpFactor * dfdx;
  let wy = y;
  let wz = z + warpFactor * dfdz;

  if (!is2D) {
    const dfdy = (ctx.getInput(inputs, "WarpSource", x, sampleY + eps, z)
                - ctx.getInput(inputs, "WarpSource", x, sampleY - eps, z)) * inv2e;
    wy = y + warpFactor * dfdy;
  }

  return ctx.getInput(inputs, "Input", wx, wy, wz);
};

const handleVectorWarp: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const warpFactor = Number(fields.WarpFactor ?? 1.0);
  const dirNodeId = inputs.get("Direction") ?? inputs.get("WarpVector");
  const dir = dirNodeId
    ? ctx.evaluateVectorProvider(dirNodeId, x, y, z, ctx.nodeById, ctx.inputEdges, ctx.evaluate)
    : { x: 0, y: 0, z: 0 };
  const dirNorm = ctx.vec3Normalize(dir);
  const dirLen = ctx.vec3Length(dir);

  if (dirLen < 1e-10) {
    return ctx.getInput(inputs, "Input", x, y, z);
  }

  const magnitude = ctx.getInput(inputs, "Magnitude", x, y, z);
  const displacement = magnitude * warpFactor;
  return ctx.getInput(inputs, "Input",
    x + dirNorm.x * displacement,
    y + dirNorm.y * displacement,
    z + dirNorm.z * displacement,
  );
};

const handleFastGradientWarp: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const warpFactor = Number(fields.WarpFactor ?? 1.0);
  const warpSeed = ctx.hashSeed((fields.WarpSeed ?? fields.Seed) as string | number | undefined);
  const warpScale = Number(fields.WarpScale ?? 1.0);
  // V2: passes 1.0 / warpScale as frequency to FastNoiseLite
  const warpFreq = warpScale !== 0 ? 1.0 / warpScale : 1.0;
  const warpOctaves = Math.max(1, Number(fields.WarpOctaves ?? 3));
  const warpLacunarity = Number(fields.WarpLacunarity ?? 2.0);
  const warpPersistence = Number(fields.WarpPersistence ?? 0.5);
  const is2D = fields.Is2D === true;

  if (is2D) {
    const warped = domainWarpProgressive2D(
      warpSeed, warpFactor, warpFreq,
      warpOctaves, warpLacunarity, warpPersistence,
      x, z,
    );
    return ctx.getInput(inputs, "Input", warped.x, y, warped.y);
  } else {
    const warped = domainWarpProgressive3D(
      warpSeed, warpFactor, warpFreq,
      warpOctaves, warpLacunarity, warpPersistence,
      x, y, z,
    );
    return ctx.getInput(inputs, "Input", warped.x, warped.y, warped.z);
  }
};

const handleDomainWarp2D: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const amp = Number(fields.Amplitude ?? 1.0);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const freq = Number(fields.Frequency ?? 0.01);
  const noiseX = ctx.getNoise2D(seed);
  const noiseZ = ctx.getNoise2D(seed + 1);
  const warpX = noiseX(x * freq, z * freq) * amp;
  const warpZ = noiseZ(x * freq, z * freq) * amp;
  return ctx.getInput(inputs, "Input", x + warpX, y, z + warpZ);
};

const handleDomainWarp3D: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const amp = Number(fields.Amplitude ?? 1.0);
  const seed = ctx.hashSeed(fields.Seed as string | number | undefined);
  const freq = Number(fields.Frequency ?? 0.01);
  const noiseX = ctx.getNoise3D(seed);
  const noiseY = ctx.getNoise3D(seed + 1);
  const noiseZ = ctx.getNoise3D(seed + 2);
  const warpX = noiseX(x * freq, y * freq, z * freq) * amp;
  const warpY = noiseY(x * freq, y * freq, z * freq) * amp;
  const warpZ = noiseZ(x * freq, y * freq, z * freq) * amp;
  return ctx.getInput(inputs, "Input", x + warpX, y + warpY, z + warpZ);
};

export function buildWarpHandlers(): Map<string, NodeHandler> {
  return new Map<string, NodeHandler>([
    ["PositionsPinch", handlePositionsPinch],
    ["PositionsTwist", handlePositionsTwist],
    ["GradientWarp", handleGradientWarp],
    ["VectorWarp", handleVectorWarp],
    ["FastGradientWarp", handleFastGradientWarp],
    ["DomainWarp2D", handleDomainWarp2D],
    ["DomainWarp3D", handleDomainWarp3D],
  ]);
}
