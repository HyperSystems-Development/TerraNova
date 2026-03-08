import { mulberry32 } from "./prng";

/** Generate per-octave offsets from a seed (V2: Random(seed).nextDouble() * 256) */
function generateOffsets(seed: number, octaves: number, dims: number): number[][] {
  const rng = mulberry32(seed);
  const offsets: number[][] = [];
  for (let i = 0; i < octaves; i++) {
    const o: number[] = [];
    for (let d = 0; d < dims; d++) {
      o.push(rng() * 256.0);
    }
    offsets.push(o);
  }
  return offsets;
}

export function fbm2D(
  noise: (x: number, y: number) => number,
  x: number, z: number,
  freq: number, octaves: number, lacunarity: number, gain: number,
  seed?: number,
): number {
  const offsets = seed !== undefined ? generateOffsets(seed, octaves, 2) : null;
  let sum = 0;
  let amp = 1;
  let ampSum = 0;
  let f = freq;
  for (let i = 0; i < octaves; i++) {
    const ox = offsets ? offsets[i][0] : 0;
    const oz = offsets ? offsets[i][1] : 0;
    sum += noise((x + ox) * f, (z + oz) * f) * amp;
    ampSum += amp;
    f *= lacunarity;
    amp *= gain;
  }
  return ampSum > 0 ? sum / ampSum : sum;
}

export function fbm3D(
  noise: (x: number, y: number, z: number) => number,
  x: number, y: number, z: number,
  freq: number, octaves: number, lacunarity: number, gain: number,
  seed?: number,
): number {
  const offsets = seed !== undefined ? generateOffsets(seed, octaves, 3) : null;
  let sum = 0;
  let amp = 1;
  let ampSum = 0;
  let f = freq;
  for (let i = 0; i < octaves; i++) {
    const ox = offsets ? offsets[i][0] : 0;
    const oy = offsets ? offsets[i][1] : 0;
    const oz = offsets ? offsets[i][2] : 0;
    sum += noise((x + ox) * f, (y + oy) * f, (z + oz) * f) * amp;
    ampSum += amp;
    f *= lacunarity;
    amp *= gain;
  }
  return ampSum > 0 ? sum / ampSum : sum;
}

export function ridgeFbm2D(
  noise: (x: number, y: number) => number,
  x: number, z: number,
  freq: number, octaves: number,
  seed?: number,
): number {
  const offsets = seed !== undefined ? generateOffsets(seed, octaves, 2) : null;
  let sum = 0;
  let amp = 1;
  let ampSum = 0;
  let f = freq;
  for (let i = 0; i < octaves; i++) {
    const ox = offsets ? offsets[i][0] : 0;
    const oz = offsets ? offsets[i][1] : 0;
    const n = 1 - Math.abs(noise((x + ox) * f, (z + oz) * f));
    sum += n * n * amp;
    ampSum += amp;
    f *= 2;
    amp *= 0.5;
  }
  return ampSum > 0 ? (sum / ampSum) * 2 - 1 : sum * 2 - 1;
}

export function ridgeFbm3D(
  noise: (x: number, y: number, z: number) => number,
  x: number, y: number, z: number,
  freq: number, octaves: number,
  seed?: number,
): number {
  const offsets = seed !== undefined ? generateOffsets(seed, octaves, 3) : null;
  let sum = 0;
  let amp = 1;
  let ampSum = 0;
  let f = freq;
  for (let i = 0; i < octaves; i++) {
    const ox = offsets ? offsets[i][0] : 0;
    const oy = offsets ? offsets[i][1] : 0;
    const oz = offsets ? offsets[i][2] : 0;
    const n = 1 - Math.abs(noise((x + ox) * f, (y + oy) * f, (z + oz) * f));
    sum += n * n * amp;
    ampSum += amp;
    f *= 2;
    amp *= 0.5;
  }
  return ampSum > 0 ? (sum / ampSum) * 2 - 1 : sum * 2 - 1;
}
