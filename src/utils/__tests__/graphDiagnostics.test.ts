import { describe, it, expect } from "vitest";
import type { Node, Edge } from "@xyflow/react";
import { analyzeBiome, analyzeGraph } from "../graphDiagnostics";

/* ── Helpers ───────────────────────────────────────────────────────── */

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

/* ── Tests ─────────────────────────────────────────────────────────── */

describe("analyzeGraph — empty graph", () => {
  it("returns no diagnostics for empty graph", () => {
    expect(analyzeGraph([], [])).toEqual([]);
  });
});

describe("analyzeGraph — disconnected inputs", () => {
  it("warns about disconnected required input", () => {
    const nodes = [makeNode("sum", "Sum")];
    const diagnostics = analyzeGraph(nodes, []);
    const warnings = diagnostics.filter((d) => d.severity === "warning" && d.message.includes("disconnected"));
    expect(warnings.length).toBeGreaterThanOrEqual(1);
  });
});

describe("analyzeGraph — unsupported types", () => {
  it("emits info for unsupported preview types", () => {
    const nodes = [makeNode("sd", "SurfaceDensity")];
    const diagnostics = analyzeGraph(nodes, []);
    const infos = diagnostics.filter((d) => d.severity === "info" && d.message.includes("not supported"));
    expect(infos.length).toBe(1);
  });
});

describe("analyzeGraph — cycle detection", () => {
  it("detects cycles and emits errors", () => {
    const nodes = [
      makeNode("a", "Negate"),
      makeNode("b", "Negate"),
    ];
    const edges = [
      makeEdge("a", "b", "Input"),
      makeEdge("b", "a", "Input"),
    ];
    const diagnostics = analyzeGraph(nodes, edges);
    const errors = diagnostics.filter((d) => d.severity === "error" && d.message.includes("cycle"));
    expect(errors.length).toBe(2);
  });
});

describe("analyzeGraph — parallel edges (no false cycle)", () => {
  it("does not flag cycle when same source feeds multiple inputs on one target", () => {
    // One Noise node wired to both InputA and InputB of a Sum — acyclic
    const nodes = [
      makeNode("noise", "SimplexNoise2D", { Scale: 100, Octaves: 4, Lacunarity: 2, Persistence: 0.5 }),
      makeNode("sum", "Sum"),
    ];
    const edges = [
      makeEdge("noise", "sum", "InputA"),
      makeEdge("noise", "sum", "InputB"),
    ];
    const diagnostics = analyzeGraph(nodes, edges);
    const cycleErrors = diagnostics.filter((d) => d.severity === "error" && d.message.includes("cycle"));
    expect(cycleErrors.length).toBe(0);
  });

  it("does not flag cycle in diamond DAG with shared ancestor", () => {
    // A → B, A → C, B → D, C → D (diamond shape, acyclic)
    const nodes = [
      makeNode("a", "Constant", { Value: 1 }),
      makeNode("b", "Negate"),
      makeNode("c", "Abs"),
      makeNode("d", "Sum"),
    ];
    const edges = [
      makeEdge("a", "b", "Input"),
      makeEdge("a", "c", "Input"),
      makeEdge("b", "d", "Inputs[0]"),
      makeEdge("c", "d", "Inputs[1]"),
    ];
    const diagnostics = analyzeGraph(nodes, edges);
    const cycleErrors = diagnostics.filter((d) => d.severity === "error" && d.message.includes("cycle"));
    expect(cycleErrors.length).toBe(0);
  });
});

describe("analyzeGraph — dead nodes", () => {
  it("warns about unreachable dead nodes", () => {
    // c1 connects to sum (terminal), c2 is disconnected (dead)
    const nodes = [
      makeNode("c1", "Constant"),
      makeNode("c2", "Constant"),
      makeNode("sum", "Sum"),
    ];
    const edges = [
      makeEdge("c1", "sum", "Inputs[0]"),
    ];
    const diagnostics = analyzeGraph(nodes, edges);
    const deadWarnings = diagnostics.filter((d) => d.severity === "warning" && d.message.includes("unreachable"));
    expect(deadWarnings.length).toBe(1);
    expect(deadWarnings[0].nodeId).toBe("c2");
  });
});

describe("analyzeGraph — fully connected graph", () => {
  it("returns no disconnected-input warnings for fully connected graph", () => {
    const nodes = [
      makeNode("a", "Constant", { Value: 3 }),
      makeNode("b", "Constant", { Value: 7 }),
      makeNode("sum", "Sum"),
    ];
    const edges = [
      makeEdge("a", "sum", "Inputs[0]"),
      makeEdge("b", "sum", "Inputs[1]"),
    ];
    const diagnostics = analyzeGraph(nodes, edges);
    const disconnected = diagnostics.filter((d) => d.message.includes("disconnected"));
    expect(disconnected.length).toBe(0);
  });
});

/* ── Rule 5: Clamp Min > Max ──────────────────────────────────────── */

describe("analyzeGraph — Clamp Min > Max", () => {
  it("warns when Clamp Min exceeds Max", () => {
    const nodes = [makeNode("c", "Clamp", { Min: 1, Max: 0 })];
    const diagnostics = analyzeGraph(nodes, []);
    const warnings = diagnostics.filter(
      (d) => d.severity === "warning" && d.message.includes("Min") && d.message.includes("exceeds"),
    );
    expect(warnings.length).toBe(1);
    expect(warnings[0].nodeId).toBe("c");
  });

  it("does not warn when Clamp Min <= Max", () => {
    const nodes = [makeNode("c", "Clamp", { Min: 0, Max: 1 })];
    const diagnostics = analyzeGraph(nodes, []);
    const warnings = diagnostics.filter(
      (d) => d.severity === "warning" && d.message.includes("exceeds"),
    );
    expect(warnings.length).toBe(0);
  });

  it("warns when SmoothClamp Min exceeds Max", () => {
    const nodes = [makeNode("sc", "SmoothClamp", { Min: 5, Max: 2, Smoothness: 0.5 })];
    const diagnostics = analyzeGraph(nodes, []);
    const warnings = diagnostics.filter(
      (d) => d.severity === "warning" && d.message.includes("Min") && d.message.includes("exceeds"),
    );
    expect(warnings.length).toBe(1);
    expect(warnings[0].nodeId).toBe("sc");
  });
});

/* ── Rule 6: Normalizer inverted range ─────────────────────────────── */

describe("analyzeGraph — Normalizer inverted range", () => {
  it("warns when SourceRange Min >= Max", () => {
    const nodes = [makeNode("n", "Normalizer", {
      SourceRange: { Min: 1, Max: 0 },
      TargetRange: { Min: 0, Max: 1 },
    })];
    const diagnostics = analyzeGraph(nodes, []);
    const warnings = diagnostics.filter(
      (d) => d.severity === "warning" && d.message.includes("inverted"),
    );
    expect(warnings.length).toBe(1);
    expect(warnings[0].nodeId).toBe("n");
  });

  it("warns when SourceRange Min equals Max", () => {
    const nodes = [makeNode("n", "Normalizer", {
      SourceRange: { Min: 0.5, Max: 0.5 },
      TargetRange: { Min: 0, Max: 1 },
    })];
    const diagnostics = analyzeGraph(nodes, []);
    const warnings = diagnostics.filter(
      (d) => d.severity === "warning" && d.message.includes("inverted"),
    );
    expect(warnings.length).toBe(1);
  });

  it("does not warn when SourceRange Min < Max", () => {
    const nodes = [makeNode("n", "Normalizer", {
      SourceRange: { Min: -1, Max: 1 },
      TargetRange: { Min: 0, Max: 1 },
    })];
    const diagnostics = analyzeGraph(nodes, []);
    const warnings = diagnostics.filter(
      (d) => d.severity === "warning" && d.message.includes("inverted"),
    );
    expect(warnings.length).toBe(0);
  });
});

/* ── Rule 7: Empty Sum/Product inputs ──────────────────────────────── */

describe("analyzeGraph — Sum/Product no inputs", () => {
  it("warns when Sum has no inputs connected", () => {
    const nodes = [makeNode("s", "Sum")];
    const diagnostics = analyzeGraph(nodes, []);
    const warnings = diagnostics.filter(
      (d) => d.severity === "warning" && d.message.includes("no inputs connected"),
    );
    expect(warnings.length).toBe(1);
    expect(warnings[0].nodeId).toBe("s");
  });

  it("warns when Product has no inputs connected", () => {
    const nodes = [makeNode("p", "Product")];
    const diagnostics = analyzeGraph(nodes, []);
    const warnings = diagnostics.filter(
      (d) => d.severity === "warning" && d.message.includes("no inputs connected"),
    );
    expect(warnings.length).toBe(1);
    expect(warnings[0].nodeId).toBe("p");
  });

  it("does not warn when Sum has inputs connected", () => {
    const nodes = [
      makeNode("c", "Constant", { Value: 1 }),
      makeNode("s", "Sum"),
    ];
    const edges = [makeEdge("c", "s", "InputA")];
    const diagnostics = analyzeGraph(nodes, edges);
    const warnings = diagnostics.filter(
      (d) => d.severity === "warning" && d.message.includes("no inputs connected"),
    );
    expect(warnings.length).toBe(0);
  });
});

/* ── Rule 8: Field constraint violations ───────────────────────────── */

describe("analyzeGraph — field constraint violations", () => {
  it("emits error for negative Scale on SimplexNoise2D", () => {
    const nodes = [makeNode("n", "SimplexNoise2D", { Scale: -1, Octaves: 4, Lacunarity: 2, Persistence: 0.5 })];
    const diagnostics = analyzeGraph(nodes, []);
    const errors = diagnostics.filter(
      (d) => d.severity === "error" && d.message.includes("Scale"),
    );
    expect(errors.length).toBe(1);
  });

  it("emits error for missing required Constant Value", () => {
    const nodes = [makeNode("c", "Constant", {})];
    const diagnostics = analyzeGraph(nodes, []);
    const errors = diagnostics.filter(
      (d) => d.severity === "error" && d.message.includes("Constant"),
    );
    expect(errors.length).toBe(1);
  });

  it("does not emit constraint errors for valid fields", () => {
    const nodes = [makeNode("n", "SimplexNoise2D", { Scale: 100, Octaves: 4, Lacunarity: 2, Persistence: 0.5 })];
    const diagnostics = analyzeGraph(nodes, []);
    const constraintErrors = diagnostics.filter(
      (d) => d.message.includes("SimplexNoise2D."),
    );
    expect(constraintErrors.length).toBe(0);
  });
});

/* ── Rule 9: Output range mismatch hints ───────────────────────────── */

describe("analyzeGraph - output range mismatch hints", () => {
  it("does NOT hint when noise partially overlaps Clamp range (normal usage)", () => {
    const nodes = [
      makeNode("noise", "SimplexNoise2D", { Scale: 100, Octaves: 4, Lacunarity: 2, Persistence: 0.5 }),
      makeNode("clamp", "Clamp", { Min: 0, Max: 1 }),
    ];
    const edges = [makeEdge("noise", "clamp", "Input")];
    const diagnostics = analyzeGraph(nodes, edges);
    const hints = diagnostics.filter(
      (d) => d.severity === "info" && d.nodeId === "clamp" && d.message.includes("entirely"),
    );
    expect(hints.length).toBe(0);
  });

  it("hints when source is entirely below Clamp Min", () => {
    // Zero outputs [0, 0], Clamp Min=1 → source entirely below clamp range
    const nodes = [
      makeNode("zero", "Zero"),
      makeNode("clamp", "Clamp", { Min: 1, Max: 2 }),
    ];
    const edges = [makeEdge("zero", "clamp", "Input")];
    const diagnostics = analyzeGraph(nodes, edges);
    const hints = diagnostics.filter(
      (d) => d.severity === "info" && d.message.includes("entirely below"),
    );
    expect(hints.length).toBe(1);
  });

  it("hints when source range exceeds Normalizer SourceRange entirely", () => {
    const nodes = [
      makeNode("zero", "Zero"),
      makeNode("norm", "Normalizer", {
        SourceRange: { Min: 1, Max: 2 },
        TargetRange: { Min: 0, Max: 1 },
      }),
    ];
    const edges = [makeEdge("zero", "norm", "Input")];
    const diagnostics = analyzeGraph(nodes, edges);
    const hints = diagnostics.filter(
      (d) => d.severity === "info" && d.message.includes("entirely outside"),
    );
    expect(hints.length).toBe(1);
  });
});

describe("analyzeGraph - environment delimiter diagnostics", () => {
  it("emits structured diagnostics for invalid environment delimiter ranges", () => {
    const node: Node = {
      id: "env",
      type: "Environment:DensityDelimited",
      position: { x: 0, y: 0 },
      data: {
        type: "DensityDelimited",
        fields: {
          Delimiters: [
            {
              Range: { MinInclusive: -1, MaxExclusive: 0.6 },
              Environment: { Type: "Constant", Environment: "Env_Zone1_Plains" },
            },
            {
              Range: { MinInclusive: 0.4, MaxExclusive: 0.8 },
              Environment: { Type: "Constant", Environment: "Env_Zone1_Caves" },
            },
            {
              Range: { MinInclusive: 0.9, MaxExclusive: 0.2 },
              Environment: { Type: "Constant", Environment: "Env_Zone1" },
            },
          ],
        },
      },
    };

    const diagnostics = analyzeGraph([node], []);
    expect(diagnostics.some((d) => d.code === "env-delimiter-overlap" && d.field === "Delimiters")).toBe(true);
    expect(diagnostics.some((d) => d.code === "env-delimiter-invalid-range" && d.meta?.delimiterIndex === 2)).toBe(true);
  });

  it("tags missing imported names as import diagnostics", () => {
    const nodes = [makeNode("imp", "Imported", {})];
    const diagnostics = analyzeGraph(nodes, []);
    expect(diagnostics.some((d) => d.code === "import-missing-name" && d.field === "Name")).toBe(true);
  });

  it("accepts project environment names when provided", () => {
    const node: Node = {
      id: "env",
      type: "Environment:DensityDelimited",
      position: { x: 0, y: 0 },
      data: {
        type: "DensityDelimited",
        fields: {
          Delimiters: [
            {
              Range: { MinInclusive: -1, MaxExclusive: 1 },
              Environment: { Type: "Constant", Environment: "Env_CustomBiome" },
            },
          ],
        },
      },
    };

    const diagnostics = analyzeGraph([node], [], { environment: ["Env_CustomBiome"] });
    expect(diagnostics.some((d) => d.code === "env-delimiter-unknown-environment")).toBe(false);
  });

  it("validates imported tint, material, and prop refs against known project assets", () => {
    const nodes: Node[] = [
      {
        id: "tint",
        type: "Tint:Imported",
        position: { x: 0, y: 0 },
        data: { type: "Imported", fields: { Name: "Tint_Forest" } },
      },
      {
        id: "material",
        type: "Material:Imported",
        position: { x: 0, y: 0 },
        data: { type: "Imported", fields: { Name: "Mat_Stone" } },
      },
      {
        id: "prop",
        type: "Prop:Imported",
        position: { x: 0, y: 0 },
        data: { type: "Imported", fields: { Name: "Prop_OakTree" } },
      },
    ];

    const diagnostics = analyzeGraph(nodes, [], {
      tint: ["Tint_Meadow"],
      material: ["Mat_Stone"],
      prop: ["Prop_PineTree"],
    });

    const tintDiagnostic = diagnostics.find((d) => d.code === "asset-import-unknown-ref" && d.nodeId === "tint");
    expect(tintDiagnostic?.meta?.assetKind).toBe("tint");
    expect(tintDiagnostic?.meta?.importName).toBe("Tint_Forest");
    expect(diagnostics.some((d) => d.code === "asset-import-unknown-ref" && d.nodeId === "material")).toBe(false);
    expect(diagnostics.some((d) => d.code === "asset-import-unknown-ref" && d.nodeId === "prop")).toBe(true);
  });
});

describe("analyzeBiome - section targets", () => {
  it("targets EnvironmentProvider diagnostics to the environment section", () => {
    const diagnostics = analyzeBiome({
      Name: "test_biome",
      EnvironmentProvider: {
        Type: "Constant",
        Environment: "Env_Not_Real",
      },
    });

    const environmentError = diagnostics.find((d) => d.message.includes("unknown environment"));
    expect(environmentError?.biomeSection).toBe("EnvironmentProvider");
  });

  it("targets TintProvider diagnostics to the tint section", () => {
    const diagnostics = analyzeBiome({
      Name: "test_biome",
      TintProvider: {
        Type: "Constant",
        Color: "#12345",
      },
    });

    const tintError = diagnostics.find((d) => d.message.includes("invalid color value"));
    expect(tintError?.biomeSection).toBe("TintProvider");
  });

  it("targets missing biome name diagnostics to the terrain section", () => {
    const diagnostics = analyzeBiome({
      EnvironmentProvider: {
        Type: "Constant",
        Environment: "Env_Zone1_Plains",
      },
    });

    const nameError = diagnostics.find((d) => d.message.includes("no Name"));
    expect(nameError?.biomeSection).toBe("Terrain");
  });

  it("does not warn when EnvironmentProvider is already Default", () => {
    const diagnostics = analyzeBiome({
      Name: "test_biome",
      EnvironmentProvider: { Type: "Default" },
    });

    expect(diagnostics.some((d) => d.code === "biome-environment-no-constants")).toBe(false);
  });

  it("accepts project environment names for biome env refs", () => {
    const diagnostics = analyzeBiome({
      Name: "test_biome",
      EnvironmentProvider: {
        Type: "Constant",
        Environment: "Env_CustomBiome",
      },
    }, { environment: ["Env_CustomBiome"] });

    expect(diagnostics.some((d) => d.code === "biome-environment-unknown-ref")).toBe(false);
  });

  it("flags missing imported or exported biome environment names distinctly", () => {
    const importedDiagnostics = analyzeBiome({
      Name: "test_biome",
      EnvironmentProvider: {
        Type: "Imported",
        Name: "",
      },
    });
    const exportedDiagnostics = analyzeBiome({
      Name: "test_biome",
      EnvironmentProvider: {
        Type: "Exported",
        Name: "",
      },
    });

    expect(importedDiagnostics.some((d) => d.code === "biome-environment-missing-ref-name")).toBe(true);
    expect(exportedDiagnostics.some((d) => d.code === "biome-environment-missing-ref-name")).toBe(true);
    expect(importedDiagnostics.some((d) => d.code === "biome-environment-no-constants")).toBe(false);
    expect(exportedDiagnostics.some((d) => d.code === "biome-environment-no-constants")).toBe(false);
  });

  it("validates imported tint biome refs against known tint assets", () => {
    const diagnostics = analyzeBiome({
      Name: "test_biome",
      TintProvider: {
        Type: "Imported",
        Name: "Tint_Forest",
      },
    }, { tint: ["Tint_Meadow"] });

    const tintDiagnostic = diagnostics.find((d) => d.code === "biome-tint-unknown-ref");
    expect(tintDiagnostic?.meta?.assetKind).toBe("tint");
    expect(tintDiagnostic?.meta?.importName).toBe("Tint_Forest");
  });
});
