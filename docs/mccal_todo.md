## MCCAL TODO (Personal)

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
