# Guide: Terrain Types and Node Recipes

**Difficulty:** Beginner → Advanced

This guide is organized by **what terrain you want to make**, not by which nodes exist. Each section describes the visual result, explains why the node combination produces it, and gives you working parameters to start from.

For node wiring diagrams organized by pattern instead of outcome, see [Node Combination Patterns](./node-combinations.md).

---

## How to Read This Guide

Each terrain type shows:
- **What it looks like** — the visual result
- **The recipe** — which nodes to connect and in what order
- **Key parameters** — the specific values that control the outcome
- **Variations** — how to push the result in different directions

Parameters marked with `*` are the ones most worth tweaking first.

---

## 1. Flat Plains

**What it looks like:** Gentle, near-flat terrain with very slight undulation. Low hills, wide valleys.

**The recipe:** `BaseHeight` → `Sum` → `Terrain Out`, with a low-amplitude `SimplexNoise2D` adding minimal variation.

> **Preview gap:** `BaseHeight` returns `0.0` in TerraNova's preview — terrain will appear anchored at Y=0 instead of your configured Y level. Workaround: temporarily replace `BaseHeight` with `Sum { Inputs: [YValue, Constant { Value: -64 }] }` while previewing, then restore `BaseHeight` before export.

```nodegraph
{
  "height": 160,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",    "category": "density",   "sub": "Y = 64",        "x": 0,   "y": 40 },
    { "id": "sn",  "label": "SimplexNoise2D","category": "density",   "sub": "Scale 0.008",   "x": 0,   "y": 120 },
    { "id": "c",   "label": "Constant",     "category": "density",   "sub": "Value 0.1",     "x": 0,   "y": 185 },
    { "id": "mul", "label": "Multiplier",   "category": "density",   "sub": "× 0.1",         "x": 200, "y": 145 },
    { "id": "sum", "label": "Sum",          "category": "density",                            "x": 380, "y": 80 },
    { "id": "out", "label": "Terrain Out",  "category": "output",                             "x": 560, "y": 80 }
  ],
  "edges": [
    { "from": "bh",  "to": "sum" },
    { "from": "sn",  "to": "mul" },
    { "from": "c",   "to": "mul" },
    { "from": "mul", "to": "sum", "label": "× 0.1" },
    { "from": "sum", "to": "out" }
  ]
}
```

**Key parameters:**
- `BaseHeight` Y: `64` — the base surface level
- `SimplexNoise2D` Scale`*`: `0.008` — lower = broader, smoother undulation
- `Constant Value` (Multiplier scale)\*: `0.1` — controls how much height variation there is; `0.05` is nearly flat, `0.2` starts to feel hilly

**Variations:**
- Remove the noise entirely for a perfectly flat debug surface
- Increase amplitude to `0.3–0.4` and you have rolling meadows
- Use `Scale: 0.003` with amplitude `0.15` for very wide, lazy hills

---

## 2. Rolling Hills

**What it looks like:** Classic overworld terrain — moderate hills and valleys with smooth transitions, no sharp features.

**The recipe:** `BaseHeight` + `CurveMapper` for the vertical profile, plus `SimplexNoise2D` for horizontal variation, combined with `Sum`. Wrap in `YSampled` for performance.

```nodegraph
{
  "height": 210,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",    "category": "density",   "sub": "Y = 64",           "x": 0,   "y": 20 },
    { "id": "cm",  "label": "CurveMapper",   "category": "density",   "sub": "S-curve profile",  "x": 200, "y": 20 },
    { "id": "sn",  "label": "SimplexNoise2D","category": "density",   "sub": "Scale 0.005 Oct 4","x": 0,   "y": 140 },
    { "id": "sum", "label": "Sum",           "category": "density",                               "x": 400, "y": 80 },
    { "id": "ys",  "label": "YSampled",      "category": "density",   "sub": "SampleDistance 4",          "x": 580, "y": 80 },
    { "id": "out", "label": "Terrain Out",   "category": "output",                                "x": 760, "y": 80 }
  ],
  "edges": [
    { "from": "bh",  "to": "cm" },
    { "from": "cm",  "to": "sum", "label": "profile" },
    { "from": "sn",  "to": "sum", "label": "variation" },
    { "from": "sum", "to": "ys" },
    { "from": "ys",  "to": "out" }
  ]
}
```

**Key parameters:**
- `SimplexNoise2D` Scale`*`: `0.005`, Octaves: `4`, Persistence: `0.5` — gives broad hills with natural detail layering
- `CurveMapper`: draw a gentle S-curve — the input is the height offset, the output is the density; a steeper S produces more defined hilltops and valley floors
- `YSampled` `SampleDistance`: `4` — safe default; increase to `8` if performance is critical, but visual smoothing becomes noticeable above `8`

**Variations:**
- `Scale: 0.003` → wider, more gradual hills
- `Scale: 0.01`, `Octaves: 6` → tighter, more varied terrain with visible small ridges
- Flatten the CurveMapper at the top to create plateaus that cut off hill peaks

---

## 3. Mountains

**What it looks like:** Tall, dramatic terrain with sharp peaks, steep slopes, and exposed rock faces. High amplitude variation.

**The recipe:** Same structure as rolling hills, but with a much steeper CurveMapper, higher BaseHeight, and larger noise amplitude. Adding `Abs` on a second noise layer folds it into sharp ridges.

> **Preview gap:** `BaseHeight` returns `0.0` in TerraNova's preview. Replace with `Sum { Inputs: [YValue, Constant { Value: -80 }] }` while tuning, then restore before export.

```nodegraph
{
  "height": 260,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",    "category": "density",   "sub": "Y = 80",             "x": 0,   "y": 0 },
    { "id": "cm",  "label": "CurveMapper",   "category": "density",   "sub": "steep cliff profile", "x": 200, "y": 0 },
    { "id": "sn",  "label": "SimplexNoise2D","category": "density",   "sub": "Scale 0.004 Oct 5",   "x": 0,   "y": 110 },
    { "id": "sn2", "label": "SimplexNoise2D","category": "density",   "sub": "Scale 0.012 Oct 3",   "x": 0,   "y": 200 },
    { "id": "abs", "label": "Abs",           "category": "density",   "sub": "ridge folds",         "x": 200, "y": 200 },
    { "id": "rc",  "label": "Constant",      "category": "density",   "sub": "Value 0.4",           "x": 200, "y": 265 },
    { "id": "amp", "label": "Multiplier",    "category": "density",   "sub": "× 0.4",               "x": 380, "y": 230 },
    { "id": "sum", "label": "Sum",           "category": "density",                                  "x": 560, "y": 100 },
    { "id": "ys",  "label": "YSampled",      "category": "density",   "sub": "SampleDistance 4",             "x": 740, "y": 100 },
    { "id": "out", "label": "Terrain Out",   "category": "output",                                   "x": 920, "y": 100 }
  ],
  "edges": [
    { "from": "bh",  "to": "cm" },
    { "from": "cm",  "to": "sum", "label": "profile" },
    { "from": "sn",  "to": "sum", "label": "base hills" },
    { "from": "sn2", "to": "abs" },
    { "from": "abs", "to": "amp" },
    { "from": "rc",  "to": "amp" },
    { "from": "amp", "to": "sum", "label": "ridges" },
    { "from": "sum", "to": "ys" },
    { "from": "ys",  "to": "out" }
  ]
}
```

**Key parameters:**
- `BaseHeight` Y`*`: `80–100` — raises the whole terrain before noise
- `CurveMapper`: steep S-curve, or even a curve that rises sharply then flattens — creates distinct bases and summits
- Base noise Scale: `0.004`, Octaves: `5`, Persistence: `0.5` — broad mountainous forms
- Ridge noise Scale`*`: `0.012`, Octaves: `3` — `Abs` folds it to create sharp ridgelines
- Ridge `Constant Value` (Multiplier scale)\*: `0.3–0.5` — controls how prominent the ridges are relative to the base shape

**Why `Abs` makes ridges:** `Abs` folds all negative noise values to positive — it takes the absolute value of Simplex noise output. A smooth valley at −0.6 becomes a spike at +0.6. Wherever noise crosses zero, there is now a sharp peak. Applied at a higher frequency, this creates the jagged ridgeline silhouette of mountain ranges.

**Variations:**
- Remove `Abs` for smoother, dome-like mountains
- Add a second warp pass (see Warped/Organic section) for Alps-style twisted peaks
- Use `Pow` after `Abs` to exaggerate peaks further: `Abs → Pow(2.0)` creates very sharp needle-like spires

---

## 4. Mesas and Plateaus

**What it looks like:** Flat-topped elevated landforms with steep cliff walls dropping to lower surrounding terrain. Desert or highland feel.

**The recipe:** A `CurveMapper` with a flat segment at the top (clamped curve) controls the height profile. `SmoothClamp` on the final density keeps the top surface flat without a hard edge.

> **Preview gap:** `BaseHeight` returns `0.0` in preview. Replace with `Sum { Inputs: [YValue, Constant { Value: -64 }] }` while tuning.

```nodegraph
{
  "height": 220,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",     "category": "density",  "sub": "Y = 64",             "x": 0,   "y": 20 },
    { "id": "sn",  "label": "SimplexNoise2D", "category": "density",  "sub": "Scale 0.006 Oct 4",  "x": 0,   "y": 120 },
    { "id": "sum", "label": "Sum",            "category": "density",                               "x": 240, "y": 70 },
    { "id": "cm",  "label": "CurveMapper",    "category": "density",  "sub": "plateau profile",    "x": 420, "y": 70 },
    { "id": "sc",  "label": "SmoothClamp",    "category": "density",  "sub": "WallB 0.8 Range 0.1","x": 600, "y": 70 },
    { "id": "out", "label": "Terrain Out",    "category": "output",                                "x": 800, "y": 70 }
  ],
  "edges": [
    { "from": "bh",  "to": "sum" },
    { "from": "sn",  "to": "sum" },
    { "from": "sum", "to": "cm" },
    { "from": "cm",  "to": "sc" },
    { "from": "sc",  "to": "out" }
  ]
}
```

**Key parameters:**
- `CurveMapper`: draw a curve that rises steeply then flattens completely at a high value — the flat top is the plateau surface, the steep rise is the cliff face
- `SmoothClamp`\* WallB: `0.8`, Range: `0.1` — clamps the upper density with a smooth shoulder; WallB is where the ceiling kicks in, Range is how soft the transition is
- `SimplexNoise2D` Scale: `0.006` — broad enough to create distinct mesa shapes, not just noisy bumps

**Why SmoothClamp creates flat tops:** `SmoothClamp` limits density to a maximum (WallB) with a smooth approach rather than a hard cutoff. Any terrain that would rise above WallB is gently pulled back down to it, flattening the top. The cliff faces form wherever the terrain rises quickly toward that ceiling.

**Variations:**
- Remove `SmoothClamp` and rely purely on the CurveMapper flat segment — harder edges but more control
- Use `Constant` noise (very low amplitude) for perfectly flat mesa tops
- Stack two `SmoothClamp` nodes for a stepped mesa with two levels

---

## 5. Floating Islands

**What it looks like:** Chunks of terrain suspended in air, with nothing below. Classic fantasy or sky-world feel.

**The recipe:** An `Ellipsoid` SDF defines the island volume. `Max` intersects it with a `Plane` SDF to cut off the bottom. `SimplexNoise2D` adds surface variation on top.

```nodegraph
{
  "height": 260,
  "nodes": [
    { "id": "el",  "label": "Ellipsoid",     "category": "density",   "sub": "r 200,60,200",   "x": 0,   "y": 0 },
    { "id": "pl",  "label": "Plane",         "category": "density",   "sub": "Y base cut",     "x": 0,   "y": 100 },
    { "id": "mx",  "label": "Max",           "category": "density",   "sub": "intersect",      "x": 260, "y": 50 },
    { "id": "sn",  "label": "SimplexNoise2D","category": "density",   "sub": "Scale 0.01 Oct 3","x": 0,  "y": 190 },
    { "id": "sc",  "label": "Constant",      "category": "density",   "sub": "Value 0.15",      "x": 0,  "y": 255 },
    { "id": "mul", "label": "Multiplier",    "category": "density",   "sub": "× 0.15",          "x": 200, "y": 220 },
    { "id": "sum", "label": "Sum",           "category": "density",                             "x": 440, "y": 120 },
    { "id": "out", "label": "Terrain Out",   "category": "output",                              "x": 640, "y": 120 }
  ],
  "edges": [
    { "from": "el",  "to": "mx" },
    { "from": "pl",  "to": "mx", "label": "bottom cut" },
    { "from": "mx",  "to": "sum", "label": "island shape" },
    { "from": "sn",  "to": "mul" },
    { "from": "sc",  "to": "mul" },
    { "from": "mul", "to": "sum", "label": "surface detail" },
    { "from": "sum", "to": "out" }
  ]
}
```

**Key parameters:**
- `Ellipsoid`\* radii: `X=200, Y=60, Z=200` — controls island width and thickness; smaller Y = thinner disc
- `Plane` height: set to cut the bottom half of the ellipsoid, leaving a rounded top and flat underside
- `Max` — keeps only points that are solid in *both* the ellipsoid AND above the plane; this is intersection logic
- Surface noise amplitude: `0.1–0.2` — small enough that it doesn't punch through the island edges

**Why `Max` creates the flat underside:** `Ellipsoid` is an SDF — negative inside, positive outside. `Plane` is also an SDF — negative above the plane, positive below. `Max` keeps the *larger* (more positive, more "outside") of the two. Anything below the plane (where Plane returns positive) gets overridden to be outside/air, cutting the bottom off the island.

**Variations:**
- Multiple ellipsoids combined with `Sum` or `SmoothMax` for clustered island chains
- Vary Y radius per island using different `Ellipsoid` sizes in a `Weighted` prop
- Add a `SimplexNoise3D` with `Inverter` + `Min` to hollow out caves underneath the island

---

## 6. Caves (Simple)

**What it looks like:** Underground hollow tunnels carved through otherwise solid terrain, varying in size and direction.

**The recipe:** Generate terrain normally with `Sum`. Then carve caves by creating an inverted 3D noise mask and using `Min` to keep only solid areas not claimed by the cave mask.

```nodegraph
{
  "height": 240,
  "nodes": [
    { "id": "terrain", "label": "Sum (terrain)", "category": "density",  "sub": "from above",      "x": 0,   "y": 40 },
    { "id": "ys",      "label": "YSampled",      "category": "density",  "sub": "SampleDistance 4",        "x": 200, "y": 40 },
    { "id": "sn3",     "label": "SimplexNoise3D","category": "density",  "sub": "ScaleXZ 0.02 Oct 3","x": 0, "y": 160 },
    { "id": "sc",      "label": "SmoothClamp",   "category": "density",  "sub": "Wall ±0.3 R 0.1", "x": 200, "y": 160 },
    { "id": "inv",     "label": "Inverter",      "category": "density",  "sub": "flip to carve",   "x": 380, "y": 160 },
    { "id": "mn",      "label": "Min",           "category": "density",  "sub": "carve terrain",   "x": 520, "y": 100 },
    { "id": "out",     "label": "Terrain Out",   "category": "output",                             "x": 700, "y": 100 }
  ],
  "edges": [
    { "from": "terrain", "to": "ys" },
    { "from": "ys",      "to": "mn",  "label": "terrain" },
    { "from": "sn3",     "to": "sc" },
    { "from": "sc",      "to": "inv" },
    { "from": "inv",     "to": "mn",  "label": "cave mask" },
    { "from": "mn",      "to": "out" }
  ]
}
```

**Key parameters:**
- `SimplexNoise3D` ScaleXZ`*`: `0.02`, ScaleY: `0.03`, Octaves: `3` — separate XZ and Y scale lets tunnels be flatter than they are wide; higher ScaleY = more vertical variation
- `SmoothClamp`\* WallA: `−0.3`, WallB: `0.3`, Range: `0.1` — this shapes the cave cross-section; narrowing the walls (e.g. ±0.2) makes thinner tunnels, widening (±0.5) makes large voids
- `Inverter` — flips the clamped noise so the flat ±0.3 zone becomes negative (empty), carving the tunnel volume out

**Why SmoothClamp before Inverter:** Raw 3D noise produces density that fades gradually from peak to trough. Without clamping, the cave void would be a fuzzy gradient rather than a defined tunnel. `SmoothClamp` creates a flat plateau in the noise where caves will form (the clamped zone becomes a uniform negative after inversion), giving caves distinct walls rather than gradual fades.

**Variations:**
- Add a `YValue → CurveMapper` depth mask and multiply it with the cave result to fade caves out near the surface (see advanced caves below)
- Use `SmoothMin` instead of `Min` to round the carve joint where cave meets terrain wall
- Increase ScaleXZ to `0.04` for tight winding passages; decrease to `0.008` for massive caverns

---

## 7. Caves with Depth Fade

**What it looks like:** Caves that only appear below a certain Y level — surface terrain remains solid, caves become common deeper underground.

**The recipe:** Take the cave mask from above. Multiply it by a `CurveMapper` driven by `YValue` that outputs 0 near the surface and 1 at depth.

```nodegraph
{
  "height": 220,
  "nodes": [
    { "id": "cave",  "label": "Inverter (cave mask)", "category": "density", "sub": "from above",        "x": 0,   "y": 60 },
    { "id": "yv",    "label": "YValue",               "category": "density", "sub": "raw Y",             "x": 0,   "y": 160 },
    { "id": "cm",    "label": "CurveMapper",          "category": "density", "sub": "0 at Y>40, 1 below","x": 200, "y": 160 },
    { "id": "mul",   "label": "Multiplier",           "category": "density", "sub": "depth gate",        "x": 380, "y": 110 },
    { "id": "mn",    "label": "Min",                  "category": "density", "sub": "carve",             "x": 560, "y": 80 },
    { "id": "out",   "label": "Terrain Out",          "category": "output",                              "x": 740, "y": 80 }
  ],
  "edges": [
    { "from": "cave", "to": "mul",  "label": "cave mask" },
    { "from": "yv",   "to": "cm" },
    { "from": "cm",   "to": "mul",  "label": "depth weight" },
    { "from": "mul",  "to": "mn",   "label": "gated caves" },
    { "from": "mn",   "to": "out" }
  ]
}
```

**Key parameters:**
- `CurveMapper`\* curve shape: flat at 0 from Y=255 down to Y≈50, then ramp from 0 to 1 between Y=50 and Y=20, then flat at 1 below Y=20 — this is the depth gate
- `Multiplier` — scales the cave mask by the depth weight; near the surface where depth weight = 0, the cave mask is zeroed out and cannot carve

**Variations:**
- Use `Normalizer` instead of `CurveMapper` for a simple linear fade: `FromMin=20, FromMax=50, ToMin=1.0, ToMax=0.0`
- Add a second fade at great depth (below Y=10) to close caves near bedrock

---

## 8. Organic / Warped Terrain

**What it looks like:** Terrain that flows, bends, and meanders. No straight ridgelines. Looks like it was carved by wind or water over time rather than generated mathematically.

**The recipe:** Use `GradientWarp` to displace the evaluation coordinates of a noise field using a second noise field's gradient. The child noise is evaluated at a twisted position, making all features curve and fold.

> **Preview gap — critical:** `GradientWarp` returns `0.0` in TerraNova's preview. The warped terrain shape is entirely absent in the editor. Build and tune the unwarped child terrain first, confirm it looks right in preview, then add `GradientWarp` and test exclusively in-game. See [Expert Terrain Techniques](./terrain-types-expert.md#6-preview-vs-runtime-what-youre-not-seeing) for the full list of affected nodes.

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "wn",  "label": "SimplexNoise2D", "category": "density",  "sub": "Scale 0.003 Oct 2", "x": 0,   "y": 50 },
    { "id": "gw",  "label": "GradientWarp",   "category": "density",  "sub": "Factor 8 Range 2",  "x": 220, "y": 50 },
    { "id": "bh",  "label": "BaseHeight",     "category": "density",  "sub": "Y = 64",            "x": 420, "y": 0 },
    { "id": "sum", "label": "Sum",            "category": "density",                               "x": 600, "y": 60 },
    { "id": "ys",  "label": "YSampled",       "category": "density",  "sub": "SampleDistance 4",          "x": 780, "y": 60 },
    { "id": "out", "label": "Terrain Out",    "category": "output",                                "x": 960, "y": 60 }
  ],
  "edges": [
    { "from": "wn",  "to": "gw",  "label": "warp direction" },
    { "from": "gw",  "to": "sum", "label": "warped noise" },
    { "from": "bh",  "to": "sum", "label": "height" },
    { "from": "sum", "to": "ys" },
    { "from": "ys",  "to": "out" }
  ]
}
```

**Key parameters:**
- Warp noise Scale`*`: `0.003–0.008` — the warp source frequency; lower = broad sweeping curves, higher = tight curls
- `GradientWarp` WarpFactor`*`: `4–12` — how far positions are displaced in world units; `4` is subtle, `12` is dramatic twisting
- `GradientWarp` SampleRange: `2.0` — the finite-difference step used to estimate the gradient; usually leave at `2.0`
- `2D: true` — warps only the XZ plane, keeping vertical density consistent (good for surface terrain); `2D: false` twists all three axes (good for caves and 3D features)

**Variations:**
- Chain two `GradientWarp` nodes (warp the warp) for extreme organic chaos — best used sparingly
- Use `FastGradientWarp` instead for ~2.5× better performance at the cost of slightly different visual characteristics
- Warp the cave noise instead of the surface noise for twisted, organic tunnel systems (see advanced caves)

---

## 9. Warped Caves (Organic Tunnels)

**What it looks like:** Cave tunnels that twist and meander organically. No straight sections. Intersections form smooth merged voids rather than angular joints.

**The recipe:** Take the simple cave setup, but wrap the cave noise in `GradientWarp` before clamping and inverting. Then use `SmoothMin` instead of hard `Min` to round the joint between cave walls and terrain.

> **Preview gap — critical:** `GradientWarp` returns `0.0` in preview — the cave warp will be completely invisible. Tune cave shape and depth fade without warping, then add `GradientWarp` and validate in-game only.

```nodegraph
{
  "height": 260,
  "nodes": [
    { "id": "wn",   "label": "SimplexNoise3D", "category": "density", "sub": "Scale 0.008 Oct 2",   "x": 0,   "y": 0 },
    { "id": "sn3",  "label": "SimplexNoise3D", "category": "density", "sub": "ScaleXZ 0.015 Oct 3", "x": 0,   "y": 100 },
    { "id": "gw",   "label": "GradientWarp",   "category": "density", "sub": "Factor 8 2D=false",   "x": 220, "y": 50 },
    { "id": "sc",   "label": "SmoothClamp",    "category": "density", "sub": "Wall ±0.3 R 0.05",    "x": 440, "y": 50 },
    { "id": "inv",  "label": "Inverter",       "category": "density", "sub": "flip to hollow",      "x": 620, "y": 50 },
    { "id": "ter",  "label": "YSampled (terrain)","category": "density","sub": "full terrain",       "x": 0,   "y": 200 },
    { "id": "smn",  "label": "SmoothMin",      "category": "density", "sub": "radius 0.15",         "x": 800, "y": 125 },
    { "id": "out",  "label": "Terrain Out",    "category": "output",                                 "x": 980, "y": 125 }
  ],
  "edges": [
    { "from": "wn",  "to": "gw",  "label": "warp source" },
    { "from": "sn3", "to": "gw",  "label": "cave noise" },
    { "from": "gw",  "to": "sc" },
    { "from": "sc",  "to": "inv" },
    { "from": "inv", "to": "smn", "label": "cave mask" },
    { "from": "ter", "to": "smn", "label": "terrain" },
    { "from": "smn", "to": "out" }
  ]
}
```

**Key parameters:**
- Cave noise ScaleXZ`*`: `0.015`, ScaleY: `0.02` — the slight difference makes tunnels wider than they are tall (more natural)
- Warp noise Scale: `0.008`, Octaves: `2` — low-frequency warp for broad meanders
- `GradientWarp` WarpFactor`*`: `6–10` — how much the tunnels bend; `6` gives gentle curves, `10` gives tight switchbacks
- `SmoothMin` radius`*`: `0.1–0.2` — the blending width where cave meets terrain wall; higher = rounder, more dissolved joins

**Why `SmoothMin` instead of `Min`:** Hard `Min` creates a visible seam — a crease in the density field — exactly where the cave surface meets the terrain surface. `SmoothMin` rounds that join with a polynomial blend, producing a smooth transition that looks like the terrain was eroded into the cave rather than cut.

---

## 10. Desert / Dunes

**What it looks like:** Smooth rolling forms with a distinctive elongated, directional feel. Less random than normal hills — dunes have a preferred orientation.

**The recipe:** Use anisotropic noise by scaling X and Z differently. A `SimplexNoise2D` with different X and Z scales produces elliptical noise blobs — the directional "grain" of dune fields. Layer two at perpendicular angles and mix them.

```nodegraph
{
  "height": 220,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",    "category": "density",  "sub": "Y = 62",             "x": 0,   "y": 20 },
    { "id": "sn1", "label": "SimplexNoise2D","category": "density",  "sub": "ScaleX 0.004 ScaleZ 0.012","x": 0, "y": 120 },
    { "id": "sn2", "label": "SimplexNoise2D","category": "density",  "sub": "ScaleX 0.012 ScaleZ 0.004","x": 0, "y": 200 },
    { "id": "mix", "label": "Mix",      "category": "density",  "sub": "factor 0.5",   "x": 260, "y": 160 },
    { "id": "dc",  "label": "Constant", "category": "density",  "sub": "Value 0.35",   "x": 440, "y": 225 },
    { "id": "mul", "label": "Multiplier","category": "density", "sub": "× 0.35",       "x": 440, "y": 160 },
    { "id": "sum", "label": "Sum",      "category": "density",                         "x": 620, "y": 90 },
    { "id": "out", "label": "Terrain Out","category": "output",                        "x": 820, "y": 90 }
  ],
  "edges": [
    { "from": "bh",  "to": "sum" },
    { "from": "sn1", "to": "mix", "label": "A" },
    { "from": "sn2", "to": "mix", "label": "B" },
    { "from": "mix", "to": "mul" },
    { "from": "dc",  "to": "mul" },
    { "from": "mul", "to": "sum" },
    { "from": "sum", "to": "out" }
  ]
}
```

**Key parameters:**
- `sn1` ScaleX`*`: `0.004`, ScaleZ: `0.012` — elongated in one axis; the 3:1 ratio gives the directional dune feel
- `sn2` reverses that ratio: ScaleX `0.012`, ScaleZ `0.004` — the cross-grain noise
- `Mix` factor: `0.5` — blends both grain directions equally; bias toward one for a stronger prevailing direction
- `Constant Value` (Multiplier scale)\*: `0.25–0.4` — dune height; too high and they look like mountains

**Variations:**
- Use just one grain direction (remove mix, use only `sn1`) for stark, aligned dune ridges
- Add a very low amplitude `SimplexNoise2D` (Scale `0.02`, amplitude `0.05`) on top for small surface ripples
- Wrap the whole thing in `SmoothClamp` with a high ceiling to keep dunes from getting too tall at their peaks

---

## 11. Archipelago (Multiple Islands)

**What it looks like:** A world composed of many separate islands of varying size, surrounded by ocean. No single landmass.

**The recipe:** Use `CellNoise2D` (Voronoi noise) to create a natural division of space into regions. Combine with height and noise to make each Voronoi cell rise into an island.

```nodegraph
{
  "height": 240,
  "nodes": [
    { "id": "cn",  "label": "CellNoise2D",   "category": "density",  "sub": "Scale 0.002",       "x": 0,   "y": 60 },
    { "id": "nr",  "label": "Normalizer",    "category": "density",  "sub": "[-1,1]->[0,1]",     "x": 200, "y": 60 },
    { "id": "cm",  "label": "CurveMapper",   "category": "density",  "sub": "island cutoff",     "x": 380, "y": 60 },
    { "id": "bh",  "label": "BaseHeight",    "category": "density",  "sub": "Y = 62",            "x": 0,   "y": 160 },
    { "id": "sn",  "label": "SimplexNoise2D","category": "density",  "sub": "Scale 0.01 Oct 3",  "x": 0,   "y": 230 },
    { "id": "ac",  "label": "Constant",     "category": "density",  "sub": "Value 0.2",         "x": 0,   "y": 295 },
    { "id": "sc",  "label": "Multiplier",   "category": "density",  "sub": "× 0.2",             "x": 200, "y": 260 },
    { "id": "mul", "label": "Multiplier",   "category": "density",  "sub": "mask × terrain",    "x": 560, "y": 130 },
    { "id": "sum", "label": "Sum",           "category": "density",                               "x": 720, "y": 130 },
    { "id": "out", "label": "Terrain Out",   "category": "output",                                "x": 900, "y": 130 }
  ],
  "edges": [
    { "from": "cn",  "to": "nr" },
    { "from": "nr",  "to": "cm" },
    { "from": "cm",  "to": "mul", "label": "island mask" },
    { "from": "bh",  "to": "sum" },
    { "from": "sn",  "to": "sc" },
    { "from": "ac",  "to": "sc" },
    { "from": "sc",  "to": "mul", "label": "terrain noise" },
    { "from": "mul", "to": "sum", "label": "masked terrain" },
    { "from": "sum", "to": "out" }
  ]
}
```

**Key parameters:**
- `CellNoise2D` Scale`*`: `0.002` — controls island spacing; lower = bigger islands farther apart, higher = smaller islands packed together
- `CurveMapper` curve`*`: step function — near-zero output for most of the 0–1 range, then rising sharply near 1.0; this makes most space ocean and only the Voronoi "peaks" become islands
- `Multiplier` — uses the island mask (0 = ocean, 1 = island) to zero out terrain noise everywhere except island cells; this keeps ocean areas flat

**Variations:**
- Replace `CellNoise2D` with `SimplexNoise2D` at very low frequency (`Scale: 0.0008`) for continent-shaped landmasses with irregular coastlines
- Add a sea-level clamp (`SmoothClamp` WallB: just below 0) to create consistent ocean floors below the island

---

## 12. Complex Layered Terrain

**What it looks like:** A terrain system with multiple simultaneous features — mountains in some areas, plains in others, caves throughout, and distinct surface detail — driven by a single density graph.

**The recipe:** This is a full production stack. A master noise at very low frequency drives a `Mix` between two terrain styles. Both styles feed into a shared cave carve. `YSampled` wraps the expensive surface layer.

```nodegraph
{
  "height": 320,
  "nodes": [
    { "id": "sel",  "label": "SimplexNoise2D", "category": "density",  "sub": "Scale 0.0008 selector","x": 0,   "y": 0 },
    { "id": "nr",   "label": "Normalizer",     "category": "density",  "sub": "[-1,1]->[0,1]",        "x": 200, "y": 0 },
    { "id": "plains","label": "Sum (plains)",  "category": "density",  "sub": "BaseHeight+noise",     "x": 0,   "y": 110 },
    { "id": "mts",  "label": "Sum (mountains)","category": "density",  "sub": "high amp ridges",      "x": 0,   "y": 200 },
    { "id": "mix",  "label": "Mix",            "category": "density",  "sub": "biome blend",          "x": 380, "y": 110 },
    { "id": "ys",   "label": "YSampled",       "category": "density",  "sub": "SampleDistance 4",             "x": 560, "y": 110 },
    { "id": "sn3",  "label": "SimplexNoise3D", "category": "density",  "sub": "ScaleXZ 0.02 Oct 3",   "x": 0,   "y": 290 },
    { "id": "sc",   "label": "SmoothClamp",    "category": "density",  "sub": "Wall ±0.3 R 0.1",      "x": 200, "y": 290 },
    { "id": "inv",  "label": "Inverter",       "category": "density",  "sub": "cave mask",            "x": 380, "y": 290 },
    { "id": "smn",  "label": "SmoothMin",      "category": "density",  "sub": "radius 0.15",          "x": 720, "y": 200 },
    { "id": "out",  "label": "Terrain Out",    "category": "output",                                   "x": 920, "y": 200 }
  ],
  "edges": [
    { "from": "sel",   "to": "nr" },
    { "from": "nr",    "to": "mix",  "label": "0-1 factor" },
    { "from": "plains","to": "mix",  "label": "A" },
    { "from": "mts",   "to": "mix",  "label": "B" },
    { "from": "mix",   "to": "ys" },
    { "from": "ys",    "to": "smn",  "label": "surface" },
    { "from": "sn3",   "to": "sc" },
    { "from": "sc",    "to": "inv" },
    { "from": "inv",   "to": "smn",  "label": "caves" },
    { "from": "smn",   "to": "out" }
  ]
}
```

**Key parameters:**
- Selector Scale`*`: `0.0008` — very low frequency so terrain type regions are very large; increase to `0.003` for smaller, patchier biome zones
- `Mix` factor source (the `Normalizer` output) — drives smooth interpolation between plains and mountain density; at 0 = pure plains, at 1 = pure mountains, in between = blended transition zone
- `YSampled` wraps only the surface mix (not the cave carve) — caves are cheaper since they use fewer octaves and don't need interpolation

**What `SmoothMin` does at the end:** The surface is positive = solid. The cave mask is negative where caves exist. `SmoothMin` keeps the smaller (more hollow) value — carving caves — but with a smooth join. Where there are no caves, the surface density passes through unchanged.

---

## Choosing the Right Approach

| I want... | Key nodes |
|-----------|-----------|
| Flat/gentle terrain | `BaseHeight` + low-amplitude `SimplexNoise2D` |
| Natural rolling hills | + `CurveMapper` + `YSampled` |
| Mountains with ridges | + `Abs` on a second noise layer |
| Flat-topped mesas | + `SmoothClamp` as a ceiling |
| Floating islands | `Ellipsoid` + `Plane` + `Max` |
| Simple caves | `SimplexNoise3D` + `SmoothClamp` + `Inverter` + `Min` |
| Caves that fade at surface | + `YValue` + `CurveMapper` depth gate |
| Organic / flowing terrain | Wrap noise in `GradientWarp` |
| Organic cave tunnels | Warp cave noise + `SmoothMin` instead of `Min` |
| Directional dunes | Anisotropic `SimplexNoise2D` (unequal X/Z scale) |
| Island chains | `CellNoise2D` → `Normalizer` → `CurveMapper` mask |
| Multi-style terrain | Low-freq selector → `Mix` between two terrain graphs |

> **Next steps:** [Node Combination Patterns](./node-combinations.md) shows the individual building blocks behind each recipe. [Understanding Basic Terrain Generation](./understanding-basic-terrain-generation.md) covers density fundamentals if any of the concepts here are unclear.
