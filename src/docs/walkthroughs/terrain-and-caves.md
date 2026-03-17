# Walkthrough: Shaping Terrain and Carving Caves

<!-- walkthrough -->

This walkthrough takes you through building four distinct terrain types from scratch, then adding caves to any of them. Each section builds on the last — work through them in order or jump to whichever shape you need.

## Step 1 — Flat Plains (Baseline)

The simplest terrain: a flat surface at a fixed height. This is the starting point every other shape builds from.

**Nodes needed:** `BaseHeight` → `Terrain Out`

`BaseHeight` outputs `0` at a reference Y level. Positive above it, negative below. The world generator places solid blocks wherever density is positive — so this alone gives a perfectly flat plane.

1. Right-click the canvas → **Add Node** → **Terrain** → **BaseHeight**
2. In the properties panel set `Distance` to `false` (default).
3. Connect `BaseHeight` → `Terrain Out`.
4. Click **Generate**. You should see a flat plane.

```nodegraph
{
  "height": 140,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",  "category": "terrain", "sub": "Y = 64",     "x": 0,   "y": 40 },
    { "id": "out", "label": "Terrain Out", "category": "output",                        "x": 240, "y": 40 }
  ],
  "edges": [
    { "from": "bh", "to": "out", "label": "density" }
  ]
}
```

> **Key insight:** `BaseHeight` is always your vertical anchor. Every other terrain shape is a modification layered on top of it.

---

## Step 2 — Rolling Hills (Adding Noise)

Add `SimplexNoise2D` to introduce horizontal variation — hills, valleys, and uneven ground.

**Nodes needed:** `BaseHeight` + `SimplexNoise2D` → `Sum` → `Terrain Out`

1. Add **SimplexNoise2D**. Set `Frequency` to `0.008` (lower = wider, smoother hills).
2. Set `Amplitude` to `12` (controls hill height in blocks).
3. Add a **Sum** node. Connect both `BaseHeight` and `SimplexNoise2D` into `Sum`.
4. Connect `Sum` → `Terrain Out`.

```nodegraph
{
  "height": 180,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",    "category": "terrain", "sub": "Y = 64",           "x": 0,   "y": 20 },
    { "id": "sn",  "label": "SimplexNoise2D","category": "terrain", "sub": "Freq 0.008 Amp 12", "x": 0,   "y": 110 },
    { "id": "sum", "label": "Sum",           "category": "math",                                 "x": 240, "y": 65 },
    { "id": "out", "label": "Terrain Out",   "category": "output",                               "x": 440, "y": 65 }
  ],
  "edges": [
    { "from": "bh",  "to": "sum" },
    { "from": "sn",  "to": "sum" },
    { "from": "sum", "to": "out", "label": "density" }
  ]
}
```

**Tuning guide:**

| Parameter | Effect |
|-----------|--------|
| `Frequency` low (0.003–0.008) | Wide, gradual hills |
| `Frequency` high (0.02–0.05) | Choppy, rough surface |
| `Amplitude` low (4–8) | Gentle undulation |
| `Amplitude` high (20–40) | Dramatic height difference |
| `Octaves` 1 | Smooth, single-frequency hills |
| `Octaves` 4–6 | Natural layered detail |

---

## Step 3 — Mountains (CurveFunction for Sharp Profiles)

Mountains need a steep vertical profile — sharp peaks, flat base. `CurveFunction` with a `Manual` curve lets you draw exactly how density maps to height.

**Nodes needed:** `BaseHeight` → `CurveFunction` (Manual curve) + `SimplexNoise2D` → `Sum` → `YSampled` → `Terrain Out`

1. Add **CurveFunction**. In the properties panel, set its `Curve` type to **Manual**.
2. Draw the curve: flat near the bottom (gentle base), then steep in the middle (cliff face), then flat again near the top (plateau). This S-shape creates dramatic cliffs.
3. Connect `BaseHeight` → `CurveFunction`.
4. Add **SimplexNoise2D** (Frequency `0.005`, Amplitude `20`) for ridge variation.
5. Add **Sum** — connect `CurveFunction` and `SimplexNoise2D` into it.
6. Wrap the whole thing in **YSampled** (SampleDistance `4`) for performance.
7. Connect `YSampled` → `Terrain Out`.

```nodegraph
{
  "height": 240,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",    "category": "terrain", "sub": "Y = 64",            "x": 0,   "y": 10  },
    { "id": "cf",  "label": "CurveFunction", "category": "filter",  "sub": "Manual — S-curve",  "x": 220, "y": 10  },
    { "id": "sn",  "label": "SimplexNoise2D","category": "terrain", "sub": "Freq 0.005 Amp 20",  "x": 0,   "y": 120 },
    { "id": "sum", "label": "Sum",           "category": "math",                                  "x": 420, "y": 65  },
    { "id": "ys",  "label": "YSampled",      "category": "terrain", "sub": "SampleDistance 4",   "x": 600, "y": 65  },
    { "id": "out", "label": "Terrain Out",   "category": "output",                                "x": 800, "y": 65  }
  ],
  "edges": [
    { "from": "bh",  "to": "cf"  },
    { "from": "cf",  "to": "sum" },
    { "from": "sn",  "to": "sum" },
    { "from": "sum", "to": "ys"  },
    { "from": "ys",  "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "bh",  "text": "BaseHeight outputs 0 at Y=64. Above is positive (solid), below is negative (air). On its own this gives a flat plane — it's just an anchor for the shape." },
    { "nodeId": "cf",  "text": "CurveFunction remaps the BaseHeight value using a drawn curve. A gentle S-curve creates a sharp cliff band: the terrain rises steeply through a narrow Y range instead of smoothly. Steepen the curve middle section to make cliffs more vertical." },
    { "nodeId": "sn",  "text": "SimplexNoise2D adds horizontal variation so the mountain isn't a perfectly uniform ridge. Low Frequency (0.005) gives broad variation — individual peaks and saddles. Increase Amplitude to make peaks taller." },
    { "nodeId": "sum", "text": "Sum combines the curve-shaped height profile with the noise variation. The CurveFunction controls the overall vertical shape; the noise gives it organic peaks and ridges." },
    { "nodeId": "ys",  "text": "YSampled wraps the entire density graph and evaluates it at every 4 blocks vertically, then interpolates between samples. This gives roughly 4× faster generation with no visible difference for smooth mountain terrain." },
    { "nodeId": "out", "text": "Terrain Out receives the final density. Anything positive becomes solid. The result is steep, cliff-banded mountains with natural horizontal variation." }
  ]
}
```

**Curve tips:**

| Curve shape | Terrain result |
|-------------|---------------|
| Gentle S | Smooth cliffs, moderate steepness |
| Steep vertical middle | Sheer cliff walls |
| Flat top plateau | Mesa / table mountain |
| Multiple steps | Tiered cliff bands |

---

## Step 4 — Overhangs and Floating Islands (SimplexNoise3D)

`SimplexNoise3D` varies in all three dimensions — it can make terrain that overhangs itself or creates floating masses.

**Nodes needed:** `SimplexNoise3D` + `YGradient` → `Sum` → `Terrain Out`

Add a `YGradient` to bias the noise — negative at the top and bottom of the world, positive in the middle — so floating masses stay within a reasonable height band.

1. Add **SimplexNoise3D**. Set `Frequency` to `0.02`, `Amplitude` to `1.0`, `Octaves` to `3`.
2. Add **YGradient**. Set `FromY` to `40`, `ToY` to `120`. This outputs a positive value between those heights and negative outside — keeps islands within the band.
3. Add **Sum** — connect both nodes into it.
4. Connect `Sum` → `Terrain Out`.

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "sn3",  "label": "SimplexNoise3D", "category": "terrain", "sub": "Freq 0.02 Oct 3",   "x": 0,   "y": 20  },
    { "id": "yg",   "label": "YGradient",      "category": "terrain", "sub": "Y 40 → 120",        "x": 0,   "y": 120 },
    { "id": "sum",  "label": "Sum",            "category": "math",                                  "x": 240, "y": 70  },
    { "id": "out",  "label": "Terrain Out",    "category": "output",                                "x": 440, "y": 70  }
  ],
  "edges": [
    { "from": "sn3", "to": "sum" },
    { "from": "yg",  "to": "sum" },
    { "from": "sum", "to": "out", "label": "density" }
  ]
}
```

> To combine with ground terrain from Step 2, feed both the ground `Sum` and this floating island `Sum` into a **MaxFunction** node — it keeps whichever region is more solid.

---

## Step 5 — Basic Caves (Negate + MinFunction)

Caves are carved by taking a 3D noise field, negating it so high-noise areas become empty, then using `MinFunction` to keep only areas solid in *both* the terrain and the cave mask.

**Nodes needed:** terrain (from above) + `SimplexNoise3D` → `Negate` → `MinFunction` → `Terrain Out`

1. Start with your terrain graph from Step 2 or Step 3 feeding into a node — call this your **terrain density**.
2. Add a second **SimplexNoise3D**. Set `Frequency` to `0.04`, `Amplitude` to `1.2`, `Octaves` to `2`. Higher frequency = smaller, more numerous caves.
3. Add **Negate** — connect `SimplexNoise3D` into it. This flips the sign: where noise was high (positive) it becomes negative (empty), carving out space.
4. Add **MinFunction** — connect your terrain density and the `Negate` output into it.
5. Connect `MinFunction` → `Terrain Out`.

```nodegraph
{
  "height": 220,
  "nodes": [
    { "id": "terr", "label": "Terrain (Sum)", "category": "terrain", "sub": "from Step 2 or 3",  "x": 0,   "y": 40  },
    { "id": "cn",   "label": "SimplexNoise3D","category": "terrain", "sub": "Freq 0.04 Oct 2",   "x": 0,   "y": 150 },
    { "id": "neg",  "label": "Negate",        "category": "math",    "sub": "flip cave mask",    "x": 240, "y": 150 },
    { "id": "min",  "label": "MinFunction",   "category": "math",    "sub": "carve",             "x": 440, "y": 95  },
    { "id": "out",  "label": "Terrain Out",   "category": "output",                               "x": 640, "y": 95  }
  ],
  "edges": [
    { "from": "terr", "to": "min" },
    { "from": "cn",   "to": "neg" },
    { "from": "neg",  "to": "min", "label": "cave mask" },
    { "from": "min",  "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "terr", "text": "Your existing terrain density — the hills, mountains, or plains graph from the earlier steps. This defines where the solid ground is before carving." },
    { "nodeId": "cn",   "text": "A separate SimplexNoise3D node used only for cave shapes. Higher Frequency (0.04) creates smaller, tighter caves. Lower (0.01) creates large open caverns. Increase Octaves for more organic, branching passages." },
    { "nodeId": "neg",  "text": "Negate multiplies the cave noise by –1. Areas that were positive (high noise) become negative. This creates a mask where high-noise zones are air — exactly where caves should be." },
    { "nodeId": "min",  "text": "MinFunction keeps the lower of the two inputs at every point. Terrain is solid (positive) where there are no caves. The cave mask is negative where caves should be. MinFunction outputs negative there — carving through solid terrain. Both inputs must be positive for a block to exist." },
    { "nodeId": "out",  "text": "The final carved density reaches Terrain Out. The result is your terrain shape with caves hollowed out where the 3D noise was strong enough. Adjust cave noise Frequency and Amplitude to control cave size and density." }
  ]
}
```

**Tuning caves:**

| Parameter | Effect |
|-----------|--------|
| Cave noise `Frequency` low (0.01) | Large open caverns |
| Cave noise `Frequency` high (0.05+) | Small tight passages |
| Cave noise `Amplitude` high | More aggressive carving, thinner walls |
| Cave noise `Octaves` 1 | Smooth, round caves |
| Cave noise `Octaves` 4+ | Jagged, organic tunnels |

---

## Step 6 — Deep Caves with Height Limiting (Conditional)

Caves should only appear underground, not punching through the surface. Use `Conditional` to enable carving only below a certain Y level.

**Nodes needed:** Add `CoordinateY` + `Conditional` between the cave mask and `MinFunction`

1. Add **CoordinateY** — outputs the current Y coordinate as a raw number.
2. Add **Conditional**. Set `Threshold` to `55` (below sea level). Connect `CoordinateY` as the `Condition` input. Connect the cave `Negate` output as `TrueInput`. Connect a **Constant** (Value `1.0`, always solid — no carving) as `FalseInput`.
3. The conditional now outputs the cave mask below Y=55 and solid (no carving) above it.
4. Feed this into `MinFunction` as before.

```nodegraph
{
  "height": 240,
  "nodes": [
    { "id": "terr", "label": "Terrain",      "category": "terrain", "sub": "from Step 2–3",     "x": 0,   "y": 40  },
    { "id": "cn",   "label": "CaveNoise3D",  "category": "terrain", "sub": "Freq 0.04",          "x": 0,   "y": 150 },
    { "id": "neg",  "label": "Negate",       "category": "math",    "sub": "flip",               "x": 180, "y": 150 },
    { "id": "cy",   "label": "CoordinateY",  "category": "terrain", "sub": "raw Y value",        "x": 0,   "y": 220 },
    { "id": "cond", "label": "Conditional",  "category": "filter",  "sub": "Y < 55 → carve",    "x": 360, "y": 185 },
    { "id": "min",  "label": "MinFunction",  "category": "math",    "sub": "carve",              "x": 560, "y": 112 },
    { "id": "out",  "label": "Terrain Out",  "category": "output",                               "x": 760, "y": 112 }
  ],
  "edges": [
    { "from": "terr", "to": "min" },
    { "from": "cn",   "to": "neg" },
    { "from": "neg",  "to": "cond", "label": "TrueInput" },
    { "from": "cy",   "to": "cond", "label": "Condition" },
    { "from": "cond", "to": "min",  "label": "cave mask" },
    { "from": "min",  "to": "out",  "label": "density" }
  ]
}
```

> Change `Threshold` to push caves deeper (`40`) or higher (`70`). Set it above sea level to get surface-breaking cave entrances.

---

## Summary

| Terrain goal | Key nodes |
|-------------|-----------|
| Flat ground | `BaseHeight` → `Terrain Out` |
| Rolling hills | `BaseHeight` + `SimplexNoise2D` → `Sum` |
| Sharp mountains | `BaseHeight` → `CurveFunction` + `SimplexNoise2D` → `Sum` |
| Floating islands / overhangs | `SimplexNoise3D` + `YGradient` → `Sum` |
| Caves (any terrain) | terrain + `SimplexNoise3D` → `Negate` → `MinFunction` |
| Underground-only caves | Add `CoordinateY` + `Conditional` before `MinFunction` |

> **Next:** Add materials to your terrain in the [Biome System guide](../guides/hytale-worldgen-v2-biome-system.md), or explore more combinations in [Node Combinations](../guides/node-combinations.md).
