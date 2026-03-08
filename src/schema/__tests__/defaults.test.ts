import { describe, it, expect } from "vitest";
import { DENSITY_DEFAULTS, CURVE_DEFAULTS } from "../defaults";

describe("V2 CODEC default alignment", () => {
  it("SimplexNoise2D defaults match V2", () => {
    const d = DENSITY_DEFAULTS.SimplexNoise2D;
    expect(d.Lacunarity).toBe(1.0);
    expect(d.Gain).toBe(1.0);
    expect(d.Frequency).toBe(1.0);
  });

  it("SimplexNoise3D defaults match V2", () => {
    const d = DENSITY_DEFAULTS.SimplexNoise3D;
    expect(d.Lacunarity).toBe(1.0);
    expect(d.Gain).toBe(1.0);
    expect(d.Frequency).toBe(1.0);
  });

  it("Clamp defaults match V2 (-Infinity/+Infinity)", () => {
    const d = DENSITY_DEFAULTS.Clamp;
    expect(d.Min).toBe(-Infinity);
    expect(d.Max).toBe(Infinity);
  });

  it("Curve Constant defaults to 0.0", () => {
    expect(CURVE_DEFAULTS.Constant.Value).toBe(0.0);
  });

  it("FractalNoise2D defaults match V2", () => {
    const d = DENSITY_DEFAULTS.FractalNoise2D;
    expect(d.Frequency).toBe(1.0);
    expect(d.Lacunarity).toBe(1.0);
    expect(d.Gain).toBe(1.0);
  });

  it("FractalNoise3D defaults match V2", () => {
    const d = DENSITY_DEFAULTS.FractalNoise3D;
    expect(d.Frequency).toBe(1.0);
    expect(d.Lacunarity).toBe(1.0);
    expect(d.Gain).toBe(1.0);
  });
});
