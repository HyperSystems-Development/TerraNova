import type { NodeHandler } from "../evalContext";
import { smoothMin, smoothMax } from "../mathHelpers";

const handleSmoothClamp: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const minV = Number(fields.Min ?? fields.WallA ?? -1);
  const maxV = Number(fields.Max ?? fields.WallB ?? 1);
  const k = Number(fields.Smoothness ?? fields.Range ?? 0.01); // V2 default: 0.01
  return smoothMax(smoothMin(v, maxV, k), minV, k);
};

const handleSmoothFloor: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const threshold = Number(fields.Threshold ?? fields.Limit ?? 0);
  const k = Number(fields.Smoothness ?? fields.SmoothRange ?? 1.0); // V2 default: 1.0
  return smoothMax(v, threshold, k);
};

const handleSmoothCeiling: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const threshold = Number(fields.Threshold ?? fields.Limit ?? 0); // V2 default: 0.0
  const k = Number(fields.Smoothness ?? fields.SmoothRange ?? 1.0); // V2 default: 1.0
  return smoothMin(v, threshold, k);
};

const handleSmoothMin: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const k = Number(fields.Smoothness ?? fields.SmoothRange ?? fields.Range ?? 1.0);
  let result = ctx.getInput(inputs, "Inputs[0]", x, y, z);
  for (let i = 1; inputs.has(`Inputs[${i}]`); i++) {
    result = smoothMin(result, ctx.getInput(inputs, `Inputs[${i}]`, x, y, z), k);
  }
  return result;
};

const handleSmoothMax: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const k = Number(fields.Smoothness ?? fields.SmoothRange ?? fields.Range ?? 1.0);
  let result = ctx.getInput(inputs, "Inputs[0]", x, y, z);
  for (let i = 1; inputs.has(`Inputs[${i}]`); i++) {
    result = smoothMax(result, ctx.getInput(inputs, `Inputs[${i}]`, x, y, z), k);
  }
  return result;
};

const handleFloor: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const floor = Number(fields.Floor ?? fields.Limit ?? 0);
  return Math.max(v, floor);
};

const handleCeiling: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const ceiling = Number(fields.Ceiling ?? fields.Limit ?? 1);
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
