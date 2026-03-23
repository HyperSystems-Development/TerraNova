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

  it("scanner types are active V2 (not legacy)", () => {
    expect(isLegacyTypeKey("Scanner:ColumnLinear")).toBe(false);
    expect(isLegacyTypeKey("Scanner:ColumnRandom")).toBe(false);
    expect(isLegacyTypeKey("Scanner:Area")).toBe(false);
    expect(isLegacyTypeKey("Scanner:Origin")).toBe(false);
  });

  it("Position:Mesh2D and Mesh3D are active V2 (not legacy)", () => {
    expect(isLegacyTypeKey("Position:Mesh2D")).toBe(false);
    expect(isLegacyTypeKey("Position:Mesh3D")).toBe(false);
  });

  it("Prop:Box, Column, Cluster are active V2 (not legacy)", () => {
    expect(isLegacyTypeKey("Prop:Box")).toBe(false);
    expect(isLegacyTypeKey("Prop:Column")).toBe(false);
    expect(isLegacyTypeKey("Prop:Cluster")).toBe(false);
  });
});
