import { describe, it, expect } from "vitest";
import { squirrelHash, squirrelMix2, squirrelMix3, squirrelFloat } from "../prng";

describe("V2 Rng: squirrel noise hash", () => {
  it("is deterministic for same seed+key", () => {
    expect(squirrelHash(42, 100)).toBe(squirrelHash(42, 100));
  });

  it("different keys produce different values", () => {
    expect(squirrelHash(42, 0)).not.toBe(squirrelHash(42, 1));
  });

  it("different seeds produce different values", () => {
    expect(squirrelHash(42, 100)).not.toBe(squirrelHash(99, 100));
  });

  it("squirrelFloat returns value in [0, 1)", () => {
    for (let i = 0; i < 100; i++) {
      const v = squirrelFloat(42, i);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("mix2 combines two coordinates deterministically", () => {
    const v = squirrelMix2(42, 10, 20);
    expect(typeof v).toBe("number");
    expect(v).toBe(squirrelMix2(42, 10, 20));
    expect(v).not.toBe(squirrelMix2(42, 20, 10)); // order matters
  });

  it("mix3 combines three coordinates deterministically", () => {
    const v = squirrelMix3(42, 10, 20, 30);
    expect(typeof v).toBe("number");
    expect(v).toBe(squirrelMix3(42, 10, 20, 30));
  });
});
