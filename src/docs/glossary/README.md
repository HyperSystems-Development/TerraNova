# Glossary

This section defines key terms used in TerraNova and Hytale WorldGen V2.

## Core Concepts

| Term | Definition |
|------|-----------|
| **Density** | A scalar value (typically -1 to 1) evaluated at every (x,y,z) coordinate. Positive = solid block, zero/negative = air. The entire terrain shape is defined by combining density functions. |
| **Noisemap** | The output of a noise generator node. A continuous field of values between -1 and 1 across space. |
| **Node** | A single unit in the node graph. Each node takes zero or more inputs and outputs a value (density, material, position, etc.). |
| **Node Graph** | The directed graph of connected nodes that defines a biome's terrain, materials, and props. |
| **Biome** | A named configuration of terrain density, block materials, props, environment, and tint. Multiple biomes are blended across the world using a noise-based biome map. |
| **Generator** | A node that produces values without taking inputs -- e.g. noise nodes, constant nodes, axis nodes. |
| **Modifier** | A node that transforms the output of another node -- e.g. CurveMapper, Scale, Clamp. |
| **Combinator** | A node that merges multiple inputs -- e.g. Sum, Max, Mix. |
| **WorldGen V2** | The current Hytale world generation architecture (`builtin.hytalegenerator`). Asset-driven, density-based, and fully composable. Replaced the older Zone/Climate-based V1 system. |
| **TerraNova** | An editor for building and previewing Hytale WorldGen V2 worlds using a visual node graph. |

## Key Nodes

### Terrain Shape

| Node | Summary |
|------|---------|
| `BaseHeight` | Outputs 0 at a reference Y; positive above, negative below. The foundation of all terrain profiles. |
| `CurveMapper` | Remaps an input value through a custom curve. Used to shape how density changes with height -- creates hills, cliffs, and plateaus. Set Curve type to Manual to draw your own shape. |
| `SimplexNoise2D` | 2D coherent noise (varies with X and Z). Adds horizontal surface variation -- hills, valleys, uneven ground. |
| `SimplexNoise3D` | 3D coherent noise (varies with X, Y, and Z). Used for caves, overhangs, and floating terrain. |
| `CellNoise2D` | 2D Voronoi-style cell noise. Creates rocky, fractured, or organic patterns. |
| `CellNoise3D` | 3D Voronoi-style cell noise. |
| `YSampled` | Wraps any subgraph and samples it at coarse Y intervals, then interpolates. Gives ~4x speedup with minimal visual change. |
| `DistanceToBiomeEdge` | Outputs a value based on how far the current coordinate is from the nearest biome boundary. Useful for transition blending. |

### Math and Combinators

| Node | Summary |
|------|---------|
| `Sum` | Adds all inputs together. Most common way to layer terrain contributions. |
| `Max` | Keeps the highest (most solid) value. Good for combining terrain that should both be solid. |
| `Min` | Keeps the lowest (most empty) value. Used to carve -- e.g. subtract caves from solid terrain. |
| `Mix` | Blends two inputs by a weight (0-1). Useful for biome transitions and smooth feature blending. |
| `Normalizer` | Remaps a value range, e.g. [-2, 2] to [-1, 1]. Use after `Sum` to keep density in expected range. |
| `Inverter` | Multiplies by -1. Flips solid and empty -- used to turn noise into a cave mask. |
| `Scale` | Multiplies the coordinate space by a factor. Zooms noise in or out. |
| `Amplitude` | Legacy Y-dependent amplitude multiplier. Takes one density input and a `FunctionForY` curve (e.g. `YValue → CurveMapper`) to scale the input by a value that varies with height. Prefer `Multiplier` for two-input multiplication. |
| `AmplitudeConstant` | Legacy stub with no configurable fields. Use `Multiplier` + `Constant` to scale a density by a fixed constant. |
| `Clamp` | Limits output to a min/max range. Prevents runaway values. |
| `SmoothMin` | Like `Min` but with a smooth blend zone at the boundary. |
| `SmoothMax` | Like `Max` but with a smooth blend zone. |
| `Multiplier` | Multiplies all density inputs together. Use with `Constant` to scale amplitude: `Multiplier(noise, Constant { Value: 0.4 })`. |

### Axis Nodes

| Node | Summary |
|------|---------|
| `YValue` | Outputs the current Y (height) coordinate as a raw number. |
| `XValue` | Outputs the current X coordinate. |
| `ZValue` | Outputs the current Z coordinate. |

### Materials

Material providers determine which block fills each solid voxel. The main provider type is `SpaceAndDepth`, which assigns blocks based on both horizontal position and vertical depth using a list of layers.

| Node | Summary |
|------|---------|
| `SpaceAndDepth` | Assigns materials based on space and depth context with configurable layers. The primary material provider for biomes. |
| `DownwardDepth` | Assigns material based on depth measured downward from the surface. |
| `UpwardDepth` | Assigns material based on depth measured upward. |
| `DownwardSpace` | Assigns material based on space measured downward. |
| `UpwardSpace` | Assigns material based on space measured upward. |
| `Striped` | Applies a striped material pattern. |

### Curve Types (used inside CurveMapper and as inputs to Ellipsoid / Plane)

Curves are a separate asset type — they remap a number from one value to another. They are used inside `CurveMapper`, and as required port inputs on `Ellipsoid` and `Plane`. See [Curves Explained](../guides/world/curves-explained.md) for a full guide.

| Curve Type | Summary |
|------------|---------|
| `Manual` | A hand-drawn spline. You place control points to define the exact remapping shape. |
| `DistanceExponential` | Exponential falloff — solid core that fades quickly to air. Fields: `Range`, `ExponentA`. |
| `DistanceS` | S-shaped curve for smooth transitions with a controlled mid-zone. Fields: `Range`, `Transition`, `TransitionSmooth`, `ExponentA`, `ExponentB`. |
| `Clamp` / `SmoothClamp` | Hard / smooth limit on output range. Fields: `WallA` (upper), `WallB` (lower). |
| `Floor` / `SmoothFloor` | Enforce a minimum value only. |
| `Ceiling` / `SmoothCeiling` | Enforce a maximum value only. |
| `Inverter` | Output = `1 - input`. Flips a curve shape. |
| `Sum`, `Min`, `Max`, `Multiplier` | Combine two curves mathematically (curve-space equivalents of density combinators). |

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

- [Asset Node Editor Nodes](./asset-node-editor-nodes.md) -- detailed node reference for the editor
- [In-Game Commands](./in-game-commands.md) -- console commands for worldgen
- [Reference](../reference/README.md) -- full technical reference
- [Terrain Math Explained](../guides/terrain/terrain-math-explained.md) -- the math behind noise, combinators, and density parameters
- [Curves Explained](../guides/world/curves-explained.md) -- full guide to every curve type and when to use each
