import { useProjectStore } from "../projectStore";
import { useConfigStore } from "../configStore";
import type {
  EditorState,
  SliceCreator,
  HistorySliceState,
  HistoryEntry,
  SectionHistoryEntry,
  BiomeRangeEntry,
  SettingsConfig,
} from "./types";
import type { Node, Edge } from "@xyflow/react";

// ---------------------------------------------------------------------------
// History persistence helpers (localStorage)
// ---------------------------------------------------------------------------

function getMaxPersistedHistory(): number {
  return useConfigStore.getState().maxPersistedHistory;
}
let _persistTimer: ReturnType<typeof setTimeout> | null = null;

// Cache structuredClone results for unchanged references between commits
const _cloneCache = new WeakMap<object, object>();
function cachedClone<T>(value: T): T {
  if (value === null || value === undefined || typeof value !== "object") return value;
  const existing = _cloneCache.get(value as object);
  if (existing) return existing as T;
  const clone = structuredClone(value);
  _cloneCache.set(value as object, clone as object);
  return clone;
}

function historyStorageKey(): string {
  const { projectPath, currentFile } = useProjectStore.getState();
  if (!projectPath || !currentFile) return "";
  return `tn-history:${projectPath}:${currentFile}`;
}

// We need a reference to the store's getState. This is set after store creation.
let _getEditorState: (() => EditorState) | null = null;
export function _setEditorStateGetter(getter: () => EditorState) {
  _getEditorState = getter;
}

function persistHistory() {
  try {
    const key = historyStorageKey();
    if (!key || !_getEditorState) return;
    const state = _getEditorState();

    if (state.biomeSections) {
      const s: Record<string, { h: SectionHistoryEntry[]; i: number }> = {};
      for (const [k, sec] of Object.entries(state.biomeSections)) {
        const trimmed = sec.history.slice(-getMaxPersistedHistory());
        const offset = sec.history.length - trimmed.length;
        s[k] = { h: trimmed, i: sec.historyIndex - offset };
      }
      localStorage.setItem(key, JSON.stringify({ v: 1, t: Date.now(), s }));
    } else {
      const trimmed = state.history.slice(-getMaxPersistedHistory());
      const offset = state.history.length - trimmed.length;
      localStorage.setItem(key, JSON.stringify({
        v: 1, t: Date.now(),
        g: { h: trimmed, i: state.historyIndex - offset },
      }));
    }
  } catch { /* quota exceeded — silently fail */ }
}

export function schedulePersist() {
  if (_persistTimer) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(persistHistory, 2000);
}

export function loadPersistedHistory(projectPath: string, filePath: string) {
  try {
    const key = `tn-history:${projectPath}:${filePath}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.v !== 1) return null;
    return data as {
      v: 1; t: number;
      g?: { h: HistoryEntry[]; i: number };
      s?: Record<string, { h: SectionHistoryEntry[]; i: number }>;
    };
  } catch { return null; }
}

// Flush history on app close
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (_persistTimer) clearTimeout(_persistTimer);
    persistHistory();
  });
}

// ---------------------------------------------------------------------------
// mutateAndCommit — cross-cutting helper used by other slices
// ---------------------------------------------------------------------------

let _mutateAndCommit: ((updater: (state: EditorState) => Partial<EditorState>, label?: string) => void) | null = null;

export function getMutateAndCommit() {
  return _mutateAndCommit!;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const historyInitialState = {
  history: [{ nodes: [] as Node[], edges: [] as Edge[], biomeRanges: [] as BiomeRangeEntry[], noiseRangeConfig: null, biomeConfig: null, settingsConfig: null, label: "Initial" }] as HistoryEntry[],
  historyIndex: 0,
  _moveTimer: null as ReturnType<typeof setTimeout> | null,
};

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

export const createHistorySlice: SliceCreator<HistorySliceState> = (set, get) => {
  // Debounce tracking for rapid commits
  let _lastCommitTime = 0;
  let _lastCommitLabel = "";

  function mutateAndCommit(updater: (state: EditorState) => Partial<EditorState>, label = "Edit") {
    set((state) => {
      const updates = updater(state);
      const newNodes = (updates.nodes as Node[]) ?? state.nodes;
      const newEdges = (updates.edges as Edge[]) ?? state.edges;
      const newOutputNodeId = updates.outputNodeId !== undefined ? updates.outputNodeId as string | null : state.outputNodeId;

      const now = Date.now();
      const isDebounced = (now - _lastCommitTime < 150) && (_lastCommitLabel === label);
      _lastCommitTime = now;
      _lastCommitLabel = label;

      // Per-section history when editing a biome file
      if (state.biomeSections && state.activeBiomeSection) {
        const sectionKey = state.activeBiomeSection;
        const section = state.biomeSections[sectionKey];
        if (section) {
          let sectionHistory = section.history.slice(0, section.historyIndex + 1);
          const entry: SectionHistoryEntry = {
            nodes: structuredClone(newNodes),
            edges: structuredClone(newEdges),
            outputNodeId: newOutputNodeId,
            label,
          };
          if (isDebounced && sectionHistory.length > 1) {
            sectionHistory[sectionHistory.length - 1] = entry;
          } else {
            sectionHistory.push(entry);
          }
          const _secHistMax = useConfigStore.getState().maxHistoryEntries;
          if (sectionHistory.length > _secHistMax) sectionHistory = sectionHistory.slice(sectionHistory.length - _secHistMax);
          const newSectionIndex = sectionHistory.length - 1;

          return {
            ...updates,
            nodes: newNodes,
            edges: newEdges,
            outputNodeId: newOutputNodeId,
            biomeSections: {
              ...state.biomeSections,
              [sectionKey]: {
                ...section,
                nodes: newNodes,
                edges: newEdges,
                outputNodeId: newOutputNodeId,
                history: sectionHistory,
                historyIndex: newSectionIndex,
              },
            },
          };
        }
      }

      // Global history for standalone files
      const newBiomeRanges = (updates.biomeRanges as BiomeRangeEntry[]) ?? state.biomeRanges;
      const newNoiseRangeConfig = updates.noiseRangeConfig !== undefined ? updates.noiseRangeConfig : state.noiseRangeConfig;
      const newBiomeConfig = updates.biomeConfig !== undefined ? updates.biomeConfig : state.biomeConfig;
      const newSettingsConfig = updates.settingsConfig !== undefined ? (updates.settingsConfig as SettingsConfig | null) : state.settingsConfig;
      let newHistory = state.history.slice(0, state.historyIndex + 1);
      const fullEntry: HistoryEntry = {
        nodes: structuredClone(newNodes),
        edges: structuredClone(newEdges),
        biomeRanges: structuredClone(newBiomeRanges),
        noiseRangeConfig: structuredClone(newNoiseRangeConfig),
        biomeConfig: structuredClone(newBiomeConfig),
        settingsConfig: structuredClone(newSettingsConfig),
        label,
      };
      if (isDebounced && newHistory.length > 1) {
        newHistory[newHistory.length - 1] = fullEntry;
      } else {
        newHistory.push(fullEntry);
      }
      { const _histMax = useConfigStore.getState().maxHistoryEntries; if (newHistory.length > _histMax) newHistory = newHistory.slice(newHistory.length - _histMax); }
      return {
        ...updates,
        nodes: newNodes,
        edges: newEdges,
        biomeRanges: newBiomeRanges,
        noiseRangeConfig: newNoiseRangeConfig,
        biomeConfig: newBiomeConfig,
        settingsConfig: newSettingsConfig,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
    schedulePersist();
  }

  // Expose mutateAndCommit for other slices
  _mutateAndCommit = mutateAndCommit;

  return {
    ...historyInitialState,

    commitState: (label = "Edit") => {
      set((state) => {
        // Per-section history for biome files
        if (state.biomeSections && state.activeBiomeSection) {
          const sectionKey = state.activeBiomeSection;
          const section = state.biomeSections[sectionKey];
          if (section) {
            let sectionHistory = section.history.slice(0, section.historyIndex + 1);
            sectionHistory.push({
              nodes: cachedClone(state.nodes),
              edges: cachedClone(state.edges),
              outputNodeId: state.outputNodeId,
              label,
            });
            const _secHistMax = useConfigStore.getState().maxHistoryEntries;
          if (sectionHistory.length > _secHistMax) sectionHistory = sectionHistory.slice(sectionHistory.length - _secHistMax);
            return {
              biomeSections: {
                ...state.biomeSections,
                [sectionKey]: {
                  ...section,
                  nodes: state.nodes,
                  edges: state.edges,
                  outputNodeId: state.outputNodeId,
                  history: sectionHistory,
                  historyIndex: sectionHistory.length - 1,
                },
              },
            };
          }
        }

        // Global history for standalone files
        let newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push({
          nodes: cachedClone(state.nodes),
          edges: cachedClone(state.edges),
          biomeRanges: cachedClone(state.biomeRanges),
          noiseRangeConfig: cachedClone(state.noiseRangeConfig),
          biomeConfig: cachedClone(state.biomeConfig),
          settingsConfig: cachedClone(state.settingsConfig),
          label,
        });
        { const _histMax = useConfigStore.getState().maxHistoryEntries; if (newHistory.length > _histMax) newHistory = newHistory.slice(newHistory.length - _histMax); }
        return { history: newHistory, historyIndex: newHistory.length - 1 };
      });
      schedulePersist();
    },

    undo: () => {
      const state = get();
      // Per-section undo for biome files
      if (state.biomeSections && state.activeBiomeSection) {
        const sectionKey = state.activeBiomeSection;
        const section = state.biomeSections[sectionKey];
        if (!section || section.historyIndex <= 0) return;
        const prev = section.history[section.historyIndex - 1];
        const newIndex = section.historyIndex - 1;
        set({
          nodes: prev.nodes,
          edges: prev.edges,
          outputNodeId: prev.outputNodeId,
          biomeSections: {
            ...state.biomeSections,
            [sectionKey]: {
              ...section,
              nodes: prev.nodes,
              edges: prev.edges,
              outputNodeId: prev.outputNodeId,
              historyIndex: newIndex,
            },
          },
        });
        schedulePersist();
        return;
      }

      // Global undo for standalone files
      const { history, historyIndex } = state;
      if (historyIndex <= 0) return;
      const prev = history[historyIndex - 1];
      set({
        nodes: prev.nodes,
        edges: prev.edges,
        biomeRanges: prev.biomeRanges,
        noiseRangeConfig: prev.noiseRangeConfig,
        biomeConfig: prev.biomeConfig,
        settingsConfig: prev.settingsConfig,
        historyIndex: historyIndex - 1,
      });
      schedulePersist();
    },

    redo: () => {
      const state = get();
      // Per-section redo for biome files
      if (state.biomeSections && state.activeBiomeSection) {
        const sectionKey = state.activeBiomeSection;
        const section = state.biomeSections[sectionKey];
        if (!section || section.historyIndex >= section.history.length - 1) return;
        const next = section.history[section.historyIndex + 1];
        const newIndex = section.historyIndex + 1;
        set({
          nodes: next.nodes,
          edges: next.edges,
          outputNodeId: next.outputNodeId,
          biomeSections: {
            ...state.biomeSections,
            [sectionKey]: {
              ...section,
              nodes: next.nodes,
              edges: next.edges,
              outputNodeId: next.outputNodeId,
              historyIndex: newIndex,
            },
          },
        });
        schedulePersist();
        return;
      }

      // Global redo for standalone files
      const { history, historyIndex } = state;
      if (historyIndex >= history.length - 1) return;
      const next = history[historyIndex + 1];
      set({
        nodes: next.nodes,
        edges: next.edges,
        biomeRanges: next.biomeRanges,
        noiseRangeConfig: next.noiseRangeConfig,
        biomeConfig: next.biomeConfig,
        settingsConfig: next.settingsConfig,
        historyIndex: historyIndex + 1,
      });
      schedulePersist();
    },

    jumpToHistory: (index) => {
      const state = get();
      // Per-section jump for biome files
      if (state.biomeSections && state.activeBiomeSection) {
        const sectionKey = state.activeBiomeSection;
        const section = state.biomeSections[sectionKey];
        if (!section || index < 0 || index >= section.history.length) return;
        const entry = section.history[index];
        set({
          nodes: entry.nodes,
          edges: entry.edges,
          outputNodeId: entry.outputNodeId,
          biomeSections: {
            ...state.biomeSections,
            [sectionKey]: {
              ...section,
              nodes: entry.nodes,
              edges: entry.edges,
              outputNodeId: entry.outputNodeId,
              historyIndex: index,
            },
          },
        });
        schedulePersist();
        return;
      }

      // Global jump for standalone files
      const { history } = state;
      if (index < 0 || index >= history.length) return;
      const entry = history[index];
      set({
        nodes: entry.nodes,
        edges: entry.edges,
        biomeRanges: entry.biomeRanges,
        noiseRangeConfig: entry.noiseRangeConfig,
        biomeConfig: entry.biomeConfig,
        settingsConfig: entry.settingsConfig,
        historyIndex: index,
      });
      schedulePersist();
    },
  };
};
