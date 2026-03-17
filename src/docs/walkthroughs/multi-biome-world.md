# Walkthrough: Setting Up a Multi-Biome World

<!-- walkthrough -->

This walkthrough takes you from a single-biome world to one with three distinct biomes — Plains, Forest, and Mountains — each with their own terrain shape, materials, and a smooth transition between them. Work through the steps in order.

## Step 1 — Understand the Biome Selection Flow

Before building anything, it helps to see how the world decides which biome appears at each location.

The world evaluates a **biome selector** — a single noise value at every (X, Z) column. Each biome is assigned a `Min`/`Max` range on the –1 to 1 scale. The noise value at a column determines which biome owns it.

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "sn",  "label": "SimplexNoise2D", "category": "terrain",     "sub": "Scale 0.001",    "x": 0,   "y": 80  },
    { "id": "sel", "label": "Biome Selector", "category": "worldstruct", "sub": "noise → range",  "x": 220, "y": 80  },
    { "id": "pl",  "label": "Plains",         "category": "biome",       "sub": "–1.0 to –0.33",  "x": 440, "y": 0   },
    { "id": "fo",  "label": "Forest",         "category": "biome",       "sub": "–0.33 to 0.33",  "x": 440, "y": 80  },
    { "id": "mt",  "label": "Mountains",      "category": "biome",       "sub": "0.33 to 1.0",    "x": 440, "y": 160 }
  ],
  "edges": [
    { "from": "sn",  "to": "sel", "label": "noise value" },
    { "from": "sel", "to": "pl",  "label": "–1 to –0.33" },
    { "from": "sel", "to": "fo",  "label": "–0.33 to 0.33" },
    { "from": "sel", "to": "mt",  "label": "0.33 to 1.0" }
  ],
  "steps": [
    { "nodeId": "sn",  "text": "SimplexNoise2D acts as the biome selector. Its output is a value from –1 to 1. A very low Scale (0.001) produces large, gradual biome regions spanning hundreds of blocks. Increase Scale to shrink regions." },
    { "nodeId": "sel", "text": "The Biome Selector maps the noise value to a biome using the Min/Max ranges you configure. Every column that evaluates to between –1.0 and –0.33 belongs to Plains, and so on." },
    { "nodeId": "pl",  "text": "Plains owns the lower third of the noise range (–1.0 to –0.33). In the editor, set Biome = 'Plains', Min = –1.0, Max = –0.33 in the biome ranges list." },
    { "nodeId": "fo",  "text": "Forest owns the middle band (–0.33 to 0.33). The transition zone between Forest and its neighbors will blend terrain density over the TransitionDistance you set." },
    { "nodeId": "mt",  "text": "Mountains owns the upper third (0.33 to 1.0). Columns with the highest noise values get mountain terrain. Cover the full –1 to 1 span with no gaps — the DefaultBiome is a fallback, not a replacement." }
  ]
}
```

---

## Step 2 — Create the Three Biomes

Start with your existing world (or create a new blank one). You need three separate biome assets.

1. In the **Biomes** list (left sidebar → **Biomes** tab), click **+ Add Biome**.
2. Name the first biome **Plains**.
3. Repeat to add **Forest** and **Mountains**.

Each biome appears as its own entry in the list. Selecting a biome switches the node editor to that biome's terrain graph.

> If you only have one biome, add the others now before building terrain — it's easier to wire up ranges while they're all present.

---

## Step 3 — Build Terrain for Each Biome

Select each biome in turn and build its terrain graph. Use the editor's **Biomes** tab to switch between them.

### Plains terrain

Simple flat ground with gentle undulation:

```nodegraph
{
  "height": 160,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",    "category": "terrain", "sub": "Y = 64",          "x": 0,   "y": 40 },
    { "id": "sn",  "label": "SimplexNoise2D","category": "terrain", "sub": "Freq 0.01 Amp 4",  "x": 0,   "y": 130 },
    { "id": "sum", "label": "Sum",           "category": "math",                               "x": 240, "y": 85 },
    { "id": "out", "label": "Terrain Out",   "category": "output",                             "x": 440, "y": 85 }
  ],
  "edges": [
    { "from": "bh",  "to": "sum" },
    { "from": "sn",  "to": "sum" },
    { "from": "sum", "to": "out", "label": "density" }
  ]
}
```

### Forest terrain

Moderate hills — same structure, higher amplitude and frequency:

- `BaseHeight` Y = 64
- `SimplexNoise2D` Frequency `0.008`, Amplitude `14`
- `Sum` → `Terrain Out`

### Mountains terrain

Steep ridges using a CurveFunction to create cliff faces:

```nodegraph
{
  "height": 220,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",    "category": "terrain", "sub": "Y = 64",             "x": 0,   "y": 20  },
    { "id": "cf",  "label": "CurveFunction", "category": "filter",  "sub": "Manual S-curve",     "x": 220, "y": 20  },
    { "id": "sn",  "label": "SimplexNoise2D","category": "terrain", "sub": "Freq 0.005 Amp 22",  "x": 0,   "y": 130 },
    { "id": "sum", "label": "Sum",           "category": "math",                                  "x": 420, "y": 75  },
    { "id": "out", "label": "Terrain Out",   "category": "output",                                "x": 620, "y": 75  }
  ],
  "edges": [
    { "from": "bh",  "to": "cf"  },
    { "from": "cf",  "to": "sum" },
    { "from": "sn",  "to": "sum" },
    { "from": "sum", "to": "out", "label": "density" }
  ]
}
```

---

## Step 4 — Assign Biome Ranges

With terrain built for each biome, assign the noise ranges that determine where each biome appears.

1. Open the **Biome Ranges** panel (left sidebar → **Ranges** tab, or **World → Biome Ranges** in the menu).
2. For each biome, set `Min` and `Max`:

| Biome | Min | Max |
|-------|-----|-----|
| Plains | –1.0 | –0.33 |
| Forest | –0.33 | 0.33 |
| Mountains | 0.33 | 1.0 |

3. Set **DefaultBiome** to `Plains` (used if the selector falls on an exact boundary — rare, but required).
4. The ranges must cover the full –1 to 1 span with no gaps and no overlaps.

> **Tip:** Equal thirds (–1/–0.33/0.33/1) gives roughly equal biome coverage. Shift the splits to make one biome dominate — e.g. `Mountains` at 0.6 to 1.0 makes them rarer.

---

## Step 5 — Configure the Biome Selector Noise

The selector noise controls the *shape* and *size* of biome regions — separate from any individual biome's terrain noise.

In the **Noise Range Config** (World settings or Biome Ranges panel):

| Field | Recommended | Effect |
|-------|-------------|--------|
| `Density.Type` | `SimplexNoise2D` | Standard 2D noise for smooth biome regions |
| `Density.Scale` | `0.001` | Large regions (~1000 block biomes). Increase to shrink regions |
| `DefaultTransitionDistance` | `32` | How many blocks blends terrain across a biome edge |
| `MaxBiomeEdgeDistance` | `64` | How far from an edge the blend is evaluated |

> Transition blending applies to **terrain density only** — materials and props switch at the biome boundary without blending.

---

## Step 6 — Test and Tune Biome Boundaries

Generate a preview and look for the biome boundaries.

**In 2D heatmap mode:**
- Biome boundaries show as visible terrain height changes
- If transitions look abrupt, increase `DefaultTransitionDistance`
- If transitions are so wide they erase the mountain peaks, decrease it

**In 3D terrain mode:**
- Walk (pan) across the boundary to see the blend
- Plains → Forest: gentle rise over ~32 blocks
- Forest → Mountains: terrain climbs steeply

**Common adjustments:**

| Problem | Fix |
|---------|-----|
| Biome regions too small / patchy | Reduce selector `Scale` (e.g. 0.0005) |
| Biome regions too large / monotonous | Increase selector `Scale` (e.g. 0.003) |
| Transitions feel sharp / cliff-like | Increase `DefaultTransitionDistance` |
| Transitions blend so far they break mountain peaks | Decrease `DefaultTransitionDistance` |
| One biome appears too rarely | Widen its `Min`/`Max` range |

---

## Step 7 — Add Materials Per Biome

Each biome has its own material provider. Select each biome and configure:

- **Plains:** `HeightGradient` — Grass at top, Dirt below, Stone at depth
- **Forest:** `HeightGradient` — Grass/Dirt/Stone (same structure, possibly different grass tint)
- **Mountains:** `SpaceAndDepth` with `ConstantThickness` layers — Stone surface, deeper Stone, Gravel veins

Select a biome → switch to the **Material** tab in the editor → build the material graph there.

> Materials switch at biome boundaries without blending. If a hard material cut is visible, widen your `DefaultTransitionDistance` to push biome edges into terrain folds rather than open flat ground.

---

## Summary

| Step | What you did |
|------|-------------|
| 1 | Understood how noise → biome selector → range mapping works |
| 2 | Created three biome assets (Plains, Forest, Mountains) |
| 3 | Built terrain density graphs for each biome |
| 4 | Assigned Min/Max ranges covering the full –1 to 1 span |
| 5 | Configured selector noise Scale and transition distances |
| 6 | Tested and tuned boundary appearance |
| 7 | Added per-biome materials |

> **Next:** Add props to each biome in the [Props and Prefab Placement guide](../guides/hytale-worldgen-v2-biome-system.md#props), or learn material layering in the [Biome System guide](../guides/hytale-worldgen-v2-biome-system.md).
