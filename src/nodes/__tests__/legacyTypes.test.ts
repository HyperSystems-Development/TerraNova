import { describe, it, expect } from "vitest";
import { isLegacyTypeKey } from "../shared/legacyTypes";

describe("legacy type corrections", () => {
  it("Environment:Imported is not legacy (active V2 type)", () => {
    expect(isLegacyTypeKey("Environment:Imported")).toBe(false);
  });

  it("Tint:Imported is not legacy (active V2 type)", () => {
    expect(isLegacyTypeKey("Tint:Imported")).toBe(false);
  });

  it("Environment:Exported is still legacy", () => {
    expect(isLegacyTypeKey("Environment:Exported")).toBe(true);
  });

  it("Tint:Exported is still legacy", () => {
    expect(isLegacyTypeKey("Tint:Exported")).toBe(true);
  });

  it("deprecated scanner types are marked legacy", () => {
    expect(isLegacyTypeKey("Scanner:ColumnLinear")).toBe(true);
    expect(isLegacyTypeKey("Scanner:ColumnRandom")).toBe(true);
    expect(isLegacyTypeKey("Scanner:Area")).toBe(true);
    expect(isLegacyTypeKey("Scanner:Origin")).toBe(true);
  });

  it("deprecated position types are marked legacy", () => {
    expect(isLegacyTypeKey("Position:Mesh2D")).toBe(true);
    expect(isLegacyTypeKey("Position:Mesh3D")).toBe(true);
  });

  it("deprecated prop types are marked legacy", () => {
    expect(isLegacyTypeKey("Prop:Box")).toBe(true);
    expect(isLegacyTypeKey("Prop:Column")).toBe(true);
    expect(isLegacyTypeKey("Prop:Cluster")).toBe(true);
  });
});
