/** Pure utility functions for curve point normalization and computed curve evaluation. */

export interface NormalizedPoint {
  x: number;
  y: number;
}

/** Round to 4 decimal places. */
export function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

/** Convert [[x,y]] or [{x,y}] arrays to normalized {x,y}[] objects. */
export function normalizePoints(raw: unknown[]): NormalizedPoint[] {
  return raw.map((p) => {
    if (Array.isArray(p) && p.length >= 2) {
      return { x: Number(p[0]), y: Number(p[1]) };
    }
    if (p && typeof p === "object" && "x" in p && "y" in p) {
      const obj = p as { x: number; y: number };
      return { x: Number(obj.x), y: Number(obj.y) };
    }
    return { x: 0, y: 0 };
  });
}

/** Sort by X, round to 4dp, output as [[x,y]] for store persistence. */
export function toOutputFormat(points: NormalizedPoint[]): [number, number][] {
  return [...points]
    .sort((a, b) => a.x - b.x)
    .map((p) => [round4(p.x), round4(p.y)]);
}

// ---------------------------------------------------------------------------
// Computed curve evaluators — each returns (x: number) => number
// ---------------------------------------------------------------------------

export function evalConstant(value: number): (x: number) => number {
  return () => value;
}

export function evalPower(exponent: number): (x: number) => number {
  return (x) => Math.pow(x, exponent);
}

export function evalStepFunction(steps: number): (x: number) => number {
  return (x) => (steps <= 0 ? x : Math.floor(x * steps) / steps);
}

export function evalThreshold(threshold: number): (x: number) => number {
  return (x) => (x >= threshold ? 1 : 0);
}

export function evalSmoothStep(edge0: number, edge1: number): (x: number) => number {
  return (x) => {
    if (edge0 === edge1) return x >= edge0 ? 1 : 0;
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  };
}

export function evalDistanceExponential(
  exponent: number,
  rangeMin: number,
  rangeMax: number,
): (x: number) => number {
  return (x) => {
    if (rangeMax === rangeMin) return 0;
    const t = Math.max(0, Math.min(1, (x - rangeMin) / (rangeMax - rangeMin)));
    return 1 - Math.pow(t, exponent);
  };
}

/**
 * V2 DistanceS: dual-exponential tent/bell curve.
 * Formula: exp(-((|x - offset| / width) ^ exponent) * steepness)
 */
export function evalDistanceS(
  steepness: number,
  offset: number,
  width: number,
  exponent: number,
): (x: number) => number {
  return (x) => {
    if (width <= 0) return 0;
    const d = Math.abs(x - offset) / width;
    return Math.exp(-Math.pow(d, exponent) * steepness);
  };
}

/** V2 Inverter: complement (1 - x). */
export function evalInverter(): (x: number) => number {
  return (x) => 1 - x;
}

/** V2 Not: negates the value (-x). */
export function evalNot(): (x: number) => number {
  return (x) => -x;
}

/** Manual curve: linear interpolation between sorted control points. */
export function evalManual(points: NormalizedPoint[]): ((x: number) => number) | null {
  const sorted = [...points].sort((a, b) => a.x - b.x);
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return () => sorted[0].y;
  return (x) => {
    if (x <= sorted[0].x) return sorted[0].y;
    if (x >= sorted[sorted.length - 1].x) return sorted[sorted.length - 1].y;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (x >= sorted[i].x && x <= sorted[i + 1].x) {
        const t = (x - sorted[i].x) / (sorted[i + 1].x - sorted[i].x);
        return sorted[i].y + t * (sorted[i + 1].y - sorted[i].y);
      }
    }
    return sorted[sorted.length - 1].y;
  };
}

export function evalClamp(min: number, max: number): (x: number) => number {
  return (x) => Math.max(min, Math.min(max, x));
}

export function evalLinearRemap(
  srcMin: number,
  srcMax: number,
  tgtMin: number,
  tgtMax: number,
): (x: number) => number {
  return (x) => {
    if (srcMax === srcMin) return tgtMin;
    const t = (x - srcMin) / (srcMax - srcMin);
    return tgtMin + t * (tgtMax - tgtMin);
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Clamp a value to [0, 1]. */
export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

// ---------------------------------------------------------------------------
// Catmull-Rom smooth interpolation
// ---------------------------------------------------------------------------

/**
 * Generate a densely sampled curve via Catmull-Rom spline interpolation.
 * Input points must be sorted by X. Returns `segments` samples per span.
 * Falls back to linear (identity) for < 2 points.
 */
export function catmullRomInterpolate(
  controlPoints: NormalizedPoint[],
  segments = 16,
): NormalizedPoint[] {
  if (controlPoints.length < 2) return [...controlPoints];

  const pts = controlPoints;
  const result: NormalizedPoint[] = [];

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];

    for (let s = 0; s < segments; s++) {
      const t = s / segments;
      const t2 = t * t;
      const t3 = t2 * t;

      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

      result.push({ x, y });
    }
  }

  // Add the final point
  result.push({ ...pts[pts.length - 1] });
  return result;
}

// ---------------------------------------------------------------------------
// Curve presets
// ---------------------------------------------------------------------------

export const CURVE_PRESETS: Record<string, [number, number][]> = {
  Linear: [[0, 0], [1, 1]],
  "Ease In": [[0, 0], [0.25, 0.0625], [0.5, 0.25], [0.75, 0.5625], [1, 1]],
  "Ease Out": [[0, 0], [0.25, 0.4375], [0.5, 0.75], [0.75, 0.9375], [1, 1]],
  "S-Curve": [[0, 0], [0.25, 0.1], [0.5, 0.5], [0.75, 0.9], [1, 1]],
  Step: [[0, 0], [0.49, 0], [0.5, 1], [1, 1]],
};

// ---------------------------------------------------------------------------
// Dispatcher — returns null for types without preview (Blend, Multiplier, etc.)
// ---------------------------------------------------------------------------

export function getCurveEvaluator(
  typeName: string,
  fields: Record<string, unknown>,
): ((x: number) => number) | null {
  switch (typeName) {
    case "Manual": {
      const rawPoints = fields.Points as unknown[] | undefined;
      if (!rawPoints || rawPoints.length === 0) return null;
      return evalManual(normalizePoints(rawPoints));
    }
    case "Constant":
      return evalConstant(Number(fields.Value ?? 1));
    case "Power":
      return evalPower(Number(fields.Exponent ?? 2));
    case "StepFunction":
      return evalStepFunction(Number(fields.Steps ?? 4));
    case "Threshold":
      return evalThreshold(Number(fields.Threshold ?? 0.5));
    case "SmoothStep":
      return evalSmoothStep(Number(fields.Edge0 ?? 0), Number(fields.Edge1 ?? 1));
    case "DistanceExponential": {
      const range = fields.Range as { Min?: number; Max?: number } | undefined;
      return evalDistanceExponential(
        Number(fields.Exponent ?? 2),
        Number(range?.Min ?? 0),
        Number(range?.Max ?? 1),
      );
    }
    case "DistanceS":
      return evalDistanceS(
        Number(fields.Steepness ?? 1),
        Number(fields.Offset ?? 0.5),
        Number(fields.Width ?? 0.5),
        Number(fields.Exponent ?? 2),
      );
    case "Inverter":
      return evalInverter();
    case "Not":
      return evalNot();
    case "Clamp":
      return evalClamp(Number(fields.Min ?? 0), Number(fields.Max ?? 1));
    case "LinearRemap": {
      const src = fields.SourceRange as { Min?: number; Max?: number } | undefined;
      const tgt = fields.TargetRange as { Min?: number; Max?: number } | undefined;
      return evalLinearRemap(
        Number(src?.Min ?? 0),
        Number(src?.Max ?? 1),
        Number(tgt?.Min ?? 0),
        Number(tgt?.Max ?? 1),
      );
    }
    default:
      return null;
  }
}
