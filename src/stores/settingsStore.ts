import { create } from "zustand";
import { DEFAULT_FLOW_DIRECTION, type FlowDirection } from "@/constants";

const STORAGE_KEY = "tn-settings";

export type HytaleAssetSourceChannel = "pre-release" | "release";

// Default path constants removed — use resolveDefaultPreReleaseAssetsPath(),
// resolveDefaultReleaseAssetsPath(), resolveDefaultCommonAssetsPath() from
// src/utils/hytaleDefaultPaths.ts to get OS/user-correct paths at runtime.

function getStoredSettingsObject(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function getStoredFlowDirection(): FlowDirection {
  const parsed = getStoredSettingsObject();
  if (parsed?.flowDirection === "LR" || parsed?.flowDirection === "RL") {
    return parsed.flowDirection;
  }
  return DEFAULT_FLOW_DIRECTION;
}

function getStoredAutoLayoutOnOpen(): boolean {
  const parsed = getStoredSettingsObject();
  if (typeof parsed?.autoLayoutOnOpen === "boolean") {
    return parsed.autoLayoutOnOpen;
  }
  return false;
}

function getStoredConfirmOnNodeDelete(): boolean {
  const parsed = getStoredSettingsObject();
  if (typeof parsed?.confirmOnNodeDelete === "boolean") {
    return parsed.confirmOnNodeDelete;
  }
  return false;
}

function getStoredInstantSaveEnabled(): boolean {
  const parsed = getStoredSettingsObject();
  if (typeof parsed?.instantSaveEnabled === "boolean") {
    return parsed.instantSaveEnabled;
  }
  return false;
}

function getStoredInstantSaveDebounceMs(): number {
  const parsed = getStoredSettingsObject();
  if (typeof parsed?.instantSaveDebounceMs === "number" && parsed.instantSaveDebounceMs >= 100) {
    return parsed.instantSaveDebounceMs;
  }
  return 200;
}

function getStoredExportPath(): string | null {
  const parsed = getStoredSettingsObject();
  if (typeof parsed?.exportPath === "string") return parsed.exportPath;
  return null;
}

function getStoredAutoCheckUpdates(): boolean {
  const parsed = getStoredSettingsObject();
  if (typeof parsed?.autoCheckUpdates === "boolean") {
    return parsed.autoCheckUpdates;
  }
  return true;
}

function getStoredKeybindingOverrides(): Record<string, string> {
  const parsed = getStoredSettingsObject();
  if (parsed?.keybindingOverrides && typeof parsed.keybindingOverrides === "object") {
    return parsed.keybindingOverrides as Record<string, string>;
  }
  return {};
}

function getStoredHytaleAssetSyncEnabled(): boolean {
  const parsed = getStoredSettingsObject();
  if (typeof parsed?.hytaleAssetSyncEnabled === "boolean") {
    return parsed.hytaleAssetSyncEnabled;
  }
  return false;
}

function getStoredHytaleAssetSourceChannel(): HytaleAssetSourceChannel {
  const parsed = getStoredSettingsObject();
  if (parsed?.hytaleAssetSourceChannel === "pre-release" || parsed?.hytaleAssetSourceChannel === "release") {
    return parsed.hytaleAssetSourceChannel;
  }
  return "pre-release";
}

function getStoredHytalePreReleaseAssetsPath(): string {
  const parsed = getStoredSettingsObject();
  if (typeof parsed?.hytalePreReleaseAssetsPath === "string" && parsed.hytalePreReleaseAssetsPath.trim()) {
    return parsed.hytalePreReleaseAssetsPath;
  }
  return "";
}

function getStoredHytaleReleaseAssetsPath(): string {
  const parsed = getStoredSettingsObject();
  if (typeof parsed?.hytaleReleaseAssetsPath === "string" && parsed.hytaleReleaseAssetsPath.trim()) {
    return parsed.hytaleReleaseAssetsPath;
  }
  return "";
}

function getStoredHytaleCommonAssetsEnabled(): boolean {
  const parsed = getStoredSettingsObject();
  if (typeof parsed?.hytaleCommonAssetsEnabled === "boolean") {
    return parsed.hytaleCommonAssetsEnabled;
  }
  return true;
}

function getStoredHytaleCommonAssetsPath(): string {
  const parsed = getStoredSettingsObject();
  if (typeof parsed?.hytaleCommonAssetsPath === "string" && parsed.hytaleCommonAssetsPath.trim()) {
    return parsed.hytaleCommonAssetsPath;
  }
  return "";
}

function persistSettings(settings: {
  flowDirection: FlowDirection;
  autoLayoutOnOpen: boolean;
  confirmOnNodeDelete: boolean;
  autoCheckUpdates: boolean;
  keybindingOverrides: Record<string, string>;
  instantSaveEnabled: boolean;
  instantSaveDebounceMs: number;
  exportPath: string | null;
  hytaleAssetSyncEnabled: boolean;
  hytaleAssetSourceChannel: HytaleAssetSourceChannel;
  hytalePreReleaseAssetsPath: string;
  hytaleReleaseAssetsPath: string;
  hytaleCommonAssetsEnabled: boolean;
  hytaleCommonAssetsPath: string;
}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

interface SettingsState {
  flowDirection: FlowDirection;
  autoLayoutOnOpen: boolean;
  confirmOnNodeDelete: boolean;
  autoCheckUpdates: boolean;
  keybindingOverrides: Record<string, string>;
  instantSaveEnabled: boolean;
  instantSaveDebounceMs: number;
  exportPath: string | null;
  hytaleAssetSyncEnabled: boolean;
  hytaleAssetSourceChannel: HytaleAssetSourceChannel;
  hytalePreReleaseAssetsPath: string;
  hytaleReleaseAssetsPath: string;
  hytaleCommonAssetsEnabled: boolean;
  hytaleCommonAssetsPath: string;
  setFlowDirection: (dir: FlowDirection) => void;
  setAutoLayoutOnOpen: (value: boolean) => void;
  setAutoCheckUpdates: (value: boolean) => void;
  setConfirmOnNodeDelete: (value: boolean) => void;
  setKeybindingOverride: (id: string, key: string) => void;
  resetKeybinding: (id: string) => void;
  resetAllKeybindings: () => void;
  setInstantSaveEnabled: (value: boolean) => void;
  toggleInstantSave: () => void;
  setInstantSaveDebounceMs: (ms: number) => void;
  setExportPath: (path: string | null) => void;
  setHytaleAssetSyncEnabled: (value: boolean) => void;
  setHytaleAssetSourceChannel: (value: HytaleAssetSourceChannel) => void;
  setHytalePreReleaseAssetsPath: (value: string) => void;
  setHytaleReleaseAssetsPath: (value: string) => void;
  setHytaleCommonAssetsEnabled: (value: boolean) => void;
  setHytaleCommonAssetsPath: (value: string) => void;
}

function getAllSettings(state: SettingsState) {
  return {
    flowDirection: state.flowDirection,
    autoLayoutOnOpen: state.autoLayoutOnOpen,
    confirmOnNodeDelete: state.confirmOnNodeDelete,
    autoCheckUpdates: state.autoCheckUpdates,
    keybindingOverrides: state.keybindingOverrides,
    instantSaveEnabled: state.instantSaveEnabled,
    instantSaveDebounceMs: state.instantSaveDebounceMs,
    exportPath: state.exportPath,
    hytaleAssetSyncEnabled: state.hytaleAssetSyncEnabled,
    hytaleAssetSourceChannel: state.hytaleAssetSourceChannel,
    hytalePreReleaseAssetsPath: state.hytalePreReleaseAssetsPath,
    hytaleReleaseAssetsPath: state.hytaleReleaseAssetsPath,
    hytaleCommonAssetsEnabled: state.hytaleCommonAssetsEnabled,
    hytaleCommonAssetsPath: state.hytaleCommonAssetsPath,
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  flowDirection: getStoredFlowDirection(),
  autoLayoutOnOpen: getStoredAutoLayoutOnOpen(),
  confirmOnNodeDelete: getStoredConfirmOnNodeDelete(),
  autoCheckUpdates: getStoredAutoCheckUpdates(),
  keybindingOverrides: getStoredKeybindingOverrides(),
  instantSaveEnabled: getStoredInstantSaveEnabled(),
  instantSaveDebounceMs: getStoredInstantSaveDebounceMs(),
  exportPath: getStoredExportPath(),
  hytaleAssetSyncEnabled: getStoredHytaleAssetSyncEnabled(),
  hytaleAssetSourceChannel: getStoredHytaleAssetSourceChannel(),
  hytalePreReleaseAssetsPath: getStoredHytalePreReleaseAssetsPath(),
  hytaleReleaseAssetsPath: getStoredHytaleReleaseAssetsPath(),
  hytaleCommonAssetsEnabled: getStoredHytaleCommonAssetsEnabled(),
  hytaleCommonAssetsPath: getStoredHytaleCommonAssetsPath(),

  setFlowDirection: (dir) => {
    set({ flowDirection: dir });
    persistSettings(getAllSettings({ ...get(), flowDirection: dir }));
  },

  setAutoLayoutOnOpen: (value) => {
    set({ autoLayoutOnOpen: value });
    persistSettings(getAllSettings({ ...get(), autoLayoutOnOpen: value }));
  },

  setConfirmOnNodeDelete: (value) => {
    set({ confirmOnNodeDelete: value });
    persistSettings(getAllSettings({ ...get(), confirmOnNodeDelete: value }));
  },

  setAutoCheckUpdates: (value) => {
    set({ autoCheckUpdates: value });
    persistSettings(getAllSettings({ ...get(), autoCheckUpdates: value }));
  },

  setKeybindingOverride: (id, key) => {
    const overrides = { ...get().keybindingOverrides, [id]: key };
    set({ keybindingOverrides: overrides });
    persistSettings(getAllSettings({ ...get(), keybindingOverrides: overrides }));
  },

  resetKeybinding: (id) => {
    const overrides = { ...get().keybindingOverrides };
    delete overrides[id];
    set({ keybindingOverrides: overrides });
    persistSettings(getAllSettings({ ...get(), keybindingOverrides: overrides }));
  },

  resetAllKeybindings: () => {
    set({ keybindingOverrides: {} });
    persistSettings(getAllSettings({ ...get(), keybindingOverrides: {} }));
  },

  setInstantSaveEnabled: (value) => {
    set({ instantSaveEnabled: value });
    persistSettings(getAllSettings({ ...get(), instantSaveEnabled: value }));
  },

  toggleInstantSave: () => {
    const value = !get().instantSaveEnabled;
    set({ instantSaveEnabled: value });
    persistSettings(getAllSettings({ ...get(), instantSaveEnabled: value }));
  },

  setInstantSaveDebounceMs: (ms) => {
    const clamped = Math.max(100, Math.round(ms));
    set({ instantSaveDebounceMs: clamped });
    persistSettings(getAllSettings({ ...get(), instantSaveDebounceMs: clamped }));
  },

  setExportPath: (path) => {
    set({ exportPath: path });
    persistSettings(getAllSettings({ ...get(), exportPath: path }));
  },

  setHytaleAssetSyncEnabled: (value) => {
    set({ hytaleAssetSyncEnabled: value });
    persistSettings(getAllSettings({ ...get(), hytaleAssetSyncEnabled: value }));
  },

  setHytaleAssetSourceChannel: (value) => {
    set({ hytaleAssetSourceChannel: value });
    persistSettings(getAllSettings({ ...get(), hytaleAssetSourceChannel: value }));
  },

  setHytalePreReleaseAssetsPath: (value) => {
    set({ hytalePreReleaseAssetsPath: value });
    persistSettings(getAllSettings({ ...get(), hytalePreReleaseAssetsPath: value }));
  },

  setHytaleReleaseAssetsPath: (value) => {
    set({ hytaleReleaseAssetsPath: value });
    persistSettings(getAllSettings({ ...get(), hytaleReleaseAssetsPath: value }));
  },

  setHytaleCommonAssetsEnabled: (value) => {
    set({ hytaleCommonAssetsEnabled: value });
    persistSettings(getAllSettings({ ...get(), hytaleCommonAssetsEnabled: value }));
  },

  setHytaleCommonAssetsPath: (value) => {
    set({ hytaleCommonAssetsPath: value });
    persistSettings(getAllSettings({ ...get(), hytaleCommonAssetsPath: value }));
  },
}));
