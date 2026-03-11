import type { BiomeMaterialConfig } from "@/utils/materialResolver";
import type { SliceCreator, ConfigSliceState, SettingsConfig, InstanceConfig } from "./types";

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const configInitialState = {
  settingsConfig: null as SettingsConfig | null,
  instanceConfig: null as InstanceConfig | null,
  contentFields: { Base: 100, Water: 100, Bedrock: 0 } as Record<string, number>,
  materialConfig: null as BiomeMaterialConfig | null,
  originalWrapper: null as Record<string, unknown> | null,
  editingContext: null as string | null,
  rawJsonContent: null as Record<string, unknown> | null,
  jsonViewDraft: null as string | null,
};

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

export const createConfigSlice: SliceCreator<ConfigSliceState> = (set) => ({
  ...configInitialState,

  setSettingsConfig: (config) => set({ settingsConfig: config }),
  setInstanceConfig: (config) => set({ instanceConfig: config }),
  setContentFields: (fields) => set({ contentFields: fields }),
  setMaterialConfig: (config) => set({ materialConfig: config }),
  setOriginalWrapper: (wrapper) => set({ originalWrapper: wrapper }),
  setEditingContext: (context) => set({ editingContext: context }),
  setRawJsonContent: (content) => set({ rawJsonContent: content }),
  setJsonViewDraft: (draft) => set({ jsonViewDraft: draft }),
});
