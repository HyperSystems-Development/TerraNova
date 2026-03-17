# Templates

Starter templates let you begin a new world with a pre-built node graph instead of a blank canvas. Each template is a folder containing a `World.json`, one or more `BiomeAsset.json` files, and any referenced density assets.

## How Templates Work

When you select a template via **File -> New World**, TerraNova copies the template folder into your project and opens it in the editor. You can then modify, extend, or completely replace any part of it.

Templates are regular world projects -- there's nothing special about their format. Any world you build can be saved as a template and shared.

## Starter Island

A single flat biome with mild hills, grass/stone layered materials, and scattered tree props. Good starting point for beginners.

**Key nodes used:** `BaseHeight`, `SimplexNoise2D`, `Sum`, `SpaceAndDepth`, `Mesh2D` prop positions

```json
{
  "Biomes": [
    { "Biome": "Island", "Min": -1.0, "Max": 1.0 }
  ],
  "Density": { "Type": "SimplexNoise2D", "Frequency": 0.001 },
  "DefaultBiome": "Island"
}
```

## Mountain Range

Three biomes (Plains, Forest, Mountains) selected by a simplex noise map. Each biome has a distinct terrain density curve and material stack. Mountains use a `CurveMapper` to create steep cliffs.

**Key nodes used:** `BaseHeight`, `CurveMapper`, `SimplexNoise2D`, `SimplexNoise3D`, `Sum`, `Min`, `Inverter`, `YSampled`

```json
{
  "Biomes": [
    { "Biome": "Plains",    "Min": -1.0, "Max": -0.3 },
    { "Biome": "Forest",    "Min": -0.3, "Max":  0.3 },
    { "Biome": "Mountains", "Min":  0.3, "Max":  1.0 }
  ],
  "Density": { "Type": "SimplexNoise2D", "Frequency": 0.0008 },
  "DefaultBiome": "Plains",
  "DefaultTransitionDistance": 48
}
```

## Creating Your Own Template

1. Build and save a world you are happy with.
2. Copy the world project folder into the `templates/` directory of your TerraNova installation.
3. It will appear in the **New World** dialog on next launch.

> See the [Biome System guide](../guides/hytale-worldgen-v2-biome-system.md) and [Node Combinations](../guides/node-combinations.md) for the patterns these templates use.

---

## Doc Templates

Use the files below as starting points when contributing new guides or walkthroughs. They provide the correct structure, frontmatter conventions, and nodegraph block format.

- [Guide Template](./guide-template.md) -- for concept guides and deep-dives
- [Walkthrough Template](./walkthrough-template.md) -- for step-by-step tutorials with interactive node graphs
