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

function collectNodesByType(
  value: unknown,
  type: string,
  found: Record<string, unknown>[] = [],
): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    for (const item of value) collectNodesByType(item, type, found);
    return found;
  }
  if (!value || typeof value !== "object") return found;

  const record = value as Record<string, unknown>;
  if (record.Type === type) found.push(record);
  for (const child of Object.values(record)) collectNodesByType(child, type, found);
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

  it("creates, exports, re-imports, and previews a Fullmetal-style biome", () => {
    const biomeName = "Codex_Lab_Test_Biome";
    const internalBiome = {
      Name: biomeName,
      Terrain: {
        Type: "DAOTerrain",
        Density: {
          Type: "Min",
          Inputs: [
            {
              Type: "Mix",
              InputA: {
                Type: "Max",
                Inputs: [
                  {
                    Type: "Sum",
                    Inputs: [
                      {
                        Type: "Inverter",
                        Input: {
                          Type: "SimplexNoise2D",
                          Lacunarity: 2,
                          Persistence: 0.55,
                          Octaves: 3,
                          Scale: 120,
                          Seed: "7",
                        },
                      },
                      {
                        Type: "CurveMapper",
                        Curve: {
                          Type: "Manual",
                          Points: [
                            { x: 40, y: 1 },
                            { x: 80, y: -1 },
                          ],
                        },
                        Input: {
                          Type: "BaseHeight",
                          BaseHeightName: "Base",
                          Distance: true,
                        },
                      },
                    ],
                  },
                  { Type: "Constant", Value: -0.25 },
                ],
              },
              InputB: { Type: "Constant", Value: 1 },
              Factor: {
                Type: "Pow",
                Exponent: 3,
                Input: {
                  Type: "Normalizer",
                  SourceRange: { Min: 0, Max: 1 },
                  TargetRange: { Min: 0.3, Max: 1 },
                  Input: {
                    Type: "Abs",
                    Input: {
                      Type: "SimplexNoise2D",
                      Lacunarity: 1.5,
                      Persistence: 0.7,
                      Octaves: 3,
                      Scale: 55,
                      Seed: "77",
                    },
                  },
                },
              },
            },
            { Type: "Constant", Value: 0.8 },
          ],
        },
      },
      MaterialProvider: {
        Type: "Constant",
        Material: "stone",
      },
      Props: [],
      EnvironmentProvider: {
        Type: "Constant",
        Environment: "default",
      },
      TintProvider: {
        Type: "Constant",
        Color: "#ffffff",
      },
    };

    const exported = internalToHytaleBiome(internalBiome);
    const exportedTerrain = exported.Terrain as { Type?: unknown; Density?: Record<string, unknown> };

    expect(exported.Name).toBe(biomeName);
    expect(exportedTerrain.Type).toBe("DAOTerrain");
    expect(exportedTerrain.Density).toBeDefined();
    expect(exported.Props).toEqual([]);
    expect(exported.MaterialProvider).toMatchObject({ Type: "Solidity" });
    expect(exported.EnvironmentProvider).toMatchObject({ Type: "Constant" });
    expect(exported.TintProvider).toMatchObject({ Type: "Constant" });

    const leakedTypes = [...collectTypes(exported)].filter((type) => internalOnlyTypes.has(type));
    expect(leakedTypes).toEqual([]);

    const mixNodes = collectNodesByType(exportedTerrain.Density, "Mix");
    expect(mixNodes.length).toBeGreaterThan(0);
    for (const mixNode of mixNodes) {
      expect(Array.isArray(mixNode.Inputs), "Mix should export Hytale Inputs[]").toBe(true);
      expect(mixNode.Inputs).toHaveLength(3);
      expect(mixNode.InputA).toBeUndefined();
      expect(mixNode.InputB).toBeUndefined();
      expect(mixNode.Factor).toBeUndefined();
    }
    expect(collectNodesByType(exportedTerrain.Density, "Pow")).toHaveLength(1);
    expect(collectNodesByType(exportedTerrain.Density, "Abs")).toHaveLength(1);

    const worldStructure = {
      Type: "NoiseRange",
      Biomes: [{ Biome: biomeName, Min: -1, Max: 1 }],
      DefaultBiome: biomeName,
      DefaultTransitionDistance: 32,
      MaxBiomeEdgeDistance: 5,
      Density: { Type: "Imported", Name: "Biome-Map" },
      ContentFields: [{ Type: "BaseHeight", Name: "Base", Y: 0 }],
    };
    const biomeRefs = [
      worldStructure.DefaultBiome,
      ...worldStructure.Biomes.map((range) => range.Biome),
    ];
    expect(biomeRefs.every((ref) => ref === exported.Name)).toBe(true);

    const imported = normalizeImport(exported);
    const importedTerrain = imported.Terrain as { Density?: Record<string, unknown> } | undefined;
    expect(importedTerrain?.Density).toBeDefined();

    const { nodes, edges } = jsonToGraph(importedTerrain!.Density!, 0, 0, "fullmetal-created");
    expect(nodes.some((node) => (node.data as Record<string, unknown>).type === "Mix")).toBe(true);

    const result = evaluateDensityGrid(nodes, edges, 24, -128, 128, 64, undefined, {
      contentFields: { Base: 0 },
    });

    expect(result.values).toHaveLength(24 * 24);
    expect(result.values.every(Number.isFinite)).toBe(true);
    expect(result.maxValue - result.minValue).toBeGreaterThan(0.01);
  });
});
