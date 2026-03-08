import { describe, it, expect } from "vitest";
import { smoothMin, smoothMax } from "../mathHelpers";

describe("smoothMax boundary asymmetry (V2)", () => {
  it("smoothMin returns hard min when |a-b| >= k", () => {
    expect(smoothMin(0, 2, 1.0)).toBe(0);
  });

  it("smoothMax still blends when |a-b| == k (strict >)", () => {
    // When diff == k exactly, h saturates to 1 so result equals b.
    // The "strict >" means we don't early-return, but the blend
    // formula at the boundary is continuous with the hard-max result.
    const result = smoothMax(0, 1, 1.0);
    expect(result).toBe(1.0);

    // For |a-b| slightly less than k, blending adds k*h*(1-h) overshoot:
    const blended = smoothMax(0, 0.9, 1.0);
    expect(blended).toBeGreaterThan(0.9);
    expect(blended).toBeLessThan(1.2);
  });

  it("smoothMax returns hard max when |a-b| > k", () => {
    expect(smoothMax(0, 3, 1.0)).toBe(3);
  });

  it("smoothMax with k=0 returns hard max", () => {
    expect(smoothMax(2, 5, 0)).toBe(5);
  });
});
