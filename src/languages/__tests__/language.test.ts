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

  it("returns Hytale display names for mapped types", () => {
    expect(h.getTypeDisplayName("Product")).toBe("Multiplier");
    expect(h.getTypeDisplayName("Negate")).toBe("Inverter");
    expect(h.getTypeDisplayName("CurveFunction")).toBe("CurveMapper");
    expect(h.getTypeDisplayName("CacheOnce")).toBe("Cache");
    expect(h.getTypeDisplayName("ImportedValue")).toBe("Imported");
    expect(h.getTypeDisplayName("Blend")).toBe("Mix");
    expect(h.getTypeDisplayName("MinFunction")).toBe("Min");
    expect(h.getTypeDisplayName("MaxFunction")).toBe("Max");
    expect(h.getTypeDisplayName("VoronoiNoise2D")).toBe("CellNoise2D");
    expect(h.getTypeDisplayName("VoronoiNoise3D")).toBe("CellNoise3D");
    expect(h.getTypeDisplayName("SquareRoot")).toBe("Sqrt");
    expect(h.getTypeDisplayName("DomainWarp2D")).toBe("FastGradientWarp");
    expect(h.getTypeDisplayName("ScaledPosition")).toBe("Scale");
    expect(h.getTypeDisplayName("TranslatedPosition")).toBe("Slider");
    expect(h.getTypeDisplayName("RotatedPosition")).toBe("Rotator");
    expect(h.getTypeDisplayName("LinearTransform")).toBe("AmplitudeConstant");
    expect(h.getTypeDisplayName("BlendCurve")).toBe("MultiMix");
    expect(h.getTypeDisplayName("Square")).toBe("Pow");
  });

  it("falls back to internal name for unmapped types", () => {
    expect(h.getTypeDisplayName("SimplexNoise2D")).toBe("SimplexNoise2D");
    expect(h.getTypeDisplayName("Clamp")).toBe("Clamp");
    expect(h.getTypeDisplayName("Constant")).toBe("Constant");
  });

  it("returns Hytale field display names where overridden", () => {
    // Only RotatedPosition.AngleDegrees has a display override now
    expect(h.getFieldDisplayName("RotatedPosition", "AngleDegrees")).toBe("SpinAngle");
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
    expect(h.isTypeVisible("Product")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Dual-name search
// ---------------------------------------------------------------------------

describe("matchesSearch", () => {
  const h = getLanguageHelpers();

  it("matches by internal name", () => {
    expect(h.matchesSearch("Product", "product")).toBe(true);
    expect(h.matchesSearch("Product", "Prod")).toBe(true);
  });

  it("matches by display name", () => {
    expect(h.matchesSearch("Product", "Multiplier")).toBe(true);
    expect(h.matchesSearch("Product", "multi")).toBe(true);
  });

  it("matches partial queries", () => {
    expect(h.matchesSearch("VoronoiNoise2D", "cell")).toBe(true);
    expect(h.matchesSearch("VoronoiNoise2D", "voronoi")).toBe(true);
    expect(h.matchesSearch("CurveFunction", "mapper")).toBe(true);
    expect(h.matchesSearch("CurveFunction", "curve")).toBe(true);
  });

  it("returns false for non-matching queries", () => {
    expect(h.matchesSearch("Product", "clamp")).toBe(false);
    expect(h.matchesSearch("Constant", "noise")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(h.matchesSearch("Product", "MULTIPLIER")).toBe(true);
    expect(h.matchesSearch("Product", "mUlTiPlIeR")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// End-to-end: export pipeline still works with V1 internal names
// (The import pipeline converts V2->V1 for backward compat;
//  the export pipeline converts V1->V2 for Hytale JSON output.)
// ---------------------------------------------------------------------------

describe("end-to-end: V1 internal → export → import round-trip", () => {
  it("Product: type display name does not affect exported Type field", () => {
    const h = getLanguageHelpers();
    expect(h.getTypeDisplayName("Product")).toBe("Multiplier");

    const internalAsset = { Type: "Product", Inputs: [] };
    const exported = internalToHytale(internalAsset);
    expect(exported.Type).toBe("Multiplier");

    const { asset: reimported } = hytaleToInternal({
      $NodeId: "MultiplierDensityNode-test",
      ...exported,
    });
    expect(reimported.Type).toBe("Product");
  });

  it("RotatedPosition: AngleDegrees → SpinAngle field rename round-trip", () => {
    const h = getLanguageHelpers();
    expect(h.getFieldDisplayName("RotatedPosition", "AngleDegrees")).toBe("SpinAngle");

    const internalAsset = { Type: "RotatedPosition", AngleDegrees: 45 };
    const exported = internalToHytale(internalAsset);

    expect(exported.Type).toBe("Rotator");
    expect(exported.SpinAngle).toBe(45);
    expect(exported).not.toHaveProperty("AngleDegrees");
  });
});

// ---------------------------------------------------------------------------
// Verify language display names match export type mapping
// ---------------------------------------------------------------------------

describe("language system consistency", () => {
  it("Hytale type display names include key type renames", () => {
    // Verify that the Hytale language has display name overrides for renamed types
    const expectedRenames: Record<string, string> = {
      Product: "Multiplier",
      Negate: "Inverter",
      CurveFunction: "CurveMapper",
      CacheOnce: "Cache",
      ImportedValue: "Imported",
      Blend: "Mix",
      MinFunction: "Min",
      MaxFunction: "Max",
      CoordinateX: "XValue",
      CoordinateY: "YValue",
      CoordinateZ: "ZValue",
      VoronoiNoise2D: "CellNoise2D",
      VoronoiNoise3D: "CellNoise3D",
      SquareRoot: "Sqrt",
      ScaledPosition: "Scale",
      TranslatedPosition: "Slider",
      RotatedPosition: "Rotator",
      LinearTransform: "AmplitudeConstant",
      BlendCurve: "MultiMix",
      Square: "Pow",
      CubeMath: "Cube",
    };
    for (const [internal, hytale] of Object.entries(expectedRenames)) {
      expect(hytaleLanguage.typeDisplayNames[internal]).toBe(hytale);
    }
  });
});
