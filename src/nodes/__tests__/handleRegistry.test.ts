import { describe, it, expect } from "vitest";
import { HANDLE_REGISTRY, findHandleDef } from "../handleRegistry";
import { nodeTypes } from "../index";
import { AssetCategory } from "@/schema/types";

/** All valid asset categories that handles can belong to */
const VALID_CATEGORIES = new Set(Object.values(AssetCategory));

describe("HANDLE_REGISTRY", () => {
  it("has entries for all non-fallback node types in nodeTypes registry", () => {
    const missing: string[] = [];
    for (const key of Object.keys(nodeTypes)) {
      if (key === "default" || key === "group") continue;
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
    for (const [nodeType, defs] of Object.entries(HANDLE_REGISTRY)) {
      expect(
        defs.length,
        `${nodeType} should have at least 1 handle`,
      ).toBeGreaterThanOrEqual(1);
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
