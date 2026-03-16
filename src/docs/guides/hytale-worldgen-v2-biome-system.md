# Guide: Hytale WorldGen V2 Biome System

**Difficulty:** Intermediate

This guide explains exactly how biomes are structured, how the world selects which biome applies at each location, and how to configure each of the four systems a biome controls.

---

## What Is a Biome?

A biome is a named asset that bundles four independent systems together. Each system controls a different aspect of the world at that location:

| System | Asset Type | What it controls |
|--------|-----------|-----------------|
| **Terrain** | `DensityAsset` | The shape of the land — hills, cliffs, caves |
| **Material** | `MaterialProviderAsset` | Which block fills each solid voxel |
| **Props** | `PropAsset` + `PositionProvider` | Objects on terrain — trees, boulders, structures |
| **Environment / Tint** | `EnvironmentProvider` + `TintProvider` | Fog, lighting, and block color tinting |

Each system is **independent** — you can share a material provider between two biomes with completely different terrain shapes, or give the same terrain density to biomes with different props.

```nodegraph
{
  "height": 220,
  "nodes": [
    { "id": "td",  "label": "Terrain Density",    "category": "terrain",   "sub": "DensityAsset",           "x": 0,   "y": 0   },
    { "id": "mp",  "label": "Material Provider",  "category": "material",  "sub": "MaterialProviderAsset",  "x": 0,   "y": 70  },
    { "id": "pp",  "label": "Props",              "category": "prop",      "sub": "PropAsset + Positions",  "x": 0,   "y": 140 },
    { "id": "ep",  "label": "Environment / Tint", "category": "scanner",   "sub": "EnvironmentProvider",    "x": 0,   "y": 210 },
    { "id": "bio", "label": "Biome",              "category": "biome",     "sub": "BiomeAsset",             "x": 300, "y": 105 }
  ],
  "edges": [
    { "from": "td",  "to": "bio", "label": "Terrain" },
    { "from": "mp",  "to": "bio", "label": "Material" },
    { "from": "pp",  "to": "bio", "label": "Props" },
    { "from": "ep",  "to": "bio", "label": "Environment" }
  ]
}
```

---

## How the World Selects a Biome

At every (x, z) coordinate, the world evaluates a **biome selector density** — a noise function that outputs a value from –1 to 1. Each biome is assigned a `Min`/`Max` range on that scale. Whichever range the noise value falls into determines the biome for that column.

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

- **`Density`** is any density node — `SimplexNoise2D` is typical. A low `Scale` (0.001) produces large, gradual biome regions.
- **`DefaultBiome`** is used if no range matches (e.g. exactly on a boundary edge case).
- Ranges should cover the full –1 to 1 span with no gaps.

```nodegraph
{
  "height": 220,
  "nodes": [
    { "id": "sn",  "label": "SimplexNoise2D", "category": "terrain",     "sub": "Scale 0.001",    "x": 0,   "y": 80  },
    { "id": "sel", "label": "Biome Selector", "category": "worldstruct", "sub": "range map",      "x": 220, "y": 80  },
    { "id": "pl",  "label": "Plains",         "category": "biome",       "sub": "–1.0 to –0.3",   "x": 440, "y": 0   },
    { "id": "fo",  "label": "Forest",         "category": "biome",       "sub": "–0.3 to 0.3",    "x": 440, "y": 80  },
    { "id": "mt",  "label": "Mountains",      "category": "biome",       "sub": "0.3 to 1.0",     "x": 440, "y": 160 }
  ],
  "edges": [
    { "from": "sn",  "to": "sel", "label": "noise value" },
    { "from": "sel", "to": "pl"  },
    { "from": "sel", "to": "fo"  },
    { "from": "sel", "to": "mt"  }
  ]
}
```

---

## Biome Transitions

The `DefaultTransitionDistance` field on `World.json` sets how wide the blending zone is between adjacent biomes (in blocks). Within this zone, terrain densities from both biomes are linearly blended.

```json
"DefaultTransitionDistance": 48
```

- Default is **32 blocks** if not specified.
- Larger values produce smoother, wider gradients. Smaller values produce sharper borders.
- Minimum is 1 block (hard cutoff).
- Only **terrain density** is blended — materials and props each use their own biome's full provider at every point. The visual transition comes from terrain shape blending.

---

## Terrain Density

Each biome has a `Terrain` density function that defines its vertical shape. This is the same kind of node graph you build in the editor — any density node type is valid.

**Plains** — gentle rolling surface:
```json
"Terrain": {
  "Type": "Sum",
  "Inputs": [
    { "Type": "BaseHeight", "Height": 64 },
    { "Type": "SimplexNoise2D", "Scale": 0.01, "Amplitude": 8 }
  ]
}
```

**Mountains** — tall terrain shaped by a curve:
```json
"Terrain": {
  "Type": "Sum",
  "Inputs": [
    { "Type": "BaseHeight", "Height": 80 },
    { "Type": "CurveFunction", "Input": { "Type": "SimplexNoise2D", "Scale": 0.005 } }
  ]
}
```

Two biomes can share a base structure but differ in parameters — e.g. same noise type, different `Height` and `Scale`.

---

## Material Provider

The `MaterialProvider` determines which block fills each solid voxel. The real schema types are:

| Type | What it does |
|------|-------------|
| `Constant` | Every solid voxel gets the same block |
| `SpaceAndDepth` | Layers by depth below surface — grass → dirt → stone |
| `HeightGradient` | Two materials blended by Y range (Low/High) |
| `WeightedRandom` | Randomly picks between materials by weight |
| `Blend` | Blends two material providers by a density factor |
| `Conditional` | Chooses between two providers based on a condition |
| `NoiseSelector` | Picks material based on a noise field |

**Example — layered surface with `SpaceAndDepth`:**
```json
"MaterialProvider": {
  "Type": "SpaceAndDepth",
  "LayerContext": "DEPTH_INTO_FLOOR",
  "Layers": [
    { "Type": "ConstantThickness", "Thickness": 1, "Material": { "Type": "Constant", "Material": "grass_block" } },
    { "Type": "ConstantThickness", "Thickness": 3, "Material": { "Type": "Constant", "Material": "dirt" } },
    { "Type": "ConstantThickness", "Thickness": 99, "Material": { "Type": "Constant", "Material": "stone" } }
  ]
}
```

Layer types inside `SpaceAndDepth`:

| Layer Type | Thickness control |
|-----------|------------------|
| `ConstantThickness` | Fixed number of blocks |
| `NoiseThickness` | Varies by a 2D noise field |
| `RangeThickness` | Random within a min/max range (seeded) |
| `WeightedThickness` | Picks from a list of possible thicknesses by weight |

---

## Props

Props are objects placed on terrain after generation is complete — trees, boulders, flowers, structures.

Each entry in a biome's `Props` array pairs a **position provider** (where to attempt placement) with a **prop** (what to place). The scanner validates each candidate position against actual terrain before placing.

```json
"Props": [
  {
    "Positions": { "Type": "Mesh2D", "Resolution": 8, "Jitter": 0.5 },
    "Scanner":   { "Type": "ColumnLinear", "StepSize": 1 },
    "Prop": {
      "Type": "Weighted",
      "Entries": [
        { "Weight": 3.0, "Prop": { "Type": "Prefab", "Path": "content/props/oak_tree.json" } },
        { "Weight": 1.0, "Prop": { "Type": "Prefab", "Path": "content/props/birch_tree.json" } }
      ]
    }
  }
]
```

**Position provider types** (where to try placing):

| Type | Behavior |
|------|-----------|
| `Mesh2D` | Regular grid of 2D points with optional jitter |
| `Mesh3D` | 3D grid — for cave props |
| `Occurrence` | Each candidate position has a random `Chance` of being kept |
| `FieldFunction` | Only keeps positions where a density field exceeds a threshold |
| `Union` | Combines multiple position providers |
| `Offset` | Shifts all positions by a fixed vector |

**Scanner types** (how placement height is found):

| Type | Behavior |
|------|-----------|
| `ColumnLinear` | Scans downward in linear steps to find the surface |
| `ColumnRandom` | Scans at random Y positions in a range |
| `Origin` | Places directly at the provided position |
| `Area` | Scans a 3D area with an optional child scanner |

**Prop types** (what gets placed):

| Type | Behavior |
|------|-----------|
| `Prefab` | Places a `.json` prefab asset |
| `Weighted` | Randomly picks from a list of props by weight |
| `Cluster` | Places a group of props together |
| `Column` | Stacks a block material vertically (stalactites, pillars) |
| `Box` | Places a solid box of a material |
| `Density` | Places based on a density field condition |
| `Conditional` | Chooses between two props based on a condition |
| `Surface` | Finds the surface and places there |
| `Cave` | Finds cave ceilings/floors |

---

## Environment and Tint

Two separate assets control the visual atmosphere of a biome.

**EnvironmentProvider** — fog, lighting, sky:

| Type | Behavior |
|------|-----------|
| `Default` | Uses the world default environment |
| `Constant` | Fixed environment settings (fog color, density, sun angle) |
| `Biome` | Inherits from the biome definition directly |
| `DensityDelimited` | Switches environment below/above a density threshold (e.g. underwater) |

**TintProvider** — color tinting on blocks and foliage:

| Type | Behavior |
|------|-----------|
| `Constant` | One color applied everywhere (`Color` field, hex string) |
| `Gradient` | Blends between `From` and `To` colors by height or density |
| `DensityDelimited` | Different tints above/below a density boundary |

```json
"TintProvider": {
  "Type": "Constant",
  "Color": "#6DAF3B"
}
```

---

## Framework System

The `Framework` array in `World.json` defines **named shared assets** that any biome can reference instead of each biome duplicating the same definition. Useful for position providers (tree grids, rock meshes) and decimal constants (sea level, snow line).

```json
"Framework": [
  {
    "Type": "Positions",
    "Entries": [
      { "Name": "TreeGrid", "Positions": { "Type": "Mesh2D", "Resolution": 8, "Jitter": 0.5 } }
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

A biome then references `"TreeGrid"` via a `Framework` position provider instead of redefining the mesh. If you change the grid resolution in the Framework, every biome using it updates automatically.

---

## Summary

1. A **biome selector noise** at low scale maps each (x,z) column to a biome by range.
2. Each biome owns four independent systems: **terrain density**, **material provider**, **props**, and **environment/tint**.
3. At biome borders, terrain densities are **blended** over `DefaultTransitionDistance` blocks.
4. Materials use `SpaceAndDepth` for layered surfaces — grass, dirt, stone stacked by depth.
5. Props pair a **position provider** with a **scanner** and a **prop type** — placement is validated against real terrain.
6. Use the **Framework** to share position providers and constants across biomes without duplication.

> **See also:** [Node Combinations](./node-combinations.md) for terrain density patterns · [Reference](../reference/README.md) for full type listings · [Glossary](../glossary/README.md) for term definitions
