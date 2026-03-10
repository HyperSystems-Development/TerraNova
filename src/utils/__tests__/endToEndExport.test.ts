/**
 * End-to-end export pipeline tests.
 *
 * Validates the full Hytale-native â†’ import â†’ internal â†’ export â†’ Hytale-native
 * pipeline for various file types and edge cases.
 */
import { describe, it, expect } from "vitest";
import { internalToHytale, internalToHytaleBiome, transformNode } from "../internalToHytale";
import { hytaleToInternal, hytaleToInternalBiome } from "../hytaleToInternal";
import { graphToJson } from "../graphToJson";
import { jsonToGraph } from "../jsonToGraph";
import { validateExport } from "../exportAssetPack";

// ---------------------------------------------------------------------------
// Helper: full round-trip through the pipeline
// ---------------------------------------------------------------------------

/** Import Hytale-native â†’ internal â†’ graph â†’ JSON â†’ export Hytale-native */
function roundTrip(hytaleInput: Record<string, unknown>): Record<string, unknown> {
  const { asset } = hytaleToInternal(hytaleInput);
  const { nodes, edges } = jsonToGraph(asset);
  const internalJson = graphToJson(nodes, edges)!;
  return internalToHytale(internalJson as { Type: string; [key: string]: unknown });
}

// ---------------------------------------------------------------------------
// 1. Example-Biome format round-trip
// ---------------------------------------------------------------------------

describe("Example-Biome format round-trip", () => {
  const EXAMPLE_BIOME_STRUCTURE: Record<string, unknown> = {
    $NodeId: "Biome-aaa",
    $Position: { x: 100, y: 200 },
    Name: "Example_Biome",
    Terrain: {
      $NodeId: "Terrain-bbb",
      Density: {
        $NodeId: "ClampDensityNode-ccc",
        Type: "Clamp",
        Skip: false,
        WallA: 0,
        WallB: 1,
        Inputs: [
          {
            $NodeId: "SimplexNoise2DDensityNode-ddd",
            Type: "SimplexNoise2D",
            Skip: false,
            Scale: 100,
            Octaves: 4,
            Lacunarity: 2.0,
            Persistence: 0.5,
            Seed: "A",
          },
        ],
      },
    },
    MaterialProvider: {
      $NodeId: "SolidityMaterialProvider-eee",
      Type: "Solidity",
      Solid: {
        $NodeId: "ConstantMaterialProvider-fff",
        Type: "Constant",
        Skip: false,
        Material: {
          $NodeId: "Material-ggg",
          Solid: "Stone",
        },
      },
      Empty: {
        $NodeId: "QueueMaterialProvider-hhh",
        Type: "Queue",
        Queue: [
          {
            $NodeId: "ConstantMaterialProvider-iii",
            Type: "Constant",
            Material: {
              $NodeId: "Material-jjj",
              Solid: "Empty",
            },
          },
        ],
      },
    },
  };

  it("imports and exports without data loss", () => {
    const { wrapper } = hytaleToInternalBiome(EXAMPLE_BIOME_STRUCTURE);

    // Verify $Position was stripped on import
    expect(wrapper).not.toHaveProperty("$Position");

    // Verify Name preserved
    expect(wrapper.Name).toBe("Example_Biome");

    // Verify Terrain.Density was imported
    expect(wrapper.Terrain).toBeDefined();
    const terrain = wrapper.Terrain as Record<string, unknown>;
    expect(terrain.Density).toBeDefined();

    // Export back
    const exported = internalToHytaleBiome(wrapper);
    expect(exported.Name).toBe("Example_Biome");
    expect(exported.Terrain).toBeDefined();
    expect(exported.MaterialProvider).toBeDefined();

    // Verify Solidity envelope is reconstructed
    const mp = exported.MaterialProvider as Record<string, unknown>;
    expect(mp.Type).toBe("Solidity");
    expect(mp.Solid).toBeDefined();
    expect(mp.Empty).toBeDefined();
  });

  it("strips $Position from import (does not appear in internal format)", () => {
    const { wrapper } = hytaleToInternalBiome(EXAMPLE_BIOME_STRUCTURE);
    // $Position should not appear anywhere in the wrapper
    const jsonStr = JSON.stringify(wrapper);
    expect(jsonStr).not.toContain("$Position");
  });
});

// ---------------------------------------------------------------------------
// 2. Biome with fluid Empty branch
// ---------------------------------------------------------------------------

describe("Biome with fluid Empty branch", () => {
  const FLUID_BIOME: Record<string, unknown> = {
    $NodeId: "Biome-fluid",
    Name: "Ocean_Biome",
    Terrain: {
      $NodeId: "Terrain-t1",
      Density: {
        $NodeId: "ConstantDensityNode-d1",
        Type: "Constant",
        Skip: false,
        Value: 0.5,
      },
    },
    MaterialProvider: {
      $NodeId: "SolidityMaterialProvider-s1",
      Type: "Solidity",
      Solid: {
        $NodeId: "ConstantMaterialProvider-c1",
        Type: "Constant",
        Skip: false,
        Material: { $NodeId: "Material-m1", Solid: "Sand" },
      },
      Empty: {
        $NodeId: "SimpleHorizontalMaterialProvider-sh1",
        Type: "SimpleHorizontal",
        TopY: 64,
        BottomY: 0,
        Material: {
          $NodeId: "ConstantMaterialProvider-cm1",
          Type: "Constant",
          Material: {
            $NodeId: "Material-fm1",
            Fluid: "Water",
          },
        },
      },
    },
  };

  it("round-trips preserving fluid info", () => {
    const { wrapper } = hytaleToInternalBiome(FLUID_BIOME);

    // Fluid info should be extracted
    expect(wrapper.FluidLevel).toBe(64);
    expect(wrapper.FluidMaterial).toBe("Water");

    // Export back
    const exported = internalToHytaleBiome(wrapper);
    const mp = exported.MaterialProvider as Record<string, unknown>;
    const empty = mp.Empty as Record<string, unknown>;
    expect(empty.Type).toBe("SimpleHorizontal");
    expect(empty.TopY).toBe(64);

    // Check fluid material is nested correctly
    const emptyMat = empty.Material as Record<string, unknown>;
    expect(emptyMat.Type).toBe("Constant");
    const innerMat = emptyMat.Material as Record<string, unknown>;
    expect(innerMat.Fluid).toBe("Water");
  });
});

// ---------------------------------------------------------------------------
// 3. Biome with non-standard Empty branch (complex, no fluid pattern)
// ---------------------------------------------------------------------------

describe("Biome with non-standard Empty branch", () => {
  const COMPLEX_EMPTY_BIOME: Record<string, unknown> = {
    $NodeId: "Biome-complex",
    Name: "Custom_Biome",
    Terrain: {
      $NodeId: "Terrain-t2",
      Density: {
        $NodeId: "ConstantDensityNode-d2",
        Type: "Constant",
        Skip: false,
        Value: 1.0,
      },
    },
    MaterialProvider: {
      $NodeId: "SolidityMaterialProvider-s2",
      Type: "Solidity",
      Solid: {
        $NodeId: "ConstantMaterialProvider-c2",
        Type: "Constant",
        Skip: false,
        Material: { $NodeId: "Material-m2", Solid: "Dirt" },
      },
      Empty: {
        $NodeId: "CustomBranch-cb1",
        Type: "SpaceAndDepth",
        LayerContext: "DEPTH_INTO_FLOOR",
        MaxExpectedDepth: 8,
        Layers: [
          {
            $NodeId: "Layer-l1",
            Type: "ConstantThickness",
            Thickness: 2,
            Material: {
              $NodeId: "ConstantMaterialProvider-cm2",
              Type: "Constant",
              Material: { $NodeId: "Material-ml1", Solid: "Moss" },
            },
          },
          {
            $NodeId: "Layer-l2",
            Type: "ConstantThickness",
            Thickness: 6,
            Material: {
              $NodeId: "ConstantMaterialProvider-cm3",
              Type: "Constant",
              Material: { $NodeId: "Material-ml2", Solid: "Stone" },
            },
          },
        ],
      },
    },
  };

  it("preserves complex Empty branch via _originalEmptyBranch", () => {
    const { wrapper } = hytaleToInternalBiome(COMPLEX_EMPTY_BIOME);

    // Should NOT have fluid fields (not a fluid pattern)
    expect(wrapper.FluidLevel).toBeUndefined();
    expect(wrapper.FluidMaterial).toBeUndefined();

    // Should have preserved the original Empty branch
    expect(wrapper._originalEmptyBranch).toBeDefined();
    const preserved = wrapper._originalEmptyBranch as Record<string, unknown>;
    expect(preserved.Type).toBe("SpaceAndDepth");

    // Export back
    const exported = internalToHytaleBiome(wrapper);
    const mp = exported.MaterialProvider as Record<string, unknown>;
    const empty = mp.Empty as Record<string, unknown>;

    // The preserved branch should be re-exported
    expect(empty.Type).toBe("SpaceAndDepth");
    expect(empty.LayerContext).toBe("DEPTH_INTO_FLOOR");
  });
});

// ---------------------------------------------------------------------------
// 4. NoiseRange with Framework entries
// ---------------------------------------------------------------------------

describe("NoiseRange round-trip", () => {
  const NOISE_RANGE: Record<string, unknown> = {
    $NodeId: "NoiseRange-nr1",
    Type: "NoiseRange",
    Skip: false,
    DefaultBiome: "Plains",
    DefaultTransitionDistance: 16,
    MaxBiomeEdgeDistance: 32,
    Density: {
      $NodeId: "SimplexNoise2DDensityNode-sn1",
      Type: "SimplexNoise2D",
      Skip: false,
      Scale: 200,
      Octaves: 3,
      Lacunarity: 2.0,
      Persistence: 0.5,
      Seed: "B",
    },
    Biomes: [
      { Biome: "Forest", Min: 0.3, Max: 0.7 },
      { Biome: "Desert", Min: 0.7, Max: 1.0 },
    ],
  };

  it("imports and exports preserving structure", () => {
    const result = roundTrip(NOISE_RANGE);

    // Type should be preserved
    expect(result.Type).toBe("NoiseRange");
  });
});

// ---------------------------------------------------------------------------
// 5. Compound node round-trips
// ---------------------------------------------------------------------------

describe("compound node round-trips", () => {
  it("SimplexRidgeNoise2D â†’ Abs(SimplexNoise2D) â†’ SimplexRidgeNoise2D", () => {
    // Start with internal format
    const internal = {
      Type: "SimplexRidgeNoise2D",
      Frequency: 0.01,
      Seed: "A",
      Octaves: 3,
      Lacunarity: 2.0,
      Gain: 0.5,
    };

    // Export to Hytale
    const exported = internalToHytale(internal);
    expect(exported.Type).toBe("Abs");
    const inputs = exported.Inputs as Record<string, unknown>[];
    expect(inputs).toHaveLength(1);
    expect(inputs[0].Type).toBe("SimplexNoise2D");

    // Import back
    const { asset: reimported } = hytaleToInternal(exported);
    expect(reimported.Type).toBe("SimplexRidgeNoise2D");
  });

  it("GradientDensity â†’ Normalizer(YValue) â†’ GradientDensity", () => {
    const internal = { Type: "GradientDensity", FromY: 100, ToY: 40 };
    const exported = internalToHytale(internal);
    expect(exported.Type).toBe("Normalizer");

    const { asset: reimported } = hytaleToInternal(exported);
    expect(reimported.Type).toBe("GradientDensity");
    expect(reimported.FromY).toBe(100);
    expect(reimported.ToY).toBe(40);
  });

  it("HeightGradient material â†’ Queue[FieldFunction(YValue)]", () => {
    const internal = {
      Type: "HeightGradient",
      Range: { Min: 20, Max: 60 },
      Low: { Type: "Constant", Material: "Rock_Volcanic" },
      High: { Type: "Constant", Material: "Rock_Shale" },
    };

    // HeightGradient conversion requires material category context
    const exported = transformNode(
      internal as { Type: string; [key: string]: unknown },
      { parentField: "MaterialProvider", category: "material" },
    );
    expect(exported.Type).toBe("Queue");
    const queue = exported.Queue as Record<string, unknown>[];
    expect(queue.length).toBeGreaterThanOrEqual(2);
    expect(queue[0].Type).toBe("FieldFunction");
  });

  it("LinearTransform with non-zero offset â†’ Sum(AmplitudeConstant, Constant)", () => {
    const internal = {
      Type: "LinearTransform",
      Scale: 2.0,
      Offset: 5.0,
      Input: { Type: "Constant", Value: 1.0 },
    };

    const exported = internalToHytale(internal);
    expect(exported.Type).toBe("Sum");
    const inputs = exported.Inputs as Record<string, unknown>[];
    expect(inputs).toHaveLength(2);
    expect(inputs[0].Type).toBe("AmplitudeConstant");
    expect(inputs[1].Type).toBe("Constant");
    expect(inputs[1].Value).toBe(5.0);
  });

  it("Density Conditional â†’ Mix with step function", () => {
    const internal = {
      Type: "Conditional",
      Threshold: 0.5,
      Condition: { Type: "SimplexNoise2D", Frequency: 0.01, Seed: "A" },
      TrueInput: { Type: "Constant", Value: 1.0 },
      FalseInput: { Type: "Constant", Value: 0.0 },
    };

    const exported = internalToHytale(internal);
    expect(exported.Type).toBe("Mix");
    expect(exported.$Comment).toBe("Conditional(Threshold=0.5)");

    const inputs = exported.Inputs as Record<string, unknown>[];
    expect(inputs).toHaveLength(3);
  });

  it("Material Conditional chain â†’ Queue[FieldFunction]", () => {
    const internal = {
      Type: "Material:Conditional",
      Threshold: 0.7,
      Condition: { Type: "SimplexNoise2D", Frequency: 0.01, Seed: "A" },
      TrueInput: { Type: "Constant", Material: "Gravel" },
      FalseInput: {
        Type: "Material:Conditional",
        Threshold: 0.3,
        Condition: { Type: "SimplexNoise2D", Frequency: 0.02, Seed: "B" },
        TrueInput: { Type: "Constant", Material: "Sand" },
        FalseInput: { Type: "Constant", Material: "Dirt" },
      },
    };

    const exported = internalToHytale(internal);
    expect(exported.Type).toBe("Queue");
    const queue = exported.Queue as Record<string, unknown>[];
    expect(queue.length).toBe(3); // 2 FieldFunctions + 1 fallback
    expect(queue[0].Type).toBe("FieldFunction");
    expect(queue[1].Type).toBe("FieldFunction");
  });
});

// ---------------------------------------------------------------------------
// 6. $DisconnectedTrees stripping
// ---------------------------------------------------------------------------

describe("$DisconnectedTrees stripping", () => {
  it("does not include $DisconnectedTrees in export output", () => {
    const internal = {
      Type: "Clamp",
      Min: 0,
      Max: 1,
      Input: { Type: "Constant", Value: 0.5 },
      $DisconnectedTrees: [
        { Type: "SimplexNoise2D", Frequency: 0.01 },
      ],
    };

    const exported = internalToHytale(internal);
    expect(exported).not.toHaveProperty("$DisconnectedTrees");
    expect(exported.Type).toBe("Clamp");
  });

  it("strips $DisconnectedTrees through graph round-trip", () => {
    const internal = {
      Type: "Sum",
      InputA: { Type: "Constant", Value: 1 },
      InputB: { Type: "Constant", Value: 2 },
      $DisconnectedTrees: [
        { Type: "SimplexNoise2D", Frequency: 0.05, Seed: 1 },
      ],
    };

    const { nodes, edges } = jsonToGraph(internal);
    const rebuilt = graphToJson(nodes, edges)!;
    const exported = internalToHytale(rebuilt as { Type: string; [key: string]: unknown });

    expect(exported).not.toHaveProperty("$DisconnectedTrees");
  });
});

// ---------------------------------------------------------------------------
// 7. $Position stripping
// ---------------------------------------------------------------------------

describe("$Position and editor metadata stripping", () => {
  it("strips $Position from Hytale native import", () => {
    const hytaleNative = {
      $NodeId: "ClampDensityNode-123",
      $Position: { x: 100, y: 200 },
      Type: "Clamp",
      Skip: false,
      WallA: 0,
      WallB: 1,
      Inputs: [
        {
          $NodeId: "ConstantDensityNode-456",
          $Position: { x: 50, y: 100 },
          Type: "Constant",
          Skip: false,
          Value: 0.5,
        },
      ],
    };

    const { asset } = hytaleToInternal(hytaleNative);

    // $Position should not appear anywhere
    const jsonStr = JSON.stringify(asset);
    expect(jsonStr).not.toContain("$Position");

    // Actual fields should be preserved (WallAâ†’Max, WallBâ†’Min per Hytale spec)
    expect(asset.Type).toBe("Clamp");
    expect(asset.Min).toBe(1);
    expect(asset.Max).toBe(0);
  });

  it("strips $Title, $WorkspaceID, $Groups from biome import", () => {
    const hytaleNative: Record<string, unknown> = {
      $NodeId: "Biome-xyz",
      $Title: "My Biome",
      $WorkspaceID: "ws-123",
      $Groups: [{ name: "test" }],
      Name: "Test_Biome",
      Terrain: {
        $NodeId: "Terrain-abc",
        Density: {
          $NodeId: "ConstantDensityNode-def",
          Type: "Constant",
          Skip: false,
          Value: 1.0,
        },
      },
    };

    const { wrapper } = hytaleToInternalBiome(hytaleNative);

    expect(wrapper).not.toHaveProperty("$Title");
    expect(wrapper).not.toHaveProperty("$WorkspaceID");
    expect(wrapper).not.toHaveProperty("$Groups");
    expect(wrapper.Name).toBe("Test_Biome");
  });
});

// ---------------------------------------------------------------------------
// 8. Framework type handling
// ---------------------------------------------------------------------------

describe("Framework types", () => {
  it("does not inject $NodeId/Skip for Positions framework type", () => {
    const internal = { Type: "Positions", entries: [{ x: 0, y: 0, z: 0 }] };
    const exported = internalToHytale(internal);
    expect(exported.Type).toBe("Positions");
    expect(exported).not.toHaveProperty("$NodeId");
    expect(exported).not.toHaveProperty("Skip");
  });

  it("does not inject $NodeId/Skip for DecimalConstants framework type", () => {
    const internal = { Type: "DecimalConstants", values: [1.0, 2.0, 3.0] };
    const exported = internalToHytale(internal);
    expect(exported.Type).toBe("DecimalConstants");
    expect(exported).not.toHaveProperty("$NodeId");
    expect(exported).not.toHaveProperty("Skip");
  });
});

// ---------------------------------------------------------------------------
// 9. validateExport
// ---------------------------------------------------------------------------

describe("validateExport", () => {
  it("returns no warnings for valid biome export", () => {
    const validBiome = {
      Name: "Test",
      Terrain: { Density: { Type: "Constant", Value: 1 } },
      MaterialProvider: { Type: "Solidity", Solid: { Type: "Constant" } },
    };
    const warnings = validateExport(validBiome, "/Biomes/Test.json");
    expect(warnings).toHaveLength(0);
  });

  it("warns when biome is missing Name", () => {
    const badBiome = {
      Name: "",
      Terrain: { Density: { Type: "Constant", Value: 1 } },
    };
    const warnings = validateExport(badBiome, "/Biomes/Test.json");
    expect(warnings.some((w) => w.includes("Name"))).toBe(true);
  });

  it("warns when biome is missing Terrain.Density", () => {
    const badBiome = {
      Name: "Test",
      Terrain: {},
    };
    const warnings = validateExport(badBiome, "/Biomes/Test.json");
    expect(warnings.some((w) => w.includes("Density"))).toBe(true);
  });

  it("warns about empty material strings", () => {
    const badAsset = {
      Type: "Constant",
      Material: { Solid: "" },
    };
    const warnings = validateExport(badAsset);
    expect(warnings.some((w) => w.includes("empty material"))).toBe(true);
  });

  it("warns about null values", () => {
    const badAsset = {
      Type: "Clamp",
      Min: null,
      Max: 1,
    };
    const warnings = validateExport(badAsset as Record<string, unknown>);
    expect(warnings.some((w) => w.includes("null"))).toBe(true);
  });

  it("returns no warnings for valid NoiseRange", () => {
    const valid = {
      Type: "NoiseRange",
      DefaultBiome: "Plains",
      Density: { Type: "Constant", Value: 1 },
    };
    const warnings = validateExport(valid);
    expect(warnings).toHaveLength(0);
  });

  it("warns when NoiseRange is missing DefaultBiome", () => {
    const bad = {
      Type: "NoiseRange",
      DefaultBiome: "",
      Density: { Type: "Constant", Value: 1 },
    };
    const warnings = validateExport(bad);
    expect(warnings.some((w) => w.includes("DefaultBiome"))).toBe(true);
  });
});

