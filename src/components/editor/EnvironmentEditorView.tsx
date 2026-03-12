import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Eye, EyeOff, FileJson, Save, Settings2, SlidersHorizontal, Tags, WandSparkles } from "lucide-react";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";
import { useTauriIO } from "@/hooks/useTauriIO";
import { listDirectory, writeAssetFile, type DirectoryEntryData } from "@/utils/ipc";
import { EditorCalloutSection, EditorTipsSection, type EditorCalloutItem } from "./EditorCallouts";
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

function sectionClass(isFocused: boolean): string {
  return `rounded border p-3 transition-colors ${
    isFocused
      ? "border-tn-accent/70 bg-tn-accent/10 shadow-[0_0_0_1px_rgba(100,180,255,0.18)]"
      : "border-tn-border/60 bg-tn-surface/40"
  }`;
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

function EnvironmentMetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded border border-tn-border/50 bg-tn-bg/80 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">{label}</p>
      <p className="mt-1 text-[13px] font-semibold text-tn-text">{value}</p>
      {detail && <p className="mt-1 text-[10px] text-tn-text-muted">{detail}</p>}
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
  const { openFile } = useTauriIO();
  const hasEnvironmentDoc = rawJsonContent !== null;
  const previewSectionRef = useRef<HTMLDivElement | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [weatherOptions, setWeatherOptions] = useState<Array<{ id: string; path: string }>>([]);
  const [weatherPathIndex, setWeatherPathIndex] = useState<Record<string, string>>({});
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [previewHour, setPreviewHour] = useState(12);
  const [selectedDaypartId, setSelectedDaypartId] = useState<(typeof DAYPARTS)[number]["id"] | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showIssueLog, setShowIssueLog] = useState(true);
  const [showTips, setShowTips] = useState(true);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [showOverviewSection, setShowOverviewSection] = useState(true);
  const [showTagsSection, setShowTagsSection] = useState(false);
  const [showForecastSection, setShowForecastSection] = useState(true);
  const [showExtraSection, setShowExtraSection] = useState(false);
  const [forecastScope, setForecastScope] = useState<"current" | "daypart" | "all">("current");

  useEffect(() => {
    let active = true;
    const serverRoot = inferServerRoot(currentFile, projectPath);
    if (!serverRoot) {
      setLookupStatus("error");
      setLookupError("Could not infer the Server root for weather lookup.");
      setWeatherOptions([]);
      setWeatherPathIndex({});
      return () => {
        active = false;
      };
    }

    setLookupStatus("loading");
    setLookupError(null);

    void listDirectory(joinWindowsPath(serverRoot, "Weathers"))
      .then((entries) => {
        if (!active) return;
        const files = collectJsonFiles(entries);
        const nextIndex: Record<string, string> = {};
        for (const file of files) {
          const key = file.id.toLowerCase();
          if (!nextIndex[key]) {
            nextIndex[key] = file.path;
          }
        }
        setWeatherOptions(files);
        setWeatherPathIndex(nextIndex);
        setLookupStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        setWeatherOptions([]);
        setWeatherPathIndex({});
        setLookupStatus("error");
        setLookupError(String(error));
      });

    return () => {
      active = false;
    };
  }, [currentFile, projectPath]);

  const doc = rawJsonContent ?? ({} as EnvironmentDoc);

  const updateDoc = (updater: (previous: EnvironmentDoc) => EnvironmentDoc) => {
    if (!rawJsonContent) return;
    const next = updater(structuredClone(doc));
    setRawJsonContent(next);
    setDirty(true);
    if (saveStatus !== "idle") {
      setSaveStatus("idle");
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
  const detailPanelMode = showIssueLog ? (showTips ? "both" : "issues") : (showTips ? "tips" : "none");
  const primaryForecast = activeForecasts[0] ?? null;

  useEffect(() => {
    if (selectedDaypart) {
      setPreviewHour(selectedDaypart.start);
    }
  }, [selectedDaypart]);

  const environmentIssues = useMemo<EditorCalloutItem[]>(() => {
    const items: EditorCalloutItem[] = [];
    const missingHours = HOURS.filter((hour) => readForecastHour(doc, hour).length === 0);
    const unresolvedWeatherIds = lookupStatus === "ready"
      ? uniqueWeatherIds.filter((weatherId) => !weatherPathIndex[weatherId.toLowerCase()])
      : [];
    const nonPositiveWeights = HOURS.flatMap((hour) => readForecastHour(doc, hour)
      .filter((entry) => entry.Weight <= 0)
      .map((entry) => `${hour}:00 ${entry.WeatherId || "(blank id)"}`));

    if (!doc.Parent?.trim()) {
      items.push({
        severity: "warning",
        title: "Parent environment is missing",
        detail: "Most environment files should inherit from a base Env_* parent so shared settings are not duplicated.",
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

    if (unresolvedWeatherIds.length > 0) {
      items.push({
        severity: "warning",
        title: "Some weather IDs do not resolve to files",
        detail: unresolvedWeatherIds.slice(0, 6).join(", "),
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
      items.push({
        severity: "error",
        title: "Weather directory lookup failed",
        detail: lookupError ?? "Could not read Server\\Weathers for forecast validation.",
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
  }, [doc, extraEntries.length, lookupError, lookupStatus, tagEntries.length, uniqueWeatherIds, weatherPathIndex]);

  const environmentTips = useMemo(() => [
    "Use the daypart cards to jump the preview to a time range and highlight the matching forecast cluster.",
    "The weather ID inputs are backed by the Server\\Weathers datalist, so prefer selecting existing IDs over typing freehand.",
    "Use the Open buttons beside forecast rows to jump directly into the referenced weather file.",
  ], []);
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
            onClick={() => setShowAdvancedControls((value) => !value)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] shadow-sm transition-colors ${
              showAdvancedControls
                ? "border-tn-accent/70 bg-tn-accent/15 text-tn-accent"
                : "border-tn-border/70 bg-tn-bg/70 text-tn-text-muted hover:border-tn-accent/50 hover:text-tn-text"
            }`}
          >
            <WandSparkles className="h-3.5 w-3.5" />
            {showAdvancedControls ? "Hide In-Depth Controls" : "In-Depth Controls"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (showPreview) {
                setShowPreview(false);
                return;
              }
              setShowPreview(true);
              window.requestAnimationFrame(() => {
                previewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              });
            }}
            disabled={!hasEnvironmentDoc}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] shadow-sm transition-colors ${
              !hasEnvironmentDoc
                ? "cursor-not-allowed border-tn-border/40 bg-tn-bg/50 text-tn-text-muted/50"
                : showPreview
                  ? "border-tn-accent/70 bg-tn-accent/10 text-tn-accent"
                  : "border-tn-border/70 bg-tn-bg/70 text-tn-text-muted hover:border-tn-accent/50 hover:text-tn-text"
            }`}
          >
            {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPreview ? "Hide Preview" : "Show Preview"}
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
          {showPreview ? (
            <section>
              <div ref={previewSectionRef} className={sectionClass(false)}>
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">Environment Preview</p>
                      <p className="mt-1 text-[11px] text-tn-text-muted">
                        Forecast strip, active weather weights, and daypart summaries for the selected hour.
                      </p>
                    </div>
                    <span className="rounded-full border border-tn-border/50 bg-tn-bg/60 px-2 py-0.5 text-[10px] font-mono text-tn-text-muted">
                      {previewHour}:00
                    </span>
                  </div>

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
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">Active Forecasts</p>
                    <p className="mt-1 text-[11px] text-tn-text-muted">
                      Weighted weather entries for {previewHour}:00.
                    </p>
                  </div>
                  <p className="text-[10px] text-tn-text-muted">{activeForecasts.length} entries</p>
                </div>
                <div className="space-y-2">
                  {activeForecasts.length === 0 && (
                    <p className="text-[11px] text-tn-text-muted">
                      {doc.Parent?.trim()
                        ? `No local weather forecasts configured for this hour. This file may inherit forecasts from ${doc.Parent}.`
                        : "No weather forecasts configured for this hour."}
                    </p>
                  )}
                  {activeForecasts.map((entry) => {
                    const weatherPath = weatherPathIndex[entry.WeatherId.toLowerCase()];
                    const maxWeight = activeForecasts[0]?.Weight ?? 1;
                    return (
                      <div
                        key={`${previewHour}-${entry.WeatherId}`}
                        className="rounded border border-tn-border/40 bg-tn-bg/70 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: hashColor(entry.WeatherId) }} />
                              <p className="truncate text-[11px] font-medium text-tn-text">{entry.WeatherId}</p>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-black/20">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.max(8, (entry.Weight / Math.max(1, maxWeight)) * 100)}%`,
                                  backgroundColor: hashColor(entry.WeatherId),
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-[10px] font-mono text-tn-text-muted">{entry.Weight}</span>
                            <button
                              type="button"
                              onClick={() => weatherPath && openFile(weatherPath)}
                              disabled={!weatherPath}
                              className={`rounded border px-2 py-1 text-[10px] transition-colors ${
                                weatherPath
                                  ? "border-tn-border text-tn-text-muted hover:border-tn-accent hover:text-tn-accent"
                                  : "cursor-not-allowed border-tn-border/40 text-tn-text-muted/50"
                              }`}
                            >
                              Open
                            </button>
                          </div>
                        </div>
                      </div>
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

              {showAdvancedControls ? (
                <>
                  <div className="mt-3 mb-3 flex flex-wrap items-center gap-2">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted" htmlFor="environment-detail-panels">
                      Detail Panels
                    </label>
                    <select
                      id="environment-detail-panels"
                      value={detailPanelMode}
                      onChange={(event) => {
                        const nextMode = event.target.value;
                        setShowIssueLog(nextMode === "both" || nextMode === "issues");
                        setShowTips(nextMode === "both" || nextMode === "tips");
                      }}
                      className="rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] text-tn-text"
                    >
                      <option value="both">Issue log + tips</option>
                      <option value="issues">Issue log only</option>
                      <option value="tips">Tips only</option>
                      <option value="none">Hide both</option>
                    </select>
                  </div>

                  {showIssueLog || showTips ? (
                    <div className={`mb-3 grid gap-3 ${showIssueLog && showTips ? "xl:grid-cols-[1.15fr_0.85fr]" : ""}`}>
                      {showIssueLog && (
                        <EditorCalloutSection
                          title="Issue Log"
                          items={environmentIssues}
                          emptyState="No obvious environment file problems were detected in the current forecast model."
                        />
                      )}
                      {showTips && <EditorTipsSection title="Tips" tips={environmentTips} />}
                    </div>
                  ) : (
                    <div className="mb-3 rounded border border-dashed border-tn-border/50 bg-tn-surface/20 px-3 py-2 text-[11px] text-tn-text-muted">
                      Issue log and tips are hidden.
                    </div>
                  )}
                </>
              ) : null}
              </div>
            </section>
          ) : (
            <section>
              <div ref={previewSectionRef} className={sectionClass(false)}>
                <div className="flex min-h-[120px] items-center justify-center rounded border border-dashed border-tn-border/50 bg-tn-surface/20 px-4 py-6 text-center text-[11px] text-tn-text-muted">
                  Preview hidden. Use <span className="mx-1 font-medium text-tn-text">Show Preview</span> in the header to bring it back without shoving the rest of the editor upward.
                </div>
              </div>
            </section>
          )}

          <section className="grid gap-3 lg:grid-cols-2">
            <section className="rounded-lg border border-tn-border/70 bg-tn-surface/45 px-3.5 py-3.5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-tn-border/50 bg-tn-bg/70 text-tn-accent">
                    <SlidersHorizontal className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tn-text">Simple Controls</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-tn-text-muted">
                      Simple defaults for the environment file. Use In-Depth Controls for tags and deeper file edits.
                    </p>
                  </div>
                </div>
                <span className="rounded border border-tn-border/50 bg-tn-bg/60 px-2 py-0.5 text-[10px] font-mono text-tn-text-muted">
                  {previewHour}:00
                </span>
              </div>
              <datalist id="environment-weather-options">
                {weatherOptions.map((weather) => (
                  <option key={weather.path} value={weather.id} />
                ))}
              </datalist>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2 rounded border border-tn-border/40 bg-tn-bg/70 px-3 py-2">
                  <label className="block text-[10px] uppercase tracking-wider text-tn-text-muted">Parent</label>
                  <input
                    type="text"
                    value={doc.Parent ?? ""}
                    onChange={(event) => updateDoc((previous) => ({ ...previous, Parent: event.target.value || undefined }))}
                    className="w-full rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] text-tn-text"
                    placeholder="Env_Zone1"
                  />
                </div>

                <div className="space-y-2 rounded border border-tn-border/40 bg-tn-bg/70 px-3 py-2">
                  <label className="block text-[10px] uppercase tracking-wider text-tn-text-muted">Water Tint</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={typeof doc.WaterTint === "string" ? doc.WaterTint : "#1983d9"}
                      onChange={(event) => updateDoc((previous) => ({ ...previous, WaterTint: event.target.value }))}
                      className="h-8 w-10 shrink-0 cursor-pointer rounded border border-tn-border/70 bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={typeof doc.WaterTint === "string" ? doc.WaterTint : ""}
                      onChange={(event) => updateDoc((previous) => ({ ...previous, WaterTint: event.target.value }))}
                      className="min-w-0 flex-1 rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] font-mono text-tn-text"
                      placeholder="#1983d9"
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded border border-tn-border/40 bg-tn-bg/70 px-3 py-2">
                  <label className="block text-[10px] uppercase tracking-wider text-tn-text-muted">Spawn Density</label>
                  <input
                    type="number"
                    step={0.05}
                    value={typeof doc.SpawnDensity === "number" ? doc.SpawnDensity : 0.3}
                    onChange={(event) => {
                      const value = Number.parseFloat(event.target.value);
                      if (!Number.isFinite(value)) return;
                      updateDoc((previous) => ({ ...previous, SpawnDensity: value }));
                    }}
                    className="w-full rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] font-mono text-right text-tn-text"
                  />
                </div>

                <label className="flex items-center justify-between rounded border border-tn-border/40 bg-tn-bg/70 px-3 py-2">
                  <span className="text-[11px] text-tn-text">Block Modification Allowed</span>
                  <input
                    type="checkbox"
                    checked={Boolean(doc.BlockModificationAllowed)}
                    onChange={(event) => updateDoc((previous) => ({ ...previous, BlockModificationAllowed: event.target.checked }))}
                  />
                </label>

                <div className="space-y-2 rounded border border-tn-border/40 bg-tn-bg/70 px-3 py-2 md:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10px] uppercase tracking-wider text-tn-text-muted">Primary Weather @ {previewHour}:00</label>
                    <span className="text-[10px] text-tn-text-muted">{primaryForecast ? "Current hour default" : "Creates first entry"}</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_120px]">
                    <input
                      type="text"
                      list="environment-weather-options"
                      value={primaryForecast?.WeatherId ?? ""}
                      onChange={(event) => updateDoc((previous) => {
                        const entries = [...readForecastHour(previous, previewHour)];
                        if (entries.length === 0) {
                          entries.push({ WeatherId: event.target.value, Weight: 100 });
                        } else {
                          entries[0] = { ...entries[0], WeatherId: event.target.value };
                        }
                        return {
                          ...previous,
                          WeatherForecasts: {
                            ...(previous.WeatherForecasts ?? {}),
                            [String(previewHour)]: entries,
                          },
                        };
                      })}
                      className="w-full rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] text-tn-text"
                      placeholder="Zone1_Sunny"
                    />
                    <input
                      type="number"
                      step={1}
                      value={primaryForecast?.Weight ?? 100}
                      onChange={(event) => {
                        const weight = Number.parseFloat(event.target.value);
                        if (!Number.isFinite(weight)) return;
                        updateDoc((previous) => {
                          const entries = [...readForecastHour(previous, previewHour)];
                          if (entries.length === 0) {
                            entries.push({ WeatherId: weatherOptions[0]?.id ?? "", Weight: weight });
                          } else {
                            entries[0] = { ...entries[0], Weight: weight };
                          }
                          return {
                            ...previous,
                            WeatherForecasts: {
                              ...(previous.WeatherForecasts ?? {}),
                              [String(previewHour)]: entries,
                            },
                          };
                        });
                      }}
                      className="w-full rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] font-mono text-right text-tn-text"
                    />
                  </div>
                </div>
              </div>
            </section>

            {showAdvancedControls && (
            <CollapsibleEditorSection
              title="Overview"
              description="Parent environment and top-level file settings."
              badge={doc.Parent ?? "No parent"}
              icon={<Settings2 className="h-4 w-4" />}
              open={showOverviewSection}
              onToggle={() => setShowOverviewSection((value) => !value)}
            >
              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-tn-text-muted">Parent</label>
                  <input
                    type="text"
                    value={doc.Parent ?? ""}
                    onChange={(event) => updateDoc((previous) => ({ ...previous, Parent: event.target.value || undefined }))}
                    className="w-full rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] text-tn-text"
                    placeholder="Env_Zone1"
                  />
                </div>

                {"WaterTint" in doc ? (
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-wider text-tn-text-muted">Water Tint</label>
                      <button
                        type="button"
                        onClick={() => updateDoc((previous) => {
                          const next = { ...previous };
                          delete next.WaterTint;
                          return next;
                        })}
                        className="text-[10px] text-tn-text-muted transition-colors hover:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="relative shrink-0 cursor-pointer">
                        <div
                          className="h-7 w-7 rounded border border-tn-border/70"
                          style={{ backgroundColor: typeof doc.WaterTint === "string" ? doc.WaterTint : "#1983d9" }}
                        />
                        <input
                          type="color"
                          value={typeof doc.WaterTint === "string" ? doc.WaterTint : "#1983d9"}
                          onChange={(event) => updateDoc((previous) => ({ ...previous, WaterTint: event.target.value }))}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                      </label>
                      <input
                        type="text"
                        value={typeof doc.WaterTint === "string" ? doc.WaterTint : ""}
                        onChange={(event) => updateDoc((previous) => ({ ...previous, WaterTint: event.target.value }))}
                        className="min-w-0 flex-1 rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] font-mono text-tn-text"
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateDoc((previous) => ({ ...previous, WaterTint: "#1983d9" }))}
                    className="w-full rounded border border-dashed border-tn-border/60 px-2 py-2 text-[11px] text-tn-text-muted transition-colors hover:border-tn-accent hover:text-tn-accent"
                  >
                    Add Water Tint
                  </button>
                )}

                {"SpawnDensity" in doc ? (
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-wider text-tn-text-muted">Spawn Density</label>
                      <button
                        type="button"
                        onClick={() => updateDoc((previous) => {
                          const next = { ...previous };
                          delete next.SpawnDensity;
                          return next;
                        })}
                        className="text-[10px] text-tn-text-muted transition-colors hover:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="number"
                      step={0.05}
                      value={typeof doc.SpawnDensity === "number" ? doc.SpawnDensity : 0}
                      onChange={(event) => {
                        const value = Number.parseFloat(event.target.value);
                        if (!Number.isFinite(value)) return;
                        updateDoc((previous) => ({ ...previous, SpawnDensity: value }));
                      }}
                      className="w-full rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] font-mono text-right text-tn-text"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateDoc((previous) => ({ ...previous, SpawnDensity: 0.3 }))}
                    className="w-full rounded border border-dashed border-tn-border/60 px-2 py-2 text-[11px] text-tn-text-muted transition-colors hover:border-tn-accent hover:text-tn-accent"
                  >
                    Add Spawn Density
                  </button>
                )}

                {"BlockModificationAllowed" in doc ? (
                  <label className="flex items-center justify-between rounded border border-tn-border/40 bg-tn-bg px-2 py-2">
                    <span className="text-[11px] text-tn-text">Block Modification Allowed</span>
                    <input
                      type="checkbox"
                      checked={Boolean(doc.BlockModificationAllowed)}
                      onChange={(event) => updateDoc((previous) => ({ ...previous, BlockModificationAllowed: event.target.checked }))}
                    />
                  </label>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateDoc((previous) => ({ ...previous, BlockModificationAllowed: false }))}
                    className="w-full rounded border border-dashed border-tn-border/60 px-2 py-2 text-[11px] text-tn-text-muted transition-colors hover:border-tn-accent hover:text-tn-accent"
                  >
                    Add Block Modification Toggle
                  </button>
                )}
              </div>
            </CollapsibleEditorSection>
            )}

            {showAdvancedControls && (
              <CollapsibleEditorSection
                title="Tags"
                description="Optional tag groups for classifying the environment asset."
                badge={`${tagEntries.length} groups`}
                icon={<Tags className="h-4 w-4" />}
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
            )}
          </section>

          <CollapsibleEditorSection
            title="Hourly Forecasts"
            description="Edit weather IDs and weights without keeping all 24 hour cards expanded at once."
            badge={`${displayedForecastHours.length}/${HOURS.length} hours`}
            icon={<CalendarClock className="h-4 w-4" />}
            open={showForecastSection}
            onToggle={() => setShowForecastSection((value) => !value)}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="mt-1 text-[11px] text-tn-text-muted">
                  Each hour card is an editable forecast node: weather ID, weight, and quick-open into the matching weather file.
                </p>
              </div>
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
            <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
              {displayedForecastHours.map((hour) => {
                const entries = readForecastHour(doc, hour);
                const totalWeight = entries.reduce((sum, entry) => sum + entry.Weight, 0);
                return (
                  <div
                    key={`forecast-${hour}`}
                    className={`rounded border p-3 ${
                      selectedDaypart && hour >= selectedDaypart.start && hour <= selectedDaypart.end
                        ? "border-tn-accent/70 bg-tn-accent/10"
                        : "border-tn-border/40 bg-tn-bg"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-medium text-tn-text">{hour}:00</p>
                        <p className="text-[10px] text-tn-text-muted">Total weight: {totalWeight}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateDoc((previous) => ({
                          ...previous,
                          WeatherForecasts: {
                            ...(previous.WeatherForecasts ?? {}),
                            [String(hour)]: [
                              ...readForecastHour(previous, hour),
                              {
                                WeatherId: weatherOptions[0]?.id ?? "",
                                Weight: 100,
                              },
                            ],
                          },
                        }))}
                        className="rounded border border-tn-accent/40 px-2 py-1 text-[10px] text-tn-accent transition-colors hover:bg-tn-accent/10"
                      >
                        Add Weather
                      </button>
                    </div>

                    <div className="space-y-2">
                      {entries.length === 0 && (
                        <p className="text-[11px] text-tn-text-muted">No forecasts configured for this hour.</p>
                      )}

                      {entries.map((entry, index) => {
                        const weatherPath = weatherPathIndex[entry.WeatherId.toLowerCase()];
                        return (
                          <div
                            key={`${hour}-${index}-${entry.WeatherId}`}
                            className="rounded border border-tn-border/40 bg-tn-surface px-2 py-2"
                          >
                            <div className="flex items-start gap-2">
                              <div
                                className="mt-1 h-3 w-3 shrink-0 rounded-full"
                                style={{ backgroundColor: hashColor(entry.WeatherId || `hour-${hour}-${index}`) }}
                              />
                              <div className="min-w-0 flex-1 space-y-2">
                                <input
                                  type="text"
                                  list="environment-weather-options"
                                  value={entry.WeatherId}
                                  onChange={(event) => updateDoc((previous) => ({
                                    ...previous,
                                    WeatherForecasts: {
                                      ...(previous.WeatherForecasts ?? {}),
                                      [String(hour)]: readForecastHour(previous, hour).map((item, itemIndex) => (
                                        itemIndex === index ? { ...item, WeatherId: event.target.value } : item
                                      )),
                                    },
                                  }))}
                                  className="w-full rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] text-tn-text"
                                  placeholder="Zone1_Sunny"
                                />
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    step={1}
                                    value={entry.Weight}
                                    onChange={(event) => {
                                      const weight = Number.parseFloat(event.target.value);
                                      if (!Number.isFinite(weight)) return;
                                      updateDoc((previous) => ({
                                        ...previous,
                                        WeatherForecasts: {
                                          ...(previous.WeatherForecasts ?? {}),
                                          [String(hour)]: readForecastHour(previous, hour).map((item, itemIndex) => (
                                            itemIndex === index ? { ...item, Weight: weight } : item
                                          )),
                                        },
                                      }));
                                    }}
                                    className="w-20 rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] font-mono text-right text-tn-text"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => weatherPath && openFile(weatherPath)}
                                    disabled={!weatherPath}
                                    className={`rounded border px-2 py-1 text-[10px] transition-colors ${
                                      weatherPath
                                        ? "border-tn-border text-tn-text-muted hover:border-tn-accent hover:text-tn-accent"
                                        : "cursor-not-allowed border-tn-border/40 text-tn-text-muted/50"
                                    }`}
                                  >
                                    Open
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateDoc((previous) => ({
                                      ...previous,
                                      WeatherForecasts: {
                                        ...(previous.WeatherForecasts ?? {}),
                                        [String(hour)]: readForecastHour(previous, hour).filter((_, itemIndex) => itemIndex !== index),
                                      },
                                    }))}
                                    className="rounded border border-tn-border/60 px-2 py-1 text-[10px] text-tn-text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleEditorSection>

          {showAdvancedControls && extraEntries.length > 0 && (
            <CollapsibleEditorSection
              title="Additional Fields"
              description="Raw environment fields that are not yet represented by dedicated controls."
              badge={`${extraEntries.length} fields`}
              icon={<FileJson className="h-4 w-4" />}
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
