# Glossary — In-Game Commands

These commands can be used in the game console or in connected servers when using WorldGen V2.

## WorldGen Type Change

```
/world settings worldgentype set <GeneratorType>
```

**GeneratorType options:**

- `HytaleGenerator` → V2 Default World
- `Default` → V1 Default World
- `Flat` → V1 Flat World
- `Void` → V1 Void World

## World Reload

```
/worldgen reload --clear
```

Reloads all chunks.

## Viewport

```
/viewport --radius <number>
```

Creates a viewport in a radius around you. The WorldGen inside the radius will reload automatically when changes are made and saved in the Asset Node Editor.
