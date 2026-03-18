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

## Nodes Produce Unexpected Values

- Remember that `Sum` of two [-1, 1] values can range from -2 to 2. Use `Clamp` or `Normalizer` to bring values back into an expected range before feeding them to a `CurveMapper`.
- Verify noise `Scale` values -- very large scales produce very fine, grainy noise; very small scales produce wide, smooth hills.

## Preview Doesn't Match In-Game Result

Several nodes return `0.0` or a simplified value in TerraNova's preview evaluator. If your terrain looks flat, missing, or wrong in the editor but generates correctly in-game, check whether your graph contains any of these:

| Node | Preview behavior | Workaround |
|------|-----------------|------------|
| `GradientWarp` | Returns `0.0` — warped terrain completely absent | Tune the child terrain without warping; test warp in-game only |
| `VectorWarp` | Returns `0.0` — directional distortion invisible | Same as above |
| `BaseHeight` | Returns `0.0` — terrain anchors at Y=0 | Temporarily replace with `Sum { Inputs: [YValue, Constant { Value: -64 }] }` while previewing |
| `CellWallDistance` | Returns `0.0` — Voronoi valley carving invisible | Use `CellNoise2D` distance output as a proxy during preview |
| `Terrain` | Returns `0.0` — terrain re-queries broken | Only usable in material providers; test slope-based materials in-game |
| `Imported` | Returns `0.0` — cross-asset references unresolved | Replace with inline copies during preview iteration |

> See [Expert Terrain Techniques — Preview vs. Runtime](./guides/terrain/terrain-types-expert.md) for the full reference table including approximated nodes.

## Help and Support

If you need extra help, open an issue in the TerraNova repository or join the project chat.
