# Environments and Weathers Folder Guide

> **Scope:** `Server\Environments`, `Server\Weathers`, and `Common\Sky`
> **Use this for:** making your own environment/weather assets, importing built-in Hytale assets, and understanding environment parent chains.

---

## Folder Layout

### `Server\Environments`

Environment JSON files live here.

Use this folder for:
- biome atmosphere and weather routing
- zone variants like `Env_Zone1_Azure`
- cave and encounter variants like `Env_Zone1_Caves_Forests`
- unique sets like `Env_Forgotten_Temple_Exterior`

### `Server\Weathers`

Weather JSON files live here.

Use this folder for:
- sky color tracks
- fog and light tuning
- cloud layer configuration
- moon/star references
- weather files referenced by environment forecasts

### `Common\Sky`

Sky textures referenced by weather files live here.

Typical references include:
- star textures
- moon textures
- cloud textures

If a weather references `Sky\...`, TerraNova treats that as `Common\Sky\...` inside your pack.

---

## Importing From Hytale Assets

There are two main ways to pull in built-in Hytale content:

1. In the file tree, right-click a folder and use `Add Hytale Asset`.
2. In the right pane Asset Tools, use `Import Built-ins` or the per-entry `Import` / `Add` action.

Recommended workflow:
- create the standard folder first with `Add Hytale Folder`
- import a built-in asset close to what you want
- rename or duplicate it
- edit the copy instead of starting blind

This is especially useful for:
- `Server\Environments`
- `Server\Weathers`
- `Common\Sky`

### Manual Cache Setup

If you want TerraNova to use Hytale assets already installed on your machine, open `Settings -> Hytale Asset Cache` and point TerraNova at your local asset source.

Common setups:

- Pre-release:

```text
C:\Users\<you>\AppData\Roaming\Hytale\install\pre-release\package\game\latest\Assets.zip
```

- Release:

```text
C:\Users\<you>\AppData\Roaming\Hytale\install\release\package\game\latest
```

You can also point the release source directly at the `Assets.zip` inside `latest`.

If you want extra material art, block PNGs, and related shared textures, enable the external `Common` source in TerraNova settings and point it at:

```text
C:\Users\<you>\Desktop\Assets\Common
```

or any parent folder that contains `Common`.

The sync flow is:

1. choose `Pre-release` or `Release`
2. point TerraNova at `Assets.zip` or the `latest` folder on your computer
3. optionally layer in an external `Common` source
4. press `Sync Now`
5. use `Add Hytale Asset`, the Issue Log, or the Asset Tools pane against the cached files

---

## Making Your Own Environment

Start from one of these patterns:

- `Env_Zone1` for a broad surface environment base
- `Env_Zone1_Caves` for cave-family variants
- `Env_Default_Void` for void-like setups
- a unique base such as `Env_Forgotten_Temple_Base` for set-piece families

Observed Hytale parent chains:

- `Env_Zone1_Azure` -> `Env_Zone1`
- `Env_Zone1_Caves_Forests` -> `Env_Zone1_Caves`
- `Env_Forgotten_Temple_Exterior` -> `Env_Forgotten_Temple_Base`
- `Env_Zone1_Caves_Volcanic_T2` -> `Env_Zone1_Caves_Volcanic_T1`

Practical rule:
- `Parent` should usually point to the shared family base, not to a duplicate of the current file

Common child overrides:
- `Tags`
- `WaterTint`
- `SpawnDensity`
- local `WeatherForecasts`

If you are unsure, `Env_Zone1` is a safe general-purpose base for zone-style environment work.

---

## Making Your Own Zone Environment Folder

If you want your pack to feel like Hytale's layout, mirror the family folders under `Server\Environments`.

Typical pattern:

```text
Server/
  Environments/
    Zone1/
      Env_Zone1.json
      Env_Zone1_Forests.json
      Env_Zone1_Plains.json
      Env_Zone1_Shores.json
      Env_Zone1_Caves.json
      Env_Zone1_Caves_Forests.json
    Unique/
      Env_My_Setpiece_Base.json
      Env_My_Setpiece_Exterior.json
```

Recommended workflow for a new zone family:

1. Create `Server\Environments\Zone1` or your chosen zone folder.
2. Create the shared base first, for example `Env_Zone1.json`.
3. Create child variants next, such as `Env_Zone1_Forests` or `Env_Zone1_Caves`.
4. Point each child `Parent` back to the family base.
5. Override only the fields that need to differ.

Example family:

- `Env_Zone1` -> broad surface baseline
- `Env_Zone1_Forests` -> `Parent: Env_Zone1`
- `Env_Zone1_Plains` -> `Parent: Env_Zone1`
- `Env_Zone1_Caves` -> cave baseline for underground variants
- `Env_Zone1_Caves_Forests` -> `Parent: Env_Zone1_Caves`

Best practice:

- keep one base file per family
- keep related child variants in the same zone folder
- use `Unique` for special one-off sets with their own base chain
- import a Hytale environment first if you want a reliable starting shape

---

## Making Your Own Weather

When authoring a new weather:

1. Start from a built-in weather if possible.
2. Keep the JSON in `Server\Weathers`.
3. Keep referenced textures in `Common\Sky`.
4. Check the Weather Issue Log for missing fog, cloud, and celestial setup.

Good things to verify:
- `FogDistance` exists and is not inverted
- at least one core sky/fog color track exists
- star/moon references point to valid files
- cloud textures exist if cloud layers are configured

---

## TerraNova-Specific Workflow

### Environment Editor

Use the Issue Log to:
- assign a suggested `Parent`
- import referenced weather files
- create missing weather placeholders

Use the right pane Asset Tools to:
- filter referenced weather files by category
- import built-in referenced files
- create missing files
- reveal the target folder

### Weather Editor

Use the Issue Log to:
- add default celestial assets
- add default cloud layers
- fix fog distance problems

Use the right pane Asset Tools to:
- review referenced sky assets
- filter by category
- add built-in textures into `Common\Sky`

---

## Naming Guidance

Keep names family-oriented.

Examples:
- `Env_Zone1_Mountains`
- `Env_Zone1_Caves_Rats`
- `Zone1_Cloudy_Medium`
- `Zone1_Rain_Light`

That makes parent inference, search, and weather linking much easier inside TerraNova.
