# Docs Layout

[`src/docs/`](../src/docs) is the source of truth for TerraNova's in-app documentation.

Use `src/docs/` for:
- walkthroughs shown in the docs pane
- guides and reference content loaded by the app
- cross-linked learning content for end users

The root `docs/` folder is for repository-level and release-adjacent material:
- [`CHANGELOG.md`](./CHANGELOG.md)
- [`AI_TRANSPARENCY.md`](./AI_TRANSPARENCY.md)
- planning notes under [`planning/`](./planning)
- compatibility redirect pages kept to avoid breaking old links
- repository-facing notes such as the bundled world template catalog under [`../templates/README.md`](../templates/README.md)

If you are updating what users read inside TerraNova, edit [`src/docs/overview.md`](../src/docs/overview.md), not `docs/`.
