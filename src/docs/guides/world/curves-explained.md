# Curves Explained

**Difficulty:** Intermediate

Curves are a separate asset type in WorldGen V2. They are not density nodes — they are **remapping functions** that describe how one number maps to another. Several density nodes require a curve input (notably `CurveMapper`, `Ellipsoid`, and `Plane`), and getting the curve right is the difference between sharp cliffs and soft hills, crisp island edges and fuzzy blobs.

This guide explains every curve type, what it produces visually, and when to reach for each one.

---

## What a curve actually does

A curve takes an input number `x` and returns an output number `y = f(x)`.

That's it. The input is usually a density value or a distance. The output replaces that value, reshaping it before it continues down the graph.

```
density → [Curve] → reshaped density
```

**Why this matters:** The raw output of a noise node or an SDF is a continuous gradient. A curve lets you decide the exact *shape* of that gradient — whether it ramps linearly, snaps hard, eases in gently, or plateaus at the edges. This controls whether terrain features look carved or melted, whether island edges are cliffs or beaches, whether cave entrances are wide or tight.

Here is the simplest possible mental model:

```curve
Identity remap - input and output match
[[0,0],[0.25,0.25],[0.5,0.5],[0.75,0.75],[1,1]]
```

```curve
Cliff-like remap - low values stay low, high values rise fast
[[0,0],[0.2,0.03],[0.45,0.16],[0.65,0.48],[0.82,0.88],[1,1]]
```

Both curves can receive the same input. The only thing that changes is how aggressively the middle values are reshaped.

### How to read the previews in this guide

- The horizontal axis is the value going **into** the curve.
- The vertical axis is the value coming **out** of the curve.
- A diagonal line means "almost no remap."
- A flat stretch means "hold this output for a while."
- A sharp bend means "most of the change happens in a narrow band."

---

## The curve types

### `Manual` — full custom control

Define as many `{ X, Y }` control points as you need. The curve is interpolated between them.

**Fields:** `Points` — array of `{ X: number, Y: number }`

```json
{
  "Type": "Manual",
  "Points": [
    { "X": -1.0, "Y": -1.0 },
    { "X":  0.0, "Y":  0.5 },
    { "X":  1.0, "Y":  1.0 }
  ]
}
```

**Use when:** You need a specific non-standard shape — a plateau that flattens at mid-range, a sawtooth, a bump, or any bespoke remapping. Also the most useful for creating stripes or bands: a Manual curve with alternating Y values at regular X intervals tiles the density field into repeating bands.

**Common patterns:**

| Points | Effect |
|--------|--------|
| `[{0,0},{1,1}]` | Identity — no change |
| `[{0,1},{1,0}]` | Invert |
| `[{0,0},{0.5,1},{1,0}]` | Bell / hill — peaks in the middle |
| `[{-1,-1},{0,-1},{0,1},{1,1}]` | Step function — hard threshold at 0 |
| `[{0,0},{0.5,0},{0.5,1},{1,1}]` | Hard step at 0.5 |

```curve
Manual - gentle hill profile
[[0,0],[0.18,0.04],[0.38,0.22],[0.56,0.58],[0.78,0.9],[1,1]]
```

```curve
Manual - hard terrace step
[[0,0],[0.34,0],[0.35,0.45],[0.68,0.45],[0.69,1],[1,1]]
```

**What to look for while editing:**

- Wide smooth bends produce natural-looking slopes.
- Flat shelves create plateaus and terraces.
- Tight vertical jumps create cliffs, bands, and masks.
- If a manual curve feels unpredictable, reduce it to 3-5 points first, then add detail only where needed.

---

### `DistanceExponential` — soft falloff from a surface

Produces a curve shaped by exponential decay. Near the origin (distance = 0) the value is high; it falls off as distance increases. The rate of falloff is set by `ExponentA`.

**Fields:**
- `Range` — the distance over which the falloff spans
- `ExponentA` — how steep the falloff is (higher = sharper drop)

```json
{
  "Type": "DistanceExponential",
  "Range": 100.0,
  "ExponentA": 2.0
}
```

**Visual shape:**

| ExponentA | Curve shape |
|-----------|-------------|
| 0.5       | Very gentle, almost linear |
| 1.0       | Steady exponential decay |
| 2.0       | Quick drop early, long gentle tail |
| 4.0+      | Sharp cliff near the surface, nearly flat beyond |

**Use when:** You want an island or shape to have a crisp solid core that fades to air. The higher the exponent, the more cliff-like the edge. Works naturally with `Ellipsoid` for planets or islands where you want a solid interior and a clean surface boundary.

```curve
DistanceExponential - ExponentA 1.0
[[0,1],[0.2,0.8],[0.4,0.6],[0.6,0.4],[0.8,0.2],[1,0]]
```

```curve
DistanceExponential - ExponentA 2.5
[[0,1],[0.15,0.96],[0.3,0.86],[0.5,0.62],[0.72,0.25],[1,0]]
```

**What changing the parameters does:**

- Increase `Range` when the whole transition should take more world space.
- Increase `ExponentA` when you want a firmer edge and a stronger "solid core."
- Lower `ExponentA` when the feature should melt outward gradually instead of feeling carved.

> [!TIP]
> `ExponentA = 2` (squared distance) is the most natural-feeling falloff for most shapes. It matches how real illumination and force fields fall off — so it reads as physically plausible to the eye.

---

### `DistanceS` — S-shaped transition

A sigmoid-style curve. Instead of just falling off from a point, it has a controlled transition zone with a smooth mid-section. More parameters than `DistanceExponential` but more control over the transition region.

**Fields:**
- `Range` — total span of the curve
- `Transition` — where the mid-point of the S sits within Range
- `TransitionSmooth` — how wide the smooth middle zone is
- `ExponentA`, `ExponentB` — shape of each half of the S

```json
{
  "Type": "DistanceS",
  "Range": 1.0,
  "Transition": 0.5,
  "TransitionSmooth": 0.2,
  "ExponentA": 2.0,
  "ExponentB": 2.0
}
```

**Use when:** You want terrain that transitions smoothly between two states — neither an abrupt wall nor an endless ramp. Perfect for shoreline beaches (solid underwater, gradual slope, dry land), biome transitions, or cave mouth openings.

Compared to `DistanceExponential`:
- `DistanceExponential` → starts solid, falls off to nothing
- `DistanceS` → transitions between two levels with a controllable mid-zone

```curve
DistanceS - broad, beach-like transition
[[0,1],[0.18,0.97],[0.36,0.82],[0.5,0.52],[0.64,0.2],[0.82,0.04],[1,0]]
```

```curve
DistanceS - tighter, cliff-to-shelf transition
[[0,1],[0.28,0.98],[0.42,0.88],[0.5,0.5],[0.58,0.16],[0.72,0.03],[1,0]]
```

**Parameter intuition:**

- `Transition` moves the center of the shape.
- `TransitionSmooth` controls how wide the soft middle region is.
- `ExponentA` shapes the "inside" half.
- `ExponentB` shapes the "outside" half.

That makes `DistanceS` the better choice when one side of the terrain should feel gentle and the other should feel abrupt.

---

### `Clamp` and `SmoothClamp` — hard and soft range limits

`Clamp` clips the output to `[WallB, WallA]`. Any value below `WallB` becomes `WallB`; any value above `WallA` becomes `WallA`. The transition at the boundary is instant — a hard step.

`SmoothClamp` does the same but eases into the limits instead of cutting sharply.

**Fields:**
- `WallA` — upper limit (default 1.0)
- `WallB` — lower limit (default -1.0)
- `Curve` — the input curve to clamp (port or field)

**Use when:**
- `Clamp`: you need a hard guarantee that output never exceeds a range. Useful before feeding density into a Mix node that expects [0, 1].
- `SmoothClamp`: similar guarantee but you want the transition to feel organic rather than geometric. Good for capping overhang density so it never creates inverted terrain.

> [!NOTE]
> `WallA` is the **upper** boundary and `WallB` is the **lower** boundary. The naming is counterintuitive — just remember: A is the ceiling, B is the floor.

```curve
Clamp - hard cap between 0.2 and 0.8
[[0,0.2],[0.2,0.2],[0.5,0.5],[0.8,0.8],[1,0.8]]
```

```curve
SmoothClamp - same range, softer approach to the limits
[[0,0.2],[0.18,0.22],[0.34,0.34],[0.5,0.5],[0.66,0.66],[0.82,0.78],[1,0.8]]
```

---

### `Floor` and `SmoothFloor` — minimum value only

Exactly like Clamp/SmoothClamp but only enforces a lower bound. Values above `WallB` pass through unchanged; values below `WallB` are raised to `WallB`.

**Use when:** You want to prevent density from going too negative (which would make caves connect to open air unexpectedly), or to ensure a surface always has some minimum density thickness so thin formations don't disappear.

```curve
Floor - lower bound only
[[0,0.3],[0.3,0.3],[0.6,0.6],[1,1]]
```

---

### `Ceiling` and `SmoothCeiling` — maximum value only

The reverse: only enforces an upper bound. Values below `WallA` pass through unchanged.

**Use when:** You want to prevent the terrain from ever going above a certain density — for example capping hill height so mountains never pierce a certain altitude, or ensuring a biome layer never dominates the blend completely.

```curve
Ceiling - upper bound only
[[0,0],[0.4,0.4],[0.7,0.7],[1,0.7]]
```

---

### `Inverter` — flip the curve

Outputs `1 - input`. Turns a peak into a valley, a high-density center into a low-density one.

**Fields:** none — no configuration needed.

**Use when:** You have a curve that produces the right shape but you need its opposite. A `DistanceExponential` that fades from solid to air can be inverted to fade from air to solid — useful for carving hollow shapes out of filled terrain (a solid sphere → a hollow dome).

```curve
Inverter - high becomes low
[[0,1],[0.25,0.75],[0.5,0.5],[0.75,0.25],[1,0]]
```

---

### `Sum`, `Min`, `Max`, `Multiplier` — combining curves

These work identically to their density-node counterparts but operate on curve values:

| Node | Math | Use |
|------|------|-----|
| `Sum` | A + B | Offset a curve by a constant |
| `Min` | min(A, B) | Take the lower of two curves at each point |
| `Max` | max(A, B) | Take the higher of two curves |
| `Multiplier` | A × B | Scale a curve's output |

Combining curves lets you build composite remapping functions before they are applied to density — for example, a `DistanceExponential` added to a small `Manual` bump curve produces a falloff shape with a subtle ridge at a specific distance.

```curve
Combined shape - soft falloff with a raised shoulder
[[0,1],[0.16,0.95],[0.32,0.8],[0.5,0.62],[0.62,0.66],[0.76,0.32],[1,0]]
```

This is the main reason curves are powerful: you are not choosing from one baked shape, you are building a profile.

---

## Curves vs density nodes — what's the difference?

| | Density node | Curve |
|---|---|---|
| Operates in | 3D world space | 1D value space |
| Input | World coordinates (x, y, z) | A single number |
| Output | A density value | A remapped number |
| Connected to | Other density nodes via ports | Density nodes that take a `Curve` port |
| Evaluated | Once per voxel | Once per input value |

A curve doesn't know or care about position. It just remaps numbers. The density node decides *which* number to pass in (a distance, a noise value, a density gradient) and applies the curve's remapping to it.

---

## Which curve to use — decision guide

**You want a shape with a crisp solid interior and a clean edge:**
→ `DistanceExponential` with `ExponentA 2–4` on the `Ellipsoid` or `Plane` curve port

**You want a gradual beach/shoreline transition:**
→ `DistanceS` with `Transition` set near the surface distance and a moderate `TransitionSmooth`

**You want fully custom: stripes, plateaus, steps:**
→ `Manual` with explicit control points

**You want to prevent extreme values from breaking blends:**
→ `Clamp` or `SmoothClamp` wrapping the relevant source curve

**You need the inverse of a curve you already have:**
→ `Inverter` wrapping that curve

**You want the higher/lower of two shapes (like `Max`/`Min` for density):**
→ `Max` or `Min` curve, feeding two source curves into it

If you are still unsure, use this beginner rule:

- Start with `Manual` when you care about art direction.
- Start with `DistanceExponential` when you care about falloff.
- Start with `DistanceS` when you care about a transition zone.
- Add `Clamp` only after the main shape already feels right.

---

## Practical example — island with a beach

A floating island needs:
1. A solid core (dense center)
2. A smooth cliff edge (fast falloff from solid to air)
3. A gentle beach slope at water level (slow transition near Y=0)

The `Ellipsoid` density node handles the 3D shape. Its required `Curve` input controls how density falls off from the ellipsoid surface outward.

```json
{
  "Type": "Ellipsoid",
  "Scale": [200, 60, 200],
  "Curve": {
    "Type": "DistanceExponential",
    "Range": 50.0,
    "ExponentA": 3.0
  }
}
```

`Range 50` means the transition from solid to air spans 50 world units around the ellipsoid surface. `ExponentA 3` makes it drop off quickly close to the surface, creating a craggy cliff feel rather than a gradual slope.

```curve
Island cliff falloff - sharp edge, dense center
[[0,1],[0.16,0.97],[0.32,0.86],[0.5,0.62],[0.72,0.22],[1,0]]
```

To soften that into a beach:

```json
{
  "Type": "DistanceS",
  "Range": 60.0,
  "Transition": 20.0,
  "TransitionSmooth": 15.0,
  "ExponentA": 1.5,
  "ExponentB": 3.0
}
```

The low `ExponentA` on the inside half creates a gradual slope near the island base; the higher `ExponentB` on the outside creates a steeper drop-off into open air.

```curve
Island beach transition - gentle inner slope, sharper outer drop
[[0,1],[0.18,0.98],[0.36,0.88],[0.5,0.58],[0.64,0.26],[0.82,0.06],[1,0]]
```

In practice:

1. Start with `DistanceExponential` if the island shape still feels undefined.
2. Switch to `DistanceS` only when you know you want two different edge behaviors.
3. Generate after every parameter change. Curves are easy to over-tune when you move three values at once.

---

## Next stop

- Open [Curves Reference](../../reference/curves.md) if you want the full catalog with more preset examples.
- Open [Terrain Types and Node Recipes](../terrain/terrain-types.md) to see these curve ideas used in complete terrain graphs.
