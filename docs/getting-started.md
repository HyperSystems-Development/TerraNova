# Getting Started

Welcome to TerraNova, a visual node editor for Hytale World Generation V2.

## What is TerraNova?

TerraNova lets you build and edit Hytale terrain generation packs using a visual node graph. Instead of writing JSON by hand, you connect nodes together and see how your terrain looks in a live 2D/3D preview.

The packs you build are standard Hytale asset packs, exported as a zip and loaded directly into a Hytale server.

---

## The interface at a glance

```
┌─────────────────────────────────────────────────────────┐
│  Title bar: project name, save, export, undo/redo       │
├──────────┬───────────────────────────┬───────────────────┤
│  Left    │       Node graph          │  Right            │
│  sidebar │       (center)            │  Properties / Docs│
│          │                           │                   │
│  Files   │   [Node]──[Node]──[Root]  │  (edit selected   │
│  History │       └──[Node]──┘        │   node fields)    │
│  Bookmarks                           │                   │
├──────────┴───────────────────────────┴───────────────────┤
│  2D/3D preview (optional bottom panel)                   │
└─────────────────────────────────────────────────────────┘
```

**Left sidebar:** your pack's files. Click any biome or JSON to open it in the graph.

**Center:** the node graph. Every node is a computation. Data flows left-to-right. The rightmost node (Root) is what the game reads.

**Right panel:** switches between **Properties** (edit the selected node's fields) and **Docs** (this panel). Press `Ctrl+\`` to toggle between them without losing your place.

**Bottom:** 2D heightmap and 3D voxel preview. Updates as you edit.

---

## Core concept: density functions

Every terrain in Hytale V2 is defined by a **density function**: a tree of nodes that takes a world position `(x, y, z)` and returns a number.

- If the number is **positive** → the block is solid
- If the number is **negative** → the block is air
- The **zero crossing** is the surface

The most basic terrain graph is just:

```
Constant(100) ──┐
                Sum ── Root
YValue ── Inverter ──┘
```

`100 + (-y)` is positive when `y < 100` (solid below Y=100) and negative when `y > 100` (air above Y=100). That's a flat plain at Y=100.

Everything else in worldgen (noise, caves, material layers, biome transitions) is built on top of this identity.

---

## How nodes connect

Nodes have **input handles** (left side, labeled circles) and **output handles** (right side). Drag from an output to an input to connect them.

- A **green handle** accepts connections
- A **red handle** rejects the connection (wrong type)
- Connections glow when the terrain liveness feature is on (View menu)

Data flows from **left to right** through the graph. The far-right node is always the `Root`, which is what the game uses.

---

## Keyboard shortcuts

| Action | Shortcut |
|---|---|
| Save | `Ctrl+S` |
| Undo | `Ctrl+Z` |
| Redo | `Ctrl+Y` |
| Toggle Properties / Docs | `Ctrl+\`` |
| Add node | `Space` or double-click canvas |
| Delete selected | `Delete` |
| Fit graph to view | `Ctrl+Shift+F` |
| Copy / Paste | `Ctrl+C` / `Ctrl+V` |
| Search nodes | `Ctrl+F` |
| Bookmark view 1–9 | `Ctrl+1` – `Ctrl+9` |
| Jump to bookmark | `1` – `9` |

---

## Where to go next

**New to worldgen?** Start with the Quickstart to understand the basic flow, then try the Sky Islands walkthrough for a complete biome build-through.

- [Quickstart: Build Your First Pack](./tutorials/quickstart.md)
- [Sky Islands Walkthrough](./tutorials/sky-islands-walkthrough.md): build a full floating-island biome step by step

**Need to look something up?**

- [Node Effects Reference](./reference/node-effects.md): what every node type does
- [Curves Reference](./reference/curves.md): visual guide to every curve type with live previews
- [Environments & Weather Guide](./tutorials/environments-weather-guide.md): atmosphere, fog, sky, and syncing assets from your Hytale install

**Tip:** Keep this Docs panel open while you work. Press `Ctrl+\`` to flip between Properties and Docs so you can reference a node's documentation while editing its fields.
