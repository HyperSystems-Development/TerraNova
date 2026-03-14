# Changelog

All notable changes to [TerraNova](https://github.com/HyperSystemsDev/TerraNova) are documented in this file.

## [1.5.9 McCal's QoL] - 2026-03-14

### Added

- **Hytale-accurate tint workflow** - DensityDelimited tint bands now preserve Hytale-style Range values, keep `Tint.Type: "Constant"`, and inject a valid default density node when missing
- **Dedicated weather editor** - Weather JSON files now open into a preview-driven editor with save support, sampled track summaries, and collapsible preview drawers instead of a raw JSON fallback
- **Dedicated environment editor** - Environment JSON files now open into a forecast-focused editor with current-hour controls, hourly weather editing, and direct open actions for linked weather files
- **Simple Controls and In-Depth Controls** - Weather and environment editors now default to a simpler control layer while keeping the heavier track, tag, and raw-field tools behind an explicit in-depth toggle
- **Issue log and tips toggles** - Both editors now let you show or hide issue logs and tips from compact detail-panel controls
- **Biome browser and validation QoL** - Biome search, richer template entries, Hytale template packs, material autocomplete, and one-click validation fixes are all part of the combined QoL release

### Changed

- **Weather preview layout cleanup** - The 24h atmosphere strip, track preview, sampled values, and asset breakdown are now collapsible drawers so the main scene preview stays visible
- **Editor section styling** - Simple control cards, collapsible sections, and header action buttons now share one stronger icon-forward visual language
- **Real asset lookup paths** - Weather and environment asset references resolve directly against `Server\\Weathers` and `Server\\Environments`
- **Atmosphere workflow navigation** - Clickable environment/weather file paths in the Atmosphere workflow now jump directly into the dedicated editors

### Fixed

- **Environment inheritance handling** - Environment files that inherit forecasts from a parent are no longer treated like broken files just because they do not define local `WeatherForecasts`
- **Maximum update depth crash** - Asset graph bridge updates are now guarded so weather/environment graph scaffolding does not loop state back into the store every render
- **Rendered-more-hooks crash** - Weather and environment editors now keep hook order stable when opening from an empty state into a loaded file
- **Tint export stability** - Edited tint bands now keep stable delimiter export fields when round-tripping back into Hytale-shaped JSON

### Tests

- Added regression coverage for `WeatherEditorView`, `EnvironmentEditorView`, and `AssetGraphCanvasBridge`
- Added tint export coverage for `Range`, `Tint.Type: Constant`, and default density injection
- `pnpm exec tsc -b --pretty false` passes after the editor polish changes

## [0.1.5] — 2026-02-16

### Added

- **Node Interjection** — Drag nodes from the palette or canvas onto existing wires to insert them in-between. Wires highlight with an animated turquoise dashed stroke on hover, nodes snap to the midpoint between source and target, and downstream nodes automatically push apart to maintain proper spacing. Works in both LR and RL flow directions as a single undo step (Closes [#20])
- **Angle Density Evaluator** — New Angle density node that computes the angle (0–180°) between the sample position and a reference vector using dot product, with IsAxis flag for bidirectional symmetry mirroring ([#36])
- **Manual Curve Interactive Sliders** — Range sliders beneath Manual Curve point In/Out number inputs with default [-2, 2] range while number inputs accept any value for manual override beyond slider bounds ([#42])
- **FieldFunction Delimiter Nodes** — Standalone FieldFunction MaterialProviders with Delimiters are now fully supported in the import/export pipeline and rendered as dedicated graph nodes with editable From/To delimiter ranges and add/remove controls ([#37], Closes [#30])
- **Manual Curve Static Bounds** — Preview bounds are computed once on initial data load instead of recomputing on every point change. Compact mode continues to auto-fit, presets reset bounds to [0,1], and switching nodes forces a remount so bounds recompute ([#41], Closes [#22])
- **AI Transparency Documentation** — Added AI transparency disclaimer with development workflow details, and security disclaimer to `docs/AI_TRANSPARENCY.md`

### Fixed

- **3D Point Node Display** — Vector:Constant nodes imported from Hytale Point3D format now display correctly as "3D Point" instead of "Constant" in node headers, PropertyPanel, and NodePalette search ([#32], Resolves [#29])
- **RangeDouble Property Fields** — RangeDouble fields are now editable in the property panel instead of displaying as read-only ([#31])
- **Angle Density Input Ports** — Added missing Vector input port to the Angle density node with meaningful defaults and correct round-trip export ([#34], Closes [#28])
- **Manual Curve PositionsCellNoise Import** — Manual curves now import correctly for PositionsCellNoise nodes by normalizing both Hytale format variants into a unified internal field ([#35])
- **Graph Flow Direction Edges** — Replaced `setTimeout` with double `requestAnimationFrame` for handle position updates when changing graph flow direction, ensuring edges route to correct connection points ([#47], Fixes [#44])
- **Hardware Detection** — Removed hardcoded 16 GB RAM cap so the slider respects actual system memory, added native GPU detection via Tauri command with platform-specific implementations (nvidia-smi/sysfs/lspci on Linux, PowerShell/registry on Windows, system_profiler on macOS), and fixed incorrect VRAM estimates for RX 7700 XT, RX 7600, RTX 4060, and RTX 4090 ([#46], Closes [#21], [#25])
- **Density Evaluator Bugs** — Fixed Anchor (evaluates at origin), CellWallDistance (returns 0 fallback), YSampled (reads YProvider handle), SwitchState (returns State field), and Shell (computes SDF from InnerRadius/OuterRadius). Also fixed VectorWarp handle registry name and added GradientWarp WarpScale default

## [0.1.4] — 2026-02-15

### Added

- **Evaluator Overhaul & Schema-Driven Nodes** — Major evaluator rewrite with fixed Shell/YSampled nodes, new MultiMix node, and ingestion of 210+ node definitions from `terranova-bundle.json`. Cross-category connection validation via a 14×14 compatibility matrix, bridge node dual-color headers, drag-target glow/dim suggestions, port tooltips, and fidelity scoring badge
- **Adaptive Voxel Preview** — Auto-fit Y bounds that detect the terrain surface band after the coarse evaluation pass, a "Fit to Content" button that probes the full volume at low resolution, and graph-aware default bounds based on static node type analysis
- **Configuration Dialog** — New Settings > Configuration panel with CPU, GPU, and RAM budget sliders, hardware auto-detection via `sysinfo` crate + WebGL probing, and per-subsystem advanced overrides ([#12])
- **Compound Inputs & Backward Wire Dragging** — Dynamic handle expansion for multi-input nodes (Sum, Product, Min, Max, etc.), backward wire dragging from input ports to QuickAdd dialog, and smart label hiding for generic port names ([#10])
- **Knife Tool** — Cut one or many wires by holding Ctrl+Shift (Cmd+Shift on macOS) and dragging through them, matching Blender/Unreal-style node editor UX ([#17])
- **SVG Export** — Export node graphs as clean, zoomable SVG files via File menu or Ctrl+Shift+G, with scope selection, grid toggle, and presentation/debug modes
- **Accordion Sidebar** — Optional accordion layout as an alternative to the tab bar (Settings > Sidebar), with collapsible drag-to-reorder sections and badge counts

### Fixed

- **Compound Inputs Evaluator** — Fixed density preview producing incorrect terrain values after the compound inputs refactor. The evaluator was hardcoded to read only 2 inputs (`Inputs[0]` and `Inputs[1]`) for Sum, Product, WeightedSum, SmoothMin, SmoothMax, MinFunction, MaxFunction, and AverageFunction nodes — any inputs beyond the first two were silently ignored. All eight compound types now dynamically iterate over all connected inputs
- **CubeMath Type Mismatch** — Fixed the evaluator's `Cube` case targeting the wrong node type; the math cube operation is `CubeMath` in the schema (`Cube` is a shape SDF)
- **Sum Export Path** — Fixed Hytale JSON export producing malformed output for Sum nodes using the new compound handles `Inputs[]` format. The export path now correctly handles both legacy `InputA`/`InputB` and new `Inputs[]` array formats
- **Evaluator Type Coverage** — Added `VectorWarp` and `Shell` to the approximated types set so `getEvalStatus` correctly reports their fidelity instead of claiming full support
- **Windows Preview Worker Compatibility** — Fixed density/volume preview showing flat terrain on Windows and production builds. Configured Vite to emit ES module workers matching the `{ type: "module" }` constructor, added `blob:` and `worker-src` CSP directives for WebView2 compatibility, and added worker error handling with automatic main-thread fallback and 30-second timeout
- **Auto-Updater Relaunch** — Overhauled platform-specific relaunch logic with macOS bundle re-signing, Linux execute permission fix, and update loop prevention via localStorage version check
- **SVG 1.1 Compliance** — Replaced rgba(), feDropShadow, 8-digit hex colors, and duplicate XML attributes in exported SVGs for strict parser compatibility (macOS Preview, Inkscape)
- **Undo History Noise** — Node move operations removed from undo history; slider drags now produce exactly one entry on blur instead of spamming during drag

### Changed

- Default world height updated from 256 to 320 to match Hytale's actual limit
- Voxel resolution slider extended to 256 with free typing beyond
- SliderField supports overflow input values beyond the slider range

## [0.1.3] — 2026-02-14

### Added

- **Auto-Updater** — App checks GitHub Releases on launch, notifies in the StatusBar, and applies updates on restart ([#7])
- **Updates Section in Settings** — Current version display, manual "Check for updates" button with feedback toast, and persistent auto-check toggle
- **Dynamic Version Display** — StatusBar now shows live version via `getVersion()` instead of hardcoded `v0.1.0`
- **GitHub Templates** — Issue templates (bug report, feature request) and pull request template
- **Code of Conduct** — `CODE_OF_CONDUCT.md` added to the repository
- **Design System Reference** — `docs/planning/DESIGN_SYSTEMS.md` documenting the app's visual design system

### Fixed

- **Material Tab Crash** — Opening a blank/void template project no longer crashes the Material tab; guard added against missing material sections ([#6])
- **SimplexNoise2D Settings** — Noise parameters (frequency, amplitude, etc.) now properly propagate to the evaluator and preview ([#8])
- **CI Version Sync** — App version now syncs from the git tag during CI release builds (was always `0.1.0` regardless of release tag)
- **BiomeRangeEditor Redesign** — Overhauled with improved UX, better range management, and cleaner layout

### Changed

- **README.md Overhauled** — Updated screenshots, installation guide, and corrected license to LGPL-2.1
- **Tauri Dependencies Updated** — All `@tauri-apps` npm packages bumped to latest versions
- **Docs Consolidated** — Roadmap and planning documents consolidated and updated; changelog moved to `docs/`

## [0.1.2] — 2026-02-13

Patch release fixing render crashes when opening biome files containing node fields with object values.

### Fixed

- **React Error #31 Crash** — Opening biome files with noise or other nodes containing object-typed field values (e.g. `{x, y, z}` coordinates) caused the editor to crash with "Objects are not valid as a React child" ([#3])
  - Added `safeDisplay` utility that safely converts any field value to a renderable string, applied across all 20 node component files
  - Object values are now JSON-stringified; scalars (numbers, strings) render as before

### Added

- **Node-Level Error Boundary** — `NodeBodyBoundary` inside `BaseNode` catches render errors at the individual node level
  - A single node with bad data now shows an inline error message instead of crashing the entire editor

## [0.1.1] — 2026-02-13

Bug fix release addressing a critical Windows issue where opening biome files caused the entire app to go gray/blank.

### Fixed

- **Windows Biome Gray Screen** — Opening a biome JSON file from the sidebar caused the entire UI to crash to a blank gray screen on Windows ([#2])
  - `isBiomeFile()` path fallback now checks both `/biomes/` and `\biomes\` separators
  - WorldStructure sibling path construction now normalizes backslashes to forward slashes before building the path

### Added

- **Error Boundary** — React `ErrorBoundary` wrapping the main editor panel (`PanelLayout`)
  - If a component throws during render, the crash is contained to the editor area — toolbar and status bar remain visible
  - Displays the error message with a "Try Again" button to recover without restarting the app
- **Blank Project Template** — New project dialog now includes a Blank Project option that scaffolds a minimal `HytaleGenerator` directory structure ([#1])

## [0.1.0] — 2026-02-13

Initial public release. Visual biome editor and terrain designer for Hytale World Generation V2.

Built over 85 commits (Feb 6–13, 2026) in the private TerraNovaDev repository before open-sourcing.

### Core Architecture

- Tauri v2 + React + TypeScript desktop application
- React Flow–based node graph engine with custom node rendering
- Zustand state management with persistent undo/redo history
- File I/O with Tauri filesystem APIs, project save/load, and file caching
- Unsaved changes confirmation dialog with Tauri close guard

### Node System

- 50+ Hytale V2 node types across all categories:
  - **Density** — Noise generators (SimplexNoise, CellNoise2D/3D, etc.), math operations (Add, Multiply, Clamp, Blend, Abs, Negate, etc.), shape SDFs
  - **Curve** — Manual editable curves, computed curve types (SquareBump, InverseLerp, etc.)
  - **Material** — Material assignment, layer stacks, SpaceAndDepth specifications
  - **Pattern** — Stripe, checker, gradient patterns
  - **Position** — Position providers, CellNoise-based placement, Point3D/vector nodes
  - **Prop** — Prop placement rules, model references
  - **Scanner** — Column scanner, surface scanner nodes
  - **Vector** — Vector math operations
  - **Environment** — Sky, lighting, fog configuration
  - **Assignment** — Biome assignment and output designation
- Subcategory coloring and palette grouping for density nodes
- Root graph node system with visual dock indicator

### Biome Editor

- Multi-section tabbed editing for biome files (terrain, materials, props, environment)
- NoiseRange editor for biome boundary configuration
- Biome range management supporting 5+ biome entries
- Rich dashboard with material layers overview and prop summary

### Curve Editor

- Interactive canvas for Manual curve types with drag-to-edit control points
- Read-only computed curve previews for all built-in types
- Float precision fixes, crosshair overlay, snap-to-grid, interpolation modes, presets
- Mini curve previews in node bodies and property panel
- Editable curve point list with manual coordinate entry

### Material System

- Interactive material layer stack editor
- Full V2 SpaceAndDepth specification support
- Material graph evaluator for density-based material assignment

### Preview Engine

- Density evaluator supporting the full node graph
- Live 2D preview with configurable colormaps and user-controlled bounds
- 3D voxel preview engine with GPU resource management
- Per-node inline density thumbnails
- Diagnostics overlay and image export
- Prop placement visualizer — 2D canvas preview for position providers

### Property Panel

- Slider, toggle, vector, and array field editors
- Input validation and constraint enforcement
- Field descriptions and inline documentation
- Help mode with expanded tips for every field
- Status badges for evaluator completeness

### Import & Export

- Bidirectional Hytale JSON translation layer — import real biome files and export back
- Prefab import/export fidelity with position provider visualization
- Round-trip support preserving all fields through import → edit → export
- CLI export script for batch processing

### Templates

- **Forest Hills** — Starter biome with documented V2 format findings
- **Eldritch Spirelands** — Complex multi-layer biome with full translation layer
- **Shattered Archipelago** — Island terrain with CLI export integration
- **Blank Project** — Empty project with minimal HytaleGenerator structure
- **Quick Start** — Responsive template cards on the home screen
- Snippet templates for common node patterns
- Templates bundled as resources for production builds

### Home Screen

- Recent projects list with quick reopen
- Template browser with visual cards
- Close project to return to home
- Visual polish and responsive layout

### Graph Features

- Auto-layout with dagre algorithm, toolbar buttons, and optional layout on file open
- Configurable graph flow direction (left-to-right / right-to-left)
- Bidirectional wire path highlighting with edge hover and input port tracing
- Copy/paste nodes across the graph
- Root node designation with visual feedback
- Centralized keybinding system with configurable shortcuts
- Multi-node selection with context menu actions
- Cursor-tracking quick-add search panel
- Snap-to-grid and alignment tools
- Extended zoom range with scroll-to-zoom
- Replace-on-connect behavior for single-input ports
- Connection validation and cycle detection
- Node visual overhaul — handle positioning, depth styling, edge routing

### UX & Visual Design

- Complete visual redesign with earth/terrain color theme
- Custom app icon
- Per-tab bookmarks and per-file bookmark persistence
- Descriptive history labels with per-section undo history
- Floating view switcher and collapsible preview controls
- Context menus throughout the application
- Toast notifications for user feedback
- Minimap navigation

### Settings

- Worldgen `Settings.json` editor with full editing support
- Keyboard shortcuts dialog
- Configurable editor preferences and layout defaults

### CI/CD

- GitHub Actions release workflow
- Windows NSIS installer build
- macOS DMG builds (Apple Silicon + Intel)
- Linux builds (`.deb` + `.AppImage` + `.rpm`)
- pnpm lockfile for reproducible CI installs

### Testing

- 298+ tests covering:
  - Import/export round-trip fidelity
  - Node validation and constraint enforcement
  - Language system end-to-end
  - BiomeRangeEditor and NoiseRange components
  - BlendCurve round-trip accuracy

### Performance

- Comprehensive optimization audit across rendering, state management, bundle size, and preview systems
- GPU resource leak prevention in voxel preview
- Debounced undo history to reduce state churn

---

[0.1.5]: https://github.com/HyperSystemsDev/TerraNova/releases/tag/v0.1.5
[0.1.4]: https://github.com/HyperSystemsDev/TerraNova/releases/tag/v0.1.4
[0.1.3]: https://github.com/HyperSystemsDev/TerraNova/releases/tag/v0.1.3
[0.1.2]: https://github.com/HyperSystemsDev/TerraNova/releases/tag/v0.1.2
[0.1.1]: https://github.com/HyperSystemsDev/TerraNova/releases/tag/v0.1.1
[0.1.0]: https://github.com/HyperSystemsDev/TerraNova/releases/tag/v0.1.0
[#1]: https://github.com/HyperSystemsDev/TerraNova/pull/1
[#2]: https://github.com/HyperSystemsDev/TerraNova/pull/2
[#3]: https://github.com/HyperSystemsDev/TerraNova/pull/3
[#6]: https://github.com/HyperSystemsDev/TerraNova/pull/6
[#7]: https://github.com/HyperSystemsDev/TerraNova/pull/7
[#8]: https://github.com/HyperSystemsDev/TerraNova/pull/8
[#10]: https://github.com/HyperSystemsDev/TerraNova/pull/10
[#12]: https://github.com/HyperSystemsDev/TerraNova/pull/12
[#13]: https://github.com/HyperSystemsDev/TerraNova/pull/13
[#16]: https://github.com/HyperSystemsDev/TerraNova/pull/16
[#17]: https://github.com/HyperSystemsDev/TerraNova/pull/17
[#20]: https://github.com/HyperSystemsDev/TerraNova/pull/20
[#21]: https://github.com/HyperSystemsDev/TerraNova/issues/21
[#22]: https://github.com/HyperSystemsDev/TerraNova/issues/22
[#25]: https://github.com/HyperSystemsDev/TerraNova/issues/25
[#28]: https://github.com/HyperSystemsDev/TerraNova/issues/28
[#29]: https://github.com/HyperSystemsDev/TerraNova/issues/29
[#30]: https://github.com/HyperSystemsDev/TerraNova/issues/30
[#31]: https://github.com/HyperSystemsDev/TerraNova/pull/31
[#32]: https://github.com/HyperSystemsDev/TerraNova/pull/32
[#34]: https://github.com/HyperSystemsDev/TerraNova/pull/34
[#35]: https://github.com/HyperSystemsDev/TerraNova/pull/35
[#36]: https://github.com/HyperSystemsDev/TerraNova/pull/36
[#37]: https://github.com/HyperSystemsDev/TerraNova/pull/37
[#41]: https://github.com/HyperSystemsDev/TerraNova/pull/41
[#42]: https://github.com/HyperSystemsDev/TerraNova/pull/42
[#44]: https://github.com/HyperSystemsDev/TerraNova/issues/44
[#46]: https://github.com/HyperSystemsDev/TerraNova/pull/46
[#47]: https://github.com/HyperSystemsDev/TerraNova/pull/47
