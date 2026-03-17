# Quickstart: Build Your First Pack

This walkthrough gets you from **nothing** to a working TerraNova pack in minutes.

## 1) Create a new project

1. Open TerraNova.
2. Click **New Project**.
3. Choose an empty folder for your pack (e.g. `MyPack`).
4. Select a template (Void is a good minimal starting point).

## 2) Explore the layout

- **Left panel**: your pack files (biomes, environments, etc.)
- **Center**: node editor (where you build the terrain graph)
- **Right panel**: properties + docs
- **Bottom**: preview controls (2D heightmap / 3D voxel)

## 3) Open a biome and edit terrain

1. Open `Server/HytaleGenerator/Biomes/` in the left tree.
2. Click a biome file (e.g., `Env_Zone1.json`).
3. The graph in the center is the density function. Drag nodes, wire them, and watch the preview update.

## 4) Save your work

- Press **Ctrl+S** to save the current file.
- Use **File → Export Asset Pack** to generate a zip you can load into a server.

---

## Next steps

- Try the **Sky Islands** walkthrough to build a full floating-island biome.
- Read the **Reference** section for details about specific node types.
