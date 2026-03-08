import type { NodeHandler } from "../evalContext";

const handleClamp: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const min = Number(fields.Min ?? -Infinity);
  const max = Number(fields.Max ?? Infinity);
  return Math.max(min, Math.min(max, v));
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
  const srcMin = Number(src?.Min ?? -1);
  const srcMax = Number(src?.Max ?? 1);
  const tgtMin = Number(tgt?.Min ?? 0);
  const tgtMax = Number(tgt?.Max ?? 1);
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
