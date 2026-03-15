import { describe, it, expect } from "vitest";
import { DENSITY_DEFAULTS, CURVE_DEFAULTS } from "../defaults";

describe("V2 CODEC default alignment", () => {
  it("SimplexNoise2D defaults match V2", () => {
    const d = DENSITY_DEFAULTS.SimplexNoise2D;
    expect(d.Lacunarity).toBe(1.0);
    expect(d.Persistence).toBe(1.0);
    expect(d.Scale).toBe(1.0);
    expect(d.Octaves).toBe(1);
  });

  it("SimplexNoise3D defaults match V2", () => {
    const d = DENSITY_DEFAULTS.SimplexNoise3D;
    expect(d.Lacunarity).toBe(1.0);
    expect(d.Persistence).toBe(1.0);
    expect(d.Scale).toBe(1.0);
    expect(d.Octaves).toBe(1);
  });

  it("Clamp defaults are JSON-safe large sentinels", () => {
    const d = DENSITY_DEFAULTS.Clamp;
    expect(d.Min).toBe(-1e15);
    expect(d.Max).toBe(1e15);
    // Verify they survive JSON round-trip (unlike Infinity which becomes null)
    expect(JSON.parse(JSON.stringify(d.Min))).toBe(-1e15);
    expect(JSON.parse(JSON.stringify(d.Max))).toBe(1e15);
  });

  it("Curve Constant defaults to 0.0", () => {
    expect(CURVE_DEFAULTS.Constant.Value).toBe(0.0);
  });

  it("FractalNoise2D defaults match V2", () => {
    const d = DENSITY_DEFAULTS.FractalNoise2D;
    expect(d.Scale).toBe(1.0);
    expect(d.Lacunarity).toBe(1.0);
    expect(d.Persistence).toBe(1.0);
    expect(d.Octaves).toBe(1);
  });

  it("FractalNoise3D defaults match V2", () => {
    const d = DENSITY_DEFAULTS.FractalNoise3D;
    expect(d.Scale).toBe(1.0);
    expect(d.Lacunarity).toBe(1.0);
    expect(d.Persistence).toBe(1.0);
    expect(d.Octaves).toBe(1);
  });

  it("SmoothMin/SmoothMax defaults match V2", () => {
    expect(DENSITY_DEFAULTS.SmoothMin.Smoothness).toBe(1.0);
    expect(DENSITY_DEFAULTS.SmoothMax.Smoothness).toBe(1.0);
  });
});
