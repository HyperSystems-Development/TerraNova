import { isHytaleNativeFormat, hytaleToInternal, hytaleToInternalBiome } from "@/utils/hytaleToInternal";
import { internalToHytale, internalToHytaleBiome } from "@/utils/internalToHytale";
import type { Node } from "@xyflow/react";

/**
 * Detect whether a JSON object is a biome wrapper file (non-typed, contains Terrain).
 */
export function isBiomeFile(content: Record<string, unknown>, filePath: string): boolean {
  if ("Type" in content) return false;
  if ("Terrain" in content) return true;
  const p = filePath.toLowerCase();
  return p.includes("/biomes/") || p.includes("\\biomes\\");
}

/**
 * Detect whether a JSON object is a Settings file (flat config, no Type field).
 * Accepts any file named settings.json inside a /settings/ directory, or any
 * non-typed file that contains 2+ of the 5 known settings keys.
 */
export function isSettingsFile(content: Record<string, unknown>, filePath: string): boolean {
  if ("Type" in content) return false;
  const pathLower = filePath.toLowerCase();
  // Path-based: any settings.json inside a settings directory
  if (pathLower.endsWith("settings.json") && (pathLower.includes("/settings/") || pathLower.includes("\\settings\\"))) {
    return true;
  }
  // Content heuristic: 2+ of the 5 known settings keys (without a Type field)
  const SETTINGS_KEYS = ["CustomConcurrency", "BufferCapacityFactor", "TargetViewDistance", "TargetPlayerCount", "StatsCheckpoints"];
  const matchCount = SETTINGS_KEYS.filter((k) => k in content).length;
  return matchCount >= 2;
}

export function isEnvironmentFile(content: Record<string, unknown>, filePath: string): boolean {
  if ("Type" in content || "Terrain" in content) return false;
  const pathLower = filePath.toLowerCase();
  if (pathLower.includes("/server/environments/") || pathLower.includes("\\server\\environments\\")) {
    return true;
  }
  return "WeatherForecasts" in content && ("Parent" in content || "Tags" in content || "WaterTint" in content || "SpawnDensity" in content);
}

export function isWeatherFile(content: Record<string, unknown>, filePath: string): boolean {
  if ("Type" in content || "Terrain" in content) return false;
  const pathLower = filePath.toLowerCase();
  if (pathLower.includes("/server/weathers/") || pathLower.includes("\\server\\weathers\\")) {
    return true;
  }
  const WEATHER_KEYS = [
    "SkyTopColors",
    "SkyBottomColors",
    "SkySunsetColors",
    "FogColors",
    "FogDistance",
    "Clouds",
    "SunScales",
  ];
  return WEATHER_KEYS.filter((key) => key in content).length >= 2;
}

/**
 * Detect Hytale-specific field names in a JSON tree even when $NodeId is absent.
 * Checks recursively for known Hytale field names that differ from internal names.
 */
function hasHytaleFieldNames(content: Record<string, unknown>): boolean {
  // Hytale-only field names mapped to the types they appear on
  const HYTALE_ONLY_FIELDS: Record<string, string[]> = {
    Scale: ["SimplexNoise2D", "CellNoise2D"],
    Persistence: ["SimplexNoise2D", "SimplexNoise3D", "CellNoise2D", "CellNoise3D"],
    ScaleXZ: ["SimplexNoise3D"],
    WallA: ["Clamp", "SmoothClamp"],
    WallB: ["Clamp", "SmoothClamp"],
    FromMin: ["Normalizer"],
    FromMax: ["Normalizer"],
    ToMin: ["Normalizer"],
    ToMax: ["Normalizer"],
    WarpFactor: ["FastGradientWarp"],
    SpinAngle: ["Rotator"],
    SlideX: ["Slider"],
    SlideY: ["Slider"],
    SlideZ: ["Slider"],
  };

  function check(obj: unknown): boolean {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
    const rec = obj as Record<string, unknown>;
    const type = rec.Type as string | undefined;

    if (type) {
      for (const [field, types] of Object.entries(HYTALE_ONLY_FIELDS)) {
        if (field in rec && types.includes(type)) return true;
      }
    }

    // Recurse into child objects
    for (const value of Object.values(rec)) {
      if (value && typeof value === "object") {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (check(item)) return true;
          }
        } else if (check(value)) {
          return true;
        }
      }
    }
    return false;
  }

  return check(content);
}

/**
 * Auto-detect Hytale native format and convert to internal format if needed.
 * Returns the content in TerraNova internal format ready for jsonToGraph.
 */
export function normalizeImport(content: Record<string, unknown>): Record<string, unknown> {
  if (isHytaleNativeFormat(content) || hasHytaleFieldNames(content)) {
    // Typed asset with $NodeId or Hytale field names -> Hytale native format
    if ("Type" in content) {
      const { asset } = hytaleToInternal(content);
      return asset;
    }
    // Biome wrapper with $NodeId or Hytale field names -> Hytale native biome
    const { wrapper } = hytaleToInternalBiome(content);
    return wrapper;
  }
  return content;
}

/**
 * Convert internal format to Hytale native format for export.
 */
export function normalizeExport(content: Record<string, unknown>, nodes?: Node[]): Record<string, unknown> {
  if ("Type" in content) {
    return internalToHytale(content as { Type: string; [key: string]: unknown }, nodes);
  }
  return content;
}

/**
 * Convert a biome wrapper to Hytale native biome format for export.
 */
export { internalToHytaleBiome };
