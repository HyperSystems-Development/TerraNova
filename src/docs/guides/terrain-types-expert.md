# Guide: Expert Terrain Techniques

**Difficulty:** Expert

This guide covers the techniques that require understanding the density graph as a system — evaluation order, thread safety, preview accuracy limits, and node interactions that span the pipeline boundary. These are not just harder recipes; they require knowing *why* the system works the way it does.

Prerequisites: everything in [Complex Terrain Techniques](./terrain-types-advanced.md). This guide assumes you are comfortable with domain warping, SDF shapes, the Export/Import pattern, and `Switch` branching.

---

## 1. N-Way Terrain Blending with MultiMix

**What it does:** Smoothly blends between three or more terrain styles as a single selector value changes — like a continent map that transitions plains → hills → mountains → alpine peaks across one noise field, without manual Mix-chaining.

**Why it's expert:** `Mix` handles exactly two inputs. Chaining multiple `Mix` nodes for N-way blending creates a tree of `lerp` calls where each stage's transition zone narrows the further down the chain you go. `MultiMix` handles all N segments with consistent transition widths, using a single selector and piecewise linear keys.

**The recipe:** `MultiMix` with a low-frequency `SimplexNoise2D` as the first input (selector), followed by N terrain subgraphs as segments. The `Keys` array defines the breakpoints where transitions happen.

```nodegraph
{
  "height": 300,
  "nodes": [
    { "id": "sel",  "label": "SimplexNoise2D", "category": "density",  "sub": "Scale 0.0008 Oct 1",  "x": 0,   "y": 0 },
    { "id": "nr",   "label": "Normalizer",     "category": "density",  "sub": "[−1,1]→[0,1]",       "x": 200, "y": 0 },
    { "id": "pl",   "label": "Sum (plains)",   "category": "density",  "sub": "BaseHeight+low noise","x": 0,   "y": 100 },
    { "id": "hl",   "label": "Sum (hills)",    "category": "density",  "sub": "CurveMapper+noise",   "x": 0,   "y": 180 },
    { "id": "mt",   "label": "Sum (mountains)","category": "density",  "sub": "high amp + ridges",   "x": 0,   "y": 260 },
    { "id": "al",   "label": "Sum (alpine)",   "category": "density",  "sub": "peaks + cliff curve", "x": 0,   "y": 340 },
    { "id": "mm",   "label": "MultiMix",       "category": "density",  "sub": "keys 0.25 0.5 0.75",  "x": 420, "y": 170 },
    { "id": "ys",   "label": "YSampled",       "category": "density",  "sub": "step = 4",            "x": 620, "y": 170 },
    { "id": "out",  "label": "Terrain Out",    "category": "output",                                 "x": 800, "y": 170 }
  ],
  "edges": [
    { "from": "sel", "to": "nr" },
    { "from": "nr",  "to": "mm",  "label": "input 0 (selector)" },
    { "from": "pl",  "to": "mm",  "label": "input 1" },
    { "from": "hl",  "to": "mm",  "label": "input 2" },
    { "from": "mt",  "to": "mm",  "label": "input 3" },
    { "from": "al",  "to": "mm",  "label": "input 4" },
    { "from": "mm",  "to": "ys" },
    { "from": "ys",  "to": "out" }
  ]
}
```

**Key parameters:**
- Selector Scale`*`: `0.0008` — very low frequency so terrain type zones are continent-sized; `0.003` for smaller biome patches
- Selector must be **input 0**; the segment terrain graphs are inputs 1–N in order
- `Keys`\*: four keys for four segments: `[{Value: 0.0}, {Value: 0.33}, {Value: 0.66}, {Value: 1.0}]` — three transition zones at roughly equal thirds; adjust breakpoints to make some zones wider

**How MultiMix transitions work:** Between key `i` and key `i+1`, the output is a `lerp` between segment input `i` and segment input `i+1`. At key values exactly, the output is purely the corresponding segment. A selector of `0.33` is pure hills. A selector of `0.165` (midpoint between 0 and 0.33) is a 50/50 blend of plains and hills.

**Preview caveat:** `MultiMix` with more than 4 inputs has a known index overflow bug in TerraNova's previewer — you'll see banding artifacts at segment boundaries for 5+ inputs. The JSON export and in-game result will be correct. Limit preview testing to ≤4 segments, or use the 2D heatmap view where the artifacts are easier to distinguish from the intended output.

**Variations:**
- Use unequal key spacing to make certain zones much wider than others: `[0.0, 0.1, 0.5, 1.0]` — plains occupy only 10%, everything else has mountains/alpine
- Feed a warped (`FastGradientWarp`) selector for organic zone boundaries rather than noise-oval boundaries

---

## 2. Position-Relative Terrain Distortion (PositionsPinch / PositionsTwist)

**What it does:** Terrain that deforms in space relative to where position-provider points (e.g., prop placement points, cell noise centers) land. `PositionsPinch` compresses or stretches space toward/away from each point. `PositionsTwist` rotates space around the axis through each point.

**Why it's expert:** These nodes bridge the density system and the positions system. They find the nearest position-provider point, store it in `positionsAnchor`, then modify the evaluation context's position relative to that anchor before evaluating downstream densities. The interaction with prop runtime stages and the context mutation order is subtle.

**The recipe — pinch around tree placement points:**

```nodegraph
{
  "height": 240,
  "nodes": [
    { "id": "grid",  "label": "PositionsCellNoise","category": "density", "sub": "tree grid positions","x": 0,   "y": 40 },
    { "id": "pinch", "label": "PositionsPinch",    "category": "density", "sub": "strength 0.4 r 8",  "x": 220, "y": 40 },
    { "id": "sn",    "label": "SimplexNoise2D",    "category": "density", "sub": "Scale 0.006 Oct 4", "x": 0,   "y": 150 },
    { "id": "bh",    "label": "BaseHeight",        "category": "density", "sub": "Y = 64",            "x": 0,   "y": 220 },
    { "id": "sum",   "label": "Sum",               "category": "density", "sub": "base terrain",      "x": 440, "y": 175 },
    { "id": "ys",    "label": "YSampled",          "category": "density", "sub": "step = 4",          "x": 620, "y": 175 },
    { "id": "out",   "label": "Terrain Out",       "category": "output",                              "x": 800, "y": 175 }
  ],
  "edges": [
    { "from": "grid",  "to": "pinch", "label": "positions" },
    { "from": "pinch", "to": "sum",   "label": "pinched noise" },
    { "from": "sn",    "to": "sum" },
    { "from": "bh",    "to": "sum" },
    { "from": "sum",   "to": "ys" },
    { "from": "ys",    "to": "out" }
  ]
}
```

**What pinch does to terrain:** Space near each position-provider point is compressed inward (positive strength) or expanded outward (negative strength). Compressed space means noise features appear smaller and more detailed near the point. Expanded space makes features stretch outward from it — terrain appears to flow away from the center. The result is terrain that subtly reacts to where objects are placed, creating natural-feeling clearings or mounding around features.

**Key parameters:**
- `PositionsPinch` strength`*`: `0.2–0.6` — how aggressively space is warped; above `0.8` produces severe distortion
- `PositionsPinch` radius: `6–12` — the falloff distance in blocks; beyond this radius the effect is zero
- Negative strength inverts the direction (expands instead of compresses)

**`PositionsTwist` recipe — spiral terrain around feature points:**
Same structure, but replace `PositionsPinch` with `PositionsTwist`. The terrain rotates progressively around the vertical axis through each position-provider point. Low twist angles (`5–15°`) produce subtle spiral striations; high angles (`45–90°`) produce dramatic centrifuge-like terrain rotation around features.

**Critical ordering note:** `PositionsCellNoise` must be evaluated before `PositionsPinch`/`PositionsTwist` in the graph — it's what populates `positionsAnchor`. The `Positions*` distortion nodes read that anchor and apply their transform. Evaluating them out of order produces undefined behavior (they'll use whatever anchor was last set, which could be from a completely different node).

**Preview accuracy:** `PositionsPinch` and `PositionsTwist` are categorized as unsupported in TerraNova's evaluator — preview shows no distortion. The in-game result will be correct. Design the distortion radius and strength conservatively and test in-game early.

---

## 3. Graph Sharing and Performance: Exported / Imported / SingleInstance

**What it does:** Allows expensive density subgraphs to be evaluated once and referenced many times — across biomes, across material providers, between terrain and prop systems — without paying the evaluation cost multiple times per position.

**Why it's expert:** The `SingleInstance` flag has a thread-safety trap that causes silent corruption if misapplied. Understanding which node types are safe as single instances and which aren't is essential before using this in any production graph.

**The rule:**

| Node type | `SingleInstance: true` safe? |
|-----------|------------------------------|
| `SimplexNoise2D/3D`, `CellNoise2D/3D` | **Yes** — stateless; no mutable context fields |
| `Constant`, `YValue`, `XValue`, `ZValue` | **Yes** — stateless |
| `Sum`, `Min`, `Max`, `Abs`, `Multiplier` | **Yes** if all *inputs* are also stateless |
| `Scale`, `Slider`, `Rotator` | **No** — hold mutable `rChildContext` and `rChildPosition` |
| `FastGradientWarp`, `GradientWarp` | **No** — mutable per-instance context state |
| `PositionsPinch`, `PositionsTwist` | **No** — mutable context state |
| `YSampled` | **No** — maintains interpolation state per thread |

**The recipe — shared continent noise across two biomes:**

```
FloatingFunctionNodes:
  "continent_base": {
    Type: Exported,
    ExportAs: "continent_base",
    SingleInstance: true,          ← safe: SimplexNoise2D is stateless
    Inputs: [{
      Type: SimplexNoise2D,
      Seed: "continent",
      Scale: 0.0005,
      Octaves: 3
    }]
  }

Biome A Terrain:
  Type: Sum
  Inputs: [
    { Type: Imported, Name: "continent_base" },
    { Type: SimplexNoise2D, Seed: "plains_local", Scale: 0.008, Octaves: 4 }
  ]

Biome B Terrain:
  Type: Sum
  Inputs: [
    { Type: Imported, Name: "continent_base" },
    { Type: SimplexNoise2D, Seed: "mountain_local", Scale: 0.004, Octaves: 5 }
  ]
```

**What this achieves:** Both biomes evaluate the same `continent_base` noise — but since it's `SingleInstance`, the noise object is built once and shared. There's no per-thread duplication of the permutation table and octave configuration. For a noise evaluated at every block in the world, this is a meaningful memory saving.

**The `Pipeline` node for ordering:** When you need to guarantee that exported nodes are registered *before* imported nodes try to resolve them, wrap them in a `Pipeline`. `Pipeline` evaluates its inputs sequentially — earlier inputs run first. Place `Exported` nodes in early pipeline slots, `Imported` consumers in later slots.

```
Type: Pipeline
Inputs:
  0: { Type: Exported, ExportAs: "shared_noise", ... }    ← registers first
  1: { Type: Sum, Inputs: [
         { Type: Imported, Name: "shared_noise" },         ← resolves safely
         { Type: BaseHeight, Height: 64 }
       ]}
```

**Preview caveat:** `Imported` returns `0.0` in TerraNova's preview — the export registry is not wired up in the evaluator. When testing graphs that use Export/Import, replace `Imported` references with inline copies of the subgraph during preview iteration, then restore `Imported` before exporting.

---

## 4. Cache Node Strategy

**What it does:** `Cache` stores the most recently evaluated positions and their results in an LRU cache. When the same position is queried again — which happens when a node is referenced by multiple downstream consumers — the cached result is returned without re-evaluating the child.

**Why it's expert:** Knowing when to cache (shared inputs), when not to (everything has unique positions), and what capacity to use (almost always 2–4) requires understanding the chunk evaluation order.

**When `Cache` helps:** A density function that is `Imported` by multiple consumers at the same position benefits from caching. Example: a shared continent noise imported by both terrain and material selection — without `Cache`, it's evaluated twice per position.

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "exp",  "label": "Exported (continent)", "category": "density", "sub": "SingleInstance",    "x": 0,   "y": 80 },
    { "id": "cache","label": "Cache",                "category": "density", "sub": "capacity 3",        "x": 200, "y": 80 },
    { "id": "terr", "label": "Sum (terrain use)",   "category": "density", "sub": "imports cache",     "x": 400, "y": 30 },
    { "id": "mat",  "label": "MaterialProvider",    "category": "material","sub": "imports cache",     "x": 400, "y": 150 }
  ],
  "edges": [
    { "from": "exp",  "to": "cache" },
    { "from": "cache","to": "terr",  "label": "cached result" },
    { "from": "cache","to": "mat",   "label": "cached result" }
  ]
}
```

**Capacity guidance:**

| Situation | Capacity |
|-----------|----------|
| Single consumer (no sharing) | Don't use Cache |
| Two consumers, same evaluation sweep | `2` |
| Three or more consumers | `3` |
| Complex DAG with many consumers at same position | `4` max |

**Never set capacity high** (>4). Cache lookup is an LRU scan — larger capacity means longer lookup per cache hit. The default of `3` is almost always right.

**When `Cache` does not help:** If a node is only ever evaluated at different positions by each consumer (which is the common case for most downstream nodes), the cache will never hit. Adding `Cache` here costs lookup overhead with no benefit. Cache is only valuable when multiple branches of the graph evaluate the *same node* at the *same position* in the same chunk pass.

**`YSampled` vs `Cache` — when to use which:**
- `YSampled` reduces evaluation *frequency* (every 4 blocks instead of every block). Use it for the entire terrain subgraph.
- `Cache` reduces evaluation *duplication* (same position, multiple consumers). Use it for shared subgraphs referenced by multiple nodes.
- They stack: wrap an expensive shared node in `Cache` first, then `YSampled` around the broader subgraph.

---

## 5. Self-Referential Terrain with the Terrain Accessor

**What it does:** The `Terrain` accessor node re-queries the terrain density at the current evaluation position from *within* the density graph itself. This enables density decisions that depend on the terrain's own output — material providers that look up whether a point is near the terrain surface, or secondary density features that carve only where terrain already exists.

**Why it's expert:** This is a re-entrant query into the density pipeline. The terrain density provider must be wired into the context before `Terrain` can return a meaningful value (it's set by the chunk generator before terrain evaluation begins). Misusing it inside the terrain graph itself creates circular evaluation that the runtime does not protect against — it will evaluate until stack overflow.

**Safe use: material providers that read terrain density**

The safe pattern is using `Terrain` inside a `MaterialProvider`, not inside the terrain density graph that produced it. The material provider is evaluated after terrain density is finalized, so `Terrain` reads a stable value.

```
MaterialProvider:
  Type: Queue
  Inputs:
    surface:
      Type: FieldFunction
      Density:
        Type: Gradient             ← detects steep terrain
        Axis: [0, 1, 0]
        SampleRange: 2.0
        Inputs: [{ Type: Terrain }]  ← queries terrain density
      Threshold: 0.3
      Material: cliff_rock          ← placed where slope > 0.3
    default:
      Type: DownwardDepth
      Depth: 1
      Material: grass
```

This gives you cliff-face rock selection driven by actual terrain slope — without any of the terrain graph needing to know about materials.

**Secondary density that carves only existing terrain:**

```
Type: Min
Inputs:
  - { Type: Terrain }              ← the existing terrain density
  - {                              ← a new carve feature
      Type: Inverter,
      Inputs: [{
        Type: Ellipsoid,
        Curve: { Type: DistanceExponential, Range: 20 }
      }]
    }
```

This carves an ellipsoid void from terrain — but only where terrain is already solid. In pure air, `Terrain` returns a large negative value, so `Min` returns that (air stays air). Only where `Terrain` is positive does the ellipsoid carve matter.

**Preview caveat:** `Terrain` returns `0.0` in TerraNova's preview (the provider isn't wired). In the previewer, `Gradient(Terrain)` will therefore return zero — the slope-based material won't appear in the Docs panel preview. Test these patterns in-game directly.

---

## 6. Preview vs. Runtime: What You're Not Seeing

**What this is:** A reference for which nodes preview accurately and which produce incorrect or zero output in TerraNova's density evaluator. Building complex graphs without knowing these limits leads to designing terrain around a preview that doesn't match what the game generates.

**Completely absent in preview (returns 0.0):**

| Node | Preview output | In-game | Impact |
|------|---------------|---------|--------|
| `GradientWarp` | `0.0` | Correct warp | **Critical** — any graph using this looks completely wrong in preview |
| `VectorWarp` | `0.0` | Correct warp | Critical — directional distortion invisible |
| `Terrain` | `0.0` | Reads terrain density | High — slope/terrain queries broken |
| `BaseHeight` | `0.0` | Correct Y offset | High — vertical anchor appears at Y=0 |
| `CellWallDistance` | `0.0` | Reads wall proximity | High — Voronoi valley carving invisible |
| `Imported` | `0.0` | Resolves to export | Medium — all Export/Import chains show wrong output |

**Approximated (visually different from in-game):**

| Node | Difference | Severity |
|------|-----------|----------|
| `FastGradientWarp` | Single-octave only; in-game uses full fBm warp accumulation | High — warp appears smoother/weaker than final |
| `SmoothMin` / `SmoothMax` | Different polynomial; blending curve shape differs slightly | Low |
| `SmoothClamp` | Compounds both SmoothMin + SmoothMax errors | Low |
| `SimplexNoise2D/3D` | Different permutation table → different feature positions per seed | Medium — design correct, but exact positions shift |
| `CellNoise2D/3D` | Different hash → cell boundaries in different XZ positions | Medium |
| `MultiMix` (>4 inputs) | Index overflow → banding artifacts at transitions | Medium |
| `YSampled` | `SampleDistance` hardcoded to 4 regardless of config | Medium if you set a non-default step |
| `Gradient` | Doesn't account for `Scale` node transforms | Medium if used inside a scaled context |

**Practical workflow for nodes with critical preview gaps:**

1. **GradientWarp / VectorWarp:** Build and tune the child terrain first without warping. Once the unwarped shape looks right in preview, add the warp node and test exclusively in-game. Rely on the warp parameter descriptions in [Complex Terrain Techniques](./terrain-types-advanced.md) for factor guidance rather than preview iteration.

2. **BaseHeight:** Use the 2D heatmap preview and watch the density value readout at Y=64. If it reads near 0 when it should read your height offset, your BaseHeight node is hitting the preview gap. Work around it by temporarily replacing `BaseHeight` with `OffsetConstant { Offset: -64, Input: YValue }` during preview, which is a faithful implementation.

3. **Export/Import:** Replace `Imported` references with inline copies during preview-time iteration. Restore the `Imported` reference before JSON export.

4. **CellWallDistance:** Use `CellNoise2D` (which previews correctly for distance values) as a visual proxy during preview, then switch to the `CellWallDistance` accessor for the final graph.

---

## 7. Graph Topology and Evaluation Cost

**What this is:** Not a terrain type, but the understanding required to build any of the above without making generation prohibitively slow.

**The evaluation model:** The density graph is a DAG (directed acyclic graph). Every block in every chunk causes the entire graph to be evaluated from root to leaves. There is no frame budget — generation blocks the thread. Cost compounds multiplicatively through the graph.

**Cost hierarchy (approximate relative cost per evaluation):**

| Node | Relative cost | Notes |
|------|--------------|-------|
| `Constant`, coord accessors | ~1× | Essentially free |
| `Sum`, `Min`, `Max`, `Abs` math | ~1× | Simple arithmetic |
| `SimplexNoise2D` (1 octave) | ~10× | Permutation + gradient lookup |
| `SimplexNoise2D` (N octaves) | ~10N× | Linear with octave count |
| `SimplexNoise3D` (1 octave) | ~25× | Higher-dimensional algorithm |
| `CellNoise2D` | ~20× | Neighborhood search |
| `FastGradientWarp` (child + 1 warp) | child + ~25× | One extra 3D noise eval |
| `GradientWarp` (3D) | child + 6× warp cost | Six evaluations of warp density |
| `Gradient` | 2× child cost | Central differences |
| `YSampled` (wrapping X) | ~X/4 | Amortizes child to 1-in-4 blocks |
| `Cache` (hit) | ~1× | LRU lookup |
| `Cache` (miss) | child cost + lookup | Adds overhead on miss |

**Danger patterns:**

```
Gradient(                    ← doubles child cost
  GradientWarp(              ← 7× child cost (6 warp + 1 child)
    warp: SimplexNoise3D,    ← ~25× per evaluation, evaluated 6× for gradient
    child: SimplexNoise3D(Octaves=6)  ← ~150× evaluated once
  )
)
```

This evaluates `SimplexNoise3D(warp)` 12 times per block (6 for GradientWarp's gradient, each doubled by `Gradient`'s finite difference), plus `SimplexNoise3D(child Octaves=6)` twice. Approximate cost: 12×25 + 2×150 = ~600× baseline. For a 16×384×16 chunk that's ~60 million noise evaluations per chunk before any other work.

**Safe version of the same design:**

```
FastGradientWarp(            ← ~25× (1 warp noise eval instead of 6)
  child: SimplexNoise3D(Octaves=4),  ← ~100×
  WarpOctaves: 2             ← warp has its own 2-octave accumulation, no extra cost
)
```

Approximate cost: 25 + 100 = ~125× baseline. ~5× cheaper, very similar visual result.

**The `YSampled` placement rule:** Wrap the most expensive subgraph — the one containing the highest-octave noise or the most deeply nested warps — not the output. Placing `YSampled` deep in the graph saves more evaluations than placing it near the root, because you're short-circuiting the expensive part.

**The DAG diamond problem:** If a node is referenced by two paths that converge at a common ancestor, it gets evaluated twice. Example:

```
Sum:
  A: FastGradientWarp(child: BigNoise)   ← evaluates BigNoise once (inside warp)
  B: Multiplier(BigNoise, constant)       ← evaluates BigNoise again
```

`BigNoise` is evaluated twice per position. Fix with `Cache` on `BigNoise`, or `Exported`+`Imported` if it's shared across biomes.

---

## Expert Summary

| Technique | Core insight |
|-----------|-------------|
| `MultiMix` N-way blending | First input is selector; Keys define piecewise lerp breakpoints; >4 inputs break the previewer but work in-game |
| `PositionsPinch`/`Twist` | Bridge density and positions systems; must follow `PositionsCellNoise` in evaluation order; preview shows nothing |
| `SingleInstance` export | Safe for stateless nodes (noise, constants, pure math); unsafe for anything with `rChildContext` (Scale, Warp, Positions*) |
| `Cache` strategy | Only helps when the same position is queried multiple times by multiple consumers in the same pass; capacity ≤4 |
| `Terrain` accessor | Safe in material providers (after terrain is finalized); circular if used inside the terrain graph itself; preview returns 0 |
| Preview gaps | `GradientWarp`, `VectorWarp`, `BaseHeight`, `CellWallDistance`, `Terrain`, `Imported` all return 0 in preview — design around this |
| Graph topology | Cost is per-block and multiplicative; `YSampled` wraps the expensive subgraph; `Cache` fixes DAG diamonds; avoid nested `Gradient` |

> **See also:** [Complex Terrain Techniques](./terrain-types-advanced.md) for the advanced recipes these expert patterns build on. [Terrain Types and Node Recipes](./terrain-types.md) for the foundational outcomes.
