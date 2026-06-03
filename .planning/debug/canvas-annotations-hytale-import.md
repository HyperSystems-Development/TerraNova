---
status: partial — Phases 1–4 shipped (2026-06-03); Phase 5 open; user docs updated in CHANGELOG + environments guide
trigger: "canvas comments/frames corrupt or lost on Hytale import"
created: 2026-06-03
implemented: 2026-06-03
---

## Implementation status (2026-06-03)

| Phase | Status | Notes |
|-------|--------|-------|
| 1 Key compatibility | Done | Tolerant import; export emits lowercase + PascalCase comment keys. |
| 2 `importAnnotations.ts` | Done | `buildAnnotationNodesFromImportMetadata`, `mergeImportGraph`; tests in `importAnnotations.test.ts`. |
| 3 Wire `useTauriIO` | Done | `importMeta` consumed; standalone, NoiseRange, biome (`extractBiomeSections` + first-section annotations). |
| 4 Round-trip extras | Done | `nodeEditorMetadata.ts` + `preservedNodeEditorMetadata` store; merge on save/export. |
| 5 Author notes UX | Open | Behavior unchanged; Hytale comments should render as yellow (verify manually). |

Tests: `pnpm exec vitest run src/utils/__tests__/importAnnotations.test.ts src/utils/__tests__/hytaleTranslation.test.ts` — 138 passed.

# Canvas Annotations × Hytale Import — Implementation Plan

## 1. Problem Statement

TerraNova supports canvas **comment** and **frame** nodes (React Flow UI-only types). Hytale stores the same information in root-level `$NodeEditorMetadata.$Comments` and `$Groups`. Today the import/export pipeline is only half-wired:

| Symptom | Root cause |
|---------|------------|
| Comments/frames missing after opening a Hytale asset | `useTauriIO` calls `normalizeImportWithMeta` but **discards `metadata`**; annotation import is explicitly disabled (TODO ~L660). |
| Comment text empty after re-import of a TerraNova export | **Key casing mismatch**: export writes `$Text`/`$Width`/`$Height`; import reads `$text`/`$width`/`$height`. Real Hytale files use lowercase (see `templates/references/TheUnderworld.json`). |
| First save deletes Hytale annotations user never saw | `$NodeEditorMetadata` is **stripped** during `hytaleToInternalBiome`; `originalWrapper` has no metadata; save regenerates metadata **only from canvas nodes** (empty if never imported). |
| Auto-layout strips annotations on import | `importAutoLayout` filters annotations out and returns layouted graph nodes only — unlike `layoutActions.ts`, which preserves them. |
| Biome annotations land in wrong section or wrong coords | Biome is split into sections (Terrain, MaterialProvider, Props[i]…); Hytale metadata is **biome-global** with huge absolute coordinates; no section-routing logic exists. |
| `$Comment` on nodes vs canvas comments conflated | Per-node `$Comment` (e.g. `Conditional(Threshold=…)`) is semantic, stored in `metadata.comments` — unrelated to canvas comment nodes. |

**Success criteria:** Open a Hytale biome/density file with `$Comments`/`$Groups` → annotations visible on canvas; edit and save → round-trip without losing text, size, or positions; auto-layout/tidy never drop annotations.

---

## 2. Current Architecture

```
Hytale JSON on disk
  └─ normalizeImportWithMeta (fileTypeDetection.ts)
       ├─ hytaleToInternal / hytaleToInternalBiome (hytaleToInternal.ts)
       │    ├─ parseNodeEditorMetadata → hytaleComments, hytaleGroups, nodePositions
       │    └─ strips all `$…` keys from wrapper (incl. $NodeEditorMetadata)
       └─ returns { content, metadata }   ← metadata currently unused

useTauriIO.handleOpenFile
  └─ const { content: normalized } = normalizeImportWithMeta(...)  // metadata dropped
  └─ jsonToGraph(content) → importAutoLayout (strips annotations) → setNodes

Save path
  └─ graphToJson strips comment/frame via ANNOTATION_TYPES (graphToJson.ts)
  └─ internalToHytale / internalToHytaleBiome
       └─ generateNodeEditorMetadata(reactFlowNodes) (internalToHytale.ts)
```

### Key files

| File | Role |
|------|------|
| `src/utils/hytaleToInternal.ts` | `parseNodeEditorMetadata`, `ImportMetadata`, `hytaleToInternal*`, preserves `__hytaleNodeId` on nodes |
| `src/utils/internalToHytale.ts` | `generateNodeEditorMetadata` — serializes comment/frame nodes to `$Comments`/`$Groups` |
| `src/utils/fileTypeDetection.ts` | `normalizeImportWithMeta` — returns `{ content, metadata }` |
| `src/hooks/useTauriIO.ts` | Import/save orchestration; annotation import **disabled**; biome section extraction |
| `src/utils/jsonToGraph.ts` | Uses `__hytaleNodeId` for stable node IDs (positions not applied — auto-layout) |
| `src/utils/graphToJson.ts` | `ANNOTATION_TYPES` filter — correct: annotations must not enter asset JSON |
| `src/utils/layoutActions.ts` | Reference pattern: filter annotations before layout, re-append after |
| `src/utils/annotationUtils.ts` | Author Note prefix (`Author Note:`) — TerraNova-only UI convention |
| `src/nodes/CommentNode.tsx`, `FrameNode.tsx` | Canvas node implementations |

### Research notes (2026-06-03)

- **`importAnnotations.ts`** — implemented; see status table above.
- **`useTauriIO.ts`** — wired via `mergeImportGraph` + `importMeta`.
- **`nodePositions`** — still parsed but not applied (auto-layout on import by design).
- **File cache** — still fine once annotations are on canvas; fresh disk load fixed by Phase 3.

---

## 3. Phased Tasks

### Phase 1 — Fix metadata key compatibility (parse + export)

**Goal:** Single source of truth for Hytale comment/group field names; accept both native and legacy TerraNova casing.

**Tasks:**
1. Add `readCommentField(obj, ...keys)` helper in `hytaleToInternal.ts` (or shared `metadataKeys.ts`) — try `$text` then `$Text`, `$width` then `$Width`, etc.
2. Update `parseNodeEditorMetadata` to use tolerant reads; optionally capture Hytale `$name` on comments (currently ignored).
3. Update `generateNodeEditorMetadata` to emit **Hytale-native lowercase** keys (`$text`, `$width`, `$height`) matching real assets; keep PascalCase reads for backward compat.
4. Align frame group keys (`$name`, `$width`, `$height` — already lowercase on export).

**Acceptance criteria:**
- [ ] Parse of `TheUnderworld.json` `$Comments[0]` yields `text: "It just replaces air really high lol"`.
- [ ] Export → parse round-trip preserves comment text and dimensions.
- [ ] Existing `hytaleTranslation.test.ts` export assertions updated if key names change.

---

### Phase 2 — Annotation node builder (pure utility)

**Goal:** Convert `ImportMetadata` into React Flow comment/frame nodes.

**Tasks:**
1. Create `src/utils/importAnnotations.ts`:
   - `buildAnnotationNodes(metadata: Pick<ImportMetadata, 'hytaleComments' | 'hytaleGroups'>): Node[]`
   - IDs: `comment-${uuid}`, `frame-${uuid}` (match `CanvasContextMenu.tsx` convention).
   - Map fields: `text`, `width`, `height` / `name`, `width`, `height`.
2. Add optional `offsetAnnotationsToGraph(annotations, graphNodes)` — compute graph bounding box after auto-layout, translate Hytale absolute coords so annotations sit near the graph (Hytale coords are often 10⁵+). Strategy:
   - **v1:** Place comments/frames at their Hytale positions **minus** min(graph bbox origin), or at graph origin + small margin if positions are degenerate.
   - Document that perfect Hytale editor fidelity is not guaranteed after auto-layout.
3. Export `mergeGraphWithAnnotations(layoutedNodes, annotationNodes): Node[]` — annotations appended (same as `layoutActions.ts`).

**Acceptance criteria:**
- [ ] Unit test: fixture metadata → expected comment/frame node count, text, dimensions.
- [ ] Unit test: offset helper places annotations within reasonable distance of graph nodes.

---

### Phase 3 — Wire import paths in `useTauriIO`

**Goal:** Consume `metadata` on open; never drop annotations during import auto-layout.

**Tasks:**
1. Fix `importAutoLayout` to mirror `layoutActions.ts`:
   ```ts
   const graphNodes = nodes.filter(n => !isAnnotation(n));
   const annotations = nodes.filter(isAnnotation);
   const layouted = await autoLayout(graphNodes, edges, direction);
   return [...layouted, ...annotations];
   ```
2. Destructure metadata: `const { content, metadata } = normalizeImportWithMeta(...)`.
3. **Standalone typed assets** (~L509): after `jsonToGraph` + `importAutoLayout`, if `metadata?.hytaleComments/hytaleGroups`, build and merge annotation nodes.
4. **Biome files** (~L621): after `extractBiomeSections`, inject annotations into target section(s):
   - **v1 recommendation:** attach all imported annotations to the **first section** (usually Terrain) — simple, avoids duplication across sections.
   - **v1.1 optional:** spatial heuristic — assign each annotation to the section whose graph node positions (post-layout bbox) are closest.
5. Re-enable commented `ImportMetadata` import and constants.
6. Store `metadata.nodeEditorMetadata` (raw) on editor store or inside `originalWrapper` side channel for unknown-field preservation (see Phase 4).

**Acceptance criteria:**
- [ ] Open `TheUnderworld.json` → at least one comment node visible with correct text.
- [ ] Open biome with `$Groups` only → frame nodes visible with names/sizes.
- [ ] Switch biome section → annotations remain in assigned section (not duplicated).
- [ ] Auto-layout on import does not remove annotations.

---

### Phase 4 — Round-trip preservation

**Goal:** Save without silently deleting metadata the canvas doesn't model.

**Tasks:**
1. Extend editor state (minimal): e.g. `importedNodeEditorMetadata: Record<string, unknown> | null` set on open, cleared on new file.
2. On save, `generateNodeEditorMetadata` output merged with preserved keys:
   - Always regenerate `$Comments`, `$Groups`, `$Nodes` from canvas.
   - Preserve `$FloatingNodes`, `$Links`, `$WorkspaceID` from import if not edited (pass-through).
3. Ensure `originalWrapper` does not need `$NodeEditorMetadata` (it's stripped intentionally) — use separate field.

**Acceptance criteria:**
- [ ] Import biome with non-empty `$WorkspaceID` → save → `$WorkspaceID` unchanged.
- [ ] Add new comment in TerraNova → save → re-open → old + new comments present.
- [ ] Save without opening (export from cached session) still includes user-added annotations.

---

### Phase 5 — Author notes & UX polish

**Goal:** Clarify TerraNova-only "Author Note" vs Hytale comment; no corruption of semantic `$Comment`.

**Tasks:**
1. Do **not** map Hytale `$Comments` to Author Note styling unless text already has prefix (user-added in TerraNova).
2. Context menu "Add author note" continues to use `makeAuthorNoteText` — exports as normal `$Comments` entry.
3. Document in code comment: `metadata.comments` (per-node `$Comment`) ≠ canvas comments.

**Acceptance criteria:**
- [ ] Hytale-native comments render as yellow Comment, not Author Note.
- [ ] Conditional `$Comment` on Mix nodes still converts correctly (existing behavior).

---

## 4. Test Strategy

### Unit tests to add

| File | Cases |
|------|-------|
| `src/utils/__tests__/importAnnotations.test.ts` | `buildAnnotationNodes`, offset/merge helpers |
| `src/utils/__tests__/hytaleTranslation.test.ts` | Extend "biome annotation metadata" with **import** round-trip; `$Text`/`$text` compat |
| `src/utils/__tests__/parseNodeEditorMetadata.test.ts` (or inline in hytaleTranslation) | Real fixture snippets from `TheUnderworld.json`, `Salt_Flats.json` |
| `src/utils/__tests__/migration.test.ts` | `normalizeImportWithMeta` returns non-null metadata for Hytale biome |

### Integration / fixture tests

- Load `templates/references/TheUnderworld.json` through `hytaleToInternalBiome` → `buildAnnotationNodes` → assert comment count/text.
- Full round-trip: `internalToHytaleBiome` with annotation nodes → `hytaleToInternalBiome` → annotations equal.

### Manual UAT

1. Open TheUnderworld biome → verify comment + frames visible.
2. Add frame, save, reopen → frame persists.
3. Auto-layout (Ctrl+Shift+L) → annotations stay, graph relayouts.
4. Open standalone density JSON with `$NodeEditorMetadata` → comments appear.
5. Switch files and back (cache) → annotations preserved.

### Commands

```bash
npm test -- src/utils/__tests__/importAnnotations.test.ts
npm test -- src/utils/__tests__/hytaleTranslation.test.ts
npm test -- src/utils/__tests__/migration.test.ts
```

---

## 5. Risks & Edge Cases

| Risk | Mitigation |
|------|------------|
| **Biome multi-section** — Hytale has one metadata block; TerraNova has N canvases | v1: pin annotations to first section; document limitation; v1.1 spatial routing |
| **Coordinate systems** — Hytale absolute vs TerraNova auto-layouted graph | Offset annotations relative to graph bbox; accept imperfect placement |
| **Cached file restore** | Cache already stores nodes — OK once annotations are in node array; no change needed |
| **Export without re-import** (user created annotations in TerraNova, never had Hytale metadata) | `generateNodeEditorMetadata` creates fresh metadata — OK |
| **Export overwrites `$Nodes` IDs** | Graph nodes use TerraNova IDs on export; Hytale `$NodeId` on asset tree is separate — existing behavior; annotations don't use `$Nodes` |
| **Empty comment placeholders** (`$text: ""`) | Import as empty comment nodes (Salt_Flats has 3) — user can delete; or filter zero-size/empty in v1.1 |
| **JSON view mode save** | Bypasses graph — annotations not editable in JSON view; document or block save warning |
| **Author notes vs comments** | Prefix is TerraNova-only; export as `$text`; re-import shows as normal comment unless prefix present |
| **Per-node `$Comment`** | Never create canvas comment nodes from `metadata.comments` — semantic only |
| **Biome save flattens sections** | Export already merges all section nodes into one `$NodeEditorMetadata` — consistent with Hytale |

---

## 6. Out of Scope (v1)

- Restoring **`$FloatingNodes`** / **`$Links`** as editable canvas elements
- Using Hytale **`nodePositions`** instead of auto-layout for graph nodes
- Per-section `$NodeEditorMetadata` (Hytale doesn't support this natively)
- **`importAnnotations.ts` in save path** — generation stays in `internalToHytale`
- Annotation support for **Environment**, **Weather**, **Settings**, **Instance** files (no graph)
- **Group nodes** (UI collapse) — only comment/frame annotations
- Migrating legacy TerraNova internal format annotations (no `$NodeEditorMetadata`)
- Visual z-order / frame membership (which nodes a frame "contains") — Hytale groups are visual-only rectangles

---

## 7. Suggested Implementation Order

1. Phase 1 (key fix) — unblocks round-trip tests  
2. Phase 2 (builder) — testable in isolation  
3. Phase 3 (wire import) — user-visible fix  
4. Phase 4 (preserve raw metadata) — prevents silent data loss on save  
5. Phase 5 (author note clarity) — low risk polish  

**Estimated touch count:** ~6 files (`hytaleToInternal.ts`, `internalToHytale.ts`, `importAnnotations.ts`, `useTauriIO.ts`, tests, optional store field).
