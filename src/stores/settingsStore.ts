import { create } from "zustand";
import { DEFAULT_FLOW_DIRECTION, type FlowDirection } from "@/constants";

const STORAGE_KEY = "tn-settings";

export type HytaleAssetSourceChannel = "pre-release" | "release";

export const DEFAULT_HYTALE_PRERELEASE_ASSETS_PATH = "C:\\Users\\wolft\\AppData\\Roaming\\Hytale\\install\\pre-release\\package\\game\\latest\\Assets.zip";
export const DEFAULT_HYTALE_RELEASE_ASSETS_PATH = "C:\\Users\\wolft\\AppData\\Roaming\\Hytale\\install\\release\\package\\game\\latest";

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
  return DEFAULT_HYTALE_PRERELEASE_ASSETS_PATH;
}

function getStoredHytaleReleaseAssetsPath(): string {
  const parsed = getStoredSettingsObject();
  if (typeof parsed?.hytaleReleaseAssetsPath === "string" && parsed.hytaleReleaseAssetsPath.trim()) {
    return parsed.hytaleReleaseAssetsPath;
  }
  return DEFAULT_HYTALE_RELEASE_ASSETS_PATH;
}

function persistSettings(settings: {
  flowDirection: FlowDirection;
  autoLayoutOnOpen: boolean;
  autoCheckUpdates: boolean;
  keybindingOverrides: Record<string, string>;
  exportPath: string | null;
  hytaleAssetSyncEnabled: boolean;
  hytaleAssetSourceChannel: HytaleAssetSourceChannel;
  hytalePreReleaseAssetsPath: string;
  hytaleReleaseAssetsPath: string;
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
  autoCheckUpdates: boolean;
  keybindingOverrides: Record<string, string>;
  exportPath: string | null;
  hytaleAssetSyncEnabled: boolean;
  hytaleAssetSourceChannel: HytaleAssetSourceChannel;
  hytalePreReleaseAssetsPath: string;
  hytaleReleaseAssetsPath: string;
  setFlowDirection: (dir: FlowDirection) => void;
  setAutoLayoutOnOpen: (value: boolean) => void;
  setAutoCheckUpdates: (value: boolean) => void;
  setKeybindingOverride: (id: string, key: string) => void;
  resetKeybinding: (id: string) => void;
  resetAllKeybindings: () => void;
  setExportPath: (path: string | null) => void;
  setHytaleAssetSyncEnabled: (value: boolean) => void;
  setHytaleAssetSourceChannel: (value: HytaleAssetSourceChannel) => void;
  setHytalePreReleaseAssetsPath: (value: string) => void;
  setHytaleReleaseAssetsPath: (value: string) => void;
}

function getAllSettings(state: SettingsState) {
  return {
    flowDirection: state.flowDirection,
    autoLayoutOnOpen: state.autoLayoutOnOpen,
    autoCheckUpdates: state.autoCheckUpdates,
    keybindingOverrides: state.keybindingOverrides,
    exportPath: state.exportPath,
    hytaleAssetSyncEnabled: state.hytaleAssetSyncEnabled,
    hytaleAssetSourceChannel: state.hytaleAssetSourceChannel,
    hytalePreReleaseAssetsPath: state.hytalePreReleaseAssetsPath,
    hytaleReleaseAssetsPath: state.hytaleReleaseAssetsPath,
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  flowDirection: getStoredFlowDirection(),
  autoLayoutOnOpen: getStoredAutoLayoutOnOpen(),
  autoCheckUpdates: getStoredAutoCheckUpdates(),
  keybindingOverrides: getStoredKeybindingOverrides(),
  exportPath: getStoredExportPath(),
  hytaleAssetSyncEnabled: getStoredHytaleAssetSyncEnabled(),
  hytaleAssetSourceChannel: getStoredHytaleAssetSourceChannel(),
  hytalePreReleaseAssetsPath: getStoredHytalePreReleaseAssetsPath(),
  hytaleReleaseAssetsPath: getStoredHytaleReleaseAssetsPath(),

  setFlowDirection: (dir) => {
    set({ flowDirection: dir });
    persistSettings(getAllSettings({ ...get(), flowDirection: dir }));
  },

  setAutoLayoutOnOpen: (value) => {
    set({ autoLayoutOnOpen: value });
    persistSettings(getAllSettings({ ...get(), autoLayoutOnOpen: value }));
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
}));
