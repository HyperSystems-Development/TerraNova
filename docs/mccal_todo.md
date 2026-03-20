## MCCAL TODO (Personal)

Legend: `[x]` = shipped, `[ ]` = todo, `[~]` = in progress

---

## Hytale Asset Icon Pass

**Status:** [ ] Not started — next up, start with Pass 1A

Add asset-specific icons across editors so references read like Hytale content rather than plain text rows.

### Pass 1A — Asset Tools "Referenced Assets" rows (PropertyPanel.tsx ~L1272)

Each row already has a colored status dot. Replace/supplement with a semantic lucide-react icon that encodes the entry *kind* at a glance:

| Condition | Icon |
|---|---|
| `entry.kind === "environment-weather"` | `<Cloud />` or `<CloudSun />` |
| `entry.kind === "weather-texture" && label.startsWith("Moon")` | `<Moon />` |
| `entry.kind === "weather-texture" && label.startsWith("Cloud")` | `<Cloud />` |
| `entry.kind === "weather-texture" && (label === "Stars" \|\| label === "StarMap")` | `<Star />` |
| `entry.kind === "weather-texture"` fallback | `<Image />` |

Place icon between the status dot and label text. Size: `h-3.5 w-3.5`.

### Pass 1B — File tree folder icons (AssetTree.tsx ~L586-L630)

`getFileColor()` already maps filenames to colors. Add a parallel `getFileIcon()` returning a lucide icon:

| Pattern | Icon |
|---|---|
| `environment` / `environ` | `<TreePine />` or `<Globe />` |
| `weather` | `<CloudRain />` |
| `biome` | `<Mountain />` |
| `material` | `<Layers />` |
| `density` / `terrain` | `<Waves />` |
| `worldstructure` / `structure` | `<Building2 />` |
| `assignment` | `<ListChecks />` |
| `prefab` / `instance` | `<Box />` |
| `settings` / `config` / `manifest` | `<Settings />` |
| fallback | keep current `<FileIcon>` SVG |

Size: `h-4 w-4`. All icons already in lucide-react 0.563. No new deps.

### Later passes

- [ ] Distinguish cached Hytale assets vs in-pack assets (different fill/stroke treatment)
- [ ] Moon/cloud/star icons inside weather fix action buttons
- [ ] Thumbnail previews where a PNG exists under `public/icons/` for the asset name

---

## Environment Parent Inheritance Docs

**Status:** [ ] Content ready, needs a doc page

Hytale uses `Parent` on environment assets for inheritance. Real assets in `Server\Environments` show this pattern:

| Variant | Inherits from |
|---|---|
| `Env_Zone1_Azure`, `Env_Zone1_Plains` | `Env_Zone1` |
| `Env_Zone1_Caves_Forests` | `Env_Zone1_Caves` |
| `Env_Zone2_Caves_Deserts` | `Env_Zone2_Caves` |
| `Env_Forgotten_Temple_Exterior` | `Env_Forgotten_Temple_Base` |
| `Env_Zone1_Caves_Volcanic_T2` | `Env_Zone1_Caves_Volcanic_T1` |

**Guide content to write:**
- `Parent` is a shared base environment, not a duplicate of the current filename
- Child environments often override only a small set of fields (`Tags`, `WaterTint`, narrow weather slice)
- Safe defaults by family: `Env_ZoneX`, `Env_ZoneX_Caves`, `Env_Default_Flat`, `Env_Default_Void`
- What TerraNova currently shows (and what it should show) when `Parent` is set

---

## Tint System Reference

**Status:** [ ] Content ready in this file, needs to become a proper doc page under `src/docs/walkthroughs/`, `src/docs/guides/`, or `src/docs/reference/`

### Key facts

- The tint system is **2D**: tint is calculated per `(x, z)` column, ignoring `y`. All blocks in a column share the same tint. Engine uses a 2D tint map for performance; height-based tinting is not possible without engine changes.
- **Density as a proxy:** Use terrain density to approximate height. Pipeline: `TerrainDensity` → `SliderDensity` (offset sample) → `Delimiter` → `TintProvider`.
- **Why SliderDensity helps:** `SlideY = -25` samples density 25 blocks below the current position, which is more stable (less surface flicker) than sampling at the exact surface.

### What it can do

- Snow caps, valley greens, stone exposure, shoreline gradients
- Cliff tint and erosion bands via dual-sample difference (see upgrade idea below)

### What it cannot do

- Stack independent tints for floating islands, caves, and ground at the same `(x, z)` column. Only one tint per column.

### Standard pattern

```
TerrainDensity
  → SliderDensity (SlideY = -25)
  → Delimiter(s)
  → TintProviders

Range split example:
  0.0 – 0.35  → grass tint
  0.35 – 0.65 → rock tint
  0.65 – 1.0  → snow tint
```

### Upgrade: dual-sample slope approximation

Sample two densities (surface + 25 blocks below), use their **difference** to approximate slope/exposure. Creates cliff tint, erosion bands, snow ridges. Much richer than a single threshold split.

### Future

If the engine exposes `height(x, z)` (Dan hinted at this), true height-based tinting will be straightforward.

---

## Miscellaneous actionable

- [ ] **"Inline try this"** button on terrain type snippets — one-click opens snippet as a new graph tab (requires IPC command to inject JSON into the editor)
- [ ] **Multi-node copy as snippet** — select a node region, right-click "Copy as Hytale JSON" walks the subgraph and produces a self-contained density snippet
- [ ] **TintProvider density node editable from AtmosphereTab** — expose SimplexNoise2D parameters (Seed, Scale, Octaves, Persistence, Lacunarity) without requiring node graph access
- [ ] **Biome browser inline tint swatch** — read TintProvider.Delimiters colors on load and show a preview strip beside each biome
- [ ] **Biome browser environment resolution** — show the resolved `Env_*` file name beside each biome entry
- [ ] **Weather forecast day/night schedule visible in AtmosphereTab** — show all hour buckets from WeatherForecasts
- [ ] **Export environment name collision warning** — validate sanitized name doesn't collide with existing `Env_*` files
- [ ] **`EnvironmentProvider {}` label** — show "uses server default" in node graph and AtmosphereTab instead of blank
