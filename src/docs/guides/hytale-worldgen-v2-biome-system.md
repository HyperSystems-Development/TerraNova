# Guide: Hytale WorldGen V2 Biome System

**Difficulty:** Intermediate

This guide explains how biomes are defined and how the world chooses which biome appears at each location.

## What is a Biome?

In WorldGen V2, a biome is a named configuration of four independent systems:

| System | What it controls |
|--------|----------------|
| **Terrain Density** | The shape of the terrain — hills, cliffs, caves |
| **Material Provider** | Which blocks fill each solid voxel (grass, stone, sand…) |
| **Props** | Objects placed on terrain — trees, boulders, flowers, structures |
| **Environment / Tint** | Lighting, fog, and color tinting of blocks and vegetation |

Each system is independent. You can swap a material provider between two biomes without changing their terrain shape.

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "td",  "label": "Terrain Density",   "category": "density",  "sub": "shape of land",   "x": 0,   "y": 20 },
    { "id": "mp",  "label": "Material Provider", "category": "material", "sub": "block types",     "x": 0,   "y": 90 },
    { "id": "pp",  "label": "Props",             "category": "prop",     "sub": "trees, rocks…",  "x": 0,   "y": 160 },
    { "id": "ep",  "label": "Environment/Tint",  "category": "scanner",  "sub": "fog, lighting",   "x": 220, "y": 90 },
    { "id": "bio", "label": "Biome",             "category": "biome",                              "x": 400, "y": 90 }
  ],
  "edges": [
    { "from": "td",  "to": "bio" },
    { "from": "mp",  "to": "bio" },
    { "from": "pp",  "to": "bio" },
    { "from": "ep",  "to": "bio" }
  ]
}
```

## How the World Chooses a Biome

At each (x, z) coordinate, the world evaluates a **biome selector density** — a noise function that outputs a value between –1 and 1. Each biome is assigned a range:

```json
{
  "Biomes": [
    { "Biome": "Plains",    "Min": -1.0, "Max": -0.3 },
    { "Biome": "Forest",    "Min": -0.3, "Max":  0.3 },
    { "Biome": "Mountains", "Min":  0.3, "Max":  1.0 }
  ],
  "Density": { "Type": "SimplexNoise2D", "Scale": 0.001 },
  "DefaultBiome": "Plains"
}
```

If the noise value at (x, z) falls in [–1.0, –0.3], the coordinate is in **Plains**. In [–0.3, 0.3], it's **Forest**. And so on.

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "sn",  "label": "SimplexNoise2D", "category": "density",     "sub": "scale 0.001",   "x": 0,   "y": 70 },
    { "id": "rng", "label": "Range Map",      "category": "worldstruct", "sub": "–1→1 to biome", "x": 200, "y": 70 },
    { "id": "pl",  "label": "Plains",         "category": "biome",       "sub": "–1.0 to –0.3",  "x": 420, "y": 0  },
    { "id": "fo",  "label": "Forest",         "category": "biome",       "sub": "–0.3 to 0.3",   "x": 420, "y": 70 },
    { "id": "mt",  "label": "Mountains",      "category": "biome",       "sub": "0.3 to 1.0",    "x": 420, "y": 140 }
  ],
  "edges": [
    { "from": "sn",  "to": "rng", "label": "noise value" },
    { "from": "rng", "to": "pl"  },
    { "from": "rng", "to": "fo"  },
    { "from": "rng", "to": "mt"  }
  ]
}
```

## Biome Transitions

The `DefaultTransitionDistance` field controls how wide the blending zone is between neighbouring biomes (default: 32 blocks). Within this zone, terrain densities from both biomes are blended, creating a smooth transition instead of an abrupt wall.

```json
"DefaultTransitionDistance": 48
```

Larger values = smoother, wider transitions. Minimum is 1 block.

## Terrain Density Inside a Biome

Each biome has its own `Terrain` density function that defines its shape. Two biomes can share a base structure but differ in their details:

**Example — Plains:**
```json
"Terrain": {
  "Type": "Sum",
  "Inputs": [
    { "Type": "BaseHeight", "Height": 64 },
    { "Type": "SimplexNoise2D", "Scale": 0.01, "Amplitude": 8 }
  ]
}
```

**Example — Mountains:**
```json
"Terrain": {
  "Type": "Sum",
  "Inputs": [
    { "Type": "BaseHeight", "Height": 80 },
    { "Type": "CurveFunction", "Input": { "Type": "SimplexNoise2D", "Scale": 0.005 } }
  ]
}
```

## Framework System

The `Framework` array in `World.json` lets you define **shared, named assets** (position providers, decimal constants) that multiple biomes can reference by name. This avoids duplicating configuration:

```json
"Framework": [
  {
    "Type": "Positions",
    "Entries": [
      { "Name": "TreePositions", "Positions": { "Type": "Mesh2D", ... } }
    ]
  },
  {
    "Type": "DecimalConstants",
    "Entries": [
      { "Name": "SeaLevel", "Value": 64.0 }
    ]
  }
]
```

Biomes then reference `"TreePositions"` via a `Framework` position provider, rather than each biome duplicating the mesh definition.

## Props

Props are objects placed on terrain — trees, rocks, shrubs, structures.

Each biome's `Props` array defines **what** to place (a `Prop`) and **where** to place it (a `PositionProvider`). The two-phase scan-then-place system ensures props only appear where terrain is valid:

```json
"Props": [
  {
    "Runtime": 0,
    "Positions": { "Type": "Mesh2D", "Density": 0.05 },
    "Prop": {
      "Type": "Weighted",
      "Entries": [
        { "Weight": 3.0, "Prop": { "Type": "Prefab", "Name": "oak_tree" } },
        { "Weight": 1.0, "Prop": { "Type": "Prefab", "Name": "birch_tree" } }
      ]
    }
  }
]
```

See [Reference](../reference/README.md) for the full list of prop and position provider types.

## Summary

1. A **biome selector noise** maps each (x,z) to a biome.
2. Each biome has its own **terrain density**, **materials**, **props**, and **environment**.
3. At biome boundaries, terrain is **blended** over a configurable distance.
4. Use the **Framework** system to share position providers and constants across biomes.
5. Use **Props** to decorate terrain with trees, boulders, and structures.
