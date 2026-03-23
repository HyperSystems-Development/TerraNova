# Curves Reference

Curves **remap** a value. They take an input in some range and produce an output: sharpening a transition, flipping a gradient, clamping noise, or scaling it to a new range. Some sections below are active `Curve:` asset types on this branch, while others are useful manual-curve archetypes you recreate with `Curve:Manual` or a density-side helper like `Pow`.

> **Biome source assets:** `Examples/Example_Curve_Mapper.json`, `Examples/Example_Curve_Remapping.json`, `Basic.json`
>
> The curve usage patterns on this page are grounded in those shipped biome/example assets. Where a preview below is simplified for readability, it is still representing the same kind of remap those assets use.

> **How to read the previews below:** The horizontal axis is the input value. The vertical axis is the output value. A flat line at the top means "always output 1". A diagonal line means "output equals input" (no remapping). The shape of the curve shows you how the remapping behaves.

---

## Manual

Draw any custom remapping you want by placing control points. The curve is Catmull-Rom interpolated between points, so you get smooth transitions even with few points.

**When to use:** Anywhere you need precise artistic control over how a value is shaped (e.g., making terrain density spike near the surface and fall off sharply above and below).

```curve
Manual — identity (no remap)
[[0,0],[0.25,0.25],[0.5,0.5],[0.75,0.75],[1,1]]
```

```curve
Manual — Ease In (slow start, fast end)
[[0,0],[0.25,0.0625],[0.5,0.25],[0.75,0.5625],[1,1]]
```

```curve
Manual — Ease Out (fast start, slow end)
[[0,0],[0.25,0.4375],[0.5,0.75],[0.75,0.9375],[1,1]]
```

```curve
Manual — S-Curve (slow at both ends, fast in middle)
[[0,0],[0.25,0.1],[0.5,0.5],[0.75,0.9],[1,1]]
```

```curve
Manual — Step (hard threshold at 0.5)
[[0,0],[0.49,0],[0.5,1],[1,1]]
```

```curve
Manual — Spike (peak in the middle, zero at edges)
[[0,0],[0.25,0.5],[0.5,1],[0.75,0.5],[1,0]]
```

**Tip:** Use the preset buttons (Linear, Ease In, Ease Out, S-Curve, Step) to start from a known shape, then drag points to refine. Right-click a point to delete it; double-click the canvas to add one.

---

## Constant

Ignores its input entirely and always outputs a fixed value. Useful for injecting a known amount of density, scaling a multiplier to a fixed number, or holding a parameter at a stable level regardless of position.

```curve
Constant — Value: 0.7 (always outputs 0.7)
[[0,0.7],[1,0.7]]
```

**When to use:** As a numeric input to `Sum`, `AmplitudeConstant`, or as a baseline density offset. In Hytale's native format this is often written as a plain `Constant` node with `Value: 100` to define terrain height.

---

## Manual Archetype: Power

There is no dedicated `Curve:Power` node in the active registry on this branch. Use `Curve:Manual` to draw this profile, or use density-side `Pow` when you need exponentiation directly in the graph. The shape still matters because it controls how gradients "lean": pushing values toward 0 (high exponent) or toward 1 (fractional exponent).

```curve
Power — Exponent: 0.5 (square root — bias toward 1)
[[0,0],[0.1,0.316],[0.25,0.5],[0.5,0.707],[0.75,0.866],[1,1]]
```

```curve
Power — Exponent: 1.0 (linear — no change)
[[0,0],[0.25,0.25],[0.5,0.5],[0.75,0.75],[1,1]]
```

```curve
Power — Exponent: 2.0 (quadratic — bias toward 0)
[[0,0],[0.25,0.0625],[0.5,0.25],[0.75,0.5625],[1,1]]
```

```curve
Power — Exponent: 3.0 (cubic — strong bias toward 0)
[[0,0],[0.25,0.016],[0.5,0.125],[0.75,0.422],[1,1]]
```

**When to use:** After cell noise to sharpen island edge falloff. Exponent > 1 makes the falloff steeper (harder islands). Exponent < 1 makes it shallower (softer, more blended islands). Exponent 2 ≈ "Ease In" preset.

---

## Manual Archetype: SmoothStep

There is no dedicated `Curve:SmoothStep` node in the active registry on this branch. Recreate this with `Curve:Manual` when you want a smooth hermite-style transition: below `Edge0` the output is 0, above `Edge1` the output is 1, and between them it follows an S-shaped curve with zero derivative at both ends.

```curve
SmoothStep — Edge0: 0.2, Edge1: 0.8
[[0,0],[0.2,0],[0.35,0.156],[0.5,0.5],[0.65,0.844],[0.8,1],[1,1]]
```

```curve
SmoothStep — Edge0: 0.4, Edge1: 0.6 (narrow, sharp transition)
[[0,0],[0.4,0],[0.45,0.156],[0.5,0.5],[0.55,0.844],[0.6,1],[1,1]]
```

```curve
SmoothStep — Edge0: 0.0, Edge1: 1.0 (full-range S-curve)
[[0,0],[0.25,0.156],[0.5,0.5],[0.75,0.844],[1,1]]
```

**When to use:** Creating smooth material transitions, for example "blend from dirt to grass between height 60 and height 65". The closer `Edge0` and `Edge1` are, the sharper the transition. Setting them equal creates a hard step.

---

## Manual Archetype: Threshold

There is no dedicated `Curve:Threshold` node in the active registry on this branch. Recreate this with `Curve:Manual` when you need a hard binary step: 0 below the threshold, 1 at or above it, with no smooth blending.

```curve
Threshold — 0.3 (everything above 0.3 → 1)
[[0,0],[0.299,0],[0.3,1],[1,1]]
```

```curve
Threshold — 0.7 (only the top 30% → 1)
[[0,0],[0.699,0],[0.7,1],[1,1]]
```

**When to use:** Creating hard masks, for example "this material only appears where density > 0.7". Contrast with `SmoothStep` which feathers the edge. Useful for carving sharp features.

---

## Manual Archetype: StepFunction

There is no dedicated `Curve:StepFunction` node in the active registry on this branch. Recreate this with `Curve:Manual` when you want to quantize the input into discrete flat bands.

```curve
StepFunction — Steps: 2 (two bands)
[[0,0],[0.499,0],[0.5,0.5],[0.999,0.5],[1,1]]
```

```curve
StepFunction — Steps: 4 (four bands)
[[0,0],[0.249,0],[0.25,0.25],[0.499,0.25],[0.5,0.5],[0.749,0.5],[0.75,0.75],[0.999,0.75],[1,1]]
```

**When to use:** Creating terraced terrain (stepped cliffs). Run your heightmap through a `StepFunction` before using it as density to get flat plateau-style terrain like rice paddy terracing.

---

## DistanceExponential

Creates a falloff curve based on a distance range. The input is remapped from `Range.Min` to `Range.Max`. At `Range.Min` the output is 1 (maximum). At `Range.Max` and beyond the output is 0 (zero). The `Exponent` controls how steeply it falls off.

### What Min and Max do

```bounds
{"min": 0.0, "max": 1.0, "label": "DistanceExponential Range: full input range"}
```

The **Min** sets where falloff *starts* (output = 1 here). The **Max** sets where falloff *ends* (output = 0 here). Values outside `[Min, Max]` are clamped.

```curve
DistanceExponential — Exponent: 1.0, Range 0→1 (linear falloff)
[[0,1],[0.25,0.75],[0.5,0.5],[0.75,0.25],[1,0]]
```

```curve
DistanceExponential — Exponent: 2.0, Range 0→1 (quadratic falloff — fast drop)
[[0,1],[0.25,0.9375],[0.5,0.75],[0.75,0.4375],[1,0]]
```

```curve
DistanceExponential — Exponent: 0.5, Range 0→1 (sqrt falloff — slow drop)
[[0,1],[0.25,0.5],[0.5,0.293],[0.75,0.134],[1,0]]
```

**Practical use:** Island density falloff. Use cell noise output (0–1) as the input. `DistanceExponential` then gives you solid island centers that thin toward the edges. Higher `Exponent` = smaller, pointier islands. Lower `Exponent` = flatter, wider islands.

---

## Clamp

Restricts the output to a fixed `[Min, Max]` window. Values below `Min` become `Min`; values above `Max` become `Max`. The region between Min and Max passes through unchanged.

### What Min and Max do

```bounds
{"min": 0.2, "max": 0.8, "label": "Clamp: anything outside this window is cut off"}
```

```curve
Clamp — Min: 0.2, Max: 0.8
[[0,0.2],[0.2,0.2],[0.5,0.5],[0.8,0.8],[1,0.8]]
```

```curve
Clamp — Min: 0.0, Max: 0.5 (cut off upper half)
[[0,0],[0.25,0.25],[0.5,0.5],[0.75,0.5],[1,0.5]]
```

**When to use:** After noise to remove extreme values — e.g., if simplex noise sometimes spikes too high, clamp it to `[0, 0.9]` so it never fully triggers a condition. Also useful for cutting off negative values from an `Inverter` output before it enters a density sum.

---

## Manual Archetype: LinearRemap

There is no dedicated `Curve:LinearRemap` node in the active registry on this branch. Recreate this with `Curve:Manual` when you need a custom remap curve, or use density-side `Normalizer` / explicit scale-plus-offset math when you want a simple linear range conversion.

### What Min and Max do in both ranges

```bounds
{"min": -1.0, "max": 1.0, "label": "SourceRange: what the input currently looks like"}
```

```bounds
{"min": 70.0, "max": 150.0, "label": "TargetRange: what you want the output to look like"}
```

```curve
LinearRemap — Source [-1→1] to Target [70→150]
[[-1,70],[-0.5,90],[0,110],[0.5,130],[1,150]]
```

```curve
LinearRemap — Source [0→1] to Target [-0.5→0.5] (centering)
[[0,-0.5],[0.25,-0.25],[0.5,0],[0.75,0.25],[1,0.5]]
```

**When to use:** Noise returns values in roughly `-1` to `1`. Use `LinearRemap` to convert that to a useful height range like `70` to `150`. This is the equivalent of a `Scale + Offset` operation in one node. In Hytale native format this is done manually with `AmplitudeConstant` (scale) + `Sum` + `Constant` (offset).

---

## Inverter

Negates the input: `output = -input`. Positive values become negative, negative become positive. Zero stays zero.

```curve
Inverter (output = -x, shown as reflected line)
[[0,0],[0.25,-0.25],[0.5,-0.5],[0.75,-0.75],[1,-1]]
```

**When to use:** The core of the terrain height formula. `Sum(Constant(height), Inverter(YValue))` = `height - y`. When `y < height` → positive → solid. When `y > height` → negative → air. Every terrain graph needs this.

---

## Not

Flips the input around 1: `output = 1 - input`. High values become low, low values become high. Keeps the 0–1 range intact.

```curve
Not (output = 1 - x)
[[0,1],[0.25,0.75],[0.5,0.5],[0.75,0.25],[1,0]]
```

**When to use:** Inverting a mask — if you have a "valley mask" you want to turn into a "ridge mask", run it through `Not`. Also useful when `CellNoise` returns high values at cell centers (islands) but you want high values at cell edges (canyons).

---

## DistanceS

A dual-exponential falloff with a cosine-eased blend zone in the middle. Two different exponents (`ExponentA`, `ExponentB`) control the inner and outer falloff rates. `Transition` controls the width of the blend zone between them.

This creates an "S-shaped" falloff with a sharper outer edge than inner — useful for things like cave passages that have a distinct thick core and sharp boundary.

**When to use:** Advanced terrain shaping where you need more control over the exact profile of a falloff than `DistanceExponential` provides. Especially effective for ridge lines and island undersides.

---

## Combining curves

Curves are most powerful when chained. Common patterns:

### Sharpen a noise mask
`SimplexNoise2D` → `Curve:Manual` (power-like inversion profile) → dense peaks, sharp cutoff

### Remap noise to height
`SimplexNoise2D` → `Normalizer` or `Curve:Manual` → height map

### Create a material band
`YValue` → `Normalizer` → `Curve:Manual` (smooth-step-like band) → blended band at a specific elevation

### Create terraced cliffs
Heightmap → `Curve:Manual` (staircase profile) → `Sum` with terrain density → stepped terrain

---

## Curve cheat sheet

| Curve | One-line use |
|---|---|
| **Manual** | Any custom shape |
| **Constant** | Fixed numeric value |
| **Power-like manual curve** | Ease in/out, sharpen falloffs |
| **Smooth-step-like manual curve** | Smooth blend between two levels |
| **Threshold-like manual curve** | Hard on/off mask |
| **Step-function-like manual curve** | Terraced/quantized terrain |
| **DistanceExponential** | Island/feature falloff from center |
| **Clamp** | Cap extremes, cut negatives |
| **Linear-remap-like manual curve** | Rescale from one range to another |
| **Inverter** | Negate (`-x`), core of height formula |
| **Not** | Flip a mask (`1 - x`) |
| **DistanceS** | Complex dual-rate falloff |
