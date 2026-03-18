# Guide: [Your Title Here]

<!--
  GUIDE TEMPLATE
  Use this file as a starting point for a new concept guide or deep-dive.

  Guides explain *how* or *why* something works -- theory, patterns, and reference.
  They are not step-by-step tutorials. For step-by-step content, use the walkthrough template.

  Checklist before submitting:
  - Only use node names that exist in the Hytale engine bundle (terranova-bundle.json)
  - No em-dashes (--) -- use double hyphens (--) instead
  - All nodegraph blocks use valid JSON
  - Links to other docs use relative paths (e.g. ../guides/world/node-combinations.md)
  - Remove all comments before submitting
-->

**Difficulty:** Beginner | Intermediate | Advanced

One sentence summary of what this guide covers and who it is for.

---

## Section 1 -- [Topic Name]

Explain the concept clearly. Lead with what it is, then explain why it matters.

Use plain language. Avoid jargon unless you define it inline.

> Tip or callout text goes in blockquotes like this.

---

## Section 2 -- [Topic Name]

### Sub-section if needed

Use sub-sections when a topic has multiple distinct parts.

### Node Graph Example

Use a `nodegraph` fenced block to show how nodes connect. Keep it focused -- one concept per diagram.

```nodegraph
{
  "height": 160,
  "nodes": [
    { "id": "a",   "label": "NodeA",      "category": "terrain", "sub": "optional note", "x": 0,   "y": 50 },
    { "id": "b",   "label": "NodeB",      "category": "math",                            "x": 220, "y": 50 },
    { "id": "out", "label": "Terrain Out","category": "output",                          "x": 440, "y": 50 }
  ],
  "edges": [
    { "from": "a",   "to": "b",   "label": "optional edge label" },
    { "from": "b",   "to": "out", "label": "density" }
  ]
}
```

Node categories control color in the diagram. Use one of:
- `terrain` -- blue/teal, for noise and terrain nodes
- `math` -- teal, for combinators and math nodes
- `filter` -- purple, for CurveMapper, Normalizer, etc.
- `output` -- gold, for Terrain Out and output nodes
- `position` -- green, for axis and position nodes
- `shape` -- rose, for SDF shapes

### Adding a Walkthrough to a Node Graph

Add a `steps` array to give per-node explanations. The reader can step through each node with arrow keys.

```nodegraph
{
  "height": 160,
  "nodes": [
    { "id": "a",   "label": "NodeA",      "category": "terrain", "x": 0,   "y": 50 },
    { "id": "out", "label": "Terrain Out","category": "output",  "x": 220, "y": 50 }
  ],
  "edges": [
    { "from": "a", "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "a",   "text": "Explain what NodeA does and why it is here." },
    { "nodeId": "out", "text": "Explain what happens at this final node." }
  ]
}
```

---

## Section 3 -- [Tuning / Reference]

Tables are great for tuning references.

| Parameter | Effect |
|-----------|--------|
| Lower value | What happens |
| Higher value | What happens |

---

## Common Mistakes

List the mistakes beginners make with this topic.

- **Mistake**: What goes wrong and how to fix it.
- **Mistake**: What goes wrong and how to fix it.

---

> **Next:** Link to related docs -- e.g. [Node Combinations](../guides/world/node-combinations.md) or [Walkthrough: Terrain and Caves](../walkthroughs/terrain-and-caves.md).
