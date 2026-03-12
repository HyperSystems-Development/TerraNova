import { useEffect, useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";
import { useTauriIO } from "@/hooks/useTauriIO";
import { listDirectory, writeAssetFile, type DirectoryEntryData } from "@/utils/ipc";

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

export function EnvironmentEditorView() {
  const rawJsonContent = useEditorStore((state) => state.rawJsonContent) as EnvironmentDoc | null;
  const setRawJsonContent = useEditorStore((state) => state.setRawJsonContent);
  const currentFile = useProjectStore((state) => state.currentFile);
  const projectPath = useProjectStore((state) => state.projectPath);
  const isDirty = useProjectStore((state) => state.isDirty);
  const setDirty = useProjectStore((state) => state.setDirty);
  const { openFile } = useTauriIO();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [weatherOptions, setWeatherOptions] = useState<Array<{ id: string; path: string }>>([]);
  const [weatherPathIndex, setWeatherPathIndex] = useState<Record<string, string>>({});
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [lookupError, setLookupError] = useState<string | null>(null);

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

  if (!rawJsonContent) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-tn-text-muted">
        No environment file loaded.
      </div>
    );
  }

  const doc = rawJsonContent;

  const updateDoc = (updater: (previous: EnvironmentDoc) => EnvironmentDoc) => {
    const next = updater(structuredClone(doc));
    setRawJsonContent(next);
    setDirty(true);
    if (saveStatus !== "idle") {
      setSaveStatus("idle");
    }
  };

  const handleSave = async () => {
    if (!currentFile) return;
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

  return (
    <div className="flex h-full flex-col bg-tn-bg">
      <div className="flex shrink-0 items-center justify-between border-b border-tn-border bg-tn-surface px-4 py-2">
        <div>
          <h2 className="text-xs font-semibold text-tn-text">Environment Editor</h2>
          <p className="mt-0.5 text-[10px] text-tn-text-muted">{currentFile?.split(/[/\\]/).pop() ?? "Untitled"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] ${isDirty ? "text-amber-300" : "text-tn-text-muted"}`}>
            {isDirty ? "Unsaved changes" : "Saved"}
          </span>
          <button
            type="button"
            onClick={handleSave}
            className={`rounded border px-3 py-1 text-[11px] transition-colors ${
              saveStatus === "saved"
                ? "border-green-500/50 bg-green-500/10 text-green-300"
                : saveStatus === "error"
                  ? "border-red-500/50 bg-red-500/10 text-red-300"
                  : "border-tn-border text-tn-text hover:border-tn-accent hover:text-tn-accent"
            }`}
          >
            {saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Retry Save" : "Save"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 px-4 py-4">
          <section className="rounded border border-tn-border/60 bg-tn-surface/40 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-tn-text-muted">Weather Timeline</h3>
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
            <div className="flex gap-1 overflow-x-auto pb-1">
              {dominantForecasts.map((forecast, hour) => (
                <div key={`timeline-${hour}`} className="min-w-0 flex-1">
                  <div
                    className="h-10 rounded border border-tn-border/50"
                    style={{ backgroundColor: forecast ? hashColor(forecast.WeatherId) : "transparent" }}
                    title={forecast ? `${hour}:00 ${forecast.WeatherId} (${forecast.Weight})` : `${hour}:00 no forecast`}
                  />
                  <p className="mt-1 text-center text-[9px] font-mono text-tn-text-muted">{hour}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
            <div className="rounded border border-tn-border/60 bg-tn-surface/40 p-3">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-tn-text-muted">Overview</h3>
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
            </div>

            <div className="rounded border border-tn-border/60 bg-tn-surface/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-tn-text-muted">Tags</h3>
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
            </div>
          </section>

          <section className="rounded border border-tn-border/60 bg-tn-surface/40 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-tn-text-muted">Hourly Forecasts</h3>
                <p className="mt-1 text-[11px] text-tn-text-muted">
                  Each hour card is an editable forecast node: weather ID, weight, and quick-open into the matching weather file.
                </p>
              </div>
              <datalist id="environment-weather-options">
                {weatherOptions.map((weather) => (
                  <option key={weather.path} value={weather.id} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
              {HOURS.map((hour) => {
                const entries = readForecastHour(doc, hour);
                const totalWeight = entries.reduce((sum, entry) => sum + entry.Weight, 0);
                return (
                  <div key={`forecast-${hour}`} className="rounded border border-tn-border/40 bg-tn-bg p-3">
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
                          <div key={`${hour}-${index}-${entry.WeatherId}`} className="rounded border border-tn-border/40 bg-tn-surface px-2 py-2">
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
          </section>

          {extraEntries.length > 0 && (
            <section className="rounded border border-tn-border/60 bg-tn-surface/40 p-3">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-tn-text-muted">Additional Fields</h3>
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
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
