# World Templates

This folder contains the bundled starter worlds that TerraNova can copy into a new project.

## Bundled Templates

These directories are surfaced by the app and included in production builds:

- `void`
- `forest-hills`
- `shattered-archipelago`
- `tropical-pirate-islands`
- `eldritch-spirelands`

`references/` is also kept here as a biome reference source for the editor, but it is not shown as a new-project starter world.

## Project Layout

Bundled templates are normalized into the same on-disk project structure as blank projects:

```text
<project>/
  manifest.json
  Server/
    HytaleGenerator/
      Biomes/
      Settings/
      WorldStructures/
```

Older template folders may still use a legacy root `HytaleGenerator/` layout. TerraNova now rewrites that into `Server/HytaleGenerator/` when creating a project so the resulting project tree stays consistent.

## Legacy Scratch Templates

`FirstTry/` and `FHillsTest/` are repository scratch templates kept for historical reference. They are not bundled, and the app now ignores them when listing starter template biomes.
