import { describe, it, expect } from "vitest";
import { HYTALE_MATERIAL_IDS } from "../materialResolver";

describe("HYTALE_MATERIAL_IDS", () => {
  it("is a non-empty sorted array", () => {
    expect(HYTALE_MATERIAL_IDS.length).toBeGreaterThan(0);
    const copy = [...HYTALE_MATERIAL_IDS];
    expect(copy).toEqual([...HYTALE_MATERIAL_IDS].sort());
  });

  it("includes common Hytale block identifiers", () => {
    expect(HYTALE_MATERIAL_IDS).toContain("Stone");
    expect(HYTALE_MATERIAL_IDS).toContain("Dirt");
    expect(HYTALE_MATERIAL_IDS).toContain("Soil_Grass");
    expect(HYTALE_MATERIAL_IDS).toContain("Rock_Basalt");
    expect(HYTALE_MATERIAL_IDS).toContain("Ore_Iron_Stone");
  });

  it("contains only non-empty strings", () => {
    for (const id of HYTALE_MATERIAL_IDS) {
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicates", () => {
    const set = new Set(HYTALE_MATERIAL_IDS);
    expect(set.size).toBe(HYTALE_MATERIAL_IDS.length);
  });
});
