# Understanding How Nodes Affect Terrain (TerraNova)

This guide is designed to help you **understand what each node does** and **how changing its inputs changes the terrain**. It describes the major node categories in TerraNova and gives practical tips for exploring them in the editor.

---

## 1) Core Concept: Graph = Terrain Function

TerraNova represents terrain as a **directed graph** of nodes. Each node is a small computation, and the graph is evaluated at each sample point to produce a density value (terrain surface) and other terrain outputs (materials, shapes, etc.).

### The Big Picture

- **Density functions** determine whether a point is solid (inside ground) or empty (air).
- **Material providers** assign block/texture types to solid regions.
- **Curves** and **patterns** provide reusable math shapes used by many density/material nodes.
- **Positions** define where objects or features should spawn relative to the terrain.

In TerraNova, the **"output" node** is usually the rightmost object in a density graph. The nodes upstream from it compute intermediate values.

---

## 2) Node Categories (and what they do)

### 🔹 Density Nodes (Terrain Shape)
These are the core building blocks for terrain contours.

- **Blend**: Mixes two density inputs together. Use it to create transitions between two different terrain shapes.
- **Add / Subtract / Multiply / Divide**: Arithmetic operations between densities. Useful for carving shapes or forming ridges.
- **Noise / Perlin / Simplex / Cell**: Generate procedural noise patterns. Often the backbone for natural terrain.
- **Slope / Height / Distance**: Compute values based on position (e.g., height from ground, distance from a point).
- **SmoothMin / SmoothMax**: Softly combine shapes to avoid hard seams.

✅ **How to learn:** Drag a density node into your graph, hook it into the output, and watch the live preview update. Adjust its parameters and see the changes instantly.

---

### 🔸 Material Provider Nodes (Surface Appearance)
These nodes decide which block or texture shows up at each point.

- **Layered material** nodes (e.g., `MaterialProvider`, `Blend`) let you stack materials by height or noise.
- **Mask / Selector nodes** choose between materials based on density, slope, noise, or other inputs.
- **Tint / Color nodes** adjust visual output in the voxel preview (useful for debugging material layers).

✅ **Tip:** Toggle the material legend and watch how material regions shift when you tweak masks or noise inputs.

---

### 🟣 Curve Nodes (Re-mapping & Shaping)
Curves are used everywhere to remap values.

- **Manual Curve** lets you draw a custom mapping from `[0..1]` to `[0..1]`.
- **Preset curves** like `InverseLerp`, `SmoothStep`, etc. are quick math helpers.

Use curves to:
- Sharpen or soften transitions
- Bias noise toward peaks/valleys
- Control falloff (e.g., slope-to-rock transitions)

---

### 🟢 Positions & Scanners (Feature Placement)
These nodes are about *where* things happen:

- **Positions**: standard 3D points (often used for spawning objects).
- **Scanner** nodes evaluate properties at a location (e.g., slope, height).
- **Spread** / **Distribution** nodes let you scatter elements based on rules.

---

### 🟠 Patterns (Masks & Splits)
Patterns work like stencils for materials/effects.

- **Voronoi / Checker / Stripes**: generate repeatable patterns.
- **Mask** nodes use these patterns to carve material bands, roads, rivers.

---

## 3) Quick “What happens if I change this?” (Hands-on learning)

### ✅ Try this experiment:
1. Start with a terrain template (e.g., `Void` or `Forest`)
2. Find the **main density root** (the final density node feeding output)
3. Insert a `Noise` node before it (drop it on a wire, or use the palette)
4. Observe the preview as you tweak the noise scale/intensity

**What you’re learning:** The density root is the final decision of “solid vs empty.” Adding noise adds detail (bumps, hills).

### ✅ Try another:
1. Find the material provider graph (often a separate subgraph)
2. Toggle `Mask` / `Blend` nodes and watch the material distribution change

**What you’re learning:** Material nodes don’t affect height; they affect the “cover” of the surface.

---

## 4) Documenting It (What I just added to the repo)
I created a new tutorial doc that explains node categories and how to explore them:

- `docs/tutorials/NODE_EFFECTS.md`

It includes:
- A breakdown of the node categories
- Key examples of how nodes change the terrain
- Recommended learning steps (live experimentation)

---

## ✅ What you can do next (in-app practice)
- Use the **“Compare View”** to toggle between two versions of your graph and see exactly how a node tweak changes the terrain.
- Use the **Voxel Preview** + **Material Legend** to see which nodes are controlling which blocks.
- Experiment with a single node change, then **undo/redo** to see the exact effect.

If you want, I can also add a “node glossary” view directly inside TerraNova (e.g., hover a node type and see a short description) so users can learn without leaving the app. Would you like that? (It’s a small UX feature.)

---

## 5) Combining nodes to build specific terrain types
In TerraNova, terrain comes from **combining node building blocks**. Most real Hytale terrain is created by layering shapes, masks, and noise.

### 🏔 Mountains / ridges
A common pattern:
1. Start with a **Height** node (vertical gradient).
2. Add **Noise** (Perlin/Simplex) to introduce bumps.
3. Use **SmoothMin** (or **SmoothMax**) to blend the height shape with a base plane or other ridges.
4. Use a **Curve** node to adjust steepness and plateau behavior.

### 🌋 Caves / caverns
A classic approach:
1. Build a base terrain (Height + Noise).
2. Create a "cave mask" using 3D noise or cell noise.
3. Subtract that mask from the base (using `Subtract` or `SmoothMin`).

### 🌊 Beach / cliff transitions
Use slope and height masks:
1. Compute surface slope with a **Slope** node.
2. Compute sea-level height with **Height**.
3. Blend materials based on slope/height (e.g. sand on flats, rock on steep).

---

## 6) Using real Hytale biome nodes as reference
When you open a Hytale biome JSON in TerraNova, you can inspect its exact node graph.

### How to use it:
1. Open a biome file (e.g. `Server/HytaleGenerator/Biomes/*.json`).
2. Select the **Terrain** section to see the density graph.
3. Identify which nodes make the shapes you like (e.g., `Noise`, `SmoothMin`, `Height`, `Slope`).

### Copying “recipes” from a biome
- Select the nodes you want (Ctrl+click), copy, then paste into your own graph.
- Rewire and tweak inputs to customize the effect.

---

## 7) Quick build-along exercises
- **Forest hill**: Height + low-frequency noise + slope mask for rock.
- **Sharp peak**: Height + SmoothMax + curve.
- **Cave system**: Base terrain - noisy cave mask.

---

## 8) Want a built-in node glossary?
I can add a small in-app panel that shows a short description for the currently selected node (e.g., what `SmoothMin` does). This makes learning faster without leaving TerraNova.
