# TerraNova — Context, References & Tech Compatibility

**Version:** 2.0
**Date:** 2026-02-13
**Organization:** HyperSystems-Development

---

## Table of Contents

- [Current Status](#current-status)
- [Worldgen Documentation References](#worldgen-documentation-references)
- [Tech Stack Versions & Compatibility](#tech-stack-versions--compatibility)
- [Architecture](#architecture)
- [Known Issues](#known-issues)
- [Architecture Decision Records](#architecture-decision-records)
- [Setup Instructions for Contributors](#setup-instructions-for-contributors)
- [Project Links](#project-links)

---

## Current Status

**Latest Release:** v0.1.2 (February 13, 2026)
**Total Releases:** 3 (v0.1.0, v0.1.1, v0.1.2)
**Test Suite:** 29 test files, 298+ tests passing
**Platforms:** macOS (Apple Silicon + Intel), Windows (NSIS installer), Linux (.deb, .AppImage, .rpm)

TerraNova is a fully functional visual worldgen design studio for Hytale. The v0.1.x series shipped the complete core feature set:

- Node graph editor with 50+ custom node types across all V2 categories
- Biome editor with multi-section tabs (terrain, materials, props, environment)
- Interactive curve editor with manual and computed curve support
- Material layer stack with V1/V2 auto-detection
- Prop placement visualizer with seeded PRNG evaluation
- Preview engine: 2D heatmap, 3D terrain mesh, voxel renderer with PBR materials
- Bidirectional Hytale import/export with round-trip fidelity
- Live bridge to Hytale server for real-time terrain visualization and hot-reload
- Per-node inline density thumbnails
- Undo/redo, copy/paste, auto-layout, keyboard shortcuts, minimap
- Home screen with template browser and recent projects
- Error boundaries at app and per-node level

**v0.1.1** fixed Windows gray screen when opening biome files and added error boundaries.
**v0.1.2** fixed React error #31 when node fields contain object values and added per-node error boundaries.

---

## Worldgen Documentation References

All V2 worldgen documentation lives in `hytale-server-docs/docs/worldgen/`. These 19 files are the schema source of truth for TerraNova.

**Source:** Decompiled from Hytale server pre-release `2026.02.05-9ce2783f7`

| # | Document | Types Defined | Relevance to TerraNova |
|---|----------|---------------|----------------------|
| 1 | `WORLDGEN_OVERVIEW.md` | System architecture, 170+ type registry | Understanding the full system; type count verification |
| 2 | `WORLD_STRUCTURE.md` | NoiseRange (BasicWorldStructureAsset), BiomeRangeAsset | Root of V2 — the starting point for every asset pack |
| 3 | `BIOMES.md` | BiomeAsset, DAOTerrain, PropRuntimeAsset | Core building block — terrain, materials, props, environment, tint |
| 4 | `DENSITY_FUNCTIONS.md` | 68 density function types | Core of terrain generation, node graph editor |
| 5 | `CURVES.md` | 19 curve types | Curve editor; used by density shapes and material providers |
| 6 | `PATTERNS.md` | 15 pattern types | Conditional placement; used by props and materials |
| 7 | `MATERIAL_PROVIDERS.md` | 14 material types + 4 layers + 7 conditions | Block material selection; material layer stack editor |
| 8 | `POSITION_PROVIDERS.md` | 14 position types + 1 point generator | Prop placement coordinates; prop visualizer |
| 9 | `PROPS.md` | 11 prop types + 4 directionality | Object/structure placement |
| 10 | `SCANNERS.md` | 5 scanner types | Vertical position scanning for props |
| 11 | `ASSIGNMENTS.md` | 5 assignment types | Prop distribution strategies |
| 12 | `VECTOR_PROVIDERS.md` | 5 vector provider types | 3D vectors for warping and directional ops |
| 13 | `ENVIRONMENT_TINT.md` | 2 environment + 2 tint providers | Atmospheric effects and color tinting |
| 14 | `BLOCK_MASKS.md` | BlockMaskAsset, 11 prefab filter types | Block placement/replacement control |
| 15 | `FRAMEWORK.md` | DecimalConstants, Positions (2 types) | Shared named constants and position providers |
| 16 | `SETTINGS.md` | SettingsAsset | Performance tuning (concurrency, buffers, view distance) |
| 17 | `FILE_SYSTEM.md` | FileIO, AssetFileSystem, AssetPath | Asset resolution and mod overlay system |
| 18 | `WORLD_JSON.md` | World.json config | V1 legacy root configuration |
| 19 | `ZONES_V1.md` | Zone system, ZoneDiscoveryConfig | V1 legacy biome-grouping system |

### Ground Truth: Real Hytale Biome Files

The translation layer was built against 9 real biome files exported from Hytale's native editor:

EndWithMushrooms, Tropical_Pirate_Islands, Mudcracks_Actual_WIP_11, TheUnderworld, HiveWorld, Lycheesis_Terrain_01, Salt_Flats, TwistWorldBiome, ParkourPancakes

70+ unique types catalogued across these files. All format decisions derived from real files — real files take precedence over docs on discrepancies.

---

## Tech Stack Versions & Compatibility

All versions verified against `package.json` and `Cargo.toml` as of **February 13, 2026** (v0.1.2).

### Core Stack

| Technology | Package | Version | Notes |
|------------|---------|---------|-------|
| **Tauri** | `tauri` / `@tauri-apps/cli` | 2.x | Cross-platform: macOS (WKWebView), Windows (WebView2), Linux (WebKitGTK) |
| **React** | `react` | ^19.0.0 | Required by React Flow 12 and R3F 9 |
| **TypeScript** | `typescript` | ^5.7.0 | Strict mode enabled, target ES2021 |
| **Vite** | `vite` | ^6.0.0 | Dev server on port 1420, HMR on 1421 |
| **pnpm** | `pnpm` | 10.28.2 | Locked via `packageManager` field |

### Frontend Libraries

| Library | Package | Version | Purpose |
|---------|---------|---------|---------|
| **React Flow** | `@xyflow/react` | ^12.10.0 | Node graph editor, dark mode via `colorMode="dark"` |
| **React Three Fiber** | `@react-three/fiber` | ^9.5.0 | 3D terrain mesh and voxel preview |
| **Three.js** | `three` | ^0.175.0 | WebGL2 rendering engine |
| **Drei** | `@react-three/drei` | ^9.0.0 | OrbitControls, helpers |
| **Postprocessing** | `@react-three/postprocessing` | ^3.0.4 | SSAO, edge outlines |
| **Zustand** | `zustand` | ^5.0.0 | State management (14 stores + 8 slices) |
| **Dagre** | `@dagrejs/dagre` | ^2.0.3 | Directed graph auto-layout |
| **Graphlib** | `@dagrejs/graphlib` | ^3.0.2 | Graph data structures for dagre |
| **Simplex Noise** | `simplex-noise` | ^4.0.3 | TypeScript noise evaluation in Web Workers |
| **Lucide React** | `lucide-react` | ^0.563.0 | Icon library |
| **Tailwind CSS** | `tailwindcss` | ^3.4.0 | Utility-first styling with custom earth/terrain theme |

### Rust Dependencies

| Crate | Version | Purpose |
|-------|---------|---------|
| **tauri** | 2 | App shell, IPC, window management |
| **tauri-plugin-dialog** | 2 | Native file/folder dialogs |
| **tauri-plugin-fs** | 2 | File system access |
| **serde** | 1 (derive) | Serialization framework |
| **serde_json** | 1 | JSON parsing/writing |
| **fastnoise-lite** | 1 | Noise generation (Simplex, Cell, Perlin, Value) |
| **thiserror** | 2 | Error type derivation |
| **reqwest** | 0.12 (json, rustls-tls) | HTTP client for bridge communication |
| **tokio** | 1 (rt-multi-thread) | Async runtime for bridge |

### Dev Dependencies

| Tool | Package | Version | Purpose |
|------|---------|---------|---------|
| **Vitest** | `vitest` | ^4.0.18 | Test runner (jsdom environment) |
| **Testing Library** | `@testing-library/react` | ^16.3.2 | Component testing |
| **ESLint** | `eslint` | ^9.0.0 | Linting |
| **jsdom** | `jsdom` | ^28.0.0 | DOM simulation for tests |
| **@vitejs/plugin-react** | `@vitejs/plugin-react` | ^4.0.0 | React Fast Refresh in dev |

### Build Configuration

| Setting | Value |
|---------|-------|
| **Bundle targets** | all (macOS DMG, Windows NSIS, Linux AppImage/deb) |
| **Rust release profile** | `opt-level = "s"`, LTO, codegen-units = 1, strip = true |
| **Vite manual chunks** | `three` (Three.js + R3F + Drei + postprocessing), `xyflow` (React Flow), `dagre` (layout) |
| **Path alias** | `@` → `./src` |
| **Window** | 1400×900 default, 1024×768 minimum, resizable |
| **CSP** | `default-src 'self'; connect-src 'self' http://localhost:*` (bridge access) |

### Compatibility Matrix

| Component | macOS 12+ | Windows 10+ | Linux (Ubuntu 22.04+) |
|-----------|-----------|-------------|----------------------|
| Tauri v2 | WKWebView | WebView2 | WebKitGTK |
| React Flow | ✅ | ✅ | ✅ |
| Three.js (WebGL2) | ✅ | ✅ | ⚠️ (see KI-1) |
| Canvas 2D | ✅ | ✅ | ✅ |
| File system | ✅ | ✅ | ✅ |
| Bridge (localhost HTTP) | ✅ | ✅ | ✅ |

---

## Architecture

### Project Structure

```
TerraNova/
├── src/                          # React frontend
│   ├── App.tsx                   # Root layout with panel system
│   ├── main.tsx                  # Entry point
│   ├── constants.ts              # App-wide constants
│   ├── index.css                 # Global styles + Tailwind
│   │
│   ├── components/               # UI components (by feature)
│   │   ├── editor/               # Node canvas, context menus, biome tabs, bookmarks,
│   │   │                         #   validation, quick-add panel, raw JSON view
│   │   ├── preview/              # 2D heatmap, 3D voxel, comparison view, statistics,
│   │   │                         #   cross-section, camera presets
│   │   ├── properties/           # Property panel, curve canvas, material layer stack,
│   │   │                         #   prop placement grid, field editors (slider, toggle,
│   │   │                         #   vector, array, color picker, dropdown)
│   │   ├── layout/               # Toolbar, StatusBar, PanelLayout
│   │   ├── home/                 # HomeScreen, TemplateCard, RecentTab, TemplatesTab
│   │   ├── sidebar/              # AssetTree, FileActions
│   │   ├── dialogs/              # ConfirmDialog, modals
│   │   ├── templates/            # Template browser components
│   │   ├── nodes/                # NodeThumbnail component
│   │   ├── ui/                   # Toast notifications
│   │   └── ErrorBoundary.tsx     # App-level error boundary
│   │
│   ├── nodes/                    # React Flow node components (50+ types)
│   │   ├── density/              # Noise, math, blend, clamp nodes (17 files)
│   │   ├── material/             # Material provider nodes
│   │   ├── curves/               # Curve type nodes
│   │   ├── patterns/             # Pattern nodes
│   │   ├── positions/            # Position provider nodes
│   │   ├── props/                # Prop placement nodes
│   │   ├── environment/          # Sky/lighting/fog nodes
│   │   ├── scanners/             # Column/surface scanner nodes
│   │   ├── vectors/              # Vector math nodes
│   │   ├── assignments/          # Biome assignment nodes
│   │   ├── shared/               # BaseNode, handle utilities
│   │   ├── GenericNode.tsx       # Fallback node for unrecognized types
│   │   ├── GroupNode.tsx         # Collapsible group node
│   │   ├── RootNode.tsx          # Root graph output node
│   │   ├── handleRegistry.ts     # Handle definitions for all node types
│   │   └── index.ts              # Node type exports and registration
│   │
│   ├── schema/                   # TypeScript V2 type definitions (18 files)
│   │   ├── types.ts              # Core type interfaces (AssetType, AssetValue)
│   │   ├── defaults.ts           # Default values for all V2 types
│   │   ├── density.ts            # 68 density function types
│   │   ├── densitySubcategories.ts # Density node subcategory grouping
│   │   ├── curves.ts             # 19 curve types
│   │   ├── material.ts           # 14 material providers + layers + conditions
│   │   ├── patterns.ts           # 15 pattern types
│   │   ├── positions.ts          # 14 position types
│   │   ├── props.ts              # 11 prop types + directionality
│   │   ├── scanners.ts           # 5 scanner types
│   │   ├── assignments.ts        # 5 assignment types
│   │   ├── vectors.ts            # 5 vector provider types
│   │   ├── environment.ts        # Environment + tint types
│   │   ├── constraints.ts        # Field validation constraints
│   │   ├── validation.ts         # Validation rule definitions
│   │   ├── fieldDescriptions.ts  # Field-level documentation (44KB)
│   │   ├── nodeTips.ts           # Node help tips (56KB)
│   │   └── snippets.ts           # Snippet templates for common patterns
│   │
│   ├── stores/                   # Zustand state management
│   │   ├── editorStore.ts        # Main editor state (nodes, edges, selection)
│   │   ├── previewStore.ts       # Preview mode, resolution, colormap settings
│   │   ├── projectStore.ts       # Project file state, save/load
│   │   ├── bridgeStore.ts        # Hytale bridge connection state
│   │   ├── diagnosticsStore.ts   # Graph validation diagnostics
│   │   ├── settingsStore.ts      # Editor preferences
│   │   ├── templateStore.ts      # Template browsing state
│   │   ├── recentProjectsStore.ts # Recent projects list
│   │   ├── propPlacementStore.ts # Prop visualizer state
│   │   ├── dragStore.ts          # Drag-and-drop state
│   │   ├── toastStore.ts         # Toast notification queue
│   │   ├── uiStore.ts            # UI state (panel sizes, dialogs)
│   │   ├── storeEvents.ts        # Cross-store event coordination
│   │   └── slices/               # Editor store slices
│   │       ├── graphSlice.ts     # Node/edge CRUD operations
│   │       ├── historySlice.ts   # Undo/redo command stack
│   │       ├── biomeSectionsSlice.ts # Biome section tab management
│   │       ├── biomeRangesSlice.ts   # Biome range editor state
│   │       ├── clipboardSlice.ts     # Copy/paste buffer
│   │       ├── configSlice.ts        # Per-file configuration
│   │       ├── fileCacheSlice.ts     # In-memory file cache
│   │       └── types.ts              # Slice type definitions
│   │
│   ├── hooks/                    # Custom React hooks (12 files)
│   │   ├── useTauriIO.ts         # File I/O + Hytale translation layer (31KB)
│   │   ├── useBridge.ts          # Bridge IPC wrappers
│   │   ├── usePreviewEvaluation.ts   # 2D preview pipeline
│   │   ├── useVoxelEvaluation.ts     # 3D voxel pipeline
│   │   ├── useWorldPreview.ts        # Live server chunk loading
│   │   ├── useComparisonEvaluation.ts # Side-by-side preview
│   │   ├── useConnectionValidation.ts # Edge type validation
│   │   ├── useGraphDiagnostics.ts    # Graph validation hook
│   │   ├── useKeyboardShortcuts.ts   # Keybinding system
│   │   ├── usePreview.ts             # Preview panel coordination
│   │   ├── usePositionOverlay.ts     # Prop position overlay
│   │   └── useFieldChange.ts         # Field edit handler
│   │
│   ├── utils/                    # Utility functions (35 files)
│   │   ├── densityEvaluator.ts   # Density graph evaluator (48KB, 50+ types)
│   │   ├── internalToHytale.ts   # Export: TerraNova → Hytale format (55KB)
│   │   ├── hytaleToInternal.ts   # Import: Hytale → TerraNova format (45KB)
│   │   ├── translationMaps.ts    # Bidirectional type/field mappings
│   │   ├── materialEvaluator.ts  # Material graph evaluator (23KB)
│   │   ├── materialResolver.ts   # Depth-based material assignment (16KB)
│   │   ├── graphToJson.ts        # React Flow graph → V2 JSON
│   │   ├── jsonToGraph.ts        # V2 JSON → React Flow graph
│   │   ├── graphDiagnostics.ts   # Graph validation rules
│   │   ├── voxelMeshBuilder.ts   # Greedy meshing for voxel preview
│   │   ├── worldMeshBuilder.ts   # Server chunk → mesh conversion
│   │   ├── voxelExtractor.ts     # Surface voxel extraction
│   │   ├── volumeEvaluator.ts    # 3D volume evaluation
│   │   ├── curveEvaluators.ts    # Curve type evaluators
│   │   ├── positionEvaluator.ts  # Position provider evaluator
│   │   ├── blockColorMap.ts      # Hytale block → render color
│   │   ├── colormaps.ts          # Heatmap color ramps
│   │   ├── autoLayout.ts         # Dagre auto-layout wrapper
│   │   ├── biomeSectionUtils.ts  # Biome section helpers
│   │   ├── clipboard.ts          # Copy/paste serialization
│   │   ├── exportAssetPack.ts    # Full asset pack export
│   │   ├── exportPreview.ts      # PNG export from preview
│   │   ├── statistics.ts         # Histogram, min/max/mean
│   │   ├── contourLines.ts       # Contour line generation
│   │   ├── crossSection.ts       # Cross-section visualization
│   │   ├── graphGeometry.ts      # Node positioning helpers
│   │   ├── alignDistribute.ts    # Align/distribute tools
│   │   ├── canvasTransform.ts    # Canvas pan/zoom
│   │   ├── fileTypeDetection.ts  # Asset type detection
│   │   ├── densityWorkerClient.ts # Worker lifecycle management
│   │   ├── volumeWorkerClient.ts  # Volume worker management
│   │   ├── ipc.ts                # Tauri IPC wrappers
│   │   ├── mapDirEntry.ts        # Directory entry mapping
│   │   ├── saveRef.ts            # Save reference tracking
│   │   ├── timeHelpers.ts        # Debounce/throttle
│   │   └── __tests__/            # 22 test files
│   │
│   ├── workers/                  # Web Workers
│   │   ├── densityWorker.ts      # 2D density grid evaluation
│   │   └── volumeWorker.ts       # 3D volume evaluation
│   │
│   ├── languages/                # Internationalization
│   │   ├── hytale.ts             # Hytale-native type names
│   │   ├── terranova.ts          # TerraNova display names
│   │   ├── types.ts              # Language type definitions
│   │   ├── index.ts              # Language exports
│   │   └── useLanguage.ts        # Language hook
│   │
│   ├── config/                   # Editor configuration
│   │   └── keybindings.ts        # Keyboard shortcut definitions
│   │
│   └── data/                     # Static data
│       └── templates.ts          # Template metadata
│
├── src-tauri/                    # Rust backend (Tauri)
│   ├── Cargo.toml                # Rust dependencies
│   ├── tauri.conf.json           # Tauri app configuration
│   ├── build.rs                  # Build script
│   ├── icons/                    # App icons (.icns, .ico, .png)
│   └── src/
│       ├── main.rs               # Entry point
│       ├── lib.rs                # Command registration (22 Tauri commands)
│       ├── commands/             # IPC command handlers
│       │   ├── io.rs             # File I/O, asset pack, template operations
│       │   ├── bridge.rs         # Bridge connection commands
│       │   ├── preview.rs        # Density evaluation
│       │   └── validate.rs       # Asset pack validation
│       ├── schema/               # Rust V2 type definitions (18 files)
│       │   ├── density.rs        # 68 density types
│       │   ├── biome.rs          # Biome, terrain, prop structures
│       │   ├── material.rs       # Material provider types
│       │   ├── validation.rs     # Schema validation rules
│       │   └── ...               # curves, patterns, positions, props,
│       │                         #   scanners, assignments, vectors,
│       │                         #   environment, block_masks, framework,
│       │                         #   settings, world_structure
│       ├── bridge/               # Hytale bridge client
│       │   ├── client.rs         # HTTP client with connection management
│       │   ├── types.rs          # Bridge request/response types
│       │   └── tests.rs          # Bridge unit tests
│       ├── io/                   # File system operations
│       │   ├── asset_pack.rs     # Asset pack read/write
│       │   └── template.rs       # Template extraction
│       └── noise/                # Noise evaluation
│           ├── evaluator.rs      # fastnoise-lite wrapper
│           └── nodes.rs          # Density node evaluation
│
├── templates/                    # Bundled starter templates (12 directories)
│   ├── void/                     # Minimal blank world
│   ├── forest-hills/             # Starter biome with terrain
│   ├── shattered-archipelago/    # Island terrain
│   ├── tropical-pirate-islands/  # Tropical islands
│   ├── eldritch-spirelands/      # Complex multi-layer biome
│   ├── desert/                   # Desert biome
│   ├── mountains/                # Mountain terrain
│   ├── floating-islands/         # Floating island biome
│   ├── forest/                   # Forest biome
│   ├── FHillsTest/               # Test variant
│   ├── FirstTry/                 # Experimental
│   └── references/               # Reference biome files from Hytale
│
├── scripts/                      # Build/deployment scripts
│   ├── export-template.ts        # Template export helper
│   └── import-template.ts        # Template import helper
│
├── docs/                         # Documentation
│   ├── CHANGELOG.md              # Release changelog
│   └── planning/                 # Planning documents
│       ├── ROADMAP.md            # Implementation roadmap (v2.0)
│       └── CONTEXT.md            # This file
│
├── patches/                      # pnpm package patches
├── public/                       # Static assets (icons)
├── package.json                  # Frontend dependencies
├── tsconfig.json                 # TypeScript config (strict, ES2021, bundler)
├── vite.config.ts                # Vite config (chunks, aliases, HMR)
├── vitest.config.ts              # Test config (jsdom environment)
├── tailwind.config.js            # Tailwind config (earth theme, node colors)
├── postcss.config.js             # PostCSS config
├── eslint.config.js              # ESLint config
└── index.html                    # HTML entry point
```

### Tauri Commands (22 registered)

**File I/O (9):**
`open_asset_pack`, `save_asset_pack`, `read_asset_file`, `write_asset_file`, `export_asset_file`, `copy_file`, `list_directory`, `create_from_template`, `create_blank_project`

**Validation (1):**
`validate_asset_pack`

**Preview (1):**
`evaluate_density`

**Bridge (11):**
`bridge_connect`, `bridge_disconnect`, `bridge_status`, `bridge_reload_worldgen`, `bridge_regenerate_chunks`, `bridge_teleport`, `bridge_player_info`, `bridge_fetch_palette`, `bridge_fetch_chunk`, `bridge_sync_file`

### Data Flow

```
User Action → React Component → Zustand Store → Graph State
                                      ↓
                               graphToJson.ts → internalToHytale.ts → V2 JSON → Tauri IPC → Disk
                                      ↑
                               jsonToGraph.ts ← hytaleToInternal.ts ← V2 JSON ← Tauri IPC ← Disk

Graph State → Web Worker (density/volume) → Preview Component (2D/3D/Voxel)
                                                       ↑
Bridge Client ← Tauri IPC ← Rust reqwest ← Hytale Server (TerraNovaBridge plugin)
```

### Evaluation Pipeline

Density evaluation runs entirely in TypeScript Web Workers (not Rust) to avoid IPC overhead for per-pixel evaluation:

1. `densityWorker.ts` — 2D grid evaluation (NxN) for heatmap preview
2. `volumeWorker.ts` — 3D volume evaluation (N³) for voxel preview
3. Progressive resolution: 16³ → 32³ → 64³ → 128³ for instant feedback
4. `Float32Array` transfer (structured clone) for zero-copy results

The Rust-side `evaluate_density` command exists for single-point evaluation but is not used in the preview pipeline.

### Translation Layer

Bidirectional translation between TerraNova's internal format and Hytale's native editor format:

| Aspect | TerraNova Internal | Hytale Native |
|--------|--------------------|---------------|
| Type names | `Product`, `Negate`, `CurveFunction` | `Multiplier`, `Inverter`, `CurveMapper` |
| Noise params | `Frequency`, `Gain` | `Scale`, `Persistence` |
| Child inputs | Named handles (`Input`, `InputA`, `Condition`) | `Inputs[]` arrays |
| Node metadata | React Flow positions | `$NodeId` UUIDs + `$NodeEditorMetadata` |
| Materials | `"material_name"` strings | `{ $NodeId, Solid: "Block_Name" }` objects |
| Curve points | `[x, y]` array pairs | `{ $NodeId, In, Out }` objects |
| Seeds | Numeric | String (e.g. `"A"`) |

26 confirmed type mappings, 30+ density input handle mappings, 20+ `$NodeId` prefix rules, 10+ per-type field transformers. All transforms are bidirectional and round-trip tested.

### Bundled Templates (5 in production builds)

Per `tauri.conf.json`, these templates are bundled as resources:

1. **void** — Minimal blank world (Settings + WorldStructure + one empty biome)
2. **forest-hills** — Starter biome with terrain base density function
3. **shattered-archipelago** — Island terrain with multiple density layers
4. **tropical-pirate-islands** — Tropical island biome
5. **eldritch-spirelands** — Complex multi-layer biome with full translation layer

Additional templates exist in the `templates/` directory for development/testing (desert, mountains, floating-islands, forest, FHillsTest, FirstTry, references) but are not bundled in production builds.

### Theme System

Custom earth/terrain theme defined in `tailwind.config.js`:

| Token | Hex | Usage |
|-------|-----|-------|
| `tn-bg` | `#1c1a17` | App background |
| `tn-bg-secondary` | `#242119` | Secondary background |
| `tn-bg-tertiary` | `#2e2a24` | Tertiary background |
| `tn-surface` | `#262320` | Card/surface background |
| `tn-panel` | `#312d28` | Panel background |
| `tn-border` | `#4a4438` | Border color |
| `tn-text` | `#e8e2d9` | Primary text |
| `tn-text-muted` | `#9a9082` | Muted text |
| `tn-text-secondary` | `#c4baa8` | Secondary text |
| `tn-accent` | `#b5924c` | Primary accent (gold) |
| `tn-accent-secondary` | `#6b8f5e` | Secondary accent (green) |
| `tn-highlight` | `#7a9e68` | Highlight color |

**Node category colors:**

| Category | Hex | Color |
|----------|-----|-------|
| Density | `#5B8DBF` | Blue |
| Material | `#C87D3A` | Orange |
| Curve | `#A67EB8` | Purple |
| Pattern | `#D4A843` | Yellow |
| Position | `#6B9E5A` | Green |
| Direction | `#B8648B` | Pink |
| Scanner | `#5AACA6` | Teal |
| Math | `#8C8878` | Gray |

---

## Known Issues

### KI-1: WebGL2 in Tauri Webviews

**Severity:** Medium
**Affects:** 3D preview (voxel, terrain mesh)
**Platforms:** Primarily Linux (WebKitGTK)

WebGL2 has reported rendering issues in Tauri's webview component on some Linux configurations. Modern webview versions generally support WebGL2, but older system webviews may not.

**Mitigation:** 2D Canvas heatmap is the primary preview mode. 3D/voxel preview is a progressive enhancement with runtime WebGL2 detection.

**Status:** Not observed on macOS or Windows in v0.1.x releases. Linux testing pending.

### KI-2: Noise Implementation Approximation

**Severity:** Low
**Affects:** Preview accuracy

TerraNova uses `simplex-noise` (TypeScript) in Web Workers for preview evaluation. Hytale's internal noise implementation may differ (different gradient tables, distance functions). Preview output is approximate.

**Mitigation:** Documented as "approximate preview." Users verify final output on a Hytale server. The bridge integration (live chunk loading) provides exact server-side rendering.

**Status:** Accepted risk. By design, TerraNova is a design tool, not a pixel-perfect emulator.

### KI-3: React Flow Performance at Scale

**Severity:** Low
**Affects:** Node graph editor with 60+ nodes

React Flow renders nodes as DOM elements. Complex custom components at 60+ nodes may degrade rendering performance.

**Mitigation:** All custom node components use `React.memo`. Inline density thumbnails are opt-in with viewport culling and a 30-canvas hard limit. Real Hytale biome files (60–100 nodes) have been successfully loaded and edited.

**Status:** Manageable. Performance is acceptable for real-world Hytale biomes tested so far.

### KI-4: Windows Path Separators

**Severity:** Low (fixed in v0.1.1)
**Affects:** Biome file detection on Windows

Windows uses backslash path separators, which broke biome file detection (`/biomes/` vs `\biomes\`).

**Mitigation:** Fixed in v0.1.1 — `isBiomeFile()` now checks both separators; path construction normalizes backslashes.

**Status:** Resolved.

### KI-5: Object-Typed Field Values in Nodes

**Severity:** Low (fixed in v0.1.2)
**Affects:** Nodes with object field values (e.g. `{x, y, z}` coordinates)

Rendering object values directly as React children caused React error #31 crash.

**Mitigation:** Fixed in v0.1.2 — `safeDisplay` utility JSON-stringifies objects. Per-node `NodeBodyBoundary` error boundaries catch render errors at the individual node level.

**Status:** Resolved.

---

## Architecture Decision Records

### ADR-1: Tauri over Electron

**Decision:** Tauri v2

**Rationale:**
- ~10MB bundle vs Electron's ~150-200MB
- Rust backend for native-speed noise evaluation and bridge HTTP client
- Lower RAM usage (system webview, not bundled Chromium)
- Tauri v2 stable since 2025

**Consequence:** Platform webview differences require testing on all platforms. WebGL2 support varies by webview (mitigated by 2D Canvas as primary preview).

### ADR-2: React Flow for Node Graph

**Decision:** React Flow v12 (`@xyflow/react`)

**Rationale:**
- MIT licensed, free for open-source
- Built-in minimap, controls, dark mode, selection, zoom/pan
- Custom node components with full React control
- React 19 compatible
- Handles 100+ node graphs with `React.memo` optimization

**Consequence:** DOM-based rendering limits performance at very large scales. Acceptable for Hytale biomes (typically 20–100 nodes).

### ADR-3: TypeScript Web Workers over Rust for Preview

**Decision:** Density and volume evaluation run in TypeScript Web Workers, not Rust.

**Rationale:**
- Avoids IPC overhead for per-pixel evaluation (thousands of calls per frame)
- Enables progressive resolution (instant feedback at low res, refine to high res)
- `Float32Array` structured clone for zero-copy data transfer
- `simplex-noise` library provides deterministic noise in TypeScript
- Simpler debugging and iteration during development

**Consequence:** Evaluation may be slower than native Rust for very large grids. Acceptable because progressive resolution provides instant feedback. The Rust `evaluate_density` command exists as a fallback for single-point evaluation.

### ADR-4: Zustand for State Management

**Decision:** Zustand v5

**Rationale:**
- Lightweight (~1KB), minimal boilerplate
- Natural fit with React Flow's state model
- Multiple independent stores (14 stores + 8 slices)
- No provider wrapping needed
- Middleware support for undo/redo via command pattern

**Consequence:** Less structured than Redux. Mitigated by clear store boundaries, TypeScript types, and slice-based decomposition of the main editor store.

### ADR-5: GitHub-Only Distribution

**Decision:** GitHub for all hosting, distribution, templates, CI/CD.

**Rationale:**
- $0/month for open-source
- GitHub Actions free tier for CI/CD
- GitHub Releases for platform-specific installers
- GitHub Pages for template index (planned)
- Community already on GitHub

**Consequence:** Rate limiting on GitHub API for template downloads. Mitigated by caching index and downloading only on user request.

### ADR-6: Bidirectional Translation Layer

**Decision:** Full bidirectional translation between TerraNova's internal format and Hytale's native editor format.

**Rationale:**
- TerraNova uses cleaner field names internally (e.g. `Frequency` vs `Scale`)
- Named handles are more intuitive than `Inputs[]` arrays
- Auto-detection on import: `isHytaleNativeFormat()` checks for `$NodeId` presence
- Round-trip fidelity: import → edit → export preserves all data
- Ground truth: 9 real Hytale biome files as test corpus

**Consequence:** Translation layer is complex (~100KB across 3 files) but thoroughly tested (54 dedicated tests). Any new Hytale format changes require updating both directions.

### ADR-7: Earth/Terrain Color Theme

**Decision:** Custom dark earth-toned theme instead of standard dark mode.

**Rationale:**
- Distinct visual identity (not generic dark mode)
- Earth tones align with the worldgen/terrain focus
- Node category colors provide clear visual grouping
- Reduced eye strain for long editing sessions

**Consequence:** More custom CSS than a standard theme. Managed via Tailwind config tokens (`tn-*` prefix).

---

## Setup Instructions for Contributors

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 22.x LTS | [nodejs.org](https://nodejs.org/) or `nvm install 22` |
| **pnpm** | 10.x | `npm install -g pnpm` |
| **Rust** | stable (1.77+) | [rustup.rs](https://rustup.rs/) |
| **Tauri CLI** | 2.x | Installed via project devDependencies |

#### Platform-Specific Requirements

**macOS:**
- Xcode Command Line Tools: `xcode-select --install`
- macOS 12 Monterey or later

**Windows:**
- Visual Studio Build Tools (C++ workload)
- WebView2 Runtime (usually pre-installed on Windows 10+)
- Windows 10 version 1803 or later

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

### Getting Started

```bash
# Clone the repo
git clone https://github.com/HyperSystems-Development/TerraNova.git
cd TerraNova

# Install frontend dependencies
pnpm install

# Start development mode (launches Tauri window with hot reload)
pnpm tauri dev

# Build for production
pnpm tauri build

# Run frontend tests
pnpm test

# Run Rust tests
cd src-tauri && cargo test

# Lint
pnpm lint
```

### Contributing a Node Type

Each V2 node type is an independent React component:

1. Find the type in `hytale-server-docs/docs/worldgen/` documentation
2. Create/edit the component in `src/nodes/<category>/<TypeName>Node.tsx`
3. Register the node in `src/nodes/index.ts` and `src/nodes/handleRegistry.ts`
4. Add TypeScript types in `src/schema/<category>.ts`
5. Add default values in `src/schema/defaults.ts`
6. Add translation mappings in `src/utils/translationMaps.ts` (if type name differs in Hytale)
7. Update evaluator in `src/utils/densityEvaluator.ts` (if density type)
8. Write tests for JSON round-trip serialization

Node types are parallelizable — multiple contributors can work on different node types simultaneously.

### Contributing a Template

Templates live in the `templates/` directory:

1. Create a directory with your template name (kebab-case)
2. Add `manifest.json` with metadata (name, description, author, version)
3. Add the full `HytaleGenerator/` asset pack structure:
   - `HytaleGenerator/Settings/Settings.json`
   - `HytaleGenerator/WorldStructures/MainWorld.json`
   - `HytaleGenerator/Biomes/<BiomeName>.json`
   - `HytaleGenerator/Density/<DensityName>.json` (optional)
4. Validate by loading on a Hytale server
5. Submit a PR

To bundle a new template in production builds, add it to the `resources` array in `src-tauri/tauri.conf.json`.

---

## Project Links

| Resource | URL |
|----------|-----|
| **Source Code** | https://github.com/HyperSystems-Development/TerraNova |
| **Releases** | https://github.com/HyperSystems-Development/TerraNova/releases |
| **Templates Repo** | https://github.com/HyperSystems-Development/terranova-templates (planned) |
| **Worldgen Docs** | `hytale-server-docs/docs/worldgen/` (19 files, decompiled) |
| **Discord** | https://discord.gg/NHPzsjkQeu |
| **HyperPerms** | https://github.com/HyperSystems-Development/HyperPerms |
| **HyperHomes** | https://github.com/HyperSystems-Development/HyperHomes |
| **HyperFactions** | https://github.com/HyperSystems-Development/HyperFactions |

### External References

| Resource | URL |
|----------|-----|
| Tauri v2 Docs | https://tauri.app/ |
| React Flow Docs | https://reactflow.dev/ |
| React Three Fiber | https://docs.pmnd.rs/react-three-fiber/ |
| simplex-noise | https://github.com/jwagner/simplex-noise.js |
| dagre | https://github.com/dagrejs/dagre |
| Zustand | https://github.com/pmndrs/zustand |
| Tailwind CSS | https://tailwindcss.com/ |

---

*Document version 2.0 — February 13, 2026*
