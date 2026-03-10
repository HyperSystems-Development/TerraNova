import { useState, useEffect, type ReactNode } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";
import { usePreviewStore } from "@/stores/previewStore";
import { writeTextFile } from "@/utils/ipc";
import { jsonToGraph } from "@/utils/jsonToGraph";
import { ColorPickerField } from "./ColorPickerField";
import { SliderField } from "./SliderField";

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">
        {label}
      </span>
      <div className="flex-1 h-px bg-tn-border" />
    </div>
  );
}

function SectionCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-tn-border/80 bg-tn-bg/40 p-2.5 flex flex-col gap-2">
      <SectionHeader label={label} />
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Weather presets â€” matched to actual Hytale zone weather JSON keyframes
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
  sunsetColor: string;
  sunGlowColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  sunColor: string;
  ambientColor: string;
  waterTint: string;
}

const WEATHER_PRESET_DEFS: WeatherPresetDef[] = [
  {
    label: "Zone1 Sunny",    zone: "z1", parentEnv: "Env_Zone1", zoneFolder: "Zone1",
    skyHorizon: "#8fd8f8", skyZenith: "#077ddd", fogColor: "#8fd8f8",
    sunsetColor: "#ffb951", sunGlowColor: "#ffffff",
    fogNear: -96, fogFar: 1024, sunColor: "#ffffff", ambientColor: "#6080a0", waterTint: "#1983d9",
  },
  {
    label: "Zone1 Storm",    zone: "z1", parentEnv: "Env_Zone1", zoneFolder: "Zone1",
    skyHorizon: "#9e9e9e", skyZenith: "#99a1a1", fogColor: "#9e9e9e",
    sunsetColor: "#e03569", sunGlowColor: "#808080",
    fogNear: -96, fogFar: 1024, sunColor: "#c0c8d0", ambientColor: "#707880", waterTint: "#1983d9",
  },
  {
    label: "Zone1 Foggy",    zone: "z1", parentEnv: "Env_Zone1", zoneFolder: "Zone1",
    skyHorizon: "#c4d8fc", skyZenith: "#699bd4", fogColor: "#c4d8fc",
    sunsetColor: "#a7cbe1", sunGlowColor: "#a0c0d0",
    fogNear: -448, fogFar: 256, sunColor: "#d8e8f0", ambientColor: "#7898a8", waterTint: "#1983d9",
  },
  {
    label: "Zone2 Desert",   zone: "z2", parentEnv: "Env_Zone2", zoneFolder: "Zone2",
    skyHorizon: "#cab896", skyZenith: "#6fa6d0", fogColor: "#cab896",
    sunsetColor: "#e8cca3", sunGlowColor: "#ffe0a0",
    fogNear: 0, fogFar: 1024, sunColor: "#ffffff", ambientColor: "#a09070", waterTint: "#2bb0b0",
  },
  {
    label: "Zone2 Sunny",    zone: "z2", parentEnv: "Env_Zone2", zoneFolder: "Zone2",
    skyHorizon: "#b1f3fe", skyZenith: "#0081b2", fogColor: "#b1f3fe",
    sunsetColor: "#ffffff", sunGlowColor: "#ffe8b0",
    fogNear: -96, fogFar: 1024, sunColor: "#fff8e0", ambientColor: "#60a0b0", waterTint: "#1496c8",
  },
  {
    label: "Zone2 SandStorm", zone: "z2", parentEnv: "Env_Zone2", zoneFolder: "Zone2",
    skyHorizon: "#b9976e", skyZenith: "#f4d597", fogColor: "#b9976e",
    sunsetColor: "#d4bf62", sunGlowColor: "#e0c060",
    fogNear: -96, fogFar: 400, sunColor: "#d5d0c0", ambientColor: "#a09070", waterTint: "#2bb0b0",
  },
  {
    label: "Zone3 Snow",     zone: "z3", parentEnv: "Env_Zone3", zoneFolder: "Zone3",
    skyHorizon: "#cad8f4", skyZenith: "#c7c9cd", fogColor: "#cad8f4",
    sunsetColor: "#a7cbe1", sunGlowColor: "#d0e0f0",
    fogNear: -96, fogFar: 1024, sunColor: "#e8f0f8", ambientColor: "#8898b8", waterTint: "#4080c0",
  },
  {
    label: "Zone3 NorthLights", zone: "z3", parentEnv: "Env_Zone3", zoneFolder: "Zone3",
    skyHorizon: "#b2cdff", skyZenith: "#699bd4", fogColor: "#b2cdff",
    sunsetColor: "#a7cbe1", sunGlowColor: "#a0c8ff",
    fogNear: -96, fogFar: 1024, sunColor: "#c8d8ff", ambientColor: "#6080c0", waterTint: "#4080c0",
  },
  {
    label: "Zone4 Ash",      zone: "z4", parentEnv: "Env_Zone4", zoneFolder: "Zone4",
    skyHorizon: "#c8c7b3", skyZenith: "#bfc8c4", fogColor: "#c8c7b3",
    sunsetColor: "#e45252", sunGlowColor: "#f0f0e8",
    fogNear: -96, fogFar: 1024, sunColor: "#fefff7", ambientColor: "#909088", waterTint: "#806050",
  },
  {
    label: "Zone4 Lava",     zone: "z4", parentEnv: "Env_Zone4", zoneFolder: "Zone4",
    skyHorizon: "#4e2f2f", skyZenith: "#cd875c", fogColor: "#4e2f2f",
    sunsetColor: "#4a493c", sunGlowColor: "#ff8040",
    fogNear: -96, fogFar: 800, sunColor: "#ffca55", ambientColor: "#804028", waterTint: "#ff4010",
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
      <span className="text-[11px] text-tn-text-muted">Preset</span>
      {Object.entries(grouped).map(([zone, presets]) => (
        <div key={zone} className="flex flex-col gap-1">
          <span className="text-[10px] text-tn-text-muted/70 font-medium">{zoneLabels[zone]}</span>
          <div className="flex flex-wrap gap-1">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => onChange(p.label)}
                className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                  value === p.label
                    ? "bg-tn-accent/20 border-tn-accent text-tn-accent"
                    : "border-tn-border/80 bg-tn-panel/40 text-tn-text-muted hover:border-white/20 hover:text-tn-text"
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
  sunsetColor: string;
  sunGlowColor: string;
  cloudDensity: number;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  ambientColor: string;
  sunColor: string;
  waterTint: string;
  weather: WeatherPreset;
  audioWind: number;
  audioWater: number;
  audioInsects: number;
  audioStorm: number;
}

const DEFAULT_ATMOSPHERE: AtmosphereState = {
  skyHorizon: "#8fd8f8",
  skyZenith: "#077ddd",
  sunsetColor: "#ffb951",
  sunGlowColor: "#ffffff",
  cloudDensity: 0.3,
  fogColor: "#8fd8f8",
  fogNear: -96,
  fogFar: 1024,
  ambientColor: "#6080a0",
  sunColor: "#ffffff",
  waterTint: "#1983d9",
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
  "skyHorizon", "skyZenith", "sunsetColor", "sunGlowColor", "cloudDensity",
  "fogColor", "fogNear", "fogFar", "ambientColor", "sunColor", "waterTint",
];

export function AtmosphereTab({
  onBlur,
  onBiomeTintChange,
}: {
  onBlur: () => void;
  onBiomeTintChange: (field: string, value: string) => void;
}) {
  const biomeConfig = useEditorStore((s) => s.biomeConfig);
  const biomeSections = useEditorStore((s) => s.biomeSections);
  const activeBiomeSection = useEditorStore((s) => s.activeBiomeSection);
  const setBiomeConfig = useEditorStore((s) => s.setBiomeConfig);
  const setBiomeSections = useEditorStore((s) => s.setBiomeSections);
  const setNodes = useEditorStore((s) => s.setNodes);
  const setEdges = useEditorStore((s) => s.setEdges);
  const setOutputNode = useEditorStore((s) => s.setOutputNode);
  const commitState = useEditorStore((s) => s.commitState);
  const setDirty = useProjectStore((s) => s.setDirty);
  const setAtmosphereSettings = usePreviewStore((s) => s.setAtmosphereSettings);
  const storeAtm = usePreviewStore((s) => s.atmosphereSettings);
  const setTintColors = usePreviewStore((s) => s.setTintColors);

  const [atm, setAtm] = useState<AtmosphereState>(() => ({
    ...loadAtmosphere(),
    skyHorizon: storeAtm.skyHorizon,
    skyZenith: storeAtm.skyZenith,
    sunsetColor: storeAtm.sunsetColor,
    sunGlowColor: storeAtm.sunGlowColor,
    cloudDensity: storeAtm.cloudDensity,
    fogColor: storeAtm.fogColor,
    fogNear: storeAtm.fogNear,
    fogFar: storeAtm.fogFar,
    ambientColor: storeAtm.ambientColor,
    sunColor: storeAtm.sunColor,
    waterTint: storeAtm.waterTint,
  }));

  function syncStore(next: AtmosphereState) {
    setAtmosphereSettings({
      skyHorizon: next.skyHorizon,
      skyZenith: next.skyZenith,
      sunsetColor: next.sunsetColor,
      sunGlowColor: next.sunGlowColor,
      cloudDensity: next.cloudDensity,
      fogColor: next.fogColor,
      fogNear: next.fogNear,
      fogFar: next.fogFar,
      ambientColor: next.ambientColor,
      sunColor: next.sunColor,
      waterTint: next.waterTint,
    });
  }

  function update<K extends keyof AtmosphereState>(key: K, value: AtmosphereState[K]) {
    const next = { ...atm, [key]: value };
    setAtm(next);
    saveAtmosphere(next);
    if ((VISUAL_KEYS as string[]).includes(key)) {
      syncStore(next);
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
      sunsetColor: def.sunsetColor,
      sunGlowColor: def.sunGlowColor,
      fogColor: def.fogColor,
      fogNear: def.fogNear,
      fogFar: def.fogFar,
      sunColor: def.sunColor,
      ambientColor: def.ambientColor,
      waterTint: def.waterTint,
    };
    setAtm(next);
    saveAtmosphere(next);
    syncStore(next);
  }

  // â”€â”€ Environment export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [exportName, setExportName] = useState("");
  const [exportStatus, setExportStatus] = useState<"idle" | "ok" | "err">("idle");
  const [exportMsg, setExportMsg] = useState("");

  function syncEnvironmentSection(environmentName: string) {
    const envSection = biomeSections?.EnvironmentProvider;
    if (!envSection) return;

    const { nodes, edges } = jsonToGraph(
      { Type: "Constant", Environment: environmentName },
      0,
      0,
      "env",
      "EnvironmentProvider",
    );

    const rootNode = nodes[nodes.length - 1];
    if (rootNode) {
      rootNode.data = {
        ...(rootNode.data as Record<string, unknown>),
        _outputNode: true,
        _biomeField: "EnvironmentProvider",
      };
    }
    const outputNodeId = rootNode?.id ?? null;

    const shouldPushSectionHistory = activeBiomeSection !== "EnvironmentProvider";
    const historyEntry = {
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
      outputNodeId,
      label: `Set EnvironmentProvider to ${environmentName}`,
    };
    const nextHistory = shouldPushSectionHistory
      ? [...envSection.history.slice(0, envSection.historyIndex + 1), historyEntry]
      : envSection.history;

    setBiomeSections({
      ...biomeSections,
      EnvironmentProvider: {
        ...envSection,
        nodes,
        edges,
        outputNodeId,
        history: nextHistory,
        historyIndex: shouldPushSectionHistory ? nextHistory.length - 1 : envSection.historyIndex,
      },
    });

    if (activeBiomeSection === "EnvironmentProvider") {
      setNodes(structuredClone(nodes));
      setEdges(structuredClone(edges));
      setOutputNode(outputNodeId);
    }
  }

  async function handleExport() {
    const name = exportName.trim().replace(/[^a-zA-Z0-9_]/g, "_");
    if (!name) return;

    const preset = WEATHER_PRESET_DEFS.find((p) => p.label === atm.weather)
      ?? WEATHER_PRESET_DEFS[0];

    // Zone tag is derived from zone folder, e.g. "Zone1" â†’ { Zone1: [name] }
    const zoneKey = preset.zoneFolder; // "Zone1" | "Zone2" | ...
    const tagLabel = name.replace(/^.*_/, ""); // last segment as tag

    const envDoc = {
      Parent: preset.parentEnv,
      Tags: { [zoneKey]: [tagLabel] },
      WaterTint: atm.waterTint,
    };

    const filePath = `${HYTALE_ASSETS_BASE}\\Server\\Environments\\${preset.zoneFolder}\\Env_${name}.json`;

    try {
      await writeTextFile(filePath, JSON.stringify(envDoc, null, 2));
      const environmentName = `Env_${name}`;
      if (biomeConfig) {
        setBiomeConfig({
          ...biomeConfig,
          EnvironmentProvider: {
            Type: "Constant",
            Environment: environmentName,
          },
        });
        syncEnvironmentSection(environmentName);
        setDirty(true);
        commitState(`Set EnvironmentProvider to ${environmentName}`);
      }
      setExportStatus("ok");
      setExportMsg(`Saved -> ...\\${preset.zoneFolder}\\Env_${name}.json and applied ${environmentName}`);
    } catch (e) {
      setExportStatus("err");
      setExportMsg(String(e));
    }
    setTimeout(() => setExportStatus("idle"), 4000);
  }

  const tint = biomeConfig?.TintProvider as Record<string, unknown> | undefined;
  const tintDelimiters = Array.isArray(tint?.Delimiters) ? tint!.Delimiters as Array<Record<string, unknown>> : null;
  const tintColor1 = (tintDelimiters?.[0]?.Tint as Record<string, unknown>)?.Color as string ?? "#5b9e28";
  const tintColor2 = (tintDelimiters?.[1]?.Tint as Record<string, unknown>)?.Color as string ?? "#6ca229";
  const tintColor3 = (tintDelimiters?.[2]?.Tint as Record<string, unknown>)?.Color as string ?? "#7ea629";

  // Sync tint to previewStore whenever biomeConfig changes
  useEffect(() => {
    setTintColors({ color1: tintColor1, color2: tintColor2, color3: tintColor3 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tintColor1, tintColor2, tintColor3]);

  function handleTintChange(field: "color1" | "color2" | "color3", value: string) {
    // Map color1/2/3 to Delimiters array index
    const indexMap: Record<string, number> = { color1: 0, color2: 1, color3: 2 };
    const idx = indexMap[field];
    onBiomeTintChange(`Delimiters[${idx}].Tint.Color`, value);
    setTintColors({
      color1: field === "color1" ? value : tintColor1,
      color2: field === "color2" ? value : tintColor2,
      color3: field === "color3" ? value : tintColor3,
    });
  }

  return (
    <div className="flex flex-col p-3 gap-3" onBlur={onBlur}>

      <SectionCard label="Sky">
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
        <ColorPickerField
          label="Sunset Color"
          value={atm.sunsetColor}
          onChange={(v) => update("sunsetColor", v)}
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
      </SectionCard>

      <SectionCard label="Fog">
        <ColorPickerField
          label="Fog Color"
          value={atm.fogColor}
          onChange={(v) => update("fogColor", v)}
        />
        <SliderField
          label="Fog Near"
          value={atm.fogNear}
          min={-512}
          max={512}
          step={16}
          onChange={(v) => update("fogNear", v)}
          onBlur={() => {}}
        />
        <SliderField
          label="Fog Far"
          value={atm.fogFar}
          min={64}
          max={2048}
          step={64}
          onChange={(v) => update("fogFar", v)}
          onBlur={() => {}}
        />
      </SectionCard>

      <SectionCard label="Lighting">
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
        <ColorPickerField
          label="Sun Glow"
          value={atm.sunGlowColor}
          onChange={(v) => update("sunGlowColor", v)}
        />
      </SectionCard>

      <SectionCard label="Water">
        <ColorPickerField
          label="Water Tint"
          value={atm.waterTint}
          onChange={(v) => update("waterTint", v)}
        />
      </SectionCard>

      <SectionCard label="Weather">
        <WeatherSelector
          value={atm.weather}
          onChange={applyPreset}
        />
      </SectionCard>

      <SectionCard label="Tint">
        <div
          className="h-7 w-full rounded border border-tn-border"
          style={{ background: `linear-gradient(to right, ${tintColor1}, ${tintColor2}, ${tintColor3})` }}
        />
        <div className="grid grid-cols-3 gap-1 text-[10px] text-tn-text-muted">
          <div className="rounded border border-tn-border bg-tn-panel/40 px-1.5 py-1 text-center">Cool</div>
          <div className="rounded border border-tn-border bg-tn-panel/40 px-1.5 py-1 text-center">Mid</div>
          <div className="rounded border border-tn-border bg-tn-panel/40 px-1.5 py-1 text-center">Warm</div>
        </div>
        <div className="flex flex-col gap-1.5">
          <ColorPickerField
            label="Band 1"
            value={tintColor1}
            onChange={(v) => handleTintChange("color1", v)}
          />
          <ColorPickerField
            label="Band 2"
            value={tintColor2}
            onChange={(v) => handleTintChange("color2", v)}
          />
          <ColorPickerField
            label="Band 3"
            value={tintColor3}
            onChange={(v) => handleTintChange("color3", v)}
          />
        </div>
      </SectionCard>

      <SectionCard label="Ambient Audio">
        <div className="flex flex-col gap-2">
          <AudioRow label="Wind" volume={atm.audioWind} onVolumeChange={(v) => update("audioWind", v)} />
          <AudioRow label="Water" volume={atm.audioWater} onVolumeChange={(v) => update("audioWater", v)} />
          <AudioRow label="Insects" volume={atm.audioInsects} onVolumeChange={(v) => update("audioInsects", v)} />
          <AudioRow label="Storm" volume={atm.audioStorm} onVolumeChange={(v) => update("audioStorm", v)} />
        </div>
      </SectionCard>

      <SectionCard label="Export Environment">
        {(() => {
          const preset = WEATHER_PRESET_DEFS.find((p) => p.label === atm.weather) ?? WEATHER_PRESET_DEFS[0];
          return (
            <div className="text-[10px] text-tn-text-muted font-mono bg-tn-bg rounded px-2 py-1 border border-tn-border truncate">
              {"-> "}Server/Environments/<span className="text-tn-accent">{preset.zoneFolder}</span>/Env_<span className="text-tn-text">{exportName || "..."}</span>.json
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
            {exportStatus === "ok" ? "[OK] " : "[X] "}{exportMsg}
          </p>
        )}
        <p className="text-[10px] text-tn-text-muted/60 leading-tight">
          Writes a sub-environment JSON with the active zone as parent. Hytale will inherit its weather and water tint from the zone root.
        </p>
      </SectionCard>

    </div>
  );
}
