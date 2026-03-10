import { useState, useEffect } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { usePreviewStore } from "@/stores/previewStore";
import { writeTextFile } from "@/utils/ipc";
import { ColorPickerField } from "./ColorPickerField";
import { SliderField } from "./SliderField";

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mt-3 mb-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">
        {label}
      </span>
      <div className="flex-1 h-px bg-tn-border" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weather presets — matched to actual Hytale zone weather JSON keyframes
// ---------------------------------------------------------------------------

const HYTALE_ASSETS_BASE =
  "C:\\Users\\wolft\\AppData\\Roaming\\Hytale\\install\\pre-release\\package\\game\\latest\\Assets";

interface WeatherPresetDef {
  label: string;
  zone: string;         // "z1" | "z2" | "z3" | "z4"
  parentEnv: string;   // e.g. "Env_Zone1"
  zoneFolder: string;  // subfolder name under Server/Environments/
  skyHorizon: string;
  skyZenith: string;
  fogColor: string;
  fogDensity: number;
  sunColor: string;
  ambientColor: string;
}

const WEATHER_PRESET_DEFS: WeatherPresetDef[] = [
  {
    label: "Zone1 Sunny",    zone: "z1", parentEnv: "Env_Zone1", zoneFolder: "Zone1",
    skyHorizon: "#8fd8f8", skyZenith: "#077ddd", fogColor: "#8fd8f8",
    fogDensity: 0.004, sunColor: "#ffffff", ambientColor: "#6080a0",
  },
  {
    label: "Zone1 Storm",    zone: "z1", parentEnv: "Env_Zone1", zoneFolder: "Zone1",
    skyHorizon: "#9e9e9e", skyZenith: "#99a1a1", fogColor: "#9e9e9e",
    fogDensity: 0.012, sunColor: "#c0c8d0", ambientColor: "#707880",
  },
  {
    label: "Zone1 Foggy",    zone: "z1", parentEnv: "Env_Zone1", zoneFolder: "Zone1",
    skyHorizon: "#b0c8d8", skyZenith: "#7090a8", fogColor: "#a8c0d0",
    fogDensity: 0.022, sunColor: "#d8e8f0", ambientColor: "#7898a8",
  },
  {
    label: "Zone2 Desert",   zone: "z2", parentEnv: "Env_Zone2", zoneFolder: "Zone2",
    skyHorizon: "#cab896", skyZenith: "#6fa6d0", fogColor: "#cab896",
    fogDensity: 0.005, sunColor: "#ffffff", ambientColor: "#a09070",
  },
  {
    label: "Zone2 Sunny",    zone: "z2", parentEnv: "Env_Zone2", zoneFolder: "Zone2",
    skyHorizon: "#b1f3fe", skyZenith: "#0081b2", fogColor: "#b1f3fe",
    fogDensity: 0.003, sunColor: "#fff8e0", ambientColor: "#60a0b0",
  },
  {
    label: "Zone3 Snow",     zone: "z3", parentEnv: "Env_Zone3", zoneFolder: "Zone3",
    skyHorizon: "#cad8f4", skyZenith: "#c7c9cd", fogColor: "#cad8f4",
    fogDensity: 0.008, sunColor: "#e8f0f8", ambientColor: "#8898b8",
  },
  {
    label: "Zone3 Aurora",   zone: "z3", parentEnv: "Env_Zone3", zoneFolder: "Zone3",
    skyHorizon: "#b2cdff", skyZenith: "#699bd4", fogColor: "#b2cdff",
    fogDensity: 0.006, sunColor: "#c8d8ff", ambientColor: "#6080c0",
  },
  {
    label: "Zone4 Ash",      zone: "z4", parentEnv: "Env_Zone4", zoneFolder: "Zone4",
    skyHorizon: "#c8c7b3", skyZenith: "#bfc8c4", fogColor: "#c8c7b3",
    fogDensity: 0.009, sunColor: "#fefff7", ambientColor: "#909088",
  },
  {
    label: "Zone4 Lava",     zone: "z4", parentEnv: "Env_Zone4", zoneFolder: "Zone4",
    skyHorizon: "#8b4020", skyZenith: "#3a1808", fogColor: "#7a3010",
    fogDensity: 0.014, sunColor: "#ff8040", ambientColor: "#804028",
  },
];

const WEATHER_PRESET_LABELS = WEATHER_PRESET_DEFS.map((p) => p.label) as [string, ...string[]];
type WeatherPreset = (typeof WEATHER_PRESET_LABELS)[number];

function WeatherSelector({
  value,
  onChange,
}: {
  value: WeatherPreset;
  onChange: (v: WeatherPreset) => void;
}) {
  const grouped: Record<string, WeatherPresetDef[]> = {};
  for (const p of WEATHER_PRESET_DEFS) {
    (grouped[p.zone] ??= []).push(p);
  }
  const zoneLabels: Record<string, string> = { z1: "Zone 1", z2: "Zone 2", z3: "Zone 3", z4: "Zone 4" };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-tn-text-muted">Preset</span>
      {Object.entries(grouped).map(([zone, presets]) => (
        <div key={zone} className="flex flex-col gap-1">
          <span className="text-[10px] text-tn-text-muted/60 font-medium">{zoneLabels[zone]}</span>
          <div className="flex flex-wrap gap-1">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => onChange(p.label)}
                className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                  value === p.label
                    ? "bg-tn-accent/20 border-tn-accent text-tn-accent"
                    : "border-tn-border text-tn-text-muted hover:border-white/20 hover:text-tn-text"
                }`}
              >
                {p.label.replace(/^Zone\d+ /, "")}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audio layer row
// ---------------------------------------------------------------------------

function AudioRow({
  label,
  volume,
  onVolumeChange,
}: {
  label: string;
  volume: number;
  onVolumeChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-tn-text w-16 shrink-0">{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-tn-accent"
      />
      <span className="text-[10px] text-tn-text-muted w-8 text-right tabular-nums">
        {Math.round(volume * 100)}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AtmosphereTab
// ---------------------------------------------------------------------------

interface AtmosphereState {
  skyHorizon: string;
  skyZenith: string;
  cloudDensity: number;
  fogColor: string;
  fogDensity: number;
  ambientColor: string;
  sunColor: string;
  weather: WeatherPreset;
  audioWind: number;
  audioWater: number;
  audioInsects: number;
  audioStorm: number;
}

const DEFAULT_ATMOSPHERE: AtmosphereState = {
  skyHorizon: "#4A90C4",
  skyZenith: "#1B3A6B",
  cloudDensity: 0.3,
  fogColor: "#c0d8f0",
  fogDensity: 0.008,
  ambientColor: "#3a3a4a",
  sunColor: "#fff8e0",
  weather: "Zone1 Sunny",
  audioWind: 0.6,
  audioWater: 0.0,
  audioInsects: 0.4,
  audioStorm: 0.0,
};

const STORAGE_KEY = "terranova-atmosphere";

function loadAtmosphere(): AtmosphereState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_ATMOSPHERE, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_ATMOSPHERE;
}

function saveAtmosphere(state: AtmosphereState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const VISUAL_KEYS: (keyof AtmosphereState)[] = [
  "skyHorizon", "skyZenith", "cloudDensity", "fogColor", "fogDensity", "ambientColor", "sunColor",
];

export function AtmosphereTab({
  onBlur,
  onBiomeTintChange,
}: {
  onBlur: () => void;
  onBiomeTintChange: (field: string, value: string) => void;
}) {
  const biomeConfig = useEditorStore((s) => s.biomeConfig);
  const setAtmosphereSettings = usePreviewStore((s) => s.setAtmosphereSettings);
  const storeAtm = usePreviewStore((s) => s.atmosphereSettings);
  const setTintColors = usePreviewStore((s) => s.setTintColors);

  const [atm, setAtm] = useState<AtmosphereState>(() => ({
    ...loadAtmosphere(),
    skyHorizon: storeAtm.skyHorizon,
    skyZenith: storeAtm.skyZenith,
    cloudDensity: storeAtm.cloudDensity,
    fogColor: storeAtm.fogColor,
    fogDensity: storeAtm.fogDensity,
    ambientColor: storeAtm.ambientColor,
    sunColor: storeAtm.sunColor,
  }));

  function update<K extends keyof AtmosphereState>(key: K, value: AtmosphereState[K]) {
    const next = { ...atm, [key]: value };
    setAtm(next);
    saveAtmosphere(next);
    if ((VISUAL_KEYS as string[]).includes(key)) {
      setAtmosphereSettings({
        skyHorizon: next.skyHorizon,
        skyZenith: next.skyZenith,
        cloudDensity: next.cloudDensity,
        fogColor: next.fogColor,
        fogDensity: next.fogDensity,
        ambientColor: next.ambientColor,
        sunColor: next.sunColor,
      });
    }
  }

  function applyPreset(label: WeatherPreset) {
    const def = WEATHER_PRESET_DEFS.find((p) => p.label === label);
    if (!def) return;
    const next: AtmosphereState = {
      ...atm,
      weather: label,
      skyHorizon: def.skyHorizon,
      skyZenith: def.skyZenith,
      fogColor: def.fogColor,
      fogDensity: def.fogDensity,
      sunColor: def.sunColor,
      ambientColor: def.ambientColor,
    };
    setAtm(next);
    saveAtmosphere(next);
    setAtmosphereSettings({
      skyHorizon: next.skyHorizon,
      skyZenith: next.skyZenith,
      cloudDensity: next.cloudDensity,
      fogColor: next.fogColor,
      fogDensity: next.fogDensity,
      ambientColor: next.ambientColor,
      sunColor: next.sunColor,
    });
  }

  // ── Environment export ──────────────────────────────────────────
  const [exportName, setExportName] = useState("");
  const [exportStatus, setExportStatus] = useState<"idle" | "ok" | "err">("idle");
  const [exportMsg, setExportMsg] = useState("");

  async function handleExport() {
    const name = exportName.trim().replace(/[^a-zA-Z0-9_]/g, "_");
    if (!name) return;

    const preset = WEATHER_PRESET_DEFS.find((p) => p.label === atm.weather)
      ?? WEATHER_PRESET_DEFS[0];

    // Zone tag is derived from zone folder, e.g. "Zone1" → { Zone1: [name] }
    const zoneKey = preset.zoneFolder; // "Zone1" | "Zone2" | ...
    const tagLabel = name.replace(/^.*_/, ""); // last segment as tag

    const envDoc = {
      Parent: preset.parentEnv,
      Tags: { [zoneKey]: [tagLabel] },
    };

    const filePath = `${HYTALE_ASSETS_BASE}\\Server\\Environments\\${preset.zoneFolder}\\Env_${name}.json`;

    try {
      await writeTextFile(filePath, JSON.stringify(envDoc, null, 2));
      setExportStatus("ok");
      setExportMsg(`Saved → ...\\${preset.zoneFolder}\\Env_${name}.json`);
    } catch (e) {
      setExportStatus("err");
      setExportMsg(String(e));
    }
    setTimeout(() => setExportStatus("idle"), 4000);
  }

  const tint = biomeConfig?.TintProvider as Record<string, unknown> | undefined;
  const tintFrom = typeof tint?.From === "string" ? tint.From : "#5b9e28";
  const tintTo = typeof tint?.To === "string" ? tint.To : "#7ea629";

  // Sync tint to previewStore whenever biomeConfig changes
  useEffect(() => {
    setTintColors({ from: tintFrom, to: tintTo });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tintFrom, tintTo]);

  function handleTintChange(field: "From" | "To", value: string) {
    onBiomeTintChange(field, value);
    setTintColors({
      from: field === "From" ? value : tintFrom,
      to: field === "To" ? value : tintTo,
    });
  }

  return (
    <div className="flex flex-col p-3 gap-1.5" onBlur={onBlur}>

      {/* SKY */}
      <SectionHeader label="Sky" />
      <ColorPickerField
        label="Horizon Color"
        value={atm.skyHorizon}
        onChange={(v) => update("skyHorizon", v)}
      />
      <ColorPickerField
        label="Zenith Color"
        value={atm.skyZenith}
        onChange={(v) => update("skyZenith", v)}
      />
      <SliderField
        label="Cloud Density"
        value={atm.cloudDensity}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => update("cloudDensity", v)}
        onBlur={() => {}}
      />

      {/* FOG */}
      <SectionHeader label="Fog" />
      <ColorPickerField
        label="Fog Color"
        value={atm.fogColor}
        onChange={(v) => update("fogColor", v)}
      />
      <SliderField
        label="Density"
        value={atm.fogDensity}
        min={0}
        max={0.05}
        step={0.001}
        onChange={(v) => update("fogDensity", v)}
        onBlur={() => {}}
      />

      {/* LIGHTING */}
      <SectionHeader label="Lighting" />
      <ColorPickerField
        label="Ambient Color"
        value={atm.ambientColor}
        onChange={(v) => update("ambientColor", v)}
      />
      <ColorPickerField
        label="Sun Color"
        value={atm.sunColor}
        onChange={(v) => update("sunColor", v)}
      />

      {/* WEATHER */}
      <SectionHeader label="Weather" />
      <WeatherSelector
        value={atm.weather}
        onChange={applyPreset}
      />

      {/* TINT */}
      <SectionHeader label="Tint" />
      <div
        className="h-7 w-full rounded border border-tn-border"
        style={{ background: `linear-gradient(to right, ${tintFrom}, ${tintTo})` }}
      />
      <div className="grid grid-cols-2 gap-2">
        <ColorPickerField
          label="From"
          value={tintFrom}
          onChange={(v) => handleTintChange("From", v)}
        />
        <ColorPickerField
          label="To"
          value={tintTo}
          onChange={(v) => handleTintChange("To", v)}
        />
      </div>

      {/* AUDIO */}
      <SectionHeader label="Ambient Audio" />
      <div className="flex flex-col gap-2">
        <AudioRow label="Wind" volume={atm.audioWind} onVolumeChange={(v) => update("audioWind", v)} />
        <AudioRow label="Water" volume={atm.audioWater} onVolumeChange={(v) => update("audioWater", v)} />
        <AudioRow label="Insects" volume={atm.audioInsects} onVolumeChange={(v) => update("audioInsects", v)} />
        <AudioRow label="Storm" volume={atm.audioStorm} onVolumeChange={(v) => update("audioStorm", v)} />
      </div>

      {/* EXPORT */}
      <SectionHeader label="Export Environment" />
      <div className="flex flex-col gap-2">
        {/* Zone destination derived from active preset */}
        {(() => {
          const preset = WEATHER_PRESET_DEFS.find((p) => p.label === atm.weather) ?? WEATHER_PRESET_DEFS[0];
          return (
            <div className="text-[10px] text-tn-text-muted font-mono bg-tn-bg rounded px-2 py-1 border border-tn-border truncate">
              → Server/Environments/<span className="text-tn-accent">{preset.zoneFolder}</span>/Env_<span className="text-tn-text">{exportName || "…"}</span>.json
            </div>
          );
        })()}
        <div className="flex gap-1.5">
          <input
            type="text"
            placeholder="Environment name"
            value={exportName}
            onChange={(e) => { setExportName(e.target.value); setExportStatus("idle"); }}
            className="flex-1 text-[11px] bg-tn-bg border border-tn-border rounded px-2 py-1 text-tn-text placeholder:text-tn-text-muted/50 focus:border-tn-accent outline-none"
          />
          <button
            onClick={handleExport}
            disabled={!exportName.trim()}
            className="px-2.5 py-1 text-[10px] font-medium rounded border border-tn-accent text-tn-accent bg-tn-accent/10 hover:bg-tn-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            Save
          </button>
        </div>
        {exportStatus !== "idle" && (
          <p className={`text-[10px] font-mono truncate ${exportStatus === "ok" ? "text-[#7DB350]" : "text-red-400"}`}>
            {exportStatus === "ok" ? "✓ " : "✗ "}{exportMsg}
          </p>
        )}
        <p className="text-[10px] text-tn-text-muted/60 leading-tight">
          Writes a sub-environment JSON with the active zone as parent. Hytale will inherit its weather and water tint from the zone root.
        </p>
      </div>

    </div>
  );
}
