/**
 * Port of FastNoiseLite's DomainWarpFractalProgressive for 2D and 3D.
 *
 * Key features matching V2:
 * - BCC lattice rotation (DefaultOpenSimplex2 transform)
 * - Progressive warping: each octave warps already-warped coordinates
 * - fractalBounding amplitude normalization
 * - Per-octave seed increment
 * - OpenSimplex2 gradient-based displacement
 */

import { RandVecs2D, randVecs3D } from "./voronoiNoise";

// ── FNL constants ──

const PRIME_X = 501125321;
const PRIME_Y = 1136930381;
const PRIME_Z = 1720413743;
const HASH_MUL = 668265261;

function fnlHash2(seed: number, xP: number, yP: number): number {
  return Math.imul(seed ^ xP ^ yP, HASH_MUL);
}

function fnlHash3(seed: number, xP: number, yP: number, zP: number): number {
  return Math.imul(seed ^ xP ^ yP ^ zP, HASH_MUL);
}

function fastFloor(x: number): number {
  const xi = x | 0;
  return x < xi ? xi - 1 : xi;
}

function fastRound(x: number): number {
  return x >= 0 ? (x + 0.5) | 0 : (x - 0.5) | 0;
}

// ── Gradients2D for 2D simplex warp (256 floats = 128 pairs, indexed as hash & 254) ──

// prettier-ignore
const Gradients2D = new Float32Array([
  0.13052619,0.9914449,0.38268343,0.9238795,0.6087614,0.7933533,0.7933533,0.6087614,
  0.9238795,0.38268343,0.9914449,0.13052619,0.9914449,-0.13052619,0.9238795,-0.38268343,
  0.7933533,-0.6087614,0.6087614,-0.7933533,0.38268343,-0.9238795,0.13052619,-0.9914449,
  -0.13052619,-0.9914449,-0.38268343,-0.9238795,-0.6087614,-0.7933533,-0.7933533,-0.6087614,
  -0.9238795,-0.38268343,-0.9914449,-0.13052619,-0.9914449,0.13052619,-0.9238795,0.38268343,
  -0.7933533,0.6087614,-0.6087614,0.7933533,-0.38268343,0.9238795,-0.13052619,0.9914449,
  0.13052619,0.9914449,0.38268343,0.9238795,0.6087614,0.7933533,0.7933533,0.6087614,
  0.9238795,0.38268343,0.9914449,0.13052619,0.9914449,-0.13052619,0.9238795,-0.38268343,
  0.7933533,-0.6087614,0.6087614,-0.7933533,0.38268343,-0.9238795,0.13052619,-0.9914449,
  -0.13052619,-0.9914449,-0.38268343,-0.9238795,-0.6087614,-0.7933533,-0.7933533,-0.6087614,
  -0.9238795,-0.38268343,-0.9914449,-0.13052619,-0.9914449,0.13052619,-0.9238795,0.38268343,
  -0.7933533,0.6087614,-0.6087614,0.7933533,-0.38268343,0.9238795,-0.13052619,0.9914449,
  0.13052619,0.9914449,0.38268343,0.9238795,0.6087614,0.7933533,0.7933533,0.6087614,
  0.9238795,0.38268343,0.9914449,0.13052619,0.9914449,-0.13052619,0.9238795,-0.38268343,
  0.7933533,-0.6087614,0.6087614,-0.7933533,0.38268343,-0.9238795,0.13052619,-0.9914449,
  -0.13052619,-0.9914449,-0.38268343,-0.9238795,-0.6087614,-0.7933533,-0.7933533,-0.6087614,
  -0.9238795,-0.38268343,-0.9914449,-0.13052619,-0.9914449,0.13052619,-0.9238795,0.38268343,
  -0.7933533,0.6087614,-0.6087614,0.7933533,-0.38268343,0.9238795,-0.13052619,0.9914449,
  0.13052619,0.9914449,0.38268343,0.9238795,0.6087614,0.7933533,0.7933533,0.6087614,
  0.9238795,0.38268343,0.9914449,0.13052619,0.9914449,-0.13052619,0.9238795,-0.38268343,
  0.7933533,-0.6087614,0.6087614,-0.7933533,0.38268343,-0.9238795,0.13052619,-0.9914449,
  -0.13052619,-0.9914449,-0.38268343,-0.9238795,-0.6087614,-0.7933533,-0.7933533,-0.6087614,
  -0.9238795,-0.38268343,-0.9914449,-0.13052619,-0.9914449,0.13052619,-0.9238795,0.38268343,
  -0.7933533,0.6087614,-0.6087614,0.7933533,-0.38268343,0.9238795,-0.13052619,0.9914449,
  0.13052619,0.9914449,0.38268343,0.9238795,0.6087614,0.7933533,0.7933533,0.6087614,
  0.9238795,0.38268343,0.9914449,0.13052619,0.9914449,-0.13052619,0.9238795,-0.38268343,
  0.7933533,-0.6087614,0.6087614,-0.7933533,0.38268343,-0.9238795,0.13052619,-0.9914449,
  -0.13052619,-0.9914449,-0.38268343,-0.9238795,-0.6087614,-0.7933533,-0.7933533,-0.6087614,
  -0.9238795,-0.38268343,-0.9914449,-0.13052619,-0.9914449,0.13052619,-0.9238795,0.38268343,
  -0.7933533,0.6087614,-0.6087614,0.7933533,-0.38268343,0.9238795,-0.13052619,0.9914449,
  0.38268343,0.9238795,0.9238795,0.38268343,0.9238795,-0.38268343,0.38268343,-0.9238795,
  -0.38268343,-0.9238795,-0.9238795,-0.38268343,-0.9238795,0.38268343,-0.38268343,0.9238795,
]);

// ── Gradients3D (256 floats = 64 4-component vectors, indexed as hash & 252) ──
// Repeating pattern of 16 cube-edge midpoints (4 components each, 4th = padding)

// prettier-ignore
const Gradients3D = new Float32Array([
  0,1,1,0, 0,-1,1,0, 0,1,-1,0, 0,-1,-1,0,
  1,0,1,0, -1,0,1,0, 1,0,-1,0, -1,0,-1,0,
  1,1,0,0, -1,1,0,0, 1,-1,0,0, -1,-1,0,0,
  0,0,1,1, 0,0,-1,1, 0,0,1,-1, 0,0,-1,-1,
  0,1,1,0, 0,-1,1,0, 0,1,-1,0, 0,-1,-1,0,
  1,0,1,0, -1,0,1,0, 1,0,-1,0, -1,0,-1,0,
  1,1,0,0, -1,1,0,0, 1,-1,0,0, -1,-1,0,0,
  0,0,1,1, 0,0,-1,1, 0,0,1,-1, 0,0,-1,-1,
  0,1,1,0, 0,-1,1,0, 0,1,-1,0, 0,-1,-1,0,
  1,0,1,0, -1,0,1,0, 1,0,-1,0, -1,0,-1,0,
  1,1,0,0, -1,1,0,0, 1,-1,0,0, -1,-1,0,0,
  0,0,1,1, 0,0,-1,1, 0,0,1,-1, 0,0,-1,-1,
  0,1,1,0, 0,-1,1,0, 0,1,-1,0, 0,-1,-1,0,
  1,0,1,0, -1,0,1,0, 1,0,-1,0, -1,0,-1,0,
  1,1,0,0, -1,1,0,0, 1,-1,0,0, -1,-1,0,0,
  0,0,1,1, 0,0,-1,1, 0,0,1,-1, 0,0,-1,-1,
]);

// ── Compute fractalBounding ──

function calcFractalBounding(octaves: number, gain: number): number {
  const g = Math.abs(gain);
  let amp = g;
  let ampFractal = 1.0;
  for (let i = 1; i < octaves; i++) {
    ampFractal += amp;
    amp *= g;
  }
  return 1.0 / ampFractal;
}

// ── 2D Domain Warp ──

function singleDomainWarpSimplexGradient2D(
  seed: number, warpAmp: number, freq: number,
  x: number, y: number,
  cx: number, cy: number,
): { x: number; y: number } {
  const G2 = 0.21132487;
  x *= freq;
  y *= freq;
  const i = fastFloor(x);
  const j = fastFloor(y);
  const xi = x - i;
  const yi = y - j;
  const t = (xi + yi) * G2;
  const x0 = xi - t;
  const y0 = yi - t;
  const ip = Math.imul(i, PRIME_X);
  const jp = Math.imul(j, PRIME_Y);
  let vx = 0, vy = 0;

  const a = 0.5 - x0 * x0 - y0 * y0;
  if (a > 0) {
    const aaaa = a * a * (a * a);
    const hash = fnlHash2(seed, ip, jp);
    const idx1 = hash & 254;
    const idx2 = (hash >> 7) & 510;
    const value = x0 * Gradients2D[idx1] + y0 * Gradients2D[idx1 | 1];
    vx += aaaa * value * RandVecs2D[idx2];
    vy += aaaa * value * RandVecs2D[idx2 | 1];
  }

  const c = 3.1547005 * t + (-0.6666666 + a);
  if (c > 0) {
    const x2 = x0 - 0.57735026;
    const y2 = y0 - 0.57735026;
    const cccc = c * c * (c * c);
    const hash = fnlHash2(seed, (ip + PRIME_X) | 0, (jp + PRIME_Y) | 0);
    const idx1 = hash & 254;
    const idx2 = (hash >> 7) & 510;
    const value = x2 * Gradients2D[idx1] + y2 * Gradients2D[idx1 | 1];
    vx += cccc * value * RandVecs2D[idx2];
    vy += cccc * value * RandVecs2D[idx2 | 1];
  }

  if (y0 > x0) {
    const x1 = x0 + 0.21132487;
    const y1 = y0 - 0.7886751;
    const b = 0.5 - x1 * x1 - y1 * y1;
    if (b > 0) {
      const bbbb = b * b * (b * b);
      const hash = fnlHash2(seed, ip, (jp + PRIME_Y) | 0);
      const idx1 = hash & 254;
      const idx2 = (hash >> 7) & 510;
      const value = x1 * Gradients2D[idx1] + y1 * Gradients2D[idx1 | 1];
      vx += bbbb * value * RandVecs2D[idx2];
      vy += bbbb * value * RandVecs2D[idx2 | 1];
    }
  } else {
    const x1 = x0 - 0.7886751;
    const y1 = y0 + 0.21132487;
    const b = 0.5 - x1 * x1 - y1 * y1;
    if (b > 0) {
      const bbbb = b * b * (b * b);
      const hash = fnlHash2(seed, (ip + PRIME_X) | 0, jp);
      const idx1 = hash & 254;
      const idx2 = (hash >> 7) & 510;
      const value = x1 * Gradients2D[idx1] + y1 * Gradients2D[idx1 | 1];
      vx += bbbb * value * RandVecs2D[idx2];
      vy += bbbb * value * RandVecs2D[idx2 | 1];
    }
  }

  return { x: cx + vx * warpAmp, y: cy + vy * warpAmp };
}

// ── 3D Domain Warp ──

function singleDomainWarpOpenSimplex2Gradient3D(
  seed: number, warpAmp: number, freq: number,
  xs: number, ys: number, zs: number,
  cx: number, cy: number, cz: number,
): { x: number; y: number; z: number } {
  xs *= freq;
  ys *= freq;
  zs *= freq;
  const i = fastRound(xs);
  const j = fastRound(ys);
  const k = fastRound(zs);
  let x0 = xs - i;
  let y0 = ys - j;
  let z0 = zs - k;
  let xNSign = (-x0 - 1.0) | 1;
  let yNSign = (-y0 - 1.0) | 1;
  let zNSign = (-z0 - 1.0) | 1;
  let ax0 = xNSign * -x0;
  let ay0 = yNSign * -y0;
  let az0 = zNSign * -z0;
  let ip = Math.imul(i, PRIME_X);
  let jp = Math.imul(j, PRIME_Y);
  let kp = Math.imul(k, PRIME_Z);
  let vx = 0, vy = 0, vz = 0;
  let s = seed;

  for (let l = 0; ; l++) {
    let a = 0.6 - x0 * x0 - (y0 * y0 + z0 * z0);
    if (a > 0) {
      const aaaa = a * a * (a * a);
      const hash = fnlHash3(s, ip, jp, kp);
      const idx1 = hash & 252;
      const idx2 = (hash >> 6) & 1020;
      const value = x0 * Gradients3D[idx1] + y0 * Gradients3D[idx1 | 1] + z0 * Gradients3D[idx1 | 2];
      vx += aaaa * value * randVecs3D[idx2];
      vy += aaaa * value * randVecs3D[idx2 | 1];
      vz += aaaa * value * randVecs3D[idx2 | 2];
    }

    let i1 = ip, j1 = jp, k1 = kp;
    let x1 = x0, y1 = y0, z1 = z0;
    let b: number;
    if (ax0 >= ay0 && ax0 >= az0) {
      x1 = x0 + xNSign;
      b = a + ax0 + ax0;
      i1 = (ip - Math.imul(xNSign, PRIME_X)) | 0;
    } else if (ay0 > ax0 && ay0 >= az0) {
      y1 = y0 + yNSign;
      b = a + ay0 + ay0;
      j1 = (jp - Math.imul(yNSign, PRIME_Y)) | 0;
    } else {
      z1 = z0 + zNSign;
      b = a + az0 + az0;
      k1 = (kp - Math.imul(zNSign, PRIME_Z)) | 0;
    }

    if (b > 1.0) {
      b -= 1.0;
      const bbbb = b * b * (b * b);
      const hash = fnlHash3(s, i1, j1, k1);
      const idx1 = hash & 252;
      const idx2 = (hash >> 6) & 1020;
      const value = x1 * Gradients3D[idx1] + y1 * Gradients3D[idx1 | 1] + z1 * Gradients3D[idx1 | 2];
      vx += bbbb * value * randVecs3D[idx2];
      vy += bbbb * value * randVecs3D[idx2 | 1];
      vz += bbbb * value * randVecs3D[idx2 | 2];
    }

    if (l === 1) break;

    ax0 = 0.5 - ax0;
    ay0 = 0.5 - ay0;
    az0 = 0.5 - az0;
    x0 = xNSign * ax0;
    y0 = yNSign * ay0;
    z0 = zNSign * az0;
    a += 0.75 - ax0 - (ay0 + az0);
    ip = (ip + ((xNSign >> 1) & PRIME_X)) | 0;
    jp = (jp + ((yNSign >> 1) & PRIME_Y)) | 0;
    kp = (kp + ((zNSign >> 1) & PRIME_Z)) | 0;
    xNSign = -xNSign;
    yNSign = -yNSign;
    zNSign = -zNSign;
    s = (s + 1293373) | 0;
  }

  return {
    x: cx + vx * warpAmp,
    y: cy + vy * warpAmp,
    z: cz + vz * warpAmp,
  };
}

// ── Public API ──

const WARP_AMP_3D = 32.694283;
const WARP_AMP_2D = 38.283688;
const F2 = 0.3660254037844386;
const R3 = 2.0 / 3.0;

export function domainWarpProgressive2D(
  seed: number, warpAmp: number, warpFreq: number,
  octaves: number, lacunarity: number, gain: number,
  x: number, z: number,
): { x: number; y: number } {
  const fractalBounding = calcFractalBounding(octaves, gain);
  let amp = warpAmp * fractalBounding;
  let freq = warpFreq;
  let s = seed | 0;
  let cx = x, cy = z;

  for (let i = 0; i < octaves; i++) {
    // OpenSimplex2 2D skew transform
    const t = (cx + cy) * F2;
    const xs = cx + t;
    const ys = cy + t;

    const w = singleDomainWarpSimplexGradient2D(s, amp * WARP_AMP_2D, freq, xs, ys, cx, cy);
    cx = w.x;
    cy = w.y;

    s = (s + 1) | 0;
    amp *= gain;
    freq *= lacunarity;
  }

  return { x: cx, y: cy };
}

export function domainWarpProgressive3D(
  seed: number, warpAmp: number, warpFreq: number,
  octaves: number, lacunarity: number, gain: number,
  x: number, y: number, z: number,
): { x: number; y: number; z: number } {
  const fractalBounding = calcFractalBounding(octaves, gain);
  let amp = warpAmp * fractalBounding;
  let freq = warpFreq;
  let s = seed | 0;
  let cx = x, cy = y, cz = z;

  for (let i = 0; i < octaves; i++) {
    // BCC lattice rotation (DefaultOpenSimplex2 transform)
    const r = (cx + cy + cz) * R3;
    const xs = r - cx;
    const ys = r - cy;
    const zs = r - cz;

    const w = singleDomainWarpOpenSimplex2Gradient3D(s, amp * WARP_AMP_3D, freq, xs, ys, zs, cx, cy, cz);
    cx = w.x;
    cy = w.y;
    cz = w.z;

    s = (s + 1) | 0;
    amp *= gain;
    freq *= lacunarity;
  }

  return { x: cx, y: cy, z: cz };
}
