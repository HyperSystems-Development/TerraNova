import type { NodeHandler } from "../evalContext";

const handleSlider: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const tr = fields.Translation as { x?: number; y?: number; z?: number } | undefined;
  const dx = Number(tr?.x ?? 0);
  const dy = Number(tr?.y ?? 0);
  const dz = Number(tr?.z ?? 0);
  return ctx.getInput(inputs, "Input", x - dx, y - dy, z - dz);
};

const handleScale: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const sc = fields.Scale as { x?: number; y?: number; z?: number } | undefined;
  const sx = Number(sc?.x ?? 1) || 1;
  const sy = Number(sc?.y ?? 1) || 1;
  const sz = Number(sc?.z ?? 1) || 1;
  return ctx.getInput(inputs, "Input", x / sx, y / sy, z / sz);
};

const handleRotator: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const angleDeg = Number(fields.AngleDegrees ?? 0);
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = x * cos + z * sin;
  const rz = -x * sin + z * cos;
  return ctx.getInput(inputs, "Input", rx, y, rz);
};

const handleMirroredPosition: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const axis = String(fields.Axis ?? "X");
  const mx = axis === "X" ? Math.abs(x) : x;
  const my = axis === "Y" ? Math.abs(y) : y;
  const mz = axis === "Z" ? Math.abs(z) : z;
  return ctx.getInput(inputs, "Input", mx, my, mz);
};

const handleQuantizedPosition: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const step = Number(fields.StepSize ?? 1) || 1;
  return ctx.getInput(inputs, "Input", Math.floor(x / step) * step, Math.floor(y / step) * step, Math.floor(z / step) * step);
};

export function buildTransformHandlers(): Map<string, NodeHandler> {
  return new Map<string, NodeHandler>([
    ["Slider", handleSlider],
    ["TranslatedPosition", handleSlider],
    ["Scale", handleScale],
    ["ScaledPosition", handleScale],
    ["Rotator", handleRotator],
    ["RotatedPosition", handleRotator],
    ["MirroredPosition", handleMirroredPosition],
    ["QuantizedPosition", handleQuantizedPosition],
  ]);
}
