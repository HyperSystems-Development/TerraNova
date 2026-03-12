import type {
  SliceCreator,
  FileCacheSliceState,
  FileGraphCache,
} from "./types";

const MAX_FILE_CACHE_SIZE = 10;

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const fileCacheInitialState = {
  fileCache: new Map<string, FileGraphCache>(),
};

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

export const createFileCacheSlice: SliceCreator<FileCacheSliceState> = (set, get) => ({
  ...fileCacheInitialState,

  cacheCurrentFile: (filePath: string, isDirty: boolean) => {
    const state = get();
    const { nodes, edges, biomeRanges, noiseRangeConfig, biomeConfig, settingsConfig, instanceConfig, materialConfig, biomeSections, activeBiomeSection, editingContext, originalWrapper, rawJsonContent, outputNodeId, history, historyIndex, fileCache } = state;

    // Snapshot active section's current state into biomeSections before caching
    let sectionsToCache = biomeSections;
    if (biomeSections && activeBiomeSection && biomeSections[activeBiomeSection]) {
      sectionsToCache = {
        ...biomeSections,
        [activeBiomeSection]: {
          ...biomeSections[activeBiomeSection],
          nodes: structuredClone(nodes),
          edges: structuredClone(edges),
          outputNodeId,
        },
      };
    }

    const newCache = new Map(fileCache);
    newCache.set(filePath, {
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
      biomeRanges: structuredClone(biomeRanges),
      noiseRangeConfig: structuredClone(noiseRangeConfig),
      biomeConfig: structuredClone(biomeConfig),
      settingsConfig: structuredClone(settingsConfig),
      instanceConfig: structuredClone(instanceConfig),
      materialConfig: structuredClone(materialConfig),
      biomeSections: sectionsToCache ? structuredClone(sectionsToCache) : null,
      activeBiomeSection,
      editingContext,
      originalWrapper: structuredClone(originalWrapper),
      rawJsonContent: rawJsonContent ? structuredClone(rawJsonContent) : null,
      outputNodeId,
      history,
      historyIndex,
      isDirty,
    });
    // LRU-style eviction
    if (newCache.size > MAX_FILE_CACHE_SIZE) {
      const oldest = newCache.keys().next().value;
      if (oldest) newCache.delete(oldest);
    }
    set({ fileCache: newCache });
  },

  restoreFromCache: (filePath: string) => {
    const { fileCache } = get();
    const cached = fileCache.get(filePath);
    if (!cached) return false;
    set({
      nodes: cached.nodes,
      edges: cached.edges,
      biomeRanges: cached.biomeRanges,
      noiseRangeConfig: cached.noiseRangeConfig,
      biomeConfig: cached.biomeConfig,
      settingsConfig: cached.settingsConfig,
      instanceConfig: cached.instanceConfig,
      materialConfig: cached.materialConfig,
      biomeSections: cached.biomeSections,
      activeBiomeSection: cached.activeBiomeSection,
      editingContext: cached.editingContext,
      originalWrapper: cached.originalWrapper,
      rawJsonContent: cached.rawJsonContent,
      outputNodeId: cached.outputNodeId,
      history: cached.history,
      historyIndex: cached.historyIndex,
      selectedNodeId: null,
    });
    // Remove from cache after restoring so references aren't shared
    const newCache = new Map(get().fileCache);
    newCache.delete(filePath);
    set({ fileCache: newCache });
    return cached;
  },
});
