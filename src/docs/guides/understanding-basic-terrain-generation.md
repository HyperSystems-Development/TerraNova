# Guide: Understanding Basic Terrain Generation

**Difficulty:** Beginner

This guide explains the core concepts behind TerraNova / Hytale WorldGen V2 terrain generation.

> **Biome source assets:** `Examples/Example_Curve_Mapper.json`, `Experimental/Mountains.json`, `Experimental/Plateaus.json`, `Generative/Generative_Arches.json`
>
> Terrain examples on this page are grounded in those Hytale `Examples/`, `Experimental/`, and `Generative/` assets. The graphs below are teaching reductions, not full biome copies.

## Density and Noisemaps Introduction

### What is Density?

Density is the core principle for generating terrain. It is a value that determines whether a block at a given coordinate (x, y, z) is solid or empty:

- **Positive density** -- solid block
- **Zero or negative density** -- air (empty)

In practice, density values in TerraNova are typically between -1 and 1.

### Noisemaps

Noisemaps are what noise generator nodes output. Each noise generator (e.g., `SimplexNoise2D`) produces a continuous value between -1 and 1 for each coordinate.

For example, a 2D noise map can be thought of as a heightmap where:

- Peaks are close to `1`
- Valleys are close to `-1`

These values are then combined with other nodes to produce terrain.

The key parameters on noise nodes are:
- **`Scale`** — controls the frequency of features (lower = broader hills, higher = finer detail). Good starting values: `0.003–0.01` for large terrain features, `0.01–0.05` for smaller hills.
- **`Octaves`** — layers of noise stacked together; more octaves add fine detail at the cost of performance. 4–6 is typical for natural-looking terrain.
- **`Persistence`** — how much each successive octave contributes (around `0.5` by default; higher values produce rougher, craggier terrain)
- **`Lacunarity`** — how much the frequency increases per octave (around `2.0` by default)

---

## CurveMapper and BaseHeight

The **CurveMapper** is a key part of terrain generation. It remaps an input value using a curve (set to the `Manual` type in the properties panel).

The most common pairing is:

- `BaseHeight` crosses `0` at the named height reference and anchors the terrain vertically
- `CurveMapper` remaps that value to shape terrain elevation (hills, cliffs, plateaus)

```nodegraph
{
  "height": 160,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",  "category": "density", "sub": "Y = 64",        "x": 0,   "y": 60 },
    { "id": "cm",  "label": "CurveMapper", "category": "density", "sub": "height profile", "x": 200, "y": 60 },
    { "id": "out", "label": "Terrain Out", "category": "output",                           "x": 420, "y": 60 }
  ],
  "edges": [
    { "from": "bh",  "to": "cm",  "label": "value" },
    { "from": "cm",  "to": "out", "label": "density" }
  ]
}
```

> In the properties panel, set `CurveMapper`'s Curve type to **Manual** and draw your terrain profile. The x-axis of the curve is the input value from `BaseHeight`; the y-axis is the output density.

> **Under the hood:** In the audited source assets, `BaseHeight` is most often used as a named vertical anchor and then remapped through `CurveMapper`. When `Distance: true`, it outputs signed distance from that height. If you need a direct flat-plane teaching analog, `Sum` of `YValue` and `Constant { Value: -80 }` gives a surface at Y=80. See [Terrain Math Explained](./terrain/terrain-math-explained.md) for the full breakdown.

---

## Adding Noise: SimplexNoise2D

A flat height profile with no noise produces completely flat terrain. Adding `SimplexNoise2D` introduces horizontal variation -- hills, valleys, and uneven ground.

Always route density through `Sum` into `Terrain Out` — even when you have a single source. This matches the correct data flow pattern and makes it easy to add more inputs later.

```nodegraph
{
  "height": 160,
  "nodes": [
    { "id": "sn",  "label": "SimplexNoise2D", "category": "density", "sub": "Scale 0.01", "x": 0,   "y": 60 },
    { "id": "sum", "label": "Sum",            "category": "math",                          "x": 220, "y": 60 },
    { "id": "out", "label": "Terrain Out",    "category": "output",                        "x": 420, "y": 60 }
  ],
  "edges": [
    { "from": "sn",  "to": "sum", "label": "-1 to 1" },
    { "from": "sum", "to": "out", "label": "density" }
  ]
}
```

---

## CurveMapper + BaseHeight + Noise

To create varied terrain, combine the height-based curve with noise using a `Sum` node.

1. `SimplexNoise2D` creates horizontal variation
2. `CurveMapper` defines the vertical profile
3. `Sum` merges them into a single density per (x,y,z)

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",    "category": "density", "sub": "Y = 64",        "x": 0,   "y": 20 },
    { "id": "cm",  "label": "CurveMapper",   "category": "density", "sub": "height profile", "x": 200, "y": 20 },
    { "id": "sn",  "label": "SimplexNoise2D","category": "density", "sub": "Scale 0.01",     "x": 0,   "y": 130 },
    { "id": "sum", "label": "Sum",           "category": "density",                          "x": 400, "y": 75 },
    { "id": "out", "label": "Terrain Out",   "category": "output",                           "x": 580, "y": 75 }
  ],
  "edges": [
    { "from": "bh",  "to": "cm"  },
    { "from": "cm",  "to": "sum" },
    { "from": "sn",  "to": "sum" },
    { "from": "sum", "to": "out", "label": "density" }
  ]
}
```

### How values combine

- Each node outputs a value between -1 and 1.
- `Sum` of two inputs can range from -2 to 2 -- the world treats **any positive value** as solid.
- The `CurveMapper` dominates the vertical shape; noise adds surface variation on top.

---

## Adding Caves with SimplexNoise3D

To carve caves, evaluate a 3D noise field and use `Min` to keep only regions that are solid in *both* the terrain and the cave mask.

```nodegraph
{
  "height": 220,
  "nodes": [
    { "id": "terrain", "label": "Sum (terrain)", "category": "density", "sub": "from above",  "x": 0,   "y": 60 },
    { "id": "sn3",     "label": "SimplexNoise3D","category": "density", "sub": "ScaleXZ 0.04", "x": 0,   "y": 155 },
    { "id": "inv",     "label": "Inverter",      "category": "density", "sub": "flip caves",  "x": 200, "y": 155 },
    { "id": "min",     "label": "Min",           "category": "density", "sub": "carve",       "x": 370, "y": 100 },
    { "id": "out",     "label": "Terrain Out",   "category": "output",                        "x": 540, "y": 100 }
  ],
  "edges": [
    { "from": "terrain", "to": "min" },
    { "from": "sn3",     "to": "inv" },
    { "from": "inv",     "to": "min", "label": "cave mask" },
    { "from": "min",     "to": "out", "label": "density" }
  ]
}
```

> `Inverter` flips the noise so that high-noise areas become negative (empty), carving caves out of otherwise solid terrain. A typical cave noise setup uses `Scale: 0.04` with `Octaves: 2–3` — too many octaves makes caves look noisy and thin; too few produces large featureless voids.

---

## Performance: YSampled

Evaluating a full density graph at every Y level is expensive. `YSampled` wraps any density subgraph and samples it at coarse Y intervals (default: every 4 blocks), then linearly interpolates between samples -- giving ~4x speedup with minimal visual change.

```nodegraph
{
  "height": 180,
  "nodes": [
    { "id": "cm",  "label": "CurveMapper", "category": "density",                       "x": 0,   "y": 70 },
    { "id": "ys",  "label": "YSampled",    "category": "density", "sub": "SampleDistance 4",    "x": 200, "y": 70 },
    { "id": "sum", "label": "Sum",         "category": "density",                       "x": 380, "y": 70 },
    { "id": "out", "label": "Terrain Out", "category": "output",                        "x": 540, "y": 70 }
  ],
  "edges": [
    { "from": "cm",  "to": "ys",  "label": "wrap" },
    { "from": "ys",  "to": "sum" },
    { "from": "sum", "to": "out" }
  ]
}
```

---

> [!TIP]
> Experiment with simple graphs in the editor to see how changing node parameters affects density output. Start with just `BaseHeight -> Terrain Out`, then layer in `CurveMapper` and noise one step at a time.

---

## See Also

- [Terrain Math Explained](./terrain/terrain-math-explained.md) — the formulas behind noise Scale, Octaves, Persistence, and how combining nodes produces specific terrain shapes
- [Curves Explained](./world/curves-explained.md) — detailed guide to curve types (Manual, DistanceExponential, DistanceS, Clamp, and more) used inside CurveMapper
- [Node Combinations](./world/node-combinations.md) — practical wiring patterns for common terrain setups
