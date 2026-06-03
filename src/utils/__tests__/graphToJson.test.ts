import { describe, it, expect } from "vitest";
import { graphToJson, graphToJsonMulti } from "../graphToJson";
import type { Node, Edge } from "@xyflow/react";

function makeNode(id: string, type: string, fields: Record<string, unknown> = {}): Node {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { type, fields },
  };
}

describe("graphToJson", () => {
  it("returns null for empty graph", () => {
    expect(graphToJson([], [])).toBeNull();
  });

  it("serializes a single node correctly", () => {
    const nodes = [makeNode("1", "SimplexNoise2D", { Frequency: 0.01, Amplitude: 1 })];
    const result = graphToJson(nodes, []);

    expect(result).toEqual({
      Type: "SimplexNoise2D",
      Frequency: 0.01,
      Amplitude: 1,
    });
  });

  it("serializes connected nodes with nested structure", () => {
    const nodes = [
      makeNode("root", "Clamp", { Min: 0, Max: 1 }),
      makeNode("child", "Constant", { Value: 0.5 }),
    ];
    const edges: Edge[] = [
      { id: "e1", source: "child", target: "root", sourceHandle: "output", targetHandle: "Input" },
    ];

    const result = graphToJson(nodes, edges);

    expect(result).toEqual({
      Type: "Clamp",
      Min: 0,
      Max: 1,
      Input: {
        Type: "Constant",
        Value: 0.5,
      },
    });
  });

  it("prevents cycles via visited set", () => {
    const nodes = [
      makeNode("a", "Passthrough", {}),
      makeNode("b", "Passthrough", {}),
    ];
    const edges: Edge[] = [
      { id: "e1", source: "b", target: "a", targetHandle: "Input" },
      { id: "e2", source: "a", target: "b", targetHandle: "Input" },
    ];

    // Should not infinite loop — one direction will be null due to cycle prevention
    const result = graphToJson(nodes, edges);
    expect(result).not.toBeNull();
  });

  it("uses first candidate for disconnected graph", () => {
    const nodes = [
      makeNode("a", "Constant", { Value: 1 }),
      makeNode("b", "Constant", { Value: 2 }),
    ];

    const result = graphToJson(nodes, []);
    expect(result).not.toBeNull();
    // Should pick one of the roots
    expect(result!.Type).toBe("Constant");
  });
});

describe("graphToJson — array handle reassembly", () => {
  it("reassembles indexed handles into proper arrays", () => {
    const nodes = [
      makeNode("root", "Sum", {}),
      makeNode("c0", "Constant", { Value: 1 }),
      makeNode("c1", "Constant", { Value: 2 }),
      makeNode("c2", "Constant", { Value: 3 }),
    ];
    const edges: Edge[] = [
      { id: "e0", source: "c0", target: "root", sourceHandle: "output", targetHandle: "Inputs[0]" },
      { id: "e1", source: "c1", target: "root", sourceHandle: "output", targetHandle: "Inputs[1]" },
      { id: "e2", source: "c2", target: "root", sourceHandle: "output", targetHandle: "Inputs[2]" },
    ];

    const result = graphToJson(nodes, edges);
    expect(result).toEqual({
      Type: "Sum",
      Inputs: [
        { Type: "Constant", Value: 1 },
        { Type: "Constant", Value: 2 },
        { Type: "Constant", Value: 3 },
      ],
    });
  });

  it("sorts array items by index even if edges arrive out of order", () => {
    const nodes = [
      makeNode("root", "Sum", {}),
      makeNode("c0", "Constant", { Value: 10 }),
      makeNode("c1", "Constant", { Value: 20 }),
    ];
    const edges: Edge[] = [
      { id: "e1", source: "c1", target: "root", sourceHandle: "output", targetHandle: "Inputs[1]" },
      { id: "e0", source: "c0", target: "root", sourceHandle: "output", targetHandle: "Inputs[0]" },
    ];

    const result = graphToJson(nodes, edges);
    expect(result).toEqual({
      Type: "Sum",
      Inputs: [
        { Type: "Constant", Value: 10 },
        { Type: "Constant", Value: 20 },
      ],
    });
  });

  it("mixes array handles with regular handles", () => {
    const nodes = [
      makeNode("root", "WeightedSum", { Weight: 0.5 }),
      makeNode("input", "Constant", { Value: 42 }),
      makeNode("c0", "Constant", { Value: 1 }),
      makeNode("c1", "Constant", { Value: 2 }),
    ];
    const edges: Edge[] = [
      { id: "e0", source: "input", target: "root", sourceHandle: "output", targetHandle: "Input" },
      { id: "e1", source: "c0", target: "root", sourceHandle: "output", targetHandle: "Sources[0]" },
      { id: "e2", source: "c1", target: "root", sourceHandle: "output", targetHandle: "Sources[1]" },
    ];

    const result = graphToJson(nodes, edges);
    expect(result).toEqual({
      Type: "WeightedSum",
      Weight: 0.5,
      Input: { Type: "Constant", Value: 42 },
      Sources: [
        { Type: "Constant", Value: 1 },
        { Type: "Constant", Value: 2 },
      ],
    });
  });
});

describe("graphToJson — group node filtering", () => {
  it("expands a group node and serializes its internals", () => {
    const internalNodes = [
      makeNode("inner", "Constant", { Value: 7 }),
    ];
    const groupNode: Node = {
      id: "g1",
      type: "group",
      position: { x: 0, y: 0 },
      data: {
        type: "group",
        name: "MyGroup",
        collapsed: true,
        internalNodes,
        internalEdges: [] as Edge[],
        externalConnectionMap: [
          { originalNodeId: "inner", handleId: "output", direction: "out" },
        ],
        fields: {},
      },
    };
    const rootNode = makeNode("root", "Clamp", { Min: 0, Max: 1 });
    const nodes = [rootNode, groupNode];
    const edges: Edge[] = [
      { id: "e1", source: "g1", target: "root", sourceHandle: "output", targetHandle: "Input" },
    ];

    const result = graphToJson(nodes, edges);
    expect(result).toEqual({
      Type: "Clamp",
      Min: 0,
      Max: 1,
      Input: { Type: "Constant", Value: 7 },
    });
  });

  it("does not leak group metadata into serialized output", () => {
    const groupNode: Node = {
      id: "g1",
      type: "group",
      position: { x: 0, y: 0 },
      data: {
        type: "group",
        name: "Standalone",
        collapsed: true,
        internalNodes: [makeNode("inner", "Perlin", { Frequency: 0.01 })],
        internalEdges: [] as Edge[],
        externalConnectionMap: [],
        fields: {},
      },
    };

    const result = graphToJson([groupNode], []);
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("Perlin");
    expect(result!.Type).not.toBe("group");
    expect("name" in result!).toBe(false);
    expect("internalNodes" in result!).toBe(false);
  });
});

describe("graphToJson — SpaceAndDepth Layers[]", () => {
  it("serializes Layers[] array from indexed handles", () => {
    const nodes = [
      makeNode("sad", "Material:SpaceAndDepth", { LayerContext: "DEPTH_INTO_FLOOR", MaxExpectedDepth: 16 }),
      makeNode("layer0", "Layer:ConstantThickness", { Thickness: 3 }),
      makeNode("layer1", "Layer:RangeThickness", { RangeMin: 1, RangeMax: 5, Seed: "" }),
      makeNode("mat0", "Material:Constant", { Material: "stone" }),
      makeNode("mat1", "Material:Constant", { Material: "dirt" }),
    ];
    const edges: Edge[] = [
      { id: "e1", source: "layer0", target: "sad", sourceHandle: "output", targetHandle: "Layers[0]" },
      { id: "e2", source: "layer1", target: "sad", sourceHandle: "output", targetHandle: "Layers[1]" },
      { id: "e3", source: "mat0", target: "layer0", sourceHandle: "output", targetHandle: "Material" },
      { id: "e4", source: "mat1", target: "layer1", sourceHandle: "output", targetHandle: "Material" },
    ];

    const result = graphToJson(nodes, edges);
    expect(result).not.toBeNull();
    expect(result!.Type).toBe("Material:SpaceAndDepth");
    expect(result!.LayerContext).toBe("DEPTH_INTO_FLOOR");
    expect(result!.MaxExpectedDepth).toBe(16);

    const layers = result!.Layers as unknown[];
    expect(layers).toHaveLength(2);

    const layer0 = layers[0] as Record<string, unknown>;
    expect(layer0.Type).toBe("Layer:ConstantThickness");
    expect(layer0.Thickness).toBe(3);
    expect((layer0.Material as Record<string, unknown>).Type).toBe("Material:Constant");
    expect((layer0.Material as Record<string, unknown>).Material).toBe("stone");

    const layer1 = layers[1] as Record<string, unknown>;
    expect(layer1.Type).toBe("Layer:RangeThickness");
    expect(layer1.RangeMin).toBe(1);
    expect(layer1.RangeMax).toBe(5);
  });
});

describe("graphToJsonMulti", () => {
  it("returns empty array for empty graph", () => {
    expect(graphToJsonMulti([], [])).toEqual([]);
  });

  it("returns multiple assets for disconnected subgraphs", () => {
    const nodes = [
      makeNode("a", "Constant", { Value: 1 }),
      makeNode("b", "SimplexNoise2D", { Frequency: 0.01 }),
    ];

    const results = graphToJsonMulti(nodes, []);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.Type).sort()).toEqual(["Constant", "SimplexNoise2D"]);
  });

  it("returns single asset for connected graph", () => {
    const nodes = [
      makeNode("root", "Clamp", {}),
      makeNode("child", "Constant", { Value: 0.5 }),
    ];
    const edges: Edge[] = [
      { id: "e1", source: "child", target: "root", sourceHandle: "output", targetHandle: "Input" },
    ];

    const results = graphToJsonMulti(nodes, edges);
    expect(results).toHaveLength(1);
    expect(results[0].Type).toBe("Clamp");
    expect(results[0].Input).toEqual({ Type: "Constant", Value: 0.5 });
  });
});
