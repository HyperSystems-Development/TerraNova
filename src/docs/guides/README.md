# Guides

This section contains in-depth guides covering key TerraNova workflows and world generation concepts.

## Available Guides

- **[Setup, Data Flow & First Steps](../walkthroughs/data-flow-first-steps.md)** *(walkthrough)* — an introduction to the editor and WorldGen V2 data flow.
- **[Understanding Basic Terrain Generation](../walkthroughs/basic-terrain-generation.md)** *(walkthrough)* — density, noise maps, curve mapping, and how they combine.
- **[Biome System](./biome-system.md)** — how biomes are defined, how the world selects them, and how transitions work.
- **[Node Combination Patterns](./node-combinations.md)** — common ways to wire nodes together, with visual flow diagrams for each pattern.
- **[Terrain Types and Node Recipes](./terrain-types.md)** — organized by terrain outcome: plains, mountains, mesas, floating islands, caves, warped terrain, dunes, archipelagos, and complex layered worlds.
- **[Complex Terrain Techniques](./terrain-types-advanced.md)** — advanced recipes: double domain warp, slope detection with Gradient, depth-zoned Switch branching, Voronoi river networks, altitude-scaled Amplitude, VectorWarp directional distortion, overhangs, and manual multi-scale noise stacks.
- **[Expert Terrain Techniques](./terrain-types-expert.md)** — system-level knowledge: MultiMix N-way blending, PositionsPinch/Twist, SingleInstance thread safety, Cache strategy, the Terrain accessor, full preview vs. runtime gap reference, graph topology, and the optimization reference (YSampled placement, octave budget, FastGradientWarp vs GradientWarp, Cache vs DAG diamonds).
- **[Terrain Sculpting and Transition Patterns](./terrain-sculpting-advanced.md)** — advanced sculpting: biome-edge blending with distance-weighted Mix, terrain terracing with CurveMapper staircases, river channel carving with CellWallDistance, gradient-guided erosion approximation, and shoreline coastal profiles.
- **[Expert Terrain Composition](./terrain-composition-expert.md)** — pipeline-level design: XZ-gated zone switching, per-cell seeded terrain variation via CellNoise, depth-driven material density graphs, and coordinating shared terrain/cave/material exports across multiple graphs using Exported/Imported/SingleInstance.
- **[Experimental Terrain Techniques](./terrain-experimental.md)** — proof-of-concept techniques with known limitations: recursive height feedback via TerrainAccessor, Voronoi-masked per-cell islands, manual frequency-domain terrain sculpting, seed variation for parallel worlds, and interference patterns from phase-offset noise.

> More guides will be added over time. If you want to contribute, see [Contributing](../contributing.md).
