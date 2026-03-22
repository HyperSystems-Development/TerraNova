# Terrain Math Explained

**Difficulty:** Intermediate

This guide explains the actual math behind the nodes -- no prior knowledge required. By the end you will understand *why* certain combinations produce hills, caves, overhangs, and floating islands, and *how* to tune each parameter to get the result you want.

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
output = simplex(x * Scale, z * Scale)
```

Scale acts as a frequency multiplier -- smaller values produce larger, slower-varying features; larger values produce finer detail.

The output is in the range **[-1, +1]** (approximately -- Simplex can technically exceed this slightly, but treat it as [-1, 1]).

**What Scale does:**

| Scale | Effect |
|-------|--------|
| 0.001 | Very large features, ~1000-block hills |
| 0.01  | Medium hills, ~100 blocks across |
| 0.05  | Small rolling bumps, ~20 blocks |
| 0.2   | Noisy texture, almost no large features |

Halving Scale doubles the size of features. Doubling Scale halves it.

**Octaves, Persistence, Lacunarity** stack several layers of noise at different scales and mix them:

```
output = noise(f) * 1
       + noise(f * Lacunarity) * Persistence
       + noise(f * Lacunarity²) * Persistence²
       + ...
```

- **Lacunarity** -- how much smaller each octave's features are. 2.0 means each octave is twice as detailed.
- **Persistence** -- how much quieter each octave is. 0.5 means each octave contributes half as much.

Higher Persistence = rougher, more fractal terrain. Lower Persistence = smoother, dominated by the large base scale.

> [!TIP]
> Persistence 0.5 + Lacunarity 2.0 is the classic "fractal noise" setting. It gives natural-looking hills where large shapes are clear but have fine bumps on them.

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

**Why not just lower Scale on the noise?** Scale changes feature size, not height. Multiplying by a constant changes height only, leaving feature size alone. They are independent controls.

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
x' = x + noise_x(x, y, z) × WarpStrength
z' = z + noise_z(x, y, z) × WarpStrength
```

Instead of smooth, aligned features, warped noise has twisted, organic-looking shapes. The original pattern is preserved but bent in space.

| WarpStrength | Effect |
|--------------|--------|
| 0            | No warping, clean noise |
| 5–10         | Gentle twist, natural-looking |
| 30–60        | Strong distortion, chaotic folds |
| 100+         | Extreme folding, hard to predict |

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

This is the real-world technique used in Hytale skylands mods. It creates terrain that exists only within a vertical Y range -- open air above and below, floating islands in the middle.

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

Normally, `BaseHeight` outputs a clamped density -- strongly positive below the surface, strongly negative above. This is fine for ground-based terrain but useless for altitude bands, because the density gradient already forces everything above the surface to be air.

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

**Adding more island layers:**

Each additional layer is a `BaseHeight(Distance) → CurveMapper(different Y band) → Multiplier(× Constant)` path, summed at the end. The `Constant` acts as a layer weight -- setting it to 1 adds the layer at full strength, lower values make it a subtle secondary feature.

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

---

## Quick reference -- parameter effects

| Parameter | Range | Small value | Large value |
|-----------|-------|-------------|-------------|
| SimplexNoise2D Scale | 0.001–0.2 | Huge flat plains | Tiny noisy bumps |
| SimplexNoise2D Octaves | 1–8 | Smooth blobs | Rough fractal detail |
| SimplexNoise2D Persistence | 0.1–0.9 | Smooth, gentle | Rough, sharp peaks |
| SimplexNoise3D ScaleXZ | 0.005–0.1 | Wide cave rooms | Narrow passages |
| SimplexNoise3D ScaleY | 0.005–0.1 | Tall shafts | Flat cave layers |
| Multiplier Constant | 0.05–2.0 | Short hills / small caves | Tall hills / giant caves |
| YSampled SampleDistance | 2–64 | Subtle undercuts | Extreme overhangs |
| GradientWarp WarpStrength | 0–100 | Clean shapes | Twisted organic forms |
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

