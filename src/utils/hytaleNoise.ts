/**
 * Hytale-compatible simplex noise implementation.
 *
 * Matches the V2 Java runtime's noise generation pipeline:
 * - Java String.hashCode() for seed string → integer conversion
 * - Fixed 256-entry permutation table (V2 uses a hardcoded table, not seed-generated)
 * - Exact gradient vectors from the V2 decompiled source
 * - Standard simplex noise algorithm with correct skew/unskew factors
 *
 * Reference: WorldGenV2/docs/math/noise-functions.md
 */

/* ── Gradient vectors ─────────────────────────────────────────────── */

// 3D: 12 gradient directions (edges of a cube)
// 2D simplex noise uses these same vectors projected to 2D via (grad.x * x + grad.y * y)
const GRAD3: ReadonlyArray<readonly [number, number, number]> = [
  [ 1,  1,  0], [-1,  1,  0], [ 1, -1,  0], [-1, -1,  0],
  [ 1,  0,  1], [-1,  0,  1], [ 1,  0, -1], [-1,  0, -1],
  [ 0,  1,  1], [ 0, -1,  1], [ 0,  1, -1], [ 0, -1, -1],
];

/* ── Skew / unskew constants ──────────────────────────────────────── */

// 2D: F2 = (sqrt(3) - 1) / 2, G2 = (3 - sqrt(3)) / 6
const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

// 3D: F3 = 1/3, G3 = 1/6
const F3 = 1.0 / 3.0;
const G3 = 1.0 / 6.0;

/* ── Java-compatible string hash ──────────────────────────────────── */

/**
 * Java's String.hashCode() algorithm.
 * Produces the same integer hash as Java for ASCII strings.
 */
export function javaStringHashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (Math.imul(31, hash) + s.charCodeAt(i)) | 0;
  }
  return hash;
}

/**
 * Convert a seed (string or number) to a numeric value using Java-compatible hashing.
 */
export function seedToInt(seed: string | number | undefined): number {
  if (seed === undefined || seed === null) return 0;
  if (typeof seed === "number") return seed | 0;
  return javaStringHashCode(seed);
}

/* ── Seeded PRNG (mulberry32 — fast 32-bit) ───────────────────────── */

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Fixed permutation table ──────────────────────────────────────── */

/** V2 fixed permutation table (Simplex.java lines 63-320) */
const FIXED_PERM: readonly number[] = [
  151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,
  140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,
  247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,
  57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,
  74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,
  60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,
  65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,
  200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,
  52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,
  207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,
  119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,
  129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,
  218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,
  81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,
  184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,
  222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180,
];

/** Build 512-entry lookup from fixed V2 table (seed is ignored — V2 uses fixed perm) */
function buildPermutationTable(_seed: number): Uint8Array {
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) {
    perm[i] = FIXED_PERM[i];
    perm[i + 256] = FIXED_PERM[i];
  }
  return perm;
}

/* ── 2D Simplex Noise ─────────────────────────────────────────────── */

export function createHytaleNoise2D(seed: number): (x: number, y: number) => number {
  const perm = buildPermutationTable(seed);

  return function noise2D(x: number, y: number): number {
    // Step 1: Skew input to simplex cell coordinates
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    // Step 2: Unskew to find cell origin in input space
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);

    // Step 3: Determine which simplex (triangle)
    let i1: number, j1: number;
    if (x0 > y0) {
      i1 = 1; j1 = 0; // Upper triangle
    } else {
      i1 = 0; j1 = 1; // Lower triangle
    }

    // Step 4: Offsets for 2nd and 3rd corners
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    // Step 5: Hash gradient indices
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = perm[ii + perm[jj]] % 12;
    const gi1 = perm[ii + i1 + perm[jj + j1]] % 12;
    const gi2 = perm[ii + 1 + perm[jj + 1]] % 12;

    // Step 6: Corner contributions
    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * (GRAD3[gi0][0] * x0 + GRAD3[gi0][1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * (GRAD3[gi1][0] * x1 + GRAD3[gi1][1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * (GRAD3[gi2][0] * x2 + GRAD3[gi2][1] * y2);
    }

    // Step 7: Scale to approximately [-1, 1]
    return 70.0 * (n0 + n1 + n2);
  };
}

/* ── 3D Simplex Noise ─────────────────────────────────────────────── */

export function createHytaleNoise3D(seed: number): (x: number, y: number, z: number) => number {
  const perm = buildPermutationTable(seed);

  return function noise3D(x: number, y: number, z: number): number {
    // Step 1: Skew input to simplex cell coordinates
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);

    // Step 2: Unskew to find cell origin
    const t = (i + j + k) * G3;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const z0 = z - (k - t);

    // Step 3: Determine which simplex (tetrahedron) by sorting x0, y0, z0
    let i1: number, j1: number, k1: number;
    let i2: number, j2: number, k2: number;

    if (x0 >= y0) {
      if (y0 >= z0)      { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; } // XYZ
      else if (x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; } // XZY
      else               { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; } // ZXY
    } else {
      if (y0 < z0)       { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; } // ZYX
      else if (x0 < z0)  { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; } // YZX
      else               { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; } // YXZ
    }

    // Step 4: Offsets for remaining corners
    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2.0 * G3;
    const y2 = y0 - j2 + 2.0 * G3;
    const z2 = z0 - k2 + 2.0 * G3;
    const x3 = x0 - 1.0 + 3.0 * G3;
    const y3 = y0 - 1.0 + 3.0 * G3;
    const z3 = z0 - 1.0 + 3.0 * G3;

    // Step 5: Hash gradient indices
    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    const gi0 = perm[ii      + perm[jj      + perm[kk     ]]] % 12;
    const gi1 = perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] % 12;
    const gi2 = perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] % 12;
    const gi3 = perm[ii + 1  + perm[jj + 1  + perm[kk + 1 ]]] % 12;

    // Step 6: Corner contributions (kernel radius = 0.6 for 3D)
    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * (GRAD3[gi0][0] * x0 + GRAD3[gi0][1] * y0 + GRAD3[gi0][2] * z0);
    }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * (GRAD3[gi1][0] * x1 + GRAD3[gi1][1] * y1 + GRAD3[gi1][2] * z1);
    }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * (GRAD3[gi2][0] * x2 + GRAD3[gi2][1] * y2 + GRAD3[gi2][2] * z2);
    }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 >= 0) {
      t3 *= t3;
      n3 = t3 * t3 * (GRAD3[gi3][0] * x3 + GRAD3[gi3][1] * y3 + GRAD3[gi3][2] * z3);
    }

    // Step 7: Scale to approximately [-1, 1]
    return 32.0 * (n0 + n1 + n2 + n3);
  };
}

/* ── 2D Simplex Noise with analytic gradient ──────────────────────── */

/**
 * Returns both the noise value and its analytic gradient at (x, y).
 * Used by FastGradientWarp for efficient gradient-based warping.
 */
export function createHytaleNoise2DWithGradient(seed: number): (x: number, y: number) => { value: number; dx: number; dy: number } {
  const perm = buildPermutationTable(seed);

  return function noise2DGrad(x: number, y: number) {
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);

    let i1: number, j1: number;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else          { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = perm[ii + perm[jj]] % 12;
    const gi1 = perm[ii + i1 + perm[jj + j1]] % 12;
    const gi2 = perm[ii + 1 + perm[jj + 1]] % 12;

    let value = 0;
    let gdx = 0;
    let gdy = 0;

    // Corner 0
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      const g0x = GRAD3[gi0][0], g0y = GRAD3[gi0][1];
      const dot0 = g0x * x0 + g0y * y0;
      const t02 = t0 * t0;
      const t04 = t02 * t02;
      value += t04 * dot0;
      // Derivative: t^4 * grad + 4 * t^3 * dt/dp * dot
      // dt/dp = -2 * offset
      const dt0dx = -2.0 * x0;
      const dt0dy = -2.0 * y0;
      gdx += t04 * g0x + 4.0 * t02 * t0 * dt0dx * dot0;
      gdy += t04 * g0y + 4.0 * t02 * t0 * dt0dy * dot0;
    }

    // Corner 1
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      const g1x = GRAD3[gi1][0], g1y = GRAD3[gi1][1];
      const dot1 = g1x * x1 + g1y * y1;
      const t12 = t1 * t1;
      const t14 = t12 * t12;
      value += t14 * dot1;
      const dt1dx = -2.0 * x1;
      const dt1dy = -2.0 * y1;
      gdx += t14 * g1x + 4.0 * t12 * t1 * dt1dx * dot1;
      gdy += t14 * g1y + 4.0 * t12 * t1 * dt1dy * dot1;
    }

    // Corner 2
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      const g2x = GRAD3[gi2][0], g2y = GRAD3[gi2][1];
      const dot2 = g2x * x2 + g2y * y2;
      const t22 = t2 * t2;
      const t24 = t22 * t22;
      value += t24 * dot2;
      const dt2dx = -2.0 * x2;
      const dt2dy = -2.0 * y2;
      gdx += t24 * g2x + 4.0 * t22 * t2 * dt2dx * dot2;
      gdy += t24 * g2y + 4.0 * t22 * t2 * dt2dy * dot2;
    }

    return {
      value: 70.0 * value,
      dx: 70.0 * gdx,
      dy: 70.0 * gdy,
    };
  };
}

/* ── 3D Simplex Noise with analytic gradient ──────────────────────── */

export function createHytaleNoise3DWithGradient(seed: number): (x: number, y: number, z: number) => { value: number; dx: number; dy: number; dz: number } {
  const perm = buildPermutationTable(seed);

  return function noise3DGrad(x: number, y: number, z: number) {
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    const t = (i + j + k) * G3;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const z0 = z - (k - t);

    let i1: number, j1: number, k1: number;
    let i2: number, j2: number, k2: number;

    if (x0 >= y0) {
      if (y0 >= z0)      { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
      else if (x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
      else               { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
    } else {
      if (y0 < z0)       { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
      else if (x0 < z0)  { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
      else               { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
    }

    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2.0 * G3;
    const y2 = y0 - j2 + 2.0 * G3;
    const z2 = z0 - k2 + 2.0 * G3;
    const x3 = x0 - 1.0 + 3.0 * G3;
    const y3 = y0 - 1.0 + 3.0 * G3;
    const z3 = z0 - 1.0 + 3.0 * G3;

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    const gi0 = perm[ii      + perm[jj      + perm[kk     ]]] % 12;
    const gi1 = perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] % 12;
    const gi2 = perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] % 12;
    const gi3 = perm[ii + 1  + perm[jj + 1  + perm[kk + 1 ]]] % 12;

    let value = 0;
    let gdx = 0, gdy = 0, gdz = 0;

    // Helper: compute contribution + gradient for a corner
    function corner(
      gx: number, gy: number, gz: number,
      ox: number, oy: number, oz: number,
    ) {
      let tc = 0.6 - ox * ox - oy * oy - oz * oz;
      if (tc >= 0) {
        const dot = gx * ox + gy * oy + gz * oz;
        const tc2 = tc * tc;
        const tc4 = tc2 * tc2;
        value += tc4 * dot;
        const dtdx = -2.0 * ox;
        const dtdy = -2.0 * oy;
        const dtdz = -2.0 * oz;
        gdx += tc4 * gx + 4.0 * tc2 * tc * dtdx * dot;
        gdy += tc4 * gy + 4.0 * tc2 * tc * dtdy * dot;
        gdz += tc4 * gz + 4.0 * tc2 * tc * dtdz * dot;
      }
    }

    corner(GRAD3[gi0][0], GRAD3[gi0][1], GRAD3[gi0][2], x0, y0, z0);
    corner(GRAD3[gi1][0], GRAD3[gi1][1], GRAD3[gi1][2], x1, y1, z1);
    corner(GRAD3[gi2][0], GRAD3[gi2][1], GRAD3[gi2][2], x2, y2, z2);
    corner(GRAD3[gi3][0], GRAD3[gi3][1], GRAD3[gi3][2], x3, y3, z3);

    return {
      value: 32.0 * value,
      dx: 32.0 * gdx,
      dy: 32.0 * gdy,
      dz: 32.0 * gdz,
    };
  };
}
