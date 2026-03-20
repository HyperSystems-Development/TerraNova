# Quickstart: Build Your First Pack

<!-- walkthrough -->

This walkthrough gets you from **nothing** to a working TerraNova pack in a few small steps.

If you are brand new, treat this as a guided tour:
- make a project
- open one biome
- change one terrain value
- save once

You do not need to understand every node yet. The goal is to leave this page knowing where terrain lives and how to make a safe first edit.

## 1) Create a new project

1. Open TerraNova.
2. Click **New Project**.
3. Choose an empty folder for your pack (e.g. `MyPack`).
4. Select a template (Void is a good minimal starting point).

You should now have a project on disk with the standard TerraNova folder layout.

## 2) Explore the layout

- **Left panel**: your pack files (biomes, environments, etc.)
- **Center**: node editor (where you build the terrain graph)
- **Right panel**: properties + docs
- **Bottom**: preview controls (2D heightmap / 3D voxel)

If the workspace feels busy, focus on only three things for now: the file tree, the center graph, and the preview.

## 3) Open a biome and edit terrain

1. Open `Server/HytaleGenerator/Biomes/` in the left tree.
2. Click a biome file (e.g., `Env_Zone1.json`).
3. The graph in the center is the density function.
4. Select a `Constant`, `BaseHeight`, or terrain noise node if one exists.
5. Make one small change:
   - raise or lower a `Constant` height value by `8-16`, or
   - lower a noise `Scale` to make features broader
6. Watch the preview update.

Small edits are easier to understand than rebuilding the graph immediately.

## 4) Save your work

- Press **Ctrl+S** to save the current file.
- Use **File → Export Asset Pack** to generate a zip you can load into a server.

If the edit looked worse, undo it, try one smaller value change, and save again once the preview makes sense.

---

## Next steps

- Try the [Sky Islands walkthrough](./sky-islands-walkthrough.md) if you want a full guided biome build with curve previews and step-by-step reasoning.
- Open [Terrain Types](../reference/terrain-types.md) if you want ready-made graph shapes you can copy into the editor.
- Read the [Reference](../reference/index.md) section only when you need details about a specific node type.
