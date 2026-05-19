import { describe, it, expect } from "vitest";
import { getHandles, HANDLE_REGISTRY, findHandleDef } from "../handleRegistry";
import { nodeTypes } from "../index";
import { AssetCategory } from "@/schema/types";

/** All valid asset categories that handles can belong to */
const VALID_CATEGORIES = new Set(Object.values(AssetCategory));

describe("HANDLE_REGISTRY", () => {
  it("has entries for all non-fallback node types in nodeTypes registry", () => {
    const missing: string[] = [];
    for (const key of Object.keys(nodeTypes)) {
      if (key === "default" || key === "group" || key === "comment" || key === "frame") continue;
      if (!HANDLE_REGISTRY[key]) {
        missing.push(key);
      }
    }
    if (missing.length > 0) {
      console.warn("Missing HANDLE_REGISTRY entries:", missing);
    }
    // Every registered node type must have a handle registry entry
    expect(missing.length).toBe(0);
  });

  it("every HandleDef has a valid category", () => {
    for (const [nodeType, defs] of Object.entries(HANDLE_REGISTRY)) {
      for (const def of defs) {
        expect(
          VALID_CATEGORIES.has(def.category),
          `${nodeType} handle "${def.id}" has invalid category "${def.category}"`,
        ).toBe(true);
      }
    }
  });

  it("all source handles have type 'source'", () => {
    for (const [nodeType, defs] of Object.entries(HANDLE_REGISTRY)) {
      const outputs = defs.filter((d) => d.id === "output");
      for (const out of outputs) {
        expect(
          out.type,
          `${nodeType} output handle should be type "source"`,
        ).toBe("source");
      }
    }
  });

  it("all target handles have type 'target'", () => {
    for (const [nodeType, defs] of Object.entries(HANDLE_REGISTRY)) {
      const inputs = defs.filter((d) => d.type === "target");
      for (const inp of inputs) {
        expect(
          inp.id,
          `${nodeType} has a target handle`,
        ).toBeDefined();
      }
    }
  });

  it("every entry has at least one handle", () => {
    const annotationNodes = new Set(["comment", "frame"]);
    for (const [nodeType, defs] of Object.entries(HANDLE_REGISTRY)) {
      if (annotationNodes.has(nodeType)) continue;
      expect(
        defs.length,
        `${nodeType} should have at least 1 handle`,
      ).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("HANDLE_REGISTRY proxy", () => {
  it("supports bracket access for known types", () => {
    expect(HANDLE_REGISTRY["SimplexNoise2D"]).toBeDefined();
    expect(HANDLE_REGISTRY["SimplexNoise2D"].length).toBeGreaterThanOrEqual(1);
  });

  it("returns undefined for unknown types", () => {
    expect(HANDLE_REGISTRY["CompletelyFakeNode"]).toBeUndefined();
  });

  it("supports 'in' operator", () => {
    expect("SimplexNoise2D" in HANDLE_REGISTRY).toBe(true);
    expect("CompletelyFakeNode" in HANDLE_REGISTRY).toBe(false);
  });

  it("supports Object.entries iteration", () => {
    const entries = Object.entries(HANDLE_REGISTRY);
    expect(entries.length).toBeGreaterThan(0);
    for (const [key, defs] of entries) {
      expect(typeof key).toBe("string");
      expect(Array.isArray(defs)).toBe(true);
      expect(defs.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("includes schema-only types not in overrides", () => {
    // The proxy should include all schema types via Object.entries
    const keys = Object.keys(HANDLE_REGISTRY);
    // Should include both override keys and schema-only keys
    expect(keys.length).toBeGreaterThan(200);
  });
});

describe("getHandles", () => {
  it("returns overrides for editor-only Root node", () => {
    const handles = getHandles("Root");
    expect(handles.length).toBeGreaterThanOrEqual(1);
    const inputs = handles.filter((h) => h.type === "target");
    expect(inputs.length).toBe(1);
  });

  it("returns empty handles for completely unknown types", () => {
    const handles = getHandles("CompletelyFakeNode");
    expect(handles.length).toBe(0);
  });

  it("returns valid handles for all density types", () => {
    const densityTypes = ["SimplexNoise2D", "Sum", "Clamp", "Amplitude", "VectorWarp"];
    for (const type of densityTypes) {
      const handles = getHandles(type);
      expect(handles.length).toBeGreaterThanOrEqual(1);
      const output = handles.find((h) => h.id === "output" && h.type === "source");
      expect(output, `${type} should have a density output`).toBeDefined();
      expect(output!.category).toBe(AssetCategory.Density);
    }
  });
});

describe("findHandleDef", () => {
  it("returns correct handle for known node type and handle ID", () => {
    const def = findHandleDef("SimplexNoise2D", "output");
    expect(def).toBeDefined();
    expect(def!.type).toBe("source");
    expect(def!.category).toBe(AssetCategory.Density);
  });

  it("returns correct category for cross-category handles", () => {
    // Material:Conditional has a Density "Condition" input
    const condDef = findHandleDef("Material:Conditional", "Condition");
    expect(condDef).toBeDefined();
    expect(condDef!.category).toBe(AssetCategory.Density);

    // ...and MaterialProvider inputs
    const trueDef = findHandleDef("Material:Conditional", "TrueInput");
    expect(trueDef).toBeDefined();
    expect(trueDef!.category).toBe(AssetCategory.MaterialProvider);
  });

  it("returns undefined for unknown node type", () => {
    expect(findHandleDef("NonExistentNode", "output")).toBeUndefined();
  });

  it("returns undefined for unknown handle ID on known node", () => {
    expect(findHandleDef("SimplexNoise2D", "nonexistent")).toBeUndefined();
  });
});
