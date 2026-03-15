import type { NodeHandler } from "../evalContext";

const handleConstant: NodeHandler = (_ctx, fields) => {
  return Number(fields.Value ?? 0);
};

const handleZero: NodeHandler = () => 0;

const handleOne: NodeHandler = () => 1;

const handleCacheOnce: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  // Use source node ID as proxy for the original nodeId-based cache key.
  // The original used `${nodeId}:${x}:${y}:${z}` — we use the Input source ID
  // which is unique per CacheOnce node (each has a different input connection).
  const src = inputs.get("Input");
  if (!src) return 0;
  const cacheKey = `${src}:co:${x}:${y}:${z}`;
  const cached = ctx.memoCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const result = ctx.getInput(inputs, "Input", x, y, z);
  ctx.memoCache.set(cacheKey, result);
  return result;
};

const handleFlatCache: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  return ctx.getInput(inputs, "Input", x, y, z);
};

const handleWrap: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  return ctx.getInput(inputs, "Input", x, y, z);
};

const handlePassthrough: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  return ctx.getInput(inputs, "Input", x, y, z);
};

const handleDebug: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  return ctx.getInput(inputs, "Input", x, y, z);
};

const handleCurveFunction: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  const inputVal = ctx.getInput(inputs, "Input", x, y, z);
  return ctx.applyCurve("Curve", inputVal, inputs);
};

const handleSplineFunction: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const inputVal = ctx.getInput(inputs, "Input", x, y, z);
  return ctx.applySpline(fields, inputVal);
};

export function buildSimpleHandlers(): Map<string, NodeHandler> {
  return new Map<string, NodeHandler>([
    ["Constant", handleConstant],
    ["Zero", handleZero],
    ["One", handleOne],
    ["CacheOnce", handleCacheOnce],
    ["FlatCache", handleFlatCache],
    ["Cache2D", handleFlatCache],
    ["Wrap", handleWrap],
    ["Passthrough", handlePassthrough],
    ["Debug", handleDebug],
    ["CurveFunction", handleCurveFunction],
    ["SplineFunction", handleSplineFunction],
  ]);
}
