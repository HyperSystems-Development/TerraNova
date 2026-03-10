import type { AtmosphereSettings } from "@/stores/previewStore";
import { listDirectory, readAssetFile, type DirectoryEntryData } from "@/utils/ipc";

const DEFAULT_HOUR = 12;
const HOURS_PER_DAY = 24;

const FALLBACK_ATMOSPHERE_SETTINGS: AtmosphereSettings = {
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
};

type JsonRecord = Record<string, unknown>;

export interface ResolveBiomeAtmosphereInput {
  biomeConfig: unknown;
  biomeFilePath?: string | null;
  projectPath?: string | null;
  hour?: number;
}

export interface ResolveBiomeAtmosphereMetadata {
  source: "hytale-assets" | "fallback";
  serverRoot: string | null;
  environmentName: string | null;
  environmentPath: string | null;
  weatherId: string | null;
  weatherPath: string | null;
  hour: number;
  warnings: string[];
}

export interface ResolveBiomeAtmosphereResult {
  settings: AtmosphereSettings;
  metadata: ResolveBiomeAtmosphereMetadata;
}

interface ResolveBiomeAtmosphereDeps {
  listDirectoryFn: typeof listDirectory;
  readAssetFileFn: typeof readAssetFile;
}

interface AssetIndex {
  environmentPaths: Map<string, string>;
  weatherPaths: Map<string, string>;
}

interface LoadedEnvironment {
  mergedEnvironment: JsonRecord | null;
  requestedPath: string | null;
  warnings: string[];
}

interface HourValue<T> {
  hour: number;
  value: T;
}

const assetIndexCache = new Map<string, Promise<AssetIndex>>();

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function normalizeHour(hour: number): number {
  const normalized = hour % HOURS_PER_DAY;
  return normalized < 0 ? normalized + HOURS_PER_DAY : normalized;
}

function hourDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, HOURS_PER_DAY - diff);
}

function trimTrailingSeparators(path: string): string {
  return path.replace(/[\\/]+$/, "");
}

function joinPath(base: string, child: string): string {
  const separator = base.includes("\\") ? "\\" : "/";
  const cleanedBase = trimTrailingSeparators(base);
  return `${cleanedBase}${separator}${child}`;
}

function restoreSeparators(sourcePath: string, normalizedPath: string): string {
  return sourcePath.includes("\\")
    ? normalizedPath.replace(/\//g, "\\")
    : normalizedPath;
}

function findServerRootFromPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const normalized = path.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();
  const marker = "/server/";
  const markerIndex = lower.lastIndexOf(marker);
  if (markerIndex >= 0) {
    const serverRoot = normalized.slice(0, markerIndex + marker.length - 1);
    return restoreSeparators(path, serverRoot);
  }
  if (lower.endsWith("/server")) {
    return trimTrailingSeparators(path);
  }
  return null;
}

function parentPath(path: string): string | null {
  const normalized = path.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash <= 0) return null;
  return restoreSeparators(path, normalized.slice(0, lastSlash));
}

function buildServerRootCandidates(
  biomeFilePath: string | null | undefined,
  projectPath: string | null | undefined,
): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const pushCandidate = (candidate: string | null | undefined) => {
    if (!candidate) return;
    const cleaned = trimTrailingSeparators(candidate);
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(cleaned);
  };

  pushCandidate(findServerRootFromPath(biomeFilePath));
  pushCandidate(findServerRootFromPath(projectPath));

  if (projectPath) {
    const normalizedProject = trimTrailingSeparators(projectPath);
    const lowerProject = normalizedProject.toLowerCase();
    if (lowerProject.endsWith("/hytalegenerator") || lowerProject.endsWith("\\hytalegenerator")) {
      pushCandidate(parentPath(normalizedProject));
    }
    pushCandidate(joinPath(normalizedProject, "Server"));
  }

  return candidates;
}

function collectJsonFilePaths(entries: DirectoryEntryData[]): string[] {
  const result: string[] = [];
  const stack = [...entries];
  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry) continue;
    if (entry.is_dir) {
      if (Array.isArray(entry.children)) {
        for (const child of entry.children) {
          stack.push(child);
        }
      }
      continue;
    }
    if (entry.path.toLowerCase().endsWith(".json")) {
      result.push(entry.path);
    }
  }
  return result;
}

function fileStem(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const fileName = normalized.slice(normalized.lastIndexOf("/") + 1);
  return fileName.replace(/\.json$/i, "");
}

function createAssetNameIndex(paths: string[]): Map<string, string> {
  const sortedPaths = [...paths].sort((a, b) => a.localeCompare(b));
  const index = new Map<string, string>();
  for (const path of sortedPaths) {
    const key = fileStem(path).toLowerCase();
    if (!index.has(key)) {
      index.set(key, path);
    }
  }
  return index;
}

async function buildAssetIndex(
  serverRoot: string,
  deps: ResolveBiomeAtmosphereDeps,
): Promise<AssetIndex> {
  const environmentsDir = joinPath(serverRoot, "Environments");
  const weathersDir = joinPath(serverRoot, "Weathers");
  const [environmentEntries, weatherEntries] = await Promise.all([
    deps.listDirectoryFn(environmentsDir),
    deps.listDirectoryFn(weathersDir),
  ]);
  return {
    environmentPaths: createAssetNameIndex(collectJsonFilePaths(environmentEntries)),
    weatherPaths: createAssetNameIndex(collectJsonFilePaths(weatherEntries)),
  };
}

async function getAssetIndex(
  serverRoot: string,
  deps: ResolveBiomeAtmosphereDeps,
): Promise<AssetIndex> {
  const key = serverRoot.toLowerCase();
  if (!assetIndexCache.has(key)) {
    const pending = buildAssetIndex(serverRoot, deps).catch((error) => {
      assetIndexCache.delete(key);
      throw error;
    });
    assetIndexCache.set(key, pending);
  }
  return assetIndexCache.get(key)!;
}

export function clearResolveBiomeAtmosphereCache(): void {
  assetIndexCache.clear();
}

function normalizeAssetName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const withoutExtension = trimmed.replace(/\.json$/i, "");
  if (withoutExtension.toLowerCase() === "default") return "Default";
  return withoutExtension;
}

function getRangeMidpoint(range: unknown): number | null {
  const rangeObj = asRecord(range);
  if (!rangeObj) return null;

  const min = toFiniteNumber(
    rangeObj.MinInclusive ?? rangeObj.Min ?? rangeObj.From,
  );
  const max = toFiniteNumber(
    rangeObj.MaxExclusive ?? rangeObj.Max ?? rangeObj.To,
  );

  if (min !== null && max !== null) return (min + max) * 0.5;
  if (min !== null) return min;
  if (max !== null) return max;
  return null;
}

function pickEnvironmentFromDelimiter(delimiter: unknown): string | null {
  const delimiterObj = asRecord(delimiter);
  if (!delimiterObj) return null;

  const nestedProvider = asRecord(delimiterObj.Environment);
  if (nestedProvider) {
    return pickEnvironmentNameFromProvider(nestedProvider);
  }

  return normalizeAssetName(delimiterObj.Environment);
}

function pickEnvironmentFromDelimiters(delimiters: unknown): string | null {
  if (!Array.isArray(delimiters)) return null;

  const candidates = delimiters
    .map((delimiter, index) => {
      const delimiterObj = asRecord(delimiter);
      const environmentName = pickEnvironmentFromDelimiter(delimiterObj);
      if (!environmentName) return null;
      const rangeMidpoint = getRangeMidpoint(delimiterObj?.Range);
      return {
        environmentName,
        rangeMidpoint,
        index,
      };
    })
    .filter((candidate): candidate is { environmentName: string; rangeMidpoint: number | null; index: number } => candidate !== null);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const aScore = a.rangeMidpoint ?? Number.NEGATIVE_INFINITY;
    const bScore = b.rangeMidpoint ?? Number.NEGATIVE_INFINITY;
    if (aScore === bScore) return a.index - b.index;
    return bScore - aScore;
  });

  return candidates[0].environmentName;
}

export function pickEnvironmentNameFromProvider(provider: unknown): string | null {
  const providerObj = asRecord(provider);
  if (!providerObj) return null;

  const type = typeof providerObj.Type === "string" ? providerObj.Type : "";
  if (type === "Default") return "Default";
  if (type === "Constant") {
    return normalizeAssetName(providerObj.Environment);
  }
  if (type === "Imported" || type === "Exported") {
    return normalizeAssetName(providerObj.Name);
  }
  if (type === "DensityDelimited") {
    return pickEnvironmentFromDelimiters(providerObj.Delimiters);
  }

  const directEnvironment = normalizeAssetName(providerObj.Environment);
  if (directEnvironment) return directEnvironment;
  return pickEnvironmentFromDelimiters(providerObj.Delimiters);
}

function deepMergeRecords(base: JsonRecord, override: JsonRecord): JsonRecord {
  const merged: JsonRecord = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = merged[key];
    const baseObj = asRecord(baseValue);
    const valueObj = asRecord(value);
    if (baseObj && valueObj) {
      merged[key] = deepMergeRecords(baseObj, valueObj);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

async function loadEnvironmentWithParents(
  environmentName: string,
  assetIndex: AssetIndex,
  deps: ResolveBiomeAtmosphereDeps,
): Promise<LoadedEnvironment> {
  const warnings: string[] = [];
  const requestedPath = assetIndex.environmentPaths.get(environmentName.toLowerCase()) ?? null;
  if (!requestedPath) {
    warnings.push(`Environment "${environmentName}" was not found in Server/Environments.`);
    return { mergedEnvironment: null, requestedPath: null, warnings };
  }

  const chain: JsonRecord[] = [];
  const visited = new Set<string>();
  let currentEnvironment: string | null = environmentName;

  while (currentEnvironment) {
    const key = currentEnvironment.toLowerCase();
    if (visited.has(key)) {
      warnings.push(`Environment parent cycle detected at "${currentEnvironment}".`);
      break;
    }
    visited.add(key);

    const envPath = assetIndex.environmentPaths.get(key);
    if (!envPath) {
      warnings.push(`Environment "${currentEnvironment}" was not found in Server/Environments.`);
      break;
    }

    const rawEnv = await deps.readAssetFileFn(envPath);
    const env = asRecord(rawEnv);
    if (!env) {
      warnings.push(`Environment file "${envPath}" is not a JSON object.`);
      break;
    }

    chain.unshift(env);
    currentEnvironment = normalizeAssetName(env.Parent);
  }

  if (chain.length === 0) {
    return { mergedEnvironment: null, requestedPath, warnings };
  }

  const mergedEnvironment = chain.reduce<JsonRecord>((acc, env) => deepMergeRecords(acc, env), {});
  return { mergedEnvironment, requestedPath, warnings };
}

function pickClosestHourBucket(
  buckets: Array<{ hour: number; options: unknown }>,
  hour: number,
): unknown {
  if (buckets.length === 0) return null;
  const normalized = normalizeHour(hour);

  let bestBucket = buckets[0];
  let bestDistance = hourDistance(normalized, bestBucket.hour);
  for (let i = 1; i < buckets.length; i++) {
    const candidate = buckets[i];
    const distance = hourDistance(normalized, candidate.hour);
    if (distance < bestDistance) {
      bestBucket = candidate;
      bestDistance = distance;
    }
  }

  return bestBucket.options;
}

export function selectForecastWeatherId(weatherForecasts: unknown, hour: number): string | null {
  const forecastObj = asRecord(weatherForecasts);
  if (!forecastObj) return null;

  const buckets = Object.entries(forecastObj)
    .map(([hourKey, options]) => {
      const parsedHour = Number(hourKey);
      if (!Number.isFinite(parsedHour)) return null;
      return {
        hour: normalizeHour(parsedHour),
        options,
      };
    })
    .filter((bucket): bucket is { hour: number; options: unknown } => bucket !== null);

  const selectedBucket = pickClosestHourBucket(buckets, hour);
  if (!Array.isArray(selectedBucket)) return null;

  let bestWeatherId: string | null = null;
  let bestWeight = Number.NEGATIVE_INFINITY;

  for (const option of selectedBucket) {
    const optionObj = asRecord(option);
    if (!optionObj) continue;
    const weatherId = normalizeAssetName(optionObj.WeatherId ?? optionObj.Weather);
    if (!weatherId) continue;

    const weight = toFiniteNumber(optionObj.Weight) ?? 0;
    if (weight > bestWeight) {
      bestWeight = weight;
      bestWeatherId = weatherId;
    }
  }

  return bestWeatherId;
}

const HEX6_COLOR_RE = /^#([0-9a-fA-F]{6})$/;
const HEX8_COLOR_RE = /^#([0-9a-fA-F]{8})$/;
const RGBA_HEX_COLOR_RE = /^rgba\(\s*#([0-9a-fA-F]{6})(?:[0-9a-fA-F]{2})?\s*,\s*[0-9]*\.?[0-9]+\s*\)$/i;

export function normalizeColorToken(color: unknown): string | null {
  if (typeof color !== "string") return null;
  const trimmed = color.trim();

  const hex6 = HEX6_COLOR_RE.exec(trimmed);
  if (hex6) return `#${hex6[1].toLowerCase()}`;

  const hex8 = HEX8_COLOR_RE.exec(trimmed);
  if (hex8) return `#${hex8[1].slice(0, 6).toLowerCase()}`;

  const rgbaHex = RGBA_HEX_COLOR_RE.exec(trimmed);
  if (rgbaHex) return `#${rgbaHex[1].toLowerCase()}`;

  return null;
}

function parseHourlyValues<T>(
  timeline: unknown,
  valueExtractor: (entry: JsonRecord) => T | null,
): Array<HourValue<T>> {
  if (!Array.isArray(timeline)) return [];
  const entries: Array<HourValue<T>> = [];
  for (const rawEntry of timeline) {
    const entry = asRecord(rawEntry);
    if (!entry) continue;
    const parsedHour = toFiniteNumber(entry.Hour);
    if (parsedHour === null) continue;
    const parsedValue = valueExtractor(entry);
    if (parsedValue === null) continue;
    entries.push({
      hour: normalizeHour(parsedHour),
      value: parsedValue,
    });
  }
  return entries.sort((a, b) => a.hour - b.hour);
}

function sampleHourlyValue<T>(values: Array<HourValue<T>>, hour: number): T | null {
  if (values.length === 0) return null;
  const normalized = normalizeHour(hour);

  let selected = values[values.length - 1].value;
  for (const value of values) {
    if (value.hour > normalized) break;
    selected = value.value;
  }
  return selected;
}

function sampleColorTimeline(timeline: unknown, hour: number): string | null {
  const rawColors = parseHourlyValues<string>(timeline, (entry) => {
    if (typeof entry.Color !== "string") return null;
    return entry.Color;
  });
  const sampledRaw = sampleHourlyValue(rawColors, hour);
  return normalizeColorToken(sampledRaw);
}

function parseFogDistance(fogDistance: unknown): [number, number] | null {
  if (!Array.isArray(fogDistance) || fogDistance.length < 2) return null;
  const near = toFiniteNumber(fogDistance[0]);
  const far = toFiniteNumber(fogDistance[1]);
  if (near === null || far === null) return null;
  return [near, far];
}

function clampByte(value: number): number {
  if (value <= 0) return 0;
  if (value >= 255) return 255;
  return Math.round(value);
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.slice(1);
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function rgbToHex(rgb: [number, number, number]): string {
  const [r, g, b] = rgb.map(clampByte) as [number, number, number];
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function blendHexColors(a: string, b: string, t: number): string {
  const clampedT = Math.max(0, Math.min(1, t));
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex([
    ar + (br - ar) * clampedT,
    ag + (bg - ag) * clampedT,
    ab + (bb - ab) * clampedT,
  ]);
}

function scaleHexColor(hex: string, scale: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([r * scale, g * scale, b * scale]);
}

function deriveAmbientColor(
  sunColor: string,
  fogColor: string,
  skyHorizon: string,
): string {
  const fogSkyMix = blendHexColors(fogColor, skyHorizon, 0.5);
  const litMix = blendHexColors(fogSkyMix, sunColor, 0.35);
  return scaleHexColor(litMix, 0.75);
}

function buildAtmosphereSettings(
  environment: JsonRecord | null,
  weather: JsonRecord | null,
  hour: number,
): AtmosphereSettings {
  const skyHorizon =
    sampleColorTimeline(weather?.SkyBottomColors, hour) ??
    FALLBACK_ATMOSPHERE_SETTINGS.skyHorizon;
  const skyZenith =
    sampleColorTimeline(weather?.SkyTopColors, hour) ??
    FALLBACK_ATMOSPHERE_SETTINGS.skyZenith;
  const sunsetColor =
    sampleColorTimeline(weather?.SkySunsetColors, hour) ??
    FALLBACK_ATMOSPHERE_SETTINGS.sunsetColor;
  const fogColor =
    sampleColorTimeline(weather?.FogColors, hour) ??
    skyHorizon;
  const sunColor =
    sampleColorTimeline(weather?.SunColors, hour) ??
    FALLBACK_ATMOSPHERE_SETTINGS.sunColor;
  const sunGlowColor =
    sampleColorTimeline(weather?.SunGlowColors, hour) ??
    sunColor;

  const sunlightColor = sampleColorTimeline(weather?.SunlightColors, hour);
  const ambientColor = sunlightColor ?? deriveAmbientColor(sunColor, fogColor, skyHorizon);

  const waterTint =
    sampleColorTimeline(weather?.WaterTints, hour) ??
    normalizeColorToken(weather?.WaterTint) ??
    normalizeColorToken(environment?.WaterTint) ??
    FALLBACK_ATMOSPHERE_SETTINGS.waterTint;

  const fogDistance = parseFogDistance(weather?.FogDistance);
  const fogNear = fogDistance?.[0] ?? FALLBACK_ATMOSPHERE_SETTINGS.fogNear;
  const fogFar = fogDistance?.[1] ?? FALLBACK_ATMOSPHERE_SETTINGS.fogFar;

  return {
    skyHorizon,
    skyZenith,
    sunsetColor,
    sunGlowColor,
    cloudDensity: FALLBACK_ATMOSPHERE_SETTINGS.cloudDensity,
    fogColor,
    fogNear,
    fogFar,
    ambientColor,
    sunColor,
    waterTint,
  };
}

function fallbackResult(
  hour: number,
  warnings: string[],
  environmentName: string | null,
): ResolveBiomeAtmosphereResult {
  return {
    settings: { ...FALLBACK_ATMOSPHERE_SETTINGS },
    metadata: {
      source: "fallback",
      serverRoot: null,
      environmentName,
      environmentPath: null,
      weatherId: null,
      weatherPath: null,
      hour,
      warnings,
    },
  };
}

export async function resolveBiomeAtmosphere(
  input: ResolveBiomeAtmosphereInput,
  depsOverride: Partial<ResolveBiomeAtmosphereDeps> = {},
): Promise<ResolveBiomeAtmosphereResult> {
  const deps: ResolveBiomeAtmosphereDeps = {
    listDirectoryFn: depsOverride.listDirectoryFn ?? listDirectory,
    readAssetFileFn: depsOverride.readAssetFileFn ?? readAssetFile,
  };

  const hour = normalizeHour(
    Number.isFinite(input.hour) ? (input.hour as number) : DEFAULT_HOUR,
  );
  const warnings: string[] = [];
  const biomeConfig = asRecord(input.biomeConfig);
  const environmentProvider = biomeConfig?.EnvironmentProvider;
  const environmentName = pickEnvironmentNameFromProvider(environmentProvider);

  if (!environmentName) {
    warnings.push("Biome has no resolvable EnvironmentProvider.");
    return fallbackResult(hour, warnings, null);
  }

  const candidateServerRoots = buildServerRootCandidates(input.biomeFilePath, input.projectPath);
  if (candidateServerRoots.length === 0) {
    warnings.push("Could not infer a Server root path for Environment/Weather asset lookup.");
    return fallbackResult(hour, warnings, environmentName);
  }

  let lastError: string | null = null;

  for (const serverRoot of candidateServerRoots) {
    try {
      const assetIndex = await getAssetIndex(serverRoot, deps);
      const resolvedEnvironmentName = assetIndex.environmentPaths.has(environmentName.toLowerCase())
        ? environmentName
        : assetIndex.environmentPaths.has("default")
          ? "Default"
          : null;

      if (!resolvedEnvironmentName) {
        warnings.push(`Environment "${environmentName}" was not found under ${serverRoot}.`);
        continue;
      }

      const loadedEnvironment = await loadEnvironmentWithParents(
        resolvedEnvironmentName,
        assetIndex,
        deps,
      );
      warnings.push(...loadedEnvironment.warnings);

      if (!loadedEnvironment.mergedEnvironment) {
        continue;
      }

      const weatherId = selectForecastWeatherId(
        loadedEnvironment.mergedEnvironment.WeatherForecasts,
        hour,
      );

      let weatherPath: string | null = null;
      let weatherJson: JsonRecord | null = null;

      if (weatherId) {
        weatherPath = assetIndex.weatherPaths.get(weatherId.toLowerCase()) ?? null;
        if (weatherPath) {
          const rawWeather = await deps.readAssetFileFn(weatherPath);
          weatherJson = asRecord(rawWeather);
          if (!weatherJson) {
            warnings.push(`Weather file "${weatherPath}" is not a JSON object.`);
          }
        } else {
          warnings.push(`Weather "${weatherId}" was not found in Server/Weathers.`);
        }
      } else {
        warnings.push(`Environment "${resolvedEnvironmentName}" did not resolve a weather forecast.`);
      }

      const settings = buildAtmosphereSettings(
        loadedEnvironment.mergedEnvironment,
        weatherJson,
        hour,
      );

      return {
        settings,
        metadata: {
          source: "hytale-assets",
          serverRoot,
          environmentName: resolvedEnvironmentName,
          environmentPath: loadedEnvironment.requestedPath,
          weatherId,
          weatherPath,
          hour,
          warnings,
        },
      };
    } catch (error) {
      lastError = String(error);
    }
  }

  if (lastError) {
    warnings.push(`Atmosphere resolution failed: ${lastError}`);
  }
  return fallbackResult(hour, warnings, environmentName);
}
