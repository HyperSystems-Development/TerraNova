# Troubleshooting

> **Source status:** Troubleshooting entries are checked against TerraNova's current preview evaluator, graph diagnostics, export helpers, and the source-backed terrain guides linked from this page.

This page covers common issues and suggested solutions.

## Performance Issues

- If the editor becomes slow, try closing unused panels.
- Reduce the node count in your world or break large graphs into smaller subgraphs.
- Wrap expensive density subgraphs in a `YSampled` node -- this samples at coarse Y intervals and interpolates, providing ~4x speedup for vertical columns.
- Use the `Cache` density node to avoid evaluating the same expensive subgraph multiple times.

## File Load Errors

- Ensure the `.world` file is not locked by another application.
- If you see JSON parse errors, check for missing commas or braces in your `World.json`.
- Ensure all biome names referenced in `"DefaultBiome"` and `"Biomes"` arrays exactly match a defined `BiomeAsset` name.
- Make sure `"DefaultTransitionDistance"` is greater than 0.

## World Looks Wrong After Reload

- Run `/worldgen reload --clear` in-game to force a full chunk regeneration.
- If using a viewport, ensure it is active with `/viewport --radius <n>`.
- Check that your `WorldGenType` is set to `HytaleGenerator` (V2): `/world settings worldgentype set HytaleGenerator`.

## Biome Boundaries Are Too Abrupt

- Increase `"DefaultTransitionDistance"` in `World.json` (try 48 or 64).

## Terrain Fills to World Height or Has Holes Through the Floor

Blocks filling all the way to Y=320, or holes punching through the world floor, almost always mean your density values are falling **outside the range your curve covers**.

- If density goes **below** your curve's lowest `Out` value, terrain extends to the world ceiling (Y=320).
- If density goes **above** your curve's highest `Out` value, terrain falls through the floor.

The diagram below shows a curve that only covers [-0.8, 0.8] against the full [-1, 1] noise range. Values in the red zones have no matching curve point — they default to world-ceiling or world-floor:

```bounds
{"min": -1, "max": 1, "context": [-1, 1], "label": "Actual noise range — all values possible"}
```

```bounds
{"min": -0.8, "max": 0.8, "context": [-1, 1], "danger": [[-1, -0.8], [0.8, 1]], "label": "Curve covers only [-0.8, 0.8] — red zones are unhandled → runaway terrain"}
```

After a `Sum` of two noise nodes the range expands to [-2, 2]. A curve covering only [-1, 1] now misses the extremes:

```bounds
{"min": -2, "max": 2, "context": [-2, 2], "label": "Sum of two noise nodes — can reach [-2, 2]"}
```

```bounds
{"min": -1, "max": 1, "context": [-2, 2], "danger": [[-2, -1], [1, 2]], "label": "Curve covers only [-1, 1] — red zones outside cause world-ceiling / world-floor"}
```

**Fix:** Make sure your curve's `Out` range covers all possible results your density can produce. Extend your curve to match the full input range, or wrap the density in a `Clamp` node before the `CurveMapper`.

## Terrain Looks Unnatural or Has Visible Banding

**Symptom: Strange horizontal bands, seams, or flat lines visible on terrain slopes.**

Most common cause: multiple noise layers are using the **same seed** at similar scales, causing them to stack their effects in the same locations. Change each noise layer to use a unique seed.

A related cause: noise scales that are too regular (e.g. 40, 80, 160). The patterns align too predictably. Try less regular increments (e.g. 35, 90, 170) or deliberately different values.

If the banding persists after changing seeds and scales, check your curve points. If two adjacent curves share a boundary point exactly (e.g. one curve ends at 40, the next starts at 40), that seam will be visible. Overlap the ranges slightly instead — end the lower curve at 50 and start the upper at 30, so they blend rather than butt up against each other.

**Symptom: Terrain has a strangely regular, repeated pattern.**

You may be layering noise at scales that are multiples of each other. Try using scales that have no simple ratio between them to reduce visible repetition.

**Symptom: Adding more noise layers makes terrain look flatter, not more varied.**

This is the homogenization effect. Each additional noise layer adds values that are statistically independent of the others, so extremes get averaged out. Rather than adding more layers, try using significantly different seeds and scales for the layers you already have. Fewer, well-chosen layers produce more interesting results than many layers washing each other out.

## Terrain Has Sheer Vertical Faces or Missing Ground

A visible vertical wall with a void beneath it usually means your curve's lowest possible output is too high — the terrain does not reach the floor of the space it is supposed to cover.

**Example:** If your curve's lowest `In` value is 30 and you are using `BaseHeight` at Y=100, the terrain minimum is Y=130. Anything below that simply does not exist, leaving sheer walls and open floor.

**Fixes:**
- Lower the minimum `In` value in your curve to extend terrain downward.
- Add a second noise density at a lower base height to fill the void.
- Raise the minimum `In` values of a lower-level terrain so it fills the gap from below.

A small remaining cliff face after the main void is fixed can usually be resolved by slightly adjusting both the maximum of the lower terrain and the minimum of the upper terrain until they overlap naturally.

## Nodes Produce Unexpected Values

- Remember that `Sum` of two [-1, 1] values can range from -2 to 2. Use `Clamp` or `Normalizer` to bring values back into an expected range before feeding them to a `CurveMapper`.

```bounds
{"min": -2, "max": 2, "context": [-2, 2], "label": "Sum of two [-1,1] inputs — [-2, 2] before Clamp/Normalizer"}
```

```bounds
{"min": -1, "max": 1, "context": [-2, 2], "label": "After Clamp or Normalizer — trimmed back to [-1, 1]"}
```
- Verify noise `Scale` values -- very large scales produce very fine, grainy noise; very small scales produce wide, smooth hills.
- Double-check signs on `Constant` or `AmplitudeConstant` values — a misplaced minus sign on one input in a multi-layer graph can cause unexpected holes or spikes. Watch your signs carefully when working with negative offsets.

## Preview Doesn't Match In-Game Result

Some nodes are exact in TerraNova's preview evaluator, some are approximated, and a smaller set is unsupported. If your terrain looks flat, missing, or wrong in the editor but generates correctly in-game, check whether your graph contains any of these:

| Node | Preview behavior | Workaround |
|------|-----------------|------------|
| `GradientWarp` | Evaluated with finite-difference gradient sampling | Use preview for direction and broad scale, then validate heavy warps in-game |
| `VectorWarp` | Approximated through vector-provider direction plus connected magnitude | Check the base terrain without the warp if the vector provider is complex |
| `BaseHeight` | Reads the named content field; with `Distance: true`, returns `Y - baseY` | Confirm the referenced content field exists and use `Distance: true` for altitude-band recipes |
| `CellWallDistance` | Reads the distance side-channel populated by upstream `PositionsCellNoise` / `CellNoise` evaluation; falls back to `0` when no cell distance has been computed | Keep the cell-noise node upstream in the graph |
| `Terrain` | Approximated as `baseHeight - Y` in preview | Treat it as a terrain-shape proxy, not a full runtime terrain-provider query |
| `Imported` | Passes through a connected inline input; unresolved cross-asset references preview as `0` | Inline the referenced subgraph while previewing, then restore the import before export |

> See [Expert Terrain Techniques -- Preview vs. Runtime](./guides/terrain/terrain-types-expert.md) for the full reference table including approximated nodes.

## Help and Support

If you need extra help, open an issue in the TerraNova repository or join the project chat.
