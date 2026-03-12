import { describe, expect, it } from "vitest";
import {
  buildAssetValidationBadge,
  findAssetReferenceCandidates,
} from "../environmentAssetLookup";

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

  it("finds closest candidate asset paths for unknown refs", () => {
    const candidates = findAssetReferenceCandidates(
      "Prop_OakTree",
      "prop",
      {
        prop: {
          "prop_oaktree_large": ["C:\\Pack\\Server\\Prop\\OakTreeLarge.json"],
          "prop_pinetree": ["C:\\Pack\\Server\\Prop\\PineTree.json"],
        },
      },
    );

    expect(candidates[0]).toBe("C:\\Pack\\Server\\Prop\\OakTreeLarge.json");
  });
});
