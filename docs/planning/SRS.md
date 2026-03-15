# TerraNova — Software Requirements Specification

**Version:** 1.0
**Date:** 2026-02-06
**Organization:** HyperSystems-Development
**License:** LGPL-2.1
**Based on:** IEEE 830-1998

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [Data Requirements](#5-data-requirements)
6. [External Interface Requirements](#6-external-interface-requirements)
7. [Constraints](#7-constraints)

---

## 1. Introduction

### 1.1 Purpose

This document specifies the software requirements for TerraNova, a standalone desktop design studio for Hytale's World Generation V2 system. It serves as the primary reference for development, testing, and validation.

### 1.2 Scope

TerraNova is a Tauri-based desktop application that provides:
- A visual node graph editor for V2 worldgen asset packs
- Real-time terrain preview via local noise evaluation
- A community template marketplace hosted on GitHub
- Schema validation for V2 JSON assets
- Specialized sub-editors for curves, biome ranges, and material layers

TerraNova does **not**:
- Replace Hytale's built-in editor
- Require a running Hytale server
- Require an internet connection for core functionality
- Generate revenue or collect telemetry

### 1.3 Definitions

| Term | Definition |
|------|-----------|
| **V2** | Hytale's World Generation V2 system — asset-driven procedural terrain |
| **Asset Pack** | A directory of JSON files following V2's directory structure (`HytaleGenerator/`) |
| **Density Function** | A node in V2's DAG that produces a scalar value at a 3D position |
| **Node Graph** | Visual representation of a density function DAG (directed acyclic graph) |
| **Template** | A pre-built asset pack bundled or community-shared as a starting point |
| **IPC** | Inter-process communication between the React frontend and Rust backend via Tauri |

### 1.4 References

- Hytale Server Pre-release `2026.02.05-9ce2783f7`
- `hytale-server-docs/docs/worldgen/` — 19 documentation files
- Tauri v2 documentation
- React Flow v12 (@xyflow/react) documentation
- IEEE 830-1998 Recommended Practice for Software Requirements Specifications

### 1.5 Target Hytale Version

TerraNova 1.0 targets Hytale server pre-release **2026.02.05-9ce2783f7**. Future releases will track Hytale version changes via schema updates.

---

## 2. Overall Description

### 2.1 Product Perspective

TerraNova is a new standalone product within the HyperSystems-Development ecosystem (alongside HyperPerms, HyperHomes, HyperFactions). It occupies the **design phase** in a complementary toolchain:

- **TerraNova** — offline design, template sharing, schema validation
- **HyPaint** (3rd party) — live production editing with server sync
- **Hytale built-in editor** — in-game quick tweaks

### 2.2 Product Functions

| Function | Priority |
|----------|----------|
| Open/browse/save V2 asset pack directories | P0 (Phase 1) |
| Auto-generated property forms from V2 schema | P0 (Phase 1) |
| JSON schema validation with error reporting | P0 (Phase 1) |
| Visual node graph editor for all V2 types | P0 (Phase 2) |
| Node palette with search and categorization | P0 (Phase 2) |
| Auto-layout (dagre/elkjs) | P0 (Phase 2) |
| Undo/redo | P0 (Phase 2) |
| Bidirectional sync: graph ↔ JSON | P0 (Phase 2) |
| Specialized curve editor | P1 (Phase 3) |
| Specialized biome range editor | P1 (Phase 3) |
| Specialized material layer editor | P1 (Phase 3) |
| 2D density heatmap preview | P1 (Phase 4) |
| 3D terrain mesh preview | P2 (Phase 4) |
| Bundled starter templates | P1 (Phase 5) |
| Community template browser | P2 (Phase 5) |

### 2.3 User Classes

| User Class | Description | Technical Level |
|------------|-------------|----------------|
| **Server Operator** | Runs Hytale servers, wants custom worlds | Intermediate — comfortable with file systems and JSON |
| **Modder** | Creates Hytale mods, familiar with data-driven systems | Advanced — understands noise functions, node graphs |
| **Content Creator** | Designs worlds for YouTube/Twitch content | Beginner to intermediate — needs guided workflow |
| **Template Author** | Creates and shares templates for the community | Advanced |

### 2.4 Operating Environment

- **macOS** 12+ (WKWebView)
- **Windows** 10+ (WebView2)
- **Linux** (WebKitGTK — Ubuntu 22.04+, Fedora 38+, Arch)

### 2.5 Assumptions and Dependencies

1. Hytale V2 JSON format remains structurally stable across pre-release versions
2. V2 asset types use a `"Type"` field for polymorphic dispatch
3. The file system structure (`HytaleGenerator/Biomes/`, `HytaleGenerator/Density/`, etc.) is stable
4. React Flow v12 continues to be MIT-licensed for open-source projects
5. GitHub Pages and GitHub Releases remain free for open-source projects

---

## 3. Functional Requirements

### 3.1 Asset Pack I/O (FR-IO)

#### FR-IO-1: Open Asset Pack
The system shall allow users to select and open a V2 asset pack directory (`HytaleGenerator/`) from the local file system.

**Acceptance:** Selecting a valid directory populates the asset tree sidebar with all JSON files organized by category.

#### FR-IO-2: Parse JSON Assets
The system shall parse all JSON files in the asset pack directory, deserializing them according to V2's polymorphic type system (`"Type"` field dispatch).

**Acceptance:** All known V2 types (200+) are correctly parsed. Unknown types are loaded as raw JSON with a warning.

#### FR-IO-3: Save Asset Pack
The system shall write modified asset data back to JSON files in the original directory structure.

**Acceptance:** Saved JSON is valid, properly formatted (4-space indentation), and loadable by a Hytale server.

#### FR-IO-4: New Project from Template
The system shall create a new asset pack directory from a selected template, copying all template files to the user-specified location.

**Acceptance:** New project directory matches template structure. All files are independent copies (not symlinks).

#### FR-IO-5: File Watching
The system should detect external changes to asset pack files and offer to reload.

**Acceptance:** If a file is modified externally while open, the user receives a notification with reload/ignore options.

### 3.2 Node Graph Editor (FR-NG)

#### FR-NG-1: Custom Node Components
The system shall render custom node components for all V2 asset types, organized by category:

| Category | Types | Node Count |
|----------|-------|-----------|
| Density Functions | Noise, Math, Clamping, Mapping, Mixing, Transforms, Warping, Shapes, Accessors, Caching, Conditional, Positions-based, Pipeline | 68 |
| Material Providers | Basic, Depth-based, Horizontal, Density-driven, Composition, SpaceAndDepth | 14 |
| Props | Shape, Prefab, Composition, Transformation | 11 |
| Curves | Primary, Arithmetic, Clamping, Min/Max | 19 |
| Patterns | Surface, Block, Spatial, Logic | 15 |
| Position Providers | Static, Grid, Filtering, Transformation, Composition, Reference | 14 |
| Scanners | Origin, Column, Area | 5 |
| Assignments | Constant, FieldFunction, Sandwich, Weighted | 5 |
| Environment/Tint | Constant, DensityDelimited | 4 |
| Vector Providers | Constant, DensityGradient, Cache, Exported | 5 |

**Acceptance:** Each type renders as a distinct node with appropriate input/output handles, color coding, and field display.

#### FR-NG-2: Node Palette
The system shall provide a categorized, searchable node palette. Users can drag nodes from the palette onto the canvas or use a keyboard shortcut to add nodes at the cursor position.

**Acceptance:** All 200+ types are browsable by category. Search returns results within 100ms.

#### FR-NG-3: Connection Validation
The system shall validate connections between nodes, ensuring type-safe handles:
- Density → Density
- Curve → Curve
- Material → Material
- Pattern → Pattern
- Position → Position
- Scanner → Scanner
- Assignment → Assignment
- Vector → Vector

**Acceptance:** Invalid connections are visually rejected (red highlight, snap-back animation). Valid connections show in the connection's category color.

#### FR-NG-4: Bidirectional Sync
The system shall maintain bidirectional sync between the visual node graph and the underlying V2 JSON:
- **Graph → JSON:** Changes in the node graph produce valid V2 JSON
- **JSON → Graph:** Loading V2 JSON produces an accurate node graph

**Acceptance:** Round-trip test: load JSON → render graph → export JSON → compare with original. All fields preserved.

#### FR-NG-5: Auto-Layout
The system shall provide a one-click auto-layout feature that arranges nodes to minimize wire crossings using a directed graph layout algorithm (dagre or elkjs).

**Acceptance:** Layout produces a readable arrangement for graphs with up to 100 nodes. No node overlaps.

#### FR-NG-6: Undo/Redo
The system shall support undo/redo for all graph operations (add node, delete node, move node, add connection, remove connection, change property value).

**Acceptance:** Ctrl+Z undoes the last operation. Ctrl+Shift+Z / Ctrl+Y redoes. History supports at least 100 operations.

#### FR-NG-7: Minimap
The system shall display a minimap overlay showing the full graph extent with a viewport indicator.

**Acceptance:** Minimap accurately reflects node positions. Clicking the minimap navigates to that area.

#### FR-NG-8: Node Search
The system shall provide a search function (Ctrl+F) to find nodes by type name, display name, or field value.

**Acceptance:** Search highlights matching nodes and allows navigation between results.

#### FR-NG-9: Collapsible Groups
The system shall allow users to select multiple nodes and collapse them into a single group node.

**Acceptance:** Group node shows group name and input/output connections from internal nodes. Expanding restores original layout.

#### FR-NG-10: Keyboard Shortcuts
The system shall support keyboard shortcuts:

| Shortcut | Action |
|----------|--------|
| Delete/Backspace | Delete selected nodes/connections |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z / Ctrl+Y | Redo |
| Ctrl+F | Search nodes |
| Ctrl+A | Select all |
| Space (hold) | Pan canvas |
| Ctrl+G | Group selected nodes |
| Ctrl+S | Save |

#### FR-NG-11: Color Coding
The system shall color-code nodes matching Hytale's scheme:

| Category | Color |
|----------|-------|
| Material | Orange (#FF8C00) |
| Density/Runtime | Blue (#4A90D9) |
| Position | Green (#4CAF50) |
| Directionality | Pink (#E91E63) |
| Scanner | Teal (#00BCD4) |
| Curve | Purple (#9C27B0) |
| Pattern | Yellow (#FFC107) |
| Math/Utility | Gray (#9E9E9E) |

#### FR-NG-12: Hover Tooltips
The system shall display tooltips on node hover containing:
- Type name and description
- Field descriptions from V2 documentation
- Default values

**Acceptance:** Tooltip appears within 300ms of hover. Content matches documentation.

### 3.3 Property Panel (FR-PP)

#### FR-PP-1: Auto-Generated Forms
The system shall auto-generate form fields from V2 schema for the selected node:

| Field Type | Control |
|-----------|---------|
| `double` / `float` | Slider + numeric input |
| `int` | Slider + numeric input (integer-constrained) |
| `boolean` | Toggle switch |
| `string` | Text input |
| `enum` | Dropdown |
| `Vector3d` / `Vector3i` | Three-field input (X, Y, Z) |
| `Color` | Color picker |
| Asset reference | Dropdown or "browse" button |
| Array | Expandable list with add/remove |

**Acceptance:** Every field of every V2 type is editable through the property panel.

#### FR-PP-2: Inline Validation
The system shall validate field values in real-time:
- Red border on invalid fields
- Error tooltip explaining the constraint
- Valid values shown with normal styling

**Acceptance:** Constraints from the V2 schema are enforced (e.g., `SectionSize > 0`, `Range >= 0`).

#### FR-PP-3: Default Values
The system shall populate fields with V2-documented default values when a new node is created.

**Acceptance:** New nodes have all fields set to documented defaults. Users can reset individual fields to defaults.

### 3.4 Specialized Sub-Editors (FR-SE)

#### FR-SE-1: Biome Range Editor
The system shall provide a horizontal range editor for BiomeRangeAsset arrays:
- Horizontal axis: noise value [-1.0, 1.0]
- Draggable range blocks per biome
- Visual overlap warnings
- Editable DefaultTransitionDistance

**Acceptance:** Editing ranges in the editor updates the JSON. Ranges map correctly to BiomeRangeAsset Min/Max fields.

#### FR-SE-2: Curve Editor
The system shall provide a 2D curve editor for Manual curves:
- 2D canvas with X-axis (input) and Y-axis (output)
- Draggable control points (PointInOutAsset)
- Real-time curve shape preview (piecewise linear interpolation)
- Add/remove points
- Support for all 19 curve types (with appropriate visualization)

**Acceptance:** Manual curve points map correctly to `Points: PointInOutAsset[]`. Editing is smooth at 60fps.

#### FR-SE-3: Material Layer Stack
The system shall provide a vertical layer editor for SpaceAndDepth material providers:
- Layers stacked vertically (like Photoshop layers)
- Each layer shows material + thickness + conditions
- Drag to reorder layers
- Visual depth representation

**Acceptance:** Layer order maps to SpaceAndDepth `Layers[]` array order. Layer type (ConstantThickness, NoiseThickness, RangeThickness, WeightedThickness) is selectable.

#### FR-SE-4: Prop Placement Visualizer
The system shall provide a 2D top-down grid showing position provider output:
- Grid visualization of where positions are generated
- Density overlay showing occurrence probability
- Toggle between position providers within a biome

**Acceptance:** Grid resolution is configurable. Positions accurately reflect Mesh2D spacing and jitter.

#### FR-SE-5: Settings Panel
The system shall provide a simple form for SettingsAsset:
- `CustomConcurrency` (int, default: -1)
- `BufferCapacityFactor` (double, default: 0.3)
- `TargetViewDistance` (double, default: 512.0)
- `TargetPlayerCount` (double, default: 3.0)
- `StatsCheckpoints` (int array)

**Acceptance:** All settings fields editable with appropriate controls and constraints.

### 3.5 Preview Engine (FR-PE)

#### FR-PE-1: Noise Evaluation Engine
The Rust backend shall evaluate noise functions:
- SimplexNoise2D, SimplexNoise3D
- CellNoise2D, CellNoise3D
- All ReturnType variants for cell noise

Using fastnoise-lite with parameters matching V2's field definitions (Scale, Lacunarity, Persistence, Octaves, Seed, Jitter).

**Acceptance:** Noise output is deterministic for the same seed. Values are in expected ranges.

#### FR-PE-2: Density Graph Evaluator
The Rust backend shall evaluate density function DAGs at sample positions:
- Walk the node DAG from output to inputs
- Evaluate each node type with correct semantics
- Handle: noise generators, math ops, clamping, normalizing, coordinate transforms, mixing, warping, shape primitives
- Context-dependent types (Terrain, BaseHeight) return configurable defaults

**Acceptance:** Core density types (30+ of 68) produce correct values. Complex types document their approximation behavior.

#### FR-PE-3: Sample Grid Evaluation
The Rust backend shall evaluate density at an NxN grid of positions and return results as a binary Float32Array via Tauri IPC.

**Acceptance:** Grid sizes from 32x32 to 256x256 evaluate and transfer in <200ms on a modern machine.

#### FR-PE-4: 2D Heatmap Preview
The system shall render a grayscale density heatmap on an HTML Canvas:
- White = high density, Black = low density (or configurable color ramp)
- Updates on slider change (debounced 100ms)
- Configurable sample range (world coordinates)

**Acceptance:** Heatmap reflects density values accurately. Slider changes produce visible preview updates within 200ms.

#### FR-PE-5: 3D Terrain Mesh Preview
The system shall render a 3D terrain mesh using React Three Fiber:
- PlaneGeometry with vertex Y displacement from density values
- OrbitControls for camera rotation/zoom/pan
- Configurable resolution (32x32 to 256x256 vertices)
- Wireframe toggle

**Acceptance:** Terrain mesh accurately represents the density function's output as heightfield. Camera controls are smooth.

#### FR-PE-6: Per-Node Preview
The system shall allow clicking any density node to see its isolated output in the preview panel.

**Acceptance:** Clicking a node updates the preview to show that node's output (not the full graph output).

### 3.6 Template System (FR-TS)

#### FR-TS-1: Bundled Templates
The application shall bundle 5 starter templates:

| Template | Description |
|----------|-------------|
| Void | Minimal — just the directory structure with empty/minimal assets |
| Flat Plains | Simple terrain, grass/dirt/stone material layers |
| Forest | Complex terrain, tree props, multiple materials |
| Desert | Sand dunes, cacti, mesa formations |
| Floating Islands | 3D shapes, gravity-defying terrain using shape primitives |

**Acceptance:** Each template is a valid V2 asset pack that loads on a Hytale server without errors.

#### FR-TS-2: Template Browser
The system shall provide a grid-based template browser UI:
- Template cards with name, description, author, preview thumbnail
- Category filtering
- Search
- "Bundled" vs "Community" tabs

**Acceptance:** Browser displays all bundled templates. Community templates load from the GitHub index.

#### FR-TS-3: Community Template Index
The system shall fetch a template index from GitHub Pages (`https://hypersystemsdev.github.io/terranova-templates/index.json`) when online.

**Acceptance:** Index loads within 5 seconds on broadband. Graceful degradation when offline (shows bundled templates only).

#### FR-TS-4: Template Download
The system shall download community templates from the GitHub repo and extract them to a user-specified location.

**Acceptance:** Downloaded template is a complete, valid asset pack. Progress indicator during download.

#### FR-TS-5: Save as Template
The system shall allow users to export their current project as a template with metadata (name, description, author, target Hytale version).

**Acceptance:** Exported template includes `manifest.json` with metadata and all asset pack files.

#### FR-TS-6: Template Versioning
Each template shall specify which Hytale server version it targets.

**Acceptance:** Template `manifest.json` includes `serverVersion` field. Browser displays version compatibility warnings.

### 3.7 Validation (FR-VA)

#### FR-VA-1: Schema Validation
The Rust backend shall validate asset pack JSON against V2 schema definitions:
- Missing required fields
- Type mismatches
- Value constraint violations (e.g., negative values where >= 0 is required)
- Circular references in density DAGs
- Unknown type names

**Acceptance:** Validation runs on save and on-demand. Results are displayed in an errors panel with file/field location.

#### FR-VA-2: Real-Time Frontend Validation
The React frontend shall validate field values as they're edited:
- Numeric range checking
- Required field presence
- Enum value validity

**Acceptance:** Invalid values show red borders and error tooltips within 100ms of input.

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric | Target |
|--------|--------|
| Application startup | < 3 seconds |
| Asset pack loading (100 JSON files) | < 2 seconds |
| Node graph rendering (100 nodes) | 60fps canvas interaction |
| Slider-to-preview latency | < 200ms |
| Density grid evaluation (128x128) | < 100ms |
| Auto-layout (100 nodes) | < 500ms |
| JSON save (100 files) | < 1 second |
| Template index fetch | < 5 seconds |
| Memory usage (typical session) | < 512MB |

### 4.2 Reliability

- **Auto-save:** Drafts saved every 60 seconds to a `.terranova/` directory within the project
- **Crash recovery:** On startup, detect unsaved drafts and offer to restore
- **Data integrity:** JSON output is always valid — never write partial/corrupt files (write to temp, then atomic rename)

### 4.3 Usability

- **Dark theme** as default (matching Hytale's editor aesthetic)
- **Progressive disclosure** — complexity revealed incrementally
- **Inline documentation** — tooltips on every field
- **Keyboard-navigable** — all primary actions accessible via keyboard
- **Responsive layout** — panels resize smoothly, minimum window size 1024x768

### 4.4 Portability

| Platform | Webview | Status |
|----------|---------|--------|
| macOS 12+ | WKWebView | Primary target |
| Windows 10+ | WebView2 | Primary target |
| Linux (Ubuntu 22.04+) | WebKitGTK | Secondary target |

### 4.5 Bundle Size

| Component | Target |
|-----------|--------|
| Application installer | < 15MB |
| With bundled templates | < 20MB |

### 4.6 Offline Capability

All core functionality (editing, preview, validation, bundled templates) shall work without an internet connection. Only community template browsing and downloading requires connectivity.

### 4.7 Accessibility

- Color-blind friendly: node colors supplemented with shape/icon indicators
- Keyboard navigation for all primary workflows
- Minimum contrast ratio 4.5:1 for text on backgrounds

---

## 5. Data Requirements

### 5.1 V2 Schema — Complete Type Definitions

The following types must be represented in both the TypeScript frontend schema and the Rust backend schema.

#### 5.1.1 Root Types

**WorldStructureAsset (NoiseRange)**

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `Biomes` | BiomeRangeAsset[] | Yes | — |
| `Density` | DensityAsset | Yes | Constant(0) |
| `DefaultBiome` | string | Yes | — |
| `DefaultTransitionDistance` | int | Yes | 32 |
| `MaxBiomeEdgeDistance` | int | Yes | 0 |
| `Framework` | FrameworkAsset[] | No | [] |
| `SpawnPositions` | PositionProviderAsset | No | List() |

**BiomeRangeAsset**

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `Biome` | string (BiomeAsset ref) | Yes | — |
| `Min` | double | Yes | -1.0 |
| `Max` | double | Yes | 1.0 |

**BiomeAsset**

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `Name` | string | No | "" |
| `Terrain` | TerrainAsset | Yes | — |
| `FloatingFunctionNodes` | DensityAsset[] | No | [] |
| `MaterialProvider` | MaterialProviderAsset | Yes | — |
| `Props` | PropRuntimeAsset[] | No | [] |
| `EnvironmentProvider` | EnvironmentProviderAsset | No | — |
| `TintProvider` | TintProviderAsset | No | — |

**TerrainAsset (DAOTerrain)**

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `Density` | DensityAsset | Yes | Constant(0) |

**PropRuntimeAsset** (wrapper for each Props array entry)

Each entry in the biome's `Props` array is a `PropRuntimeAsset` — a wrapper object that ties together a position provider, assignment chain, and execution phase. This is **not** a typed asset (it has no `Type` field); it is a structural container.

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `Runtime` | int | No | 0 |
| `Skip` | boolean | No | false |
| `Positions` | PositionProviderAsset | No | — |
| `Assignments` | AssignmentAsset | No | — |

The `Positions` field is a PositionProviderAsset (e.g., Mesh2D, FieldFunction, DensityBased) that generates candidate XZ coordinates. The `Assignments` field is an AssignmentAsset (e.g., Constant, Weighted, FieldFunction) that selects which Prop to place at each position. Props, Scanners, Directionality, Patterns, and BlockMasks are nested inside the Assignment/Prop hierarchy — not at the PropRuntimeAsset level.

Example from a working biome file:
```json
{
  "Runtime": 0,
  "Skip": false,
  "Positions": {
    "Type": "Mesh2D",
    "PointGenerator": { "Type": "Mesh", "Jitter": 0.5, "ScaleX": 1, "ScaleY": 1, "ScaleZ": 1, "Seed": "A" }
  },
  "Assignments": {
    "Type": "Weighted",
    "SkipChance": 0.5,
    "Seed": "A",
    "WeightedAssignments": [
      {
        "Weight": 5,
        "Assignments": {
          "Type": "Constant",
          "Prop": {
            "Type": "Prefab",
            "WeightedPrefabPaths": [{ "Path": "Trees\\Oak\\Stage_1", "Weight": 1 }],
            "Directionality": { "Type": "Random", "Seed": "A", "Pattern": { ... } },
            "Scanner": { "Type": "ColumnLinear", "MinY": 50, "MaxY": 200, ... }
          }
        }
      }
    ]
  }
}
```

> **Editor note:** When a biome file is opened in TerraNova, only the `Terrain` subtree (first typed object found) is loaded into the graph editor. Props entries remain in `originalWrapper` as static JSON and are preserved verbatim during round-trip saves.

#### 5.1.1a Hytale-Native vs TerraNova Field Naming

The Hytale in-game editor uses different field names and conventions than TerraNova's V2 abstraction layer. Key differences observed from working biome files:

| Concept | Hytale-Native (in-game) | TerraNova (defaults.ts) |
|---------|------------------------|------------------------|
| Noise frequency | `Scale` (higher = larger features) | `Frequency` (higher = smaller features) |
| Noise persistence | `Persistence` | `Gain` |
| Child inputs | `Inputs` array (always) | Named handles: `Input`, `InputA`, `InputB`, `Condition`, etc. |
| Curve mapping | `CurveMapper` | `CurveFunction` |
| Multiplier density | `Multiplier` | `Product` |
| Inverter density | `Inverter` | `Negate` |
| Node IDs | `$NodeId` UUID on every object | Not used (React Flow generates IDs) |
| Curve points | `[{ In: number, Out: number }]` | `[[x, y]]` array pairs |
| Metadata | `$NodeEditorMetadata` with positions, groups | Not stored in JSON |
| Material refs | `{ Solid: "Block_Name" }` object | `"material_name"` string |

> **Note:** TerraNova templates use the TerraNova field naming conventions (as defined in `src/schema/defaults.ts` and `src/nodes/handleRegistry.ts`). When importing/exporting to the Hytale in-game editor, a translation layer will be needed. The type names in Section 5.1.2 below reflect the Hytale-native names from the server documentation.

#### 5.1.2 Density Functions (68 types)

**Common base fields:**

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `Type` | string | Yes | — |
| `Inputs` | DensityAsset[] | No | [] |
| `Skip` | boolean | No | false |
| `ExportAs` | string | No | "" |

**Noise Generators (4):**

| Type | Fields |
|------|--------|
| SimplexNoise2D | Lacunarity: double (1.0), Persistence: double (1.0), Scale: double (1.0), Octaves: int (1), Seed: string ("A") |
| SimplexNoise3D | Lacunarity: double (1.0), Persistence: double (1.0), ScaleXZ: double (1.0), ScaleY: double (1.0), Octaves: int (1), Seed: string ("A") |
| CellNoise2D | ScaleX: double (1.0), ScaleZ: double (1.0), Jitter: double (0.5), Octaves: int (1), Seed: string ("A"), ReturnType: ReturnTypeAsset |
| CellNoise3D | ScaleX: double (1.0), ScaleY: double (1.0), ScaleZ: double (1.0), Jitter: double (0.5), Octaves: int (1), Seed: string ("A"), ReturnType: ReturnTypeAsset |

**Math Operations (9):** Constant (Value: double), Sum, Multiplier, Abs, Inverter, Sqrt, Pow (Exponent: double, 1.0), OffsetConstant, AmplitudeConstant

**Clamping & Range (10):** Clamp (WallA/WallB: double), SmoothClamp (WallA: -1.0, WallB: 1.0, Range: 0.01), Floor (Limit: double, 0.0), SmoothFloor (Limit, SmoothRange: 1.0), Ceiling (Limit), SmoothCeiling (Limit, SmoothRange: 1.0), Min, SmoothMin (Range: 1.0), Max, SmoothMax (Range: 1.0)

**Mapping & Remapping (4):** Normalizer (FromMin: 0.0, FromMax: 1.0, ToMin: 0.0, ToMax: 1.0), CurveMapper (Curve: CurveAsset), Offset (FunctionForY: NodeFunctionYOutAsset), Amplitude (FunctionForY: NodeFunctionYOutAsset)

**Mixing & Blending (2):** Mix (3 inputs: a, b, factor), MultiMix (Keys: KeyAsset[])

**Coordinate Transforms (7):** Scale (ScaleX/Y/Z: double, 1.0), Slider (SlideX/Y/Z: double, 0.0), Rotator (NewYAxis: Vector3d, SpinAngle: double), Anchor (Reversed: boolean, false), XOverride/YOverride/ZOverride (Value: double)

**Warping (3):** GradientWarp (SampleRange: 1.0, WarpFactor: 1.0, 2D: boolean, YFor2D: double), FastGradientWarp (WarpScale: 1.0, WarpOctaves: 1, WarpLacunarity: 2.0, WarpPersistence: 0.5, WarpFactor: 1.0, Seed: "A"), VectorWarp (WarpFactor: 1.0, WarpVector: Vector3d)

**Shape Primitives (9):** Distance, Cube, Ellipsoid, Cuboid (Curve, Scale: Vector3d, NewYAxis: Vector3d, Spin: double), Cylinder (RadialCurve, AxialCurve, NewYAxis, Spin), Plane (Curve, IsAnchored, PlaneNormal: Vector3d), Axis (Curve, IsAnchored, Axis: Vector3d), Shell (Axis: Vector3d, Mirror: boolean, AngleCurve, DistanceCurve), Angle (VectorProvider, Vector: Vector3d, IsAxis: boolean)

**Coordinate Accessors (3):** XValue, YValue, ZValue (no fields)

**Context Accessors (4):** Terrain (no fields), BaseHeight (BaseHeightName: string, Distance: boolean), CellWallDistance (no fields), DistanceToBiomeEdge (no fields)

**Gradient (1):** Gradient (Axis: Vector3d [0,1,0], SampleRange: 1.0)

**Caching (3):** Cache (Capacity: int, 3), Cache2D (deprecated), YSampled (SampleDistance: 4.0, SampleOffset: 0.0)

**Conditional (2):** Switch (SwitchCases: SwitchCaseAsset[]), SwitchState (SwitchState: string)

**Positions-Based (4):** PositionsCellNoise, Positions3D, PositionsPinch, PositionsTwist

**Import/Export/Pipeline (3):** Exported (ExportAs from base), Imported (Name: string), Pipeline

#### 5.1.3 Curves (19 types)

**Common:** ExportAs: string

| Type | Category | Key Fields |
|------|----------|------------|
| Manual | Primary | Points: PointInOutAsset[] |
| Constant | Primary | Value: double |
| DistanceExponential | Primary | Range: double, ExponentA: double |
| DistanceS | Primary | ExponentA, ExponentB, Range, Transition (0-1), TransitionSmooth (0-1) |
| Multiplier | Arithmetic | Curves: CurveAsset[] |
| Sum | Arithmetic | Curves: CurveAsset[] |
| Inverter | Arithmetic | (wraps child) |
| Not | Arithmetic | (wraps child) |
| Clamp | Clamping | Curve: CurveAsset, WallA: 1.0, WallB: -1.0 |
| SmoothClamp | Clamping | (analogous to density SmoothClamp) |
| Floor | Clamping | (analogous) |
| Ceiling | Clamping | (analogous) |
| SmoothFloor | Clamping | (analogous) |
| SmoothCeiling | Clamping | (analogous) |
| Min | Min/Max | Curves: CurveAsset[] |
| Max | Min/Max | Curves: CurveAsset[] |
| SmoothMin | Min/Max | (smooth blending) |
| SmoothMax | Min/Max | (smooth blending) |
| Imported | Reuse | Name: string |

#### 5.1.4 Patterns (15 types)

**Common:** Skip: boolean, ExportAs: string

| Type | Category | Key Fields |
|------|----------|------------|
| Floor | Surface | Floor: PatternAsset, Origin: PatternAsset |
| Ceiling | Surface | Ceiling: PatternAsset, Origin: PatternAsset |
| Wall | Surface | Wall: PatternAsset, Origin: PatternAsset, RequireAllDirections: boolean, Directions: WallDirection[] |
| Surface | Surface | Surface/Medium: PatternAsset, SurfaceRadius, MediumRadius: double, SurfaceGap/MediumGap: int, RequireAllFacings, Facings[] |
| Gap | Surface | GapPattern/AnchorPattern: PatternAsset, GapSize/AnchorSize/AnchorRoughness: double, DepthDown/DepthUp: int, Angles: float[] |
| BlockType | Block | Material: MaterialAsset |
| BlockSet | Block | BlockSet: MaterialSetAsset |
| Cuboid | Spatial | SubPattern: PatternAsset, Min/Max: Vector3i |
| Offset | Spatial | Pattern: PatternAsset, Offset: Vector3i |
| FieldFunction | Spatial | FieldFunction: DensityAsset, Delimiters[] |
| And | Logic | Patterns: PatternAsset[] |
| Or | Logic | Patterns: PatternAsset[] |
| Not | Logic | Pattern: PatternAsset |
| Constant | Logic | Value: boolean |
| Imported | Reuse | Name: string |

#### 5.1.5 Material Providers (14 types + sub-types)

**Common:** Skip: boolean, ExportAs: string

| Type | Key Fields |
|------|------------|
| Constant | Material: MaterialAsset |
| Solidity | Solid/Empty: MaterialProviderAsset |
| DownwardDepth | Depth: int, Material: MaterialProviderAsset |
| DownwardSpace | Space: int, Material: MaterialProviderAsset |
| UpwardDepth | Depth: int, Material: MaterialProviderAsset |
| UpwardSpace | Space: int, Material: MaterialProviderAsset |
| Queue | Queue: MaterialProviderAsset[] |
| SimpleHorizontal | TopY/BottomY: int, Material: MaterialProviderAsset, TopBaseHeight/BottomBaseHeight: string |
| Striped | Stripes: StripeAsset[], Material: MaterialProviderAsset |
| FieldFunction | FieldFunction: DensityAsset, Delimiters: DelimiterAsset[] |
| TerrainDensity | Delimiters: DelimiterAsset[] |
| Weighted | WeightedMaterials: WeightedMaterialAsset[], SkipChance: double, Seed: string |
| SpaceAndDepth | LayerContext: enum, MaxExpectedDepth: int, Condition: ConditionAsset, Layers: LayerAsset[] |
| Imported | Name: string |

**SpaceAndDepth Layers (4):** ConstantThickness, NoiseThickness, RangeThickness, WeightedThickness

**SpaceAndDepth Conditions (7):** AlwaysTrueCondition, AndCondition, OrCondition, NotCondition, EqualsCondition, GreaterThanCondition, SmallerThanCondition

#### 5.1.6 Position Providers (14 types)

| Type | Key Fields |
|------|------------|
| List | Positions: PositionAsset[] |
| Mesh2D | PointGenerator: PointGeneratorAsset, PointsY: int |
| Mesh3D | PointGenerator: PointGeneratorAsset |
| FieldFunction | FieldFunction: DensityAsset, Positions: PositionProviderAsset, Delimiters[] |
| Occurrence | Seed: string, FieldFunction: DensityAsset, Positions: PositionProviderAsset |
| Offset | OffsetX/Y/Z: int, Positions: PositionProviderAsset |
| Union | Positions: PositionProviderAsset[] |
| SimpleHorizontal | RangeY: RangeDoubleAsset, Positions: PositionProviderAsset |
| Cache | Positions: PositionProviderAsset, SectionSize: int (32), CacheSize: int (100) |
| BaseHeight | MinYRead/MaxYRead: double, BedName: string, Positions: PositionProviderAsset |
| Anchor | Reversed: boolean, Positions: PositionProviderAsset |
| Bound | Bounds: DecimalBounds3dAsset, Positions: PositionProviderAsset |
| Framework | Name: string |
| Imported | Name: string |

**Point Generator (1):** Mesh (Spacing: int, Jitter: double, Seed: string)

#### 5.1.7 Props (11 types)

| Type | Key Fields |
|------|------------|
| Box | Range: Vector3i, Material: MaterialAsset, Pattern: PatternAsset, Scanner: ScannerAsset |
| Column | (material placement column) |
| Cluster | Range: int, DistanceCurve: CurveAsset, Seed: string, WeightedProps[], Pattern, Scanner |
| Density | Range: Vector3i, PlacementMask: BlockMaskAsset, Pattern, Scanner, Density: DensityAsset, Material: MaterialProviderAsset |
| Prefab | WeightedPrefabPaths[], LegacyPath: boolean, Directionality, Scanner, BlockMask, MoldingDirection, MoldingPattern, MoldingScanner, MoldingChildren, LoadEntities |
| PondFiller | (pond/water filling) |
| Queue | (sequential props) |
| Union | Props: PropAsset[] |
| Offset | (spatial offset) |
| Weighted | Entries: EntryAsset[], Seed: string |
| Imported | Name: string |

#### 5.1.8 Other Types

**Scanners (5):** Origin, ColumnLinear (MinY, MaxY, ResultCap, TopDownOrder, RelativeToPosition, BaseHeightName), ColumnRandom (MinY, MaxY, ResultCap, Seed, Strategy, RelativeToPosition, BaseHeightName), Area (ResultCap, ScanShape, ScanRange, ChildScanner), Imported

**Assignments (5):** Constant (Prop), FieldFunction (FieldFunction, Delimiters[]), Sandwich (Delimiters[]), Weighted (SkipChance, Seed, WeightedAssignments[]), Imported

**Vector Providers (5):** Constant (Value: Vector3d), DensityGradient (Density, SampleDistance: 1.0), Cache (VectorProvider), Exported (SingleInstance, VectorProvider), Imported

**Environment Providers (2):** Constant (Environment: string), DensityDelimited (Density, Delimiters[])

**Tint Providers (2):** Constant (Color: hex string), DensityDelimited (Density, Delimiters[])

**Framework (2):** DecimalConstants (Entries: {Name, Value}[]), Positions (Entries: {Name, Positions}[])

**Block Masks:** BlockMaskAsset (DontPlace, DontReplace: MaterialSetAsset, Advanced: BlockMaskEntryAsset[], ExportAs, Import)

**Settings:** SettingsAsset (CustomConcurrency: int, BufferCapacityFactor: double, TargetViewDistance: double, TargetPlayerCount: double, StatsCheckpoints: int[])

**Directionality (4):** Static (Rotation: int, Pattern), Random (Seed, Pattern), Pattern (InitialDirection, Seed, NorthPattern, SouthPattern, EastPattern, WestPattern), Imported

### 5.2 Asset Pack Directory Structure

```
HytaleGenerator/
├── Biomes/                    # BiomeAsset JSON files
│   ├── ForestBiome.json
│   ├── DesertBiome.json
│   └── ...
├── WorldStructures/           # WorldStructureAsset JSON files
│   └── MainWorld.json
├── Density/                   # Reusable DensityAsset JSON files
│   ├── BaseTerrain.json
│   └── ...
├── MaterialMasks/             # BlockMaskAsset JSON files
├── Assignments/               # AssignmentsAsset JSON files
├── Settings/                  # SettingsAsset JSON files
│   └── Settings.json
└── ...                        # Other category directories as needed
```

### 5.3 Template Manifest

```json
{
  "name": "Forest Template",
  "description": "Complex forest terrain with trees, rocks, and layered materials",
  "author": "HyperSystems-Development",
  "version": "1.0.0",
  "serverVersion": "2026.02.05-9ce2783f7",
  "category": "terrain",
  "tags": ["forest", "trees", "natural"],
  "preview": "preview.png",
  "files": ["HytaleGenerator/"]
}
```

---

## 6. External Interface Requirements

### 6.1 Tauri IPC Commands

| Command | Direction | Description | Data |
|---------|-----------|-------------|------|
| `open_asset_pack` | Frontend → Rust | Open directory dialog, parse all JSON | Returns: AssetPack structure |
| `save_asset_pack` | Frontend → Rust | Write all modified JSON to files | Input: AssetPack, Returns: success/errors |
| `validate_asset_pack` | Frontend → Rust | Schema validation | Returns: ValidationResult[] |
| `evaluate_density` | Frontend → Rust | Evaluate density graph at sample grid | Input: graph JSON + grid params, Returns: Float32Array (via Raw Request) |
| `read_file` | Frontend → Rust | Read a single JSON file | Returns: parsed JSON |
| `write_file` | Frontend → Rust | Write a single JSON file | Input: path + content |
| `list_directory` | Frontend → Rust | List directory contents | Returns: file tree |
| `create_from_template` | Frontend → Rust | Copy template to new directory | Input: template name + target path |

### 6.2 GitHub API (Template Hub)

| Endpoint | Purpose | Method |
|----------|---------|--------|
| GitHub Pages: `/index.json` | Fetch community template index | GET (unauthenticated) |
| GitHub API: repo contents | Download template files | GET (unauthenticated, rate-limited) |

No authentication required. All requests are read-only against public repos.

### 6.3 File System

| Operation | Description |
|-----------|-------------|
| Read JSON files | Parse V2 asset pack JSON |
| Write JSON files | Save modified assets (atomic write via temp + rename) |
| Read directory tree | Build asset tree sidebar |
| Create directories | New project from template |
| File watching | Detect external changes (via Tauri's fs watch) |

---

## 7. Constraints

### 7.1 License
LGPL-2.1 — all code must be compatible with LGPL-2.1 licensing.

### 7.2 Cost
Zero infrastructure cost. All hosting, CI/CD, and distribution must use free tiers (GitHub-only).

### 7.3 Privacy
No telemetry, no analytics, no network requests except:
- Community template index fetch (user-initiated)
- Template downloads (user-initiated)
- Update checks (optional, via Tauri updater against GitHub Releases)

### 7.4 Offline First
Core functionality (editing, preview, validation, bundled templates) must work without any network connection.

### 7.5 Compatibility
Output JSON must be loadable by Hytale server pre-release `2026.02.05-9ce2783f7` without modification.

### 7.6 Open Source
All source code published under LGPL-2.1 license on `HyperSystems-Development/TerraNova` GitHub repository.

---

*Document version 1.0 — February 6, 2026*
