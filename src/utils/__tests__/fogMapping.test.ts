import { describe, it, expect } from "vitest";
import { mapPreviewFogDistances } from "../fogMapping";

describe("mapPreviewFogDistances", () => {
  it("softens negative near values so fog starts away from the camera", () => {
    const mapped = mapPreviewFogDistances(-96, 1024, 0.12, 24);
    expect(mapped.near).toBeGreaterThan(0);
    expect(mapped.far).toBeGreaterThan(130);
  });

  it("preserves non-negative near values (no artificial offset)", () => {
    const mapped = mapPreviewFogDistances(0, 1024, 0.12, 24);
    expect(mapped.near).toBe(0);
    expect(mapped.far).toBeCloseTo(141.312, 3);
  });

  it("always enforces a minimum fog span", () => {
    const mapped = mapPreviewFogDistances(20, 21, 0.02, 24);
    expect(mapped.far - mapped.near).toBeGreaterThanOrEqual(24);
  });
});
