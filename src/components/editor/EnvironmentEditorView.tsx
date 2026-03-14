import { useEffect, useMemo, useState } from "react";
import { FolderOpen, FolderPlus, Save, WandSparkles } from "lucide-react";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";
import { useTauriIO } from "@/hooks/useTauriIO";
import {
  copyFile,
  createDirectory,
  exportAssetFile,
  listDirectory,
  resolveBundledHytaleAssetPath,
  showInFolder,
  writeAssetFile,
  type DirectoryEntryData,
} from "@/utils/ipc";
import { useToastStore } from "@/stores/toastStore";
import mapDirEntry from "@/utils/mapDirEntry";
import { loadKnownEnvironmentNames } from "@/utils/environmentAssetLookup";
import { EditorCalloutSection, type EditorCalloutItem } from "./EditorCallouts";
import { CollapsibleEditorSection } from "./CollapsibleEditorSection";

interface WeatherForecastEntry {
  WeatherId: string;
  Weight: number;
}

type WeatherForecastMap = Record<string, WeatherForecastEntry[]>;

interface EnvironmentDoc extends Record<string, unknown> {
  Parent?: string;
  Tags?: Record<string, string[]>;
  WeatherForecasts?: WeatherForecastMap;
  WaterTint?: string;
  SpawnDensity?: number;
  BlockModificationAllowed?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, index) => index);

const DAYPARTS = [
  { id: "night", label: "Night", start: 0, end: 3, accent: "#2563eb" },
  { id: "dawn", label: "Dawn", start: 4, end: 7, accent: "#f97316" },
  { id: "morning", label: "Morning", start: 8, end: 11, accent: "#22c55e" },
  { id: "afternoon", label: "Afternoon", start: 12, end: 15, accent: "#facc15" },
  { id: "evening", label: "Evening", start: 16, end: 19, accent: "#a855f7" },
  { id: "late", label: "Late", start: 20, end: 23, accent: "#0f172a" },
] as const;

function joinWindowsPath(base: string, child: string): string {
  return `${base.replace(/[\\/]+$/, "")}\\${child}`;
}

function findServerRoot(path: string | null): string | null {
  if (!path) return null;
  const normalized = path.replace(/\\/g, "/");
  const marker = "/server/";
  const markerIndex = normalized.toLowerCase().lastIndexOf(marker);
  if (markerIndex >= 0) {
    return normalized.slice(0, markerIndex + marker.length - 1).replace(/\//g, "\\");
  }
  if (normalized.toLowerCase().endsWith("/server")) {
    return normalized.replace(/\//g, "\\");
  }
  return null;
}

function inferServerRoot(currentFile: string | null, projectPath: string | null): string | null {
  return findServerRoot(currentFile) ?? findServerRoot(projectPath) ?? (projectPath ? joinWindowsPath(projectPath, "Server") : null);
}

function collectJsonFiles(entries: DirectoryEntryData[]): Array<{ id: string; path: string }> {
  const files: Array<{ id: string; path: string }> = [];

  const visit = (items: DirectoryEntryData[]) => {
    for (const entry of items) {
      if (entry.is_dir && entry.children) {
        visit(entry.children);
        continue;
      }
      if (!entry.is_dir && entry.name.toLowerCase().endsWith(".json")) {
        files.push({
          id: entry.name.replace(/\.json$/i, ""),
          path: entry.path,
        });
      }
    }
  };

  visit(entries);
  return files.sort((left, right) => left.id.localeCompare(right.id));
}

function hashColor(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(index);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 55% 48%)`;
}


function summarizeDaypart(doc: EnvironmentDoc, start: number, end: number) {
  const weatherWeights = new Map<string, number>();
  let totalEntries = 0;

  for (let hour = start; hour <= end; hour += 1) {
    for (const entry of readForecastHour(doc, hour)) {
      totalEntries += 1;
      weatherWeights.set(entry.WeatherId, (weatherWeights.get(entry.WeatherId) ?? 0) + entry.Weight);
    }
  }

  const sortedWeather = [...weatherWeights.entries()].sort((left, right) => right[1] - left[1]);
  return {
    totalEntries,
    sortedWeather,
    dominantWeatherId: sortedWeather[0]?.[0] ?? null,
    uniqueWeatherCount: sortedWeather.length,
  };
}

function collectWeatherUsage(doc: EnvironmentDoc) {
  const usage = new Map<string, { hours: number[]; totalWeight: number; appearances: number }>();

  for (const hour of HOURS) {
    for (const entry of readForecastHour(doc, hour)) {
      const current = usage.get(entry.WeatherId) ?? { hours: [], totalWeight: 0, appearances: 0 };
      if (!current.hours.includes(hour)) {
        current.hours.push(hour);
      }
      current.totalWeight += entry.Weight;
      current.appearances += 1;
      usage.set(entry.WeatherId, current);
    }
  }

  return usage;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function sanitizeTagValues(input: string): string[] {
  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function readForecastHour(doc: EnvironmentDoc, hour: number): WeatherForecastEntry[] {
  const key = String(hour);
  const entries = doc.WeatherForecasts?.[key];
  return Array.isArray(entries) ? entries : [];
}

function inferSuggestedParentEnvironment(
  currentFile: string | null,
  knownEnvironmentNames: string[],
): string {
  const envNames = knownEnvironmentNames.filter((name) => /^Env_/i.test(name));
  const normalizedPath = (currentFile ?? "").replace(/\\/g, "/").toLowerCase();
  const findExact = (candidate: string) => envNames.find((name) => name.toLowerCase() === candidate.toLowerCase()) ?? null;
  const findPrefix = (candidatePrefix: string) => envNames.find((name) => name.toLowerCase().startsWith(candidatePrefix.toLowerCase())) ?? null;
  const findContains = (fragment: string) => envNames.find((name) => name.toLowerCase().includes(fragment.toLowerCase())) ?? null;

  if (normalizedPath.includes("void")) {
    return findExact("Env_Default_Void")
      ?? findContains("void")
      ?? "Env_Default_Void";
  }

  const zoneMatch = /zone[_ -]?(\d+)/i.exec(normalizedPath);
  if (zoneMatch) {
    const zonePrefix = `Env_Zone${zoneMatch[1]}`;
    return findExact(zonePrefix)
      ?? findPrefix(zonePrefix)
      ?? findContains(`zone${zoneMatch[1]}`)
      ?? findExact("Env_Zone1")
      ?? findPrefix("Env_Zone1")
      ?? findExact("Env_Default_Flat")
      ?? "Env_Zone1";
  }

  return findExact("Env_Zone1")
    ?? findPrefix("Env_Zone1")
    ?? findExact("Env_Default_Flat")
    ?? findPrefix("Env_Default")
    ?? envNames[0]
    ?? "Env_Zone1";
}

function buildDefaultWeatherDoc(weatherId: string) {
  return {
    $Comment: `Default weather created by TerraNova for ${weatherId}`,
    SkyTopColors: [
      { Hour: 0, Color: "rgba(#0a1628, 1.0)" },
      { Hour: 6, Color: "rgba(#1e3a5f, 1.0)" },
      { Hour: 8, Color: "rgba(#4a90d9, 1.0)" },
      { Hour: 12, Color: "rgba(#5ba3e8, 1.0)" },
      { Hour: 18, Color: "rgba(#e07b39, 1.0)" },
      { Hour: 20, Color: "rgba(#1a2a4a, 1.0)" },
      { Hour: 23, Color: "rgba(#0a1628, 1.0)" },
    ],
    SkyBottomColors: [
      { Hour: 0, Color: "rgba(#050d1a, 1.0)" },
      { Hour: 6, Color: "rgba(#122540, 1.0)" },
      { Hour: 8, Color: "rgba(#2d6aa0, 1.0)" },
      { Hour: 12, Color: "rgba(#3a7fc1, 1.0)" },
      { Hour: 18, Color: "rgba(#c0582a, 1.0)" },
      { Hour: 20, Color: "rgba(#0f1e35, 1.0)" },
      { Hour: 23, Color: "rgba(#050d1a, 1.0)" },
    ],
    FogColors: [
      { Hour: 0, Color: "rgba(#0d1f33, 1.0)" },
      { Hour: 8, Color: "rgba(#7ab0d4, 0.6)" },
      { Hour: 12, Color: "rgba(#a8cce0, 0.4)" },
      { Hour: 20, Color: "rgba(#1a2e45, 0.7)" },
      { Hour: 23, Color: "rgba(#0d1f33, 1.0)" },
    ],
    SunColors: [
      { Hour: 0, Color: "rgba(#000000, 0.0)" },
      { Hour: 6, Color: "rgba(#f97316, 1.0)" },
      { Hour: 8, Color: "rgba(#fde68a, 1.0)" },
      { Hour: 12, Color: "rgba(#ffffff, 1.0)" },
      { Hour: 18, Color: "rgba(#f97316, 1.0)" },
      { Hour: 20, Color: "rgba(#000000, 0.0)" },
      { Hour: 23, Color: "rgba(#000000, 0.0)" },
    ],
    MoonColors: [
      { Hour: 0, Color: "rgba(#cbd5f5, 1.0)" },
      { Hour: 6, Color: "rgba(#000000, 0.0)" },
      { Hour: 20, Color: "rgba(#000000, 0.0)" },
      { Hour: 22, Color: "rgba(#cbd5f5, 1.0)" },
      { Hour: 23, Color: "rgba(#cbd5f5, 1.0)" },
    ],
    SunlightColors: [
      { Hour: 0, Color: "rgba(#1a2a4a, 0.3)" },
      { Hour: 6, Color: "rgba(#f97316, 0.8)" },
      { Hour: 8, Color: "rgba(#fde68a, 1.0)" },
      { Hour: 12, Color: "rgba(#ffffff, 1.0)" },
      { Hour: 18, Color: "rgba(#f97316, 0.8)" },
      { Hour: 20, Color: "rgba(#1a2a4a, 0.3)" },
      { Hour: 23, Color: "rgba(#1a2a4a, 0.3)" },
    ],
    SunScales: [
      { Hour: 0, Value: 0.0 },
      { Hour: 6, Value: 0.8 },
      { Hour: 8, Value: 1.0 },
      { Hour: 12, Value: 1.0 },
      { Hour: 18, Value: 0.8 },
      { Hour: 20, Value: 0.0 },
      { Hour: 23, Value: 0.0 },
    ],
    MoonScales: [
      { Hour: 0, Value: 1.0 },
      { Hour: 6, Value: 0.0 },
      { Hour: 20, Value: 0.0 },
      { Hour: 22, Value: 1.0 },
      { Hour: 23, Value: 1.0 },
    ],
    FogDensities: [
      { Hour: 0, Value: 0.04 },
      { Hour: 8, Value: 0.01 },
      { Hour: 12, Value: 0.005 },
      { Hour: 20, Value: 0.03 },
      { Hour: 23, Value: 0.04 },
    ],
    FogDistance: [64, 512],
  };
}

function EnvironmentMetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded border border-tn-border/50 bg-tn-bg/80 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">{label}</p>
      <p className="mt-1 text-[13px] font-semibold text-tn-text">{value}</p>
      {detail && <p className="mt-1 text-[10px] text-tn-text-muted">{detail}</p>}
    </div>
  );
}

function isPathInProject(path: string | undefined, projectPath: string | null): boolean {
  if (!path || !projectPath) return false;
  const normalizedPath = path.replace(/\//g, "\\").toLowerCase();
  const normalizedProject = projectPath.replace(/\//g, "\\").replace(/[\\]+$/, "").toLowerCase();
  return normalizedPath === normalizedProject || normalizedPath.startsWith(`${normalizedProject}\\`);
}

function getForecastResolution(
  weatherId: string,
  weatherPath: string | undefined,
  projectPath: string | null,
): {
  status: "in-pack" | "built-in" | "missing";
  label: string;
  detail: string;
} {
  if (!weatherPath) {
    return {
      status: "missing",
      label: "Missing",
      detail: weatherId
        ? "No matching weather file is resolved yet. Locate an existing file or create a placeholder."
        : "Enter a weather ID, then locate or create the file.",
    };
  }

  const fileName = weatherPath.split(/[/\\]/).pop() ?? weatherId;
  if (isPathInProject(weatherPath, projectPath)) {
    return {
      status: "in-pack",
      label: "In Pack",
      detail: `Resolved to ${fileName} in this pack.`,
    };
  }

  return {
    status: "built-in",
    label: "Built-In",
    detail: `Resolved to cached Hytale asset ${fileName}. Import it into Server\\Weathers to include it in the pack.`,
  };
}

function forecastResolutionBadgeClass(status: "in-pack" | "built-in" | "missing"): string {
  switch (status) {
    case "in-pack":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "built-in":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
}

interface ForecastEntryEditorCardProps {
  entry: WeatherForecastEntry;
  index: number;
  hour: number;
  projectPath: string | null;
  weatherPath: string | undefined;
  onWeatherIdChange: (weatherId: string) => void;
  onWeightChange: (weight: number) => void;
  onOpen: () => void;
  onImport?: () => void;
  onLocate?: () => void;
  onRemove?: () => void;
}

function ForecastEntryEditorCard({
  entry,
  index,
  hour,
  projectPath,
  weatherPath,
  onWeatherIdChange,
  onWeightChange,
  onOpen,
  onImport,
  onLocate,
  onRemove,
}: ForecastEntryEditorCardProps) {
  const resolution = getForecastResolution(entry.WeatherId, weatherPath, projectPath);

  return (
    <div className="rounded border border-tn-border/40 bg-tn-surface/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: hashColor(entry.WeatherId || `hour-${hour}-${index}`) }}
          />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">
            Entry {index + 1}
          </p>
          <span className={`rounded border px-2 py-0.5 text-[10px] uppercase tracking-wider ${forecastResolutionBadgeClass(resolution.status)}`}>
            {resolution.label}
          </span>
        </div>
        {onRemove && (
          <button
            type="button"
            title="Remove this forecast entry"
            onClick={onRemove}
            className="shrink-0 rounded border border-tn-border/40 px-2 py-1 text-[10px] text-tn-text-muted/60 transition-colors hover:border-red-500/50 hover:text-red-400"
          >
            Remove
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_110px]">
        <label className="flex min-w-0 flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">
          Weather ID
          <input
            type="text"
            list="environment-weather-options"
            value={entry.WeatherId}
            onChange={(event) => onWeatherIdChange(event.target.value)}
            className="min-w-0 rounded border border-tn-border/60 bg-tn-bg px-2 py-1.5 text-[11px] normal-case tracking-normal text-tn-text"
            placeholder="Zone1_Sunny"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">
          Weight
          <input
            type="number"
            step={1}
            min={0}
            value={entry.Weight}
            onChange={(event) => {
              const weight = Number.parseFloat(event.target.value);
              if (!Number.isFinite(weight)) return;
              onWeightChange(weight);
            }}
            className="rounded border border-tn-border/60 bg-tn-bg px-2 py-1.5 text-[11px] font-mono text-right text-tn-text"
          />
        </label>
      </div>

      <p className="mt-2 break-all text-[10px] text-tn-text-muted">{resolution.detail}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpen}
          disabled={!weatherPath}
          title={weatherPath ? `Open ${entry.WeatherId}` : "File not found"}
          className={`rounded border px-2.5 py-1 text-[10px] font-medium transition-colors ${
            weatherPath
              ? "border-tn-border/60 text-tn-text-muted hover:border-tn-accent hover:text-tn-accent"
              : "cursor-not-allowed border-tn-border/30 text-tn-text-muted/40"
          }`}
        >
          Open
        </button>
        {onImport && (
          <button
            type="button"
            onClick={onImport}
            className="rounded border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-[10px] font-medium text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/20"
          >
            Import
          </button>
        )}
        {onLocate && (
          <button
            type="button"
            onClick={onLocate}
            className="rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-300 transition-colors hover:border-amber-400/60 hover:bg-amber-500/20"
          >
            Locate...
          </button>
        )}
      </div>
    </div>
  );
}

export function EnvironmentEditorView() {
  const rawJsonContent = useEditorStore((state) => state.rawJsonContent) as EnvironmentDoc | null;
  const setRawJsonContent = useEditorStore((state) => state.setRawJsonContent);
  const currentFile = useProjectStore((state) => state.currentFile);
  const projectPath = useProjectStore((state) => state.projectPath);
  const isDirty = useProjectStore((state) => state.isDirty);
  const setDirty = useProjectStore((state) => state.setDirty);
  const setDirectoryTree = useProjectStore((state) => state.setDirectoryTree);
  const { openFile } = useTauriIO();
  const addToast = useToastStore((state) => state.addToast);
  const hasEnvironmentDoc = rawJsonContent !== null;
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [weatherOptions, setWeatherOptions] = useState<Array<{ id: string; path: string }>>([]);
  const [weatherPathIndex, setWeatherPathIndex] = useState<Record<string, string>>({});
  const [environmentParentOptions, setEnvironmentParentOptions] = useState<string[]>([]);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [previewHour, setPreviewHour] = useState(12);
  const [selectedDaypartId, setSelectedDaypartId] = useState<(typeof DAYPARTS)[number]["id"] | null>(null);
  const [showIssueLog, setShowIssueLog] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [showOverviewSection, setShowOverviewSection] = useState(true);
  const [showTagsSection, setShowTagsSection] = useState(false);
  const [showForecastSection, setShowForecastSection] = useState(true);
  const [showExtraSection, setShowExtraSection] = useState(false);
  const [forecastScope, setForecastScope] = useState<"current" | "daypart" | "all">("current");
  const [lookupRevision, setLookupRevision] = useState(0);

  useEffect(() => {
    let active = true;
    const serverRoot = inferServerRoot(currentFile, projectPath);

    setLookupStatus("loading");
    setLookupError(null);

    async function scanHytaleAssetWeathers(): Promise<Array<{ id: string; path: string }>> {
      const allFiles: Array<{ id: string; path: string }> = [];

      try {
        const bundledWeathersPath = await resolveBundledHytaleAssetPath("Server\\Weathers");
        const bundledEntries = await listDirectory(bundledWeathersPath);
        allFiles.push(...collectJsonFiles(bundledEntries));
      } catch {
        // Built-in assets are optional during development.
      }

      return allFiles;
    }

    async function run() {
      const allFiles: Array<{ id: string; path: string }> = [];
      let projectWeathersFound = false;

      if (serverRoot) {
        try {
          const entries = await listDirectory(joinWindowsPath(serverRoot, "Weathers"));
          const files = collectJsonFiles(entries);
          allFiles.push(...files);
          projectWeathersFound = true;
        } catch {
          // will try Hytale assets below
        }
      }

      // Always supplement project weather files with cached Hytale assets.
      const hytaleFiles = await scanHytaleAssetWeathers();
      for (const file of hytaleFiles) {
        allFiles.push(file);
      }

      if (!active) return;

      // Build index: project files were pushed first, so they take priority.
      // Cached Hytale files fill in any IDs not already covered.
      const nextIndex: Record<string, string> = {};
      const seen = new Set<string>();
      const deduped: Array<{ id: string; path: string }> = [];
      for (const file of allFiles) {
        const key = file.id.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(file);
          nextIndex[key] = file.path;
        }
        // First occurrence wins: project files are always pushed before cached Hytale files.
      }

      deduped.sort((a, b) => a.id.localeCompare(b.id));
      setWeatherOptions(deduped);
      setWeatherPathIndex(nextIndex);

      if (!serverRoot) {
        setLookupStatus("error");
        setLookupError(hytaleFiles.length > 0
          ? `Server\\Weathers not found - showing ${hytaleFiles.length} file(s) from the cached Hytale assets.`
          : "Could not infer the Server root for weather lookup.");
      } else if (!projectWeathersFound) {
        setLookupStatus("error");
        setLookupError(hytaleFiles.length > 0
          ? `Server\\Weathers directory not found. Showing ${hytaleFiles.length} file(s) from the cached Hytale assets. Create the folder or click "Create Default Weather".`
          : "Server\\Weathers directory not found. Create the folder or open a file inside the Server directory.");
      } else {
        setLookupStatus("ready");
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [currentFile, lookupRevision, projectPath]);

  // Determines if a resolved path is from Hytale assets (not inside the current project).
  function isHytaleAssetPath(resolvedPath: string): boolean {
    if (!projectPath) return false;
    const norm = resolvedPath.replace(/\\/g, "/").toLowerCase();
    const projNorm = projectPath.replace(/\\/g, "/").toLowerCase();
    return !norm.startsWith(projNorm);
  }

  // Weather IDs in the file that only resolve to Hytale asset paths (not in project).
  const hytaleOnlyIds = useMemo(() => {
    if (!rawJsonContent || Object.keys(weatherPathIndex).length === 0) return [];
    const forecasts = (rawJsonContent as EnvironmentDoc).WeatherForecasts ?? {};
    const allIds = new Set<string>();
    for (const entries of Object.values(forecasts)) {
      for (const e of entries) if (e.WeatherId) allIds.add(e.WeatherId);
    }
    return [...allIds].filter((id) => {
      const p = weatherPathIndex[id.toLowerCase()];
      return p && isHytaleAssetPath(p);
    });
  }, [rawJsonContent, weatherPathIndex, projectPath]);

  // Weather IDs referenced but not found anywhere (not in project, not in Hytale assets).
  const missingIds = useMemo(() => {
    if (!rawJsonContent || lookupStatus === "loading") return [];
    const forecasts = (rawJsonContent as EnvironmentDoc).WeatherForecasts ?? {};
    const allIds = new Set<string>();
    for (const entries of Object.values(forecasts)) {
      for (const e of entries) if (e.WeatherId) allIds.add(e.WeatherId);
    }
    return [...allIds].filter((id) => !weatherPathIndex[id.toLowerCase()]);
  }, [rawJsonContent, weatherPathIndex, lookupStatus]);

  // Auto-copy Hytale weather assets into the project's Server\Weathers folder on file open.
  // Any unresolved state is surfaced in the Issue Log instead of a toast.
  useEffect(() => {
    if (hytaleOnlyIds.length === 0) return;
    const serverRoot = inferServerRoot(currentFile, projectPath);
    if (!serverRoot) return;
    const weathersDir = joinWindowsPath(serverRoot, "Weathers");
    async function autoImport() {
      let imported = 0;
      await createDirectory(weathersDir).catch(() => {});
      for (const id of hytaleOnlyIds) {
        const srcPath = weatherPathIndex[id.toLowerCase()];
        if (!srcPath) continue;
        const fileName = srcPath.split(/[/\\]/).pop() ?? `${id}.json`;
        const destPath = joinWindowsPath(weathersDir, fileName);
        try {
          await copyFile(srcPath, destPath);
          imported += 1;
        } catch {
          // Failed imports remain visible in the Issue Log.
        }
      }
      if (imported > 0) {
        await refreshProjectTreeAndLookup();
      }
    }
    void autoImport();
  // Only fire when the set of IDs changes (file switch / lookup complete).
  }, [currentFile, hytaleOnlyIds.join(","), projectPath]);

  const doc = rawJsonContent ?? ({} as EnvironmentDoc);

  useEffect(() => {
    let active = true;

    void loadKnownEnvironmentNames(currentFile, projectPath)
      .then((names) => {
        if (active) {
          setEnvironmentParentOptions(names ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setEnvironmentParentOptions([]);
        }
      });

    return () => {
      active = false;
    };
  }, [currentFile, projectPath]);

  const suggestedParentEnvironment = useMemo(() => (
    doc.Parent?.trim()
      ? null
      : inferSuggestedParentEnvironment(currentFile, environmentParentOptions)
  ), [currentFile, doc.Parent, environmentParentOptions]);

  const updateDoc = (updater: (previous: EnvironmentDoc) => EnvironmentDoc) => {
    if (!rawJsonContent) return;
    const next = updater(structuredClone(doc));
    setRawJsonContent(next);
    setDirty(true);
    if (saveStatus !== "idle") {
      setSaveStatus("idle");
    }
  };

  const isWeatherDirMissing = lookupStatus === "error" && (lookupError?.includes("not found") ?? false);

  const refreshProjectTreeAndLookup = async () => {
    if (projectPath) {
      try {
        const entries = await listDirectory(projectPath);
        setDirectoryTree(entries.map(mapDirEntry));
      } catch {
        // Tree refresh failure is non-fatal.
      }
    }
    setLookupStatus("loading");
    setLookupError(null);
    setLookupRevision((value) => value + 1);
  };

  const materializeReferencedWeatherFiles = async ({
    importIds,
    createIds,
  }: {
    importIds?: string[];
    createIds?: string[];
  }) => {
    const serverRoot = inferServerRoot(currentFile, projectPath);
    if (!serverRoot) {
      addToast("Cannot determine the Server root for weather fixes.", "warning");
      return;
    }

    const weathersDir = joinWindowsPath(serverRoot, "Weathers");
    await createDirectory(weathersDir).catch(() => {});

    let imported = 0;
    let created = 0;
    let failed = 0;

    for (const weatherId of importIds ?? []) {
      const sourcePath = weatherPathIndex[weatherId.toLowerCase()];
      if (!sourcePath) {
        failed += 1;
        continue;
      }
      const fileName = sourcePath.split(/[/\\]/).pop() ?? `${weatherId}.json`;
      try {
        await copyFile(sourcePath, joinWindowsPath(weathersDir, fileName));
        imported += 1;
      } catch {
        failed += 1;
      }
    }

    for (const weatherId of createIds ?? []) {
      try {
        await exportAssetFile(
          joinWindowsPath(weathersDir, `${weatherId}.json`),
          buildDefaultWeatherDoc(weatherId),
        );
        created += 1;
      } catch {
        failed += 1;
      }
    }

    await refreshProjectTreeAndLookup();

    if (imported > 0) {
      addToast(`Added ${imported} referenced weather file(s) to Server\\Weathers.`, "success");
    }
    if (created > 0) {
      addToast(`Created ${created} placeholder weather file(s) in Server\\Weathers.`, "success");
    }
    if (failed > 0) {
      addToast(`Failed to materialize ${failed} weather file(s).`, imported > 0 || created > 0 ? "warning" : "error");
    }
  };

  const handleCreateDefaultWeather = async () => {
    const serverRoot = inferServerRoot(currentFile, projectPath);
    if (!serverRoot) return;
    const filePath = joinWindowsPath(joinWindowsPath(serverRoot, "Weathers"), "Weather_Default.json");
    try {
      await exportAssetFile(filePath, buildDefaultWeatherDoc("Weather_Default"));
      await refreshProjectTreeAndLookup();
    } catch (error) {
      setLookupStatus("error");
      setLookupError(String(error));
    }
  };

  const weathersDirPath = (() => {
    const serverRoot = inferServerRoot(currentFile, projectPath);
    return serverRoot ? joinWindowsPath(serverRoot, "Weathers") : null;
  })();

  const handleLocateWeathers = async () => {
    if (!weathersDirPath) {
      addToast("Cannot determine Server root from the current file path.", "warning");
      return;
    }
    try {
      // Try opening — if it exists this reveals it in Explorer
      await showInFolder(weathersDirPath);
    } catch {
      // Directory doesn't exist — create it with a default weather file first
      addToast("Weathers folder not found. Creating it now with a default weather file...", "info");
      await handleCreateDefaultWeather();
      try { await showInFolder(weathersDirPath); } catch { /* ignore */ }
    }
  };

  const setForecastEntries = (hour: number, entries: WeatherForecastEntry[]) => {
    updateDoc((previous) => ({
      ...previous,
      WeatherForecasts: {
        ...(previous.WeatherForecasts ?? {}),
        [String(hour)]: entries,
      },
    }));
  };

  const updateForecastEntry = (
    hour: number,
    index: number,
    updater: (entry: WeatherForecastEntry) => WeatherForecastEntry,
  ) => {
    setForecastEntries(
      hour,
      readForecastHour(doc, hour).map((entry, entryIndex) => (
        entryIndex === index ? updater(entry) : entry
      )),
    );
  };

  const addForecastEntry = (hour: number) => {
    setForecastEntries(hour, [
      ...readForecastHour(doc, hour),
      {
        WeatherId: weatherOptions[0]?.id ?? "",
        Weight: 100,
      },
    ]);
  };

  const removeForecastEntry = (hour: number, index: number) => {
    setForecastEntries(
      hour,
      readForecastHour(doc, hour).filter((_, entryIndex) => entryIndex !== index),
    );
  };

  const clearForecastHour = (hour: number) => {
    setForecastEntries(hour, []);
  };

  const handleImportForecastWeather = async (weatherId: string, sourcePath: string) => {
    if (!weathersDirPath) {
      addToast("Cannot resolve Server\\Weathers path", "error");
      return;
    }
    try {
      await createDirectory(weathersDirPath);
      const fileName = sourcePath.split(/[/\\]/).pop() ?? `${weatherId}.json`;
      await copyFile(sourcePath, joinWindowsPath(weathersDirPath, fileName));
      await refreshProjectTreeAndLookup();
      addToast(`Imported ${weatherId}`, "success");
    } catch (error) {
      addToast(`Import failed: ${error}`, "error");
    }
  };

  const handleLocateForecastWeather = async (weatherId: string) => {
    const selected = await openFileDialog({
      title: `Locate weather file for "${weatherId}"`,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!selected || typeof selected !== "string") return;
    if (!weathersDirPath) {
      addToast("Cannot resolve Server\\Weathers path", "error");
      return;
    }
    try {
      await createDirectory(weathersDirPath);
      const fileName = selected.split(/[/\\]/).pop() ?? `${weatherId}.json`;
      await copyFile(selected, joinWindowsPath(weathersDirPath, fileName));
      await refreshProjectTreeAndLookup();
      addToast(`Copied ${fileName} into Server\\Weathers`, "success");
    } catch (error) {
      addToast(`Failed to copy file: ${error}`, "error");
    }
  };

  const handleSave = async () => {
    if (!currentFile || !rawJsonContent) return;
    try {
      await writeAssetFile(currentFile, doc);
      setDirty(false);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

  const dominantForecasts = HOURS.map((hour) => {
    const entries = readForecastHour(doc, hour);
    return entries.reduce<WeatherForecastEntry | null>((best, current) => (
      !best || current.Weight > best.Weight ? current : best
    ), null);
  });

  const tagEntries = Object.entries(doc.Tags ?? {});
  const extraEntries = Object.entries(doc).filter(([key]) => (
    !["Parent", "Tags", "WeatherForecasts", "WaterTint", "SpawnDensity", "BlockModificationAllowed", "$Comment"].includes(key)
  ));
  const activeForecasts = [...readForecastHour(doc, previewHour)].sort((left, right) => right.Weight - left.Weight);
  const selectedDaypart = DAYPARTS.find((daypart) => daypart.id === selectedDaypartId) ?? null;
  const uniqueWeatherUsage = collectWeatherUsage(doc);
  const uniqueWeatherIds = [...uniqueWeatherUsage.keys()].sort((left, right) => left.localeCompare(right));
  const daypartSummaries = DAYPARTS.map((daypart) => ({
    ...daypart,
    ...summarizeDaypart(doc, daypart.start, daypart.end),
  }));
  const quickPreviewHours = [
    { label: "Night", hour: 0 },
    { label: "Morning", hour: 8 },
    { label: "Afternoon", hour: 12 },
    { label: "Evening", hour: 18 },
  ] as const;
  const quickPreviewPresetValue = quickPreviewHours.find((preset) => preset.hour === previewHour)?.hour.toString() ?? "custom";
  const primaryForecast = activeForecasts[0] ?? null;

  useEffect(() => {
    if (selectedDaypart) {
      setPreviewHour(selectedDaypart.start);
    }
  }, [selectedDaypart]);

  const environmentIssues = useMemo<EditorCalloutItem[]>(() => {
    const items: EditorCalloutItem[] = [];
    const missingHours = HOURS.filter((hour) => readForecastHour(doc, hour).length === 0);
    const nonPositiveWeights = HOURS.flatMap((hour) => readForecastHour(doc, hour)
      .filter((entry) => entry.Weight <= 0)
      .map((entry) => `${hour}:00 ${entry.WeatherId || "(blank id)"}`));

    if (!doc.Parent?.trim()) {
      items.push({
        severity: "warning",
        title: "Parent environment is missing",
        detail: "Real Hytale assets usually point specialized files at a shared base parent: Env_Zone1_Azure -> Env_Zone1, Env_Zone1_Caves_Forests -> Env_Zone1_Caves, Env_Forgotten_Temple_Exterior -> Env_Forgotten_Temple_Base.",
        fix: suggestedParentEnvironment
          ? {
              label: `Use ${suggestedParentEnvironment}`,
              onFix: () => {
                updateDoc((previous) => ({ ...previous, Parent: suggestedParentEnvironment }));
              },
            }
          : undefined,
      });
    }

    if (missingHours.length === HOURS.length) {
      items.push(doc.Parent?.trim()
        ? {
            severity: "info",
            title: "No local hourly forecasts on this file",
            detail: `This environment likely inherits its WeatherForecasts from parent ${doc.Parent}. Real Hytale assets commonly use parent-driven forecast chains.`,
          }
        : {
            severity: "error",
            title: "No hourly forecasts are configured",
            detail: "Populate WeatherForecasts before relying on this environment file in preview or export.",
          });
    } else if (missingHours.length > 0) {
      items.push({
        severity: "warning",
        title: "Some forecast hours are empty",
        detail: `${missingHours.length} of 24 hours have no weather entries. First gaps: ${missingHours.slice(0, 6).join(", ")}.`,
      });
    }

    if (hytaleOnlyIds.length > 0) {
      items.push({
        severity: "info",
        title: "Referenced weather files are not in this pack yet",
        detail: hytaleOnlyIds.slice(0, 6).join(", "),
        fix: {
          label: "Import files",
          onFix: () => {
            void materializeReferencedWeatherFiles({ importIds: hytaleOnlyIds });
          },
        },
      });
    }

    if (missingIds.length > 0) {
      items.push({
        severity: "warning",
        title: "Some weather IDs do not resolve to files",
        detail: missingIds.slice(0, 6).join(", "),
        fix: {
          label: "Create files",
          onFix: () => {
            void materializeReferencedWeatherFiles({ createIds: missingIds });
          },
        },
      });
    }

    if (nonPositiveWeights.length > 0) {
      items.push({
        severity: "warning",
        title: "Non-positive forecast weights found",
        detail: nonPositiveWeights.slice(0, 5).join(" | "),
      });
    }

    if (lookupStatus === "error") {
      const isNotFound = lookupError?.includes("not found") ?? false;
      items.push({
        severity: isNotFound ? "warning" : "error",
        title: isNotFound ? "Weather directory not found" : "Weather directory lookup failed",
        detail: lookupError ?? "Could not read Server\\Weathers for forecast validation.",
        fix: isNotFound
          ? {
              label: "Create folder",
              onFix: () => {
                void handleCreateDefaultWeather();
              },
            }
          : undefined,
      });
    }

    if (tagEntries.length === 0) {
      items.push({
        severity: "info",
        title: "No environment tags defined",
        detail: "Tags are optional, but adding them makes the file easier to classify alongside real Hytale assets.",
      });
    }

    if (extraEntries.length > 0) {
      items.push({
        severity: "info",
        title: "Additional environment fields detected",
        detail: `${extraEntries.length} fields exist outside the first-class editor surface. Review the raw section before shipping.`,
      });
    }

    return items;
  }, [
    doc,
    extraEntries.length,
    handleCreateDefaultWeather,
    hytaleOnlyIds,
    lookupError,
    lookupStatus,
    materializeReferencedWeatherFiles,
    missingIds,
    suggestedParentEnvironment,
    tagEntries.length,
  ]);

  const displayedForecastHours = useMemo(() => {
    if (forecastScope === "current") {
      return [previewHour];
    }
    if (forecastScope === "daypart" && selectedDaypart) {
      return HOURS.filter((hour) => hour >= selectedDaypart.start && hour <= selectedDaypart.end);
    }
    return HOURS;
  }, [forecastScope, previewHour, selectedDaypart]);

  return (
    <div className="flex h-full flex-col bg-tn-bg">
      <div className="flex shrink-0 items-center justify-between border-b border-tn-border bg-tn-surface px-4 py-2">
        <div>
          <h2 className="text-xs font-semibold text-tn-text">Environment Editor</h2>
          <p className="mt-0.5 text-[10px] text-tn-text-muted">{currentFile?.split(/[/\\]/).pop() ?? "Untitled"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { void handleLocateWeathers(); }}
            disabled={!hasEnvironmentDoc}
            title={weathersDirPath ?? "Locate or create Server\\Weathers folder"}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] shadow-sm transition-colors ${
              !hasEnvironmentDoc
                ? "cursor-not-allowed border-tn-border/40 bg-tn-bg/50 text-tn-text-muted/50"
                : lookupStatus === "ready"
                  ? "border-tn-border/70 bg-tn-bg/70 text-tn-text-muted hover:border-tn-accent/50 hover:text-tn-text"
                  : "border-amber-400/40 bg-amber-400/10 text-amber-300 hover:border-amber-400/70 hover:bg-amber-400/20"
            }`}
          >
            {lookupStatus === "ready" ? <FolderOpen className="h-3.5 w-3.5" /> : <FolderPlus className="h-3.5 w-3.5" />}
            {lookupStatus === "ready" ? "Weathers" : "Create Weathers"}
          </button>
          <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
            isDirty
              ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
              : "border-tn-border/60 bg-tn-bg/60 text-tn-text-muted"
          }`}>
            {isDirty ? "Unsaved changes" : "Saved"}
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasEnvironmentDoc || !currentFile}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] shadow-sm transition-colors ${
              saveStatus === "saved"
                ? "border-green-500/60 bg-green-500/10 text-green-300"
                : saveStatus === "error"
                  ? "border-red-500/60 bg-red-500/10 text-red-300"
                  : "border-tn-border/70 bg-tn-bg/70 text-tn-text hover:border-tn-accent hover:text-tn-accent"
            } ${!hasEnvironmentDoc || !currentFile ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <Save className="h-3.5 w-3.5" />
            {saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Retry Save" : "Save"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 px-4 py-4">
          {!hasEnvironmentDoc && (
            <div className="rounded border border-dashed border-tn-border/50 bg-tn-surface/20 px-4 py-6 text-center text-sm text-tn-text-muted">
              No environment file loaded.
            </div>
          )}
          {hasEnvironmentDoc && (
            <CollapsibleEditorSection
              title="Issue Log"
              description="Validation warnings and info for the loaded environment file."
              badge={environmentIssues.length > 0 ? `${environmentIssues.length}` : undefined}
              open={showIssueLog}
              onToggle={() => setShowIssueLog((v) => !v)}
            >
              <div className="flex flex-col gap-2">
                <EditorCalloutSection
                  title="Issues"
                  items={environmentIssues}
                  emptyState="No obvious environment file problems were detected."
                />
                {isWeatherDirMissing && (
                  <button
                    type="button"
                    onClick={() => { void handleCreateDefaultWeather(); }}
                    className="inline-flex items-center gap-2 self-start rounded border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300 transition-colors hover:border-amber-400/70 hover:bg-amber-400/20"
                  >
                    <WandSparkles className="h-3 w-3" />
                    Create Default Weather
                  </button>
                )}
              </div>
            </CollapsibleEditorSection>
          )}
          <CollapsibleEditorSection
            title="Preview"
            description="Forecast strip, active weather weights, and daypart summaries."
            badge={`${previewHour}:00`}
            open={showPreview}
            onToggle={() => setShowPreview((v) => !v)}
          >
            <div>

                  <div className="mb-3 flex flex-wrap items-center gap-3 rounded border border-tn-border/40 bg-tn-bg/40 px-3 py-2">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted" htmlFor="environment-preview-hour">
                      Preview Hour
                    </label>
                    <input
                      id="environment-preview-hour"
                      type="range"
                      min={0}
                      max={23}
                      step={1}
                      value={previewHour}
                      onChange={(event) => setPreviewHour(Number.parseInt(event.target.value, 10))}
                      className="min-w-[180px] flex-1 accent-tn-accent"
                    />
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted" htmlFor="environment-preview-jump">
                      Jump To
                    </label>
                    <select
                      id="environment-preview-jump"
                      value={quickPreviewPresetValue}
                      onChange={(event) => {
                        if (event.target.value === "custom") return;
                        setPreviewHour(Number.parseInt(event.target.value, 10));
                      }}
                      className="rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] text-tn-text"
                    >
                      <option value="custom">Manual slider</option>
                      {quickPreviewHours.map((preset) => (
                        <option key={preset.label} value={preset.hour}>
                          {preset.label} ({preset.hour}:00)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <div className="rounded border border-tn-border/50 bg-tn-bg/70 p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">Forecast Strip</p>
                          <p className="mt-1 text-[11px] text-tn-text-muted">
                            Weather IDs are loaded directly from `Server\\Weathers`, not guessed from HytaleGenerator.
                          </p>
                        </div>
                        <div className="text-right text-[10px] text-tn-text-muted">
                          {lookupStatus === "ready" && <p>{weatherOptions.length} weather files indexed</p>}
                          {lookupStatus === "loading" && <p>Loading Server\\Weathers...</p>}
                          {lookupStatus === "error" && <p className="text-amber-300">{lookupError ?? "Weather lookup failed."}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-12 gap-1 sm:grid-cols-24">
                        {dominantForecasts.map((forecast, hour) => {
                          const inSelectedDaypart = selectedDaypart ? hour >= selectedDaypart.start && hour <= selectedDaypart.end : false;
                          return (
                            <button
                              key={`timeline-${hour}`}
                              type="button"
                              onClick={() => setPreviewHour(hour)}
                              className={`rounded border transition-transform hover:-translate-y-0.5 ${
                                previewHour === hour || inSelectedDaypart ? "border-tn-accent ring-1 ring-tn-accent/45" : "border-tn-border/50"
                              }`}
                              title={forecast ? `${hour}:00 ${forecast.WeatherId} (${forecast.Weight})` : `${hour}:00 no forecast`}
                            >
                              <div
                                className="h-10 rounded-sm"
                                style={{ backgroundColor: forecast ? hashColor(forecast.WeatherId) : "transparent" }}
                              />
                              <p className="py-1 text-center text-[9px] font-mono text-tn-text-muted">{hour}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                <EnvironmentMetricCard label="Parent" value={doc.Parent ?? "None"} />
                <EnvironmentMetricCard label="Water Tint" value={typeof doc.WaterTint === "string" ? doc.WaterTint : "Unset"} />
                <EnvironmentMetricCard label="Spawn Density" value={typeof doc.SpawnDensity === "number" ? String(doc.SpawnDensity) : "Unset"} />
                <EnvironmentMetricCard
                  label="Block Mod"
                  value={typeof doc.BlockModificationAllowed === "boolean" ? (doc.BlockModificationAllowed ? "Allowed" : "Blocked") : "Unset"}
                />
                <EnvironmentMetricCard label="Tag Groups" value={String(tagEntries.length)} detail={tagEntries.slice(0, 2).map(([key]) => key).join(", ") || "No tags"} />
                <EnvironmentMetricCard label="Unique Weathers" value={String(uniqueWeatherIds.length)} detail={primaryForecast?.WeatherId ?? "No active forecast"} />
              </div>

              <div className="mt-3 rounded border border-tn-border/50 bg-tn-bg/70 p-3">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">Active Forecasts</p>
                    <p className="mt-1 text-[11px] text-tn-text-muted">
                      Full forecast editor for the currently selected preview hour.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                      <span className="rounded border border-tn-border/40 bg-tn-bg/60 px-2 py-1 text-tn-text-muted">
                        Hour {previewHour}:00
                      </span>
                      <span className="rounded border border-tn-border/40 bg-tn-bg/60 px-2 py-1 text-tn-text-muted">
                        {activeForecasts.length} entries
                      </span>
                      <span className="rounded border border-tn-border/40 bg-tn-bg/60 px-2 py-1 text-tn-text-muted">
                        Total weight {activeForecasts.reduce((sum, entry) => sum + entry.Weight, 0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeForecasts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => clearForecastHour(previewHour)}
                        className="rounded border border-tn-border/40 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-tn-text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
                      >
                        Clear Hour
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => addForecastEntry(previewHour)}
                      className="rounded border border-tn-accent/40 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-tn-accent transition-colors hover:bg-tn-accent/10"
                    >
                      Add Weather
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {activeForecasts.length === 0 && (
                    <div className="rounded border border-dashed border-tn-border/50 bg-tn-surface/30 px-3 py-4 text-[11px] text-tn-text-muted">
                      {doc.Parent?.trim()
                        ? `No local weather forecasts configured for this hour. This file may inherit forecasts from ${doc.Parent}.`
                        : "No weather forecasts configured for this hour."}
                    </div>
                  )}
                  {activeForecasts.map((entry, index) => {
                    const weatherPath = weatherPathIndex[entry.WeatherId.toLowerCase()];
                    const isHytale = weatherPath ? isHytaleAssetPath(weatherPath) : false;
                    return (
                      <ForecastEntryEditorCard
                        key={`active-forecast-card-${previewHour}-${index}-${entry.WeatherId}`}
                        entry={entry}
                        index={index}
                        hour={previewHour}
                        projectPath={projectPath}
                        weatherPath={weatherPath}
                        onWeatherIdChange={(weatherId) => updateForecastEntry(previewHour, index, (current) => ({ ...current, WeatherId: weatherId }))}
                        onWeightChange={(weight) => updateForecastEntry(previewHour, index, (current) => ({ ...current, Weight: weight }))}
                        onOpen={() => { if (weatherPath) void openFile(weatherPath); }}
                        onImport={isHytale && weatherPath ? () => { void handleImportForecastWeather(entry.WeatherId, weatherPath); } : undefined}
                        onLocate={!weatherPath ? () => { void handleLocateForecastWeather(entry.WeatherId); } : undefined}
                        onRemove={() => removeForecastEntry(previewHour, index)}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {daypartSummaries.map((daypart) => (
                  <button
                    key={daypart.id}
                    type="button"
                    onClick={() => {
                      setSelectedDaypartId(daypart.id);
                      setPreviewHour(daypart.start);
                    }}
                    className={`rounded border px-3 py-2 text-left transition-colors ${
                      selectedDaypartId === daypart.id
                        ? "border-tn-accent/70 bg-tn-accent/10"
                        : "border-tn-border/50 bg-tn-bg/70 hover:border-tn-accent/40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: daypart.accent }} />
                      <p className="text-[11px] font-medium text-tn-text">{daypart.label}</p>
                    </div>
                    <p className="mt-1 text-[10px] text-tn-text-muted">{daypart.start}:00 - {daypart.end}:00</p>
                    <p className="mt-2 text-[11px] text-tn-text">
                      {daypart.dominantWeatherId ?? "No dominant weather"}
                    </p>
                    <p className="mt-1 text-[10px] text-tn-text-muted">
                      {daypart.uniqueWeatherCount} unique weather, {daypart.totalEntries} entries
                    </p>
                  </button>
                ))}
              </div>

            </div>
          </CollapsibleEditorSection>

          <CollapsibleEditorSection
              title="Overview"
              description="Parent, weather, water tint, spawn density and block modification settings."
              badge={doc.Parent ?? "No parent"}
              open={showOverviewSection}
              onToggle={() => setShowOverviewSection((value) => !value)}
            >
              <datalist id="environment-weather-options">
                {weatherOptions.map((weather) => (
                  <option key={weather.path} value={weather.id} />
                ))}
              </datalist>
              <datalist id="environment-parent-options">
                {environmentParentOptions.map((environmentName) => (
                  <option key={environmentName} value={environmentName} />
                ))}
              </datalist>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[10px] uppercase tracking-wider text-tn-text-muted">Parent</label>
                    {!doc.Parent?.trim() && suggestedParentEnvironment && (
                      <button
                        type="button"
                        onClick={() => updateDoc((previous) => ({ ...previous, Parent: suggestedParentEnvironment }))}
                        className="text-[10px] text-tn-accent transition-colors hover:text-tn-accent/80"
                      >
                        Use {suggestedParentEnvironment}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    list="environment-parent-options"
                    value={doc.Parent ?? ""}
                    onChange={(event) => updateDoc((previous) => ({ ...previous, Parent: event.target.value || undefined }))}
                    className="w-full rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] text-tn-text"
                    placeholder="Env_Zone1"
                  />
                  <p className="text-[10px] text-tn-text-muted">
                    Inherits WeatherForecasts and settings from the parent environment. Hytale usually chains variants to a shared base such as Env_Zone1, Env_Zone1_Caves, or Env_Forgotten_Temple_Base.
                    {!doc.Parent?.trim() && suggestedParentEnvironment ? ` Suggested default: ${suggestedParentEnvironment}.` : ""}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase tracking-wider text-tn-text-muted">Water Tint</label>
                    {"WaterTint" in doc && (
                      <button type="button" onClick={() => updateDoc((previous) => { const next = { ...previous }; delete next.WaterTint; return next; })} className="text-[10px] text-tn-text-muted hover:text-red-400">Remove</button>
                    )}
                  </div>
                  {"WaterTint" in doc ? (
                    <div className="flex items-center gap-2">
                      <label className="relative shrink-0 cursor-pointer">
                        <div className="h-7 w-7 rounded border border-tn-border/70" style={{ backgroundColor: typeof doc.WaterTint === "string" ? doc.WaterTint : "#1983d9" }} />
                        <input type="color" value={typeof doc.WaterTint === "string" ? doc.WaterTint : "#1983d9"} onChange={(event) => updateDoc((previous) => ({ ...previous, WaterTint: event.target.value }))} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                      </label>
                      <input type="text" value={typeof doc.WaterTint === "string" ? doc.WaterTint : ""} onChange={(event) => updateDoc((previous) => ({ ...previous, WaterTint: event.target.value }))} className="min-w-0 flex-1 rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] font-mono text-tn-text" />
                    </div>
                  ) : (
                    <button type="button" onClick={() => updateDoc((previous) => ({ ...previous, WaterTint: "#1983d9" }))} className="w-full rounded border border-dashed border-tn-border/60 px-2 py-2 text-[11px] text-tn-text-muted hover:border-tn-accent hover:text-tn-accent">Add Water Tint</button>
                  )}
                  <p className="text-[10px] text-tn-text-muted">Overrides the water color for this environment.</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase tracking-wider text-tn-text-muted">Spawn Density</label>
                    {"SpawnDensity" in doc && (
                      <button type="button" onClick={() => updateDoc((previous) => { const next = { ...previous }; delete next.SpawnDensity; return next; })} className="text-[10px] text-tn-text-muted hover:text-red-400">Remove</button>
                    )}
                  </div>
                  {"SpawnDensity" in doc ? (
                    <input type="number" step={0.05} value={typeof doc.SpawnDensity === "number" ? doc.SpawnDensity : 0} onChange={(event) => { const value = Number.parseFloat(event.target.value); if (!Number.isFinite(value)) return; updateDoc((previous) => ({ ...previous, SpawnDensity: value })); }} className="w-full rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] font-mono text-right text-tn-text" />
                  ) : (
                    <button type="button" onClick={() => updateDoc((previous) => ({ ...previous, SpawnDensity: 0.3 }))} className="w-full rounded border border-dashed border-tn-border/60 px-2 py-2 text-[11px] text-tn-text-muted hover:border-tn-accent hover:text-tn-accent">Add Spawn Density</button>
                  )}
                  <p className="text-[10px] text-tn-text-muted">Controls how frequently entities spawn in this environment.</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase tracking-wider text-tn-text-muted">Block Modification</label>
                    {"BlockModificationAllowed" in doc && (
                      <button type="button" onClick={() => updateDoc((previous) => { const next = { ...previous }; delete next.BlockModificationAllowed; return next; })} className="text-[10px] text-tn-text-muted hover:text-red-400">Remove</button>
                    )}
                  </div>
                  {"BlockModificationAllowed" in doc ? (
                    <label className="flex items-center justify-between rounded border border-tn-border/40 bg-tn-bg px-2 py-2">
                      <span className="text-[11px] text-tn-text">Block Modification Allowed</span>
                      <input type="checkbox" checked={Boolean(doc.BlockModificationAllowed)} onChange={(event) => updateDoc((previous) => ({ ...previous, BlockModificationAllowed: event.target.checked }))} />
                    </label>
                  ) : (
                    <button type="button" onClick={() => updateDoc((previous) => ({ ...previous, BlockModificationAllowed: false }))} className="w-full rounded border border-dashed border-tn-border/60 px-2 py-2 text-[11px] text-tn-text-muted hover:border-tn-accent hover:text-tn-accent">Add Block Modification Toggle</button>
                  )}
                  <p className="text-[10px] text-tn-text-muted">Whether players can place or break blocks in this environment.</p>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10px] uppercase tracking-wider text-tn-text-muted">Primary Weather @ {previewHour}:00</label>
                    <span className="text-[10px] text-tn-text-muted">{primaryForecast ? "Editing current hour default" : "Will create first entry"}</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_120px]">
                    <input type="text" list="environment-weather-options" value={primaryForecast?.WeatherId ?? ""} onChange={(event) => updateDoc((previous) => { const entries = [...readForecastHour(previous, previewHour)]; if (entries.length === 0) { entries.push({ WeatherId: event.target.value, Weight: 100 }); } else { entries[0] = { ...entries[0], WeatherId: event.target.value }; } return { ...previous, WeatherForecasts: { ...(previous.WeatherForecasts ?? {}), [String(previewHour)]: entries } }; })} className="w-full rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] text-tn-text" placeholder="Zone1_Sunny" />
                    <input type="number" step={1} value={primaryForecast?.Weight ?? 100} onChange={(event) => { const weight = Number.parseFloat(event.target.value); if (!Number.isFinite(weight)) return; updateDoc((previous) => { const entries = [...readForecastHour(previous, previewHour)]; if (entries.length === 0) { entries.push({ WeatherId: weatherOptions[0]?.id ?? "", Weight: weight }); } else { entries[0] = { ...entries[0], Weight: weight }; } return { ...previous, WeatherForecasts: { ...(previous.WeatherForecasts ?? {}), [String(previewHour)]: entries } }; }); }} className="w-full rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] font-mono text-right text-tn-text" />
                  </div>
                  <p className="text-[10px] text-tn-text-muted">Quick-set the top weather entry for the selected preview hour. Use Hourly Forecasts below for full control.</p>
                </div>
              </div>
            </CollapsibleEditorSection>

            <CollapsibleEditorSection
                title="Tags"
                description="Optional tag groups for classifying the environment asset."
                badge={`${tagEntries.length} groups`}
                open={showTagsSection}
                onToggle={() => setShowTagsSection((value) => !value)}
              >
                <div className="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => updateDoc((previous) => ({
                      ...previous,
                      Tags: {
                        ...(previous.Tags ?? {}),
                        NewGroup: [],
                      },
                    }))}
                    className="rounded border border-tn-accent/40 px-2 py-1 text-[10px] text-tn-accent transition-colors hover:bg-tn-accent/10"
                  >
                    Add Tag Group
                  </button>
                </div>
                <div className="space-y-2">
                  {tagEntries.length === 0 && (
                    <p className="text-[11px] text-tn-text-muted">No tag groups on this environment file.</p>
                  )}
                  {tagEntries.map(([group, values], index) => (
                    <div key={`${group}-${index}`} className="rounded border border-tn-border/40 bg-tn-bg p-2">
                      <div className="mb-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={group}
                          onChange={(event) => updateDoc((previous) => {
                            const nextTags: Record<string, string[]> = {};
                            for (const [entryKey, entryValues] of Object.entries(previous.Tags ?? {})) {
                              if (entryKey === group) {
                                nextTags[event.target.value || "NewGroup"] = isStringArray(entryValues) ? entryValues : [];
                              } else {
                                nextTags[entryKey] = isStringArray(entryValues) ? entryValues : [];
                              }
                            }
                            return { ...previous, Tags: nextTags };
                          })}
                          className="min-w-0 flex-1 rounded border border-tn-border bg-tn-surface px-2 py-1 text-[11px] text-tn-text"
                        />
                        <button
                          type="button"
                          onClick={() => updateDoc((previous) => {
                            const nextTags: Record<string, string[]> = {};
                            for (const [entryKey, entryValues] of Object.entries(previous.Tags ?? {})) {
                              if (entryKey !== group) {
                                nextTags[entryKey] = isStringArray(entryValues) ? entryValues : [];
                              }
                            }
                            return { ...previous, Tags: nextTags };
                          })}
                          className="rounded border border-tn-border/60 px-2 py-1 text-[10px] text-tn-text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        type="text"
                        value={Array.isArray(values) ? values.join(", ") : ""}
                        onChange={(event) => updateDoc((previous) => ({
                          ...previous,
                          Tags: {
                            ...(previous.Tags ?? {}),
                            [group]: sanitizeTagValues(event.target.value),
                          },
                        }))}
                        className="w-full rounded border border-tn-border bg-tn-surface px-2 py-1 text-[11px] text-tn-text"
                        placeholder="Plains, Surface, Warm"
                      />
                    </div>
                  ))}
                </div>
              </CollapsibleEditorSection>

          <CollapsibleEditorSection
            title="Hourly Forecasts"
            description="Edit weather IDs and weights without keeping all 24 hour cards expanded at once."
            badge={`${displayedForecastHours.length}/${HOURS.length} hours`}
            open={showForecastSection}
            onToggle={() => setShowForecastSection((value) => !value)}
          >
            <div className="mb-3 rounded border border-tn-border/40 bg-tn-bg/40 px-3 py-3">
              <p className="text-[11px] text-tn-text-muted">
                Each hour card shows the full local forecast setup for that hour: weather ID, weight, file resolution state, and related file actions.
              </p>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted" htmlFor="environment-forecast-scope">
                Scope
              </label>
              <select
                id="environment-forecast-scope"
                value={forecastScope}
                onChange={(event) => setForecastScope(event.target.value as "current" | "daypart" | "all")}
                className="rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] text-tn-text"
              >
                <option value="current">Current Hour</option>
                <option value="daypart">Selected Daypart</option>
                <option value="all">All Hours</option>
              </select>
              {forecastScope === "daypart" && !selectedDaypart && (
                <span className="text-[10px] text-amber-300">Select a daypart card to narrow this view.</span>
              )}
            </div>
            <div className={forecastScope === "current" ? "mx-auto grid w-full max-w-3xl gap-3" : "grid gap-3 xl:grid-cols-2 2xl:grid-cols-3"}>
              {displayedForecastHours.map((hour) => {
                const entries = readForecastHour(doc, hour);
                const totalWeight = entries.reduce((sum, entry) => sum + entry.Weight, 0);
                const hourDaypart = DAYPARTS.find((daypart) => hour >= daypart.start && hour <= daypart.end) ?? null;
                return (
                  <div
                    key={`forecast-${hour}`}
                    className={`rounded border p-3 ${
                      selectedDaypart && hour >= selectedDaypart.start && hour <= selectedDaypart.end
                        ? "border-tn-accent/70 bg-tn-accent/10"
                        : "border-tn-border/40 bg-tn-bg"
                    }`}
                  >
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-semibold text-tn-text">{hour}:00</p>
                          {hourDaypart && (
                            <span
                              className="rounded border px-2 py-0.5 text-[10px] uppercase tracking-wider"
                              style={{
                                borderColor: `${hourDaypart.accent}66`,
                                backgroundColor: `${hourDaypart.accent}1a`,
                                color: hourDaypart.accent,
                              }}
                            >
                              {hourDaypart.label}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                          <span className="rounded border border-tn-border/40 bg-tn-surface/60 px-2 py-1 text-tn-text-muted">
                            {entries.length} entries
                          </span>
                          <span className="rounded border border-tn-border/40 bg-tn-surface/60 px-2 py-1 text-tn-text-muted">
                            Total weight {totalWeight}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {entries.length > 0 && (
                          <button
                            type="button"
                            onClick={() => clearForecastHour(hour)}
                            className="rounded border border-tn-border/40 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-tn-text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
                          >
                            Clear Hour
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => addForecastEntry(hour)}
                          className="rounded border border-tn-accent/40 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-tn-accent transition-colors hover:bg-tn-accent/10"
                        >
                          Add Weather
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {entries.length === 0 && (
                        <div className="rounded border border-dashed border-tn-border/50 bg-tn-surface/30 px-3 py-4 text-[11px] text-tn-text-muted">
                          No local forecasts configured for this hour.
                        </div>
                      )}

                      {entries.map((entry, index) => {
                        const weatherPath = weatherPathIndex[entry.WeatherId.toLowerCase()];
                        const isHytale = weatherPath ? isHytaleAssetPath(weatherPath) : false;
                        return (
                          <ForecastEntryEditorCard
                            key={`forecast-card-${hour}-${index}-${entry.WeatherId}`}
                            entry={entry}
                            index={index}
                            hour={hour}
                            projectPath={projectPath}
                            weatherPath={weatherPath}
                            onWeatherIdChange={(weatherId) => updateForecastEntry(hour, index, (current) => ({ ...current, WeatherId: weatherId }))}
                            onWeightChange={(weight) => updateForecastEntry(hour, index, (current) => ({ ...current, Weight: weight }))}
                            onOpen={() => { if (weatherPath) void openFile(weatherPath); }}
                            onImport={isHytale && weatherPath ? () => { void handleImportForecastWeather(entry.WeatherId, weatherPath); } : undefined}
                            onLocate={!weatherPath ? () => { void handleLocateForecastWeather(entry.WeatherId); } : undefined}
                            onRemove={() => removeForecastEntry(hour, index)}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleEditorSection>

          {extraEntries.length > 0 && (
            <CollapsibleEditorSection
              title="Additional Fields"
              description="Raw environment fields that are not yet represented by dedicated controls."
              badge={`${extraEntries.length} fields`}
              open={showExtraSection}
              onToggle={() => setShowExtraSection((value) => !value)}
            >
              <div className="grid gap-2 md:grid-cols-2">
                {extraEntries.map(([key, value]) => (
                  <div key={key} className="rounded border border-tn-border/40 bg-tn-bg px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">{key}</p>
                    <pre className="mt-2 overflow-auto rounded bg-black/10 p-2 text-[10px] text-tn-text-muted">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </CollapsibleEditorSection>
          )}
        </div>
      </div>
    </div>
  );
}
