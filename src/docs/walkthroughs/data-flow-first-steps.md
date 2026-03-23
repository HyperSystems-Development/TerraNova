# Walkthrough: Setup, Data Flow, and First Steps

<!-- walkthrough -->

**Difficulty:** Beginner

> **Biome source assets:** `Examples/Example_Curve_Mapper.json`, `Experimental/Arches.json`, `Generative/Generative_Arches.json`
>
> Terrain examples on this page should be read against those Hytale `Examples/`, `Experimental/`, and `Generative/` graphs rather than ad hoc sample graphs.

This walkthrough gives you a mental model for how WorldGen V2 node graphs work and gets you to a functioning terrain graph.

## How Data Flows

Every node takes inputs, does something with them, and outputs a value. The world generator evaluates the entire graph at every (x, y, z) coordinate when it generates terrain.

The three value types that flow through the graph:

| Value type | What it means |
|-----------|--------------|
| **Density** | A number (typically -1 to 1). Positive = solid block, zero/negative = air. |
| **Material** | Which block type fills a solid voxel. |
| **Position** | A 2D or 3D coordinate — used by prop placement systems. |

Most of what you'll build is density graphs — they determine the shape of the world.

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "gen",  "label": "Generator",   "category": "terrain", "sub": "e.g. BaseHeight",  "x": 0,   "y": 40 },
    { "id": "mod",  "label": "Modifier",    "category": "math",    "sub": "e.g. CurveMapper", "x": 0,   "y": 140 },
    { "id": "comb", "label": "Combinator",  "category": "math",    "sub": "e.g. Sum",         "x": 220, "y": 90 },
    { "id": "out",  "label": "Terrain Out", "category": "output",                              "x": 420, "y": 90 }
  ],
  "edges": [
    { "from": "gen",  "to": "comb" },
    { "from": "mod",  "to": "comb" },
    { "from": "comb", "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "gen",  "text": "Generators produce values with no inputs — noise nodes, BaseHeight, axis nodes (YValue, XValue, ZValue). They are the source of all data in the graph." },
    { "nodeId": "mod",  "text": "Modifiers transform a single value — CurveMapper reshapes it with a curve, Scale adjusts coordinate space, Clamp limits range, Inverter flips sign." },
    { "nodeId": "comb", "text": "Combinators merge multiple inputs into one — Sum adds them, Min keeps the smaller, Max keeps the larger, Mix blends between two based on a selector." },
    { "nodeId": "out",  "text": "Terrain Out is the required exit point. The density value it receives determines what is solid and what is air at each world coordinate." }
  ]
}
```

The three node roles:
- **Generators** produce values with no inputs — noise nodes, `BaseHeight`, axis nodes.
- **Modifiers** transform a value — `CurveMapper`, `Scale`, `Clamp`, `Inverter`, `Normalizer`.
- **Combinators** merge multiple values — `Sum`, `Max`, `Min`, `Mix`.

## The Evaluation Loop

When you click **Generate**, the engine evaluates every coordinate in the world:

```
for each (x, z):
  biome = biome_selector_noise(x, z)          → picks which biome config to use
  for each y from world_bottom to world_top:
    density = evaluate_density_graph(x, y, z) → your node graph runs here
    if density > 0:
      block = evaluate_material(x, y, z)      → material node runs here
      place block at (x, y, z)
```

This is why:
- Density nodes can reference all three axes (X, Y, Z).
- Material nodes only run where terrain is solid — they see the final density.
- Props run after terrain is fully built.

## The Editor Layout

| Area | What it does |
|------|-------------|
| **Node canvas** (centre) | Build and connect your density/material graph |
| **Properties panel** (right) | Edit the selected node's parameters |
| **Toolbar** (top) | Generate, zoom to fit, toggle preview mode |
| **Biome list** (left panel) | Switch between biome configs |
| **Docs** (this panel) | Reference while you work |

> [!TIP]
> Press **F** with nothing selected to fit the whole graph into view. Click any node first, then **F** to zoom to just that node.

## Your First Graph

The minimum valid terrain graph is two nodes:

1. Add **BaseHeight** (Terrain category) — it crosses zero at the named reference height and gives you the vertical terrain anchor.
2. It connects to **Terrain Out** — already on the canvas by default.

Connect `BaseHeight → Terrain Out` and click **Generate** to see a flat plane at Y=64.

When you are ready for your first real terrain shape, the next node to learn is `CurveMapper`. This is a good first curve to keep nearby:

```curve
Starter surface curve - easy to tweak without breaking the graph
[[0,-1],[0.24,-0.94],[0.42,-0.55],[0.54,-0.04],[0.66,0.58],[0.82,0.94],[1,1]]
```

- Left side stays air.
- Middle controls how quickly the ground rises.
- Right side controls how dense the ground becomes below the surface.

> [!NOTE]
> BaseHeight is essentially `YValue` with a fixed offset. It crosses zero at the configured reference Y level. You can replicate it manually with `Sum` of `YValue` + `Constant { Value: -64 }` if you need a surface at a precise height.

## Recommended Next Steps

Follow the [Understanding Basic Terrain Generation](./basic-terrain-generation.md) walkthrough to layer in noise, curves, and caves on top of what you just built.
