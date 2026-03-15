import { describe, it, expect } from "vitest";
import { fbm2D, fbm3D } from "../fbm";

describe("FBm per-octave offsets", () => {
  const identity2D = (x: number, y: number) => x + y;

  it("different seeds produce different results", () => {
    const r1 = fbm2D(identity2D, 1, 1, 1, 1, 4, 2.0, 0.5, 42);
    const r2 = fbm2D(identity2D, 1, 1, 1, 1, 4, 2.0, 0.5, 99);
    expect(r1).not.toBeCloseTo(r2, 1);
  });

  it("with offset, origin does not evaluate to 0", () => {
    const r = fbm2D(identity2D, 0, 0, 1, 1, 1, 2.0, 0.5, 42);
    expect(r).not.toBe(0);
  });

  it("is deterministic for same seed", () => {
    const r1 = fbm2D(identity2D, 5, 5, 1, 1, 4, 2.0, 0.5, 42);
    const r2 = fbm2D(identity2D, 5, 5, 1, 1, 4, 2.0, 0.5, 42);
    expect(r1).toBe(r2);
  });
});

describe("FBm amplitude normalization", () => {
  it("output stays in [-1, 1] for multi-octave noise with constant 1.0 input", () => {
    const maxNoise = () => 1.0;
    const result = fbm2D(maxNoise, 0, 0, 1, 1, 4, 2.0, 0.5);
    expect(result).toBeCloseTo(1.0);
  });

  it("output stays in [-1, 1] for multi-octave noise with constant -1.0 input", () => {
    const minNoise = () => -1.0;
    const result = fbm2D(minNoise, 0, 0, 1, 1, 4, 2.0, 0.5);
    expect(result).toBeCloseTo(-1.0);
  });

  it("single octave preserves value", () => {
    const constNoise = () => 0.5;
    const result = fbm2D(constNoise, 0, 0, 1, 1, 1, 2.0, 0.5);
    expect(result).toBeCloseTo(0.5);
  });
});

describe("FBm V2 scale/offset order", () => {
  it("scale=1 single octave with identity noise equals noise(x, z)", () => {
    const noise2D = (x: number, y: number) => Math.sin(x) * Math.cos(y);
    const result = fbm2D(noise2D, 3.0, 4.0, 1, 1, 1, 1, 1);
    const expected = noise2D(3.0, 4.0);
    expect(result).toBeCloseTo(expected, 10);
  });

  it("divides by scale (large scale = larger features)", () => {
    const noise2D = (x: number, y: number) => Math.sin(x) * Math.cos(y);
    const resultScale1 = fbm2D(noise2D, 100, 100, 1, 1, 1, 1, 1);
    const resultScale100 = fbm2D(noise2D, 100, 100, 100, 100, 1, 1, 1);
    // scale=100 should evaluate noise at (1, 1), scale=1 at (100, 100)
    expect(resultScale100).toBeCloseTo(noise2D(1, 1), 10);
    expect(resultScale1).toBeCloseTo(noise2D(100, 100), 10);
  });
});

describe("FBm 3D anisotropic scaling", () => {
  it("supports separate ScaleXZ and ScaleY", () => {
    const noise3D = (x: number, y: number, z: number) => x + y + z;
    const resultIso = fbm3D(noise3D, 100, 100, 100, 100, 100, 1, 1, 1);
    const resultAniso = fbm3D(noise3D, 100, 100, 100, 100, 50, 1, 1, 1);
    // Isotropic: noise(1, 1, 1) = 3.  Anisotropic: noise(1, 2, 1) = 4.
    expect(resultIso).toBeCloseTo(3.0, 10);
    expect(resultAniso).toBeCloseTo(4.0, 10);
  });
});
