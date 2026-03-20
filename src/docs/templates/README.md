# Doc Templates

Use these files when you are writing new TerraNova documentation.

This folder is for contributor-facing writing templates only. It is not the same as the bundled world templates you pick in **New Project**.

## What Belongs Here

- `guide-template.md` for concept guides and explanation-heavy pages
- `walkthrough-template.md` for step-by-step lessons that use walkthrough mode

If you are documenting how to use TerraNova, start from one of these templates and then move the finished page into the correct folder under `src/docs/`.

## Which One Should You Copy?

Choose **Guide Template** when the page explains:
- what a system does
- why a node pattern works
- tradeoffs, tuning, or mental models

Choose **Walkthrough Template** when the page asks the reader to:
- add nodes in order
- make a visible change step by step
- follow along inside the editor

## Ground Rules

- Keep walkthrough pages beginner-friendly and task-oriented.
- Add `steps` arrays to `nodegraph` blocks when a reader should inspect nodes one at a time.
- Show curve previews when the shape matters to the lesson.
- Remove all HTML comments before submitting a finished doc.
- Keep internal links relative to `src/docs/`.

## Related Docs

- [Contributing](../contributing.md)
- [Overview](../overview.md)
- [Guide Template](./guide-template.md)
- [Walkthrough Template](./walkthrough-template.md)
