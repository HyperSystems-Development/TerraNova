export function smoothMin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / k));
  return b + (a - b) * h - k * h * (1 - h);
}

export function smoothMax(a: number, b: number, k: number): number {
  if (k <= 0) return Math.max(a, b);
  const diff = b - a;
  // V2: hard max when |a-b| > k (strict, not >=)
  if (diff > k) return b;
  if (diff < -k) return a;
  const h = Math.max(0, Math.min(1, 0.5 + 0.5 * diff / k));
  return a + (b - a) * h + k * h * (1 - h);
}

/* ── Rotation helpers (Rodrigues' formula) ────────────────────────── */

export type Mat3 = [number, number, number, number, number, number, number, number, number];

export const IDENTITY_MAT3: Mat3 = [1,0,0, 0,1,0, 0,0,1];

/**
 * Build a rotation matrix that maps the Y axis [0,1,0] to `newYAxis`
 * and then applies a spin rotation around the new Y axis.
 */
export function buildRotationMatrix(
  newYAxis: { x?: number; y?: number; z?: number } | undefined,
  spinAngle: number,
): Mat3 {
  if (!newYAxis) return IDENTITY_MAT3;

  let nx = Number(newYAxis.x ?? 0);
  let ny = Number(newYAxis.y ?? 1);
  let nz = Number(newYAxis.z ?? 0);

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len < 1e-10) return IDENTITY_MAT3;
  nx /= len; ny /= len; nz /= len;

  const ax = -nz;
  const ay = 0;
  const az = nx;
  const axisLen = Math.sqrt(ax * ax + ay * ay + az * az);

  let r1: Mat3;
  if (axisLen < 1e-10) {
    if (ny > 0) {
      r1 = IDENTITY_MAT3;
    } else {
      r1 = [1,0,0, 0,-1,0, 0,0,-1];
    }
  } else {
    const kx = ax / axisLen;
    const ky = ay / axisLen;
    const kz = az / axisLen;
    const cosT = ny;
    const sinT = axisLen;
    r1 = rodriguesMatrix(kx, ky, kz, cosT, sinT);
  }

  if (Math.abs(spinAngle) < 1e-10) return r1;

  const cosS = Math.cos(spinAngle);
  const sinS = Math.sin(spinAngle);
  const r2 = rodriguesMatrix(nx, ny, nz, cosS, sinS);

  return mat3Multiply(r2, r1);
}

function rodriguesMatrix(
  kx: number, ky: number, kz: number,
  cosT: number, sinT: number,
): Mat3 {
  const oneMinusCos = 1.0 - cosT;
  return [
    cosT + kx * kx * oneMinusCos,         kx * ky * oneMinusCos - kz * sinT,   kx * kz * oneMinusCos + ky * sinT,
    ky * kx * oneMinusCos + kz * sinT,     cosT + ky * ky * oneMinusCos,         ky * kz * oneMinusCos - kx * sinT,
    kz * kx * oneMinusCos - ky * sinT,     kz * ky * oneMinusCos + kx * sinT,   cosT + kz * kz * oneMinusCos,
  ];
}

export function mat3Multiply(a: Mat3, b: Mat3): Mat3 {
  return [
    a[0]*b[0]+a[1]*b[3]+a[2]*b[6], a[0]*b[1]+a[1]*b[4]+a[2]*b[7], a[0]*b[2]+a[1]*b[5]+a[2]*b[8],
    a[3]*b[0]+a[4]*b[3]+a[5]*b[6], a[3]*b[1]+a[4]*b[4]+a[5]*b[7], a[3]*b[2]+a[4]*b[5]+a[5]*b[8],
    a[6]*b[0]+a[7]*b[3]+a[8]*b[6], a[6]*b[1]+a[7]*b[4]+a[8]*b[7], a[6]*b[2]+a[7]*b[5]+a[8]*b[8],
  ];
}

export function mat3Apply(m: Mat3, x: number, y: number, z: number): [number, number, number] {
  return [
    m[0] * x + m[1] * y + m[2] * z,
    m[3] * x + m[4] * y + m[5] * z,
    m[6] * x + m[7] * y + m[8] * z,
  ];
}
