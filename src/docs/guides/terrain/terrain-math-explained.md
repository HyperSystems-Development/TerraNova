# Terrain Math Explained

**Difficulty:** Intermediate

This guide explains the actual math behind the nodes -- no prior knowledge required. By the end you will understand *why* certain combinations produce hills, caves, overhangs, and floating islands, and *how* to tune each parameter to get the result you want.

> **Biome source assets:** `Examples/Example_CellNoise2D.json`, `Examples/Example_Curve_Mapper.json`, `Examples/Example_Mixer_Gradient.json`, `Experimental/Arches.json`, `Experimental/Dunes.json`, `Experimental/Mountains.json`, `Experimental/Plateaus.json`, `Generative/Generative_Arches.json`, `Generative/Generative_Pillars_Marble_Large.json`, `Generative/Generative_Veins.json`
>
> The formulas below are compact explanations of patterns seen in those terrain assets and the active editor node set. The skylands section later in this guide is a teaching reconstruction, not a 1:1 copy of one audited biome file.

---

## What is a density function?

Every node in TerraNova ultimately produces a single number at each point in 3D space. That number is called the **density** at that point.

The terrain engine evaluates the final density everywhere in the world and draws a surface at the boundary where density crosses zero:

- **density > 0** → solid ground
- **density < 0** → air
- **density = 0** → the exact surface

This is the core idea everything else builds on. The fancier nodes are just different ways of shaping that number field in space.

---

## Part 1 -- Noise nodes

### SimplexNoise2D

At each world position `(x, z)` this node outputs a smooth random-ish number. The pattern tiles across XZ but is **identical at every Y** -- the same column of terrain repeats upward forever.

**The math:**
```text
output = simplex(x / Scale, z / Scale)
```

Scale is a spatial period — it sets roughly how many blocks one full noise cycle covers. Larger values produce broader, smoother features; smaller values produce finer detail.

The output is in the range **[-1, +1]** (approximately -- Simplex can technically exceed this slightly, but treat it as [-1, 1]).

**What Scale does:**

| Scale | Effect |
|-------|--------|
| 10    | Tiny bumps, ~10-block features |
| 100   | Medium hills, ~100 blocks across |
| 500   | Large terrain shapes, ~500 blocks |
| 1000  | Continent-scale variation |

Doubling Scale doubles the size of features. Halving Scale halves it.

A useful mental image: picture the noise as a photograph. Increasing Scale is like zooming out on the photo — the same pattern now covers a larger area and features become broad and gradual. Decreasing Scale zooms in — the pattern gets smaller and more detailed. The actual height range of the noise never changes, only the horizontal footprint of its features.

The density output range is the same at any Scale — only feature frequency changes:

```bounds
{"min": -1, "max": 1, "label": "SimplexNoise2D output range — same whether Scale is 10 or 1000"}
```

**Octaves, Persistence, Lacunarity** stack several layers of noise at different scales and mix them:

```
output = noise(f) * 1
       + noise(f * Lacunarity) * Persistence
       + noise(f * Lacunarity²) * Persistence²
       + ...
```

- **Lacunarity** -- how much smaller each octave's features are. 2.0 means each octave is twice as detailed. Mathematically it increases the resolution of each successive layer — think of it like erosion that pits and builds up the surface with finer and finer detail. Higher lacunarity at small scales can produce a pixelated mess; at large scales it creates rich surface texture.
- **Persistence** -- how much quieter each octave is. 0.5 means each octave contributes half as much. Think of it as reducing the Y-scale of each successive octave without changing its horizontal scale.

Higher Persistence = rougher, more fractal terrain. Lower Persistence = smoother, dominated by the large base scale.

> [!TIP]
> Persistence 0.5 + Lacunarity 2.0 is the classic "fractal noise" setting. It gives natural-looking hills where large shapes are clear but have fine bumps on them.

> [!NOTE]
> Adding more octaves does **not** simply add more detail indefinitely. Because each octave adds noise that can raise or lower values already modified by previous octaves, they tend to average out. Beyond about 3–4 octaves the effect becomes increasingly subtle — values homogenize toward a middle grey. The difference between 3 and 10 octaves is often smaller than the difference between 1 and 3. At small scales (Scale < 100), even 4+ octaves can produce a pixelated, overly grainy texture. At large scales (Scale > 500) you have more room before the effect deteriorates.

As octaves stack, the outputs statistically cluster toward the middle — each added octave is as likely to partially cancel the previous one as to reinforce it. The mathematical range does not shrink (the sum of amplitudes grows slightly with each octave), but extreme values become rarer and most outputs land near zero. A 1-octave noise has sharp, well-separated peaks and valleys; a 6-octave noise at the same settings tends to look more uniformly textured.

```bounds
{"min": -1, "max": 1, "label": "Single noise value range — same whether 1 octave or 6"}
```

### Seed

A seed is a text string that determines the pattern of a noise node. Any text can be used — the game converts it internally into a number and runs it through an algorithm to produce the pattern. You have no control over what a specific seed looks like; just experiment until you find one you like.

**Key seed behaviors to know:**

1. **Same seed = same pattern, always.** A given seed always produces the same noise, in any file, in any context. This means you can deliberately reuse a seed across two noise nodes to make their patterns align — useful when you want two effects to reinforce each other in the same locations (e.g. a rock scatter that lines up with high-density terrain).

2. **Reusing seeds when layering noise stacks their effects.** If you layer multiple noise nodes with the same seed and similar scales, they all create the most extreme change in the same spots. The result looks artificial — over-amplified peaks and valleys in a suspiciously regular pattern. Unless you specifically want that, use a different seed for each noise node you add.

3. **Too many different seeds at similar scales washes out texture.** Adding many noise patterns with different seeds but similar scales causes them to average each other out — everywhere gets modified by some noises up and others down, so the result trends toward a homogenized, flat-feeling surface. If layering noise is losing texture, try using significantly different scales between layers, not just different seeds.

4. **Changing the seed is the safest large change you can make.** Unlike scale, octaves, or amplitude, swapping the seed doesn't require rebalancing other values — you just get a different instance of the same pattern distribution. It is a low-risk way to explore variety, and you can always go back to the original seed if you don't like the result.

> [!TIP]
> Save your work often, especially before experimenting with seeds. The node editor can crash and wipe undo history. Incremental file saves are the only way to recover a version you liked.

---

### SimplexNoise3D

Like 2D noise but evaluated at `(x, y, z)`, so the pattern varies as you go up and down too. This is what makes **caves** possible -- at some Y the density dips below zero even where the surface is solid.

**The math:**
```text
output = simplex(x * ScaleXZ, y * ScaleY, z * ScaleXZ)
```

`ScaleXZ` and `ScaleY` are independent, which lets you stretch or compress caves vertically without affecting their horizontal size.

| ScaleY vs ScaleXZ | Effect |
|-------------------|--------|
| ScaleY = ScaleXZ  | Round, blob-like caves |
| ScaleY >> ScaleXZ | Tall thin tunnels, vertical shafts |
| ScaleY << ScaleXZ | Wide flat cave rooms, horizontal layers |

---

### CellNoise2D

Instead of smooth gradients, cell noise divides space into random Voronoi cells. Each cell center is a point, and the output is the **distance to the nearest center**.

This creates a cracked-rock or crater pattern. The cells have hard edges compared to Simplex.

---

## Part 2 -- Combining densities

### Sum

Adds two or more density values together:
```
output = A + B + C + ...
```

When used to combine a noise field with a `BaseHeight` signal, it vertically shifts the entire terrain. Adding a positive constant raises the surface; adding a negative constant lowers it.

**Practical example -- basic rolling hills:**
```
output = SimplexNoise2D + BaseHeight
```
`BaseHeight` outputs a strong positive value well below the surface and a strong negative value well above it. Adding noise to that pushes the surface up and down by the noise amplitude.

When you add two signals each in [-1, 1], the result can reach [-2, 2]:

```bounds
{"min": -1, "max": 1, "label": "SimplexNoise2D — [-1, 1]"}
```

```bounds
{"min": -1, "max": 1, "label": "BaseHeight signal — [-1, 1]"}
```

```bounds
{"min": -2, "max": 2, "label": "Sum output — can reach [-2, 2]"}
```

The world treats **any positive value** as solid regardless of magnitude, so ±2 works fine for a simple terrain output. But if this Sum feeds a `CurveMapper` or a `Mix` weight, the expanded range can produce unexpected results — use `Clamp` or `Normalizer` to bring it back to [-1, 1] first.

> [!NOTE]
> `BaseHeight` is not a height value -- it is a density field that smoothly transitions from solid (positive) below a reference height to air (negative) above it. The rate of that transition is called the gradient, and it determines how steep the implicit surface is.

---

### Multiplier

Multiplies all inputs together:
```
output = A × B × C × ...
```

The most common use is **scaling amplitude** -- multiply noise by a `Constant` node to reduce or increase how tall your hills are:
```
hills = SimplexNoise2D × Constant(0.3)
```
A `Constant` of 0.3 makes hills 30% as tall as they would be at full amplitude.

```bounds
{"min": -1, "max": 1, "label": "SimplexNoise2D before Multiplier — [-1, 1]"}
```

```bounds
{"min": -0.3, "max": 0.3, "label": "After × 0.3 — amplitude compressed to [-0.3, 0.3]"}
```

```bounds
{"min": -2, "max": 2, "label": "After × 2.0 — amplitude expanded to [-2, 2]"}
```

**Why not just lower Scale on the noise?** Scale changes feature size, not height. Multiplying by a constant changes height only, leaving feature size alone. They are independent controls.

### Subtraction (no subtract node — use negation)

There is no dedicated subtraction node in Hytale WorldGen V2. To subtract B from A:

1. Multiply B by `-1` using a `Multiplier` node with a `Constant { Value: -1 }` input.
2. Feed both A and the negated B into a `Sum` node.

```
output = A + (B × -1)  →  equivalent to A - B
```

```nodegraph
{
  "height": 180,
  "nodes": [
    { "id": "a",   "label": "Density A",   "category": "generative", "sub": "e.g. terrain",     "x": 0,   "y": 20  },
    { "id": "b",   "label": "Density B",   "category": "generative", "sub": "e.g. cave noise",  "x": 0,   "y": 110 },
    { "id": "neg", "label": "Constant",    "category": "math",       "sub": "Value −1",         "x": 0,   "y": 170 },
    { "id": "mul", "label": "Multiplier",  "category": "math",       "sub": "B × −1",           "x": 200, "y": 135 },
    { "id": "sum", "label": "Sum",         "category": "math",       "sub": "A + (−B)",         "x": 380, "y": 70  },
    { "id": "out", "label": "Terrain Out", "category": "output",                                 "x": 560, "y": 70  }
  ],
  "edges": [
    { "from": "a",   "to": "sum" },
    { "from": "b",   "to": "mul" },
    { "from": "neg", "to": "mul", "label": "−1" },
    { "from": "mul", "to": "sum", "label": "−B" },
    { "from": "sum", "to": "out", "label": "A − B" }
  ],
  "steps": [
    { "nodeId": "a",   "text": "Density A is whatever you want to subtract from — typically a terrain surface or a solid region." },
    { "nodeId": "b",   "text": "Density B is what you want to remove — a cave noise field, a shape, or any density you want to carve out." },
    { "nodeId": "mul", "text": "Multiplier with Constant(−1) negates B. Positive values become negative, negative become positive. This flips what was additive into subtractive." },
    { "nodeId": "sum", "text": "Sum adds A and the negated B together: A + (−B) = A − B. Where B was large and positive, the result loses density — creating voids, caves, or carved shapes in A." },
    { "nodeId": "out", "text": "The subtracted result reaches Terrain Out. Any location where B was strong enough to pull the total below zero becomes air — the subtraction carved it out." }
  ]
}
```

This pattern comes up frequently: subtracting a noise layer to carve terrain down, removing a shape from a solid region, or pulling a density field below zero to create air pockets. Any time you need to "remove" something from the density, this is how.

---

### Min and Max

`Min` takes the lowest density at each point. `Max` takes the highest.

**Min creates an intersection** -- only regions where *both* shapes are solid stay solid:
```
output = Min(sphere_density, ground_density)
```
This carves the sphere shape out of the ground -- you only get solid where the ground says solid AND the sphere says solid. Useful for cutting flat-bottomed craters or limiting terrain to a certain shape.

**Max creates a union** -- solid wherever *either* input is solid:
```
output = Max(pillar_density, ground_density)
```
This adds the pillar on top of the existing terrain. Useful for additive shapes like rock spires.

> [!TIP]
> `SmoothMin` works like `Min` but blends the two shapes together at the boundary instead of cutting sharply. The `Smoothness` parameter controls the blend radius in world units.

---

### Mix

Blends between two density values using a 0–1 weight:
```
output = A × (1 - weight) + B × weight
```

When `weight = 0` you get A entirely. When `weight = 1` you get B entirely. When `weight = 0.5` you get an equal mix.

**The weight almost always comes from normalized noise** -- noise remapped to [0, 1] with a `Normalizer`. This means different areas of the world get different blends, creating biome-like transitions:
- weight near 0 → terrain type A
- weight near 1 → terrain type B
- weight in between → gradual crossfade

The key insight: the transition width in world space is determined by how fast the weight noise changes. A large-scale, slowly-varying weight noise creates wide gradual biome borders. A small-scale, quickly-varying one creates a speckled mix.

---

## Part 3 -- Height-dependent effects

### YValue

Simply outputs the current world Y coordinate as a number. At Y=64, output=64. At Y=128, output=128.

On its own this is not useful as a density. But combined with a `Constant` and a `Sum`:
```text
density = Constant(64) - YValue
```
This creates a perfectly flat ground plane at Y=64 -- positive below (solid) and negative above (air). It is the simplest possible terrain.

> [!NOTE]
> The sign convention matters: positive density = solid, negative density = air. If you write `YValue - Constant(64)` instead, the sign is flipped and you get air below and solid above. When using SDF shapes like `Ellipsoid`, their raw output is negative inside the shape -- you may need to negate or remap the result to match the solid-positive convention.

---

### BaseHeight

`BaseHeight` reads a named height reference from the biome configuration and produces a density field that transitions from solid to air around that height. Unlike `YValue - constant`, the transition rate is controlled by the biome configuration, not hard-coded.

**Fields:**
- `BaseHeightName` -- which named height to reference (e.g. `"surface"`, `"ocean_floor"`)
- `Distance` -- if true, outputs the raw signed distance rather than a smoothed density gradient

> [!IMPORTANT]
> `BaseHeight` has no numeric height value you can set in the node itself. The actual height number lives in the biome config JSON. The node just reads it. Use `Sum` with a `Constant` to offset from that reference.

---

### YSampled

Re-evaluates its input density at a **single Y coordinate** offset from the current position -- either provided by a `YProvider` input or snapped to the nearest multiple of `SampleDistance`. It is used to create **overhangs**.

**Why this creates overhangs:**
- At a point just below the surface, the density is positive (solid).
- At a point just above the surface, the density is negative (air).
- YSampled looks at the density `SampleDistance` blocks higher.
- If the density is more negative higher up, the sampled value subtracts from the current density, potentially making solid points near the surface go negative → air pockets form → overhangs.

| SampleDistance | Effect |
|----------------|--------|
| 2–8            | Subtle undercutting, gentle overhangs |
| 16–32          | Strong overhangs, arch-like shapes |
| 64+            | Floating island effect, extreme disconnected geometry |

---

## Part 4 -- Coordinate warping

### Scale (coordinate node)

Multiplies the input coordinates before passing them to the next node:
```
x' = x × ScaleX
y' = y × ScaleY
z' = z × ScaleZ
```

This is **not** the same as the `Scale` field on a noise node. The coordinate `Scale` node physically transforms space before any noise is evaluated. Everything downstream sees squeezed or stretched coordinates.

**Example -- squashing terrain vertically:**
Setting `ScaleY = 0.5` makes the world look twice as tall from the noise's perspective. Caves become twice as tall in world space. Hills stretch upward.

---

### GradientWarp

Takes a 3D noise value and uses it to **offset the sampling coordinates**:
```
x' = x + noise_x(x, y, z) × WarpFactor
z' = z + noise_z(x, y, z) × WarpFactor
```

Instead of smooth, aligned features, warped noise has twisted, organic-looking shapes. The original pattern is preserved but bent in space.

| WarpFactor | Effect |
|------------|--------|
| 0          | No warping, clean noise |
| 5–10       | Gentle twist, natural-looking |
| 30–60      | Strong distortion, chaotic folds |
| 100+       | Extreme folding, hard to predict |

> [!TIP]
> Double warp -- warping already-warped coordinates -- produces very organic cave structures and craggy cliffs. First warp with a large scale, then warp the result with a small scale.

---

## Part 5 -- Shape SDFs

SDF stands for **Signed Distance Function**. These nodes output the signed distance to the surface of a mathematical shape -- negative inside, positive outside (or vice versa depending on convention).

### Ellipsoid

Outputs the distance to the surface of an ellipsoid (stretched sphere):
```
output = sqrt((x/rx)² + (y/ry)² + (z/rz)²) - 1
```
Where `rx, ry, rz` come from the `Scale` vector3d field `[x, y, z]`. The surface is exactly where `output = 0`.

- **Inside the ellipsoid** -- output < 0 (negative)
- **Outside the ellipsoid** -- output > 0 (positive)

Because the terrain convention is positive = solid, you typically need to **negate** the raw SDF output (or use a Curve that flips the sign) so that the inside becomes positive density. Without this step the ellipsoid would carve a hole instead of creating solid terrain.

Crucially, `Ellipsoid` requires a **Curve** input that remaps the raw distance to a density value. The `Curve` lets you control how quickly the density falls off from solid to air -- a hard step for a crisp surface, a soft S-curve for a fuzzy blended edge.

**Floating islands** use `Ellipsoid` as the primary density shape, then add a noise field to roughen the surface, then use `Mix` or `Max` to combine with regular ground terrain.

---

### Plane

Outputs the signed distance to an infinite plane:
```
output = dot(position, PlaneNormal) + offset
```
- `PlaneNormal` -- the direction the plane faces (e.g. `[0,1,0]` for horizontal)
- `IsAnchored` -- if true, the plane passes through the world origin; if false it floats

Like `Ellipsoid`, a `Curve` input is required to turn the raw distance into a useful density.

**Use case:** A horizontal plane with `PlaneNormal [0,1,0]` is a perfectly flat cut through the world. `Min(ground, plane)` keeps terrain only below a certain altitude -- useful for flat-topped mesas.

---

## Part 6 -- Putting it all together

### Recipe: Rolling hills with caves

```
density = Sum(
  BaseHeight,                          ← places ground level
  Multiplier(SimplexNoise2D, 0.4),     ← surface bumps, 40% amplitude
  SimplexNoise3D × -1                  ← carve caves (negative density removes rock)
)
```

**How the math works:**
1. `BaseHeight` is strongly positive at depth, strongly negative high in the air. The zero crossing is the ground plane.
2. `SimplexNoise2D × 0.4` pushes the zero crossing up and down across XZ, making hills. A noise value of +0.5 at X=100 means the surface at X=100 is 0.5 density units higher -- which translates to visually higher terrain.
3. `SimplexNoise3D × -1` subtracts 3D noise from the total. Where the 3D noise is large and positive, subtracting it creates pockets of air underground → caves.

The cave noise amplitude controls cave size. If the 3D noise multiplier is 0.1, caves are small. If it is 0.8, caves dominate the landscape.

```nodegraph
{
  "height": 240,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",     "category": "terrain", "sub": "Y = 64",           "x": 0,   "y": 20  },
    { "id": "sn2", "label": "SimplexNoise2D",  "category": "terrain", "sub": "Scale 300 Oct 4", "x": 0,   "y": 110 },
    { "id": "c",   "label": "Constant",        "category": "math",    "sub": "Value 0.4",        "x": 0,   "y": 175 },
    { "id": "mul", "label": "Multiplier",      "category": "math",    "sub": "noise × 0.4",      "x": 200, "y": 135 },
    { "id": "sn3", "label": "SimplexNoise3D",  "category": "terrain", "sub": "ScaleXZ 40",       "x": 0,   "y": 245 },
    { "id": "inv", "label": "Inverter",        "category": "math",    "sub": "× −1",              "x": 200, "y": 245 },
    { "id": "sum", "label": "Sum",             "category": "math",                                 "x": 400, "y": 120 },
    { "id": "out", "label": "Terrain Out",     "category": "output",                               "x": 600, "y": 120 }
  ],
  "edges": [
    { "from": "bh",  "to": "sum" },
    { "from": "sn2", "to": "mul" },
    { "from": "c",   "to": "mul" },
    { "from": "mul", "to": "sum", "label": "hills" },
    { "from": "sn3", "to": "inv" },
    { "from": "inv", "to": "sum", "label": "cave carve" },
    { "from": "sum", "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "bh",  "text": "BaseHeight anchors the terrain at Y=64. It outputs a strong positive density below that line (solid rock) and strong negative above it (air). The zero crossing is the ground plane. Every other input in this Sum either raises or lowers that plane locally." },
    { "nodeId": "sn2", "text": "SimplexNoise2D varies smoothly across XZ. Each output sample is in [−1, +1]. At any given X/Z position, the value is constant for the entire vertical column — so this noise shifts the surface up or down but cannot create overhangs. Scale 300 means one noise cycle spans roughly 300 blocks." },
    { "nodeId": "mul", "text": "Multiplier scales the noise amplitude: hills = noise × 0.4. At maximum noise (+1) this adds +0.4 to the density, raising terrain. At minimum (−1) it subtracts 0.4, lowering terrain. The Constant value directly controls hill height — double it to double the height variation." },
    { "nodeId": "sn3", "text": "SimplexNoise3D varies in all three dimensions — X, Y, and Z. Unlike the 2D noise, a vertical column does NOT stay constant. At some Y levels the noise is high, at others low. This is the prerequisite for caves: the density can dip below zero within a mostly-solid region." },
    { "nodeId": "inv", "text": "Inverter multiplies by −1. Positive 3D noise becomes negative. Adding this negative value to the Sum subtracts from the total density — carving holes. Where the 3D noise was +0.5, the inverted value is −0.5, and the sum loses 0.5 density at that point. If that dips the total below zero, a cave forms." },
    { "nodeId": "sum", "text": "Sum combines all three signals: density = BaseHeight + (noise2D × 0.4) + (−noise3D). The zero crossing of this combined field is where the terrain surface sits. Bumps from the 2D noise create hills. Pockets from the 3D noise create caves. Both effects are independent and additive." },
    { "nodeId": "out", "text": "The final combined density reaches Terrain Out. Surface hills come from the 2D noise amplitude; cave frequency and size come from the 3D noise scale. Tune them separately — they do not affect each other." }
  ]
}
```

---

### Recipe: Why overhangs need YSampled

Plain `SimplexNoise2D` added to `BaseHeight` creates hills but never overhangs -- the density always decreases as you go up, so there is no way for a layer of air to sit below a layer of solid.

`YSampled` breaks that monotonicity. It re-evaluates terrain at a higher Y and folds that value back into the current point's density. Points that sit below a "future solid" region get extra positive density; points that sit below a "future air" region get reduced density, which can flip them below zero → air → overhang.

The higher `SampleDistance`, the further above the current point is checked, and the more extreme the overhang effect.

---

### Recipe: Controlling feature size vs height independently

These are two separate parameters people often confuse:

| What you want to change | Node to touch | Field |
|-------------------------|---------------|-------|
| How wide hills are | SimplexNoise2D | `Scale` (smaller = wider) |
| How tall hills are | Multiplier + Constant | `Value` on the Constant |
| How rough the surface is | SimplexNoise2D | `Octaves` + `Persistence` |
| How deep caves go | SimplexNoise3D | `ScaleY` (smaller = deeper caves) |
| How wide caves are | SimplexNoise3D | `ScaleXZ` |
| How big overhangs are | YSampled | `SampleDistance` |

---

### Recipe: Skylands altitude band

This is a teaching reconstruction for altitude-band sky terrain. It creates terrain that exists only within a vertical Y range -- open air above and below, floating islands in the middle.

```
density = Sum(
  Normalizer(
    Sum(
      SimplexNoise3D(ScaleXZ=100, ScaleY=50),    ← 3D variation for organic island shapes
      CurveMapper(band_curve,                     ← defines the Y band where islands exist
        BaseHeight(Distance=true, Name="Base"))   ← outputs raw Y position
    )
  ),
  Multiplier(                                     ← optional: second island layer higher up
    CurveMapper(upper_band_curve,
      BaseHeight(Distance=true, Name="Base")),
    Constant(1)
  )
)
```

**The key step: `BaseHeight` with `Distance: true`**

Normally, `BaseHeight` acts as a terrain anchor around the named height reference. That is ideal for ground-based terrain, but not enough on its own for altitude bands because you need the raw signed distance that a band curve can remap directly.

With `Distance: true`, `BaseHeight` outputs the **raw Y coordinate minus the named height** -- a distance value, not a density. At `BaseHeightName: "Base"` (typically `Y: 0`), this simply outputs the world Y position.

The `CurveMapper` then maps that Y value to density via a hand-drawn band curve:

```
Y = -30  →  density = -1   (air below the island band)
Y = 110  →  density = +1   (solid at the peak altitude)
Y = 210  →  density = -1   (air above the island band)
```

Anything outside the range is forced to air. The curve peak defines the altitude center of the island layer.

**Why add `SimplexNoise3D`:**

The band curve alone produces a flat solid slab -- a perfect horizontal layer of infinite terrain. `SimplexNoise3D` breaks that into individual island chunks. Where the 3D noise is negative, it pulls the sum below zero within the altitude band → air → gap between islands. Where the noise is positive, it reinforces the band curve → solid → island mass.

**Why `Normalizer` wraps the inner `Sum`:**

`SimplexNoise3D` (±1) plus the band curve (±1) can sum to ±2. `Normalizer` maps `[-2, 2]` back to `[-1, 1]` so the outer `Sum` (which adds the second island layer) receives predictable inputs.

```bounds
{"min": -1, "max": 1, "label": "Band curve output — [-1, 1]"}
```

```bounds
{"min": -1, "max": 1, "label": "SimplexNoise3D output — [-1, 1]"}
```

```bounds
{"min": -2, "max": 2, "label": "After inner Sum — expands to [-2, 2]"}
```

```bounds
{"min": -1, "max": 1, "label": "After Normalizer — remapped back to [-1, 1]"}
```

**Adding more island layers:**

Each additional layer is a `BaseHeight(Distance) → CurveMapper(different Y band) → Multiplier(× Constant)` path, summed at the end. The `Constant` acts as a layer weight -- setting it to 1 adds the layer at full strength, lower values make it a subtle secondary feature.

```nodegraph
{
  "height": 260,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",    "category": "terrain", "sub": "Distance: true",     "x": 0,   "y": 20  },
    { "id": "cm",  "label": "CurveMapper",   "category": "filter",  "sub": "Y band curve",       "x": 200, "y": 20  },
    { "id": "sn3", "label": "SimplexNoise3D","category": "terrain", "sub": "ScaleXZ 100 ScaleY 50","x": 0,  "y": 130 },
    { "id": "s1",  "label": "Sum",           "category": "math",    "sub": "band + 3D noise",    "x": 400, "y": 75  },
    { "id": "nm",  "label": "Normalizer",    "category": "filter",  "sub": "[-2,2] → [-1,1]",    "x": 580, "y": 75  },
    { "id": "s2",  "label": "Sum",           "category": "math",                                  "x": 760, "y": 75  },
    { "id": "out", "label": "Terrain Out",   "category": "output",                                "x": 940, "y": 75  }
  ],
  "edges": [
    { "from": "bh",  "to": "cm"  },
    { "from": "cm",  "to": "s1",  "label": "band density" },
    { "from": "sn3", "to": "s1",  "label": "3D noise" },
    { "from": "s1",  "to": "nm"  },
    { "from": "nm",  "to": "s2",  "label": "island layer 1" },
    { "from": "s2",  "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "bh",  "text": "BaseHeight with Distance: true outputs the raw signed Y distance from the named reference height — essentially the world Y coordinate. With Distance: false it would output a terrain density suitable for ground planes. Here we need the raw number so the CurveMapper can remap it to a band shape." },
    { "nodeId": "cm",  "text": "CurveMapper converts the raw Y value into a band density. The curve outputs negative below and above the target altitude range, and positive only in the middle — e.g. positive between Y=90 and Y=150. This is the altitude gate: the CurveMapper decides where in vertical space the island layer can exist." },
    { "nodeId": "sn3", "text": "SimplexNoise3D breaks the flat slab into individual islands. Without it, the positive region from the CurveMapper would form a continuous horizontal sheet. The 3D noise varies in all axes — where it is negative, it pulls the sum below zero within the band, carving gaps between islands." },
    { "nodeId": "s1",  "text": "Sum adds band density and 3D noise: combined = bandCurve + noise3D. Both are in [−1, +1] range. Their sum can reach [−2, +2]. This is why Normalizer is required next — without it the outer Sum would receive unpredictable amplitudes that break any weight-based layering." },
    { "nodeId": "nm",  "text": "Normalizer remaps [−2, +2] back to [−1, +1]. This is the critical range-clamp that makes the outer Sum predictable. Without it, the first island layer alone could output ±2, overwhelming any additional layers or weights applied downstream." },
    { "nodeId": "s2",  "text": "The outer Sum is where additional island layers would be added — each one a separate BaseHeight(Distance) → CurveMapper(different Y band) path, optionally scaled by a Constant. Currently it only has the one layer, but structuring it as a Sum makes extending to multi-layer skylands straightforward." },
    { "nodeId": "out", "text": "Terrain Out receives the final altitude-banded island density. Islands exist only where the band curve is positive and the 3D noise reinforces it. Widen the positive region in the CurveMapper to make taller island bands; narrow it for thin floating shelves." }
  ]
}
```

---

### Recipe: Biome blending

The challenge is that you want two completely different terrain functions -- desert plateaus vs forest hills -- to coexist without a hard seam.

The solution is `Mix`:
```
weight = Normalizer(BiomeNoise, 0, 1)
density = Mix(desert_density, forest_density, weight)
```

Where `weight` crosses 0.5, the two terrains are equally mixed -- a gradual transition. The width of that transition in world space is controlled by the Scale of `BiomeNoise`.

**Common mistake:** using the same noise for terrain variation and biome blending. This creates a strong correlation between terrain shape and biome boundaries, which looks unnatural. Use two independent noise nodes with different seeds and scales.

```nodegraph
{
  "height": 240,
  "nodes": [
    { "id": "ta",  "label": "Terrain A",       "category": "terrain", "sub": "e.g. desert plateaus", "x": 0,   "y": 20  },
    { "id": "tb",  "label": "Terrain B",       "category": "terrain", "sub": "e.g. forest hills",    "x": 0,   "y": 120 },
    { "id": "bn",  "label": "SimplexNoise2D",  "category": "terrain", "sub": "Scale 600 biome",      "x": 0,   "y": 210 },
    { "id": "nm",  "label": "Normalizer",      "category": "filter",  "sub": "[-1,1] → [0,1]",       "x": 200, "y": 210 },
    { "id": "mix", "label": "Mix",             "category": "math",    "sub": "A×(1-w) + B×w",        "x": 400, "y": 110 },
    { "id": "out", "label": "Terrain Out",     "category": "output",                                  "x": 600, "y": 110 }
  ],
  "edges": [
    { "from": "ta",  "to": "mix" },
    { "from": "tb",  "to": "mix" },
    { "from": "bn",  "to": "nm"  },
    { "from": "nm",  "to": "mix", "label": "blend weight" },
    { "from": "mix", "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "ta",  "text": "Terrain A is the full density graph for the first terrain type — for example, a desert plateau graph with BaseHeight → CurveMapper → Sum. This entire sub-graph feeds into Mix as a single density value at each point." },
    { "nodeId": "tb",  "text": "Terrain B is the full density graph for the second terrain type — for example, a forest hills graph with noise and CurveMapper. Neither terrain graph knows about the other; they are computed independently and only combined at the Mix node." },
    { "nodeId": "bn",  "text": "A dedicated biome blend noise — separate from any terrain noise. Large Scale (0.002 = ~500 blocks) creates wide biome regions. This noise MUST use a different Seed from all terrain noise. If you reuse terrain noise here, biome borders will always align with terrain features, which looks artificial." },
    { "nodeId": "nm",  "text": "Normalizer remaps the noise from [−1, +1] to [0, 1]. Mix requires its weight in [0, 1]. Without this step, negative noise values would produce weights below zero, which Mix does not handle correctly — terrain A would become over-represented." },
    { "nodeId": "mix", "text": "Mix computes: output = A × (1 − weight) + B × weight. At weight=0 the result is pure Terrain A. At weight=1 it is pure Terrain B. At weight=0.5 the densities are equally averaged — a smooth blended boundary where both terrain shapes coexist. The width of the transition zone in world space is determined by how fast the biome noise changes." },
    { "nodeId": "out", "text": "The blended density reaches Terrain Out. The seam between biomes is gradual — a wide transition zone rather than a hard cut. Increase the biome noise Scale to widen biome regions and smooth transitions; decrease it for a more fragmented, patchy biome distribution." }
  ]
}
```

---

## Quick reference -- parameter effects

| Parameter | Range | Small value | Large value |
|-----------|-------|-------------|-------------|
| SimplexNoise2D Scale | 1–1000 | Tiny bumps | Wide rolling plains |
| SimplexNoise2D Octaves | 1–8 | Smooth blobs | Rough fractal detail |
| SimplexNoise2D Persistence | 0.1–0.9 | Smooth, gentle | Rough, sharp peaks |
| SimplexNoise3D ScaleXZ | 5–200 | Narrow passages | Wide cave rooms |
| SimplexNoise3D ScaleY | 5–100 | Flat cave layers | Tall shafts |
| Multiplier Constant | 0.05–2.0 | Short hills / small caves | Tall hills / giant caves |
| YSampled SampleDistance | 2–64 | Subtle undercuts | Extreme overhangs |
| GradientWarp WarpFactor | 0–100 | Clean shapes | Twisted organic forms |
| SmoothMin Smoothness | 0–50 | Sharp intersection | Smooth blended union |
| Mix weight | 0–1 | All shape A | All shape B |

---

## Part 7 -- Utility and transform nodes

These nodes appear less often but fill specific gaps. Each does one focused mathematical operation.

### Pow

Raises the input density to an exponent:
```
output = input ^ Exponent
```

**Use:** Sharpening peaks. `Abs → Pow(2.0)` turns gentle ridges into sharp spires -- squaring values near zero pushes them closer to zero, while values near 1 stay near 1, so the curve bends sharply upward only at the peak.

| Exponent | Shape |
|----------|-------|
| 0.5 (Sqrt) | Flattens -- small values grow, large ones don't |
| 1.0 | No change |
| 2.0 | Sharpens -- peaks stand out, base flattens |
| 3.0+ | Very sharp needle peaks |

### Sqrt

Square root of input density -- the inverse of `Pow(2.0)`. Expands small values toward the midpoint. Useful for softening a hard edge produced by `Abs` or an SDF.

### Slider

Translates the sampling coordinates before evaluating the child density:
```
x' = x + SlideX
y' = y + SlideY
z' = z + SlideZ
```

Unlike `Offset` (which moves the whole pattern), `Slider` shifts *where the child is sampled from* -- effectively repositioning a feature in world space. Use it to place a shape SDF (like `Ellipsoid`) at a specific world position rather than always centred on the origin.

### Rotator

Redefines the Y axis and applies a spin angle to the coordinate space:
```
newUp = NewYAxis  (vector3d, e.g. [1,0,0] tilts terrain sideways)
spin  = SpinAngle (degrees, rotation around newUp)
```

**Use:** Tilting SDF shapes. An `Ellipsoid` always aligns with the world Y by default. Wrapping it in a `Rotator` with `NewYAxis [0,0,1]` makes it lie on its side -- a horizontal tunnel rather than a vertical dome.

> [!NOTE]
> `Rotator` has a preview gap -- rotation is not accurately reflected in the TerraNova preview canvas. The correct orientation is only visible in-game.

### Anchor

Anchors coordinate evaluation relative to a reference position. `Reversed: true` flips the anchor direction. Used in prop placement pipelines to evaluate density relative to the prop's world anchor point rather than absolute world coordinates.

### Shell

Produces a hollow shell around a shape. It requires two curve inputs:
- `AngleCurve` -- maps the angle around the axis to a radius
- `DistanceCurve` -- maps distance from the surface to density

This allows asymmetric hollow shapes -- wider on one side, narrow on the other. Primarily used for arch formations, hollow cylinders, and ribbed cave structures.

> [!WARNING]
> `Shell` inner-radius hollowing does not render correctly in the TerraNova preview -- it appears filled solid. The hollow only appears in-game.

---

## Part 8 -- Coordinate override nodes

These force a specific coordinate value regardless of world position -- useful for creating flat cuts, vertical walls, and layer-locked patterns.

| Node | Effect |
|------|--------|
| `XOverride` | Forces X to a constant -- all density evaluated at `X = value` regardless of actual X |
| `YOverride` | Forces Y to a constant -- creates a perfectly horizontal density slice |
| `ZOverride` | Forces Z to a constant |

**Practical use:** `YOverride(64)` on a noise field samples all density at Y=64 regardless of actual height. Feed this into a `Mix` weight to create a material or density pattern that is the same at every altitude -- only varying by X and Z.

