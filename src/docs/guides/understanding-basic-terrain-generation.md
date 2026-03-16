# Guide: Understanding Basic Terrain Generation

**Difficulty:** Beginner

This guide explains the core concepts behind TerraNova / Hytale WorldGen V2 terrain generation.

## Density & Noisemaps Introduction

### What is Density?

Density is the core principle for generating terrain. It is a value that determines whether a block at a given coordinate (x, y, z) is solid or empty:

- **Positive density** → solid block
- **Zero or negative density** → air (empty)

In practice, density values in TerraNova are typically between -1 and 1.

### Noisemaps

Noisemaps are what noise generator nodes output. Each noise generator (e.g., `SimplexNoise2D`) produces a continuous value between -1 and 1 for each coordinate.

For example, a 2D noise map can be thought of as a heightmap where:

- Peaks are close to `1`
- Valleys are close to `-1`

These values are then combined with other nodes to produce terrain.

## CurveMapper & BaseHeight

The **CurveMapper** is a key part of terrain generation. It remaps an input value using a curve (usually defined by a `Manual Curve` node).

The most common pairing is:

- `BaseHeight Density` outputs a value based on world height (Y coordinate)
- `CurveMapper Density` remaps that value to shape terrain elevation

Example:

- `BaseHeight Density` outputs `0` at a configured height (e.g., Y=100)
- Values below that become negative, above become positive
- The `CurveMapper` remaps those values to create hills, cliffs, or flat areas

## CurveMapper + BaseHeight + Noisemaps

To create varied terrain, you usually combine the height-based curve with noise.

A common pattern is:

1. Use `SimplexNoise2D Density` (or other noise) to create horizontal variation.
2. Use `CurveMapper Density` to define a vertical profile.
3. Combine them with `Sum Density`, resulting in a single density value per (x,y,z) coordinate.

### How values combine

- Each node outputs a value between -1 and 1.
- When adding two density values, the result can range from -2 to 2.
- The world generator treats **positive** as solid and **negative/zero** as empty.

In some cases, TerraNova treats **exactly 0** as solid to avoid completely empty columns when noise reaches -1.

---

> Tip: Experiment with simple graphs in the editor to see how changing node parameters affects density output.
