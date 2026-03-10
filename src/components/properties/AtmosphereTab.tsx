import { useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { usePreviewStore } from "@/stores/previewStore";
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
// Weather preset selector
// ---------------------------------------------------------------------------

const WEATHER_PRESETS = ["Clear", "Overcast", "Storm", "Dust Storm", "Fog"] as const;
type WeatherPreset = (typeof WEATHER_PRESETS)[number];

function WeatherSelector({
  value,
  onChange,
}: {
  value: WeatherPreset;
  onChange: (v: WeatherPreset) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-tn-text-muted">Active Preset</span>
      <div className="flex flex-wrap gap-1">
        {WEATHER_PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
              value === p
                ? "bg-tn-accent/20 border-tn-accent text-tn-accent"
                : "border-tn-border text-tn-text-muted hover:border-white/20 hover:text-tn-text"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
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
  weather: "Clear",
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

  const tint = biomeConfig?.TintProvider as Record<string, unknown> | undefined;
  const tintFrom = typeof tint?.From === "string" ? tint.From : "#4d7a40";
  const tintTo = typeof tint?.To === "string" ? tint.To : "#c8b87e";

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
        onChange={(v) => update("weather", v)}
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
          onChange={(v) => onBiomeTintChange("From", v)}
        />
        <ColorPickerField
          label="To"
          value={tintTo}
          onChange={(v) => onBiomeTintChange("To", v)}
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

    </div>
  );
}
