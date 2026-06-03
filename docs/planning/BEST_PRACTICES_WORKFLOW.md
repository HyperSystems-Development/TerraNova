# Best Practices Research Workflow

Use this workflow before implementing non-trivial TerraNova changes, especially CI,
release, security, dependency, performance, schema, or UX work. The goal is to
make every change source-backed, repo-grounded, reviewable, and verified.

## When to Run This

Run this workflow when any of these are true:

- The change touches CI, release packaging, updater/signing, security, browser or
  Tauri runtime behavior, dependencies, schema contracts, or user-facing UX.
- The answer may have changed since the last local note or prior implementation.
- The repo has stale roadmap/backlog claims that conflict with current code.
- A user asks for "best practices", "latest", "use the internet", or similar.

Skip it only for tiny, self-contained edits where the source of truth is fully
inside the repo and the relevant behavior is already covered by tests.

## Workflow

1. Ground in the repo first.
   - Check `git status --short --branch` and separate unrelated WIP from the task.
   - Read the current implementation, tests, docs, and config before proposing changes.
   - Prefer existing patterns and narrowly scoped changes over new abstractions.

2. Research current primary sources.
   - Use official docs first: GitHub Actions, Tauri, Vite, Vitest, Rust, React, or the
     dependency owner docs.
   - Use third-party posts only when official docs are missing a practical detail,
     and label them as secondary.
   - Record the source URL, date checked, and the concrete rule it changes.

3. Convert research into repo decisions.
   - State what the current TerraNova code does.
   - State what the current source says.
   - Decide the smallest change that aligns both.
   - Ask the user only for product tradeoffs that cannot be discovered locally.

4. Implement in reviewable slices.
   - Keep each slice tied to one reproducible issue, UX gap, or docs gap.
   - Avoid broad rewrites, global naming changes, and unrelated cleanup.
   - Do not add dependencies unless the source-backed benefit is clear.

5. Verify before claiming success.
   - Always run the narrowest relevant gate first.
   - For TerraNova release-readiness work, use:
     - `git diff --check`
     - `pnpm lint`
     - `pnpm docs:check` for docs-panel or docs-content work
     - `pnpm exec vitest run`
     - `pnpm build`
     - `cargo fmt --check` in `src-tauri`
     - `cargo check` in `src-tauri`
     - `cargo test` in `src-tauri`
     - `pnpm tauri build --no-sign` when local signing keys are unavailable
   - For browser-sensitive frontend or Tauri runtime changes, add a browser/dev smoke
     that checks the actual UI, console noise, and a real workflow path.

6. Report with evidence.
   - List changed files and why they changed.
   - List exact commands run and their result.
   - Link the official sources used.
   - Call out residual risks, skipped gates, and unrelated dirty files.

## TerraNova Source Defaults

### Hytale install and asset cache (repo behavior)

When verifying or documenting Hytale-related work:

- Prefer the user's **release** install: `%APPDATA%\Hytale\install\release\package\game\latest` (or `Assets.zip` inside it).
- Release often ships assets only inside **`Assets.zip`**; TerraNova sync must extract that zip, not expect loose `Common/` at the game root.
- Material **Constant** values are **block IDs** (for example `Rock_Stone`), not names under `HytaleGenerator/Materials/`.
- Material export leaves use `{ Solid, Fluid: "", SolidBottomUp: false }`.
- Biome import merges `$NodeEditorMetadata` comments/frames; save preserves `$WorkspaceID`, `$Links`, `$FloatingNodes` via `preservedNodeEditorMetadata`.
- Do not commit `.cursor/hooks/state/` or `tsconfig.tsbuildinfo` unless the user asks.

Use these sources as the default starting point, checked against the current repo:

### CI, Release, and Packaging

- GitHub Actions Node.js CI:
  https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs
- GitHub Actions Rust CI:
  https://docs.github.com/en/actions/tutorials/build-and-test-code/rust
- Tauri updater and update signing:
  https://v2.tauri.app/plugin/updater/
- Tauri Windows signing:
  https://v2.tauri.app/distribute/sign/windows/

### Frontend, Types, and UI

- React TypeScript usage:
  https://react.dev/learn/typescript
- TypeScript TSConfig reference:
  https://www.typescriptlang.org/tsconfig/
- React accessibility guidance:
  https://react.dev/reference/react-dom/components/common#applying-aria-attributes
- MDN React accessibility:
  https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Frameworks_libraries/React_accessibility
- React Flow TypeScript guidance:
  https://reactflow.dev/learn/advanced-use/typescript
- React Flow handle and connection validation:
  https://reactflow.dev/api-reference/components/handle
- Zustand testing guidance:
  https://zustand.docs.pmnd.rs/guides/testing

### Testing and Browser Verification

- Vite build options and chunk warning behavior:
  https://vite.dev/config/build-options
- Vitest globals/mocking guidance:
  https://main.vitest.dev/guide/mocking/globals
- Testing Library query priority:
  https://testing-library.com/docs/queries/about
- Playwright best practices:
  https://playwright.dev/docs/best-practices
- Playwright trace viewer:
  https://playwright.dev/docs/trace-viewer
- Playwright screenshots:
  https://playwright.dev/docs/screenshots

### Rust, Tauri Runtime, and Security

- Rust documentation index:
  https://doc.rust-lang.org/
- Cargo fmt:
  https://doc.rust-lang.org/cargo/commands/cargo-fmt.html
- Tauri security overview:
  https://v2.tauri.app/security/
- Tauri capabilities and permissions:
  https://v2.tauri.app/security/capabilities/

### Hytale and Hytale Modding

- Official Hytale news and engineering direction:
  https://hytale.com/news
- Hytale modding strategy and current modding state:
  https://hytale.com/news/2025/11/hytale-modding-strategy-and-status
- Hytale world generation direction:
  https://hytale.com/news/2026/1/the-future-of-world-generation
- HytaleModding.dev official-documentation mirror:
  https://hytalemodding.dev/en/docs/official-documentation
- HytaleModding.dev worldgen documentation:
  https://hytalemodding.dev/en/docs/official-documentation/worldgen/worldgen-tutorial/how-to-edit-and-create-biomes
- Hytale Guide world generation reference:
  https://hytale.guide/world-generation
- Unofficial Hytale server docs:
  https://hytale-docs.pages.dev/
- HytaleDevLib modding utility library:
  https://htdevlib.netlify.app/
- Unofficial Hytale Plugin API docs, generated from a server JAR:
  https://hytale-docs.dev/

## Source Selection Rules

- For framework behavior, use the framework's official docs before blog posts.
- For security, signing, updater, and CI behavior, use official docs only unless an
  official doc explicitly points to another primary source.
- For accessibility, prefer React docs plus MDN/WAI-ARIA guidance over UI-library examples.
- For package-specific APIs, use the package owner docs matching the installed major version.
- For TerraNova-specific behavior, the repo's code, tests, roadmap, and prior verified
  gates are the source of truth; internet sources only inform implementation choices.
- If official sources conflict with repo behavior, document the mismatch and choose the
  smallest safe change or ask the user if the choice changes product behavior.
- For Hytale behavior, prefer local observed assets and official Hytale posts before
  community docs. Treat HytaleModding.dev official-documentation pages as mirrored
  primary material only when they clearly state Hypixel Studios Canada Inc. authorship.
- Treat Hytale Guide, hytale-docs pages, Discord posts, Reddit posts, decompiled server
  references, and community API indexes as secondary/provisional. They can guide
  hypotheses, but TerraNova docs and schema output must label inferred or observed data
  as non-authoritative unless confirmed by official docs or local source assets.
- Treat HytaleDevLib and hytale-docs.dev as implementation aids only. They can help
  locate names, signatures, examples, and likely API behavior, but they are not official
  Hypixel sources and must not override official posts, mirrored official docs, or
  locally observed assets.
- For Hytale asset-schema changes, verify against real asset files when possible and
  preserve provenance fields such as observed source, heuristic status, and regeneration
  path instead of presenting observations as complete API truth.

## Pre-Implementation Checklist

- [ ] Current branch and dirty worktree reviewed.
- [ ] Relevant source files, tests, and docs inspected.
- [ ] Official source docs checked when the topic is current or ecosystem-dependent.
- [ ] Implementation scope limited to one reviewable improvement.
- [ ] Verification gates chosen before editing.
- [ ] User-facing assumptions recorded if any tradeoff remains.

## Post-Implementation Checklist

- [ ] Narrow gate passed.
- [ ] Full relevant gate passed or skipped with a reason.
- [ ] Browser/Tauri smoke completed when runtime behavior changed.
- [ ] `git status --short --branch` reviewed.
- [ ] Final report includes sources, commands, changed files, and residual risks.
