import { beforeEach, describe, expect, it } from "vitest";
import type { DirectoryEntryData } from "@/utils/ipc";
import {
  clearResolveBiomeAtmosphereCache,
  normalizeColorToken,
  pickEnvironmentNameFromProvider,
  resolveBiomeAtmosphere,
  selectForecastWeatherId,
} from "../resolveBiomeAtmosphere";

function fileEntry(path: string): DirectoryEntryData {
  const normalized = path.replace(/\\/g, "/");
  return {
    name: normalized.slice(normalized.lastIndexOf("/") + 1),
    path,
    is_dir: false,
  };
}

describe("resolveBiomeAtmosphere", () => {
  beforeEach(() => {
    clearResolveBiomeAtmosphereCache();
  });

  it("picks the most overground environment from DensityDelimited provider ranges", () => {
    const env = pickEnvironmentNameFromProvider({
      Type: "DensityDelimited",
      Delimiters: [
        {
          Range: { MinInclusive: -2, MaxExclusive: 0 },
          Environment: { Type: "Constant", Environment: "Env_Zone1_Caves" },
        },
        {
          Range: { MinInclusive: 0, MaxExclusive: 2 },
          Environment: { Type: "Constant", Environment: "Env_Zone1" },
        },
      ],
    });

    expect(env).toBe("Env_Zone1");
  });

  it("normalizes color tokens from native weather formats", () => {
    expect(normalizeColorToken("#ABCDEF")).toBe("#abcdef");
    expect(normalizeColorToken("#ABCDEF88")).toBe("#abcdef");
    expect(normalizeColorToken("rgba(#B35DFA, 0.62)")).toBe("#b35dfa");
    expect(normalizeColorToken("not-a-color")).toBeNull();
  });

  it("selects the highest-weight weather in the nearest forecast hour bucket", () => {
    const weatherId = selectForecastWeatherId({
      0: [{ WeatherId: "Night_Clear", Weight: 2 }],
      12: [
        { WeatherId: "Day_Cloudy", Weight: 3 },
        { WeatherId: "Day_Sunny", Weight: 8 },
      ],
    }, 13);

    expect(weatherId).toBe("Day_Sunny");
  });

  it("resolves atmosphere settings from environment and weather assets", async () => {
    const serverRoot = "C:\\Pack\\Server";
    const environmentsDir = `${serverRoot}\\Environments`;
    const weathersDir = `${serverRoot}\\Weathers`;

    const envChildPath = `${environmentsDir}\\Zone1\\Env_Zone1_Biome.json`;
    const envParentPath = `${environmentsDir}\\Zone1\\Env_Zone1.json`;
    const defaultEnvPath = `${environmentsDir}\\Default.json`;
    const weatherSunnyPath = `${weathersDir}\\Zone1\\Zone1_Sunny.json`;
    const weatherCloudyPath = `${weathersDir}\\Zone1\\Zone1_Cloudy.json`;

    const directoryMap: Record<string, DirectoryEntryData[]> = {
      [environmentsDir]: [
        fileEntry(envChildPath),
        fileEntry(envParentPath),
        fileEntry(defaultEnvPath),
      ],
      [weathersDir]: [
        fileEntry(weatherSunnyPath),
        fileEntry(weatherCloudyPath),
      ],
    };

    const fileMap: Record<string, unknown> = {
      [envChildPath]: {
        Parent: "Env_Zone1",
        WaterTint: "#113355",
      },
      [envParentPath]: {
        WeatherForecasts: {
          12: [
            { WeatherId: "Zone1_Cloudy", Weight: 3 },
            { WeatherId: "Zone1_Sunny", Weight: 10 },
          ],
        },
      },
      [defaultEnvPath]: {
        WeatherForecasts: {
          12: [{ WeatherId: "Zone1_Cloudy", Weight: 1 }],
        },
      },
      [weatherSunnyPath]: {
        SkyBottomColors: [{ Hour: 7, Color: "#112233ff" }],
        SkyTopColors: [{ Hour: 7, Color: "rgba(#445566, 1)" }],
        SkySunsetColors: [{ Hour: 7, Color: "#778899" }],
        FogColors: [{ Hour: 7, Color: "#223344" }],
        SunColors: [{ Hour: 7, Color: "#aabbcc" }],
        SunGlowColors: [{ Hour: 7, Color: "#ddeeff" }],
        SunlightColors: [{ Hour: 7, Color: "#334455" }],
        WaterTints: [{ Hour: 10, Color: "#556677" }],
        FogDistance: [-100, 900],
      },
      [weatherCloudyPath]: {
        SkyBottomColors: [{ Hour: 7, Color: "#010101ff" }],
        SkyTopColors: [{ Hour: 7, Color: "#020202ff" }],
      },
    };

    const result = await resolveBiomeAtmosphere(
      {
        biomeConfig: {
          EnvironmentProvider: {
            Type: "Constant",
            Environment: "Env_Zone1_Biome",
          },
        },
        biomeFilePath: `${serverRoot}\\HytaleGenerator\\Biomes\\TestBiome.json`,
        projectPath: "C:\\Pack",
        hour: 12,
      },
      {
        listDirectoryFn: async (path) => {
          if (!(path in directoryMap)) {
            throw new Error(`Unknown directory: ${path}`);
          }
          return directoryMap[path];
        },
        readAssetFileFn: async (path) => {
          if (!(path in fileMap)) {
            throw new Error(`Unknown file: ${path}`);
          }
          return fileMap[path];
        },
      },
    );

    expect(result.metadata.source).toBe("hytale-assets");
    expect(result.metadata.environmentName).toBe("Env_Zone1_Biome");
    expect(result.metadata.weatherId).toBe("Zone1_Sunny");
    expect(result.settings.skyHorizon).toBe("#112233");
    expect(result.settings.skyZenith).toBe("#445566");
    expect(result.settings.sunsetColor).toBe("#778899");
    expect(result.settings.fogColor).toBe("#223344");
    expect(result.settings.sunColor).toBe("#aabbcc");
    expect(result.settings.sunGlowColor).toBe("#ddeeff");
    expect(result.settings.ambientColor).toBe("#334455");
    expect(result.settings.waterTint).toBe("#556677");
    expect(result.settings.fogNear).toBe(-100);
    expect(result.settings.fogFar).toBe(900);
  });

  it("falls back when no environment can be resolved", async () => {
    const result = await resolveBiomeAtmosphere({
      biomeConfig: {
        EnvironmentProvider: { Type: "Constant", Environment: "Env_Missing" },
      },
    });

    expect(result.metadata.source).toBe("fallback");
    expect(result.settings.skyHorizon).toBe("#8fd8f8");
    expect(result.metadata.warnings.length).toBeGreaterThan(0);
  });
});
