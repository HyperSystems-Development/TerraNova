# Node Effects: How Each Node Changes Terrain

This reference describes the most important node categories and how they affect the terrain.

## Core concept: Graph = Terrain

In TerraNova, terrain is defined by a directed graph of nodes. Each node computes a value at every `(x, y, z)` position. The final value (the output) determines whether a point is solid (terrain) or air.

```
density > 0  →  solid block
density < 0  →  air
density = 0  →  the surface
```

The fundamental height formula is always some variation of:

```
density(x, y, z) = terrain_height(x, z) − y
```

Below the surface → positive → solid. Above → negative → air. Every Hytale biome is built on top of this identity.

---

## Key node categories

### 🔹 Density nodes (shape)

These are the building blocks that define what the terrain looks like.

#### Noise generators

| Node | What it produces | Key parameters |
|---|---|---|
| `SimplexNoise2D` | Smooth gradient noise (hills, plains) | Scale, Octaves, Persistence |
| `SimplexNoise3D` | 3D smooth noise (caves, overhangs) | Scale, Octaves |
| `CellNoise2D` | Voronoi cell regions (islands, biome patches) | ScaleX/Z, Jitter, CellType |
| `CellNoise3D` | 3D cell noise | ScaleX/Y/Z, Jitter |

**Scale** is in world-space blocks. `Scale: 100` means the noise pattern repeats roughly every 100 blocks. Larger = more gradual features.

**Octaves** layer multiple frequencies of noise on top of each other. More octaves = more detail, more computation.

**Persistence** controls how much amplitude each successive octave contributes. `0.5` = each octave is half as strong as the last.

#### Position-based inputs

| Node | What it returns | Common use |
|---|---|---|
| `YValue` | Current Y coordinate | Height formula base |
| `Height` | Normalized height (0 at sea, 1 at sky) | Altitude-based conditions |
| `Slope` | Surface steepness (0 = flat, 1 = vertical) | Material placement (grass vs rock) |
| `Distance` | Distance from a reference point | Radial features |
| `Constant` | A fixed number, always | Height offsets, amplitude scaling |

#### Combining nodes

| Node | What it does | Common use |
|---|---|---|
| `Sum` | Adds all inputs | Combine height + noise |
| `Multiplier` | Multiplies all inputs | Scale noise amplitude |
| `AmplitudeConstant` | Multiplies one input by a constant | `noise × 40` = ±40 block range |
| `Min` / `Max` | Minimum or maximum of inputs | Hard carving, feature merging |
| `SmoothMin` / `SmoothMax` | Smooth blend of min/max | Organic terrain merging |
| `Mix` | Weighted blend between two inputs | Blend two terrain layers |
| `FastGradientWarp` | Distorts coordinates before lookup | Organic edges on noise/cells |

**`SmoothMin`** is the workhorse of organic terrain. It blends two shapes together instead of cutting them hard. The `Smoothness` parameter controls the blend radius in world units.

**`FastGradientWarp`** wraps another node as its input, then displaces the lookup coordinates by a noise field before sampling. This makes straight cell edges wavy, geometric shapes organic.

---

### 🟣 Curves (remapping)

Curves take a value and remap it to a different value. They're the main tool for shaping *how* noise contributes to terrain: flattening it, sharpening it, inverting it, or scaling it.

> **See the full visual reference:** [Curves Reference](./curves.md)

```curve
Ease In — useful for sharpening noise near peaks
[[0,0],[0.25,0.0625],[0.5,0.25],[0.75,0.5625],[1,1]]
```

```curve
S-Curve — smooth transition, flat at extremes
[[0,0],[0.25,0.1],[0.5,0.5],[0.75,0.9],[1,1]]
```

```curve
Not (1 - x) — flip a mask from positive to negative space
[[0,1],[0.25,0.75],[0.5,0.5],[0.75,0.25],[1,0]]
```

#### Most-used curve tools

- **`Curve:Manual`**: draw any shape with control points, including threshold-like, smooth-step-like, and power-like remaps
- **`Curve:DistanceExponential`**: island falloff from center to edge
- **`Normalizer`**: rescale noise from `[-1, 1]` into a practical terrain range
- **`Curve:Inverter`**: negate (`-x`), essential for the height formula
- **`Curve:Not`**: flip a mask (`1 - x`)
- **`Curve:Clamp`**: cut off values outside `[Min, Max]`
- **`Pow`**: sharpen or soften density falloffs with `x ^ exponent`

---

### 🔸 Material nodes (surface look)

These control which block or texture appears on the surface. They don't change terrain shape; they change what the terrain is *made of*.

| Node | What it does |
|---|---|
| `Assignment` | Assigns a material to a terrain layer |
| `Pattern:Mask` | Uses a density value to blend between two materials |
| `Tint:Constant` | Sets a solid preview color for debugging |
| `Tint:DensityDelimited` | Different tint colors at different density bands |
| `BlockMask` | Restricts material placement to a specific block type |

**Material layers** are ordered from top to bottom. The first layer that matches the surface conditions "wins". Think of it like Photoshop layers.

---

### 🟢 Positions & Scanners (prop placement)

These nodes help place props (trees, rocks, crystals) and measure surface properties for conditions.

| Node | What it does |
|---|---|
| `Position:DistanceSampler` | Sample at a fixed offset from the current point |
| `Position:Surface` | Find the terrain surface above/below a point |
| `Scanner:Slope` | Measure slope at a position |
| `Scanner:Height` | Measure height at a position |

Positions are wired into prop density functions to define *where* props appear. For example: "place trees where slope < 0.3 AND height > 60".

---

### 🟠 Patterns (masks and repeats)

Patterns generate repeating or spatial masks that can be used to carve terrain or blend materials.

| Node | What it produces |
|---|---|
| `Pattern:Voronoi` | Cell-based repeating pattern |
| `Pattern:Checker` | Alternating checkerboard |
| `Pattern:Stripes` | Repeating stripe bands |
| `Pattern:Mask` | Smooth blend driven by a density value |

---

## Using Hytale biome nodes as reference

When you open a Hytale biome JSON in TerraNova, you can inspect the exact node graph used in the game. Use it as a reference for how real biomes are built.

### Copying a node "recipe"

1. Open a biome file (e.g., `Server/HytaleGenerator/Biomes/YourBiome.json`).
2. Select the nodes that produce the feature you like.
3. Copy + paste them into your own graph.
4. Adjust inputs (noise scale, curves, etc.) to customize.

---

## Common terrain patterns

### 🏔 Mountain ridges

```
SimplexNoise2D (Scale: 200, Octaves: 4)
  → CurveMapper (manual inverted ridge profile)
  → AmplitudeConstant(120)
  → Sum with Inverter(YValue)
```

```curve
Ridge shape — manual inverted ridge profile
[[0,1],[0.25,0.5625],[0.5,0.25],[0.75,0.0625],[1,0]]
```

Key: a manually drawn curve flips the noise so the *low* valleys become *high* ridge peaks, then sharply compresses everything except the tallest peaks.

---

### 🏝 Sky islands

```
CellNoise2D (Scale: 125, CellType: Distance2Div)
  → FastGradientWarp (WarpFactor: 20)   [organic edges]
  → DistanceExponential (Exponent: 2)   [center solid, edges taper]
  → Sum with height formula
```

```curve
Island density falloff — DistanceExponential Exponent 2
[[0,1],[0.25,0.9375],[0.5,0.75],[0.75,0.4375],[1,0]]
```

Cell center = 1.0 (solid core). Cell edge = 0.0 (air). `DistanceExponential` controls how abruptly the island tapers. Higher exponent = sharper, smaller islands.

---

### 🌋 Caves

```
SimplexNoise3D (Scale: 40, Octaves: 2)   [cave shapes]
  → CurveMapper (manual hard step at 0.7) [only keep high-value pockets]
  → Multiplier with base terrain density  [carve from solid rock only]
```

3D noise carves tunnels through solid terrain. Use a hard-step `CurveMapper` profile to make the caves crisply carved rather than gradual. Multiply (not subtract) so caves only appear in already-solid terrain.

---

### 🌊 Beaches and shorelines

```
YValue → Normalizer(58→65 to 0→1)
       → CurveMapper(manual shoreline blend)   [blend zone at shoreline]
```

```curve
Beach blend zone — manual shoreline blend
[[0,0],[0.3,0],[0.45,0.156],[0.5,0.5],[0.55,0.844],[0.7,1],[1,1]]
```

```bounds
{"min": 58, "max": 65, "label": "Beach height band: shoreline blend zone"}
```

Below Y=58 → sand. Above Y=65 → grass. Between → smooth blend. Adjust the height band to match your sea level.

---

### ⛰ Terraced cliffs

```
SimplexNoise2D  →  CurveMapper(manual staircase)  →  AmplitudeConstant(80)
               → Sum with Inverter(YValue)
```

```curve
Terraced height — manual staircase profile
[[0,0],[0.166,0],[0.167,0.167],[0.333,0.167],[0.334,0.333],[0.5,0.333],[0.501,0.5],[0.667,0.5],[0.668,0.667],[0.833,0.667],[0.834,0.833],[1,0.833]]
```

A hand-drawn staircase curve quantizes the continuous noise into discrete bands, creating the flat plateau shelves of terraced terrain. More steps = more, thinner terraces.

---

### 🌿 Material layering (grass/dirt/stone)

```
Surface
  → Assignment(Grass)  [top layer]

Depth < 3 from surface
  → Assignment(Dirt)   [subsurface]

Else
  → Assignment(Stone)  [bedrock]
```

Use `Height` or `YValue` + `Normalizer` + `CurveMapper` to create smooth blends between material bands rather than hard cuts.

---

## Quick reference: picking the right node

| What you want | Use |
|---|---|
| Natural random terrain | `SimplexNoise2D` + `SimplexNoise3D` |
| Island/region separation | `CellNoise2D` |
| Organic cell edges | `FastGradientWarp` |
| Height-based everything | `YValue` + `Normalizer` or `CurveMapper` |
| Blend two terrain layers | `Mix` or `SmoothMin` |
| Sharp terrain cut | `Min` or `CurveMapper` with a hard step |
| Smooth terrain merge | `SmoothMin` / `SmoothMax` |
| Scale noise amplitude | `AmplitudeConstant` |
| Smooth material transition | `CurveMapper` with an S-curve |
| Any value remapping | `Curve:Manual` or `Normalizer` |
| Invert a mask | `Curve:Not` |
| Negate a value | `Curve:Inverter` |
