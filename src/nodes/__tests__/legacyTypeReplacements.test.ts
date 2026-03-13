import { describe, it, expect } from "vitest";
import { getLegacyReplacement, LEGACY_TYPE_REPLACEMENTS, isLegacyTypeKey } from "../shared/legacyTypes";

describe("getLegacyReplacement", () => {
  it("returns null for a non-legacy type", () => {
    expect(getLegacyReplacement("Simplex")).toBeNull();
    expect(getLegacyReplacement("Normalizer")).toBeNull();
  });

  it("returns null for legacy types with no direct replacement", () => {
    expect(getLegacyReplacement("SumSelf")).toBeNull();
    expect(getLegacyReplacement("BeardDensity")).toBeNull();
    expect(getLegacyReplacement("Position:Mesh2D")).toBeNull();
    expect(getLegacyReplacement("Scanner:ColumnLinear")).toBeNull();
  });

  it("returns the replacement for density types with 1:1 equivalents", () => {
    expect(getLegacyReplacement("SimplexRidgeNoise2D")).toBe("SimplexNoise2D");
    expect(getLegacyReplacement("SimplexRidgeNoise3D")).toBe("SimplexNoise3D");
    expect(getLegacyReplacement("DoubleNormalizer")).toBe("Normalizer");
    expect(getLegacyReplacement("AverageFunction")).toBe("Blend");
    expect(getLegacyReplacement("FlatCache")).toBe("Cache2D");
    expect(getLegacyReplacement("Amplitude")).toBe("AmplitudeConstant");
    expect(getLegacyReplacement("Zero")).toBe("Constant");
    expect(getLegacyReplacement("One")).toBe("Constant");
  });

  it("returns the replacement for curve types with 1:1 equivalents", () => {
    expect(getLegacyReplacement("Curve:Blend")).toBe("Curve:Sum");
    expect(getLegacyReplacement("Curve:Cache")).toBe("Curve:Manual");
    expect(getLegacyReplacement("Curve:Noise")).toBe("Curve:Manual");
  });

  it("all replacement targets are NOT themselves legacy types", () => {
    for (const [, replacement] of LEGACY_TYPE_REPLACEMENTS) {
      expect(isLegacyTypeKey(replacement)).toBe(false);
    }
  });
});
