# Node Combination Patterns

This guide shows common ways to combine nodes in TerraNova. Each diagram reflects how the nodes connect in the actual editor.

---

## 1. Noise → Normalizer

Raw noise outputs in [–Amplitude, +Amplitude]. Feed it through `Normalizer` to remap to any range, e.g. [0, 1] for use as a blend weight.

```nodegraph
{
  "height": 140,
  "nodes": [
    { "id": "n",   "label": "SimplexNoise2D", "category": "generative", "sub": "–1 to 1",   "x": 0,   "y": 40 },
    { "id": "nr",  "label": "Normalizer",     "category": "filter",     "sub": "[–1,1]→[0,1]","x": 200, "y": 40 },
    { "id": "out", "label": "Output",         "category": "output",                           "x": 400, "y": 40 }
  ],
  "edges": [
    { "from": "n",  "to": "nr",  "label": "raw" },
    { "from": "nr", "to": "out", "label": "0 to 1" }
  ]
}
```

---

## 2. Ridge Noise (Noise → Abs)

`Abs` folds negative values to positive, turning valleys into peaks and producing a ridge-like output in [0, Amplitude].

```nodegraph
{
  "height": 140,
  "nodes": [
    { "id": "n",   "label": "SimplexNoise2D",      "category": "generative", "sub": "–1 to 1", "x": 0,   "y": 40 },
    { "id": "abs", "label": "Abs",                 "category": "math",       "sub": "0 to 1",  "x": 200, "y": 40 },
    { "id": "out", "label": "Output",              "category": "output",                        "x": 400, "y": 40 }
  ],
  "edges": [
    { "from": "n",   "to": "abs", "label": "signed" },
    { "from": "abs", "to": "out", "label": "ridges" }
  ]
}
```

---

## 3. Height Gradient (CoordinateY → Normalizer)

Read the raw Y coordinate and remap it to [0, 1] to create a smooth vertical gradient — denser at the bottom, sparser at the top.

```nodegraph
{
  "height": 140,
  "nodes": [
    { "id": "cy",  "label": "CoordinateY", "category": "position", "sub": "world Y",      "x": 0,   "y": 40 },
    { "id": "nr",  "label": "Normalizer",  "category": "filter",   "sub": "[0,256]→[0,1]","x": 200, "y": 40 },
    { "id": "out", "label": "Output",      "category": "output",                           "x": 400, "y": 40 }
  ],
  "edges": [
    { "from": "cy", "to": "nr",  "label": "0–256" },
    { "from": "nr", "to": "out", "label": "0–1" }
  ]
}
```

---

## 4. Scale + Offset (AmplitudeConstant → Sum + Constant)

Multiply a density by a constant scale then add a fixed offset. This is the manual form of `LinearTransform`.

```nodegraph
{
  "height": 180,
  "nodes": [
    { "id": "src", "label": "SimplexNoise2D",   "category": "generative", "sub": "source",   "x": 0,   "y": 30 },
    { "id": "amp", "label": "AmplitudeConstant","category": "math",       "sub": "scale ×2", "x": 200, "y": 0  },
    { "id": "con", "label": "Constant",         "category": "math",       "sub": "offset 0.5","x": 200, "y": 110 },
    { "id": "sum", "label": "Sum",              "category": "math",                           "x": 400, "y": 55 },
    { "id": "out", "label": "Output",           "category": "output",                         "x": 580, "y": 55 }
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

## 5. Blend Between Two Densities

`Blend` mixes two inputs using a third density as the blend factor (0 = fully A, 1 = fully B). Use noise as the factor for organic-feeling transitions.

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "a",   "label": "SimplexNoise2D",  "category": "generative", "sub": "terrain A",     "x": 0,   "y": 0   },
    { "id": "b",   "label": "FractalNoise2D",  "category": "generative", "sub": "terrain B",     "x": 0,   "y": 90  },
    { "id": "f",   "label": "VoronoiNoise2D",  "category": "generative", "sub": "blend factor",  "x": 0,   "y": 160 },
    { "id": "nr",  "label": "Normalizer",      "category": "filter",     "sub": "[–1,1]→[0,1]",  "x": 200, "y": 160 },
    { "id": "bl",  "label": "Blend",           "category": "math",                               "x": 400, "y": 80  },
    { "id": "out", "label": "Output",          "category": "output",                             "x": 580, "y": 80  }
  ],
  "edges": [
    { "from": "a",  "to": "bl", "label": "A" },
    { "from": "b",  "to": "bl", "label": "B" },
    { "from": "f",  "to": "nr" },
    { "from": "nr", "to": "bl", "label": "factor" },
    { "from": "bl", "to": "out" }
  ]
}
```

---

## 6. Conditional (if / else)

`Conditional` outputs one of two densities based on whether a condition density crosses a threshold. Use it to switch terrain types at a boundary.

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "cond", "label": "CoordinateY",    "category": "position",   "sub": "Y < 64 = caves", "x": 0,   "y": 80  },
    { "id": "t",    "label": "CaveDensity",    "category": "terrain",    "sub": "true branch",    "x": 0,   "y": 0   },
    { "id": "f",    "label": "SimplexNoise3D", "category": "generative", "sub": "false branch",   "x": 0,   "y": 160 },
    { "id": "c",    "label": "Conditional",    "category": "math",       "sub": "threshold 64",   "x": 240, "y": 80  },
    { "id": "out",  "label": "Output",         "category": "output",                              "x": 430, "y": 80  }
  ],
  "edges": [
    { "from": "cond", "to": "c", "label": "condition" },
    { "from": "t",    "to": "c", "label": "if true" },
    { "from": "f",    "to": "c", "label": "if false" },
    { "from": "c",    "to": "out" }
  ]
}
```

---

## 7. Domain Warp (Noise → DomainWarp2D → Noise)

`DomainWarp2D` displaces the sampling position of a downstream noise function, creating swirling, turbulent terrain.

```nodegraph
{
  "height": 160,
  "nodes": [
    { "id": "wn",  "label": "SimplexNoise2D", "category": "generative", "sub": "warp source",   "x": 0,   "y": 50 },
    { "id": "dw",  "label": "DomainWarp2D",   "category": "filter",     "sub": "strength 64",   "x": 200, "y": 50 },
    { "id": "tn",  "label": "FractalNoise2D", "category": "generative", "sub": "warped noise",  "x": 400, "y": 50 },
    { "id": "out", "label": "Output",         "category": "output",                             "x": 580, "y": 50 }
  ],
  "edges": [
    { "from": "wn",  "to": "dw", "label": "warp" },
    { "from": "dw",  "to": "tn", "label": "position" },
    { "from": "tn",  "to": "out" }
  ]
}
```

---

## 8. Smooth Minimum (cave blend)

`SmoothMin` merges two densities like `MinFunction` but with a configurable smooth radius, blending the transition. Great for organic cave merging.

```nodegraph
{
  "height": 160,
  "nodes": [
    { "id": "t",   "label": "Sum (terrain)",  "category": "math",       "sub": "solid terrain", "x": 0,   "y": 20  },
    { "id": "c",   "label": "CaveDensity",    "category": "terrain",    "sub": "cave shape",    "x": 0,   "y": 110 },
    { "id": "sm",  "label": "SmoothMin",      "category": "math",       "sub": "radius 0.2",    "x": 230, "y": 55  },
    { "id": "out", "label": "Output",         "category": "output",                             "x": 420, "y": 55  }
  ],
  "edges": [
    { "from": "t",  "to": "sm" },
    { "from": "c",  "to": "sm", "label": "cave" },
    { "from": "sm", "to": "out" }
  ]
}
```

---

## 9. Biome Edge Fade (DistanceToBiomeEdge → Blend)

Fade a prop density or terrain feature in/out near biome boundaries using `DistanceToBiomeEdge` as a blend weight.

```nodegraph
{
  "height": 180,
  "nodes": [
    { "id": "dbe", "label": "DistanceToBiomeEdge","category": "terrain",  "sub": "0 at edge",     "x": 0,   "y": 80  },
    { "id": "nr",  "label": "Normalizer",         "category": "filter",   "sub": "[0,32]→[0,1]",  "x": 200, "y": 80  },
    { "id": "a",   "label": "CaveDensity",        "category": "terrain",  "sub": "feature A",     "x": 0,   "y": 0   },
    { "id": "b",   "label": "SimplexNoise3D",     "category": "generative","sub": "feature B",    "x": 0,   "y": 160 },
    { "id": "bl",  "label": "Blend",              "category": "math",                             "x": 400, "y": 80  },
    { "id": "out", "label": "Output",             "category": "output",                           "x": 570, "y": 80  }
  ],
  "edges": [
    { "from": "dbe", "to": "nr" },
    { "from": "nr",  "to": "bl", "label": "factor" },
    { "from": "a",   "to": "bl", "label": "A" },
    { "from": "b",   "to": "bl", "label": "B" },
    { "from": "bl",  "to": "out" }
  ]
}
```

---

## 10. Shape SDF — Island

Combine a flat `Plane` with an `Ellipsoid` SDF using `MaxFunction` to create an island shape — solid only where both the terrain and the ellipsoid overlap.

```nodegraph
{
  "height": 180,
  "nodes": [
    { "id": "el",  "label": "Ellipsoid",    "category": "shape",      "sub": "radii 200,80,200", "x": 0,   "y": 20  },
    { "id": "pl",  "label": "Plane",        "category": "shape",      "sub": "Y = 64",           "x": 0,   "y": 120 },
    { "id": "mx",  "label": "MaxFunction",  "category": "math",       "sub": "island mask",      "x": 230, "y": 65  },
    { "id": "sn",  "label": "SimplexNoise2D","category":"generative", "sub": "surface detail",   "x": 0,   "y": 220 },
    { "id": "sum", "label": "Sum",          "category": "math",                                  "x": 400, "y": 110 },
    { "id": "out", "label": "Output",       "category": "output",                                "x": 570, "y": 110 }
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

## 11. Fractal Detail Layering (WeightedSum)

Layer multiple noise octaves manually using `WeightedSum` to control each frequency's contribution independently.

```nodegraph
{
  "height": 220,
  "nodes": [
    { "id": "n1",  "label": "SimplexNoise2D", "category": "generative", "sub": "freq 0.005 × 1.0","x": 0,   "y": 0   },
    { "id": "n2",  "label": "SimplexNoise2D", "category": "generative", "sub": "freq 0.02 × 0.5", "x": 0,   "y": 80  },
    { "id": "n3",  "label": "SimplexNoise2D", "category": "generative", "sub": "freq 0.08 × 0.25","x": 0,   "y": 160 },
    { "id": "ws",  "label": "WeightedSum",    "category": "math",       "sub": "w: 1, 0.5, 0.25", "x": 240, "y": 80  },
    { "id": "out", "label": "Output",         "category": "output",                               "x": 420, "y": 80  }
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

## 12. YSampled Performance Wrap

Wrap any expensive subgraph in `YSampled` to sample at coarse Y intervals and interpolate. Gives ~4× speedup with negligible visual difference for slow-varying vertical density.

```nodegraph
{
  "height": 180,
  "nodes": [
    { "id": "n",   "label": "FractalNoise2D", "category": "generative", "sub": "expensive",    "x": 0,   "y": 30  },
    { "id": "cm",  "label": "CurveFunction",  "category": "filter",     "sub": "height curve", "x": 200, "y": 0   },
    { "id": "sum", "label": "Sum",            "category": "math",                              "x": 380, "y": 30  },
    { "id": "ys",  "label": "YSampled",       "category": "terrain",    "sub": "step = 4",     "x": 540, "y": 30  },
    { "id": "out", "label": "Output",         "category": "output",                            "x": 710, "y": 30  }
  ],
  "edges": [
    { "from": "n",   "to": "cm" },
    { "from": "n",   "to": "sum" },
    { "from": "cm",  "to": "sum" },
    { "from": "sum", "to": "ys",  "label": "wrap" },
    { "from": "ys",  "to": "out", "label": "fast" }
  ]
}
```

---

## 13. Full Overworld Terrain Stack

A complete typical terrain graph: height profile + surface noise + cave carving + YSampled performance wrap.

```nodegraph
{
  "height": 280,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",     "category": "position",   "sub": "Y = 64",         "x": 0,   "y": 0   },
    { "id": "cf",  "label": "CurveFunction",  "category": "filter",     "sub": "height profile",  "x": 180, "y": 0   },
    { "id": "sn",  "label": "SimplexNoise2D", "category": "generative", "sub": "surface varies",  "x": 0,   "y": 100 },
    { "id": "sum", "label": "Sum",            "category": "math",       "sub": "terrain",         "x": 360, "y": 40  },
    { "id": "ys",  "label": "YSampled",       "category": "terrain",    "sub": "step = 4",        "x": 500, "y": 40  },
    { "id": "c3",  "label": "SimplexNoise3D", "category": "generative", "sub": "cave noise",      "x": 0,   "y": 190 },
    { "id": "neg", "label": "Negate",         "category": "math",       "sub": "flip caves",      "x": 180, "y": 190 },
    { "id": "mn",  "label": "MinFunction",    "category": "math",       "sub": "carve",           "x": 640, "y": 100 },
    { "id": "out", "label": "Terrain Out",    "category": "output",                               "x": 820, "y": 100 }
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
  ]
}
```
