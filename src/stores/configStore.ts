import { create } from "zustand";

const STORAGE_KEY = "tn-config";

// ── Default values ──

export type GpuPowerPreference = "high-performance" | "default" | "low-power";

const DEFAULTS = {
  // CPU
  cpuCoresAllocated: navigator.hardwareConcurrency || 4,
  debounceMs: 500,
  autoRefresh: true,
  enableProgressiveVoxel: true,
  maxWorkerThreads: 4,

  // GPU
  gpuMemoryBudgetMb: 4096,
  gpuPowerPreference: "high-performance" as GpuPowerPreference,
  preferredGpuId: "",
  rendererPixelRatio: 0,
  enableShadows: true,
  shadowMapSize: 1024,
  ssaoSamples: 8,

  // RAM
  ramBudgetMb: 2048,
  maxHistoryEntries: 50,
  maxPersistedHistory: 20,

  // Defaults
  defaultPreviewRes: 128,
  defaultVoxelRes: 32,
  defaultVoxelYSlices: 32,
};

// ── Hydration helpers ──

function getStored(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getStoredNumber(key: string, fallback: number): number {
  const data = getStored();
  if (!data) return fallback;
  const v = data[key];
  return typeof v === "number" && !isNaN(v) ? v : fallback;
}

function getStoredBool(key: string, fallback: boolean): boolean {
  const data = getStored();
  if (!data) return fallback;
  const v = data[key];
  return typeof v === "boolean" ? v : fallback;
}

function getStoredString<T extends string>(key: string, fallback: T, allowed: T[]): T {
  const data = getStored();
  if (!data) return fallback;
  const v = data[key];
  return typeof v === "string" && (allowed as string[]).includes(v) ? (v as T) : fallback;
}

function getStoredLooseString(key: string, fallback: string): string {
  const data = getStored();
  if (!data) return fallback;
  const v = data[key];
  return typeof v === "string" ? v : fallback;
}

// ── Persistence ──

function persistConfig(state: ConfigValues) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded — silently fail
  }
}

// ── Budget → settings mapping ──

export function cpuBudgetToSettings(cores: number) {
  if (cores <= 1) return { maxWorkerThreads: 1, debounceMs: 2000, enableProgressiveVoxel: false, autoRefresh: true };
  if (cores <= 2) return { maxWorkerThreads: 2, debounceMs: 1000, enableProgressiveVoxel: true, autoRefresh: true };
  if (cores <= 3) return { maxWorkerThreads: 3, debounceMs: 500, enableProgressiveVoxel: true, autoRefresh: true };
  return { maxWorkerThreads: 4, debounceMs: 500, enableProgressiveVoxel: true, autoRefresh: true };
}

export function gpuBudgetToSettings(mb: number) {
  if (mb <= 512) return { rendererPixelRatio: 0.5, enableShadows: false, shadowMapSize: 512, ssaoSamples: 4, gpuPowerPreference: "low-power" as GpuPowerPreference };
  if (mb <= 1024) return { rendererPixelRatio: 0.75, enableShadows: true, shadowMapSize: 512, ssaoSamples: 4, gpuPowerPreference: "default" as GpuPowerPreference };
  if (mb <= 2048) return { rendererPixelRatio: 1, enableShadows: true, shadowMapSize: 1024, ssaoSamples: 8, gpuPowerPreference: "default" as GpuPowerPreference };
  if (mb <= 4096) return { rendererPixelRatio: 0, enableShadows: true, shadowMapSize: 1024, ssaoSamples: 8, gpuPowerPreference: "high-performance" as GpuPowerPreference };
  if (mb <= 8192) return { rendererPixelRatio: 0, enableShadows: true, shadowMapSize: 2048, ssaoSamples: 16, gpuPowerPreference: "high-performance" as GpuPowerPreference };
  return { rendererPixelRatio: 0, enableShadows: true, shadowMapSize: 4096, ssaoSamples: 32, gpuPowerPreference: "high-performance" as GpuPowerPreference };
}

export function ramBudgetToSettings(mb: number) {
  if (mb <= 256) return { maxHistoryEntries: 10, maxPersistedHistory: 5, defaultPreviewRes: 64, defaultVoxelRes: 16, defaultVoxelYSlices: 8 };
  if (mb <= 512) return { maxHistoryEntries: 25, maxPersistedHistory: 10, defaultPreviewRes: 128, defaultVoxelRes: 32, defaultVoxelYSlices: 16 };
  if (mb <= 1024) return { maxHistoryEntries: 50, maxPersistedHistory: 20, defaultPreviewRes: 128, defaultVoxelRes: 32, defaultVoxelYSlices: 32 };
  if (mb <= 2048) return { maxHistoryEntries: 75, maxPersistedHistory: 30, defaultPreviewRes: 256, defaultVoxelRes: 64, defaultVoxelYSlices: 32 };
  return { maxHistoryEntries: 100, maxPersistedHistory: 50, defaultPreviewRes: 512, defaultVoxelRes: 128, defaultVoxelYSlices: 64 };
}

// ── Types ──

interface ConfigValues {
  // CPU
  cpuCoresAllocated: number;
  debounceMs: number;
  autoRefresh: boolean;
  enableProgressiveVoxel: boolean;
  maxWorkerThreads: number;

  // GPU
  gpuMemoryBudgetMb: number;
  gpuPowerPreference: GpuPowerPreference;
  preferredGpuId: string;
  rendererPixelRatio: number;
  enableShadows: boolean;
  shadowMapSize: number;
  ssaoSamples: number;

  // RAM
  ramBudgetMb: number;
  maxHistoryEntries: number;
  maxPersistedHistory: number;

  // Defaults
  defaultPreviewRes: number;
  defaultVoxelRes: number;
  defaultVoxelYSlices: number;
}

interface ConfigState extends ConfigValues {
  // Budget-level setters (auto-configure sub-settings)
  applyCpuBudget: (cores: number) => void;
  applyGpuBudget: (mb: number) => void;
  applyRamBudget: (mb: number) => void;

  // Individual setters (granular override)
  setDebounceMs: (v: number) => void;
  setAutoRefresh: (v: boolean) => void;
  setEnableProgressiveVoxel: (v: boolean) => void;
  setMaxWorkerThreads: (v: number) => void;
  setGpuPowerPreference: (v: GpuPowerPreference) => void;
  setPreferredGpuId: (v: string) => void;
  setRendererPixelRatio: (v: number) => void;
  setEnableShadows: (v: boolean) => void;
  setShadowMapSize: (v: number) => void;
  setSsaoSamples: (v: number) => void;
  setMaxHistoryEntries: (v: number) => void;
  setMaxPersistedHistory: (v: number) => void;
  setDefaultPreviewRes: (v: number) => void;
  setDefaultVoxelRes: (v: number) => void;
  setDefaultVoxelYSlices: (v: number) => void;

  resetAll: () => void;
}

function getValues(state: ConfigState): ConfigValues {
  return {
    cpuCoresAllocated: state.cpuCoresAllocated,
    debounceMs: state.debounceMs,
    autoRefresh: state.autoRefresh,
    enableProgressiveVoxel: state.enableProgressiveVoxel,
    maxWorkerThreads: state.maxWorkerThreads,
    gpuMemoryBudgetMb: state.gpuMemoryBudgetMb,
    gpuPowerPreference: state.gpuPowerPreference,
    preferredGpuId: state.preferredGpuId,
    rendererPixelRatio: state.rendererPixelRatio,
    enableShadows: state.enableShadows,
    shadowMapSize: state.shadowMapSize,
    ssaoSamples: state.ssaoSamples,
    ramBudgetMb: state.ramBudgetMb,
    maxHistoryEntries: state.maxHistoryEntries,
    maxPersistedHistory: state.maxPersistedHistory,
    defaultPreviewRes: state.defaultPreviewRes,
    defaultVoxelRes: state.defaultVoxelRes,
    defaultVoxelYSlices: state.defaultVoxelYSlices,
  };
}

function makeSetter<K extends keyof ConfigValues>(key: K) {
  return (v: ConfigValues[K]) => {
    const { get, set, persist } = _storeHelpers!;
    set({ [key]: v } as Partial<ConfigState>);
    persist(getValues({ ...get(), [key]: v } as ConfigState));
  };
}

let _storeHelpers: {
  get: () => ConfigState;
  set: (partial: Partial<ConfigState>) => void;
  persist: (state: ConfigValues) => void;
} | null = null;

export const useConfigStore = create<ConfigState>((set, get) => {
  _storeHelpers = { get, set, persist: persistConfig };

  return {
    // ── Hydrated state ──
    cpuCoresAllocated: getStoredNumber("cpuCoresAllocated", DEFAULTS.cpuCoresAllocated),
    debounceMs: getStoredNumber("debounceMs", DEFAULTS.debounceMs),
    autoRefresh: getStoredBool("autoRefresh", DEFAULTS.autoRefresh),
    enableProgressiveVoxel: getStoredBool("enableProgressiveVoxel", DEFAULTS.enableProgressiveVoxel),
    maxWorkerThreads: getStoredNumber("maxWorkerThreads", DEFAULTS.maxWorkerThreads),

    gpuMemoryBudgetMb: getStoredNumber("gpuMemoryBudgetMb", DEFAULTS.gpuMemoryBudgetMb),
    gpuPowerPreference: getStoredString("gpuPowerPreference", DEFAULTS.gpuPowerPreference, ["high-performance", "default", "low-power"]),
    preferredGpuId: getStoredLooseString("preferredGpuId", DEFAULTS.preferredGpuId),
    rendererPixelRatio: getStoredNumber("rendererPixelRatio", DEFAULTS.rendererPixelRatio),
    enableShadows: getStoredBool("enableShadows", DEFAULTS.enableShadows),
    shadowMapSize: getStoredNumber("shadowMapSize", DEFAULTS.shadowMapSize),
    ssaoSamples: getStoredNumber("ssaoSamples", DEFAULTS.ssaoSamples),

    ramBudgetMb: getStoredNumber("ramBudgetMb", DEFAULTS.ramBudgetMb),
    maxHistoryEntries: getStoredNumber("maxHistoryEntries", DEFAULTS.maxHistoryEntries),
    maxPersistedHistory: getStoredNumber("maxPersistedHistory", DEFAULTS.maxPersistedHistory),

    defaultPreviewRes: getStoredNumber("defaultPreviewRes", DEFAULTS.defaultPreviewRes),
    defaultVoxelRes: getStoredNumber("defaultVoxelRes", DEFAULTS.defaultVoxelRes),
    defaultVoxelYSlices: getStoredNumber("defaultVoxelYSlices", DEFAULTS.defaultVoxelYSlices),

    // ── Budget-level setters ──
    applyCpuBudget: (cores) => {
      const derived = cpuBudgetToSettings(cores);
      const updates = { cpuCoresAllocated: cores, ...derived };
      set(updates);
      persistConfig(getValues({ ...get(), ...updates }));
    },
    applyGpuBudget: (mb) => {
      const derived = gpuBudgetToSettings(mb);
      const updates = { gpuMemoryBudgetMb: mb, ...derived };
      set(updates);
      persistConfig(getValues({ ...get(), ...updates }));
    },
    applyRamBudget: (mb) => {
      const derived = ramBudgetToSettings(mb);
      const updates = { ramBudgetMb: mb, ...derived };
      set(updates);
      persistConfig(getValues({ ...get(), ...updates }));
    },

    // ── Individual setters ──
    setDebounceMs: makeSetter("debounceMs"),
    setAutoRefresh: makeSetter("autoRefresh"),
    setEnableProgressiveVoxel: makeSetter("enableProgressiveVoxel"),
    setMaxWorkerThreads: makeSetter("maxWorkerThreads"),
    setGpuPowerPreference: makeSetter("gpuPowerPreference"),
    setPreferredGpuId: makeSetter("preferredGpuId"),
    setRendererPixelRatio: makeSetter("rendererPixelRatio"),
    setEnableShadows: makeSetter("enableShadows"),
    setShadowMapSize: makeSetter("shadowMapSize"),
    setSsaoSamples: makeSetter("ssaoSamples"),
    setMaxHistoryEntries: makeSetter("maxHistoryEntries"),
    setMaxPersistedHistory: makeSetter("maxPersistedHistory"),
    setDefaultPreviewRes: makeSetter("defaultPreviewRes"),
    setDefaultVoxelRes: makeSetter("defaultVoxelRes"),
    setDefaultVoxelYSlices: makeSetter("defaultVoxelYSlices"),

    resetAll: () => {
      set({ ...DEFAULTS });
      persistConfig({ ...DEFAULTS });
    },
  };
});
