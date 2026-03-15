import { describe, it, expect } from "vitest";
import { internalToHytale } from "../internalToHytale";
import { hytaleToInternal } from "../hytaleToInternal";
import { jsonToGraph } from "../jsonToGraph";

// ---------------------------------------------------------------------------
// Issue 1: PositionsCellNoise DistanceFunction/ReturnType export
//
// Hytale V2 expects DistanceFunction and ReturnType as objects:
//   { "$NodeId": "...", "Type": "Euclidean" }
// TerraNova stores them as strings: "Euclidean"
// The export must re-wrap them into objects.
// ---------------------------------------------------------------------------

describe("PositionsCellNoise DistanceFunction export", () => {
  it("wraps DistanceFunction string into { Type } object on export", () => {
    const internal = {
      Type: "PositionsCellNoise",
      DistanceFunction: "Euclidean",
      MaxDistance: 80,
    };

    const result = internalToHytale(internal);

    // DistanceFunction must be an object with $NodeId and Type
    expect(result.DistanceFunction).toBeDefined();
    expect(typeof result.DistanceFunction).toBe("object");
    const df = result.DistanceFunction as Record<string, unknown>;
    expect(df.Type).toBe("Euclidean");
    expect(df.$NodeId).toMatch(/^PCNDistanceFunction-/);
  });

  it("wraps Manhattan DistanceFunction correctly", () => {
    const internal = {
      Type: "PositionsCellNoise",
      DistanceFunction: "Manhattan",
      MaxDistance: 40,
    };

    const result = internalToHytale(internal);
    const df = result.DistanceFunction as Record<string, unknown>;
    expect(df.Type).toBe("Manhattan");
    expect(df.$NodeId).toMatch(/^PCNDistanceFunction-/);
  });

  it("wraps ReturnType string into { Type } object on export", () => {
    const internal = {
      Type: "PositionsCellNoise",
      DistanceFunction: "Euclidean",
      ReturnType: "Distance2Sub",
      MaxDistance: 80,
    };

    const result = internalToHytale(internal);

    // ReturnType must be an object with $NodeId and Type
    expect(result.ReturnType).toBeDefined();
    expect(typeof result.ReturnType).toBe("object");
    const rt = result.ReturnType as Record<string, unknown>;
    expect(rt.Type).toBe("Distance2Sub");
    expect(rt.$NodeId).toMatch(/PCNReturnType-/);
  });

  it("wraps Curve ReturnType and nests Curve data inside it", () => {
    const internal = {
      Type: "PositionsCellNoise",
      DistanceFunction: "Euclidean",
      ReturnType: "Curve",
      ReturnCurve: {
        Type: "Manual",
        Points: [
          [0, 0],
          [1, 1],
        ],
      },
      MaxDistance: 80,
    };

    const result = internalToHytale(internal);

    // ReturnType should be an object containing the Curve
    const rt = result.ReturnType as Record<string, unknown>;
    expect(rt.Type).toBe("Curve");
    expect(rt.$NodeId).toMatch(/PCNReturnType-/);
    // Curve should be nested inside ReturnType, not as a sibling field
    expect(rt.Curve).toBeDefined();
    expect(typeof rt.Curve).toBe("object");
    // Curve should NOT remain as a sibling field on the main node
    expect(result.Curve).toBeUndefined();
  });

  it("round-trips DistanceFunction through import→export", () => {
    // V2 Hytale format
    const v2 = {
      $NodeId: "PositionsCellNoiseDensityNode-abc",
      Type: "PositionsCellNoise",
      Skip: false,
      DistanceFunction: {
        $NodeId: "PCNDistanceFunction-def",
        Type: "Euclidean",
      },
      ReturnType: {
        $NodeId: "Distance2SubPCNReturnType-ghi",
        Type: "Distance2Sub",
      },
      MaxDistance: 80,
    };

    // Import: V2 → internal
    const { asset: internal } = hytaleToInternal(v2);
    expect(internal.DistanceFunction).toBe("Euclidean");
    expect(internal.ReturnType).toBe("Distance2Sub");

    // Export: internal → V2
    const exported = internalToHytale(internal as { Type: string; [key: string]: unknown });

    // Verify DistanceFunction is wrapped back to an object
    const df = exported.DistanceFunction as Record<string, unknown>;
    expect(typeof df).toBe("object");
    expect(df.Type).toBe("Euclidean");
    expect(df.$NodeId).toBeDefined();

    // Verify ReturnType is wrapped back to an object
    const rt = exported.ReturnType as Record<string, unknown>;
    expect(typeof rt).toBe("object");
    expect(rt.Type).toBe("Distance2Sub");
    expect(rt.$NodeId).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Issue 3: Scaler Point3D (Scale) import connection
//
// V2's Scaler position provider has Scale: Point3D.
// On import, the Point3D should become a Vector:Constant child node
// connected to the Scaler's "Scale" handle.
// ---------------------------------------------------------------------------

describe("Scaler Point3D import", () => {
  it("creates Vector:Constant child node connected to Scale handle", () => {
    const v2Scaler = {
      $NodeId: "ScalerPositions-abc",
      Type: "Scaler",
      Skip: false,
      Scale: {
        $NodeId: "Point3D-def",
        X: 32,
        Y: 1,
        Z: 32,
      },
    };

    // Step 1: V2 → internal (Point3D → Vector:Constant)
    const { asset } = hytaleToInternal(v2Scaler);
    expect(asset.Type).toBe("Scaler");
    const scale = asset.Scale as Record<string, unknown>;
    expect(scale.Type).toBe("Constant");
    expect(scale.Value).toEqual({ x: 32, y: 1, z: 32 });

    // Step 2: internal → graph (creates child node with edge)
    const { nodes, edges } = jsonToGraph(
      asset as { Type: string; [key: string]: unknown },
      0, 0, "test", "Positions",
    );

    const scalerNode = nodes.find((n) => n.type === "Position:Scaler");
    const vectorNode = nodes.find((n) => n.type === "Vector:Constant");
    expect(scalerNode).toBeDefined();
    expect(vectorNode).toBeDefined();

    // Edge connects Vector:Constant → Scaler on handle "Scale"
    const scaleEdge = edges.find(
      (e) => e.source === vectorNode!.id && e.target === scalerNode!.id,
    );
    expect(scaleEdge).toBeDefined();
    expect(scaleEdge!.targetHandle).toBe("Scale");
  });
});

// ---------------------------------------------------------------------------
// Issue 2a: SimpleHorizontal Materials[] → Material (singular) on export
//
// V2's SimpleHorizontal uses Material (singular port), not Materials array.
// TerraNova internally uses Materials[0] handles but must export as Material.
// ---------------------------------------------------------------------------

describe("SimpleHorizontal Materials export", () => {
  it("converts Materials array to singular Material on export", () => {
    const internal = {
      Type: "Material:SimpleHorizontal",
      Materials: [
        { Type: "Constant", Material: "Soil_Grass" },
      ],
      TopY: 64,
      BottomY: 0,
    };

    // Strip category prefix for export (transformNode uses stripCategoryPrefix)
    const forExport = { ...internal, Type: "SimpleHorizontal" };
    const result = internalToHytale(forExport);

    // Should have Material (singular), not Materials (array)
    expect(result.Materials).toBeUndefined();
    expect(result.Material).toBeDefined();
    expect(typeof result.Material).toBe("object");
    const mat = result.Material as Record<string, unknown>;
    expect(mat.Type).toBe("Constant");
  });

  it("handles SimpleHorizontal with multiple Materials (takes first)", () => {
    const forExport = {
      Type: "SimpleHorizontal",
      Materials: [
        { Type: "Constant", Material: "Soil_Grass" },
        { Type: "Constant", Material: "Soil_Dirt" },
      ],
      TopY: 64,
      BottomY: 0,
    };

    const result = internalToHytale(forExport);
    expect(result.Materials).toBeUndefined();
    expect(result.Material).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Issue 2b: Named-map (StringCodecMapCodec) handling on import
//
// V2 encodes array fields as named-map objects:
//   "Materials": { "key1": { "Type": "Constant", ... }, "key2": { ... } }
// TerraNova needs to convert these to arrays on import.
// ---------------------------------------------------------------------------

describe("StringCodecMapCodec named-map import", () => {
  it("converts SimpleHorizontal Materials named map to array on import", () => {
    const v2 = {
      $NodeId: "SimpleHorizontalMaterialProvider-abc",
      Type: "SimpleHorizontal",
      Skip: false,
      Seed: "A",
      Scale: 64.0,
      Materials: {
        "ConstantMaterialProvider-def": {
          $NodeId: "ConstantMaterialProvider-def",
          Type: "Constant",
          Skip: false,
          Material: { $NodeId: "Material-1", Solid: "Soil_Grass" },
        },
        "ConstantMaterialProvider-ghi": {
          $NodeId: "ConstantMaterialProvider-ghi",
          Type: "Constant",
          Skip: false,
          Material: { $NodeId: "Material-2", Solid: "Soil_Dirt" },
        },
      },
    };

    const { asset } = hytaleToInternal(v2);

    // Materials should be converted to an array
    expect(Array.isArray(asset.Materials)).toBe(true);
    const materials = asset.Materials as Record<string, unknown>[];
    expect(materials).toHaveLength(2);
    // Each entry should be a transformed material provider
    expect(materials[0].Type).toBe("Constant");
    expect(materials[1].Type).toBe("Constant");
  });

  it("converts Queue Inputs named map to array on import", () => {
    const v2 = {
      $NodeId: "QueueMaterialProvider-abc",
      Type: "Queue",
      Skip: false,
      Queue: {
        "DownwardDepthMaterialProvider-1": {
          $NodeId: "DownwardDepthMaterialProvider-1",
          Type: "DownwardDepth",
          Depth: 1,
          Material: { $NodeId: "m1", Solid: "grass" },
        },
        "ConstantMaterialProvider-2": {
          $NodeId: "ConstantMaterialProvider-2",
          Type: "Constant",
          Material: { $NodeId: "m2", Solid: "stone" },
        },
      },
    };

    const { asset } = hytaleToInternal(v2);

    // Queue should be converted to an array
    expect(Array.isArray(asset.Queue)).toBe(true);
    const queue = asset.Queue as Record<string, unknown>[];
    expect(queue).toHaveLength(2);
    expect(queue[0].Type).toBe("DownwardDepth");
    expect(queue[1].Type).toBe("Constant");
  });

  it("handles already-array Materials format (no conversion needed)", () => {
    const v2 = {
      $NodeId: "SimpleHorizontalMaterialProvider-abc",
      Type: "SimpleHorizontal",
      Skip: false,
      Materials: [
        {
          $NodeId: "ConstantMaterialProvider-def",
          Type: "Constant",
          Material: { $NodeId: "Material-1", Solid: "Soil_Grass" },
        },
      ],
    };

    const { asset } = hytaleToInternal(v2);
    expect(Array.isArray(asset.Materials)).toBe(true);
    const materials = asset.Materials as Record<string, unknown>[];
    expect(materials).toHaveLength(1);
    expect(materials[0].Type).toBe("Constant");
  });
});
