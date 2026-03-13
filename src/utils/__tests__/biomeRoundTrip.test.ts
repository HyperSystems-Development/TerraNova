import { describe, it, expect } from "vitest";
import { graphToJson, graphToJsonMulti } from "../graphToJson";
import { jsonToGraph } from "../jsonToGraph";
import { hytaleToInternalBiome } from "../hytaleToInternal";

const MATERIAL_PROVIDER = {
  Type: "Conditional",
  Threshold: 0.6,
  Condition: {
    Type: "SimplexNoise2D",
    Frequency: 0.008,
    Amplitude: 1.0,
    Seed: 50,
    Octaves: 2,
    Lacunarity: 2.0,
    Gain: 0.5,
  },
  TrueInput: {
    Type: "Constant",
    Material: "gravel",
  },
  FalseInput: {
    Type: "SpaceAndDepth",
    DepthThreshold: 3,
    Solid: {
      Type: "HeightGradient",
      Range: { Min: 0, Max: 70 },
      Low: { Type: "Constant", Material: "stone" },
      High: { Type: "Constant", Material: "dirt" },
    },
    Empty: {
      Type: "Constant",
      Material: "grass",
    },
  },
};

const BIOME_WRAPPER = {
  Name: "forest_hills",
  Terrain: {
    Type: "DAOTerrain",
    Density: {
      Type: "Clamp",
      Min: -1,
      Max: 1,
      Input: {
        Type: "SimplexNoise2D",
        Frequency: 0.003,
        Amplitude: 1.0,
        Seed: 1,
      },
    },
  },
  MaterialProvider: MATERIAL_PROVIDER,
  Props: [
    {
      Runtime: 0,
      Skip: false,
      Positions: { Type: "Mesh2D", Resolution: 12, Jitter: 0.4 },
      Assignments: {
        Type: "Constant",
        Prop: { Type: "Prefab", Path: "props/trees/oak" },
      },
    },
  ],
  EnvironmentProvider: { Type: "Default" },
  TintProvider: { Type: "Gradient", From: "#2d5a1e", To: "#1a3a0e" },
};

describe("Biome detection", () => {
  it("identifies biome files (has Terrain, no Type)", () => {
    expect("Type" in BIOME_WRAPPER).toBe(false);
    expect("Terrain" in BIOME_WRAPPER).toBe(true);
  });

  it("rejects typed assets as biome files", () => {
    const noiseRange = { Type: "NoiseRange", Terrain: {} };
    expect("Type" in noiseRange).toBe(true);
  });

  it("rejects empty objects", () => {
    expect("Terrain" in {}).toBe(false);
  });
});

describe("MaterialProvider round-trip", () => {
  it("graphs and reconstructs MaterialProvider", () => {
    const { nodes, edges } = jsonToGraph(MATERIAL_PROVIDER);
    expect(nodes.length).toBeGreaterThan(1);
    expect(edges.length).toBeGreaterThan(0);

    const result = graphToJson(nodes, edges);
    expect(result).toEqual(MATERIAL_PROVIDER);
  });
});

describe("graphToJsonMulti with disconnected subtrees", () => {
  it("serializes two independent subtrees", () => {
    const tree1 = { Type: "Constant", Value: 1.0 };
    const tree2 = { Type: "Constant", Value: 2.0 };

    const { nodes: n1, edges: e1 } = jsonToGraph(tree1, 0, 0, "a");
    const { nodes: n2, edges: e2 } = jsonToGraph(tree2, 300, 0, "b");

    const allNodes = [...n1, ...n2];
    const allEdges = [...e1, ...e2];

    const results = graphToJsonMulti(allNodes, allEdges);
    expect(results).toHaveLength(2);
    expect(results).toContainEqual(tree1);
    expect(results).toContainEqual(tree2);
  });

  it("handles a single connected tree", () => {
    const tree = {
      Type: "Clamp",
      Min: 0,
      Max: 1,
      Input: { Type: "Constant", Value: 0.5 },
    };
    const { nodes, edges } = jsonToGraph(tree);
    const results = graphToJsonMulti(nodes, edges);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(tree);
  });
});

describe("idPrefix prevents ID collisions", () => {
  it("nodes from different prefixes have unique IDs", () => {
    const tree = { Type: "Constant", Value: 1.0 };

    const { nodes: n1 } = jsonToGraph(tree, 0, 0, "alpha");
    const { nodes: n2 } = jsonToGraph(tree, 0, 0, "beta");

    expect(n1[0].id).toMatch(/^alpha_/);
    expect(n2[0].id).toMatch(/^beta_/);
    expect(n1[0].id).not.toBe(n2[0].id);
  });

  it("default prefix is 'graph'", () => {
    const { nodes } = jsonToGraph({ Type: "Constant", Value: 0 });
    expect(nodes[0].id).toMatch(/^graph_/);
  });
});

describe("Biome section extraction", () => {
  it("Terrain Density subtree round-trips", () => {
    const density = BIOME_WRAPPER.Terrain.Density;
    const { nodes, edges } = jsonToGraph(density, 0, 0, "terrain");
    const result = graphToJson(nodes, edges);
    expect(result).toEqual(density);
  });

  it("Positions subtree round-trips", () => {
    const positions = BIOME_WRAPPER.Props[0].Positions;
    const { nodes, edges } = jsonToGraph(positions, 0, 0, "pos_0");
    const result = graphToJson(nodes, edges);
    expect(result).toEqual(positions);
  });

  it("Assignments subtree round-trips", () => {
    const assignments = BIOME_WRAPPER.Props[0].Assignments;
    const { nodes, edges } = jsonToGraph(assignments, 0, 0, "asgn_0");
    const result = graphToJson(nodes, edges);
    expect(result).toEqual(assignments);
  });
});

describe("Prop section node types and edges with rootParentField", () => {
  it("Positions root gets Position: prefix", () => {
    const positions = BIOME_WRAPPER.Props[0].Positions;
    const { nodes } = jsonToGraph(positions, 0, 0, "pos_0", "Positions");
    const root = nodes[nodes.length - 1];
    expect(root.type).toBe("Position:Mesh2D");
  });

  it("Assignments root gets Assignment: prefix", () => {
    const assignments = BIOME_WRAPPER.Props[0].Assignments;
    const { nodes } = jsonToGraph(assignments, 0, 0, "asgn_0", "Assignments");
    const root = nodes[nodes.length - 1];
    expect(root.type).toBe("Assignment:Constant");
  });

  it("Prop child of Assignment:Constant gets Prop: prefix and edge", () => {
    const assignments = BIOME_WRAPPER.Props[0].Assignments;
    const { nodes, edges } = jsonToGraph(assignments, 0, 0, "asgn_0", "Assignments");
    // Should have 2 nodes: Prop:Prefab and Assignment:Constant
    expect(nodes.length).toBe(2);
    const propNode = nodes.find((n) => n.type === "Prop:Prefab");
    const assignNode = nodes.find((n) => n.type === "Assignment:Constant");
    expect(propNode).toBeDefined();
    expect(assignNode).toBeDefined();
    // Edge from Prop:Prefab → Assignment:Constant on handle "Prop"
    expect(edges.length).toBe(1);
    expect(edges[0].source).toBe(propNode!.id);
    expect(edges[0].sourceHandle).toBe("output");
    expect(edges[0].target).toBe(assignNode!.id);
    expect(edges[0].targetHandle).toBe("Prop");
  });

  it("Complex prop tree: Conditional with nested Prefab children", () => {
    const assignments = {
      Type: "Constant",
      Prop: {
        Type: "Conditional",
        Threshold: 0.5,
        Condition: { Type: "SimplexNoise2D", Frequency: 0.01, Seed: 1 },
        TrueInput: { Type: "Prefab", Path: "trees/oak" },
        FalseInput: { Type: "Prefab", Path: "trees/birch" },
      },
    };
    const { nodes, edges } = jsonToGraph(assignments, 0, 0, "asgn_0", "Assignments");
    // 5 nodes: SimplexNoise2D, Prefab(oak), Prefab(birch), Prop:Conditional, Assignment:Constant
    expect(nodes.length).toBe(5);
    expect(nodes.find((n) => n.type === "Assignment:Constant")).toBeDefined();
    expect(nodes.find((n) => n.type === "Prop:Conditional")).toBeDefined();
    // Noise condition has no prefix (density)
    expect(nodes.find((n) => n.type === "SimplexNoise2D")).toBeDefined();
    // TrueInput/FalseInput Prefabs — currently no FIELD_CATEGORY_PREFIX for these
    // so they won't get Prop: prefix. Check that edges still exist.
    expect(edges.length).toBe(4);
    // Verify round-trip preserves all data
    const result = graphToJson(nodes, edges);
    expect(result).toEqual(assignments);
  });

  it("Positions with FieldFunction: nested density and position provider", () => {
    const positions = {
      Type: "FieldFunction",
      Threshold: 0.5,
      FieldFunction: { Type: "SimplexNoise2D", Frequency: 0.01, Seed: 10 },
      PositionProvider: { Type: "Mesh2D", Resolution: 12, Jitter: 0.4 },
    };
    const { nodes, edges } = jsonToGraph(positions, 0, 0, "pos_0", "Positions");
    // 3 nodes: SimplexNoise2D, Position:Mesh2D, Position:FieldFunction
    expect(nodes.length).toBe(3);
    const root = nodes.find((n) => n.type === "Position:FieldFunction");
    expect(root).toBeDefined();
    expect(nodes.find((n) => n.type === "Position:Mesh2D")).toBeDefined();
    expect(nodes.find((n) => n.type === "SimplexNoise2D")).toBeDefined();
    expect(edges.length).toBe(2);
  });

  it("Combined prop section round-trips (Positions + Assignments)", () => {
    const prop = BIOME_WRAPPER.Props[0];
    const allNodes: import("@xyflow/react").Node[] = [];
    const allEdges: import("@xyflow/react").Edge[] = [];

    const { nodes: posNodes, edges: posEdges } = jsonToGraph(
      prop.Positions as Record<string, unknown>, 0, 0, "pos_0", "Positions"
    );
    allNodes.push(...posNodes);
    allEdges.push(...posEdges);

    const { nodes: asgnNodes, edges: asgnEdges } = jsonToGraph(
      prop.Assignments as Record<string, unknown>, 0, 400, "asgn_0", "Assignments"
    );
    allNodes.push(...asgnNodes);
    allEdges.push(...asgnEdges);

    // Position nodes + Assignment nodes
    expect(allNodes.length).toBe(3); // Mesh2D + Prefab + Constant
    expect(allEdges.length).toBe(1); // Prefab → Constant
    // Verify types
    expect(allNodes.find((n) => n.type === "Position:Mesh2D")).toBeDefined();
    expect(allNodes.find((n) => n.type === "Prop:Prefab")).toBeDefined();
    expect(allNodes.find((n) => n.type === "Assignment:Constant")).toBeDefined();
  });
});

describe("V2 biome import → graph pipeline (full flow)", () => {
  it("V2 prop entry with $NodeId produces correct nodes and edges after transformation", () => {
    const v2Biome = {
      $NodeId: "biome1",
      Name: "test_biome",
      Terrain: {
        $NodeId: "terrain1",
        Density: { $NodeId: "d1", Type: "Constant", Value: 0 },
      },
      Props: [
        {
          $NodeId: "p0",
          Runtime: 50,
          Positions: {
            $NodeId: "pos1",
            Type: "Mesh2D",
            PointGenerator: {
              $NodeId: "pg1",
              Type: "Mesh",
              ScaleX: 12,
              ScaleZ: 12,
              Jitter: 0.4,
              Seed: "trees",
            },
            PointsY: 0,
          },
          Assignments: {
            $NodeId: "asgn1",
            Type: "Constant",
            Prop: {
              $NodeId: "prop1",
              Type: "Box",
              Range: { $NodeId: "r1", X: 1, Y: 4, Z: 1 },
              Material: { $NodeId: "m1", Solid: "oak_log" },
            },
          },
        },
      ],
    };

    // Step 1: V2 → internal format
    const { wrapper } = hytaleToInternalBiome(v2Biome);

    // Step 2: Verify the transformed prop entry still has nested typed objects
    const props = wrapper.Props as Record<string, unknown>[];
    expect(props).toHaveLength(1);
    const prop = props[0];
    const positions = prop.Positions as Record<string, unknown>;
    const assignments = prop.Assignments as Record<string, unknown>;
    expect(positions).toBeDefined();
    expect(assignments).toBeDefined();
    expect(positions.Type).toBe("Mesh2D");
    expect(assignments.Type).toBe("Constant");
    // Prop child should still be a nested typed object
    const propChild = assignments.Prop;
    expect(propChild).toBeDefined();
    expect(typeof propChild).toBe("object");
    expect((propChild as Record<string, unknown>).Type).toBe("Box");

    // Step 3: jsonToGraph for Assignments with rootParentField
    const { nodes, edges } = jsonToGraph(
      assignments as Record<string, unknown>,
      0, 400, "asgn_0", "Assignments"
    );

    // 3 nodes: Vector:Constant (from Range→Size point3D), Prop:Box, Assignment:Constant
    expect(nodes.length).toBe(3);
    // 2 edges: Vector:Constant→Prop:Box (Size handle), Prop:Box→Assignment:Constant (Prop handle)
    expect(edges.length).toBe(2);
    // Verify node types
    expect(nodes.find((n) => n.type === "Assignment:Constant")).toBeDefined();
    expect(nodes.find((n) => n.type === "Prop:Box")).toBeDefined();
    expect(nodes.find((n) => n.type === "Vector:Constant")).toBeDefined();
    // Verify edge: Prop:Box → Assignment:Constant via handle "Prop"
    const boxNode = nodes.find((n) => n.type === "Prop:Box")!;
    const constNode = nodes.find((n) => n.type === "Assignment:Constant")!;
    const propEdge = edges.find((e) => e.target === constNode.id);
    expect(propEdge).toBeDefined();
    expect(propEdge!.source).toBe(boxNode.id);
    expect(propEdge!.sourceHandle).toBe("output");
    expect(propEdge!.targetHandle).toBe("Prop");
  });
});
