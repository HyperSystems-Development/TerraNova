import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";
import { usePreviewStore } from "@/stores/previewStore";
import { writeTextFile, pathExists, listDirectory, listTemplateBiomes, type TemplateBiomeEntry } from "@/utils/ipc";
import { jsonToGraph } from "@/utils/jsonToGraph";
import { useTauriIO } from "@/hooks/useTauriIO";
import {
  pickEnvironmentNameFromProvider,
  resolveBiomeAtmosphere,
  type ResolveBiomeAtmosphereMetadata,
} from "@/utils/resolveBiomeAtmosphere";
import { applyBiomeTintBand } from "./biomeTintUtils";
import { ColorPickerField } from "./ColorPickerField";
import { SliderField } from "./SliderField";
import { joinPath, inferServerRoot, normalizePath, getDirname } from "@/utils/pathUtils";

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
// Asset-derived weather helpers
// ---------------------------------------------------------------------------

interface ResolvedWeatherInfo {
  status: "idle" | "loading" | "ok" | "error";
  hour: number;
  environmentName: string | null;
  weatherId: string | null;
  serverRoot: string | null;
  environmentPath: string | null;
  weatherPath: string | null;
  warnings: string[];
  error: string | null;
}

const INITIAL_WEATHER_INFO: ResolvedWeatherInfo = {
  status: "idle",
  hour: 12,
  environmentName: null,
  weatherId: null,
  serverRoot: null,
  environmentPath: null,
  weatherPath: null,
  warnings: [],
  error: null,
};

function clampHour(hour: number): number {
  if (!Number.isFinite(hour)) return 12;
  const normalized = hour % 24;
  return normalized < 0 ? normalized + 24 : normalized;
}

/** Local wrapper: prefers an already-resolved root, then falls back to the shared inferServerRoot. */
function inferServerRootWithHint(
  currentFile: string | null,
  projectPath: string | null,
  resolvedRoot: string | null,
): string | null {
  if (resolvedRoot) return resolvedRoot;
  return inferServerRoot(currentFile, projectPath);
}

function extractZoneKeyFromEnvironmentDir(environmentDir: string | null): string | null {
  if (!environmentDir) return null;
  const parts = environmentDir.replace(/\\/g, "/").split("/").filter(Boolean);
  const environmentIdx = parts.findIndex((p) => p.toLowerCase() === "environments");
  if (environmentIdx < 0 || environmentIdx >= parts.length - 1) return null;
  const candidate = parts[environmentIdx + 1];
  return /^zone\d+$/i.test(candidate) ? candidate : null;
}

function buildWeatherInfo(metadata: ResolveBiomeAtmosphereMetadata, hour: number): ResolvedWeatherInfo {
  return {
    status: "ok",
    hour,
    environmentName: metadata.environmentName,
    weatherId: metadata.weatherId,
    serverRoot: metadata.serverRoot,
    environmentPath: metadata.environmentPath,
    weatherPath: metadata.weatherPath,
    warnings: metadata.warnings,
    error: null,
  };
}

function sanitizeEnvironmentName(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_]/g, "_");
}

function toServerRelativePath(path: string, serverRoot: string | null): string {
  if (!serverRoot) return path;
  const normalizedPath = path.replace(/\\/g, "/");
  const normalizedRoot = serverRoot.replace(/\\/g, "/");
  const rootPrefix = `${normalizedRoot.toLowerCase()}/`;
  if (normalizedPath.toLowerCase().startsWith(rootPrefix)) {
    return normalizedPath.slice(normalizedRoot.length + 1);
  }
  return normalizedPath;
}

function WeatherInfoRow({
  label,
  value,
  onClick,
  disabled = false,
}: {
  label: string;
  value: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-2 rounded border px-2 py-1 text-left transition-colors ${
          disabled
            ? "cursor-not-allowed border-tn-border/40 bg-tn-panel/20 text-tn-text-muted/50"
            : "border-tn-border/60 bg-tn-panel/30 hover:border-tn-accent/60 hover:bg-tn-accent/10"
        }`}
      >
        <span className="text-[10px] uppercase tracking-wide text-tn-text-muted">{label}</span>
        <span className="truncate max-w-[190px] text-[10px] font-mono text-tn-text" title={value}>{value}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded border border-tn-border/60 bg-tn-panel/30 px-2 py-1">
      <span className="text-[10px] uppercase tracking-wide text-tn-text-muted">{label}</span>
      <span className="text-[10px] font-mono text-tn-text truncate max-w-[190px]" title={value}>{value}</span>
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
  sunAngle: number;
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
  sunAngle: 60,
  audioWind: 0.6,
  audioWater: 0.0,
  audioInsects: 0.4,
  audioStorm: 0.0,
};

const STORAGE_KEY = "terranova-atmosphere";
const DEFAULT_BIOME_TINT_COLORS = ["#5b9e28", "#6ca229", "#7ea629"] as const;

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
  "fogColor", "fogNear", "fogFar", "ambientColor", "sunColor", "waterTint", "sunAngle",
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
  const editingContext = useEditorStore((s) => s.editingContext);
  const setBiomeConfig = useEditorStore((s) => s.setBiomeConfig);
  const setBiomeSections = useEditorStore((s) => s.setBiomeSections);
  const setNodes = useEditorStore((s) => s.setNodes);
  const setEdges = useEditorStore((s) => s.setEdges);
  const setOutputNode = useEditorStore((s) => s.setOutputNode);
  const setEditingContext = useEditorStore((s) => s.setEditingContext);
  const switchBiomeSection = useEditorStore((s) => s.switchBiomeSection);
  const setSelectedNodeId = useEditorStore((s) => s.setSelectedNodeId);
  const commitState = useEditorStore((s) => s.commitState);
  const setDirty = useProjectStore((s) => s.setDirty);
  const currentFile = useProjectStore((s) => s.currentFile);
  const projectPath = useProjectStore((s) => s.projectPath);
  const setAtmosphereSettings = usePreviewStore((s) => s.setAtmosphereSettings);
  const storeAtm = usePreviewStore((s) => s.atmosphereSettings);
  const setTintColors = usePreviewStore((s) => s.setTintColors);
  const { openFile } = useTauriIO();
  const [weatherInfo, setWeatherInfo] = useState<ResolvedWeatherInfo>(INITIAL_WEATHER_INFO);

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
    sunAngle: storeAtm.sunAngle,
  }));

  useEffect(() => {
    setAtm((prev) => ({
      ...prev,
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
      sunAngle: storeAtm.sunAngle,
    }));
  }, [
    storeAtm.skyHorizon,
    storeAtm.skyZenith,
    storeAtm.sunsetColor,
    storeAtm.sunGlowColor,
    storeAtm.cloudDensity,
    storeAtm.fogColor,
    storeAtm.fogNear,
    storeAtm.fogFar,
    storeAtm.ambientColor,
    storeAtm.sunColor,
    storeAtm.waterTint,
    storeAtm.sunAngle,
  ]);
  const environmentProviderSignature = JSON.stringify(biomeConfig?.EnvironmentProvider ?? null);
  const environmentProviderIsEmpty =
    biomeConfig?.EnvironmentProvider !== undefined &&
    Object.keys(biomeConfig.EnvironmentProvider as object).length === 0;

  const resolveAssetWeather = useCallback(
    async (requestedHour: number, applyToPreview: boolean): Promise<ResolveBiomeAtmosphereMetadata | null> => {
      const hour = clampHour(requestedHour);
      setWeatherInfo((prev) => ({
        ...prev,
        status: "loading",
        hour,
        error: null,
      }));

      try {
        const result = await resolveBiomeAtmosphere({
          biomeConfig,
          biomeFilePath: currentFile,
          projectPath,
          hour,
        });
        setWeatherInfo(buildWeatherInfo(result.metadata, hour));

        if (applyToPreview) {
          setAtmosphereSettings(result.settings);
          setAtm((prev) => {
            const next = { ...prev, ...result.settings };
            saveAtmosphere(next);
            return next;
          });
        }

        return result.metadata;
      } catch (error) {
        setWeatherInfo((prev) => ({
          ...prev,
          status: "error",
          hour,
          error: String(error),
        }));
        return null;
      }
    },
    [biomeConfig, currentFile, projectPath, setAtmosphereSettings],
  );

  useEffect(() => {
    if (!currentFile && !projectPath) return;
    void resolveAssetWeather(weatherInfo.hour, false);
  }, [environmentProviderSignature, currentFile, projectPath, resolveAssetWeather, weatherInfo.hour]);

  const environmentGraphDisabled = true;
  const tintGraphDisabled = true;
  const canOpenEnvironmentGraph = Boolean(biomeSections?.EnvironmentProvider) && !environmentGraphDisabled;
  const canOpenTintGraph = Boolean(biomeSections?.TintProvider) && !tintGraphDisabled;

  const openBiomeSectionGraph = useCallback((sectionKey: "EnvironmentProvider" | "TintProvider") => {
    const section = useEditorStore.getState().biomeSections?.[sectionKey];
    if (!section) return;

    if (editingContext !== "Biome") {
      setEditingContext("Biome");
    }
    switchBiomeSection(sectionKey);
    if (section.outputNodeId) {
      setSelectedNodeId(section.outputNodeId);
    }
  }, [editingContext, setEditingContext, setSelectedNodeId, switchBiomeSection]);

  const handleOpenEnvironmentGraph = useCallback(() => {
    openBiomeSectionGraph("EnvironmentProvider");
  }, [openBiomeSectionGraph]);

  const handleOpenTintGraph = useCallback(() => {
    openBiomeSectionGraph("TintProvider");
  }, [openBiomeSectionGraph]);

  const handleOpenEnvironmentFile = useCallback(() => {
    if (!weatherInfo.environmentPath) return;
    void openFile(weatherInfo.environmentPath);
  }, [openFile, weatherInfo.environmentPath]);

  const handleOpenWeatherFile = useCallback(() => {
    if (!weatherInfo.weatherPath) return;
    void openFile(weatherInfo.weatherPath);
  }, [openFile, weatherInfo.weatherPath]);

  // ── Time-of-day animation ───────────────────────────────────────────
  const [animating, setAnimating] = useState(false);
  const [animSpeed, setAnimSpeed] = useState(1); // hours per second
  const animIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animHourRef = useRef<number>(weatherInfo.hour);

  // Keep animHourRef in sync so the interval closure can advance it
  useEffect(() => {
    animHourRef.current = weatherInfo.hour;
  }, [weatherInfo.hour]);

  useEffect(() => {
    if (!animating) return;
    const ms = Math.max(100, Math.round(1000 / animSpeed));
    animIntervalRef.current = setInterval(() => {
      const next = clampHour(animHourRef.current + 1);
      animHourRef.current = next;
      // Update sunAngle: hour 6=0°, 12=90°, 18=180°, simple linear mapping
      const angle = ((next - 6 + 24) % 24) * (180 / 24);
      setAtm((prev) => {
        const updated = { ...prev, sunAngle: angle };
        saveAtmosphere(updated);
        return updated;
      });
      setAtmosphereSettings({ ...usePreviewStore.getState().atmosphereSettings, sunAngle: angle });
      setWeatherInfo((prev) => ({ ...prev, hour: next }));
      void resolveAssetWeather(next, true);
    }, ms);
    return () => {
      if (animIntervalRef.current) clearInterval(animIntervalRef.current);
    };
  }, [animating, animSpeed]);

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
      sunAngle: next.sunAngle,
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

  // â”€â”€ Environment export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Biome browser
  const [biomeBrowserOpen, setBiomeBrowserOpen] = useState(false);
  const [biomeBrowserTab, setBiomeBrowserTab] = useState<"project" | "templates">("project");
  const [biomeSearch, setBiomeSearch] = useState("");
  const [biomeFiles, setBiomeFiles] = useState<{ name: string; path: string }[]>([]);
  const [biomeLoadStatus, setBiomeLoadStatus] = useState<"idle" | "loading" | "error">("idle");
  const [templateBiomes, setTemplateBiomes] = useState<TemplateBiomeEntry[]>([]);
  const [templateLoadStatus, setTemplateLoadStatus] = useState<"idle" | "loading" | "error">("idle");

  const loadBiomeFiles = useCallback(async () => {
    const serverRoot = inferServerRootWithHint(currentFile, projectPath, weatherInfo.serverRoot);
    if (!serverRoot) {
      setBiomeLoadStatus("error");
      return;
    }
    setBiomeLoadStatus("loading");
    try {
      const biomesRoot = joinPath(serverRoot, "Generator/Biomes");
      const entries = await listDirectory(biomesRoot);
      const files: { name: string; path: string }[] = [];
      function collect(list: typeof entries) {
        for (const entry of list) {
          if (entry.is_dir && entry.children) collect(entry.children);
          else if (!entry.is_dir && entry.name.toLowerCase().endsWith(".json")) {
            files.push({ name: entry.name.replace(/\.json$/i, ""), path: entry.path });
          }
        }
      }
      collect(entries);
      files.sort((a, b) => a.name.localeCompare(b.name));
      setBiomeFiles(files);
      setBiomeLoadStatus("idle");
    } catch {
      setBiomeLoadStatus("error");
    }
  }, [currentFile, projectPath, weatherInfo.serverRoot]);

  const loadTemplateBiomes = useCallback(async () => {
    setTemplateLoadStatus("loading");
    try {
      const entries = await listTemplateBiomes();
      setTemplateBiomes(entries);
      setTemplateLoadStatus("idle");
    } catch {
      setTemplateLoadStatus("error");
    }
  }, []);

  // Environment export
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

  function syncTintSection(tintProvider: Record<string, unknown>) {
    const { biomeSections: latestSections, activeBiomeSection: latestActiveSection } = useEditorStore.getState();
    const tintSection = latestSections?.TintProvider;
    if (!tintSection || !latestSections) return;

    const { nodes, edges } = jsonToGraph(
      tintProvider,
      0,
      0,
      "tint",
      "TintProvider",
    );

    const rootNode = nodes[nodes.length - 1];
    if (rootNode) {
      rootNode.data = {
        ...(rootNode.data as Record<string, unknown>),
        _outputNode: true,
        _biomeField: "TintProvider",
      };
    }
    const outputNodeId = rootNode?.id ?? null;

    const shouldPushSectionHistory = latestActiveSection !== "TintProvider";
    const historyEntry = {
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
      outputNodeId,
      label: "Update TintProvider",
    };
    const nextHistory = shouldPushSectionHistory
      ? [...tintSection.history.slice(0, tintSection.historyIndex + 1), historyEntry]
      : tintSection.history;

    setBiomeSections({
      ...latestSections,
      TintProvider: {
        ...tintSection,
        nodes,
        edges,
        outputNodeId,
        history: nextHistory,
        historyIndex: shouldPushSectionHistory ? nextHistory.length - 1 : tintSection.historyIndex,
      },
    });

    if (latestActiveSection === "TintProvider") {
      setNodes(structuredClone(nodes));
      setEdges(structuredClone(edges));
      setOutputNode(outputNodeId);
    }
  }

  async function handleExport() {
    const name = sanitizeEnvironmentName(exportName);
    if (!name) return;
    const metadata = await resolveAssetWeather(weatherInfo.hour, false);
    const parentEnvironmentName =
      metadata?.environmentName
      ?? weatherInfo.environmentName
      ?? pickEnvironmentNameFromProvider(biomeConfig?.EnvironmentProvider)
      ?? null;
    const serverRoot = inferServerRootWithHint(
      currentFile,
      projectPath,
      metadata?.serverRoot ?? weatherInfo.serverRoot,
    );
    const envPath = metadata?.environmentPath ?? weatherInfo.environmentPath;
    const environmentDir =
      (envPath ? getDirname(normalizePath(envPath)) : null)
      ?? (serverRoot ? joinPath(serverRoot, "Environments") : null);

    if (!parentEnvironmentName || !environmentDir) {
      setExportStatus("err");
      setExportMsg("Could not resolve environment export location from current biome assets.");
      setTimeout(() => setExportStatus("idle"), 4000);
      return;
    }

    const environmentName = `Env_${name}`;
    const filePath = joinPath(environmentDir, `${environmentName}.json`);

    const alreadyExists = await pathExists(filePath);
    if (alreadyExists) {
      setExportStatus("err");
      setExportMsg(`${environmentName}.json already exists — choose a different name or delete the existing file first.`);
      setTimeout(() => setExportStatus("idle"), 5000);
      return;
    }

    const zoneKey = extractZoneKeyFromEnvironmentDir(environmentDir);
    const tagLabel = name.replace(/^.*_/, "");

    const envDoc: Record<string, unknown> = {
      Parent: parentEnvironmentName,
      WaterTint: atm.waterTint,
    };
    if (zoneKey) {
      envDoc.Tags = { [zoneKey]: [tagLabel] };
    }

    try {
      await writeTextFile(filePath, JSON.stringify(envDoc, null, 2));
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
      void resolveAssetWeather(weatherInfo.hour, true);
      setExportStatus("ok");
      setExportMsg(`Saved -> ${toServerRelativePath(filePath, serverRoot)} and applied ${environmentName}`);
    } catch (e) {
      setExportStatus("err");
      setExportMsg(String(e));
    }
    setTimeout(() => setExportStatus("idle"), 4000);
  }

  const tint = biomeConfig?.TintProvider as Record<string, unknown> | undefined;
  const tintDelimiters = Array.isArray(tint?.Delimiters) ? tint!.Delimiters as Array<Record<string, unknown>> : null;
  const tintProviderType = typeof tint?.Type === "string"
    ? tint.Type
    : tintDelimiters && tintDelimiters.length > 0
      ? "DensityDelimited"
      : "Constant";
  const tintConstantColor = typeof tint?.Color === "string" ? tint.Color : DEFAULT_BIOME_TINT_COLORS[1];
  const tintColor1 = (tintDelimiters?.[0]?.Tint as Record<string, unknown>)?.Color as string ?? "#5b9e28";
  const tintColor2 = (tintDelimiters?.[1]?.Tint as Record<string, unknown>)?.Color as string ?? "#6ca229";
  const tintColor3 = (tintDelimiters?.[2]?.Tint as Record<string, unknown>)?.Color as string ?? "#7ea629";
  const tintBandColors = tintProviderType === "DensityDelimited"
    ? (tintDelimiters?.map((delimiter, index) => {
        const tintNode = (delimiter.Tint as Record<string, unknown>) ?? {};
        return typeof tintNode.Color === "string"
          ? tintNode.Color
          : DEFAULT_BIOME_TINT_COLORS[Math.min(index, DEFAULT_BIOME_TINT_COLORS.length - 1)];
      }) ?? [])
    : [tintConstantColor];
  const tintGradientStops = tintBandColors.length === 0
    ? DEFAULT_BIOME_TINT_COLORS.join(", ")
    : tintBandColors.length === 1
      ? tintBandColors[0]
      : tintBandColors.map((color, index) => (
          `${color} ${Math.round((index / (tintBandColors.length - 1)) * 100)}%`
        )).join(", ");

  // Sync tint to previewStore whenever biomeConfig changes
  useEffect(() => {
    setTintColors({ color1: tintColor1, color2: tintColor2, color3: tintColor3 });
  }, [tintColor1, tintColor2, tintColor3]);

  function handleTintChange(field: "color1" | "color2" | "color3" | "constant", value: string) {
    // Map color1/2/3 to Delimiters array index
    const indexMap: Record<string, number> = { color1: 0, color2: 1, color3: 2 };
    const liveBiomeConfig = useEditorStore.getState().biomeConfig;
    const liveTintProvider = liveBiomeConfig?.TintProvider as Record<string, unknown> | undefined;
    const liveTintType = typeof liveTintProvider?.Type === "string"
      ? liveTintProvider.Type
      : tintProviderType;

    if (field === "constant" || liveTintType === "Constant") {
      const nextTint: Record<string, unknown> = {
        ...(liveTintProvider ?? {}),
        Type: "Constant",
        Color: value,
      };
      delete nextTint.Delimiters;
      delete nextTint.Density;
      onBiomeTintChange("Color", value);
      syncTintSection(nextTint);
      setTintColors({ color1: value, color2: value, color3: value });
      return;
    }

    const idx = indexMap[field];
    const nextTint = applyBiomeTintBand(liveTintProvider, idx, value);
    onBiomeTintChange(`Delimiters[${idx}].Tint.Color`, value);
    syncTintSection(nextTint);
    setTintColors({
      color1: field === "color1" ? value : tintColor1,
      color2: field === "color2" ? value : tintColor2,
      color3: field === "color3" ? value : tintColor3,
    });
  }

  const exportServerRoot = inferServerRootWithHint(currentFile, projectPath, weatherInfo.serverRoot);
  const exportEnvironmentDir =
    (weatherInfo.environmentPath ? getDirname(normalizePath(weatherInfo.environmentPath)) : null)
    ?? (exportServerRoot ? joinPath(exportServerRoot, "Environments") : null);
  const exportFileName = `Env_${sanitizeEnvironmentName(exportName) || "..."}.json`;
  const exportPreviewPath = exportEnvironmentDir
    ? toServerRelativePath(joinPath(exportEnvironmentDir, exportFileName), exportServerRoot)
    : `Server/Environments/${exportFileName}`;
  const weatherStatusLabel =
    weatherInfo.status === "loading"
      ? "Resolving..."
      : weatherInfo.status === "error"
        ? "Resolution failed"
        : "Resolved from assets";

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
        <WeatherInfoRow
          label="Environment"
          value={
            weatherInfo.environmentName
            ?? (environmentProviderIsEmpty ? "uses server default" : "—")
          }
        />
        <WeatherInfoRow label="Weather" value={weatherInfo.weatherId ?? "—"} />
        {weatherInfo.environmentPath && (
          <WeatherInfoRow
            label="Env file"
            value={toServerRelativePath(weatherInfo.environmentPath, weatherInfo.serverRoot)}
            onClick={handleOpenEnvironmentFile}
          />
        )}
        {weatherInfo.weatherPath && (
          <WeatherInfoRow
            label="Weather file"
            value={toServerRelativePath(weatherInfo.weatherPath, weatherInfo.serverRoot)}
            onClick={handleOpenWeatherFile}
          />
        )}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={handleOpenEnvironmentGraph}
            disabled={!canOpenEnvironmentGraph}
            className="px-2 py-1 text-[10px] rounded border border-tn-border text-tn-text-muted bg-tn-panel/40 hover:border-tn-accent hover:text-tn-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Environment Graph Disabled
          </button>
          <button
            type="button"
            onClick={handleOpenEnvironmentFile}
            disabled={!weatherInfo.environmentPath}
            className="px-2 py-1 text-[10px] rounded border border-tn-border text-tn-text-muted bg-tn-panel/40 hover:border-tn-accent hover:text-tn-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Open Environment File
          </button>
          <button
            type="button"
            onClick={handleOpenWeatherFile}
            disabled={!weatherInfo.weatherPath}
            className="px-2 py-1 text-[10px] rounded border border-tn-border text-tn-text-muted bg-tn-panel/40 hover:border-tn-accent hover:text-tn-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Open Weather File
          </button>
        </div>
        <div className="flex items-center justify-between text-[10px] text-tn-text-muted">
          <span>{weatherStatusLabel}</span>
          <span className="font-mono">Hour {weatherInfo.hour}:00</span>
        </div>
        <SliderField
          label="Sample Hour"
          value={weatherInfo.hour}
          min={0}
          max={23}
          step={1}
          onChange={(v) => setWeatherInfo((prev) => ({ ...prev, hour: clampHour(v) }))}
          onBlur={() => { void resolveAssetWeather(weatherInfo.hour, true); }}
        />
        <div className="flex gap-1.5">
          <button
            onClick={() => { void resolveAssetWeather(weatherInfo.hour, true); }}
            className="px-2 py-1 text-[10px] rounded border border-tn-accent text-tn-accent bg-tn-accent/10 hover:bg-tn-accent/20 transition-colors"
            disabled={weatherInfo.status === "loading"}
          >
            Refresh from Assets
          </button>
          <button
            onClick={() => { void resolveAssetWeather(weatherInfo.hour, false); }}
            className="px-2 py-1 text-[10px] rounded border border-tn-border text-tn-text-muted bg-tn-panel/40 hover:border-tn-text-muted transition-colors"
            disabled={weatherInfo.status === "loading"}
          >
            Re-read Metadata
          </button>
        </div>
        {weatherInfo.error && (
          <p className="text-[10px] text-red-400 font-mono truncate" title={weatherInfo.error}>
            {weatherInfo.error}
          </p>
        )}
        {weatherInfo.warnings.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {weatherInfo.warnings.map((w, i) => (
              <p key={i} className="text-[10px] text-amber-300 leading-tight">{w}</p>
            ))}
          </div>
        )}
        {/* Time-of-day animation */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-tn-border/60">
          <button
            onClick={() => setAnimating((prev) => !prev)}
            className={`px-2 py-1 text-[10px] rounded border transition-colors ${
              animating
                ? "border-red-400/60 text-red-300 bg-red-900/20 hover:bg-red-900/30"
                : "border-tn-border text-tn-text-muted bg-tn-panel/40 hover:border-tn-text-muted"
            }`}
          >
            {animating ? "Stop" : "Animate"}
          </button>
          <div className="flex items-center gap-1 flex-1">
            <span className="text-[10px] text-tn-text-muted shrink-0">Speed</span>
            <input
              type="range"
              min={0.5}
              max={6}
              step={0.5}
              value={animSpeed}
              onChange={(e) => setAnimSpeed(parseFloat(e.target.value))}
              className="flex-1 h-1 accent-tn-accent"
            />
            <span className="text-[10px] text-tn-text-muted w-8 text-right tabular-nums">{animSpeed}x</span>
          </div>
        </div>
        {/* Sun angle manual control */}
        <SliderField
          label="Sun Angle"
          value={atm.sunAngle}
          min={0}
          max={360}
          step={5}
          onChange={(v) => update("sunAngle", v)}
          onBlur={() => {}}
        />
      </SectionCard>

      <SectionCard label="Tint">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] text-tn-text-muted">
            {tintProviderType === "DensityDelimited"
              ? `${tintBandColors.length} band${tintBandColors.length === 1 ? "" : "s"} in TintProvider`
              : "Constant TintProvider"}
          </div>
          <button
            type="button"
            onClick={handleOpenTintGraph}
            disabled={!canOpenTintGraph}
            className="px-2 py-1 text-[10px] rounded border border-tn-border text-tn-text-muted bg-tn-panel/40 hover:border-tn-accent hover:text-tn-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Tint Graph Disabled
          </button>
        </div>
        <div
          className="h-7 w-full rounded border border-tn-border"
          style={{ background: `linear-gradient(to right, ${tintGradientStops})` }}
        />
        {tintProviderType === "DensityDelimited" ? (
          <>
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
            {tintBandColors.length > 3 && (
              <p className="text-[10px] text-tn-text-muted leading-tight">
                Quick controls edit the first 3 bands. Tint graph editing is disabled for now.
              </p>
            )}
          </>
        ) : (
          <>
            <ColorPickerField
              label="Tint Color"
              value={tintConstantColor}
              onChange={(v) => handleTintChange("constant", v)}
            />
            <p className="text-[10px] text-tn-text-muted leading-tight">
              This biome uses a Constant TintProvider. Multi-band graph editing is disabled for now.
            </p>
          </>
        )}
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
        <div className="text-[10px] text-tn-text-muted font-mono bg-tn-bg rounded px-2 py-1 border border-tn-border truncate">
          {"-> "}{exportPreviewPath}
        </div>
        <div className="text-[10px] text-tn-text-muted font-mono bg-tn-bg rounded px-2 py-1 border border-tn-border truncate">
          Parent: <span className="text-tn-text">{weatherInfo.environmentName ?? "unresolved"}</span>
        </div>
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
          Writes an Env_* JSON beside the currently resolved environment file and points it at the current parent environment.
        </p>
      </SectionCard>

      <SectionCard label="Biome Browser">
        <button
          onClick={() => {
            const next = !biomeBrowserOpen;
            setBiomeBrowserOpen(next);
            if (next) {
              if (biomeBrowserTab === "project") void loadBiomeFiles();
              else void loadTemplateBiomes();
            }
          }}
          className="w-full px-2 py-1 text-[10px] rounded border border-tn-border text-tn-text-muted bg-tn-panel/40 hover:border-tn-text-muted hover:text-tn-text transition-colors text-left"
        >
          {biomeBrowserOpen ? "Hide biome list" : "Browse biomes..."}
        </button>

        {biomeBrowserOpen && (
          <div className="flex flex-col gap-1.5">
            {/* Tab switcher */}
            <div className="flex gap-1 rounded border border-tn-border overflow-hidden text-[10px]">
              <button
                onClick={() => { setBiomeBrowserTab("project"); void loadBiomeFiles(); }}
                className={`flex-1 px-2 py-1 transition-colors ${biomeBrowserTab === "project" ? "bg-tn-accent/20 text-tn-accent border-r border-tn-border" : "text-tn-text-muted hover:text-tn-text border-r border-tn-border"}`}
              >
                Project Biomes
              </button>
              <button
                onClick={() => { setBiomeBrowserTab("templates"); void loadTemplateBiomes(); }}
                className={`flex-1 px-2 py-1 transition-colors ${biomeBrowserTab === "templates" ? "bg-tn-accent/20 text-tn-accent" : "text-tn-text-muted hover:text-tn-text"}`}
              >
                Hytale Templates
              </button>
            </div>

            {/* Project biomes */}
            {biomeBrowserTab === "project" && (
              <div className="flex flex-col gap-0.5">
                {biomeLoadStatus === "loading" && (
                  <span className="text-[10px] text-tn-text-muted px-1">Scanning...</span>
                )}
                {biomeLoadStatus === "error" && (
                  <span className="text-[10px] text-red-400 px-1">Could not find biomes folder. Open a biome file first.</span>
                )}
                {biomeLoadStatus === "idle" && biomeFiles.length === 0 && (
                  <span className="text-[10px] text-tn-text-muted px-1">No biome files found.</span>
                )}
                {biomeLoadStatus === "idle" && biomeFiles.length > 4 && (
                  <input
                    type="text"
                    placeholder="Filter biomes..."
                    value={biomeSearch}
                    onChange={(e) => setBiomeSearch(e.target.value)}
                    className="text-[10px] bg-tn-bg border border-tn-border rounded px-2 py-0.5 text-tn-text placeholder:text-tn-text-muted/50 focus:border-tn-accent outline-none"
                  />
                )}
                <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                  {biomeFiles
                    .filter((f) => !biomeSearch || f.name.toLowerCase().includes(biomeSearch.toLowerCase()))
                    .map((f) => (
                      <button
                        key={f.path}
                        onClick={() => { void openFile(f.path); }}
                        className="text-left px-2 py-0.5 rounded text-[10px] text-tn-text font-mono hover:bg-tn-accent/15 hover:text-tn-accent transition-colors truncate"
                        title={f.path}
                      >
                        {f.name}
                      </button>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Hytale template biomes */}
            {biomeBrowserTab === "templates" && (
              <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                {templateLoadStatus === "loading" && (
                  <span className="text-[10px] text-tn-text-muted px-1">Loading templates...</span>
                )}
                {templateLoadStatus === "error" && (
                  <span className="text-[10px] text-red-400 px-1">Could not load bundled templates.</span>
                )}
                {templateLoadStatus === "idle" && templateBiomes.length === 0 && (
                  <span className="text-[10px] text-tn-text-muted px-1">No template biomes found.</span>
                )}
                {templateBiomes.map((t) => (
                  <button
                    key={t.path}
                    onClick={() => { void openFile(t.path); }}
                    className="text-left px-2 py-1 rounded text-[10px] hover:bg-tn-accent/15 hover:text-tn-accent transition-colors group"
                    title={t.path}
                  >
                    <div className="font-mono text-tn-text group-hover:text-tn-accent truncate">{t.biomeName}</div>
                    <div className="text-tn-text-muted/70 group-hover:text-tn-accent/60 truncate">{t.displayName} · {t.templateName}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </SectionCard>

    </div>
  );
}
