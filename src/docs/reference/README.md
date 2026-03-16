# Reference

This section contains technical reference material for TerraNova / Hytale WorldGen V2.

## Density Node Types

The density system is the mathematical backbone of terrain generation. Every terrain shape, biome boundary, and underground cave is defined by composing density nodes.

### Constants
| Node | Purpose |
|------|---------|
| `ConstantDensity` | Outputs a fixed value regardless of position |
| `AmplitudeConstant` | Scales a density by a constant factor |
| `OffsetConstant` | Adds a fixed offset to a density value |

### Noise
| Node | Purpose |
|------|---------|
| `SimplexNoise2D` | 2D coherent noise; outputs –1 to 1; used for heightmaps |
| `SimplexNoise3D` | 3D coherent noise; used for caves, overhangs |
| `CellNoise2D` | 2D Voronoi-style cell noise |
| `CellNoise3D` | 3D Voronoi-style cell noise |
| `GradientWarp` | Warps the input position using another density, creating twisted terrain |
| `FastGradientWarp` | Cheaper version of GradientWarp |

### Math
| Node | Purpose |
|------|---------|
| `Abs` | Absolute value |
| `Ceiling` | Round up to nearest integer |
| `Floor` | Round down to nearest integer |
| `Pow` | Raise to a power |
| `Sqrt` | Square root |
| `Clamp` | Clamp output to [min, max] |
| `SmoothClamp` | Clamp with smooth transition at edges |
| `Normalizer` | Remap an input range to an output range (e.g. [–1,1] → [0,1]) |

### Combinators
| Node | Purpose |
|------|---------|
| `Sum` | Add multiple density inputs together |
| `Multiplier` | Multiply multiple density inputs |
| `Min` | Keep the lowest (most empty) value at each point |
| `Max` | Keep the highest (most solid) value at each point |
| `SmoothMin` | Like Min but with a smooth blend zone |
| `SmoothMax` | Like Max but with a smooth blend zone |
| `Mix` | Linearly interpolate between two densities using a weight |
| `MultiMix` | Interpolate among several densities |

### Transforms
| Node | Purpose |
|------|---------|
| `Scale` | Scale the coordinate space (zooms in/out on noise) |
| `Offset` | Translate the coordinate space |
| `Amplitude` | Multiply output value |
| `Rotator` | Rotate the coordinate space |
| `Inverter` | Multiply by –1 (flips solid/empty) |
| `VectorWarp` | Warp position by a full 3D vector field |

### Shapes
| Node | Purpose |
|------|---------|
| `Cube` | Signed-distance field for a cube |
| `Cuboid` | Signed-distance field for a rectangular box |
| `Cylinder` | Signed-distance field for a cylinder |
| `Ellipsoid` | Signed-distance field for an ellipsoid |
| `Plane` | Signed-distance field for an infinite plane |
| `Shell` | Hollow shell around a shape |

### Sampling & Caching
| Node | Purpose |
|------|---------|
| `YSampled` | Samples at coarse Y intervals and interpolates — 4× performance boost for vertical columns |
| `Cache` | Caches the result for a coordinate so it isn't recomputed |
| `Exported` | Exposes this density so other assets can import it |
| `Imported` | References a density exported by another asset |

### Selection & Branching
| Node | Purpose |
|------|---------|
| `Selector` | Blend between two densities based on a condition density |
| `Switch` | Choose between multiple densities based on an integer selector |
| `SwitchState` | Read the `switchState` field of the context |
| `Slider` | Smooth selection using a mask density |

### Terrain Utilities
| Node | Purpose |
|------|---------|
| `BaseHeight` | Outputs 0 at a configured Y level; positive above, negative below |
| `CurveFunction` | Remaps input through a curve — used to shape terrain profiles |
| `Terrain` | Back-reference to the biome's own terrain density |
| `DistanceToBiomeEdge` | Value based on proximity to the nearest biome boundary |
| `CellWallDistance` | Distance to the nearest Voronoi cell boundary |

### Axis
| Node | Purpose |
|------|---------|
| `XValue` | Outputs the X coordinate |
| `YValue` | Outputs the Y coordinate |
| `ZValue` | Outputs the Z coordinate |
| `XOverride` | Forces the X coordinate to a constant |
| `YOverride` | Forces the Y coordinate to a constant |
| `ZOverride` | Forces the Z coordinate to a constant |

---

## WorldGen V2 JSON Asset Schema

### BiomeAsset (World.json → Biomes[])
| JSON Key | Type | Description |
|----------|------|-------------|
| `"Name"` | string | Biome identifier |
| `"Terrain"` | TerrainAsset | Density function defining solid/empty at each point |
| `"MaterialProvider"` | MaterialProviderAsset | Determines block material at each position |
| `"Props"` | PropRuntimeAsset[] | Defines what props (trees, rocks) to place and where |
| `"EnvironmentProvider"` | EnvironmentProviderAsset | Lighting, fog, atmosphere |
| `"TintProvider"` | TintProviderAsset | Color tinting on blocks and vegetation |
| `"FloatingFunctionNodes"` | DensityAsset[] | Shared density nodes scoped to this biome |

### BasicWorldStructureAsset (World.json)
| JSON Key | Type | Default | Description |
|----------|------|---------|-------------|
| `"Biomes"` | BiomeRangeAsset[] | `[]` | List of biomes with noise ranges |
| `"Density"` | DensityAsset | ConstantDensity | Noise used to choose biomes |
| `"DefaultBiome"` | string | `""` | Fallback biome name |
| `"DefaultTransitionDistance"` | int | `32` | Width of biome blend zone in blocks |
| `"MaxBiomeEdgeDistance"` | int | `0` | Max distance tracked from biome edge |
| `"Framework"` | FrameworkAsset[] | `[]` | Named shared assets (positions, constants) |
| `"SpawnPositions"` | PositionProviderAsset | ListPositionProvider | Player spawn logic |

### BiomeRangeAsset
| JSON Key | Type | Description |
|----------|------|-------------|
| `"Biome"` | string | Reference to a BiomeAsset by name |
| `"Min"` | double | Minimum noise value for this biome (default –1.0) |
| `"Max"` | double | Maximum noise value for this biome (default 1.0) |

---

## Position Provider Types

Position providers define *where* props, structures, and spawn points are placed.

| Type | Purpose |
|------|---------|
| `Anchor` | Positions relative to an anchor point |
| `BaseHeight` | Positions at terrain surface height |
| `Bound` | Constrains positions to a 3D bounding box |
| `Cached` | Caches positions for reuse across frames |
| `FieldFunction` | Positions from a density field |
| `Framework` | Named reference to a shared PositionsFrameworkAsset entry |
| `List` | Fixed explicit list of positions |
| `Mesh2D` | 2D grid/mesh-based positions |
| `Mesh3D` | 3D grid/mesh-based positions |
| `Offset` | Applies a fixed offset to child positions |
| `SimpleHorizontal` | Filters positions to a Y range |
| `Union` | Combines multiple providers |

---

## Prop Types

Props are objects placed on generated terrain (trees, boulders, structures).

| Type | Purpose |
|------|---------|
| `Box` | Places blocks in a box region |
| `Cluster` | Groups multiple prop placements |
| `Column` | Vertical column of blocks |
| `Density` | Density-driven placement |
| `Offset` | Shifts child prop by a vector |
| `Prefab` | Pastes a saved structure from the prefab library |
| `Queue` | Sequential prop execution |
| `Union` | Combines multiple props |
| `Weighted` | Randomly selects from weighted prop options |

---

## In-Game Commands

| Command | Description |
|---------|-------------|
| `/world settings worldgentype set HytaleGenerator` | Switch to WorldGen V2 |
| `/world settings worldgentype set Default` | Switch to V1 default |
| `/world settings worldgentype set Flat` | Switch to V1 flat world |
| `/world settings worldgentype set Void` | Switch to V1 void world |
| `/worldgen reload --clear` | Reload all chunks |
| `/viewport --radius <n>` | Create a live-reload viewport around you |

> See [In-Game Commands](../glossary/in-game-commands.md) for more detail.
