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

---

### `Floor` and `SmoothFloor` — minimum value only

Exactly like Clamp/SmoothClamp but only enforces a lower bound. Values above `WallB` pass through unchanged; values below `WallB` are raised to `WallB`.

**Use when:** You want to prevent density from going too negative (which would make caves connect to open air unexpectedly), or to ensure a surface always has some minimum density thickness so thin formations don't disappear.

---

### `Ceiling` and `SmoothCeiling` — maximum value only

The reverse: only enforces an upper bound. Values below `WallA` pass through unchanged.

**Use when:** You want to prevent the terrain from ever going above a certain density — for example capping hill height so mountains never pierce a certain altitude, or ensuring a biome layer never dominates the blend completely.

---

### `Inverter` — flip the curve

Outputs `1 - input`. Turns a peak into a valley, a high-density center into a low-density one.

**Fields:** none — no configuration needed.

**Use when:** You have a curve that produces the right shape but you need its opposite. A `DistanceExponential` that fades from solid to air can be inverted to fade from air to solid — useful for carving hollow shapes out of filled terrain (a solid sphere → a hollow dome).

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
