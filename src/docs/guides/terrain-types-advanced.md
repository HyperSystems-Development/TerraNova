# Guide: Complex Terrain Techniques

**Difficulty:** Advanced

This guide covers terrain types that require nodes or patterns not covered in [Terrain Types and Node Recipes](./terrain-types.md). Each section tackles a specific complex outcome and explains what makes it harder — and why the recipe works.

Prerequisites: comfortable with `BaseHeight`, `Sum`, `CurveMapper`, `SimplexNoise2D/3D`, `Min`/`Max`, and `YSampled`. If any of those are unfamiliar, start with the [basic terrain guide](./understanding-basic-terrain-generation.md) first.

---

## 1. Double Domain Warp (Chaos Terrain)

**What it looks like:** Terrain with extreme, multi-scale organic distortion. Features twist, fold, and meander at two different scales simultaneously. Looks like stone that was deformed by heat and pressure over millions of years — alien and otherworldly.

**Why it's complex:** A single `GradientWarp` warps positions in one direction. Chaining a second warp *on top of the already-warped position* multiplies the distortion — the second warp bends features that are already bent. The cost compounds too.

> **Preview gap — critical:** `GradientWarp` returns `0.0` in TerraNova's preview, so double-warp terrain is completely absent in the editor. Use `FastGradientWarp` for this recipe (which does preview, though with reduced octave detail) and tune the child terrain without warping first.

**The recipe:** Two `FastGradientWarp` nodes nested. The outer warp distorts at a broad scale; the inner warp adds tight, fine distortion on top.

```nodegraph
{
  "height": 220,
  "nodes": [
    { "id": "bh",   "label": "BaseHeight",       "category": "density",  "sub": "Y = 70",              "x": 0,   "y": 40 },
    { "id": "sn",   "label": "SimplexNoise2D",   "category": "density",  "sub": "Scale 0.004 Oct 4",   "x": 0,   "y": 130 },
    { "id": "sum",  "label": "Sum",              "category": "density",                                "x": 220, "y": 85 },
    { "id": "fw1",  "label": "FastGradientWarp", "category": "density",  "sub": "Scale 0.003 Factor 6","x": 420, "y": 85 },
    { "id": "fw2",  "label": "FastGradientWarp", "category": "density",  "sub": "Scale 0.012 Factor 3","x": 620, "y": 85 },
    { "id": "ys",   "label": "YSampled",         "category": "density",  "sub": "step = 4",            "x": 820, "y": 85 },
    { "id": "out",  "label": "Terrain Out",      "category": "output",                                 "x": 1000,"y": 85 }
  ],
  "edges": [
    { "from": "bh",  "to": "sum" },
    { "from": "sn",  "to": "sum" },
    { "from": "sum", "to": "fw1", "label": "child" },
    { "from": "fw1", "to": "fw2", "label": "child" },
    { "from": "fw2", "to": "ys" },
    { "from": "ys",  "to": "out" }
  ]
}
```

**Key parameters:**
- Outer warp (`fw1`) WarpScale`*`: `0.003`, WarpFactor: `6` — broad, sweeping distortion; this is the large-scale fold
- Inner warp (`fw2`) WarpScale`*`: `0.012`, WarpFactor: `3` — tighter, smaller curls on top of the broad folds; lower factor keeps it from overpowering the outer warp
- Use `FastGradientWarp` over `GradientWarp` here — chained `GradientWarp` in 3D mode costs 6+6+2 = 14 noise evaluations per point (6 finite-difference evals for each warp density, plus 1 child eval each); chained `FastGradientWarp` costs only 1 warp eval per node, so ~3 total

**Why the factor is smaller on the inner warp:** The outer warp has already moved evaluation positions significantly. If the inner warp also has a large factor, the combination becomes chaotic noise with no readable structure. A 2:1 or 3:1 ratio (outer:inner factor) keeps the broad flow readable while the inner warp adds organic detail.

**Variations:**
- Three chained warps for extreme alien terrain — use factors `8 → 4 → 2` to keep each layer subordinate
- Make the outer warp 2D (`Is2D: true`) for horizontal twisting without vertical distortion, then let the inner warp be 3D for volumetric detail

---

## 2. Slope-Dependent Features (Gradient Node)

**What it looks like:** Terrain where steep surfaces look and behave differently from flat surfaces — snow only on gentle slopes, exposed rock on cliff faces, material transitions that follow the terrain's own slope rather than fixed depths.

**Why it's complex:** Most terrain decisions are driven by height (Y) or noise. Slope is a derived property — it requires measuring how quickly density *changes* across space, which is what the `Gradient` node does.

**The recipe:** `Gradient` with Axis `[0, 1, 0]` measures how fast density changes vertically. High gradient = rapidly changing = cliff. Low gradient = slowly changing = gentle slope. Use the output as a mix factor or material threshold.

```nodegraph
{
  "height": 220,
  "nodes": [
    { "id": "ter",  "label": "YSampled (terrain)", "category": "density", "sub": "full terrain",       "x": 0,   "y": 50 },
    { "id": "grad", "label": "Gradient",           "category": "density", "sub": "Axis Y Range 2",     "x": 240, "y": 50 },
    { "id": "nr",   "label": "Normalizer",         "category": "density", "sub": "[0,0.5]->[0,1]",     "x": 440, "y": 50 },
    { "id": "flat", "label": "Sum (flat terrain)", "category": "density", "sub": "gentle surface",     "x": 0,   "y": 150 },
    { "id": "cliff","label": "Sum (cliff detail)", "category": "density", "sub": "rocky face",         "x": 0,   "y": 220 },
    { "id": "mix",  "label": "Mix",                "category": "density", "sub": "slope blend",        "x": 620, "y": 135 },
    { "id": "out",  "label": "Terrain Out",        "category": "output",                               "x": 820, "y": 135 }
  ],
  "edges": [
    { "from": "ter",  "to": "grad" },
    { "from": "grad", "to": "nr",   "label": "slope value" },
    { "from": "nr",   "to": "mix",  "label": "0=flat 1=cliff" },
    { "from": "flat", "to": "mix",  "label": "A" },
    { "from": "cliff","to": "mix",  "label": "B" },
    { "from": "mix",  "to": "out" }
  ]
}
```

**Key parameters:**
- `Gradient` Axis: `[0, 1, 0]` (vertical), SampleRange`*`: `2.0` — measures the vertical density gradient; larger SampleRange = smoother slope detection, less sensitive to small features
- `Normalizer` FromMin: `0`, FromMax: `0.5` → ToMin: `0`, ToMax: `1` — remaps the gradient range into [0,1] for Mix; the FromMax value (0.5) is where "maximum cliff" is defined
- `Mix` A = flat terrain variant (smooth noise, low amplitude), B = cliff variant (high-amplitude noise, ridge noise with `Abs`)

**Important caveat:** `Gradient` evaluates the child density twice per point (finite difference). Don't evaluate `Gradient` on an expensive sub-tree without caching it first via `Exported`/`Imported` with `Cache`.

**Variations:**
- Use gradient output as a `MaterialProvider` threshold (not terrain density) to select cliff rock vs. surface grass without changing terrain shape
- Use Axis `[1, 0, 0]` or `[0, 0, 1]` for directional slope (south-facing vs north-facing hillsides)

---

## 3. Depth-Zoned Terrain (Switch / SwitchState)

**What it looks like:** Completely different terrain behavior at different depth bands — a normal surface above Y=40, a dense cave network between Y=10 and Y=40, and solid stone below Y=10. Hard transitions, not blends.

**Why it's complex:** `Mix` blends continuously. `Switch`/`SwitchState` selects *discretely* — exactly one input is active at each position, with no blending. This is useful when you need categorically different behavior per zone, not a gradient.

**The recipe:** `SwitchState` upstream sets which zone is active based on a `CurveMapper` → discrete value. `Switch` selects the matching terrain density.

```nodegraph
{
  "height": 280,
  "nodes": [
    { "id": "yv",    "label": "YValue",         "category": "density",  "sub": "raw Y",               "x": 0,   "y": 0 },
    { "id": "cm",    "label": "CurveMapper",    "category": "density",  "sub": "zone step curve",     "x": 200, "y": 0 },
    { "id": "ss",    "label": "SwitchState",    "category": "density",  "sub": "state = 'surface'",   "x": 400, "y": 0 },
    { "id": "surf",  "label": "Sum (surface)",  "category": "density",  "sub": "normal terrain Y>40", "x": 0,   "y": 120 },
    { "id": "cave",  "label": "Min (caves)",    "category": "density",  "sub": "Y 10-40",             "x": 0,   "y": 200 },
    { "id": "stone", "label": "Constant",       "category": "density",  "sub": "value 1.0",           "x": 0,   "y": 280 },
    { "id": "sw",    "label": "Switch",         "category": "density",  "sub": "3 cases",             "x": 600, "y": 140 },
    { "id": "out",   "label": "Terrain Out",    "category": "output",                                 "x": 800, "y": 140 }
  ],
  "edges": [
    { "from": "yv",    "to": "cm" },
    { "from": "cm",    "to": "ss",   "label": "zone id" },
    { "from": "ss",    "to": "sw",   "label": "state" },
    { "from": "surf",  "to": "sw",   "label": "input 0" },
    { "from": "cave",  "to": "sw",   "label": "input 1" },
    { "from": "stone", "to": "sw",   "label": "input 2" },
    { "from": "sw",    "to": "out" }
  ]
}
```

**Key parameters:**
- `CurveMapper` curve: a step function — flat regions at distinct output values that map to different states (e.g., output 0.0 = surface zone, 0.5 = cave zone, 1.0 = deep zone)
- `SwitchState`: each state string (e.g. `"surface"`, `"caves"`, `"deep"`) is hashed and compared by `Switch` — case strings must exactly match
- `Switch` SwitchCases: `[{State: "surface", InputIndex: 0}, {State: "caves", InputIndex: 1}, {State: "deep", InputIndex: 2}]`

**The tradeoff vs `Mix`:** `Switch` has no transition zone — the boundary between zones is a hard cut. This is intentional for depth zones (you don't want caves to fade into surface terrain), but it means you cannot use `Switch` where smooth transitions matter. Use it for categorically different behaviors (solid rock vs. open cave system vs. surface terrain), and use `Mix` everywhere transitions should be smooth.

**Variations:**
- Use `Amplitude` node (see section 5) instead of the depth zones for continuous Y-based amplitude scaling — less code, smoother result
- Add a thin `Mix`-blended transition layer between zones (evaluate both adjacent densities within a ±4 block band and blend) if the hard cut is visually jarring

---

## 4. Voronoi Terrain (Cell Wall Features)

**What it looks like:** Terrain shaped by Voronoi cell boundaries — river-like valleys running along cell edges, raised mounds at cell centers, or any feature that follows the natural seams of a Voronoi decomposition. Think of cracked earth, river networks, or continent coastlines following tectonic-plate-like boundaries.

**Why it's complex:** `CellNoise2D` with `ReturnType: Distance2Sub` populates the `distanceFromCellWall` context field. `CellWallDistance` reads it back. These two nodes must be in the right order in the graph — `CellNoise2D` must be evaluated before `CellWallDistance` can return a meaningful value.

**The recipe:** `CellNoise2D` (Distance2Sub return type) → feeds into terrain as a height source. `CellWallDistance` reads the wall distance and uses it to carve valleys along cell edges.

```nodegraph
{
  "height": 240,
  "nodes": [
    { "id": "cn",   "label": "CellNoise2D",     "category": "density",  "sub": "Scale 0.003 Dist2Sub","x": 0,   "y": 40 },
    { "id": "nr",   "label": "Normalizer",      "category": "density",  "sub": "remap to height",    "x": 220, "y": 40 },
    { "id": "bh",   "label": "BaseHeight",      "category": "density",  "sub": "Y = 60",             "x": 0,   "y": 130 },
    { "id": "sum",  "label": "Sum",             "category": "density",  "sub": "base terrain",       "x": 400, "y": 85 },
    { "id": "cwd",  "label": "CellWallDistance","category": "density",  "sub": "wall proximity",     "x": 0,   "y": 210 },
    { "id": "cm",   "label": "CurveMapper",     "category": "density",  "sub": "valley carve curve", "x": 200, "y": 210 },
    { "id": "smn",  "label": "SmoothMin",       "category": "density",  "sub": "radius 0.2",         "x": 580, "y": 150 },
    { "id": "ys",   "label": "YSampled",        "category": "density",  "sub": "step = 4",           "x": 760, "y": 150 },
    { "id": "out",  "label": "Terrain Out",     "category": "output",                                "x": 940, "y": 150 }
  ],
  "edges": [
    { "from": "cn",  "to": "nr" },
    { "from": "bh",  "to": "sum" },
    { "from": "nr",  "to": "sum",  "label": "cell height" },
    { "from": "sum", "to": "smn",  "label": "terrain" },
    { "from": "cwd", "to": "cm" },
    { "from": "cm",  "to": "smn",  "label": "valley" },
    { "from": "smn", "to": "ys" },
    { "from": "ys",  "to": "out" }
  ]
}
```

**Key parameters:**
- `CellNoise2D` ReturnType: `Distance2Sub` — this is the critical setting; it computes both the cell-center distance and the cell-wall distance (the difference between the nearest and second-nearest cell center distances), and writes the wall distance into context
- `CellNoise2D` Scale`*`: `0.003` — controls cell size; lower = larger cells = wider river networks
- `CellWallDistance` → `CurveMapper`: the curve maps wall-proximity to a carve depth; near zero (at the wall) maps to a large negative density (deep valley); further from the wall maps to 0 (no carve)
- `SmoothMin` radius: `0.2` — smooths the valley walls so they blend into surrounding terrain rather than cutting sharply

**Critical ordering note:** `CellNoise2D` must be evaluated before `CellWallDistance` in the graph. If `CellWallDistance` is evaluated at a position where `CellNoise2D` has not yet run, it returns `Double.MAX_VALUE` and the valley carve fails silently. In TerraNova, ensure the `CellNoise2D` node is upstream of `CellWallDistance` in the evaluation order.

**Variations:**
- Invert the valley curve to create ridges along cell walls instead of valleys (raised seams like cracked earth)
- Use cell center height (`CellNoise2D` with `Distance` return type) to create mesas that rise toward cell centers and drop off at edges

---

## 5. Altitude-Scaled Amplitude (Amplitude Node)

**What it looks like:** Terrain where noise amplitude changes continuously with height — rocky and rough near the surface, becoming smoother deeper down, or jagged peaks that intensify at higher altitudes. The detail level itself varies by elevation.

**Why it's complex:** `AmplitudeConstant` applies a fixed scale. `Amplitude` applies a scale that is itself a density function — you wire a `FunctionForY` (a 1D density evaluated only at the current Y) to control how the amplitude varies with elevation.

**The recipe:** `Amplitude` node wrapping the main noise, with a `CurveMapper` on `YValue` as the `FunctionForY`. The curve defines the amplitude envelope across the vertical range.

```nodegraph
{
  "height": 230,
  "nodes": [
    { "id": "sn",   "label": "SimplexNoise2D",  "category": "density",  "sub": "Scale 0.006 Oct 5",   "x": 0,   "y": 60 },
    { "id": "yv",   "label": "YValue",          "category": "density",  "sub": "for amplitude",       "x": 0,   "y": 155 },
    { "id": "cm",   "label": "CurveMapper",     "category": "density",  "sub": "amp envelope",        "x": 200, "y": 155 },
    { "id": "amp",  "label": "Amplitude",       "category": "density",  "sub": "FunctionForY",        "x": 380, "y": 100 },
    { "id": "bh",   "label": "BaseHeight",      "category": "density",  "sub": "Y = 64",              "x": 0,   "y": 0 },
    { "id": "sum",  "label": "Sum",             "category": "density",                                "x": 580, "y": 60 },
    { "id": "ys",   "label": "YSampled",        "category": "density",  "sub": "step = 4",            "x": 760, "y": 60 },
    { "id": "out",  "label": "Terrain Out",     "category": "output",                                 "x": 940, "y": 60 }
  ],
  "edges": [
    { "from": "sn",  "to": "amp",  "label": "input" },
    { "from": "yv",  "to": "cm" },
    { "from": "cm",  "to": "amp",  "label": "FunctionForY" },
    { "from": "bh",  "to": "sum" },
    { "from": "amp", "to": "sum",  "label": "scaled noise" },
    { "from": "sum", "to": "ys" },
    { "from": "ys",  "to": "out" }
  ]
}
```

**Key parameters:**
- `Amplitude` FunctionForY: the `CurveMapper` → `YValue` chain — this curve is sampled only at the current Y level (not per XZ), making it cheap
- `CurveMapper`\* curve shape: controls the amplitude profile
  - Rising with altitude → more surface roughness at height, smooth underground
  - Falling with altitude → rougher underground, smooth peaks (for clay-like or snow terrain)
  - S-shaped → roughness peaks at mid-elevation, smooths out at extremes
- The `Amplitude` output is `input × FunctionForY` — so the FunctionForY curve outputs a multiplier, not a density; values near `1.0` = full noise, near `0.0` = no noise

**Why not just multiply manually:** You could achieve a similar result with `Multiplier` using a `YValue → CurveMapper` as one input and noise as the other. `Amplitude` is semantically clearer and internally uses the same `FunctionForY` mechanism as `Offset`, making the intent explicit in the graph.

---

## 6. Directional Warp (VectorWarp)

**What it looks like:** Terrain distorted in a specific, controlled direction — features that lean or stretch in a particular direction rather than flowing organically. Wind-swept terrain where everything tilts east. Gravity-pulled overhangs that droop downward. Terrain compressed toward a point.

**Why it's complex:** `GradientWarp` and `FastGradientWarp` derive warp direction from noise gradients — the direction varies organically across space. `VectorWarp` uses an explicit direction from a `VectorProvider`, giving you deliberate control over which way positions are displaced.

**The recipe:** `VectorWarp` with a constant direction vector and a noise magnitude density. The direction is fixed; the magnitude varies per-position.

> **Preview gap — critical:** `VectorWarp` returns `0.0` in TerraNova's preview — directional distortion is completely invisible in the editor. Tune the base terrain without warping, then add `VectorWarp` and test in-game.

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "sn",   "label": "SimplexNoise2D",  "category": "density",  "sub": "Scale 0.008 Oct 2",  "x": 0,   "y": 50 },
    { "id": "bh",   "label": "BaseHeight",      "category": "density",  "sub": "Y = 64",             "x": 0,   "y": 140 },
    { "id": "sum",  "label": "Sum",             "category": "density",  "sub": "base terrain",       "x": 220, "y": 95 },
    { "id": "mag",  "label": "SimplexNoise2D",  "category": "density",  "sub": "Scale 0.004 Oct 1",  "x": 0,   "y": 220 },
    { "id": "nr",   "label": "Normalizer",      "category": "density",  "sub": "[−1,1]→[0,12]",     "x": 200, "y": 220 },
    { "id": "vw",   "label": "VectorWarp",      "category": "density",  "sub": "Dir (1,0.2,0)",      "x": 440, "y": 155 },
    { "id": "ys",   "label": "YSampled",        "category": "density",  "sub": "step = 4",           "x": 640, "y": 155 },
    { "id": "out",  "label": "Terrain Out",     "category": "output",                                "x": 820, "y": 155 }
  ],
  "edges": [
    { "from": "sn",  "to": "sum" },
    { "from": "bh",  "to": "sum" },
    { "from": "sum", "to": "vw",  "label": "child" },
    { "from": "mag", "to": "nr" },
    { "from": "nr",  "to": "vw",  "label": "magnitude" },
    { "from": "vw",  "to": "ys" },
    { "from": "ys",  "to": "out" }
  ]
}
```

**Key parameters:**
- `VectorWarp` Direction`*`: `(1, 0.2, 0)` — the warp direction; `(1, 0, 0)` = pure east lean, `(0, -1, 0)` = gravity droop, `(0.7, 0, 0.7)` = diagonal; the vector is normalized before use
- Magnitude `Normalizer`\* ToMax: `8–15` — the maximum displacement in blocks; `8` = subtle lean, `15` = dramatic overhanging features
- Magnitude noise Scale: `0.004`, Octaves: `1` — low detail is fine; you just want large areas of high/low warp, not a noisy magnitude

**Common effects by direction:**

| Direction | Effect |
|-----------|--------|
| `(1, 0, 0)` | Wind-swept lean eastward |
| `(0, -1, 0)` | Gravity droop — overhangs sag downward |
| `(1, 0.3, 0)` | Diagonal lean with slight upward bias |
| outward from center | Radial bulge — features push away from a point |
| inward toward center | Compression — features crowd toward a focal point |

**Variations:**
- Use `YValue → Normalizer` as magnitude to make the lean increase with altitude (wind gets stronger higher up)
- Combine with `FastGradientWarp` after `VectorWarp` — directional bias from VectorWarp, organic detail from FastGradientWarp

---

## 7. Overhang Terrain

**What it looks like:** Terrain with genuine 3D overhangs — solid material hanging out over empty space, like cliffs with a negative slope or mushroom-shaped rock formations. Impossible with heightmaps alone; requires true volumetric density.

**Why it's complex:** Overhangs cannot be generated by 2D noise (which defines a single height value per column). They require `SimplexNoise3D` to vary density independently in all three axes, plus specific shaping to push some density outward past its underlying column.

**The recipe:** A `GradientWarp` with `2D: false` on the terrain noise, combined with a strong horizontal warp component. The warp displaces sampling positions horizontally, causing density from one column to "reach over" into adjacent columns.

> **Preview gap — critical:** `GradientWarp` returns `0.0` in preview — overhangs are entirely invisible in the editor. Tune the base terrain (the `Sum` of `BaseHeight + SimplexNoise2D + SimplexNoise3D`) in preview until the underlying shape is correct, then add `GradientWarp` and test exclusively in-game.

```nodegraph
{
  "height": 250,
  "nodes": [
    { "id": "bh",   "label": "BaseHeight",      "category": "density",  "sub": "Y = 72",              "x": 0,   "y": 0 },
    { "id": "sn2",  "label": "SimplexNoise2D",  "category": "density",  "sub": "Scale 0.005 Oct 4",   "x": 0,   "y": 90 },
    { "id": "sn3",  "label": "SimplexNoise3D",  "category": "density",  "sub": "ScaleXZ 0.015 Oct 3", "x": 0,   "y": 170 },
    { "id": "sum",  "label": "Sum",             "category": "density",  "sub": "base terrain",        "x": 240, "y": 90 },
    { "id": "wn",   "label": "SimplexNoise3D",  "category": "density",  "sub": "ScaleXZ 0.006 Oct 2", "x": 0,   "y": 250 },
    { "id": "gw",   "label": "GradientWarp",    "category": "density",  "sub": "Factor 18 2D=false",  "x": 460, "y": 170 },
    { "id": "sc",   "label": "SmoothClamp",     "category": "density",  "sub": "Wall ±1.0 R 0.15",    "x": 660, "y": 170 },
    { "id": "ys",   "label": "YSampled",        "category": "density",  "sub": "step = 4",            "x": 860, "y": 170 },
    { "id": "out",  "label": "Terrain Out",     "category": "output",                                 "x": 1040,"y": 170 }
  ],
  "edges": [
    { "from": "bh",  "to": "sum" },
    { "from": "sn2", "to": "sum" },
    { "from": "sn3", "to": "sum" },
    { "from": "wn",  "to": "gw",  "label": "warp source" },
    { "from": "sum", "to": "gw",  "label": "child" },
    { "from": "gw",  "to": "sc" },
    { "from": "sc",  "to": "ys" },
    { "from": "ys",  "to": "out" }
  ]
}
```

**Key parameters:**
- `SimplexNoise3D` in the terrain sum: essential — this gives the terrain volumetric variation so overhangs can form at multiple heights in the same column
- `GradientWarp` WarpFactor`*`: `14–22` with `2D: false` — a high 3D WarpFactor pushes sampling positions significantly in all axes; horizontal displacement creates apparent overhangs
- `SmoothClamp`\* WallA/WallB: `−1.0/+1.0`, Range: `0.15` — clamps extreme warp outputs to keep the density field stable; without this, aggressive warping produces artifacts

**Why WarpFactor must be high:** Overhangs require horizontal displacement large enough that density sampled at (x+offset, y, z+offset) differs from density at (x, y, z) by enough to flip solid/air. This needs displacement of ~8–20 blocks horizontally to produce visible overhangs against the terrain's natural variation.

**Variations:**
- Reduce WarpFactor to `6–8` for subtle undercut cliffs (not full overhangs, but concave cliff faces)
- Add a `YValue → CurveMapper` depth mask multiplied into the warp magnitude to restrict overhangs to a specific elevation band

---

## 8. Multi-Scale Noise Stack

**What it looks like:** Terrain with detail at many scales simultaneously — continent-scale landforms, mountain-range-scale ridges, hill-scale bumps, and boulder-scale surface texture, all coherent and natural. The technique professional game worldgen uses for the most detailed terrain.

**Why it's complex:** The noise `Octaves` parameter stacks fixed multiples of frequency. Manual stacking lets you choose *exactly* which frequencies and amplitudes to combine — mixing 2D and 3D noise, using different seeds, adding domain warping only on specific scales.

**The recipe:** Three separate noise layers at explicitly chosen scales, each with its own weight, combined with `Sum`. Wrap the slow-varying layers in `YSampled`.

```nodegraph
{
  "height": 280,
  "nodes": [
    { "id": "bh",   "label": "BaseHeight",      "category": "density",  "sub": "Y = 64",              "x": 0,   "y": 0 },
    { "id": "n1",   "label": "SimplexNoise2D",  "category": "density",  "sub": "Scale 0.0015 Oct 2 A 0.6","x": 0, "y": 80 },
    { "id": "n2",   "label": "SimplexNoise2D",  "category": "density",  "sub": "Scale 0.007 Oct 3 A 0.25","x": 0, "y": 160 },
    { "id": "n3",   "label": "SimplexNoise3D",  "category": "density",  "sub": "ScaleXZ 0.03 Oct 2 A 0.1","x": 0, "y": 240 },
    { "id": "a1",   "label": "AmplitudeConstant","category": "density", "sub": "x 0.6",               "x": 220, "y": 80 },
    { "id": "a2",   "label": "AmplitudeConstant","category": "density", "sub": "x 0.25",              "x": 220, "y": 160 },
    { "id": "a3",   "label": "AmplitudeConstant","category": "density", "sub": "x 0.1",               "x": 220, "y": 240 },
    { "id": "sum",  "label": "Sum",             "category": "density",  "sub": "all layers",          "x": 420, "y": 140 },
    { "id": "ys",   "label": "YSampled",        "category": "density",  "sub": "step = 4",            "x": 600, "y": 140 },
    { "id": "out",  "label": "Terrain Out",     "category": "output",                                 "x": 780, "y": 140 }
  ],
  "edges": [
    { "from": "bh",  "to": "sum" },
    { "from": "n1",  "to": "a1" },
    { "from": "n2",  "to": "a2" },
    { "from": "n3",  "to": "a3" },
    { "from": "a1",  "to": "sum", "label": "broad" },
    { "from": "a2",  "to": "sum", "label": "mid" },
    { "from": "a3",  "to": "sum", "label": "fine" },
    { "from": "sum", "to": "ys" },
    { "from": "ys",  "to": "out" }
  ]
}
```

**Key parameters:**

| Layer | Scale | Octaves | Amplitude | Purpose |
|-------|-------|---------|-----------|---------|
| n1 (2D) | `0.0015` | 2 | `0.6` | Continental landform — the dominant large shape |
| n2 (2D) | `0.007` | 3 | `0.25` | Hill-scale detail — ridges and valleys within the continent |
| n3 (3D) | `0.03 XZ` | 2 | `0.1` | Surface roughness — small rocks and bumps; 3D for slight overhang capability |

**The amplitude ratios matter:** Each successive octave group should contribute less than the previous. A 0.6 : 0.25 : 0.10 ratio (roughly 6:2.5:1) gives broad structure that the finer layers decorate rather than overpower.

**Why mix 2D and 3D:** Using `SimplexNoise3D` only for the fine detail layer adds surface roughness without making the whole terrain volumetric (which would be expensive). The broad layers are 2D for performance; the detail layer is 3D for texture depth.

**Variations:**
- Add `GradientWarp` to only the broad layer (n1) for organic large-scale distortion while keeping fine detail crisp
- Make the amplitude ratios unequal (e.g. 0.8 : 0.15 : 0.05) for terrain dominated by massive smooth landforms with minimal detail — desert-like
- Make the ratios more equal (e.g. 0.4 : 0.35 : 0.25) for heavily textured, equally-chaotic-at-all-scales rocky badlands

---

## Complexity vs. Cost Reference

| Technique | Extra cost vs. basic terrain | Worth it when... |
|-----------|------------------------------|-----------------|
| Double domain warp | ~3× (FastGradientWarp) | You need extreme organic chaos |
| Gradient (slope detect) | 2× child cost | Materials or features depend on slope |
| Switch depth zones | ~1× (cheap branching) | You need categorically different per-depth behavior |
| CellWallDistance rivers | Moderate (CellNoise + CellWallDistance) | You want natural river/road networks |
| Amplitude node | Minimal (FunctionForY is 1D) | Noise intensity should vary with height |
| VectorWarp | Low–moderate | You need deliberate directional distortion |
| Overhang (3D GradientWarp) | High | Genuine overhangs are essential to the look |
| Manual multi-scale stack | Proportional to layer count | You need precise control over each frequency |

> **See also:** [Terrain Types and Node Recipes](./terrain-types.md) for the foundational terrain setups. [Node Combination Patterns](./node-combinations.md) for individual node building blocks. [Reference](../reference/README.md) for complete node type listings.
