# Troubleshooting

This page covers common issues and suggested solutions.

## Performance Issues

- If the editor becomes slow, try closing unused panels.
- Reduce the node count in your world or break large graphs into smaller subgraphs.
- Wrap expensive density subgraphs in a `YSampled` node — this samples at coarse Y intervals and interpolates, providing ~4× speedup for vertical columns.
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

- Remember that `Sum` of two [–1, 1] values can range from –2 to 2. Use `Clamp` or `Normalizer` to bring values back into an expected range before feeding them to a `CurveMapper`.
- Verify noise `Scale` values — very large scales produce very fine, grainy noise; very small scales produce wide, smooth hills.

## Help & Support

If you need extra help, open an issue in the TerraNova repository or join the project chat.
