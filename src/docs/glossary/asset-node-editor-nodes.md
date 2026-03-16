# Glossary — Asset Node Editor Nodes

This glossary covers the node types available in the Asset Node Editor for TerraNova / Hytale WorldGen V2.

For a full tabular reference, see [Reference → Density Node Types](../reference/README.md).

## Density Nodes

Density nodes output a scalar value (–1 to 1 typically) evaluated at each (x,y,z) coordinate. Positive values produce solid blocks; zero or negative produce air.

### BaseHeight Density

Defines a reference height (Y level). Outputs `0` at that height.

- Values **above** the reference → positive (solid)
- Values **below** the reference → negative (air)

Common use: `BaseHeight` sets the ground "zero line", which other nodes then warp and shape.

### CurveFunction Density

Remaps an input density value using a curve defined by a `Manual Curve` node. Used to sculpt the vertical profile of terrain — creating cliffs, plateaus, or rolling hills.

**Typical setup:**
```
BaseHeight → CurveFunction → Sum
```

### SimplexNoise2D Density

A 2D coherent noise generator. Outputs between –1 and 1. Adds horizontal variation to terrain (hills, valleys).

### SimplexNoise3D Density

A 3D coherent noise generator. Outputs between –1 and 1. Enables caves, overhangs, and floating islands by varying density in all three dimensions.

### Sum Density

Adds multiple density inputs together. Because each input is in [–1, 1], the sum can exceed that range — the world generator treats **any positive value** as solid.

**Common pattern:**
```
CurveFunction (height profile)
  +
SimplexNoise2D (horizontal variation)
  ↓
Sum → terrain output
```

### Min Density & Max Density

- **Max Density** keeps the highest (most solid) value across inputs. Use to carve: `Max(terrain, cave)` keeps terrain where solid, cave where empty.
- **Min Density** keeps the lowest (most empty) value. Use to restrict: `Min(A, B)` is only solid where *both* A and B are solid.

### Constant Density

Outputs a fixed value regardless of position. Useful for setting baseline levels or overriding sections.

### Normalizer Density

Remaps a value range to another range.

**Example:** Convert [–1, 1] noise to [0, 1] for use as a blend weight.

### Inverter Density

Multiplies density by –1. Swaps solid and empty — useful for carving caves out of solid terrain.

### YSampled Density

A performance optimization wrapper. Instead of evaluating the wrapped density at every Y coordinate, it samples at coarse intervals (default: every 4 blocks) and linearly interpolates between samples.

**Result:** ~4× faster vertical column evaluation at the cost of slight smoothing in the Y direction.

### GradientWarp Density

Displaces the sampling position using another density function. Creates twisted, turbulent terrain.

### DistanceToBiomeEdge Density

Outputs a value proportional to the distance from the nearest biome boundary. Used to blend props or terrain features near biome edges.

### CellNoise2D / CellNoise3D

Voronoi-style noise. Each point in space is assigned a value based on its distance to the nearest cell center. Creates rocky, fractured, or organic-looking patterns.

---

## Material Nodes

Material nodes determine which block type fills each solid voxel. They only run where density is positive.

### ConstantMaterial

Fills every solid voxel with a single block type. Simplest material provider — good for prototyping or uniform-surface biomes.

### HeightGradientMaterial

Assigns different block types based on Y depth — e.g. grass on top, dirt in the middle, stone deeper. The most common material setup for natural-looking biomes.

### BlendMaterial

Blends between two material providers using a density value as a weight (0–1). Useful for gradual transitions between two surface types.

### WeightedRandomMaterial

Randomly selects between multiple materials using configurable weights. Adds natural variation — e.g. 70% grass, 20% dirt patches, 10% rock.

### ConditionalMaterial

Chooses between two materials based on a density condition (above/below threshold). Useful for sharp surface-type changes.

### SpaceAndDepthMaterial

Assigns materials based on both horizontal position and depth. For complex biomes that need horizontal variation in their material layering.

---

## Curve Nodes

### ManualCurve

A hand-drawn spline curve. Used as the `Curve` input for `CurveFunction`. You draw the exact shape in the editor — the x-axis is the input value, y-axis is the output.

### LinearRemapCurve

Remaps input linearly from one range to another (e.g. [–1,1] → [0,1]). Simpler and more predictable than `ManualCurve`.

### ConstantCurve

Always outputs a fixed value regardless of input. Useful as a flat baseline or when you need a constant density contribution.

### DistanceSCurve

An S-shaped curve providing smooth ease-in and ease-out transitions. Used for natural-feeling blends near biome boundaries.

---

## Tips

- **Start simple:** Begin with `BaseHeight + SimplexNoise2D → Sum` to get a basic landscape.
- **Combine in Sum:** Most terrain graphs are built by summing several density contributions.
- **Use Max to carve caves:** `Max(terrain, -cave_noise)` digs caves out of terrain without fully removing them from the solid region.
- **YSampled for performance:** Wrap expensive vertical density subgraphs in `YSampled` to get a major speed boost.
- **DistanceToBiomeEdge for blending:** Fade props in/out near biome edges for natural-looking transitions.
