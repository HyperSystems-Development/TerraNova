# Guide: Props and Placement

**Difficulty:** Intermediate

This guide explains how props work in WorldGen V2 — what they are, when they run, how to tell the engine where to place them, and how to pick the right prop type for the job. It covers the full position → scanner → prop pipeline with worked examples.

---

## What Are Props?

Props are objects placed on generated terrain after the terrain shape and material passes have finished. They cover everything from individual trees and boulders to pond fills and prefab structures.

Props are defined in the `Props` array of a `BiomeAsset`. Each entry combines three things:

1. **A position provider** — finds candidate XZ (horizontal) locations across the terrain
2. **A scanner** — takes each candidate position and searches for an exact surface Y coordinate
3. **A prop** — decides what to place at each confirmed surface point

Because props run after terrain and material generation, they can query the world's block data to find surfaces, detect block types, and react to the terrain that already exists.

> [!NOTE]
> Props are not density nodes. They cannot change terrain shape. If you want terrain that reacts to props (e.g. a flat platform under a structure), that must be handled in the material or density pass before props run.

---

## The Position → Scanner → Prop Pipeline

Every prop entry follows the same three-stage flow:

```
Position Provider
      │
      │  "Check these XZ columns"
      ▼
   Scanner
      │
      │  "Here is the exact Y at each column"
      ▼
    Prop
      │
      │  "Place this object at (X, Y, Z)"
      ▼
  World block data
```

**Stage 1 — Position provider:** Generates or filters a set of (X, Z) candidate positions within the chunk being generated. This is where you control density, altitude range, clustering, and random spread.

**Stage 2 — Scanner:** For each candidate position, the scanner searches the world for a valid surface. A surface scan going top-down finds the first solid block from above (normal terrain surface). A bottom-up scan finds the ceiling of a cave or the floor from below.

**Stage 3 — Prop:** Receives each confirmed (X, Y, Z) result and executes placement — writing blocks, loading a prefab, filling a pond, or delegating to a child prop.

> [!TIP]
> If a scanner finds no valid surface at a position, that position is silently skipped. This is intentional — it means your prop naturally avoids cliffs, cave entrances, and other irregular surfaces without you needing to add extra filtering.

---

## Common Prop Types

### `Prefab`

Places a saved structure at the placement point. The structure is loaded from one of the paths in `WeightedPrefabPaths` (each path has a `Weight`).

```json
{
  "Type": "Prefab",
  "WeightedPrefabPaths": [
    { "Path": "structures/oak_tree_a", "Weight": 3 },
    { "Path": "structures/oak_tree_b", "Weight": 2 },
    { "Path": "structures/oak_tree_c", "Weight": 1 }
  ],
  "Directionality": { "Type": "Random" },
  "LoadEntities": false
}
```

Key fields:

| Field | Purpose |
|-------|---------|
| `WeightedPrefabPaths` | Pool of structure paths with relative weights |
| `Directionality` | How the prefab is oriented (see Directionality below) |
| `Scanner` | Optional inline scanner override |
| `BlockMask` | Limits which surface blocks are valid for placement |
| `MoldingDirection` | Which axis the structure "molds" to terrain curvature |
| `MoldingPattern` | Controls how molding blends with existing terrain |
| `LoadEntities` | Whether entity data inside the prefab is spawned |

**Directionality types:**

- `Static` — placed in a fixed rotation every time
- `Random` — randomly rotated from a defined set of rotations
- `Pattern` — rotated to face a surface based on surrounding block layout (useful for wall-mounted or cliff-face structures)
- `Imported` — rotation imported from an external definition

### `Weighted`

Randomly selects one child prop from a weighted list and delegates to it. Use this as a top-level wrapper whenever you have multiple variants of the same prop.

```json
{
  "Type": "Weighted",
  "Seed": 42,
  "Entries": [
    { "Weight": 5, "Prop": { "Type": "Prefab", "WeightedPrefabPaths": [{ "Path": "structures/oak_tree", "Weight": 1 }] } },
    { "Weight": 2, "Prop": { "Type": "Prefab", "WeightedPrefabPaths": [{ "Path": "structures/pine_tree", "Weight": 1 }] } }
  ]
}
```

`Seed` controls the per-chunk random stream used for selection. Different seeds give independent variation.

### `Cluster`

Places a group of weighted props centered on the placement point, spread across a defined radius. Useful for rock clusters, shrub patches, and grouped decoration.

```json
{
  "Type": "Cluster",
  "Seed": 7,
  "Range": 4,
  "DistanceCurve": { "Type": "EaseInOut" },
  "WeightedProps": [
    { "Weight": 3, "Prop": { "Type": "Box", "Range": 1, "Material": "stone" } },
    { "Weight": 1, "Prop": { "Type": "Box", "Range": 1, "Material": "mossy_stone" } }
  ]
}
```

`Range` is the spread radius in blocks. `DistanceCurve` controls how likely placement is at the edges versus the center — an ease-in curve means props cluster tightly toward the center.

### `PondFiller`

Detects terrain depressions and fills them with a fluid material. This prop type works differently from others — it does not need an external position provider to find XZ locations, because it scans for depression geometry automatically.

```json
{
  "Type": "PondFiller"
}
```

> [!NOTE]
> `PondFiller` is one of the simplest prop definitions to write, but it is sensitive to terrain shape. It works best when terrain has genuine low points created by the density pass. Flat terrain will produce no ponds regardless of how many times `PondFiller` runs.

### `Queue`

Evaluates sub-props in order and uses the first one that succeeds. Useful for fallback logic — place a structure if conditions are met, otherwise place a simpler prop.

### `Mask`

Wraps a child prop in a block mask filter. The placement only proceeds if the surface block matches the mask.

```json
{
  "Type": "Mask",
  "Mask": "grass",
  "Prop": { "Type": "Prefab", "WeightedPrefabPaths": [{ "Path": "structures/flower_patch", "Weight": 1 }] }
}
```

### `DensitySelector`

Selects a child prop based on a density value sampled at the placement position. `Delimiters` defines the breakpoints, and `Density` provides the sampling function.

### `Box` and `Cuboid`

Fill a rectangular region with a block material. `Box` is older; `Cuboid` is the modern replacement with the same conceptual fields: `Range`, `Material`, `Pattern`, `Scanner`.

All prop types support a `Skip: true` field to disable the entry without deleting it.

---

## Position Providers

The position provider is specified on the prop entry alongside the prop definition. It controls which XZ coordinates are passed to the scanner.

### `SimpleHorizontal`

Passes positions through only if they fall within a Y range. Use this to restrict props to altitude bands — mushrooms in caves, alpine flowers above the snowline.

```json
{
  "Type": "SimpleHorizontal",
  "RangeY": { "Min": 80, "Max": 200 },
  "Positions": { "Type": "Framework", "Name": "default" }
}
```

`Positions` is the upstream position source. `SimpleHorizontal` filters its output.

### `Occurrence`

Gates positions through a density-driven probability check. At each candidate position, a density function is sampled. If the value falls within the configured range, the position passes. This is how you create uneven, organic scattering — dense in some areas, sparse or absent in others.

```json
{
  "Type": "Occurrence",
  "Seed": 12,
  "FieldFunction": {
    "Type": "SimplexNoise2D",
    "Scale": 0.02
  },
  "Positions": { "Type": "Framework", "Name": "default" }
}
```

> [!TIP]
> `Occurrence` combined with `SimpleHorizontal` is the standard pattern for altitude-restricted, density-varied props like alpine boulders or cliff-face vegetation.

### `Jitter2d`

Adds a random 2D (XZ) offset to each position. Without jitter, props that use a grid-based position source will look artificially regular. `Jitter2d` breaks that up.

```json
{
  "Type": "Jitter2d",
  "Magnitude": 3.0,
  "Seed": 99,
  "Positions": { "Type": "Framework", "Name": "default" }
}
```

`Magnitude` is the maximum offset in blocks. A value of 3–6 is typical for trees; larger values suit loosely scattered boulders.

### `Clusters`

Groups candidate positions into spatial clusters before passing them downstream. Useful when you want multiple props spawned close together at clustered locations rather than spread uniformly.

```json
{
  "Type": "Clusters",
  "Cluster": { "Count": 5, "Radius": 8 },
  "Distributor": { "Type": "Framework", "Name": "default" },
  "ClusterBounds": { "Min": 2, "Max": 8 }
}
```

### `Anchor`

Anchors each position to a surface. `Reversed: true` flips the anchor direction, useful for ceiling or underside placement.

### `Jitter3d`

Like `Jitter2d` but applies offset in all three axes. Use this for props that can be placed slightly above or below the nominal surface point.

### `Scaler`

Scales the position coordinates by a factor. Useful for stretching a position field that was authored at a different coordinate scale.

### `List`

Provides an explicit, hard-coded list of positions. Used when you need deterministic placement at specific offsets — typically inside prefab definitions or unit tests.

### `Framework`

A named reference to a position source defined elsewhere in the world configuration. `"Name": "default"` refers to the standard per-chunk grid provided by the framework.

---

## Scanners

The scanner finds the actual Y coordinate at each XZ position. It is specified inside the prop definition (as the `Scanner` field) or on some prop types as a top-level sibling field.

### `ColumnLinear`

Scans a vertical column linearly from one end to the other and returns the first valid surface block hit. This is the standard scanner for surface-placed props.

```json
{
  "Type": "ColumnLinear",
  "MinY": 0,
  "MaxY": 256,
  "ResultCap": 1,
  "TopDownOrder": true
}
```

| Field | Purpose |
|-------|---------|
| `MinY` / `MaxY` | Vertical scan range |
| `ResultCap` | Maximum number of results to return per column (almost always `1` for surface props) |
| `TopDownOrder` | `true` = scan top to bottom (finds top surface). `false` = scan bottom to top (finds cave floor). |
| `RelativeToPosition` | If `true`, `MinY`/`MaxY` are offsets from the candidate Y rather than world coordinates |
| `BaseHeightName` | Optional reference to a named height field for relative scanning |

> [!TIP]
> For trees and surface props, always use `TopDownOrder: true`. Scanning bottom-up will find the cave floor or a buried surface instead of the top of the terrain.

### `ColumnRandom`

Scans a vertical column in random order instead of linearly. Useful when you want placement to pick a random valid surface from several options — for example, a mushroom that can grow on any of several cave ledges in a column.

```json
{
  "Type": "ColumnRandom",
  "MinY": 0,
  "MaxY": 80,
  "ResultCap": 1,
  "Seed": 33,
  "Strategy": "AnyValid"
}
```

### `Area`

Scans a 2D area using a child scanner at each point within the area. Returns a collected set of surface results from across the region.

```json
{
  "Type": "Area",
  "ResultCap": 10,
  "ScanShape": "Circle",
  "ScanRange": 5,
  "ChildScanner": {
    "Type": "ColumnLinear",
    "MinY": 0,
    "MaxY": 256,
    "ResultCap": 1,
    "TopDownOrder": true
  }
}
```

Use `Area` when a single prop needs surface data from a wider footprint — for example, a large boulder that tests several nearby blocks before placing.

### `Radial`

Scans outward from a position within a 3D bounding box using a child scanner. Fields: `Bounds`, `Scanner`.

### `Linear`

Scans along a single world axis. Fields: `Axis`, `Range`, `Scanner`, `AscendingOrder`.

### `Origin`

Scans only the exact origin position with no range. Use this when the placement point is already known precisely and no surface search is needed.

---

## Worked Examples

### Example A: Trees on a Plains Biome

A `Weighted` prop picking between oak and pine variants, positioned with `Jitter2d` to break up grid regularity, using `ColumnLinear` scanning top-down to find the terrain surface.

```json
{
  "PositionProvider": {
    "Type": "Jitter2d",
    "Magnitude": 4.0,
    "Seed": 101,
    "Positions": { "Type": "Framework", "Name": "default" }
  },
  "Prop": {
    "Type": "Weighted",
    "Seed": 55,
    "Entries": [
      {
        "Weight": 4,
        "Prop": {
          "Type": "Prefab",
          "WeightedPrefabPaths": [
            { "Path": "structures/oak_tree_a", "Weight": 2 },
            { "Path": "structures/oak_tree_b", "Weight": 1 }
          ],
          "Directionality": { "Type": "Random" },
          "Scanner": {
            "Type": "ColumnLinear",
            "MinY": 0,
            "MaxY": 256,
            "ResultCap": 1,
            "TopDownOrder": true
          }
        }
      },
      {
        "Weight": 2,
        "Prop": {
          "Type": "Prefab",
          "WeightedPrefabPaths": [
            { "Path": "structures/pine_tree_a", "Weight": 1 }
          ],
          "Directionality": { "Type": "Random" },
          "Scanner": {
            "Type": "ColumnLinear",
            "MinY": 0,
            "MaxY": 256,
            "ResultCap": 1,
            "TopDownOrder": true
          }
        }
      }
    ]
  }
}
```

> [!TIP]
> Tune `Magnitude` on `Jitter2d` to match your intended tree density. At high density settings, large `Magnitude` values cause trees to overlap; scale them down together.

---

### Example B: Boulders at Altitude

Boulders appear only above Y 80 and only in areas where a noise field reads high enough. `Occurrence` gates by noise density, `SimpleHorizontal` restricts the altitude, and `ColumnLinear` finds the surface.

```json
{
  "PositionProvider": {
    "Type": "Occurrence",
    "Seed": 88,
    "FieldFunction": {
      "Type": "SimplexNoise2D",
      "Scale": 0.025
    },
    "Positions": {
      "Type": "SimpleHorizontal",
      "RangeY": { "Min": 80, "Max": 256 },
      "Positions": { "Type": "Framework", "Name": "default" }
    }
  },
  "Prop": {
    "Type": "Weighted",
    "Seed": 14,
    "Entries": [
      {
        "Weight": 3,
        "Prop": {
          "Type": "Prefab",
          "WeightedPrefabPaths": [
            { "Path": "structures/boulder_large", "Weight": 2 },
            { "Path": "structures/boulder_medium", "Weight": 3 }
          ],
          "Directionality": { "Type": "Random" },
          "Scanner": {
            "Type": "ColumnLinear",
            "MinY": 60,
            "MaxY": 256,
            "ResultCap": 1,
            "TopDownOrder": true
          }
        }
      }
    ]
  }
}
```

> [!NOTE]
> Position providers compose by nesting — `Occurrence` wraps `SimpleHorizontal` which wraps `Framework`. The innermost provider generates positions; each outer layer filters or transforms them.

---

### Example C: Cave Mushrooms

Mushrooms on cave floors use `ColumnRandom` scanning upward (bottom-to-top) so the scanner finds the cave floor rather than the terrain surface above.

```json
{
  "PositionProvider": {
    "Type": "Jitter2d",
    "Magnitude": 2.0,
    "Seed": 200,
    "Positions": { "Type": "Framework", "Name": "default" }
  },
  "Prop": {
    "Type": "Weighted",
    "Seed": 77,
    "Entries": [
      {
        "Weight": 3,
        "Prop": {
          "Type": "Prefab",
          "WeightedPrefabPaths": [
            { "Path": "structures/mushroom_small", "Weight": 3 },
            { "Path": "structures/mushroom_large", "Weight": 1 }
          ],
          "Directionality": { "Type": "Static" },
          "Scanner": {
            "Type": "ColumnRandom",
            "MinY": 0,
            "MaxY": 50,
            "ResultCap": 1,
            "Seed": 201,
            "Strategy": "AnyValid"
          }
        }
      }
    ]
  }
}
```

> [!TIP]
> Restrict `MaxY` on cave scanners to below your typical terrain surface height. If `MaxY` reaches into surface terrain, the scanner may return surface results instead of cave floors.

---

### Example D: Pond Filling

`PondFiller` requires no position provider tuning — it detects depressions automatically. A minimal entry is sufficient:

```json
{
  "PositionProvider": { "Type": "Framework", "Name": "default" },
  "Prop": {
    "Type": "PondFiller"
  }
}
```

Place this entry early in the `Props` array if subsequent props (such as reeds or water-edge plants) should be able to detect the filled fluid blocks. Props run in array order.

---

## Common Mistakes

### Missing scanner

If the prop does not have a `Scanner` defined and none is inherited, the engine does not know which Y to use. The prop either fails silently or places at the raw candidate Y — which may be in mid-air or underground. Always define a scanner on props that write blocks to the world.

### Using `ColumnLinear` scanning upward for surface trees

`ColumnLinear` with `TopDownOrder: false` scans from the bottom up and returns the first solid block it finds — typically the cave floor or a subsurface layer, not the terrain surface. Surface-placed props must use `TopDownOrder: true`.

```json
// Wrong for surface trees:
{ "Type": "ColumnLinear", "TopDownOrder": false }

// Correct:
{ "Type": "ColumnLinear", "TopDownOrder": true }
```

### Forgetting `ResultCap` on scanners

Without `ResultCap`, a scanner may return multiple surface hits per column (for instance, both the cave ceiling and the terrain top). Each result spawns a separate prop placement. Set `ResultCap: 1` for props that should appear once per position, and only raise it intentionally when multiple placements per column are desired.

### Nesting position providers in the wrong order

Position providers compose inward — the outermost provider is the last filter applied. If you want altitude filtering applied before the noise occurrence check, `SimpleHorizontal` must be the inner (nested) provider and `Occurrence` the outer one. Getting this backwards means the altitude check runs on already-filtered coordinates, which may produce unexpected gaps.

### Setting `Magnitude` too high on `Jitter2d`

Very large jitter values can push positions into adjacent chunks before the scanner runs, producing placement inconsistencies at chunk borders. Keep `Magnitude` well below the chunk radius (typically under 8 blocks).

---

## See Also

- [`../reference/README.md`](../reference/README.md) — schema reference for all prop types, position providers, and scanners
- [`./biome-system.md`](./biome-system.md) — how props fit into the wider biome asset structure
