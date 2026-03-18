# Walkthrough: [Your Title Here]

<!-- walkthrough -->

<!--
  WALKTHROUGH TEMPLATE
  Use this file as a starting point for a new step-by-step tutorial.

  Walkthroughs guide the reader through a real task from start to finish.
  Each step builds on the previous. The reader should be able to follow along
  in the editor and have something working at the end.

  The "<!-- walkthrough -->" comment above enables the step-mode UI in the docs panel.
  Keep it on line 3 -- do not remove it.

  Checklist before submitting:
  - Only use node names that exist in the Hytale engine bundle (terranova-bundle.json)
  - No em-dashes -- use double hyphens (--) instead
  - Add steps arrays to nodegraph blocks for interactive walkthroughs
  - Each step should produce a visible change in the editor preview
  - Include a tuning table for any configurable parameters
  - Links to other docs use relative paths
  - Remove all comments before submitting
-->

One sentence describing what the reader will build and what they will know by the end.

> **Difficulty:** Beginner | Intermediate | Advanced

---

## Step 1 -- [First Action]

Tell the reader what they are building in this step and why.

1. Add **NodeName** (Category in the node palette).
2. Set `FieldName` to `value`.
3. Connect `NodeA` -> `NodeB`.
4. Click **Generate**. You should see [describe what appears].

```nodegraph
{
  "height": 140,
  "nodes": [
    { "id": "a",   "label": "NodeA",      "category": "terrain", "sub": "optional note", "x": 0,   "y": 40 },
    { "id": "out", "label": "Terrain Out","category": "output",                          "x": 240, "y": 40 }
  ],
  "edges": [
    { "from": "a", "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "a",   "text": "Explain what this node does and why it is the first step." },
    { "nodeId": "out", "text": "Explain what Terrain Out does with the value it receives." }
  ]
}
```

> Key insight or tip about this step.

---

## Step 2 -- [Second Action]

Build on Step 1. Add what changes and why.

1. Add **NodeName**.
2. Connect it to the existing graph.
3. Adjust `FieldName` to `value`.

```nodegraph
{
  "height": 180,
  "nodes": [
    { "id": "a",   "label": "NodeA",      "category": "terrain", "sub": "from Step 1",   "x": 0,   "y": 20  },
    { "id": "b",   "label": "NodeB",      "category": "math",    "sub": "new this step", "x": 0,   "y": 110 },
    { "id": "sum", "label": "Sum",        "category": "math",                            "x": 240, "y": 65  },
    { "id": "out", "label": "Terrain Out","category": "output",                          "x": 440, "y": 65  }
  ],
  "edges": [
    { "from": "a",   "to": "sum" },
    { "from": "b",   "to": "sum" },
    { "from": "sum", "to": "out", "label": "density" }
  ],
  "steps": [
    { "nodeId": "a",   "text": "This is the anchor from Step 1. It still defines the baseline." },
    { "nodeId": "b",   "text": "This is the new node. Explain what it contributes." },
    { "nodeId": "sum", "text": "Sum combines the two contributions. The result is fed to the output." },
    { "nodeId": "out", "text": "The final density reaches Terrain Out. Click Generate to see the change." }
  ]
}
```

**Tuning guide:**

| Parameter | Effect |
|-----------|--------|
| Lower `FieldName` | Describe the result |
| Higher `FieldName` | Describe the result |

---

## Step 3 -- [Third Action]

Continue building. Aim for a working, testable result by the end of this step.

---

## Summary

| Goal | Nodes used |
|------|-----------|
| What Step 1 achieved | `NodeA` -> `Terrain Out` |
| What Step 2 achieved | `NodeA` + `NodeB` -> `Sum` |
| What Step 3 achieved | Add what you used |

> **Next:** Link to what the reader should do next -- e.g. [Biome System guide](../guides/world/biome-system.md) or [Node Combinations](../guides/world/node-combinations.md).
