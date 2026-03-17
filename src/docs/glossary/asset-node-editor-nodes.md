# Glossary -- Asset Node Editor Nodes

This glossary covers the node types available in the Asset Node Editor for TerraNova / Hytale WorldGen V2.

For a full tabular reference, see [Reference -- Density Node Types](../reference/README.md).

## Density Nodes

Density nodes output a scalar value (-1 to 1 typically) evaluated at each (x,y,z) coordinate. Positive values produce solid blocks; zero or negative produce air.

### BaseHeight

Defines a reference height (Y level). Outputs `0` at that height.

- Values **above** the reference -- positive (solid)
- Values **below** the reference -- negative (air)

Common use: `BaseHeight` sets the ground "zero line", which other nodes then warp and shape.

### CurveMapper

Remaps an input density value using a curve. Set the Curve type in the properties panel:

- **Manual** -- draw your own spline. The x-axis is the input value; the y-axis is the output.
- **DistanceS** -- a built-in S-shaped curve for smooth transitions.
- **DistanceExponential** -- exponential falloff for distance-based fades.

Used to sculpt the vertical profile of terrain -- creating cliffs, plateaus, or rolling hills.

**Typical setup:**
```
BaseHeight -> CurveMapper -> Sum
```

### SimplexNoise2D

A 2D coherent noise generator. Outputs between -1 and 1. Adds horizontal variation to terrain (hills, valleys).

Key fields: `Frequency` (scale of features), `Amplitude` (height of features), `Octaves` (layers of detail).

### SimplexNoise3D

A 3D coherent noise generator. Outputs between -1 and 1. Enables caves, overhangs, and floating islands by varying density in all three dimensions.

### CellNoise2D / CellNoise3D

Voronoi-style noise. Each point in space is assigned a value based on its distance to the nearest cell center. Creates rocky, fractured, or organic-looking patterns.

### Sum

Adds multiple density inputs together. Because each input is in [-1, 1], the sum can exceed that range -- the world generator treats **any positive value** as solid.

**Common pattern:**
```
CurveMapper (height profile)
  +
SimplexNoise2D (horizontal variation)
  |
Sum -> Terrain Out
```

### Min and Max

- **Max** keeps the highest (most solid) value across inputs. Use to combine terrain regions that should both be present.
- **Min** keeps the lowest (most empty) value. Used to carve -- `Min(terrain, cave_mask)` keeps only blocks solid in both.

### Constant

Outputs a fixed value regardless of position. Useful for setting baseline levels or overriding sections.

### Normalizer

Remaps a value range to another range.

**Example:** Convert [-1, 1] noise to [0, 1] for use as a Mix weight.

### Inverter

Multiplies density by -1. Swaps solid and empty -- used to carve caves out of solid terrain by flipping the cave noise.

### YSampled

A performance optimization wrapper. Instead of evaluating the wrapped density at every Y coordinate, it samples at coarse intervals (default: every 4 blocks) and linearly interpolates between samples.

**Result:** ~4x faster vertical column evaluation at the cost of slight smoothing in the Y direction.

### GradientWarp

Displaces the sampling position using another density function. Creates twisted, turbulent terrain. `FastGradientWarp` is a cheaper version.

### DistanceToBiomeEdge

Outputs a value proportional to the distance from the nearest biome boundary. Used to blend props or terrain features near biome edges.

---

## Material Nodes

Material nodes determine which block type fills each solid voxel. They only run where density is positive.

### SpaceAndDepth

The primary material provider. Assigns materials based on both horizontal space and vertical depth context. Configured with a list of layers (e.g. `ConstantThickness`, `NoiseThickness`, `RangeThickness`) each specifying a block type and thickness.

**LayerContext** controls which direction depth is measured from (`DownwardDepth`, `UpwardDepth`, etc.).

### DownwardDepth / UpwardDepth

Standalone material providers that assign a block based on depth measured downward or upward from the terrain surface.

### DownwardSpace / UpwardSpace

Assign material based on the amount of open space measured downward or upward from a block.

### Striped

Applies a repeating striped material pattern.

### Layer Types (used inside SpaceAndDepth)

| Layer Type | Summary |
|------------|---------|
| `ConstantThickness` | A layer of fixed thickness in blocks. |
| `NoiseThickness` | A layer whose thickness varies with noise. |
| `RangeThickness` | A layer within a fixed Y range. |
| `WeightedThickness` | A layer whose thickness is drawn from weighted random values. |

---

## Curve Types (inside CurveMapper)

These are not separate nodes. They are options in the CurveMapper properties panel.

### Manual

A hand-drawn spline. Place control points on the curve editor -- the x-axis is input value, y-axis is output value. Most flexible option for terrain profiles.

### DistanceS

An S-shaped curve providing smooth ease-in and ease-out transitions. Used for natural-feeling blends near biome boundaries.

### DistanceExponential

Exponential falloff. Useful when you want a value that drops off quickly near a boundary.

---

## Tips

- **Start simple:** Begin with `BaseHeight + SimplexNoise2D -> Sum` to get a basic landscape.
- **Combine in Sum:** Most terrain graphs are built by summing several density contributions.
- **Use Min to carve caves:** `Min(terrain, Inverter(cave_noise))` digs caves out of terrain.
- **YSampled for performance:** Wrap expensive vertical density subgraphs in `YSampled` for a major speed boost.
- **DistanceToBiomeEdge for blending:** Fade props in/out near biome edges for natural-looking transitions.
