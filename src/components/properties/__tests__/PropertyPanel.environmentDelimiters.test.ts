import { describe, expect, it } from "vitest";
import { validateEnvironmentDelimiters } from "../PropertyPanel";

describe("validateEnvironmentDelimiters", () => {
  it("detects invalid ranges and overlaps", () => {
    const issues = validateEnvironmentDelimiters(
      [
        {
          Range: { MinInclusive: -1, MaxExclusive: 0.4 },
          Environment: { Type: "Constant", Environment: "Env_Zone1_Caves" },
        },
        {
          Range: { MinInclusive: 0.2, MaxExclusive: 0.8 },
          Environment: { Type: "Constant", Environment: "Env_Zone1_Hills" },
        },
        {
          Range: { MinInclusive: 0.9, MaxExclusive: 0.6 },
          Environment: { Type: "Constant", Environment: "Env_Zone1_Peaks" },
        },
      ],
      [
        "Env_Zone1_Caves",
        "Env_Zone1_Hills",
        "Env_Zone1_Peaks",
      ],
    );

    expect(issues.some((issue) => issue.kind === "overlap")).toBe(true);
    expect(issues.some((issue) => issue.kind === "invalid-range" && issue.severity === "error")).toBe(true);
  });

  it("detects gaps and unknown environment references", () => {
    const issues = validateEnvironmentDelimiters(
      [
        {
          Range: { MinInclusive: -1, MaxExclusive: -0.2 },
          Environment: { Type: "Constant", Environment: "Env_Zone1_Caves" },
        },
        {
          Range: { MinInclusive: 0.1, MaxExclusive: 0.8 },
          Environment: { Type: "Constant", Environment: "Env_Unknown" },
        },
      ],
      ["Env_Zone1_Caves", "Env_Zone1_Surface"],
    );

    expect(issues.some((issue) => issue.kind === "gap")).toBe(true);
    expect(issues.some((issue) => issue.kind === "unknown-environment")).toBe(true);
  });

  it("detects missing range bounds", () => {
    const issues = validateEnvironmentDelimiters(
      [
        {
          Range: { MinInclusive: -1 },
          Environment: { Type: "Constant", Environment: "Env_Zone1_Surface" },
        },
      ],
      ["Env_Zone1_Surface"],
    );

    expect(issues.some((issue) => issue.kind === "missing-range")).toBe(true);
  });
});
