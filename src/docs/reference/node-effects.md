# Node Effects: How Each Node Changes Terrain

This reference describes the most important node families and how they affect terrain.

> **Biome source assets:** `Basic.json`, `Examples/Example_CellNoise2D.json`, `Examples/Example_Curve_Mapper.json`, `Examples/Example_Mixer_Gradient.json`, `Desert1/Desert1_Oasis.json`, `Plains1/Plains1_Mountains.json`, `Plains1/Plains1_River.json`
>
> The summaries below are grounded in those assets and the active TerraNova node set. Example chains are schematic summaries unless called out as direct source fragments.

## Core concept: graph = terrain

In TerraNova, terrain is a directed graph of nodes. Each node computes a value at every `(x, y, z)` position. The final value determines whether that point is solid or air.

```text
density > 0  -> solid block
density < 0  -> air
density = 0  -> the surface
```

The recurring shape logic in the audited biome assets reduces to some variation of:

```text
density(x, y, z) = terrain_height(x, z) - y
```

Below the surface the result is positive, so terrain is solid. Above the surface it is negative, so the point is air.

---

## Key node categories

### Density generators

| Node | What it produces | Common use |
|---|---|---|
| `SimplexNoise2D` | Smooth 2D noise over X/Z | Hills, plains, biome masks |
| `SimplexNoise3D` | Smooth 3D noise over X/Y/Z | Caves, undersides, volumetric variation |
| `CellNoise2D` | Cell/Voronoi regions | Region masks, fractured terrain |
| `CellNoise3D` | 3D cell noise | Volumetric cell patterns |

### Anchors and coordinate inputs

| Node | What it returns | Common use |
|---|---|---|
| `YValue` | Current world Y coordinate | Teaching height formula, altitude masks |
| `BaseHeight` | Named terrain anchor; with `Distance: true` it becomes signed distance from that height | Ground anchors, altitude bands |
| `DistanceToBiomeEdge` | Distance from the nearest biome boundary | Transition masks, edge effects |
| `Constant` | Fixed numeric value | Height offsets, weights, amplitude scales |

### Combining nodes

| Node | What it does | Common use |
|---|---|---|
| `Sum` | Adds inputs | Height anchor + noise, layered terrain |
| `Multiplier` | Multiplies inputs | Scale a signal, apply masks |
| `AmplitudeConstant` | Source-asset constant scaling stage | `noise * 40` style remaps in Hytale-native assets |
| `Min` / `Max` | Keeps the lower / higher input | Carving, unions, shape cuts |
| `SmoothMin` / `SmoothMax` | Blended min/max | Organic merges |
| `Mix` | Weighted blend between branches | Terrain transitions, selector-driven blends |
| `Normalizer` | Remaps one numeric range to another | Prepare a selector, stabilize sums |
| `FastGradientWarp` | Distorts coordinates before lookup | Organic boundaries, warped masks |
| `YSampled` | Samples a child graph at coarser Y intervals | Vertical amortization for expensive terrain |

### Curves and remapping

Curves reshape an input value before it continues through the graph.

> **See the visual reference:** [Curves Reference](./curves.md)

Most common tools:

- `Curve:Manual` for custom remaps and hand-drawn profiles
- `Curve:DistanceExponential` for center-to-edge falloff
- `Curve:DistanceS` for smooth transition bands
- `Curve:Clamp` and `Normalizer` for range control
- `Curve:Not` / `Curve:Inverter` for mask flipping

### Materials, positions, and scanners

These do not change terrain density directly, but they use terrain outputs to decide what gets placed and where.

| Family | Common examples | What they do |
|---|---|---|
| Material providers | `SpaceAndDepth`, `DownwardDepth`, `Striped` | Choose which block fills solid voxels |
| Position providers | `Mesh2D`, `FieldFunction`, `SimpleHorizontal` | Choose candidate prop positions |
| Scanners | `ColumnLinear`, `Origin` | Resolve placement against terrain |

---

## Common source-backed patterns

### Basic terrain anchor (`Basic.json`)

```text
SimplexNoise2D
  + CurveMapper(Manual)
      <- BaseHeight(Distance: true, Name: "Base")
  -> Sum
```

This is the simplest recurring production pattern in the audited assets: a named height anchor comes through `BaseHeight`, a manual `CurveMapper` shapes that vertical distance, and `SimplexNoise2D` adds horizontal variation.

### Cell-based regions (`Examples/Example_CellNoise2D.json`)

```text
CellNoise2D (CellType: Distance2Div)
  + CurveMapper(Manual)
      <- BaseHeight(Distance: true, Name: "Base")
  -> Sum
```

This example asset uses cell noise directly in terrain density while `CurveMapper(BaseHeight)` still controls the vertical anchor.

### Warped edge masks (`Desert1_Oasis.json`, `Plains1_River.json`)

```text
Imported / Inverter / river-or-oasis mask
  -> FastGradientWarp
  -> Normalizer or CurveMapper
  -> Mix / Max / Min
```

In the audited oasis and river biomes, `FastGradientWarp` is mostly a boundary-shaping stage inside a larger mask pipeline, not a standalone terrain recipe.

### Shared production stacks (`Plains1_Mountains.json`, `Examples/Example_Mixer_Gradient.json`)

```text
Exported -> Cache -> Imported
                    + Mix
                    + Normalizer
                    + CurveMapper
                    + YSampled
```

The heavier source biomes reuse expensive subgraphs instead of recomputing them. `Exported` / `Imported`, `Cache`, `Mix`, `Normalizer`, and `YSampled` show up together when a biome needs layered terrain or shared selectors across systems.

---

## Using biome graphs as reference

When you open a Hytale biome JSON in TerraNova, inspect the exact node graph used in the source assets.

1. Open a biome file under `Server/HytaleGenerator/Biomes`.
2. Find the terrain or material subgraph you want to study.
3. Trace it from the root backward.
4. Copy only the part you understand, then retune it in your own graph.

---

## Quick reference

| What you want | Use |
|---|---|
| Vertical terrain anchor | `BaseHeight` + `CurveMapper`, or `Constant - YValue` for a direct teaching height formula |
| Surface variation | `SimplexNoise2D` |
| 3D variation for caves or undersides | `SimplexNoise3D` |
| Cell-shaped regions | `CellNoise2D` or `PositionsCellNoise` |
| Organic boundary distortion | `FastGradientWarp` |
| Blend terrain branches | `Mix` + `Normalizer` |
| Reuse expensive graph results | `Cache` + `Exported` / `Imported` |
| Reduce vertical evaluation cost | `YSampled` |
