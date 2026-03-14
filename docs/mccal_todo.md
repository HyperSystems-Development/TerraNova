## MCCAL TODO (Personal)

---

## Hytale Asset Icon Pass

**TODO:** Add more asset-specific icons and thumbnails across the editors so references read more like Hytale content and less like plain text rows.

**Targets:**
- weather/editor asset rows for stars, moons, cloud textures, and sky textures
- environment weather references in the Issue Log and Asset Tools pane
- file-tree entries for major Hytale asset families such as `Environments`, `Weathers`, `Common\Sky`, `Blocks`, and `BlockTextures`
- reusable icon helpers so cached Hytale assets and pack-local assets share the same visual treatment

**Good first pass (next up — start here):**

*Pass 1A — Asset Tools "Referenced Assets" rows (PropertyPanel.tsx ~L1272)*
Each entry row already has a colored status dot. Replace/supplement it with a semantic lucide-react icon
that encodes the entry *kind* so type is readable at a glance without the badge:
- `entry.kind === "environment-weather"` → `<Cloud />` (or `<CloudSun />`) in tn-text-muted
- `entry.kind === "weather-texture" && entry.label.startsWith("Moon")` → `<Moon />` in tn-text-muted
- `entry.kind === "weather-texture" && entry.label.startsWith("Cloud")` → `<Cloud />` in tn-text-muted
- `entry.kind === "weather-texture" && (entry.label === "Stars" || entry.label === "StarMap")` → `<Star />` in tn-text-muted
- `entry.kind === "weather-texture"` fallback → `<Image />` in tn-text-muted
Place the icon between the status dot and the label text. Keep icon size at 14 px (h-3.5 w-3.5).

*Pass 1B — File tree folder icons (AssetTree.tsx ~L586–L630)*
`getFileColor()` already maps filenames to colors. Add a parallel `getFileIcon()` that returns a lucide
icon component based on the same filename patterns:
- `environment` / `environ` → `<TreePine />` (or `<Globe />`)
- `weather` → `<CloudRain />`
- `biome` → `<Mountain />`
- `material` → `<Layers />`
- `density` / `terrain` → `<AreaChart />` (or `<Waves />`)
- `worldstructure` / `world_structure` / `structure` → `<Building2 />`
- `assignment` → `<ListChecks />`
- `prefab` / `instance` → `<Box />`
- `settings` / `config` / `manifest` → `<Settings />`
- fallback → keep current plain `<FileIcon>` SVG
Render it at h-4 w-4, same slot as the existing FileIcon.

*Key constraint:* All target icons already exist in lucide-react 0.563 (installed). No new deps needed.
Reuse the existing `FolderIcon` / `ChevronIcon` pattern—no wrapper component needed, just a helper function
that returns a `<LucideIconComponent className="h-4 w-4 shrink-0 text-[color]" />`.

**Later pass:**
- distinguish cached Hytale assets vs in-pack assets visually (different icon fill/stroke)
- show moon/cloud/star icons directly inside weather fix action buttons
- add icon mapping for broader TerraNova asset types beyond weather/environment
- thumbnail previews where a PNG exists under `public/icons/` for the asset name

---

## Environment Parent Inheritance Docs

**TODO:** Add a short tutorial/help entry explaining how Hytale uses `Parent` on environment assets.

**Observed from real assets in `C:\Users\wolft\Desktop\Assets\Server\Environments`:**
- Zone variants inherit from their zone base: `Env_Zone1_Azure` -> `Env_Zone1`, `Env_Zone1_Plains` -> `Env_Zone1`
- Cave variants inherit from the cave base: `Env_Zone1_Caves_Forests` -> `Env_Zone1_Caves`, `Env_Zone2_Caves_Deserts` -> `Env_Zone2_Caves`
- Unique sets inherit from a shared base: `Env_Forgotten_Temple_Exterior` -> `Env_Forgotten_Temple_Base`
- Tiered volcanic variants inherit from the T1 base: `Env_Zone1_Caves_Volcanic_T2` -> `Env_Zone1_Caves_Volcanic_T1`

**What the eventual guide should explain:**
- `Parent` is usually a shared base environment, not a duplicate of the current file name
- Child environments often override only a small set of fields like `Tags`, `WaterTint`, or a narrow weather slice
- Safe defaults depend on the family: `Env_ZoneX`, `Env_ZoneX_Caves`, `Env_Default_Flat`, or `Env_Default_Void`

---

## Tint System: Quick Notes & Actions

**Limitation:**
The tint system is 2D—tint is calculated per (x, z) column, ignoring height (y). All blocks in a column share the same tint. Engine uses a 2D tint map for speed, so height-based tinting isn’t possible without engine changes.

**Current Workaround:**
- Use terrain density as a proxy for height.
- Pipeline: TerrainDensity → SliderDensity (offset sample) → Delimiter → TintProvider.
- Instead of “how high?”, ask “how solid is the terrain here?”

**Why it works:**
- Density correlates with terrain structure: air/surface = low, deep = high.
- Split density ranges for tint (e.g., 0–0.35 = grass, 0.35–0.65 = rock, 0.65–1.0 = snow).
- SliderDensity (e.g., SlideY = -25) samples below the surface, stabilizing tint.

**What it can do:**
- Simulate mountain gradients, snow caps, valley greens, stone, shoreline.

**What it can’t do:**
- Stack tints for floating islands, caves, vertical worlds—only one tint per column.

**Best pattern:**
- TerrainDensity → SliderDensity → Delimiter(s) → TintProviders.
- Split ranges for believable gradients.

**Upgrade idea:**
- Sample two densities (surface & below), use their difference for slope/exposure (cliffs, erosion, snow ridges).

**Future:**
- If engine exposes height(x, z), true height-based tinting will be possible.

---

**Actionable:**
- Keep using density-based tinting for now.
- Try dual-sample difference for richer effects.
- Watch for engine updates on height extraction.

---

Want advanced tint graph patterns? Ask for examples (snow caps, cliff banding, moss gradients, biome blending with 3–4 extra nodes).

---

## 3. Why this produces the mountain tint effect

Terrain density roughly correlates with terrain height:

| Density | Terrain meaning    |
| ------- | ------------------ |
| low     | air / surface      |
| mid     | surface transition |
| high    | deep terrain       |

Your ranges:

```
0 – 0.5  → gray
0.5 – 1  → white
```

So areas with stronger density (usually deeper inside mountains) become the **lighter tint**, giving you that snowy/rocky peak look.

That’s why your mountains show different coloring in the screenshot.

It’s not actually using height.
It’s using **terrain solidity**.

---

## 4. Why the SliderDensity node helps

Your slider offsets the density sample:

```
SlideY = -25
```

This effectively samples the density **below the current location**.

Conceptually:

```
sample density at (x, y - 25, z)
```

This helps detect terrain mass slightly under the surface, which makes the tint more stable and less noisy.

Without it, the tint would flicker around surface edges.

---

## 5. What this workaround can and cannot do

### What it can do

Simulate height-based tinting like:

* snow caps
* darker valley greens
* stone exposure
* shoreline gradients

Because density tends to follow terrain structure.

---

### What it cannot do

Stacked terrain layers.

Example:

```
floating island
↓
sky
↓
mountain
```

Both share the same `(x,z)` column, so the tint map only stores **one color**.

So:

* island top
* mountain top
* ground level

All get identical tint.

That’s the core limitation.

---

## 6. Why this matters for things like TerraNova

For large world systems this causes issues with:

* floating biomes
* layered terrain
* caves exposed to sky
* vertical worlds

You can’t tint them independently unless:

1. the engine switches to **3D tint**
2. or the generator is modified

---

## 7. The best practical pattern right now

The pattern you're using is actually the **standard advanced technique**.

Typical structure:

```
Import TerrainDensity
        ↓
Sample offset (SliderDensity)
        ↓
Delimiter(s)
        ↓
TintProviders
```

Then split ranges like:

```
0.0–0.35  → grass tint
0.35–0.65 → rock tint
0.65–1.0  → snow tint
```

This gives believable mountain gradients without real height access.

---

## 8. One improvement you could add

Instead of a single offset sample, combine two samples.

Example concept:

```
SurfaceDensity
SurfaceDensityBelow
```

Then use their **difference** to approximate slope/exposure.

This can create:

* cliff tint
* erosion bands
* snow ridges

Much richer than a single threshold.

---

## 9. What the dev hinted at

Dan’s comment suggests the future possibility:

> extract terrain height from density or materials

That would effectively give nodes a way to compute:

```
height(x,z)
```

Which would solve the problem.

---

✔ **Your graph is already using the best workaround currently available.**

It’s exactly how experienced worldgen authors fake height-based tinting under the current 2D tint system.

---

If you want, I can also show you a **much more powerful tint graph pattern** used by experienced worldgen devs that produces:

* snow caps
* cliff banding
* moss gradients
* biome blending

with only **3–4 extra nodes**. It’s a big visual upgrade over the simple two-range split you’re using.
