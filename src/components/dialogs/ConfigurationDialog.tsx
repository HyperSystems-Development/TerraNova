import { useState, useEffect } from "react";
import { useConfigStore, type GpuPowerPreference } from "@/stores/configStore";
import { detectHardware, type HardwareInfo } from "@/utils/hardwareDetect";

export type SystemTab = "cpu" | "gpu" | "ram" | "defaults";

const TABS: { id: SystemTab; label: string }[] = [
  { id: "cpu", label: "CPU" },
  { id: "gpu", label: "GPU" },
  { id: "ram", label: "RAM" },
  { id: "defaults", label: "Defaults" },
];

// ── Option arrays ──

const PREVIEW_RES_OPTIONS = [64, 128, 256, 512];
const VOXEL_RES_OPTIONS = [16, 32, 64, 128];
const VOXEL_Y_SLICES_OPTIONS = [8, 16, 32, 64];
const PIXEL_RATIO_OPTIONS = [
  { value: 0, label: "Device Native" },
  { value: 0.5, label: "0.5x" },
  { value: 0.75, label: "0.75x" },
  { value: 1, label: "1x" },
  { value: 1.5, label: "1.5x" },
  { value: 2, label: "2x" },
];
const SHADOW_MAP_OPTIONS = [
  { value: 512, label: "512 (Low)" },
  { value: 1024, label: "1024 (Medium)" },
  { value: 2048, label: "2048 (High)" },
  { value: 4096, label: "4096 (Ultra)" },
];
const SSAO_SAMPLES_OPTIONS = [
  { value: 4, label: "4 (Low)" },
  { value: 8, label: "8 (Medium)" },
  { value: 16, label: "16 (High)" },
  { value: 32, label: "32 (Ultra)" },
];
const GPU_POWER_OPTIONS: { value: GpuPowerPreference; label: string }[] = [
  { value: "high-performance", label: "High Performance" },
  { value: "default", label: "Balanced" },
  { value: "low-power", label: "Power Saver" },
];

interface ConfigurationDialogProps {
  open: boolean;
  onClose: () => void;
}

// ── Format helpers ──

function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

// ── Shared controls ──

function HardwareInfoBar({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 rounded border border-tn-border bg-tn-bg text-xs text-tn-text-muted">
      {items.map((item) => (
        <span key={item.label}>
          <span className="text-tn-text-muted/60">{item.label}:</span>{" "}
          <span className="text-tn-text">{item.value}</span>
        </span>
      ))}
    </div>
  );
}

function BudgetSlider({
  label,
  description,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 px-3 py-3 rounded border border-tn-accent/30 bg-tn-accent/5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold">{label}</label>
        <span className="text-sm font-semibold text-tn-accent tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-tn-accent"
      />
      <p className="text-xs text-tn-text-muted">{description}</p>
    </div>
  );
}

function SliderControl({
  label,
  description,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-sm text-tn-text-muted tabular-nums">
          {value}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-tn-accent"
      />
      <p className="text-xs text-tn-text-muted">{description}</p>
    </div>
  );
}

function ToggleControl({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <button
          onClick={() => onChange(!value)}
          className={`px-3 py-1 text-xs rounded border ${
            value
              ? "border-tn-accent bg-tn-accent/10 text-tn-accent"
              : "border-tn-border bg-tn-bg text-tn-text-muted hover:bg-tn-surface"
          }`}
        >
          {value ? "On" : "Off"}
        </button>
      </div>
      <p className="text-xs text-tn-text-muted">{description}</p>
    </div>
  );
}

function SelectControl<T extends string | number>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <select
          value={String(value)}
          onChange={(e) => {
            const parsed = options.find((o) => String(o.value) === e.target.value);
            if (parsed) onChange(parsed.value);
          }}
          className="px-2 py-1 text-sm rounded border border-tn-border bg-tn-bg text-tn-text hover:bg-tn-surface"
        >
          {options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-tn-text-muted">{description}</p>
    </div>
  );
}

function AdvancedSection({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-tn-text-muted hover:text-tn-text self-start"
      >
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>&#9654;</span>
        Advanced
      </button>
      {open && <div className="flex flex-col gap-4 pl-2 border-l-2 border-tn-border">{children}</div>}
    </div>
  );
}

// ── Tab contents ──

function CpuTab({ hw }: { hw: HardwareInfo | null }) {
  const cpuCoresAllocated = useConfigStore((s) => s.cpuCoresAllocated);
  const applyCpuBudget = useConfigStore((s) => s.applyCpuBudget);
  const debounceMs = useConfigStore((s) => s.debounceMs);
  const setDebounceMs = useConfigStore((s) => s.setDebounceMs);
  const autoRefresh = useConfigStore((s) => s.autoRefresh);
  const setAutoRefresh = useConfigStore((s) => s.setAutoRefresh);
  const enableProgressiveVoxel = useConfigStore((s) => s.enableProgressiveVoxel);
  const setEnableProgressiveVoxel = useConfigStore((s) => s.setEnableProgressiveVoxel);
  const maxWorkerThreads = useConfigStore((s) => s.maxWorkerThreads);
  const setMaxWorkerThreads = useConfigStore((s) => s.setMaxWorkerThreads);

  const maxCores = hw?.cpuCores ?? navigator.hardwareConcurrency ?? 8;

  return (
    <div className="flex flex-col gap-4">
      <HardwareInfoBar
        items={[
          { label: "Processor", value: hw?.cpuName || "Detecting..." },
          { label: "Cores", value: `${hw?.cpuCores ?? "..."}` },
        ]}
      />
      <BudgetSlider
        label="CPU Cores Allocated"
        description="Number of CPU cores TerraNova can use. Adjusting this automatically configures worker threads, debounce, and evaluation settings."
        value={cpuCoresAllocated}
        min={1}
        max={maxCores}
        step={1}
        format={(v) => `${v} / ${maxCores} cores`}
        onChange={applyCpuBudget}
      />
      <AdvancedSection>
        <SliderControl
          label="Max Worker Threads"
          description="Maximum Web Worker threads for parallel evaluation."
          value={maxWorkerThreads}
          min={1}
          max={4}
          onChange={setMaxWorkerThreads}
        />
        <SliderControl
          label="Evaluation Debounce"
          description="Delay before auto-evaluating previews after a change."
          value={debounceMs}
          min={100}
          max={2000}
          step={50}
          suffix="ms"
          onChange={setDebounceMs}
        />
        <ToggleControl
          label="Auto-refresh Previews"
          description="Automatically re-evaluate previews when the graph changes."
          value={autoRefresh}
          onChange={setAutoRefresh}
        />
        <ToggleControl
          label="Progressive Voxel Refinement"
          description="Render at low resolution first, then refine. Disabling skips to final quality."
          value={enableProgressiveVoxel}
          onChange={setEnableProgressiveVoxel}
        />
      </AdvancedSection>
    </div>
  );
}

function GpuTab({ hw }: { hw: HardwareInfo | null }) {
  const gpuMemoryBudgetMb = useConfigStore((s) => s.gpuMemoryBudgetMb);
  const applyGpuBudget = useConfigStore((s) => s.applyGpuBudget);
  const gpuPowerPreference = useConfigStore((s) => s.gpuPowerPreference);
  const setGpuPowerPreference = useConfigStore((s) => s.setGpuPowerPreference);
  const rendererPixelRatio = useConfigStore((s) => s.rendererPixelRatio);
  const setRendererPixelRatio = useConfigStore((s) => s.setRendererPixelRatio);
  const enableShadows = useConfigStore((s) => s.enableShadows);
  const setEnableShadows = useConfigStore((s) => s.setEnableShadows);
  const shadowMapSize = useConfigStore((s) => s.shadowMapSize);
  const setShadowMapSize = useConfigStore((s) => s.setShadowMapSize);
  const ssaoSamples = useConfigStore((s) => s.ssaoSamples);
  const setSsaoSamples = useConfigStore((s) => s.setSsaoSamples);

  const estimatedVram = hw?.estimatedVramMb ?? 4096;

  return (
    <div className="flex flex-col gap-4">
      <HardwareInfoBar
        items={[
          { label: "GPU", value: hw?.gpuRenderer || "Detecting..." },
          { label: hw?.vramDetected ? "VRAM" : "Est. VRAM", value: formatMb(estimatedVram) },
        ]}
      />
      <BudgetSlider
        label="GPU Memory Budget"
        description="Maximum GPU memory TerraNova should use. Adjusting this automatically configures shadow quality, SSAO, rendering resolution, and power mode."
        value={gpuMemoryBudgetMb}
        min={256}
        max={Math.max(estimatedVram, 8192)}
        step={256}
        format={formatMb}
        onChange={applyGpuBudget}
      />
      <AdvancedSection>
        <SelectControl
          label="GPU Power Preference"
          description="Hint to the browser which GPU to prefer. Requires app restart."
          value={gpuPowerPreference}
          options={GPU_POWER_OPTIONS}
          onChange={setGpuPowerPreference}
        />
        <SelectControl
          label="Renderer Pixel Ratio"
          description="3D rendering resolution multiplier."
          value={rendererPixelRatio}
          options={PIXEL_RATIO_OPTIONS}
          onChange={setRendererPixelRatio}
        />
        <ToggleControl
          label="Shadows"
          description="Real-time shadows in 3D views."
          value={enableShadows}
          onChange={setEnableShadows}
        />
        <SelectControl
          label="Shadow Map Resolution"
          description="Shadow texture resolution."
          value={shadowMapSize}
          options={SHADOW_MAP_OPTIONS}
          onChange={setShadowMapSize}
        />
        <SelectControl
          label="SSAO Quality"
          description="Screen-Space Ambient Occlusion sample count."
          value={ssaoSamples}
          options={SSAO_SAMPLES_OPTIONS}
          onChange={setSsaoSamples}
        />
      </AdvancedSection>
    </div>
  );
}

function RamTab({ hw }: { hw: HardwareInfo | null }) {
  const ramBudgetMb = useConfigStore((s) => s.ramBudgetMb);
  const applyRamBudget = useConfigStore((s) => s.applyRamBudget);
  const maxHistoryEntries = useConfigStore((s) => s.maxHistoryEntries);
  const setMaxHistoryEntries = useConfigStore((s) => s.setMaxHistoryEntries);
  const maxPersistedHistory = useConfigStore((s) => s.maxPersistedHistory);
  const setMaxPersistedHistory = useConfigStore((s) => s.setMaxPersistedHistory);

  const totalRam = hw?.totalRamMb ?? 8192;
  // Allow allocating up to 75% of system RAM
  const maxBudget = Math.round(totalRam * 0.75);

  return (
    <div className="flex flex-col gap-4">
      <HardwareInfoBar
        items={[
          { label: "System RAM", value: formatMb(totalRam) },
        ]}
      />
      <BudgetSlider
        label="RAM Budget"
        description="Maximum RAM TerraNova should use for caches, history, and evaluation buffers. Adjusting this automatically configures undo history depth and default preview resolutions."
        value={ramBudgetMb}
        min={128}
        max={maxBudget}
        step={128}
        format={formatMb}
        onChange={applyRamBudget}
      />
      <AdvancedSection>
        <SliderControl
          label="Max Undo History"
          description="Undo states kept in memory."
          value={maxHistoryEntries}
          min={10}
          max={100}
          onChange={setMaxHistoryEntries}
        />
        <SliderControl
          label="Max Persisted History"
          description="Undo states saved to disk."
          value={maxPersistedHistory}
          min={5}
          max={50}
          onChange={setMaxPersistedHistory}
        />
      </AdvancedSection>
    </div>
  );
}

function DefaultsTab() {
  const defaultPreviewRes = useConfigStore((s) => s.defaultPreviewRes);
  const setDefaultPreviewRes = useConfigStore((s) => s.setDefaultPreviewRes);
  const defaultVoxelRes = useConfigStore((s) => s.defaultVoxelRes);
  const setDefaultVoxelRes = useConfigStore((s) => s.setDefaultVoxelRes);
  const defaultVoxelYSlices = useConfigStore((s) => s.defaultVoxelYSlices);
  const setDefaultVoxelYSlices = useConfigStore((s) => s.setDefaultVoxelYSlices);

  return (
    <div className="flex flex-col gap-5">
      <SelectControl
        label="Default 2D Resolution"
        description="Default resolution for 2D density previews. Higher values are sharper but use more CPU."
        value={defaultPreviewRes}
        options={PREVIEW_RES_OPTIONS.map((v) => ({ value: v, label: `${v}` }))}
        onChange={setDefaultPreviewRes}
      />
      <SelectControl
        label="Default Voxel Resolution"
        description="Default XZ resolution for voxel previews."
        value={defaultVoxelRes}
        options={VOXEL_RES_OPTIONS.map((v) => ({ value: v, label: `${v}` }))}
        onChange={setDefaultVoxelRes}
      />
      <SelectControl
        label="Default Voxel Y Slices"
        description="Default number of vertical slices for voxel previews."
        value={defaultVoxelYSlices}
        options={VOXEL_Y_SLICES_OPTIONS.map((v) => ({ value: v, label: `${v}` }))}
        onChange={setDefaultVoxelYSlices}
      />
    </div>
  );
}

// ── Main dialog ──

export function SystemSettingsPanel({ initialTab = "cpu" }: { initialTab?: SystemTab }) {
  const [activeTab, setActiveTab] = useState<SystemTab>(initialTab);
  const resetAll = useConfigStore((s) => s.resetAll);
  const [hw, setHw] = useState<HardwareInfo | null>(null);

  useEffect(() => {
    if (!hw) {
      detectHardware().then(setHw);
    }
  }, [hw]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-tn-text">System & Performance</h3>
          <p className="mt-1 text-xs text-tn-text-muted">Tune CPU, GPU, memory, and preview defaults from one place.</p>
        </div>
        <button
          onClick={resetAll}
          className="px-3 py-1.5 text-sm rounded border border-tn-border hover:bg-tn-surface text-tn-text-muted"
        >
          Reset to Defaults
        </button>
      </div>

      <div className="flex shrink-0 border-b border-tn-border overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm -mb-px whitespace-nowrap ${
              activeTab === tab.id
                ? "border-b-2 border-tn-accent text-tn-text font-medium"
                : "text-tn-text-muted hover:text-tn-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 overflow-y-auto pr-1">
        {activeTab === "cpu" && <CpuTab hw={hw} />}
        {activeTab === "gpu" && <GpuTab hw={hw} />}
        {activeTab === "ram" && <RamTab hw={hw} />}
        {activeTab === "defaults" && <DefaultsTab />}
      </div>
    </div>
  );
}

export function ConfigurationDialog({ open, onClose }: ConfigurationDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-tn-panel border border-tn-border rounded-lg shadow-xl w-[580px] flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-0 shrink-0">
          <h2 className="text-base font-semibold mb-3">Configuration</h2>
        </div>

        <div className="px-5 py-5 min-h-[200px] overflow-y-auto">
          <SystemSettingsPanel />
        </div>

        <div className="flex justify-between items-center px-5 py-3 border-t border-tn-border shrink-0">
          <div />
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded border border-tn-border hover:bg-tn-surface"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
