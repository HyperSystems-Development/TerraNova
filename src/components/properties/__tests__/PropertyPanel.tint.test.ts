import { describe, it, expect } from "vitest";
import { applyBiomeTintBand } from "../PropertyPanel";

function getDelimiterColor(delimiters: Array<Record<string, unknown>>, index: number): string | undefined {
  const tint = delimiters[index]?.Tint as Record<string, unknown> | undefined;
  return typeof tint?.Color === "string" ? tint.Color : undefined;
}

describe("applyBiomeTintBand", () => {
  it("initializes all 3 tint bands when provider is missing", () => {
    const next = applyBiomeTintBand(undefined, 0, "#112233");
    const delimiters = next.Delimiters as Array<Record<string, unknown>>;

    expect(next.Type).toBe("DensityDelimited");
    expect(delimiters.length).toBeGreaterThanOrEqual(3);
    expect(getDelimiterColor(delimiters, 0)).toBe("#112233");
    expect(getDelimiterColor(delimiters, 1)).toBe("#6ca229");
    expect(getDelimiterColor(delimiters, 2)).toBe("#7ea629");
  });

  it("preserves existing provider fields while updating selected band", () => {
    const existing = {
      Type: "DensityDelimited",
      ExportAs: "BiomeTint",
      Delimiters: [
        { Threshold: 0.1, Tint: { Color: "#224422", Saturation: 0.5 } },
      ],
    } satisfies Record<string, unknown>;

    const next = applyBiomeTintBand(existing, 1, "#778899");
    const delimiters = next.Delimiters as Array<Record<string, unknown>>;

    expect(next.ExportAs).toBe("BiomeTint");
    expect(getDelimiterColor(delimiters, 0)).toBe("#224422");
    expect(getDelimiterColor(delimiters, 1)).toBe("#778899");
    expect(getDelimiterColor(delimiters, 2)).toBe("#7ea629");
    expect((delimiters[0].Tint as Record<string, unknown>).Saturation).toBe(0.5);
  });

  it("supports writing bands beyond index 2 while keeping base 3-band gradient", () => {
    const next = applyBiomeTintBand({ Delimiters: [] }, 4, "#abcdef");
    const delimiters = next.Delimiters as Array<Record<string, unknown>>;

    expect(delimiters.length).toBeGreaterThanOrEqual(5);
    expect(getDelimiterColor(delimiters, 0)).toBe("#5b9e28");
    expect(getDelimiterColor(delimiters, 1)).toBe("#6ca229");
    expect(getDelimiterColor(delimiters, 2)).toBe("#7ea629");
    expect(getDelimiterColor(delimiters, 4)).toBe("#abcdef");
  });

  it("writes Range on each new delimiter matching real Hytale -1 to 1 format", () => {
    const next = applyBiomeTintBand(undefined, 0, "#112233");
    const delimiters = next.Delimiters as Array<Record<string, unknown>>;

    expect((delimiters[0].Range as Record<string, unknown>).MinInclusive).toBe(-1);
    expect((delimiters[0].Range as Record<string, unknown>).MaxExclusive).toBe(-0.33);
    expect((delimiters[1].Range as Record<string, unknown>).MinInclusive).toBe(-0.33);
    expect((delimiters[1].Range as Record<string, unknown>).MaxExclusive).toBe(0.33);
    expect((delimiters[2].Range as Record<string, unknown>).MinInclusive).toBe(0.33);
    expect((delimiters[2].Range as Record<string, unknown>).MaxExclusive).toBe(1);
  });

  it("writes Tint.Type: Constant on each delimiter matching real Hytale format", () => {
    const next = applyBiomeTintBand(undefined, 0, "#112233");
    const delimiters = next.Delimiters as Array<Record<string, unknown>>;

    for (let i = 0; i < 3; i++) {
      expect((delimiters[i].Tint as Record<string, unknown>).Type).toBe("Constant");
    }
  });

  it("preserves existing Range when present, adds default Range when missing", () => {
    const existing = {
      Type: "DensityDelimited",
      Delimiters: [
        { Range: { MinInclusive: -1, MaxExclusive: -0.33 }, Tint: { Type: "Constant", Color: "#446A1F" } },
        { Range: { MinInclusive: -0.33, MaxExclusive: 0.33 }, Tint: { Type: "Constant", Color: "#4B7020" } },
      ],
    } satisfies Record<string, unknown>;

    const next = applyBiomeTintBand(existing, 2, "#3E661D");
    const delimiters = next.Delimiters as Array<Record<string, unknown>>;

    // Existing ranges preserved
    expect((delimiters[0].Range as Record<string, unknown>).MinInclusive).toBe(-1);
    expect((delimiters[1].Range as Record<string, unknown>).MinInclusive).toBe(-0.33);
    // Band 2 was missing, gets default range
    expect((delimiters[2].Range as Record<string, unknown>).MinInclusive).toBe(0.33);
    expect((delimiters[2].Range as Record<string, unknown>).MaxExclusive).toBe(1);
  });
});
