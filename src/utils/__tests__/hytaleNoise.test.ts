import { describe, it, expect } from "vitest";
import { createHytaleNoise2D, createHytaleNoise3D, createHytaleNoise3DWithGradient } from "../hytaleNoise";

/* ── Helpers ───────────────────────────────────────────────────────── */

/**
 * Sample noise over a grid and return { min, max } of all values.
 * A correct scale factor keeps output within approximately [-1, 1].
 */
function sampleRange3D(
  noiseFn: (x: number, y: number, z: number) => number,
  steps: number,
  extent: number,
): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  const delta = (2 * extent) / steps;
  for (let xi = 0; xi <= steps; xi++) {
    for (let yi = 0; yi <= steps; yi++) {
      for (let zi = 0; zi <= steps; zi++) {
        const v = noiseFn(
          -extent + xi * delta,
          -extent + yi * delta,
          -extent + zi * delta,
        );
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
  }
  return { min, max };
}

function sampleRange2D(
  noiseFn: (x: number, y: number) => number,
  steps: number,
  extent: number,
): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  const delta = (2 * extent) / steps;
  for (let xi = 0; xi <= steps; xi++) {
    for (let yi = 0; yi <= steps; yi++) {
      const v = noiseFn(-extent + xi * delta, -extent + yi * delta);
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return { min, max };
}

/* ── Tests ─────────────────────────────────────────────────────────── */

describe("hytaleNoise", () => {
  describe("createHytaleNoise3D scale factor", () => {
    it("should produce output within [-1, 1] (scale factor = 32.0)", () => {
      const noise = createHytaleNoise3D(42);
      // Sample a large grid to stress-test the amplitude
      const { min, max } = sampleRange3D(noise, 30, 50);

      // With the correct scale factor of 32.0, all values must be in [-1, 1].
      // A wrong factor (e.g. 28.0) could produce values outside this range,
      // or conversely under-scale, but the key invariant is bounded output.
      expect(min).toBeGreaterThanOrEqual(-1.0);
      expect(max).toBeLessThanOrEqual(1.0);
    });

    it("should have non-trivial amplitude (not collapsed near zero)", () => {
      const noise = createHytaleNoise3D(42);
      const { min, max } = sampleRange3D(noise, 30, 50);

      // If the scale factor were too small, amplitude would be well under 0.5.
      // With 32.0 we expect the range to span a meaningful portion of [-1, 1].
      const span = max - min;
      expect(span).toBeGreaterThan(0.5);
    });

    it("should be deterministic for the same seed", () => {
      const noise1 = createHytaleNoise3D(123);
      const noise2 = createHytaleNoise3D(123);
      for (let i = 0; i < 20; i++) {
        const x = i * 1.7, y = i * 2.3, z = i * 0.9;
        expect(noise1(x, y, z)).toBe(noise2(x, y, z));
      }
    });

  });

  describe("createHytaleNoise3DWithGradient", () => {
    it("value channel should match createHytaleNoise3D (same scale factor)", () => {
      const noise = createHytaleNoise3D(42);
      const noiseGrad = createHytaleNoise3DWithGradient(42);
      for (let i = 0; i < 20; i++) {
        const x = i * 1.7, y = i * 2.3, z = i * 0.9;
        const v = noise(x, y, z);
        const g = noiseGrad(x, y, z);
        expect(g.value).toBeCloseTo(v, 10);
      }
    });

    it("gradient values should be bounded", () => {
      const noiseGrad = createHytaleNoise3DWithGradient(42);
      for (let i = 0; i < 100; i++) {
        const x = i * 0.73, y = i * 1.1, z = i * 0.5;
        const g = noiseGrad(x, y, z);
        // Gradients should not explode to unreasonable values
        expect(Math.abs(g.dx)).toBeLessThan(20);
        expect(Math.abs(g.dy)).toBeLessThan(20);
        expect(Math.abs(g.dz)).toBeLessThan(20);
      }
    });
  });

  describe("createHytaleNoise2D scale factor", () => {
    it("should produce output within [-1, 1] (scale factor = 70.0)", () => {
      const noise = createHytaleNoise2D(42);
      const { min, max } = sampleRange2D(noise, 100, 50);

      expect(min).toBeGreaterThanOrEqual(-1.0);
      expect(max).toBeLessThanOrEqual(1.0);
    });
  });

  describe("Simplex noise uses V2 fixed permutation table", () => {
    it("same coordinates produce identical output regardless of seed", () => {
      const noise1 = createHytaleNoise2D(42);
      const noise2 = createHytaleNoise2D(99);
      // With fixed perm table, different seeds produce same base noise
      expect(noise1(1.5, 2.3)).toBe(noise2(1.5, 2.3));
    });

    it("3D noise is also seed-independent (fixed perm)", () => {
      const noise1 = createHytaleNoise3D(42);
      const noise2 = createHytaleNoise3D(99);
      expect(noise1(1.5, 2.3, 3.7)).toBe(noise2(1.5, 2.3, 3.7));
    });
  });
});
