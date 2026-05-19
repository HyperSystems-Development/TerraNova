# Node Combination Patterns

Each section shows a common wiring pattern -- what nodes to connect and why. The diagrams mirror how they look in the actual editor.

> **Biome source assets:** `Examples/Example_CellNoise2D.json`, `Examples/Example_Curve_Mapper.json`, `Examples/Example_Mixer_Gradient.json`, `Experimental/Arches.json`, `Experimental/Dunes.json`, `Experimental/Mountains.json`, `Experimental/Plateaus.json`, `Generative/Generative_Arches.json`, `Generative/Generative_Pillars_Marble_Large.json`, `Generative/Generative_Veins.json`
>
> These patterns are simplified reading diagrams derived from those Hytale `Examples/`, `Experimental/`, and `Generative/` terrain assets plus the active editor node set. They show recurring graph shapes, not full biome copies.

**Beginner?** Start with patterns 1-4, then try the [Basic Terrain Generation guide](../understanding-basic-terrain-generation.md).
**Advanced?** Patterns 7-14 cover blending, warping, shape SDFs, and full terrain stacks. Pattern 15 covers the skylands altitude band technique.

---

## Color Key

| Color | Category | Examples |
|-------|----------|---------|
| Blue | Generative (noise) | SimplexNoise2D, CellNoise2D, SimplexNoise3D |
| Purple | Filter / Transform | Normalizer, CurveMapper, YSampled, GradientWarp |
| Teal | Math / Combinator | Sum, Mix, Min, SmoothMin |
| Green | Position / Coordinate | YValue, BaseHeight, DistanceToBiomeEdge |
| Amber | Terrain-specific | YSampled, DistanceToBiomeEdge |
| Rose | Shape SDF | Ellipsoid, Cylinder, Cuboid, Plane |
| Gold | Output | Terrain Out, final node |

---

## 1. Noise to Normalizer

**What it does:** Raw noise outputs in [-Amplitude, +Amplitude]. `Normalizer` remaps that to any range you choose -- most commonly [0, 1] so it can be used as a blend weight or gradient factor.

**When to use it:** Whenever you need a 0-1 value from noise. Required before using noise as a `Mix` factor.

```nodegraph
{
  "height": 150,
  "nodes": [
    { "id": "n",   "label": "SimplexNoise2D", "category": "generative", "sub": "-1 to 1",    "x": 0,   "y": 45 },
    { "id": "nr",  "label": "Normalizer",     "category": "filter",     "sub": "[-1,1]->[0,1]","x": 240, "y": 45 },
    { "id": "out", "label": "Output",         "category": "output",                           "x": 480, "y": 45 }
  ],
  "edges": [
    { "from": "n",  "to": "nr",  "label": "raw" },
    { "from": "nr", "to": "out", "label": "0 to 1" }
  ],
  "steps": [
    { "nodeId": "n",   "text": "SimplexNoise2D generates a smooth, continuous noise field. At each (x,z) coordinate it outputs a value between -1 and +1. You set the Scale to control how zoomed-in the pattern is -- lower Scale means broader hills." },
    { "nodeId": "nr",  "text": "Normalizer remaps the incoming range to a new range. Here it takes [-1, 1] from the noise and maps it to [0, 1]. This is required before using noise as a Mix factor, since Mix expects a 0-1 weight." },
    { "nodeId": "out", "text": "The output carries a clean 0-1 value ready to drive a Mix, a material layer selection, or any other node that expects a normalized input." }
  ]
}
```

```bounds
{"min": -1, "max": 1, "context": [-1, 1], "label": "SimplexNoise2D — raw output [-1, 1]"}
```

```bounds
{"min": 0, "max": 1, "context": [-1, 1], "label": "After Normalizer — remapped to [0, 1] for use as a blend weight"}
```

---

## 2. Ridge Noise (Noise to Abs)

**What it does:** `Abs` folds all negative values to positive. A valley at -0.7 becomes a peak at 0.7 -- creating sharp ridges where the noise crosses zero.

**When to use it:** Mountain ridges, rocky spines, canyon walls. Gives a very different feel to flat simplex noise.

```nodegraph
{
  "height": 150,
  "nodes": [
    { "id": "n",   "label": "SimplexNoise2D", "category": "generative", "sub": "-1 to 1", "x": 0,   "y": 45 },
    { "id": "abs", "label": "Abs",           "category": "math",       "sub": "0 to 1",  "x": 240, "y": 45 },
    { "id": "out", "label": "Output",        "category": "output",                        "x": 480, "y": 45 }
  ],
  "edges": [
    { "from": "n",   "to": "abs", "label": "signed" },
    { "from": "abs", "to": "out", "label": "ridges" }
  ],
  "steps": [
    { "nodeId": "n",   "text": "SimplexNoise2D outputs a smooth signed value in **[-1, +1]**. Valleys are negative, hilltops are positive. Before Abs, the field looks like gently rolling hills — every zero-crossing is just a flat transition." },
    { "nodeId": "abs", "text": "Abs takes the absolute value: any negative number flips to positive. A valley at -0.7 becomes +0.7. Every place the noise crosses zero is now a **sharp peak** instead of a flat crossing. Higher frequency noise = tighter, more dramatic ridges." },
    { "nodeId": "out", "text": "The output is always in [0, 1] — no negatives. Add this to a BaseHeight + CurveMapper chain using Sum, and every ridge line in the noise becomes a raised mountain spine in the world." }
  ]
}
```

---

## 3. Height Gradient (YValue to Normalizer)

**What it does:** Reads the raw world Y coordinate and remaps it to [0, 1]. Y=0 -> 0, Y=256 -> 1.

**When to use it:** Anything that should change smoothly with altitude -- ore frequency, vegetation density, fog thickness. A building block for almost every material layering setup.

```nodegraph
{
  "height": 150,
  "nodes": [
    { "id": "cy",  "label": "YValue",     "category": "position", "sub": "world Y",       "x": 0,   "y": 45 },
    { "id": "nr",  "label": "Normalizer", "category": "filter",   "sub": "[0,256]->[0,1]", "x": 240, "y": 45 },
    { "id": "out", "label": "Output",     "category": "output",                            "x": 480, "y": 45 }
  ],
  "edges": [
    { "from": "cy", "to": "nr",  "label": "0-256" },
    { "from": "nr", "to": "out", "label": "0-1" }
  ],
  "steps": [
    { "nodeId": "cy",  "text": "YValue reads the **world Y coordinate** at each point and outputs it as a raw number. At Y=0, output=0. At Y=128, output=128. On its own this is just a gradient — but combined with Normalizer it becomes a universal altitude factor." },
    { "nodeId": "nr",  "text": "Normalizer remaps the Y range [0, 256] to [0, 1]. You define the input range to match your world's meaningful altitude window. The output is always a clean 0–1 value: 0 at the bottom, 1 at the top. Use this anywhere you need something to change smoothly with height." },
    { "nodeId": "out", "text": "The 0–1 height factor feeds any Mix, material condition, or Amplitude node. Snow cap? Mix at values above 0.75. Deep underground ore? Gate on values below 0.2. This two-node chain is the basis of nearly every altitude-aware effect." }
  ]
}
```

```bounds
{"min": 0, "max": 256, "context": [0, 256], "label": "YValue — raw world Y coordinate [0, 256]"}
```

```bounds
{"min": 0, "max": 1, "context": [0, 256], "label": "After Normalizer — altitude as a clean [0, 1] factor"}
```

---

## 4. BaseHeight + CurveMapper (Height Profile)

**What it does:** `BaseHeight` crosses 0 at a named height reference. `CurveMapper` remaps that anchor through a hand-drawn curve to sculpt the vertical terrain profile -- flat plains, sharp cliffs, or rolling hills.

**When to use it:** Every terrain setup needs this as its vertical backbone before adding noise.

```nodegraph
{
  "height": 190,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",    "category": "position",  "sub": "Y = 64",         "x": 0,   "y": 30 },
    { "id": "cf",  "label": "CurveMapper",   "category": "filter",    "sub": "height profile",  "x": 240, "y": 30 },
    { "id": "sn",  "label": "SimplexNoise2D","category": "generative","sub": "surface vary",    "x": 0,   "y": 130 },
    { "id": "sum", "label": "Sum",           "category": "math",                                "x": 480, "y": 80 },
    { "id": "out", "label": "Terrain Out",   "category": "output",                              "x": 700, "y": 80 }
  ],
  "edges": [
    { "from": "bh",  "to": "cf" },
    { "from": "cf",  "to": "sum", "label": "profile" },
    { "from": "sn",  "to": "sum", "label": "variation" },
    { "from": "sum", "to": "out" }
  ],
  "steps": [
    { "nodeId": "bh",  "text": "BaseHeight is the vertical zero-line of your terrain. In the audited source assets it usually anchors the graph before CurveMapper, Sum, or later reuse via Exported/Imported." },
    { "nodeId": "cf",  "text": "CurveMapper remaps the BaseHeight value through a hand-drawn curve. A flat line keeps the default shape. An S-curve creates cliff overhangs. A steep drop at one end creates mesas. This is how you sculpt terrain height without noise." },
    { "nodeId": "sn",  "text": "SimplexNoise2D adds horizontal variation to the terrain -- hills and valleys. Without it, the terrain would be completely flat at every Y level defined by the curve." },
    { "nodeId": "sum", "text": "Sum adds the CurveMapper output and the noise together. The curve sets the overall vertical shape; the noise gives it organic surface variation. Both are still in density units -- positive = solid." },
    { "nodeId": "out", "text": "Terrain Out is the final connection. Whatever density value reaches this node is used to decide solid vs air for every block in the world." }
  ]
}
```

---

## 5. Scale + Offset (Multiplier + Constant to Sum)

**What it does:** Multiply a density by a constant scale factor, then add a fixed offset. Useful when you need independent control over scale and offset.

**When to use it:** When chaining with other nodes that a single transform can't reach.

```nodegraph
{
  "height": 220,
  "nodes": [
    { "id": "src", "label": "SimplexNoise2D", "category": "generative", "sub": "source",      "x": 0,   "y": 70 },
    { "id": "sc",  "label": "Constant",       "category": "math",       "sub": "Value 2.0",   "x": 0,   "y": 145 },
    { "id": "mul", "label": "Multiplier",     "category": "math",       "sub": "× 2.0",       "x": 240, "y": 100 },
    { "id": "con", "label": "Constant",       "category": "math",       "sub": "offset +0.5", "x": 240, "y": 185 },
    { "id": "sum", "label": "Sum",            "category": "math",                              "x": 480, "y": 130 },
    { "id": "out", "label": "Output",         "category": "output",                            "x": 700, "y": 130 }
  ],
  "edges": [
    { "from": "src", "to": "mul" },
    { "from": "sc",  "to": "mul" },
    { "from": "mul", "to": "sum" },
    { "from": "con", "to": "sum", "label": "+0.5" },
    { "from": "sum", "to": "out" }
  ],
  "steps": [
    { "nodeId": "src", "text": "SimplexNoise2D starts in **[-1, +1]**. All subsequent math is in density units, so this is your raw material before any scaling or shifting." },
    { "nodeId": "mul", "text": "Multiplier scales the amplitude. Constant × 2.0 doubles the peak-to-trough swing: the range becomes **[-2, +2]**. Use this to make hills taller or noise more dramatic without touching the frequency or feature size." },
    { "nodeId": "con", "text": "The offset Constant adds a fixed positive shift after scaling. Adding +0.5 shifts the whole range from [-2, +2] to **[-1.5, +2.5]**. This lifts the whole terrain, bringing more of the field into positive (solid) territory." },
    { "nodeId": "sum", "text": "Sum applies the offset. The final density has a different zero-crossing level than the original noise — terrain will be more elevated or more buried depending on the offset sign and magnitude." },
    { "nodeId": "out", "text": "The scaled and offset density value. These two operations — scale and translate — are the most common density adjustments and cover almost every practical need without affecting feature shape or frequency." }
  ]
}
```

```bounds
{"min": -1, "max": 1, "context": [-2, 2.5], "label": "Source noise — [-1, 1]"}
```

```bounds
{"min": -2, "max": 2, "context": [-2, 2.5], "label": "After × 2.0 — amplitude doubled to [-2, 2]"}
```

```bounds
{"min": -1.5, "max": 2.5, "context": [-2, 2.5], "label": "After + 0.5 offset — range shifted to [-1.5, 2.5]"}
```

---

## 6. Mix Between Two Densities

**What it does:** `Mix` blends two input densities using a third as the factor. Factor = 0 means pure A, Factor = 1 means pure B, anything in between is interpolated. The factor must be in [0, 1] -- use `Normalizer` if your source is not already in that range.

**When to use it:** Mixing two terrain styles smoothly. Transitioning between sand dunes and rocky hills. Biome surface blending.

```nodegraph
{
  "height": 230,
  "nodes": [
    { "id": "a",   "label": "SimplexNoise2D", "category": "generative", "sub": "terrain A",    "x": 0,   "y": 0   },
    { "id": "b",   "label": "SimplexNoise3D", "category": "generative", "sub": "terrain B",    "x": 0,   "y": 100 },
    { "id": "f",   "label": "CellNoise2D",    "category": "generative", "sub": "mix factor",   "x": 0,   "y": 185 },
    { "id": "nr",  "label": "Normalizer",     "category": "filter",     "sub": "[-1,1]->[0,1]", "x": 240, "y": 185 },
    { "id": "mx",  "label": "Mix",            "category": "math",                              "x": 480, "y": 90  },
    { "id": "out", "label": "Output",         "category": "output",                            "x": 700, "y": 90  }
  ],
  "edges": [
    { "from": "a",  "to": "mx", "label": "A" },
    { "from": "b",  "to": "mx", "label": "B" },
    { "from": "f",  "to": "nr" },
    { "from": "nr", "to": "mx", "label": "0-1 factor" },
    { "from": "mx", "to": "out" }
  ],
  "steps": [
    { "nodeId": "a",   "text": "Terrain A is one complete density field — could be rolling hills, desert dunes, anything. Mix treats it as the \"zero end\" of the blend: when the factor is 0, you get 100% of A." },
    { "nodeId": "b",   "text": "Terrain B is a different density field — different noise, different character. When the factor is 1, you get 100% of B. The formula is: `output = A × (1 - factor) + B × factor`." },
    { "nodeId": "f",   "text": "CellNoise2D drives the spatial blend. Its Voronoi cells create hard-edged, organic-shaped blending regions. You can use any noise type here — large-scale SimplexNoise2D gives soft gradients; small-scale CellNoise gives sharp speckled mixing." },
    { "nodeId": "nr",  "text": "Normalizer maps the factor noise from [-1, 1] to [0, 1]. **This step is required** — Mix will misbehave with negative factors or factors above 1. Always normalize the blend factor before feeding it to Mix." },
    { "nodeId": "mx",  "text": "Mix produces the weighted blend. At every point in the world, the factor value from CellNoise determines how much of A vs B contributes. Biome transitions, stylistic blends, and material selection all use this exact pattern." },
    { "nodeId": "out", "text": "The blended density field — a seamless combination of A and B shaped by the spatial factor. Adjust the factor's noise Scale to control how wide the transition zones are." }
  ]
}
```

---

## 7. Height-Based Branching (Switch)

**What it does:** `Switch` selects between multiple density inputs based on a switch state. Pair with `SwitchState` to pick a branch based on a string identifier. Use a `YValue` + `CurveMapper` weight to fade one contribution to zero above a certain height.

**When to use it:** Switching between terrain types at a depth boundary -- e.g. cave density below Y=40 and normal terrain above. Also useful for above/below sea-level logic.

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "yv",  "label": "YValue",        "category": "terrain",    "sub": "raw Y",          "x": 0,   "y": 0   },
    { "id": "cm",  "label": "CurveMapper",   "category": "filter",     "sub": "1.0 below Y=40", "x": 200, "y": 0   },
    { "id": "sn3", "label": "SimplexNoise3D","category": "generative", "sub": "cave noise",      "x": 0,   "y": 100 },
    { "id": "inv", "label": "Inverter",      "category": "math",       "sub": "flip to hollow",  "x": 200, "y": 100 },
    { "id": "amp", "label": "Amplitude",     "category": "math",       "sub": "scale by depth",  "x": 400, "y": 50  },
    { "id": "out", "label": "Output",        "category": "output",                               "x": 600, "y": 50  }
  ],
  "edges": [
    { "from": "yv",  "to": "cm" },
    { "from": "sn3", "to": "inv" },
    { "from": "inv", "to": "amp", "label": "cave mask" },
    { "from": "cm",  "to": "amp", "label": "depth weight" },
    { "from": "amp", "to": "out" }
  ],
  "steps": [
    { "nodeId": "yv",  "text": "YValue outputs the raw world Y coordinate. This is the input we use to decide how deep we are — Y=0 is bedrock, Y=256 is sky." },
    { "nodeId": "cm",  "text": "CurveMapper maps the Y value to a 0–1 depth weight. A curve that outputs 1.0 below Y=40 and tapers to 0 above means: full cave intensity at depth, no caves near surface. The exact shape controls where caves fade in and out." },
    { "nodeId": "inv", "text": "Inverter flips the cave noise sign: where noise was +0.8 (solid), it becomes -0.8 (hollow). This turns \"solid lumps\" into \"carved voids\" — the exact shape of the tunnel cross-section is defined by the noise field, just inverted." },
    { "nodeId": "amp", "text": "Amplitude multiplies the inverted cave mask by the depth weight. At depth (weight=1), the cave carving is full strength. Near the surface (weight→0), the caves fade out smoothly. This prevents tunnels from emerging at the terrain surface and creating sinkholes." },
    { "nodeId": "out", "text": "The output is the depth-weighted cave mask, ready to be subtracted from terrain density via Min or Sum. The math: strong negative values carve deep underground caves; values near zero fade the caves out near the surface." }
  ]
}
```

---

## 8. Domain Warp (turbulent terrain)

**What it does:** `GradientWarp` displaces the sampling coordinates fed into a downstream noise node, making the terrain twist and swirl. The first noise drives the warp direction; the second produces the actual density values at the warped position.

**When to use it:** Organic-feeling terrain with no straight edges. Rivers, eroded landscapes, cave system chaos.

> **Preview note:** `GradientWarp` is evaluated in TerraNova's preview with finite-difference sampling. Tune the child terrain first, then use the warped preview for broad direction and scale. Consider `FastGradientWarp` for cheaper nested warps.

```nodegraph
{
  "height": 160,
  "nodes": [
    { "id": "wn",  "label": "SimplexNoise2D", "category": "generative", "sub": "warp direction", "x": 0,   "y": 55 },
    { "id": "dw",  "label": "GradientWarp",   "category": "filter",     "sub": "strength 64",    "x": 240, "y": 55 },
    { "id": "tn",  "label": "SimplexNoise3D", "category": "generative", "sub": "warped output",  "x": 480, "y": 55 },
    { "id": "out", "label": "Output",         "category": "output",                              "x": 700, "y": 55 }
  ],
  "edges": [
    { "from": "wn",  "to": "dw",  "label": "warp" },
    { "from": "dw",  "to": "tn",  "label": "offset pos" },
    { "from": "tn",  "to": "out" }
  ],
  "steps": [
    { "nodeId": "wn",  "text": "The warp noise is a standard 2D noise field used **only for its spatial pattern** — not for direct density output. Its values [-1, +1] get multiplied by WarpStrength to produce an XZ offset in world units." },
    { "nodeId": "dw",  "text": "GradientWarp reads the warp noise and **displaces the sampling coordinates** before passing them to its child. At WarpStrength=64: a noise value of +0.5 shifts the sample point 32 blocks east. The terrain node downstream never sees the real world position — only the warped one." },
    { "nodeId": "tn",  "text": "SimplexNoise3D evaluates at the **offset position**, not the true world position. The result looks like the original noise pattern physically bent and twisted. Ridges fold back on themselves; valleys spiral. The original noise frequency and character are preserved — just warped through space." },
    { "nodeId": "out", "text": "The warped density field. Because coordinates are offset, features that should be far apart can become adjacent, and straight shapes become organic. Strong WarpStrength (64+) creates chaotic folding; gentle warp (8–16) adds subtle turbulence." }
  ]
}
```

---

## 9. SmoothMin (organic cave merging)

**What it does:** Like `Min` -- keeps the smaller (more empty) of two densities -- but with a configurable blend radius that smooths the boundary between them. Hard `Min` gives a sharp seam; `SmoothMin` gives a rounded join.

**When to use it:** Merging cave systems, arches, tunnels, any hollow carving that should look natural rather than geometric.

```nodegraph
{
  "height": 175,
  "nodes": [
    { "id": "t",   "label": "Sum (terrain)",   "category": "math",    "sub": "solid terrain", "x": 0,   "y": 20  },
    { "id": "c",   "label": "SimplexNoise3D",  "category": "terrain", "sub": "cave shape",    "x": 0,   "y": 120 },
    { "id": "sm",  "label": "SmoothMin",       "category": "math",    "sub": "radius 0.2",    "x": 280, "y": 65  },
    { "id": "out", "label": "Output",          "category": "output",                          "x": 520, "y": 65  }
  ],
  "edges": [
    { "from": "t",  "to": "sm" },
    { "from": "c",  "to": "sm", "label": "cave" },
    { "from": "sm", "to": "out" }
  ],
  "steps": [
    { "nodeId": "t",   "text": "The solid terrain field — the density from your standard BaseHeight + noise stack. Positive values here are rock; negative values are air above the ground surface." },
    { "nodeId": "c",   "text": "The cave shape field — a 3D noise field representing the desired void space. Raw noise goes from [-1, +1]. You want cave voids to be **negative** so that Min will prefer them over solid terrain." },
    { "nodeId": "sm",  "text": "SmoothMin keeps whichever input is **smaller** (more empty) at each point — like Min, it carves caves through terrain. But instead of a hard boundary seam, it blends over a radius (here 0.2 density units). The join between cave wall and open terrain is rounded and organic rather than a sharp geometric cut." },
    { "nodeId": "out", "text": "The carved terrain with smooth cave joins. Compare: `Min` gives crisp geological fractures. `SmoothMin` gives worn, water-carved tunnels. The `Smoothness` parameter controls how wide the blend radius is in density units — larger = more rounded." }
  ]
}
```

---

## 10. Biome Edge Fade (DistanceToBiomeEdge to Mix)

**What it does:** `DistanceToBiomeEdge` outputs a value based on how far you are from the nearest biome boundary -- 0 at the edge, increasing inward. Normalize it and use it as a `Mix` factor to fade between two terrain features near boundaries.

**When to use it:** Natural-looking biome transitions. Fading out trees near a desert border, blending cliff terrain into plains terrain, softening hard biome seams.

```nodegraph
{
  "height": 210,
  "nodes": [
    { "id": "dbe", "label": "DistanceToBiomeEdge","category": "terrain",    "sub": "0 at edge",    "x": 0,   "y": 90  },
    { "id": "nr",  "label": "Normalizer",         "category": "filter",     "sub": "[0,32]->[0,1]", "x": 240, "y": 90  },
    { "id": "a",   "label": "SimplexNoise2D",     "category": "generative", "sub": "feature A",    "x": 0,   "y": 0   },
    { "id": "b",   "label": "SimplexNoise3D",     "category": "generative", "sub": "feature B",    "x": 0,   "y": 180 },
    { "id": "mx",  "label": "Mix",                "category": "math",                              "x": 480, "y": 90  },
    { "id": "out", "label": "Output",             "category": "output",                            "x": 700, "y": 90  }
  ],
  "edges": [
    { "from": "dbe", "to": "nr" },
    { "from": "nr",  "to": "mx", "label": "0-1 factor" },
    { "from": "a",   "to": "mx", "label": "A" },
    { "from": "b",   "to": "mx", "label": "B" },
    { "from": "mx",  "to": "out" }
  ],
  "steps": [
    { "nodeId": "dbe", "text": "DistanceToBiomeEdge outputs **0 at the biome boundary** and increases as you move further inside the biome. At the edge you get pure 0; 32 blocks in you might get 32. This node knows nothing about terrain — it only measures proximity to the boundary line defined by the biome system." },
    { "nodeId": "nr",  "text": "Normalizer maps [0, 32] to [0, 1], turning the raw distance into a clean blend weight. Right at the biome edge: weight = 0 → full Feature A. 32 blocks inside: weight = 1 → full Feature B. Adjust the input range to control how wide the transition strip is." },
    { "nodeId": "a",   "text": "Feature A is the terrain characteristic that appears **at the biome boundary** — often the neighboring biome's terrain style, or a neutral transition type like flat ground." },
    { "nodeId": "b",   "text": "Feature B is the terrain characteristic that dominates **inside the biome** — the full biome character, once you are far enough from the edge that the transition is complete." },
    { "nodeId": "mx",  "text": "Mix blends A and B using the normalized distance as the factor. The result: terrain morphs from A at the biome edge to B at the biome center. No hard seam, no noise-driven randomness — the transition is purely governed by spatial distance to the boundary." },
    { "nodeId": "out", "text": "A soft biome transition. The blend width is controlled by the Normalizer input range. Tighter range = sharper, narrower transition strip. Wider range = gradual, wide transition zone." }
  ]
}
```

---

## 11. Shape SDF Island Mask

**What it does:** Shape SDF nodes output a signed distance field -- negative inside the shape, positive outside. `Ellipsoid` makes a bubble. `Max` keeps only density that is both inside the ellipsoid AND above the plane -- creating an island that fades out at its edges.

**When to use it:** Floating islands, contained biome areas, arena-style world shapes, volcanic calderas.

```nodegraph
{
  "height": 240,
  "nodes": [
    { "id": "el",  "label": "Ellipsoid",     "category": "shape",      "sub": "r 200,80,200",    "x": 0,   "y": 20  },
    { "id": "pl",  "label": "Plane",         "category": "shape",      "sub": "Y = 64 base",     "x": 0,   "y": 120 },
    { "id": "mx",  "label": "Max",           "category": "math",       "sub": "island mask",     "x": 280, "y": 65  },
    { "id": "sn",  "label": "SimplexNoise2D","category": "generative", "sub": "surface detail",  "x": 0,   "y": 210 },
    { "id": "sum", "label": "Sum",           "category": "math",                                 "x": 480, "y": 130 },
    { "id": "out", "label": "Output",        "category": "output",                               "x": 700, "y": 130 }
  ],
  "edges": [
    { "from": "el",  "to": "mx" },
    { "from": "pl",  "to": "mx" },
    { "from": "mx",  "to": "sum", "label": "island" },
    { "from": "sn",  "to": "sum", "label": "detail" },
    { "from": "sum", "to": "out" }
  ],
  "steps": [
    { "nodeId": "el",  "text": "Ellipsoid outputs a **signed distance field** — negative inside the ellipsoid bubble, positive outside. Think of it as a density balloon: inside is solid potential, outside is air. The `Scale` vector [200, 80, 200] sets the radii in X, Y, and Z." },
    { "nodeId": "pl",  "text": "Plane also outputs a signed distance — negative on one side, positive on the other. With PlaneNormal [0,1,0], it is horizontal: negative above the plane, positive below. This will be used to cut the bottom off the island." },
    { "nodeId": "mx",  "text": "Max keeps the **larger** of the two values at each point. The Ellipsoid is negative inside (solid candidate) and positive outside (air). The Plane is negative above (solid candidate) and positive below. Max = air wherever **either** source says air. This intersects the two shapes: you only get solid where you are inside the ellipsoid AND above the plane — a flat-bottomed island shape." },
    { "nodeId": "sn",  "text": "SimplexNoise2D adds surface irregularity so the island has a rocky top instead of a smooth dome. Keep the amplitude small (0.1–0.2) so the noise does not punch through the island edges defined by the SDF." },
    { "nodeId": "sum", "text": "Sum combines the island SDF mask and the surface noise. The island SDF provides the overall shape; the noise roughens the surface. Both are in density units — adding them keeps everything in the same space." },
    { "nodeId": "out", "text": "A floating island with a defined ellipsoidal body, a flat underside from the Plane cut, and a noisy top surface. Vary Ellipsoid Scale to change island size; adjust Plane offset to change how much is cut off the bottom." }
  ]
}
```

---

## 12. Multi-Octave Noise (Manual Stacking)

**What it does:** Manually stack multiple noise frequencies -- low frequency for large features, high frequency for fine detail -- each with its own weight. This gives you the same result as using `Octaves` on a single noise node but with full control over each layer.

**When to use it:** Custom fractal terrain where each octave needs different seeds, scales, or types. Mix 2D and 3D octaves in the same stack.

```nodegraph
{
  "height": 240,
  "nodes": [
    { "id": "n1",  "label": "SimplexNoise2D", "category": "generative", "sub": "Scale 0.005 Oct 2",  "x": 0,   "y": 0   },
    { "id": "n2",  "label": "SimplexNoise2D", "category": "generative", "sub": "Scale 0.02  Oct 3",  "x": 0,   "y": 90  },
    { "id": "n3",  "label": "SimplexNoise2D", "category": "generative", "sub": "Scale 0.08  Oct 2",  "x": 0,   "y": 180 },
    { "id": "sum", "label": "Sum",            "category": "math",       "sub": "stack octaves",       "x": 290, "y": 90  },
    { "id": "out", "label": "Output",         "category": "output",                                   "x": 530, "y": 90  }
  ],
  "edges": [
    { "from": "n1", "to": "sum", "label": "coarse" },
    { "from": "n2", "to": "sum", "label": "mid" },
    { "from": "n3", "to": "sum", "label": "fine" },
    { "from": "sum", "to": "out" }
  ],
  "steps": [
    { "nodeId": "n1",  "text": "The coarse layer uses a low Scale (0.005) — broad, sweeping hills that define the macro terrain shape. Octaves=2 adds a small amount of internal detail without getting noisy. This layer contributes the most to the overall elevation profile." },
    { "nodeId": "n2",  "text": "The mid layer uses a medium Scale (0.02) — medium terrain features like ridges, rocky outcrops, and valley variations. Scale 0.02 is 4× higher frequency than 0.005, so it adds features about 4× smaller. The amplitude (weight) of this layer should be lower than the coarse layer so it doesn't dominate." },
    { "nodeId": "n3",  "text": "The fine layer uses a high Scale (0.08) — small surface bumps and texture. This is 16× higher frequency than the coarse layer. Its contribution to overall height is small, but it makes the terrain feel rough and hand-crafted rather than smooth." },
    { "nodeId": "sum", "text": "Sum stacks all three octaves. The coarse layer provides the large-scale envelope; the finer layers add successively smaller detail. This is the same as using `Octaves=3` on one noise node — but here each layer has independent `Seed`, `Scale`, and can even be a different noise type (mix 2D and 3D)." },
    { "nodeId": "out", "text": "Multi-octave stacked noise. To control the relative contribution of each layer, add a `Multiplier × Constant` before the Sum for each noise: coarse × 1.0, mid × 0.5, fine × 0.25 is a classic 1/2 persistence falloff." }
  ]
}
```

---

## 13. YSampled Performance Wrap

**What it does:** Wraps any subgraph in `YSampled`, which samples the wrapped density at coarse Y intervals (default: every 4 blocks) and linearly interpolates between them. Gives ~4x speedup. The tradeoff is slight smoothing in the vertical direction.

**When to use it:** Around any expensive 3D subgraph. Always apply before shipping a world to production. Virtually invisible at step size 4 or less.

```nodegraph
{
  "height": 160,
  "nodes": [
    { "id": "sn",  "label": "SimplexNoise2D", "category": "generative", "sub": "surface",        "x": 0,   "y": 30 },
    { "id": "cf",  "label": "CurveMapper",    "category": "filter",     "sub": "height profile", "x": 240, "y": 0  },
    { "id": "sum", "label": "Sum",            "category": "math",                               "x": 480, "y": 30 },
    { "id": "ys",  "label": "YSampled",       "category": "terrain",    "sub": "SampleDistance 4",       "x": 680, "y": 30 },
    { "id": "out", "label": "Output",         "category": "output",                             "x": 900, "y": 30 }
  ],
  "edges": [
    { "from": "sn",  "to": "cf" },
    { "from": "sn",  "to": "sum" },
    { "from": "cf",  "to": "sum" },
    { "from": "sum", "to": "ys",  "label": "wrap" },
    { "from": "ys",  "to": "out", "label": "fast" }
  ],
  "steps": [
    { "nodeId": "sn",  "text": "SimplexNoise2D is the terrain source — two outputs used here: raw noise into CurveMapper for the height profile, and also directly into Sum for horizontal variation." },
    { "nodeId": "cf",  "text": "CurveMapper shapes the height profile. This node and everything feeding it forms the expensive part of the graph — it samples noise and applies a curve transformation for every Y level of every column." },
    { "nodeId": "sum", "text": "Sum combines the shaped profile and raw variation into the complete terrain density field. This is the full terrain subgraph — what YSampled will now wrap." },
    { "nodeId": "ys",  "text": "YSampled wraps the entire Sum subgraph and **samples it only every 4 Y blocks** instead of every block. Between sample points it linearly interpolates. This reduces the number of density evaluations by ~4×. At SampleDistance=4 the visual difference is negligible for most terrain types. For 3D noise-heavy graphs, the speedup is critical." },
    { "nodeId": "out", "text": "The performance-optimized terrain output. YSampled is one of the highest-leverage optimizations in the node graph. Apply it around any Sum that includes 3D noise or CurveMapper chains before testing in-game." }
  ]
}
```

---

## 14. Full Overworld Terrain Stack

**What it does:** A complete typical terrain graph combining everything above -- height profile, surface noise, cave carving, and performance wrapping. This is a production-ready starting point.

**Beginner tip:** Build this one node at a time. Start with just `BaseHeight -> Terrain Out`, add `CurveMapper`, then noise, then caves.

```nodegraph
{
  "height": 300,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",     "category": "position",   "sub": "Y = 64",           "x": 0,   "y": 0   },
    { "id": "cf",  "label": "CurveMapper",    "category": "filter",     "sub": "height profile",    "x": 240, "y": 0   },
    { "id": "sn",  "label": "SimplexNoise2D", "category": "generative", "sub": "surface variation", "x": 0,   "y": 110 },
    { "id": "sum", "label": "Sum",            "category": "math",       "sub": "base terrain",      "x": 480, "y": 50  },
    { "id": "ys",  "label": "YSampled",       "category": "terrain",    "sub": "SampleDistance 4",          "x": 680, "y": 50  },
    { "id": "c3",  "label": "SimplexNoise3D", "category": "generative", "sub": "cave noise",        "x": 0,   "y": 210 },
    { "id": "inv", "label": "Inverter",       "category": "math",       "sub": "flip to hollow",    "x": 240, "y": 210 },
    { "id": "mn",  "label": "Min",            "category": "math",       "sub": "carve caves",       "x": 860, "y": 130 },
    { "id": "out", "label": "Terrain Out",    "category": "output",                                 "x": 1060,"y": 130 }
  ],
  "edges": [
    { "from": "bh",  "to": "cf" },
    { "from": "cf",  "to": "sum" },
    { "from": "sn",  "to": "sum" },
    { "from": "sum", "to": "ys" },
    { "from": "ys",  "to": "mn", "label": "terrain" },
    { "from": "c3",  "to": "inv" },
    { "from": "inv", "to": "mn", "label": "caves" },
    { "from": "mn",  "to": "out" }
  ],
  "steps": [
    { "nodeId": "bh",  "text": "BaseHeight -- the vertical zero-line. Outputs 0 at Y=64. Above 64 is positive (solid); below is negative (air). This is always the first node in any terrain graph." },
    { "nodeId": "cf",  "text": "CurveMapper shapes the terrain profile. The curve maps height values to new density values -- creating cliffs, plateaus, and slopes without any noise." },
    { "nodeId": "sn",  "text": "SimplexNoise2D adds organic horizontal variation. Low frequency (e.g. 0.005) gives broad rolling hills. Higher frequency gives rocky jagged surfaces." },
    { "nodeId": "sum", "text": "Sum combines the height profile and the noise into a single density field. Positive = solid, negative = air. This is your base terrain before caves are carved." },
    { "nodeId": "ys",  "text": "YSampled wraps the expensive Sum subgraph and samples it every 4 Y levels instead of every block. Linearly interpolates between samples. ~4x performance gain with minimal visual difference." },
    { "nodeId": "c3",  "text": "SimplexNoise3D generates 3D noise -- varying in all three dimensions. This is what makes caves vary in height and shape, rather than going straight horizontally like 2D noise would." },
    { "nodeId": "inv", "text": "Inverter flips the sign of the cave noise. Without this, high cave noise values would be solid. After Inverter, high cave noise = very negative = very empty = a big cave void." },
    { "nodeId": "mn",  "text": "Min keeps whichever input is smaller (more empty) at each point. Where the terrain is solid but the cave is negative, the cave wins and carves a hole. Where the terrain is already air, it stays air." },
    { "nodeId": "out", "text": "Terrain Out -- the final density value for every block in the world. Positive = solid block placed. Zero or negative = air. Everything feeding into this node has shaped what the player will walk on." }
  ]
}
```

---

## 15. Skylands Altitude Band

**What it does:** Defines a floating sky island layer at a specific altitude band using `BaseHeight` in distance mode. Everything outside the Y band is air; within the band, `SimplexNoise3D` shapes individual islands.

**When to use it:** Any world type where terrain exists only at specific altitude ranges — sky islands, floating continents, layered void worlds.

> [!IMPORTANT]
> `BaseHeight` must have `Distance: true` for this pattern to work. In distance mode it outputs the raw Y distance from the named height rather than a clamped density value, allowing the `CurveMapper` to define the precise altitude band.

```nodegraph
{
  "height": 260,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",    "category": "position", "sub": "Distance=true Base", "x": 0,   "y": 20  },
    { "id": "cm",  "label": "CurveMapper",   "category": "filter",   "sub": "band peak at Y=110", "x": 200, "y": 20  },
    { "id": "sn3", "label": "SimplexNoise3D","category": "generative","sub": "ScaleXZ 100 Oct 1",  "x": 0,   "y": 120 },
    { "id": "si",  "label": "Sum",           "category": "math",     "sub": "noise + band",       "x": 380, "y": 70  },
    { "id": "nr",  "label": "Normalizer",    "category": "filter",   "sub": "[-1,1]→[-1,1]",      "x": 560, "y": 70  },
    { "id": "out", "label": "Terrain Out",   "category": "output",                                "x": 760, "y": 70  }
  ],
  "edges": [
    { "from": "bh",  "to": "cm" },
    { "from": "cm",  "to": "si",  "label": "altitude band" },
    { "from": "sn3", "to": "si",  "label": "3D variation" },
    { "from": "si",  "to": "nr" },
    { "from": "nr",  "to": "out" }
  ],
  "steps": [
    { "nodeId": "bh",  "text": "BaseHeight with Distance=true outputs the raw Y position relative to the named height. At BaseHeightName='Base' (Y=0), it simply outputs the world Y coordinate. This is the raw altitude value the band curve will work with." },
    { "nodeId": "cm",  "text": "CurveMapper with a Manual band curve: -1 at Y=-30 (air below), +1 at Y=110 (solid at peak), -1 at Y=210 (air above). This curve defines the altitude window where islands can exist. Outside the window, everything is forced to air." },
    { "nodeId": "sn3", "text": "SimplexNoise3D varies in all three dimensions. This breaks the flat slab that the band curve alone would create — islands get irregular tops, organic undersides, and holes. ScaleXZ=100 gives broad island shapes; Octaves=1 keeps them smooth." },
    { "nodeId": "si",  "text": "Sum adds the band curve and the 3D noise. Within the altitude band the band curve is positive; noise pushes some areas over and under the solid threshold, carving the island edges." },
    { "nodeId": "nr",  "text": "Normalizer clamps the combined output back to [-1, 1]. The Sum of two ±1 signals could reach ±2 — normalizing prevents downstream nodes from receiving out-of-range values. Add more island layers by summing additional band paths before Terrain Out." }
  ]
}
```

**Band curve construction (Manual points):**

| X (Y distance) | Y (density output) |
|---|---|
| −30 | −1 (air below) |
| 110 | +1 (solid peak) |
| 210 | −1 (air above) |

To add a second island layer at a higher altitude, add another `BaseHeight(Distance:true) → CurveMapper(peak at Y=240, range 200–280) → Multiplier(× Constant 1)` path and feed it into the outer `Sum` before `Terrain Out`. See [Terrain Types and Node Recipes](../terrain/terrain-types.md#5b-skylands-altitude-band-approach) for the full multi-layer recipe.

---

> **See also:** [Terrain Types and Node Recipes](../terrain/terrain-types.md) organizes these patterns by terrain outcome (plains, mountains, caves, dunes, etc.) with full working recipes. [Complex Terrain Techniques](../terrain/terrain-types-advanced.md) covers advanced combinations. [Expert Terrain Techniques](../terrain/terrain-types-expert.md) covers preview gaps, optimization, and graph topology.
