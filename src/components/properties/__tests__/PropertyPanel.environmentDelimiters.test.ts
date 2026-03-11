import { describe, expect, it } from "vitest";
import {
  buildDelimiterTypeOptions,
  deriveServerRootFromWorkspacePath,
  extractWorkspaceEnvironmentTypeHints,
  getAdvancedDelimiterTypeDetails,
  validateEnvironmentDelimiters,
} from "../PropertyPanel";

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

  it("does not flag unknown env for Imported refs", () => {
    const issues = validateEnvironmentDelimiters(
      [
        {
          Range: { MinInclusive: -1, MaxExclusive: 1 },
          Environment: { Type: "Imported", Name: "SomeEnvProviderRef" },
        },
      ],
      ["Env_Zone1_Surface"],
    );

    expect(issues.some((issue) => issue.kind === "unknown-environment")).toBe(false);
    expect(issues.some((issue) => issue.kind === "missing-environment")).toBe(false);
  });

  it("flags missing environment for non-default refs", () => {
    const issues = validateEnvironmentDelimiters(
      [
        {
          Range: { MinInclusive: -1, MaxExclusive: 1 },
          Environment: { Type: "Constant", Environment: "" },
        },
        {
          Range: { MinInclusive: 1, MaxExclusive: 2 },
          Environment: { Type: "Default" },
        },
      ],
      ["Env_Zone1_Surface"],
    );

    expect(issues.some((issue) => issue.kind === "missing-environment" && issue.delimiterIndex === 0)).toBe(true);
    expect(issues.some((issue) => issue.kind === "missing-environment" && issue.delimiterIndex === 1)).toBe(false);
  });

  it("warns on unsupported environment provider types", () => {
    const issues = validateEnvironmentDelimiters(
      [
        {
          Range: { MinInclusive: -1, MaxExclusive: 1 },
          Environment: { Type: "Biome", BiomeId: "zone1/plains" },
        },
      ],
      ["Env_Zone1_Surface"],
    );

    expect(issues.some((issue) => issue.kind === "unsupported-environment-type")).toBe(true);
  });

  it("extracts workspace environment type hints", () => {
    const hints = extractWorkspaceEnvironmentTypeHints({
      Variants: {
        "EnvironmentProvider.Variants": {
          Variants: {
            DensityDelimited: "DensityDelimited.EnvironmentProvider",
            Constant: "Constant.EnvironmentProvider",
          },
        },
      },
    });

    expect(hints).toEqual(["Constant", "DensityDelimited"]);
  });

  it("derives Server root from workspace path", () => {
    const serverRoot = deriveServerRootFromWorkspacePath(
      "C:\\Users\\wolft\\AppData\\Roaming\\Hytale\\install\\pre-release\\package\\game\\latest\\Client\\NodeEditor\\Workspaces\\HytaleGenerator Java",
    );
    expect(serverRoot).toBe(
      "C:\\Users\\wolft\\AppData\\Roaming\\Hytale\\install\\pre-release\\package\\game\\latest\\Server",
    );
  });

  it("builds type options from workspace hints with advanced read-only entries", () => {
    const options = buildDelimiterTypeOptions(["Constant", "DensityDelimited", "Imported"]);
    expect(options.map((option) => option.value)).toEqual([
      "Constant",
      "Default",
      "Imported",
      "DensityDelimited",
    ]);

    const advanced = options.find((option) => option.value === "DensityDelimited");
    expect(advanced?.supported).toBe(false);
    expect(advanced?.label).toContain("advanced/read-only");
  });

  it("provides advanced type detail copy for DensityDelimited", () => {
    const details = getAdvancedDelimiterTypeDetails("DensityDelimited");
    expect(details.label).toBe("DensityDelimited");
    expect(details.description.toLowerCase()).toContain("nested density");
    expect(details.guidance.toLowerCase()).toContain("graph");
  });
});
