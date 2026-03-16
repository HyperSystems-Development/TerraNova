# Node Effects: How Each Node Changes Terrain

This reference describes the most important node categories and how they affect the terrain.

## Core concept: Graph = Terrain

In TerraNova, terrain is defined by a directed graph of nodes. Each node computes a value at every `(x, y, z)` position. The final value (the output) determines whether a point is solid (terrain) or empty (air).

## Key node categories

### 🔹 Density nodes (shape)
Density nodes are the building blocks of terrain.

- **Noise (Perlin, Simplex, Cell)**: Adds natural irregularity. Use it for hills, caves, and surface details.
- **Height / Slope / Distance**: Generate values based on position.
- **Blend / SmoothMin / SmoothMax**: Combine shapes smoothly.

### 🔸 Material nodes (surface look)
Material nodes determine which block/texture appears on the surface.

- **Mask + Blend**: Mix materials based on conditions.
- **Color / Tint**: Adjust preview coloring for debugging.

### 🟣 Curves (remapping)
Curves remap values between 0–1.

- **Manual Curve**: Draw any remapping curve.
- **Preset curves**: SmoothStep, Sigmoid, etc.

### 🟢 Positions & Scanners (where things go)
These nodes help place props and features.

- **Positions**: define spawn points.
- **Scanner**: measure surface properties (slope, height, etc.).

### 🟠 Patterns (masks & repeats)
Patterns generate repeating masks.

- **Voronoi**, **Checker**, **Stripes**: create tiled patterns.
- **Mask** nodes use them to carve terrain.

---

## Using Hytale biome nodes as reference

When you open a Hytale biome JSON in TerraNova, you can inspect the exact node graph used in the game. Use it as a reference for how real biomes are built.

### Copying a node “recipe”
1. Open a biome file (e.g., `Server/HytaleGenerator/Biomes/YourBiome.json`).
2. Select the nodes that produce the feature you like.
3. Copy + paste them into your own graph.
4. Adjust inputs (noise scale, curves, etc.) to customize.

---

## Common terrain patterns

### 🏔 Mountain ridges
- Base: `Height` + `Noise`
- Combine with `SmoothMin` to carve ridges
- Use a `Curve` to sharpen peaks

### 🌋 Caves
- Base: `Height` + `Noise`
- Subtract a cave mask (`CellNoise`)

### 🌊 Beaches
- Use `Slope` to detect flats/steepness
- Use `Height` for sea level
- Blend materials using masks
