# Node Combination Patterns

Each section shows a common wiring pattern — what nodes to connect and why. The diagrams mirror how they look in the actual editor.

**Beginner?** Start with patterns 1–4, then try the [Basic Terrain Generation guide](./understanding-basic-terrain-generation.md).
**Advanced?** Patterns 7–13 cover blending, warping, shape SDFs, and full terrain stacks.

---

## Color Key

| Color | Category | Examples |
|-------|----------|---------|
| Blue | Generative (noise) | SimplexNoise2D, FractalNoise2D, VoronoiNoise2D |
| Purple | Filter / Transform | Normalizer, CurveFunction, YSampled, GradientWarp |
| Teal | Math / Combinator | Sum, Blend, MinFunction, Conditional, WeightedSum |
| Green | Position / Coordinate | CoordinateY, BaseHeight, DistanceFromOrigin |
| Amber | Terrain-specific | CaveDensity, YGradient, DistanceToBiomeEdge |
| Rose | Shape SDF | Ellipsoid, Cylinder, Cuboid, Plane |
| Gold | Output | Terrain Out, final node |

---

## 1. Noise → Normalizer

**What it does:** Raw noise outputs in [–Amplitude, +Amplitude]. `Normalizer` remaps that to any range you choose — most commonly [0, 1] so it can be used as a blend weight or gradient factor.

**When to use it:** Whenever you need a 0–1 value from noise. Required before using noise as a `Blend` factor.

```nodegraph
{
  "height": 150,
  "nodes": [
    { "id": "n",   "label": "SimplexNoise2D", "category": "generative", "sub": "–1 to 1",    "x": 0,   "y": 45 },
    { "id": "nr",  "label": "Normalizer",     "category": "filter",     "sub": "[–1,1]→[0,1]","x": 240, "y": 45 },
    { "id": "out", "label": "Output",         "category": "output",                           "x": 480, "y": 45 }
  ],
  "edges": [
    { "from": "n",  "to": "nr",  "label": "raw" },
    { "from": "nr", "to": "out", "label": "0 to 1" }
  ],
  "steps": [
    { "nodeId": "n",   "text": "SimplexNoise2D generates a smooth, continuous noise field. At each (x,z) coordinate it outputs a value between –1 and +1. You set the Frequency to control how zoomed-in the pattern is — lower frequency = broader hills." },
    { "nodeId": "nr",  "text": "Normalizer remaps the incoming range to a new range. Here it takes [–1, 1] from the noise and maps it to [0, 1]. This is required before using noise as a Blend factor, since Blend expects a 0–1 weight." },
    { "nodeId": "out", "text": "The output carries a clean 0–1 value ready to drive a Blend, a material layer selection, or any other node that expects a normalized input." }
  ]
}
```

---

## 2. Ridge Noise (Noise → Abs)

**What it does:** `Abs` folds all negative values to positive. A valley at –0.7 becomes a peak at 0.7 — creating sharp ridges where the noise crosses zero.

**When to use it:** Mountain ridges, rocky spines, canyon walls. Gives a very different feel to flat simplex noise.

```nodegraph
{
  "height": 150,
  "nodes": [
    { "id": "n",   "label": "SimplexNoise2D", "category": "generative", "sub": "–1 to 1", "x": 0,   "y": 45 },
    { "id": "abs", "label": "Abs",           "category": "math",       "sub": "0 to 1",  "x": 240, "y": 45 },
    { "id": "out", "label": "Output",        "category": "output",                        "x": 480, "y": 45 }
  ],
  "edges": [
    { "from": "n",   "to": "abs", "label": "signed" },
    { "from": "abs", "to": "out", "label": "ridges" }
  ]
}
```

---

## 3. Height Gradient (CoordinateY → Normalizer)

**What it does:** Reads the raw world Y coordinate and remaps it to [0, 1]. Y=0 → 0, Y=256 → 1.

**When to use it:** Anything that should change smoothly with altitude — ore frequency, vegetation density, fog thickness. A building block for almost every material layering setup.

```nodegraph
{
  "height": 150,
  "nodes": [
    { "id": "cy",  "label": "CoordinateY", "category": "position", "sub": "world Y",       "x": 0,   "y": 45 },
    { "id": "nr",  "label": "Normalizer",  "category": "filter",   "sub": "[0,256]→[0,1]", "x": 240, "y": 45 },
    { "id": "out", "label": "Output",      "category": "output",                            "x": 480, "y": 45 }
  ],
  "edges": [
    { "from": "cy", "to": "nr",  "label": "0–256" },
    { "from": "nr", "to": "out", "label": "0–1" }
  ]
}
```

---

## 4. BaseHeight + CurveFunction (Height Profile)

**What it does:** `BaseHeight` outputs 0 at a reference Y, negative below, positive above. `CurveFunction` remaps those values through a hand-drawn curve to sculpt the vertical terrain profile — flat plains, sharp cliffs, or rolling hills.

**When to use it:** Every terrain setup needs this as its vertical backbone before adding noise.

```nodegraph
{
  "height": 190,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",    "category": "position",  "sub": "Y = 64",         "x": 0,   "y": 30 },
    { "id": "cf",  "label": "CurveFunction", "category": "filter",    "sub": "height profile",  "x": 240, "y": 30 },
    { "id": "sn",  "label": "SimplexNoise2D","category": "generative","sub": "±surface vary",   "x": 0,   "y": 130 },
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
    { "nodeId": "bh",  "text": "BaseHeight outputs 0 at Y=64, positive above (solid), negative below (air). It is the vertical zero-line of your terrain. Every terrain graph starts here." },
    { "nodeId": "cf",  "text": "CurveFunction remaps the BaseHeight value through a hand-drawn curve. A flat line keeps the default shape. An S-curve creates cliff overhangs. A steep drop at one end creates mesas. This is how you sculpt terrain height without noise." },
    { "nodeId": "sn",  "text": "SimplexNoise2D adds horizontal variation to the terrain — hills and valleys. Without it, the terrain would be completely flat at every Y level defined by the curve." },
    { "nodeId": "sum", "text": "Sum adds the CurveFunction output and the noise together. The curve sets the overall vertical shape; the noise gives it organic surface variation. Both are still in density units — positive = solid." },
    { "nodeId": "out", "text": "Terrain Out is the final connection. Whatever density value reaches this node is used to decide solid vs air for every block in the world." }
  ]
}
```

---

## 5. Scale + Offset (AmplitudeConstant + Constant → Sum)

**What it does:** Multiply a density by a constant scale factor, then add a fixed offset. This is the manual equivalent of `LinearTransform`.

**When to use it:** When you need independent control over scale and offset, or when chaining with other nodes that `LinearTransform` can't reach.

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "src", "label": "SimplexNoise2D",    "category": "generative", "sub": "source",     "x": 0,   "y": 70 },
    { "id": "amp", "label": "AmplitudeConstant", "category": "math",       "sub": "× 2.0",      "x": 240, "y": 20 },
    { "id": "con", "label": "Constant",          "category": "math",       "sub": "offset +0.5","x": 240, "y": 130 },
    { "id": "sum", "label": "Sum",               "category": "math",                            "x": 480, "y": 70 },
    { "id": "out", "label": "Output",            "category": "output",                          "x": 700, "y": 70 }
  ],
  "edges": [
    { "from": "src", "to": "amp" },
    { "from": "amp", "to": "sum" },
    { "from": "con", "to": "sum", "label": "+0.5" },
    { "from": "sum", "to": "out" }
  ]
}
```

---

## 6. Blend Between Two Densities

**What it does:** `Blend` mixes two input densities using a third as the factor. Factor = 0 → pure A, Factor = 1 → pure B, anything in between → interpolated. The factor must be in [0, 1] — use `Normalizer` if your source isn't already in that range.

**When to use it:** Mixing two terrain styles smoothly. Transitioning between sand dunes and rocky hills. Biome surface blending.

```nodegraph
{
  "height": 230,
  "nodes": [
    { "id": "a",   "label": "SimplexNoise2D", "category": "generative", "sub": "terrain A",    "x": 0,   "y": 0   },
    { "id": "b",   "label": "FractalNoise2D", "category": "generative", "sub": "terrain B",    "x": 0,   "y": 100 },
    { "id": "f",   "label": "VoronoiNoise2D", "category": "generative", "sub": "blend factor", "x": 0,   "y": 185 },
    { "id": "nr",  "label": "Normalizer",     "category": "filter",     "sub": "[–1,1]→[0,1]", "x": 240, "y": 185 },
    { "id": "bl",  "label": "Blend",          "category": "math",                              "x": 480, "y": 90  },
    { "id": "out", "label": "Output",         "category": "output",                            "x": 700, "y": 90  }
  ],
  "edges": [
    { "from": "a",  "to": "bl", "label": "A" },
    { "from": "b",  "to": "bl", "label": "B" },
    { "from": "f",  "to": "nr" },
    { "from": "nr", "to": "bl", "label": "0–1 factor" },
    { "from": "bl", "to": "out" }
  ]
}
```

---

## 7. Conditional (if / else branching)

**What it does:** Evaluates a condition density at each point. If it exceeds the threshold, the output is the `true` branch; otherwise the `false` branch.

**When to use it:** Hard switches between terrain types at a depth boundary (e.g. above Y=40 → normal terrain, below → cave density). Also useful for above/below sea-level logic.

```nodegraph
{
  "height": 220,
  "nodes": [
    { "id": "t",    "label": "CaveDensity",    "category": "terrain",    "sub": "below Y 40",   "x": 0,   "y": 0   },
    { "id": "cond", "label": "CoordinateY",    "category": "position",   "sub": "Y < 40 = caves","x": 0,   "y": 100 },
    { "id": "f",    "label": "SimplexNoise3D", "category": "generative", "sub": "above Y 40",   "x": 0,   "y": 185 },
    { "id": "c",    "label": "Conditional",    "category": "math",       "sub": "threshold 40",  "x": 280, "y": 90  },
    { "id": "out",  "label": "Output",         "category": "output",                             "x": 520, "y": 90  }
  ],
  "edges": [
    { "from": "cond", "to": "c", "label": "condition" },
    { "from": "t",    "to": "c", "label": "if < 40" },
    { "from": "f",    "to": "c", "label": "if ≥ 40" },
    { "from": "c",    "to": "out" }
  ]
}
```

---

## 8. Domain Warp (turbulent / swirling terrain)

**What it does:** `DomainWarp2D` displaces the sampling coordinates fed into a downstream noise node, making the terrain twist and swirl. The first noise drives the warp direction; the second produces the actual density values at the warped position.

**When to use it:** Organic-feeling terrain with no straight edges. Rivers, eroded landscapes, cave system chaos.

```nodegraph
{
  "height": 160,
  "nodes": [
    { "id": "wn",  "label": "SimplexNoise2D", "category": "generative", "sub": "warp direction", "x": 0,   "y": 55 },
    { "id": "dw",  "label": "DomainWarp2D",   "category": "filter",     "sub": "strength 64",    "x": 240, "y": 55 },
    { "id": "tn",  "label": "FractalNoise2D", "category": "generative", "sub": "warped output",  "x": 480, "y": 55 },
    { "id": "out", "label": "Output",         "category": "output",                              "x": 700, "y": 55 }
  ],
  "edges": [
    { "from": "wn",  "to": "dw",  "label": "warp" },
    { "from": "dw",  "to": "tn",  "label": "offset pos" },
    { "from": "tn",  "to": "out" }
  ]
}
```

---

## 9. SmoothMin (organic cave merging)

**What it does:** Like `MinFunction` — keeps the smaller (more empty) of two densities — but with a configurable blend radius that smooths the boundary between them. Hard `Min` gives a sharp seam; `SmoothMin` gives a rounded join.

**When to use it:** Merging cave systems, arches, tunnels, any hollow carving that should look natural rather than geometric.

```nodegraph
{
  "height": 175,
  "nodes": [
    { "id": "t",   "label": "Sum (terrain)",  "category": "math",    "sub": "solid terrain", "x": 0,   "y": 20  },
    { "id": "c",   "label": "CaveDensity",    "category": "terrain", "sub": "cave shape",    "x": 0,   "y": 120 },
    { "id": "sm",  "label": "SmoothMin",      "category": "math",    "sub": "radius 0.2",    "x": 280, "y": 65  },
    { "id": "out", "label": "Output",         "category": "output",                          "x": 520, "y": 65  }
  ],
  "edges": [
    { "from": "t",  "to": "sm" },
    { "from": "c",  "to": "sm", "label": "cave" },
    { "from": "sm", "to": "out" }
  ]
}
```

---

## 10. Biome Edge Fade (DistanceToBiomeEdge → Blend)

**What it does:** `DistanceToBiomeEdge` outputs a value based on how far you are from the nearest biome boundary — 0 at the edge, increasing inward. Normalize it and use it as a `Blend` factor to fade between two terrain features near boundaries.

**When to use it:** Natural-looking biome transitions. Fading out trees near a desert border, blending cliff terrain into plains terrain, softening hard biome seams.

```nodegraph
{
  "height": 210,
  "nodes": [
    { "id": "dbe", "label": "DistanceToBiomeEdge","category": "terrain",    "sub": "0 at edge",    "x": 0,   "y": 90  },
    { "id": "nr",  "label": "Normalizer",         "category": "filter",     "sub": "[0,32]→[0,1]", "x": 240, "y": 90  },
    { "id": "a",   "label": "SimplexNoise2D",     "category": "generative", "sub": "feature A",    "x": 0,   "y": 0   },
    { "id": "b",   "label": "SimplexNoise3D",     "category": "generative", "sub": "feature B",    "x": 0,   "y": 180 },
    { "id": "bl",  "label": "Blend",              "category": "math",                              "x": 480, "y": 90  },
    { "id": "out", "label": "Output",             "category": "output",                            "x": 700, "y": 90  }
  ],
  "edges": [
    { "from": "dbe", "to": "nr" },
    { "from": "nr",  "to": "bl", "label": "0–1 factor" },
    { "from": "a",   "to": "bl", "label": "A" },
    { "from": "b",   "to": "bl", "label": "B" },
    { "from": "bl",  "to": "out" }
  ]
}
```

---

## 11. Shape SDF — Island Mask

**What it does:** Shape SDF nodes output a signed distance field — negative inside the shape, positive outside. `Ellipsoid` makes a bubble. `MaxFunction` keeps only density that is both inside the ellipsoid AND above the plane — creating an island that fades out at its edges.

**When to use it:** Floating islands, contained biome areas, arena-style world shapes, volcanic calderas.

```nodegraph
{
  "height": 240,
  "nodes": [
    { "id": "el",  "label": "Ellipsoid",     "category": "shape",      "sub": "r 200,80,200",    "x": 0,   "y": 20  },
    { "id": "pl",  "label": "Plane",         "category": "shape",      "sub": "Y = 64 base",     "x": 0,   "y": 120 },
    { "id": "mx",  "label": "MaxFunction",   "category": "math",       "sub": "island mask",     "x": 280, "y": 65  },
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
  ]
}
```

---

## 12. Fractal Layering (WeightedSum)

**What it does:** Manually stack multiple noise frequencies — low frequency for large features, high frequency for fine detail — each with its own weight. This is what `FractalNoise2D` does internally, but done manually so you can control each octave independently.

**When to use it:** Custom fractal terrain where each octave needs different seeds, scales, or types. Mix 2D and 3D octaves in the same stack.

```nodegraph
{
  "height": 240,
  "nodes": [
    { "id": "n1",  "label": "SimplexNoise2D", "category": "generative", "sub": "freq 0.005 w=1.0", "x": 0,   "y": 0   },
    { "id": "n2",  "label": "SimplexNoise2D", "category": "generative", "sub": "freq 0.02  w=0.5", "x": 0,   "y": 90  },
    { "id": "n3",  "label": "SimplexNoise2D", "category": "generative", "sub": "freq 0.08  w=0.25","x": 0,   "y": 180 },
    { "id": "ws",  "label": "WeightedSum",    "category": "math",       "sub": "weights 1,0.5,0.25","x": 290, "y": 90  },
    { "id": "out", "label": "Output",         "category": "output",                                "x": 530, "y": 90  }
  ],
  "edges": [
    { "from": "n1", "to": "ws", "label": "coarse" },
    { "from": "n2", "to": "ws", "label": "mid" },
    { "from": "n3", "to": "ws", "label": "fine" },
    { "from": "ws", "to": "out" }
  ]
}
```

---

## 13. YSampled Performance Wrap

**What it does:** Wraps any subgraph in `YSampled`, which samples the wrapped density at coarse Y intervals (default: every 4 blocks) and linearly interpolates between them. Gives ~4× speedup. The tradeoff is slight smoothing in the vertical direction.

**When to use it:** Around any expensive 3D subgraph — FractalNoise3D, DomainWarp, multi-Sum chains. Always apply before shipping a world to production. Virtually invisible at step size ≤ 4.

```nodegraph
{
  "height": 160,
  "nodes": [
    { "id": "fn",  "label": "FractalNoise2D", "category": "generative", "sub": "expensive",     "x": 0,   "y": 30 },
    { "id": "cf",  "label": "CurveFunction",  "category": "filter",     "sub": "height profile", "x": 240, "y": 0  },
    { "id": "sum", "label": "Sum",            "category": "math",                               "x": 480, "y": 30 },
    { "id": "ys",  "label": "YSampled",       "category": "terrain",    "sub": "step = 4",       "x": 680, "y": 30 },
    { "id": "out", "label": "Output",         "category": "output",                             "x": 900, "y": 30 }
  ],
  "edges": [
    { "from": "fn",  "to": "cf" },
    { "from": "fn",  "to": "sum" },
    { "from": "cf",  "to": "sum" },
    { "from": "sum", "to": "ys",  "label": "wrap" },
    { "from": "ys",  "to": "out", "label": "fast" }
  ]
}
```

---

## 14. Full Overworld Terrain Stack

**What it does:** A complete typical terrain graph combining everything above — height profile, surface noise, cave carving, and performance wrapping. This is a production-ready starting point.

**Beginner tip:** Build this one node at a time. Start with just `BaseHeight → Terrain Out`, add `CurveFunction`, then noise, then caves.

```nodegraph
{
  "height": 300,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",     "category": "position",   "sub": "Y = 64",           "x": 0,   "y": 0   },
    { "id": "cf",  "label": "CurveFunction",  "category": "filter",     "sub": "height profile",    "x": 240, "y": 0   },
    { "id": "sn",  "label": "SimplexNoise2D", "category": "generative", "sub": "surface variation", "x": 0,   "y": 110 },
    { "id": "sum", "label": "Sum",            "category": "math",       "sub": "base terrain",      "x": 480, "y": 50  },
    { "id": "ys",  "label": "YSampled",       "category": "terrain",    "sub": "step = 4",          "x": 680, "y": 50  },
    { "id": "c3",  "label": "SimplexNoise3D", "category": "generative", "sub": "cave noise",        "x": 0,   "y": 210 },
    { "id": "neg", "label": "Negate",         "category": "math",       "sub": "flip to hollow",    "x": 240, "y": 210 },
    { "id": "mn",  "label": "MinFunction",    "category": "math",       "sub": "carve caves",       "x": 860, "y": 130 },
    { "id": "out", "label": "Terrain Out",    "category": "output",                                 "x": 1060,"y": 130 }
  ],
  "edges": [
    { "from": "bh",  "to": "cf" },
    { "from": "cf",  "to": "sum" },
    { "from": "sn",  "to": "sum" },
    { "from": "sum", "to": "ys" },
    { "from": "ys",  "to": "mn", "label": "terrain" },
    { "from": "c3",  "to": "neg" },
    { "from": "neg", "to": "mn", "label": "caves" },
    { "from": "mn",  "to": "out" }
  ],
  "steps": [
    { "nodeId": "bh",  "text": "BaseHeight — the vertical zero-line. Outputs 0 at Y=64. Above 64 is positive (solid); below is negative (air). This is always the first node in any terrain graph." },
    { "nodeId": "cf",  "text": "CurveFunction shapes the terrain profile. The curve maps height values to new density values — creating cliffs, plateaus, and slopes without any noise." },
    { "nodeId": "sn",  "text": "SimplexNoise2D adds organic horizontal variation. Low frequency (e.g. 0.005) gives broad rolling hills. Higher frequency gives rocky jagged surfaces." },
    { "nodeId": "sum", "text": "Sum combines the height profile and the noise into a single density field. Positive = solid, negative = air. This is your base terrain before caves are carved." },
    { "nodeId": "ys",  "text": "YSampled wraps the expensive Sum subgraph and samples it every 4 Y levels instead of every block. Linearly interpolates between samples. ~4× performance gain with minimal visual difference." },
    { "nodeId": "c3",  "text": "SimplexNoise3D generates 3D noise — varying in all three dimensions. This is what makes caves vary in height and shape, rather than going straight horizontally like 2D noise would." },
    { "nodeId": "neg", "text": "Negate flips the sign of the cave noise. Without this, high cave noise values would be solid. After Negate, high cave noise = very negative = very empty = a big cave void." },
    { "nodeId": "mn",  "text": "MinFunction keeps whichever input is smaller (more empty) at each point. Where the terrain is solid but the cave is negative, the cave wins and carves a hole. Where the terrain is already air, it stays air." },
    { "nodeId": "out", "text": "Terrain Out — the final density value for every block in the world. Positive = solid block placed. Zero or negative = air. Everything feeding into this node has shaped what the player will walk on." }
  ]
}
```
