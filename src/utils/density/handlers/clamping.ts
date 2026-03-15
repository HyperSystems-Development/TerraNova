import type { NodeHandler } from "../evalContext";

const handleClamp: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const wallA = Number(fields.Min ?? fields.WallA ?? -Infinity);
  const wallB = Number(fields.Max ?? fields.WallB ?? Infinity);
  // V2: auto-sort walls so either order works; if equal, return constant
  if (wallA === wallB) return wallA;
  const lo = Math.min(wallA, wallB);
  const hi = Math.max(wallA, wallB);
  return Math.max(lo, Math.min(hi, v));
};

const handleClampToIndex: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const min = Number(fields.Min ?? 0);
  const max = Number(fields.Max ?? 255);
  return Math.max(min, Math.min(max, Math.floor(v)));
};

const handleNormalizer: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const src = fields.SourceRange as { Min?: number; Max?: number } | undefined;
  const tgt = fields.TargetRange as { Min?: number; Max?: number } | undefined;
  // V2 defaults: FromMin=0, FromMax=1, ToMin=0, ToMax=1 (identity)
  const srcMin = Number(fields.FromMin ?? src?.Min ?? 0);
  const srcMax = Number(fields.FromMax ?? src?.Max ?? 1);
  const tgtMin = Number(fields.ToMin ?? tgt?.Min ?? 0);
  const tgtMax = Number(fields.ToMax ?? tgt?.Max ?? 1);
  const range = srcMax - srcMin;
  const t = range === 0 ? 0 : (v - srcMin) / range;
  return tgtMin + t * (tgtMax - tgtMin);
};

const handleDoubleNormalizer: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const srcA = fields.SourceRangeA as { Min?: number; Max?: number } | undefined;
  const tgtA = fields.TargetRangeA as { Min?: number; Max?: number } | undefined;
  const srcB = fields.SourceRangeB as { Min?: number; Max?: number } | undefined;
  const tgtB = fields.TargetRangeB as { Min?: number; Max?: number } | undefined;
  if (v < 0) {
    const srcMin = Number(srcA?.Min ?? -1);
    const srcMax = Number(srcA?.Max ?? 0);
    const tgtMin = Number(tgtA?.Min ?? 0);
    const tgtMax = Number(tgtA?.Max ?? 0.5);
    const range = srcMax - srcMin;
    const t = range === 0 ? 0 : (v - srcMin) / range;
    return tgtMin + t * (tgtMax - tgtMin);
  } else {
    const srcMin = Number(srcB?.Min ?? 0);
    const srcMax = Number(srcB?.Max ?? 1);
    const tgtMin = Number(tgtB?.Min ?? 0.5);
    const tgtMax = Number(tgtB?.Max ?? 1);
    const range = srcMax - srcMin;
    const t = range === 0 ? 0 : (v - srcMin) / range;
    return tgtMin + t * (tgtMax - tgtMin);
  }
};

const handleLinearTransform: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const scale = Number(fields.Scale ?? 1);
  const offset = Number(fields.Offset ?? 0);
  return v * scale + offset;
};

const handleRangeChoice: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const cond = ctx.getInput(inputs, "Condition", x, y, z);
  const threshold = Number(fields.Threshold ?? 0.5);
  return cond >= threshold
    ? ctx.getInput(inputs, "TrueInput", x, y, z)
    : ctx.getInput(inputs, "FalseInput", x, y, z);
};

const handleInterpolate: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  const a = ctx.getInput(inputs, "InputA", x, y, z);
  const b = ctx.getInput(inputs, "InputB", x, y, z);
  const f = ctx.getInput(inputs, "Factor", x, y, z);
  return a + (b - a) * f;
};

export function buildClampingHandlers(): Map<string, NodeHandler> {
  return new Map<string, NodeHandler>([
    ["Clamp", handleClamp],
    ["ClampToIndex", handleClampToIndex],
    ["Normalizer", handleNormalizer],
    ["DoubleNormalizer", handleDoubleNormalizer],
    ["LinearTransform", handleLinearTransform],
    ["RangeChoice", handleRangeChoice],
    ["Interpolate", handleInterpolate],
  ]);
}
