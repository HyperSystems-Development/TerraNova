# TerraNova

**The offline design studio for Hytale World Generation V2.**

---

## What is it?

TerraNova is a free, open-source desktop app for building V2 worldgen asset packs — no running server, no internet, no mods required. Open it, design your world, export valid JSON, drop it in your server's mods folder.

## What does it solve?

If you've used Hytale's in-game V2 editor, you know the pain: wire crossings everywhere once you hit 40+ nodes, no way to organize large graphs, no templates to start from, and you need the game running the whole time. If you've tried hand-writing JSON, you know how easy it is to break things with a missing field or wrong type.

TerraNova fixes both problems.

## What you get

**Visual Node Editor** — All 200+ V2 types as drag-and-drop nodes with the same color coding you already know (orange = materials, blue = density, green = positions). Auto-layout untangles your graphs. Minimap, search, undo/redo, collapsible groups — everything the in-game editor is missing.

**Live Preview** — See what your density functions actually produce as you tweak sliders. 2D heatmaps and 3D voxel terrain meshes update in real-time, no server needed. Side-by-side comparison view lets you iterate on terrain changes with instant before/after feedback.

**Bridge Integration** — Connect TerraNova to a running Hytale server and push exported asset packs directly, no manual file copying. Design offline, deploy in one click.

**Specialized Editors** — Curve editor with draggable control points. Biome range editor showing where each biome sits on the noise axis. Material layer stack editor. The right tool for each job instead of forcing everything into a node graph.

**Validation** — Catches missing fields, wrong types, and broken references before you ever load on a server. Error badges appear on nodes in real-time with severity indicators so you know exactly what to fix.

**Starter Templates** — Forest, Desert, Mountains, Floating Islands, Eldritch Spirelands, and more. Pick one, customize it, export. You're never starting from a blank canvas.

**Community Templates** — Browse and download templates other creators have shared. Save your own as templates and share them back. All free, all through GitHub.

## How it fits with other tools

TerraNova is for the **design phase** — architect your worldgen offline, iterate fast, get it right. Then load the exported asset pack on your server. It works alongside the in-game editor (for quick tweaks) and HyPaint (for live production editing). They're complementary tools, not replacements for each other.

## Releases

- **v0.1.0** — Initial release with node editor, live preview, templates, and validation
- **v0.1.1** — Windows gray screen fix, biome editor crash fix
- **v0.1.2** — Bridge integration, error boundary improvements, object value rendering fixes

## The details

- **Free forever** — LGPL-2.1 license, open source, zero cost, no telemetry
- **Offline first** — everything works without internet (community templates need a connection to browse)
- **Tiny install** — under 15MB
- **Git-friendly** — outputs clean JSON files you can version control and diff
- **Cross-platform** — macOS, Windows, Linux
- **Built by** [HyperSystems-Development](https://github.com/HyperSystems-Development) — the same team behind HyperPerms, HyperHomes, and HyperFactions
- **Community** — [discord.gg/NHPzsjkQeu](https://discord.gg/NHPzsjkQeu)

---

*Targets Hytale server pre-release 2026.02.05. Schema updates will track new Hytale versions as they release.*
