import { describe, it, expect } from "vitest";
import { ALL_DEFAULTS, DENSITY_DEFAULTS, CURVE_DEFAULTS, getDefaults, getLegacyDefaultsForType } from "../defaults";
import { AssetCategory } from "../types";

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

  it("Clamp defaults use V2 WallA/WallB naming", () => {
    const d = DENSITY_DEFAULTS.Clamp;
    // V2: WallA = upper bound, WallB = lower bound
    expect(d.WallA).toBeDefined();
    expect(d.WallB).toBeDefined();
    // Verify they survive JSON round-trip (unlike Infinity which becomes null)
    expect(JSON.parse(JSON.stringify(d.WallA))).toBeDefined();
    expect(JSON.parse(JSON.stringify(d.WallB))).toBeDefined();
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

  it("SmoothMin/SmoothMax have no scalar fields in V2", () => {
    // V2 SmoothMin/SmoothMax have no user-editable fields
    expect(Object.keys(DENSITY_DEFAULTS.SmoothMin).length).toBe(0);
    expect(Object.keys(DENSITY_DEFAULTS.SmoothMax).length).toBe(0);
  });
});

describe("getDefaults() — schema-driven API", () => {
  it("returns defaults for a density type by bare name", () => {
    const d = getDefaults("SimplexNoise2D");
    expect(d.Scale).toBe(1.0);
    expect(d.Octaves).toBe(1);
  });

  it("density Exported defaults use ExportAs, not legacy Name", () => {
    const d = getDefaults("Exported");
    expect(d.ExportAs).toBe("");
    expect(d.SingleInstance).toBe(false);
    expect(d.Name).toBeUndefined();
  });

  it("returns defaults for a prefixed bundle type", () => {
    const d = getDefaults("Curve:Manual");
    expect(d).toBeDefined();
  });

  it("falls back to legacy for types not in the bundle", () => {
    const d = getDefaults("FractalNoise2D");
    expect(d.Scale).toBe(1.0);
    expect(d.Octaves).toBe(1);
  });

  it("returns {} for completely unknown types", () => {
    const d = getDefaults("NonExistentType_XYZ");
    expect(d).toEqual({});
  });

  it("returns defaults for a material type by prefixed key", () => {
    const d = getDefaults("MaterialProvider:SpaceAndDepth");
    expect(d).toBeDefined();
    // Legacy fallback should have LayerContext
    expect(d.LayerContext ?? d.MaxExpectedDepth).toBeDefined();
  });

  it("keeps schema-only category entries canonical in ALL_DEFAULTS", () => {
    const propDistributionAssigned = ALL_DEFAULTS.filter((entry) => entry.type === "PropDistribution:Assigned");
    expect(propDistributionAssigned).toHaveLength(1);
    expect(propDistributionAssigned[0].category).toBe(AssetCategory.PropDistribution);

    const alwaysTrueCondition = ALL_DEFAULTS.filter((entry) => entry.type === "AlwaysTrueCondition");
    expect(alwaysTrueCondition).toHaveLength(1);
    expect(alwaysTrueCondition[0].category).toBe(AssetCategory.Condition);
  });
});

describe("getLegacyDefaultsForType", () => {
  it("resolves Material:Constant to material provider defaults", () => {
    expect(getLegacyDefaultsForType("Material:Constant")).toEqual({
      Material: "Rock_Lime_Cobble",
    });
  });

  it("getDefaults uses the same legacy map for Material:Constant", () => {
    expect(getDefaults("Material:Constant").Material).toBe("Rock_Lime_Cobble");
  });
});
