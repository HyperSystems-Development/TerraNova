import { describe, it, expect } from "vitest";
import { getLanguageHelpers } from "../useLanguage";
import { hytaleLanguage } from "../hytale";
import { internalToHytale } from "@/utils/internalToHytale";
import { hytaleToInternal } from "@/utils/hytaleToInternal";

// ---------------------------------------------------------------------------
// Language helper basics
// ---------------------------------------------------------------------------

describe("getLanguageHelpers", () => {
  const h = getLanguageHelpers();

  it("returns V2 type names as-is (no display override needed)", () => {
    // Internal names now match V2, so display names are identity
    expect(h.getTypeDisplayName("Multiplier")).toBe("Multiplier");
    expect(h.getTypeDisplayName("Inverter")).toBe("Inverter");
    expect(h.getTypeDisplayName("CurveMapper")).toBe("CurveMapper");
    expect(h.getTypeDisplayName("Cache")).toBe("Cache");
    expect(h.getTypeDisplayName("Imported")).toBe("Imported");
    expect(h.getTypeDisplayName("Mix")).toBe("Mix");
    expect(h.getTypeDisplayName("Min")).toBe("Min");
    expect(h.getTypeDisplayName("Max")).toBe("Max");
    expect(h.getTypeDisplayName("XValue")).toBe("XValue");
    expect(h.getTypeDisplayName("YValue")).toBe("YValue");
    expect(h.getTypeDisplayName("ZValue")).toBe("ZValue");
    expect(h.getTypeDisplayName("CellNoise2D")).toBe("CellNoise2D");
    expect(h.getTypeDisplayName("CellNoise3D")).toBe("CellNoise3D");
    expect(h.getTypeDisplayName("Sqrt")).toBe("Sqrt");
    expect(h.getTypeDisplayName("Scale")).toBe("Scale");
    expect(h.getTypeDisplayName("Slider")).toBe("Slider");
    expect(h.getTypeDisplayName("Rotator")).toBe("Rotator");
    expect(h.getTypeDisplayName("AmplitudeConstant")).toBe("AmplitudeConstant");
    expect(h.getTypeDisplayName("MultiMix")).toBe("MultiMix");
    expect(h.getTypeDisplayName("Pow")).toBe("Pow");
    expect(h.getTypeDisplayName("Cube")).toBe("Cube");
  });

  it("returns special display name for Vector:Constant", () => {
    expect(h.getTypeDisplayName("Vector:Constant")).toBe("Point3D");
  });

  it("falls back to internal name for unmapped types", () => {
    expect(h.getTypeDisplayName("SimplexNoise2D")).toBe("SimplexNoise2D");
    expect(h.getTypeDisplayName("Clamp")).toBe("Clamp");
    expect(h.getTypeDisplayName("Constant")).toBe("Constant");
  });

  it("returns Hytale field display names where overridden", () => {
    expect(h.getFieldDisplayName("Rotator", "AngleDegrees")).toBe("SpinAngle");
  });

  it("returns V2 field names as-is (no transform needed)", () => {
    // V2 field names are used internally — no display-name override needed
    expect(h.getFieldDisplayName("SimplexNoise2D", "Scale")).toBe("Scale");
    expect(h.getFieldDisplayName("SimplexNoise2D", "Persistence")).toBe("Persistence");
    expect(h.getFieldDisplayName("Clamp", "WallA")).toBe("WallA");
    expect(h.getFieldDisplayName("Clamp", "WallB")).toBe("WallB");
  });

  it("has no field value transforms (V2 values are used directly)", () => {
    // Field transforms were removed — V2 values are stored directly
    expect(h.getFieldTransform("SimplexNoise2D", "Scale")).toBeNull();
    expect(h.getFieldTransform("SimplexNoise2D", "Persistence")).toBeNull();
  });

  it("falls back to raw field name for unmapped fields", () => {
    expect(h.getFieldDisplayName("SimplexNoise2D", "Octaves")).toBe("Octaves");
    expect(h.getFieldDisplayName("Clamp", "Input")).toBe("Input");
  });

  it("hides convenience types", () => {
    expect(h.isTypeVisible("SimplexRidgeNoise2D")).toBe(false);
    expect(h.isTypeVisible("SimplexRidgeNoise3D")).toBe(false);
    expect(h.isTypeVisible("FractalNoise2D")).toBe(false);
    expect(h.isTypeVisible("FractalNoise3D")).toBe(false);
    expect(h.isTypeVisible("GradientDensity")).toBe(false);
    expect(h.isTypeVisible("LinearTransform")).toBe(false);
    expect(h.isTypeVisible("Conditional")).toBe(false);
    expect(h.isTypeVisible("HeightGradient")).toBe(false);
    expect(h.isTypeVisible("DensityBased")).toBe(false);
  });

  it("shows standard Hytale types", () => {
    expect(h.isTypeVisible("SimplexNoise2D")).toBe(true);
    expect(h.isTypeVisible("Clamp")).toBe(true);
    expect(h.isTypeVisible("Constant")).toBe(true);
    expect(h.isTypeVisible("Multiplier")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Dual-name search
// ---------------------------------------------------------------------------

describe("matchesSearch", () => {
  const h = getLanguageHelpers();

  it("matches by V2 type name", () => {
    expect(h.matchesSearch("Multiplier", "multiplier")).toBe(true);
    expect(h.matchesSearch("Multiplier", "Multi")).toBe(true);
  });

  it("matches partial queries", () => {
    expect(h.matchesSearch("CellNoise2D", "cell")).toBe(true);
    expect(h.matchesSearch("CellNoise2D", "noise")).toBe(true);
    expect(h.matchesSearch("CurveMapper", "mapper")).toBe(true);
    expect(h.matchesSearch("CurveMapper", "curve")).toBe(true);
  });

  it("returns false for non-matching queries", () => {
    expect(h.matchesSearch("Multiplier", "clamp")).toBe(false);
    expect(h.matchesSearch("Constant", "noise")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(h.matchesSearch("Multiplier", "MULTIPLIER")).toBe(true);
    expect(h.matchesSearch("Multiplier", "mUlTiPlIeR")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// End-to-end: V2 internal → export → import round-trip
// ---------------------------------------------------------------------------

describe("end-to-end: V2 internal → export → import round-trip", () => {
  it("Multiplier round-trips correctly", () => {
    const internalAsset = { Type: "Multiplier", Inputs: [] };
    const exported = internalToHytale(internalAsset);
    expect(exported.Type).toBe("Multiplier");

    const { asset: reimported } = hytaleToInternal({
      $NodeId: "MultiplierDensityNode-test",
      ...exported,
    });
    expect(reimported.Type).toBe("Multiplier");
  });

  it("legacy Product exports as Multiplier", () => {
    const internalAsset = { Type: "Product", Inputs: [] };
    const exported = internalToHytale(internalAsset);
    expect(exported.Type).toBe("Multiplier");
  });

  it("Rotator: AngleDegrees → SpinAngle field rename round-trip", () => {
    const h = getLanguageHelpers();
    expect(h.getFieldDisplayName("Rotator", "AngleDegrees")).toBe("SpinAngle");

    const internalAsset = { Type: "Rotator", AngleDegrees: 45 };
    const exported = internalToHytale(internalAsset);

    expect(exported.Type).toBe("Rotator");
    expect(exported.SpinAngle).toBe(45);
    expect(exported).not.toHaveProperty("AngleDegrees");
  });
});

// ---------------------------------------------------------------------------
// Verify language display names
// ---------------------------------------------------------------------------

describe("language system consistency", () => {
  it("Vector:Constant has Point3D display name", () => {
    expect(hytaleLanguage.typeDisplayNames["Vector:Constant"]).toBe("Point3D");
  });

  it("no old-name display overrides remain", () => {
    // These old internal names should NOT have display name entries
    const oldNames = [
      "Product", "Negate", "CurveFunction", "CacheOnce", "ImportedValue",
      "Blend", "MinFunction", "MaxFunction", "CoordinateX", "CoordinateY",
      "CoordinateZ", "VoronoiNoise2D", "VoronoiNoise3D", "SquareRoot",
      "ScaledPosition", "TranslatedPosition", "RotatedPosition",
      "LinearTransform", "BlendCurve", "Square", "CubeMath",
    ];
    for (const name of oldNames) {
      expect(hytaleLanguage.typeDisplayNames[name]).toBeUndefined();
    }
  });
});
