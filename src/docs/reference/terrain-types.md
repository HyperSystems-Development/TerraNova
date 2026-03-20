# Terrain Types

A catalog of terrain shapes you can build in TerraNova. Each entry shows the node structure, a copyable JSON snippet you can paste directly into a biome file, and a curve preview where relevant.

Use the snippets as starting points. Tweak Scale, amplitude, and curve points to match your biome's feel.

> **How to use a snippet:** Click the copy button on any snippet block, then paste into your biome JSON inside the `Density` field. Open the result in TerraNova to see the graph and adjust values visually.

---

## Flat Plain

The simplest possible terrain. A flat surface at a fixed Y level. Everything below is solid, everything above is air. Great starting point before adding any noise.

```curve
Flat plain density profile
[[0,1],[0.499,1],[0.5,0],[1,0]]
```

```snippet
Flat Plain [Beginner]
{
  "Type": "Sum",
  "Skip": false,
  "Inputs": [
    { "Type": "Constant", "Skip": false, "Value": 80 },
    { "Type": "Inverter", "Skip": false, "Inputs": [{ "Type": "YValue", "Skip": false }] }
  ]
}
```

Change `Value: 80` to move the surface height. `Value: 64` = sea level, `Value: 128` = mountain height.

---

## Rolling Hills

Smooth simplex noise added to a flat base. The noise gently raises and lowers the surface, creating soft hills without cliffs.

```curve
Hill density profile: gentle S shape
[[0,1],[0.35,0.7],[0.5,0],[0.65,-0.7],[1,-1]]
```

```snippet
Rolling Hills [Beginner]
{
  "Type": "Sum",
  "Skip": false,
  "Inputs": [
    {
      "Type": "Sum",
      "Skip": false,
      "Inputs": [
        { "Type": "Constant", "Skip": false, "Value": 80 },
        {
          "Type": "AmplitudeConstant",
          "Skip": false,
          "Value": 20,
          "Inputs": [{
            "Type": "SimplexNoise2D",
            "Skip": false,
            "Scale": 200,
            "Persistence": 0.5,
            "Lacunarity": 2.0,
            "Octaves": 3,
            "Seed": "hills"
          }]
        }
      ]
    },
    { "Type": "Inverter", "Skip": false, "Inputs": [{ "Type": "YValue", "Skip": false }] }
  ]
}
```

**Tuning knobs:**
- `Scale: 200`: larger = broader hills, smaller = tighter bumps
- `Value: 20` (AmplitudeConstant): controls hill height in blocks
- `Octaves: 3`: more octaves = rougher, more detailed hills

---

## Mountain Range

High-frequency simplex noise with many octaves creates rugged mountain terrain. A Power curve sharpens the peaks.

```curve
Mountain peak sharpening: Power(2) applied after noise
[[0,0],[0.25,0.0625],[0.5,0.25],[0.75,0.5625],[1,1]]
```

```snippet
Mountain Range [Intermediate]
{
  "Type": "Sum",
  "Skip": false,
  "Inputs": [
    {
      "Type": "Sum",
      "Skip": false,
      "Inputs": [
        { "Type": "Constant", "Skip": false, "Value": 64 },
        {
          "Type": "AmplitudeConstant",
          "Skip": false,
          "Value": 80,
          "Inputs": [{
            "Type": "SimplexNoise2D",
            "Skip": false,
            "Scale": 150,
            "Persistence": 0.6,
            "Lacunarity": 2.2,
            "Octaves": 6,
            "Seed": "mountains"
          }]
        }
      ]
    },
    { "Type": "Inverter", "Skip": false, "Inputs": [{ "Type": "YValue", "Skip": false }] }
  ]
}
```

**For sharper peaks:** wrap the noise in a `CurveMapper` using Power(2) before `AmplitudeConstant`. This compresses low values (valleys stay flat) and sharpens high values (peaks become pointed).

---

## Sky Islands

Isolated floating landmasses at varying heights. Cell noise creates the island footprints, a second noise assigns each island a different Y level, and gradient warping gives organic edges.

```curve
Island density falloff: solid center, tapers to zero at edge
[[0,1],[0.3,0.95],[0.6,0.6],[0.8,0.15],[1,0]]
```

```bounds
{"min": 70, "max": 150, "label": "Island float range: Y coordinates"}
```

```snippet
Sky Islands [Intermediate]
{
  "Type": "Clamp",
  "Skip": false,
  "WallA": -1.0,
  "WallB": 1.0,
  "Inputs": [{
    "Type": "Multiplier",
    "Skip": false,
    "Inputs": [
      {
        "Type": "Sum",
        "Skip": false,
        "Inputs": [
          {
            "Type": "AmplitudeConstant",
            "Skip": false,
            "Value": -1.5,
            "Inputs": [{
              "Type": "FastGradientWarp",
              "Skip": false,
              "WarpScale": 80,
              "WarpFactor": 20,
              "WarpPersistence": 0.3,
              "WarpLacunarity": 2.0,
              "WarpOctaves": 2,
              "Seed": "warp",
              "Inputs": [{
                "Type": "CellNoise2D",
                "Skip": false,
                "ScaleX": 125,
                "ScaleZ": 125,
                "Jitter": 0.8,
                "CellType": "Distance2Div",
                "Octaves": 1,
                "Seed": "islands"
              }]
            }]
          },
          { "Type": "Constant", "Skip": false, "Value": 0.8 }
        ]
      },
      {
        "Type": "Clamp",
        "Skip": false,
        "WallA": 0.0,
        "WallB": 1.0,
        "Inputs": [{
          "Type": "AmplitudeConstant",
          "Skip": false,
          "Value": 0.067,
          "Inputs": [{
            "Type": "Sum",
            "Skip": false,
            "Inputs": [
              {
                "Type": "Sum",
                "Skip": false,
                "Inputs": [
                  {
                    "Type": "AmplitudeConstant",
                    "Skip": false,
                    "Value": 40,
                    "Inputs": [{
                      "Type": "SimplexNoise2D",
                      "Skip": false,
                      "Scale": 333,
                      "Persistence": 0.5,
                      "Lacunarity": 2.0,
                      "Octaves": 2,
                      "Seed": "height_variation"
                    }]
                  },
                  { "Type": "Constant", "Skip": false, "Value": 110 }
                ]
              },
              { "Type": "Inverter", "Skip": false, "Inputs": [{ "Type": "YValue", "Skip": false }] }
            ]
          }]
        }]
      }
    ]
  }]
}
```

See the full build walkthrough: [Sky Islands Walkthrough](../walkthroughs/sky-islands.md)

---

## Caves

3D simplex noise carves tunnels through otherwise solid terrain. A Threshold cuts the noise into a hard binary mask so caves have crisp walls rather than gradual voids.

```curve
Cave carve mask: threshold at 0.65, only top 35% becomes void
[[0,0],[0.649,0],[0.65,1],[1,1]]
```

```snippet
Caves [Intermediate]
{
  "Type": "Sum",
  "Skip": false,
  "Inputs": [
    {
      "Type": "Sum",
      "Skip": false,
      "Inputs": [
        { "Type": "Constant", "Skip": false, "Value": 80 },
        {
          "Type": "AmplitudeConstant",
          "Skip": false,
          "Value": 20,
          "Inputs": [{
            "Type": "SimplexNoise2D",
            "Skip": false,
            "Scale": 200,
            "Persistence": 0.5,
            "Lacunarity": 2.0,
            "Octaves": 3,
            "Seed": "surface"
          }]
        }
      ]
    },
    { "Type": "Inverter", "Skip": false, "Inputs": [{ "Type": "YValue", "Skip": false }] },
    {
      "Type": "AmplitudeConstant",
      "Skip": false,
      "Value": -2.0,
      "Inputs": [{
        "Type": "Threshold",
        "Skip": false,
        "Threshold": 0.65,
        "Inputs": [{
          "Type": "SimplexNoise3D",
          "Skip": false,
          "Scale": 40,
          "Persistence": 0.5,
          "Lacunarity": 2.0,
          "Octaves": 2,
          "Seed": "caves"
        }]
      }]
    }
  ]
}
```

**Tuning knobs:**
- `Scale: 40`: smaller = tighter cave passages, larger = cavern halls
- `Threshold: 0.65`: raise to make caves rarer and smaller, lower for more frequent caves
- `Value: -2.0` (outer AmplitudeConstant): how aggressively caves carve

---

## Terraced Cliffs

StepFunction applied to a heightmap quantizes the terrain into flat bands, creating a stepped mesa or terraced cliff look. More steps = more bands; fewer = wider shelves.

```curve
Terrace steps: 4 flat bands
[[0,0],[0.249,0],[0.25,0.25],[0.499,0.25],[0.5,0.5],[0.749,0.5],[0.75,0.75],[0.999,0.75],[1,1]]
```

```snippet
Terraced Cliffs [Beginner]
{
  "Type": "Sum",
  "Skip": false,
  "Inputs": [
    {
      "Type": "AmplitudeConstant",
      "Skip": false,
      "Value": 60,
      "Inputs": [{
        "Type": "StepFunction",
        "Skip": false,
        "Steps": 6,
        "Inputs": [{
          "Type": "SimplexNoise2D",
          "Skip": false,
          "Scale": 180,
          "Persistence": 0.5,
          "Lacunarity": 2.0,
          "Octaves": 3,
          "Seed": "terrace"
        }]
      }]
    },
    { "Type": "Constant", "Skip": false, "Value": 64 },
    { "Type": "Inverter", "Skip": false, "Inputs": [{ "Type": "YValue", "Skip": false }] }
  ]
}
```

**Tuning:**
- `Steps: 6`: the number of flat shelves. Try 3 for wide mesas, 12 for thin rice-paddy terracing
- `Value: 60`: total height range across all steps in blocks

---

## Ridgelines

Inverting the noise and applying a Power curve creates sharp ridges instead of hills. Low areas become flat, high areas become pointed spines.

```curve
Ridge sharpen: Not + Power(3), peaks are very sharp
[[0,1],[0.2,0.488],[0.4,0.216],[0.5,0.125],[0.6,0.064],[0.8,0.008],[1,0]]
```

```snippet
Ridgelines [Intermediate]
{
  "Type": "Sum",
  "Skip": false,
  "Inputs": [
    {
      "Type": "Sum",
      "Skip": false,
      "Inputs": [
        { "Type": "Constant", "Skip": false, "Value": 64 },
        {
          "Type": "AmplitudeConstant",
          "Skip": false,
          "Value": 80,
          "Inputs": [{
            "Type": "Power",
            "Skip": false,
            "Exponent": 3.0,
            "Inputs": [{
              "Type": "Not",
              "Skip": false,
              "Inputs": [{
                "Type": "SimplexNoise2D",
                "Skip": false,
                "Scale": 120,
                "Persistence": 0.55,
                "Lacunarity": 2.0,
                "Octaves": 5,
                "Seed": "ridges"
              }]
            }]
          }]
        }
      ]
    },
    { "Type": "Inverter", "Skip": false, "Inputs": [{ "Type": "YValue", "Skip": false }] }
  ]
}
```

**How it works:** `Not` flips noise so valleys become peaks. `Power(3)` then sharpens only the peaks: the math compresses low values toward zero and stretches high values, turning broad bumps into sharp spines.

---

## Plateau Mesa

A strong S-curve applied after the heightmap flattens out the tops and bottoms and sharpens the cliff transition in the middle. Gives a flat-topped mesa with near-vertical walls.

```curve
Mesa profile: flat top and bottom, sharp cliff wall in middle
[[0,0],[0.3,0.02],[0.45,0.15],[0.5,0.5],[0.55,0.85],[0.7,0.98],[1,1]]
```

```snippet
Plateau Mesa [Intermediate]
{
  "Type": "Sum",
  "Skip": false,
  "Inputs": [
    {
      "Type": "Sum",
      "Skip": false,
      "Inputs": [
        { "Type": "Constant", "Skip": false, "Value": 64 },
        {
          "Type": "AmplitudeConstant",
          "Skip": false,
          "Value": 60,
          "Inputs": [{
            "Type": "SmoothStep",
            "Skip": false,
            "Edge0": 0.35,
            "Edge1": 0.65,
            "Inputs": [{
              "Type": "SimplexNoise2D",
              "Skip": false,
              "Scale": 250,
              "Persistence": 0.4,
              "Lacunarity": 2.0,
              "Octaves": 2,
              "Seed": "mesa"
            }]
          }]
        }
      ]
    },
    { "Type": "Inverter", "Skip": false, "Inputs": [{ "Type": "YValue", "Skip": false }] }
  ]
}
```

Narrowing `Edge0` and `Edge1` closer together makes the cliff walls steeper. Separating them creates a more gradual ramp.

---

## Archipelago (Ocean Islands)

Cell noise creates separated island patches. A Distance-based curve gives each island a circular density falloff. Gradient warping adds organic coastline shapes. Islands sit above a sea floor.

```curve
Island shore falloff
[[0,1],[0.4,0.9],[0.65,0.4],[0.85,0.05],[1,0]]
```

```bounds
{"min": 48, "max": 80, "label": "Archipelago height: sea floor to island peak"}
```

```snippet
Archipelago [Intermediate]
{
  "Type": "Sum",
  "Skip": false,
  "Inputs": [
    { "Type": "Constant", "Skip": false, "Value": 48 },
    {
      "Type": "AmplitudeConstant",
      "Skip": false,
      "Value": 32,
      "Inputs": [{
        "Type": "Clamp",
        "Skip": false,
        "WallA": 0.0,
        "WallB": 1.0,
        "Inputs": [{
          "Type": "Sum",
          "Skip": false,
          "Inputs": [
            {
              "Type": "AmplitudeConstant",
              "Skip": false,
              "Value": -1.2,
              "Inputs": [{
                "Type": "FastGradientWarp",
                "Skip": false,
                "WarpScale": 60,
                "WarpFactor": 15,
                "WarpPersistence": 0.4,
                "WarpLacunarity": 2.0,
                "WarpOctaves": 2,
                "Seed": "coast_warp",
                "Inputs": [{
                  "Type": "CellNoise2D",
                  "Skip": false,
                  "ScaleX": 200,
                  "ScaleZ": 200,
                  "Jitter": 0.9,
                  "CellType": "Distance2Div",
                  "Octaves": 1,
                  "Seed": "archipelago"
                }]
              }]
            },
            { "Type": "Constant", "Skip": false, "Value": 0.7 }
          ]
        }]
      }]
    },
    { "Type": "Inverter", "Skip": false, "Inputs": [{ "Type": "YValue", "Skip": false }] }
  ]
}
```

---

## Canyon / Badlands

Layered simplex noise with a strong vertical component carves deep narrow valleys between tall sandstone pillars. Use a large base height and negative noise to cut downward.

```curve
Canyon wall profile: steep walls, flat valley floor
[[0,0],[0.1,0],[0.2,0.05],[0.35,0.5],[0.5,0.95],[0.65,1],[1,1]]
```

```snippet
Canyon / Badlands [Advanced]
{
  "Type": "Sum",
  "Skip": false,
  "Inputs": [
    { "Type": "Constant", "Skip": false, "Value": 130 },
    {
      "Type": "AmplitudeConstant",
      "Skip": false,
      "Value": -80,
      "Inputs": [{
        "Type": "SmoothStep",
        "Skip": false,
        "Edge0": 0.3,
        "Edge1": 0.7,
        "Inputs": [{
          "Type": "SimplexNoise2D",
          "Skip": false,
          "Scale": 80,
          "Persistence": 0.6,
          "Lacunarity": 2.5,
          "Octaves": 4,
          "Seed": "canyons"
        }]
      }]
    },
    {
      "Type": "AmplitudeConstant",
      "Skip": false,
      "Value": 15,
      "Inputs": [{
        "Type": "SimplexNoise2D",
        "Skip": false,
        "Scale": 40,
        "Persistence": 0.5,
        "Lacunarity": 2.0,
        "Octaves": 2,
        "Seed": "canyon_detail"
      }]
    },
    { "Type": "Inverter", "Skip": false, "Inputs": [{ "Type": "YValue", "Skip": false }] }
  ]
}
```

The key trick: start at `Y=130` (tall plateau), subtract a SmoothStep-shaped noise with amplitude 80. The SmoothStep makes valley walls steep while keeping flat tops and flat floors.

---

## Volcano

A radial mountain shape with a crater at the summit. Uses a Distance node from the volcano's center combined with an inverted Power curve to create the cone, and a small subtracted sphere for the crater.

```curve
Volcano cone profile: steep sides, dip at peak for crater
[[0,0],[0.2,0.5],[0.4,0.85],[0.55,1],[0.65,0.9],[0.75,0.75],[0.85,0.4],[1,0]]
```

> **Note:** True single-volcano terrain typically needs a position anchor. The snippet below uses CellNoise peaks as approximate volcano centers, useful for a volcanic island field.

```snippet
Volcano [Advanced]
{
  "Type": "Sum",
  "Skip": false,
  "Inputs": [
    { "Type": "Constant", "Skip": false, "Value": 48 },
    {
      "Type": "AmplitudeConstant",
      "Skip": false,
      "Value": 70,
      "Inputs": [{
        "Type": "Power",
        "Skip": false,
        "Exponent": 0.5,
        "Inputs": [{
          "Type": "Clamp",
          "Skip": false,
          "WallA": 0.0,
          "WallB": 1.0,
          "Inputs": [{
            "Type": "Sum",
            "Skip": false,
            "Inputs": [
              {
                "Type": "AmplitudeConstant",
                "Skip": false,
                "Value": -1.0,
                "Inputs": [{
                  "Type": "CellNoise2D",
                  "Skip": false,
                  "ScaleX": 300,
                  "ScaleZ": 300,
                  "Jitter": 0.6,
                  "CellType": "Distance",
                  "Octaves": 1,
                  "Seed": "volcanoes"
                }]
              },
              { "Type": "Constant", "Skip": false, "Value": 1.0 }
            ]
          }]
        }]
      }]
    },
    { "Type": "Inverter", "Skip": false, "Inputs": [{ "Type": "YValue", "Skip": false }] }
  ]
}
```

---

## Spires and Pillars

Very narrow cell noise regions combined with high vertical amplitude and a sharp Power curve create thin stone spires or pillar clusters.

```curve
Spire base profile: very sharp dropoff from center
[[0,1],[0.15,0.8],[0.3,0.4],[0.45,0.1],[0.6,0.01],[1,0]]
```

```snippet
Spires and Pillars [Advanced]
{
  "Type": "Clamp",
  "Skip": false,
  "WallA": -1.0,
  "WallB": 1.0,
  "Inputs": [{
    "Type": "Multiplier",
    "Skip": false,
    "Inputs": [
      {
        "Type": "Sum",
        "Skip": false,
        "Inputs": [
          {
            "Type": "AmplitudeConstant",
            "Skip": false,
            "Value": -2.0,
            "Inputs": [{
              "Type": "Power",
              "Skip": false,
              "Exponent": 4.0,
              "Inputs": [{
                "Type": "CellNoise2D",
                "Skip": false,
                "ScaleX": 60,
                "ScaleZ": 60,
                "Jitter": 0.7,
                "CellType": "Distance",
                "Octaves": 1,
                "Seed": "spires"
              }]
            }]
          },
          { "Type": "Constant", "Skip": false, "Value": 1.5 }
        ]
      },
      {
        "Type": "Clamp",
        "Skip": false,
        "WallA": 0.0,
        "WallB": 1.0,
        "Inputs": [{
          "Type": "AmplitudeConstant",
          "Skip": false,
          "Value": 0.008,
          "Inputs": [{
            "Type": "Sum",
            "Skip": false,
            "Inputs": [
              { "Type": "Constant", "Skip": false, "Value": 160 },
              { "Type": "Inverter", "Skip": false, "Inputs": [{ "Type": "YValue", "Skip": false }] }
            ]
          }]
        }]
      }
    ]
  }]
}
```

The `Power(4)` exponent is the key: it creates an extremely sharp dropoff from cell centers, keeping only a very narrow pillar. Increasing the exponent makes thinner, more extreme spires.

---

## Further reading

- [Curves Reference](./curves.md): visual guide to every curve type
- [Node Effects](./node-effects.md): what every node category does
- [Reading the Node Graph](./reading-the-graph.md): how to interpret and debug any graph
- [Sky Islands Walkthrough](../walkthroughs/sky-islands.md): step-by-step full biome build
