# Walkthrough: Understanding Basic Terrain Generation

<!-- walkthrough -->

**Difficulty:** Beginner

> **Biome source assets:** `Examples/Example_Curve_Mapper.json`, `Experimental/Mountains.json`, `Experimental/Plateaus.json`, `Generative/Generative_Arches.json`
>
> Terrain examples on this page are grounded in those Hytale `Examples/`, `Experimental/`, and `Generative/` assets. The graphs below are teaching reductions, not full biome copies.

This walkthrough builds a complete terrain graph from scratch — flat ground, curved height profile, noise variation, caves, and performance wrapping — one step at a time.

## Density and What It Means

Density is the single number the world generator uses to decide what exists at every (x, y, z) coordinate:

- **Positive density** — solid block
- **Zero or negative density** — air

In TerraNova, density values are typically in the range −1 to 1. Your entire node graph is a machine that produces one density number per coordinate.

The key parameters on noise generators:

| Parameter | What it does | Typical value |
|-----------|-------------|--------------|
| `Scale` | Frequency — lower = broader hills, higher = finer detail | `0.003–0.01` for terrain |
| `Octaves` | Stacked noise layers — more = finer detail, higher cost | 3–5 |
| `Persistence` | Contribution of each successive octave | ~0.5 |
| `Lacunarity` | Frequency multiplier per octave | ~2.0 |

## CurveMapper and BaseHeight

`BaseHeight` reads a named height reference and crosses zero at that Y. In the audited source assets it commonly feeds `CurveMapper` or `Sum`, making it the vertical anchor rather than a freehand height formula.

`CurveMapper` remaps that value using a hand-drawn curve. This is how you shape cliff faces, plateaus, and gentle slopes — by drawing the profile you want.

Start with this simple profile instead of freehanding from scratch:

```curve
Starter terrain profile - gentle slope into a firmer surface
[[0,-1],[0.18,-0.96],[0.34,-0.72],[0.48,-0.18],[0.56,0.3],[0.7,0.78],[0.86,0.96],[1,1]]
```

- Keep the left side low so air stays air.
- Let the middle rise smoothly for a walkable slope.
- Push one middle point upward if you want a sharper cliff.

```nodegraph
{
  "height": 160,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",  "category": "density", "sub": "Y = 64",         "x": 0,   "y": 60 },
    { "id": "cm",  "label": "CurveMapper", "category": "filter",  "sub": "height profile",  "x": 200, "y": 60 },
    { "id": "out", "label": "Terrain Out", "category": "output",                            "x": 420, "y": 60 }
  ],
  "edges": [
    { "from": "bh",  "to": "cm",  "label": "value" },
    { "from": "cm",  "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "bh",  "text": "BaseHeight marks the terrain anchor by crossing zero at the named height reference. Connect it to CurveMapper to decide how that anchor becomes a usable terrain profile." },
    { "nodeId": "cm",  "text": "Set CurveMapper's Curve type to Manual. The x-axis is the input from BaseHeight; the y-axis is the output density. A gentle S-curve gives natural slopes; a steep step gives cliffs." },
    { "nodeId": "out", "text": "Terrain Out receives the final density. Click Generate — you should see a flat plane at Y=64. The CurveMapper is not doing much yet; its effect becomes visible once you shape the curve." }
  ]
}
```

> In the properties panel, set `CurveMapper`'s Curve type to **Manual** and draw your terrain profile. The x-axis is the input from `BaseHeight`; the y-axis is the output density.

## Adding Noise: SimplexNoise2D

A flat profile produces completely flat terrain. `SimplexNoise2D` adds horizontal variation — hills, valleys, uneven ground — by producing a different value at every (x, z) coordinate.

```nodegraph
{
  "height": 160,
  "nodes": [
    { "id": "sn",  "label": "SimplexNoise2D", "category": "density", "sub": "Scale 0.01",  "x": 0,   "y": 60 },
    { "id": "sum", "label": "Sum",            "category": "math",                           "x": 220, "y": 60 },
    { "id": "out", "label": "Terrain Out",    "category": "output",                         "x": 420, "y": 60 }
  ],
  "edges": [
    { "from": "sn",  "to": "sum", "label": "−1 to 1" },
    { "from": "sum", "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "sn",  "text": "SimplexNoise2D alone gives floating terrain — half solid, half air, with no concept of a surface. Scale 0.01 gives ~100-block wide features. On its own this is not useful, but it shows what raw noise looks like before a height signal is added." },
    { "nodeId": "sum", "text": "Sum is always the final combinator before Terrain Out. Right now it only has one input, but the next step adds BaseHeight and CurveMapper here too. Routing through Sum keeps the graph extensible." },
    { "nodeId": "out", "text": "Terrain Out receives the density. With only noise fed in, the surface is chaotic — floating blobs everywhere. This is a stepping stone; adding BaseHeight in the next section gives it a proper ground plane." }
  ]
}
```

## Combining Height and Noise with Sum

To make varied terrain with a proper surface, combine the `CurveMapper` height signal with noise using a `Sum` node.

1. `BaseHeight → CurveMapper` defines the vertical profile (where the surface is)
2. `SimplexNoise2D` adds horizontal variation (hills and valleys)
3. `Sum` merges both into one density per (x, y, z)

If you are new to curves, do this in order:

1. Load the starter curve above into `CurveMapper`.
2. Generate once before touching noise.
3. Move only one curve point at a time, then generate again.
4. After the silhouette feels right, start adjusting the noise scale.

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",    "category": "density", "sub": "Y = 64",         "x": 0,   "y": 20 },
    { "id": "cm",  "label": "CurveMapper",   "category": "filter",  "sub": "height profile",  "x": 200, "y": 20 },
    { "id": "sn",  "label": "SimplexNoise2D","category": "density", "sub": "Scale 0.01",      "x": 0,   "y": 130 },
    { "id": "sum", "label": "Sum",           "category": "math",                              "x": 400, "y": 75 },
    { "id": "out", "label": "Terrain Out",   "category": "output",                            "x": 580, "y": 75 }
  ],
  "edges": [
    { "from": "bh",  "to": "cm"  },
    { "from": "cm",  "to": "sum", "label": "height" },
    { "from": "sn",  "to": "sum", "label": "noise" },
    { "from": "sum", "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "bh",  "text": "BaseHeight provides the vertical anchor — the surface Y level. Without this, noise alone gives floating terrain with no ground plane." },
    { "nodeId": "cm",  "text": "CurveMapper shapes the height falloff. A steep curve near zero makes sharp cliff edges; a gradual S-curve makes gentle slopes. This controls the silhouette of your terrain." },
    { "nodeId": "sn",  "text": "SimplexNoise2D adds horizontal variation. Scale 0.01 gives ~100-block hills. Lower Scale (0.003) gives huge continent-scale features; higher (0.03) gives small rocky bumps." },
    { "nodeId": "sum", "text": "Sum adds both signals together. The CurveMapper dominates the vertical shape; noise nudges the surface up and down within that shape. Sum output can exceed ±1 — any positive value is solid." },
    { "nodeId": "out", "text": "This is a complete basic terrain graph. Click Generate to see hills at Y=64. Adjust SimplexNoise2D Scale to change hill size, or redraw the CurveMapper curve to change terrain character." }
  ]
}
```

### How values combine

- Each node outputs a value between −1 and 1.
- `Sum` of two inputs can range from −2 to 2 — the world treats **any positive value** as solid.
- The `CurveMapper` dominates vertical shape; noise adds surface variation on top.

## Adding Caves with SimplexNoise3D

To carve caves, evaluate a 3D noise field and use `Min` to keep only regions that are solid in *both* the terrain and the cave mask.

```nodegraph
{
  "height": 220,
  "nodes": [
    { "id": "terrain", "label": "Sum (terrain)", "category": "density", "sub": "from above",    "x": 0,   "y": 60 },
    { "id": "sn3",     "label": "SimplexNoise3D","category": "density", "sub": "ScaleXZ 0.04",  "x": 0,   "y": 155 },
    { "id": "inv",     "label": "Inverter",      "category": "density", "sub": "flip caves",    "x": 200, "y": 155 },
    { "id": "mn",      "label": "Min",           "category": "density", "sub": "carve",         "x": 380, "y": 100 },
    { "id": "out",     "label": "Terrain Out",   "category": "output",                          "x": 560, "y": 100 }
  ],
  "edges": [
    { "from": "terrain", "to": "mn" },
    { "from": "sn3",     "to": "inv" },
    { "from": "inv",     "to": "mn", "label": "cave mask" },
    { "from": "mn",      "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "terrain", "text": "Your existing terrain graph feeds in here. Min will keep whatever is more negative — terrain surface or cave void — at each point." },
    { "nodeId": "sn3",     "text": "SimplexNoise3D varies in all three dimensions — essential for caves, which need vertical variation. ScaleXZ 0.04 gives ~25-block wide tunnels. Octaves 2–3 is enough; more octaves makes caves noisy and thin." },
    { "nodeId": "inv",     "text": "Inverter flips the noise sign. High-noise areas (previously positive/solid) become negative (empty). This turns the noise field into a cave void mask." },
    { "nodeId": "mn",      "text": "Min keeps the smaller (more negative) of terrain and cave mask at each point. Where the cave mask is negative, it overrides the terrain — carving the void. Where terrain is already air, nothing changes." },
    { "nodeId": "out",     "text": "The result: terrain with caves carved through it. Adjust SimplexNoise3D ScaleXZ to change tunnel width, or add SmoothClamp before Inverter to control the cross-section shape of the tunnels." }
  ]
}
```

> [!TIP]
> `Inverter` flips the noise so that high-noise areas become negative (empty), carving caves out of otherwise solid terrain. A typical cave noise setup uses `ScaleXZ: 0.04` with `Octaves: 2–3` — too many octaves makes caves noisy and thin; too few produces large featureless voids.

## Performance: YSampled

Evaluating a full density graph at every Y level is expensive. `YSampled` wraps any density subgraph and samples it every 4 blocks vertically, then linearly interpolates between samples — giving roughly a 4× speedup with minimal visual change.

```nodegraph
{
  "height": 180,
  "nodes": [
    { "id": "terrain", "label": "Sum (terrain)", "category": "density", "sub": "height + noise",    "x": 0,   "y": 70 },
    { "id": "ys",      "label": "YSampled",      "category": "density", "sub": "SampleDistance 4",  "x": 200, "y": 70 },
    { "id": "caves",   "label": "Min (caves)",   "category": "density", "sub": "cave carve",        "x": 380, "y": 70 },
    { "id": "out",     "label": "Terrain Out",   "category": "output",                              "x": 560, "y": 70 }
  ],
  "edges": [
    { "from": "terrain", "to": "ys",    "label": "wrap" },
    { "from": "ys",      "to": "caves" },
    { "from": "caves",   "to": "out" }
  ],
  "steps": [
    { "nodeId": "terrain", "text": "Your height + noise graph goes inside YSampled. This is the expensive part — BaseHeight, CurveMapper, and 2D noise — all of which only vary slowly with Y." },
    { "nodeId": "ys",      "text": "YSampled evaluates the child graph at every 4th Y block and linearly interpolates the other 3. SampleDistance 4 is the default. Do NOT wrap 3D noise or cave carving inside YSampled — fast vertical changes will be smoothed out." },
    { "nodeId": "caves",   "text": "Cave carving stays OUTSIDE YSampled. Caves change rapidly in Y and need full-resolution evaluation or their walls will be distorted by interpolation." },
    { "nodeId": "out",     "text": "Full pipeline: terrain (wrapped in YSampled for speed) → cave carving (outside, at full res) → Terrain Out. This is the standard production layout for a terrain graph." }
  ]
}
```

> [!NOTE]
> Do NOT put `SimplexNoise3D` or cave carving inside `YSampled`. The interpolation will distort fast-changing vertical features. Only wrap nodes whose output changes slowly with height — `BaseHeight`, `CurveMapper`, and `SimplexNoise2D`.

---

> **Next:** Try [Terrain Types and Node Recipes](../guides/terrain/terrain-types.md) to see these concepts applied to specific terrain outcomes — mesas, floating islands, striped caves, and more.
