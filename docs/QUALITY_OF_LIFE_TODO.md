# Quality of Life Ideas

Legend: `[x]` = shipped, `[ ]` = not started, `[~]` = partial / in progress

---

## Docs panel

- [x] **Curve previews in docs** (`curve:` fence renders live CurveCanvas read-only). Shipped in da5a736.
- [x] **Bounds visualizer** (`bounds:` fence renders min/max range bar). Shipped in da5a736.
- [x] **Terrain snippet browser** (`snippet:` fence renders labelled, difficulty-badged, copyable JSON block). Shipped this session.
- [x] **Scroll position preserved when switching to Properties panel** (both panels always mounted, hidden via CSS). Shipped in da5a736.
- [x] **Ctrl+\` toggles Properties/Docs** with title hint. Shipped in da5a736.
- [x] **Properties panel empty state links to Docs.** Node header has quick book-icon shortcut. Shipped in da5a736.
- [x] **Reading progress bar** at top of doc content. Shipped in 039c2ff.
- [x] **Per-doc settings** (difficulty tags, compact tree, progress bar). Shipped in cf36834.
- [x] **mdComponents stable across navigation** (selectedSlugRef prevents full ReactMarkdown remount on every nav). Shipped this session.
- [x] **Terrain curve presets in CurveCanvas** (second "Terrain:" row with 10 shape presets). Shipped in f5ba874.
- [x] **Terrain types catalog** with difficulty labels, curve previews, bounds, and copyable snippets. Shipped in 0b1ec2a + this session.
- [ ] **`nodegraph:` fence live-edit mode** — clicking a node in a DocNodeGraph should pop open its Properties panel row so users can experiment directly from the docs.
- [ ] **Inline "try this" button on snippets** — one-click to open snippet as a new biome tab in the editor (or paste into focused graph).
- [ ] **Related docs panel** — sidebar section showing docs that link to or from the current doc, built from the backlink index already computed.
- [ ] **Keyboard nav in docs sidebar** — arrow keys to move between entries, Enter to open, so mouse-free browsing is possible.
- [ ] **Search highlight** — when a search term navigates to a doc, scroll to and highlight the first match in the content area.

---

## Properties panel

- [x] **ToggleField keyboard support** (Space/Enter, role="switch", aria-pressed). Shipped in 308218c.
- [x] **FieldTooltip keyboard accessible** (tabIndex, focus/blur hover). Shipped in 308218c.
- [x] **ColorPickerField invalid hex feedback** (red border + "invalid hex" on blur). Shipped in 308218c.
- [x] **DropdownField custom chevron** (appearance-none + SVG overlay). Shipped in 308218c.
- [x] **ArrayField two-step delete confirmation** (Yes/No inline). Shipped in 308218c.
- [x] **RangeField inverted-min warning** (amber tint + icon). Shipped in 308218c.
- [x] **SliderField clamp flash** (amber border 600ms when typed value is out of range). Shipped in 308218c.
- [x] **VectorField axis hover color** (red/green/blue border per axis on hover). Shipped in 308218c.
- [x] **MaterialField compact palette** (small tile buttons instead of tall rows). Shipped in 308218c.
- [ ] **Copy node fields as JSON** button in the Properties header — exports just the current node's field values as JSON (not the full subgraph) for quick manual editing.
- [ ] **Field search / filter** — a small search box at the top of the Properties panel to filter visible fields by name. Useful for nodes with many fields.
- [ ] **"Reset to default" per field** — right-click a field label to reset to schema default. Currently requires manual entry.
- [ ] **Collapse field groups** — fold related fields (e.g., all Warp* fields on FastGradientWarp) under a disclosure triangle to reduce scroll.

---

## Node graph

- [x] **Node interjection** (drag onto wire inserts node in-place). Shipped in 0.1.5.
- [x] **Knife tool** (Ctrl+Shift drag cuts wires). Shipped in 0.1.4.
- [x] **SVG export** (Ctrl+Shift+G). Shipped in 0.1.4.
- [x] **Terrain liveness tracking** (live node contribution highlights). Shipped in 2e71961.
- [x] **Node renaming** (context menu rename). Shipped in f470070.
- [x] **Comment / frame nodes** (visual grouping). Shipped in 6018935.
- [x] **Compound inputs** (dynamic Sum/Product/etc. handle expansion). Shipped in 0.1.4.
- [x] **Backward wire drag** (drag from input port opens QuickAdd). Shipped in 0.1.4.
- [ ] **Multi-node copy as snippet** — select a region of nodes, right-click "Copy as Hytale JSON" produces a self-contained density snippet. Different from single-node copy; this walks the subgraph.
- [ ] **Node palette search** remembers the last-used category so reopening it lands on the same spot.
- [ ] **Wire route override** — right-click a wire to choose orthogonal/curved/direct routing style for that edge only.
- [ ] **"What uses this node?"** — hover a node's output handle to see all downstream consumers highlighted in the graph.

---

## Validation panel

- [ ] **Biome-level issue navigation** — clicking a biome-level issue jumps to that section, not just graph nodes.
- [ ] **One-click auto-fixes** for safe diagnostics (delimiter sorting, missing defaults, simple ref cleanup).
- [ ] **Project-wide legacy node scanner** — scan all `.json` files in the pack for legacy node types, show a collapsible "Project-wide" breakdown in the validation panel. Per-file open-and-fix only (no bulk replace).
- [ ] **Amber dot badge** on file tree entries that have legacy node hits.

---

## Weather / environment editors

- [x] **Weather forecast editor** (hourly editor, track summaries, collapsible drawers). Shipped in 0.1.6.
- [x] **Environment editor** (current-hour controls, hourly editing, linked file navigation). Shipped in 0.1.6.
- [x] **Clickable asset file paths** open directly in editor. Shipped in 0.1.6.
- [ ] **Drag-and-drop timeline for weather types** in the forecast editor.
- [ ] **Weather preset browser** — import/export named weather patterns.
- [ ] **TintProvider density parameters editable** from the AtmosphereTab tint section without requiring node graph access (see mccal_todo.md for detail).
- [ ] **Weather forecast hour buckets visible** in the AtmosphereTab so users can see the full day/night schedule at a glance.
- [ ] **`EnvironmentProvider {}` empty object shows "uses server default" label** in the graph and AtmosphereTab instead of blank.
- [ ] **Export environment name collision warning** — validate the sanitized `Env_*` filename doesn't already exist in the pack.

---

## File / asset management

- [x] **Block/material autocomplete** (BlockTypeList in node inputs). Shipped previously.
- [x] **Biome browser search and validation** (rich template entries, one-click fixes). Shipped in 0.1.6.
- [ ] **Right-click any file in left pane to open in File Explorer** (reveal in OS).
- [ ] **File tree semantic icons** — `getFileIcon()` parallel to `getFileColor()` returning lucide icons for environment/weather/biome/material/etc. files. See mccal_todo.md Pass 1B.
- [ ] **Asset Tools "Referenced Assets" row icons** — kind-specific lucide icons next to status dot. See mccal_todo.md Pass 1A.
- [ ] **Detailed error info for failed asset pack loads** with auto-fix suggestions for common UTF-8 and schema issues.

---

## Material / voxel preview

- [ ] **Voxel preview shows all materials** with add/remove options.
- [ ] **Material compliance checker** — flags material assignments that don't match Hytale worldgen rules.
- [ ] **Biome browser inline tint swatch** — read TintProvider.Delimiters colors on load and show a color preview strip beside each biome.
- [ ] **Biome browser environment resolution** — show which `Env_*` the biome resolves to beside each project biome entry.

---

## Docs content (future)

- [x] **Getting started rewrite** with UI layout, density concept, keyboard shortcuts. Shipped in da5a736.
- [x] **Reading the Node Graph guide** (6 patterns, debug workflow, color legend). Shipped in da5a736.
- [x] **Curves reference** (all 12 types with live previews and Min/Max explanations). Shipped in da5a736.
- [x] **Node Effects reference** (tables, terrain patterns, quick-pick guide). Shipped in da5a736.
- [x] **Terrain Types catalog** (12 terrain types, snippets, curves, difficulty labels). Shipped in 0b1ec2a.
- [ ] **Tint system guide** — explain the 2D tint limitation, density-proxy workaround, SliderDensity pattern, and dual-sample slope trick. Content is already in mccal_todo.md; needs to become a doc page.
- [ ] **Environment inheritance guide** — explain `Parent` field, zone/cave/unique inheritance trees, safe defaults. Content is in mccal_todo.md.
- [ ] **Props and placement guide** — prop density functions, scanner nodes, Occurrence/Jitter2d, placement conditions.
- [ ] **Materials guide** — Assignment, Pattern:Mask, depth-based layering, tintable materials.
- [ ] **Quickstart** polish pass — currently sparse, could benefit from a first-graph walkthrough matching the new getting-started.md style.
