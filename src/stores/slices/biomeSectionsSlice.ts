import { useUIStore } from "../uiStore";
import { emit } from "../storeEvents";
import { saveSession } from "@/utils/sessionPersist";
import type {
  EditorState,
  SliceCreator,
  BiomeSectionsSliceState,
  BiomeSectionData,
  SectionHistoryEntry,
} from "./types";

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const biomeSectionsInitialState = {
  biomeSections: null as Record<string, BiomeSectionData> | null,
  activeBiomeSection: null as string | null,
  biomeConfig: null as EditorState["biomeConfig"],
};

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

export const createBiomeSectionsSlice: SliceCreator<BiomeSectionsSliceState> = (set, get) => {
  function markDirty() {
    emit("editor:dirty");
  }

  return {
    ...biomeSectionsInitialState,

    setBiomeSections: (sections) => set({ biomeSections: sections }),
    setActiveBiomeSection: (section) => {
      set({ activeBiomeSection: section });
      saveSession({ activeBiomeSection: section });
    },
    setBiomeConfig: (config) => set({ biomeConfig: config }),

    switchBiomeSection: (target) => {
      const { activeBiomeSection, biomeSections, nodes, edges, outputNodeId } = get();
      if (!biomeSections || target === activeBiomeSection) return;

      // Save current section's graph state + history
      const updated = { ...biomeSections };
      if (activeBiomeSection && updated[activeBiomeSection]) {
        const currentSection = updated[activeBiomeSection];
        updated[activeBiomeSection] = {
          ...currentSection,
          nodes: structuredClone(nodes),
          edges: structuredClone(edges),
          outputNodeId,
        };
      }

      // Load target section (including its history)
      const targetData = updated[target];
      if (targetData) {
        set({
          biomeSections: updated,
          activeBiomeSection: target,
          nodes: structuredClone(targetData.nodes),
          edges: structuredClone(targetData.edges),
          outputNodeId: targetData.outputNodeId ?? null,
          selectedNodeId: null,
        });
        saveSession({ activeBiomeSection: target });
        // Reload per-tab bookmarks for the new section
        useUIStore.getState().reloadBookmarks(undefined, undefined, target);
      }
    },

    addPropSection: () => {
      const { biomeSections, biomeConfig } = get();
      if (!biomeSections) return;
      const existingPropKeys = Object.keys(biomeSections).filter((k) => k.startsWith("Props["));
      const nextIndex = existingPropKeys.length;
      const key = `Props[${nextIndex}]`;
      const initialEntry: SectionHistoryEntry = {
        nodes: [],
        edges: [],
        outputNodeId: null,
        label: "Initial",
      };
      const newSection: BiomeSectionData = {
        nodes: [],
        edges: [],
        outputNodeId: null,
        history: [initialEntry],
        historyIndex: 0,
      };
      const updatedMeta = biomeConfig
        ? [...biomeConfig.propMeta, { Runtime: 0, Skip: false }]
        : [{ Runtime: 0, Skip: false }];
      set({
        biomeSections: { ...biomeSections, [key]: newSection },
        biomeConfig: biomeConfig ? { ...biomeConfig, propMeta: updatedMeta } : null,
      });
      markDirty();
    },

    removePropSection: (key: string) => {
      const { biomeSections, activeBiomeSection, biomeConfig, nodes, edges, outputNodeId } = get();
      if (!biomeSections || !key.startsWith("Props[")) return;

      // Sync the active section's live canvas state back before modifying
      const synced = { ...biomeSections };
      if (activeBiomeSection && synced[activeBiomeSection]) {
        synced[activeBiomeSection] = {
          ...synced[activeBiomeSection],
          nodes: structuredClone(nodes),
          edges: structuredClone(edges),
          outputNodeId,
        };
      }

      delete synced[key];

      // Collect remaining Props with their ORIGINAL indices (for correct meta mapping)
      const remainingProps = Object.keys(synced)
        .filter((k) => k.startsWith("Props["))
        .sort()
        .map((k) => {
          const origIdx = parseInt(/\[(\d+)\]/.exec(k)![1]);
          return { section: synced[k], meta: biomeConfig?.propMeta[origIdx] ?? { Runtime: 0, Skip: false } };
        });

      // Remove old prop keys
      for (const k of Object.keys(synced)) {
        if (k.startsWith("Props[")) delete synced[k];
      }

      // Re-add with contiguous indices
      for (let i = 0; i < remainingProps.length; i++) {
        synced[`Props[${i}]`] = remainingProps[i].section;
      }

      // Update propMeta to match
      const updatedMeta = remainingProps.map((p) => p.meta);

      // If the removed section was active, switch to Terrain
      const newActive = activeBiomeSection === key ? "Terrain" : activeBiomeSection;
      const switchTarget = newActive && synced[newActive] ? newActive : Object.keys(synced)[0] ?? null;

      const result: Partial<EditorState> = {
        biomeSections: synced,
        biomeConfig: biomeConfig ? { ...biomeConfig, propMeta: updatedMeta } : null,
      };

      if (switchTarget !== activeBiomeSection) {
        const targetData = switchTarget ? synced[switchTarget] : null;
        result.activeBiomeSection = switchTarget;
        result.nodes = targetData ? structuredClone(targetData.nodes) : [];
        result.edges = targetData ? structuredClone(targetData.edges) : [];
        result.outputNodeId = targetData?.outputNodeId ?? null;
        result.selectedNodeId = null;
      }

      set(result);
      markDirty();
    },
  };
};
