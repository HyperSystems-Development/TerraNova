import { describe, it, expect } from "vitest";
import {
  getNodeDefaults,
  getNodeConstraints,
  getNodeHandles,
  getNodeFields,
  isRegisteredNodeType,
  getAllNodeTypes,
} from "../schemaLoader";

describe("getNodeDefaults", () => {
  it("returns defaults for SimplexNoise2D", () => {
    const defaults = getNodeDefaults("SimplexNoise2D");
    expect(defaults).toEqual({
      Lacunarity: 1,
      Persistence: 1,
      Scale: 1,
      Octaves: 1,
      Seed: "A",
    });
  });

  it("returns defaults for Pow", () => {
    const defaults = getNodeDefaults("Pow");
    expect(defaults).toEqual({ Exponent: 1 });
  });

  it("returns defaults for Curve:DistanceS (category-prefixed key)", () => {
    const defaults = getNodeDefaults("Curve:DistanceS");
    expect(defaults).toEqual({
      ExponentA: 1,
      ExponentB: 1,
      Range: 1,
      Transition: 1,
      TransitionSmooth: 1,
    });
  });

  it("returns empty object for unknown type", () => {
    expect(getNodeDefaults("NonExistentNode")).toEqual({});
  });
});

describe("getNodeConstraints", () => {
  it("returns required constraint for Curve:Manual Points field", () => {
    const constraints = getNodeConstraints("Curve:Manual");
    expect(constraints.Points).toBeDefined();
    expect(constraints.Points.required).toBe(true);
  });

  it("returns empty object for node with no constrained fields", () => {
    // Mix has no fields at all
    const constraints = getNodeConstraints("Mix");
    expect(constraints).toEqual({});
  });

  it("returns empty object for unknown type", () => {
    expect(getNodeConstraints("NonExistentNode")).toEqual({});
  });
});

describe("getNodeHandles", () => {
  it("returns 0 inputs and 1 output for SimplexNoise2D", () => {
    const handles = getNodeHandles("SimplexNoise2D");
    expect(handles.inputs).toHaveLength(0);
    expect(handles.outputs).toHaveLength(1);
    expect(handles.outputs[0]).toEqual({
      id: "output",
      handleType: "Density",
      label: "output",
    });
  });

  it("returns 3 inputs and 1 output for Mix", () => {
    const handles = getNodeHandles("Mix");
    expect(handles.inputs).toHaveLength(3);
    expect(handles.outputs).toHaveLength(1);
    const inputIds = handles.inputs.map((h) => h.id);
    expect(inputIds).toEqual(["a", "b", "factor"]);
  });

  it("returns empty arrays for unknown type", () => {
    const handles = getNodeHandles("NonExistentNode");
    expect(handles.inputs).toEqual([]);
    expect(handles.outputs).toEqual([]);
  });
});

describe("getNodeFields", () => {
  it("returns fields in schema order for SimplexNoise2D", () => {
    const fields = getNodeFields("SimplexNoise2D");
    expect(fields).toHaveLength(5);

    const names = fields.map((f) => f.name);
    expect(names).toEqual(["Lacunarity", "Persistence", "Scale", "Octaves", "Seed"]);

    // Check a specific field's shape
    const scaleField = fields.find((f) => f.name === "Scale")!;
    expect(scaleField.type).toBe("number");
    expect(scaleField.default).toBe(1);
    expect(scaleField.required).toBe(false);
  });

  it("returns empty array for node with no fields", () => {
    expect(getNodeFields("Abs")).toEqual([]);
  });

  it("returns empty array for unknown type", () => {
    expect(getNodeFields("NonExistentNode")).toEqual([]);
  });
});

describe("isRegisteredNodeType", () => {
  it("returns true for SimplexNoise2D", () => {
    expect(isRegisteredNodeType("SimplexNoise2D")).toBe(true);
  });

  it("returns true for category-prefixed key like Curve:DistanceS", () => {
    expect(isRegisteredNodeType("Curve:DistanceS")).toBe(true);
  });

  it("returns false for AnchorType (sub-type)", () => {
    expect(isRegisteredNodeType("AnchorType")).toBe(false);
  });

  it("returns false for unknown type", () => {
    expect(isRegisteredNodeType("NonExistentNode")).toBe(false);
  });
});

describe("getAllNodeTypes", () => {
  it("returns a non-empty array", () => {
    const types = getAllNodeTypes();
    expect(types.length).toBeGreaterThan(0);
  });

  it("does not include sub-types", () => {
    const types = getAllNodeTypes();
    expect(types).not.toContain("AnchorType");
    expect(types).not.toContain("CellType");
    expect(types).not.toContain("NoiseType");
  });

  it("includes known registered types", () => {
    const types = getAllNodeTypes();
    expect(types).toContain("SimplexNoise2D");
    expect(types).toContain("Mix");
    expect(types).toContain("Curve:DistanceS");
  });
});
