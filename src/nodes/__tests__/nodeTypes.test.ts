import { describe, it, expect } from "vitest";
import { HANDLE_REGISTRY, findHandleDef } from "../handleRegistry";
import { nodeTypes } from "../index";
import { DENSITY_DEFAULTS } from "@/schema/defaults";
import { FIELD_CONSTRAINTS } from "@/schema/constraints";
import { NODE_TIPS } from "@/schema/nodeTips";
import { FIELD_DESCRIPTIONS } from "@/schema/fieldDescriptions";
import { AssetCategory } from "@/schema/types";

/* Extended density types — math & smooth operations */

const EXTENDED_DENSITY_A = [
  "AmplitudeConstant", "Pow",
  "SmoothClamp", "Floor", "Ceiling", "SmoothFloor", "SmoothMin", "SmoothMax",
  "Anchor", "YOverride", "BaseHeight", "Offset", "Distance", "PositionsCellNoise",
];

/* Extended density types — overrides, warps, terrain */

const EXTENDED_DENSITY_B = [
  "XOverride", "ZOverride", "SmoothCeiling", "Gradient",
  "Amplitude", "YSampled", "SwitchState",
  "Positions3D", "PositionsPinch", "PositionsTwist",
  "GradientWarp", "VectorWarp",
  "Terrain", "CellWallDistance", "DistanceToBiomeEdge", "Pipeline",
];

const ALL_DENSITY = [...EXTENDED_DENSITY_A, ...EXTENDED_DENSITY_B];

/* ══════════════════════════════════════════════════════════════════════════
 * 1. Node type registry — every extended type has a React component
 * ══════════════════════════════════════════════════════════════════════════ */

describe("Extended node types — nodeTypes registry", () => {
  it.each(ALL_DENSITY)("density type '%s' is registered in nodeTypes", (type) => {
    expect(nodeTypes[type]).toBeDefined();
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * 2. Defaults — every extended type has a defaults entry
 * ══════════════════════════════════════════════════════════════════════════ */

describe("Extended node types — schema defaults", () => {
  it.each(ALL_DENSITY)("density '%s' has a DENSITY_DEFAULTS entry", (type) => {
    expect(type in DENSITY_DEFAULTS).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * 3. Handle registry — every extended type has handle definitions
 * ══════════════════════════════════════════════════════════════════════════ */

describe("Extended node types — handle registry", () => {
  it.each(ALL_DENSITY)("density '%s' has a HANDLE_REGISTRY entry", (type) => {
    expect(HANDLE_REGISTRY[type]).toBeDefined();
    expect(HANDLE_REGISTRY[type].length).toBeGreaterThanOrEqual(1);
  });

  it.each(ALL_DENSITY)("density '%s' has a density output handle", (type) => {
    const defs = HANDLE_REGISTRY[type];
    const outputs = defs.filter((d) => d.id === "output" && d.type === "source");
    expect(outputs.length).toBe(1);
    expect(outputs[0].category).toBe(AssetCategory.Density);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * 4. Handle category correctness — cross-category handles
 * ══════════════════════════════════════════════════════════════════════════ */

describe("Extended node types — cross-category handles", () => {
  it("VectorWarp has a vector input handle", () => {
    const def = findHandleDef("VectorWarp", "WarpVector");
    expect(def).toBeDefined();
    expect(def!.category).toBe(AssetCategory.VectorProvider);
    expect(def!.type).toBe("target");
  });

  it("Amplitude has two density input handles", () => {
    const defs = HANDLE_REGISTRY["Amplitude"];
    const inputs = defs.filter((d) => d.type === "target");
    expect(inputs.length).toBe(2);
    expect(inputs.every((d) => d.category === AssetCategory.Density)).toBe(true);
  });

  it("GradientWarp has two density input handles", () => {
    const defs = HANDLE_REGISTRY["GradientWarp"];
    const inputs = defs.filter((d) => d.type === "target");
    expect(inputs.length).toBe(2);
    expect(inputs.every((d) => d.category === AssetCategory.Density)).toBe(true);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * 5. Defaults — field values are reasonable
 * ══════════════════════════════════════════════════════════════════════════ */

describe("Extended node types — default field values", () => {
  it("SmoothCeiling has Threshold and Smoothness defaults", () => {
    const d = DENSITY_DEFAULTS["SmoothCeiling"];
    expect(d.Threshold).toBe(1.0);
    expect(d.Smoothness).toBe(0.1);
  });

  it("Gradient has Axis and SampleRange defaults", () => {
    const d = DENSITY_DEFAULTS["Gradient"];
    expect(d.Axis).toEqual({ x: 0, y: 1, z: 0 });
    expect(d.SampleRange).toBe(1.0);
  });

  it("XOverride has OverrideX default", () => {
    expect(DENSITY_DEFAULTS["XOverride"].OverrideX).toBe(0);
  });

  it("ZOverride has OverrideZ default", () => {
    expect(DENSITY_DEFAULTS["ZOverride"].OverrideZ).toBe(0);
  });

  it("SwitchState has State default", () => {
    expect(DENSITY_DEFAULTS["SwitchState"].State).toBe(0);
  });

  it("Positions3D has Frequency and Seed defaults", () => {
    const d = DENSITY_DEFAULTS["Positions3D"];
    expect(d.Frequency).toBe(0.01);
    expect(d.Seed).toBe("A");
  });

  it("PositionsPinch has Strength default", () => {
    expect(DENSITY_DEFAULTS["PositionsPinch"].Strength).toBe(1.0);
  });

  it("PositionsTwist has Angle default", () => {
    expect(DENSITY_DEFAULTS["PositionsTwist"].Angle).toBe(0.0);
  });

  it("GradientWarp has WarpScale default", () => {
    expect(DENSITY_DEFAULTS["GradientWarp"].WarpScale).toBe(1.0);
  });

  it("AmplitudeConstant has no fields (legacy output-only)", () => {
    expect(Object.keys(DENSITY_DEFAULTS["AmplitudeConstant"])).toHaveLength(0);
  });

  it("Pow has Exponent default", () => {
    expect(DENSITY_DEFAULTS["Pow"].Exponent).toBe(2);
  });

});

/* ══════════════════════════════════════════════════════════════════════════
 * 6. Constraints — types with editable numeric fields have constraints
 * ══════════════════════════════════════════════════════════════════════════ */

describe("Extended node types — constraints", () => {
  it("SmoothCeiling has a Smoothness >= 0 constraint", () => {
    const c = FIELD_CONSTRAINTS["SmoothCeiling"];
    expect(c).toBeDefined();
    expect(c.Smoothness).toBeDefined();
    expect(c.Smoothness.min).toBe(0);
  });

  it("Positions3D has a Frequency >= 0 constraint", () => {
    const c = FIELD_CONSTRAINTS["Positions3D"];
    expect(c).toBeDefined();
    expect(c.Frequency.min).toBe(0);
  });

  it("GradientWarp has a WarpScale >= 0 constraint", () => {
    const c = FIELD_CONSTRAINTS["GradientWarp"];
    expect(c).toBeDefined();
    expect(c.WarpScale.min).toBe(0);
  });

  it("CellWallDistance has a Frequency >= 0 constraint", () => {
    const c = FIELD_CONSTRAINTS["CellWallDistance"];
    expect(c).toBeDefined();
    expect(c.Frequency.min).toBe(0);
  });

});

/* ══════════════════════════════════════════════════════════════════════════
 * 7. Field descriptions — types with fields have documentation
 * ══════════════════════════════════════════════════════════════════════════ */

describe("Extended node types — field descriptions", () => {
  const typesWithFields = [
    "SmoothCeiling", "Gradient", "XOverride", "ZOverride", "SwitchState",
    "Positions3D", "PositionsPinch", "PositionsTwist", "GradientWarp",
    "CellWallDistance",
  ];

  it.each(typesWithFields)("density '%s' has field descriptions", (type) => {
    expect(FIELD_DESCRIPTIONS[type]).toBeDefined();
    expect(Object.keys(FIELD_DESCRIPTIONS[type]).length).toBeGreaterThan(0);
  });

  it("Gradient has Axis and SampleRange descriptions", () => {
    expect(FIELD_DESCRIPTIONS["Gradient"].Axis).toBeDefined();
    expect(FIELD_DESCRIPTIONS["Gradient"].SampleRange).toBeDefined();
  });

});

/* ══════════════════════════════════════════════════════════════════════════
 * 8. Node tips — density types have tips
 * ══════════════════════════════════════════════════════════════════════════ */

describe("Extended node types — node tips", () => {
  const densityTypesWithTips = [
    "SmoothCeiling", "Gradient", "Amplitude", "XOverride", "ZOverride",
    "YSampled", "SwitchState", "Positions3D", "PositionsPinch", "PositionsTwist",
    "GradientWarp", "VectorWarp",
    "Terrain", "CellWallDistance", "DistanceToBiomeEdge", "Pipeline",
  ];

  it.each(densityTypesWithTips)("density '%s' has a NODE_TIPS entry", (type) => {
    expect(NODE_TIPS[type]).toBeDefined();
    expect(NODE_TIPS[type].length).toBeGreaterThan(0);
    expect(NODE_TIPS[type][0].message).toBeTruthy();
    expect(NODE_TIPS[type][0].severity).toMatch(/^(info|warning)$/);
  });

  it("context-dependent types have warning severity", () => {
    const contextTypes = ["Terrain", "DistanceToBiomeEdge", "Pipeline"];
    for (const type of contextTypes) {
      expect(NODE_TIPS[type][0].severity).toBe("warning");
    }
  });

  it("non-context types have info severity", () => {
    const infoTypes = ["SmoothCeiling", "Gradient", "Amplitude", "GradientWarp"];
    for (const type of infoTypes) {
      expect(NODE_TIPS[type][0].severity).toBe("info");
    }
  });
});
