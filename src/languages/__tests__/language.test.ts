import { describe, it, expect } from "vitest";
import { getLanguageHelpers } from "../useLanguage";
import { hytaleLanguage } from "../hytale";
import { internalToHytale } from "@/utils/internalToHytale";
import { hytaleToInternal } from "@/utils/hytaleToInternal";
import { INTERNAL_TO_HYTALE_TYPES } from "@/utils/translationMaps";

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

  it("returns Hytale field display names", () => {
    expect(h.getFieldDisplayName("Clamp", "Min")).toBe("WallB");
    expect(h.getFieldDisplayName("Clamp", "Max")).toBe("WallA");
    expect(h.getFieldDisplayName("SmoothClamp", "Min")).toBe("WallB");
    expect(h.getFieldDisplayName("SmoothClamp", "Max")).toBe("WallA");
    expect(h.getFieldDisplayName("RotatedPosition", "AngleDegrees")).toBe("SpinAngle");
    expect(h.getFieldDisplayName("DomainWarp2D", "Amplitude")).toBe("WarpFactor");
    expect(h.getFieldDisplayName("DomainWarp3D", "Amplitude")).toBe("WarpFactor");
    expect(h.getFieldDisplayName("SimplexNoise2D", "Gain")).toBe("Persistence");
    expect(h.getFieldDisplayName("SimplexNoise3D", "Gain")).toBe("Persistence");
  });

  it("returns transform displayName for transformed fields", () => {
    expect(h.getFieldDisplayName("SimplexNoise2D", "Frequency")).toBe("Scale");
    expect(h.getFieldDisplayName("SimplexNoise3D", "Frequency")).toBe("Scale");
    expect(h.getFieldDisplayName("VoronoiNoise2D", "Frequency")).toBe("Scale");
    expect(h.getFieldDisplayName("VoronoiNoise3D", "Frequency")).toBe("Scale");
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
// Field value transforms (Frequency ↔ Scale)
// ---------------------------------------------------------------------------

describe("field transforms", () => {
  const h = getLanguageHelpers();

  describe("Frequency ↔ Scale inverse", () => {
    const types = ["SimplexNoise2D", "SimplexNoise3D", "VoronoiNoise2D", "VoronoiNoise3D"];

    for (const type of types) {
      it(`${type}: toDisplay converts Frequency to Scale`, () => {
        const transform = h.getFieldTransform(type, "Frequency")!;
        expect(transform).not.toBeNull();
        expect(transform.displayName).toBe("Scale");

        // Frequency 0.01 → Scale 100
        expect(transform.toDisplay(0.01)).toBeCloseTo(100, 5);
        // Frequency 0.1 → Scale 10
        expect(transform.toDisplay(0.1)).toBeCloseTo(10, 5);
        // Frequency 1 → Scale 1
        expect(transform.toDisplay(1)).toBeCloseTo(1, 5);
        // Frequency 0.001 → Scale 1000
        expect(transform.toDisplay(0.001)).toBeCloseTo(1000, 5);
      });

      it(`${type}: fromDisplay converts Scale back to Frequency`, () => {
        const transform = h.getFieldTransform(type, "Frequency")!;

        // Scale 100 → Frequency 0.01
        expect(transform.fromDisplay(100)).toBeCloseTo(0.01, 5);
        // Scale 10 → Frequency 0.1
        expect(transform.fromDisplay(10)).toBeCloseTo(0.1, 5);
        // Scale 1 → Frequency 1
        expect(transform.fromDisplay(1)).toBeCloseTo(1, 5);
      });

      it(`${type}: round-trip preserves value`, () => {
        const transform = h.getFieldTransform(type, "Frequency")!;
        const values = [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 10, 100];
        for (const v of values) {
          expect(transform.fromDisplay(transform.toDisplay(v))).toBeCloseTo(v, 10);
        }
      });
    }

    it("handles zero gracefully (no division by zero)", () => {
      const transform = h.getFieldTransform("SimplexNoise2D", "Frequency")!;
      expect(transform.toDisplay(0)).toBe(0);
      expect(transform.fromDisplay(0)).toBe(0);
    });

    it("handles negative values", () => {
      const transform = h.getFieldTransform("SimplexNoise2D", "Frequency")!;
      expect(transform.toDisplay(-0.1)).toBeCloseTo(-10, 5);
      expect(transform.fromDisplay(-10)).toBeCloseTo(-0.1, 5);
    });
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
// End-to-end: Hytale language display → internal storage → JSON export
// ---------------------------------------------------------------------------

describe("end-to-end: Hytale display → internal → export → import round-trip", () => {
  const h = getLanguageHelpers();

  it("SimplexNoise2D: Scale display value exports correctly", () => {
    const userDisplayValue = 100;
    const transform = h.getFieldTransform("SimplexNoise2D", "Frequency")!;
    const internalFrequency = transform.fromDisplay(userDisplayValue);
    expect(internalFrequency).toBeCloseTo(0.01, 10);

    const internalAsset = {
      Type: "SimplexNoise2D",
      Frequency: internalFrequency,
      Amplitude: 1.0,
      Seed: "A",
      Octaves: 3,
      Gain: 0.5,
    };

    const exported = internalToHytale(internalAsset);

    expect(exported.Type).toBe("SimplexNoise2D");
    expect(exported.Scale).toBeCloseTo(100, 5);
    expect(exported.Persistence).toBe(0.5);
    expect(exported.Seed).toBe("A");
    expect(exported.Octaves).toBe(3);
    expect(exported).not.toHaveProperty("Frequency");
    expect(exported).not.toHaveProperty("Gain");
    expect(exported).not.toHaveProperty("Amplitude");

    const importedJson = {
      $NodeId: "SimplexNoise2DDensityNode-test123",
      ...exported,
    };
    const { asset: reimported } = hytaleToInternal(importedJson);

    expect(reimported.Type).toBe("SimplexNoise2D");
    expect((reimported as Record<string, unknown>).Frequency).toBeCloseTo(0.01, 5);
    expect((reimported as Record<string, unknown>).Gain).toBe(0.5);
    expect((reimported as Record<string, unknown>).Seed).toBe("A");
    expect((reimported as Record<string, unknown>).Octaves).toBe(3);
  });

  it("SimplexNoise2D: various Scale values round-trip correctly", () => {
    const transform = h.getFieldTransform("SimplexNoise2D", "Frequency")!;
    const scaleValues = [1, 10, 50, 100, 200, 500, 1000];

    for (const displayScale of scaleValues) {
      const internalFreq = transform.fromDisplay(displayScale);

      const exported = internalToHytale({
        Type: "SimplexNoise2D",
        Frequency: internalFreq,
        Seed: "A",
      });

      expect(exported.Scale).toBeCloseTo(displayScale, 5);

      const { asset: reimported } = hytaleToInternal({
        $NodeId: "SimplexNoise2DDensityNode-test",
        ...exported,
      });

      expect((reimported as Record<string, unknown>).Frequency).toBeCloseTo(internalFreq, 10);
    }
  });

  it("VoronoiNoise2D: Frequency ↔ Scale export round-trip", () => {
    const transform = h.getFieldTransform("VoronoiNoise2D", "Frequency")!;
    const displayScale = 50;
    const internalFreq = transform.fromDisplay(displayScale);

    const exported = internalToHytale({
      Type: "VoronoiNoise2D",
      Frequency: internalFreq,
      Seed: "A",
    });

    expect(exported.Type).toBe("CellNoise2D");
    expect(exported.ScaleX).toBeCloseTo(displayScale, 5);
    expect(exported.ScaleZ).toBeCloseTo(displayScale, 5);
    expect(exported).not.toHaveProperty("Frequency");

    const { asset: reimported } = hytaleToInternal({
      $NodeId: "CellNoise2DDensityNode-test",
      ...exported,
    });

    expect(reimported.Type).toBe("VoronoiNoise2D");
    expect((reimported as Record<string, unknown>).Frequency).toBeCloseTo(internalFreq, 5);
  });

  it("VoronoiNoise3D: Frequency ↔ Scale export round-trip", () => {
    const transform = h.getFieldTransform("VoronoiNoise3D", "Frequency")!;
    const displayScale = 25;
    const internalFreq = transform.fromDisplay(displayScale);

    const exported = internalToHytale({
      Type: "VoronoiNoise3D",
      Frequency: internalFreq,
      Seed: "B",
    });

    expect(exported.Type).toBe("CellNoise3D");
    expect(exported.ScaleX).toBeCloseTo(displayScale, 5);
    expect(exported.ScaleY).toBeCloseTo(displayScale, 5);
    expect(exported.ScaleZ).toBeCloseTo(displayScale, 5);

    const { asset: reimported } = hytaleToInternal({
      $NodeId: "CellNoise3DDensityNode-test",
      ...exported,
    });

    expect(reimported.Type).toBe("VoronoiNoise3D");
    expect((reimported as Record<string, unknown>).Frequency).toBeCloseTo(internalFreq, 5);
  });

  it("Clamp: field display names do not affect exported values", () => {
    expect(h.getFieldDisplayName("Clamp", "Min")).toBe("WallB");
    expect(h.getFieldDisplayName("Clamp", "Max")).toBe("WallA");

    const internalAsset = { Type: "Clamp", Min: -1, Max: 1 };
    const exported = internalToHytale(internalAsset);

    expect(exported.Type).toBe("Clamp");
    expect(exported.WallA).toBe(1);
    expect(exported.WallB).toBe(-1);
    expect(exported).not.toHaveProperty("Min");
    expect(exported).not.toHaveProperty("Max");

    const { asset: reimported } = hytaleToInternal({
      $NodeId: "ClampDensityNode-test",
      ...exported,
    });

    expect(reimported.Type).toBe("Clamp");
    expect((reimported as Record<string, unknown>).Min).toBe(-1);
    expect((reimported as Record<string, unknown>).Max).toBe(1);
  });

  it("Product: type display name does not affect exported Type field", () => {
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
    expect(h.getFieldDisplayName("RotatedPosition", "AngleDegrees")).toBe("SpinAngle");

    const internalAsset = { Type: "RotatedPosition", AngleDegrees: 45 };
    const exported = internalToHytale(internalAsset);

    expect(exported.Type).toBe("Rotator");
    expect(exported.SpinAngle).toBe(45);
    expect(exported).not.toHaveProperty("AngleDegrees");
  });

  it("DomainWarp2D: Amplitude → WarpFactor field rename round-trip", () => {
    expect(h.getFieldDisplayName("DomainWarp2D", "Amplitude")).toBe("WarpFactor");

    const internalAsset = { Type: "DomainWarp2D", Amplitude: 5.0, Seed: "A" };
    const exported = internalToHytale(internalAsset);

    expect(exported.Type).toBe("FastGradientWarp");
    expect(exported.WarpFactor).toBe(5.0);
    expect(exported).not.toHaveProperty("Amplitude");
  });

  it("SimplexNoise3D: Frequency → ScaleXZ + ScaleY on export", () => {
    const transform = h.getFieldTransform("SimplexNoise3D", "Frequency")!;
    const displayScale = 200;
    const internalFreq = transform.fromDisplay(displayScale);

    const exported = internalToHytale({
      Type: "SimplexNoise3D",
      Frequency: internalFreq,
      Seed: "C",
      Octaves: 4,
      Gain: 0.5,
    });

    expect(exported.Type).toBe("SimplexNoise3D");
    expect(exported.ScaleXZ).toBeCloseTo(displayScale, 5);
    expect(exported.ScaleY).toBeCloseTo(displayScale, 5);
    expect(exported.Persistence).toBe(0.5);
    expect(exported).not.toHaveProperty("Frequency");
    expect(exported).not.toHaveProperty("Gain");

    const { asset: reimported } = hytaleToInternal({
      $NodeId: "SimplexNoise3DDensityNode-test",
      ...exported,
    });

    expect(reimported.Type).toBe("SimplexNoise3D");
    expect((reimported as Record<string, unknown>).Frequency).toBeCloseTo(internalFreq, 5);
    expect((reimported as Record<string, unknown>).Gain).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// Verify language display names match export type mapping
// ---------------------------------------------------------------------------

describe("language system consistency", () => {
  it("Hytale type display names match the export type mapping", () => {
    for (const [internal, hytale] of Object.entries(INTERNAL_TO_HYTALE_TYPES)) {
      expect(hytaleLanguage.typeDisplayNames[internal]).toBe(hytale);
    }
  });
});
