# Contributing to the Docs

This page explains how the documentation is organized, how files should be named, and what standards to follow when writing new content.

---

## Document Tree

```
src/docs/
  overview.md               -- landing page, project info, credits, how to contribute
  getting-started.md        -- first launch, editor layout, shortcuts
  troubleshooting.md        -- common problems and fixes
  contributing.md           -- this file

  walkthroughs/             -- step-by-step tutorials, one task per file
    README.md               -- index of all walkthroughs
    quickstart.md
    data-flow-first-steps.md
    basic-terrain-generation.md
    create-a-world.md
    sky-islands.md
    terrain-and-caves.md
    multi-biome-world.md
    periodic-density-stripes.md

  guides/                   -- concept deep-dives, longer-form explanations
    README.md               -- index of all guides
    setup-data-flow-first-steps.md
    understanding-basic-terrain-generation.md

    world/                  -- world-structure and system guides
      biome-system.md
      node-combinations.md
      curves-explained.md
      environments-and-weather.md

    content/                -- material and prop guides
      materials-guide.md
      props-and-placement.md

    terrain/                -- terrain recipes and math
      terrain-math-explained.md
      terrain-types.md
      terrain-types-advanced.md
      terrain-types-expert.md
      terrain-sculpting-advanced.md
      terrain-composition-expert.md
      terrain-experimental.md

  templates/
    README.md               -- contributor doc templates
    guide-template.md       -- copy this to start a new guide
    walkthrough-template.md -- copy this to start a new walkthrough

  glossary/
    README.md               -- main glossary with all key terms and node tables
    asset-node-editor-nodes.md
    in-game-commands.md

  reference/                -- complete technical listings; split into subfolders as it grows
    README.md               -- current single-page reference (nodes, schema, commands)
    curves.md               -- visual curve type reference with previews
    node-effects.md         -- what each node category does to terrain
    reading-the-graph.md    -- how to read and debug any node graph
    terrain-types.md        -- paste-ready terrain JSON snippets
    [future] nodes/         -- one file per node category when reference outgrows one page
    [future] schema/        -- JSON asset schemas (world, biome, prop, framework)
    [future] commands/      -- in-game commands (consolidates glossary/in-game-commands.md)
```

**When to split reference into subfolders:** `reference/` already has companion pages (`curves.md`, `node-effects.md`, `reading-the-graph.md`, `terrain-types.md`). Add a new companion page when a topic is long enough to warrant its own focused page. Future splits into `nodes/`, `schema/`, and `commands/` subfolders make sense when those sections outgrow a single page each.

---

## File Naming

- Use **lowercase kebab-case** for all filenames: `terrain-and-caves.md`, not `TerrainAndCaves.md`.
- Use **descriptive names** that match the page title: the file `multi-biome-world.md` maps to "Walkthrough: Setting Up a Multi-Biome World".
- Folder index files are always named `README.md` (uppercase). The sidebar displays them with a friendly title.
- Never use spaces or special characters in filenames.

**Examples:**

| Title | Filename |
|-------|---------|
| Walkthrough: Terrain and Caves | `terrain-and-caves.md` |
| Guide: Understanding Basic Terrain Generation | `understanding-basic-terrain-generation.md` |
| Glossary (folder index) | `glossary/README.md` |

---

## Page Title Standards

Every page must start with a level-1 heading on line 1.

**Walkthroughs** use the prefix "Walkthrough:":
```
# Walkthrough: Terrain and Caves
```

**Guides** use the prefix "Guide:":
```
# Guide: Understanding Basic Terrain Generation
```

**Reference and glossary pages** use plain titles:
```
# Reference
# Glossary
```

**Top-level pages** use plain titles:
```
# Getting Started with TerraNova
# Troubleshooting
```

---

## Walkthrough Marker

Walkthroughs must include `<!-- walkthrough -->` on line 3 (after the title and a blank line). This enables the step-mode UI in the docs panel.

```
# Walkthrough: My Title

<!-- walkthrough -->

Content starts here.
```

---

## Node Graph Blocks

Use fenced code blocks with the language `nodegraph` for all node diagrams. The block must contain valid JSON.

**Minimal diagram:**

```
```nodegraph
{
  "height": 140,
  "nodes": [
    { "id": "a",   "label": "NodeName",   "category": "terrain", "x": 0,   "y": 40 },
    { "id": "out", "label": "Terrain Out","category": "output",  "x": 220, "y": 40 }
  ],
  "edges": [
    { "from": "a", "to": "out", "label": "density" }
  ]
}
```
```

**With walkthrough steps** -- the first step is shown on load, zoomed in to its node:

```
```nodegraph
{
  "height": 140,
  "nodes": [...],
  "edges": [...],
  "steps": [
    { "nodeId": "a",   "text": "Explain this node." },
    { "nodeId": "out", "text": "Explain the output." }
  ]
}
```
```

**Node categories** (controls diagram color):

| Category | Use for |
|----------|---------|
| `terrain` | Noise nodes, BaseHeight, axis nodes |
| `generative` | Noise generators |
| `filter` | CurveMapper, Normalizer, YSampled |
| `math` | Sum, Min, Max, Mix, Inverter |
| `position` | YValue, XValue, ZValue |
| `shape` | Ellipsoid, Cylinder, Plane, Cuboid |
| `output` | Terrain Out |
| `material` | Material provider nodes |
| `biome` | Biome nodes |

---

## Node Name Rules

**Only use node names that exist in the Hytale engine bundle.** Using names that are TerraNova-only will confuse readers trying to build working worlds.

Key correct names:

| Wrong | Correct |
|-------|---------|
| `CurveFunction` | `CurveMapper` |
| `Negate` | `Inverter` |
| `MinFunction` / `MaxFunction` | `Min` / `Max` |
| `CoordinateX/Y/Z` | `XValue` / `YValue` / `ZValue` |
| `Blend` | `Mix` |
| `ConstantDensity` | `Constant` |
| `FractalNoise2D` | `SimplexNoise2D` with `Octaves` |
| `DomainWarp2D` | `GradientWarp` |
| `VoronoiNoise2D` | `CellNoise2D` |
| `HeightGradientMaterial` | `SpaceAndDepth` with layers |

If a node only exists in the editor and not in the bundle, note it clearly as editor-only and non-exportable.

---

## Writing Style

- **No em-dashes.** Use double hyphens (--) for an aside, or rewrite the sentence.
- **American English** spelling: color, center, behavior.
- **Short sentences.** One idea per sentence.
- **Lead with what, then why.** Tell the reader what a node does before explaining when to use it.
- **Use tables** for tuning parameters and reference lists.
- **Use blockquotes** for tips, key insights, and warnings.
- **Avoid "simply", "just", "easy".** These words are unhelpful to beginners who find it hard.

---

## Links

Use relative paths for all internal links:

```markdown
[Node Combinations](../guides/world/node-combinations.md)
[Walkthrough: Terrain and Caves](./terrain-and-caves.md)
[Getting Started](../getting-started.md)
```

External links open in a new tab automatically.

---

## Submitting

1. Copy the relevant writing template from [templates/](./templates/README.md).
2. Follow the naming and title standards above.
3. Check every node name against the bundle.
4. Remove all template comments before submitting.
5. Open a pull request or reach out via Discord.
