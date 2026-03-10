import { SOLID_THRESHOLD, type VoxelMaterial } from "./voxelExtractor";
import { HASH_PRIME_A, HASH_PRIME_B, HASH_PRIME_E } from "@/constants";

/* ── Hytale material color map ───────────────────────────────────── */

const HYTALE_MATERIAL_COLORS: Record<string, string> = {
  // ── Rock / Stone ──
  Stone: "#909090",
  Rock_Stone: "#909090",
  Rock_Granite: "#9e8b7e",
  Rock_Slate: "#5c5c6e",
  Rock_Limestone: "#c4b99a",
  Rock_Basalt: "#3d3d3d",
  Rock_Sandstone: "#d2b48c",
  Rock_Magma_Cooled: "#4a2020",
  Marble: "#e0ddd5",
  Quartzite: "#d6cec0",
  Cobblestone: "#7a7a7a",
  Rock_Andesite: "#888890",
  Rock_Diorite: "#c8c8c0",
  Rock_Obsidian: "#1a0a2e",
  Rock_Pumice: "#b8a898",
  Rock_Chalk: "#f0ede0",
  Rock_Flint: "#666670",
  // ── Soil / Earth ──
  Dirt: "#a0724a",
  Dirt_Dark: "#6e4e30",
  Soil_Dirt: "#a0724a",
  Soil_Mud: "#6b4423",
  Soil_Clay: "#b87333",
  Soil_Sand: "#c2b280",
  Soil_Gravel: "#a0a0a0",
  Soil_Moss: "#4a7a4a",
  Tilled_Soil: "#8a6035",
  Soil_Peat: "#5a3e28",
  Soil_Loam: "#8c6040",
  // ── Sand / Desert ──
  Sand: "#d4c590",
  Sand_White: "#e8dfc8",
  Sand_Red: "#c8704a",
  Sand_Dark: "#b09060",
  // ── Gravel ──
  Gravel: "#a0a0a0",
  Gravel_Dark: "#787878",
  // ── Surface / Grass ──
  Grass: "#5cb85c",
  Soil_Grass: "#5cb85c",
  GrassDeep: "#3e8a3e",
  GrassDeepSunny: "#6ec86e",
  Grass_Dry: "#9aad52",
  Grass_Dead: "#8a8a50",
  Grass_Swamp: "#4a7040",
  Grass_Snow: "#d8dce8",
  // ── Snow / Ice ──
  Snow: "#e8e8f0",
  Ice: "#b0e0e6",
  Ice_Blue: "#88c8e0",
  Packed_Ice: "#9dcad4",
  Snow_Deep: "#dcdce8",
  Frost: "#d0e8f0",
  // ── Wood / Organic ──
  Wood: "#8b6b4a",
  Lightwoods: "#c4a870",
  Softwoods: "#a68b5b",
  Wood_Dark: "#5a3e28",
  Wood_Birch: "#d4c8a0",
  Wood_Oak: "#9a7850",
  Wood_Pine: "#7a5c38",
  Wood_Jungle: "#6a8a38",
  Bark: "#6a5038",
  Planks: "#c4a870",
  // ── Leaves / Vegetation ──
  Leaves: "#3e8a3e",
  Leaves_Oak: "#4a9a4a",
  Leaves_Birch: "#8ab840",
  Leaves_Pine: "#2a6a2a",
  Leaves_Jungle: "#1a8a28",
  Leaves_Autumn_Red: "#c04830",
  Leaves_Autumn_Orange: "#d07820",
  Leaves_Dead: "#7a6a40",
  // ── Fungi / Swamp ──
  Mushroom_Cap: "#c0392b",
  Mushroom_White: "#e8e0d0",
  Mycelium: "#7a5a70",
  Peat_Bog: "#4a3820",
  // ── Zone 4 / Volcanic ──
  Ash: "#c0b8b0",
  Ash_Dark: "#888078",
  Magma: "#d03000",
  Magma_Rock: "#5a2810",
  Lava: "#ff4500",
  Lava_Source: "#ff4500",
  Scorched_Stone: "#3a2828",
  Ember: "#d86020",
  // ── Zone 3 / Arctic ──
  Tundra: "#8a9088",
  Permafrost: "#a8b0b8",
  Lichen: "#8aaa70",
  // ── Zone 2 / Desert ──
  Sandstone_Red: "#c87850",
  Terracotta: "#c07040",
  Caliche: "#d0b888",
  Duricrust: "#b89060",
  // ── Crystals / Ores ──
  Crystal: "#88ccee",
  Crystal_Blue: "#4488dd",
  Crystal_Purple: "#aa44cc",
  Crystal_Red: "#dd3344",
  Ore_Coal: "#3a3a3a",
  Ore_Iron: "#b8916e",
  Ore_Gold: "#ffd700",
  Ore_Copper: "#b87333",
  // ── Fluids ──
  Water: "#4169e1",
  Water_Murky: "#2a5a40",
  Water_Hot: "#4090b0",
  Fluid_Slime_Red: "#c0392b",
  Fluid_Slime_Green: "#40a840",
  // ── Built / Constructed ──
  Bedrock: "#2a2a2a",
  Brick: "#8b4513",
  Stone_Brick: "#7a7a80",
  Mossy_Stone: "#607060",
};

/* ── PBR material properties ─────────────────────────────────────── */

export interface MaterialPBRProperties {
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

const MATERIAL_PROPERTIES: Record<string, MaterialPBRProperties> = {
  // Rock / Stone — rough, matte
  Stone: { roughness: 0.9 },
  Rock_Stone: { roughness: 0.9 },
  Rock_Granite: { roughness: 0.85 },
  Rock_Slate: { roughness: 0.85 },
  Rock_Limestone: { roughness: 0.9 },
  Rock_Basalt: { roughness: 0.9 },
  Rock_Sandstone: { roughness: 0.85 },
  Rock_Magma_Cooled: { roughness: 0.8 },
  Marble: { roughness: 0.4, metalness: 0.05 },
  Quartzite: { roughness: 0.5 },
  Cobblestone: { roughness: 0.9 },
  Rock_Andesite: { roughness: 0.88 },
  Rock_Diorite: { roughness: 0.85 },
  Rock_Obsidian: { roughness: 0.2, metalness: 0.1 },
  Rock_Pumice: { roughness: 0.95 },
  Rock_Chalk: { roughness: 0.85 },
  Rock_Flint: { roughness: 0.75 },
  // Soil / Earth
  Dirt: { roughness: 0.9 },
  Dirt_Dark: { roughness: 0.9 },
  Soil_Dirt: { roughness: 0.9 },
  Soil_Mud: { roughness: 0.95 },
  Soil_Clay: { roughness: 0.85 },
  Soil_Sand: { roughness: 0.8 },
  Soil_Gravel: { roughness: 0.9 },
  Soil_Moss: { roughness: 0.7 },
  Tilled_Soil: { roughness: 0.9 },
  Soil_Peat: { roughness: 0.92 },
  Soil_Loam: { roughness: 0.88 },
  // Sand / Desert
  Sand: { roughness: 0.8 },
  Sand_White: { roughness: 0.75 },
  Sand_Red: { roughness: 0.82 },
  Sand_Dark: { roughness: 0.82 },
  Sandstone_Red: { roughness: 0.85 },
  Terracotta: { roughness: 0.8 },
  Caliche: { roughness: 0.85 },
  Duricrust: { roughness: 0.85 },
  // Grass
  Grass: { roughness: 0.7 },
  Soil_Grass: { roughness: 0.7 },
  GrassDeep: { roughness: 0.7 },
  GrassDeepSunny: { roughness: 0.7 },
  Grass_Dry: { roughness: 0.75 },
  Grass_Dead: { roughness: 0.8 },
  Grass_Swamp: { roughness: 0.72 },
  Grass_Snow: { roughness: 0.65 },
  // Snow / Ice
  Snow: { roughness: 0.6 },
  Snow_Deep: { roughness: 0.58 },
  Frost: { roughness: 0.45 },
  Ice: { roughness: 0.2, metalness: 0.1 },
  Ice_Blue: { roughness: 0.15, metalness: 0.1 },
  Packed_Ice: { roughness: 0.25, metalness: 0.05 },
  Tundra: { roughness: 0.85 },
  Permafrost: { roughness: 0.9 },
  Lichen: { roughness: 0.75 },
  // Wood
  Wood: { roughness: 0.7 },
  Lightwoods: { roughness: 0.65 },
  Softwoods: { roughness: 0.7 },
  Wood_Dark: { roughness: 0.72 },
  Wood_Birch: { roughness: 0.65 },
  Wood_Oak: { roughness: 0.7 },
  Wood_Pine: { roughness: 0.72 },
  Wood_Jungle: { roughness: 0.65 },
  Bark: { roughness: 0.85 },
  Planks: { roughness: 0.65 },
  // Leaves / Vegetation
  Leaves: { roughness: 0.65 },
  Leaves_Oak: { roughness: 0.65 },
  Leaves_Birch: { roughness: 0.65 },
  Leaves_Pine: { roughness: 0.68 },
  Leaves_Jungle: { roughness: 0.62 },
  Leaves_Autumn_Red: { roughness: 0.68 },
  Leaves_Autumn_Orange: { roughness: 0.68 },
  Leaves_Dead: { roughness: 0.75 },
  // Fungi / Swamp
  Mushroom_Cap: { roughness: 0.6 },
  Mushroom_White: { roughness: 0.6 },
  Mycelium: { roughness: 0.8 },
  Peat_Bog: { roughness: 0.9 },
  // Zone 4 / Volcanic
  Ash: { roughness: 0.92 },
  Ash_Dark: { roughness: 0.92 },
  Magma: { roughness: 0.4, emissive: "#d03000", emissiveIntensity: 1.2 },
  Magma_Rock: { roughness: 0.7 },
  Lava: { roughness: 0.3, emissive: "#ff4500", emissiveIntensity: 2.0 },
  Lava_Source: { roughness: 0.3, emissive: "#ff4500", emissiveIntensity: 2.0 },
  Scorched_Stone: { roughness: 0.88 },
  Ember: { roughness: 0.5, emissive: "#d86020", emissiveIntensity: 0.6 },
  // Crystals / Ores
  Crystal: { roughness: 0.1, metalness: 0.2 },
  Crystal_Blue: { roughness: 0.08, metalness: 0.2 },
  Crystal_Purple: { roughness: 0.08, metalness: 0.2 },
  Crystal_Red: { roughness: 0.08, metalness: 0.2 },
  Ore_Coal: { roughness: 0.9 },
  Ore_Iron: { roughness: 0.7, metalness: 0.3 },
  Ore_Gold: { roughness: 0.4, metalness: 0.6 },
  Ore_Copper: { roughness: 0.55, metalness: 0.45 },
  // Fluids
  Bedrock: { roughness: 0.95 },
  Water: { roughness: 0.1, metalness: 0.0 },
  Water_Murky: { roughness: 0.3 },
  Water_Hot: { roughness: 0.15 },
  Fluid_Slime_Red: { roughness: 0.4, emissive: "#c0392b", emissiveIntensity: 0.8 },
  Fluid_Slime_Green: { roughness: 0.4, emissive: "#40a840", emissiveIntensity: 0.5 },
  // Built
  Brick: { roughness: 0.85 },
  Stone_Brick: { roughness: 0.88 },
  Mossy_Stone: { roughness: 0.8 },
};

/**
 * Get PBR properties for a material by name.
 * Falls back to keyword matching if exact name is not found.
 */
export function getMaterialProperties(name: string): MaterialPBRProperties {
  // Exact match
  if (MATERIAL_PROPERTIES[name]) return MATERIAL_PROPERTIES[name];

  // Case-insensitive
  const lower = name.toLowerCase();
  for (const [key, props] of Object.entries(MATERIAL_PROPERTIES)) {
    if (key.toLowerCase() === lower) return props;
  }

  // Keyword match
  if (lower.includes("lava") || lower.includes("magma")) return MATERIAL_PROPERTIES.Lava;
  if (lower.includes("obsidian")) return MATERIAL_PROPERTIES.Rock_Obsidian;
  if (lower.includes("crystal")) return MATERIAL_PROPERTIES.Crystal;
  if (lower.includes("ice")) return MATERIAL_PROPERTIES.Ice;
  if (lower.includes("stone") || lower.includes("rock")) return MATERIAL_PROPERTIES.Stone;
  if (lower.includes("grass")) return MATERIAL_PROPERTIES.Grass;
  if (lower.includes("sand")) return MATERIAL_PROPERTIES.Sand;
  if (lower.includes("snow") || lower.includes("frost")) return MATERIAL_PROPERTIES.Snow;
  if (lower.includes("dirt") || lower.includes("soil")) return MATERIAL_PROPERTIES.Dirt;
  if (lower.includes("ash")) return MATERIAL_PROPERTIES.Ash;
  if (lower.includes("wood") || lower.includes("bark")) return MATERIAL_PROPERTIES.Wood;
  if (lower.includes("ore")) return MATERIAL_PROPERTIES.Ore_Iron;

  return {}; // defaults will be applied by consumer
}

/* ── Default fallback palette ────────────────────────────────────── */

export const DEFAULT_MATERIAL_PALETTE: VoxelMaterial[] = [
  { name: "Grass", color: "#5cb85c" },
  { name: "Dirt", color: "#a0724a" },
  { name: "Stone", color: "#909090" },
];

/* ── Fuzzy material name matching ────────────────────────────────── */

export function matchMaterialName(name: string): string {
  // Exact match
  if (HYTALE_MATERIAL_COLORS[name]) return HYTALE_MATERIAL_COLORS[name];

  // Case-insensitive exact match
  const lower = name.toLowerCase();
  for (const [key, color] of Object.entries(HYTALE_MATERIAL_COLORS)) {
    if (key.toLowerCase() === lower) return color;
  }

  // Substring match
  for (const [key, color] of Object.entries(HYTALE_MATERIAL_COLORS)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return color;
    }
  }

  // Keyword match
  if (lower.includes("lava") || lower.includes("magma")) return HYTALE_MATERIAL_COLORS.Lava;
  if (lower.includes("obsidian")) return HYTALE_MATERIAL_COLORS.Rock_Obsidian;
  if (lower.includes("stone") || lower.includes("rock")) return HYTALE_MATERIAL_COLORS.Rock_Stone;
  if (lower.includes("basalt")) return HYTALE_MATERIAL_COLORS.Rock_Basalt;
  if (lower.includes("granite")) return HYTALE_MATERIAL_COLORS.Rock_Granite;
  if (lower.includes("sandstone")) return HYTALE_MATERIAL_COLORS.Rock_Sandstone;
  if (lower.includes("limestone")) return HYTALE_MATERIAL_COLORS.Rock_Limestone;
  if (lower.includes("marble")) return HYTALE_MATERIAL_COLORS.Marble;
  if (lower.includes("dirt") || lower.includes("soil")) return HYTALE_MATERIAL_COLORS.Soil_Dirt;
  if (lower.includes("peat") || lower.includes("bog")) return HYTALE_MATERIAL_COLORS.Peat_Bog;
  if (lower.includes("grass")) return HYTALE_MATERIAL_COLORS.Grass;
  if (lower.includes("sand")) return HYTALE_MATERIAL_COLORS.Sand;
  if (lower.includes("snow") || lower.includes("frost")) return HYTALE_MATERIAL_COLORS.Snow;
  if (lower.includes("ice")) return HYTALE_MATERIAL_COLORS.Ice;
  if (lower.includes("clay")) return HYTALE_MATERIAL_COLORS.Soil_Clay;
  if (lower.includes("moss") || lower.includes("lichen")) return HYTALE_MATERIAL_COLORS.Soil_Moss;
  if (lower.includes("mud")) return HYTALE_MATERIAL_COLORS.Soil_Mud;
  if (lower.includes("gravel")) return HYTALE_MATERIAL_COLORS.Soil_Gravel;
  if (lower.includes("ash")) return HYTALE_MATERIAL_COLORS.Ash;
  if (lower.includes("crystal")) return HYTALE_MATERIAL_COLORS.Crystal;
  if (lower.includes("water")) return HYTALE_MATERIAL_COLORS.Water;
  if (lower.includes("wood") || lower.includes("log") || lower.includes("bark")) return HYTALE_MATERIAL_COLORS.Wood;
  if (lower.includes("leaf") || lower.includes("leave")) return HYTALE_MATERIAL_COLORS.Leaves;
  if (lower.includes("mushroom")) return HYTALE_MATERIAL_COLORS.Mushroom_Cap;
  if (lower.includes("ore")) return HYTALE_MATERIAL_COLORS.Ore_Iron;
  if (lower.includes("brick")) return HYTALE_MATERIAL_COLORS.Brick;
  if (lower.includes("tundra") || lower.includes("permafrost")) return HYTALE_MATERIAL_COLORS.Tundra;
  if (lower.includes("terracotta")) return HYTALE_MATERIAL_COLORS.Terracotta;

  return "#808080"; // fallback gray
}

/* ── Biome Material Config types ─────────────────────────────────── */

export interface BiomeMaterialConfig {
  layers: MaterialLayer[];
  fluidLevel?: number;
  fluidMaterial?: string;
}

export interface WeightedMaterial {
  weight: number;
  material: string;
}

interface MaterialLayer {
  type: "SpaceAndDepth" | "Constant";
  depthThreshold?: number;           // SpaceAndDepth only
  emptyMaterials?: WeightedMaterial[];  // surface voxels (from Weighted/Constant)
  solidMaterial?: string;               // below-surface voxels
  material?: string;                    // Constant fallback
}

/* ── Extract material config from biome wrapper ──────────────────── */

/**
 * Extract material configuration from a biome wrapper's MaterialProvider
 * and top-level FluidLevel/FluidMaterial fields.
 */
export function extractMaterialConfig(wrapper: Record<string, unknown>): BiomeMaterialConfig | null {
  const matProvider = wrapper.MaterialProvider as Record<string, unknown> | undefined;
  if (!matProvider || typeof matProvider !== "object") return null;

  const layers: MaterialLayer[] = [];

  const providerType = matProvider.Type as string | undefined;

  if (providerType === "Queue") {
    const queue = matProvider.Queue as Record<string, unknown>[] | undefined;
    if (Array.isArray(queue)) {
      for (const entry of queue) {
        const layer = parseLayerEntry(entry);
        if (layer) layers.push(layer);
      }
    }
  } else if (providerType === "SpaceAndDepth" || providerType === "Constant") {
    const layer = parseLayerEntry(matProvider);
    if (layer) layers.push(layer);
  }

  if (layers.length === 0) return null;

  const config: BiomeMaterialConfig = { layers };

  // Extract fluid settings from top-level wrapper
  if (typeof wrapper.FluidLevel === "number") {
    config.fluidLevel = wrapper.FluidLevel;
  }
  if (typeof wrapper.FluidMaterial === "string") {
    config.fluidMaterial = wrapper.FluidMaterial;
  }

  return config;
}

function parseLayerEntry(entry: Record<string, unknown>): MaterialLayer | null {
  const type = entry.Type as string | undefined;

  if (type === "SpaceAndDepth") {
    const depthThreshold = typeof entry.DepthThreshold === "number" ? entry.DepthThreshold : 1;
    const emptyMaterials = parseEmptyMaterials(entry.Empty as Record<string, unknown> | undefined);
    const solidMaterial = parseSolidMaterial(entry.Solid as Record<string, unknown> | string | undefined);

    return {
      type: "SpaceAndDepth",
      depthThreshold,
      emptyMaterials,
      solidMaterial,
    };
  }

  if (type === "Constant") {
    const material = parseMaterialString(entry.Material);
    return {
      type: "Constant",
      material: material ?? "Rock_Stone",
    };
  }

  return null;
}

function parseEmptyMaterials(empty: Record<string, unknown> | undefined): WeightedMaterial[] {
  if (!empty || typeof empty !== "object") return [];

  const emptyType = empty.Type as string | undefined;

  if (emptyType === "Weighted") {
    const weighted = empty.WeightedMaterials as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(weighted)) return [];

    const result: WeightedMaterial[] = [];
    for (const wm of weighted) {
      const weight = typeof wm.Weight === "number" ? wm.Weight : 1;
      const matEntry = wm.Material as Record<string, unknown> | undefined;
      if (matEntry && typeof matEntry === "object") {
        const material = parseMaterialString(matEntry.Material);
        if (material) {
          result.push({ weight, material });
        }
      }
    }
    return result;
  }

  if (emptyType === "Constant") {
    const material = parseMaterialString(empty.Material);
    if (material) {
      return [{ weight: 1, material }];
    }
  }

  return [];
}

function parseSolidMaterial(solid: Record<string, unknown> | string | undefined): string | undefined {
  if (!solid) return undefined;
  if (typeof solid === "string") return solid;
  if (typeof solid === "object") {
    const solidType = solid.Type as string | undefined;
    if (solidType === "Constant") {
      return parseMaterialString(solid.Material) ?? undefined;
    }
  }
  return undefined;
}

function parseMaterialString(mat: unknown): string | null {
  if (typeof mat === "string") return mat;
  if (mat && typeof mat === "object") {
    const obj = mat as Record<string, unknown>;
    if (typeof obj.Solid === "string") return obj.Solid;
  }
  return null;
}

/* ── Material resolution ─────────────────────────────────────────── */

export interface MaterialResolverResult {
  materialIds: Uint8Array;
  palette: VoxelMaterial[];
}

/**
 * Resolve materials for each solid voxel based on depth from terrain surface.
 *
 * When `materialConfig` is provided, uses the biome's actual MaterialProvider
 * layers (Queue → SpaceAndDepth/Constant) instead of the hardcoded heuristic.
 *
 * When `heightmap` is provided (pre-computed from smoothTerrainFill), it is used
 * directly as the surface height per column.
 *
 * Layout: densities[y * n * n + z * n + x]
 */
export function resolveMaterials(
  densities: Float32Array,
  resolution: number,
  ySlices: number,
  heightmap?: Float32Array,
  materialConfig?: BiomeMaterialConfig,
): MaterialResolverResult {
  const n = resolution;
  const ys = ySlices;
  const totalSize = n * n * ys;
  const materialIds = new Uint8Array(totalSize);

  // Build palette from materialConfig if available, otherwise use default
  let palette: VoxelMaterial[];
  if (materialConfig) {
    palette = buildPaletteFromConfig(materialConfig);
  } else {
    palette = DEFAULT_MATERIAL_PALETTE;
  }

  // Build material name → palette index lookup
  const matIndex = new Map<string, number>();
  for (let i = 0; i < palette.length; i++) {
    matIndex.set(palette[i].name, i);
  }

  // For each column (x, z), compute depth from surface and assign materials
  for (let z = 0; z < n; z++) {
    for (let x = 0; x < n; x++) {
      let surfaceY: number;

      if (heightmap) {
        surfaceY = Math.round(heightmap[z * n + x]);
      } else {
        surfaceY = -1;
        for (let y = ys - 1; y >= 0; y--) {
          const idx = y * n * n + z * n + x;
          if (densities[idx] >= SOLID_THRESHOLD) {
            if (y === ys - 1 || densities[(y + 1) * n * n + z * n + x] < SOLID_THRESHOLD) {
              surfaceY = y;
              break;
            }
          }
        }
      }

      if (surfaceY < 0) continue; // all air in this column

      // Assign materials by depth from surface
      for (let y = surfaceY; y >= 0; y--) {
        const idx = y * n * n + z * n + x;
        if (densities[idx] < SOLID_THRESHOLD) continue; // air pocket

        const depth = surfaceY - y;

        if (materialConfig) {
          materialIds[idx] = resolveFromConfig(materialConfig.layers, depth, x, z, matIndex);
        } else {
          // Fallback heuristic: grass / dirt / stone
          if (depth <= 1) {
            materialIds[idx] = 0; // grass
          } else if (depth <= 5) {
            materialIds[idx] = 1; // dirt
          } else {
            materialIds[idx] = 2; // stone
          }
        }
      }
    }
  }

  return { materialIds, palette };
}

/* ── Config-based material resolution helpers ────────────────────── */

function buildPaletteFromConfig(config: BiomeMaterialConfig): VoxelMaterial[] {
  const seen = new Set<string>();
  const palette: VoxelMaterial[] = [];

  function addMaterial(name: string) {
    if (seen.has(name)) return;
    seen.add(name);
    const pbr = getMaterialProperties(name);
    palette.push({
      name,
      color: matchMaterialName(name),
      roughness: pbr.roughness,
      metalness: pbr.metalness,
      emissive: pbr.emissive,
      emissiveIntensity: pbr.emissiveIntensity,
    });
  }

  for (const layer of config.layers) {
    if (layer.emptyMaterials) {
      for (const wm of layer.emptyMaterials) {
        addMaterial(wm.material);
      }
    }
    if (layer.solidMaterial) addMaterial(layer.solidMaterial);
    if (layer.material) addMaterial(layer.material);
  }

  if (config.fluidMaterial) {
    addMaterial(config.fluidMaterial);
  }

  // Ensure at least one material in palette
  if (palette.length === 0) {
    palette.push({ name: "Stone", color: "#909090" });
  }

  return palette;
}

/**
 * Walk the Queue layers to resolve a material for a voxel at the given depth.
 * Uses a deterministic hash of (x, z) for weighted material selection.
 */
function resolveFromConfig(
  layers: MaterialLayer[],
  depth: number,
  x: number,
  z: number,
  matIndex: Map<string, number>,
): number {
  for (const layer of layers) {
    if (layer.type === "SpaceAndDepth") {
      const threshold = layer.depthThreshold ?? 1;
      if (depth < threshold) {
        // Surface voxels — pick from emptyMaterials using weighted hash
        if (layer.emptyMaterials && layer.emptyMaterials.length > 0) {
          const matName = pickWeightedMaterial(layer.emptyMaterials, x, z);
          return matIndex.get(matName) ?? 0;
        }
      } else {
        // Below surface — use solidMaterial
        if (layer.solidMaterial) {
          return matIndex.get(layer.solidMaterial) ?? 0;
        }
      }
      // If this SpaceAndDepth layer didn't assign, fall through to next in queue
      continue;
    }

    if (layer.type === "Constant") {
      // Constant layer is a fallback — catches everything not assigned above
      if (layer.material) {
        return matIndex.get(layer.material) ?? 0;
      }
    }
  }

  return 0;
}

/**
 * Deterministic weighted material selection based on (x, z) hash.
 * Produces spatially coherent patterns without randomness.
 */
export function pickWeightedMaterial(materials: WeightedMaterial[], x: number, z: number): string {
  if (materials.length === 1) return materials[0].material;

  // Compute total weight
  let totalWeight = 0;
  for (const wm of materials) totalWeight += wm.weight;

  // Deterministic hash of position → [0, totalWeight)
  const hash = ((x * HASH_PRIME_A + z * HASH_PRIME_B) ^ (x * HASH_PRIME_E)) >>> 0;
  const t = (hash / 4294967296) * totalWeight;

  let cumulative = 0;
  for (const wm of materials) {
    cumulative += wm.weight;
    if (t < cumulative) return wm.material;
  }

  return materials[materials.length - 1].material;
}
