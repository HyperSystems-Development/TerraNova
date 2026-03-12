import { describe, expect, it } from "vitest";
import {
  fillDelimiterGaps,
  normalizeDelimiterRanges,
  readDelimiterEnvironmentReference,
  resolveDelimiterEnvironmentDefaults,
} from "../environmentDelimiters";

describe("environmentDelimiters autofix helpers", () => {
  it("normalizes inverted and overlapping delimiter ranges", () => {
    const next = normalizeDelimiterRanges([
      {
        Range: { MinInclusive: 0.6, MaxExclusive: -1 },
        Environment: { Type: "Constant", Environment: "Env_Zone1_Plains" },
      },
      {
        Range: { MinInclusive: -0.2, MaxExclusive: 0.1 },
        Environment: { Type: "Constant", Environment: "Env_Zone1_Caves" },
      },
    ]);

    expect(next[0].Range).toEqual({ MinInclusive: -1, MaxExclusive: 0.6 });
    expect(next[1].Range).toEqual({ MinInclusive: 0.6, MaxExclusive: 0.9 });
  });

  it("fills delimiter coverage gaps by snapping the next min to the previous max", () => {
    const next = fillDelimiterGaps([
      {
        Range: { MinInclusive: -1, MaxExclusive: -0.25 },
        Environment: { Type: "Constant", Environment: "Env_Zone1_Plains" },
      },
      {
        Range: { MinInclusive: 0.2, MaxExclusive: 0.8 },
        Environment: { Type: "Constant", Environment: "Env_Zone1_Caves" },
      },
    ]);

    expect(next[1].Range).toEqual({ MinInclusive: -0.25, MaxExclusive: 0.8 });
  });

  it("resolves delimiter environments to Default", () => {
    const next = resolveDelimiterEnvironmentDefaults([
      {
        Range: { MinInclusive: -1, MaxExclusive: 1 },
        Environment: { Type: "Constant", Environment: "" },
      },
      {
        Range: { MinInclusive: 1, MaxExclusive: 2 },
        Environment: { Type: "Constant", Environment: "Env_Zone1_Caves" },
      },
    ], [0]);

    expect(readDelimiterEnvironmentReference(next[0]).providerType).toBe("Default");
    expect(readDelimiterEnvironmentReference(next[1]).providerType).toBe("Constant");
  });

  it("treats the default sentinel as a Default provider", () => {
    const reference = readDelimiterEnvironmentReference({
      Environment: { Type: "Constant", Environment: "default" },
    });

    expect(reference.providerType).toBe("Default");
    expect(reference.name).toBe("");
  });
});
