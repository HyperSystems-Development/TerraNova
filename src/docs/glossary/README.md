# Glossary

This section defines key terms used in TerraNova and Hytale WorldGen V2.

## Core Concepts

| Term | Definition |
|------|-----------|
| **Density** | A scalar value (typically –1 to 1) evaluated at every (x,y,z) coordinate. Positive = solid block, zero/negative = air. The entire terrain shape is defined by combining density functions. |
| **Noisemap** | The output of a noise generator node. A continuous field of values between –1 and 1 across space. |
| **Node** | A single unit in the node graph. Each node takes zero or more inputs and outputs a value (density, material, position, etc.). |
| **Node Graph** | The directed graph of connected nodes that defines a biome's terrain, materials, and props. |
| **Biome** | A named configuration of terrain density, block materials, props, environment, and tint. Multiple biomes are blended across the world using a noise-based biome map. |
| **Generator** | A node that produces values without taking inputs — e.g. noise nodes, constant nodes, axis nodes. |
| **Modifier** | A node that transforms the output of another node — e.g. CurveMapper, Scale, Clamp. |
| **Combinator** | A node that merges multiple inputs — e.g. Sum, Max, Mix. |
| **WorldGen V2** | The current Hytale world generation architecture (`builtin.hytalegenerator`). Asset-driven, density-based, and fully composable. Replaced the older Zone/Climate-based V1 system. |
| **TerraNova** | An editor for building and previewing Hytale WorldGen V2 worlds using a visual node graph. |

## Key Nodes

| Node | Category | Summary |
|------|----------|---------|
| `BaseHeight` | Terrain | Outputs 0 at a reference Y; positive above, negative below |
| `CurveMapper` | Transform | Remaps input through a curve to shape terrain profiles |
| `SimplexNoise2D` | Noise | 2D coherent noise for horizontal terrain variation |
| `SimplexNoise3D` | Noise | 3D coherent noise for caves and overhangs |
| `Sum` | Combinator | Adds multiple density values together |
| `Max` | Combinator | Keeps the highest (most solid) density |
| `Min` | Combinator | Keeps the lowest (most empty) density |
| `YSampled` | Performance | Coarse Y-axis sampling with interpolation (4× speedup) |
| `Normalizer` | Math | Remaps a value range, e.g. [–1,1] → [0,1] |
| `Inverter` | Transform | Multiplies by –1, flipping solid and empty |
| `DistanceToBiomeEdge` | Terrain | Value based on distance from the nearest biome boundary |

## File Formats

| Format | Used For |
|--------|---------|
| `.world` | TerraNova world project file |
| `World.json` | WorldGen V2 world structure definition |
| `BiomeAsset.json` | Individual biome definition |
| `DensityAsset.json` | Reusable density function definition |
| `.blockymodel` | Hytale 3D model format (Blockbench) |
| `.blockyanim` | Hytale animation format |

## See Also

- [Asset Node Editor Nodes](./asset-node-editor-nodes.md) — detailed node reference for the editor
- [In-Game Commands](./in-game-commands.md) — console commands for worldgen
- [Reference](../reference/README.md) — full technical reference
