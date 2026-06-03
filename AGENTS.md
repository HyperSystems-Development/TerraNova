## Learned User Preferences

- Do not create git commits unless the user explicitly asks.
- Align Hytale import, export, asset sync, and validation with the user's installed **release** game (`install/release/package/game/latest`), not pre-release, unless the user chooses otherwise.
- Do not commit generated `tsconfig.tsbuildinfo` or local Cursor hook state (for example `.cursor/hooks/state/continual-learning.json`) unless the user wants them in the branch.
- Treat the full gate suite as the bar for audit-ready work: `pnpm lint`, `pnpm exec vitest run`, `pnpm build`, `cargo fmt --check`, `cargo test`, `pnpm tauri build --no-sign`, and browser smoke.
- Before suggesting a commit, let the user decide on untracked planning docs (for example `docs/planning/BEST_PRACTICES_WORKFLOW.md`).
- Properties-panel and atmosphere improvements are follow-up tracks; keep the next commit focused on inspector bugs unless the user expands scope.

## Learned Workspace Facts

- TerraNova is a Hytale biome/terrain graph editor (Tauri + React) using Update 5-style prefixed node types.
- The user's reference release install is `%APPDATA%\Hytale\install\release\package\game\latest`, which ships **`Assets.zip`** rather than loose `Server/` or `Common/` trees at the game root.
- Hytale asset sync must extract `Assets.zip` when the source path is the `latest` folder; generator content lives under `Server/HytaleGenerator/...` inside the zip.
- Block/material icons come from synced `Common/Icons/ItemsGenerated/{blockId}.png`; Material Constant nodes use block IDs (for example `Rock_Stone`), not a separate `HytaleGenerator/Materials/` tree in release assets.
- Material export leaves use `{ Solid, Fluid: "", SolidBottomUp: false }`; preserve imported `$WorkspaceID`, `$Links`, and `$FloatingNodes` when saving `$NodeEditorMetadata`.
- Canvas comments and frames round-trip through `$NodeEditorMetadata`; annotations are merged after auto-layout on import and must not be dropped by layout.
- Prefixed editor keys (for example `Material:Constant`) must resolve by category so bare bundle names (for example Tint `Constant`) do not collide.
- Local dev: `pnpm tauri dev` (Vite on port 1420); annotation UAT often uses `templates/references/TheUnderworld.json`.
- App default Hytale asset channel targets **release** after the 2026-06 alignment work.
