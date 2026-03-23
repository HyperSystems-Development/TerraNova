# Guide: Terrain Types and Node Recipes

**Difficulty:** Beginner → Advanced

This guide is organized by **what terrain you want to make**, not by which nodes exist. Each section describes the visual result, explains why the node combination produces it, and gives you working parameters to start from.

> **Biome source assets:** `Examples/Example_CellNoise2D.json`, `Examples/Example_Curve_Mapper.json`, `Examples/Example_Mixer_Gradient.json`, `Experimental/Arches.json`, `Experimental/Dunes.json`, `Experimental/Mountains.json`, `Experimental/Plateaus.json`, `Generative/Generative_Arches.json`, `Generative/Generative_Pillars_Marble_Large.json`, `Generative/Generative_Veins.json`
>
> Source-backed sections below are grounded in those terrain assets from Hytale's `Examples/`, `Experimental/`, and `Generative/` biome folders. The floating-island and skylands sections are teaching recipes for editor work, not 1:1 transcriptions of one audited biome file.

If you are new, do not try to read the whole page in one pass. Start with:
1. **Flat Plains**
2. **Rolling Hills**
3. **Mountains**

Those three patterns teach the core terrain ideas used everywhere else: height anchor, noise variation, and shaping with curves.

For node wiring diagrams organized by pattern instead of outcome, see [Node Combination Patterns](../world/node-combinations.md).

Need a paste-ready starting point instead of a visual recipe? Open [Terrain Snippets](../../reference/terrain-types.md) in the docs pane for copyable JSON, `Copy Graph`, and `Open In Editor` actions.

---

## How to Read This Guide

Each terrain type shows:
- **What it looks like** — the visual result
- **The recipe** — which nodes to connect and in what order
- **Key parameters** — the specific values that control the outcome
- **Variations** — how to push the result in different directions

Parameters marked with `*` are the ones most worth tweaking first.

Beginner rule of thumb:
- change only one starred value at a time
- generate the preview after each change
- keep a working version before moving to the next section

---

## 1. Flat Plains

**What it looks like:** Gentle, near-flat terrain with very slight undulation. Low hills, wide valleys.

**Start here if:** You want the simplest possible terrain that still teaches the graph flow.

**The recipe:** `BaseHeight` → `Sum` → `Terrain Out`, with a low-amplitude `SimplexNoise2D` adding minimal variation.

> **Preview gap:** `BaseHeight` returns `0.0` in TerraNova's preview — terrain will appear anchored at Y=0 instead of your configured Y level. Workaround: temporarily replace `BaseHeight` with `Sum { Inputs: [YValue, Constant { Value: -64 }] }` while previewing, then restore `BaseHeight` before export.

```curve
Flat plains profile - almost flat, with only a small noise bump
[[0,0.95],[0.25,0.95],[0.5,0.9],[0.75,0.95],[1,0.95]]
```

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
  ],
  "steps": [
    { "nodeId": "bh", "text": "BaseHeight is your terrain anchor. It says where the ground level starts before any variation is added." },
    { "nodeId": "sn", "text": "SimplexNoise2D creates the horizontal variation. Keep it broad and gentle here - this is just enough noise to stop the ground feeling perfectly flat." },
    { "nodeId": "mul", "text": "Multiplier scales the noise down. This is one of the safest beginner controls: lower values make calmer land, higher values make rougher land." },
    { "nodeId": "sum", "text": "Sum combines the ground anchor and the small noise variation into one density result." },
    { "nodeId": "out", "text": "Terrain Out is the final terrain signal. If this graph looks right, you have a stable base to build from." }
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

**Start here if:** Flat plains work, but the world still feels too lifeless.

**The recipe:** `BaseHeight` + `CurveMapper` for the vertical profile, plus `SimplexNoise2D` for horizontal variation, combined with `Sum`. Wrap in `YSampled` for performance.

```curve
Rolling hills profile - gentle S curve with soft tops and valleys
[[0,1],[0.18,0.82],[0.38,0.35],[0.5,0],[0.62,-0.35],[0.82,-0.82],[1,-1]]
```

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
  ],
  "steps": [
    { "nodeId": "bh", "text": "BaseHeight still provides the vertical anchor. It keeps the terrain tied to a predictable surface level." },
    { "nodeId": "cm", "text": "CurveMapper is where the hills become intentional. A gentle S shape makes the ground ease into hills instead of jumping into cliffs." },
    { "nodeId": "sn", "text": "SimplexNoise2D decides where the hills and valleys happen across the map. Lower scale means broader hills." },
    { "nodeId": "sum", "text": "Sum merges the shaped height profile with the horizontal variation. This is the moment the terrain starts to feel natural." },
    { "nodeId": "ys", "text": "YSampled is the performance wrapper. It is a good default once the terrain shape already looks correct." },
    { "nodeId": "out", "text": "Terrain Out now holds a beginner-friendly production pattern: anchor, shape, vary, then optimize." }
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

**Start here if:** Rolling hills are working and you want stronger silhouettes instead of gentle landforms.

**The recipe:** Same structure as rolling hills, but with a much steeper CurveMapper, higher BaseHeight, and larger noise amplitude. Adding `Abs` on a second noise layer folds it into sharp ridges.

> **Preview gap:** `BaseHeight` returns `0.0` in TerraNova's preview. Replace with `Sum { Inputs: [YValue, Constant { Value: -80 }] }` while tuning, then restore before export.

```curve
Mountain profile - steep middle, flatter base and summit
[[0,1],[0.15,0.94],[0.35,0.45],[0.5,0],[0.63,-0.55],[0.82,-0.92],[1,-1]]
```

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
  ],
  "steps": [
    { "nodeId": "bh", "text": "BaseHeight raises the whole terrain so the mountains start from a higher world level." },
    { "nodeId": "cm", "text": "CurveMapper steepens the vertical profile. This is what changes the land from hills into cliffs and tall slopes." },
    { "nodeId": "sn", "text": "The first noise layer provides the large mountain mass. Think of it as the shape of the range." },
    { "nodeId": "abs", "text": "Abs folds a second noise layer so ridges become sharper and more broken instead of smooth." },
    { "nodeId": "amp", "text": "Multiplier controls how strongly those ridge details affect the final mountain. This is the knob to turn if the range feels too calm or too chaotic." },
    { "nodeId": "ys", "text": "YSampled keeps the more expensive terrain stack practical once the form is dialed in." },
    { "nodeId": "out", "text": "Terrain Out now gives you a mountain recipe that still follows the same beginner logic: anchor, shape, add detail, optimize." }
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

**Start here if:** You want flat playable tops with obvious cliff edges.

**The recipe:** A `CurveMapper` with a flat segment at the top (clamped curve) controls the height profile. `SmoothClamp` on the final density keeps the top surface flat without a hard edge.

> **Preview gap:** `BaseHeight` returns `0.0` in preview. Replace with `Sum { Inputs: [YValue, Constant { Value: -64 }] }` while tuning.

```curve
Mesa profile - strong rise into a flat plateau top
[[0,1],[0.2,0.95],[0.42,0.25],[0.55,0.05],[0.68,0],[0.82,0],[1,0]]
```

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
  ],
  "steps": [
    { "nodeId": "bh", "text": "BaseHeight provides the elevation the mesa grows from." },
    { "nodeId": "sn", "text": "SimplexNoise2D makes each mesa footprint different so the result does not look like a repeated shape." },
    { "nodeId": "cm", "text": "CurveMapper creates the steep wall and the flat top. This is the most important node in the setup." },
    { "nodeId": "sc", "text": "SmoothClamp gently enforces the top ceiling so the plateau stays usable and readable instead of becoming spiky." },
    { "nodeId": "out", "text": "Terrain Out gives you a terrain type that is easy to navigate and easy to recognize in preview." }
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

## 5. Floating Islands (SDF approach)

**What it looks like:** Chunks of terrain suspended in air, with nothing below. Classic fantasy or sky-world feel.

**The recipe:** An `Ellipsoid` SDF (with a `Curve` input) defines the island volume. `Max` intersects it with a `Plane` SDF (also requiring a `Curve` input) to cut off the bottom. `SimplexNoise2D` adds surface variation on top.

> [!IMPORTANT]
> Both `Ellipsoid` and `Plane` require a `Curve` node connection — this is a required input, not optional. Without it the node produces no output. Use a `CurveMapper` or a named curve asset as the curve source.

```curve
Floating island underside - rounded body with a trimmed bottom
[[0,1],[0.2,0.92],[0.45,0.64],[0.7,0.28],[0.88,0.08],[1,0]]
```

```nodegraph
{
  "height": 300,
  "nodes": [
    { "id": "ec",  "label": "CurveMapper",   "category": "filter",    "sub": "DistanceExponential", "x": 0,   "y": 0   },
    { "id": "el",  "label": "Ellipsoid",     "category": "density",   "sub": "Scale [200,60,200]",  "x": 220, "y": 0   },
    { "id": "pc",  "label": "CurveMapper",   "category": "filter",    "sub": "plane falloff",       "x": 0,   "y": 110 },
    { "id": "pl",  "label": "Plane",         "category": "density",   "sub": "Normal [0,1,0]",      "x": 220, "y": 110 },
    { "id": "mx",  "label": "Max",           "category": "density",   "sub": "intersect",           "x": 440, "y": 55  },
    { "id": "sn",  "label": "SimplexNoise2D","category": "density",   "sub": "Scale 0.01 Oct 3",    "x": 0,   "y": 220 },
    { "id": "nc",  "label": "Constant",      "category": "math",      "sub": "Value 0.15",          "x": 0,   "y": 280 },
    { "id": "mul", "label": "Multiplier",    "category": "math",      "sub": "× 0.15",              "x": 220, "y": 250 },
    { "id": "sum", "label": "Sum",           "category": "math",                                    "x": 600, "y": 140 },
    { "id": "out", "label": "Terrain Out",   "category": "output",                                  "x": 800, "y": 140 }
  ],
  "edges": [
    { "from": "ec",  "to": "el",  "label": "curve" },
    { "from": "el",  "to": "mx" },
    { "from": "pc",  "to": "pl",  "label": "curve" },
    { "from": "pl",  "to": "mx",  "label": "bottom cut" },
    { "from": "mx",  "to": "sum", "label": "island shape" },
    { "from": "sn",  "to": "mul" },
    { "from": "nc",  "to": "mul" },
    { "from": "mul", "to": "sum", "label": "surface detail" },
    { "from": "sum", "to": "out" }
  ],
  "steps": [
    { "nodeId": "ec",  "text": "The Ellipsoid curve input shapes how the signed distance maps to density. A convex exponential curve gives a smooth, rounded body — full density at the center, falling off gently toward the edge. The Curve is **required** — without it, Ellipsoid produces no output." },
    { "nodeId": "el",  "text": "Ellipsoid outputs a signed distance field: **negative inside** the ellipsoid bubble, positive outside. The Scale vector [200, 60, 200] sets the radii — 200 blocks wide, 60 blocks tall. Increasing Y makes a taller island; decreasing it makes a flatter disc." },
    { "nodeId": "pc",  "text": "The Plane curve input controls the density falloff at the cut plane. A linear ramp works well — 0 at the plane surface, increasing above. This is also **required** for Plane to produce output." },
    { "nodeId": "pl",  "text": "Plane outputs a signed distance from a horizontal surface. With PlaneNormal [0,1,0]: negative above the plane, positive below. We use this to cut the bottom off the island — anything below the plane will be forced to air by Max." },
    { "nodeId": "mx",  "text": "Max keeps the **larger** value at each point. Ellipsoid is negative inside (solid candidate); Plane is positive below the cut (air candidate). Max = air whenever **either** says air — you only get solid where you are inside the ellipsoid bubble AND above the plane cut. This intersection creates the flat-bottomed island shape." },
    { "nodeId": "mul", "text": "Multiplier scales the surface noise down by 0.15. This is the amplitude control — keep it small so the noise roughens the surface without punching through the SDF-defined island boundary." },
    { "nodeId": "sum", "text": "Sum adds the island SDF shape and the scaled surface noise. The SDF provides the overall volume; the noise roughens the top surface into a natural rocky terrain rather than a smooth dome." },
    { "nodeId": "out", "text": "A floating island: defined by mathematical SDF geometry for the body, with organic noise added to the surface. Scale the Ellipsoid, adjust the Plane position, and tweak noise amplitude independently." }
  ]
}
```

**Key parameters:**
- `Ellipsoid` `Scale`: `[200, 60, 200]` — controls island width and thickness as a vector3d; smaller Y = thinner disc, smaller X/Z = narrower footprint
- `Ellipsoid` `Curve`: required — shapes the SDF falloff from center to edge; a convex/exponential curve gives a smooth rounded underside
- `Plane` `PlaneNormal`: `[0, 1, 0]` — points straight up, creating a horizontal cut; tilt for angled undersides
- `Plane` `IsAnchored`: `false` — unanchored plane follows world origin; set `true` to anchor to a position
- `Plane` `Curve`: required — shapes the density at the plane surface; a linear ramp creates a sharp cut
- `Max` — keeps only points that are solid in *both* the ellipsoid AND above the plane; this is intersection logic
- Surface noise amplitude: `0.1–0.2` — small enough that it doesn't punch through the island edges

**Why `Max` creates the flat underside:** `Ellipsoid` is an SDF — negative inside, positive outside. `Plane` is also an SDF — negative above the plane, positive below. `Max` keeps the *larger* (more positive, more "outside") of the two. Anything below the plane (where Plane returns positive) gets overridden to be outside/air, cutting the bottom off the island.

**Variations:**
- Multiple ellipsoids combined with `Sum` or `SmoothMax` for clustered island chains
- Tilt the `Plane` `PlaneNormal` slightly (e.g. `[0.1, 1, 0]`) for angled undersides
- Add a `SimplexNoise3D` with `Inverter` + `Min` to hollow out caves underneath the island

---

## 5b. Skylands (Altitude Band Approach)

**What it looks like:** A world composed entirely of floating sky islands at specific altitude bands — solid terrain existing only within defined Y ranges, with open air above and below. Multiple island layers can exist at different heights.

This section is a teaching recipe for altitude-band sky terrain rather than a verbatim audited source biome.

> [!IMPORTANT]
> The key to this technique is `BaseHeight` with `Distance: true`. In distance mode, `BaseHeight` outputs the raw world Y coordinate minus the named height — a plain distance value, not a density gradient. This lets `CurveMapper` define a precise altitude band where terrain can exist.

**How it works:**

1. `BaseHeight` (Distance: true) at named height `"Base"` (Y=0) outputs the raw Y position
2. A `CurveMapper` with a Manual band curve maps Y→density: solid at Y≈110, air above Y≈210 and below Y≈-30
3. `SimplexNoise3D` adds 3D variation so islands have irregular edges and underbellies, not flat planes
4. A `Normalizer` stabilizes the sum of noise + band curve to a predictable [-1, 1] range
5. An optional second path adds an upper island ceiling band (Y≈240) via another `CurveMapper` × `Constant`, summed with the main path

```nodegraph
{
  "height": 340,
  "nodes": [
    { "id": "bh1",  "label": "BaseHeight",    "category": "density",  "sub": "Distance=true Base", "x": 0,   "y": 20  },
    { "id": "cm1",  "label": "CurveMapper",   "category": "filter",   "sub": "band: peak Y=110",   "x": 200, "y": 20  },
    { "id": "sn3",  "label": "SimplexNoise3D","category": "density",  "sub": "ScaleXZ=100 Oct=1",  "x": 0,   "y": 110 },
    { "id": "si",   "label": "Sum",           "category": "math",     "sub": "noise + band",       "x": 380, "y": 65  },
    { "id": "nr",   "label": "Normalizer",    "category": "filter",   "sub": "[-1,1]→[-1,1]",      "x": 560, "y": 65  },
    { "id": "bh2",  "label": "BaseHeight",    "category": "density",  "sub": "Distance=true Base", "x": 0,   "y": 220 },
    { "id": "cm2",  "label": "CurveMapper",   "category": "filter",   "sub": "band: peak Y=240",   "x": 200, "y": 220 },
    { "id": "con",  "label": "Constant",      "category": "density",  "sub": "Value 1",            "x": 200, "y": 290 },
    { "id": "mul",  "label": "Multiplier",    "category": "math",     "sub": "upper layer",        "x": 380, "y": 255 },
    { "id": "sum",  "label": "Sum",           "category": "math",     "sub": "combine layers",     "x": 720, "y": 150 },
    { "id": "out",  "label": "Terrain Out",   "category": "output",                                "x": 920, "y": 150 }
  ],
  "edges": [
    { "from": "bh1", "to": "cm1" },
    { "from": "cm1", "to": "si",  "label": "altitude band" },
    { "from": "sn3", "to": "si",  "label": "3D variation" },
    { "from": "si",  "to": "nr" },
    { "from": "nr",  "to": "sum", "label": "main layer" },
    { "from": "bh2", "to": "cm2" },
    { "from": "cm2", "to": "mul" },
    { "from": "con", "to": "mul" },
    { "from": "mul", "to": "sum", "label": "upper layer" },
    { "from": "sum", "to": "out" }
  ],
  "steps": [
    { "nodeId": "bh1", "text": "BaseHeight with **Distance: true** outputs the raw world Y coordinate minus the named height. At BaseHeightName=\"Base\" (Y=0), it simply outputs the world Y position. This is raw altitude — a plain number the band curve can work with directly." },
    { "nodeId": "cm1", "text": "The first CurveMapper defines the **main island altitude band**. Draw a Manual curve: -1 at Y=-30 (air below), +1 at Y≈110 (solid at peak), -1 at Y=210 (air above). Anything outside this window is forced to air by the negative output." },
    { "nodeId": "sn3", "text": "SimplexNoise3D varies in all three dimensions, breaking the flat slab the band curve alone would create. Where noise goes negative within the band, it cancels the positive band curve and creates holes — island edges, caves, and irregular undersides emerge naturally." },
    { "nodeId": "si",  "text": "Sum adds the band curve and the 3D noise. Within the altitude window the band curve is positive; the noise carves variation. The sum can reach ±2 — that is why Normalizer follows." },
    { "nodeId": "nr",  "text": "Normalizer clamps the inner Sum back to [-1, 1]. This is critical before adding the second island layer — without it the outer Sum could receive ±2, making the combined density unpredictable." },
    { "nodeId": "bh2", "text": "The second BaseHeight (also Distance: true) provides the same raw Y signal for the upper island layer. It feeds a different CurveMapper with a different peak altitude." },
    { "nodeId": "mul", "text": "Multiplier applies the second band curve scaled by Constant 1. This adds the upper island layer at full strength. Use a value less than 1 to make the upper layer a subtle secondary feature rather than a full second world layer." },
    { "nodeId": "sum", "text": "The outer Sum combines the normalized main layer and the upper island path. Each additional island layer is another BaseHeight(Distance) → CurveMapper → Multiplier path fed into this Sum." },
    { "nodeId": "out", "text": "Sky islands at multiple altitude bands. The main layer peaks around Y=110; the second layer around Y=240. Terrain exists only within those two altitude windows — everything else is open air." }
  ]
}
```

**Band curve shape (CurveMapper Manual points):**

The first CurveMapper defines where the main island layer exists:

| Y distance from Base | Output density | Meaning |
|---|---|---|
| −30 | −1 | Air far below |
| 110 | +1 | Solid at peak altitude |
| 210 | −1 | Air far above |

Draw a Manual curve that rises from −1 at −30, peaks at +1 around 110, then falls back to −1 at 210. Everything outside this range is air; the peak band is solid.

The second CurveMapper (upper layer, Multiplier path) peaks at Y≈240 in the range 200–280, creating a second island layer higher up.

**Key parameters:**
- `BaseHeight` `Distance: true`\* — **required** — without this, BaseHeight outputs a clamped density, not a raw Y position; the band curve would not work
- `BaseHeight` `BaseHeightName: "Base"`\* — references the named height defined in the WorldStructure JSON (typically `Y: 0` so Distance=raw Y)
- `SimplexNoise3D` ScaleXZ`*`: `100`, ScaleY: `50` — large scale gives broad island shapes; `Octaves: 1` keeps islands smooth rather than jagged
- `Normalizer` — stabilizes Sum output to `[-1, 1]`; prevents the noise + curve combination from pushing density too far positive or negative
- Second path `Constant Value: 1` — the Multiplier outputs the band curve × 1, which is just the band curve value; this creates the upper layer additive contribution

**Why `SimplexNoise3D` and not `SimplexNoise2D`:** 2D noise varies only horizontally — you'd get flat slab islands with identical cross-sections at every X/Z position. 3D noise varies vertically too, so islands have irregular, organic undersides and tops, with holes and overhangs where the noise dips negative within the altitude band.

**Why `Normalizer` wraps the inner `Sum`:** The inner `Sum` of `SimplexNoise3D` (±1) and the band curve (±1) can reach ±2. Without normalization, the outer `Sum` combining both layers could push values well beyond ±2, making the density field hard to reason about and potentially blowing out cave carving or material selection downstream.

**Variations:**
- Add more island bands at different altitudes by repeating the `BaseHeight(Distance) → CurveMapper → Multiplier(Constant)` path and summing
- Carve caves through the islands with the standard `SimplexNoise3D → Inverter → Min` pattern outside the island density
- Add surface materials using the `DownwardSpace` / `UpwardSpace` providers to detect grass tops and cave ceilings
- Use a biome map (`Imported` density from a separate biome graph) to spatially restrict which island bands appear where

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
  ],
  "steps": [
    { "nodeId": "terrain", "text": "The terrain Sum is all the surface nodes — BaseHeight, CurveMapper, noise, whatever you have built above. This entire subgraph feeds into YSampled before meeting the cave carver." },
    { "nodeId": "ys",      "text": "YSampled wraps the terrain and evaluates it every 4 Y blocks, interpolating between samples. Apply it here — before the cave Min — so the expensive terrain nodes only run at coarse Y intervals." },
    { "nodeId": "sn3",     "text": "SimplexNoise3D generates the raw cave shape. Using ScaleXZ 0.02 and ScaleY 0.03 means caves are slightly shorter than they are wide — a more natural tunnel proportion than a perfect sphere." },
    { "nodeId": "sc",      "text": "SmoothClamp constrains the 3D noise to a band around ±0.3. Values inside the band stay nearly flat; values outside are pulled toward the walls. This creates a defined tunnel cross-section: the clamped flat zone will become the cave void after inversion." },
    { "nodeId": "inv",     "text": "Inverter flips the sign. The flat zone that SmoothClamp created (near 0) becomes a strong negative value — the void. The original solid regions (outside the clamped zone) become positive — which Min will ignore in favor of the solid terrain." },
    { "nodeId": "mn",      "text": "Min keeps whichever value is **smaller** at each point. Where terrain is solid (+) but the cave mask is negative, the cave wins — a hole is carved. Where terrain is already air, it stays air. The cave shape comes entirely from the noise; the boundary just decides where it carves." },
    { "nodeId": "out",     "text": "Caves carved through solid terrain. The cave size is controlled by SmoothClamp wall values. The cave density and frequency are controlled by SimplexNoise3D scale and octaves." }
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
  ],
  "steps": [
    { "nodeId": "cave", "text": "The cave mask is the output of the previous Inverter — a negative density field shaped like tunnels. On its own it would carve caves at every Y level including the surface. We need to suppress it near the surface." },
    { "nodeId": "yv",   "text": "YValue reads the raw world Y coordinate at each point. At bedrock (Y=0) it outputs 0; at sea level (Y=64) it outputs 64. This is the input the depth gate CurveMapper will work with." },
    { "nodeId": "cm",   "text": "CurveMapper turns Y into a depth weight from 0 to 1. Shape the curve: 0 everywhere above Y=50 (no caves near surface), ramping from 0→1 between Y=50 and Y=20, then flat at 1 below Y=20 (full caves at depth). The exact ramp shape controls how gradual the cave fade-in is." },
    { "nodeId": "mul",  "text": "Multiplier gates the cave mask by the depth weight. Near the surface where depth weight=0, the cave mask is zeroed out — no carving. At depth where weight=1, the full cave mask passes through unchanged. The cave mask is negative, so multiplying by a 0–1 weight scales its magnitude without flipping sign." },
    { "nodeId": "mn",   "text": "Min carves the depth-gated cave mask into the terrain. Now caves only appear where the depth weight is non-zero — deep underground. The surface stays intact." },
    { "nodeId": "out",  "text": "Terrain with depth-faded caves. Near the surface: no caves, full terrain. Underground: progressively more caves as Y decreases. The fade-in depth and sharpness are controlled entirely by the CurveMapper curve shape." }
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
  ],
  "steps": [
    { "nodeId": "wn",  "text": "The warp source noise drives the displacement direction. Its value at each point [-1, +1] is multiplied by WarpFactor to produce an XZ offset in world units. Low Scale (0.003) gives sweeping, broad bends — high Scale gives tight curls and spirals." },
    { "nodeId": "gw",  "text": "GradientWarp reads the warp source and **moves the sampling point** before evaluating its child. WarpFactor=8 means a noise value of +0.5 shifts the sample 4 blocks in one direction. The terrain downstream never sees the real world position — only the displaced one. **Important:** GradientWarp returns 0.0 in the editor preview — the warp effect only appears in-game." },
    { "nodeId": "bh",  "text": "BaseHeight provides the vertical anchor as usual, but is not warped — only the horizontal noise variation is displaced. This keeps the overall ground level stable while the surface texture twists." },
    { "nodeId": "sum", "text": "Sum combines the warped surface noise with the unwarped height anchor. The resulting density field has organic, flowing features because the noise contribution is evaluated at twisted coordinates." },
    { "nodeId": "ys",  "text": "YSampled wraps the entire Sum including the GradientWarp path for performance. Tune the unwarped terrain to your desired shape in the preview, then add GradientWarp and test in-game only." },
    { "nodeId": "out", "text": "Warped organic terrain. Ridges curve and fold; valley floors meander. The underlying density math is unchanged — only the sampling coordinates were twisted." }
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
    { "id": "wn",   "label": "SimplexNoise2D", "category": "density", "sub": "Scale 0.008 Oct 2",   "x": 0,   "y": 0 },
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
  ],
  "steps": [
    { "nodeId": "wn",  "text": "The warp source is a 2D noise that drives the cave twist. Keep its Scale low (0.008) so the warp produces broad meanders rather than tight spirals. The warp only displaces the 3D cave noise — not the terrain." },
    { "nodeId": "sn3", "text": "SimplexNoise3D generates the raw cave shape in 3D. On its own it would produce straight-ish tunnels. GradientWarp will bend the coordinates it samples from, giving the tunnels organic curves." },
    { "nodeId": "gw",  "text": "GradientWarp receives both the warp source (displacement direction) and the cave noise (what to evaluate). With 2D=false, it warps all three axes — so caves twist vertically as well as horizontally, producing organic overhangs and dead-end pockets. **Preview gap:** the warp is invisible in the editor." },
    { "nodeId": "sc",  "text": "SmoothClamp shapes the warped cave noise into a defined tunnel cross-section. The flat zone at ±0.3 becomes the void volume after inversion. Narrow walls make thin passages; wide walls make broad chambers." },
    { "nodeId": "inv", "text": "Inverter flips the clamped noise: the flat void zone becomes strongly negative (empty). This is the final cave mask — a negative density field in the exact shape of the tunnels we want to carve." },
    { "nodeId": "ter", "text": "The existing terrain (YSampled surface) passes into SmoothMin unchanged. It provides the solid terrain density that the cave mask will carve into." },
    { "nodeId": "smn", "text": "SmoothMin keeps the smaller (emptier) value — carving caves — but blends the join with radius 0.15. Hard Min would leave a geometric seam where the cave wall meets the terrain. SmoothMin rounds that seam into a gradual transition, like the terrain was worn down to the cave." },
    { "nodeId": "out", "text": "Organic warped cave tunnels with smooth wall joins. The warp factor controls how dramatically tunnels bend; SmoothClamp walls control tunnel diameter; SmoothMin radius controls how gradual the cave mouth transitions are." }
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
  ],
  "steps": [
    { "nodeId": "bh",  "text": "BaseHeight sets the overall terrain elevation. Dunes in deserts tend to be low, so use a modest base Y (around 60–64)." },
    { "nodeId": "sn1", "text": "The first noise is **anisotropic** — ScaleX 0.004, ScaleZ 0.012. The 3:1 ratio makes noise features elongated east-west. In terrain this means ridges run north-south, with gentle crossings east-west — the directional grain of a dune field blowing from one direction." },
    { "nodeId": "sn2", "text": "The second noise reverses the ratio — ScaleX 0.012, ScaleZ 0.004. Its ridges run east-west. Mixing these two perpendicular grain directions creates the crossed, organic dune pattern seen in real desert terrain from above." },
    { "nodeId": "mix", "text": "Mix blends the two grain directions at factor 0.5 — equal parts. Bias toward one direction (e.g. factor 0.3) to give dunes a stronger prevailing orientation. The factor can also come from a slow noise field to vary the dune direction across the world." },
    { "nodeId": "mul", "text": "Multiplier scales the blended dune noise by Constant 0.35. This controls dune height — the amplitude of the ripple pattern. Too high and they look like mountains; too low and the terrain is nearly flat." },
    { "nodeId": "sum", "text": "Sum adds the BaseHeight anchor and the scaled dune noise. The result is a terrain that sits at the base elevation with anisotropic, directional variation." },
    { "nodeId": "out", "text": "Desert dunes: directional, smooth, with a characteristic elongated feel. Adjust the ScaleX/ScaleZ ratios to change the dune orientation; adjust the Multiplier Constant for dune height." }
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
  ],
  "steps": [
    { "nodeId": "cn",  "text": "CellNoise2D (Voronoi) divides the XZ plane into irregular cells. Each cell has a distinct center, and the output is the distance to the nearest center — so each cell \"rises\" from 0 at its center to higher values at its edges. Low Scale (0.002) makes large, island-sized cells." },
    { "nodeId": "nr",  "text": "Normalizer maps the CellNoise output to [0, 1]. Cell centers produce low values (0); cell edges and far regions produce high values (near 1). After normalization, cell centers are clean 0s — the perfect anchor for an island presence mask." },
    { "nodeId": "cm",  "text": "CurveMapper creates the island mask. Draw a step curve: output 0 for most of [0, 1], then rising sharply near 1.0. This means: most cells (the large flat areas) are ocean (mask=0); only the cells near a Voronoi edge peak (where the CellNoise value is high) produce islands (mask=1)." },
    { "nodeId": "sc",  "text": "Multiplier scales the surface noise by Constant 0.2 to keep islands at a modest height. This is the terrain texture that will appear only on island cells." },
    { "nodeId": "mul", "text": "Multiplier multiplies the island mask by the surface noise. Where mask=0 (ocean), the result is 0 — flat ocean floor. Where mask=1 (island), the full noise value passes through, creating terrain height." },
    { "nodeId": "sum", "text": "Sum adds the BaseHeight anchor (sets sea level) and the masked terrain noise (islands only). Ocean areas = BaseHeight only (flat ocean floor). Island areas = BaseHeight + noise (elevated island terrain)." },
    { "nodeId": "out", "text": "An archipelago: many distinct islands of varying shape, surrounded by ocean. Island spacing is controlled by CellNoise Scale; island coverage by the CurveMapper step threshold; island height by the noise Constant." }
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
  ],
  "steps": [
    { "nodeId": "sel",    "text": "The selector noise uses a very low Scale (0.0008) — broad enough that each terrain-style region spans hundreds of blocks. This is the world's biome-scale variation driver." },
    { "nodeId": "nr",     "text": "Normalizer maps the selector noise from [-1,1] to [0,1], turning it into a valid Mix factor. 0 = full plains; 1 = full mountains; 0.5 = equal blend in the transition band." },
    { "nodeId": "plains", "text": "The plains terrain subgraph — a gentle BaseHeight + low-amplitude noise stack. This entire subgraph is the \"A\" input to Mix. It evaluates at every position but only contributes where the selector says \"plains\"." },
    { "nodeId": "mts",    "text": "The mountains terrain subgraph — higher BaseHeight, steep CurveMapper, Abs ridge noise. This is the \"B\" input. Both A and B evaluate everywhere; Mix blends them by the spatial selector factor." },
    { "nodeId": "mix",    "text": "Mix blends plains and mountains using the normalized selector. In the transition zone (factor 0.3–0.7) both contribute — the terrain morphs smoothly from plains to mountains without a seam. The transition width is controlled by the selector noise Scale." },
    { "nodeId": "ys",     "text": "YSampled wraps the surface Mix — the expensive part (both terrain subgraphs evaluate inside it). Caves don't need YSampled since they use fewer octaves and no CurveMapper." },
    { "nodeId": "sn3",    "text": "SimplexNoise3D generates cave shapes. This runs outside the YSampled wrapper so caves carve through the optimized surface — the cave density is evaluated fresh at every block, not interpolated." },
    { "nodeId": "inv",    "text": "Inverter flips cave noise to negative, carving into the solid terrain. SmoothClamp before this step ensures caves have defined walls rather than fuzzy gradients." },
    { "nodeId": "smn",    "text": "SmoothMin is the final combining node — it takes the YSampled surface and carves caves through it using the smooth blend. The result passes unchanged where there are no caves, and transitions into cave voids with rounded joins." },
    { "nodeId": "out",    "text": "The complete layered terrain: plains and mountains driven by a selector, smoothly blended, caves carved through both with smooth walls. Each piece is independently tunable." }
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
| Floating islands (SDF) | `Ellipsoid` + `Plane` + `Max` |
| Skylands / altitude bands | `BaseHeight(Distance:true)` → `CurveMapper` band curve + `SimplexNoise3D` → `Normalizer` |
| Simple caves | `SimplexNoise3D` + `SmoothClamp` + `Inverter` + `Min` |
| Caves that fade at surface | + `YValue` + `CurveMapper` depth gate |
| Organic / flowing terrain | Wrap noise in `GradientWarp` |
| Organic cave tunnels | Warp cave noise + `SmoothMin` instead of `Min` |
| Directional dunes | Anisotropic `SimplexNoise2D` (unequal X/Z scale) |
| Island chains | `CellNoise2D` → `Normalizer` → `CurveMapper` mask |
| Multi-style terrain | Low-freq selector → `Mix` between two terrain graphs |

> **Next steps:** [Node Combination Patterns](../world/node-combinations.md) shows the individual building blocks behind each recipe. [Understanding Basic Terrain Generation](../understanding-basic-terrain-generation.md) covers density fundamentals if any of the concepts here are unclear.
