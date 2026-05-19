# Guides

This section contains in-depth guides covering key TerraNova workflows and world generation concepts.

## Available Guides

- **[Setup, Data Flow & First Steps](./setup-data-flow-first-steps.md)** — a beginner-friendly mental model for how values move through the editor and graph.
- **[Understanding Basic Terrain Generation](./understanding-basic-terrain-generation.md)** — the concepts behind density, noise maps, and terrain shaping before you start tuning recipes.

If you want follow-along build steps instead of explanations, start in [Walkthroughs](../walkthroughs/README.md).

**World Building**
- **[Biome System](./world/biome-system.md)** — how biomes are defined, how the world selects them, and how transitions work.
- **[Node Combination Patterns](./world/node-combinations.md)** — common ways to wire nodes together, with visual flow diagrams for each pattern.
- **[Curves Explained](./world/curves-explained.md)** — what curve assets are, every curve type (DistanceExponential, DistanceS, Manual, Clamp, Floor, Ceiling, Inverter, and their smooth variants), when to use each, and a decision guide for picking the right curve for island edges, beaches, and shape falloffs.
- **[Environments & Weather](./world/environments-and-weather.md)** — folder layout, asset cache setup, parent chains, and how to author environment and weather assets without guessing.

**Content**
- **[Materials Guide](./content/materials-guide.md)** — how material providers work: SpaceAndDepth layer types, ConstantThickness, NoiseThickness, RangeThickness, cave ceiling/floor detection with DownwardSpace/UpwardSpace, and worked examples for plains, desert, and cave biomes.
- **[Props & Placement](./content/props-and-placement.md)** — the position provider → scanner → prop pipeline, prop types (Prefab, Cluster, Weighted, PondFiller), position providers (Occurrence, Jitter2d, SimpleHorizontal), scanners (ColumnLinear, ColumnRandom, Area), and worked examples for trees, boulders, cave mushrooms, and ponds.

**Terrain**
- **[Terrain Math Explained](./terrain/terrain-math-explained.md)** — the actual math behind every node type: what each parameter does, how combining nodes produces specific terrain shapes, and a quick-reference tuning table.
- **[Terrain Types and Node Recipes](./terrain/terrain-types.md)** — organized by terrain outcome: plains, mountains, mesas, floating islands (SDF), skylands altitude bands, caves, warped terrain, dunes, archipelagos, and complex layered worlds.
- **[Complex Terrain Techniques](./terrain/terrain-types-advanced.md)** — advanced recipes: double domain warp, slope detection with Gradient, depth-zoned Switch branching, Voronoi river networks, altitude-scaled Amplitude, VectorWarp directional distortion, overhangs, and manual multi-scale noise stacks.
- **[Expert Terrain Techniques](./terrain/terrain-types-expert.md)** — system-level knowledge: MultiMix N-way blending, PositionsPinch/Twist, SingleInstance thread safety, Cache strategy, the Terrain accessor, full preview vs. runtime gap reference, graph topology, and the optimization reference (YSampled placement, octave budget, FastGradientWarp vs GradientWarp, Cache vs DAG diamonds).
- **[Terrain Sculpting and Transition Patterns](./terrain/terrain-sculpting-advanced.md)** — advanced sculpting: biome-edge blending with distance-weighted Mix, terrain terracing with CurveMapper staircases, river channel carving with CellWallDistance, gradient-guided erosion approximation, and shoreline coastal profiles.
- **[Expert Terrain Composition](./terrain/terrain-composition-expert.md)** — pipeline-level design: XZ-gated zone switching, per-cell seeded terrain variation via CellNoise, depth-driven material density graphs, and coordinating shared terrain/cave/material exports across multiple graphs using Exported/Imported/SingleInstance.
- **[Experimental Terrain Techniques](./terrain/terrain-experimental.md)** — proof-of-concept techniques with known limitations: recursive height feedback via the `Terrain` accessor, Voronoi-masked per-cell islands, manual frequency-domain terrain sculpting, seed variation for parallel worlds, and interference patterns from phase-offset noise.

> More guides will be added over time. If you want to contribute, see [Contributing](../contributing.md).
