# Exporting from TerraNova

TerraNova has four export paths. Each one is for a different purpose — use the right one for what you are trying to do.

| What you want | How to get it |
|---------------|--------------|
| Deploy a biome to Hytale | **Export Asset Pack** (`Ctrl+Shift+E`) |
| Check one file's Hytale JSON | **Export Current JSON** (`Ctrl+E`) |
| Share or document a graph | **Export SVG** (`Ctrl+Shift+G`) |
| Screenshot the preview | **Export Canvas PNG** (preview toolbar button) |

---

## Export Asset Pack

**`File → Export Asset Pack…`** | `Ctrl+Shift+E`

Exports your entire project as a Hytale-ready asset pack. This is the export you use when deploying to a server.

### What it produces

A complete directory tree ready to drop into a Hytale server mod folder:

```
{Group}.{Name}/
└── Server/
    └── HytaleGenerator/
        ├── manifest.json          ← auto-generated
        ├── Settings/
        │   └── Settings.json
        ├── WorldStructures/
        │   └── MainWorld.json
        └── Biomes/
            └── YourBiome.json
```

The `{Group}.{Name}` root comes from your project's manifest.

### What it converts

- **JSON files** — converted from TerraNova's internal format to Hytale-native JSON. TerraNova-only fields are stripped, internal node graph state is removed, and the output matches what Hytale's generator expects.
- **Non-JSON files** — copied as-is.

### What it auto-corrects

- **Biome `Name` fields** — Hytale requires that the `Name` field inside each biome JSON matches the filename (without the `.json` extension). If they don't match, TerraNova fixes the `Name` field automatically and shows a toast listing every file it corrected.
- **WorldStructure biome references** — after conversion, TerraNova checks that every biome referenced in your `WorldStructures/` files actually exists. Missing biome references are reported as warnings so you can fix them before deploying.

### Format notes

- NoiseRange files: `ContentFields` is converted to the `Framework` key Hytale expects.
- Settings files: exported with `CustomConcurrency`, `BufferCapacityFactor`, `TargetViewDistance`, `TargetPlayerCount`, and `StatsCheckpoints`.

---

## Export Current JSON

**`File → Export Current JSON…`** | `Ctrl+E`

Exports just the file you are currently editing as a single Hytale-format JSON file. Useful for spot-checking one file's output or sharing a specific biome without packaging the whole project.

### What it exports

Depends on the file type:

| File type | What is exported |
|-----------|-----------------|
| Biome | All five sections: `Terrain`, `MaterialProvider`, `Props`, `EnvironmentProvider`, `TintProvider` |
| NoiseRange (WorldStructure) | Biome list, density, and framework fields |
| Settings | Concurrency and performance settings |
| Other typed assets | The complete density graph as Hytale JSON |

### Validation

Before writing the file, TerraNova runs a quick structural check. If it finds issues (missing Type fields, invalid material references, etc.) it shows a toast with the warnings. The export still proceeds — the warnings are advisory.

---

## Export SVG

**`File → Export SVG…`** | `Ctrl+Shift+G`

Exports the node graph as a clean, scalable SVG image. Useful for documentation, design reviews, or sharing graphs with people who don't have TerraNova installed.

### Dialog options

**Scope**
- **Entire Graph** — exports all nodes, regardless of what is visible. Padding is applied around the full bounds.
- **Current Viewport** — exports only what is currently visible on the canvas.

**Background Grid**
- **No Grid** — clean white background (default).
- **Include Grid** — renders the dot-grid pattern from the editor canvas.

**Mode**
- **Presentation** — clean output. Node display names and handles only. Best for documentation.
- **Debug** — adds node IDs and raw type names as overlays. Useful when debugging a graph structure.

**Padding** (Entire Graph only)
- Whitespace (in pixels) added around the full graph bounds. Default is 40. Has no effect in Current Viewport mode.

### SVG compatibility

Exported SVGs are SVG 1.1 compliant — compatible with macOS Preview, Inkscape, web browsers, and standard vector editors. TerraNova avoids CSS functions and 8-digit hex colors that trip up strict parsers.

---

## Export Canvas PNG

Available in the preview toolbar (top-right of the preview panel).

Saves the current preview canvas — whatever is visible in the 2D, 3D, or voxel view — as a PNG image. The exported image matches the canvas at its current size and zoom.

> This export is only available when a preview canvas is active. If the toolbar button is greyed out, switch to a preview mode first (`P` to cycle view modes).

---

## How TerraNova nodes map to Hytale JSON types

When you export, TerraNova converts its internal node graph to Hytale-native JSON. The node names you see in the editor are not always the same as the `Type` values that appear in Hytale biome files — some are renamed, some are decomposed into multiple nodes, and some have fields renamed.

### Name changes (one-to-one)

These nodes export under a different `Type` name than what the editor shows:

| Editor node | Exported as (`Type`) |
|-------------|---------------------|
| `Multiplier` | `Multiplier` *(same)* |
| `Inverter` | `Inverter` *(same)* |
| `CurveMapper` | `CurveMapper` *(same)* |
| `Mix` | `Mix` *(same)* |
| `CellNoise2D` | `CellNoise2D` *(same)* |
| `FastGradientWarp` | `FastGradientWarp` *(same)* |
| `Cache` | `Cache` *(same)* |
| `Sqrt` | `Sqrt` *(same)* |
| `Scale` (coordinate node) | `Scale` *(same)* |
| `Slider` (coordinate node) | `Slider` *(same)* |
| `Rotator` (coordinate node) | `Rotator` *(same)* |
| `GradientDensity` | `Normalizer` wrapping `YValue` |
| `LinearTransform` (Scale only) | `AmplitudeConstant` |
| `Square` | `Pow` (with `Exponent: 2`) |
| `DomainWarp2D` / `DomainWarp3D` | `FastGradientWarp` |
| `VoronoiNoise2D` | `CellNoise2D` |
| `VoronoiNoise3D` | `CellNoise3D` |
| `CoordinateY` | `YValue` |

> **Why some names differ:** TerraNova uses cleaner editor names for usability. The exported JSON uses Hytale's native V2 codec names exactly as the server expects them.

### Structural decompositions

Some TerraNova nodes export as **multiple Hytale nodes** because Hytale has no equivalent single node:

#### `LinearTransform` with a non-zero Offset

A `LinearTransform` node with both `Scale` and `Offset` set decomposes on export into:

```
Sum(
  AmplitudeConstant(Value = Scale, Inputs = [input]),
  Constant(Value = Offset)
)
```

This is because Hytale's `AmplitudeConstant` only multiplies — it has no offset field. The offset becomes a separate `Constant` node added via `Sum`.

#### `GradientDensity`

A `GradientDensity` node (height ramp from `FromY` to `ToY`) exports as:

```
Normalizer(FromMin = ToY, FromMax = FromY, ToMin = 0, ToMax = 1,
  Inputs = [YValue])
```

Hytale has no `GradientDensity` type — the equivalent is always built from `Normalizer` + `YValue`.

#### `HeightGradient` material provider

The `HeightGradient` material node (applies different materials above and below a Y range) exports as a `Queue` containing a `FieldFunction` with a `YValue` density and `Delimiters`.

#### `Conditional` material chain

Nested `Conditional` material providers export as a `Queue` of `FieldFunction` entries. Each condition in the chain becomes a separate `FieldFunction` element in the queue, with the final fallback material at the end.

### Field renames on export

Several nodes have fields renamed to match Hytale's codec:

| Node | TerraNova field | Exported as |
|------|-----------------|-------------|
| `Clamp` | `Min` | `WallB` |
| `Clamp` | `Max` | `WallA` |
| `SmoothClamp` / `SmoothMin` / `SmoothMax` | `Smoothness` | `Range` |
| `SmoothFloor` / `SmoothCeiling` | `Threshold` | `Limit` |
| `SmoothFloor` / `SmoothCeiling` | `Smoothness` | `SmoothRange` |
| `SimplexNoise2D` | `Frequency` | `Scale` (inverted: Scale = 1/Frequency) |
| `SimplexNoise3D` | `Frequency` | `ScaleXZ` + `ScaleY` (both = 1/Frequency) |
| `CellNoise2D` | `Frequency` | `ScaleX` + `ScaleZ` (both = 1/Frequency) |
| `SimplexNoise*` | `Gain` | `Persistence` |
| `Scale` (coordinate) | `Scale` (vector3d) | `ScaleX`, `ScaleY`, `ScaleZ` (flat fields) |
| `Slider` (coordinate) | `Translation` (vector3d) | `SlideX`, `SlideY`, `SlideZ` |
| `Rotator` | `AngleDegrees` | `SpinAngle` |
| `LinearTransform` | `Scale` | `Value` (on `AmplitudeConstant`) |

> **Note on `Clamp` field order:** `WallA` and `WallB` appear swapped compared to what you might expect. Hytale's `Clamp` uses `WallA` for the upper bound and `WallB` for the lower. This matches the actual Hytale V2 codec — not a TerraNova bug.

### `Exported` and `Imported` nodes

The `Exported` node (in the editor) sets an `ExportAs` string on its parent density in the exported JSON. This name is the identifier other biome files can reference via `Imported`. The string must exactly match on both sides — even a case difference will cause the reference to fail in-game.

`Imported` simply references that name. In the exported JSON it appears as:

```json
{
  "Type": "Imported",
  "Name": "the_name_you_set_on_Exported"
}
```

---

## Choosing between Export Current JSON and Export Asset Pack

Use **Export Current JSON** when:
- You want to inspect the Hytale JSON output for one specific file
- You are sharing a single biome file with someone
- You want to verify the conversion before doing a full pack export

Use **Export Asset Pack** when:
- You are deploying to a server
- You want the complete directory structure Hytale expects
- You want the auto-correction of biome names and cross-validation of WorldStructure references
