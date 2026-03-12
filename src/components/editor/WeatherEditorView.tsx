import { useMemo, useRef, useState } from "react";
import { Clock3, Cloud, Eye, EyeOff, LineChart, Palette, Save, SlidersHorizontal, WandSparkles } from "lucide-react";
import { useEditorStore } from "@/stores/editorStore";
import { useProjectStore } from "@/stores/projectStore";
import { writeAssetFile } from "@/utils/ipc";
import { EditorCalloutSection, EditorTipsSection, type EditorCalloutItem } from "./EditorCallouts";
import { CollapsibleEditorSection } from "./CollapsibleEditorSection";

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

function upsertColorKeyframe(entries: HourColor[], hour: number, color: string): HourColor[] {
  const nextHour = normalizeHour(hour);
  const existingIndex = entries.findIndex((entry) => entry.Hour === nextHour);
  if (existingIndex >= 0) {
    return entries.map((entry, index) => (index === existingIndex ? { ...entry, Color: color } : entry));
  }
  return [...entries, { Hour: nextHour, Color: color }];
}

function upsertValueKeyframe(entries: HourValue[], hour: number, value: number): HourValue[] {
  const nextHour = normalizeHour(hour);
  const existingIndex = entries.findIndex((entry) => entry.Hour === nextHour);
  if (existingIndex >= 0) {
    return entries.map((entry, index) => (index === existingIndex ? { ...entry, Value: value } : entry));
  }
  return [...entries, { Hour: nextHour, Value: value }];
}

function sectionClass(isFocused: boolean): string {
  return `rounded border p-3 transition-colors ${
    isFocused
      ? "border-tn-accent/70 bg-tn-accent/10 shadow-[0_0_0_1px_rgba(100,180,255,0.18)]"
      : "border-tn-border/60 bg-tn-surface/40"
  }`;
}

function formatTrackValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function buildTrackGradient(keyframes: HourColor[]): string {
  return keyframes.length
    ? HOURS.map((hour) => `${interpolateColor(keyframes, hour)} ${(hour / 23) * 100}%`).join(", ")
    : "transparent";
}

function readTextureLabel(value: string | undefined): string {
  if (!value) {
    return "Not configured";
  }
  const parts = value.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? value;
}

function describeDaypart(hour: number): { label: string; description: string; accent: string } {
  if (hour <= 4) {
    return { label: "Deep Night", description: "Stars and moon dominate the sky gradient.", accent: "#334155" };
  }
  if (hour <= 6) {
    return { label: "Dawn", description: "Sunrise ramp and fog colors start to warm up.", accent: "#fb7185" };
  }
  if (hour <= 11) {
    return { label: "Morning", description: "Sky tracks brighten while fog begins to lift.", accent: "#fbbf24" };
  }
  if (hour <= 15) {
    return { label: "Midday", description: "Maximum light, flatter fog and strongest sky contrast.", accent: "#38bdf8" };
  }
  if (hour <= 18) {
    return { label: "Afternoon", description: "Sun starts to fall and warm tones begin to return.", accent: "#f59e0b" };
  }
  if (hour <= 20) {
    return { label: "Dusk", description: "Sunset and fog tracks become the dominant mood.", accent: "#f97316" };
  }
  return { label: "Nightfall", description: "Scene transitions back into moonlight and star visibility.", accent: "#6366f1" };
}

function findDuplicateHours(entries: Array<{ Hour: number }>): number[] {
  const counts = new Map<number, number>();
  for (const entry of entries) {
    counts.set(entry.Hour, (counts.get(entry.Hour) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([hour]) => hour)
    .sort((left, right) => left - right);
}

interface ColorTrackCardProps {
  label: string;
  keyframes: HourColor[];
  onChange: (index: number, next: HourColor) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  isFocused?: boolean;
}

function ColorTrackCard({ label, keyframes, onChange, onRemove, onAdd, isFocused = false }: ColorTrackCardProps) {
  const entries = keyframes
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => left.entry.Hour - right.entry.Hour);
  const gradient = buildTrackGradient(keyframes);

  return (
    <div className={sectionClass(isFocused)}>
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
  isFocused?: boolean;
}

function ValueTrackCard({ label, keyframes, onChange, onRemove, onAdd, isFocused = false }: ValueTrackCardProps) {
  const entries = keyframes
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => left.entry.Hour - right.entry.Hour);
  const samples = HOURS.map((hour) => interpolateValue(keyframes, hour));
  const minValue = samples.length ? Math.min(...samples) : 0;
  const maxValue = samples.length ? Math.max(...samples) : 0;
  const span = Math.max(1, maxValue - minValue);

  return (
    <div className={sectionClass(isFocused)}>
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

function PreviewSwatchCard({ label, color, detail }: { label: string; color: string; detail: string }) {
  return (
    <div className="rounded border border-tn-border/50 bg-tn-bg/80 px-3 py-2">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 shrink-0 rounded border border-white/15" style={{ backgroundColor: color }} />
        <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">{label}</p>
      </div>
      <p className="mt-1 text-[11px] font-medium text-tn-text">{detail}</p>
    </div>
  );
}

function PreviewValueCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded border border-tn-border/50 bg-tn-bg/80 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">{label}</p>
      <p className="mt-1 text-[13px] font-semibold text-tn-text">{value}</p>
      <p className="mt-1 text-[10px] text-tn-text-muted">{detail}</p>
    </div>
  );
}

function PreviewInsightCard({
  label,
  title,
  detail,
  accent,
}: {
  label: string;
  title: string;
  detail: string;
  accent: string;
}) {
  return (
    <div className="rounded border border-tn-border/50 bg-tn-bg/80 px-3 py-3">
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
        <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">{label}</p>
      </div>
      <p className="mt-1.5 text-[13px] font-semibold text-tn-text">{title}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-tn-text-muted">{detail}</p>
    </div>
  );
}

function ColorTimelineRow({
  label,
  keyframes,
  currentHour,
  onSelectHour,
}: {
  label: string;
  keyframes: HourColor[];
  currentHour: number;
  onSelectHour: (hour: number) => void;
}) {
  return (
    <div className="rounded border border-tn-border/50 bg-tn-bg/70 p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-tn-text">{label}</span>
        <div className="flex items-center gap-2 text-[10px] text-tn-text-muted">
          <span>{keyframes.length} keys</span>
          <span className="font-mono">{interpolateColor(keyframes, currentHour)}</span>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-1 sm:grid-cols-24">
        {HOURS.map((hour) => (
          <button
            key={`${label}-${hour}`}
            type="button"
            onClick={() => onSelectHour(hour)}
            className={`rounded border transition-transform hover:-translate-y-0.5 ${
              currentHour === hour ? "border-tn-accent ring-1 ring-tn-accent/50" : "border-tn-border/40"
            }`}
            title={`${label} at ${hour}:00`}
          >
            <div
              className="h-6 rounded-sm"
              style={{ backgroundColor: interpolateColor(keyframes, hour) }}
            />
            <p className="py-0.5 text-center text-[9px] font-mono text-tn-text-muted">{hour}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ValueTimelineRow({
  label,
  keyframes,
  currentHour,
  onSelectHour,
}: {
  label: string;
  keyframes: HourValue[];
  currentHour: number;
  onSelectHour: (hour: number) => void;
}) {
  const samples = HOURS.map((hour) => interpolateValue(keyframes, hour));
  const minValue = samples.length ? Math.min(...samples) : 0;
  const maxValue = samples.length ? Math.max(...samples) : 0;
  const span = Math.max(1, maxValue - minValue);

  return (
    <div className="rounded border border-tn-border/50 bg-tn-bg/70 p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-tn-text">{label}</span>
        <div className="flex items-center gap-2 text-[10px] text-tn-text-muted">
          <span>{keyframes.length} keys</span>
          <span className="font-mono">{formatTrackValue(interpolateValue(keyframes, currentHour))}</span>
        </div>
      </div>
      <div className="grid grid-cols-12 items-end gap-1 sm:grid-cols-24">
        {samples.map((sample, hour) => {
          const normalized = ((sample - minValue) / span) * 100;
          return (
            <button
              key={`${label}-${hour}`}
              type="button"
              onClick={() => onSelectHour(hour)}
              className={`rounded border px-0.5 pt-1 transition-transform hover:-translate-y-0.5 ${
                currentHour === hour ? "border-tn-accent ring-1 ring-tn-accent/50" : "border-tn-border/40"
              }`}
              title={`${label} at ${hour}:00 = ${formatTrackValue(sample)}`}
            >
              <div className="flex h-10 items-end">
                <div
                  className="w-full rounded-sm bg-tn-accent/70"
                  style={{ height: `${Math.max(12, normalized || 0)}%` }}
                />
              </div>
              <p className="py-0.5 text-center text-[9px] font-mono text-tn-text-muted">{hour}</p>
            </button>
          );
        })}
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
  const hasWeatherDoc = rawJsonContent !== null;
  const previewSectionRef = useRef<HTMLDivElement | null>(null);
  const [previewHour, setPreviewHour] = useState(12);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [showPreview, setShowPreview] = useState(true);
  const [showIssueLog, setShowIssueLog] = useState(true);
  const [showTips, setShowTips] = useState(true);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [showAtmosphereStrip, setShowAtmosphereStrip] = useState(false);
  const [showPreviewTracks, setShowPreviewTracks] = useState(false);
  const [showPreviewSnapshot, setShowPreviewSnapshot] = useState(false);
  const [showPreviewAssets, setShowPreviewAssets] = useState(false);
  const [showFogSection, setShowFogSection] = useState(true);
  const [showColorSections, setShowColorSections] = useState(true);
  const [showValueSections, setShowValueSections] = useState(false);
  const [showCloudSections, setShowCloudSections] = useState(false);
  const [showExtraSections, setShowExtraSections] = useState(false);

  const doc = rawJsonContent ?? ({} as WeatherDoc);

  const updateDoc = (updater: (previous: WeatherDoc) => WeatherDoc) => {
    if (!rawJsonContent) return;
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
    if (!currentFile || !rawJsonContent) return;
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
  const sunsetColor = interpolateColor((doc.SkySunsetColors as HourColor[] | undefined) ?? [], previewHour) || "#fb923c";
  const fogColor = interpolateColor((doc.FogColors as HourColor[] | undefined) ?? [], previewHour) || "#223142";
  const sunColor = interpolateColor((doc.SunColors as HourColor[] | undefined) ?? [], previewHour) || "#fbbf24";
  const moonColor = interpolateColor((doc.MoonColors as HourColor[] | undefined) ?? [], previewHour) || "#cbd5f5";
  const moonGlowColor = interpolateColor((doc.MoonGlowColors as HourColor[] | undefined) ?? [], previewHour) || "#94a3b8";
  const waterTint = interpolateColor((doc.WaterTints as HourColor[] | undefined) ?? [], previewHour) || "#2563eb";
  const screenFx = interpolateColor((doc.ScreenEffectColors as HourColor[] | undefined) ?? [], previewHour) || "#64748b";
  const sunlightColor = interpolateColor((doc.SunlightColors as HourColor[] | undefined) ?? [], previewHour) || "#fde68a";
  const sunScale = interpolateValue((doc.SunScales as HourValue[] | undefined) ?? [], previewHour) || 0;
  const moonScale = interpolateValue((doc.MoonScales as HourValue[] | undefined) ?? [], previewHour) || 0;
  const fogDensity = interpolateValue((doc.FogDensities as HourValue[] | undefined) ?? [], previewHour) || 0;
  const fogHeightFalloff = interpolateValue((doc.FogHeightFalloffs as HourValue[] | undefined) ?? [], previewHour) || 0;
  const sunlightDamping = interpolateValue((doc.SunlightDampingMultipliers as HourValue[] | undefined) ?? [], previewHour) || 0;
  const extraEntries = Object.entries(doc).filter(([key]) => !KNOWN_KEYS.has(key));
  const cloudLayers = Array.isArray(doc.Clouds) ? doc.Clouds : [];
  const moons = Array.isArray(doc.Moons) ? doc.Moons : [];
  const daypart = describeDaypart(previewHour);
  const fogNear = Array.isArray(doc.FogDistance) && typeof doc.FogDistance[0] === "number" ? doc.FogDistance[0] : null;
  const fogFar = Array.isArray(doc.FogDistance) && typeof doc.FogDistance[1] === "number" ? doc.FogDistance[1] : null;
  const fogSpread = fogNear !== null && fogFar !== null ? fogFar - fogNear : null;
  const totalCloudColorKeys = cloudLayers.reduce((sum, layer) => sum + ((layer.Colors ?? []).length), 0);
  const totalCloudSpeedKeys = cloudLayers.reduce((sum, layer) => sum + ((layer.Speeds ?? []).length), 0);
  const starTexture = typeof doc.Stars === "string" ? doc.Stars : null;
  const primaryMoonTexture = moons.find((moon) => typeof moon.Texture === "string")?.Texture;
  const particleSummary = doc.Particle === undefined ? "No particle system" : describeValue(doc.Particle);
  const tagSummary = isRecord(doc.Tags)
    ? Object.entries(doc.Tags)
      .slice(0, 2)
      .map(([key, values]) => `${key}: ${Array.isArray(values) ? values.join(", ") : describeValue(values)}`)
      .join(" | ")
    : "No tags";
  const nightFactor = previewHour <= 5 ? 1 - (previewHour / 6) : previewHour >= 18 ? (previewHour - 18) / 5 : 0;
  const daylightProgress = clamp((previewHour - 6) / 12, 0, 1);
  const sunVisible = previewHour >= 5 && previewHour <= 20;
  const moonVisible = previewHour <= 7 || previewHour >= 17;
  const sunX = 8 + (daylightProgress * 74);
  const sunY = 58 - (Math.sin(daylightProgress * Math.PI) * 42);
  const moonProgress = previewHour <= 7 ? (previewHour + 6) / 13 : (previewHour - 17) / 7;
  const moonX = 8 + (clamp(moonProgress, 0, 1) * 74);
  const moonY = 58 - (Math.sin(clamp(moonProgress, 0, 1) * Math.PI) * 34);
  const colorTrackCount = COLOR_TRACKS.reduce((sum, track) => sum + (((doc[track.key] as HourColor[] | undefined) ?? []).length), 0);
  const valueTrackCount = VALUE_TRACKS.reduce((sum, track) => sum + (((doc[track.key] as HourValue[] | undefined) ?? []).length), 0);
  const quickPreviewHours = [
    { label: "Midnight", hour: 0 },
    { label: "Dawn", hour: 6 },
    { label: "Noon", hour: 12 },
    { label: "Dusk", hour: 18 },
  ] as const;
  const quickPreviewPresetValue = quickPreviewHours.find((preset) => preset.hour === previewHour)?.hour.toString() ?? "custom";
  const detailPanelMode = showIssueLog ? (showTips ? "both" : "issues") : (showTips ? "tips" : "none");
  const setSimpleColor = (trackKey: ColorTrackKey, color: string) => {
    updateColorTrack(trackKey, upsertColorKeyframe(((doc[trackKey] as HourColor[] | undefined) ?? []), previewHour, color));
  };

  const weatherIssues = useMemo<EditorCalloutItem[]>(() => {
    const items: EditorCalloutItem[] = [];
    const essentialMissing = [
      { key: "SkyTopColors", label: "Sky Top" },
      { key: "SkyBottomColors", label: "Sky Bottom" },
      { key: "FogColors", label: "Fog" },
      { key: "SunColors", label: "Sun" },
    ].filter(({ key }) => (((doc[key] as HourColor[] | undefined) ?? []).length === 0));

    if (essentialMissing.length > 0) {
      items.push({
        severity: "warning",
        title: "Core color tracks are missing",
        detail: `${essentialMissing.map((track) => track.label).join(", ")} will fall back to default preview colors until they are populated.`,
      });
    }

    if (!Array.isArray(doc.FogDistance) || doc.FogDistance.length < 2) {
      items.push({
        severity: "warning",
        title: "Fog distance is not configured",
        detail: "Set near/far fog bounds so the preview volume matches the real weather file.",
      });
    } else if ((doc.FogDistance[1] ?? 0) <= (doc.FogDistance[0] ?? 0)) {
      items.push({
        severity: "error",
        title: "Fog distance range is inverted",
        detail: `Far (${doc.FogDistance[1]}) should be greater than near (${doc.FogDistance[0]}).`,
      });
    }

    const duplicateTrackWarnings = [
      ...COLOR_TRACKS.flatMap((track) => {
        const duplicates = findDuplicateHours((doc[track.key] as HourColor[] | undefined) ?? []);
        return duplicates.length > 0 ? [`${track.label} @ ${duplicates.join(", ")}`] : [];
      }),
      ...VALUE_TRACKS.flatMap((track) => {
        const duplicates = findDuplicateHours((doc[track.key] as HourValue[] | undefined) ?? []);
        return duplicates.length > 0 ? [`${track.label} @ ${duplicates.join(", ")}`] : [];
      }),
      ...cloudLayers.flatMap((layer, index) => {
        const colorDupes = findDuplicateHours(layer.Colors ?? []);
        const speedDupes = findDuplicateHours(layer.Speeds ?? []);
        const label = `Cloud ${index + 1}`;
        return [
          ...(colorDupes.length > 0 ? [`${label} colors @ ${colorDupes.join(", ")}`] : []),
          ...(speedDupes.length > 0 ? [`${label} speeds @ ${speedDupes.join(", ")}`] : []),
        ];
      }),
    ];

    if (duplicateTrackWarnings.length > 0) {
      items.push({
        severity: "warning",
        title: "Duplicate hour keys detected",
        detail: duplicateTrackWarnings.slice(0, 4).join(" | "),
      });
    }

    if (!starTexture && moons.length === 0) {
      items.push({
        severity: "info",
        title: "No celestial assets configured",
        detail: "This file has neither a star texture nor moon entries, so the night preview will stay visually sparse.",
      });
    }

    if (cloudLayers.length === 0) {
      items.push({
        severity: "info",
        title: "No cloud layers present",
        detail: "The sky preview is currently driven only by color tracks and celestial settings.",
      });
    }

    if (extraEntries.length > 0) {
      items.push({
        severity: "info",
        title: "Additional weather fields detected",
        detail: `${extraEntries.length} fields are present outside the first-class editor model. Check the metadata card for raw values.`,
      });
    }

    return items;
  }, [cloudLayers, doc, extraEntries.length, moons.length, starTexture]);

  const weatherTips = useMemo(() => [
    "Use the preset hour buttons or the 24h strips to jump quickly between midnight, dawn, noon, and dusk.",
    "Duplicate hour keys are worth cleaning up before export because they make interpolation ambiguous.",
    "Cloud layer speed and color keys affect the hero preview immediately, so it is a good fast sanity check before saving.",
  ], []);

  const previewPanel = (
    <div ref={previewSectionRef} className={sectionClass(false)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">Scene Preview</p>
          <p className="mt-1 text-[11px] text-tn-text-muted">
            Live atmosphere preview sampled from the current weather tracks.
          </p>
        </div>
        <span
          className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
          style={{ borderColor: `${daypart.accent}66`, color: daypart.accent, backgroundColor: `${daypart.accent}14` }}
        >
          {daypart.label}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 rounded border border-tn-border/40 bg-tn-bg/40 px-3 py-2">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted" htmlFor="weather-preview-hour">
          Preview Hour
        </label>
        <input
          id="weather-preview-hour"
          type="range"
          min={0}
          max={23}
          step={1}
          value={previewHour}
          onChange={(event) => setPreviewHour(Number.parseInt(event.target.value, 10))}
          className="min-w-[180px] flex-1 accent-tn-accent"
        />
        <span className="w-12 text-right text-[10px] font-mono text-tn-text-muted">{previewHour}:00</span>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted" htmlFor="weather-preview-jump">
          Jump To
        </label>
        <select
          id="weather-preview-jump"
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

      <div
        className="relative h-64 overflow-hidden rounded-xl border border-tn-border/50"
        style={{ background: `linear-gradient(to bottom, ${skyTop}, ${sunlightColor}, ${skyBottom})` }}
      >
        <div
          className="absolute inset-0 opacity-60"
          style={{ background: `radial-gradient(circle at 50% 72%, ${sunsetColor}66 0%, transparent 48%)` }}
        />

        <div className="absolute inset-0 opacity-80">
          {Array.from({ length: 24 }).map((_, index) => (
            <div
              key={`star-${index}`}
              className="absolute h-1 w-1 rounded-full bg-white/85"
              style={{
                left: `${(index * 17) % 92}%`,
                top: `${(index * 11) % 55}%`,
                opacity: nightFactor,
                transform: `scale(${0.7 + (((index * 13) % 10) / 10)})`,
              }}
            />
          ))}
        </div>

        {cloudLayers.slice(0, 3).map((layer, index) => {
          const color = interpolateColor(layer.Colors ?? [], previewHour);
          const speed = interpolateValue(layer.Speeds ?? [], previewHour);
          return (
            <div
              key={`${layer.Texture ?? "cloud"}-${index}`}
              className="absolute left-0 right-0 rounded-full blur-[2px]"
              style={{
                top: `${16 + (index * 13)}%`,
                height: `${18 - (index * 2)}%`,
                background: `linear-gradient(to right, transparent, ${color}cc, ${color}66, transparent)`,
                transform: `translateX(${(speed * 4) % 24}px)`,
              }}
            />
          );
        })}

        {sunVisible && (
          <div
            className="absolute h-12 w-12 rounded-full shadow-[0_0_36px_rgba(255,220,120,0.65)]"
            style={{
              left: `${sunX}%`,
              top: `${sunY}%`,
              backgroundColor: sunColor,
              transform: `translate(-50%, -50%) scale(${Math.max(0.75, sunScale || 1)})`,
            }}
          />
        )}

        {moonVisible && (
          <div
            className="absolute h-9 w-9 rounded-full border border-white/20 shadow-[0_0_28px_rgba(180,200,255,0.45)]"
            style={{
              left: `${moonX}%`,
              top: `${moonY}%`,
              background: `radial-gradient(circle at 35% 35%, #ffffff, ${moonColor})`,
              boxShadow: `0 0 26px ${moonGlowColor}66`,
              transform: `translate(-50%, -50%) scale(${Math.max(0.75, moonScale || 1)})`,
            }}
          />
        )}

        <div
          className="absolute inset-x-0 bottom-0 h-24"
          style={{ background: `linear-gradient(to top, ${fogColor}dd, transparent)` }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, transparent 38%, ${screenFx}22 100%)`,
            opacity: clamp(0.18 + (fogDensity * 0.2), 0.14, 0.48),
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-8 border-t border-white/10"
          style={{ backgroundColor: `${waterTint}aa` }}
        />

        <div className="absolute left-3 top-3 rounded bg-black/35 px-2 py-1 text-[10px] text-white/80">
          Layered preview sampled from the actual weather tracks.
        </div>
        <div className="absolute bottom-3 right-3 rounded bg-black/40 px-3 py-2 text-right text-[10px] text-white/80">
          <p className="font-semibold">{daypart.label}</p>
          <p>Fog {fogNear ?? "?"} to {fogFar ?? "?"}</p>
          <p>Clouds {cloudLayers.length} layers</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <PreviewInsightCard
          label="Daypart"
          title={daypart.label}
          detail={daypart.description}
          accent={daypart.accent}
        />
        <PreviewInsightCard
          label="Celestial"
          title={sunVisible ? "Sun in frame" : moonVisible ? "Moon in frame" : "No body visible"}
          detail={`Sun scale ${formatTrackValue(sunScale)} | Moon scale ${formatTrackValue(moonScale)} | Stars ${starTexture ? "configured" : "missing"}`}
          accent={sunVisible ? sunColor : moonColor}
        />
        <PreviewInsightCard
          label="Fog Volume"
          title={fogSpread !== null ? `${formatTrackValue(fogSpread)} span` : "Not configured"}
          detail={`Near ${fogNear ?? "?"} | Far ${fogFar ?? "?"} | Density ${formatTrackValue(fogDensity)} | Falloff ${formatTrackValue(fogHeightFalloff)}`}
          accent={fogColor}
        />
        <PreviewInsightCard
          label="Asset Stack"
          title={`${cloudLayers.length} cloud layer${cloudLayers.length === 1 ? "" : "s"}`}
          detail={`Stars ${readTextureLabel(starTexture ?? undefined)} | Moon ${readTextureLabel(primaryMoonTexture)} | Particle ${particleSummary}`}
          accent={cloudLayers[0]?.Colors?.length ? interpolateColor(cloudLayers[0].Colors ?? [], previewHour) : "#64748b"}
        />
      </div>

      {showAdvancedControls ? (
        <>
          <div className="mt-3 mb-3 flex flex-wrap items-center gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted" htmlFor="weather-detail-panels">
              Detail Panels
            </label>
            <select
              id="weather-detail-panels"
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
            <div className={`mb-3 grid gap-3 ${showIssueLog && showTips ? "xl:grid-cols-[1.2fr_0.8fr]" : ""}`}>
              {showIssueLog && (
                <EditorCalloutSection
                  title="Issue Log"
                  items={weatherIssues}
                  emptyState="No obvious weather file problems were detected in the current preview model."
                />
              )}
              {showTips && <EditorTipsSection title="Tips" tips={weatherTips} />}
            </div>
          ) : (
            <div className="mb-3 rounded border border-dashed border-tn-border/50 bg-tn-surface/20 px-3 py-2 text-[11px] text-tn-text-muted">
              Issue log and tips are hidden.
            </div>
          )}
        </>
      ) : null}

      <div className="mt-3 space-y-3">
        <CollapsibleEditorSection
          title="24h Atmosphere Strip"
          description="A compact day-long sky strip. Click any hour to retime the scene preview."
          badge={`${previewHour}:00`}
          icon={<Clock3 className="h-4 w-4" />}
          open={showAtmosphereStrip}
          onToggle={() => setShowAtmosphereStrip((value) => !value)}
        >
          <div className="grid grid-cols-12 gap-1 sm:grid-cols-24">
            {HOURS.map((hour) => (
              <button
                key={`hour-strip-${hour}`}
                type="button"
                onClick={() => setPreviewHour(hour)}
                className={`group rounded border transition-transform hover:-translate-y-0.5 ${
                  previewHour === hour ? "border-tn-accent ring-1 ring-tn-accent/50" : "border-tn-border/50"
                }`}
                title={`${hour}:00`}
              >
                <div
                  className="h-10 rounded-sm"
                  style={{
                    background: `linear-gradient(to bottom, ${interpolateColor((doc.SkyTopColors as HourColor[] | undefined) ?? [], hour)}, ${interpolateColor((doc.SkyBottomColors as HourColor[] | undefined) ?? [], hour)})`,
                  }}
                />
                <p className="py-1 text-center text-[9px] font-mono text-tn-text-muted">{hour}</p>
              </button>
            ))}
          </div>
        </CollapsibleEditorSection>

        <CollapsibleEditorSection
          title="Track Preview"
          description="Sampled color and numeric tracks synced to the current preview hour."
          badge={`${colorTrackCount + valueTrackCount} keys`}
          icon={<LineChart className="h-4 w-4" />}
          open={showPreviewTracks}
          onToggle={() => setShowPreviewTracks((value) => !value)}
        >
          <div className="grid gap-3 xl:grid-cols-2">
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">Color Track Preview</p>
                <p className="mt-1 text-[11px] text-tn-text-muted">
                  These rows are sampled directly from the color tracks. Click any hour to retime the preview.
                </p>
              </div>
              <ColorTimelineRow
                label="Sky Top"
                keyframes={(doc.SkyTopColors as HourColor[] | undefined) ?? []}
                currentHour={previewHour}
                onSelectHour={setPreviewHour}
              />
              <ColorTimelineRow
                label="Sky Bottom"
                keyframes={(doc.SkyBottomColors as HourColor[] | undefined) ?? []}
                currentHour={previewHour}
                onSelectHour={setPreviewHour}
              />
              <ColorTimelineRow
                label="Sunset"
                keyframes={(doc.SkySunsetColors as HourColor[] | undefined) ?? []}
                currentHour={previewHour}
                onSelectHour={setPreviewHour}
              />
              <ColorTimelineRow
                label="Fog"
                keyframes={(doc.FogColors as HourColor[] | undefined) ?? []}
                currentHour={previewHour}
                onSelectHour={setPreviewHour}
              />
              <ColorTimelineRow
                label="Water"
                keyframes={(doc.WaterTints as HourColor[] | undefined) ?? []}
                currentHour={previewHour}
                onSelectHour={setPreviewHour}
              />
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">Numeric Track Preview</p>
                <p className="mt-1 text-[11px] text-tn-text-muted">
                  Curve sampling is shown here without leaving the editor. The selected hour stays synchronized with the scene card.
                </p>
              </div>
              <ValueTimelineRow
                label="Sun Scale"
                keyframes={(doc.SunScales as HourValue[] | undefined) ?? []}
                currentHour={previewHour}
                onSelectHour={setPreviewHour}
              />
              <ValueTimelineRow
                label="Moon Scale"
                keyframes={(doc.MoonScales as HourValue[] | undefined) ?? []}
                currentHour={previewHour}
                onSelectHour={setPreviewHour}
              />
              <ValueTimelineRow
                label="Fog Density"
                keyframes={(doc.FogDensities as HourValue[] | undefined) ?? []}
                currentHour={previewHour}
                onSelectHour={setPreviewHour}
              />
              <ValueTimelineRow
                label="Fog Falloff"
                keyframes={(doc.FogHeightFalloffs as HourValue[] | undefined) ?? []}
                currentHour={previewHour}
                onSelectHour={setPreviewHour}
              />
              <ValueTimelineRow
                label="Light Damping"
                keyframes={(doc.SunlightDampingMultipliers as HourValue[] | undefined) ?? []}
                currentHour={previewHour}
                onSelectHour={setPreviewHour}
              />
            </div>
          </div>
        </CollapsibleEditorSection>

        <CollapsibleEditorSection
          title="Sampled Values"
          description="Current-hour swatches and numeric readouts pulled from the preview model."
          badge={`${previewHour}:00 snapshot`}
          icon={<Palette className="h-4 w-4" />}
          open={showPreviewSnapshot}
          onToggle={() => setShowPreviewSnapshot((value) => !value)}
        >
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            <PreviewSwatchCard label="Sky Top" color={skyTop} detail={skyTop} />
            <PreviewSwatchCard label="Sky Bottom" color={skyBottom} detail={skyBottom} />
            <PreviewSwatchCard label="Fog" color={fogColor} detail={fogColor} />
            <PreviewSwatchCard label="Sunlight" color={sunlightColor} detail={sunlightColor} />
            <PreviewSwatchCard label="Screen FX" color={screenFx} detail={screenFx} />
            <PreviewSwatchCard label="Water Tint" color={waterTint} detail={waterTint} />
            <PreviewValueCard label="Fog Density" value={formatTrackValue(fogDensity)} detail="Interpolated at the selected hour." />
            <PreviewValueCard label="Fog Falloff" value={formatTrackValue(fogHeightFalloff)} detail="Height fade sampled from the curve." />
            <PreviewValueCard label="Light Damping" value={formatTrackValue(sunlightDamping)} detail="Scene damping multiplier at this hour." />
          </div>
        </CollapsibleEditorSection>

        <CollapsibleEditorSection
          title="Asset Breakdown"
          description="Cloud, celestial, and metadata summaries inferred from the loaded weather file."
          badge={`${cloudLayers.length} cloud layers`}
          icon={<Cloud className="h-4 w-4" />}
          open={showPreviewAssets}
          onToggle={() => setShowPreviewAssets((value) => !value)}
        >
          <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded border border-tn-border/50 bg-tn-bg/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">Cloud and Celestial Breakdown</p>
                  <p className="mt-1 text-[11px] text-tn-text-muted">
                    Asset-level preview details inferred from the weather file itself.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-tn-text-muted">{tagSummary}</span>
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {cloudLayers.slice(0, 4).map((layer, index) => {
                  const gradient = Array.isArray(layer.Colors) && layer.Colors.length
                    ? buildTrackGradient(layer.Colors ?? [])
                    : "";
                  const speed = interpolateValue(layer.Speeds ?? [], previewHour);
                  return (
                    <div key={`${layer.Texture ?? "cloud"}-${index}`} className="rounded border border-tn-border/40 bg-tn-surface/40 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-medium text-tn-text">Cloud Layer {index + 1}</p>
                          <p className="text-[10px] text-tn-text-muted">{readTextureLabel(layer.Texture)}</p>
                        </div>
                        <span className="text-[10px] font-mono text-tn-text-muted">{formatTrackValue(speed)} speed</span>
                      </div>
                      {gradient && (
                        <div
                          className="mt-2 h-3 rounded border border-tn-border/40"
                          style={{ background: `linear-gradient(to right, ${gradient})` }}
                        />
                      )}
                      <p className="mt-2 text-[10px] text-tn-text-muted">
                        {Array.isArray(layer.Colors) ? layer.Colors.length : 0} color keys | {Array.isArray(layer.Speeds) ? layer.Speeds.length : 0} speed keys
                      </p>
                    </div>
                  );
                })}
                {cloudLayers.length === 0 && (
                  <div className="rounded border border-dashed border-tn-border/50 bg-tn-surface/20 p-3 text-[11px] text-tn-text-muted">
                    No cloud layers are configured in this weather file.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded border border-tn-border/50 bg-tn-bg/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-tn-text-muted">Assets and Metadata</p>
              <div className="mt-3 space-y-2 text-[11px] text-tn-text">
                <div className="rounded border border-tn-border/40 bg-tn-surface/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">Stars</p>
                  <p className="mt-1">{readTextureLabel(starTexture ?? undefined)}</p>
                </div>
                <div className="rounded border border-tn-border/40 bg-tn-surface/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">Moon Cycle</p>
                  <p className="mt-1">{moons.length} entries</p>
                  <p className="mt-1 text-[10px] text-tn-text-muted">{readTextureLabel(primaryMoonTexture)}</p>
                </div>
                <div className="rounded border border-tn-border/40 bg-tn-surface/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">Tags</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-tn-text-muted">{tagSummary}</p>
                </div>
                <div className="rounded border border-tn-border/40 bg-tn-surface/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">Unmodeled Fields</p>
                  <p className="mt-1">{extraEntries.length} extra field{extraEntries.length === 1 ? "" : "s"}</p>
                </div>
                <div className="rounded border border-tn-border/40 bg-tn-surface/40 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-tn-text-muted">Cloud Keys</p>
                  <p className="mt-1">{totalCloudColorKeys} color keys | {totalCloudSpeedKeys} speed keys</p>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleEditorSection>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col bg-tn-bg">
      <div className="flex shrink-0 items-center justify-between border-b border-tn-border bg-tn-surface px-4 py-2">
        <div>
          <h2 className="text-xs font-semibold text-tn-text">Weather Editor</h2>
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
            disabled={!hasWeatherDoc}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] shadow-sm transition-colors ${
              !hasWeatherDoc
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
            disabled={!hasWeatherDoc || !currentFile}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] shadow-sm transition-colors ${
              saveStatus === "saved"
                ? "border-green-500/60 bg-green-500/10 text-green-300"
                : saveStatus === "error"
                  ? "border-red-500/60 bg-red-500/10 text-red-300"
                  : "border-tn-border/70 bg-tn-bg/70 text-tn-text hover:border-tn-accent hover:text-tn-accent"
            } ${!hasWeatherDoc || !currentFile ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <Save className="h-3.5 w-3.5" />
            {saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Retry Save" : "Save"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 px-4 py-4">
          {!hasWeatherDoc && (
            <div className="rounded border border-dashed border-tn-border/50 bg-tn-surface/20 px-4 py-6 text-center text-sm text-tn-text-muted">
              No weather file loaded.
            </div>
          )}
          {showPreview ? (
            <section>{previewPanel}</section>
          ) : (
            <section>
              <div ref={previewSectionRef} className={sectionClass(false)}>
                <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-tn-border/50 bg-tn-surface/20 px-4 py-6 text-center text-[11px] text-tn-text-muted">
                  Preview hidden. Use <span className="mx-1 font-medium text-tn-text">Show Preview</span> in the header to bring it back without jerking the rest of the editor around.
                </div>
              </div>
            </section>
          )}

          {hasWeatherDoc && (
            <section className="rounded-lg border border-tn-border/70 bg-tn-surface/45 px-3.5 py-3.5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-tn-border/50 bg-tn-bg/70 text-tn-accent">
                    <SlidersHorizontal className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tn-text">Simple Controls</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-tn-text-muted">
                      Fast default edits at the current preview hour. Use In-Depth Controls for full keyframe editing.
                    </p>
                  </div>
                </div>
                <span className="rounded border border-tn-border/50 bg-tn-bg/60 px-2 py-0.5 text-[10px] font-mono text-tn-text-muted">
                  {previewHour}:00
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {([
                  { key: "SkyTopColors", label: "Sky Top", value: skyTop },
                  { key: "SkyBottomColors", label: "Sky Bottom", value: skyBottom },
                  { key: "FogColors", label: "Fog", value: fogColor },
                  { key: "SunColors", label: "Sun", value: sunColor },
                ] as const).map((control) => (
                  <label key={control.key} className="rounded border border-tn-border/40 bg-tn-bg/70 px-3 py-2">
                    <span className="mb-2 block text-[10px] uppercase tracking-wider text-tn-text-muted">{control.label}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={readHexColor(control.value)}
                        onChange={(event) => setSimpleColor(control.key, buildColorString(event.target.value, 1))}
                        className="h-8 w-10 shrink-0 cursor-pointer rounded border border-tn-border/70 bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={readHexColor(control.value)}
                        onChange={(event) => setSimpleColor(control.key, buildColorString(event.target.value, 1))}
                        className="min-w-0 flex-1 rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] font-mono text-tn-text"
                      />
                    </div>
                  </label>
                ))}

                <div className="rounded border border-tn-border/40 bg-tn-bg/70 px-3 py-2">
                  <span className="mb-2 block text-[10px] uppercase tracking-wider text-tn-text-muted">Fog Distance</span>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10px] text-tn-text-muted">
                      Near
                      <input
                        type="number"
                        step={1}
                        value={doc.FogDistance?.[0] ?? -192}
                        onChange={(event) => {
                          const value = Number.parseFloat(event.target.value);
                          if (!Number.isFinite(value)) return;
                          updateDoc((previous) => ({
                            ...previous,
                            FogDistance: [value, (previous.FogDistance ?? [-192, 128])[1]],
                          }));
                        }}
                        className="mt-1 w-full rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] font-mono text-right text-tn-text"
                      />
                    </label>
                    <label className="text-[10px] text-tn-text-muted">
                      Far
                      <input
                        type="number"
                        step={1}
                        value={doc.FogDistance?.[1] ?? 128}
                        onChange={(event) => {
                          const value = Number.parseFloat(event.target.value);
                          if (!Number.isFinite(value)) return;
                          updateDoc((previous) => ({
                            ...previous,
                            FogDistance: [(previous.FogDistance ?? [-192, 128])[0], value],
                          }));
                        }}
                        className="mt-1 w-full rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] font-mono text-right text-tn-text"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded border border-tn-border/40 bg-tn-bg/70 px-3 py-2">
                  <span className="mb-2 block text-[10px] uppercase tracking-wider text-tn-text-muted">Simple Values</span>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10px] text-tn-text-muted">
                      Sun Scale
                      <input
                        type="number"
                        step={0.05}
                        value={sunScale}
                        onChange={(event) => {
                          const value = Number.parseFloat(event.target.value);
                          if (!Number.isFinite(value)) return;
                          updateValueTrack("SunScales", upsertValueKeyframe(((doc.SunScales as HourValue[] | undefined) ?? []), previewHour, value));
                        }}
                        className="mt-1 w-full rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] font-mono text-right text-tn-text"
                      />
                    </label>
                    <label className="text-[10px] text-tn-text-muted">
                      Fog Density
                      <input
                        type="number"
                        step={0.05}
                        value={fogDensity}
                        onChange={(event) => {
                          const value = Number.parseFloat(event.target.value);
                          if (!Number.isFinite(value)) return;
                          updateValueTrack("FogDensities", upsertValueKeyframe(((doc.FogDensities as HourValue[] | undefined) ?? []), previewHour, value));
                        }}
                        className="mt-1 w-full rounded border border-tn-border bg-tn-bg px-2 py-1 text-[11px] font-mono text-right text-tn-text"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </section>
          )}

          {showAdvancedControls && Array.isArray(doc.FogDistance) && (
            <CollapsibleEditorSection
              title="Fog Distance"
              description="Near and far fog bounds used by the preview volume."
              badge={Array.isArray(doc.FogDistance) ? `${doc.FogDistance[0]}..${doc.FogDistance[1]}` : undefined}
              open={showFogSection}
              onToggle={() => setShowFogSection((value) => !value)}
            >
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
            </CollapsibleEditorSection>
          )}

          {showAdvancedControls && (
            <CollapsibleEditorSection
              title="Color Tracks"
              description="Keyframed weather colors. The graph still focuses these editors when nodes are selected."
              badge={`${COLOR_TRACKS.length} tracks`}
              open={showColorSections}
              onToggle={() => setShowColorSections((value) => !value)}
            >
              <div className="grid gap-3 xl:grid-cols-2">
                {COLOR_TRACKS.map((track) => {
                  const keyframes = (doc[track.key] as HourColor[] | undefined) ?? [];
                  return (
                    <ColorTrackCard
                      key={track.key}
                      label={track.label}
                      keyframes={keyframes}
                      isFocused={false}
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
            </CollapsibleEditorSection>
          )}

          {showAdvancedControls && (
            <>
              <CollapsibleEditorSection
                title="Numeric Tracks"
                description="Scale, damping, and fog curve editors."
                badge={`${VALUE_TRACKS.length} tracks`}
                open={showValueSections}
                onToggle={() => setShowValueSections((value) => !value)}
              >
                <div className="grid gap-3 xl:grid-cols-2">
                  {VALUE_TRACKS.map((track) => {
                    const keyframes = (doc[track.key] as HourValue[] | undefined) ?? [];
                    return (
                      <ValueTrackCard
                        key={track.key}
                        label={track.label}
                        keyframes={keyframes}
                        isFocused={false}
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
              </CollapsibleEditorSection>

              {Array.isArray(doc.Clouds) && doc.Clouds.length > 0 && (
                <CollapsibleEditorSection
                  title="Cloud Layers"
                  description="Texture, color, and speed summaries for configured cloud stacks."
                  badge={`${doc.Clouds.length} layers`}
                  open={showCloudSections}
                  onToggle={() => setShowCloudSections((value) => !value)}
                >
                  <div className="space-y-2">
                    {doc.Clouds.map((cloud, index) => {
                      const gradient = Array.isArray(cloud.Colors) && cloud.Colors.length
                        ? HOURS.map((hour) => `${interpolateColor(cloud.Colors ?? [], hour)} ${(hour / 23) * 100}%`).join(", ")
                        : "";
                      const speed = interpolateValue(cloud.Speeds ?? [], previewHour);
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
                              <p>Speed now {formatTrackValue(speed)}</p>
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
                </CollapsibleEditorSection>
              )}

              {extraEntries.length > 0 && (
                <CollapsibleEditorSection
                  title="Additional Fields"
                  description="Raw fields not yet promoted into the first-class editor."
                  badge={`${extraEntries.length} fields`}
                  open={showExtraSections}
                  onToggle={() => setShowExtraSections((value) => !value)}
                >
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
                </CollapsibleEditorSection>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
