import { describe, expect, it } from "vitest";
import { buildAssetValidationBadge } from "../environmentAssetLookup";

describe("buildAssetValidationBadge", () => {
  it("reports project assets when validation comes from the pack", () => {
    const badge = buildAssetValidationBadge({
      environment: "project-server",
      tint: "project-server",
    });

    expect(badge.mode).toBe("project-assets");
    expect(badge.label.toLowerCase()).toContain("project assets");
  });

  it("reports workspace fallback when only fallback validation is available", () => {
    const badge = buildAssetValidationBadge({
      environment: "workspace-schema",
    });

    expect(badge.mode).toBe("workspace-fallback");
    expect(badge.label.toLowerCase()).toContain("fallback");
  });

  it("reports mixed validation when project assets and fallback are both used", () => {
    const badge = buildAssetValidationBadge({
      environment: "workspace-schema",
      material: "project-server",
    });

    expect(badge.mode).toBe("mixed");
    expect(badge.detail?.toLowerCase()).toContain("project assets");
  });
});
