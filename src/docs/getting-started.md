# Getting Started with TerraNova

This page covers everything you need to know to go from launching the app to having a working world.

If you are new, do these three things first:
1. Open [Quickstart: Build Your First Pack](./walkthroughs/quickstart.md).
2. Make one terrain edit and watch the preview change.
3. Come back here when you need the editor layout or shortcut reference.

---

## Launching the App

- **Desktop:** Open the TerraNova application directly.
- **From source:** Run `pnpm dev` inside the `TerraNova-fork` folder.

---

## The Editor Layout

When a world is open, the workspace is split into three panels:

| Panel | Location | What it does |
|-------|----------|-------------|
| **Left sidebar** | Left edge | Node palette, bookmarks, history, validation |
| **Node canvas** | Centre | Your density/material node graph — this is where you build |
| **Right panel** | Right edge | Properties for the selected node, or Docs (this panel) |

Toggle panels with **Ctrl+[** (left) and **Ctrl+]** (right). Maximise just the canvas with **Ctrl+\\**.

The toolbar above the canvas controls the preview mode. Click **P** to cycle between graph-only, preview-only, and split view.

---

## Opening or Creating a World

- **New world:** `Ctrl+N` or **File → New World**. Choose blank or a starter template.
- **Open existing:** `Ctrl+O` or **File → Open Asset Pack** to load a `.world` file.
- **Save:** `Ctrl+S`. Save a copy with `Ctrl+Shift+S`.

---

## The Node Canvas

The canvas is where you build your world generation graph. Every node takes inputs and produces an output — chain them together to define terrain shape, materials, and props.

**Navigating the canvas:**
- **Pan** — middle-mouse drag, or hold Space and drag
- **Zoom** — scroll wheel
- **Fit view** — `Ctrl+1`
- **Reset zoom** — `Ctrl+0`

**Adding nodes:**
- Press **Tab** or **Shift+A** to open Quick Add — type a node name and press Enter
- Right-click the canvas for the context menu
- Drag from the left panel's node palette

**Selecting and editing:**
- Click a node to select it — its properties appear in the right panel
- **Ctrl+A** selects all nodes
- **Ctrl+D** duplicates the selection
- **Ctrl+Z** / **Ctrl+Shift+Z** to undo / redo
- **L** auto-layouts all nodes. **Shift+L** layouts only selected nodes.

**Connecting nodes:**
- Drag from an output pin (right side of a node) to an input pin (left side of another)
- Hover a pin to see its name and expected type
- Press **?** to toggle help mode — shows field descriptions on every node

---

## The Preview Panel

Switch to preview mode (**P**) to see what your graph produces. Three preview types are available in the toolbar:

| Mode | What it shows |
|------|-------------|
| **2D heatmap** | Top-down density map with contour lines and hill-shading |
| **3D terrain** | Heightfield rendered in 3D with lighting and fog |
| **Voxel** | Full block-by-block 3D render matching Hytale's appearance |

Click **Generate** (or it updates live if auto-generate is on) to see your changes.

Toggle inline node previews — small thumbnails on each node — with **T**.

---

## Keyboard Shortcuts Reference

### Canvas
| Shortcut | Action |
|----------|--------|
| `Tab` or `Shift+A` | Quick Add node |
| `Ctrl+F` | Search nodes |
| `Ctrl+A` | Select all |
| `Ctrl+T` | Toggle root node |
| `Ctrl+PageUp` | Select upstream nodes |
| `Ctrl+PageDown` | Select downstream nodes |

### Edit
| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+X / C / V` | Cut / Copy / Paste |
| `Ctrl+D` | Duplicate |
| `Ctrl+G` | Group selected |
| `L` | Auto-layout all |
| `Shift+L` | Auto-layout selected |
| `Ctrl+Shift+L` | Tidy up |

### File
| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New project |
| `Ctrl+O` | Open asset pack |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save as |
| `Ctrl+W` | Close project |
| `Ctrl+E` | Export current JSON |
| `Ctrl+Shift+E` | Export asset pack |
| `Ctrl+Shift+G` | Export SVG |

### View
| Shortcut | Action |
|----------|--------|
| `P` | Cycle view mode |
| `T` | Toggle inline previews |
| `V` | Toggle split direction |
| `G` | Toggle grid |
| `Shift+G` | Toggle snap |
| `Ctrl+0` | Reset zoom |
| `Ctrl+1` | Fit view |
| `Ctrl+2` | Zoom to selection |
| `Ctrl+[` | Toggle left panel |
| `Ctrl+]` | Toggle right panel |
| `Ctrl+\\` | Maximize editor |
| `Ctrl+B` | Bridge (live Hytale connection) |
| `Ctrl+,` | Preferences |
| `?` | Toggle help mode |

### Bookmarks
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+1–9` | Save current viewport to bookmark slot |
| `Alt+1–9` | Jump to bookmark slot |

---

## Next Steps

- **[Walkthrough: Create a World](./walkthroughs/create-a-world.md)** — build your first world step by step
- **[Walkthrough: Terrain and Caves](./walkthroughs/terrain-and-caves.md)** — shape hills, mountains, and carve cave systems
- **[Guide: Understanding Basic Terrain](./guides/understanding-basic-terrain-generation.md)** — how density and noise work together
- **[Glossary](./glossary/README.md)** — definitions for every node type and term
