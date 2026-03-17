# Walkthrough: Periodic Density Stripes (Experimental)

<!-- walkthrough -->

This walkthrough shows how to make a density pattern repeat at a fixed interval using `Modulo` — like a sine wave that tiles forever. The technique is useful for striped terrain, sediment layers, banded cave systems, or any repeating horizontal pattern.

> **Experimental:** This is an advanced pattern. It produces predictable, geometric results that look intentional at large scales but artificial at small ones. Combine with noise for organic variation.
>
> **Note:** `Modulo` is available in the TerraNova editor but is not part of the Hytale engine bundle — it will not export to a working Hytale world. This walkthrough is useful for previewing and experimenting inside TerraNova, but the pattern is not currently exportable.

---

## The Core Idea

Normally a `CurveMapper` driven by `XValue` maps a sine shape once across the entire world — you have to manually place every stripe. With `Modulo`, the X value wraps back to zero every N blocks. The curve only needs to cover one period, and it tiles automatically.

```nodegraph
{
  "height": 180,
  "nodes": [
    { "id": "cx",  "label": "XValue",      "category": "terrain", "sub": "raw X value",     "x": 0,   "y": 65 },
    { "id": "mod", "label": "Modulo",      "category": "math",    "sub": "Divisor = 100",   "x": 200, "y": 65 },
    { "id": "cf",  "label": "CurveMapper", "category": "filter",  "sub": "sine 0 → 100",    "x": 400, "y": 65 },
    { "id": "out", "label": "Terrain Out", "category": "output",                             "x": 620, "y": 65 }
  ],
  "edges": [
    { "from": "cx",  "to": "mod" },
    { "from": "mod", "to": "cf"  },
    { "from": "cf",  "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "cx",  "text": "XValue outputs the raw world X coordinate — a number that increases as you move east. On its own this gives a value that grows forever, which isn't useful for periodic patterns." },
    { "nodeId": "mod", "text": "Modulo wraps the input back to zero every time it reaches the Divisor. With Divisor = 100, the output cycles 0 → 99 → 0 → 99 → ... every 100 blocks. This is the period of your stripe. Change the Divisor to change stripe width." },
    { "nodeId": "cf",  "text": "CurveMapper receives a value between 0 and 100. Draw one full sine cycle in the Manual curve editor — the curve maps 0–100 input to a –1 to 1 density output. Because Modulo repeats the input, the curve tiles automatically without you drawing every stripe." },
    { "nodeId": "out", "text": "Terrain Out receives the tiled density. Every 100 blocks the pattern starts over. The result is repeating stripes of solid and air — like sediment bands or a striped terrain profile." }
  ]
}
```

---

## Step 1 — Add the Base Nodes

1. Add **XValue** (Terrain category).
2. Add **Modulo** (Math category). Set `Divisor` to `100`.
3. Connect `XValue` → `Modulo`.

The Modulo output now cycles 0 → 99 → 0 → 99 regardless of how far along X you are.

> Use `YValue` instead of `XValue` for **horizontal sediment layers** (stripes at different heights). Use `ZValue` for stripes running north–south.

---

## Step 2 — Shape the Stripe with CurveMapper

1. Add **CurveMapper** (Filter category). Set `Curve` type to **Manual**.
2. The input range is 0 to 100 (your Divisor). Draw a sine-shaped curve:
   - Start at 0 (left edge): value = 0
   - Peak at 25: value = +1 (solid)
   - Cross zero at 50: value = 0
   - Trough at 75: value = −1 (air)
   - Return to 0 at 100 (right edge): value = 0
3. Connect `Modulo` → `CurveMapper`.
4. Connect `CurveMapper` → `Terrain Out`.
5. Click **Generate**. You should see repeating stripes.

**Stripe width is controlled entirely by the `Divisor` value** — no need to redraw the curve.

| Divisor | Stripe width |
|---------|-------------|
| `50` | 50-block repeating period |
| `100` | 100-block period (recommended starting point) |
| `200` | 200-block period — wide bands |
| `500` | Very wide, gradual bands |

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
    { "id": "mod",  "label": "Modulo",           "category": "math",    "sub": "Divisor = 100",    "x": 200, "y": 130 },
    { "id": "cf",   "label": "CurveMapper",      "category": "filter",  "sub": "sine 0→100",       "x": 380, "y": 130 },
    { "id": "amp",  "label": "AmplitudeConstant","category": "math",    "sub": "× 0.3",            "x": 560, "y": 130 },
    { "id": "sum",  "label": "Sum",              "category": "math",                                "x": 720, "y": 80  },
    { "id": "out",  "label": "Terrain Out",      "category": "output",                              "x": 900, "y": 80  }
  ],
  "edges": [
    { "from": "terr", "to": "sum" },
    { "from": "cx",   "to": "mod" },
    { "from": "mod",  "to": "cf"  },
    { "from": "cf",   "to": "amp" },
    { "from": "amp",  "to": "sum", "label": "stripe modifier" },
    { "from": "sum",  "to": "out", "label": "density" }
  ]
}
```

`AmplitudeConstant` (× 0.3) keeps the stripe subtle — it nudges the terrain surface rather than overpowering it. Increase it to make stripes more pronounced.

### Cave-carving stripes (Min)

To carve stripe-shaped tunnels through terrain:

- Replace `Sum` with **Min**
- Feed terrain density and the stripe curve into `Min`
- Where the stripe is negative (trough), it carves through solid terrain

---

## Step 4 — Break Up the Grid Look

Pure `Modulo` stripes are perfectly regular — they look artificial. Add noise to offset the stripe phase:

1. Add **SimplexNoise2D** (Frequency `0.005`, Amplitude `20`).
2. Add a **Sum** between `XValue` and `Modulo`.
3. Connect `XValue` → `Sum`, `SimplexNoise2D` → `Sum`, then `Sum` → `Modulo`.

The noise shifts the X input before Modulo wraps it — the stripe boundaries wobble organically while the period stays consistent.

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "cx",   "label": "XValue",       "category": "terrain", "sub": "raw X",            "x": 0,   "y": 30  },
    { "id": "sn",   "label": "SimplexNoise2D","category": "terrain", "sub": "Freq 0.005 Amp 20","x": 0,   "y": 130 },
    { "id": "sum",  "label": "Sum",          "category": "math",    "sub": "offset X by noise", "x": 220, "y": 80  },
    { "id": "mod",  "label": "Modulo",       "category": "math",    "sub": "Divisor = 100",     "x": 420, "y": 80  },
    { "id": "cf",   "label": "CurveMapper",  "category": "filter",  "sub": "sine 0→100",        "x": 600, "y": 80  },
    { "id": "out",  "label": "Terrain Out",  "category": "output",                               "x": 800, "y": 80  }
  ],
  "edges": [
    { "from": "cx",  "to": "sum" },
    { "from": "sn",  "to": "sum", "label": "phase offset" },
    { "from": "sum", "to": "mod" },
    { "from": "mod", "to": "cf"  },
    { "from": "cf",  "to": "out", "label": "density" }
  ]
}
```

---

## Tuning Reference

| Goal | What to adjust |
|------|---------------|
| Wider stripes | Increase `Modulo` Divisor |
| Narrower stripes | Decrease `Modulo` Divisor |
| Stronger stripe effect | Increase `AmplitudeConstant` multiplier |
| Subtle stripe effect | Decrease `AmplitudeConstant` multiplier |
| Wavy / organic stripe edges | Add `SimplexNoise2D` before `Modulo` (Step 4) |
| Horizontal sediment layers | Replace `XValue` with `YValue` |
| North–south stripes | Replace `XValue` with `ZValue` |
| Diagonal stripes | Sum `XValue` and `ZValue` before `Modulo` |

---

> **Next:** Combine this with the [Terrain and Caves walkthrough](./terrain-and-caves.md) to layer stripes into a full terrain setup, or read about [Node Combinations](../guides/node-combinations.md) for more advanced density patterns.
