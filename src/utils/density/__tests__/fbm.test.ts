import { describe, it, expect } from "vitest";
import { fbm2D } from "../fbm";

describe("FBm per-octave offsets", () => {
  const identity2D = (x: number, y: number) => x + y;

  it("different seeds produce different results", () => {
    const r1 = fbm2D(identity2D, 1, 1, 1, 4, 2.0, 0.5, 42);
    const r2 = fbm2D(identity2D, 1, 1, 1, 4, 2.0, 0.5, 99);
    expect(r1).not.toBeCloseTo(r2, 1);
  });

  it("with offset, origin does not evaluate to 0", () => {
    const r = fbm2D(identity2D, 0, 0, 1, 1, 2.0, 0.5, 42);
    expect(r).not.toBe(0);
  });

  it("is deterministic for same seed", () => {
    const r1 = fbm2D(identity2D, 5, 5, 1, 4, 2.0, 0.5, 42);
    const r2 = fbm2D(identity2D, 5, 5, 1, 4, 2.0, 0.5, 42);
    expect(r1).toBe(r2);
  });
});

describe("FBm amplitude normalization", () => {
  it("output stays in [-1, 1] for multi-octave noise with constant 1.0 input", () => {
    const maxNoise = () => 1.0;
    const result = fbm2D(maxNoise, 0, 0, 1, 4, 2.0, 0.5);
    expect(result).toBeCloseTo(1.0);
  });

  it("output stays in [-1, 1] for multi-octave noise with constant -1.0 input", () => {
    const minNoise = () => -1.0;
    const result = fbm2D(minNoise, 0, 0, 1, 4, 2.0, 0.5);
    expect(result).toBeCloseTo(-1.0);
  });

  it("single octave preserves value", () => {
    const constNoise = () => 0.5;
    const result = fbm2D(constNoise, 0, 0, 1, 1, 2.0, 0.5);
    expect(result).toBeCloseTo(0.5);
  });
});
