# Guide: Setup, Data Flow & First Steps

**Difficulty:** Beginner

This guide explains how data flows through a WorldGen V2 node graph and gives you a mental model for working in the TerraNova editor.

## How Data Flows

Every node in the graph takes some inputs, does something with them, and outputs a value. The world generator evaluates the entire graph at every (x, y, z) coordinate when it generates terrain.

The key things that flow through the graph:

| Value type | What it means |
|-----------|--------------|
| **Density** | A number (typically –1 to 1). Positive = solid block, zero/negative = air. |
| **Material** | Which block type fills a solid voxel. |
| **Position** | A 2D or 3D coordinate — used by prop placement systems. |

Most of what you'll build is density graphs — they determine the shape of the world.

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "gen",  "label": "Generator",    "category": "terrain",     "sub": "e.g. BaseHeight",  "x": 0,   "y": 40 },
    { "id": "mod",  "label": "Modifier",     "category": "math",        "sub": "e.g. CurveMapper", "x": 0,   "y": 140 },
    { "id": "comb", "label": "Combinator",   "category": "math",        "sub": "e.g. Sum",         "x": 220, "y": 90 },
    { "id": "out",  "label": "Terrain Out",  "category": "output",                                  "x": 420, "y": 90 }
  ],
  "edges": [
    { "from": "gen",  "to": "comb" },
    { "from": "mod",  "to": "comb" },
    { "from": "comb", "to": "out", "label": "density" }
  ]
}
```

The three node roles:

- **Generators** produce values with no inputs — noise nodes, `BaseHeight`, axis nodes (`YValue`, `XValue`).
- **Modifiers** transform a value — `CurveMapper`, `Scale`, `Clamp`, `Inverter`, `Normalizer`.
- **Combinators** merge multiple values — `Sum`, `Max`, `Min`, `Mix`.

## The Evaluation Loop

When you click **Generate**, the engine does roughly this for every coordinate:

```
for each (x, z):
  biome = biome_selector_noise(x, z)          → picks which biome config to use
  for each y from world_bottom to world_top:
    density = evaluate_density_graph(x, y, z) → node graph runs here
    if density > 0:
      block = evaluate_material(x, y, z)      → material node runs here
      place block at (x, y, z)
  for each prop_position in biome.props:
    if surface found:
      place prop                               → prop placement runs here
```

This is why:
- Density nodes can use all three axes (X, Y, Z).
- Material nodes see the final density — they only run where terrain is solid.
- Props run after terrain is fully built.

## The Editor Layout

| Area | What it does |
|------|-------------|
| **Node canvas** (centre) | Build and connect your density/material graph |
| **Properties panel** (right) | Edit the selected node's parameters |
| **Toolbar** (top) | Generate, zoom to fit, toggle preview mode |
| **Biome list** (left panel) | Switch between biome configs |
| **Docs** (this panel) | Reference while you work |

## Your First Graph

The minimum valid terrain graph is just two nodes:

1. **BaseHeight** (Terrain category) — outputs 0 at Y=64, positive above, negative below.
2. **Terrain Out** — the required output node, already on canvas.

Connect `BaseHeight → Terrain Out` and click Generate to see a flat plane at Y=64. Then layer in noise and curve nodes from there.

## Recommended Next Steps

- [Understanding Basic Terrain Generation](./understanding-basic-terrain-generation.md) — how density, noise, and curves combine to make terrain
- [Node Combinations](./node-combinations.md) — practical patterns for common terrain types
- [Hytale WorldGen V2 Biome System](./hytale-worldgen-v2-biome-system.md) — how biomes are structured and selected
