import { describe, expect, it, vi } from "vitest";
import { normalizeImport } from "../fileTypeDetection";
import { internalToHytaleBiome } from "../internalToHytale";
import { jsonToGraph } from "../jsonToGraph";
import { evaluateDensityGrid } from "../densityEvaluator";
import { SNIPPET_CATALOG } from "@/schema/snippets";
import { isPaletteTypeKeyVisible } from "@/nodes/shared/legacyTypes";

const internalOnlyTypes = new Set([
  "Product",
  "LinearTransform",
  "CurveFunction",
  "DomainWarp2D",
  "DomainWarp3D",
  "Negate",
  "CoordinateX",
  "CoordinateY",
  "CoordinateZ",
  "CacheOnce",
  "VoronoiNoise2D",
  "VoronoiNoise3D",
  "Conditional",
  "Blend",
  "BlendCurve",
  "GradientDensity",
  "SimplexRidgeNoise2D",
  "SimplexRidgeNoise3D",
  "FractalNoise2D",
  "FractalNoise3D",
  "HeightGradient",
  "DensityBased",
]);

const templateModules = import.meta.glob("../../../templates/**/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

const templateJsonByPath = new Map(
  Object.entries(templateModules).map(([modulePath, json]) => [
    modulePath.replace(/\\/g, "/").replace("../../../templates/", ""),
    json,
  ]),
);

function cloneJson(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function readTemplateJson(relativePath: string): Record<string, unknown> {
  const normalizedPath = relativePath.replace(/\\/g, "/");
  const json = templateJsonByPath.get(normalizedPath);
  expect(json, `${normalizedPath} should exist`).toBeDefined();
  return cloneJson(json);
}

function findTemplateJsonFiles(relativeRoot: string): string[] {
  const prefix = `${relativeRoot.replace(/\\/g, "/").replace(/\/$/, "")}/`;
  return [...templateJsonByPath.keys()].filter((file) => file.startsWith(prefix)).sort();
}

function findHytaleGeneratorRoots(): string[] {
  const roots = new Set<string>();
  for (const filePath of templateJsonByPath.keys()) {
    if (filePath.startsWith("hytale-pre-release/")) continue;
    const parts = filePath.split("/");
    const index = parts.indexOf("HytaleGenerator");
    if (index >= 0) roots.add(parts.slice(0, index + 1).join("/"));
  }
  return [...roots].sort();
}

function findBundledGeneratorRoots(): string[] {
  return findHytaleGeneratorRoots().filter((root) => root.includes("/Server/HytaleGenerator"));
}

function collectTypes(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectTypes(item, found);
    return found;
  }
  if (!value || typeof value !== "object") return found;

  const record = value as Record<string, unknown>;
  if (typeof record.Type === "string") found.add(record.Type);
  for (const child of Object.values(record)) collectTypes(child, found);
  return found;
}

describe("bundled template Hytale fidelity", () => {
  it("bundled templates use the real Server/HytaleGenerator asset-pack layout", () => {
    for (const generatorRoot of findHytaleGeneratorRoots()) {
      expect(generatorRoot, `${generatorRoot} should live under Server/HytaleGenerator`).toContain("/Server/HytaleGenerator");
    }
  });

  it("does not ship orphan world structure roots without sibling biomes", () => {
    for (const generatorRoot of findHytaleGeneratorRoots()) {
      const worldStructures = findTemplateJsonFiles(`${generatorRoot}/WorldStructures`);
      if (worldStructures.length === 0) continue;

      const biomes = findTemplateJsonFiles(`${generatorRoot}/Biomes`);
      expect(biomes.length, `${generatorRoot} has WorldStructures but no sibling Biomes`).toBeGreaterThan(0);
    }
  });

  it("world structure biome references match sibling biome Name values", () => {
    for (const relativeRoot of findBundledGeneratorRoots()) {
      const biomeFiles = findTemplateJsonFiles(`${relativeRoot}/Biomes`);
      const biomeNames = new Set(
        biomeFiles
          .map((file) => readTemplateJson(file).Name)
          .filter((name): name is string => typeof name === "string"),
      );

      expect(biomeNames.size, `${relativeRoot} should define at least one biome Name`).toBeGreaterThan(0);

      for (const worldStructureFile of findTemplateJsonFiles(`${relativeRoot}/WorldStructures`)) {
        const worldStructure = readTemplateJson(worldStructureFile);
        const refs = [
          worldStructure.DefaultBiome,
          ...((worldStructure.Biomes as Array<{ Biome?: unknown }> | undefined) ?? []).map((range) => range.Biome),
        ].filter((name): name is string => typeof name === "string");

        expect(refs.length, `${worldStructureFile} should reference at least one biome`).toBeGreaterThan(0);
        for (const ref of refs) {
          expect(biomeNames.has(ref), `${worldStructureFile} references missing biome "${ref}"`).toBe(true);
        }
      }
    }
  });

  it("exports bundled biome templates without TerraNova-only type names", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      for (const relativeRoot of findBundledGeneratorRoots()) {
        for (const biomeFile of findTemplateJsonFiles(`${relativeRoot}/Biomes`)) {
          const internal = normalizeImport(readTemplateJson(biomeFile));
          const exported = internalToHytaleBiome(internal);
          const leakedTypes = [...collectTypes(exported)].filter((type) => internalOnlyTypes.has(type));
          expect(leakedTypes, `${biomeFile} leaked internal type names on export`).toEqual([]);
        }
      }
    } finally {
      warn.mockRestore();
    }
  });

  it("ships snippets with current Hytale-facing type names", () => {
    const hiddenSnippetTypes = SNIPPET_CATALOG.flatMap((snippet) =>
      snippet.nodes
        .filter((node) => !isPaletteTypeKeyVisible(node.type))
        .map((node) => `${snippet.id}:${node.localId}:${node.type}`),
    );

    expect(hiddenSnippetTypes).toEqual([]);
  });

  it("forest hills terrain can generate non-flat preview grid values", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const biome = normalizeImport(
        readTemplateJson("forest-hills/Server/HytaleGenerator/Biomes/ForestHillsBiome.json"),
      );
      const terrain = biome.Terrain as { Density?: Record<string, unknown> } | undefined;
      expect(terrain?.Density).toBeDefined();

      const { nodes, edges } = jsonToGraph(terrain!.Density!, 0, 0, "terrain");
      const result = evaluateDensityGrid(nodes, edges, 16, -128, 128, 64);

      expect(result.values).toHaveLength(16 * 16);
      expect(result.values.every(Number.isFinite)).toBe(true);
      expect(result.maxValue - result.minValue).toBeGreaterThan(0.01);
    } finally {
      warn.mockRestore();
    }
  });

  it("Fullmetal-style native Hytale density graphs can drive preview values", () => {
    const hytaleBiome = {
      $NodeId: "Biome-test",
      Name: "Mid_Lab_Biome",
      Terrain: {
        $NodeId: "Terrain-test",
        Type: "DAOTerrain",
        Density: {
          $NodeId: "MinDensityNode-test",
          Type: "Min",
          Skip: false,
          Inputs: [
            {
              $NodeId: "Mix.Density-test",
              Type: "Mix",
              Skip: false,
              Inputs: [
                {
                  $NodeId: "MaxDensityNode-test",
                  Type: "Max",
                  Skip: false,
                  Inputs: [
                    {
                      $NodeId: "SumDensityNode-test",
                      Type: "Sum",
                      Skip: false,
                      Inputs: [
                        {
                          $NodeId: "InverterDensityNode-test",
                          Type: "Inverter",
                          Skip: false,
                          Inputs: [
                            {
                              $NodeId: "SimplexNoise2DDensityNode-test",
                              Type: "SimplexNoise2D",
                              Skip: false,
                              Lacunarity: 2,
                              Persistence: 0.55,
                              Octaves: 3,
                              Scale: 120,
                              Seed: "7",
                            },
                          ],
                        },
                        {
                          $NodeId: "CurveMapper.Density-test",
                          Type: "CurveMapper",
                          Skip: false,
                          Curve: {
                            $NodeId: "ManualCurve-test",
                            Type: "Manual",
                            Points: [
                              { $NodeId: "CurvePoint-a", In: 40, Out: 1 },
                              { $NodeId: "CurvePoint-b", In: 80, Out: -1 },
                            ],
                          },
                          Inputs: [
                            {
                              $NodeId: "BaseHeight.Density-test",
                              Type: "BaseHeight",
                              Skip: false,
                              BaseHeightName: "Base",
                              Distance: true,
                            },
                          ],
                        },
                      ],
                    },
                    { $NodeId: "ConstantDensityNode-a", Type: "Constant", Skip: false, Value: -0.25 },
                  ],
                },
                { $NodeId: "ConstantDensityNode-b", Type: "Constant", Skip: false, Value: 1 },
                {
                  $NodeId: "NormalizerDensityNode-test",
                  Type: "Normalizer",
                  Skip: false,
                  FromMin: -1,
                  FromMax: 1,
                  ToMin: 0,
                  ToMax: 1,
                  Inputs: [
                    {
                      $NodeId: "SimplexNoise2DDensityNode-factor",
                      Type: "SimplexNoise2D",
                      Skip: false,
                      Lacunarity: 2,
                      Persistence: 0.5,
                      Octaves: 2,
                      Scale: 200,
                      Seed: "mix",
                    },
                  ],
                },
              ],
            },
            { $NodeId: "ConstantDensityNode-c", Type: "Constant", Skip: false, Value: 0.8 },
          ],
        },
      },
    };

    const internal = normalizeImport(hytaleBiome);
    const terrain = internal.Terrain as { Density?: Record<string, unknown> } | undefined;
    expect(terrain?.Density).toBeDefined();

    const { nodes, edges } = jsonToGraph(terrain!.Density!, 0, 0, "fullmetal");
    const result = evaluateDensityGrid(nodes, edges, 16, -128, 128, 64, undefined, {
      contentFields: { Base: 0 },
    });

    expect(result.values.every(Number.isFinite)).toBe(true);
    expect(result.maxValue - result.minValue).toBeGreaterThan(0.01);
  });
});
