# Guide: Understanding Basic Terrain Generation

**Difficulty:** Beginner

This guide explains the core concepts behind TerraNova / Hytale WorldGen V2 terrain generation.

## Density & Noisemaps Introduction

### What is Density?

Density is the core principle for generating terrain. It is a value that determines whether a block at a given coordinate (x, y, z) is solid or empty:

- **Positive density** → solid block
- **Zero or negative density** → air (empty)

In practice, density values in TerraNova are typically between -1 and 1.

### Noisemaps

Noisemaps are what noise generator nodes output. Each noise generator (e.g., `SimplexNoise2D`) produces a continuous value between -1 and 1 for each coordinate.

For example, a 2D noise map can be thought of as a heightmap where:

- Peaks are close to `1`
- Valleys are close to `-1`

These values are then combined with other nodes to produce terrain.

---

## CurveMapper & BaseHeight

The **CurveMapper** is a key part of terrain generation. It remaps an input value using a curve (usually defined by a `Manual Curve` node).

The most common pairing is:

- `BaseHeight` outputs a value based on world height (Y coordinate) — `0` at the reference Y, positive above, negative below
- `CurveMapper` remaps that value to shape terrain elevation (hills, cliffs, plateaus)

```nodegraph
{
  "height": 180,
  "nodes": [
    { "id": "bh",   "label": "BaseHeight",  "category": "density", "sub": "Y = 64",       "x": 0,   "y": 60 },
    { "id": "mc",   "label": "Manual Curve", "category": "curve",                          "x": 0,   "y": 140 },
    { "id": "cm",   "label": "CurveMapper",  "category": "density", "sub": "height profile","x": 200, "y": 100 },
    { "id": "out",  "label": "Terrain Out",  "category": "output",                          "x": 400, "y": 100 }
  ],
  "edges": [
    { "from": "bh",  "to": "cm",  "label": "value" },
    { "from": "mc",  "to": "cm",  "label": "curve" },
    { "from": "cm",  "to": "out", "label": "density" }
  ]
}
```

---

## Adding Noise: SimplexNoise2D

A flat height profile with no noise produces completely flat terrain. Adding `SimplexNoise2D` introduces horizontal variation — hills, valleys, and uneven ground.

```nodegraph
{
  "height": 160,
  "nodes": [
    { "id": "sn",   "label": "SimplexNoise2D", "category": "density", "sub": "scale 0.01", "x": 0,   "y": 60 },
    { "id": "out",  "label": "Terrain Out",    "category": "output",                       "x": 220,  "y": 60 }
  ],
  "edges": [
    { "from": "sn", "to": "out", "label": "–1 to 1" }
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
  "height": 240,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",    "category": "density", "sub": "Y = 64",        "x": 0,   "y": 20 },
    { "id": "mc",  "label": "Manual Curve",  "category": "curve",                            "x": 0,   "y": 110 },
    { "id": "cm",  "label": "CurveMapper",   "category": "density", "sub": "height profile", "x": 200, "y": 60 },
    { "id": "sn",  "label": "SimplexNoise2D","category": "density", "sub": "scale 0.01",     "x": 0,   "y": 185 },
    { "id": "sum", "label": "Sum",           "category": "density",                          "x": 400, "y": 100 },
    { "id": "out", "label": "Terrain Out",   "category": "output",                           "x": 580, "y": 100 }
  ],
  "edges": [
    { "from": "bh",  "to": "cm",  "label": "value" },
    { "from": "mc",  "to": "cm",  "label": "curve" },
    { "from": "cm",  "to": "sum" },
    { "from": "sn",  "to": "sum" },
    { "from": "sum", "to": "out", "label": "density" }
  ]
}
```

### How values combine

- Each node outputs a value between -1 and 1.
- `Sum` of two inputs can range from -2 to 2 — the world treats **any positive value** as solid.
- The `CurveMapper` dominates the vertical shape; noise adds surface variation on top.

---

## Adding Caves with SimplexNoise3D

To carve caves, evaluate a 3D noise field and use `Min` to keep only regions that are solid in *both* the terrain and the cave mask.

```nodegraph
{
  "height": 220,
  "nodes": [
    { "id": "terrain", "label": "Sum (terrain)", "category": "density", "sub": "from above",  "x": 0,   "y": 60 },
    { "id": "sn3",     "label": "SimplexNoise3D","category": "density", "sub": "scale 0.04",  "x": 0,   "y": 155 },
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

> The `Inverter` flips the noise so that high-noise areas become negative (empty), carving caves out of otherwise solid terrain.

---

## Performance: YSampled

Evaluating a full density graph at every Y level is expensive. `YSampled` wraps any density subgraph and samples it at coarse Y intervals (default: every 4 blocks), then linearly interpolates between samples — giving ~4× speedup with minimal visual change.

```nodegraph
{
  "height": 180,
  "nodes": [
    { "id": "cm",  "label": "CurveMapper",  "category": "density",                       "x": 0,   "y": 70 },
    { "id": "ys",  "label": "YSampled",     "category": "density", "sub": "step = 4",    "x": 200, "y": 70 },
    { "id": "sum", "label": "Sum",          "category": "density",                       "x": 380, "y": 70 },
    { "id": "out", "label": "Terrain Out",  "category": "output",                        "x": 540, "y": 70 }
  ],
  "edges": [
    { "from": "cm",  "to": "ys",  "label": "wrap" },
    { "from": "ys",  "to": "sum" },
    { "from": "sum", "to": "out" }
  ]
}
```

---

> Tip: Experiment with simple graphs in the editor to see how changing node parameters affects density output. Start with just `BaseHeight → Terrain Out`, then layer in `CurveMapper` and noise one step at a time.
