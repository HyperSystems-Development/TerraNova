import type { NodeHandler } from "../evalContext";
import { DEFAULT_WORLD_HEIGHT } from "@/constants";

const handleCoordinateX: NodeHandler = (_ctx, _fields, _inputs, x) => x;
const handleCoordinateY: NodeHandler = (_ctx, _fields, _inputs, _x, y) => y;
const handleCoordinateZ: NodeHandler = (_ctx, _fields, _inputs, _x, _y, z) => z;

const handleDistanceFromOrigin: NodeHandler = (_ctx, _fields, _inputs, x, y, z) => {
  return Math.sqrt(x * x + y * y + z * z);
};

const handleDistanceFromAxis: NodeHandler = (_ctx, fields, _inputs, x, y, z) => {
  const axis = String(fields.Axis ?? "Y");
  if (axis === "X") return Math.sqrt(y * y + z * z);
  if (axis === "Z") return Math.sqrt(x * x + y * y);
  return Math.sqrt(x * x + z * z); // Y axis
};

const handleDistanceFromPoint: NodeHandler = (_ctx, fields, _inputs, x, y, z) => {
  const pt = fields.Point as { x?: number; y?: number; z?: number } | undefined;
  const px = Number(pt?.x ?? 0);
  const py = Number(pt?.y ?? 0);
  const pz = Number(pt?.z ?? 0);
  return Math.sqrt((x - px) ** 2 + (y - py) ** 2 + (z - pz) ** 2);
};

const handleAngleFromOrigin: NodeHandler = (_ctx, _fields, _inputs, x, _y, z) => {
  return Math.atan2(z, x);
};

const handleAngleFromPoint: NodeHandler = (_ctx, fields, _inputs, x, _y, z) => {
  const pt = fields.Point as { x?: number; y?: number; z?: number } | undefined;
  const px = Number(pt?.x ?? 0);
  const pz = Number(pt?.z ?? 0);
  return Math.atan2(z - pz, x - px);
};

const handleAngle: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  const vecProvId = inputs.get("VectorProvider");
  const vecId = inputs.get("Vector");
  let refX: number, refY: number, refZ: number;

  if (vecProvId) {
    const vec = ctx.evaluateVectorProvider(vecProvId, x, y, z, ctx.nodeById, ctx.inputEdges, ctx.evaluate);
    refX = vec.x; refY = vec.y; refZ = vec.z;
  } else if (vecId) {
    const vec = ctx.evaluateVectorProvider(vecId, x, y, z, ctx.nodeById, ctx.inputEdges, ctx.evaluate);
    refX = vec.x; refY = vec.y; refZ = vec.z;
  } else {
    const vecField = fields.Vector as { x?: number; y?: number; z?: number } | undefined;
    refX = Number(vecField?.x ?? 0);
    refY = Number(vecField?.y ?? 1);
    refZ = Number(vecField?.z ?? 0);
  }

  const posLen = Math.sqrt(x * x + y * y + z * z);
  const refLen = Math.sqrt(refX * refX + refY * refY + refZ * refZ);

  if (posLen < 1e-10 || refLen < 1e-10) return 0;

  const dotP = (x * refX + y * refY + z * refZ) / (posLen * refLen);
  let angleDeg = Math.acos(Math.max(-1, Math.min(1, dotP))) * (180 / Math.PI);

  if (fields.IsAxis === true && angleDeg > 90) {
    angleDeg = 180 - angleDeg;
  }

  return angleDeg;
};

const handleYGradient: NodeHandler = (_ctx, fields, _inputs, _x, y) => {
  const fromY = Number(fields.FromY ?? 0);
  const toY = Number(fields.ToY ?? DEFAULT_WORLD_HEIGHT);
  const range = toY - fromY;
  return range === 0 ? 0 : (y - fromY) / range;
};

const handleGradientDensity: NodeHandler = (_ctx, fields, _inputs, _x, y) => {
  const fromY = Number(fields.FromY ?? 0);
  const toY = Number(fields.ToY ?? DEFAULT_WORLD_HEIGHT);
  const range = toY - fromY;
  return range === 0 ? 0 : (y - fromY) / range;
};

const handleGradient: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  // Directional derivative via finite differences along Axis
  const axis = fields.Axis as { x: number; y: number; z: number } | undefined;
  const ax = Number(axis?.x ?? 0);
  const ay = Number(axis?.y ?? 1);
  const az = Number(axis?.z ?? 0);
  const sr = Number(fields.SampleRange ?? 1.0);
  const inputId = inputs.get("Input");
  if (!inputId) return 0;
  const fPlus = ctx.evaluate(inputId, x + ax * sr, y + ay * sr, z + az * sr);
  const fMinus = ctx.evaluate(inputId, x - ax * sr, y - ay * sr, z - az * sr);
  return sr > 0 ? (fPlus - fMinus) / (2 * sr) : 0;
};

const handleBaseHeight: NodeHandler = (ctx, fields, _inputs, _x, y) => {
  const name = (fields.BaseHeightName as string) ?? "Base";
  const baseY = ctx.contentFields[name] ?? 100;
  const distance = fields.Distance === true;
  return distance ? (y - baseY) : baseY;
};

export function buildPositionHandlers(): Map<string, NodeHandler> {
  return new Map<string, NodeHandler>([
    ["CoordinateX", handleCoordinateX],
    ["CoordinateY", handleCoordinateY],
    ["CoordinateZ", handleCoordinateZ],
    ["DistanceFromOrigin", handleDistanceFromOrigin],
    ["DistanceFromAxis", handleDistanceFromAxis],
    ["DistanceFromPoint", handleDistanceFromPoint],
    ["AngleFromOrigin", handleAngleFromOrigin],
    ["AngleFromPoint", handleAngleFromPoint],
    ["Angle", handleAngle],
    ["YGradient", handleYGradient],
    ["GradientDensity", handleGradientDensity],
    ["Gradient", handleGradient],
    ["BaseHeight", handleBaseHeight],
  ]);
}
