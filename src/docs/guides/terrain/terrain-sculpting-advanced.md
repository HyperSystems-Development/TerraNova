# Guide: Terrain Sculpting and Transition Patterns

**Difficulty:** Advanced

This guide covers shaping, blending, and transitioning terrain at boundaries — the techniques that make worlds feel continuous rather than tiled. Each section addresses a specific sculpting problem.

Prerequisites: comfortable with `BaseHeight`, `Sum`, `CurveMapper`, `Mix`, `SimplexNoise2D/3D`, `Min`/`Max`, `GradientWarp`/`FastGradientWarp`, and `YSampled`. See [Complex Terrain Techniques](./terrain-types-advanced.md) for earlier advanced techniques.

---

## 1. Smooth Biome-Edge Blending (Distance-Weighted Mix)

**What it looks like:** Two terrain types — plains and mountains, for example — that transition through a natural gradient zone rather than meeting at a hard edge. The transition moves slightly with each seed and meanders organically.

**Why it's complex:** Simply placing two `BaseHeight` + noise setups side by side and connecting them to a `Mix` produces a razor-sharp boundary at the selector midpoint. Natural biome transitions need a wide blend zone with organic edge noise.

**The recipe:** A low-frequency `SimplexNoise2D` selector drives `Mix`. A second, medium-frequency noise layer adds wobble to the selector value before it reaches `Mix`.

```nodegraph
{
  "height": 300,
  "nodes": [
    { "id": "sel",  "label": "SimplexNoise2D", "category": "density",  "sub": "Scale 0.0006 Oct 1",   "x": 0,   "y": 0   },
    { "id": "edg",  "label": "SimplexNoise2D", "category": "density",  "sub": "Scale 0.003 Oct 2",    "x": 0,   "y": 80  },
    { "id": "ec",   "label": "Constant",       "category": "math",     "sub": "Value 0.18",           "x": 0,   "y": 145 },
    { "id": "em",   "label": "Multiplier",     "category": "math",     "sub": "edge wobble × 0.18",   "x": 200, "y": 110 },
    { "id": "esum", "label": "Sum",            "category": "math",     "sub": "selector + wobble",    "x": 380, "y": 50  },
    { "id": "nr",   "label": "Normalizer",     "category": "density",  "sub": "[−1,1]→[0,1]",        "x": 560, "y": 50  },
    { "id": "ta",   "label": "Sum (plains)",   "category": "density",  "sub": "BaseHeight + low noise","x": 0,  "y": 220 },
    { "id": "tb",   "label": "Sum (mountains)","category": "density",  "sub": "high amp + ridges",    "x": 0,  "y": 300 },
    { "id": "mix",  "label": "Mix",            "category": "density",  "sub": "blend A→B",            "x": 740, "y": 170 },
    { "id": "ys",   "label": "YSampled",       "category": "density",  "sub": "SampleDistance 4",     "x": 940, "y": 170 },
    { "id": "out",  "label": "Terrain Out",    "category": "output",                                  "x": 1120,"y": 170 }
  ],
  "edges": [
    { "from": "sel",  "to": "esum" },
    { "from": "edg",  "to": "em" },
    { "from": "ec",   "to": "em" },
    { "from": "em",   "to": "esum", "label": "wobble" },
    { "from": "esum", "to": "nr" },
    { "from": "nr",   "to": "mix",  "label": "selector" },
    { "from": "ta",   "to": "mix",  "label": "A (plains)" },
    { "from": "tb",   "to": "mix",  "label": "B (mountains)" },
    { "from": "mix",  "to": "ys" },
    { "from": "ys",   "to": "out" }
  ]
}
```

**Key parameters:**
- `sel` Scale: `0.0006` — determines zone size; very low frequency = continent-scale biome regions; `0.002` = regional patches
- `edg` Scale: `0.003` — edge wobble frequency; 5× the selector frequency so it creates fine meanders along the broad boundary
- `ec` `Value`: `0.18` — how far the edge noise pushes the selector; higher = wider, more irregular transition band; `0.05` = near-sharp boundary, `0.35` = very wide blend zone
- `Normalizer` maps `[-1, 1]` → `[0, 1]` because `Mix` expects a 0–1 blend factor

> [!TIP]
> Run the selector noise through a `CurveMapper` with an S-curve before `Mix` to create sharper transitions with a still-organic edge shape — this gives defined biome centers that snap to their style rather than fading continuously.

**Variations:**
- Chain two `Mix` nodes to create a three-zone transition: A → blend → B → blend → C, with two separate selectors
- Use a warped selector (`FastGradientWarp` on `sel`) for strongly organic zone boundaries

---

## 2. Terrain Terracing (Quantized Height Bands)

**What it looks like:** Terrain that steps up in distinct horizontal shelves — Aztec pyramid shapes, stepped cliffs, or geological strata visible as ledges.

**Why it's complex:** Naive rounding of the density field breaks the continuity guarantees `YSampled` relies on. The correct approach quantizes the coordinate-space height signal rather than the density output, using a `CurveMapper` with a staircase curve.

**The recipe:** Compress the Y coordinate with `Scale`, pass through a `CurveMapper` drawn as a staircase, sum back into the terrain density.

```nodegraph
{
  "height": 240,
  "nodes": [
    { "id": "base", "label": "Sum (terrain)",   "category": "density", "sub": "from noise stack",    "x": 0,   "y": 0   },
    { "id": "yv",   "label": "YValue",          "category": "density", "sub": "raw Y",               "x": 0,   "y": 120 },
    { "id": "ysc",  "label": "Scale",           "category": "density", "sub": "ScaleY 0.05",         "x": 200, "y": 120 },
    { "id": "stair","label": "CurveMapper",     "category": "filter",  "sub": "staircase 4-step",    "x": 380, "y": 120 },
    { "id": "sc",   "label": "Constant",        "category": "math",    "sub": "Value 0.6",           "x": 380, "y": 195 },
    { "id": "smul", "label": "Multiplier",      "category": "math",    "sub": "stair weight × 0.6",  "x": 560, "y": 155 },
    { "id": "sum",  "label": "Sum",             "category": "math",    "sub": "terrain + stair",     "x": 720, "y": 60  },
    { "id": "ys",   "label": "YSampled",        "category": "density", "sub": "SampleDistance 4",    "x": 900, "y": 60  },
    { "id": "out",  "label": "Terrain Out",     "category": "output",                                "x": 1080,"y": 60  }
  ],
  "edges": [
    { "from": "base",  "to": "sum" },
    { "from": "yv",    "to": "ysc" },
    { "from": "ysc",   "to": "stair" },
    { "from": "stair", "to": "smul" },
    { "from": "sc",    "to": "smul" },
    { "from": "smul",  "to": "sum",  "label": "stair modifier" },
    { "from": "sum",   "to": "ys" },
    { "from": "ys",    "to": "out" }
  ]
}
```

**Key parameters:**
- `Scale` `ScaleY`: `0.05` — `1/0.05 = 20` blocks per terrace band; `0.1` = 10-block terraces, `0.025` = 40-block terraces
- `CurveMapper` curve shape: draw horizontal plateau segments at each step level (e.g., flat at -0.5, jump to 0, flat, jump to 0.5, flat, jump to 1.0) — the flat parts of the curve create the shelves
- `sc` `Value`: `0.6` — how much the staircase pulls the terrain; `1.0` = fully terraced, `0.3` = subtle stair hints, terrain retains much of its original organic shape

> [!NOTE]
> Place `YSampled` **outside** the staircase branch. The staircase creates very fast density changes at step transitions. Interpolating inside those transitions distorts the step geometry.

**Variations:**
- Add a `SimplexNoise2D` offset to the `YValue` before `Scale` to make terrace edges irregular (different elevations in different areas)
- Use `SmoothClamp` after `CurveMapper` to round the hard stair edges slightly

---

## 3. River Channel Carving (CellWallDistance Directed)

**What it looks like:** Long, winding valley channels carved into otherwise solid terrain — rivers, canyons, fjords.

**Why it's complex:** Rivers need to follow a path. `CellNoise2D` provides jittered cell centers; `CellWallDistance` gives you a signed distance from the nearest cell boundary — which forms a natural linear network. The trick is orienting the network directionally by stretching the cell space in Z.

**The recipe:** `CellWallDistance` driven by a stretched coordinate space forms valley lines. Invert and clamp to get a narrow channel mask. `Min` carves it into terrain.

```nodegraph
{
  "height": 260,
  "nodes": [
    { "id": "terr", "label": "Sum (terrain)",    "category": "density", "sub": "from hills graph",   "x": 0,   "y": 0   },
    { "id": "sc",   "label": "Scale",            "category": "density", "sub": "ScaleX 0.003 ScaleZ 0.001", "x": 0, "y": 140 },
    { "id": "cwd",  "label": "CellWallDistance", "category": "density", "sub": "cell network",       "x": 200, "y": 140 },
    { "id": "inv",  "label": "Inverter",         "category": "density", "sub": "flip sign",          "x": 380, "y": 140 },
    { "id": "scl",  "label": "SmoothClamp",      "category": "density", "sub": "Wall ±0.4 R 0.15",   "x": 560, "y": 140 },
    { "id": "cc",   "label": "Constant",         "category": "math",    "sub": "Value 0.7",          "x": 560, "y": 215 },
    { "id": "cvm",  "label": "Multiplier",       "category": "math",    "sub": "channel depth × 0.7","x": 740, "y": 175 },
    { "id": "mn",   "label": "Min",              "category": "density", "sub": "carve channel",      "x": 900, "y": 80  },
    { "id": "out",  "label": "Terrain Out",      "category": "output",                               "x": 1080,"y": 80  }
  ],
  "edges": [
    { "from": "terr", "to": "mn",  "label": "terrain" },
    { "from": "sc",   "to": "cwd" },
    { "from": "cwd",  "to": "inv" },
    { "from": "inv",  "to": "scl" },
    { "from": "scl",  "to": "cvm" },
    { "from": "cc",   "to": "cvm" },
    { "from": "cvm",  "to": "mn",  "label": "channel mask" },
    { "from": "mn",   "to": "out" }
  ]
}
```

**Key parameters:**
- `Scale` `ScaleX` / `ScaleZ`: `0.003` / `0.001` — X:Z ratio of 3:1 stretches cells into elongated north–south shapes; adjust ratio to change river orientation tendency
- `SmoothClamp` `WallA`/`WallB`: `±0.4`, `Range: 0.15` — the ±0.4 zone is where the channel is fully carved; widen for broader canyons, narrow for tight river cuts
- `cc` `Value`: `0.7` — how deep the channel cuts; `1.0` = cuts all the way through any terrain, `0.3` = shallow valleys that don't eliminate hills entirely

**Why `CellWallDistance` forms networks:** Cell wall boundaries form a Voronoi diagram — a natural tessellation where every point on a wall is equidistant from two cell centers. Scaling the cell space makes the walls run in preferred directions, forming the branching network that resembles real river drainage patterns.

**Variations:**
- Add `FastGradientWarp` before `CellWallDistance` for highly organic meandering channels
- Use `Max` instead of `Min` to create ridges along cell walls (mountain range spines) instead of valleys

---

## 4. Erosion Simulation (Gradient-Guided Carving)

**What it looks like:** Terrain that looks like it's been rain-eroded — ridges slightly carved on their downhill faces, smoother high plateaus, rougher low slopes. Not true hydraulic erosion (which is iterative and procedural) but a convincing density-based approximation.

**Why it's complex:** Real erosion is downhill-directional. In density graphs, direction is captured by the `Gradient` node, which returns the density field's slope vector. Sampling that slope in the Y direction gives a proxy for uphill vs. downhill facing.

**The recipe:** Use `Gradient` on the terrain to get the local slope. Extract the Y component via a `CurveMapper` on the gradient magnitude. Multiply a roughness noise by the slope to concentrate detail on slopes.

```nodegraph
{
  "height": 280,
  "nodes": [
    { "id": "base", "label": "Sum (terrain)",  "category": "density", "sub": "broad terrain",      "x": 0,   "y": 0   },
    { "id": "grad", "label": "Gradient",       "category": "density", "sub": "terrain slope",      "x": 200, "y": 0   },
    { "id": "gcm",  "label": "CurveMapper",    "category": "filter",  "sub": "slope→weight",       "x": 380, "y": 0   },
    { "id": "det",  "label": "SimplexNoise3D", "category": "density", "sub": "ScaleXZ 0.04 Oct 2", "x": 0,   "y": 160 },
    { "id": "dc",   "label": "Constant",       "category": "math",    "sub": "Value 0.12",         "x": 0,   "y": 225 },
    { "id": "dm",   "label": "Multiplier",     "category": "math",    "sub": "detail scale × 0.12","x": 200, "y": 195 },
    { "id": "wm",   "label": "Multiplier",     "category": "math",    "sub": "slope-weighted",     "x": 560, "y": 100 },
    { "id": "sum",  "label": "Sum",            "category": "math",    "sub": "terrain + erosion",  "x": 740, "y": 50  },
    { "id": "ys",   "label": "YSampled",       "category": "density", "sub": "SampleDistance 4",   "x": 920, "y": 50  },
    { "id": "out",  "label": "Terrain Out",    "category": "output",                                "x": 1100,"y": 50  }
  ],
  "edges": [
    { "from": "base", "to": "grad" },
    { "from": "base", "to": "sum" },
    { "from": "grad", "to": "gcm" },
    { "from": "gcm",  "to": "wm",  "label": "slope weight" },
    { "from": "det",  "to": "dm" },
    { "from": "dc",   "to": "dm" },
    { "from": "dm",   "to": "wm",  "label": "detail" },
    { "from": "wm",   "to": "sum", "label": "slope detail" },
    { "from": "sum",  "to": "ys" },
    { "from": "ys",   "to": "out" }
  ]
}
```

**Key parameters:**
- `Gradient` — takes the terrain density as input; outputs gradient magnitude (steeper slope → larger value)
- `gcm` `CurveMapper` curve shape: flat at 0 for low gradient values (flat terrain gets no detail), rising steeply toward 1 for high gradient (steep faces get full roughness). A threshold around 0.3–0.5 gradient magnitude works well for most terrain
- `det` `SimplexNoise3D` ScaleXZ: `0.04` — fine detail frequency; 3D noise so it creates small overhangs on steep faces
- `dc` `Value`: `0.12` — maximum roughness amplitude; keep this below `0.2` to avoid terrain becoming impassable

> [!NOTE]
> `Gradient` costs 2× the child evaluation (central differences). Place it outside `YSampled` — the gradient of an interpolated function is not the same as the gradient of the true function.

**Variations:**
- Use a negative `Constant` and subtract the weighted detail instead of adding it — creates slope-facing concave pockets (erosion channels on slope faces)
- Sample the gradient at half the step scale used in `YSampled` for higher-resolution erosion detail

---

## 5. Shoreline Shaping (Depth-Scaled Density Transition)

**What it looks like:** Terrain that starts as deep flat seabed, rises through a shallow shelf, then breaks into beaches and then hills — a natural coastal profile rather than a cliff dropping straight into the ocean.

**Why it's complex:** Coastlines need smooth density transitions across a wide vertical range, with the shape of the transition varying across XZ. A single `BaseHeight` produces one profile everywhere.

**The recipe:** `YValue → CurveMapper` defines the vertical coastal profile (deep → shelf → shore). Multiply its amplitude by a low-frequency horizontal noise to push the shoreline in and out.

```nodegraph
{
  "height": 260,
  "nodes": [
    { "id": "yv",   "label": "YValue",        "category": "density", "sub": "elevation",           "x": 0,   "y": 0   },
    { "id": "ycm",  "label": "CurveMapper",   "category": "filter",  "sub": "coastal profile",     "x": 200, "y": 0   },
    { "id": "hsel", "label": "SimplexNoise2D","category": "density", "sub": "Scale 0.0015 Oct 2",  "x": 0,   "y": 130 },
    { "id": "hc",   "label": "Constant",      "category": "math",    "sub": "Value 0.5",           "x": 0,   "y": 195 },
    { "id": "hm",   "label": "Multiplier",    "category": "math",    "sub": "shore shift × 0.5",   "x": 200, "y": 160 },
    { "id": "sum",  "label": "Sum",           "category": "math",    "sub": "profile + shore shift","x": 380, "y": 70  },
    { "id": "det",  "label": "SimplexNoise2D","category": "density", "sub": "Scale 0.008 Oct 3",   "x": 0,   "y": 280 },
    { "id": "dc",   "label": "Constant",      "category": "math",    "sub": "Value 0.08",          "x": 0,   "y": 345 },
    { "id": "dm",   "label": "Multiplier",    "category": "math",    "sub": "surface detail × 0.08","x": 200, "y": 315 },
    { "id": "fsum", "label": "Sum",           "category": "math",    "sub": "final density",       "x": 560, "y": 160 },
    { "id": "ys",   "label": "YSampled",      "category": "density", "sub": "SampleDistance 4",    "x": 740, "y": 160 },
    { "id": "out",  "label": "Terrain Out",   "category": "output",                                "x": 920, "y": 160 }
  ],
  "edges": [
    { "from": "yv",   "to": "ycm" },
    { "from": "ycm",  "to": "sum" },
    { "from": "hsel", "to": "hm" },
    { "from": "hc",   "to": "hm" },
    { "from": "hm",   "to": "sum", "label": "shore shift" },
    { "from": "sum",  "to": "fsum","label": "profile" },
    { "from": "det",  "to": "dm" },
    { "from": "dc",   "to": "dm" },
    { "from": "dm",   "to": "fsum","label": "surface detail" },
    { "from": "fsum", "to": "ys" },
    { "from": "ys",   "to": "out" }
  ]
}
```

**Key parameters:**
- `ycm` curve shape: draw a profile that is large positive at low Y (deep terrain = solid rock below sea level), crosses zero at shallow-shelf depth (~32), then rises again at the hill zone. The crossing point is sea level
- `hsel` Scale: `0.0015` — broad horizontal noise that shifts the coastline in and out; at high values you get a fjord-heavy coast, at low values a smooth coast
- `hc` `Value`: `0.5` — how much the coastline varies horizontally; higher = large bays and peninsulas
- `dc` `Value`: `0.08` — surface bump amplitude; keep low so it textures the terrain without cutting below sea level in flat areas

**Variations:**
- Stack a second `CurveMapper` on `YValue` with a narrower bump in the beach zone to create a subtle ridge right at the waterline (sand berm)
- Use `ZValue` instead of `hsel` for a coast that simply runs east–west at a fixed depth

---

## Complexity vs. Cost Reference

| Technique | Extra cost vs. basic terrain | Worth it when... |
|-----------|------------------------------|-----------------|
| Biome-edge blending | ~1.5× (extra noise + Mix) | Biome zones need natural, non-tiled boundaries |
| Terrain terracing | Minimal (CurveMapper on Y) | Artistic staircase look is intentional |
| River channel carving | Moderate (CellWallDistance) | You want organic drainage networks |
| Gradient erosion | 2× terrain cost (Gradient) | Slope-differentiated detail improves the silhouette |
| Shoreline shaping | Low (profile CurveMapper + noise) | World has large water bodies with varied coastlines |

> **See also:** [Complex Terrain Techniques](./terrain-types-advanced.md) for techniques this guide builds on. [Expert Terrain Techniques](./terrain-types-expert.md) for system-level graph and performance knowledge. [Node Combination Patterns](../world/node-combinations.md) for individual node building blocks.

---

## See Also

- [Curves Explained](../world/curves-explained.md) — S-curves, DistanceS, Manual curves used in biome-edge blending and terracing
- [Terrain Math Explained](./terrain-math-explained.md) — the math behind GradientWarp strength, Mix weights, and SmoothMin blending
- [Complex Terrain Techniques](./terrain-types-advanced.md) — prerequisite patterns: double domain warp, Gradient slope detection
- [Expert Terrain Techniques](./terrain-types-expert.md) — system-level techniques: YSampled placement rules, Cache strategy
