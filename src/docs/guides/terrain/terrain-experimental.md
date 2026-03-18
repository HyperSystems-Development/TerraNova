# Guide: Experimental Terrain Techniques

**Difficulty:** Experimental

<!-- experimental -->

This guide documents techniques that push the WorldGen V2 density system beyond its intended use cases. These are not production recipes — they are proofs of concept, with known limitations, visual artifacts, or high performance costs. Use them to understand the system's boundaries and as starting points for your own experiments.

> [!WARNING]
> Techniques in this guide may produce unexpected results in-game, are not guaranteed to be stable across Hytale updates, and in some cases exploit emergent behavior from node interactions that was not explicitly designed. Test thoroughly in isolated worlds before using in serious projects.

---

## 1. Recursive Height Feedback (Terrain Reading Its Own Surface)

**What it is:** Using the `Terrain` accessor node to read the density of the *currently generating* terrain at a nearby position, then feeding that value back into the same graph as a modifier. This creates a form of local self-reference — terrain that adjusts based on what's adjacent to it.

**What it produces:** Terrain that "knows" its own slope in real-time during generation. High slopes modify their own density slightly. In practice this creates a very subtle self-smoothing effect on steep faces and can produce faint step artifacts at extreme values.

> [!WARNING]
> Circular graph evaluation is not supported. The `Terrain` accessor reads the density at a *different* position (offset from the current evaluation point), not at the current position — this is what prevents infinite recursion. However, if the offset is very small or zero, the accessor returns `0.0` (not the current density). Keep offsets at least 2–4 blocks.

```nodegraph
{
  "height": 280,
  "nodes": [
    { "id": "base", "label": "Sum (terrain)",  "category": "density", "sub": "primary terrain",      "x": 0,   "y": 0   },
    { "id": "ta",   "label": "TerrainAccessor","category": "density", "sub": "offset X+3",           "x": 0,   "y": 130 },
    { "id": "tb",   "label": "TerrainAccessor","category": "density", "sub": "offset X−3",           "x": 0,   "y": 200 },
    { "id": "diff", "label": "Sum",            "category": "math",    "sub": "slope proxy A−B",      "x": 200, "y": 165 },
    { "id": "dcm",  "label": "CurveMapper",    "category": "filter",  "sub": "slope→modifier",       "x": 380, "y": 165 },
    { "id": "sc",   "label": "Constant",       "category": "math",    "sub": "Value 0.08",           "x": 380, "y": 235 },
    { "id": "mul",  "label": "Multiplier",     "category": "math",    "sub": "feedback × 0.08",      "x": 560, "y": 200 },
    { "id": "sum",  "label": "Sum",            "category": "math",    "sub": "terrain + feedback",   "x": 720, "y": 80  },
    { "id": "out",  "label": "Terrain Out",    "category": "output",                                 "x": 900, "y": 80  }
  ],
  "edges": [
    { "from": "base", "to": "sum" },
    { "from": "ta",   "to": "diff" },
    { "from": "tb",   "to": "diff" },
    { "from": "diff", "to": "dcm" },
    { "from": "dcm",  "to": "mul" },
    { "from": "sc",   "to": "mul" },
    { "from": "mul",  "to": "sum", "label": "feedback" },
    { "from": "sum",  "to": "out" }
  ]
}
```

**How it works:**
- `ta` reads terrain density 3 blocks east of current position; `tb` reads 3 blocks west
- `Sum` of `ta` + negated `tb` gives a finite-difference approximation of the east–west slope (same math as `Gradient` but using world-evaluated density rather than graph-evaluated density)
- `CurveMapper` maps high slope magnitudes to a small positive or negative modifier
- `Multiplier`+`Constant` keeps the feedback amplitude small — large values cause feedback artifacts

**Known artifacts:**
- Chunk boundary seams: `TerrainAccessor` reads across chunk boundaries at generation time, but the neighboring chunk may not be generated yet. The accessor returns `0.0` for ungenerated positions, causing a thin line artifact at chunk borders
- Noise amplification: if the modifier amplitude (`sc Value`) exceeds `0.15`, the feedback can slightly amplify existing noise features, making ridges sharper than the base terrain predicts

**Interesting outcomes:**
- `Value: 0.05` + slope curve: adds a faint self-sharpening to ridge peaks
- Negated feedback (negative `Constant`): slight self-smoothing, reduces extreme high-frequency noise at the cost of some detail

---

## 2. Voronoi Sculpted Islands (CellNoise as Mask + Height Both)

**What it is:** Using two different outputs of `CellNoise2D` simultaneously — the cell hash for material/type selection and `CellWallDistance` for the island shape mask — to generate a fully distinct island per cell that is also masked to its own cell boundary.

**What it produces:** A dense archipelago where every island stays entirely within its Voronoi cell, with the cell hash driving height, the wall distance driving the footprint shape, and noise adding per-island terrain variation.

```nodegraph
{
  "height": 300,
  "nodes": [
    { "id": "cn",  "label": "CellNoise2D",   "category": "density", "sub": "Scale 0.004 hash",      "x": 0,   "y": 0   },
    { "id": "nr",  "label": "Normalizer",    "category": "density", "sub": "[0,1] island type",     "x": 200, "y": 0   },
    { "id": "hcm", "label": "CurveMapper",   "category": "filter",  "sub": "type→base height",      "x": 380, "y": 0   },
    { "id": "cwd", "label": "CellWallDistance","category": "density","sub": "Scale 0.004",           "x": 0,   "y": 120 },
    { "id": "wcm", "label": "CurveMapper",   "category": "filter",  "sub": "wall dist→footprint",   "x": 200, "y": 120 },
    { "id": "sn",  "label": "SimplexNoise2D","category": "density", "sub": "Scale 0.015 Oct 3",     "x": 0,   "y": 230 },
    { "id": "nc",  "label": "Constant",      "category": "math",    "sub": "Value 0.15",            "x": 0,   "y": 295 },
    { "id": "nm",  "label": "Multiplier",    "category": "math",    "sub": "terrain noise × 0.15",  "x": 200, "y": 260 },
    { "id": "hs",  "label": "Sum",           "category": "math",    "sub": "height + noise",        "x": 560, "y": 0   },
    { "id": "mn",  "label": "Min",           "category": "density", "sub": "mask to cell boundary", "x": 740, "y": 80  },
    { "id": "ys",  "label": "YSampled",      "category": "density", "sub": "SampleDistance 4",      "x": 920, "y": 80  },
    { "id": "out", "label": "Terrain Out",   "category": "output",                                  "x": 1100,"y": 80  }
  ],
  "edges": [
    { "from": "cn",  "to": "nr" },
    { "from": "nr",  "to": "hcm" },
    { "from": "hcm", "to": "hs",  "label": "base height" },
    { "from": "cwd", "to": "wcm" },
    { "from": "wcm", "to": "mn",  "label": "cell mask" },
    { "from": "sn",  "to": "nm" },
    { "from": "nc",  "to": "nm" },
    { "from": "nm",  "to": "hs",  "label": "terrain noise" },
    { "from": "hs",  "to": "mn",  "label": "island density" },
    { "from": "mn",  "to": "ys" },
    { "from": "ys",  "to": "out" }
  ]
}
```

**How it works:**
- `CellNoise2D` (hash mode) provides a unique value per cell. `hcm` maps it to one of several base height levels — shorter or taller islands
- `CellWallDistance` (same scale as `CellNoise2D`, same seed) provides distance to the nearest cell wall. `wcm` maps this: negative near the cell center (island exists), positive near the wall (open ocean). This is the masking signal
- `Min` takes the smaller (more negative = more solid) of the island density and the cell wall mask. Any island density that extends past the wall is clipped to `0.0` by the mask

> [!IMPORTANT]
> `CellNoise2D` and `CellWallDistance` must use the **same Scale and Seed** to operate on the same Voronoi cell grid. If they differ, the hash and the wall belong to different grids and islands will not be masked to their cells.

**Known artifacts:**
- Very small cells (high Scale): `CellWallDistance` transitions may overlap with the island density gradient, creating thin moat-like gaps at every island edge. Reduce island amplitude or increase cell size to fix
- The cell hash distribution is approximately uniform but not perfectly so — some islands will cluster near the same height type by chance

**Variations:**
- Use the `CellWallDistance` value directly as a `CurveMapper` input to shape island cross-section (steep-sided vs. gently sloping) — different islands still have their hash-determined heights but share a consistent edge profile
- Add a `SimplexNoise2D` warp before both `CellNoise2D` inputs to distort cell shapes organically

---

## 3. Frequency-Domain Terrain Sculpting (Manual Fourier Approximation)

**What it is:** Constructing terrain by explicitly specifying which spatial frequencies contribute and at what phase — the density-graph equivalent of additive synthesis in audio. Rather than using `SimplexNoise2D` (which stacks internally), manually wire N noise layers at octave-spaced frequencies, each with an independently controlled `Constant` amplitude and a separate `Seed`.

**What it produces:** Full explicit control over the spectral content of terrain. You can have terrain with no medium-frequency content (smooth at the hill scale, detailed at the rock scale), or terrain with only one narrow frequency band (a single spatial wavelength, like uniform dunes), or terrain where each octave has a different phase shift applied via an `XValue`/`ZValue` offset.

```nodegraph
{
  "height": 320,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",     "category": "density", "sub": "Y = 64",              "x": 0,   "y": 0   },
    { "id": "n1",  "label": "SimplexNoise2D", "category": "density", "sub": "Scale 0.001 Oct 1 S1","x": 0,   "y": 80  },
    { "id": "n2",  "label": "SimplexNoise2D", "category": "density", "sub": "Scale 0.002 Oct 1 S2","x": 0,   "y": 150 },
    { "id": "n3",  "label": "SimplexNoise2D", "category": "density", "sub": "Scale 0.004 Oct 1 S3","x": 0,   "y": 220 },
    { "id": "n4",  "label": "SimplexNoise2D", "category": "density", "sub": "Scale 0.008 Oct 1 S4","x": 0,   "y": 290 },
    { "id": "c1",  "label": "Constant",       "category": "math",    "sub": "Value 0.5",           "x": 220, "y": 50  },
    { "id": "c2",  "label": "Constant",       "category": "math",    "sub": "Value 0.25",          "x": 220, "y": 120 },
    { "id": "c3",  "label": "Constant",       "category": "math",    "sub": "Value 0.0",           "x": 220, "y": 190 },
    { "id": "c4",  "label": "Constant",       "category": "math",    "sub": "Value 0.15",          "x": 220, "y": 260 },
    { "id": "m1",  "label": "Multiplier",     "category": "math",    "sub": "oct1 × 0.5",          "x": 380, "y": 80  },
    { "id": "m2",  "label": "Multiplier",     "category": "math",    "sub": "oct2 × 0.25",         "x": 380, "y": 150 },
    { "id": "m3",  "label": "Multiplier",     "category": "math",    "sub": "oct3 × 0.0 (skip)",   "x": 380, "y": 220 },
    { "id": "m4",  "label": "Multiplier",     "category": "math",    "sub": "oct4 × 0.15",         "x": 380, "y": 290 },
    { "id": "sum", "label": "Sum",            "category": "math",    "sub": "spectral sum",         "x": 580, "y": 160 },
    { "id": "ys",  "label": "YSampled",       "category": "density", "sub": "SampleDistance 4",    "x": 760, "y": 160 },
    { "id": "out", "label": "Terrain Out",    "category": "output",                                "x": 940, "y": 160 }
  ],
  "edges": [
    { "from": "bh", "to": "sum" },
    { "from": "n1", "to": "m1" }, { "from": "c1", "to": "m1" }, { "from": "m1", "to": "sum", "label": "f1" },
    { "from": "n2", "to": "m2" }, { "from": "c2", "to": "m2" }, { "from": "m2", "to": "sum", "label": "f2" },
    { "from": "n3", "to": "m3" }, { "from": "c3", "to": "m3" }, { "from": "m3", "to": "sum", "label": "f3 (muted)" },
    { "from": "n4", "to": "m4" }, { "from": "c4", "to": "m4" }, { "from": "m4", "to": "sum", "label": "f4" },
    { "from": "sum", "to": "ys" },
    { "from": "ys",  "to": "out" }
  ]
}
```

**What the example does:**
- `n1` (Scale 0.001): very broad landform, amplitude 0.5 — dominant shape
- `n2` (Scale 0.002): mountain-range scale, amplitude 0.25 — secondary
- `n3` (Scale 0.004): **silenced** — `Constant Value: 0.0` sets amplitude to zero; this frequency is absent from the terrain
- `n4` (Scale 0.008): surface texture, amplitude 0.15 — fine detail that "skips" one octave above n2

The result: terrain with a gap in its frequency spectrum. It has large smooth landforms and fine surface roughness, but the intermediate hill-scale detail is absent. This creates an unusual "sharp mountains with no foothills" character.

**Technique variations to try:**
- Equal amplitudes across all octaves (`0.25` each): creates a "pink noise" terrain where no scale dominates — very chaotic but statistically uniform
- Only `n3` active (`c1/c2/c4` = 0): single-frequency terrain — regular dunes or ripples with no scale hierarchy
- Different seeds on each octave (use `Seed` field on each `SimplexNoise2D`): breaks the spatial coherence between octaves, making the frequency components statistically independent rather than aligned
- Negative amplitude on one octave (`Constant Value: -0.1`): that frequency destructively interferes with adjacent octaves at some positions, creating valley-like inversions at specific spatial scales

> [!NOTE]
> Each noise layer here uses `Octaves: 1` to isolate each frequency. Using `Octaves: 2+` on any layer stacks internal sub-octaves on top, defeating the purpose of manual spectral control. Keep all `Octaves` at 1 for this technique.

---

## 4. Temporal Pseudo-Animation via Seed Offset (Morphing Worlds)

**What it is:** By exposing `Seed` as a parameter that varies between world saves, you can create terrain that feels like it evolved — each seed value produces a slightly different world topology, and interpolating between seeds (if you regenerate at multiple steps) shows terrain "flowing." Not useful in production but valuable for terrain visualization and understanding.

> [!WARNING]
> This technique is purely conceptual in TerraNova. The editor does not support runtime seed changes or animation. It is documented here to explain what seed variation does to terrain topology — useful when choosing seeds for a project.

**The insight:** `SimplexNoise2D` at the same `Scale` and `Octaves` but different `Seed` values produces completely different but statistically identical terrain. The transition between two seeds is not a spatial warp — it is a global reshuffle of all features. There is no gradual morphing; the change is discontinuous at the feature level.

**Practical use:** When you want two connected worlds (e.g., a main world and an alternate dimension) that feel geographically unrelated but have the same statistical character (same roughness, same height range), use the same `Scale` and `Octaves` but different `Seed` values on every noise node.

```
World A seeds: SimplexNoise2D { Seed: 0 }, SimplexNoise3D { Seed: 0 }
World B seeds: SimplexNoise2D { Seed: 7 }, SimplexNoise3D { Seed: 7 }
```

Both worlds have statistically identical terrain distribution but no spatial correlation.

---

## 5. Phase-Shifted Interference Patterns

**What it is:** Summing two `SimplexNoise2D` layers at the same frequency but offset spatially by a fixed amount, creating constructive/destructive interference patterns — terrain where some areas amplify and others cancel.

**What it produces:** Terrain with alternating high-variation and low-variation zones, determined by the interference pattern between the two offset noise fields. At certain offsets, the two fields nearly cancel everywhere (flat terrain). At others, they add constructively in regular intervals (banded terrain variation).

```nodegraph
{
  "height": 240,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",     "category": "density", "sub": "Y = 64",              "x": 0,   "y": 0   },
    { "id": "xv",  "label": "XValue",         "category": "density", "sub": "world X",             "x": 0,   "y": 100 },
    { "id": "of",  "label": "Constant",       "category": "math",    "sub": "Value 80",            "x": 0,   "y": 165 },
    { "id": "xs",  "label": "Sum",            "category": "math",    "sub": "X + offset",          "x": 200, "y": 130 },
    { "id": "n1",  "label": "SimplexNoise2D", "category": "density", "sub": "Scale 0.005 Oct 3",   "x": 380, "y": 80  },
    { "id": "n2",  "label": "SimplexNoise2D", "category": "density", "sub": "Scale 0.005 Oct 3",   "x": 380, "y": 165 },
    { "id": "c1",  "label": "Constant",       "category": "math",    "sub": "Value 0.4",           "x": 580, "y": 50  },
    { "id": "c2",  "label": "Constant",       "category": "math",    "sub": "Value 0.4",           "x": 580, "y": 195 },
    { "id": "m1",  "label": "Multiplier",     "category": "math",    "sub": "n1 × 0.4",            "x": 580, "y": 80  },
    { "id": "m2",  "label": "Multiplier",     "category": "math",    "sub": "n2 × 0.4",            "x": 580, "y": 165 },
    { "id": "sum", "label": "Sum",            "category": "math",    "sub": "interference",        "x": 740, "y": 120 },
    { "id": "fs",  "label": "Sum",            "category": "math",    "sub": "terrain + interference","x": 900, "y": 60 },
    { "id": "ys",  "label": "YSampled",       "category": "density", "sub": "SampleDistance 4",    "x": 1080,"y": 60  },
    { "id": "out", "label": "Terrain Out",    "category": "output",                                "x": 1260,"y": 60  }
  ],
  "edges": [
    { "from": "bh",  "to": "fs" },
    { "from": "xv",  "to": "xs" },
    { "from": "of",  "to": "xs", "label": "phase offset" },
    { "from": "xs",  "to": "n2" },
    { "from": "n1",  "to": "m1" }, { "from": "c1", "to": "m1" },
    { "from": "n2",  "to": "m2" }, { "from": "c2", "to": "m2" },
    { "from": "m1",  "to": "sum" },
    { "from": "m2",  "to": "sum" },
    { "from": "sum", "to": "fs", "label": "terrain noise" },
    { "from": "fs",  "to": "ys" },
    { "from": "ys",  "to": "out" }
  ]
}
```

**How to tune the offset:**
- At `0` blocks: n1 and n2 are identical — they add fully (`0.4 + 0.4 = 0.8` amplitude)
- At exactly half the wavelength (`1/(2×scale) = 100` blocks for Scale 0.005): near-perfect cancellation — terrain is almost flat
- At `80` blocks (as shown): partial cancellation with a directional beat pattern — some X zones are amplified, others subdued

> [!NOTE]
> The same noise function at the same Scale and Seed but shifted in X space will still produce correlated but not identical noise due to simplex's non-periodic nature. Near-cancellation occurs but is never perfect. For stronger cancellation, negate one layer instead: `Inverter` on n2 before summing.

**The most interesting configuration:** Negate `n2` (`Inverter` before `m2`) and use a `Constant` offset of exactly half the wavelength. Near-perfect cancellation produces very subtle, smooth terrain. Small deviations from the exact offset produce slowly-beating interference fringes.

---

> **This guide is experimental.** Techniques here may break, produce artifacts, or be superseded by future node additions. If a technique produces interesting results in your world, document what parameters you used — the system behavior may change.

> **See also:** [Complex Terrain Techniques](./terrain-types-advanced.md) for stable advanced recipes. [Expert Terrain Techniques](./terrain-types-expert.md) for system-level knowledge. [Terrain Composition (Expert)](./terrain-composition-expert.md) for pipeline coordination patterns.
