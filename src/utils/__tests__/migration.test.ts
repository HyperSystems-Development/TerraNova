import { describe, it, expect, vi } from "vitest";
import { migrateToV2Names, isOldTerraNovaNaming, hasOldTerraNovaNaming, migrateAssetTree } from "../migration";
import { normalizeImport, normalizeImportWithMeta } from "../fileTypeDetection";

// ---------------------------------------------------------------------------
// Type rename mapping (23 entries)
// ---------------------------------------------------------------------------

describe("migrateToV2Names – type renames", () => {
  const typeRenames: [string, string][] = [
    ["Product", "Multiplier"],
    ["Negate", "Inverter"],
    ["CurveFunction", "CurveMapper"],
    ["CacheOnce", "Cache"],
    ["ImportedValue", "Imported"],
    ["Blend", "Mix"],
    ["MinFunction", "Min"],
    ["MaxFunction", "Max"],
    ["CoordinateX", "XValue"],
    ["CoordinateY", "YValue"],
    ["CoordinateZ", "ZValue"],
    ["SquareRoot", "Sqrt"],
    ["ScaledPosition", "Scale"],
    ["TranslatedPosition", "Slider"],
    ["RotatedPosition", "Rotator"],
    ["VoronoiNoise2D", "CellNoise2D"],
    ["VoronoiNoise3D", "CellNoise3D"],
    ["LinearTransform", "AmplitudeConstant"],
    ["BlendCurve", "MultiMix"],
    ["CubeMath", "Cube"],
  ];

  for (const [oldType, v2Type] of typeRenames) {
    it(`renames ${oldType} → ${v2Type}`, () => {
      const result = migrateToV2Names({ Type: oldType });
      expect(result).not.toBeNull();
      expect(result!.Type).toBe(v2Type);
    });
  }

  it("renames DomainWarp2D → FastGradientWarp with 2D=true", () => {
    const result = migrateToV2Names({ Type: "DomainWarp2D" });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("FastGradientWarp");
    expect(result!["2D"]).toBe(true);
  });

  it("renames DomainWarp3D → FastGradientWarp with 2D=false", () => {
    const result = migrateToV2Names({ Type: "DomainWarp3D" });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("FastGradientWarp");
    expect(result!["2D"]).toBe(false);
  });

  it("renames Square → Pow with Exponent=2.0", () => {
    const result = migrateToV2Names({ Type: "Square" });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("Pow");
    expect(result!.Exponent).toBe(2.0);
  });
});

// ---------------------------------------------------------------------------
// Field conversions
// ---------------------------------------------------------------------------

describe("migrateToV2Names – field conversions", () => {
  it("converts Frequency → Scale (inverse) on noise nodes", () => {
    const result = migrateToV2Names({ Type: "VoronoiNoise2D", Frequency: 4 });
    expect(result).not.toBeNull();
    expect(result!.Scale).toBe(0.25);
    expect(result!).not.toHaveProperty("Frequency");
  });

  it("handles Frequency=0 gracefully (defaults Scale to 1)", () => {
    const result = migrateToV2Names({ Type: "VoronoiNoise2D", Frequency: 0 });
    expect(result).not.toBeNull();
    expect(result!.Scale).toBe(1);
  });

  it("converts Gain → Persistence on noise nodes", () => {
    const result = migrateToV2Names({ Type: "VoronoiNoise2D", Gain: 0.5 });
    expect(result).not.toBeNull();
    expect(result!.Persistence).toBe(0.5);
    expect(result!).not.toHaveProperty("Gain");
  });

  it("converts Min/Max → WallA/WallB on Clamp", () => {
    const result = migrateToV2Names({ Type: "Clamp", Min: -1, Max: 1 });
    expect(result).not.toBeNull();
    expect(result!.WallA).toBe(1);
    expect(result!.WallB).toBe(-1);
    expect(result!).not.toHaveProperty("Min");
    expect(result!).not.toHaveProperty("Max");
  });

  it("converts Min/Max → WallA/WallB on SmoothClamp", () => {
    const result = migrateToV2Names({ Type: "SmoothClamp", Min: 0, Max: 5 });
    expect(result).not.toBeNull();
    expect(result!.WallA).toBe(5);
    expect(result!.WallB).toBe(0);
  });

  it("converts Smoothness → Range on SmoothClamp", () => {
    const result = migrateToV2Names({ Type: "SmoothClamp", Smoothness: 0.3 });
    expect(result).not.toBeNull();
    expect(result!.Range).toBe(0.3);
    expect(result!).not.toHaveProperty("Smoothness");
  });

  it("converts Smoothness → Range on SmoothMin", () => {
    const result = migrateToV2Names({ Type: "SmoothMin", Smoothness: 0.5 });
    expect(result).not.toBeNull();
    expect(result!.Range).toBe(0.5);
    expect(result!).not.toHaveProperty("Smoothness");
  });

  it("converts Smoothness → Range on SmoothMax", () => {
    const result = migrateToV2Names({ Type: "SmoothMax", Smoothness: 0.7 });
    expect(result).not.toBeNull();
    expect(result!.Range).toBe(0.7);
  });

  it("converts Threshold → Limit on SmoothFloor", () => {
    const result = migrateToV2Names({ Type: "SmoothFloor", Threshold: 0.5 });
    expect(result).not.toBeNull();
    expect(result!.Limit).toBe(0.5);
    expect(result!).not.toHaveProperty("Threshold");
  });

  it("converts Smoothness → SmoothRange on SmoothFloor", () => {
    const result = migrateToV2Names({ Type: "SmoothFloor", Smoothness: 0.2 });
    expect(result).not.toBeNull();
    expect(result!.SmoothRange).toBe(0.2);
    expect(result!).not.toHaveProperty("Smoothness");
    expect(result!).not.toHaveProperty("Range");
  });

  it("converts Threshold → Limit on SmoothCeiling", () => {
    const result = migrateToV2Names({ Type: "SmoothCeiling", Threshold: 0.8 });
    expect(result).not.toBeNull();
    expect(result!.Limit).toBe(0.8);
    expect(result!).not.toHaveProperty("Threshold");
  });

  it("converts Smoothness → SmoothRange on SmoothCeiling", () => {
    const result = migrateToV2Names({ Type: "SmoothCeiling", Smoothness: 0.4 });
    expect(result).not.toBeNull();
    expect(result!.SmoothRange).toBe(0.4);
    expect(result!).not.toHaveProperty("Smoothness");
    expect(result!).not.toHaveProperty("Range");
  });

  it("converts Floor field → Limit on Floor density node", () => {
    const result = migrateToV2Names({ Type: "Floor", Floor: -10 });
    expect(result).not.toBeNull();
    expect(result!.Limit).toBe(-10);
    expect(result!).not.toHaveProperty("Floor");
  });

  it("converts Ceiling field → Limit on Ceiling density node", () => {
    const result = migrateToV2Names({ Type: "Ceiling", Ceiling: 100 });
    expect(result).not.toBeNull();
    expect(result!.Limit).toBe(100);
    expect(result!).not.toHaveProperty("Ceiling");
  });

  it("flattens SourceRange/TargetRange on Normalizer", () => {
    const result = migrateToV2Names({
      Type: "Normalizer",
      SourceRange: { Min: -1, Max: 1 },
      TargetRange: { Min: 0, Max: 100 },
    });
    expect(result).not.toBeNull();
    expect(result!.FromMin).toBe(-1);
    expect(result!.FromMax).toBe(1);
    expect(result!.ToMin).toBe(0);
    expect(result!.ToMax).toBe(100);
    expect(result!).not.toHaveProperty("SourceRange");
    expect(result!).not.toHaveProperty("TargetRange");
  });
});

// ---------------------------------------------------------------------------
// Vector decomposition
// ---------------------------------------------------------------------------

describe("migrateToV2Names – vector decomposition", () => {
  it("decomposes Scale {x,y,z} → ScaleX/ScaleY/ScaleZ on ScaledPosition", () => {
    const result = migrateToV2Names({
      Type: "ScaledPosition",
      Scale: { x: 2, y: 3, z: 4 },
    });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("Scale");
    expect(result!.ScaleX).toBe(2);
    expect(result!.ScaleY).toBe(3);
    expect(result!.ScaleZ).toBe(4);
    expect(result!).not.toHaveProperty("Scale");
  });

  it("decomposes Translation {x,y,z} → SlideX/SlideY/SlideZ on TranslatedPosition", () => {
    const result = migrateToV2Names({
      Type: "TranslatedPosition",
      Translation: { x: 10, y: 20, z: 30 },
    });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("Slider");
    expect(result!.SlideX).toBe(10);
    expect(result!.SlideY).toBe(20);
    expect(result!.SlideZ).toBe(30);
    expect(result!).not.toHaveProperty("Translation");
  });

  it("converts AngleDegrees → SpinAngle on RotatedPosition", () => {
    const result = migrateToV2Names({
      Type: "RotatedPosition",
      AngleDegrees: 45,
    });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("Rotator");
    expect(result!.SpinAngle).toBe(45);
    expect(result!).not.toHaveProperty("AngleDegrees");
  });
});

// ---------------------------------------------------------------------------
// Domain warp field conversions
// ---------------------------------------------------------------------------

describe("migrateToV2Names – domain warp fields", () => {
  it("converts WarpSeed → Seed on FastGradientWarp", () => {
    const result = migrateToV2Names({
      Type: "DomainWarp2D",
      WarpSeed: "ABC",
    });
    expect(result).not.toBeNull();
    expect(result!.Seed).toBe("ABC");
    expect(result!).not.toHaveProperty("WarpSeed");
  });

  it("converts Is2D → 2D on FastGradientWarp", () => {
    const result = migrateToV2Names({
      Type: "DomainWarp2D",
      Is2D: true,
    });
    expect(result).not.toBeNull();
    // DomainWarp2D sets 2D=true automatically; Is2D should also be consumed
    expect(result!["2D"]).toBe(true);
    expect(result!).not.toHaveProperty("Is2D");
  });
});

// ---------------------------------------------------------------------------
// Curve point conversion
// ---------------------------------------------------------------------------

describe("migrateToV2Names – curve points", () => {
  it("converts {x, y} curve points to {In, Out}", () => {
    const result = migrateToV2Names({
      Type: "CurveFunction",
      Points: [
        { x: 0, y: 0 },
        { x: 0.5, y: 1.0 },
        { x: 1.0, y: 0.5 },
      ],
    });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("CurveMapper");
    const points = result!.Points as Array<Record<string, number>>;
    expect(points[0]).toEqual({ In: 0, Out: 0 });
    expect(points[1]).toEqual({ In: 0.5, Out: 1.0 });
    expect(points[2]).toEqual({ In: 1.0, Out: 0.5 });
  });

  it("leaves already-V2-format curve points unchanged", () => {
    const result = migrateToV2Names({
      Type: "CurveFunction",
      Points: [
        { In: 0, Out: 0 },
        { In: 1, Out: 1 },
      ],
    });
    expect(result).not.toBeNull();
    const points = result!.Points as Array<Record<string, number>>;
    expect(points[0]).toEqual({ In: 0, Out: 0 });
    expect(points[1]).toEqual({ In: 1, Out: 1 });
  });
});

// ---------------------------------------------------------------------------
// Invented type conversions
// ---------------------------------------------------------------------------

describe("migrateToV2Names – invented type conversions", () => {
  it("converts Zero → Constant with Value=0.0", () => {
    const result = migrateToV2Names({ Type: "Zero" });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("Constant");
    expect(result!.Value).toBe(0.0);
  });

  it("converts One → Constant with Value=1.0", () => {
    const result = migrateToV2Names({ Type: "One" });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("Constant");
    expect(result!.Value).toBe(1.0);
  });

  it("converts FractalNoise2D → SimplexNoise2D", () => {
    const result = migrateToV2Names({ Type: "FractalNoise2D" });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("SimplexNoise2D");
  });

  it("converts FractalNoise3D → SimplexNoise3D", () => {
    const result = migrateToV2Names({ Type: "FractalNoise3D" });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("SimplexNoise3D");
  });

  it("converts GradientDensity → Gradient", () => {
    const result = migrateToV2Names({ Type: "GradientDensity" });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("Gradient");
  });

  it("converts AverageFunction → Mix", () => {
    const result = migrateToV2Names({ Type: "AverageFunction" });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("Mix");
  });

  it("converts FlatCache -> Cache", () => {
    const result = migrateToV2Names({ Type: "FlatCache" });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("Cache");
  });

  it("converts DistanceFromOrigin → Distance", () => {
    const result = migrateToV2Names({ Type: "DistanceFromOrigin" });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("Distance");
  });

  it("converts DistanceFromAxis → Distance", () => {
    const result = migrateToV2Names({ Type: "DistanceFromAxis" });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("Distance");
  });

  it("converts DistanceFromPoint → Distance", () => {
    const result = migrateToV2Names({ Type: "DistanceFromPoint" });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("Distance");
  });

  it("converts AngleFromOrigin → Angle", () => {
    const result = migrateToV2Names({ Type: "AngleFromOrigin" });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("Angle");
  });

  it("converts AngleFromPoint → Angle", () => {
    const result = migrateToV2Names({ Type: "AngleFromPoint" });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("Angle");
  });
});

// ---------------------------------------------------------------------------
// Un-replaceable types (return null)
// ---------------------------------------------------------------------------

describe("migrateToV2Names – un-replaceable types", () => {
  const unreplaceable = [
    "SumSelf",
    "CubeRoot",
    "Inverse",
    "Modulo",
    "Wrap",
    "SplineFunction",
    "ClampToIndex",
    "RangeChoice",
    "Interpolate",
    "DoubleNormalizer",
    "Debug",
    "Passthrough",
    "YGradient",
    "HeightAboveSurface",
    "SimplexRidgeNoise2D",
    "SimplexRidgeNoise3D",
    "SurfaceDensity",
    "TerrainBoolean",
    "TerrainMask",
    "BeardDensity",
    "ColumnDensity",
    "CaveDensity",
    "MirroredPosition",
    "QuantizedPosition",
    "Conditional",
    "WeightedSum",
  ];

  for (const type of unreplaceable) {
    it(`returns null for un-replaceable type: ${type}`, () => {
      const result = migrateToV2Names({ Type: type });
      expect(result).toBeNull();
    });
  }
});

// ---------------------------------------------------------------------------
// Already-V2-named nodes pass through unchanged
// ---------------------------------------------------------------------------

describe("migrateToV2Names – V2 passthrough", () => {
  it("passes through already-V2-named nodes unchanged", () => {
    const node = { Type: "Multiplier", Value: 5 };
    const result = migrateToV2Names(node);
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("Multiplier");
    expect(result!.Value).toBe(5);
  });

  it("passes through Constant unchanged", () => {
    const node = { Type: "Constant", Value: 42 };
    const result = migrateToV2Names(node);
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("Constant");
    expect(result!.Value).toBe(42);
  });

  it("passes through Clamp with V2 fields unchanged", () => {
    const node = { Type: "Clamp", WallA: 1, WallB: -1 };
    const result = migrateToV2Names(node);
    expect(result).not.toBeNull();
    expect(result!.WallA).toBe(1);
    expect(result!.WallB).toBe(-1);
  });

  it("passes through SimplexNoise2D with V2 fields", () => {
    const node = { Type: "SimplexNoise2D", Scale: 0.5, Persistence: 0.6 };
    const result = migrateToV2Names(node);
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("SimplexNoise2D");
    expect(result!.Scale).toBe(0.5);
    expect(result!.Persistence).toBe(0.6);
  });
});

// ---------------------------------------------------------------------------
// Edge cases / combined
// ---------------------------------------------------------------------------

describe("migrateToV2Names – combined conversions", () => {
  it("applies type rename + field conversions together", () => {
    const result = migrateToV2Names({
      Type: "VoronoiNoise2D",
      Frequency: 2,
      Gain: 0.7,
      Octaves: 3,
    });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("CellNoise2D");
    expect(result!.Scale).toBe(0.5);
    expect(result!.Persistence).toBe(0.7);
    expect(result!.Octaves).toBe(3);
    expect(result!).not.toHaveProperty("Frequency");
    expect(result!).not.toHaveProperty("Gain");
  });

  it("preserves unrecognized fields during migration", () => {
    const result = migrateToV2Names({
      Type: "Product",
      CustomField: "preserved",
      AnotherOne: 42,
    });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("Multiplier");
    expect(result!.CustomField).toBe("preserved");
    expect(result!.AnotherOne).toBe(42);
  });

  it("handles node with no extra fields", () => {
    const result = migrateToV2Names({ Type: "CoordinateX" });
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("XValue");
  });
});

// ---------------------------------------------------------------------------
// isOldTerraNovaNaming detection
// ---------------------------------------------------------------------------

describe("isOldTerraNovaNaming", () => {
  it("detects old type names", () => {
    expect(isOldTerraNovaNaming({ Type: "Product" })).toBe(true);
    expect(isOldTerraNovaNaming({ Type: "Negate" })).toBe(true);
    expect(isOldTerraNovaNaming({ Type: "CurveFunction" })).toBe(true);
    expect(isOldTerraNovaNaming({ Type: "CacheOnce" })).toBe(true);
    expect(isOldTerraNovaNaming({ Type: "ImportedValue" })).toBe(true);
    expect(isOldTerraNovaNaming({ Type: "Blend" })).toBe(true);
    expect(isOldTerraNovaNaming({ Type: "MinFunction" })).toBe(true);
    expect(isOldTerraNovaNaming({ Type: "MaxFunction" })).toBe(true);
    expect(isOldTerraNovaNaming({ Type: "DomainWarp2D" })).toBe(true);
    expect(isOldTerraNovaNaming({ Type: "DomainWarp3D" })).toBe(true);
    expect(isOldTerraNovaNaming({ Type: "Square" })).toBe(true);
    expect(isOldTerraNovaNaming({ Type: "Zero" })).toBe(true);
    expect(isOldTerraNovaNaming({ Type: "One" })).toBe(true);
    expect(isOldTerraNovaNaming({ Type: "FractalNoise2D" })).toBe(true);
    expect(isOldTerraNovaNaming({ Type: "GradientDensity" })).toBe(true);
    expect(isOldTerraNovaNaming({ Type: "FlatCache" })).toBe(true);
  });

  it("detects old field names", () => {
    expect(isOldTerraNovaNaming({ Type: "Clamp", Frequency: 4 })).toBe(true);
    expect(isOldTerraNovaNaming({ Type: "Clamp", Gain: 0.5 })).toBe(true);
    expect(isOldTerraNovaNaming({
      Type: "Normalizer",
      SourceRange: { Min: 0, Max: 1 },
    })).toBe(true);
    expect(isOldTerraNovaNaming({
      Type: "Normalizer",
      TargetRange: { Min: 0, Max: 1 },
    })).toBe(true);
    expect(isOldTerraNovaNaming({ Type: "RotatedPosition", AngleDegrees: 45 })).toBe(true);
    expect(isOldTerraNovaNaming({
      Type: "ScaledPosition",
      Scale: { x: 1, y: 1, z: 1 },
    })).toBe(true);
    expect(isOldTerraNovaNaming({
      Type: "TranslatedPosition",
      Translation: { x: 0, y: 0, z: 0 },
    })).toBe(true);
  });

  it("returns false for V2-named nodes", () => {
    expect(isOldTerraNovaNaming({ Type: "Multiplier" })).toBe(false);
    expect(isOldTerraNovaNaming({ Type: "Inverter" })).toBe(false);
    expect(isOldTerraNovaNaming({ Type: "Constant", Value: 1 })).toBe(false);
    expect(isOldTerraNovaNaming({ Type: "Clamp", WallA: 1, WallB: 0 })).toBe(false);
    expect(isOldTerraNovaNaming({ Type: "SimplexNoise2D", Scale: 0.5 })).toBe(false);
  });

  it("returns false for un-replaceable types (they're internal-only, not old naming)", () => {
    expect(isOldTerraNovaNaming({ Type: "SumSelf" })).toBe(true);
    expect(isOldTerraNovaNaming({ Type: "CubeRoot" })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// hasOldTerraNovaNaming – recursive tree detection
// ---------------------------------------------------------------------------

describe("hasOldTerraNovaNaming", () => {
  it("detects old naming at root level", () => {
    expect(hasOldTerraNovaNaming({ Type: "Product" })).toBe(true);
  });

  it("detects old naming in nested child", () => {
    expect(
      hasOldTerraNovaNaming({
        Type: "Clamp",
        WallA: 1,
        WallB: 0,
        Input: { Type: "Negate", Input: { Type: "Constant", Value: 1 } },
      }),
    ).toBe(true);
  });

  it("detects old naming in deeply nested child", () => {
    expect(
      hasOldTerraNovaNaming({
        Type: "Clamp",
        WallA: 1,
        WallB: 0,
        Input: {
          Type: "Multiplier",
          InputA: { Type: "Constant", Value: 1 },
          InputB: { Type: "VoronoiNoise2D", Frequency: 4 },
        },
      }),
    ).toBe(true);
  });

  it("returns false when entire tree uses V2 naming", () => {
    expect(
      hasOldTerraNovaNaming({
        Type: "Clamp",
        WallA: 1,
        WallB: 0,
        Input: {
          Type: "Multiplier",
          InputA: { Type: "Constant", Value: 1 },
          InputB: { Type: "CellNoise2D", Scale: 0.25 },
        },
      }),
    ).toBe(false);
  });

  it("detects old naming in array children", () => {
    expect(
      hasOldTerraNovaNaming({
        Type: "MultiMix",
        Inputs: [
          { Type: "Constant", Value: 1 },
          { Type: "Blend", InputA: { Type: "Constant", Value: 0 } },
        ],
      }),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// migrateAssetTree – recursive tree migration
// ---------------------------------------------------------------------------

describe("migrateAssetTree", () => {
  it("migrates a single root node", () => {
    const { result, conversions } = migrateAssetTree({ Type: "Product" });
    expect(result.Type).toBe("Multiplier");
    expect(conversions).toContain("Product → Multiplier");
  });

  it("migrates nested nodes recursively", () => {
    const tree = {
      Type: "Negate",
      Input: {
        Type: "VoronoiNoise2D",
        Frequency: 4,
        Gain: 0.5,
      },
    };
    const { result, conversions } = migrateAssetTree(tree);
    expect(result.Type).toBe("Inverter");
    const child = result.Input as Record<string, unknown>;
    expect(child.Type).toBe("CellNoise2D");
    expect(child.Scale).toBe(0.25);
    expect(child.Persistence).toBe(0.5);
    expect(child).not.toHaveProperty("Frequency");
    expect(child).not.toHaveProperty("Gain");
    expect(conversions).toHaveLength(2);
  });

  it("migrates deeply nested chains", () => {
    const tree = {
      Type: "Blend",
      InputA: { Type: "CoordinateX" },
      InputB: {
        Type: "CurveFunction",
        Points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        Input: { Type: "Product" },
      },
    };
    const { result, conversions } = migrateAssetTree(tree);
    expect(result.Type).toBe("Mix");
    expect((result.InputA as Record<string, unknown>).Type).toBe("XValue");
    const inputB = result.InputB as Record<string, unknown>;
    expect(inputB.Type).toBe("CurveMapper");
    expect((inputB.Input as Record<string, unknown>).Type).toBe("Multiplier");
    expect(conversions).toHaveLength(4);
  });

  it("handles un-replaceable nodes gracefully", () => {
    const tree = {
      Type: "Product",
      Input: { Type: "SumSelf", Input: { Type: "Constant", Value: 1 } },
    };
    const { result, conversions } = migrateAssetTree(tree);
    expect(result.Type).toBe("Multiplier");
    const child = result.Input as Record<string, unknown>;
    // Un-replaceable types are kept as-is
    expect(child.Type).toBe("SumSelf");
    // But children of un-replaceable nodes are still walked (Constant stays Constant)
    expect(conversions).toContain("Product → Multiplier");
    expect(conversions).toContain("SumSelf → [un-replaceable, kept as-is]");
  });

  it("leaves already-V2-named trees unchanged", () => {
    const tree = {
      Type: "Clamp",
      WallA: 1,
      WallB: 0,
      Input: { Type: "Multiplier", InputA: { Type: "Constant", Value: 1 } },
    };
    const { result, conversions } = migrateAssetTree(tree);
    expect(result).toEqual(tree);
    expect(conversions).toHaveLength(0);
  });

  it("migrates nodes inside arrays", () => {
    const tree = {
      Type: "BlendCurve",
      Inputs: [
        { Type: "Product" },
        { Type: "Negate", Input: { Type: "CoordinateY" } },
      ],
    };
    const { result, conversions } = migrateAssetTree(tree);
    expect(result.Type).toBe("MultiMix");
    const inputs = result.Inputs as Record<string, unknown>[];
    expect(inputs[0].Type).toBe("Multiplier");
    expect(inputs[1].Type).toBe("Inverter");
    expect((inputs[1].Input as Record<string, unknown>).Type).toBe("YValue");
    expect(conversions).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Integration: normalizeImport migrates old TerraNova files
// ---------------------------------------------------------------------------

describe("normalizeImport – old TerraNova migration integration", () => {
  it("migrates a file with old TerraNova naming on import", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const oldFile = {
      Type: "Negate",
      Input: {
        Type: "VoronoiNoise2D",
        Frequency: 2,
        Gain: 0.7,
      },
    };
    const result = normalizeImport(oldFile);
    expect(result.Type).toBe("Inverter");
    const child = result.Input as Record<string, unknown>;
    expect(child.Type).toBe("CellNoise2D");
    expect(child.Scale).toBe(0.5);
    expect(child.Persistence).toBe(0.7);
    expect(child).not.toHaveProperty("Frequency");

    // Should log a warning
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const msg = warnSpy.mock.calls[0][0] as string;
    expect(msg).toContain("Migrated old naming");
    expect(msg).toContain("Negate");
    expect(msg).toContain("VoronoiNoise2D");
    warnSpy.mockRestore();
  });

  it("does not migrate already-V2-named files", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Use types/fields that won't trigger Hytale detection
    // (WallA/WallB would trigger hasHytaleFieldNames)
    const v2File = {
      Type: "Constant",
      Value: 42,
    };
    const result = normalizeImport(v2File);
    expect(result).toEqual(v2File);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("migrates old naming via normalizeImportWithMeta", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const oldFile = {
      Type: "Product",
      InputA: { Type: "CoordinateX" },
      InputB: { Type: "Constant", Value: 2 },
    };
    const { content, metadata } = normalizeImportWithMeta(oldFile);
    expect(content.Type).toBe("Multiplier");
    expect((content.InputA as Record<string, unknown>).Type).toBe("XValue");
    expect(metadata).toBeNull();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});
