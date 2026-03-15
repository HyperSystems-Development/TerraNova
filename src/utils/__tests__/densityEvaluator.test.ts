import { describe, it, expect } from "vitest";
import type { Node, Edge } from "@xyflow/react";
import { evaluateDensityGrid, createEvaluationContext, getEvalStatus, type EvaluationOptions } from "../densityEvaluator";
import { DENSITY_NAMED_TO_ARRAY } from "../translationMaps";
import { EvalStatus } from "@/schema/types";

/* ── Helpers ───────────────────────────────────────────────────────── */

function makeNode(
  id: string,
  type: string,
  fields: Record<string, unknown> = {},
  extra: Record<string, unknown> = {},
): Node {
  return {
    id,
    position: { x: 0, y: 0 },
    data: { type, fields, ...extra },
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

/** Evaluate at a single point (x, y, z) */
function evalAt(nodes: Node[], edges: Edge[], x: number, y: number, z: number, rootNodeId?: string): number {
  const ctx = createEvaluationContext(nodes, edges, rootNodeId);
  if (!ctx) return 0;
  return ctx.evaluate(ctx.rootId, x, y, z);
}

/* ── Empty graph ──────────────────────────────────────────────────── */

describe("evaluateDensityGrid — empty graph", () => {
  it("returns zeros for empty nodes", () => {
    const result = evalSingle([], []);
    expect(result.values.length).toBe(RES * RES);
    expect(result.minValue).toBe(0);
    expect(result.maxValue).toBe(0);
  });
});

/* ── Constant ─────────────────────────────────────────────────────── */

describe("Constant", () => {
  it("returns fixed value at all coordinates", () => {
    const nodes = [makeNode("c", "Constant", { Value: 42 })];
    const result = evalSingle(nodes, []);
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(42);
    }
    expect(result.minValue).toBe(42);
    expect(result.maxValue).toBe(42);
  });

  it("defaults to 0 when Value is missing", () => {
    const nodes = [makeNode("c", "Constant", {})];
    const result = evalSingle(nodes, []);
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(0);
    }
  });
});

/* ── Zero / One ───────────────────────────────────────────────────── */

describe("Zero and One", () => {
  it("Zero returns 0 everywhere", () => {
    const nodes = [makeNode("z", "Zero")];
    const result = evalSingle(nodes, []);
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(0);
    }
  });

  it("One returns 1 everywhere", () => {
    const nodes = [makeNode("o", "One")];
    const result = evalSingle(nodes, []);
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(1);
    }
  });
});

/* ── SimplexNoise2D ───────────────────────────────────────────────── */

describe("SimplexNoise2D", () => {
  it("returns non-zero values that vary by position", () => {
    const nodes = [makeNode("n", "SimplexNoise2D", { Frequency: 0.1, Amplitude: 1.0, Seed: "test" })];
    const result = evalSingle(nodes, []);
    // Should have variation — not all same value
    const uniqueValues = new Set(result.values);
    expect(uniqueValues.size).toBeGreaterThan(1);
    // Values should be within [-Amplitude, Amplitude]
    expect(result.minValue).toBeGreaterThanOrEqual(-1.5); // FBM can slightly exceed amplitude
    expect(result.maxValue).toBeLessThanOrEqual(1.5);
  });

  it("is deterministic with same seed", () => {
    const nodes = [makeNode("n", "SimplexNoise2D", { Frequency: 0.05, Amplitude: 1.0, Seed: "abc" })];
    const r1 = evalSingle(nodes, []);
    const r2 = evalSingle(nodes, []);
    expect(Array.from(r1.values)).toEqual(Array.from(r2.values));
  });

  it("produces different output with different seeds", () => {
    const n1 = [makeNode("n", "SimplexNoise2D", { Frequency: 0.05, Amplitude: 1.0, Seed: "seed1" })];
    const n2 = [makeNode("n", "SimplexNoise2D", { Frequency: 0.05, Amplitude: 1.0, Seed: "seed2" })];
    const r1 = evalSingle(n1, []);
    const r2 = evalSingle(n2, []);
    // At least some values should differ
    let differs = false;
    for (let i = 0; i < r1.values.length; i++) {
      if (r1.values[i] !== r2.values[i]) { differs = true; break; }
    }
    expect(differs).toBe(true);
  });
});

/* ── Sum ──────────────────────────────────────────────────────────── */

describe("Sum", () => {
  it("adds two constant children correctly", () => {
    const nodes = [
      makeNode("a", "Constant", { Value: 3 }),
      makeNode("b", "Constant", { Value: 7 }),
      makeNode("sum", "Sum"),
    ];
    const edges = [
      makeEdge("a", "sum", "Inputs[0]"),
      makeEdge("b", "sum", "Inputs[1]"),
    ];
    const result = evalSingle(nodes, edges, "sum");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(10);
    }
  });
});

/* ── Negate ────────────────────────────────────────────────────────── */

describe("Negate", () => {
  it("flips the sign of input", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 5 }),
      makeNode("neg", "Negate"),
    ];
    const edges = [makeEdge("c", "neg", "Input")];
    const result = evalSingle(nodes, edges, "neg");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(-5);
    }
  });
});

/* ── Clamp ────────────────────────────────────────────────────────── */

describe("Clamp", () => {
  it("constrains output to [min, max]", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 100 }),
      makeNode("clamp", "Clamp", { Min: -1, Max: 1 }),
    ];
    const edges = [makeEdge("c", "clamp", "Input")];
    const result = evalSingle(nodes, edges, "clamp");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(1);
    }
  });

  it("clamps negative values", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: -50 }),
      makeNode("clamp", "Clamp", { Min: 0, Max: 1 }),
    ];
    const edges = [makeEdge("c", "clamp", "Input")];
    const result = evalSingle(nodes, edges, "clamp");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(0);
    }
  });
});

/* ── Clamp with Hytale-style WallA/WallB values ──────────────────── */

describe("Clamp — Hytale WallA/WallB semantics", () => {
  it("clamp(0.3, -1, 0.5) returns 0.3 (within range)", () => {
    // WallA=0.5 (Max), WallB=-1 (Min) → internal Min=-1, Max=0.5
    const nodes = [
      makeNode("c", "Constant", { Value: 0.3 }),
      makeNode("clamp", "Clamp", { Min: -1, Max: 0.5 }),
    ];
    const edges = [makeEdge("c", "clamp", "Input")];
    const result = evalSingle(nodes, edges, "clamp");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(0.3);
    }
  });

  it("clamp(0.7, -1, 0.5) returns 0.5 (upper clamped)", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 0.7 }),
      makeNode("clamp", "Clamp", { Min: -1, Max: 0.5 }),
    ];
    const edges = [makeEdge("c", "clamp", "Input")];
    const result = evalSingle(nodes, edges, "clamp");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(0.5);
    }
  });

  it("clamp(-2, -1, 0.5) returns -1 (lower clamped)", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: -2 }),
      makeNode("clamp", "Clamp", { Min: -1, Max: 0.5 }),
    ];
    const edges = [makeEdge("c", "clamp", "Input")];
    const result = evalSingle(nodes, edges, "clamp");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(-1);
    }
  });
});

/* ── Blend with missing Factor ───────────────────────────────────── */

describe("Blend — Factor defaults", () => {
  it("2-input Blend (no Factor) defaults to 0.5 mix", () => {
    const nodes = [
      makeNode("a", "Constant", { Value: 0 }),
      makeNode("b", "Constant", { Value: 100 }),
      makeNode("blend", "Blend"),
    ];
    const edges = [
      makeEdge("a", "blend", "InputA"),
      makeEdge("b", "blend", "InputB"),
    ];
    const result = evalSingle(nodes, edges, "blend");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(50); // 0 + (100 - 0) * 0.5
    }
  });

  it("3-input Blend uses provided Factor", () => {
    const nodes = [
      makeNode("a", "Constant", { Value: 0 }),
      makeNode("b", "Constant", { Value: 100 }),
      makeNode("f", "Constant", { Value: 0.75 }),
      makeNode("blend", "Blend"),
    ];
    const edges = [
      makeEdge("a", "blend", "InputA"),
      makeEdge("b", "blend", "InputB"),
      makeEdge("f", "blend", "Factor"),
    ];
    const result = evalSingle(nodes, edges, "blend");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(75); // 0 + (100 - 0) * 0.75
    }
  });
});

/* ── LinearTransform ──────────────────────────────────────────────── */

describe("LinearTransform", () => {
  it("applies scale and offset correctly", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 2 }),
      makeNode("lt", "LinearTransform", { Scale: 3, Offset: 10 }),
    ];
    const edges = [makeEdge("c", "lt", "Input")];
    const result = evalSingle(nodes, edges, "lt");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(16); // 2 * 3 + 10
    }
  });
});

/* ── CoordinateX/Y/Z ─────────────────────────────────────────────── */

describe("Coordinate readers", () => {
  it("CoordinateX returns x value", () => {
    const nodes = [makeNode("cx", "CoordinateX")];
    const result = evalSingle(nodes, []);
    // Grid now covers [rangeMin, rangeMax] inclusive with step = range / (n-1)
    expect(result.values[0]).toBeCloseTo(RANGE_MIN); // row 0, col 0
    expect(result.values[RES - 1]).toBeCloseTo(RANGE_MAX); // row 0, last col = rangeMax
  });

  it("CoordinateY returns yLevel", () => {
    const nodes = [makeNode("cy", "CoordinateY")];
    const result = evalSingle(nodes, []);
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(Y_LEVEL);
    }
  });

  it("CoordinateZ varies across rows", () => {
    const nodes = [makeNode("cz", "CoordinateZ")];
    const result = evalSingle(nodes, []);
    expect(result.values[0]).toBeCloseTo(RANGE_MIN); // row 0
    expect(result.values[RES * (RES - 1)]).toBeCloseTo(RANGE_MAX); // last row = rangeMax
  });
});

/* ── YGradient ────────────────────────────────────────────────────── */

describe("YGradient", () => {
  it("returns linear interpolation between FromY and ToY", () => {
    const nodes = [makeNode("yg", "YGradient", { FromY: 0, ToY: 128 })];
    const result = evalSingle(nodes, []);
    // yLevel = 64, FromY = 0, ToY = 128 → (64 - 0) / (128 - 0) = 0.5
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(0.5);
    }
  });
});

/* ── Normalizer ───────────────────────────────────────────────────── */

describe("Normalizer", () => {
  it("remaps value from source range to target range", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 0 }), // midpoint of [-1, 1]
      makeNode("norm", "Normalizer", {
        SourceRange: { Min: -1, Max: 1 },
        TargetRange: { Min: 0, Max: 100 },
      }),
    ];
    const edges = [makeEdge("c", "norm", "Input")];
    const result = evalSingle(nodes, edges, "norm");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(50);
    }
  });
});

/* ── TranslatedPosition ──────────────────────────────────────────── */

describe("TranslatedPosition", () => {
  it("shifts sample coordinates", () => {
    // CoordinateX at position x should return x.
    // TranslatedPosition with Translation.x=10 evaluates child at x-10,
    // so CoordinateX returns x-10.
    const nodes = [
      makeNode("cx", "CoordinateX"),
      makeNode("tr", "TranslatedPosition", { Translation: { x: 10, y: 0, z: 0 } }),
    ];
    const edges = [makeEdge("cx", "tr", "Input")];
    const result = evalSingle(nodes, edges, "tr");
    const step = (RANGE_MAX - RANGE_MIN) / (RES - 1);
    // First cell: x = RANGE_MIN, translated to RANGE_MIN - 10
    expect(result.values[0]).toBeCloseTo(RANGE_MIN - 10);
    // Second cell
    expect(result.values[1]).toBeCloseTo(RANGE_MIN + step - 10);
  });
});

/* ── Conditional ──────────────────────────────────────────────────── */

describe("Conditional", () => {
  it("picks TrueInput when condition >= threshold", () => {
    const nodes = [
      makeNode("cond", "Constant", { Value: 1 }), // condition: 1 >= 0
      makeNode("tval", "Constant", { Value: 42 }),
      makeNode("fval", "Constant", { Value: -1 }),
      makeNode("if", "Conditional", { Threshold: 0 }),
    ];
    const edges = [
      makeEdge("cond", "if", "Condition"),
      makeEdge("tval", "if", "TrueInput"),
      makeEdge("fval", "if", "FalseInput"),
    ];
    const result = evalSingle(nodes, edges, "if");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(42);
    }
  });

  it("picks FalseInput when condition < threshold", () => {
    const nodes = [
      makeNode("cond", "Constant", { Value: -1 }), // condition: -1 < 0
      makeNode("tval", "Constant", { Value: 42 }),
      makeNode("fval", "Constant", { Value: 99 }),
      makeNode("if", "Conditional", { Threshold: 0 }),
    ];
    const edges = [
      makeEdge("cond", "if", "Condition"),
      makeEdge("tval", "if", "TrueInput"),
      makeEdge("fval", "if", "FalseInput"),
    ];
    const result = evalSingle(nodes, edges, "if");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(99);
    }
  });
});

/* ── Product ──────────────────────────────────────────────────────── */

describe("Product", () => {
  it("multiplies two inputs", () => {
    const nodes = [
      makeNode("a", "Constant", { Value: 3 }),
      makeNode("b", "Constant", { Value: 4 }),
      makeNode("prod", "Product"),
    ];
    const edges = [
      makeEdge("a", "prod", "Inputs[0]"),
      makeEdge("b", "prod", "Inputs[1]"),
    ];
    const result = evalSingle(nodes, edges, "prod");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(12);
    }
  });
});

/* ── MinFunction / MaxFunction / AverageFunction ──────────────────── */

describe("Combinators", () => {
  it("MinFunction returns the smaller value", () => {
    const nodes = [
      makeNode("a", "Constant", { Value: 3 }),
      makeNode("b", "Constant", { Value: 7 }),
      makeNode("min", "MinFunction"),
    ];
    const edges = [
      makeEdge("a", "min", "Inputs[0]"),
      makeEdge("b", "min", "Inputs[1]"),
    ];
    const result = evalSingle(nodes, edges, "min");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(3);
    }
  });

  it("MaxFunction returns the larger value", () => {
    const nodes = [
      makeNode("a", "Constant", { Value: 3 }),
      makeNode("b", "Constant", { Value: 7 }),
      makeNode("max", "MaxFunction"),
    ];
    const edges = [
      makeEdge("a", "max", "Inputs[0]"),
      makeEdge("b", "max", "Inputs[1]"),
    ];
    const result = evalSingle(nodes, edges, "max");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(7);
    }
  });

  it("AverageFunction returns the mean", () => {
    const nodes = [
      makeNode("a", "Constant", { Value: 4 }),
      makeNode("b", "Constant", { Value: 8 }),
      makeNode("avg", "AverageFunction"),
    ];
    const edges = [
      makeEdge("a", "avg", "Inputs[0]"),
      makeEdge("b", "avg", "Inputs[1]"),
    ];
    const result = evalSingle(nodes, edges, "avg");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(6);
    }
  });
});

/* ── Abs / Square / SquareRoot ────────────────────────────────────── */

describe("Math operations", () => {
  it("Abs returns absolute value", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: -5 }),
      makeNode("abs", "Abs"),
    ];
    const edges = [makeEdge("c", "abs", "Input")];
    const result = evalSingle(nodes, edges, "abs");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(5);
    }
  });

  it("Square returns v*v", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 3 }),
      makeNode("sq", "Square"),
    ];
    const edges = [makeEdge("c", "sq", "Input")];
    const result = evalSingle(nodes, edges, "sq");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(9);
    }
  });

  it("SquareRoot returns sqrt(|v|)", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 16 }),
      makeNode("sqrt", "SquareRoot"),
    ];
    const edges = [makeEdge("c", "sqrt", "Input")];
    const result = evalSingle(nodes, edges, "sqrt");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(4);
    }
  });
});

/* ── Interpolate / Blend ──────────────────────────────────────────── */

describe("Interpolate", () => {
  it("lerps between two values based on factor", () => {
    const nodes = [
      makeNode("a", "Constant", { Value: 0 }),
      makeNode("b", "Constant", { Value: 100 }),
      makeNode("f", "Constant", { Value: 0.3 }),
      makeNode("interp", "Interpolate"),
    ];
    const edges = [
      makeEdge("a", "interp", "InputA"),
      makeEdge("b", "interp", "InputB"),
      makeEdge("f", "interp", "Factor"),
    ];
    const result = evalSingle(nodes, edges, "interp");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(30);
    }
  });
});

/* ── CurveFunction ────────────────────────────────────────────────── */

describe("CurveFunction", () => {
  it("applies a Power curve to density input", () => {
    const nodes = [
      makeNode("input", "Constant", { Value: 0.5 }),
      makeNode("curve", "Curve:Power", { Exponent: 2.0 }),
      makeNode("cf", "CurveFunction"),
    ];
    const edges = [
      makeEdge("input", "cf", "Input"),
      makeEdge("curve", "cf", "Curve"),
    ];
    const result = evalSingle(nodes, edges, "cf");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(0.25); // 0.5^2
    }
  });
});

/* ── Grid output size ─────────────────────────────────────────────── */

describe("Grid output", () => {
  it("returns correct-sized Float32Array", () => {
    const res = 32;
    const nodes = [makeNode("c", "Constant", { Value: 1 })];
    const result = evaluateDensityGrid(nodes, [], res, -64, 64, 64);
    expect(result.values).toBeInstanceOf(Float32Array);
    expect(result.values.length).toBe(res * res);
  });
});

/* ── Complex graph ────────────────────────────────────────────────── */

describe("Complex graph", () => {
  it("Sum of two noises + Clamp produces non-trivial output", () => {
    const nodes = [
      makeNode("n1", "SimplexNoise2D", { Frequency: 0.05, Amplitude: 1.0, Seed: "A" }),
      makeNode("n2", "SimplexNoise2D", { Frequency: 0.1, Amplitude: 0.5, Seed: "B" }),
      makeNode("sum", "Sum"),
      makeNode("clamp", "Clamp", { Min: -0.5, Max: 0.5 }),
    ];
    const edges = [
      makeEdge("n1", "sum", "Inputs[0]"),
      makeEdge("n2", "sum", "Inputs[1]"),
      makeEdge("sum", "clamp", "Input"),
    ];
    const result = evalSingle(nodes, edges, "clamp");
    // Should have variation
    const uniqueValues = new Set(result.values);
    expect(uniqueValues.size).toBeGreaterThan(1);
    // All values should be clamped
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeGreaterThanOrEqual(-0.5);
      expect(result.values[i]).toBeLessThanOrEqual(0.5);
    }
  });
});

/* ── Unsupported types ────────────────────────────────────────────── */

describe("Unsupported types", () => {
  it("returns 0 for unsupported types", () => {
    const nodes = [makeNode("s", "SurfaceDensity")];
    const result = evalSingle(nodes, []);
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(0);
    }
  });
});

/* ── Cycle guard ──────────────────────────────────────────────────── */

describe("Cycle guard", () => {
  it("handles cycles without infinite loop", () => {
    const nodes = [
      makeNode("a", "Negate"),
      makeNode("b", "Negate"),
    ];
    const edges = [
      makeEdge("a", "b", "Input"),
      makeEdge("b", "a", "Input"),
    ];
    // Should not hang — cycle guard returns 0
    const result = evalSingle(nodes, edges, "a");
    expect(result.values.length).toBe(RES * RES);
  });
});

/* ── Modulo ────────────────────────────────────────────────────────── */

describe("Modulo", () => {
  it("returns remainder", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 7 }),
      makeNode("mod", "Modulo", { Divisor: 3 }),
    ];
    const edges = [makeEdge("c", "mod", "Input")];
    const result = evalSingle(nodes, edges, "mod");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(1);
    }
  });
});

/* ── Passthrough types ────────────────────────────────────────────── */

describe("Passthrough types", () => {
  it("CacheOnce passes through input", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 7 }),
      makeNode("cache", "CacheOnce"),
    ];
    const edges = [makeEdge("c", "cache", "Input")];
    const result = evalSingle(nodes, edges, "cache");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(7);
    }
  });

  it("Debug passes through input", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 3 }),
      makeNode("dbg", "Debug"),
    ];
    const edges = [makeEdge("c", "dbg", "Input")];
    const result = evalSingle(nodes, edges, "dbg");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(3);
    }
  });
});

/* ── Switch ──────────────────────────────────────────────────────────── */

describe("Switch", () => {
  it("selects Inputs[0] when Selector=0", () => {
    const nodes = [
      makeNode("a", "Constant", { Value: 10 }),
      makeNode("b", "Constant", { Value: 20 }),
      makeNode("sw", "Switch", { Selector: 0 }),
    ];
    const edges = [
      makeEdge("a", "sw", "Inputs[0]"),
      makeEdge("b", "sw", "Inputs[1]"),
    ];
    const result = evalSingle(nodes, edges, "sw");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(10);
    }
  });

  it("selects Inputs[1] when Selector=1", () => {
    const nodes = [
      makeNode("a", "Constant", { Value: 10 }),
      makeNode("b", "Constant", { Value: 20 }),
      makeNode("sw", "Switch", { Selector: 1 }),
    ];
    const edges = [
      makeEdge("a", "sw", "Inputs[0]"),
      makeEdge("b", "sw", "Inputs[1]"),
    ];
    const result = evalSingle(nodes, edges, "sw");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(20);
    }
  });
});

/* ── BlendCurve ──────────────────────────────────────────────────────── */

describe("BlendCurve", () => {
  it("blends with curved factor", () => {
    const nodes = [
      makeNode("a", "Constant", { Value: 0 }),
      makeNode("b", "Constant", { Value: 100 }),
      makeNode("f", "Constant", { Value: 0.5 }),
      makeNode("curve", "Curve:Power", { Exponent: 2.0 }),
      makeNode("bc", "BlendCurve"),
    ];
    const edges = [
      makeEdge("a", "bc", "InputA"),
      makeEdge("b", "bc", "InputB"),
      makeEdge("f", "bc", "Factor"),
      makeEdge("curve", "bc", "Curve"),
    ];
    const result = evalSingle(nodes, edges, "bc");
    // Factor 0.5 through Power(2) = 0.25 → blend = 0 + (100 - 0) * 0.25 = 25
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(25);
    }
  });
});

/* ── SplineFunction ──────────────────────────────────────────────────── */

describe("SplineFunction", () => {
  it("applies spline interpolation from Points", () => {
    const nodes = [
      makeNode("input", "Constant", { Value: 0.5 }),
      makeNode("spline", "SplineFunction", {
        Points: [[0, 0], [0.5, 0.8], [1, 1]],
      }),
    ];
    const edges = [makeEdge("input", "spline", "Input")];
    const result = evalSingle(nodes, edges, "spline");
    // At x=0.5, spline should be close to 0.8 (given control point at 0.5,0.8)
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeGreaterThan(0.6);
      expect(result.values[i]).toBeLessThan(1.0);
    }
  });
});

/* ── Helper with options ─────────────────────────────────────────── */

function evalWithOptions(nodes: Node[], edges: Edge[], rootNodeId?: string, options?: EvaluationOptions) {
  return evaluateDensityGrid(nodes, edges, RES, RANGE_MIN, RANGE_MAX, Y_LEVEL, rootNodeId, options);
}

/* ── BaseHeight ──────────────────────────────────────────────────── */

describe("BaseHeight", () => {
  it("returns base Y value when Distance is false", () => {
    const nodes = [makeNode("bh", "BaseHeight", { BaseHeightName: "Base", Distance: false })];
    const result = evalWithOptions(nodes, [], "bh", { contentFields: { Base: 100 } });
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(100);
    }
  });

  it("returns (y - baseY) when Distance is true", () => {
    const nodes = [makeNode("bh", "BaseHeight", { BaseHeightName: "Base", Distance: true })];
    const result = evalWithOptions(nodes, [], "bh", { contentFields: { Base: 100 } });
    // Y_LEVEL = 64, baseY = 100, so distance = 64 - 100 = -36
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(-36);
    }
  });

  it("defaults to Base=100 when contentFields missing", () => {
    const nodes = [makeNode("bh", "BaseHeight", { BaseHeightName: "Base", Distance: false })];
    const result = evalSingle(nodes, []);
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(100);
    }
  });
});

/* ── Floor / Ceiling ─────────────────────────────────────────────── */

describe("Floor (V2: hard minimum limiter)", () => {
  it("clamps input up to the Floor value via max(v, floor)", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: -0.5 }),
      makeNode("f", "Floor", { Floor: 0 }),
    ];
    const edges = [makeEdge("c", "f", "Input")];
    const result = evalSingle(nodes, edges, "f");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(0); // max(-0.5, 0) = 0
    }
  });

  it("passes through values already above the floor", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 3.7 }),
      makeNode("f", "Floor", { Floor: 0 }),
    ];
    const edges = [makeEdge("c", "f", "Input")];
    const result = evalSingle(nodes, edges, "f");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(3.7); // max(3.7, 0) = 3.7
    }
  });
});

describe("Ceiling (V2: hard maximum limiter)", () => {
  it("clamps input down to the Ceiling value via min(v, ceiling)", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 3.2 }),
      makeNode("ceil", "Ceiling", { Ceiling: 1 }),
    ];
    const edges = [makeEdge("c", "ceil", "Input")];
    const result = evalSingle(nodes, edges, "ceil");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(1); // min(3.2, 1) = 1
    }
  });

  it("passes through values already below the ceiling", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 0.5 }),
      makeNode("ceil", "Ceiling", { Ceiling: 1 }),
    ];
    const edges = [makeEdge("c", "ceil", "Input")];
    const result = evalSingle(nodes, edges, "ceil");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(0.5); // min(0.5, 1) = 0.5
    }
  });
});

/* ── SmoothMin / SmoothMax ───────────────────────────────────────── */

describe("SmoothMin", () => {
  it("returns approximately the smaller value when smoothness is small", () => {
    const nodes = [
      makeNode("a", "Constant", { Value: 2 }),
      makeNode("b", "Constant", { Value: 8 }),
      makeNode("sm", "SmoothMin", { Smoothness: 0.01 }),
    ];
    const edges = [
      makeEdge("a", "sm", "Inputs[0]"),
      makeEdge("b", "sm", "Inputs[1]"),
    ];
    const result = evalSingle(nodes, edges, "sm");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(2, 1);
    }
  });
});

describe("SmoothMax", () => {
  it("returns approximately the larger value when smoothness is small", () => {
    const nodes = [
      makeNode("a", "Constant", { Value: 2 }),
      makeNode("b", "Constant", { Value: 8 }),
      makeNode("sm", "SmoothMax", { Smoothness: 0.01 }),
    ];
    const edges = [
      makeEdge("a", "sm", "Inputs[0]"),
      makeEdge("b", "sm", "Inputs[1]"),
    ];
    const result = evalSingle(nodes, edges, "sm");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(8, 1);
    }
  });
});

/* ── SmoothClamp ─────────────────────────────────────────────────── */

describe("SmoothClamp", () => {
  it("clamps value within range with smooth transitions", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 100 }),
      makeNode("sc", "SmoothClamp", { Min: 0, Max: 1, Smoothness: 0.01 }),
    ];
    const edges = [makeEdge("c", "sc", "Input")];
    const result = evalSingle(nodes, edges, "sc");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(1, 1);
    }
  });
});

/* ── YOverride ───────────────────────────────────────────────────── */

describe("YOverride", () => {
  it("evaluates child at override Y instead of actual Y", () => {
    const nodes = [
      makeNode("cy", "CoordinateY"),
      makeNode("yo", "YOverride", { OverrideY: 42 }),
    ];
    const edges = [makeEdge("cy", "yo", "Input")];
    const result = evalSingle(nodes, edges, "yo");
    // CoordinateY normally returns Y_LEVEL=64, but YOverride overrides to 42
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(42);
    }
  });
});

/* ── Anchor ──────────────────────────────────────────────────────── */

describe("Anchor", () => {
  it("passes through original position when no anchor is set", () => {
    const nodes = [
      makeNode("cx", "CoordinateX"),
      makeNode("anchor", "Anchor"),
    ];
    const edges = [makeEdge("cx", "anchor", "Input")];
    const result = evalSingle(nodes, edges, "anchor");
    // V2: when no anchor set, passes through original coords (not origin)
    // CoordinateX returns the X coordinate, which varies across the grid
    const unique = new Set(result.values);
    expect(unique.size).toBeGreaterThan(1);
  });
});

/* ── Exported ────────────────────────────────────────────────────── */

describe("Exported", () => {
  it("passes through input value", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 7 }),
      makeNode("exp", "Exported"),
    ];
    const edges = [makeEdge("c", "exp", "Input")];
    const result = evalSingle(nodes, edges, "exp");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(7);
    }
  });
});

/* ── ImportedValue ───────────────────────────────────────────────── */

describe("ImportedValue", () => {
  it("follows Input handle instead of returning 0", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 5 }),
      makeNode("imp", "ImportedValue"),
    ];
    const edges = [makeEdge("c", "imp", "Input")];
    const result = evalSingle(nodes, edges, "imp");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(5);
    }
  });
});

/* ── Offset ──────────────────────────────────────────────────────── */

describe("Offset", () => {
  it("adds Offset handle value to Input", () => {
    const nodes = [
      makeNode("input", "Constant", { Value: 10 }),
      makeNode("offset", "Constant", { Value: 5 }),
      makeNode("off", "Offset"),
    ];
    const edges = [
      makeEdge("input", "off", "Input"),
      makeEdge("offset", "off", "Offset"),
    ];
    const result = evalSingle(nodes, edges, "off");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(15);
    }
  });
});

/* ── CurveFunction with non-[0,1] Manual curve ───────────────────── */

describe("CurveFunction — Manual curve with wide x-range", () => {
  // Simulates the Eldritch Spirelands curve: {-10→1, 5→0.8, 30→0.3, 60→0}
  // Previously, clamping input to [0,1] made all outputs ~0.96.
  // After fix, the curve should properly attenuate based on actual x-range.

  function makeManualCurveGraph(inputValue: number) {
    const nodes = [
      makeNode("input", "Constant", { Value: inputValue }),
      makeNode("curve", "Curve:Manual", {
        Points: [
          { x: -10, y: 1 },
          { x: 5, y: 0.8 },
          { x: 30, y: 0.3 },
          { x: 60, y: 0 },
        ],
      }),
      makeNode("cf", "CurveFunction"),
    ];
    const edges = [
      makeEdge("input", "cf", "Input"),
      makeEdge("curve", "cf", "Curve"),
    ];
    return { nodes, edges };
  }

  it("returns ~1.0 for input near lower bound (-10)", () => {
    const { nodes, edges } = makeManualCurveGraph(-10);
    const result = evalSingle(nodes, edges, "cf");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(1.0, 1);
    }
  });

  it("returns ~0.8 for input=5", () => {
    const { nodes, edges } = makeManualCurveGraph(5);
    const result = evalSingle(nodes, edges, "cf");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(0.8, 0);
      expect(result.values[i]).toBeGreaterThan(0.5);
      expect(result.values[i]).toBeLessThan(1.0);
    }
  });

  it("returns ~0.3 for input=30", () => {
    const { nodes, edges } = makeManualCurveGraph(30);
    const result = evalSingle(nodes, edges, "cf");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(0.3, 0);
      expect(result.values[i]).toBeGreaterThan(0.05);
      expect(result.values[i]).toBeLessThan(0.6);
    }
  });

  it("returns ~0 for input near upper bound (60)", () => {
    const { nodes, edges } = makeManualCurveGraph(60);
    const result = evalSingle(nodes, edges, "cf");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(0.0, 0);
      expect(result.values[i]).toBeLessThan(0.15);
    }
  });

  it("properly attenuates height — NOT all ~0.96 (the old bug)", () => {
    // The critical test: input=-5 and input=30 should give very different outputs
    const { nodes: nodes1, edges: edges1 } = makeManualCurveGraph(-5);
    const { nodes: nodes2, edges: edges2 } = makeManualCurveGraph(30);
    const r1 = evalSingle(nodes1, edges1, "cf");
    const r2 = evalSingle(nodes2, edges2, "cf");
    // Input=-5 should be near 1.0, input=30 should be near 0.3
    const diff = Math.abs(r1.values[0] - r2.values[0]);
    expect(diff).toBeGreaterThan(0.3); // Must differ significantly (was ~0 before fix)
  });
});

/* ── SplineFunction with non-[0,1] x-range ──────────────────────── */

describe("SplineFunction — non-[0,1] x-range", () => {
  it("interpolates correctly across wide x-range", () => {
    const nodes = [
      makeNode("input", "Constant", { Value: 50 }),
      makeNode("spline", "SplineFunction", {
        Points: [
          { x: 0, y: 0 },
          { x: 50, y: 0.5 },
          { x: 100, y: 1 },
        ],
      }),
    ];
    const edges = [makeEdge("input", "spline", "Input")];
    const result = evalSingle(nodes, edges, "spline");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(0.5, 0);
      expect(result.values[i]).toBeGreaterThan(0.2);
      expect(result.values[i]).toBeLessThan(0.8);
    }
  });
});

/* ── VoronoiNoise2D with CellType ────────────────────────────────── */

describe("VoronoiNoise2D CellType", () => {
  it("Euclidean Distance produces varied values", () => {
    const nodes = [makeNode("v", "VoronoiNoise2D", {
      Scale: 10, Seed: "test", ReturnType: "Distance", DistanceFunction: "Euclidean",
    })];
    const result = evalSingle(nodes, []);
    const unique = new Set(result.values);
    expect(unique.size).toBeGreaterThan(1);
  });

  it("Distance2Div produces varied values", () => {
    const nodes = [makeNode("v", "VoronoiNoise2D", {
      Scale: 10, Seed: "test", ReturnType: "Distance2Div", DistanceFunction: "Euclidean",
    })];
    const result = evalSingle(nodes, []);
    const unique = new Set(result.values);
    expect(unique.size).toBeGreaterThan(1);
  });

  it("Distance2Sub produces different output than Distance", () => {
    const nodesE = [makeNode("v", "VoronoiNoise2D", {
      Scale: 10, Seed: "test", ReturnType: "Distance", DistanceFunction: "Euclidean",
    })];
    const nodesD = [makeNode("v", "VoronoiNoise2D", {
      Scale: 10, Seed: "test", ReturnType: "Distance2Sub", DistanceFunction: "Euclidean",
    })];
    const rE = evalSingle(nodesE, []);
    const rD = evalSingle(nodesD, []);
    let differs = false;
    for (let i = 0; i < rE.values.length; i++) {
      if (rE.values[i] !== rD.values[i]) { differs = true; break; }
    }
    expect(differs).toBe(true);
  });

  it("supports Octaves > 1 for FBM", () => {
    const nodes1 = [makeNode("v", "VoronoiNoise2D", {
      Scale: 10, Seed: "test", ReturnType: "Distance", Octaves: 1,
    })];
    const nodes4 = [makeNode("v", "VoronoiNoise2D", {
      Scale: 10, Seed: "test", ReturnType: "Distance", Octaves: 4,
    })];
    const r1 = evalSingle(nodes1, []);
    const r4 = evalSingle(nodes4, []);
    // FBM with more octaves should produce different results
    let differs = false;
    for (let i = 0; i < r1.values.length; i++) {
      if (r1.values[i] !== r4.values[i]) { differs = true; break; }
    }
    expect(differs).toBe(true);
  });
});

/* ── getEvalStatus ─────────────────────────────────────────────── */

describe("getEvalStatus", () => {
  it("returns Full for standard types", () => {
    expect(getEvalStatus("SimplexNoise2D")).toBe(EvalStatus.Full);
    expect(getEvalStatus("Constant")).toBe(EvalStatus.Full);
    expect(getEvalStatus("Sum")).toBe(EvalStatus.Full);
    expect(getEvalStatus("Clamp")).toBe(EvalStatus.Full);
    expect(getEvalStatus("Ellipsoid")).toBe(EvalStatus.Full);
  });

  it("returns Approximated for stub types", () => {
    expect(getEvalStatus("VectorWarp")).toBe(EvalStatus.Approximated);
    expect(getEvalStatus("PositionsCellNoise")).toBe(EvalStatus.Approximated);
    expect(getEvalStatus("Shell")).toBe(EvalStatus.Approximated);
  });

  it("returns Unsupported for context-dependent types", () => {
    expect(getEvalStatus("HeightAboveSurface")).toBe(EvalStatus.Unsupported);
    expect(getEvalStatus("Terrain")).toBe(EvalStatus.Unsupported);
    expect(getEvalStatus("Pipeline")).toBe(EvalStatus.Unsupported);
    expect(getEvalStatus("SurfaceDensity")).toBe(EvalStatus.Unsupported);
  });
});

/* ── Shape SDF — Ellipsoid ──────────────────────────────────────── */

describe("Ellipsoid SDF", () => {
  it("returns negative at origin (inside unit sphere)", () => {
    const nodes = [makeNode("e", "Ellipsoid", { Radius: { x: 1, y: 1, z: 1 } })];
    const val = evalAt(nodes, [], 0, 0, 0);
    expect(val).toBe(-1);
  });

  it("returns 0 on the surface", () => {
    const nodes = [makeNode("e", "Ellipsoid", { Radius: { x: 1, y: 1, z: 1 } })];
    const val = evalAt(nodes, [], 1, 0, 0);
    expect(val).toBeCloseTo(0);
  });

  it("returns positive outside", () => {
    const nodes = [makeNode("e", "Ellipsoid", { Radius: { x: 1, y: 1, z: 1 } })];
    const val = evalAt(nodes, [], 2, 0, 0);
    expect(val).toBeGreaterThan(0);
  });

  it("respects non-uniform radii", () => {
    const nodes = [makeNode("e", "Ellipsoid", { Radius: { x: 2, y: 1, z: 1 } })];
    const val = evalAt(nodes, [], 2, 0, 0);
    expect(val).toBeCloseTo(0);
  });
});

/* ── Shape SDF — Cuboid ─────────────────────────────────────────── */

describe("Cuboid SDF", () => {
  it("returns negative inside the box", () => {
    const nodes = [makeNode("b", "Cuboid", { Size: { x: 2, y: 2, z: 2 } })];
    const val = evalAt(nodes, [], 0, 0, 0);
    expect(val).toBeLessThan(0);
  });

  it("returns 0 on the face", () => {
    const nodes = [makeNode("b", "Cuboid", { Size: { x: 1, y: 1, z: 1 } })];
    const val = evalAt(nodes, [], 1, 0, 0);
    expect(val).toBeCloseTo(0);
  });

  it("returns positive outside", () => {
    const nodes = [makeNode("b", "Cuboid", { Size: { x: 1, y: 1, z: 1 } })];
    const val = evalAt(nodes, [], 3, 0, 0);
    expect(val).toBeGreaterThan(0);
  });
});

/* ── Shape SDF — Cylinder ───────────────────────────────────────── */

describe("Cylinder SDF", () => {
  it("returns negative inside", () => {
    const nodes = [makeNode("c", "Cylinder", { Radius: 2, Height: 4 })];
    const val = evalAt(nodes, [], 0, 0, 0);
    expect(val).toBeLessThan(0);
  });

  it("returns 0 on the side surface", () => {
    const nodes = [makeNode("c", "Cylinder", { Radius: 1, Height: 4 })];
    const val = evalAt(nodes, [], 1, 0, 0);
    expect(val).toBeCloseTo(0);
  });

  it("returns positive outside radially", () => {
    const nodes = [makeNode("c", "Cylinder", { Radius: 1, Height: 4 })];
    const val = evalAt(nodes, [], 5, 0, 0);
    expect(val).toBeGreaterThan(0);
  });

  it("returns positive above the cap", () => {
    const nodes = [makeNode("c", "Cylinder", { Radius: 1, Height: 2 })];
    const val = evalAt(nodes, [], 0, 3, 0);
    expect(val).toBeGreaterThan(0);
  });
});

/* ── Shape SDF — Plane ───────────────────────────────────────────── */

describe("Plane SDF", () => {
  it("returns 0 at origin with default params", () => {
    const nodes = [makeNode("p", "Plane", { Normal: { x: 0, y: 1, z: 0 }, Distance: 0 })];
    const val = evalAt(nodes, [], 0, 0, 0);
    expect(val).toBeCloseTo(0);
  });

  it("returns positive above the plane", () => {
    const nodes = [makeNode("p", "Plane", { Normal: { x: 0, y: 1, z: 0 }, Distance: 0 })];
    const val = evalAt(nodes, [], 0, 5, 0);
    expect(val).toBeCloseTo(5);
  });

  it("returns negative below the plane", () => {
    const nodes = [makeNode("p", "Plane", { Normal: { x: 0, y: 1, z: 0 }, Distance: 0 })];
    const val = evalAt(nodes, [], 0, -3, 0);
    expect(val).toBeCloseTo(-3);
  });

  it("respects Distance offset", () => {
    const nodes = [makeNode("p", "Plane", { Normal: { x: 0, y: 1, z: 0 }, Distance: 10 })];
    const val = evalAt(nodes, [], 0, 10, 0);
    expect(val).toBeCloseTo(0);
  });
});

/* ── Shape SDF — Shell ───────────────────────────────────────────── */

describe("Shell SDF", () => {
  it("returns negative inside the shell wall", () => {
    const nodes = [makeNode("s", "Shell", { InnerRadius: 1, OuterRadius: 3 })];
    const val = evalAt(nodes, [], 2, 0, 0);
    expect(val).toBeCloseTo(-1);
  });

  it("returns 0 on the inner surface", () => {
    const nodes = [makeNode("s", "Shell", { InnerRadius: 1, OuterRadius: 3 })];
    const val = evalAt(nodes, [], 1, 0, 0);
    expect(val).toBeCloseTo(0);
  });

  it("returns 0 on the outer surface", () => {
    const nodes = [makeNode("s", "Shell", { InnerRadius: 1, OuterRadius: 3 })];
    const val = evalAt(nodes, [], 3, 0, 0);
    expect(val).toBeCloseTo(0);
  });

  it("returns positive outside the shell", () => {
    const nodes = [makeNode("s", "Shell", { InnerRadius: 1, OuterRadius: 3 })];
    const val = evalAt(nodes, [], 5, 0, 0);
    expect(val).toBeGreaterThan(0);
  });

  it("returns positive inside the hollow center", () => {
    const nodes = [makeNode("s", "Shell", { InnerRadius: 2, OuterRadius: 4 })];
    const val = evalAt(nodes, [], 0, 0, 0);
    expect(val).toBeGreaterThan(0);
  });
});

/* ── AmplitudeConstant ───────────────────────────────────────────── */

describe("AmplitudeConstant", () => {
  it("multiplies input by Value", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 5 }),
      makeNode("a", "AmplitudeConstant", { Value: 3 }),
    ];
    const edges = [makeEdge("c", "a", "Input")];
    const result = evalSingle(nodes, edges, "a");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(15);
    }
  });
});

/* ── Pow ─────────────────────────────────────────────────────────── */

describe("Pow", () => {
  it("raises input to the Exponent", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 3 }),
      makeNode("p", "Pow", { Exponent: 2 }),
    ];
    const edges = [makeEdge("c", "p", "Input")];
    const result = evalSingle(nodes, edges, "p");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeCloseTo(9);
    }
  });
});

/* ── SmoothCeiling ───────────────────────────────────────────────── */

describe("SmoothCeiling", () => {
  it("smoothly clamps values near the ceiling", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 0.5 }),
      makeNode("sc", "SmoothCeiling", { Threshold: 1.0, Smoothness: 0.1 }),
    ];
    const edges = [makeEdge("c", "sc", "Input")];
    const result = evalSingle(nodes, edges, "sc");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeLessThanOrEqual(1.01);
    }
  });

  it("reduces values above the threshold", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 2.0 }),
      makeNode("sc", "SmoothCeiling", { Threshold: 1.0, Smoothness: 0.1 }),
    ];
    const edges = [makeEdge("c", "sc", "Input")];
    const result = evalSingle(nodes, edges, "sc");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeLessThan(2.0);
    }
  });
});

/* ── XOverride / ZOverride ───────────────────────────────────────── */

describe("XOverride", () => {
  it("replaces x coordinate with OverrideX", () => {
    const nodes = [
      makeNode("x", "CoordinateX"),
      makeNode("xo", "XOverride", { OverrideX: 42 }),
    ];
    const edges = [makeEdge("x", "xo", "Input")];
    const result = evalSingle(nodes, edges, "xo");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(42);
    }
  });
});

describe("ZOverride", () => {
  it("replaces z coordinate with OverrideZ", () => {
    const nodes = [
      makeNode("z", "CoordinateZ"),
      makeNode("zo", "ZOverride", { OverrideZ: 99 }),
    ];
    const edges = [makeEdge("z", "zo", "Input")];
    const result = evalSingle(nodes, edges, "zo");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(99);
    }
  });
});

/* ── Gradient ────────────────────────────────────────────────────── */

describe("Gradient", () => {
  it("returns 0 at FromY and 1 at ToY", () => {
    const nodes = [makeNode("g", "Gradient", { FromY: 0, ToY: 256 })];
    expect(evalAt(nodes, [], 0, 0, 0)).toBeCloseTo(0);
    expect(evalAt(nodes, [], 0, 256, 0)).toBeCloseTo(1);
    expect(evalAt(nodes, [], 0, 128, 0)).toBeCloseTo(0.5);
  });
});

/* ── GradientWarp ────────────────────────────────────────────────── */

describe("GradientWarp", () => {
  it("passes constant input through unchanged", () => {
    const nodes = [
      makeNode("src", "Constant", { Value: 5 }),
      makeNode("warp", "SimplexNoise2D", { Frequency: 0.1, Seed: "A" }),
      makeNode("gw", "GradientWarp", { WarpScale: 1.0 }),
    ];
    const edges = [
      makeEdge("src", "gw", "Input"),
      makeEdge("warp", "gw", "WarpSource"),
    ];
    const result = evalSingle(nodes, edges, "gw");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(5);
    }
  });
});

/* ── SwitchState ─────────────────────────────────────────────────── */

describe("SwitchState", () => {
  it("returns the State value", () => {
    const nodes = [makeNode("ss", "SwitchState", { State: 7 })];
    const val = evalAt(nodes, [], 0, 0, 0);
    expect(val).toBe(7);
  });
});

/* ── Handle Mapping Completeness ─────────────────────────────────── */

describe("DENSITY_NAMED_TO_ARRAY completeness", () => {
  /**
   * Types that use single "Input" handles in the evaluator should have
   * entries in DENSITY_NAMED_TO_ARRAY so Hytale import correctly maps
   * Inputs[0] → "Input".
   */
  const SINGLE_INPUT_TYPES = [
    "Negate", "CurveFunction", "CacheOnce", "Abs", "SquareRoot", "CubeMath",
    "CubeRoot", "Inverse", "Modulo", "Clamp", "SmoothClamp", "Normalizer",
    "LinearTransform", "FlatCache", "DomainWarp2D", "DomainWarp3D",
    "ScaledPosition", "TranslatedPosition", "RotatedPosition",
    "MirroredPosition", "QuantizedPosition", "Debug", "Passthrough", "Wrap",
    "SplineFunction", "Square", "SumSelf",
    "Exported", "ImportedValue", "YOverride", "XOverride", "ZOverride",
    "Floor", "Ceiling", "AmplitudeConstant", "Pow", "SmoothCeiling",
    "SmoothFloor", "Anchor", "PositionsPinch", "PositionsTwist",
    "GradientDensity", "Gradient", "YGradient", "ClampToIndex",
    "DoubleNormalizer",
  ];

  for (const type of SINGLE_INPUT_TYPES) {
    it(`${type} has DENSITY_NAMED_TO_ARRAY entry with "Input"`, () => {
      const handles = DENSITY_NAMED_TO_ARRAY[type];
      expect(handles).toBeDefined();
      expect(handles[0]).toBe("Input");
    });
  }

  const MULTI_INPUT_TYPES: [string, string[]][] = [
    ["Offset", ["Input", "Offset"]],
    ["GradientWarp", ["Input", "WarpSource"]],
    ["VectorWarp", ["Input", "WarpVector"]],
    ["Amplitude", ["Input", "Amplitude"]],
    ["YSampled", ["Input", "YProvider"]],
    ["WeightedSum", ["Inputs[0]", "Inputs[1]"]],
    ["Blend", ["InputA", "InputB", "Factor"]],
    ["Conditional", ["Condition", "TrueInput", "FalseInput"]],
  ];

  for (const [type, expectedHandles] of MULTI_INPUT_TYPES) {
    it(`${type} has correct multi-input handle mapping`, () => {
      const handles = DENSITY_NAMED_TO_ARRAY[type];
      expect(handles).toBeDefined();
      expect(handles).toEqual(expectedHandles);
    });
  }
});

/* ── Import chain evaluation (Exported → Clamp → Sum → Blend) ───── */

describe("Imported biome chain evaluation", () => {
  it("Exported → Clamp → Sum chain produces non-constant output", () => {
    const nodes = [
      makeNode("noise", "SimplexNoise2D", { Frequency: 0.05, Amplitude: 1.0, Seed: "chain" }),
      makeNode("clamp", "Clamp", { Min: 0, Max: 1 }),
      makeNode("const", "Constant", { Value: 0.5 }),
      makeNode("sum", "Sum"),
      makeNode("exported", "Exported"),
    ];
    const edges = [
      makeEdge("noise", "clamp", "Input"),
      makeEdge("clamp", "sum", "Inputs[0]"),
      makeEdge("const", "sum", "Inputs[1]"),
      makeEdge("sum", "exported", "Input"),
    ];
    const result = evalSingle(nodes, edges, "exported");
    // Should have variation — not flat
    const unique = new Set(result.values);
    expect(unique.size).toBeGreaterThan(1);
    // All values should be in [0.5, 1.5] (clamped noise [0,1] + 0.5)
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBeGreaterThanOrEqual(0.49);
      expect(result.values[i]).toBeLessThanOrEqual(1.51);
    }
  });

  it("YOverride with non-zero Value evaluates correctly", () => {
    // YOverride replaces the Y coordinate, so CoordinateY inside should return OverrideY
    const nodes = [
      makeNode("cy", "CoordinateY"),
      makeNode("yo", "YOverride", { OverrideY: 100 }),
    ];
    const edges = [makeEdge("cy", "yo", "Input")];
    const result = evalSingle(nodes, edges, "yo");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(100);
    }
  });

  it("Offset type correctly sums Input and Offset handles", () => {
    const nodes = [
      makeNode("base", "Constant", { Value: 10 }),
      makeNode("off", "Constant", { Value: 3 }),
      makeNode("offset", "Offset"),
    ];
    const edges = [
      makeEdge("base", "offset", "Input"),
      makeEdge("off", "offset", "Offset"),
    ];
    const result = evalSingle(nodes, edges, "offset");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(13);
    }
  });

  it("Amplitude type multiplies Input by Amplitude handle", () => {
    const nodes = [
      makeNode("input", "Constant", { Value: 5 }),
      makeNode("amp", "Constant", { Value: 3 }),
      makeNode("amplitude", "Amplitude"),
    ];
    const edges = [
      makeEdge("input", "amplitude", "Input"),
      makeEdge("amp", "amplitude", "Amplitude"),
    ];
    const result = evalSingle(nodes, edges, "amplitude");
    for (let i = 0; i < result.values.length; i++) {
      expect(result.values[i]).toBe(15);
    }
  });
});

/* ── PositionsCellNoise with MaxDistance ──────────────────────────── */

/* ── Angle ───────────────────────────────────────────────────────── */

describe("Angle", () => {
  it("returns 0° when position is parallel to reference vector", () => {
    const nodes = [makeNode("a", "Angle", { Vector: { x: 0, y: 1, z: 0 } })];
    const val = evalAt(nodes, [], 0, 5, 0);
    expect(val).toBeCloseTo(0);
  });

  it("returns 180° when position is antiparallel to reference vector", () => {
    const nodes = [makeNode("a", "Angle", { Vector: { x: 0, y: 1, z: 0 } })];
    const val = evalAt(nodes, [], 0, -5, 0);
    expect(val).toBeCloseTo(180);
  });

  it("returns 90° when position is perpendicular to reference vector", () => {
    const nodes = [makeNode("a", "Angle", { Vector: { x: 0, y: 1, z: 0 } })];
    const val = evalAt(nodes, [], 5, 0, 0);
    expect(val).toBeCloseTo(90);
  });

  it("IsAxis mirrors angles > 90° to [0, 90]", () => {
    const nodes = [makeNode("a", "Angle", { Vector: { x: 0, y: 1, z: 0 }, IsAxis: true })];
    const val = evalAt(nodes, [], 0, -5, 0);
    expect(val).toBeCloseTo(0);
  });

  it("returns 0 at the origin (degenerate)", () => {
    const nodes = [makeNode("a", "Angle", { Vector: { x: 0, y: 1, z: 0 } })];
    const val = evalAt(nodes, [], 0, 0, 0);
    expect(val).toBe(0);
  });

  it("works with a connected Vector:Constant node", () => {
    const nodes = [
      makeNode("a", "Angle"),
      makeNode("vc", "Vector:Constant", { Value: { x: 1, y: 0, z: 0 } }),
    ];
    const edges = [makeEdge("vc", "a", "Vector")];
    // position (5,0,0) is parallel to reference (1,0,0) → 0°
    const val = evalAt(nodes, edges, 5, 0, 0);
    expect(val).toBeCloseTo(0);
  });
});

describe("PositionsCellNoise with MaxDistance", () => {
  it("uses MaxDistance to derive frequency", () => {
    const nodes = [makeNode("pcn", "PositionsCellNoise", { MaxDistance: 300, Seed: "test" })];
    const result = evalSingle(nodes, []);
    const unique = new Set(result.values);
    expect(unique.size).toBeGreaterThan(1);
  });

  it("respects DistanceFunction field", () => {
    const nodesE = [makeNode("pcn", "PositionsCellNoise", {
      MaxDistance: 100, Seed: "test", DistanceFunction: "Euclidean",
    })];
    const nodesD = [makeNode("pcn", "PositionsCellNoise", {
      MaxDistance: 100, Seed: "test", DistanceFunction: "Distance2Sub",
    })];
    const rE = evalSingle(nodesE, []);
    const rD = evalSingle(nodesD, []);
    let differs = false;
    for (let i = 0; i < rE.values.length; i++) {
      if (rE.values[i] !== rD.values[i]) { differs = true; break; }
    }
    expect(differs).toBe(true);
  });
});
