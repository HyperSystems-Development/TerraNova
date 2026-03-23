import type { NodeHandler } from "../evalContext";

const handleConditional: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const cond = ctx.getInput(inputs, "Condition", x, y, z);
  const threshold = Number(fields.Threshold ?? 0);
  return cond >= threshold
    ? ctx.getInput(inputs, "TrueInput", x, y, z)
    : ctx.getInput(inputs, "FalseInput", x, y, z);
};

const handleMinFunction: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  let result = ctx.getInput(inputs, "Inputs[0]", x, y, z);
  for (let i = 1; inputs.has(`Inputs[${i}]`); i++) {
    result = Math.min(result, ctx.getInput(inputs, `Inputs[${i}]`, x, y, z));
  }
  return result;
};

const handleMaxFunction: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  let result = ctx.getInput(inputs, "Inputs[0]", x, y, z);
  for (let i = 1; inputs.has(`Inputs[${i}]`); i++) {
    result = Math.max(result, ctx.getInput(inputs, `Inputs[${i}]`, x, y, z));
  }
  return result;
};

const handleAverageFunction: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  let avgSum = 0;
  let avgCount = 0;
  for (let i = 0; inputs.has(`Inputs[${i}]`); i++) {
    avgSum += ctx.getInput(inputs, `Inputs[${i}]`, x, y, z);
    avgCount++;
  }
  return avgCount > 0 ? avgSum / avgCount : 0;
};

const handleBlend: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  const a = ctx.getInput(inputs, "InputA", x, y, z);
  const b = ctx.getInput(inputs, "InputB", x, y, z);
  const hasFactor = inputs.has("Factor");
  const f = hasFactor ? ctx.getInput(inputs, "Factor", x, y, z) : 0.5;
  return a + (b - a) * f;
};

const handleSwitch: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const switchStates = fields.SwitchStates as (string | number)[] | undefined;
  if (switchStates && switchStates.length > 0) {
    for (let i = 0; i < switchStates.length; i++) {
      if (ctx.hashSeed(switchStates[i] as string | number | undefined) === ctx.switchState) {
        const src = inputs.get(`Inputs[${i}]`);
        return src ? ctx.evaluate(src, x, y, z) : 0;
      }
    }
    return 0;
  } else {
    const selector = Math.max(0, Math.floor(Number(fields.Selector ?? 0)));
    const src = inputs.get(`Inputs[${selector}]`);
    return src ? ctx.evaluate(src, x, y, z) : 0;
  }
};

const handleBlendCurve: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  const a = ctx.getInput(inputs, "InputA", x, y, z);
  const b = ctx.getInput(inputs, "InputB", x, y, z);
  const rawFactor = ctx.getInput(inputs, "Factor", x, y, z);
  const curvedFactor = ctx.applyCurve("Curve", rawFactor, inputs);
  return a + (b - a) * curvedFactor;
};

const handleMultiMix: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const keys = (fields.Keys as number[]) ?? [];
  if (keys.length === 0) return 0;
  const selector = ctx.getInput(inputs, "Selector", x, y, z);

  // Sort keys while preserving original index mapping for Densities lookup
  const entries = keys.map((k, i) => ({ key: k, idx: i }));
  entries.sort((a, b) => a.key - b.key);
  const sortedKeys = entries.map(e => e.key);

  let lo = 0;
  for (let i = 1; i < sortedKeys.length; i++) {
    if (sortedKeys[i] <= selector) lo = i;
  }
  const hi = Math.min(lo + 1, sortedKeys.length - 1);
  if (lo === hi) {
    return ctx.getInput(inputs, `Densities[${entries[lo].idx}]`, x, y, z);
  }
  const t = Math.max(0, Math.min(1, (selector - sortedKeys[lo]) / (sortedKeys[hi] - sortedKeys[lo])));
  const a = ctx.getInput(inputs, `Densities[${entries[lo].idx}]`, x, y, z);
  const b = ctx.getInput(inputs, `Densities[${entries[hi].idx}]`, x, y, z);
  return a + (b - a) * t;
};

export function buildCombinatorHandlers(): Map<string, NodeHandler> {
  return new Map<string, NodeHandler>([
    ["Conditional", handleConditional],
    ["MinFunction", handleMinFunction],
    ["MaxFunction", handleMaxFunction],
    ["AverageFunction", handleAverageFunction],
    ["Blend", handleBlend],
    ["Switch", handleSwitch],
    ["BlendCurve", handleBlendCurve],
    ["MultiMix", handleMultiMix],
  ]);
}
