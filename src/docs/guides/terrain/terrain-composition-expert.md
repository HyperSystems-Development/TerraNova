# Guide: Expert Terrain Composition

**Difficulty:** Expert

This guide covers techniques that require a full understanding of graph evaluation order, world-space coordinate relationships, and the boundary between density graphs and the material/biome systems. These are not just harder recipes — they require thinking about the density system as a pipeline, not a single graph.

Prerequisites: everything in [Complex Terrain Techniques](./terrain-types-advanced.md) and [Expert Terrain Techniques](./terrain-types-expert.md). Assumes comfort with `MultiMix`, `Switch`, `Cache`, `Exported`/`Imported`, `YSampled`, and the preview vs. runtime gap.

---

## 1. Conditional Terrain by World Zone (XZ-Gated Switch)

**What it does:** Applies entirely different terrain graphs to different rectangular or circular world regions — a spawn island with gentle terrain, a wilderness zone with mountains, an endgame zone with extreme alien landscapes. Each zone uses its own subgraph, selected by world-space position.

**Why it's expert:** The `Switch` node branches on a continuous density value, not a boolean. Expressing "within 500 blocks of world origin" as a density function requires building a radial distance function from scratch using coordinate arithmetic. The gating signal must stay stable across the entire zone boundary without visible seams.

**The recipe:** Build a distance-from-origin signal using `XValue`, `ZValue`, two `Multiplier` nodes (self-multiply for squaring), `Sum`, and a `CurveMapper` that converts the squared distance to a 0-or-1 zone flag.

```nodegraph
{
  "height": 340,
  "nodes": [
    { "id": "xv",  "label": "XValue",       "category": "density", "sub": "world X",              "x": 0,   "y": 0   },
    { "id": "xsc", "label": "Scale",        "category": "density", "sub": "ScaleX 0.002",         "x": 200, "y": 0   },
    { "id": "xsq", "label": "Multiplier",   "category": "math",    "sub": "X²",                   "x": 380, "y": 0   },
    { "id": "zv",  "label": "ZValue",       "category": "density", "sub": "world Z",              "x": 0,   "y": 80  },
    { "id": "zsc", "label": "Scale",        "category": "density", "sub": "ScaleZ 0.002",         "x": 200, "y": 80  },
    { "id": "zsq", "label": "Multiplier",   "category": "math",    "sub": "Z²",                   "x": 380, "y": 80  },
    { "id": "rsum","label": "Sum",          "category": "math",    "sub": "X²+Z²",                "x": 560, "y": 40  },
    { "id": "rcm", "label": "CurveMapper",  "category": "filter",  "sub": "dist→zone flag",       "x": 740, "y": 40  },
    { "id": "ta",  "label": "Sum (spawn)",  "category": "density", "sub": "gentle hills",         "x": 0,   "y": 200 },
    { "id": "tb",  "label": "Sum (wilds)",  "category": "density", "sub": "mountains + caves",    "x": 0,   "y": 280 },
    { "id": "sw",  "label": "Switch",       "category": "density", "sub": "zone gate",            "x": 940, "y": 150 },
    { "id": "ys",  "label": "YSampled",     "category": "density", "sub": "SampleDistance 4",     "x": 1120,"y": 150 },
    { "id": "out", "label": "Terrain Out",  "category": "output",                                 "x": 1300,"y": 150 }
  ],
  "edges": [
    { "from": "xv",   "to": "xsc" },
    { "from": "xsc",  "to": "xsq" },
    { "from": "xsq",  "to": "rsum" },
    { "from": "zv",   "to": "zsc" },
    { "from": "zsc",  "to": "zsq" },
    { "from": "zsq",  "to": "rsum" },
    { "from": "rsum", "to": "rcm" },
    { "from": "rcm",  "to": "sw",  "label": "selector" },
    { "from": "ta",   "to": "sw",  "label": "zone A (spawn)" },
    { "from": "tb",   "to": "sw",  "label": "zone B (wilds)" },
    { "from": "sw",   "to": "ys" },
    { "from": "ys",   "to": "out" }
  ]
}
```

**Key parameters:**
- `xsc`/`zsc` `Scale` value: `0.002` means the unit circle in scaled space = 500 world blocks radius; `0.001` = 1000-block spawn zone
- `xsq`/`zsq` `Multiplier`: connect both inputs to the same scaled coordinate (self-multiply produces squared value)
- `rcm` curve shape: flat at 0 for small `rsum` values (inside the zone → zone A), then a smooth S-curve transition, then flat at 1 outside (zone B). Transition width is the slope width of the S-curve
- `Switch` selector: `0` = pure zone A; `1` = pure zone B; values in between blend linearly

> [!IMPORTANT]
> Both terrain inputs to `Switch` are evaluated regardless of which zone a point is in. `Switch` selects between already-evaluated values — it does not skip evaluation of the losing branch. For heavy terrain graphs, use `Exported`/`Imported` + `SingleInstance` on each zone subgraph to avoid evaluating each 16K times per chunk when only one is needed.

**Variations:**
- Use `XValue` alone (no Z) for a simple east–west zone gate — half the world is one style, half is another
- Stack two `Switch` nodes for three zones: origin → transition → outer

---

## 2. Seeded Per-Island Variation (Cell-Indexed Subgraphs)

**What it does:** Gives each Voronoi cell its own terrain variant — an archipelago where every island has a different height profile, noise scale, or shape, all from a single connected graph without per-island manual setup.

**Why it's expert:** CellNoise gives you a cell index (an integer identifying which cell a point belongs to). Feeding that index as a selector into `MultiMix` with different terrain subgraphs per segment lets the cell index route each region to a different terrain style. The cell index is deterministic and seed-stable.

**The recipe:** `CellNoise2D` outputs a cell hash value. `Normalizer` maps it to `[0, 1]`. `MultiMix` routes to one of N terrain subgraphs based on the hash.

```nodegraph
{
  "height": 320,
  "nodes": [
    { "id": "cn",  "label": "CellNoise2D",  "category": "density", "sub": "Scale 0.003 hash",     "x": 0,   "y": 0   },
    { "id": "nr",  "label": "Normalizer",   "category": "density", "sub": "[0,1] cell index",     "x": 200, "y": 0   },
    { "id": "t1",  "label": "Sum (flat)",   "category": "density", "sub": "BaseHeight + low noise","x": 0,   "y": 100 },
    { "id": "t2",  "label": "Sum (hilly)",  "category": "density", "sub": "mid-amp noise",        "x": 0,   "y": 180 },
    { "id": "t3",  "label": "Sum (tall)",   "category": "density", "sub": "high-amp + ridges",    "x": 0,   "y": 260 },
    { "id": "mm",  "label": "MultiMix",     "category": "density", "sub": "keys 0.33 0.66",       "x": 380, "y": 140 },
    { "id": "ys",  "label": "YSampled",     "category": "density", "sub": "SampleDistance 4",     "x": 580, "y": 140 },
    { "id": "out", "label": "Terrain Out",  "category": "output",                                 "x": 760, "y": 140 }
  ],
  "edges": [
    { "from": "cn",  "to": "nr" },
    { "from": "nr",  "to": "mm",  "label": "cell selector" },
    { "from": "t1",  "to": "mm",  "label": "Key 0.33" },
    { "from": "t2",  "to": "mm",  "label": "Key 0.66" },
    { "from": "t3",  "to": "mm",  "label": "Key 1.0" },
    { "from": "mm",  "to": "ys" },
    { "from": "ys",  "to": "out" }
  ]
}
```

**Key parameters:**
- `cn` Scale: `0.003` — determines island/cell size; `0.001` = large continent-scale regions, `0.01` = small-island archipelago
- `CellNoise2D` hash output: use the default cell center hash mode (not `CellWallDistance`) — this outputs a stable per-cell value in `[-1, 1]` range
- `MultiMix` `Keys`: `[0.0, 0.33, 0.66, 1.0]` — three terrain types distributed evenly across the cell index space; roughly 1/3 of cells get each type. Adjust spacing to weight certain types more common

> [!TIP]
> The `MultiMix` blend zone between segments means cells near a key boundary blend between two terrain types. This is actually desirable — it creates smooth transitions at cell edges without any additional nodes.

**Variations:**
- Use four or five terrain variants for more island diversity; keep keys evenly spaced for equal distribution
- Add `CellWallDistance` alongside `CellNoise2D` and subtract it from density at cell boundaries to create moats or sea channels between every island

---

## 3. Layered Material Density (Density-as-Material-Selector)

**What it does:** Uses the terrain density graph to output a secondary value that drives material selection — not just solid/air, but rock type, ore distribution, or strata assignment determined by a density signal the material system reads.

**Why it's expert:** Hytale's material system can read named density graphs as selector signals. The same infrastructure that generates terrain density can generate a stratigraphy graph (what layer of rock this position belongs to), a cave wall roughness value, or an ore probability field. These run as separate named exports, not connected to `Terrain Out`.

**The recipe:** Build a depth-varying stratigraphy signal with `YValue → CurveMapper`, add horizontal variation with `SimplexNoise2D`, output via a named export. The material system references the named graph by name.

```nodegraph
{
  "height": 240,
  "nodes": [
    { "id": "yv",  "label": "YValue",        "category": "density", "sub": "depth",               "x": 0,   "y": 0   },
    { "id": "ycm", "label": "CurveMapper",   "category": "filter",  "sub": "depth→strata zone",   "x": 200, "y": 0   },
    { "id": "sn",  "label": "SimplexNoise2D","category": "density", "sub": "Scale 0.004 Oct 2",   "x": 0,   "y": 130 },
    { "id": "sc",  "label": "Constant",      "category": "math",    "sub": "Value 0.3",           "x": 0,   "y": 195 },
    { "id": "sm",  "label": "Multiplier",    "category": "math",    "sub": "strata noise × 0.3",  "x": 200, "y": 160 },
    { "id": "sum", "label": "Sum",           "category": "math",    "sub": "strata + variation",  "x": 380, "y": 75  },
    { "id": "out", "label": "Terrain Out",   "category": "output",  "sub": "exported as strata",  "x": 580, "y": 75  }
  ],
  "edges": [
    { "from": "yv",  "to": "ycm" },
    { "from": "ycm", "to": "sum" },
    { "from": "sn",  "to": "sm" },
    { "from": "sc",  "to": "sm" },
    { "from": "sm",  "to": "sum", "label": "horizontal variation" },
    { "from": "sum", "to": "out", "label": "strata selector" }
  ]
}
```

**Key parameters:**
- `ycm` curve shape: define N material zones by Y depth — a step or ramp curve where `[-1, -0.5]` = deep rock, `[-0.5, 0]` = mid rock, `[0, 0.5]` = upper stone, `[0.5, 1]` = surface soil. Each step in the curve = one material layer
- `sn` Scale: `0.004` — broad enough to create regional strata variation (tilted layers, geological uplift), not fine noise
- `sc` `Value`: `0.3` — how much horizontal noise tilts the strata; `0.5+` = strongly dipping beds, `0.1` = nearly horizontal but with slight irregularity
- The output graph is referenced by name from the material assignment config — the density value drives material selection, not placement

> [!NOTE]
> This graph runs separately from the terrain density graph. It does not need `YSampled` — material queries are typically run in a single XYZ evaluation per position, not amortized. Adding `YSampled` here would cause strata to blur vertically.

**Variations:**
- Add a second output graph for ore probability: a `CellNoise3D`-derived signal that outputs high values at sparse cell centers, low everywhere else — the material system can threshold this for ore vein placement
- Use `SpaceAndDepth` instead of manual `YValue` arithmetic for depth-normalized signals that account for world height ranges defined in the biome config

---

## 4. Full-Pipeline Terrain-Material Coordination

**What it does:** Coordinates the terrain density graph, the surface material graph, and a cave carving graph so they share the same noise sources — the surface material knows where the caves are, so cave ceilings don't get the wrong material.

**Why it's expert:** Three separate graphs need to reference the same cave mask. Using the `Exported`/`Imported` pattern shares the computation; without it, each graph independently evaluates the same expensive 3D cave noise.

**The recipe:** Export the cave mask from a shared graph. Import it into both the terrain density and the material selector. Mark the shared cave node with `SingleInstance` to prevent redundant evaluation.

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "cn3", "label": "SimplexNoise3D", "category": "density", "sub": "ScaleXZ 0.02 Oct 3",  "x": 0,   "y": 0   },
    { "id": "scl", "label": "SmoothClamp",    "category": "density", "sub": "Wall ±0.3 R 0.1",     "x": 200, "y": 0   },
    { "id": "inv", "label": "Inverter",       "category": "density", "sub": "flip to cave mask",   "x": 380, "y": 0   },
    { "id": "exp", "label": "Exported",       "category": "density", "sub": "cave_mask",            "x": 560, "y": 0   }
  ],
  "edges": [
    { "from": "cn3", "to": "scl" },
    { "from": "scl", "to": "inv" },
    { "from": "inv", "to": "exp", "label": "shared cave mask" }
  ]
}
```

The terrain density graph imports and applies the cave mask:

```nodegraph
{
  "height": 180,
  "nodes": [
    { "id": "terr", "label": "Sum (terrain)",  "category": "density", "sub": "hills + BaseHeight", "x": 0,   "y": 0   },
    { "id": "imp",  "label": "Imported",       "category": "density", "sub": "cave_mask",          "x": 0,   "y": 100 },
    { "id": "mn",   "label": "Min",            "category": "density", "sub": "carve caves",        "x": 200, "y": 50  },
    { "id": "ys",   "label": "YSampled",       "category": "density", "sub": "SampleDistance 4",   "x": 380, "y": 50  },
    { "id": "out",  "label": "Terrain Out",    "category": "output",                               "x": 560, "y": 50  }
  ],
  "edges": [
    { "from": "terr", "to": "mn",  "label": "terrain" },
    { "from": "imp",  "to": "mn",  "label": "cave mask" },
    { "from": "mn",   "to": "ys" },
    { "from": "ys",   "to": "out" }
  ]
}
```

The material selector graph imports the same cave mask to darken cave ceilings:

```nodegraph
{
  "height": 160,
  "nodes": [
    { "id": "strata","label": "Imported",      "category": "density", "sub": "strata selector",   "x": 0,   "y": 0   },
    { "id": "cave",  "label": "Imported",      "category": "density", "sub": "cave_mask",         "x": 0,   "y": 80  },
    { "id": "mix",   "label": "Mix",           "category": "density", "sub": "strata + cave bias","x": 200, "y": 40  },
    { "id": "out",   "label": "Terrain Out",   "category": "output",  "sub": "material selector", "x": 400, "y": 40  }
  ],
  "edges": [
    { "from": "strata", "to": "mix",  "label": "A (normal strata)" },
    { "from": "cave",   "to": "mix",  "label": "B / selector" },
    { "from": "mix",    "to": "out" }
  ]
}
```

**How the pipeline connects:**
1. The shared cave graph exports `cave_mask` as a named density graph
2. Both the terrain and material graphs import `cave_mask` by name
3. Each graph evaluates at the same world position; the `SingleInstance` flag on the shared graph ensures the 3D noise is only computed once per point, cached in the instance and shared across both importers

> [!IMPORTANT]
> `SingleInstance` requires that all graphs importing the same shared graph run within the same chunk evaluation pass — and they must pass the same world position. If material and terrain evaluation happen at different positions or in different passes, the `SingleInstance` cache will miss constantly, adding overhead without benefit.

**Variations:**
- Export a second graph for `surface_height` (just the `BaseHeight`-driven density) so material graphs can access the terrain surface Y without re-running the full terrain stack
- Use `Cache` (capacity: 2) on expensive shared nodes within the exported graph for the case where both the terrain and material importer evaluate the same position within nanoseconds of each other

---

## Expert Pipeline Reference

| Challenge | Solution | Key nodes |
|-----------|----------|-----------|
| World region gating | XZ distance field + Switch | `Scale`, `Multiplier`, `Sum`, `CurveMapper`, `Switch` |
| Per-cell terrain variety | CellNoise2D as MultiMix selector | `CellNoise2D`, `Normalizer`, `MultiMix` |
| Depth-driven material layers | YValue profile + noise tilt | `YValue`, `CurveMapper`, `SimplexNoise2D` |
| Shared expensive nodes | Exported + Imported + SingleInstance | `Exported`, `Imported` |
| Cave-material coordination | Shared cave mask export | `Exported`, `Imported`, `Mix`, `Min` |

> **See also:** [Expert Terrain Techniques](./terrain-types-expert.md) for `Exported`/`Imported`, `Cache`, and `SingleInstance` deep-dives. [Terrain Sculpting and Transitions](./terrain-sculpting-advanced.md) for biome edge and sculpting patterns.
