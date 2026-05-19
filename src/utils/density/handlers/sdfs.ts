import type { NodeHandler } from "../evalContext";
import { buildRotationMatrix, mat3Apply } from "../mathHelpers";

const handleEllipsoid: NodeHandler = (_ctx, fields, _inputs, x, y, z) => {
  const scale = fields.Scale as { x?: number; y?: number; z?: number } | undefined
             ?? fields.Radius as { x?: number; y?: number; z?: number } | undefined;
  const sx = Number(scale?.x ?? 1) || 1;
  const sy = Number(scale?.y ?? 1) || 1;
  const sz = Number(scale?.z ?? 1) || 1;
  const rot = buildRotationMatrix(
    fields.NewYAxis as { x?: number; y?: number; z?: number } | undefined,
    Number(fields.SpinAngle ?? 0),
  );
  const [erx, ery, erz] = mat3Apply(rot, x, y, z);
  const esx = erx / sx, esy = ery / sy, esz = erz / sz;
  return Math.sqrt(esx * esx + esy * esy + esz * esz) - 1;
};

const handleCuboid: NodeHandler = (_ctx, fields, _inputs, x, y, z) => {
  const scale = fields.Scale as { x?: number; y?: number; z?: number } | undefined
             ?? fields.Size as { x?: number; y?: number; z?: number } | undefined;
  const sx = Number(scale?.x ?? 1) || 1;
  const sy = Number(scale?.y ?? 1) || 1;
  const sz = Number(scale?.z ?? 1) || 1;
  const rot = buildRotationMatrix(
    fields.NewYAxis as { x?: number; y?: number; z?: number } | undefined,
    Number(fields.SpinAngle ?? 0),
  );
  const [crx, cry, crz] = mat3Apply(rot, x, y, z);
  const csx = crx / sx, csy = cry / sy, csz = crz / sz;
  const qx = Math.abs(csx) - 1.0;
  const qy = Math.abs(csy) - 1.0;
  const qz = Math.abs(csz) - 1.0;
  const outside = Math.sqrt(
    Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2 + Math.max(qz, 0) ** 2,
  );
  const inside = Math.min(Math.max(qx, qy, qz), 0);
  return outside + inside;
};

const handleCube: NodeHandler = (ctx, _fields, inputs, x, y, z) => {
  const q = Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) - 1.0;
  return ctx.applyCurve("Curve", q, inputs);
};

const handleCylinder: NodeHandler = (_ctx, fields, _inputs, x, y, z) => {
  const rot = buildRotationMatrix(
    fields.NewYAxis as { x?: number; y?: number; z?: number } | undefined,
    Number(fields.SpinAngle ?? 0),
  );
  const [cylrx, cylry, cylrz] = mat3Apply(rot, x, y, z);
  const radius = Number(fields.Radius ?? 1) || 1;
  const height = Number(fields.Height ?? 2);
  const halfH = height / 2;
  const dRadial = Math.sqrt(cylrx * cylrx + cylrz * cylrz) - radius;
  const dVertical = Math.abs(cylry) - halfH;
  const outsideR = Math.max(dRadial, 0);
  const outsideV = Math.max(dVertical, 0);
  return Math.sqrt(outsideR ** 2 + outsideV ** 2) + Math.min(Math.max(dRadial, dVertical), 0);
};

const handlePlane: NodeHandler = (_ctx, fields, _inputs, x, y, z) => {
  const n = fields.Normal as { x?: number; y?: number; z?: number } | undefined;
  let nx = Number(n?.x ?? 0);
  let ny = Number(n?.y ?? 1);
  let nz = Number(n?.z ?? 0);
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  nx /= len; ny /= len; nz /= len;
  const d = Number(fields.Distance ?? 0);
  return nx * x + ny * y + nz * z - d;
};

const handleShell: NodeHandler = (ctx, fields, inputs, x, y, z) => {
  // SDF branch: when no curves connected and InnerRadius/OuterRadius present
  if (!inputs.has("DistanceCurve") && !inputs.has("AngleCurve") &&
      (fields.InnerRadius != null || fields.OuterRadius != null)) {
    const inner = Number(fields.InnerRadius ?? 0);
    const outer = Number(fields.OuterRadius ?? 0);
    const midRadius = (inner + outer) / 2;
    const halfThickness = (outer - inner) / 2;
    const dist = Math.sqrt(x * x + y * y + z * z);
    return Math.abs(dist - midRadius) - halfThickness;
  }

  // Curve-based Shell
  const shellAxis = fields.Axis as { x?: number; y?: number; z?: number } | undefined;
  let sax = Number(shellAxis?.x ?? 0);
  let say = Number(shellAxis?.y ?? 1);
  let saz = Number(shellAxis?.z ?? 0);
  const saLen = Math.sqrt(sax * sax + say * say + saz * saz);
  if (saLen < 1e-9) return 0;
  sax /= saLen; say /= saLen; saz /= saLen;
  const shellMirror = fields.Mirror === true;

  const shellDist = Math.sqrt(x * x + y * y + z * z);
  const distAmplitude = ctx.applyCurve("DistanceCurve", shellDist, inputs);
  if (Math.abs(distAmplitude) < 1e-12) return 0;

  if (shellDist <= 1e-9) return distAmplitude;

  const posLen = shellDist;
  const dotP = (x * sax + y * say + z * saz) / posLen;
  let angleDeg = Math.acos(Math.max(-1, Math.min(1, dotP))) * (180 / Math.PI);
  if (shellMirror && angleDeg > 90) angleDeg = 180 - angleDeg;

  const angleVal = ctx.applyCurve("AngleCurve", angleDeg, inputs);
  return distAmplitude * angleVal;
};

export function buildSdfHandlers(): Map<string, NodeHandler> {
  return new Map<string, NodeHandler>([
    ["Ellipsoid", handleEllipsoid],
    ["Cuboid", handleCuboid],
    ["Cube", handleCube],
    ["Cylinder", handleCylinder],
    ["Plane", handlePlane],
    ["Shell", handleShell],
  ]);
}
