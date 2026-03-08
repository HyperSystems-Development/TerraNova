import { seedToInt } from "../hytaleNoise";

export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(seed: number | string | undefined): number {
  return seedToInt(seed);
}

/* ── V2 Rng: Squirrel noise integer hash ─────────────────────────── */

const BIT_NOISE_0 = 1759714724;
const BIT_NOISE_1 = -1255572915; // 0xB5297A4D as signed int32
const BIT_NOISE_2 = 458671337;
const PRIME_0 = 198491317;
const PRIME_1 = 6542989;

/** V2 Rng.getRandomInt(seed, key) — squirrel noise hash */
export function squirrelHash(seed: number, key: number): number {
  let bits = Math.imul(key, BIT_NOISE_0);
  bits = (bits + seed) | 0;
  bits ^= bits >>> 8;
  bits = (bits - BIT_NOISE_1) | 0;
  bits ^= bits << 8;
  bits = Math.imul(bits, BIT_NOISE_2);
  return bits ^ (bits >>> 8);
}

/** V2 Rng.mix(seed, a, b) — 2D spatial hash */
export function squirrelMix2(seed: number, a: number, b: number): number {
  return squirrelHash(seed, (a + Math.imul(PRIME_0, b)) | 0);
}

/** V2 Rng.mix(seed, a, b, c) — 3D spatial hash */
export function squirrelMix3(seed: number, a: number, b: number, c: number): number {
  return squirrelHash(seed, (a + Math.imul(PRIME_0, b) + Math.imul(PRIME_1, c)) | 0);
}

/** Convert squirrel hash output to [0, 1) float */
export function squirrelFloat(seed: number, key: number): number {
  return (squirrelHash(seed, key) >>> 0) / 4294967296;
}
