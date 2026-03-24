# Troubleshooting

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

**Fix:** Make sure your curve's `Out` range covers all possible results your density can produce. After a `Sum` of two noise nodes, the result can range from -2 to 2 — a curve with `Out` values only reaching -1 and 1 will miss the extremes. Extend your curve to match, or wrap the density in a `Clamp` node before the `CurveMapper`.

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
- Verify noise `Scale` values -- very large scales produce very fine, grainy noise; very small scales produce wide, smooth hills.
- Double-check signs on `Constant` or `AmplitudeConstant` values — a misplaced minus sign on one input in a multi-layer graph can cause unexpected holes or spikes. Watch your signs carefully when working with negative offsets.

## Preview Doesn't Match In-Game Result

Several nodes return `0.0` or a simplified value in TerraNova's preview evaluator. If your terrain looks flat, missing, or wrong in the editor but generates correctly in-game, check whether your graph contains any of these:

| Node | Preview behavior | Workaround |
|------|-----------------|------------|
| `GradientWarp` | Returns `0.0` -- warped terrain completely absent | Tune the child terrain without warping; test warp in-game only |
| `VectorWarp` | Returns `0.0` -- directional distortion invisible | Same as above |
| `BaseHeight` | Returns `0.0` -- terrain anchors at Y=0 | Temporarily replace with `Sum { Inputs: [YValue, Constant { Value: -64 }] }` while previewing |
| `CellWallDistance` | Returns `0.0` -- Voronoi valley carving invisible | Use `CellNoise2D` distance output as a proxy during preview |
| `Terrain` | Returns `0.0` -- terrain re-queries broken | Only usable in material providers; test slope-based materials in-game |
| `Imported` | Returns `0.0` -- cross-asset references unresolved | Replace with inline copies during preview iteration |

> See [Expert Terrain Techniques -- Preview vs. Runtime](./guides/terrain/terrain-types-expert.md) for the full reference table including approximated nodes.

## Help and Support

If you need extra help, open an issue in the TerraNova repository or join the project chat.
