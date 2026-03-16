# Glossary — Asset Node Editor Nodes

This glossary section covers common node types used in the Asset Node Editor for TerraNova / Hytale WorldGen V2.

## Density Nodes

### Sum Density

Adds multiple density inputs together. This node is commonly used to combine terrain layers (e.g., base terrain + noise + caves).

### Min Density & Max Density

These nodes combine densities by choosing the min/max value at each coordinate.

- **Max Density** keeps the highest (most solid) value.
- **Min Density** keeps the lowest (most empty) value.

### BaseHeight Density

Defines a height reference (Y level) that outputs `0` at the chosen height.

- Values above that height become positive.
- Values below become negative.

### CurveMapper Density

Remaps an input value using a curve (usually a `Manual Curve` node). Commonly used to shape terrain height profiles.

### Constant Density

Outputs a fixed value.

### Normalizer Density

Remaps a value range to another range.

Example: Convert `[-1, 1]` to `[0, 1]`.

### SimplexNoise2D Density

A 2D noise generator commonly used for base terrain noise.

It outputs values between `-1` and `1`.
