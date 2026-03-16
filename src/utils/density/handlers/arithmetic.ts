import type { NodeHandler } from "../evalContext";

const handleNegate: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  return -ctx.getInput(inputs, "Input", x, y, z);
};

const handleAbs: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  return Math.abs(ctx.getInput(inputs, "Input", x, y, z));
};

const handleSquareRoot: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  return Math.sqrt(Math.abs(ctx.getInput(inputs, "Input", x, y, z)));
};

const handleCubeRoot: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  return Math.cbrt(ctx.getInput(inputs, "Input", x, y, z));
};

const handleSquare: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  return v * v;
};

const handleCubeMath: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  return v * v * v;
};

const handleInverse: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  return v === 0 ? 0 : 1 / v;
};

const handleSumSelf: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const count = Math.max(1, Number(fields.Count ?? 2));
  return ctx.getInput(inputs, "Input", x, y, z) * count;
};

const handleModulo: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const divisor = Number(fields.Divisor ?? 1.0);
  return divisor === 0 ? 0 : v % divisor;
};

const handleOffsetConstant: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const offset = Number(fields.Offset ?? fields.Value ?? 0);
  return v + offset;
};

const handleAmplitudeConstant: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const amp = Number(fields.Value ?? 1);
  return v * amp;
};

const handlePow: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const v = ctx.getInput(inputs, "Input", x, y, z);
  const exp = Number(fields.Exponent ?? 2);
  return Math.pow(Math.abs(v), exp) * Math.sign(v);
};

const handleSum: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  let sum = 0;
  for (let i = 0; inputs.has(`Inputs[${i}]`); i++) {
    sum += ctx.getInput(inputs, `Inputs[${i}]`, x, y, z);
  }
  return sum;
};

const handleWeightedSum: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const weights = (fields.Weights as number[]) ?? [];
  let wsum = 0;
  for (let i = 0; inputs.has(`Inputs[${i}]`); i++) {
    wsum += ctx.getInput(inputs, `Inputs[${i}]`, x, y, z) * (weights[i] ?? 1);
  }
  return wsum;
};

const handleProduct: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  let prod = 1;
  for (let i = 0; inputs.has(`Inputs[${i}]`); i++) {
    prod *= ctx.getInput(inputs, `Inputs[${i}]`, x, y, z);
  }
  return prod;
};

export function buildArithmeticHandlers(): Map<string, NodeHandler> {
  return new Map<string, NodeHandler>([
    ["Negate", handleNegate],
    ["Abs", handleAbs],
    ["SquareRoot", handleSquareRoot],
    ["CubeRoot", handleCubeRoot],
    ["Square", handleSquare],
    ["CubeMath", handleCubeMath],
    ["Inverse", handleInverse],
    ["SumSelf", handleSumSelf],
    ["Modulo", handleModulo],
    ["OffsetConstant", handleOffsetConstant],
    ["AmplitudeConstant", handleAmplitudeConstant],
    ["Pow", handlePow],
    ["Sum", handleSum],
    ["WeightedSum", handleWeightedSum],
    ["Product", handleProduct],
  ]);
}
