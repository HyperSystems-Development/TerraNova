# Walkthrough: Create a World

<!-- walkthrough -->

This walkthrough takes you from a blank project to a working world with terrain, a biome, and saved output. Each step builds on the previous one.

## Step 1 — Create a New World

1. Click **File → New World** in the top menu bar.
2. Give your world a name and choose a save location.
3. Select **Blank World** to start from scratch, or pick one of the starter templates if available.

> The world project folder contains a `World.json` that defines your biome list, noise selector, and framework constants. You'll rarely edit it by hand — the editor handles it.

## Step 2 — Open the Node Editor

1. The **Node Editor** opens automatically with a new world. If it's closed, look for the **Node Editor** tab at the top of the workspace.
2. You'll see an empty canvas with a single **Terrain Out** node — this is the required output every terrain graph must connect to.
3. Pan by holding **middle-mouse** and dragging. Zoom with the **scroll wheel**.

> `Terrain Out` expects a density value. Positive = solid block, zero or negative = air.

## Step 3 — Build Your First Terrain Graph

The simplest possible terrain: a flat ground plane at Y=64.

1. Right-click the canvas → **Add Node** → **Terrain** → **BaseHeight**.
2. In the properties panel, set `BaseHeightName` to the name of your configured base height (e.g. `"surface"`) and leave `Distance` unchecked.
3. Drag the output pin of `BaseHeight` to the input of `Terrain Out`.
4. Click **Generate** (toolbar or Ctrl+G) to preview. You should see a flat plane.

Now add surface variation:

5. Right-click → **Add Node** → **Noise** → **SimplexNoise2D**.
6. Set `Scale` to `0.01` and `Octaves` to `3`.
7. Right-click → **Add Node** → **Math** → **Sum**.
8. Connect `BaseHeight` → `Sum`, connect `SimplexNoise2D` → `Sum`, then connect `Sum` → `Terrain Out`.
9. Click **Generate** again. The terrain now has rolling hills.

```nodegraph
{
  "height": 200,
  "nodes": [
    { "id": "bh",  "label": "BaseHeight",    "category": "terrain", "sub": "Y = 64",       "x": 0,   "y": 30 },
    { "id": "sn",  "label": "SimplexNoise2D","category": "terrain", "sub": "Scale 0.01",   "x": 0,   "y": 130 },
    { "id": "sum", "label": "Sum",           "category": "math",                            "x": 220, "y": 80 },
    { "id": "out", "label": "Terrain Out",   "category": "output",                          "x": 420, "y": 80 }
  ],
  "edges": [
    { "from": "bh",  "to": "sum" },
    { "from": "sn",  "to": "sum" },
    { "from": "sum", "to": "out", "label": "density" }
  ]
}
```

## Step 4 — Assign a Material

Terrain is solid, but every block is the same material until you add a **Material Provider**.

1. Right-click → **Add Node** → **Material** → **SpaceAndDepth** (or another type from the Material category).
2. In the properties panel, add `ConstantThickness` layers — set the top layer to **Grass** and a lower layer to **Stone**.
3. Connect `SpaceAndDepth` to the **Material** input on `Terrain Out`.
4. Generate to see block types applied.

> If you only see density shape in the preview and not block colors, make sure your preview mode is set to **Blocks** not **Density** (toggle in the toolbar).

## Step 5 — Save Your World

- Use **File → Save** (Ctrl+S) to write the world project.
- The world is saved as a folder containing `World.json`, your biome assets, and any referenced density assets.
- Use **File → Export** to produce the final output files for use in Hytale.

---

> **Next:** Read the [Biome System guide](../guides/biome-system.md) to add multiple biomes with transitions, or the [Node Combinations guide](../guides/node-combinations.md) to learn common terrain patterns.
