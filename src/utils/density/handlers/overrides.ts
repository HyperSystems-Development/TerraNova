import type { NodeHandler } from "../evalContext";

const handleYOverride: NodeHandler = (ctx, fields, inputs, x, _y, z) => {
  const overrideY = Number(fields.OverrideY ?? fields.Y ?? 0);
  return ctx.getInput(inputs, "Input", x, overrideY, z);
};

const handleXOverride: NodeHandler = (ctx, fields, inputs, _x, y, z) => {
  const overrideX = Number(fields.OverrideX ?? 0);
  return ctx.getInput(inputs, "Input", overrideX, y, z);
};

const handleZOverride: NodeHandler = (ctx, fields, inputs, x, y) => {
  const overrideZ = Number(fields.OverrideZ ?? 0);
  return ctx.getInput(inputs, "Input", x, y, overrideZ);
};

const handleAnchor: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const isReversed = fields.Reversed === true;
  if (ctx.anchorSet) {
    if (isReversed) {
      return ctx.getInput(inputs, "Input", x + ctx.anchorX, y + ctx.anchorY, z + ctx.anchorZ);
    } else {
      return ctx.getInput(inputs, "Input", x - ctx.anchorX, y - ctx.anchorY, z - ctx.anchorZ);
    }
  } else {
    // V2: when densityAnchor is null, pass through with original position unchanged
    return ctx.getInput(inputs, "Input", x, y, z);
  }
};

const handleExported: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  return ctx.getInput(inputs, "Input", x, y, z);
};

const handleImportedValue: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  return ctx.getInput(inputs, "Input", x, y, z);
};

const handleOffset: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  return ctx.getInput(inputs, "Input", x, y, z) + ctx.getInput(inputs, "Offset", x, y, z);
};

const handleDistance: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  const dist = Math.sqrt(x * x + y * y + z * z);
  return ctx.applyCurve("Curve", dist, inputs);
};

const handleAmplitude: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const amp = ctx.getInput(inputs, "Amplitude", x, y, z);
  return v * amp;
};

const handleYSampled: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  let targetY: number;
  if (inputs.has("YProvider")) {
    targetY = ctx.getInput(inputs, "YProvider", x, y, z);
  } else {
    const sampleDist = Number(fields.SampleDistance ?? 4.0);
    const sampleOffset = Number(fields.SampleOffset ?? 0.0);
    targetY = sampleDist > 0
      ? Math.round((y - sampleOffset) / sampleDist) * sampleDist + sampleOffset
      : y;
  }
  return ctx.getInput(inputs, "Input", x, targetY, z);
};

const handleSwitchState: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  if (!inputs.has("Input")) {
    return Number(fields.State ?? 0);
  } else {
    const prevState = ctx.switchState;
    ctx.switchState = ctx.hashSeed(fields.State as string | number | undefined);
    const result = ctx.getInput(inputs, "Input", x, y, z);
    ctx.switchState = prevState;
    return result;
  }
};

export function buildOverrideHandlers(): Map<string, NodeHandler> {
  return new Map<string, NodeHandler>([
    ["YOverride", handleYOverride],
    ["XOverride", handleXOverride],
    ["ZOverride", handleZOverride],
    ["Anchor", handleAnchor],
    ["Exported", handleExported],
    ["ImportedValue", handleImportedValue],
    ["Offset", handleOffset],
    ["Distance", handleDistance],
    ["Amplitude", handleAmplitude],
    ["YSampled", handleYSampled],
    ["SwitchState", handleSwitchState],
  ]);
}
