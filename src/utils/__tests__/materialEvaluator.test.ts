import { describe, it, expect } from "vitest";
import type { Node, Edge } from "@xyflow/react";
import { evaluateMaterialGraph } from "../materialEvaluator";

/* ── Helpers ─────────────────────────────────────────────────────── */

function makeNode(
  id: string,
  type: string,
  fields: Record<string, unknown> = {},
): Node {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { type, fields },
  };
}

function makeEdge(source: string, target: string, targetHandle?: string): Edge {
  return {
    id: `${source}-${target}-${targetHandle ?? ""}`,
    source,
    target,
    targetHandle: targetHandle ?? null,
  };
}

const RES = 4;
const RANGE_MIN = -32;
const RANGE_MAX = 32;
const Y_MIN = 0;
const Y_MAX = 32;
const Y_SLICES = 32;

/* ── SpaceAndDepth V2 Tests ───────────────────────────────────────── */

describe("MaterialEvaluator — SpaceAndDepth V2", () => {
  it("evaluates simple Constant material in layer", () => {
    const nodes = [
      makeNode("sad", "Material:SpaceAndDepth", {
        LayerContext: "DEPTH_INTO_FLOOR",
        MaxExpectedDepth: 16,
      }),
      makeNode("layer0", "Material:ConstantThickness", { Thickness: 3 }),
      makeNode("mat0", "Material:Constant", { Material: "Stone" }),
    ];
    const edges = [
      makeEdge("layer0", "sad", "Layers[0]"),
      makeEdge("mat0", "layer0", "Material"),
    ];

    // Create simple density grid (all solid)
    const densities = new Float32Array(RES * RES * Y_SLICES);
    for (let i = 0; i < densities.length; i++) {
      densities[i] = 1.0;
    }

    const result = evaluateMaterialGraph(
      nodes,
      edges,
      densities,
      RES,
      Y_SLICES,
      RANGE_MIN,
      RANGE_MAX,
      Y_MIN,
      Y_MAX,
    );

    expect(result).not.toBeNull();
    expect(result!.palette.length).toBeGreaterThan(0);
    expect(result!.palette.some(m => m.name === "Stone")).toBe(true);
  });

  it("evaluates HeightGradient material in layer", () => {
    const nodes = [
      makeNode("sad", "Material:SpaceAndDepth", {
        LayerContext: "DEPTH_INTO_FLOOR",
        MaxExpectedDepth: 16,
      }),
      makeNode("layer0", "Material:ConstantThickness", { Thickness: 8 }),
      makeNode("hg", "Material:HeightGradient", {
        Range: { Min: 0, Max: 64 },
      }),
      makeNode("low", "Material:Constant", { Material: "Dirt" }),
      makeNode("high", "Material:Constant", { Material: "Stone" }),
    ];
    const edges = [
      makeEdge("layer0", "sad", "Layers[0]"),
      makeEdge("hg", "layer0", "Material"),
      makeEdge("low", "hg", "Low"),
      makeEdge("high", "hg", "High"),
    ];

    const densities = new Float32Array(RES * RES * Y_SLICES);
    for (let i = 0; i < densities.length; i++) {
      densities[i] = 1.0;
    }

    const result = evaluateMaterialGraph(
      nodes,
      edges,
      densities,
      RES,
      Y_SLICES,
      RANGE_MIN,
      RANGE_MAX,
      Y_MIN,
      Y_MAX,
    );

    expect(result).not.toBeNull();
    expect(result!.palette.some(m => m.name === "Dirt")).toBe(true);
    expect(result!.palette.some(m => m.name === "Stone")).toBe(true);
  });

  it("evaluates Conditional material in layer", () => {
    const nodes = [
      makeNode("sad", "Material:SpaceAndDepth", {
        LayerContext: "DEPTH_INTO_FLOOR",
        MaxExpectedDepth: 16,
      }),
      makeNode("layer0", "Material:ConstantThickness", { Thickness: 5 }),
      makeNode("cond", "Material:Conditional", { Threshold: 0.5 }),
      makeNode("true", "Material:Constant", { Material: "Grass" }),
      makeNode("false", "Material:Constant", { Material: "Sand" }),
    ];
    const edges = [
      makeEdge("layer0", "sad", "Layers[0]"),
      makeEdge("cond", "layer0", "Material"),
      makeEdge("true", "cond", "TrueInput"),
      makeEdge("false", "cond", "FalseInput"),
    ];

    const densities = new Float32Array(RES * RES * Y_SLICES);
    for (let i = 0; i < densities.length; i++) {
      densities[i] = 1.0;
    }

    const result = evaluateMaterialGraph(
      nodes,
      edges,
      densities,
      RES,
      Y_SLICES,
      RANGE_MIN,
      RANGE_MAX,
      Y_MIN,
      Y_MAX,
    );

    expect(result).not.toBeNull();
    // Should have at least one of the materials
    expect(
      result!.palette.some(m => m.name === "Grass") ||
      result!.palette.some(m => m.name === "Sand")
    ).toBe(true);
  });

  it("evaluates multiple layers with different materials", () => {
    const nodes = [
      makeNode("sad", "Material:SpaceAndDepth", {
        LayerContext: "DEPTH_INTO_FLOOR",
        MaxExpectedDepth: 16,
      }),
      makeNode("layer0", "Material:ConstantThickness", { Thickness: 3 }),
      makeNode("layer1", "Material:ConstantThickness", { Thickness: 5 }),
      makeNode("mat0", "Material:Constant", { Material: "Grass" }),
      makeNode("mat1", "Material:Constant", { Material: "Dirt" }),
    ];
    const edges = [
      makeEdge("layer0", "sad", "Layers[0]"),
      makeEdge("layer1", "sad", "Layers[1]"),
      makeEdge("mat0", "layer0", "Material"),
      makeEdge("mat1", "layer1", "Material"),
    ];

    const densities = new Float32Array(RES * RES * Y_SLICES);
    for (let i = 0; i < densities.length; i++) {
      densities[i] = 1.0;
    }

    const result = evaluateMaterialGraph(
      nodes,
      edges,
      densities,
      RES,
      Y_SLICES,
      RANGE_MIN,
      RANGE_MAX,
      Y_MIN,
      Y_MAX,
    );

    expect(result).not.toBeNull();
    expect(result!.palette.some(m => m.name === "Grass")).toBe(true);
    expect(result!.palette.some(m => m.name === "Dirt")).toBe(true);
  });
});
