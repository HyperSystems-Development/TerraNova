# Tutorial: Building a Sky Islands Biome from Scratch

> **Difficulty:** Intermediate
> **Time:** 30-45 minutes
> **What you'll learn:** Density function composition, material layering, prop scattering, and how all the pieces of a V2 biome fit together.
> **End result:** A floating archipelago of islands at varying heights with grass-topped terrain, trees, crystals, and a dreamy atmosphere.
>
> **Format note:** All JSON in this tutorial uses **Hytale-native format** — the same format exported by Hytale's in-game editor. `$NodeId` UUIDs are omitted for readability (Hytale generates these automatically), but every other field matches what the server expects.

---

## Table of Contents

1. [Overview — What We're Building](#step-0--overview--what-were-building)
2. [Create the Asset Pack Structure](#step-1--create-the-asset-pack-structure)
3. [World Structure — Biome Selection Noise](#step-2--world-structure--biome-selection-noise)
4. [Terrain Foundation — The Height Formula](#step-3--terrain-foundation--the-height-formula)
5. [Island Shapes — Cell Noise Isolation](#step-4--island-shapes--cell-noise-isolation)
6. [Height Variation — Making Islands Float at Different Levels](#step-5--height-variation--making-islands-float-at-different-levels)
7. [Organic Edges — Gradient Warping](#step-6--organic-edges--gradient-warping)
8. [Putting the Terrain Together](#step-7--putting-the-terrain-together)
9. [Materials — Grass, Dirt, and Stone](#step-8--materials--grass-dirt-and-stone)
10. [Props — Trees on the Islands](#step-9--props--trees-on-the-islands)
11. [Props — Crystal Formations](#step-10--props--crystal-formations)
12. [Environment and Tint](#step-11--environment-and-tint)
13. [The Complete Biome JSON](#step-12--the-complete-biome-json)
14. [Experimenting Further](#step-13--experimenting-further)

---

---

## Step 0 — Overview: What We're Building

In Hytale's World Generation V2, terrain is defined by **density functions** — mathematical trees that take a 3D coordinate `(x, y, z)` and return a number. Positive = solid block, negative = air. By composing noise generators, math operations, and coordinate lookups, you can sculpt any terrain shape imaginable.

For Sky Islands, we need to solve three problems:

1. **Where are the islands?** → Cell noise gives us natural cell-shaped regions
2. **At what height does each island float?** → A separate noise layer assigns each island a different Y level
3. **What shape are they?** → A vertical gradient (thick in the middle, thin at top/bottom) combined with gradient warping for organic edges

Here's the mental model:

```
    ~~          ~~
  ###T###              <- Island at Y=140
                 ###T###T###    <- Island at Y=120
       ####                    <- Island at Y=105
  ~~                ~~
```

Each island is an isolated floating landmass. Let's build it.

---

## Step 1 — Create the Asset Pack Structure

Every V2 asset pack follows the same folder layout. In TerraNova, start a **New Project** and set up these files:

```
sky-islands/
├── manifest.json
└── HytaleGenerator/
    ├── Settings/
    │   └── Settings.json
    ├── WorldStructures/
    │   └── MainWorld.json
    └── Biomes/
        └── SkyIslandsBiome.json
```

### manifest.json

```json
{
  "name": "Sky Islands",
  "description": "Floating islands at varying heights with lush vegetation and crystal formations.",
  "version": "1.0.0",
  "serverVersion": "2026.02.05",
  "category": "Fantasy"
}
```

### Settings.json

Default performance settings — no changes needed:

```json
{
  "CustomConcurrency": -1,
  "BufferCapacityFactor": 0.4,
  "TargetViewDistance": 768.0,
  "TargetPlayerCount": 8.0,
  "StatsCheckpoints": []
}
```

---

## Step 2 — World Structure: Biome Selection Noise

`MainWorld.json` is the **root of everything**. It defines which biomes exist and how they're distributed across the world.

Since we only have one biome, we give it the full noise range (`-1.0` to `1.0`) so it covers the entire world:

```json
{
  "Type": "NoiseRange",
  "DefaultBiome": "Sky_Islands",
  "DefaultTransitionDistance": 16,
  "MaxBiomeEdgeDistance": 32,
  "Biomes": [
    {
      "Biome": "Sky_Islands",
      "Min": -1.0,
      "Max": 1.0
    }
  ],
  "Density": {
    "Type": "SimplexNoise2D",
    "Skip": false,
    "Scale": 500,
    "Persistence": 0.5,
    "Lacunarity": 2.0,
    "Octaves": 3,
    "Seed": "biome_select"
  },
  "Framework": {}
}
```

**Key concept:** The `Density` here is the *biome selection* noise — it determines which biome spawns where. Each biome's `Min`/`Max` range is checked against this noise value. Since our single biome covers `-1.0` to `1.0` (the full range), it spawns everywhere.

**About `Scale`:** In Hytale's native format, noise uses `Scale` instead of frequency. `Scale` is the spacing in blocks — larger values = larger, smoother features. `Scale: 500` means the noise repeats roughly every 500 blocks.

> **In TerraNova:** Open the **Biome Range Editor** to visualize how biomes map to the noise range. With one biome covering the full range, you'll see a solid bar. In multi-biome packs, you'd see different biomes occupying different slices.

---

## Step 3 — Terrain Foundation: The Height Formula

Now for the core of worldgen — the **density function** inside `SkyIslandsBiome.json`.

The fundamental terrain equation in V2 is:

```
density(x, y, z) = terrain_value(x, y, z) - y
```

- When density > 0 → the block is **solid**
- When density < 0 → the block is **air**
- When density = 0 → the **surface**

This means if `terrain_value` at some `(x, z)` position returns `100`, then everything below Y=100 is solid and everything above is air — creating a surface at Y=100.

In Hytale-native JSON, that looks like:

```json
{
  "Type": "Sum",
  "Skip": false,
  "Inputs": [
    {
      "Type": "Constant",
      "Skip": false,
      "Value": 100
    },
    {
      "Type": "Inverter",
      "Skip": false,
      "Inputs": [
        {
          "Type": "YValue",
          "Skip": false
        }
      ]
    }
  ]
}
```

`YValue` returns the current Y position. `Inverter` flips its sign. `Sum` adds them: `100 + (-y) = 100 - y`. This creates a flat plane at Y=100.

**Notice the pattern:** In Hytale's format, **all child connections use `Inputs` arrays** — even when there's only one input (like `Inverter`). Every node also has `Skip: false`.

> **In TerraNova:** Drop a `Constant` node (Value: 100), a `YValue` node, an `Inverter` node, and a `Sum` node onto the canvas. Wire `YValue` → `Inverter` → `Sum` input, and `Constant` → `Sum` input. The 2D preview will show a flat surface.

But a flat plane isn't interesting. Let's make islands.

---

## Step 4 — Island Shapes: Cell Noise Isolation

**Cell noise** (`CellNoise2D` in Hytale, also known as Voronoi noise) divides space into irregular cell regions — perfect for island shapes. Each cell naturally creates an isolated region with distinct boundaries.

We use `CellNoise2D` with large scale values to create big cells, each one becoming an island:

```json
{
  "Type": "CellNoise2D",
  "Skip": false,
  "ScaleX": 125,
  "ScaleZ": 125,
  "Jitter": 0.8,
  "CellType": "Distance2Div",
  "Octaves": 1,
  "Seed": "islands"
}
```

**Scale controls island size:**
- `ScaleX/Z: 250` → huge islands (250+ blocks across)
- `ScaleX/Z: 125` → medium islands (125 blocks) — our choice
- `ScaleX/Z: 60` → small islands (60 blocks)

**`CellType: "Distance2Div"`** gives the ratio of the distance to the nearest cell center versus the second-nearest. This produces values near `1.0` at cell centers and sharp transitions at edges — perfect for creating distinct island boundaries.

**`Jitter: 0.8`** randomizes the cell center positions (0 = perfect grid, 1 = maximum randomness). We use 0.8 for natural-looking but not chaotic placement.

Cell noise returns values roughly in the range `0` to `1` with Distance2Div. The *center* of each cell returns high values and the *edges* return low values. We'll use this as our island mask.

> **In TerraNova:** Drop a `CellNoise2D` node and set ScaleX/ScaleZ to `125`. Watch the 2D heatmap — you'll see cell patterns. Each bright region is a cell center, each dark region is a cell edge.

---

## Step 5 — Height Variation: Making Islands Float at Different Levels

If every island floats at Y=100, it looks boring. We use a *second*, low-frequency noise to assign each island a different height.

In Hytale, there's no single `LinearTransform` node. Instead, you **multiply with `AmplitudeConstant`** and **add with `Sum` + `Constant`**:

```json
{
  "Type": "Sum",
  "Skip": false,
  "Inputs": [
    {
      "Type": "AmplitudeConstant",
      "Skip": false,
      "Value": 40,
      "Inputs": [
        {
          "Type": "SimplexNoise2D",
          "Skip": false,
          "Scale": 333,
          "Persistence": 0.5,
          "Lacunarity": 2.0,
          "Octaves": 2,
          "Seed": "height_variation"
        }
      ]
    },
    {
      "Type": "Constant",
      "Skip": false,
      "Value": 110
    }
  ]
}
```

**Breaking this down:**

`SimplexNoise2D` returns values in roughly `-1` to `1`. `AmplitudeConstant` multiplies by `40`, giving `-40` to `40`. `Sum` with `Constant(110)` shifts the range:
- Input `-1.0` → `(-1 * 40) + 110 = 70` (lowest islands)
- Input `0.0` → `(0 * 40) + 110 = 110` (mid islands)
- Input `1.0` → `(1 * 40) + 110 = 150` (highest islands)

So islands float between Y=70 and Y=150, with most clustered around Y=110.

**About `Scale: 333`:** This means the noise varies over ~333 blocks. Nearby islands get similar heights, distant ones differ.

> **In TerraNova:** Add a `SimplexNoise2D` node (Scale: 333, Seed: "height_variation", Octaves: 2). Connect it into an `AmplitudeConstant` node (Value: 40). Then wire that into a `Sum` node alongside a `Constant` node (Value: 110). The heatmap shows the height map — lighter = higher islands.

---

## Step 6 — Organic Edges: Gradient Warping

Cell noise cells are too geometric by default. **`FastGradientWarp`** distorts the input coordinates before the noise lookup, creating irregular, organic-looking coastlines:

```json
{
  "Type": "FastGradientWarp",
  "Skip": false,
  "WarpScale": 80,
  "WarpFactor": 20,
  "WarpPersistence": 0.3,
  "WarpLacunarity": 2.0,
  "WarpOctaves": 2,
  "Seed": "warp",
  "Inputs": [
    {
      "Type": "CellNoise2D",
      "Skip": false,
      "ScaleX": 125,
      "ScaleZ": 125,
      "Jitter": 0.8,
      "CellType": "Distance2Div",
      "Octaves": 1,
      "Seed": "islands"
    }
  ]
}
```

**`FastGradientWarp` parameters:**
- **`WarpFactor`** — how far coordinates are displaced (in blocks). `20` = noticeably organic edges
- **`WarpScale`** — the scale of the warp noise itself. `80` = medium-frequency warping
- **`WarpOctaves/WarpPersistence/WarpLacunarity`** — detail of the warp noise (lower values = smoother warping)

Think of it as: before looking up the cell noise at position `(x, z)`, the warp shifts the coordinates by up to `WarpFactor` blocks in a random direction, making straight cell edges become wavy.

> **In TerraNova:** Wrap your `CellNoise2D` inside a `FastGradientWarp` node. Toggle the warp on/off (set `Skip: true` / `false`) to see the difference — geometric cells vs organic shapes. Adjust the `WarpFactor` slider in the property panel to find a look you like.

---

## Step 7 — Putting the Terrain Together

Now we compose everything into the full terrain density tree. Here's the logic:

```
island_mask    = invert + shift (FastGradientWarp(CellNoise2D))  -> 1 at island centers, 0 at edges
island_height  = noise * 40 + 110                                 -> varies 70-150
vertical_shape = clamp( (island_height - Y) / 15 )                -> vertical falloff, 15 blocks thick
final_density  = island_mask * vertical_shape                      -> solid only where both are positive
```

In Hytale-native JSON, the full terrain density:

```json
{
  "Type": "DAOTerrain",
  "Density": {
    "Type": "Cache",
    "Skip": false,
    "Capacity": 3,
    "Inputs": [
      {
        "Type": "Clamp",
        "Skip": false,
        "WallA": -1.0,
        "WallB": 1.0,
        "Inputs": [
          {
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
                    "Inputs": [
                      {
                        "Type": "FastGradientWarp",
                        "Skip": false,
                        "WarpScale": 80,
                        "WarpFactor": 20,
                        "WarpPersistence": 0.3,
                        "WarpLacunarity": 2.0,
                        "WarpOctaves": 2,
                        "Seed": "warp",
                        "Inputs": [
                          {
                            "Type": "CellNoise2D",
                            "Skip": false,
                            "ScaleX": 125,
                            "ScaleZ": 125,
                            "Jitter": 0.8,
                            "CellType": "Distance2Div",
                            "Octaves": 1,
                            "Seed": "islands"
                          }
                        ]
                      }
                    ]
                  },
                  {
                    "Type": "Constant",
                    "Skip": false,
                    "Value": 0.8
                  }
                ]
              },
              {
                "Type": "Clamp",
                "Skip": false,
                "WallA": 0.0,
                "WallB": 1.0,
                "Inputs": [
                  {
                    "Type": "AmplitudeConstant",
                    "Skip": false,
                    "Value": 0.067,
                    "Inputs": [
                      {
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
                                "Inputs": [
                                  {
                                    "Type": "SimplexNoise2D",
                                    "Skip": false,
                                    "Scale": 333,
                                    "Persistence": 0.5,
                                    "Lacunarity": 2.0,
                                    "Octaves": 2,
                                    "Seed": "height_variation"
                                  }
                                ]
                              },
                              {
                                "Type": "Constant",
                                "Skip": false,
                                "Value": 110
                              }
                            ]
                          },
                          {
                            "Type": "Inverter",
                            "Skip": false,
                            "Inputs": [
                              {
                                "Type": "YValue",
                                "Skip": false
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Walking through it piece by piece:**

1. **Island mask** (first `Multiplier` input):
   - `CellNoise2D` creates cell regions (`Distance2Div` = high at centers, low at edges)
   - `FastGradientWarp` makes the edges organic
   - `AmplitudeConstant(Value: -1.5)` inverts and amplifies: cell centers become negative (~-1.5), edges become positive
   - `Sum` with `Constant(0.8)` shifts everything up: centers ≈ +0.8 (solid), edges ≈ negative (air)
   - Result: island interiors = positive, gaps between islands = negative

2. **Vertical shape** (second `Multiplier` input):
   - `SimplexNoise2D` → `AmplitudeConstant(40)` + `Sum` with `Constant(110)` gives each island a base height between 70-150
   - `Sum` with `Inverter(YValue)` creates `height - y` — the distance below the island's surface
   - `AmplitudeConstant(Value: 0.067)` = dividing by ~15, controlling island thickness (15 blocks from center to edge vertically)
   - `Clamp(WallA: 0, WallB: 1)` cuts off negative values so there's no terrain above the surface

3. **`Multiplier`** multiplies them: solid only where both the island mask AND the vertical shape are positive

4. **`Cache`** (with `Capacity: 3`) stores the result so it isn't recalculated for material/prop queries

5. **`Clamp(WallA: -1, WallB: 1)`** keeps the final density in the standard range

> **In TerraNova:** Build this from the bottom up. Start with the two leaf noise nodes (`CellNoise2D` and `SimplexNoise2D`), wire them through their respective transform chains (`AmplitudeConstant` → `Sum`), then connect both branches into the `Multiplier` node. The 2D preview should show isolated island blobs. The 3D preview should show floating landmasses at varying heights.

---

## Step 8 — Materials: Grass, Dirt, and Stone

Now we decide **what blocks** fill the terrain. In Hytale's native format, materials use `{ Solid: "Block_Name" }` objects and `SpaceAndDepth` uses `Layers` arrays with thickness entries:

```json
{
  "Type": "Solidity",
  "Solid": {
    "Type": "Queue",
    "Queue": [
      {
        "Type": "SpaceAndDepth",
        "LayerContext": "DEPTH_INTO_FLOOR",
        "MaxExpectedDepth": 16,
        "Layers": [
          {
            "Type": "ConstantThickness",
            "Thickness": 1,
            "Material": {
              "Type": "Constant",
              "Material": {
                "Solid": "Soil_Grass"
              }
            }
          },
          {
            "Type": "ConstantThickness",
            "Thickness": 4,
            "Material": {
              "Type": "Constant",
              "Material": {
                "Solid": "Soil_Dirt"
              }
            }
          }
        ]
      },
      {
        "Type": "Constant",
        "Material": {
          "Solid": "Rock_Stone"
        }
      }
    ]
  }
}
```

**How this works in Hytale-native format:**

- **`Solidity`** is the top-level wrapper that separates solid blocks from air/fluid
- **`Queue`** tries materials in order — first match wins
- **`SpaceAndDepth`** with `LayerContext: "DEPTH_INTO_FLOOR"` assigns layers from the surface downward:
  - **Layer 1:** `ConstantThickness(1)` → 1 block of `Soil_Grass` (the surface)
  - **Layer 2:** `ConstantThickness(4)` → 4 blocks of `Soil_Dirt` beneath the grass
  - Everything past `MaxExpectedDepth` falls through to the next Queue entry
- **`Constant` (Rock_Stone)** is the fallback — everything deeper than the dirt layer becomes stone

**About material names:** Hytale uses specific block type identifiers like `Soil_Grass`, `Soil_Dirt`, `Rock_Stone`, `Rock_Bedrock`, etc. These must match actual block types registered on your server.

> **In TerraNova:** Open the **Material Layer Stack** editor for a visual representation. You'll see `Soil_Grass` at the top, transitioning to `Soil_Dirt`, then `Rock_Stone`. Adjust the `Thickness` values in each `ConstantThickness` layer to control how deep each material extends.

---

## Step 9 — Props: Trees on the Islands

Props are objects placed *on* the terrain. For trees, we need:
- **Positions** — where to try placing trees
- **Assignments** — what tree to place
- **Scanner** — how to find the surface

In Hytale's native format, positions use `Mesh2D` with a `PointGenerator`, and conditional selection uses `FieldFunction` assignments with `Delimiters`:

```json
{
  "Skip": false,
  "Runtime": 1,
  "Positions": {
    "Type": "Occurrence",
    "Skip": false,
    "Seed": "tree_spawn",
    "FieldFunction": {
      "Type": "SimplexNoise2D",
      "Skip": false,
      "Scale": 67,
      "Persistence": 0.5,
      "Lacunarity": 2.0,
      "Octaves": 2,
      "Seed": "tree_density"
    },
    "Positions": {
      "Type": "Mesh2D",
      "Skip": false,
      "PointsY": 0,
      "PointGenerator": {
        "Type": "Mesh",
        "Jitter": 0.4,
        "ScaleX": 10,
        "ScaleY": 10,
        "ScaleZ": 10,
        "Seed": "trees"
      }
    }
  },
  "Assignments": {
    "Type": "FieldFunction",
    "FieldFunction": {
      "Type": "SimplexNoise2D",
      "Skip": false,
      "Scale": 125,
      "Persistence": 0.5,
      "Lacunarity": 2.0,
      "Octaves": 1,
      "Seed": "tree_type"
    },
    "Delimiters": [
      {
        "Min": -1.0,
        "Max": 0.0,
        "Assignments": {
          "Type": "Constant",
          "Prop": {
            "Type": "Prefab",
            "Skip": false,
            "WeightedPrefabPaths": [
              { "Path": "Trees/Oak_Large", "Weight": 100 }
            ],
            "LegacyPath": false,
            "LoadEntities": true,
            "Directionality": {
              "Type": "Random",
              "Seed": "A"
            },
            "Scanner": {
              "Type": "ColumnLinear",
              "Skip": false,
              "MinY": 50,
              "MaxY": 200,
              "TopDownOrder": true,
              "ResultCap": 1,
              "RelativeToPosition": false,
              "BaseHeightName": "Base"
            }
          }
        }
      },
      {
        "Min": 0.0,
        "Max": 1.0,
        "Assignments": {
          "Type": "Constant",
          "Prop": {
            "Type": "Prefab",
            "Skip": false,
            "WeightedPrefabPaths": [
              { "Path": "Trees/Birch_Small", "Weight": 100 }
            ],
            "LegacyPath": false,
            "LoadEntities": true,
            "Directionality": {
              "Type": "Random",
              "Seed": "B"
            },
            "Scanner": {
              "Type": "ColumnLinear",
              "Skip": false,
              "MinY": 50,
              "MaxY": 200,
              "TopDownOrder": true,
              "ResultCap": 1,
              "RelativeToPosition": false,
              "BaseHeightName": "Base"
            }
          }
        }
      }
    ]
  }
}
```

**Breaking it down:**

- **`Occurrence`** is the native position filter. It takes a `FieldFunction` (density noise) and a child `Positions` provider. Positions are kept or discarded based on the noise value at each point, controlled by `Seed` for deterministic randomness.
- **`Mesh2D`** with `PointGenerator` creates candidate positions. `ScaleX/Y/Z: 10` = grid spacing of ~10 blocks. `Jitter: 0.4` adds randomness so positions don't look grid-like.
- **`FieldFunction` assignments** with `Delimiters` is how Hytale does conditional prop selection — instead of a simple threshold, you define **ranges**. Noise below `0.0` → oak trees. Noise above `0.0` → birch trees.
- **`Prefab`** uses `WeightedPrefabPaths` (an array of `{Path, Weight}` objects) — this allows weighted random selection between multiple prefab variants.
- **`ColumnLinear`** scanner searches from `MinY` to `MaxY` to find the surface. `TopDownOrder: true` means it scans from top down. `ResultCap: 1` means one placement per column.
- **`Random`** directionality rotates each tree randomly.

> **In TerraNova:** Add a prop entry in the right panel. Use an `Occurrence` node for positions with a `Mesh2D` + `PointGenerator` child. For assignments, use a `FieldFunction` with `Delimiters` to split tree types by noise range. The **Position Markers** in the 3D preview will show green dots where trees would spawn.

---

## Step 10 — Props: Crystal Formations

For a fantasy feel, let's scatter crystals using a sparser grid with noise-filtered placement:

```json
{
  "Skip": false,
  "Runtime": 1,
  "Positions": {
    "Type": "Occurrence",
    "Skip": false,
    "Seed": "crystal_spawn",
    "FieldFunction": {
      "Type": "SimplexNoise2D",
      "Skip": false,
      "Scale": 200,
      "Persistence": 0.5,
      "Lacunarity": 2.0,
      "Octaves": 2,
      "Seed": "crystals"
    },
    "Positions": {
      "Type": "Mesh2D",
      "Skip": false,
      "PointsY": 0,
      "PointGenerator": {
        "Type": "Mesh",
        "Jitter": 0.5,
        "ScaleX": 20,
        "ScaleY": 20,
        "ScaleZ": 20,
        "Seed": "crystal_grid"
      }
    }
  },
  "Assignments": {
    "Type": "Constant",
    "Prop": {
      "Type": "Prefab",
      "Skip": false,
      "WeightedPrefabPaths": [
        { "Path": "Minerals/Crystal_Cluster", "Weight": 60 },
        { "Path": "Minerals/Crystal_Spire", "Weight": 40 }
      ],
      "LegacyPath": false,
      "LoadEntities": true,
      "Directionality": {
        "Type": "Random",
        "Seed": "C"
      },
      "Scanner": {
        "Type": "ColumnLinear",
        "Skip": false,
        "MinY": 40,
        "MaxY": 180,
        "TopDownOrder": true,
        "ResultCap": 1,
        "RelativeToPosition": false,
        "BaseHeightName": "Base"
      }
    }
  }
}
```

**Key differences from the tree props:**

- **`ScaleX/Y/Z: 20`** = sparser grid (every 20 blocks vs 10 for trees)
- **`WeightedPrefabPaths`** with two entries does the randomization natively — 60% chance of cluster, 40% chance of spire. No need for FieldFunction delimiters when you just want random variety.

> **In TerraNova:** Use a `Prefab` node with multiple entries in `WeightedPrefabPaths` to get weighted random selection between crystal variants. Pair it with an `Occurrence` position provider for noise-filtered placement.

---

## Step 11 — Environment and Tint

The finishing touches — atmospheric effects and color:

```json
{
  "EnvironmentProvider": {
    "Type": "Constant",
    "Environment": "Env_Default"
  },
  "TintProvider": {
    "Type": "Constant",
    "Color": "#88ccaa"
  }
}
```

- **`EnvironmentProvider: Constant`** with `Environment: "Env_Default"` uses the standard sky/fog settings. Replace with a custom environment ID for different atmospherics.
- **`TintProvider: Constant`** tints vegetation with a single color. `#88ccaa` gives a cool teal-green for a magical sky-island feel.

For more advanced tinting, Hytale supports `DensityDelimited` which varies tint by noise:

```json
{
  "Type": "DensityDelimited",
  "Density": {
    "Type": "SimplexNoise2D",
    "Skip": false,
    "Scale": 100,
    "Persistence": 0.2,
    "Lacunarity": 5,
    "Octaves": 2,
    "Seed": "tints"
  },
  "Delimiters": [
    {
      "Tint": {
        "Type": "Constant",
        "Color": "#88ccff"
      },
      "Range": {
        "MinInclusive": -1.0,
        "MaxExclusive": 0.0
      }
    },
    {
      "Tint": {
        "Type": "Constant",
        "Color": "#44aa88"
      },
      "Range": {
        "MinInclusive": 0.0,
        "MaxExclusive": 1.0
      }
    }
  ]
}
```

This creates patches of sky-blue `#88ccff` and teal-green `#44aa88` vegetation scattered across the islands.

> **In TerraNova:** Click the color swatches in the Property Panel to open the color picker. For multi-color tinting, use a `DensityDelimited` tint provider with a `SimplexNoise2D` density and multiple `Delimiters` — each delimiter maps a noise range to a different tint color.

---

## Step 12 — The Complete Biome JSON

Here's the full `SkyIslandsBiome.json` with everything assembled in Hytale-native format:

```json
{
  "Name": "Sky_Islands",
  "Terrain": {
    "Type": "DAOTerrain",
    "Density": {
      "Type": "Cache",
      "Skip": false,
      "Capacity": 3,
      "Inputs": [
        {
          "Type": "Clamp",
          "Skip": false,
          "WallA": -1.0,
          "WallB": 1.0,
          "Inputs": [
            {
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
                      "Inputs": [
                        {
                          "Type": "FastGradientWarp",
                          "Skip": false,
                          "WarpScale": 80,
                          "WarpFactor": 20,
                          "WarpPersistence": 0.3,
                          "WarpLacunarity": 2.0,
                          "WarpOctaves": 2,
                          "Seed": "warp",
                          "Inputs": [
                            {
                              "Type": "CellNoise2D",
                              "Skip": false,
                              "ScaleX": 125,
                              "ScaleZ": 125,
                              "Jitter": 0.8,
                              "CellType": "Distance2Div",
                              "Octaves": 1,
                              "Seed": "islands"
                            }
                          ]
                        }
                      ]
                    },
                    {
                      "Type": "Constant",
                      "Skip": false,
                      "Value": 0.8
                    }
                  ]
                },
                {
                  "Type": "Clamp",
                  "Skip": false,
                  "WallA": 0.0,
                  "WallB": 1.0,
                  "Inputs": [
                    {
                      "Type": "AmplitudeConstant",
                      "Skip": false,
                      "Value": 0.067,
                      "Inputs": [
                        {
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
                                  "Inputs": [
                                    {
                                      "Type": "SimplexNoise2D",
                                      "Skip": false,
                                      "Scale": 333,
                                      "Persistence": 0.5,
                                      "Lacunarity": 2.0,
                                      "Octaves": 2,
                                      "Seed": "height_variation"
                                    }
                                  ]
                                },
                                {
                                  "Type": "Constant",
                                  "Skip": false,
                                  "Value": 110
                                }
                              ]
                            },
                            {
                              "Type": "Inverter",
                              "Skip": false,
                              "Inputs": [
                                {
                                  "Type": "YValue",
                                  "Skip": false
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  },
  "MaterialProvider": {
    "Type": "Solidity",
    "Solid": {
      "Type": "Queue",
      "Queue": [
        {
          "Type": "SpaceAndDepth",
          "LayerContext": "DEPTH_INTO_FLOOR",
          "MaxExpectedDepth": 16,
          "Layers": [
            {
              "Type": "ConstantThickness",
              "Thickness": 1,
              "Material": {
                "Type": "Constant",
                "Material": { "Solid": "Soil_Grass" }
              }
            },
            {
              "Type": "ConstantThickness",
              "Thickness": 4,
              "Material": {
                "Type": "Constant",
                "Material": { "Solid": "Soil_Dirt" }
              }
            }
          ]
        },
        {
          "Type": "Constant",
          "Material": { "Solid": "Rock_Stone" }
        }
      ]
    }
  },
  "Props": [
    {
      "Skip": false,
      "Runtime": 1,
      "Positions": {
        "Type": "Occurrence",
        "Skip": false,
        "Seed": "tree_spawn",
        "FieldFunction": {
          "Type": "SimplexNoise2D",
          "Skip": false,
          "Scale": 67,
          "Persistence": 0.5,
          "Lacunarity": 2.0,
          "Octaves": 2,
          "Seed": "tree_density"
        },
        "Positions": {
          "Type": "Mesh2D",
          "Skip": false,
          "PointsY": 0,
          "PointGenerator": {
            "Type": "Mesh",
            "Jitter": 0.4,
            "ScaleX": 10,
            "ScaleY": 10,
            "ScaleZ": 10,
            "Seed": "trees"
          }
        }
      },
      "Assignments": {
        "Type": "FieldFunction",
        "FieldFunction": {
          "Type": "SimplexNoise2D",
          "Skip": false,
          "Scale": 125,
          "Persistence": 0.5,
          "Lacunarity": 2.0,
          "Octaves": 1,
          "Seed": "tree_type"
        },
        "Delimiters": [
          {
            "Min": -1.0,
            "Max": 0.0,
            "Assignments": {
              "Type": "Constant",
              "Prop": {
                "Type": "Prefab",
                "Skip": false,
                "WeightedPrefabPaths": [
                  { "Path": "Trees/Oak_Large", "Weight": 100 }
                ],
                "LegacyPath": false,
                "LoadEntities": true,
                "Directionality": {
                  "Type": "Random",
                  "Seed": "A"
                },
                "Scanner": {
                  "Type": "ColumnLinear",
                  "Skip": false,
                  "MinY": 50,
                  "MaxY": 200,
                  "TopDownOrder": true,
                  "ResultCap": 1,
                  "RelativeToPosition": false,
                  "BaseHeightName": "Base"
                }
              }
            }
          },
          {
            "Min": 0.0,
            "Max": 1.0,
            "Assignments": {
              "Type": "Constant",
              "Prop": {
                "Type": "Prefab",
                "Skip": false,
                "WeightedPrefabPaths": [
                  { "Path": "Trees/Birch_Small", "Weight": 100 }
                ],
                "LegacyPath": false,
                "LoadEntities": true,
                "Directionality": {
                  "Type": "Random",
                  "Seed": "B"
                },
                "Scanner": {
                  "Type": "ColumnLinear",
                  "Skip": false,
                  "MinY": 50,
                  "MaxY": 200,
                  "TopDownOrder": true,
                  "ResultCap": 1,
                  "RelativeToPosition": false,
                  "BaseHeightName": "Base"
                }
              }
            }
          }
        ]
      }
    },
    {
      "Skip": false,
      "Runtime": 1,
      "Positions": {
        "Type": "Occurrence",
        "Skip": false,
        "Seed": "crystal_spawn",
        "FieldFunction": {
          "Type": "SimplexNoise2D",
          "Skip": false,
          "Scale": 200,
          "Persistence": 0.5,
          "Lacunarity": 2.0,
          "Octaves": 2,
          "Seed": "crystals"
        },
        "Positions": {
          "Type": "Mesh2D",
          "Skip": false,
          "PointsY": 0,
          "PointGenerator": {
            "Type": "Mesh",
            "Jitter": 0.5,
            "ScaleX": 20,
            "ScaleY": 20,
            "ScaleZ": 20,
            "Seed": "crystal_grid"
          }
        }
      },
      "Assignments": {
        "Type": "Constant",
        "Prop": {
          "Type": "Prefab",
          "Skip": false,
          "WeightedPrefabPaths": [
            { "Path": "Minerals/Crystal_Cluster", "Weight": 60 },
            { "Path": "Minerals/Crystal_Spire", "Weight": 40 }
          ],
          "LegacyPath": false,
          "LoadEntities": true,
          "Directionality": {
            "Type": "Random",
            "Seed": "C"
          },
          "Scanner": {
            "Type": "ColumnLinear",
            "Skip": false,
            "MinY": 40,
            "MaxY": 180,
            "TopDownOrder": true,
            "ResultCap": 1,
            "RelativeToPosition": false,
            "BaseHeightName": "Base"
          }
        }
      }
    }
  ],
  "EnvironmentProvider": {
    "Type": "Constant",
    "Environment": "Env_Default"
  },
  "TintProvider": {
    "Type": "Constant",
    "Color": "#88ccaa"
  }
}
```

---

## Step 13 — Experimenting Further

Now that you have a working Sky Islands biome, here are ideas to take it further:

### Make islands thicker or thinner
Change the `AmplitudeConstant` value `0.067` in the vertical shape. This is `1 / thickness`:
- `0.05` = 20 blocks thick
- `0.067` = 15 blocks thick (current)
- `0.1` = 10 blocks thick

### Add waterfalls
Add `FluidLevel` and `FluidMaterial` to the biome root:
```json
{
  "FluidLevel": 85,
  "FluidMaterial": "Water_Source"
}
```
This fills everything below Y=85 with water — creating pools on lower islands and waterfalls between them.

### More island size variety
Combine two `CellNoise2D` layers with different scales using `Max`:
```json
{
  "Type": "Max",
  "Skip": false,
  "Inputs": [
    {
      "Type": "CellNoise2D",
      "Skip": false,
      "ScaleX": 170,
      "ScaleZ": 170,
      "Jitter": 0.8,
      "CellType": "Distance2Div",
      "Octaves": 1,
      "Seed": "big_islands"
    },
    {
      "Type": "CellNoise2D",
      "Skip": false,
      "ScaleX": 60,
      "ScaleZ": 60,
      "Jitter": 0.8,
      "CellType": "Distance2Div",
      "Octaves": 1,
      "Seed": "small_islands"
    }
  ]
}
```

### Add caves inside the islands
Use `Min` to carve holes where 3D noise exceeds a threshold:
```json
{
  "Type": "Min",
  "Skip": false,
  "Inputs": [
    { "... your existing terrain density ..." },
    {
      "Type": "Inverter",
      "Skip": false,
      "Inputs": [
        {
          "Type": "Clamp",
          "Skip": false,
          "WallA": 0,
          "WallB": 1,
          "Inputs": [
            {
              "Type": "Sum",
              "Skip": false,
              "Inputs": [
                {
                  "Type": "SimplexNoise3D",
                  "Skip": false,
                  "ScaleXZ": 33,
                  "ScaleY": 33,
                  "Persistence": 0.5,
                  "Lacunarity": 2.0,
                  "Octaves": 2,
                  "Seed": "caves"
                },
                {
                  "Type": "Constant",
                  "Skip": false,
                  "Value": -0.4
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```
Where the 3D noise exceeds 0.4, the `Min` forces density negative (air), carving cave tunnels.

### Add a second biome
Create a new biome file (e.g., `StormIslandsBiome.json`) and split the noise range in `MainWorld.json`:
```json
"Biomes": [
  { "Biome": "Sky_Islands",   "Min": -1.0, "Max": 0.0 },
  { "Biome": "Storm_Islands", "Min": 0.0,  "Max": 1.0 }
]
```

### Useful nodes to explore next

| Node | What it does | Use case |
|------|-------------|----------|
| `Mix` | Interpolates between two inputs using a factor | Smooth transitions between terrain types |
| `CurveMapper` | Applies a manual curve (`[{ In: x, Out: y }]` points) to reshape values | Fine-tune island edge falloff profiles |
| `SimplexRidgeNoise2D` | Ridge noise (inverted simplex) | Mountain ridges on island surfaces |
| `Normalizer` | Remaps value from one range (`FromMin`/`FromMax`) to another (`ToMin`/`ToMax`) | Converting noise ranges for specific uses |
| `Exported` / `Imported` | Name a density for reuse elsewhere in the biome | Share terrain calculations between materials and props |
| `SimpleHorizontal` | Applies a material within a Y range | Height-based material bands (e.g., snow above Y=140) |

---

## Concepts Cheat Sheet

| Concept | Hytale Name | What it means |
|---------|-------------|--------------|
| **Density > 0** | | Solid block |
| **Density < 0** | | Air |
| **Density = 0** | | Surface boundary |
| **Noise spacing** | `Scale` / `ScaleX` / `ScaleZ` | Block distance between noise features. Larger = bigger features |
| **Octaves** | `Octaves` | Layers of detail. More octaves = more fine detail |
| **Octave zoom** | `Lacunarity` | How much each octave zooms in (usually 2.0) |
| **Octave fade** | `Persistence` | How much each octave fades (usually 0.5) |
| **Random key** | `Seed` | Randomization key. Same seed = same noise pattern |
| **Multiply** | `AmplitudeConstant` | `input * Value` — the native way to scale a density |
| **Cache result** | `Cache` + `Capacity` | Compute once, reuse — always wrap your root density in this |
| **Restrict range** | `Clamp` + `WallA/WallB` | Keep values within bounds — prevents visual artifacts |
| **Warp shape** | `FastGradientWarp` | Distort coordinates for organic shapes |
| **Flip sign** | `Inverter` | Turns positive into negative and vice versa |
| **Current height** | `YValue` | Returns the Y coordinate of the current block |

---

*Built with [TerraNova](https://github.com/HyperSystems-Development/TerraNova) by [HyperSystems-Development](https://github.com/HyperSystems-Development)*
