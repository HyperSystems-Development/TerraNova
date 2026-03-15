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

/**
 * 2D Fractional Brownian Motion matching V2's SimplexNoiseField.valueAt(x, y).
 *
 * V2 order: divide by scale ONCE before the loop, add per-octave offsets to
 * the already-scaled coordinates, then multiply by per-octave frequency.
 */
export function fbm2D(
  noise: (x: number, y: number) => number,
  x: number, z: number,
  scaleX: number, scaleZ: number,
  octaves: number, lacunarity: number, gain: number,
  seed?: number,
): number {
  const offsets = seed !== undefined ? generateOffsets(seed, octaves, 2) : null;
  // V2: divide by scale ONCE before the loop
  const sx = scaleX !== 0 ? x / scaleX : x;
  const sz = scaleZ !== 0 ? z / scaleZ : z;
  let sum = 0;
  let amp = 1;
  let ampSum = 0;
  let f = 1; // octave frequency starts at 1.0, multiplied by lacunarity each octave
  for (let i = 0; i < octaves; i++) {
    const ox = offsets ? offsets[i][0] : 0;
    const oz = offsets ? offsets[i][1] : 0;
    // V2: offset added to already-scaled coords, then multiplied by octave frequency
    sum += noise((sx + ox) * f, (sz + oz) * f) * amp;
    ampSum += amp;
    f *= lacunarity;
    amp *= gain;
  }
  return ampSum > 0 ? sum / ampSum : sum;
}

/**
 * 3D FBM with separate ScaleXZ and ScaleY, matching V2's
 * SimplexNoise3DDensityAsset which uses .withScale(scaleXZ, scaleY, scaleXZ, scaleXZ).
 */
export function fbm3D(
  noise: (x: number, y: number, z: number) => number,
  x: number, y: number, z: number,
  scaleXZ: number, scaleY: number,
  octaves: number, lacunarity: number, gain: number,
  seed?: number,
): number {
  const offsets = seed !== undefined ? generateOffsets(seed, octaves, 3) : null;
  const sx = scaleXZ !== 0 ? x / scaleXZ : x;
  const sy = scaleY !== 0 ? y / scaleY : y;
  const sz = scaleXZ !== 0 ? z / scaleXZ : z;
  let sum = 0;
  let amp = 1;
  let ampSum = 0;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    const ox = offsets ? offsets[i][0] : 0;
    const oy = offsets ? offsets[i][1] : 0;
    const oz = offsets ? offsets[i][2] : 0;
    sum += noise((sx + ox) * f, (sy + oy) * f, (sz + oz) * f) * amp;
    ampSum += amp;
    f *= lacunarity;
    amp *= gain;
  }
  return ampSum > 0 ? sum / ampSum : sum;
}

/**
 * 2D Ridge FBM matching V2's FastNoiseLite GenFractalRidged.
 * Uses linear transform: 1 - 2*|n| (not (1-|n|)^2).
 * Applies fractalBounding normalization.
 */
export function ridgeFbm2D(
  noise: (x: number, y: number) => number,
  x: number, z: number,
  scaleX: number, scaleZ: number,
  octaves: number, lacunarity: number, gain: number,
  seed?: number,
): number {
  const offsets = seed !== undefined ? generateOffsets(seed, octaves, 2) : null;
  const sx = scaleX !== 0 ? x / scaleX : x;
  const sz = scaleZ !== 0 ? z / scaleZ : z;
  // V2 fractalBounding: 1 / (1 + |gain| + |gain|^2 + ...)
  let boundAmp = Math.abs(gain);
  let ampFractal = 1.0;
  for (let i = 1; i < octaves; i++) { ampFractal += boundAmp; boundAmp *= Math.abs(gain); }
  const fractalBounding = 1.0 / ampFractal;

  let sum = 0;
  let amp = fractalBounding;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    const ox = offsets ? offsets[i][0] : 0;
    const oz = offsets ? offsets[i][1] : 0;
    const n = Math.abs(noise((sx + ox) * f, (sz + oz) * f));
    // V2: linear transform: 1 - 2*|n|, not (1-|n|)^2
    sum += (n * -2.0 + 1.0) * amp;
    amp *= gain;
    f *= lacunarity;
  }
  return sum;
}

/**
 * 3D Ridge FBM with anisotropic scaling.
 */
export function ridgeFbm3D(
  noise: (x: number, y: number, z: number) => number,
  x: number, y: number, z: number,
  scaleXZ: number, scaleY: number,
  octaves: number, lacunarity: number, gain: number,
  seed?: number,
): number {
  const offsets = seed !== undefined ? generateOffsets(seed, octaves, 3) : null;
  const sx = scaleXZ !== 0 ? x / scaleXZ : x;
  const sy = scaleY !== 0 ? y / scaleY : y;
  const sz = scaleXZ !== 0 ? z / scaleXZ : z;
  let boundAmp = Math.abs(gain);
  let ampFractal = 1.0;
  for (let i = 1; i < octaves; i++) { ampFractal += boundAmp; boundAmp *= Math.abs(gain); }
  const fractalBounding = 1.0 / ampFractal;

  let sum = 0;
  let amp = fractalBounding;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    const ox = offsets ? offsets[i][0] : 0;
    const oy = offsets ? offsets[i][1] : 0;
    const oz = offsets ? offsets[i][2] : 0;
    const n = Math.abs(noise((sx + ox) * f, (sy + oy) * f, (sz + oz) * f));
    sum += (n * -2.0 + 1.0) * amp;
    amp *= gain;
    f *= lacunarity;
  }
  return sum;
}
