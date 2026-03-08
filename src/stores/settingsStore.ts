import { create } from "zustand";
import { DEFAULT_FLOW_DIRECTION, type FlowDirection } from "@/constants";

const STORAGE_KEY = "tn-settings";

function getStoredFlowDirection(): FlowDirection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FLOW_DIRECTION;
    const parsed = JSON.parse(raw);
    if (parsed.flowDirection === "LR" || parsed.flowDirection === "RL") {
      return parsed.flowDirection;
    }
  } catch {
    // ignore
  }
  return DEFAULT_FLOW_DIRECTION;
}

function getStoredAutoLayoutOnOpen(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (typeof parsed.autoLayoutOnOpen === "boolean") {
      return parsed.autoLayoutOnOpen;
    }
  } catch {
    // ignore
  }
  return false;
}

function getStoredExportPath(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.exportPath === "string") return parsed.exportPath;
  } catch {
    // ignore
  }
  return null;
}

function getStoredAutoCheckUpdates(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    if (typeof parsed.autoCheckUpdates === "boolean") {
      return parsed.autoCheckUpdates;
    }
  } catch {
    // ignore
  }
  return true;
}

function getStoredKeybindingOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed.keybindingOverrides && typeof parsed.keybindingOverrides === "object") {
      return parsed.keybindingOverrides;
    }
  } catch {
    // ignore
  }
  return {};
}

function persistSettings(settings: {
  flowDirection: FlowDirection;
  autoLayoutOnOpen: boolean;
  autoCheckUpdates: boolean;
  keybindingOverrides: Record<string, string>;
  exportPath: string | null;
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
  setFlowDirection: (dir: FlowDirection) => void;
  setAutoLayoutOnOpen: (value: boolean) => void;
  setAutoCheckUpdates: (value: boolean) => void;
  setKeybindingOverride: (id: string, key: string) => void;
  resetKeybinding: (id: string) => void;
  resetAllKeybindings: () => void;
  setExportPath: (path: string | null) => void;
}

function getAllSettings(state: SettingsState) {
  return {
    flowDirection: state.flowDirection,
    autoLayoutOnOpen: state.autoLayoutOnOpen,
    autoCheckUpdates: state.autoCheckUpdates,
    keybindingOverrides: state.keybindingOverrides,
    exportPath: state.exportPath,
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  flowDirection: getStoredFlowDirection(),
  autoLayoutOnOpen: getStoredAutoLayoutOnOpen(),
  autoCheckUpdates: getStoredAutoCheckUpdates(),
  keybindingOverrides: getStoredKeybindingOverrides(),
  exportPath: getStoredExportPath(),

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
}));
