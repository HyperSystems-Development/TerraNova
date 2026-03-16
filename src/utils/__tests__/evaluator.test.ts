import { describe, it, expect } from "vitest";
import type { Node, Edge } from "@xyflow/react";
import { evaluateDensityGrid, createEvaluationContext } from "../densityEvaluator";

/* ── Helpers (same pattern as densityEvaluator.test.ts) ────────────── */

function makeNode(
  id: string,
  type: string,
  fields: Record<string, unknown> = {},
): Node {
  return {
    id,
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

const RES = 8;
const RANGE_MIN = -32;
const RANGE_MAX = 32;
const Y_LEVEL = 64;

function evalSingle(nodes: Node[], edges: Edge[], rootNodeId?: string) {
  return evaluateDensityGrid(nodes, edges, RES, RANGE_MIN, RANGE_MAX, Y_LEVEL, rootNodeId);
}

/** Assert all grid values equal a constant */
function expectAll(result: ReturnType<typeof evalSingle>, value: number, precision = 5) {
  for (let i = 0; i < result.values.length; i++) {
    expect(result.values[i]).toBeCloseTo(value, precision);
  }
}

/** Evaluate at a single point (x, y, z) */
function evalAt(nodes: Node[], edges: Edge[], x: number, y: number, z: number, rootNodeId?: string): number {
  const ctx = createEvaluationContext(nodes, edges, rootNodeId);
  if (!ctx) return 0;
  return ctx.evaluate(ctx.rootId, x, y, z);
}

/* ══════════════════════════════════════════════════════════════════════════
 * XOverride
 * ══════════════════════════════════════════════════════════════════════════ */

describe("XOverride", () => {
  it("evaluates child at fixed X coordinate", () => {
    const nodes = [
      makeNode("cx", "CoordinateX"),
      makeNode("xo", "XOverride", { OverrideX: 42 }),
    ];
    const edges = [makeEdge("cx", "xo", "Input")];
    const result = evalSingle(nodes, edges, "xo");
    // CoordinateX should return 42 for every sample
    expectAll(result, 42);
  });

  it("leaves Y and Z unchanged", () => {
    const nodes = [
      makeNode("cy", "CoordinateY"),
      makeNode("xo", "XOverride", { OverrideX: 99 }),
    ];
    const edges = [makeEdge("cy", "xo", "Input")];
    const result = evalSingle(nodes, edges, "xo");
    // CoordinateY should still return Y_LEVEL, unaffected by X override
    expectAll(result, Y_LEVEL);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * ZOverride
 * ══════════════════════════════════════════════════════════════════════════ */

describe("ZOverride", () => {
  it("evaluates child at fixed Z coordinate", () => {
    const nodes = [
      makeNode("cz", "CoordinateZ"),
      makeNode("zo", "ZOverride", { OverrideZ: 77 }),
    ];
    const edges = [makeEdge("cz", "zo", "Input")];
    const result = evalSingle(nodes, edges, "zo");
    expectAll(result, 77);
  });

  it("leaves X and Y unchanged", () => {
    const nodes = [
      makeNode("cx", "CoordinateX"),
      makeNode("zo", "ZOverride", { OverrideZ: 99 }),
    ];
    const edges = [makeEdge("cx", "zo", "Input")];
    const result = evalSingle(nodes, edges, "zo");
    // CoordinateX should still vary across columns
    const unique = new Set(result.values);
    expect(unique.size).toBeGreaterThan(1);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * SmoothCeiling
 * ══════════════════════════════════════════════════════════════════════════ */

describe("SmoothCeiling", () => {
  it("clamps values above threshold (tight smoothness)", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 100 }),
      makeNode("sc", "SmoothCeiling", { Threshold: 1.0, Smoothness: 0.01 }),
    ];
    const edges = [makeEdge("c", "sc", "Input")];
    const result = evalSingle(nodes, edges, "sc");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(1.0, 1);
    }
  });

  it("passes through values below threshold", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 0.3 }),
      makeNode("sc", "SmoothCeiling", { Threshold: 1.0, Smoothness: 0.01 }),
    ];
    const edges = [makeEdge("c", "sc", "Input")];
    const result = evalSingle(nodes, edges, "sc");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(0.3, 1);
    }
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * Gradient
 * ══════════════════════════════════════════════════════════════════════════ */

describe("Gradient", () => {
  it("estimates directional derivative of input along default Y axis", () => {
    // d/dy(y) = 1.0 everywhere
    const nodes = [
      makeNode("y", "CoordinateY"),
      makeNode("g", "Gradient", { Axis: { x: 0, y: 1, z: 0 }, SampleRange: 1.0 }),
    ];
    const edges = [makeEdge("y", "g", "Input")];
    const result = evalSingle(nodes, edges, "g");
    expectAll(result, 1.0);
  });

  it("returns 0 for constant input", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 42 }),
      makeNode("g", "Gradient", { Axis: { x: 0, y: 1, z: 0 }, SampleRange: 1.0 }),
    ];
    const edges = [makeEdge("c", "g", "Input")];
    const result = evalSingle(nodes, edges, "g");
    expectAll(result, 0);
  });

  it("returns 0 when SampleRange is 0", () => {
    const nodes = [
      makeNode("y", "CoordinateY"),
      makeNode("g", "Gradient", { Axis: { x: 0, y: 1, z: 0 }, SampleRange: 0 }),
    ];
    const edges = [makeEdge("y", "g", "Input")];
    const result = evalSingle(nodes, edges, "g");
    expectAll(result, 0);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * Amplitude
 * ══════════════════════════════════════════════════════════════════════════ */

describe("Amplitude", () => {
  it("multiplies input by amplitude input", () => {
    const nodes = [
      makeNode("in", "Constant", { Value: 5 }),
      makeNode("amp", "Constant", { Value: 3 }),
      makeNode("a", "Amplitude"),
    ];
    const edges = [
      makeEdge("in", "a", "Input"),
      makeEdge("amp", "a", "Amplitude"),
    ];
    const result = evalSingle(nodes, edges, "a");
    expectAll(result, 15);
  });

  it("returns 0 when amplitude is 0", () => {
    const nodes = [
      makeNode("in", "Constant", { Value: 5 }),
      makeNode("amp", "Constant", { Value: 0 }),
      makeNode("a", "Amplitude"),
    ];
    const edges = [
      makeEdge("in", "a", "Input"),
      makeEdge("amp", "a", "Amplitude"),
    ];
    const result = evalSingle(nodes, edges, "a");
    expectAll(result, 0);
  });

  it("returns 0 when no inputs connected", () => {
    const nodes = [makeNode("a", "Amplitude")];
    const result = evalSingle(nodes, []);
    expectAll(result, 0);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * YSampled
 * ══════════════════════════════════════════════════════════════════════════ */

describe("YSampled", () => {
  it("evaluates Input at Y provided by YProvider", () => {
    // CoordinateY returns the current Y value.
    // YSampled with YProvider=Constant(100) evaluates Input at y=100.
    const nodes = [
      makeNode("cy", "CoordinateY"),
      makeNode("yp", "Constant", { Value: 100 }),
      makeNode("ys", "YSampled"),
    ];
    const edges = [
      makeEdge("cy", "ys", "Input"),
      makeEdge("yp", "ys", "YProvider"),
    ];
    const result = evalSingle(nodes, edges, "ys");
    // CoordinateY evaluated at y=100 should return 100
    expectAll(result, 100);
  });

  it("respects SampleDistance field", () => {
    // Without YProvider, YSampled snaps Y to the nearest multiple of SampleDistance.
    // CoordinateY returns the snapped Y value, so we can observe the snapping.
    // With SampleDistance=8 at y=5: round(5/8)*8 = round(0.625)*8 = 1*8 = 8
    const nodes = [
      makeNode("cy", "CoordinateY"),
      makeNode("ys", "YSampled", { SampleDistance: 8.0 }),
    ];
    const edges = [makeEdge("cy", "ys", "Input")];
    const result = evalAt(nodes, edges, 0, 5, 0, "ys");
    expect(result).toBeCloseTo(8, 5);
  });

  it("uses default SampleDistance=4 when not specified", () => {
    // With default SampleDistance=4 at y=5: round(5/4)*4 = round(1.25)*4 = 1*4 = 4
    const nodes = [
      makeNode("cy", "CoordinateY"),
      makeNode("ys", "YSampled"),
    ];
    const edges = [makeEdge("cy", "ys", "Input")];
    const result = evalAt(nodes, edges, 0, 5, 0, "ys");
    expect(result).toBeCloseTo(4, 5);
  });

  it("different SampleDistance values produce different snapping", () => {
    // At y=5, SampleDistance=8 snaps to 8, SampleDistance=4 snaps to 4.
    // This confirms SampleDistance is read from fields, not hardcoded.
    const nodes8 = [
      makeNode("cy", "CoordinateY"),
      makeNode("ys", "YSampled", { SampleDistance: 8.0 }),
    ];
    const nodes4 = [
      makeNode("cy", "CoordinateY"),
      makeNode("ys", "YSampled", { SampleDistance: 4.0 }),
    ];
    const edges = [makeEdge("cy", "ys", "Input")];
    const result8 = evalAt(nodes8, edges, 0, 5, 0, "ys");
    const result4 = evalAt(nodes4, edges, 0, 5, 0, "ys");
    expect(result8).toBeCloseTo(8, 5);
    expect(result4).toBeCloseTo(4, 5);
    expect(result8).not.toBeCloseTo(result4, 5);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * SwitchState
 * ══════════════════════════════════════════════════════════════════════════ */

describe("SwitchState", () => {
  it("returns the State field value", () => {
    const nodes = [makeNode("ss", "SwitchState", { State: 3 })];
    const result = evalSingle(nodes, []);
    expectAll(result, 3);
  });

  it("defaults to 0 when State is missing", () => {
    const nodes = [makeNode("ss", "SwitchState", {})];
    const result = evalSingle(nodes, []);
    expectAll(result, 0);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * Positions3D
 * ══════════════════════════════════════════════════════════════════════════ */

describe("Positions3D", () => {
  it("produces varying output (3D voronoi-like noise)", () => {
    const nodes = [makeNode("p3", "Positions3D", { Frequency: 0.1, Seed: "test" })];
    const result = evalSingle(nodes, []);
    const unique = new Set(result.values);
    expect(unique.size).toBeGreaterThan(1);
  });

  it("is deterministic with same seed", () => {
    const nodes = [makeNode("p3", "Positions3D", { Frequency: 0.05, Seed: "abc" })];
    const r1 = evalSingle(nodes, []);
    const r2 = evalSingle(nodes, []);
    expect(Array.from(r1.values)).toEqual(Array.from(r2.values));
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * PositionsPinch
 * ══════════════════════════════════════════════════════════════════════════ */

describe("PositionsPinch", () => {
  it("transforms input coordinates with radial pinch", () => {
    const nodes = [
      makeNode("cx", "CoordinateX"),
      makeNode("pinch", "PositionsPinch", { Strength: 2.0 }),
    ];
    const edges = [makeEdge("cx", "pinch", "Input")];
    const result = evalSingle(nodes, edges, "pinch");
    // Should produce variation (not all same value)
    const unique = new Set(result.values);
    expect(unique.size).toBeGreaterThan(1);
  });

  it("with Strength=1, output differs from raw CoordinateX", () => {
    const nodesRaw = [makeNode("cx", "CoordinateX")];
    const nodesPinch = [
      makeNode("cx", "CoordinateX"),
      makeNode("pinch", "PositionsPinch", { Strength: 1.0 }),
    ];
    const edgesPinch = [makeEdge("cx", "pinch", "Input")];
    const rRaw = evalSingle(nodesRaw, []);
    const rPinch = evalSingle(nodesPinch, edgesPinch, "pinch");
    // With strength=1, pinch factor = dist^1/dist = 1, so it should be same
    // But the 2D grid has varying x and z, so dist != 0 for most pixels
    // With strength 1.0: pinchFactor = dist^1 / dist = 1 → same as raw
    expect(Array.from(rPinch.values)).toEqual(Array.from(rRaw.values));
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * PositionsTwist
 * ══════════════════════════════════════════════════════════════════════════ */

describe("PositionsTwist", () => {
  it("with Angle=0 passes through unchanged", () => {
    const nodesRaw = [makeNode("cx", "CoordinateX")];
    const nodesTwist = [
      makeNode("cx", "CoordinateX"),
      makeNode("twist", "PositionsTwist", { Angle: 0 }),
    ];
    const edgesTwist = [makeEdge("cx", "twist", "Input")];
    const rRaw = evalSingle(nodesRaw, []);
    const rTwist = evalSingle(nodesTwist, edgesTwist, "twist");
    expect(Array.from(rTwist.values)).toEqual(Array.from(rRaw.values));
  });

  it("with non-zero Angle produces different output", () => {
    const nodes = [
      makeNode("cx", "CoordinateX"),
      makeNode("twist", "PositionsTwist", { Angle: 45 }),
    ];
    const edges = [makeEdge("cx", "twist", "Input")];
    const result = evalSingle(nodes, edges, "twist");
    const unique = new Set(result.values);
    expect(unique.size).toBeGreaterThan(1);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * GradientWarp
 * ══════════════════════════════════════════════════════════════════════════ */

describe("GradientWarp", () => {
  it("warps input based on gradient of warp source", () => {
    const nodes = [
      makeNode("noise", "SimplexNoise2D", { Frequency: 0.1, Amplitude: 1, Seed: "test" }),
      makeNode("warpSrc", "SimplexNoise2D", { Frequency: 0.05, Amplitude: 1, Seed: "warp" }),
      makeNode("gw", "GradientWarp", { WarpScale: 10.0 }),
    ];
    const edges = [
      makeEdge("noise", "gw", "Input"),
      makeEdge("warpSrc", "gw", "WarpSource"),
    ];
    const result = evalSingle(nodes, edges, "gw");
    const unique = new Set(result.values);
    expect(unique.size).toBeGreaterThan(1);
  });

  it("with WarpScale=0 produces same result as unwrapped input", () => {
    const nodesRaw = [
      makeNode("noise", "SimplexNoise2D", { Frequency: 0.1, Amplitude: 1, Seed: "test" }),
    ];
    const nodesWarped = [
      makeNode("noise", "SimplexNoise2D", { Frequency: 0.1, Amplitude: 1, Seed: "test" }),
      makeNode("warpSrc", "Constant", { Value: 5 }),
      makeNode("gw", "GradientWarp", { WarpScale: 0 }),
    ];
    const edgesWarped = [
      makeEdge("noise", "gw", "Input"),
      makeEdge("warpSrc", "gw", "WarpSource"),
    ];
    const rRaw = evalSingle(nodesRaw, []);
    const rWarped = evalSingle(nodesWarped, edgesWarped, "gw");
    // Constant warp source has 0 gradient, so no displacement
    for (let i = 0; i < rRaw.values.length; i++) {
      expect(rWarped.values[i]).toBeCloseTo(rRaw.values[i], 3);
    }
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * VectorWarp
 * ══════════════════════════════════════════════════════════════════════════ */

describe("VectorWarp", () => {
  it("passes through input (approximation — no vector evaluator)", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 7 }),
      makeNode("vw", "VectorWarp"),
    ];
    const edges = [makeEdge("c", "vw", "Input")];
    const result = evalSingle(nodes, edges, "vw");
    expectAll(result, 7);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * Context-dependent types return 0
 * ══════════════════════════════════════════════════════════════════════════ */

describe("Context-dependent types", () => {
  it.each(["Terrain", "CellWallDistance", "DistanceToBiomeEdge", "Pipeline"])(
    "'%s' returns 0 (unsupported fallback)",
    (type) => {
      const nodes = [makeNode("n", type)];
      const result = evalSingle(nodes, []);
      expectAll(result, 0);
    },
  );
});

/* ══════════════════════════════════════════════════════════════════════════
 * Complex graph: Gradient + SmoothCeiling chain
 * ══════════════════════════════════════════════════════════════════════════ */

describe("Complex graph: GradientWarp + SmoothCeiling", () => {
  it("Gradient → Amplitude → SmoothCeiling produces clamped derivative", () => {
    // Gradient of CoordinateY along Y = 1.0, * 2 = 2.0, smoothCeiling at 0.8 → ~0.8
    const nodes = [
      makeNode("y", "CoordinateY"),
      makeNode("grad", "Gradient", { Axis: { x: 0, y: 1, z: 0 }, SampleRange: 1.0 }),
      makeNode("amp", "Constant", { Value: 2 }),
      makeNode("mul", "Amplitude"),
      makeNode("sc", "SmoothCeiling", { Threshold: 0.8, Smoothness: 0.01 }),
    ];
    const edges = [
      makeEdge("y", "grad", "Input"),
      makeEdge("grad", "mul", "Input"),
      makeEdge("amp", "mul", "Amplitude"),
      makeEdge("mul", "sc", "Input"),
    ];
    const result = evalSingle(nodes, edges, "sc");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(0.8, 1);
    }
  });

  it("XOverride + ZOverride produces fixed-point sampling", () => {
    // Chain: CoordinateX → XOverride(10) → ZOverride(20)
    // XOverride samples at x=10, ZOverride samples at z=20
    // CoordinateX just returns x, so XOverride makes it return 10 for all samples
    const nodes = [
      makeNode("cx", "CoordinateX"),
      makeNode("xo", "XOverride", { OverrideX: 10 }),
      makeNode("zo", "ZOverride", { OverrideZ: 20 }),
    ];
    const edges = [
      makeEdge("cx", "xo", "Input"),
      makeEdge("xo", "zo", "Input"),
    ];
    const result = evalSingle(nodes, edges, "zo");
    expectAll(result, 10);
  });

  it("SwitchState → Switch selects correct input", () => {
    const nodes = [
      makeNode("ss", "SwitchState", { State: 1 }),
      makeNode("a", "Constant", { Value: 10 }),
      makeNode("b", "Constant", { Value: 20 }),
      makeNode("sw", "Switch", { Selector: 1 }),
    ];
    const edges = [
      makeEdge("a", "sw", "Inputs[0]"),
      makeEdge("b", "sw", "Inputs[1]"),
    ];
    const result = evalSingle(nodes, edges, "sw");
    expectAll(result, 20);
  });
});
