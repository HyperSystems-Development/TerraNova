import { describe, it, expect } from "vitest";
import type { Node, Edge } from "@xyflow/react";
import { evaluatePositions, type WorldRange } from "../positionEvaluator";

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
    id: `${source}-${target}`,
    source,
    target,
    targetHandle: targetHandle ?? null,
  };
}

const DEFAULT_RANGE: WorldRange = { minX: -64, maxX: 64, minZ: -64, maxZ: 64 };
const SEED = 42;

/* ── Empty graph ──────────────────────────────────────────────────── */

describe("evaluatePositions — empty graph", () => {
  it("returns empty array for empty nodes", () => {
    expect(evaluatePositions([], [], DEFAULT_RANGE, SEED)).toEqual([]);
  });

  it("returns empty array when no position-type node exists", () => {
    // Non-position node types should not be evaluated
    const nodes = [makeNode("a", "SimplexNoise2D", { Frequency: 1 })];
    expect(evaluatePositions(nodes, [], DEFAULT_RANGE, SEED)).toEqual([]);
  });

  it("uses fallback root detection when _biomeField tag is missing", () => {
    // Mesh2D without _biomeField tag — should still be found via fallback
    const nodes = [makeNode("a", "Mesh2D", { Resolution: 32, Jitter: 0 })];
    const result = evaluatePositions(nodes, [], DEFAULT_RANGE, SEED);
    expect(result).toHaveLength(16); // 128/32 = 4 per axis → 4×4 = 16
  });
});

/* ── Mesh2D ───────────────────────────────────────────────────────── */

describe("evaluatePositions — Mesh2D", () => {
  it("generates correct grid count for Resolution=16 in ±64 range", () => {
    const nodes = [
      makeNode("root", "Mesh2D", { Resolution: 16, Jitter: 0 }, { _biomeField: "Positions" }),
    ];
    const result = evaluatePositions(nodes, [], DEFAULT_RANGE, SEED);
    // 128 / 16 = 8 cells per axis → 8×8 = 64
    expect(result).toHaveLength(64);
  });

  it("positions deviate from grid when jitter is applied", () => {
    const nodes = [
      makeNode("root", "Mesh2D", { Resolution: 16, Jitter: 1 }, { _biomeField: "Positions" }),
    ];
    const result = evaluatePositions(nodes, [], DEFAULT_RANGE, SEED);
    expect(result.length).toBe(64);

    // With jitter, positions should not all be exact multiples of 16
    const hasJitter = result.some((p) => p.x % 16 !== 0 || p.z % 16 !== 0);
    expect(hasJitter).toBe(true);

    // All positions should still be within range (with jitter buffer)
    for (const p of result) {
      expect(p.x).toBeGreaterThanOrEqual(-72);
      expect(p.x).toBeLessThanOrEqual(72);
      expect(p.z).toBeGreaterThanOrEqual(-72);
      expect(p.z).toBeLessThanOrEqual(72);
    }
  });

  it("is deterministic — same seed produces same output", () => {
    const nodes = [
      makeNode("root", "Mesh2D", { Resolution: 16, Jitter: 0.5 }, { _biomeField: "Positions" }),
    ];
    const a = evaluatePositions(nodes, [], DEFAULT_RANGE, SEED);
    const b = evaluatePositions(nodes, [], DEFAULT_RANGE, SEED);
    expect(a).toEqual(b);
  });
});

/* ── Mesh3D ───────────────────────────────────────────────────────── */

describe("evaluatePositions — Mesh3D", () => {
  it("generates grid same as Mesh2D (Y ignored)", () => {
    const nodes = [
      makeNode("root", "Mesh3D", { Resolution: 32, Jitter: 0 }, { _biomeField: "Positions" }),
    ];
    const result = evaluatePositions(nodes, [], DEFAULT_RANGE, SEED);
    // 128 / 32 = 4 cells per axis → 4×4 = 16
    expect(result).toHaveLength(16);
  });
});

/* ── SimpleHorizontal ─────────────────────────────────────────────── */

describe("evaluatePositions — SimpleHorizontal", () => {
  it("passes through upstream positions with RangeY constraint", () => {
    const nodes = [
      makeNode("root", "SimpleHorizontal", { RangeY: { Min: 0, Max: 256 } }, { _biomeField: "Positions" }),
      makeNode("mesh", "Mesh2D", { Resolution: 32, Jitter: 0 }),
    ];
    const edges = [makeEdge("mesh", "root", "PositionProvider")];
    const result = evaluatePositions(nodes, edges, DEFAULT_RANGE, SEED);
    expect(result).toHaveLength(16);
  });
});

/* ── List ──────────────────────────────────────────────────────────── */

describe("evaluatePositions — List", () => {
  it("returns explicit positions filtered to range", () => {
    const nodes = [
      makeNode(
        "root",
        "List",
        {
          Positions: [
            { x: 0, y: 0, z: 0 },
            { x: 10, y: 0, z: 10 },
            { x: 999, y: 0, z: 999 }, // out of range
          ],
        },
        { _biomeField: "Positions" },
      ),
    ];
    const result = evaluatePositions(nodes, [], DEFAULT_RANGE, SEED);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ x: 0, z: 0, weight: 1 });
    expect(result[1]).toEqual({ x: 10, z: 10, weight: 1 });
  });
});

/* ── Occurrence ────────────────────────────────────────────────────── */

describe("evaluatePositions — Occurrence", () => {
  it("filters upstream positions via density FieldFunction (preview: ~50% random)", () => {
    const nodes = [
      makeNode("root", "Occurrence", { Seed: "A" }, { _biomeField: "Positions" }),
      makeNode("mesh", "Mesh2D", { Resolution: 16, Jitter: 0 }),
    ];
    const edges = [makeEdge("mesh", "root", "PositionProvider")];
    const result = evaluatePositions(nodes, edges, DEFAULT_RANGE, SEED);
    // Preview uses 50% random filter on 64 positions
    expect(result.length).toBeGreaterThan(10);
    expect(result.length).toBeLessThan(55);
  });
});

/* ── Offset ────────────────────────────────────────────────────────── */

describe("evaluatePositions — Offset", () => {
  it("shifts positions by offset values", () => {
    const nodes = [
      makeNode("root", "Offset", { Offset: { x: 10, y: 0, z: -5 } }, { _biomeField: "Positions" }),
      makeNode("mesh", "Mesh2D", { Resolution: 64, Jitter: 0 }),
    ];
    const edges = [makeEdge("mesh", "root", "PositionProvider")];
    const result = evaluatePositions(nodes, edges, DEFAULT_RANGE, SEED);
    // 128/64 = 2 per axis → 4 base positions, each shifted
    expect(result).toHaveLength(4);
    // First position: base (-64, -64) + offset (10, -5) = (-54, -69)
    expect(result[0].x).toBe(-54);
    expect(result[0].z).toBe(-69);
  });
});

/* ── Union ─────────────────────────────────────────────────────────── */

describe("evaluatePositions — Union", () => {
  it("merges two Mesh2D outputs", () => {
    const nodes = [
      makeNode("root", "Union", {}, { _biomeField: "Positions" }),
      makeNode("a", "Mesh2D", { Resolution: 64, Jitter: 0 }),
      makeNode("b", "Mesh2D", { Resolution: 64, Jitter: 0 }),
    ];
    const edges = [
      makeEdge("a", "root", "Providers[0]"),
      makeEdge("b", "root", "Providers[1]"),
    ];
    const result = evaluatePositions(nodes, edges, DEFAULT_RANGE, SEED);
    // 4 + 4 = 8
    expect(result).toHaveLength(8);
  });
});

/* ── Cache / SurfaceProjection ────────────────────────────────────── */

describe("evaluatePositions — passthrough types", () => {
  it("Cache passes through upstream", () => {
    const nodes = [
      makeNode("root", "Cache", {}, { _biomeField: "Positions" }),
      makeNode("mesh", "Mesh2D", { Resolution: 64, Jitter: 0 }),
    ];
    const edges = [makeEdge("mesh", "root", "PositionProvider")];
    const result = evaluatePositions(nodes, edges, DEFAULT_RANGE, SEED);
    expect(result).toHaveLength(4);
  });

  it("SurfaceProjection passes through upstream", () => {
    const nodes = [
      makeNode("root", "SurfaceProjection", {}, { _biomeField: "Positions" }),
      makeNode("mesh", "Mesh2D", { Resolution: 64, Jitter: 0 }),
    ];
    const edges = [makeEdge("mesh", "root", "PositionProvider")];
    const result = evaluatePositions(nodes, edges, DEFAULT_RANGE, SEED);
    expect(result).toHaveLength(4);
  });
});

/* ── Imported / Exported ──────────────────────────────────────────── */

describe("evaluatePositions — Imported/Exported", () => {
  it("Imported returns empty array", () => {
    const nodes = [
      makeNode("root", "Imported", { Name: "test" }, { _biomeField: "Positions" }),
    ];
    const result = evaluatePositions(nodes, [], DEFAULT_RANGE, SEED);
    expect(result).toEqual([]);
  });

  it("Exported follows upstream input", () => {
    const nodes = [
      makeNode("root", "Exported", { Name: "test" }, { _biomeField: "Positions" }),
      makeNode("mesh", "Mesh2D", { Resolution: 64, Jitter: 0 }),
    ];
    const edges = [makeEdge("mesh", "root", "Input")];
    const result = evaluatePositions(nodes, edges, DEFAULT_RANGE, SEED);
    expect(result).toHaveLength(4);
  });

  it("Exported with no input returns empty", () => {
    const nodes = [
      makeNode("root", "Exported", { Name: "test" }, { _biomeField: "Positions" }),
    ];
    const result = evaluatePositions(nodes, [], DEFAULT_RANGE, SEED);
    expect(result).toEqual([]);
  });
});

/* ── Chain: Mesh2D → Occurrence → Cache ───────────────────────────── */

describe("evaluatePositions — chain", () => {
  it("Mesh2D → Occurrence → Cache produces filtered output", () => {
    const nodes = [
      makeNode("root", "Cache", {}, { _biomeField: "Positions" }),
      makeNode("occ", "Occurrence", { Seed: "" }),
      makeNode("mesh", "Mesh2D", { Resolution: 32, Jitter: 0 }),
    ];
    const edges = [
      makeEdge("mesh", "occ", "PositionProvider"),
      makeEdge("occ", "root", "PositionProvider"),
    ];
    const result = evaluatePositions(nodes, edges, DEFAULT_RANGE, SEED);
    // Occurrence preview uses 50% random filter on 16 upstream positions
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(16);
  });
});

/* ── Conditional ──────────────────────────────────────────────────── */

describe("evaluatePositions — Conditional", () => {
  it("follows TrueInput path", () => {
    const nodes = [
      makeNode("root", "Conditional", {}, { _biomeField: "Positions" }),
      makeNode("mesh", "Mesh2D", { Resolution: 64, Jitter: 0 }),
    ];
    const edges = [makeEdge("mesh", "root", "TrueInput")];
    const result = evaluatePositions(nodes, edges, DEFAULT_RANGE, SEED);
    expect(result).toHaveLength(4);
  });

  it("returns empty when only FalseInput is connected", () => {
    const nodes = [
      makeNode("root", "Conditional", {}, { _biomeField: "Positions" }),
      makeNode("mesh", "Mesh2D", { Resolution: 64, Jitter: 0 }),
    ];
    const edges = [makeEdge("mesh", "root", "FalseInput")];
    const result = evaluatePositions(nodes, edges, DEFAULT_RANGE, SEED);
    expect(result).toHaveLength(0);
  });
});

/* ── Cycle detection ─────────────────────────────────────────────── */

describe("evaluatePositions — cycle detection", () => {
  it("returns empty for a graph with a self-cycle", () => {
    const nodes = [
      makeNode("root", "Cache", {}, { _biomeField: "Positions" }),
    ];
    const edges = [makeEdge("root", "root", "PositionProvider")];
    const result = evaluatePositions(nodes, edges, DEFAULT_RANGE, SEED);
    expect(result).toHaveLength(0);
  });

  it("handles a two-node cycle without infinite loop", () => {
    const nodes = [
      makeNode("a", "Cache", {}, { _biomeField: "Positions" }),
      makeNode("b", "Cache", {}),
    ];
    const edges = [
      makeEdge("b", "a", "PositionProvider"),
      makeEdge("a", "b", "PositionProvider"),
    ];
    const result = evaluatePositions(nodes, edges, DEFAULT_RANGE, SEED);
    // Should not hang; cycle is broken by visited set
    expect(result).toHaveLength(0);
  });
});

/* ── Explicit rootNodeId ─────────────────────────────────────────── */

describe("evaluatePositions — explicit rootNodeId", () => {
  it("evaluates from a specific node when rootNodeId is provided", () => {
    const nodes = [
      makeNode("root", "Union", {}, { _biomeField: "Positions" }),
      makeNode("meshA", "Mesh2D", { Resolution: 64, Jitter: 0 }),
      makeNode("meshB", "Mesh2D", { Resolution: 32, Jitter: 0 }),
    ];
    const edges = [
      makeEdge("meshA", "root", "Providers[0]"),
      makeEdge("meshB", "root", "Providers[1]"),
    ];

    // Without rootNodeId — evaluates from Union root → 4 + 16 = 20
    const all = evaluatePositions(nodes, edges, DEFAULT_RANGE, SEED);
    expect(all).toHaveLength(20);

    // With rootNodeId pointing to meshA → only 4 positions
    const fromA = evaluatePositions(nodes, edges, DEFAULT_RANGE, SEED, "meshA");
    expect(fromA).toHaveLength(4);

    // With rootNodeId pointing to meshB → only 16 positions
    const fromB = evaluatePositions(nodes, edges, DEFAULT_RANGE, SEED, "meshB");
    expect(fromB).toHaveLength(16);
  });

  it("falls back to root detection when rootNodeId is not found", () => {
    const nodes = [
      makeNode("root", "Mesh2D", { Resolution: 64, Jitter: 0 }, { _biomeField: "Positions" }),
    ];
    const result = evaluatePositions(nodes, [], DEFAULT_RANGE, SEED, "nonexistent");
    // Should fallback to the tagged root
    expect(result).toHaveLength(4);
  });
});

/* ── Hard cap ─────────────────────────────────────────────────────── */

describe("evaluatePositions — hard cap", () => {
  it("caps output at 10,000 positions", () => {
    // Resolution=2 in ±128 range → 128 per axis → 128×128 = 16,384 (exceeds cap)
    const nodes = [
      makeNode("root", "Mesh2D", { Resolution: 2, Jitter: 0 }, { _biomeField: "Positions" }),
    ];
    const range: WorldRange = { minX: -128, maxX: 128, minZ: -128, maxZ: 128 };
    const result = evaluatePositions(nodes, [], range, SEED);
    expect(result).toHaveLength(10_000);
  });
});
