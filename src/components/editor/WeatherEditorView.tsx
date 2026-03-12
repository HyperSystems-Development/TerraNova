import { useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";
import { writeAssetFile } from "@/utils/ipc";

interface HourColor {
  Hour: number;
  Color: string;
}

interface HourValue {
  Hour: number;
  Value: number;
}

interface CloudLayer {
  Texture?: string;
  Colors?: HourColor[];
  Speeds?: HourValue[];
}

interface MoonEntry {
  Day?: number;
  Texture?: string;
}

interface WeatherDoc extends Record<string, unknown> {
  Stars?: string;
  Moons?: MoonEntry[];
  Clouds?: CloudLayer[];
  Particle?: unknown;
  FogDistance?: [number, number];
  Tags?: Record<string, string[]>;
}

const HOURS = Array.from({ length: 24 }, (_, index) => index);

const COLOR_TRACKS = [
  { key: "SkyTopColors", label: "Sky Top" },
  { key: "SkyBottomColors", label: "Sky Bottom" },
  { key: "SkySunsetColors", label: "Sunset" },
  { key: "FogColors", label: "Fog" },
  { key: "SunColors", label: "Sun" },
  { key: "SunGlowColors", label: "Sun Glow" },
  { key: "MoonColors", label: "Moon" },
  { key: "MoonGlowColors", label: "Moon Glow" },
  { key: "SunlightColors", label: "Sunlight" },
  { key: "ScreenEffectColors", label: "Screen FX" },
  { key: "WaterTints", label: "Water" },
] as const;

const VALUE_TRACKS = [
  { key: "SunScales", label: "Sun Scale" },
  { key: "MoonScales", label: "Moon Scale" },
  { key: "FogDensities", label: "Fog Density" },
  { key: "FogHeightFalloffs", label: "Fog Height Falloff" },
  { key: "SunlightDampingMultipliers", label: "Sunlight Damping" },
] as const;

const KNOWN_KEYS = new Set<string>([
  ...COLOR_TRACKS.map((track) => track.key),
  ...VALUE_TRACKS.map((track) => track.key),
  "Stars",
  "Moons",
  "Clouds",
  "FogDistance",
  "Particle",
  "FogOptions",
  "ColorFilters",
  "ScreenEffect",
  "Parent",
  "Tags",
  "$Comment",
]);

type ColorTrackKey = (typeof COLOR_TRACKS)[number]["key"];
type ValueTrackKey = (typeof VALUE_TRACKS)[number]["key"];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readHexColor(color: string): string {
  const match = color.match(/#([0-9a-fA-F]{6})/);
  return match ? `#${match[1]}` : "#888888";
}

function readAlpha(color: string): number {
  const match = color.match(/rgba\(#[0-9a-fA-F]{6},\s*([\d.]+)\)/i);
  return match ? clamp(Number.parseFloat(match[1]), 0, 1) : 1;
}

function buildColorString(hex: string, alpha: number): string {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#888888";
  const safeAlpha = clamp(alpha, 0, 1);
  if (safeAlpha >= 0.999) {
    return normalized;
  }
  return `rgba(${normalized}, ${safeAlpha.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")})`;
}

function lerpHex(start: string, end: string, amount: number): string {
  const t = clamp(amount, 0, 1);
  const startR = Number.parseInt(start.slice(1, 3), 16);
  const startG = Number.parseInt(start.slice(3, 5), 16);
  const startB = Number.parseInt(start.slice(5, 7), 16);
  const endR = Number.parseInt(end.slice(1, 3), 16);
  const endG = Number.parseInt(end.slice(3, 5), 16);
  const endB = Number.parseInt(end.slice(5, 7), 16);
  const red = Math.round(startR + ((endR - startR) * t));
  const green = Math.round(startG + ((endG - startG) * t));
  const blue = Math.round(startB + ((endB - startB) * t));
  return `#${red.toString(16).padStart(2, "0")}${green.toString(16).padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`;
}

function interpolateColor(keyframes: HourColor[], hour: number): string {
  if (keyframes.length === 0) {
    return "#1f2937";
  }

  const sorted = [...keyframes].sort((left, right) => left.Hour - right.Hour);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (hour <= first.Hour) {
    return readHexColor(first.Color);
  }
  if (hour >= last.Hour) {
    return readHexColor(last.Color);
  }

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index];
    const end = sorted[index + 1];
    if (hour >= start.Hour && hour <= end.Hour) {
      const span = Math.max(1, end.Hour - start.Hour);
      return lerpHex(readHexColor(start.Color), readHexColor(end.Color), (hour - start.Hour) / span);
    }
  }

  return readHexColor(last.Color);
}

function interpolateValue(keyframes: HourValue[], hour: number): number {
  if (keyframes.length === 0) {
    return 0;
  }

  const sorted = [...keyframes].sort((left, right) => left.Hour - right.Hour);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (hour <= first.Hour) {
    return first.Value;
  }
  if (hour >= last.Hour) {
    return last.Value;
  }

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index];
    const end = sorted[index + 1];
    if (hour >= start.Hour && hour <= end.Hour) {
      const span = Math.max(1, end.Hour - start.Hour);
      return start.Value + (((end.Value - start.Value) * (hour - start.Hour)) / span);
    }
  }

  return last.Value;
}

function describeValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (isRecord(value)) {
    return `${Object.keys(value).length} field${Object.keys(value).length === 1 ? "" : "s"}`;
  }
  return "Unsupported value";
}

function normalizeHour(value: number): number {
  return clamp(Math.round(value), 0, 23);
}

interface ColorTrackCardProps {
  label: string;
  keyframes: HourColor[];
  onChange: (index: number, next: HourColor) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

function ColorTrackCard({ label, keyframes, onChange, onRemove, onAdd }: ColorTrackCardProps) {
  const entries = keyframes
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => left.entry.Hour - right.entry.Hour);
  const gradient = keyframes.length
    ? HOURS.map((hour) => `${interpolateColor(keyframes, hour)} ${(hour / 23) * 100}%`).join(", ")
    : "transparent";

  return (
    <div className="rounded border border-tn-border/60 bg-tn-surface/40">
      <div className="border-b border-tn-border/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <div
            className="h-5 flex-1 rounded border border-tn-border/40"
            style={{ background: keyframes.length ? `linear-gradient(to right, ${gradient})` : "transparent" }}
          />
          <span className="w-24 shrink-0 text-[11px] font-medium text-tn-text">{label}</span>
          <span className="w-12 shrink-0 text-right text-[10px] text-tn-text-muted">{keyframes.length} keys</span>
        </div>
      </div>
      <div className="space-y-2 px-3 py-3">
        {entries.map(({ entry, index }) => (
          <div key={`${entry.Hour}-${index}`} className="flex items-center gap-2">
            <label className="relative shrink-0 cursor-pointer" title="Pick color">
              <div
                className="h-7 w-7 rounded border border-tn-border/70 shadow-sm"
                style={{ backgroundColor: readHexColor(entry.Color) }}
              />
              <input
                type="color"
                value={readHexColor(entry.Color)}
                onChange={(event) => {
                  onChange(index, {
                    ...entry,
                    Color: buildColorString(event.target.value, readAlpha(entry.Color)),
                  });
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <input
              type="text"
              value={entry.Color}
              onChange={(event) => onChange(index, { ...entry, Color: event.target.value })}
              className="min-w-0 flex-1 rounded border border-tn-border bg-tn-bg px-2 py-1 text-[10px] font-mono text-tn-text"
            />
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={readAlpha(entry.Color)}
              onChange={(event) => {
                const alpha = Number.parseFloat(event.target.value);
                if (!Number.isFinite(alpha)) return;
                onChange(index, {
                  ...entry,
                  Color: buildColorString(readHexColor(entry.Color), alpha),
                });
              }}
              className="w-14 shrink-0 rounded border border-tn-border bg-tn-bg px-1.5 py-1 text-[10px] font-mono text-right text-tn-text"
              title="Alpha"
            />
            <input
              type="number"
              min={0}
              max={23}
              step={1}
              value={entry.Hour}
              onChange={(event) => {
                const hour = Number.parseInt(event.target.value, 10);
                if (!Number.isFinite(hour)) return;
                onChange(index, { ...entry, Hour: normalizeHour(hour) });
              }}
              className="w-14 shrink-0 rounded border border-tn-border bg-tn-bg px-1.5 py-1 text-[10px] font-mono text-right text-tn-text"
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="shrink-0 rounded border border-tn-border/60 px-2 py-1 text-[10px] text-tn-text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
              title="Remove keyframe"
            >
              x
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="w-full rounded border border-tn-accent/40 px-2 py-1 text-[10px] text-tn-accent transition-colors hover:bg-tn-accent/10"
        >
          Add keyframe
        </button>
      </div>
    </div>
  );
}

interface ValueTrackCardProps {
  label: string;
  keyframes: HourValue[];
  onChange: (index: number, next: HourValue) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

function ValueTrackCard({ label, keyframes, onChange, onRemove, onAdd }: ValueTrackCardProps) {
  const entries = keyframes
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => left.entry.Hour - right.entry.Hour);
  const samples = HOURS.map((hour) => interpolateValue(keyframes, hour));
  const minValue = samples.length ? Math.min(...samples) : 0;
  const maxValue = samples.length ? Math.max(...samples) : 0;
  const span = Math.max(1, maxValue - minValue);

  return (
    <div className="rounded border border-tn-border/60 bg-tn-surface/40">
      <div className="border-b border-tn-border/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 flex-1 items-end gap-px rounded border border-tn-border/40 bg-tn-bg px-1 py-1">
            {samples.map((sample, index) => {
              const normalized = ((sample - minValue) / span) * 100;
              return (
                <div
                  key={`${label}-${index}`}
                  className="flex-1 rounded-sm bg-tn-accent/60"
                  style={{ height: `${Math.max(12, normalized || 0)}%` }}
                />
              );
            })}
          </div>
          <span className="w-24 shrink-0 text-[11px] font-medium text-tn-text">{label}</span>
          <span className="w-12 shrink-0 text-right text-[10px] text-tn-text-muted">{keyframes.length} keys</span>
        </div>
      </div>
      <div className="space-y-2 px-3 py-3">
        {entries.map(({ entry, index }) => (
          <div key={`${entry.Hour}-${index}`} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-right text-[10px] font-mono text-tn-text-muted">{entry.Hour}:00</span>
            <input
              type="number"
              min={0}
              max={23}
              step={1}
              value={entry.Hour}
              onChange={(event) => {
                const hour = Number.parseInt(event.target.value, 10);
                if (!Number.isFinite(hour)) return;
                onChange(index, { ...entry, Hour: normalizeHour(hour) });
              }}
              className="w-14 shrink-0 rounded border border-tn-border bg-tn-bg px-1.5 py-1 text-[10px] font-mono text-right text-tn-text"
            />
            <input
              type="number"
              step={0.05}
              value={entry.Value}
              onChange={(event) => {
                const value = Number.parseFloat(event.target.value);
                if (!Number.isFinite(value)) return;
                onChange(index, { ...entry, Value: value });
              }}
              className="min-w-0 flex-1 rounded border border-tn-border bg-tn-bg px-2 py-1 text-[10px] font-mono text-right text-tn-text"
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="shrink-0 rounded border border-tn-border/60 px-2 py-1 text-[10px] text-tn-text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
              title="Remove keyframe"
            >
              x
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="w-full rounded border border-tn-accent/40 px-2 py-1 text-[10px] text-tn-accent transition-colors hover:bg-tn-accent/10"
        >
          Add keyframe
        </button>
      </div>
    </div>
  );
}

export function WeatherEditorView() {
  const rawJsonContent = useEditorStore((state) => state.rawJsonContent) as WeatherDoc | null;
  const setRawJsonContent = useEditorStore((state) => state.setRawJsonContent);
  const currentFile = useProjectStore((state) => state.currentFile);
  const isDirty = useProjectStore((state) => state.isDirty);
  const setDirty = useProjectStore((state) => state.setDirty);
  const [previewHour, setPreviewHour] = useState(12);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  if (!rawJsonContent) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-tn-text-muted">
        No weather file loaded.
      </div>
    );
  }

  const doc = rawJsonContent;

  const updateDoc = (updater: (previous: WeatherDoc) => WeatherDoc) => {
    const next = updater(structuredClone(doc));
    setRawJsonContent(next);
    setDirty(true);
    if (saveStatus !== "idle") {
      setSaveStatus("idle");
    }
  };

  const updateColorTrack = (trackKey: ColorTrackKey, next: HourColor[]) => {
    updateDoc((previous) => ({ ...previous, [trackKey]: next }));
  };

  const updateValueTrack = (trackKey: ValueTrackKey, next: HourValue[]) => {
    updateDoc((previous) => ({ ...previous, [trackKey]: next }));
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

  const skyTop = interpolateColor((doc.SkyTopColors as HourColor[] | undefined) ?? [], previewHour) || "#28405a";
  const skyBottom = interpolateColor((doc.SkyBottomColors as HourColor[] | undefined) ?? [], previewHour) || "#0f172a";
  const fogColor = interpolateColor((doc.FogColors as HourColor[] | undefined) ?? [], previewHour) || "#223142";
  const sunColor = interpolateColor((doc.SunColors as HourColor[] | undefined) ?? [], previewHour) || "#fbbf24";
  const extraEntries = Object.entries(doc).filter(([key]) => !KNOWN_KEYS.has(key));

  return (
    <div className="flex h-full flex-col bg-tn-bg">
      <div className="flex shrink-0 items-center justify-between border-b border-tn-border bg-tn-surface px-4 py-2">
        <div>
          <h2 className="text-xs font-semibold text-tn-text">Weather Editor</h2>
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
            <div className="mb-2 flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">Preview Hour</span>
              <input
                type="range"
                min={0}
                max={23}
                step={1}
                value={previewHour}
                onChange={(event) => setPreviewHour(Number.parseInt(event.target.value, 10))}
                className="flex-1 accent-tn-accent"
              />
              <span className="w-12 text-right text-[10px] font-mono text-tn-text-muted">{previewHour}:00</span>
            </div>
            <div
              className="relative h-24 overflow-hidden rounded border border-tn-border/50"
              style={{ background: `linear-gradient(to bottom, ${skyTop}, ${skyBottom})` }}
            >
              <div
                className="absolute inset-x-0 bottom-0 h-10"
                style={{ background: `linear-gradient(to bottom, transparent, ${fogColor}88)` }}
              />
              <div
                className="absolute right-6 top-4 h-8 w-8 rounded-full shadow-[0_0_24px_rgba(255,255,255,0.35)]"
                style={{ backgroundColor: sunColor }}
              />
              <div className="absolute left-3 top-3 rounded bg-black/20 px-2 py-1 text-[10px] text-white/80">
                Visual preview for the selected hour
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-4">
              <div className="rounded border border-tn-border/40 bg-tn-bg px-2 py-1.5">
                <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">Stars</p>
                <p className="mt-0.5 truncate text-[11px] text-tn-text">{typeof doc.Stars === "string" ? doc.Stars : "None"}</p>
              </div>
              <div className="rounded border border-tn-border/40 bg-tn-bg px-2 py-1.5">
                <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">Cloud Layers</p>
                <p className="mt-0.5 text-[11px] text-tn-text">{Array.isArray(doc.Clouds) ? doc.Clouds.length : 0}</p>
              </div>
              <div className="rounded border border-tn-border/40 bg-tn-bg px-2 py-1.5">
                <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">Moon Entries</p>
                <p className="mt-0.5 text-[11px] text-tn-text">{Array.isArray(doc.Moons) ? doc.Moons.length : 0}</p>
              </div>
              <div className="rounded border border-tn-border/40 bg-tn-bg px-2 py-1.5">
                <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">Fog Distance</p>
                <p className="mt-0.5 text-[11px] text-tn-text">
                  {Array.isArray(doc.FogDistance) ? `${doc.FogDistance[0]} to ${doc.FogDistance[1]}` : "None"}
                </p>
              </div>
            </div>
          </section>

          {Array.isArray(doc.FogDistance) && (
            <section className="rounded border border-tn-border/60 bg-tn-surface/40 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">Fog Distance</p>
              <div className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-[10px] text-tn-text-muted">Near</span>
                <input
                  type="number"
                  step={1}
                  value={doc.FogDistance[0] ?? -192}
                  onChange={(event) => {
                    const value = Number.parseFloat(event.target.value);
                    if (!Number.isFinite(value)) return;
                    updateDoc((previous) => ({
                      ...previous,
                      FogDistance: [value, (previous.FogDistance ?? [-192, 128])[1]],
                    }));
                  }}
                  className="flex-1 rounded border border-tn-border bg-tn-bg px-2 py-1 text-[10px] font-mono text-right text-tn-text"
                />
                <span className="w-10 shrink-0 text-center text-[10px] text-tn-text-muted">Far</span>
                <input
                  type="number"
                  step={1}
                  value={doc.FogDistance[1] ?? 128}
                  onChange={(event) => {
                    const value = Number.parseFloat(event.target.value);
                    if (!Number.isFinite(value)) return;
                    updateDoc((previous) => ({
                      ...previous,
                      FogDistance: [(previous.FogDistance ?? [-192, 128])[0], value],
                    }));
                  }}
                  className="flex-1 rounded border border-tn-border bg-tn-bg px-2 py-1 text-[10px] font-mono text-right text-tn-text"
                />
              </div>
            </section>
          )}

          <section className="space-y-3">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-tn-text-muted">Color Tracks</h3>
              <p className="mt-1 text-[11px] text-tn-text-muted">
                These track views give weather files a graph-like editor instead of a raw JSON fallback.
              </p>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              {COLOR_TRACKS.map((track) => {
                const keyframes = (doc[track.key] as HourColor[] | undefined) ?? [];
                return (
                  <ColorTrackCard
                    key={track.key}
                    label={track.label}
                    keyframes={keyframes}
                    onChange={(index, next) => {
                      updateColorTrack(track.key, keyframes.map((entry, entryIndex) => (
                        entryIndex === index ? next : entry
                      )));
                    }}
                    onRemove={(index) => {
                      updateColorTrack(track.key, keyframes.filter((_, entryIndex) => entryIndex !== index));
                    }}
                    onAdd={() => {
                      const usedHours = new Set(keyframes.map((entry) => entry.Hour));
                      const nextHour = HOURS.find((hour) => !usedHours.has(hour)) ?? 12;
                      updateColorTrack(track.key, [
                        ...keyframes,
                        { Hour: nextHour, Color: buildColorString(interpolateColor(keyframes, nextHour), 1) },
                      ]);
                    }}
                  />
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-tn-text-muted">Numeric Tracks</h3>
              <p className="mt-1 text-[11px] text-tn-text-muted">
                Scale and fog curves are plotted as compact bar graphs with inline keyframe editing.
              </p>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              {VALUE_TRACKS.map((track) => {
                const keyframes = (doc[track.key] as HourValue[] | undefined) ?? [];
                return (
                  <ValueTrackCard
                    key={track.key}
                    label={track.label}
                    keyframes={keyframes}
                    onChange={(index, next) => {
                      updateValueTrack(track.key, keyframes.map((entry, entryIndex) => (
                        entryIndex === index ? next : entry
                      )));
                    }}
                    onRemove={(index) => {
                      updateValueTrack(track.key, keyframes.filter((_, entryIndex) => entryIndex !== index));
                    }}
                    onAdd={() => {
                      const usedHours = new Set(keyframes.map((entry) => entry.Hour));
                      const nextHour = HOURS.find((hour) => !usedHours.has(hour)) ?? 12;
                      updateValueTrack(track.key, [
                        ...keyframes,
                        { Hour: nextHour, Value: interpolateValue(keyframes, nextHour) },
                      ]);
                    }}
                  />
                );
              })}
            </div>
          </section>

          {Array.isArray(doc.Clouds) && doc.Clouds.length > 0 && (
            <section className="rounded border border-tn-border/60 bg-tn-surface/40 p-3">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-tn-text-muted">Cloud Layers</h3>
              <div className="space-y-2">
                {doc.Clouds.map((cloud, index) => {
                  const gradient = Array.isArray(cloud.Colors) && cloud.Colors.length
                    ? HOURS.map((hour) => `${interpolateColor(cloud.Colors ?? [], hour)} ${(hour / 23) * 100}%`).join(", ")
                    : "";
                  return (
                    <div key={`${cloud.Texture ?? "cloud"}-${index}`} className="rounded border border-tn-border/40 bg-tn-bg px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-medium text-tn-text">Layer {index + 1}</p>
                          <p className="text-[10px] text-tn-text-muted">{cloud.Texture ?? "No texture"}</p>
                        </div>
                        <div className="text-right text-[10px] text-tn-text-muted">
                          <p>{Array.isArray(cloud.Colors) ? cloud.Colors.length : 0} color keys</p>
                          <p>{Array.isArray(cloud.Speeds) ? cloud.Speeds.length : 0} speed keys</p>
                        </div>
                      </div>
                      {gradient && (
                        <div
                          className="mt-2 h-3 rounded border border-tn-border/40"
                          style={{ background: `linear-gradient(to right, ${gradient})` }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {extraEntries.length > 0 && (
            <section className="rounded border border-tn-border/60 bg-tn-surface/40 p-3">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-tn-text-muted">Additional Fields</h3>
              <div className="grid gap-2 md:grid-cols-2">
                {extraEntries.map(([key, value]) => (
                  <div key={key} className="rounded border border-tn-border/40 bg-tn-bg px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">{key}</p>
                    <p className="mt-1 text-[11px] text-tn-text">{describeValue(value)}</p>
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
