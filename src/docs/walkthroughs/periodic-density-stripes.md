# Walkthrough: Periodic Density Stripes (Experimental)

<!-- walkthrough -->

This walkthrough shows how to make a density pattern repeat at a fixed interval — like a sine wave that tiles forever. The technique is useful for striped terrain, sediment layers, banded cave systems, or any repeating horizontal pattern.

> [!NOTE]
> This is an advanced pattern. It produces predictable, geometric results that look intentional at large scales but artificial at small ones. Combine with noise for organic variation.

> [!IMPORTANT]
> `Modulo` does not exist in the Hytale WorldGen V2 node set. This walkthrough uses the correct approach: a `Scale` node to compress the coordinate range, feeding into a `CurveMapper` with a manually drawn repeating curve.

---

## The Core Idea

A `CurveMapper` driven by `XValue` normally maps its curve once across the entire world — a single stripe shape that stretches to infinity. To tile it, compress the X coordinate using `Scale` so that one full period maps to the [-1, 1] range the CurveMapper works in. Then draw a repeating wave shape in the curve.

To control stripe width, change the `Scale` value: higher scale = narrower stripes (more cycles per block), lower scale = wider stripes.

```nodegraph
{
  "height": 180,
  "nodes": [
    { "id": "cx",  "label": "XValue",      "category": "terrain", "sub": "raw X value",       "x": 0,   "y": 65 },
    { "id": "sc",  "label": "Scale",       "category": "terrain", "sub": "ScaleX 0.01",        "x": 200, "y": 65 },
    { "id": "cf",  "label": "CurveMapper", "category": "filter",  "sub": "sawtooth / sine",    "x": 400, "y": 65 },
    { "id": "out", "label": "Terrain Out", "category": "output",                                "x": 620, "y": 65 }
  ],
  "edges": [
    { "from": "cx",  "to": "sc" },
    { "from": "sc",  "to": "cf"  },
    { "from": "cf",  "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "cx",  "text": "XValue outputs the raw world X coordinate — a number that grows as you move east. On its own this gives a value that grows forever, which is not useful for periodic patterns." },
    { "nodeId": "sc",  "text": "Scale compresses the coordinate space. ScaleX 0.01 means the CurveMapper sees the X value divided by 100 — so every 100 world blocks maps to 1 unit of curve input. Change ScaleX to adjust stripe width: 0.005 = 200-block stripes, 0.02 = 50-block stripes." },
    { "nodeId": "cf",  "text": "CurveMapper receives the compressed X value. Draw a repeating wave in the Manual curve editor — a sine shape, a sawtooth, or a step function. Because the Scale node compresses world X to curve space, the same curve section repeats every N blocks automatically." },
    { "nodeId": "out", "text": "Terrain Out receives the tiled density. The result is repeating stripes whose width is controlled entirely by the Scale ScaleX value." }
  ]
}
```

---

## Step 1 — Add the Base Nodes

1. Add **XValue** (Terrain category).
2. Add **Scale** (Terrain category). Set `ScaleX` to `0.01` (leaves `ScaleY` and `ScaleZ` at `1.0`).
3. Connect `XValue` → `Scale`.

The Scale output now maps 100 world blocks to 1 unit of coordinate space.

> [!TIP]
> Use `YValue` instead of `XValue` for **horizontal sediment layers** (stripes at different heights). Use `ZValue` for stripes running north–south.

---

## Step 2 — Shape the Stripe with CurveMapper

1. Add **CurveMapper** (Filter category). Set `Curve` type to **Manual**.
2. The input range is roughly [-∞, +∞] in coordinate space, but the curve editor shows you the [-1, 1] window by default. Draw a repeating sine-shaped curve across the full range:
   - Start at left: value = 0
   - Peak at +0.25 input: value = +1 (solid)
   - Zero at +0.5: value = 0
   - Trough at +0.75 input: value = −1 (air)
   - Repeat the pattern — the curve tiles across the full coordinate range
3. Connect `Scale` → `CurveMapper`.
4. Connect `CurveMapper` → `Terrain Out`.
5. Click **Generate**. You should see repeating stripes.

**Stripe width is controlled entirely by the `ScaleX` value** — no need to redraw the curve.

| ScaleX | Stripe width (approx) |
|--------|----------------------|
| `0.02` | ~50-block period |
| `0.01` | ~100-block period (recommended starting point) |
| `0.005` | ~200-block period — wide bands |
| `0.002` | ~500-block period — very wide, gradual bands |

---

## Step 3 — Layer Over Existing Terrain

Stripes alone produce floating geometry. In practice, combine them with terrain using **Sum** or **Min**.

### Additive stripes (terrain + stripe modifier)

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "terr", "label": "Terrain",          "category": "terrain", "sub": "from hills graph", "x": 0,   "y": 30  },
    { "id": "cx",   "label": "XValue",           "category": "terrain", "sub": "raw X",            "x": 0,   "y": 130 },
    { "id": "sc",   "label": "Scale",            "category": "terrain", "sub": "ScaleX 0.01",      "x": 200, "y": 130 },
    { "id": "cf",   "label": "CurveMapper",      "category": "filter",  "sub": "repeating wave",   "x": 380, "y": 130 },
    { "id": "mc",   "label": "Constant",         "category": "math",    "sub": "Value 0.3",        "x": 560, "y": 195 },
    { "id": "mul",  "label": "Multiplier",       "category": "math",    "sub": "× 0.3",            "x": 560, "y": 130 },
    { "id": "sum",  "label": "Sum",              "category": "math",                                "x": 720, "y": 80  },
    { "id": "out",  "label": "Terrain Out",      "category": "output",                              "x": 900, "y": 80  }
  ],
  "edges": [
    { "from": "terr", "to": "sum" },
    { "from": "cx",   "to": "sc"  },
    { "from": "sc",   "to": "cf"  },
    { "from": "cf",   "to": "mul" },
    { "from": "mc",   "to": "mul" },
    { "from": "mul",  "to": "sum", "label": "stripe modifier" },
    { "from": "sum",  "to": "out", "label": "density" }
  ]
}
```

The `Multiplier` (with `Constant { Value: 0.3 }`) keeps the stripe subtle — it nudges the terrain surface rather than overpowering it. Increase the `Constant Value` to make stripes more pronounced.

### Cave-carving stripes (Min)

To carve stripe-shaped tunnels through terrain:

- Replace `Sum` with **Min**
- Feed terrain density and the stripe curve into `Min`
- Where the stripe is negative (trough), it carves through solid terrain

---

## Step 4 — Break Up the Grid Look

Pure coordinate-scaled stripes are perfectly regular — they look artificial. Add noise to warp the stripe phase:

1. Add **SimplexNoise2D** (Scale `0.005`). Add a **Multiplier** with a **Constant** (`Value: 0.4`) to scale the noise offset.
2. Add a **Sum** between the scaled `XValue` and the `CurveMapper` input.
3. Connect `Scale` → `Sum`, `Multiplier (noise)` → `Sum`, then `Sum` → `CurveMapper`.

The noise shifts the compressed X input — the stripe boundaries wobble organically while the overall period stays consistent.

```nodegraph
{
  "height": 220,
  "nodes": [
    { "id": "cx",   "label": "XValue",        "category": "terrain", "sub": "raw X",             "x": 0,   "y": 30  },
    { "id": "sc",   "label": "Scale",         "category": "terrain", "sub": "ScaleX 0.01",       "x": 200, "y": 30  },
    { "id": "sn",   "label": "SimplexNoise2D","category": "terrain", "sub": "Scale 0.005",       "x": 0,   "y": 140 },
    { "id": "nc",   "label": "Constant",      "category": "math",    "sub": "Value 0.4",         "x": 0,   "y": 205 },
    { "id": "nm",   "label": "Multiplier",    "category": "math",    "sub": "noise × 0.4",       "x": 200, "y": 165 },
    { "id": "sum",  "label": "Sum",           "category": "math",    "sub": "offset X by noise", "x": 380, "y": 80  },
    { "id": "cf",   "label": "CurveMapper",   "category": "filter",  "sub": "repeating wave",    "x": 560, "y": 80  },
    { "id": "out",  "label": "Terrain Out",   "category": "output",                               "x": 760, "y": 80  }
  ],
  "edges": [
    { "from": "cx",  "to": "sc" },
    { "from": "sc",  "to": "sum" },
    { "from": "sn",  "to": "nm" },
    { "from": "nc",  "to": "nm" },
    { "from": "nm",  "to": "sum", "label": "phase offset" },
    { "from": "sum", "to": "cf"  },
    { "from": "cf",  "to": "out", "label": "density" }
  ]
}
```

---

## Tuning Reference

| Goal | What to adjust |
|------|---------------|
| Wider stripes | Decrease `Scale` ScaleX (e.g. `0.005`) |
| Narrower stripes | Increase `Scale` ScaleX (e.g. `0.02`) |
| Stronger stripe effect | Increase `Constant Value` on the `Multiplier` |
| Subtle stripe effect | Decrease `Constant Value` on the `Multiplier` |
| Wavy / organic stripe edges | Add `SimplexNoise2D` + `Multiplier` before `CurveMapper` (Step 4) |
| Horizontal sediment layers | Replace `XValue` with `YValue` |
| North–south stripes | Replace `XValue` with `ZValue` |
| Diagonal stripes | Sum `XValue` and `ZValue` before `Scale` |

---

> **Next:** Combine this with the [Terrain and Caves walkthrough](./terrain-and-caves.md) to layer stripes into a full terrain setup, or read about [Node Combinations](../guides/world/node-combinations.md) for more advanced density patterns. For a deep dive into the curve types used here, see [Curves Explained](../guides/world/curves-explained.md).
