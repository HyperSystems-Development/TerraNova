# TerraNova — Implementation Roadmap

**Version:** 2.0
**Date:** 2026-02-13
**Organization:** HyperSystems-Development

---

## Overview

TerraNova is a visual worldgen design studio for Hytale. Phases 1–4 shipped in v0.1.0 (Feb 13, 2026), delivering the full node graph editor, sub-editors, preview engine, and bridge integration. This roadmap tracks remaining work from the original plan alongside new feature phases driven by community feedback.

```
Phases 1–4 ✅ ──→ Phase 4.8 ──→ Phase 6 ──→ Phase 7
(v0.1.0–v0.1.2)   Validation     Graph QoL    Preview Tools
       │                              │
       ├──→ Phase 5 ─────────────────→│
       │    Templates                  │
       │                               │
       ├──→ Phase 8 ──────────────────→│
       │    Material & Asset UX        │
       │                               │
       └──→ Phase 9
            Distribution & Stability
```

**Target Hytale Version:** Pre-release `2026.02.05-9ce2783f7`

---

## Phase 1: App Shell + Asset Pack I/O ✅

**Shipped in v0.1.0.** Tauri v2 + React + TypeScript desktop application with dark-themed resizable panel layout, Rust-backed schema definitions for all 200+ V2 asset types, full asset pack I/O (open, browse, edit, save), auto-generated property panels with inline validation, and bundled project templates. The "New Project" wizard supports Void, Blank, Forest Hills, Eldritch Spirelands, and Shattered Archipelago templates.

---

## Phase 2: Node Graph Editor ✅

**Shipped in v0.1.0.** React Flow–based visual node graph with 50+ custom node components across all V2 categories (density, curve, material, pattern, position, prop, scanner, vector, environment, assignment). Zustand state management with persistent undo/redo, bidirectional JSON sync (graph ↔ V2 JSON), categorized node palette with search/drag-to-add, auto-layout via dagre, minimap, keyboard shortcuts, collapsible groups, copy/paste, multi-select, cursor-tracking quick-add panel, snap-to-grid, and connection validation with cycle detection.

---

## Phase 3: Specialized Sub-Editors ✅

**Shipped in v0.1.0.** Purpose-built editors for every V2 subsystem: biome range editor with draggable range blocks, biome section editor with multi-tab editing (terrain, materials, props, environment), interactive curve editor with drag-to-edit control points and computed curve previews, material layer stack with V1/V2 auto-detection and drag-to-reorder, prop placement visualizer with 2D canvas and seeded PRNG evaluation, bidirectional Hytale export translation layer (26 type mappings, round-trip tested with 9 real biome files), and settings panel editor.

---

## Phase 4: Preview Engine ✅ (except 4.8)

**Shipped in v0.1.0.** Full preview pipeline: TypeScript Web Worker–based noise evaluation (simplex + cell noise), density graph evaluator (50+ of 68 types), progressive-resolution sample grid (16³→128³), 2D heatmap with 7+ colormaps and pan/zoom/contour/statistics, 3D terrain mesh with height-based coloring and water plane, voxel preview engine with greedy meshing and PBR materials for 50+ block types, inline 64×64 node thumbnails with dirty propagation, and bridge integration for live Hytale server chunk visualization with hot-reload.

**v0.1.1** added error boundaries wrapping the main editor panel. **v0.1.2** added per-node error boundaries and fixed render crashes from object-typed field values.

### Milestone 4.8: Graph-Level Validation & Diagnostics

**Status: TODO** — the only remaining item from Phases 1–4.

**Background:** Users get no feedback when their graph has structural problems (props not spawning, density outputs going nowhere, circular references). Field-level validation exists but graph-level structural analysis does not.

| Task | Description | Dependencies |
|------|-------------|-------------|
| 4.8.1 | Define `GraphDiagnostic` interface: `{ nodeId, edgeId?, severity, code, message }` | Phase 2 |
| 4.8.2 | Build `validateGraph.ts`: pure function `(nodes, edges) → GraphDiagnostic[]` | 4.8.1 |
| 4.8.3 | Rule: **Disconnected required inputs** — required input handles missing incoming edges | 4.8.2 |
| 4.8.4 | Rule: **Orphaned nodes** — nodes with no edges at all (warning) | 4.8.2 |
| 4.8.5 | Rule: **Circular references** — DFS back-edge cycle detection (error) | 4.8.2 |
| 4.8.6 | Rule: **Type mismatch on connections** — edge source/target category mismatch (error) | 4.8.2 |
| 4.8.7 | Rule: **Missing downstream consumers** — unused non-export outputs (info) | 4.8.2 |
| 4.8.8 | Rule: **Prop configuration completeness** — missing PositionProvider/Scanner/Prefab (warning) | 4.8.2 |
| 4.8.9 | Rule: **Assignment completeness** — missing prop/material (warning) | 4.8.2 |
| 4.8.10 | Rule: **Scanner range sanity** — ColumnLinear Range >512 or Area Size axis >256 (warning) | 4.8.2 |
| 4.8.11 | Rule: **Duplicate ExportAs names** — conflicting export names (error) | 4.8.2 |
| 4.8.12 | Rule: **Unresolved Imported references** — ImportedValue Name not found in asset pack (warning) | 4.8.2 |
| 4.8.13 | Build `graphValidationStore.ts`: re-run validation on debounced graph changes (500ms) | 4.8.2 |
| 4.8.14 | Build `DiagnosticsPanel.tsx`: collapsible bottom panel with click-to-navigate | 4.8.13 |
| 4.8.15 | Node badge overlays: red (error), yellow (warning) with click-to-filter | 4.8.13 |
| 4.8.16 | Edge rendering: type-mismatch edges render red/dashed | 4.8.13 |
| 4.8.17 | StatusBar integration: diagnostic summary count with click-to-open | 4.8.13 |
| 4.8.18 | Build `REQUIRED_INPUTS` registry: node type → required handle IDs | 4.8.3 |

**Diagnostic Codes:**

| Code | Severity | Rule |
|------|----------|------|
| `DISCONNECTED_INPUT` | error | Required input has no incoming edge |
| `ORPHANED_NODE` | warning | Node has no edges |
| `CIRCULAR_REFERENCE` | error | Node is part of a cycle |
| `TYPE_MISMATCH` | error | Edge connects incompatible categories |
| `UNUSED_OUTPUT` | info | Non-export output goes nowhere |
| `INCOMPLETE_PROP` | warning | Prop missing position/scanner |
| `INCOMPLETE_ASSIGNMENT` | warning | Assignment missing prop/material |
| `SCANNER_RANGE_EXTREME` | warning | Scanner range exceeds sane bounds |
| `DUPLICATE_EXPORT` | error | Multiple nodes share ExportAs name |
| `UNRESOLVED_IMPORT` | warning | Imported name not found in pack |

**Acceptance:** Diagnostics update within 1s of changes. Circular references detected. Disconnected inputs flagged. Click-to-navigate works. Validation completes in <100ms for 200-node graphs.

---

## Phase 5: Template Marketplace

**Goal:** Community-driven template ecosystem with zero hosting cost.

### Milestone 5.1: Bundled Templates ✅

Shipped in v0.1.0. Four bundled templates (Forest Hills, Eldritch Spirelands, Shattered Archipelago, Blank Project) plus snippet templates for common node patterns. Template browser with visual cards on the home screen.

### Milestone 5.2: Template Browser UI ✅

Shipped in v0.1.0. Home screen template browser with responsive cards, recent projects list, and quick reopen.

### Milestone 5.3: GitHub Template Infrastructure

| Task | Description | Status |
|------|-------------|--------|
| 5.3.1 | Create `HyperSystems-Development/terranova-templates` GitHub repo | TODO |
| 5.3.2 | Define template directory structure: `<name>/manifest.json` + `<name>/HytaleGenerator/` | TODO |
| 5.3.3 | Create `index.json` at repo root with template metadata | TODO |
| 5.3.4 | Set up GitHub Pages to serve `index.json` | TODO |
| 5.3.5 | Create PR template for community submissions | TODO |
| 5.3.6 | GitHub Actions workflow: validate submitted templates on PR | TODO |

### Milestone 5.4: In-App Template Fetching

| Task | Description | Dependencies |
|------|-------------|-------------|
| 5.4.1 | Build `templateStore.ts`: Zustand store for template browsing state | 5.2 |
| 5.4.2 | Fetch `index.json` from GitHub Pages, parse, display in browser | 5.4.1, 5.3.4 |
| 5.4.3 | Template download: fetch from GitHub, extract to user location | 5.4.2 |
| 5.4.4 | Progress indicator during download | 5.4.3 |
| 5.4.5 | Graceful offline fallback: bundled templates only when offline | 5.4.2 |

### Milestone 5.5: Template Creation & Versioning

| Task | Description | Dependencies |
|------|-------------|-------------|
| 5.5.1 | "Save as Template": export current project with metadata | 5.3.2 |
| 5.5.2 | Generate `manifest.json` with required fields | 5.5.1 |
| 5.5.3 | Link to PR submission workflow on GitHub | 5.5.1, 5.3.5 |
| 5.5.4 | Version compatibility warnings (template serverVersion vs current target) | 5.4.2 |

**Acceptance:** Community templates appear in browser when online. Download creates a valid project. "Save as Template" produces a directory matching the repo format. Offline shows bundled only.

---

## Phase 6: Graph Editor QoL — Community Requests

**Goal:** Quality-of-life improvements to the node graph editor based on community feedback from Discord. These features bring TerraNova's graph editing experience closer to professional tools like Blender and WorldMachine.

### Milestone 6.1: Inline Value Sliders

| Task | Description | Dependencies |
|------|-------------|-------------|
| 6.1.1 | Add compact slider widget to all numeric fields on node bodies | Phase 2 |
| 6.1.2 | Click-to-type manual input mode on slider | 6.1.1 |
| 6.1.3 | Per-type range limits (e.g. Constant clamped to ±2, noise Scale to reasonable ranges) | 6.1.1 |
| 6.1.4 | Animated slider thumb matching community mockup style | 6.1.1 |

**Acceptance:** All numeric node fields display an inline slider. Click-to-type overrides slider for precise values. Ranges are type-aware.

### Milestone 6.2: Node Interjection & Auto-Push

| Task | Description | Dependencies |
|------|-------------|-------------|
| 6.2.1 | Detect drag-node-onto-wire gesture (proximity + collision with edge path) | Phase 2 |
| 6.2.2 | Insert dragged node between two connected nodes, rewiring edges automatically | 6.2.1 |
| 6.2.3 | Auto-push downstream nodes to make room for the inserted node (Blender-style) | 6.2.2 |

**Acceptance:** Dragging a node onto a wire inserts it inline. Downstream nodes shift to avoid overlap.

### Milestone 6.3: Orthogonal Wire Routing

| Task | Description | Dependencies |
|------|-------------|-------------|
| 6.3.1 | Implement right-angle orthogonal edge path algorithm | Phase 2 |
| 6.3.2 | Toggle in settings/toolbar between smooth bezier and orthogonal wire paths | 6.3.1 |
| 6.3.3 | Persist wire routing preference | 6.3.2 |

**Acceptance:** Users can switch between bezier and orthogonal wires. Orthogonal paths route cleanly without overlapping nodes.

### Milestone 6.4: Value Referencing / Linked Parameters

| Task | Description | Dependencies |
|------|-------------|-------------|
| 6.4.1 | Define linked-parameter data model (source node + field → target node + field) | Phase 2 |
| 6.4.2 | UI for creating and displaying value references between nodes | 6.4.1 |
| 6.4.3 | Live sync: changing source value automatically updates all linked targets | 6.4.2 |
| 6.4.4 | Visual indicator on linked fields (icon + link line) | 6.4.2 |

**Acceptance:** A value on one node can be referenced by another node's field. Changes to the source propagate instantly.

### Milestone 6.5: Group Deletion Behavior

| Task | Description | Dependencies |
|------|-------------|-------------|
| 6.5.1 | Extend group deletion to cascade-delete all contained nodes | Phase 2 (2.6.6) |
| 6.5.2 | Confirmation dialog before group deletion listing affected nodes | 6.5.1 |

**Acceptance:** Deleting a group deletes all contained nodes. Undo restores the group and its contents.

### Milestone 6.6: Keyboard-Driven Add Menu

| Task | Description | Dependencies |
|------|-------------|-------------|
| 6.6.1 | Arrow key navigation + Enter to select in the add-node menu | Phase 2 (2.5) |
| 6.6.2 | Configurable hotkey to open add menu (default: Shift+A) | 6.6.1 |
| 6.6.3 | Type-ahead filtering while navigating | 6.6.1 |

**Acceptance:** Add menu is fully navigable via keyboard. Shift+A opens the menu at cursor position. Hotkey is rebindable.

### Milestone 6.7: Top Bar Node Palette

| Task | Description | Dependencies |
|------|-------------|-------------|
| 6.7.1 | Build category tabs across the top of the graph editor | Phase 2 (2.5) |
| 6.7.2 | Populate each tab with nodes from that category | 6.7.1 |
| 6.7.3 | Drag from top-bar palette to canvas | 6.7.2 |
| 6.7.4 | Toggle between sidebar palette and top-bar palette in settings | 6.7.1 |

**Acceptance:** Category tabs display across the top. Nodes can be dragged from tabs to canvas. User can choose palette location.

### Milestone 6.8: Wire-Drop Smart Spawn

| Task | Description | Dependencies |
|------|-------------|-------------|
| 6.8.1 | Detect wire dropped in empty canvas space | Phase 2 |
| 6.8.2 | Spawn new node aligned to the dropped wire's input handle position (not center) | 6.8.1 |
| 6.8.3 | Open filtered add-menu showing only compatible node types for the handle | 6.8.2 |

**Acceptance:** Dropping a wire in empty space opens a filtered add menu. The new node spawns aligned to the connection point.

### Milestone 6.9: G-Key Node Movement (Blender-Style)

| Task | Description | Dependencies |
|------|-------------|-------------|
| 6.9.1 | Press G to enter grab mode on selected node(s) | Phase 2 |
| 6.9.2 | Mouse movement translates selection; constrain to axis with X/Y keys | 6.9.1 |
| 6.9.3 | LMB or G to confirm placement; RMB or Escape to cancel | 6.9.1 |

**Acceptance:** G activates grab mode. Nodes follow cursor. Confirm/cancel works. Supports multi-selection.

### Milestone 6.10: Fan-Out Connections

| Task | Description | Dependencies |
|------|-------------|-------------|
| 6.10.1 | Verify that one output handle can connect to multiple input handles | Phase 2 |
| 6.10.2 | Fix any issues preventing fan-out if discovered | 6.10.1 |
| 6.10.3 | Document fan-out behavior and add visual feedback for multi-connected outputs | 6.10.1 |

**Acceptance:** One output connects to multiple inputs. Verified and documented.

---

## Phase 7: Preview & Debugging Tools

**Goal:** Advanced visualization and debugging features for power users building complex worldgen graphs.

### Milestone 7.1: Performance Heatmap

| Task | Description | Dependencies |
|------|-------------|-------------|
| 7.1.1 | Instrument per-node evaluation timing in the density evaluator | Phase 4 |
| 7.1.2 | Build color overlay system: map evaluation cost to a green→yellow→red gradient per node | 7.1.1 |
| 7.1.3 | Heatmap toggle in toolbar/settings | 7.1.2 |
| 7.1.4 | Tooltip showing exact timing (ms) and percentage of total evaluation cost | 7.1.2 |

**Acceptance:** Nodes are color-coded by evaluation cost (WorldMachine-style). Bottleneck nodes are instantly identifiable. Toggle on/off without performance impact when disabled.

### Milestone 7.2: Per-Node Output Preview (Non-Destructive)

| Task | Description | Dependencies |
|------|-------------|-------------|
| 7.2.1 | "Preview as output" action: select any node and preview its output as if it were the final output | Phase 4 (4.3, 4.4) |
| 7.2.2 | Non-destructive — no rewiring needed, temporary evaluation reroute | 7.2.1 |
| 7.2.3 | Visual indicator on the previewed node (highlight ring or badge) | 7.2.1 |
| 7.2.4 | Click another node to switch preview target; click again to return to graph output | 7.2.1 |

**Acceptance:** Select any density node → preview panel shows its isolated output. No graph modifications needed. Switch targets freely.

### Milestone 7.3: History Timelapse

| Task | Description | Dependencies |
|------|-------------|-------------|
| 7.3.1 | Build timelapse controller: step through undo history checkpoints sequentially | Phase 2 (2.6.3) |
| 7.3.2 | Configurable timer interval for auto-stepping (e.g. 500ms, 1s, 2s) | 7.3.1 |
| 7.3.3 | Export progression as screenshot sequence or animated GIF | 7.3.2 |

**Acceptance:** Users can replay their editing history as a timelapse. Configurable speed. Export to screenshots or GIF.

---

## Phase 8: Material & Asset UX

**Goal:** Richer material browsing, selection, and color tools for building visually cohesive biomes.

### Milestone 8.1: Prefab Thumbnails

| Task | Description | Dependencies |
|------|-------------|-------------|
| 8.1.1 | Pre-render stylized voxel thumbnails for known Hytale prefab models | Phase 1 |
| 8.1.2 | Display thumbnails in the prefab browser list and prop node bodies | 8.1.1 |
| 8.1.3 | Fallback placeholder for unknown/custom prefabs | 8.1.1 |

**Acceptance:** Prefab browser shows visual thumbnails instead of text-only entries. Known Hytale prefabs have recognizable icons.

### Milestone 8.2: Recently Used Materials & Favorites

| Task | Description | Dependencies |
|------|-------------|-------------|
| 8.2.1 | Track recently used materials (persisted per-project) | Phase 3 (3.3) |
| 8.2.2 | Show recent materials at the top of the material picker | 8.2.1 |
| 8.2.3 | User-defined favorites with star toggle | 8.2.1 |
| 8.2.4 | Palette sets: save/load named collections of materials | 8.2.3 |

**Acceptance:** Material picker shows recent materials at top. Favorites persist. Palette sets can be saved and loaded.

### Milestone 8.3: Color Theory Material Browser

| Task | Description | Dependencies |
|------|-------------|-------------|
| 8.3.1 | Extract dominant hex color from each Hytale block texture | Phase 1 |
| 8.3.2 | Filter blocks by color harmony rules: complementary, analogous, triadic, split-complementary | 8.3.1 |
| 8.3.3 | Visual color wheel interface showing available materials by hue | 8.3.2 |
| 8.3.4 | "Suggest materials" action: given a selected material, suggest harmonious companions | 8.3.2 |

**Acceptance:** Users can filter materials by color harmony. Color wheel visualizes available palettes. Suggestions help build cohesive biomes.

### Milestone 8.4: Recoloring Tool

| Task | Description | Dependencies |
|------|-------------|-------------|
| 8.4.1 | Change one material and auto-suggest adjustments to other materials to preserve contrast/harmony | 8.3.2 |
| 8.4.2 | Preview proposed changes in the voxel renderer before committing | 8.4.1, Phase 4 (4.9) |
| 8.4.3 | Accept/reject recolor suggestions individually or as a batch | 8.4.2 |

**Acceptance:** Changing a material triggers harmony-aware suggestions for related materials. Preview shows the result before applying.

---

## Phase 9: Distribution & Stability

**Goal:** Professional distribution with code signing, automatic updates, and hardened error handling.

### Milestone 9.1: Code Signing

| Task | Description | Dependencies |
|------|-------------|-------------|
| 9.1.1 | Obtain Windows EV code signing certificate | None |
| 9.1.2 | Configure Windows build pipeline with EV signing (eliminate SmartScreen warnings) | 9.1.1 |
| 9.1.3 | Obtain Apple Developer ID certificate + configure notarization | None |
| 9.1.4 | Configure macOS build pipeline with Developer ID signing + notarization (eliminate Gatekeeper warnings) | 9.1.3 |

**Acceptance:** Windows installer passes SmartScreen without warning. macOS DMG opens without Gatekeeper prompt. Both platforms show verified publisher identity.

### Milestone 9.2: Auto Updater

| Task | Description | Dependencies |
|------|-------------|-------------|
| 9.2.1 | Integrate Tauri's updater plugin with update server configuration | Phase 1 |
| 9.2.2 | In-app update check: check for new versions on startup (configurable) | 9.2.1 |
| 9.2.3 | Update notification with changelog summary and install button | 9.2.2 |
| 9.2.4 | Background download + restart-to-update flow | 9.2.3 |

**Acceptance:** App checks for updates on launch. Users see a notification with the changelog. One-click install and restart.

### Milestone 9.3: Error Boundary Hardening

| Task | Description | Dependencies |
|------|-------------|-------------|
| 9.3.1 | Audit all major panels for error boundary coverage | Phase 1 |
| 9.3.2 | Add error boundaries to any uncovered panels (sidebar, property panel, preview, node palette) | 9.3.1 |
| 9.3.3 | Structured error reporting: collect error context and offer "Copy Error Report" button | 9.3.2 |

**Acceptance:** No single component crash takes down the full application. All major panels are independently recoverable. Error reports are copyable for bug reporting.

---

## Phase Dependencies

```
Phases 1–4 ✅ (v0.1.0–v0.1.2)
  └── Everything below depends on the shipped foundation

Phase 4.8 (Graph Validation) ← Phase 2
  └── No preview dependency — can start immediately

Phase 5 (Templates)
  ├── 5.1 Bundled Templates ✅
  ├── 5.2 Template Browser UI ✅
  ├── 5.3 GitHub Infrastructure (independent — can start immediately)
  ├── 5.4 In-App Fetching ← 5.2, 5.3
  └── 5.5 Template Creation ← 5.3

Phase 6 (Graph QoL) ← Phase 2
  ├── 6.1 Inline Sliders (independent)
  ├── 6.2 Node Interjection (independent)
  ├── 6.3 Orthogonal Wires (independent)
  ├── 6.4 Value Referencing (independent)
  ├── 6.5 Group Deletion (← 2.6.6 groups)
  ├── 6.6 Keyboard Add Menu (← 2.5 palette)
  ├── 6.7 Top Bar Palette (← 2.5 palette)
  ├── 6.8 Wire-Drop Smart Spawn (independent)
  ├── 6.9 G-Key Movement (independent)
  └── 6.10 Fan-Out Connections (independent)

Phase 7 (Preview Tools) ← Phase 4
  ├── 7.1 Performance Heatmap (← 4.2 evaluator)
  ├── 7.2 Per-Node Preview (← 4.3, 4.4 pipeline + heatmap)
  └── 7.3 History Timelapse (← 2.6.3 undo/redo)

Phase 8 (Material & Asset UX) ← Phase 3
  ├── 8.1 Prefab Thumbnails (independent)
  ├── 8.2 Recently Used & Favorites (← 3.3 material system)
  ├── 8.3 Color Theory Browser (independent)
  └── 8.4 Recoloring Tool (← 8.3, 4.9 voxel preview)

Phase 9 (Distribution & Stability) ← Phase 1
  ├── 9.1 Code Signing (independent — can start immediately)
  ├── 9.2 Auto Updater (independent)
  └── 9.3 Error Boundary Hardening (partially done in v0.1.1/v0.1.2)
```

---

## CI/CD Pipeline

### GitHub Actions Workflows

| Workflow | Trigger | Actions |
|----------|---------|---------|
| `ci.yml` | Push, PR | Lint (ESLint), Type check (tsc), Rust check (cargo check), Rust test (cargo test), Frontend test |
| `build.yml` | Push to main | Build Tauri app for macOS, Windows, Linux |
| `release.yml` | Git tag `v*` | Build + create GitHub Release with platform installers |
| `template-validate.yml` | PR to terranova-templates | Validate template JSON against schema |

### Build Matrix

| Platform | Target | Artifact |
|----------|--------|----------|
| macOS (Apple Silicon) | aarch64-apple-darwin | `.dmg` |
| macOS (Intel) | x86_64-apple-darwin | `.dmg` |
| Windows | x86_64-pc-windows-msvc | `.exe` / `.msi` |
| Linux | x86_64-unknown-linux-gnu | `.AppImage` / `.deb` |

---

## Risk Mitigation

| Risk | Phase | Mitigation |
|------|-------|-----------|
| V2 types change | All | Version-tagged schemas; each TerraNova release targets a specific Hytale version |
| Graph validation false positives | 4.8 | Cross-file imports may flag valid references as unresolved; use warning severity for import checks; allow user dismiss |
| Template quality control | 5 | Automated validation in CI; community review process via PR |
| Inline slider precision | 6.1 | Click-to-type manual input always available as fallback for precise values |
| Node interjection edge cases | 6.2 | Only activate on clear proximity match; undo always available; skip multi-input nodes |
| Orthogonal routing overlap | 6.3 | Implement obstacle avoidance with node bounding boxes; fallback to bezier for unsolvable layouts |
| Value referencing cycles | 6.4 | Cycle detection on link creation; prevent self-referencing; clear error messages |
| Performance heatmap overhead | 7.1 | Timing instrumentation is opt-in; zero-cost when disabled; evaluation still runs in Web Worker |
| Color theory complexity | 8.3 | Start with simple complementary/analogous rules; pre-compute color map from block textures at build time |
| Recoloring preview cost | 8.4 | Use low-res voxel preview (32³) for interactive recolor preview; full-res on commit |
| Code signing cost | 9.1 | Windows EV certs are $200–400/yr; macOS Developer Program is $99/yr; budget as ongoing operational cost |
| Auto updater security | 9.2 | Use Tauri's built-in updater with signature verification; serve updates from GitHub Releases (trusted source) |

---

## Verification Criteria

| Phase | Test |
|-------|------|
| Phase 4.8 | Create Clamp node with no input → diagnostics panel shows "DISCONNECTED_INPUT" error → click diagnostic → zooms to node → connect input → error disappears within 1s |
| Phase 5 | Browse community templates → download "Forest" → customize props → export → loads on Hytale server |
| Phase 6.1 | Drag inline slider on noise Scale → preview updates in real-time → click slider to type exact value → confirm |
| Phase 6.2 | Drag a Clamp node onto a wire between Noise and Output → Clamp inserts inline → downstream nodes shift |
| Phase 6.9 | Select node → press G → move mouse → press G to confirm → node placed at new position |
| Phase 7.1 | Enable performance heatmap → nodes colored by eval cost → identify slowest node → optimize it |
| Phase 7.2 | Click any mid-graph density node → preview shows its isolated output → click another → preview switches |
| Phase 8.3 | Select "Rock_Lime_Cobble" → filter by complementary → see harmonious material suggestions |
| Phase 9.1 | Install on fresh Windows machine → no SmartScreen warning; install on macOS → no Gatekeeper prompt |
| Phase 9.2 | New version published → app shows update notification → click install → app restarts with new version |

---

*Document version 2.0 — February 13, 2026*
