# Reference

This section contains technical reference material for TerraNova / Hytale WorldGen V2.

If you are still learning, start with these focused pages before diving into the full listings below:

- [Node Effects](./node-effects.md) — what each node family is for
- [Curves Reference](./curves.md) — curve types and shape previews
- [Reading the Graph](./reading-the-graph.md) — how to read the editor visually
- [Terrain Snippets](./terrain-types.md) — paste-ready terrain examples

Use the rest of this page when you need exact terms, schemas, or category listings.

## Density Node Types

The density system is the mathematical backbone of terrain generation. Every terrain shape, biome boundary, and underground cave is defined by composing density nodes.

### Constants
| Node | Purpose |
|------|---------|
| `Constant` | Outputs a fixed value regardless of position |
| `AmplitudeConstant` | Legacy stub — no configurable fields. Use `Multiplier` + `Constant` instead |
| `OffsetConstant` | Legacy stub — no configurable fields. Use `Sum` + `Constant` instead |

### Noise
| Node | Purpose |
|------|---------|
| `SimplexNoise2D` | 2D coherent noise; outputs -1 to 1; used for heightmaps |
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
| `Normalizer` | Remap an input range to an output range (e.g. [-1,1] to [0,1]) |

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
| `Amplitude` | Legacy Y-dependent multiplier — scales one density input by a `FunctionForY` curve |
| `AmplitudeConstant` | Legacy stub — no configurable fields. Use `Multiplier` + `Constant` instead |
| `Rotator` | Rotate the coordinate space |
| `Inverter` | Multiply by -1 (flips solid/empty) |
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

### Sampling and Caching
| Node | Purpose |
|------|---------|
| `YSampled` | Samples at coarse Y intervals and interpolates -- 4x performance boost for vertical columns |
| `Cache` | Caches the result for a coordinate so it isn't recomputed |
| `Exported` | Exposes this density so other assets can import it |
| `Imported` | References a density exported by another asset |

### Selection and Branching
| Node | Purpose |
|------|---------|
| `Switch` | Choose between multiple densities based on switch cases |
| `SwitchState` | Provides a string state value for use with Switch nodes |
| `Slider` | Smooth selection using a mask density |

### Terrain Utilities
| Node | Purpose |
|------|---------|
| `BaseHeight` | Outputs 0 at a configured Y level; positive above, negative below |
| `CurveMapper` | Remaps input through a curve -- used to shape terrain profiles. Curve types: Manual, DistanceS, DistanceExponential |
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

## Material Provider Types

Material providers determine which block fills each solid voxel.

| Type | Purpose |
|------|---------|
| `Constant` | Returns the same material everywhere; used as the final fallback in provider chains |
| `Solidity` | Branches between two sub-providers based on whether the voxel is solid or fluid |
| `SpaceAndDepth` | Assigns materials based on space and depth context; the primary provider. Configured with a Layers list and LayerContext. |
| `DownwardDepth` | Assigns material to blocks within N blocks below the nearest air gap (surface layers like grass/dirt) |
| `UpwardDepth` | Assigns material to blocks within N blocks above the nearest air gap below (cave floor layers) |
| `DownwardSpace` | Assigns material based on open air space measured downward (cave ceiling detection) |
| `UpwardSpace` | Assigns material based on open air space measured upward |
| `Striped` | Applies a repeating striped pattern |
| `TerrainDensity` | Assigns material based on the terrain density value |

All provider types support a `Skip: true` field to disable the provider during development without removing it from the config.

### Material Context Fields

At runtime, providers receive a `Context` object with the following fields available for driving decisions:

| Field | Description |
|-------|-------------|
| `x, y, z` | Block position in world coordinates |
| `density` | Terrain density at this position (higher = deeper/more solid) |
| `downwardDepth` | Solid blocks below the nearest air gap above — `0` is the surface block |
| `upwardDepth` | Solid blocks above the nearest air gap below — used for cave floors |
| `downwardSpace` | Air blocks below this position |
| `upwardSpace` | Air blocks above this position |

### Layer Types (used inside SpaceAndDepth)

| Type | Purpose |
|------|---------|
| `ConstantThickness` | A layer of fixed thickness |
| `NoiseThickness` | A layer whose thickness varies with noise |
| `RangeThickness` | A layer within a fixed value range |
| `WeightedThickness` | A layer whose thickness is drawn from weighted random values |

### Block Rotation

Materials support a `Rotation` field with `Yaw`, `Pitch`, and `Roll` each accepting `"None"`, `"Ninety"`, `"OneEighty"`, or `"TwoSeventy"`. If a rotation node is connected in the editor, it overrides any manual rotation setting on the material.

---

## WorldGen V2 JSON Asset Schema

### BiomeAsset (World.json -> Biomes[])
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
| `"Density"` | DensityAsset | Constant | Noise used to choose biomes |
| `"DefaultBiome"` | string | `""` | Fallback biome name |
| `"DefaultTransitionDistance"` | int | `32` | Width of biome blend zone in blocks |
| `"MaxBiomeEdgeDistance"` | int | `0` | Max distance tracked from biome edge |
| `"Framework"` | FrameworkAsset[] | `[]` | Named shared assets (positions, constants) |
| `"SpawnPositions"` | PositionProviderAsset | List | Player spawn logic |

### BiomeRangeAsset
| JSON Key | Type | Description |
|----------|------|-------------|
| `"Biome"` | string | Reference to a BiomeAsset by name |
| `"Min"` | double | Minimum noise value for this biome (default -1.0) |
| `"Max"` | double | Maximum noise value for this biome (default 1.0) |

---

## Position Provider Types

Position providers define *where* props, structures, and spawn points are placed.

| Type | Purpose |
|------|---------|
| `Anchor` | Positions relative to an anchor point |
| `BaseHeight` | Positions at terrain surface height |
| `Bound` | Constrains positions to a 3D bounding box |
| `FieldFunction` | Positions from a density field |
| `Framework` | Named reference to a shared PositionsFrameworkAsset entry |
| `Mesh2D` | 2D grid/mesh-based positions |
| `Mesh3D` | 3D grid/mesh-based positions |
| `Offset` | Applies a fixed offset to child positions |
| `SimpleHorizontal` | Filters positions to a Y range |
| `Union` | Combines multiple providers |

---

## Prop Types

Props are objects placed on generated terrain (trees, boulders, structures). All prop types support `Skip: true` to disable during testing without removing from the config.

### Core Types

| Type | Purpose |
|------|---------|
| `Prefab` | Pastes a saved structure from the prefab library |
| `Queue` | Evaluates sub-props in order, using the first that succeeds |
| `Union` | Evaluates all sub-props, combining results |
| `Weighted` | Randomly selects from weighted prop options |
| `Offset` | Translates a sub-prop by a fixed offset |
| `PondFiller` | Fills enclosed terrain depressions with fluid blocks (lakes, ponds) |

### Compositional Types (current)

The modern approach separates *what* to place from *how* to search and *how* to orient. Wrap a pure shape with modifier nodes:

| Type | Purpose |
|------|---------|
| `Cuboid` | Fills a rectangular volume with a material provider (replaces `Box`) |
| `Manual` | Places blocks at explicit positions |
| `Locator` | Wraps any prop with scanner + pattern + cap logic |
| `Mask` | Wraps a prop with a block-mask filter (restricts which blocks can be replaced) |
| `StaticRotator` | Applies a fixed rotation to a prop |
| `RandomRotator` | Applies random rotation — automatically enables 4-way horizontal variety |
| `Orienter` | Pattern-validated rotation selection for direction-aware placement (cliff faces, walls) |
| `DensitySelector` | Selects a prop based on density range at the placement position |

### Legacy Types (still functional)

| Type | Purpose |
|------|---------|
| `Box` | Places blocks in a box region (superseded by `Cuboid` + `Locator`) |
| `Cluster` | Groups multiple prop placements |
| `Column` | Vertical column of blocks |
| `Density` | Density-driven placement |

---

## Scanner Types

Scanners control how position providers scan the terrain to find placement locations.

| Type | Purpose |
|------|---------|
| `ColumnLinear` | Scans columns linearly across a region |
| `ColumnRandom` | Scans columns at random positions |
| `Origin` | Uses a single origin point |
| `Area` | Scans across an area |

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
