import type { NodeHandler } from "../evalContext";
import { smoothMin, smoothMax } from "../mathHelpers";

const handleSmoothClamp: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const minV = Number(fields.Min ?? 0);
  const maxV = Number(fields.Max ?? 1);
  const k = Number(fields.Smoothness ?? 0.1);
  return smoothMax(smoothMin(v, maxV, k), minV, k);
};

const handleSmoothFloor: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const threshold = Number(fields.Threshold ?? 0);
  const k = Number(fields.Smoothness ?? 0.1);
  return smoothMax(v, threshold, k);
};

const handleSmoothCeiling: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const threshold = Number(fields.Threshold ?? 1.0);
  const k = Number(fields.Smoothness ?? 0.1);
  return smoothMin(v, threshold, k);
};

const handleSmoothMin: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const k = Number(fields.Smoothness ?? 0.1);
  let result = ctx.getInput(inputs, "Inputs[0]", x, y, z);
  for (let i = 1; inputs.has(`Inputs[${i}]`); i++) {
    result = smoothMin(result, ctx.getInput(inputs, `Inputs[${i}]`, x, y, z), k);
  }
  return result;
};

const handleSmoothMax: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const k = Number(fields.Smoothness ?? 0.1);
  let result = ctx.getInput(inputs, "Inputs[0]", x, y, z);
  for (let i = 1; inputs.has(`Inputs[${i}]`); i++) {
    result = smoothMax(result, ctx.getInput(inputs, `Inputs[${i}]`, x, y, z), k);
  }
  return result;
};

const handleFloor: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const floor = Number(fields.Floor ?? 0);
  return Math.max(v, floor);
};

const handleCeiling: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const ceiling = Number(fields.Ceiling ?? 1);
  return Math.min(v, ceiling);
};

export function buildSmoothHandlers(): Map<string, NodeHandler> {
  return new Map<string, NodeHandler>([
    ["SmoothClamp", handleSmoothClamp],
    ["SmoothFloor", handleSmoothFloor],
    ["SmoothCeiling", handleSmoothCeiling],
    ["SmoothMin", handleSmoothMin],
    ["SmoothMax", handleSmoothMax],
    ["Floor", handleFloor],
    ["Ceiling", handleCeiling],
  ]);
}
