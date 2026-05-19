# Walkthrough: Shaping Terrain and Carving Caves

<!-- walkthrough -->

> **Biome source assets:** `Examples/Example_Curve_Mapper.json`, `Experimental/Mountains.json`, `Experimental/Plateaus.json`, `Generative/Generative_Arches.json`, `Generative/Generative_Veins.json`
>
> Terrain and cave examples on this page are grounded in those Hytale `Examples/`, `Experimental/`, and `Generative/` assets. The walkthrough graphs are teaching reductions, not full biome copies.

This walkthrough takes you through building four distinct terrain types from scratch, then adding caves to any of them. Each section builds on the last — work through them in order or jump to whichever shape you need.

## Step 1 — Flat Plains (Baseline)

The simplest terrain: a flat surface at a fixed height. This is the starting point every other shape builds from.

**Nodes needed:** `BaseHeight` → `Sum` → `Terrain Out`

`BaseHeight` crosses `0` at a reference Y level and gives you the vertical anchor everything else builds on. In the source assets, the most common next step is to feed it into `CurveMapper` or combine it with noise in `Sum`.

1. Right-click the canvas → **Add Node** → **Terrain** → **BaseHeight**
2. In the properties panel set `Distance` to `false` (default).
3. Add a **Sum** node. Connect `BaseHeight` → `Sum` → `Terrain Out`.
4. Click **Generate**. You should see a flat plane.

```nodegraph
{
  "height": 140,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",  "category": "terrain", "sub": "Y = 64",     "x": 0,   "y": 40 },
    { "id": "sum", "label": "Sum",         "category": "math",                          "x": 240, "y": 40 },
    { "id": "out", "label": "Terrain Out", "category": "output",                        "x": 440, "y": 40 }
  ],
  "edges": [
    { "from": "bh",  "to": "sum", "label": "density" },
    { "from": "sum", "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "bh",  "text": "BaseHeight outputs a density value that crosses zero at Y=64. Above that line the value is negative (air); below it is positive (solid). This single node defines a perfectly flat surface — the baseline every other terrain type builds on top of." },
    { "nodeId": "sum", "text": "Sum routes the BaseHeight density forward. With only one input it passes the value through unchanged, but the Sum node is the right anchor point — every additional layer (noise, caves, shapes) gets added here later without restructuring the graph." },
    { "nodeId": "out", "text": "Terrain Out receives the final density and hands it to the generator. Anything positive becomes solid ground; anything negative becomes air. Right now the result is a perfectly flat plane at Y=64." }
  ]
}
```

> **Key insight:** Always route through `Sum` into `Terrain Out` — even when there is only one input. Every additional terrain layer (noise, caves, shapes) gets added into the same `Sum`, keeping the graph easy to extend.

> **Preview note:** TerraNova's preview evaluator reads the named `BaseHeight` content field instead of returning a hardcoded `0.0`. If a flat plane appears at the wrong height, check the referenced content field first. For a fully explicit preview-only plane, use `Sum { Inputs: [Constant { Value: 64 }, Inverter { Input: YValue }] }`.

---

## Step 2 — Rolling Hills (Adding Noise)

Add `SimplexNoise2D` to introduce horizontal variation — hills, valleys, and uneven ground.

**Nodes needed:** `BaseHeight` + `SimplexNoise2D` + `Multiplier` (with `Constant`) → `Sum` → `Terrain Out`

1. Add **SimplexNoise2D**. Set `Scale` to `0.008` (lower = wider, smoother hills).
2. Add a **Multiplier** node. Connect `SimplexNoise2D` into it, and also connect a **Constant** node (set `Value` to `0.15`) into it. This scales the noise output. (`SimplexNoise2D` outputs [-1, 1]; the `Constant` value controls how much height variation results.)
3. Add a **Sum** node. Connect `BaseHeight` and the `Multiplier` output into `Sum`.
4. Connect `Sum` → `Terrain Out`.

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",       "category": "terrain", "sub": "Y = 64",       "x": 0,   "y": 20 },
    { "id": "sn",  "label": "SimplexNoise2D", "category": "terrain", "sub": "Scale 0.008",  "x": 0,   "y": 110 },
    { "id": "c",   "label": "Constant",       "category": "math",    "sub": "Value 0.15",   "x": 0,   "y": 175 },
    { "id": "mul", "label": "Multiplier",     "category": "math",    "sub": "noise × 0.15", "x": 220, "y": 135 },
    { "id": "sum", "label": "Sum",            "category": "math",                            "x": 420, "y": 65 },
    { "id": "out", "label": "Terrain Out",      "category": "output",                         "x": 620, "y": 65 }
  ],
  "edges": [
    { "from": "bh",  "to": "sum" },
    { "from": "sn",  "to": "mul" },
    { "from": "c",   "to": "mul" },
    { "from": "mul", "to": "sum", "label": "scaled noise" },
    { "from": "sum", "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "bh",  "text": "BaseHeight anchors the terrain at Y=64. It contributes a fixed positive density below the surface line and negative above — the flat baseline that everything else offsets from." },
    { "nodeId": "sn",  "text": "SimplexNoise2D outputs values in [−1, 1] that vary smoothly across the X/Z plane. At Scale 0.008 the pattern repeats roughly every 125 blocks — wide, gradual hill shapes. Increase Scale for tighter, choppier variation." },
    { "nodeId": "c",   "text": "Constant supplies a fixed multiplier of 0.15. This controls the amplitude: the noise will offset density by at most ±0.15 relative to the baseline. Raise it to 0.3–0.5 for dramatic hills; lower it to 0.05 for gentle undulation." },
    { "nodeId": "mul", "text": "Multiplier scales the noise: output = noise × 0.15. Without this, the raw [−1, 1] noise would shift terrain by a full unit in either direction — too extreme for gentle hills. The Constant value is the direct knob for hill amplitude." },
    { "nodeId": "sum", "text": "Sum adds the scaled noise to the BaseHeight density. At any horizontal position the density is now: BaseHeight + (noise × 0.15). Positive noise pushes the surface up; negative noise pushes it down — creating hills and valleys." },
    { "nodeId": "out", "text": "Terrain Out receives the combined density. The surface forms wherever the density crosses zero, which now varies by ±0.15 across the terrain instead of sitting flat at Y=64." }
  ]
}
```

**Tuning guide:**

| Parameter | Effect |
|-----------|--------|
| `Scale` low (0.003–0.008) | Wide, gradual hills |
| `Scale` high (0.02–0.05) | Choppy, rough surface |
| `Constant Value` low (0.05–0.1) | Gentle undulation |
| `Constant Value` high (0.3–0.5) | Dramatic height difference |
| `Octaves` 1 | Smooth, single-frequency hills |
| `Octaves` 4–6 | Natural layered detail |

---

## Step 3 — Mountains (CurveMapper for Sharp Profiles)

Mountains need a steep vertical profile — sharp peaks, flat base. `CurveMapper` with a `Manual` curve lets you draw exactly how density maps to height.

**Nodes needed:** `BaseHeight` → `CurveMapper` (Manual curve) + `SimplexNoise2D` → `Sum` → `YSampled` → `Terrain Out`

1. Add **CurveMapper**. In the properties panel, set its `Curve` type to **Manual**.
2. Draw the curve: flat near the bottom (gentle base), then steep in the middle (cliff face), then flat again near the top (plateau). This S-shape creates dramatic cliffs.
3. Connect `BaseHeight` → `CurveMapper`.
4. Add **SimplexNoise2D** (Scale `0.005`, Octaves `4`) for ridge variation. Add a **Multiplier** node with the noise and a **Constant** (`Value: 0.4`) as inputs to scale the noise output.
5. Add **Sum** — connect `CurveMapper` and the `Multiplier` output into it.
6. Wrap the whole thing in **YSampled** (SampleDistance `4`) for performance.
7. Connect `YSampled` → `Terrain Out`.

Use this starter mountain curve first, then adjust only the middle points:

```curve
Mountain cliff profile - broad base, steep wall, flatter top
[[0,-1],[0.18,-0.98],[0.36,-0.78],[0.5,-0.12],[0.58,0.7],[0.68,0.96],[0.82,1],[1,1]]
```

- Raise the point near `0.58` for harsher cliffs.
- Pull the point near `0.82` down if the plateau feels too flat.
- Keep the first third low so the mountain has a readable base.

```nodegraph
{
  "height": 240,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",   "category": "terrain", "sub": "Y = 64",            "x": 0,   "y": 10  },
    { "id": "cf",  "label": "CurveMapper",  "category": "filter",  "sub": "Manual — S-curve",  "x": 220, "y": 10  },
    { "id": "sn",  "label": "SimplexNoise2D", "category": "terrain", "sub": "Scale 0.005 Oct 4", "x": 0,   "y": 120 },
    { "id": "c",   "label": "Constant",      "category": "math",    "sub": "Value 0.4",         "x": 0,   "y": 185 },
    { "id": "mul", "label": "Multiplier",    "category": "math",    "sub": "noise × 0.4",       "x": 210, "y": 145 },
    { "id": "sum", "label": "Sum",           "category": "math",                                 "x": 420, "y": 65  },
    { "id": "ys",  "label": "YSampled",     "category": "terrain", "sub": "SampleDistance 4",   "x": 600, "y": 65  },
    { "id": "out", "label": "Terrain Out",  "category": "output",                                "x": 800, "y": 65  }
  ],
  "edges": [
    { "from": "bh",  "to": "cf"  },
    { "from": "cf",  "to": "sum" },
    { "from": "sn",  "to": "mul" },
    { "from": "c",   "to": "mul" },
    { "from": "mul", "to": "sum" },
    { "from": "sum", "to": "ys"  },
    { "from": "ys",  "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "bh",  "text": "BaseHeight marks the vertical anchor by crossing zero at Y=64. On its own it gives you the flat reference plane that later curve and noise stages build from." },
    { "nodeId": "cf",  "text": "CurveMapper remaps the BaseHeight value using a drawn curve. A gentle S-curve creates a sharp cliff band: the terrain rises steeply through a narrow Y range instead of smoothly. Steepen the curve middle section to make cliffs more vertical." },
    { "nodeId": "sn",  "text": "SimplexNoise2D adds horizontal variation so the mountain isn't a perfectly uniform ridge. Low Scale (0.005) gives broad variation — individual peaks and saddles. Increase the Constant Value on the Multiplier to make peaks taller." },
    { "nodeId": "sum", "text": "Sum combines the curve-shaped height profile with the noise variation. The CurveMapper controls the overall vertical shape; the noise gives it organic peaks and ridges." },
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

**Nodes needed:** `SimplexNoise3D` + `YValue` + `CurveMapper` → `Sum` → `Terrain Out`

Use `YValue` fed through a `CurveMapper` to bias the noise — positive in a target height band, negative outside — so floating masses stay within a reasonable range.

1. Add **SimplexNoise3D**. Set `ScaleXZ` to `0.02`, `ScaleY` to `0.03`, `Octaves` to `3`. (`SimplexNoise3D` uses `ScaleXZ` and `ScaleY` — not `Frequency` or `Amplitude`.)
2. Add **YValue** — outputs the current Y coordinate as a number.
3. Add **CurveMapper** (Manual). Draw a curve that is positive between Y=40 and Y=120 and negative outside that range — a hill shape. This keeps islands within the band.
4. Add **Sum** — connect `SimplexNoise3D` and `CurveMapper` into it.
5. Connect `Sum` → `Terrain Out`.

The height-bias curve is what stops this from becoming random floating blobs:

```curve
Floating island height band - strongest in the middle, fades above and below
[[0,-1],[0.16,-0.95],[0.32,-0.55],[0.46,0.28],[0.58,0.92],[0.7,0.32],[0.84,-0.55],[1,-1]]
```

Read it like this:
- Negative ends mean "no island mass" outside the band.
- The high middle keeps the densest part of the island around your target height.
- A wider peak creates chunkier islands; a narrow peak creates thinner floating shelves.

```nodegraph
{
  "height": 220,
  "nodes": [
    { "id": "sn3",  "label": "SimplexNoise3D", "category": "terrain", "sub": "ScaleXZ 0.02 Oct 3",  "x": 0,   "y": 20  },
    { "id": "yv",   "label": "YValue",         "category": "terrain", "sub": "raw Y",                "x": 0,   "y": 120 },
    { "id": "cm",   "label": "CurveMapper",    "category": "filter",  "sub": "positive Y 40–120",    "x": 200, "y": 120 },
    { "id": "sum",  "label": "Sum",            "category": "math",                                    "x": 400, "y": 70  },
    { "id": "out",  "label": "Terrain Out",    "category": "output",                                  "x": 600, "y": 70  }
  ],
  "edges": [
    { "from": "sn3", "to": "sum" },
    { "from": "yv",  "to": "cm"  },
    { "from": "cm",  "to": "sum", "label": "height bias" },
    { "from": "sum", "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "sn3",  "text": "SimplexNoise3D varies in all three dimensions — X, Y, and Z. This lets it create overhangs, arches, and masses that float free of any horizontal surface. Without a height bias, these masses appear at random altitudes throughout the world." },
    { "nodeId": "yv",   "text": "YValue outputs the raw Y coordinate at the current sample point. On its own it is just a number, but feeding it into CurveMapper lets you convert the vertical position into any density value you choose." },
    { "nodeId": "cm",   "text": "CurveMapper converts raw Y into a height bias value. The curve is positive between Y=40 and Y=120 and negative outside — so this node outputs a bonus that adds solid mass in that band and subtracts it elsewhere. Widen the positive region for a taller island band; narrow it for thinner shelves." },
    { "nodeId": "sum",  "text": "Sum adds the 3D noise and the height bias together: density = noise + heightBias. Inside the target band, heightBias is positive — it tips borderline-negative noise values into positive, creating solid mass. Outside the band, heightBias is strongly negative — it suppresses the noise, preventing islands from forming there." },
    { "nodeId": "out",  "text": "Terrain Out receives the final density. Floating masses appear wherever noise + heightBias > 0. The curve shape is what constrains them to the target altitude band rather than scattering randomly through the world." }
  ]
}
```

> To combine with ground terrain from Step 2, feed both the ground `Sum` and this floating island `Sum` into a **Max** node — it keeps whichever region is more solid.

---

## Step 5 — Basic Caves (Inverter + Min)

Caves are carved by taking a 3D noise field, inverting it so high-noise areas become empty, then using `Min` to keep only areas solid in *both* the terrain and the cave mask.

**Nodes needed:** terrain (from above) + `SimplexNoise3D` → `Inverter` → `Min` → `Terrain Out`

1. Start with your terrain graph from Step 2 or Step 3 — call this your **terrain density**.
2. Add a second **SimplexNoise3D**. Set `ScaleXZ` to `0.04`, `ScaleY` to `0.05`, `Octaves` to `2`. Higher `ScaleXZ` = smaller, more numerous caves.
3. Add **Inverter** — connect `SimplexNoise3D` into it. This flips the sign: where noise was high (positive) it becomes negative (empty), carving out space.
4. Add **Min** — connect your terrain density and the `Inverter` output into it.
5. Connect `Min` → `Terrain Out`.

```nodegraph
{
  "height": 220,
  "nodes": [
    { "id": "terr", "label": "Terrain (Sum)", "category": "terrain", "sub": "from Step 2 or 3",  "x": 0,   "y": 40  },
    { "id": "cn",   "label": "SimplexNoise3D","category": "terrain", "sub": "ScaleXZ 0.04 Oct 2","x": 0,   "y": 150 },
    { "id": "inv",  "label": "Inverter",      "category": "math",    "sub": "flip cave mask",    "x": 240, "y": 150 },
    { "id": "min",  "label": "Min",           "category": "math",    "sub": "carve",             "x": 440, "y": 95  },
    { "id": "out",  "label": "Terrain Out",   "category": "output",                               "x": 640, "y": 95  }
  ],
  "edges": [
    { "from": "terr", "to": "min" },
    { "from": "cn",   "to": "inv" },
    { "from": "inv",  "to": "min", "label": "cave mask" },
    { "from": "min",  "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "terr", "text": "Your existing terrain density — the hills, mountains, or plains graph from the earlier steps. This defines where the solid ground is before carving." },
    { "nodeId": "cn",   "text": "A separate SimplexNoise3D node used only for cave shapes. Higher ScaleXZ (0.04) creates smaller, tighter caves. Lower (0.01) creates large open caverns. Increase Octaves for more organic, branching passages." },
    { "nodeId": "inv",  "text": "Inverter multiplies the cave noise by –1. Areas that were positive (high noise) become negative. This creates a mask where high-noise zones are air — exactly where caves should be." },
    { "nodeId": "min",  "text": "Min keeps the lower of the two inputs at every point. Terrain is solid (positive) where there are no caves. The cave mask is negative where caves should be. Min outputs negative there — carving through solid terrain. Both inputs must be positive for a block to exist." },
    { "nodeId": "out",  "text": "The final carved density reaches Terrain Out. The result is your terrain shape with caves hollowed out where the 3D noise was strong enough. Adjust cave noise ScaleXZ and Octaves to control cave size and density." }
  ]
}
```

**Tuning caves:**

| Parameter | Effect |
|-----------|--------|
| Cave noise `ScaleXZ` low (0.01) | Large open caverns |
| Cave noise `ScaleXZ` high (0.05+) | Small tight passages |
| Cave noise `Octaves` high | More organic, branching passages |
| Cave noise `Octaves` 1 | Smooth, round caves |
| Cave noise `Octaves` 4+ | Jagged, organic tunnels |

---

## Step 6 — Deep Caves with Height Limiting

Caves that punch through the surface look wrong. Use `YValue` + `CurveMapper` to create a mask that fades the cave carving to zero above a target Y level, then multiply it against the cave noise before passing it into `Min`.

**Nodes needed:** Add `YValue` + `CurveMapper` + `Multiplier` between the cave noise and `Min`

1. Add **YValue** — outputs the current Y coordinate.
2. Add **CurveMapper** (Manual). Draw a curve that outputs `1.0` below Y=55 and ramps down to `0` between Y=55 and Y=70, staying at `0` above. This is the cave mask weight.
3. Add **Multiplier** — connect `Inverter` output as one input and `CurveMapper` output as the other. This scales the cave mask to zero above the cutoff height.
4. Feed the `Multiplier` output into `Min` instead of the raw `Inverter`.

Use this fade curve for the height mask before refining it:

```curve
Cave fade mask - full strength underground, fades near the surface
[[0,1],[0.46,1],[0.62,0.92],[0.76,0.45],[0.9,0.08],[1,0]]
```

- Keep the flat top if you want caves to stay strong deep underground.
- Soften the drop if you want a gradual cave ceiling.
- Make the drop steeper if surface holes are still appearing.

```nodegraph
{
  "height": 260,
  "nodes": [
    { "id": "terr", "label": "Terrain",     "category": "terrain", "sub": "from Step 2–3",       "x": 0,   "y": 40  },
    { "id": "cn",   "label": "SimplexNoise3D","category": "terrain","sub": "ScaleXZ 0.04",        "x": 0,   "y": 140 },
    { "id": "inv",  "label": "Inverter",    "category": "math",    "sub": "flip",                 "x": 200, "y": 140 },
    { "id": "yv",   "label": "YValue",      "category": "terrain", "sub": "raw Y",                "x": 0,   "y": 230 },
    { "id": "cm",   "label": "CurveMapper", "category": "filter",  "sub": "1.0 below Y55, 0 above","x": 200, "y": 230 },
    { "id": "mul",  "label": "Multiplier",  "category": "math",    "sub": "scale by height mask", "x": 400, "y": 185 },
    { "id": "min",  "label": "Min",         "category": "math",    "sub": "carve",                "x": 580, "y": 112 },
    { "id": "out",  "label": "Terrain Out", "category": "output",                                  "x": 760, "y": 112 }
  ],
  "edges": [
    { "from": "terr", "to": "min" },
    { "from": "cn",   "to": "inv" },
    { "from": "inv",  "to": "mul", "label": "cave mask" },
    { "from": "yv",   "to": "cm"  },
    { "from": "cm",   "to": "mul", "label": "height weight" },
    { "from": "mul",  "to": "min", "label": "masked caves" },
    { "from": "min",  "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "terr", "text": "Your existing terrain density from Step 2 or 3. This is the solid ground that caves will carve through. The Min node downstream only removes solid blocks — it cannot create them — so the terrain must come in here." },
    { "nodeId": "cn",   "text": "A second SimplexNoise3D node used exclusively for cave shapes. Its output is in [−1, 1]; high values mark where cave passages should be. This node has no effect on the surface — it only drives the cave mask downstream." },
    { "nodeId": "inv",  "text": "Inverter multiplies the cave noise by −1, flipping its sign. Zones where noise was positive (intended cave space) become negative. This is the core carving signal: negative density = air." },
    { "nodeId": "yv",   "text": "YValue outputs the current sample's Y coordinate. This feeds into CurveMapper so the cave mask can vary by altitude — full strength underground, fading to zero near and above the surface." },
    { "nodeId": "cm",   "text": "CurveMapper converts Y into a weight in [0, 1]. The curve outputs 1.0 deep underground and ramps to 0 near the surface. This weight gate is what stops caves from punching holes through the top of the terrain." },
    { "nodeId": "mul",  "text": "Multiplier combines the inverted cave noise with the height weight: maskedCave = invertedNoise × heightWeight. Underground (weight = 1) the full cave signal passes through. Near the surface (weight → 0) the carving signal approaches zero — caves fade out cleanly without a sharp cutoff." },
    { "nodeId": "min",  "text": "Min picks the lower density at every point. Terrain is positive (solid) where no cave exists. The masked cave signal is negative where a cave should form. Min outputs that negative value — a hole in the ground. Both must be positive for a block to remain solid." },
    { "nodeId": "out",  "text": "Terrain Out receives the height-limited carved density. Caves exist only underground; the surface is intact. Move the CurveMapper ramp earlier (lower Y) to push caves deeper, or later to allow them closer to the surface." }
  ]
}
```

> Adjust the `CurveMapper` ramp to control where caves fade out. A sharper transition creates a more defined cave ceiling; a gradual ramp blends caves into the surface naturally.

---

## Summary

| Terrain goal | Key nodes |
|-------------|-----------|
| Flat ground | `BaseHeight` → `Terrain Out` |
| Rolling hills | `BaseHeight` + `SimplexNoise2D` → `Sum` |
| Sharp mountains | `BaseHeight` → `CurveMapper` + `SimplexNoise2D` → `Sum` |
| Floating islands / overhangs | `SimplexNoise3D` + `YValue` + `CurveMapper` → `Sum` |
| Caves (any terrain) | terrain + `SimplexNoise3D` → `Inverter` → `Min` |
| Underground-only caves | Add `YValue` + `CurveMapper` + `Multiplier` before `Min` |

> **Next:** Add materials to your terrain in the [Biome System guide](../guides/world/biome-system.md), or explore more combinations in [Node Combinations](../guides/world/node-combinations.md). For more terrain shapes organized by outcome, see [Terrain Types and Node Recipes](../guides/terrain/terrain-types.md). To understand the math behind what you just built, read [Terrain Math Explained](../guides/terrain/terrain-math-explained.md) and [Curves Explained](../guides/world/curves-explained.md).
