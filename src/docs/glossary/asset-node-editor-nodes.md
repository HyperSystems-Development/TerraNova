# Glossary -- Asset Node Editor Nodes

This glossary covers the node types available in the Asset Node Editor for TerraNova / Hytale WorldGen V2.

For a full tabular reference, see [Reference -- Density Node Types](../reference/README.md).

> **Biome source assets:** `Examples/Example_CellNoise2D.json`, `Examples/Example_Curve_Mapper.json`, `Experimental/Arches.json`, `Experimental/Mountains.json`, `Experimental/Plateaus.json`, `Generative/Generative_Arches.json`, `Generative/Generative_Pillars_Marble_Large.json`, `Generative/Generative_Veins.json`
>
> Entries below combine registry-level node descriptions with the way those nodes appear in audited terrain assets from Hytale's `Examples/`, `Experimental/`, and `Generative/` biome folders.

## Density Nodes

Density nodes output a scalar value (-1 to 1 typically) evaluated at each (x,y,z) coordinate. Positive values produce solid blocks; zero or negative produce air.

### BaseHeight

Defines or reads a named height reference and gives you the vertical anchor for terrain.

- It crosses `0` at the referenced height.
- With `Distance: true`, it outputs signed distance from that height.
- In the audited source assets, it usually feeds `CurveMapper`, which decides how that anchor becomes terrain density.

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

Key fields: `Scale` (sampling frequency — lower = broader features), `Octaves` (layers of detail), `Persistence` (amplitude decay per octave), `Lacunarity` (frequency multiplier per octave), `Seed` (noise pattern).

> **Note:** `SimplexNoise2D` has no built-in amplitude field. To scale the output, use a `Multiplier` node with the noise as one input and a `Constant { Value: X }` as the other.

### SimplexNoise3D

A 3D coherent noise generator. Outputs between -1 and 1. Enables caves, overhangs, and floating islands by varying density in all three dimensions.

Key fields: `ScaleXZ` (horizontal sampling frequency), `ScaleY` (vertical sampling frequency), `Octaves`, `Persistence`, `Lacunarity`, `Seed`.

> **Note:** `SimplexNoise3D` uses `ScaleXZ` and `ScaleY` (not `Scale` or `Frequency`). Separate horizontal and vertical scale lets tunnels be wider than they are tall.

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

Displaces the sampling position using another density function. Creates twisted, turbulent terrain. In the audited source assets, `FastGradientWarp` is the variant that appears in real biome graphs (`Desert1_Oasis.json`, `Plains1_River.json`).

### Gradient

Computes the density gradient (rate of change) at a point. The output is a 3D vector — use the Y component to detect surface slope. Steep terrain has a large Y gradient; flat terrain has a small one. Used for slope-based material assignment and terrain terracing.

### Switch

Routes between multiple density inputs based on a `SwitchState`. Allows branching logic in a graph — e.g. use one cave density system below Y=40 and another above it.

### Multiplier

Multiplies all density inputs together. The primary way to scale noise amplitude — use with a `Constant` node:
```
Multiplier(SimplexNoise2D, Constant { Value: 0.35 })
```
This produces noise at 35% of its natural amplitude.

### CellWallDistance

Outputs the distance to the nearest Voronoi cell wall. Produces a value near 0 at cell edges and near 1 at cell centers. It does not appear in the audited biome set, so treat it as an available registry node rather than a source-backed common pattern.

### Cache / Cache2D

Memoization nodes. `Cache` stores evaluated density values for a 3D region; `Cache2D` stores a 2D slice. Use when the same subgraph is referenced by multiple downstream nodes to avoid evaluating it twice. Significant performance gain in DAG-diamond patterns.

### Exported / Imported

`Exported` marks a density subgraph as a reusable named output accessible from other graphs. `Imported` references an exported graph from another asset. Used to share a single terrain density function across multiple biome assets without duplicating the graph.

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

## Curve Types

Curves are a separate asset type used inside `CurveMapper` and as required inputs on `Ellipsoid` and `Plane`. They are not separate nodes — they are options selected in the properties panel. See [Curves Explained](../guides/world/curves-explained.md) for the full guide.

| Curve | Effect |
|-------|--------|
| `Manual` | Custom control-point spline — most flexible |
| `DistanceExponential` | Exponential falloff from a surface — crisp island edges |
| `DistanceS` | S-shaped transition — beaches, gradual biome edges |
| `Clamp` / `SmoothClamp` | Hard / smooth range limiting |
| `Floor` / `Ceiling` | One-sided range enforcement |
| `Inverter` | Flip the curve: `1 - input` |

---

## Tips

- **Start simple:** Begin with `BaseHeight + SimplexNoise2D -> Sum` to get a basic landscape.
- **Combine in Sum:** Most terrain graphs are built by summing several density contributions.
- **Use Min to carve caves:** `Min(terrain, Inverter(cave_noise))` digs caves out of terrain.
- **YSampled for performance:** Wrap expensive vertical density subgraphs in `YSampled` for a major speed boost.
- **DistanceToBiomeEdge for blending:** Fade props in/out near biome edges for natural-looking transitions.
