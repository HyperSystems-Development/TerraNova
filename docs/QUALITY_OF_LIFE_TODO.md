# Quality of Life Ideas (for future)

## Validation panel polish
- Biome-level issues in the Issues panel should click into the relevant biome section, not only graph nodes.
- Add one-click auto-fixes for safe diagnostics like delimiter sorting, missing defaults, and simple ref cleanup.
- Show section/field targets in validation entries so the navigation intent is obvious.

## Project-wide legacy node scanner (optional)
Per-file legacy node detection already works for the open file. This would extend it across the whole pack.
- New Rust command `scan_legacy_nodes(pack_root)` — walks every `.json` under `HytaleGenerator/Biomes/`, finds any `"Type"` field matching `LEGACY_TYPE_KEYS`, returns a list of `{ file, nodeType, replacement | null }` hits. Read-only, no writes.
- New IPC wrapper `scanLegacyNodes(packRoot)` in `ipc.ts`.
- Validation panel gets a collapsible "Project-wide" section showing total legacy count with a per-file breakdown. Clicking a row opens that file so the existing per-node Replace/Remove buttons can do the actual fix.
- Optional: small amber dot badge on file tree entries that have hits.
- **Do not add bulk cross-file replace** — too risky without the graph editor's validation pass. Phase 2 is open-and-fix per file only.

## Weather forecast editor
- UI to visualize and edit hourly weather patterns for each environment.
- Drag-and-drop timeline for weather types (rain, sun, fog, etc.).
- Preset browser: import/export weather presets from Hytale or custom sources.
- Validation: ensure weather transitions are smooth and realistic.
- Option to preview weather changes in real-time.

## Environment picker
- Searchable dropdown listing all Env_* files with metadata (biome, climate, etc.).
- Advanced settings: toggle expert mode for granular environment parameters (lighting, humidity, etc.).
- Quick preview: show environment thumbnail or summary.
- Option to create new environments or duplicate existing ones.

## Assignment browser
- Table view of all biome prop assignments, sortable and filterable.
- Highlight new assignments and assets borrowed from Hytale.
- Asset linking: click to view asset details or usage.
- Bulk edit: assign props to multiple biomes at once.

## WorldStructure viewer
- Interactive noise band visualization for each biome.
- Dropdown to select biome, browser to compare noise bands.
- Fine-tuning controls: sliders for band parameters, preview changes.
- Export/import noise band settings.

## Block/material autocomplete
- Node input fields use BlockTypeList for suggestions/autocomplete.
- Show block icons and descriptions in dropdown.
- Option to add custom blocks to BlockTypeList.

## Ambience reference
- List ambience configs per zone, with preview (audio/visual).
- Click to edit ambience settings or assign to new zones.
- Reference Hytale ambience assets for inspiration.

## File Explorer integration
- Right-click any file in left pane to open in File Explorer.
- Option to copy file path or reveal in OS.

## Legacy node updates
- Button to auto-update legacy nodes to latest format.
- Confirmation dialog ("Are you sure?") for bulk updates.
- Error/warning panel shows nodes needing update, with quick fix option.

## Node graph improvements
- Add node graphs for environment, weather, biome, tinting if missing.
- Reference Hytale asset structure for graph layout.
- Error/warning/info clickable for auto-fix or edit.
- Fetch referenced files for weather/fog/environment/biome/tinting; show errors if missing.
- Display source file at top, allow custom zone creation.

## Material Provider enhancements
- Dropdown to add/replace blocks in material provider.
- Advanced customization: tintable materials, combine providers.
- Reference Hytale assets for examples and presets.

## Asset pack support
- Detailed error info for failed asset pack loads.
- Auto-fix UTF-8 issues with one click.
- Error logs for common asset pack problems, with troubleshooting tips.

## Material Preview improvements
- Voxel preview shows all materials, with add/remove options.
- Ensure preview matches node and Hytale asset usage.
- Compliance checker for worldgen material rules.

## Hytale asset correctness (from real biome analysis)
- Move non-component exports out of PropertyPanel.tsx into a utility file to fix Vite Fast Refresh HMR warning.
- TintProvider Density node: allow editing the SimplexNoise2D parameters (Seed, Scale, Octaves, Persistence, Lacunarity) from the AtmosphereTab tint section rather than requiring node graph access.
- Biome browser: show tint color swatch preview inline for each project biome (read TintProvider.Delimiters colors on load).
- Biome browser: show which environment the biome resolves to beside each project biome entry.
- Weather section: show all forecast hour buckets from the environment's WeatherForecasts so users can see the full day/night weather schedule.
- Weather section: clicking the env file / weather file path rows should open the file in the editor.
- EnvironmentProvider empty object `{}` — display a clear "uses server default" label in the node graph and AtmosphereTab instead of showing nothing.
- Export Environment: validate that the sanitized name produces a unique Env_* file (warn if a file with that name already exists).
