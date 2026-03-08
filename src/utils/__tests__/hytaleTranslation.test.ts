import { describe, it, expect } from "vitest";
import { internalToHytale, internalToHytaleBiome } from "../internalToHytale";
import { hytaleToInternal, hytaleToInternalBiome, isHytaleNativeFormat } from "../hytaleToInternal";

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

describe("isHytaleNativeFormat", () => {
  it("detects Hytale format by $NodeId presence", () => {
    expect(isHytaleNativeFormat({ $NodeId: "foo-123", Type: "Clamp" })).toBe(true);
  });

  it("rejects internal format (no $NodeId)", () => {
    expect(isHytaleNativeFormat({ Type: "Clamp", Min: 0, Max: 1 })).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(isHytaleNativeFormat(null)).toBe(false);
    expect(isHytaleNativeFormat("string")).toBe(false);
    expect(isHytaleNativeFormat(42)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Type name mapping
// ---------------------------------------------------------------------------

describe("type name mapping", () => {
  it("maps Product → Multiplier on export", () => {
    const result = internalToHytale({ Type: "Product", Inputs: [] });
    expect(result.Type).toBe("Multiplier");
  });

  it("maps Multiplier → Product on import", () => {
    const { asset } = hytaleToInternal({ $NodeId: "MultiplierDensityNode-123", Type: "Multiplier" });
    expect(asset.Type).toBe("Product");
  });

  it("maps Negate → Inverter on export", () => {
    const result = internalToHytale({ Type: "Negate" });
    expect(result.Type).toBe("Inverter");
  });

  it("maps CurveFunction → CurveMapper on export", () => {
    const result = internalToHytale({ Type: "CurveFunction" });
    expect(result.Type).toBe("CurveMapper");
  });

  it("maps CacheOnce → Cache on export", () => {
    const result = internalToHytale({ Type: "CacheOnce" });
    expect(result.Type).toBe("Cache");
  });

  it("maps ImportedValue → Imported on export", () => {
    const result = internalToHytale({ Type: "ImportedValue", Name: "test" });
    expect(result.Type).toBe("Imported");
  });

  it("maps Blend → Mix on export", () => {
    const result = internalToHytale({ Type: "Blend" });
    expect(result.Type).toBe("Mix");
  });

  it("maps MinFunction → Min on export", () => {
    const result = internalToHytale({ Type: "MinFunction" });
    expect(result.Type).toBe("Min");
  });

  it("maps MaxFunction → Max on export", () => {
    const result = internalToHytale({ Type: "MaxFunction" });
    expect(result.Type).toBe("Max");
  });

  it("maps VoronoiNoise2D → CellNoise2D on export", () => {
    const result = internalToHytale({ Type: "VoronoiNoise2D", Frequency: 0.01, Seed: "A" });
    expect(result.Type).toBe("CellNoise2D");
  });

  it("maps CoordinateX/Y/Z → XValue/YValue/ZValue", () => {
    expect(internalToHytale({ Type: "CoordinateX" }).Type).toBe("XValue");
    expect(internalToHytale({ Type: "CoordinateY" }).Type).toBe("YValue");
    expect(internalToHytale({ Type: "CoordinateZ" }).Type).toBe("ZValue");
  });

  it("passes through types without mapping", () => {
    const result = internalToHytale({ Type: "SimplexNoise2D", Frequency: 0.01, Seed: "A" });
    expect(result.Type).toBe("SimplexNoise2D");
  });

  it("maps FractalNoise2D → SimplexNoise2D", () => {
    const result = internalToHytale({ Type: "FractalNoise2D", Frequency: 0.01, Octaves: 4 });
    expect(result.Type).toBe("SimplexNoise2D");
    expect(result.Octaves).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// $NodeId generation
// ---------------------------------------------------------------------------

describe("$NodeId generation", () => {
  it("adds $NodeId to exported nodes", () => {
    const result = internalToHytale({ Type: "Constant", Value: 1 });
    expect(result.$NodeId).toBeDefined();
    expect(typeof result.$NodeId).toBe("string");
  });

  it("uses correct prefix for density node types", () => {
    const result = internalToHytale({ Type: "SimplexNoise2D", Frequency: 0.01, Seed: "A" });
    expect((result.$NodeId as string).startsWith("SimplexNoise2DDensityNode-")).toBe(true);
  });

  it("uses dot prefix for CurveMapper", () => {
    const result = internalToHytale({ Type: "CurveFunction" });
    expect((result.$NodeId as string).startsWith("CurveMapper.Density-")).toBe(true);
  });

  it("uses dot prefix for Cache", () => {
    const result = internalToHytale({ Type: "CacheOnce" });
    expect((result.$NodeId as string).startsWith("Cache.Density-")).toBe(true);
  });

  it("strips $NodeId on import", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "ConstantDensityNode-abc-123",
      Type: "Constant",
      Value: 5,
    });
    expect(asset.$NodeId).toBeUndefined();
    expect(asset.Type).toBe("Constant");
    expect(asset.Value).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Skip field
// ---------------------------------------------------------------------------

describe("Skip field", () => {
  it("adds Skip: false on export for density nodes", () => {
    const result = internalToHytale({ Type: "Constant", Value: 1 });
    expect(result.Skip).toBe(false);
  });

  it("strips Skip on import", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "ConstantDensityNode-123",
      Type: "Constant",
      Value: 1,
      Skip: false,
    });
    expect(asset.Skip).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Noise field transforms
// ---------------------------------------------------------------------------

describe("noise field transforms", () => {
  it("converts Frequency → Scale (1/Freq) for SimplexNoise2D", () => {
    const result = internalToHytale({ Type: "SimplexNoise2D", Frequency: 0.01, Amplitude: 1, Seed: "A" });
    expect(result.Scale).toBe(100);
    expect(result.Frequency).toBeUndefined();
    // Amplitude is stripped (not a valid Hytale noise field)
    expect(result.Amplitude).toBeUndefined();
  });

  it("converts Gain → Persistence", () => {
    const result = internalToHytale({ Type: "SimplexNoise2D", Frequency: 0.01, Gain: 0.5, Seed: "A" });
    expect(result.Persistence).toBe(0.5);
    expect(result.Gain).toBeUndefined();
  });

  it("reverses Scale → Frequency on import", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "SimplexNoise2DDensityNode-123",
      Type: "SimplexNoise2D",
      Scale: 100,
      Seed: "B",
    });
    expect(asset.Frequency).toBeCloseTo(0.01);
    expect(asset.Scale).toBeUndefined();
  });

  it("reverses Persistence → Gain on import", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "SimplexNoise2DDensityNode-123",
      Type: "SimplexNoise2D",
      Scale: 100,
      Persistence: 0.5,
    });
    expect(asset.Gain).toBe(0.5);
    expect(asset.Persistence).toBeUndefined();
  });

  it("converts Frequency → ScaleXZ/ScaleY for SimplexNoise3D", () => {
    const result = internalToHytale({ Type: "SimplexNoise3D", Frequency: 0.05, Seed: "A" });
    expect(result.ScaleXZ).toBe(20);
    expect(result.ScaleY).toBe(20);
    expect(result.Frequency).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Named inputs ↔ Inputs[] array
// ---------------------------------------------------------------------------

describe("named inputs ↔ Inputs[] array", () => {
  it("converts named Input to Inputs[0] on export", () => {
    const result = internalToHytale({
      Type: "Negate",
      Input: { Type: "Constant", Value: 1 },
    });
    expect(result.Type).toBe("Inverter");
    expect(Array.isArray(result.Inputs)).toBe(true);
    const inputs = result.Inputs as Record<string, unknown>[];
    expect(inputs).toHaveLength(1);
    expect(inputs[0].Type).toBe("Constant");
    expect(result.Input).toBeUndefined();
  });

  it("converts InputA/InputB/Factor to Inputs[0,1,2] for Blend", () => {
    const result = internalToHytale({
      Type: "Blend",
      InputA: { Type: "Constant", Value: 0 },
      InputB: { Type: "Constant", Value: 1 },
      Factor: { Type: "Constant", Value: 0.5 },
    });
    expect(result.Type).toBe("Mix");
    const inputs = result.Inputs as Record<string, unknown>[];
    expect(inputs).toHaveLength(3);
    expect(inputs[0].Value).toBe(0);
    expect(inputs[1].Value).toBe(1);
    expect(inputs[2].Value).toBe(0.5);
  });

  it("reverses Inputs[0] → Input for Inverter on import", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "InverterDensityNode-123",
      Type: "Inverter",
      Inputs: [
        { $NodeId: "ConstantDensityNode-456", Type: "Constant", Value: 5, Skip: false },
      ],
      Skip: false,
    });
    expect(asset.Type).toBe("Negate");
    expect(asset.Input).toBeDefined();
    expect((asset.Input as Record<string, unknown>).Type).toBe("Constant");
    expect(asset.Inputs).toBeUndefined();
  });

  it("reverses Inputs[0,1,2] → InputA/InputB/Factor for Mix on import", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "Mix.Density-123",
      Type: "Mix",
      Inputs: [
        { $NodeId: "c1", Type: "Constant", Value: 0, Skip: false },
        { $NodeId: "c2", Type: "Constant", Value: 1, Skip: false },
        { $NodeId: "c3", Type: "Constant", Value: 0.5, Skip: false },
      ],
      Skip: false,
    });
    expect(asset.Type).toBe("Blend");
    expect(asset.InputA).toBeDefined();
    expect(asset.InputB).toBeDefined();
    expect(asset.Factor).toBeDefined();
    expect(asset.Inputs).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Clamp field renames
// ---------------------------------------------------------------------------

describe("clamp field renames", () => {
  it("maps Min/Max → WallA/WallB on export (Min→WallB, Max→WallA)", () => {
    const result = internalToHytale({ Type: "Clamp", Min: 0, Max: 1 });
    expect(result.WallA).toBe(1);
    expect(result.WallB).toBe(0);
    expect(result.Min).toBeUndefined();
    expect(result.Max).toBeUndefined();
  });

  it("maps WallA/WallB → Min/Max on import (WallA→Max, WallB→Min)", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "ClampDensityNode-123",
      Type: "Clamp",
      WallA: -1,
      WallB: 1,
      Skip: false,
    });
    expect(asset.Min).toBe(1);
    expect(asset.Max).toBe(-1);
    expect(asset.WallA).toBeUndefined();
    expect(asset.WallB).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Smooth* field renames (Smoothness→Range, Threshold→SmoothRange)
// ---------------------------------------------------------------------------

describe("smooth field renames", () => {
  it("exports SmoothClamp Smoothness as Range", () => {
    const result = internalToHytale({ Type: "SmoothClamp", Min: 0, Max: 1, Smoothness: 0.1 });
    expect(result.Range).toBe(0.1);
    expect(result.Smoothness).toBeUndefined();
  });

  it("exports SmoothMin Smoothness as Range", () => {
    const result = internalToHytale({ Type: "SmoothMin", Smoothness: 0.2 });
    expect(result.Range).toBe(0.2);
    expect(result.Smoothness).toBeUndefined();
  });

  it("exports SmoothMax Smoothness as Range", () => {
    const result = internalToHytale({ Type: "SmoothMax", Smoothness: 0.3 });
    expect(result.Range).toBe(0.3);
    expect(result.Smoothness).toBeUndefined();
  });

  it("exports SmoothFloor Threshold as SmoothRange", () => {
    const result = internalToHytale({ Type: "SmoothFloor", Threshold: 0.5, Smoothness: 0.1 });
    expect(result.SmoothRange).toBe(0.5);
    expect(result.Threshold).toBeUndefined();
    // SmoothFloor also renames Smoothness → Range
    expect(result.Range).toBe(0.1);
    expect(result.Smoothness).toBeUndefined();
  });

  it("exports SmoothCeiling Threshold as SmoothRange", () => {
    const result = internalToHytale({ Type: "SmoothCeiling", Threshold: 0.8, Smoothness: 0.15 });
    expect(result.SmoothRange).toBe(0.8);
    expect(result.Threshold).toBeUndefined();
    // SmoothCeiling also renames Smoothness → Range
    expect(result.Range).toBe(0.15);
    expect(result.Smoothness).toBeUndefined();
  });

  it("imports Range back as Smoothness for SmoothClamp", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "SmoothClampDensityNode-123",
      Type: "SmoothClamp",
      WallA: 1,
      WallB: 0,
      Range: 0.1,
      Skip: false,
    });
    expect(asset.Smoothness).toBe(0.1);
    expect(asset.Range).toBeUndefined();
  });

  it("imports SmoothRange back as Threshold for SmoothFloor", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "SmoothFloorDensityNode-123",
      Type: "SmoothFloor",
      SmoothRange: 0.5,
      Range: 0.1,
      Skip: false,
    });
    expect(asset.Threshold).toBe(0.5);
    expect(asset.SmoothRange).toBeUndefined();
    expect(asset.Smoothness).toBe(0.1);
    expect(asset.Range).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Normalizer field flattening
// ---------------------------------------------------------------------------

describe("normalizer field flattening", () => {
  it("flattens SourceRange/TargetRange → FromMin/FromMax/ToMin/ToMax on export", () => {
    const result = internalToHytale({
      Type: "Normalizer",
      SourceRange: { Min: -1, Max: 1 },
      TargetRange: { Min: 0, Max: 1 },
    });
    expect(result.FromMin).toBe(-1);
    expect(result.FromMax).toBe(1);
    expect(result.ToMin).toBe(0);
    expect(result.ToMax).toBe(1);
    expect(result.SourceRange).toBeUndefined();
    expect(result.TargetRange).toBeUndefined();
  });

  it("rebuilds nested ranges from flat fields on import", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "NormalizerDensityNode-123",
      Type: "Normalizer",
      FromMin: -1,
      FromMax: 1,
      ToMin: 0,
      ToMax: 1,
      Skip: false,
    });
    expect(asset.SourceRange).toEqual({ Min: -1, Max: 1 });
    expect(asset.TargetRange).toEqual({ Min: 0, Max: 1 });
  });
});

// ---------------------------------------------------------------------------
// Position transform fields
// ---------------------------------------------------------------------------

describe("position transform fields", () => {
  it("flattens Scale vector for ScaledPosition export", () => {
    const result = internalToHytale({ Type: "ScaledPosition", Scale: { x: 2, y: 3, z: 4 } });
    expect(result.Type).toBe("Scale");
    expect(result.ScaleX).toBe(2);
    expect(result.ScaleY).toBe(3);
    expect(result.ScaleZ).toBe(4);
    expect(result.Scale).toBeUndefined();
  });

  it("flattens Translation vector for TranslatedPosition export", () => {
    const result = internalToHytale({ Type: "TranslatedPosition", Translation: { x: 10, y: 20, z: 30 } });
    expect(result.Type).toBe("Slider");
    expect(result.SlideX).toBe(10);
    expect(result.SlideY).toBe(20);
    expect(result.SlideZ).toBe(30);
  });

  it("reverses Scale flat fields on import", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "Scale.Density-123",
      Type: "Scale",
      ScaleX: 2,
      ScaleY: 3,
      ScaleZ: 4,
      Inputs: [],
      Skip: false,
    });
    expect(asset.Type).toBe("ScaledPosition");
    expect(asset.Scale).toEqual({ x: 2, y: 3, z: 4 });
  });

  it("reverses Slider flat fields on import", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "Slider.Density-123",
      Type: "Slider",
      SlideX: 10,
      SlideY: 20,
      SlideZ: 30,
      Inputs: [],
      Skip: false,
    });
    expect(asset.Type).toBe("TranslatedPosition");
    expect(asset.Translation).toEqual({ x: 10, y: 20, z: 30 });
  });
});

// ---------------------------------------------------------------------------
// DomainWarp ↔ FastGradientWarp
// ---------------------------------------------------------------------------

describe("DomainWarp ↔ FastGradientWarp", () => {
  it("maps Amplitude → WarpFactor on export", () => {
    const result = internalToHytale({ Type: "DomainWarp2D", Amplitude: 5 });
    expect(result.Type).toBe("FastGradientWarp");
    expect(result.WarpFactor).toBe(5);
    expect(result.Amplitude).toBeUndefined();
  });

  it("adds default warp params on export", () => {
    const result = internalToHytale({ Type: "DomainWarp2D", Amplitude: 1 });
    expect(result.WarpScale).toBe(1.0);
    expect(result.WarpOctaves).toBe(1);
  });

  it("preserves FastGradientWarp fields on import", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "FastGradientWarp.Density-123",
      Type: "FastGradientWarp",
      WarpFactor: 5,
      WarpScale: 1,
      WarpOctaves: 1,
      WarpLacunarity: 2,
      WarpPersistence: 0.5,
      Seed: "A",
      Inputs: [],
      Skip: false,
    });
    expect(asset.Type).toBe("FastGradientWarp");
    expect(asset.WarpFactor).toBe(5);
    expect(asset.WarpScale).toBe(1);
    expect(asset.WarpOctaves).toBe(1);
    expect(asset.WarpLacunarity).toBe(2);
    expect(asset.WarpPersistence).toBe(0.5);
    expect(asset.WarpSeed).toBe("A");
    expect(asset.Seed).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// LinearTransform ↔ AmplitudeConstant
// ---------------------------------------------------------------------------

describe("LinearTransform ↔ AmplitudeConstant", () => {
  it("maps Scale → Value on export", () => {
    const result = internalToHytale({ Type: "LinearTransform", Scale: 2, Offset: 0 });
    expect(result.Type).toBe("AmplitudeConstant");
    expect(result.Value).toBe(2);
    expect(result.Scale).toBeUndefined();
    expect(result.Offset).toBeUndefined();
  });

  it("maps Value → Scale on import", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "AmplitudeConstantDensityNode-123",
      Type: "AmplitudeConstant",
      Value: 3,
      Inputs: [],
      Skip: false,
    });
    expect(asset.Type).toBe("LinearTransform");
    expect(asset.Scale).toBe(3);
    expect(asset.Offset).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// BlendCurve ↔ MultiMix
// ---------------------------------------------------------------------------

describe("BlendCurve ↔ MultiMix", () => {
  it("maps InputA/InputB/Factor to Inputs[0,1,2] and preserves Curve on export", () => {
    const result = internalToHytale({
      Type: "BlendCurve",
      InputA: { Type: "Constant", Value: 0 },
      InputB: { Type: "Constant", Value: 1 },
      Factor: { Type: "Constant", Value: 0.5 },
      Curve: { Type: "Manual", Points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
    });
    expect(result.Type).toBe("MultiMix");
    expect((result.$NodeId as string).startsWith("MultiMix.Density-")).toBe(true);
    const inputs = result.Inputs as Record<string, unknown>[];
    expect(inputs).toHaveLength(3);
    expect(inputs[0].Value).toBe(0);
    expect(inputs[1].Value).toBe(1);
    expect(inputs[2].Value).toBe(0.5);
    expect(result.Curve).toBeDefined();
    expect(result.InputA).toBeUndefined();
    expect(result.InputB).toBeUndefined();
    expect(result.Factor).toBeUndefined();
  });

  it("reverses Inputs[0,1,2] → InputA/InputB/Factor on import", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "MultiMix.Density-123",
      Type: "MultiMix",
      Inputs: [
        { $NodeId: "c1", Type: "Constant", Value: 0, Skip: false },
        { $NodeId: "c2", Type: "Constant", Value: 1, Skip: false },
        { $NodeId: "c3", Type: "Constant", Value: 0.5, Skip: false },
      ],
      Curve: { Type: "Manual", Points: [{ $NodeId: "p1", In: 0, Out: 0 }, { $NodeId: "p2", In: 1, Out: 1 }] },
      Skip: false,
    });
    expect(asset.Type).toBe("BlendCurve");
    expect(asset.InputA).toBeDefined();
    expect(asset.InputB).toBeDefined();
    expect(asset.Factor).toBeDefined();
    expect(asset.Inputs).toBeUndefined();
    expect((asset.InputA as Record<string, unknown>).Type).toBe("Constant");
    expect((asset.InputB as Record<string, unknown>).Type).toBe("Constant");
    expect((asset.Factor as Record<string, unknown>).Type).toBe("Constant");
  });

  it("round-trips BlendCurve (MultiMix) with three inputs and curve", () => {
    const original = {
      Type: "BlendCurve",
      InputA: { Type: "Constant", Value: 0 },
      InputB: { Type: "Constant", Value: 1 },
      Factor: { Type: "Constant", Value: 0.5 },
      Curve: { Type: "Manual", Points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
    };
    const exported = internalToHytale(original);
    expect(exported.Type).toBe("MultiMix");
    const { asset: imported } = hytaleToInternal(exported);
    expect(imported.Type).toBe("BlendCurve");
    expect((imported.InputA as Record<string, unknown>).Value).toBe(0);
    expect((imported.InputB as Record<string, unknown>).Value).toBe(1);
    expect((imported.Factor as Record<string, unknown>).Value).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// Curve points
// ---------------------------------------------------------------------------

describe("curve points", () => {
  it("converts {x,y} → {$NodeId, In, Out} on export", () => {
    const result = internalToHytale({
      Type: "CurveFunction",
      Curve: {
        Type: "Manual",
        Points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      },
    });
    // The Curve sub-asset should have transformed points
    const curve = result.Curve as Record<string, unknown>;
    const points = curve.Points as Record<string, unknown>[];
    expect(points).toHaveLength(2);
    expect(points[0].In).toBe(0);
    expect(points[0].Out).toBe(0);
    expect(points[0].$NodeId).toBeDefined();
    expect(points[1].In).toBe(1);
    expect(points[1].Out).toBe(1);
  });

  it("converts {In, Out} → {x, y} on import", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "ManualCurve-123",
      Type: "Manual",
      Points: [
        { $NodeId: "CurvePoint-1", In: 0, Out: 0 },
        { $NodeId: "CurvePoint-2", In: 1, Out: 1 },
      ],
    });
    const points = asset.Points as Record<string, unknown>[];
    expect(points).toHaveLength(2);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[1]).toEqual({ x: 1, y: 1 });
  });

  it("flattens Blend curve to Manual on export", () => {
    const result = internalToHytale({
      Type: "CurveFunction",
      Curve: {
        Type: "Blend",
        InputA: {
          Type: "Manual",
          Points: [[0, 0], [0.5, 0.2], [1, 1]],
        },
        InputB: {
          Type: "Manual",
          Points: [[0, 0], [0.5, 0.8], [1, 1]],
        },
      },
    });
    const curve = result.Curve as Record<string, unknown>;
    expect(curve.Type).toBe("Manual");
    // Should have merged points with averaged Y values
    const points = curve.Points as Record<string, unknown>[];
    expect(points.length).toBeGreaterThanOrEqual(3);
    // At x=0.5, average of 0.2 and 0.8 = 0.5
    const mid = points.find((p) => p.In === 0.5);
    expect(mid).toBeDefined();
    expect(mid!.Out).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// Material string ↔ object
// ---------------------------------------------------------------------------

describe("material string ↔ object", () => {
  it("wraps material string as {$NodeId, Solid} on export", () => {
    const result = internalToHytale({ Type: "Constant", Material: "Rock_Lime_Cobble" });
    const mat = result.Material as Record<string, unknown>;
    expect(mat.Solid).toBe("Rock_Lime_Cobble");
    expect(mat.$NodeId).toBeDefined();
  });

  it("unwraps {Solid: name} to string on import", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "ConstantMaterialProvider-123",
      Type: "Constant",
      Material: {
        $NodeId: "Material-456",
        Solid: "Rock_Lime_Cobble",
      },
    });
    expect(asset.Material).toBe("Rock_Lime_Cobble");
  });
});

// ---------------------------------------------------------------------------
// Directionality: Uniform ↔ Random
// ---------------------------------------------------------------------------

describe("directionality transforms", () => {
  it("maps Uniform → Random with Seed and Pattern on export", () => {
    const result = internalToHytale({
      Type: "Prefab",
      Path: "props/crystal/void_spire_large",
      Directionality: { Type: "Uniform" },
    });
    const dir = result.Directionality as Record<string, unknown>;
    expect(dir.Type).toBe("Random");
    expect(dir.Seed).toBe("A");
    expect(dir.Pattern).toBeDefined();
    const pattern = dir.Pattern as Record<string, unknown>;
    expect(pattern.Type).toBe("Floor");
    // Directionality types don't have Skip in Hytale
    expect(dir.Skip).toBeUndefined();
  });

  it("maps Random → Uniform on import, stripping Seed/Pattern", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "Prefab.Prop-123",
      Type: "Prefab",
      Skip: false,
      Directionality: {
        $NodeId: "Random.Directionality-456",
        Type: "Random",
        Skip: false,
        Seed: "A",
        Pattern: {
          $NodeId: "Floor.Pattern-789",
          Type: "Floor",
          Skip: false,
        },
      },
    });
    const dir = asset.Directionality as Record<string, unknown>;
    expect(dir.Type).toBe("Uniform");
    expect(dir.Seed).toBeUndefined();
    expect(dir.Pattern).toBeUndefined();
  });

  it("round-trips Uniform directionality through export → import", () => {
    const original = {
      Type: "Prefab",
      Path: "props/crystal/void_spire",
      Directionality: { Type: "Uniform" },
    };
    const exported = internalToHytale(original);
    const dir = exported.Directionality as Record<string, unknown>;
    expect(dir.Type).toBe("Random");

    const { asset: imported } = hytaleToInternal(exported);
    const importedDir = imported.Directionality as Record<string, unknown>;
    expect(importedDir.Type).toBe("Uniform");
  });
});

// ---------------------------------------------------------------------------
// DensityBased → FieldFunction position transforms
// ---------------------------------------------------------------------------

describe("DensityBased → FieldFunction position transforms", () => {
  it("exports DensityBased as FieldFunction with renamed fields", () => {
    const result = internalToHytale({
      Type: "Prefab",
      Positions: {
        Type: "DensityBased",
        Threshold: 0.72,
        DensityFunction: { Type: "Abs", Inputs: [{ Type: "SimplexNoise2D", Frequency: 0.004, Seed: "A" }] },
      },
    });
    const positions = result.Positions as Record<string, unknown>;
    expect(positions.Type).toBe("FieldFunction");
    // DensityFunction should be renamed to FieldFunction
    expect(positions.FieldFunction).toBeDefined();
    expect(positions.DensityFunction).toBeUndefined();
    // PositionProvider should be renamed to Positions and auto-added
    const posProv = positions.Positions as Record<string, unknown>;
    expect(posProv).toBeDefined();
    expect(posProv.Type).toBe("Mesh2D");
    // Mesh2D should have PointGenerator nesting
    expect(posProv.PointGenerator).toBeDefined();
    const pg = posProv.PointGenerator as Record<string, unknown>;
    expect(pg.Type).toBe("Mesh");
    expect(pg.ScaleX).toBe(8);
    expect(pg.ScaleY).toBe(8);
    expect(pg.ScaleZ).toBe(8);
    expect(pg.Jitter).toBe(0.4);
    // Threshold should be converted to Delimiters array
    expect(positions.Threshold).toBeUndefined();
    const delimiters = positions.Delimiters as Record<string, unknown>[];
    expect(delimiters).toHaveLength(1);
    expect(delimiters[0].Min).toBe(0.72);
  });

  it("leaves existing FieldFunction positions unmodified (no false transforms)", () => {
    const result = internalToHytale({
      Type: "Prefab",
      Positions: {
        Type: "FieldFunction",
        Threshold: 0.55,
        FieldFunction: { Type: "SimplexNoise2D", Frequency: 0.01, Seed: "B" },
        PositionProvider: { Type: "Mesh2D", Resolution: 12, Jitter: 0.4 },
      },
    });
    const positions = result.Positions as Record<string, unknown>;
    expect(positions.Type).toBe("FieldFunction");
    expect(positions.FieldFunction).toBeDefined();
    // PositionProvider renamed to Positions; original Resolution preserved via PointGenerator
    const posProv = positions.Positions as Record<string, unknown>;
    expect(posProv.Type).toBe("Mesh2D");
    const pg = posProv.PointGenerator as Record<string, unknown>;
    expect(pg.ScaleX).toBe(12); // original value preserved, not overwritten to 8
  });

  it("round-trips DensityBased → FieldFunction correctly on export", () => {
    const original = {
      Type: "DensityBased",
      Threshold: 0.72,
      DensityFunction: { Type: "Constant", Value: 1 },
    };
    // Simulate position context by calling internalToHytale on the Positions sub-tree
    // (in a real biome, this is called with category "position" from internalToHytaleBiome)
    // const exported = internalToHytale(original);
    // Since default category is density, let's test via a prop wrapper
    const wrapper = internalToHytale({
      Type: "Prefab",
      Positions: original,
    });
    const positions = wrapper.Positions as Record<string, unknown>;
    expect(positions.Type).toBe("FieldFunction");
    expect(positions.FieldFunction).toBeDefined();
    expect(positions.DensityFunction).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Context-aware Conditional mapping
// ---------------------------------------------------------------------------

describe("context-aware Conditional mapping", () => {
  it("exports Conditional as Mix in density context", () => {
    const biome = internalToHytaleBiome({
      Name: "test",
      Terrain: {
        Density: {
          Type: "Conditional",
          Threshold: 0.5,
          Condition: { Type: "Constant", Value: 1 },
          TrueInput: { Type: "Constant", Value: 0.8 },
          FalseInput: { Type: "Constant", Value: 0 },
        },
      },
    });
    const terrain = biome.Terrain as Record<string, unknown>;
    const density = terrain.Density as Record<string, unknown>;
    expect(density.Type).toBe("Mix");
    expect(density.$Comment).toBe("Conditional(Threshold=0.5)");
    // Should have 3 Inputs: FalseInput, TrueInput, StepFactor
    const inputs = density.Inputs as Record<string, unknown>[];
    expect(inputs).toHaveLength(3);
    // Inputs[0] = FalseInput (Constant Value=0)
    expect(inputs[0].Type).toBe("Constant");
    expect(inputs[0].Value).toBe(0);
    // Inputs[1] = TrueInput (Constant Value=0.8)
    expect(inputs[1].Type).toBe("Constant");
    expect(inputs[1].Value).toBe(0.8);
    // Inputs[2] = Clamp (step factor)
    expect(inputs[2].Type).toBe("Clamp");
  });

  it("exports material Conditional as Solidity-wrapped Queue[FieldFunction] with single entry + fallback", () => {
    const biome = internalToHytaleBiome({
      Name: "test",
      MaterialProvider: {
        Type: "Conditional",
        Threshold: 0.7,
        Condition: { Type: "SimplexNoise2D", Frequency: 0.01, Seed: "A" },
        TrueInput: { Type: "Constant", Material: "Rock_Lime_Cobble" },
        FalseInput: { Type: "Constant", Material: "Dirt" },
      },
    });
    const solidity = biome.MaterialProvider as Record<string, unknown>;
    expect(solidity.Type).toBe("Solidity");
    const mat = solidity.Solid as Record<string, unknown>;
    expect(mat.Type).toBe("Queue");
    const queue = mat.Queue as Record<string, unknown>[];
    expect(queue).toHaveLength(2);
    // First entry: FieldFunction with Delimiters
    expect(queue[0].Type).toBe("FieldFunction");
    const delimiters = queue[0].Delimiters as Record<string, unknown>[];
    expect(delimiters).toHaveLength(1);
    expect(delimiters[0].From).toBe(0.7);
    expect(delimiters[0].To).toBe(1000);
    // Fallback entry
    expect(queue[1].Type).toBe("Constant");
  });

  it("imports Mix with Conditional comment as Conditional in density context", () => {
    const { wrapper } = hytaleToInternalBiome({
      $NodeId: "Biome-123",
      Name: "test",
      Terrain: {
        $NodeId: "Terrain-123",
        Density: {
          $NodeId: "Mix.Density-123",
          Type: "Mix",
          $Comment: "Conditional(Threshold=0.5)",
          Inputs: [
            { $NodeId: "ConstantDensityNode-1", Type: "Constant", Value: 0, Skip: false },
            { $NodeId: "ConstantDensityNode-2", Type: "Constant", Value: 0.8, Skip: false },
            {
              $NodeId: "ClampDensityNode-3", Type: "Clamp", WallA: 0, WallB: 1, Skip: false,
              Inputs: [{
                $NodeId: "MultiplierDensityNode-4", Type: "Multiplier", Skip: false,
                Inputs: [
                  {
                    $NodeId: "SumDensityNode-5", Type: "Sum", Skip: false,
                    Inputs: [
                      { $NodeId: "ConstantDensityNode-6", Type: "Constant", Value: 1, Skip: false },
                      { $NodeId: "ConstantDensityNode-7", Type: "Constant", Value: -0.5, Skip: false },
                    ],
                  },
                  { $NodeId: "ConstantDensityNode-8", Type: "Constant", Value: 10000, Skip: false },
                ],
              }],
            },
          ],
          Skip: false,
        },
      },
    });
    const terrain = wrapper.Terrain as Record<string, unknown>;
    const density = terrain.Density as Record<string, unknown>;
    expect(density.Type).toBe("Conditional");
    expect(density.Threshold).toBe(0.5);
    // Condition recovered from step function
    expect(density.Condition).toBeDefined();
    expect((density.Condition as Record<string, unknown>).Type).toBe("Constant");
    expect((density.Condition as Record<string, unknown>).Value).toBe(1);
    // TrueInput and FalseInput recovered
    expect(density.TrueInput).toBeDefined();
    expect((density.TrueInput as Record<string, unknown>).Value).toBe(0.8);
    expect(density.FalseInput).toBeDefined();
    expect((density.FalseInput as Record<string, unknown>).Value).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// SimplexRidgeNoise compound transform
// ---------------------------------------------------------------------------

describe("SimplexRidgeNoise compound transform", () => {
  it("exports SimplexRidgeNoise2D as Abs wrapping SimplexNoise2D", () => {
    const result = internalToHytale({
      Type: "SimplexRidgeNoise2D",
      Frequency: 0.01,
      Seed: "A",
      Octaves: 3,
    });
    expect(result.Type).toBe("Abs");
    expect(Array.isArray(result.Inputs)).toBe(true);
    const inputs = result.Inputs as Record<string, unknown>[];
    expect(inputs).toHaveLength(1);
    expect(inputs[0].Type).toBe("SimplexNoise2D");
    // Noise field transforms should be applied to inner node
    expect(inputs[0].Scale).toBe(100); // 1/0.01
    expect(inputs[0].Octaves).toBe(3);
    expect(inputs[0].Frequency).toBeUndefined();
  });

  it("exports SimplexRidgeNoise3D as Abs wrapping SimplexNoise3D", () => {
    const result = internalToHytale({
      Type: "SimplexRidgeNoise3D",
      Frequency: 0.05,
      Seed: "B",
    });
    expect(result.Type).toBe("Abs");
    const inputs = result.Inputs as Record<string, unknown>[];
    expect(inputs).toHaveLength(1);
    expect(inputs[0].Type).toBe("SimplexNoise3D");
    expect(inputs[0].ScaleXZ).toBe(20); // 1/0.05
  });

  it("imports Abs(SimplexNoise2D) as SimplexRidgeNoise2D", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "AbsDensityNode-123",
      Type: "Abs",
      Inputs: [
        {
          $NodeId: "SimplexNoise2DDensityNode-456",
          Type: "SimplexNoise2D",
          Scale: 100,
          Seed: "A",
          Octaves: 3,
          Skip: false,
        },
      ],
      Skip: false,
    });
    expect(asset.Type).toBe("SimplexRidgeNoise2D");
    expect(asset.Frequency).toBeCloseTo(0.01);
    expect(asset.Octaves).toBe(3);
  });

  it("round-trips SimplexRidgeNoise2D through export → import", () => {
    const original = {
      Type: "SimplexRidgeNoise2D",
      Frequency: 0.02,
      Seed: "C",
      Octaves: 4,
    };
    const exported = internalToHytale(original);
    expect(exported.Type).toBe("Abs");

    const { asset: imported } = hytaleToInternal(exported);
    expect(imported.Type).toBe("SimplexRidgeNoise2D");
    expect(imported.Frequency).toBeCloseTo(0.02);
    expect(imported.Seed).toBe("C");
    expect(imported.Octaves).toBe(4);
  });

  it("does not collapse Abs with non-SimplexNoise input", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "AbsDensityNode-123",
      Type: "Abs",
      Inputs: [
        {
          $NodeId: "ConstantDensityNode-456",
          Type: "Constant",
          Value: -5,
          Skip: false,
        },
      ],
      Skip: false,
    });
    expect(asset.Type).toBe("Abs");
    expect(asset.Input).toBeDefined();
    expect((asset.Input as Record<string, unknown>).Type).toBe("Constant");
  });
});

// ---------------------------------------------------------------------------
// Round-trip: internal → hytale → internal
// ---------------------------------------------------------------------------

describe("round-trip: internal → hytale → internal", () => {
  it("round-trips a simple Constant", () => {
    const original = { Type: "Constant", Value: 42 };
    const exported = internalToHytale(original);
    const { asset: imported } = hytaleToInternal(exported);
    expect(imported.Type).toBe(original.Type);
    expect(imported.Value).toBe(original.Value);
  });

  it("round-trips Clamp with nested input", () => {
    const original = {
      Type: "Clamp",
      Min: -1,
      Max: 1,
      Input: { Type: "Constant", Value: 0.5 },
    };
    const exported = internalToHytale(original);
    const { asset: imported } = hytaleToInternal(exported);
    expect(imported.Type).toBe("Clamp");
    expect(imported.Min).toBe(-1);
    expect(imported.Max).toBe(1);
    expect((imported.Input as Record<string, unknown>).Type).toBe("Constant");
    expect((imported.Input as Record<string, unknown>).Value).toBe(0.5);
  });

  it("round-trips Blend (Mix) with three inputs", () => {
    const original = {
      Type: "Blend",
      InputA: { Type: "Constant", Value: 0 },
      InputB: { Type: "Constant", Value: 1 },
      Factor: { Type: "Constant", Value: 0.5 },
    };
    const exported = internalToHytale(original);
    expect(exported.Type).toBe("Mix");
    const { asset: imported } = hytaleToInternal(exported);
    expect(imported.Type).toBe("Blend");
    expect((imported.InputA as Record<string, unknown>).Value).toBe(0);
    expect((imported.InputB as Record<string, unknown>).Value).toBe(1);
    expect((imported.Factor as Record<string, unknown>).Value).toBe(0.5);
  });

  it("round-trips Normalizer with range flattening", () => {
    const original = {
      Type: "Normalizer",
      SourceRange: { Min: -1, Max: 1 },
      TargetRange: { Min: 0, Max: 1 },
      Input: { Type: "Constant", Value: 0 },
    };
    const exported = internalToHytale(original);
    expect(exported.FromMin).toBe(-1);
    const { asset: imported } = hytaleToInternal(exported);
    expect(imported.SourceRange).toEqual({ Min: -1, Max: 1 });
    expect(imported.TargetRange).toEqual({ Min: 0, Max: 1 });
  });

  it("round-trips noise with frequency/scale inversion", () => {
    const original = {
      Type: "SimplexNoise2D",
      Frequency: 0.02,
      Seed: "B",
      Gain: 0.6,
    };
    const exported = internalToHytale(original);
    expect(exported.Scale).toBe(50);
    expect(exported.Persistence).toBe(0.6);
    // Amplitude should be stripped
    expect(exported.Amplitude).toBeUndefined();
    const { asset: imported } = hytaleToInternal(exported);
    expect(imported.Frequency).toBeCloseTo(0.02);
    expect(imported.Gain).toBe(0.6);
    expect(imported.Seed).toBe("B");
  });
});

// ---------------------------------------------------------------------------
// EnvironmentProvider and TintProvider transforms
// ---------------------------------------------------------------------------

describe("EnvironmentProvider and TintProvider transforms", () => {
  it("exports Default environment as Constant with Environment field", () => {
    const biome = internalToHytaleBiome({
      Name: "test_biome",
      EnvironmentProvider: { Type: "Default" },
    });
    const env = biome.EnvironmentProvider as Record<string, unknown>;
    expect(env.Type).toBe("Constant");
    expect(env.Environment).toBe("default");
  });

  it("exports Gradient tint as Constant with Color from From field", () => {
    const biome = internalToHytaleBiome({
      Name: "test_biome",
      TintProvider: { Type: "Gradient", From: "#6b1a8f", To: "#0d1f3d" },
    });
    const tint = biome.TintProvider as Record<string, unknown>;
    expect(tint.Type).toBe("Constant");
    expect(tint.Color).toBe("#6b1a8f");
    expect(tint.From).toBeUndefined();
    expect(tint.To).toBeUndefined();
  });

  it("imports Constant environment as Default, stripping Environment field", () => {
    const { wrapper } = hytaleToInternalBiome({
      $NodeId: "Biome-123",
      Name: "test_biome",
      EnvironmentProvider: {
        $NodeId: "Constant.EnvironmentProvider-456",
        Type: "Constant",
        Environment: "default",
        Skip: false,
      },
    });
    const env = wrapper.EnvironmentProvider as Record<string, unknown>;
    expect(env.Type).toBe("Default");
    expect(env.Environment).toBeUndefined();
  });

  it("passes Constant tint through unchanged on import", () => {
    const { wrapper } = hytaleToInternalBiome({
      $NodeId: "Biome-123",
      Name: "test_biome",
      TintProvider: {
        $NodeId: "Constant.TintProvider-456",
        Type: "Constant",
        Color: "#6b1a8f",
        Skip: false,
      },
    });
    const tint = wrapper.TintProvider as Record<string, unknown>;
    expect(tint.Type).toBe("Constant");
    expect(tint.Color).toBe("#6b1a8f");
  });

  it("passes Constant tint through unchanged on export", () => {
    const biome = internalToHytaleBiome({
      Name: "test_biome",
      TintProvider: { Type: "Constant", Color: "#7CFC00" },
    });
    const tint = biome.TintProvider as Record<string, unknown>;
    expect(tint.Type).toBe("Constant");
    expect(tint.Color).toBe("#7CFC00");
  });
});

// ---------------------------------------------------------------------------
// Material Conditional → Queue[FieldFunction] export
// ---------------------------------------------------------------------------

describe("material Conditional → Queue[FieldFunction] export", () => {
  it("exports nested material Conditional chain as Solidity-wrapped Queue with N FieldFunctions + fallback", () => {
    const biome = internalToHytaleBiome({
      Name: "test",
      MaterialProvider: {
        Type: "Conditional",
        Threshold: 0.7,
        Condition: { Type: "SimplexNoise2D", Frequency: 0.004, Seed: "A" },
        TrueInput: { Type: "Constant", Material: "Rock_Lime_Cobble" },
        FalseInput: {
          Type: "Conditional",
          Threshold: 0.45,
          Condition: { Type: "VoronoiNoise2D", Frequency: 0.01, Seed: "B" },
          TrueInput: { Type: "Constant", Material: "Sand" },
          FalseInput: {
            Type: "Conditional",
            Threshold: 0.4,
            Condition: { Type: "SimplexRidgeNoise2D", Frequency: 0.005, Seed: "C" },
            TrueInput: { Type: "Constant", Material: "Gravel" },
            FalseInput: { Type: "Constant", Material: "Dirt" },
          },
        },
      },
    });
    const solidity = biome.MaterialProvider as Record<string, unknown>;
    expect(solidity.Type).toBe("Solidity");
    const mat = solidity.Solid as Record<string, unknown>;
    expect(mat.Type).toBe("Queue");
    const queue = mat.Queue as Record<string, unknown>[];
    expect(queue).toHaveLength(4); // 3 FieldFunctions + 1 fallback

    // Each of the first 3 should be FieldFunction
    expect(queue[0].Type).toBe("FieldFunction");
    expect(queue[1].Type).toBe("FieldFunction");
    expect(queue[2].Type).toBe("FieldFunction");

    // Fallback should be Constant material
    expect(queue[3].Type).toBe("Constant");
  });

  it("uses correct $NodeId prefixes", () => {
    const biome = internalToHytaleBiome({
      Name: "test",
      MaterialProvider: {
        Type: "Conditional",
        Threshold: 0.5,
        Condition: { Type: "Constant", Value: 1 },
        TrueInput: { Type: "Constant", Material: "Rock" },
        FalseInput: { Type: "Constant", Material: "Dirt" },
      },
    });
    const solidity = biome.MaterialProvider as Record<string, unknown>;
    expect((solidity.$NodeId as string).startsWith("SolidityMaterialProvider-")).toBe(true);
    const mat = solidity.Solid as Record<string, unknown>;
    expect((mat.$NodeId as string).startsWith("QueueMaterialProvider-")).toBe(true);
    const queue = mat.Queue as Record<string, unknown>[];
    expect((queue[0].$NodeId as string).startsWith("FieldFunctionMaterialProvider-")).toBe(true);
    const delims = queue[0].Delimiters as Record<string, unknown>[];
    expect((delims[0].$NodeId as string).startsWith("DelimiterFieldFunctionMP-")).toBe(true);
  });

  it("transforms density functions within FieldFunction (SimplexRidgeNoise→Abs, VoronoiNoise→CellNoise, Frequency→Scale)", () => {
    const biome = internalToHytaleBiome({
      Name: "test",
      MaterialProvider: {
        Type: "Conditional",
        Threshold: 0.6,
        Condition: { Type: "SimplexRidgeNoise2D", Frequency: 0.01, Seed: "A" },
        TrueInput: { Type: "Constant", Material: "Rock" },
        FalseInput: {
          Type: "Conditional",
          Threshold: 0.3,
          Condition: { Type: "VoronoiNoise2D", Frequency: 0.05, Seed: "B" },
          TrueInput: { Type: "Constant", Material: "Sand" },
          FalseInput: { Type: "Constant", Material: "Dirt" },
        },
      },
    });
    const solidity = biome.MaterialProvider as Record<string, unknown>;
    const mat = solidity.Solid as Record<string, unknown>;
    const queue = mat.Queue as Record<string, unknown>[];

    // First FieldFunction: SimplexRidgeNoise2D → Abs(SimplexNoise2D)
    const ff1 = queue[0].FieldFunction as Record<string, unknown>;
    expect(ff1.Type).toBe("Abs");
    const ff1Inputs = ff1.Inputs as Record<string, unknown>[];
    expect(ff1Inputs[0].Type).toBe("SimplexNoise2D");
    expect(ff1Inputs[0].Scale).toBe(100); // 1/0.01

    // Second FieldFunction: VoronoiNoise2D → CellNoise2D
    const ff2 = queue[1].FieldFunction as Record<string, unknown>;
    expect(ff2.Type).toBe("CellNoise2D");
  });

  it("wraps material strings in Delimiter.Material as material objects", () => {
    const biome = internalToHytaleBiome({
      Name: "test",
      MaterialProvider: {
        Type: "Conditional",
        Threshold: 0.5,
        Condition: { Type: "Constant", Value: 1 },
        TrueInput: { Type: "Constant", Material: "Rock_Lime_Cobble" },
        FalseInput: { Type: "Constant", Material: "Dirt" },
      },
    });
    const solidity = biome.MaterialProvider as Record<string, unknown>;
    const mat = solidity.Solid as Record<string, unknown>;
    const queue = mat.Queue as Record<string, unknown>[];
    const delims = queue[0].Delimiters as Record<string, unknown>[];
    // The Material in TrueInput is a Constant material provider
    const delimMat = delims[0].Material as Record<string, unknown>;
    expect(delimMat.Type).toBe("Constant");
    // The wrapped material inside the Constant should be an object with Solid
    const innerMat = delimMat.Material as Record<string, unknown>;
    expect(innerMat.Solid).toBe("Rock_Lime_Cobble");
  });
});

// ---------------------------------------------------------------------------
// Prop Conditional → TrueInput (lossy)
// ---------------------------------------------------------------------------

describe("prop Conditional → TrueInput (lossy)", () => {
  it("exports prop Conditional as TrueInput Prefab directly", () => {
    const biome = internalToHytaleBiome({
      Name: "test",
      Props: [{
        Positions: { Type: "FieldFunction", Threshold: 0.5, FieldFunction: { Type: "Constant", Value: 1 }, PositionProvider: { Type: "Mesh2D", Resolution: 8, Jitter: 0.4 } },
        Prop: {
          Type: "Conditional",
          Threshold: 0.6,
          Condition: { Type: "Constant", Value: 1 },
          TrueInput: { Type: "Prefab", Path: "props/crystal/void_spire_large" },
          FalseInput: { Type: "Prefab", Path: "props/crystal/void_spire_small" },
        },
      }],
    });
    const props = biome.Props as Record<string, unknown>[];
    const prop = props[0].Prop as Record<string, unknown>;
    // Should emit TrueInput directly, not Conditional
    expect(prop.Type).toBe("Prefab");
    expect(prop.WeightedPrefabPaths).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Queue[FieldFunction] → Conditional chain import
// ---------------------------------------------------------------------------

describe("Queue[FieldFunction] → Conditional chain import", () => {
  it("imports Queue[FieldFunction] as nested Conditional chain", () => {
    const { wrapper } = hytaleToInternalBiome({
      $NodeId: "Biome-123",
      Name: "test",
      MaterialProvider: {
        $NodeId: "QueueMaterialProvider-123",
        Type: "Queue",
        Skip: false,
        Queue: [
          {
            $NodeId: "FieldFunctionMaterialProvider-1",
            Type: "FieldFunction",
            Skip: false,
            FieldFunction: {
              $NodeId: "SimplexNoise2DDensityNode-1",
              Type: "SimplexNoise2D",
              Scale: 250,
              Seed: "A",
              Skip: false,
            },
            Delimiters: [{
              $NodeId: "DelimiterFieldFunctionMP-1",
              From: 0.7,
              To: 1000,
              Material: {
                $NodeId: "ConstantMaterialProvider-1",
                Type: "Constant",
                Skip: false,
                Material: { $NodeId: "Material-1", Solid: "Rock_Lime_Cobble" },
              },
            }],
          },
          {
            $NodeId: "FieldFunctionMaterialProvider-2",
            Type: "FieldFunction",
            Skip: false,
            FieldFunction: {
              $NodeId: "CellNoise2DDensityNode-2",
              Type: "CellNoise2D",
              Scale: 100,
              Seed: "B",
              Skip: false,
            },
            Delimiters: [{
              $NodeId: "DelimiterFieldFunctionMP-2",
              From: 0.45,
              To: 1000,
              Material: {
                $NodeId: "ConstantMaterialProvider-2",
                Type: "Constant",
                Skip: false,
                Material: { $NodeId: "Material-2", Solid: "Sand" },
              },
            }],
          },
          {
            $NodeId: "ConstantMaterialProvider-3",
            Type: "Constant",
            Skip: false,
            Material: { $NodeId: "Material-3", Solid: "Dirt" },
          },
        ],
      },
    });
    const mat = wrapper.MaterialProvider as Record<string, unknown>;
    // Top level should be Conditional
    expect(mat.Type).toBe("Conditional");
    expect(mat.Threshold).toBe(0.7);
    // Condition should be density tree (reversed from SimplexNoise2D)
    const cond = mat.Condition as Record<string, unknown>;
    expect(cond.Type).toBe("SimplexNoise2D");
    expect(cond.Frequency).toBeCloseTo(0.004); // 1/250
    // TrueInput should be Constant material
    const trueInput = mat.TrueInput as Record<string, unknown>;
    expect(trueInput.Type).toBe("Constant");
    expect(trueInput.Material).toBe("Rock_Lime_Cobble");
    // FalseInput should be nested Conditional
    const falseInput = mat.FalseInput as Record<string, unknown>;
    expect(falseInput.Type).toBe("Conditional");
    expect(falseInput.Threshold).toBe(0.45);
    // Innermost FalseInput is the fallback
    const innerFalse = falseInput.FalseInput as Record<string, unknown>;
    expect(innerFalse.Type).toBe("Constant");
    expect(innerFalse.Material).toBe("Dirt");
  });
});

// ---------------------------------------------------------------------------
// Round-trip: material Conditional → Queue[FieldFunction] → Conditional chain
// ---------------------------------------------------------------------------

describe("material Conditional round-trip", () => {
  it("round-trips material Conditional chain through export → import", () => {
    const original = {
      Name: "test",
      MaterialProvider: {
        Type: "Conditional",
        Threshold: 0.7,
        Condition: { Type: "SimplexNoise2D", Frequency: 0.004, Seed: "A" },
        TrueInput: { Type: "Constant", Material: "Rock_Lime_Cobble" },
        FalseInput: {
          Type: "Conditional",
          Threshold: 0.45,
          Condition: { Type: "Constant", Value: 0.5 },
          TrueInput: { Type: "Constant", Material: "Sand" },
          FalseInput: { Type: "Constant", Material: "Dirt" },
        },
      },
    };
    const exported = internalToHytaleBiome(original);
    const solidity = exported.MaterialProvider as Record<string, unknown>;
    expect(solidity.Type).toBe("Solidity");
    const mat = solidity.Solid as Record<string, unknown>;
    expect(mat.Type).toBe("Queue");

    const { wrapper: imported } = hytaleToInternalBiome(exported);
    const importedMat = imported.MaterialProvider as Record<string, unknown>;
    expect(importedMat.Type).toBe("Conditional");
    expect(importedMat.Threshold).toBe(0.7);

    // Verify nested structure preserved
    const cond = importedMat.Condition as Record<string, unknown>;
    expect(cond.Type).toBe("SimplexNoise2D");
    expect((cond.Frequency as number)).toBeCloseTo(0.004);

    const trueInput = importedMat.TrueInput as Record<string, unknown>;
    expect(trueInput.Type).toBe("Constant");
    expect(trueInput.Material).toBe("Rock_Lime_Cobble");

    const falseInput = importedMat.FalseInput as Record<string, unknown>;
    expect(falseInput.Type).toBe("Conditional");
    expect(falseInput.Threshold).toBe(0.45);

    const innerFalse = falseInput.FalseInput as Record<string, unknown>;
    expect(innerFalse.Type).toBe("Constant");
    expect(innerFalse.Material).toBe("Dirt");
  });
});

// ---------------------------------------------------------------------------
// LinearTransform with Offset → Sum(AmplitudeConstant, Constant)
// ---------------------------------------------------------------------------

describe("LinearTransform with Offset", () => {
  it("exports LinearTransform with non-zero Offset as Sum(AmplitudeConstant, Constant)", () => {
    const result = internalToHytale({
      Type: "LinearTransform",
      Scale: 45,
      Offset: 50,
      Input: { Type: "Constant", Value: 0.5 },
    });
    expect(result.Type).toBe("Sum");
    const inputs = result.Inputs as Record<string, unknown>[];
    expect(inputs).toHaveLength(2);

    // First input: AmplitudeConstant with Scale as Value
    expect(inputs[0].Type).toBe("AmplitudeConstant");
    expect(inputs[0].Value).toBe(45);
    const ampInputs = inputs[0].Inputs as Record<string, unknown>[];
    expect(ampInputs).toHaveLength(1);
    expect(ampInputs[0].Type).toBe("Constant");
    expect(ampInputs[0].Value).toBe(0.5);

    // Second input: Constant with Offset value
    expect(inputs[1].Type).toBe("Constant");
    expect(inputs[1].Value).toBe(50);
  });

  it("exports LinearTransform with Offset=0 as plain AmplitudeConstant (no Sum wrapper)", () => {
    const result = internalToHytale({
      Type: "LinearTransform",
      Scale: 12,
      Offset: 0,
      Input: { Type: "Constant", Value: 1 },
    });
    expect(result.Type).toBe("AmplitudeConstant");
    expect(result.Value).toBe(12);
    // No Sum wrapper
    expect(result.Inputs).toBeDefined();
  });

  it("exports LinearTransform with negative Offset correctly", () => {
    const result = internalToHytale({
      Type: "LinearTransform",
      Scale: 40,
      Offset: -5,
      Input: { Type: "Constant", Value: 1 },
    });
    expect(result.Type).toBe("Sum");
    const inputs = result.Inputs as Record<string, unknown>[];
    expect(inputs[1].Type).toBe("Constant");
    expect(inputs[1].Value).toBe(-5);
  });

  it("preserves terrain height with Offset in a biome density tree", () => {
    const biome = internalToHytaleBiome({
      Name: "test",
      Terrain: {
        Density: {
          Type: "LinearTransform",
          Scale: 45,
          Offset: 50,
          Input: { Type: "Constant", Value: 1 },
        },
      },
    });
    const terrain = biome.Terrain as Record<string, unknown>;
    const density = terrain.Density as Record<string, unknown>;
    // Should be Sum(AmplitudeConstant(45, Constant(1)), Constant(50))
    expect(density.Type).toBe("Sum");
    const inputs = density.Inputs as Record<string, unknown>[];
    expect(inputs[1].Value).toBe(50); // Offset preserved as Constant
  });
});

// ---------------------------------------------------------------------------
// HeightGradient → Queue[FieldFunction(YValue)] export
// ---------------------------------------------------------------------------

describe("HeightGradient → Queue[FieldFunction(YValue)] export", () => {
  it("exports HeightGradient as Solidity-wrapped Queue[FieldFunction(YValue) + Low fallback]", () => {
    const biome = internalToHytaleBiome({
      Name: "test",
      MaterialProvider: {
        Type: "HeightGradient",
        Range: { Min: 20, Max: 60 },
        Low: { Type: "Constant", Material: "Rock_Volcanic" },
        High: { Type: "Constant", Material: "Rock_Shale" },
      },
    });
    const solidity = biome.MaterialProvider as Record<string, unknown>;
    expect(solidity.Type).toBe("Solidity");
    const mat = solidity.Solid as Record<string, unknown>;
    expect(mat.Type).toBe("Queue");
    const queue = mat.Queue as Record<string, unknown>[];
    expect(queue).toHaveLength(2);

    // First entry: FieldFunction with YValue density
    expect(queue[0].Type).toBe("FieldFunction");
    const ff = queue[0].FieldFunction as Record<string, unknown>;
    expect(ff.Type).toBe("YValue");

    // Delimiter threshold = midpoint of Range
    const delimiters = queue[0].Delimiters as Record<string, unknown>[];
    expect(delimiters).toHaveLength(1);
    expect(delimiters[0].From).toBe(40); // (20 + 60) / 2
    expect(delimiters[0].To).toBe(10000);

    // Delimiter material = High material
    const delimMat = delimiters[0].Material as Record<string, unknown>;
    expect(delimMat.Type).toBe("Constant");
    const innerMat = delimMat.Material as Record<string, unknown>;
    expect(innerMat.Solid).toBe("Rock_Shale");

    // Fallback = Low material
    expect(queue[1].Type).toBe("Constant");
    const fallbackMat = queue[1].Material as Record<string, unknown>;
    expect(fallbackMat.Solid).toBe("Rock_Volcanic");
  });

  it("uses correct $NodeId prefixes for HeightGradient export", () => {
    const biome = internalToHytaleBiome({
      Name: "test",
      MaterialProvider: {
        Type: "HeightGradient",
        Range: { Min: 0, Max: 100 },
        Low: { Type: "Constant", Material: "Dirt" },
        High: { Type: "Constant", Material: "Rock" },
      },
    });
    const solidity = biome.MaterialProvider as Record<string, unknown>;
    expect((solidity.$NodeId as string).startsWith("SolidityMaterialProvider-")).toBe(true);
    const mat = solidity.Solid as Record<string, unknown>;
    expect((mat.$NodeId as string).startsWith("QueueMaterialProvider-")).toBe(true);
    const queue = mat.Queue as Record<string, unknown>[];
    expect((queue[0].$NodeId as string).startsWith("FieldFunctionMaterialProvider-")).toBe(true);

    const ff = queue[0].FieldFunction as Record<string, unknown>;
    expect((ff.$NodeId as string).startsWith("YValue.Density-")).toBe(true);

    const delims = queue[0].Delimiters as Record<string, unknown>[];
    expect((delims[0].$NodeId as string).startsWith("DelimiterFieldFunctionMP-")).toBe(true);
  });

  it("computes correct midpoint for various Range values", () => {
    const biome = internalToHytaleBiome({
      Name: "test",
      MaterialProvider: {
        Type: "HeightGradient",
        Range: { Min: 25, Max: 80 },
        Low: { Type: "Constant", Material: "Rock_Stone" },
        High: { Type: "Constant", Material: "Soil_Dirt" },
      },
    });
    const solidity = biome.MaterialProvider as Record<string, unknown>;
    const mat = solidity.Solid as Record<string, unknown>;
    const queue = mat.Queue as Record<string, unknown>[];
    const delimiters = queue[0].Delimiters as Record<string, unknown>[];
    expect(delimiters[0].From).toBe(52.5); // (25 + 80) / 2
  });

  it("exports HeightGradient nested inside SpaceAndDepth Layers", () => {
    const biome = internalToHytaleBiome({
      Name: "test",
      MaterialProvider: {
        Type: "SpaceAndDepth",
        DepthThreshold: 4,
        Solid: {
          Type: "HeightGradient",
          Range: { Min: 25, Max: 80 },
          Low: { Type: "Constant", Material: "Rock_Stone" },
          High: { Type: "Constant", Material: "Soil_Dirt" },
        },
        Empty: { Type: "Constant", Material: "Soil_Moss" },
      },
    });
    const solidity = biome.MaterialProvider as Record<string, unknown>;
    expect(solidity.Type).toBe("Solidity");
    const mat = solidity.Solid as Record<string, unknown>;
    expect(mat.Type).toBe("SpaceAndDepth");
    expect(mat.LayerContext).toBe("DEPTH_INTO_FLOOR");
    expect(mat.MaxExpectedDepth).toBe(16);

    // Should have Layers array instead of flat Solid/Empty
    const layers = mat.Layers as Record<string, unknown>[];
    expect(layers).toHaveLength(2);

    // First layer (Empty/surface) = Soil_Moss with thickness 4
    expect(layers[0].Type).toBe("ConstantThickness");
    expect(layers[0].Thickness).toBe(4);

    // Second layer (Solid/deep) = HeightGradient → Queue[FieldFunction(YValue)]
    expect(layers[1].Type).toBe("ConstantThickness");
    expect(layers[1].Thickness).toBe(12); // 16 - 4
    const solidMat = layers[1].Material as Record<string, unknown>;
    expect(solidMat.Type).toBe("Queue");
    const queue = solidMat.Queue as Record<string, unknown>[];
    expect(queue).toHaveLength(2);
    expect(queue[0].Type).toBe("FieldFunction");
    const ff = queue[0].FieldFunction as Record<string, unknown>;
    expect(ff.Type).toBe("YValue");

    // Old flat fields should be gone
    expect(mat.Solid).toBeUndefined();
    expect(mat.Empty).toBeUndefined();
    expect(mat.DepthThreshold).toBeUndefined();
  });

  it("does not emit HeightGradient type in exported material tree", () => {
    const biome = internalToHytaleBiome({
      Name: "test",
      MaterialProvider: {
        Type: "Conditional",
        Threshold: 0.5,
        Condition: { Type: "Constant", Value: 1 },
        TrueInput: {
          Type: "SpaceAndDepth",
          DepthThreshold: 4,
          Solid: {
            Type: "HeightGradient",
            Range: { Min: 25, Max: 80 },
            Low: { Type: "Constant", Material: "Rock_Stone" },
            High: { Type: "Constant", Material: "Soil_Dirt" },
          },
          Empty: { Type: "Constant", Material: "Soil_Moss" },
        },
        FalseInput: {
          Type: "HeightGradient",
          Range: { Min: 20, Max: 60 },
          Low: { Type: "Constant", Material: "Rock_Volcanic" },
          High: { Type: "Constant", Material: "Rock_Shale" },
        },
      },
    });
    // Deep check: no HeightGradient type anywhere in the output
    const json = JSON.stringify(biome);
    expect(json).not.toContain('"HeightGradient"');
    // SpaceAndDepth should not have flat Solid/Empty/DepthThreshold
    expect(json).not.toContain('"DepthThreshold"');
  });
});

// ---------------------------------------------------------------------------
// MaterialProvider Solidity wrapper includes Empty field
// ---------------------------------------------------------------------------

describe("MaterialProvider Solidity Empty field", () => {
  it("includes Empty branch in Solidity wrapper on export", () => {
    const biome = internalToHytaleBiome({
      Name: "test",
      Terrain: { Density: { Type: "Constant", Value: 1 } },
      MaterialProvider: {
        Type: "Constant",
        Material: "Rock_Stone",
      },
    });
    const mp = biome.MaterialProvider as Record<string, unknown>;
    expect(mp.Type).toBe("Solidity");
    expect(mp.Solid).toBeDefined();
    expect(mp.Empty).toBeDefined();
    const empty = mp.Empty as Record<string, unknown>;
    expect(empty.Type).toBe("Queue");
    expect(empty.Queue).toBeDefined();
    const queue = empty.Queue as Array<Record<string, unknown>>;
    expect(queue).toHaveLength(1);
    expect(queue[0].Type).toBe("Constant");
    const mat = queue[0].Material as Record<string, unknown>;
    expect(mat.Solid).toBe("Empty");
  });

  it("drops Empty branch on import (round-trip)", () => {
    const { wrapper } = hytaleToInternalBiome({
      $NodeId: "Biome-123",
      Name: "test",
      Terrain: {
        $NodeId: "Terrain-123",
        Density: { $NodeId: "c1", Type: "Constant", Value: 1, Skip: false },
      },
      MaterialProvider: {
        $NodeId: "Sol-123",
        Type: "Solidity",
        Solid: { $NodeId: "const-1", Type: "Constant", Material: { Solid: "Rock_Stone" }, Skip: false },
        Empty: {
          $NodeId: "queue-1",
          Type: "Queue",
          Queue: [{ $NodeId: "const-2", Type: "Constant", Material: { Solid: "Empty" }, Skip: false }],
        },
      },
    });
    const mp = wrapper.MaterialProvider as Record<string, unknown>;
    // Empty should not appear in internal format
    expect(mp.Type).toBe("Constant");
    expect((mp as Record<string, unknown>).Empty).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Density Conditional → Mix (replaces invalid Switch)
// ---------------------------------------------------------------------------

describe("density Conditional → Mix export", () => {
  it("density Conditional exports as Mix with step function (not Switch)", () => {
    const biome = internalToHytaleBiome({
      Name: "test",
      Terrain: {
        Density: {
          Type: "Conditional",
          Threshold: 0.25,
          Condition: { Type: "SimplexNoise2D", Frequency: 0.01, Seed: "A" },
          TrueInput: { Type: "Constant", Value: 0.8 },
          FalseInput: { Type: "Constant", Value: 0 },
        },
      },
    });
    const terrain = biome.Terrain as Record<string, unknown>;
    const density = terrain.Density as Record<string, unknown>;
    expect(density.Type).toBe("Mix");
    expect(density.$Comment).toBe("Conditional(Threshold=0.25)");

    // 3 Inputs: FalseInput, TrueInput, StepFactor
    const inputs = density.Inputs as Record<string, unknown>[];
    expect(inputs).toHaveLength(3);

    // Inputs[0] = FalseInput
    expect(inputs[0].Type).toBe("Constant");
    expect(inputs[0].Value).toBe(0);

    // Inputs[1] = TrueInput
    expect(inputs[1].Type).toBe("Constant");
    expect(inputs[1].Value).toBe(0.8);

    // Inputs[2] = Clamp(0,1, Multiplier(Sum(Condition, Constant(-0.25)), Constant(10000)))
    const clamp = inputs[2];
    expect(clamp.Type).toBe("Clamp");
    expect(clamp.WallA).toBe(1);
    expect(clamp.WallB).toBe(0);
    const clampInputs = clamp.Inputs as Record<string, unknown>[];
    expect(clampInputs).toHaveLength(1);

    const multiplier = clampInputs[0];
    expect(multiplier.Type).toBe("Multiplier");
    const mulInputs = multiplier.Inputs as Record<string, unknown>[];
    expect(mulInputs).toHaveLength(2);

    const sum = mulInputs[0];
    expect(sum.Type).toBe("Sum");
    const sumInputs = sum.Inputs as Record<string, unknown>[];
    expect(sumInputs).toHaveLength(2);

    // First Sum input = transformed Condition (SimplexNoise2D with Scale)
    expect(sumInputs[0].Type).toBe("SimplexNoise2D");
    expect(sumInputs[0].Scale).toBe(100); // 1/0.01

    // Second Sum input = Constant(-Threshold)
    expect(sumInputs[1].Type).toBe("Constant");
    expect(sumInputs[1].Value).toBe(-0.25);

    // Steepness constant
    expect(mulInputs[1].Type).toBe("Constant");
    expect(mulInputs[1].Value).toBe(10000);

    // No Switch anywhere in output
    const json = JSON.stringify(biome);
    expect(json).not.toContain('"Switch"');
  });

  it("backwards compat: density Switch still imports as Conditional", () => {
    const { wrapper } = hytaleToInternalBiome({
      $NodeId: "Biome-123",
      Name: "test",
      Terrain: {
        $NodeId: "Terrain-123",
        Density: {
          $NodeId: "Switch.Density-123",
          Type: "Switch",
          Threshold: 0.5,
          Inputs: [
            { $NodeId: "c1", Type: "Constant", Value: 1, Skip: false },
            { $NodeId: "c2", Type: "Constant", Value: 0.8, Skip: false },
            { $NodeId: "c3", Type: "Constant", Value: 0, Skip: false },
          ],
          Skip: false,
        },
      },
    });
    const terrain = wrapper.Terrain as Record<string, unknown>;
    const density = terrain.Density as Record<string, unknown>;
    expect(density.Type).toBe("Conditional");
    expect(density.Condition).toBeDefined();
    expect(density.TrueInput).toBeDefined();
    expect(density.FalseInput).toBeDefined();
  });

  it("round-trips density Conditional through Mix export → import", () => {
    const original = {
      Name: "test",
      Terrain: {
        Density: {
          Type: "Conditional",
          Threshold: 0.25,
          Condition: { Type: "Constant", Value: 0.6 },
          TrueInput: { Type: "Constant", Value: 0.8 },
          FalseInput: { Type: "Constant", Value: 0 },
        },
      },
    };

    const exported = internalToHytaleBiome(original);
    const terrain = exported.Terrain as Record<string, unknown>;
    const density = terrain.Density as Record<string, unknown>;
    expect(density.Type).toBe("Mix");
    expect(density.$Comment).toBe("Conditional(Threshold=0.25)");

    const { wrapper: imported } = hytaleToInternalBiome(exported);
    const importedTerrain = imported.Terrain as Record<string, unknown>;
    const importedDensity = importedTerrain.Density as Record<string, unknown>;
    expect(importedDensity.Type).toBe("Conditional");
    expect(importedDensity.Threshold).toBe(0.25);
    expect((importedDensity.Condition as Record<string, unknown>).Type).toBe("Constant");
    expect((importedDensity.Condition as Record<string, unknown>).Value).toBe(0.6);
    expect((importedDensity.TrueInput as Record<string, unknown>).Type).toBe("Constant");
    expect((importedDensity.TrueInput as Record<string, unknown>).Value).toBe(0.8);
    expect((importedDensity.FalseInput as Record<string, unknown>).Type).toBe("Constant");
    expect((importedDensity.FalseInput as Record<string, unknown>).Value).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// N-ary Sum: balanced binary nesting on import + flattening on export
// ---------------------------------------------------------------------------

describe("N-ary Sum nesting and flattening", () => {
  it("imports 4-input Sum as flat Inputs[] array", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "SumDensityNode-123",
      Type: "Sum",
      Inputs: [
        { $NodeId: "c1", Type: "Constant", Value: 10, Skip: false },
        { $NodeId: "c2", Type: "Constant", Value: 20, Skip: false },
        { $NodeId: "c3", Type: "Constant", Value: 30, Skip: false },
        { $NodeId: "c4", Type: "Constant", Value: 40, Skip: false },
      ],
      Skip: false,
    });
    expect(asset.Type).toBe("Sum");
    // Sum now uses Inputs[] natively via compound handles (no binary tree nesting)
    const inputs = asset.Inputs as Record<string, unknown>[];
    expect(inputs).toBeDefined();
    expect(inputs).toHaveLength(4);
    expect(inputs[0].Value).toBe(10);
    expect(inputs[1].Value).toBe(20);
    expect(inputs[2].Value).toBe(30);
    expect(inputs[3].Value).toBe(40);
  });

  it("imports 3-input Sum as flat Inputs[] array", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "SumDensityNode-456",
      Type: "Sum",
      Inputs: [
        { $NodeId: "c1", Type: "Constant", Value: 1, Skip: false },
        { $NodeId: "c2", Type: "Constant", Value: 2, Skip: false },
        { $NodeId: "c3", Type: "Constant", Value: 3, Skip: false },
      ],
      Skip: false,
    });
    expect(asset.Type).toBe("Sum");
    const inputs = asset.Inputs as Record<string, unknown>[];
    expect(inputs).toBeDefined();
    expect(inputs).toHaveLength(3);
    expect(inputs[0].Value).toBe(1);
    expect(inputs[1].Value).toBe(2);
    expect(inputs[2].Value).toBe(3);
  });

  it("imports 2-input Sum as flat Inputs[] array", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "SumDensityNode-789",
      Type: "Sum",
      Inputs: [
        { $NodeId: "c1", Type: "Constant", Value: 5, Skip: false },
        { $NodeId: "c2", Type: "Constant", Value: 10, Skip: false },
      ],
      Skip: false,
    });
    expect(asset.Type).toBe("Sum");
    const inputs = asset.Inputs as Record<string, unknown>[];
    expect(inputs).toBeDefined();
    expect(inputs).toHaveLength(2);
    expect(inputs[0].Value).toBe(5);
    expect(inputs[1].Value).toBe(10);
  });

  it("exports nested binary Sum tree as flat Inputs[] array", () => {
    const result = internalToHytale({
      Type: "Sum",
      InputA: {
        Type: "Sum",
        InputA: { Type: "Constant", Value: 10 },
        InputB: { Type: "Constant", Value: 20 },
      },
      InputB: {
        Type: "Sum",
        InputA: { Type: "Constant", Value: 30 },
        InputB: { Type: "Constant", Value: 40 },
      },
    });
    expect(result.Type).toBe("Sum");
    const inputs = result.Inputs as Record<string, unknown>[];
    expect(inputs).toHaveLength(4);
    expect(inputs[0].Value).toBe(10);
    expect(inputs[1].Value).toBe(20);
    expect(inputs[2].Value).toBe(30);
    expect(inputs[3].Value).toBe(40);
  });

  it("round-trips 4-input Sum through import → export", () => {
    const hytale = {
      $NodeId: "SumDensityNode-rt",
      Type: "Sum",
      Inputs: [
        { $NodeId: "c1", Type: "Constant", Value: 10, Skip: false },
        { $NodeId: "c2", Type: "Constant", Value: 20, Skip: false },
        { $NodeId: "c3", Type: "Constant", Value: 30, Skip: false },
        { $NodeId: "c4", Type: "Constant", Value: 40, Skip: false },
      ],
      Skip: false,
    };
    const { asset: imported } = hytaleToInternal(hytale);
    // Re-export
    const exported = internalToHytale(imported as any);
    expect(exported.Type).toBe("Sum");
    const inputs = exported.Inputs as Record<string, unknown>[];
    expect(inputs).toHaveLength(4);
    expect(inputs[0].Value).toBe(10);
    expect(inputs[1].Value).toBe(20);
    expect(inputs[2].Value).toBe(30);
    expect(inputs[3].Value).toBe(40);
  });

  it("round-trips 3-input Sum through import → export", () => {
    const hytale = {
      $NodeId: "SumDensityNode-rt3",
      Type: "Sum",
      Inputs: [
        { $NodeId: "c1", Type: "Constant", Value: 1, Skip: false },
        { $NodeId: "c2", Type: "Constant", Value: 2, Skip: false },
        { $NodeId: "c3", Type: "Constant", Value: 3, Skip: false },
      ],
      Skip: false,
    };
    const { asset: imported } = hytaleToInternal(hytale);
    const exported = internalToHytale(imported as any);
    expect(exported.Type).toBe("Sum");
    const inputs = exported.Inputs as Record<string, unknown>[];
    expect(inputs).toHaveLength(3);
    expect(inputs[0].Value).toBe(1);
    expect(inputs[1].Value).toBe(2);
    expect(inputs[2].Value).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Recursive $NodeId stripping
// ---------------------------------------------------------------------------

describe("recursive $NodeId stripping", () => {
  it("strips $NodeId from WeightedMaterials array entries", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "ConstantMaterialProvider-123",
      Type: "Constant",
      WeightedMaterials: [
        { $NodeId: "WM-1", Material: { $NodeId: "Mat-1", Solid: "Rock" }, Weight: 1 },
        { $NodeId: "WM-2", Material: { $NodeId: "Mat-2", Solid: "Sand" }, Weight: 2 },
      ],
    });
    const wm = asset.WeightedMaterials as Record<string, unknown>[];
    expect(wm).toHaveLength(2);
    // No $NodeId at any level
    expect(wm[0].$NodeId).toBeUndefined();
    expect((wm[0].Material as Record<string, unknown>).$NodeId).toBeUndefined();
    expect(wm[1].$NodeId).toBeUndefined();
    expect((wm[1].Material as Record<string, unknown>).$NodeId).toBeUndefined();
    // Data preserved
    expect(wm[0].Weight).toBe(1);
    expect((wm[0].Material as Record<string, unknown>).Solid).toBe("Rock");
  });

  it("strips $NodeId from non-typed nested objects in pass-through", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "SomeDensityNode-123",
      Type: "Constant",
      SomeConfig: {
        $NodeId: "Config-1",
        Nested: { $NodeId: "Nested-1", Value: 42 },
      },
    });
    const config = asset.SomeConfig as Record<string, unknown>;
    expect(config.$NodeId).toBeUndefined();
    const nested = config.Nested as Record<string, unknown>;
    expect(nested.$NodeId).toBeUndefined();
    expect(nested.Value).toBe(42);
  });

  it("strips $NodeId from material-like array entries (Solid objects)", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "QueueMaterialProvider-123",
      Type: "Queue",
      Queue: [
        {
          $NodeId: "ConstantMaterialProvider-1",
          Type: "Constant",
          Material: { $NodeId: "Material-1", Solid: "Dirt" },
          Skip: false,
        },
      ],
    });
    // Queue is an array of typed nodes — those get transformed normally
    // But Material inside them (non-typed, has Solid) should have $NodeId stripped
    const queue = asset.Queue as Record<string, unknown>[];
    expect(queue[0].$NodeId).toBeUndefined();
    expect(queue[0].Material).toBe("Dirt"); // unwrapped to string
  });
});

// ---------------------------------------------------------------------------
// Point3D / Vector:Constant round-trip
// ---------------------------------------------------------------------------

describe("Point3D / Vector:Constant round-trip", () => {
  it("imports Point3D in an unmapped field as Constant with vector Value", () => {
    // Use a generic parent node — fields like "Range" and "Offset" aren't in the
    // FIELD_TO_CATEGORY map, so they default to density. The value-shape detection
    // on import (in hytaleToInternal) creates {Type: "Constant", Value: {x,y,z}}.
    const { asset } = hytaleToInternal({
      $NodeId: "SomeDensityNode-123",
      Type: "SomeNode",
      Skip: false,
      Range: {
        $NodeId: "Point3D-456",
        X: 3,
        Y: 5,
        Z: 3,
      },
    });
    const range = asset.Range as Record<string, unknown>;
    expect(range.Type).toBe("Constant");
    expect(range.Value).toEqual({ x: 3, y: 5, z: 3 });
  });

  it("exports vector Constant in an unmapped field as Point3D format", () => {
    const result = internalToHytale({
      Type: "SomeNode",
      Range: { Type: "Constant", Value: { x: 3, y: 5, z: 3 } },
    });
    // The nested Constant with object Value should export as Point3D (no Type, has X/Y/Z)
    const range = result.Range as Record<string, unknown>;
    expect(range.Type).toBeUndefined();
    expect(range.X).toBe(3);
    expect(range.Y).toBe(5);
    expect(range.Z).toBe(3);
    expect((range.$NodeId as string).startsWith("Point3D-")).toBe(true);
  });

  it("imports Point3D in Offset field as Constant with vector Value", () => {
    const { asset } = hytaleToInternal({
      $NodeId: "SomeDensityNode-123",
      Type: "SomeNode",
      Skip: false,
      Offset: {
        $NodeId: "Point3D-789",
        X: 0,
        Y: -1,
        Z: 0,
      },
    });
    const offset = asset.Offset as Record<string, unknown>;
    expect(offset.Type).toBe("Constant");
    expect(offset.Value).toEqual({ x: 0, y: -1, z: 0 });
  });

  it("exports vector Constant in Offset field as Point3D format", () => {
    const result = internalToHytale({
      Type: "SomeNode",
      Offset: { Type: "Constant", Value: { x: 0, y: -1, z: 0 } },
    });
    const offset = result.Offset as Record<string, unknown>;
    expect(offset.Type).toBeUndefined();
    expect(offset.X).toBe(0);
    expect(offset.Y).toBe(-1);
    expect(offset.Z).toBe(0);
    expect((offset.$NodeId as string).startsWith("Point3D-")).toBe(true);
  });

  it("round-trips Point3D through Hytale → internal → Hytale", () => {
    const hytaleInput = {
      $NodeId: "SomeDensityNode-123",
      Type: "SomeNode",
      Skip: false,
      Range: {
        $NodeId: "Point3D-456",
        X: 3,
        Y: 5,
        Z: 3,
      },
    };
    // Import: Point3D → Constant with vector Value
    const { asset: imported } = hytaleToInternal(hytaleInput);
    const range = imported.Range as Record<string, unknown>;
    expect(range.Type).toBe("Constant");
    expect(range.Value).toEqual({ x: 3, y: 5, z: 3 });

    // Re-export: Constant with vector Value → Point3D
    const exported = internalToHytale(imported as any);
    const exportedRange = exported.Range as Record<string, unknown>;
    expect(exportedRange.Type).toBeUndefined();
    expect(exportedRange.X).toBe(3);
    expect(exportedRange.Y).toBe(5);
    expect(exportedRange.Z).toBe(3);
    expect((exportedRange.$NodeId as string).startsWith("Point3D-")).toBe(true);
  });
});
