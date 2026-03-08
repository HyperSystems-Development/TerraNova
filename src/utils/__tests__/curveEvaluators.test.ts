import { describe, it, expect } from "vitest";
import {
  normalizePoints,
  toOutputFormat,
  evalConstant,
  evalPower,
  evalStepFunction,
  evalThreshold,
  evalSmoothStep,
  evalDistanceExponential,
  evalDistanceS,
  evalInverter,
  evalNot,
  evalClamp,
  evalLinearRemap,
  getCurveEvaluator,
  catmullRomInterpolate,
  CURVE_PRESETS,
} from "../curveEvaluators";

describe("normalizePoints", () => {
  it("handles [[x,y]] format", () => {
    const pts = normalizePoints([[0, 0], [0.5, 0.75], [1, 1]]);
    expect(pts).toEqual([
      { x: 0, y: 0 },
      { x: 0.5, y: 0.75 },
      { x: 1, y: 1 },
    ]);
  });

  it("handles [{x,y}] format", () => {
    const pts = normalizePoints([{ x: 0.2, y: 0.8 }]);
    expect(pts).toEqual([{ x: 0.2, y: 0.8 }]);
  });

  it("handles empty arrays", () => {
    expect(normalizePoints([])).toEqual([]);
  });
});

describe("toOutputFormat", () => {
  it("sorts by X and rounds to 4dp", () => {
    const pts = [
      { x: 0.5, y: 0.123456 },
      { x: 0.1, y: 0.999999 },
    ];
    const out = toOutputFormat(pts);
    expect(out).toEqual([
      [0.1, 1],
      [0.5, 0.1235],
    ]);
  });
});

describe("evalConstant", () => {
  it("returns the constant for any x", () => {
    const fn = evalConstant(0.5);
    expect(fn(0)).toBe(0.5);
    expect(fn(0.5)).toBe(0.5);
    expect(fn(1)).toBe(0.5);
  });
});

describe("evalPower", () => {
  it("returns x^exponent", () => {
    const fn = evalPower(2);
    expect(fn(0.5)).toBe(0.25);
    expect(fn(0)).toBe(0);
    expect(fn(1)).toBe(1);
  });
});

describe("evalStepFunction", () => {
  it("produces quantized steps", () => {
    const fn = evalStepFunction(4);
    expect(fn(0)).toBe(0);
    expect(fn(0.24)).toBe(0);
    expect(fn(0.25)).toBe(0.25);
    expect(fn(0.49)).toBe(0.25);
    expect(fn(0.5)).toBe(0.5);
  });
});

describe("evalThreshold", () => {
  it("returns 0 below, 1 at/above threshold", () => {
    const fn = evalThreshold(0.5);
    expect(fn(0.49)).toBe(0);
    expect(fn(0.5)).toBe(1);
    expect(fn(1)).toBe(1);
  });
});

describe("evalSmoothStep", () => {
  it("returns 0.5 at midpoint of [0,1]", () => {
    const fn = evalSmoothStep(0, 1);
    expect(fn(0.5)).toBe(0.5);
    expect(fn(0)).toBe(0);
    expect(fn(1)).toBe(1);
  });
});

describe("evalDistanceExponential", () => {
  it("returns 1 - ((x-min)/(max-min))^exp", () => {
    const fn = evalDistanceExponential(2, 0, 1);
    expect(fn(0.5)).toBe(0.75);  // 1 - 0.25
    expect(fn(0)).toBe(1);       // 1 - 0
    expect(fn(1)).toBe(0);       // 1 - 1
  });
});

describe("V2 Curve: DistanceS (dual-exponential with transition)", () => {
  it("returns 1.0 at x=0 (origin of distance)", () => {
    const fn = evalDistanceS(1.0, 1.0, 1.0, 1.0, 1.0);
    expect(fn(0)).toBeCloseTo(1.0);
  });

  it("returns 0.0 at x >= range", () => {
    const fn = evalDistanceS(1.0, 1.0, 1.0, 1.0, 1.0);
    expect(fn(1.0)).toBeCloseTo(0.0);
    expect(fn(2.0)).toBe(0.0);
  });

  it("with exponentA=2, transition=0: follows (1-x/range)^2", () => {
    const fn = evalDistanceS(2.0, 1.0, 0.0, 1.0, 1.0);
    expect(fn(0.0)).toBeCloseTo(1.0);
    expect(fn(0.5)).toBeCloseTo(0.25);
    expect(fn(0.75)).toBeCloseTo(0.0625);
  });

  it("handles negative input via abs", () => {
    const fn = evalDistanceS(1.0, 1.0, 0.0, 1.0, 1.0);
    expect(fn(-0.5)).toBeCloseTo(fn(0.5));
  });

  it("equal exponents with transition=1 still produces smooth output", () => {
    const fn = evalDistanceS(2.0, 2.0, 1.0, 1.0, 1.0);
    expect(fn(0.25)).toBeGreaterThan(0);
    expect(fn(0.25)).toBeLessThan(1);
  });
});

describe("V2 Curve: Inverter (negation)", () => {
  it("returns -x", () => {
    const fn = evalInverter();
    expect(fn(0.7)).toBeCloseTo(-0.7);
    expect(fn(-0.3)).toBeCloseTo(0.3);
    expect(fn(0)).toBeCloseTo(0);
    expect(fn(1)).toBe(-1);
  });
});

describe("V2 Curve: Not (complement)", () => {
  it("returns 1 - x", () => {
    const fn = evalNot();
    expect(fn(0.7)).toBeCloseTo(0.3);
    expect(fn(0)).toBe(1);
    expect(fn(1)).toBe(0);
    expect(fn(-0.5)).toBeCloseTo(1.5);
  });
});

describe("evalClamp", () => {
  it("clamps to [min, max]", () => {
    const fn = evalClamp(0.2, 0.8);
    expect(fn(0)).toBe(0.2);
    expect(fn(0.5)).toBe(0.5);
    expect(fn(1)).toBe(0.8);
  });

  it("passes through values within range", () => {
    const fn = evalClamp(0, 1);
    expect(fn(0.5)).toBe(0.5);
  });
});

describe("evalLinearRemap", () => {
  it("remaps [0,1] → [0,1] as identity", () => {
    const fn = evalLinearRemap(0, 1, 0, 1);
    expect(fn(0)).toBe(0);
    expect(fn(0.5)).toBe(0.5);
    expect(fn(1)).toBe(1);
  });

  it("remaps [0,1] → [0,10]", () => {
    const fn = evalLinearRemap(0, 1, 0, 10);
    expect(fn(0)).toBe(0);
    expect(fn(0.5)).toBe(5);
    expect(fn(1)).toBe(10);
  });

  it("handles degenerate source range", () => {
    const fn = evalLinearRemap(0.5, 0.5, 0, 1);
    expect(fn(0.5)).toBe(0);
  });
});

describe("getCurveEvaluator", () => {
  it("returns evaluator for known types", () => {
    expect(getCurveEvaluator("Constant", { Value: 0.5 })).not.toBeNull();
    expect(getCurveEvaluator("Power", { Exponent: 2 })).not.toBeNull();
    expect(getCurveEvaluator("StepFunction", { Steps: 4 })).not.toBeNull();
    expect(getCurveEvaluator("Threshold", { Threshold: 0.5 })).not.toBeNull();
    expect(getCurveEvaluator("SmoothStep", { Edge0: 0, Edge1: 1 })).not.toBeNull();
  });

  it("returns evaluator for Inverter, Clamp, LinearRemap", () => {
    const inv = getCurveEvaluator("Inverter", {});
    expect(inv).not.toBeNull();
    expect(inv!(0.25)).toBe(-0.25);

    const clamp = getCurveEvaluator("Clamp", { Min: 0.2, Max: 0.8 });
    expect(clamp).not.toBeNull();
    expect(clamp!(0)).toBe(0.2);
    expect(clamp!(1)).toBe(0.8);

    const remap = getCurveEvaluator("LinearRemap", {
      SourceRange: { Min: 0, Max: 1 },
      TargetRange: { Min: 0, Max: 10 },
    });
    expect(remap).not.toBeNull();
    expect(remap!(0.5)).toBe(5);
  });

  it("returns null for non-previewable types", () => {
    expect(getCurveEvaluator("Blend", {})).toBeNull();
    expect(getCurveEvaluator("Multiplier", {})).toBeNull();
    expect(getCurveEvaluator("Sum", {})).toBeNull();
  });
});

describe("catmullRomInterpolate", () => {
  it("returns the input for fewer than 2 points", () => {
    const single = [{ x: 0.5, y: 0.5 }];
    expect(catmullRomInterpolate(single)).toEqual(single);
    expect(catmullRomInterpolate([])).toEqual([]);
  });

  it("produces more points than input", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0.8 },
      { x: 1, y: 1 },
    ];
    const result = catmullRomInterpolate(pts);
    expect(result.length).toBeGreaterThan(pts.length);
  });

  it("passes through the first and last control points", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0.8 },
      { x: 1, y: 1 },
    ];
    const result = catmullRomInterpolate(pts);
    expect(result[0].x).toBeCloseTo(0);
    expect(result[0].y).toBeCloseTo(0);
    expect(result[result.length - 1].x).toBeCloseTo(1);
    expect(result[result.length - 1].y).toBeCloseTo(1);
  });

  it("preserves Y values outside [0,1] without clamping", () => {
    // Points with Y values already outside [0,1] — interpolation should preserve them
    const pts = [
      { x: 0, y: -0.5 },
      { x: 0.5, y: 1.5 },
      { x: 1, y: -0.2 },
    ];
    const result = catmullRomInterpolate(pts);
    // Start and end points should be faithfully reproduced
    expect(result[0].y).toBeCloseTo(-0.5);
    expect(result[result.length - 1].y).toBeCloseTo(-0.2);
    // Some interpolated values should exceed 1 (near the 1.5 peak)
    const hasAboveOne = result.some((p) => p.y > 1);
    expect(hasAboveOne).toBe(true);
    // Some interpolated values should be below 0
    const hasBelowZero = result.some((p) => p.y < 0);
    expect(hasBelowZero).toBe(true);
  });
});

describe("CURVE_PRESETS", () => {
  it("has expected preset names", () => {
    expect(Object.keys(CURVE_PRESETS)).toEqual([
      "Linear",
      "Ease In",
      "Ease Out",
      "S-Curve",
      "Step",
    ]);
  });

  it("Linear preset is identity endpoints", () => {
    const linear = CURVE_PRESETS.Linear;
    expect(linear[0]).toEqual([0, 0]);
    expect(linear[linear.length - 1]).toEqual([1, 1]);
  });
});
