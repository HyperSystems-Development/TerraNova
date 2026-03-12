import { SOLID_THRESHOLD, type VoxelMaterial } from "./voxelExtractor";
import { HASH_PRIME_A, HASH_PRIME_B, HASH_PRIME_E } from "@/constants";

/* ── Hytale material color map ───────────────────────────────────── */
// IDs sourced from actual HytaleGenerator biome/assignment JSON files.

const HYTALE_MATERIAL_COLORS: Record<string, string> = {
  // ── Special ──
  Empty: "#00000000",
  Editor_Anchor: "#ff00ff",

  // ── Rock / Stone ──
  Rock_Stone: "#909090",
  Rock_Stone_Cobble: "#7a7a7a",
  Rock_Stone_Mossy: "#6a7a5a",
  Rock_Stone_Stalactite_Large: "#888888",
  Rock_Stone_Stalactite_Small: "#888888",
  Rock_Basalt: "#3d3d3d",
  Rock_Bedrock: "#2a2a2a",
  Rock_Calcite: "#e8e0d0",
  Rock_Calcite_Cobble: "#d8d0c0",
  Rock_Chalk: "#f0ede0",
  Rock_Ice: "#c8e8f8",
  Rock_Ice_Permafrost: "#b0d8f0",
  Rock_Magma_Cooled: "#4a2020",
  Rock_Marble: "#e0ddd5",
  Rock_Marble_Stalactite_Large: "#dddad2",
  Rock_Marble_Stalactite_Small: "#dddad2",
  Rock_Peach_Cobble: "#d4a880",
  Rock_Quartzite: "#d6cec0",
  Rock_Quartzite_Stalactite_Large: "#d0c8b8",
  Rock_Quartzite_Stalactite_Small: "#d0c8b8",
  Rock_Salt: "#f0ece0",
  Rock_Sandstone: "#d2b48c",
  Rock_Sandstone_Cobble_Half: "#c8aa82",
  Rock_Sandstone_Red: "#c87850",
  Rock_Sandstone_White: "#e8dfc8",
  Rock_Shale: "#6a6878",
  Rock_Slate: "#5c5c6e",
  Rock_Volcanic: "#3a2828",
  Rock_Volcanic_Brick_Smooth: "#4a3030",
  Rock_Volcanic_Cracked_Lava: "#5a2010",
  Rock_Crystal_Purple_Block: "#8060c0",
  Rock_Crystal_Purple_Large: "#9070d0",
  Rock_Crystal_Purple_Medium: "#8868c8",
  Rock_Crystal_Red: "#c04040",
  Rock_Crystal_Red_Block: "#c84848",
  Rock_Crystal_Red_Small: "#c04040",
  Rock_Crystal_Yellow_Block: "#c8b820",
  Rock_Lime_Cobble: "#b0c890",

  // ── Soil / Earth ──
  Soil_Ash: "#c0b8a8",
  Soil_Clay: "#b87333",
  Soil_Clay_Black: "#2e2820",
  Soil_Clay_Grey: "#888078",
  Soil_Clay_Orange: "#c07840",
  Soil_Clay_Pink: "#d8a898",
  Soil_Clay_Smooth_Black: "#302820",
  Soil_Clay_White: "#e0d8c8",
  Soil_Clay_Yellow: "#c8a840",
  Soil_Dirt: "#a0724a",
  Soil_Dirt_Burnt: "#6e4a30",
  Soil_Dirt_Cold: "#7a6858",
  Soil_Dirt_Dry: "#b8906a",
  Soil_Dirt_Poisoned: "#6a7830",
  Soil_Grass: "#5cb85c",
  Soil_Grass_Burnt: "#7a6030",
  Soil_Grass_Cold: "#809870",
  Soil_Grass_Deep: "#3e8a3e",
  Soil_Grass_Dry: "#9aad52",
  Soil_Grass_Full: "#48c048",
  Soil_Grass_Pathway: "#8a9868",
  Soil_Grass_Sunny: "#6ec86e",
  Soil_Gravel: "#a0a0a0",
  Soil_Gravel_Sand: "#c0b080",
  Soil_Gravel_Sand_White: "#d8d0b8",
  Soil_Hive: "#c8a840",
  Soil_Hive_Brick: "#b89830",
  Soil_Hive_Corrupted: "#807020",
  Soil_Hive_Corrupted_Brick: "#706018",
  Soil_Leaves: "#7a9040",
  Soil_Mud: "#6b4423",
  Soil_Mud_Dry: "#8a6840",
  Soil_Needles: "#8a7050",
  Soil_Pathway: "#988060",
  Soil_Peat: "#5a3e28",
  Soil_Pebbles: "#909090",
  Soil_Pebbles_Frozen: "#a0b0c0",
  Soil_Roots_Poisoned: "#5a7030",
  Soil_Sand: "#c2b280",
  Soil_Sand_Ashen: "#c0b8a0",
  Soil_Sand_White: "#e8dfc8",
  Soil_Snow: "#e8eef0",

  // ── Plant / Vegetation ──
  Plant_Barnacles: "#7a8878",
  Plant_Bramble_Dead_Lavathorn: "#5a3020",
  Plant_Bramble_Dead_Twisted: "#5a4030",
  Plant_Bramble_Dry_Twisted: "#7a6040",
  Plant_Bramble_Winter: "#888888",
  Plant_Bush: "#4a8a30",
  Plant_Bush_Arid: "#9a9040",
  Plant_Bush_Arid_Sharp: "#a09840",
  Plant_Bush_Bramble: "#506030",
  Plant_Bush_Dead: "#786848",
  Plant_Bush_Dead_Tall: "#786848",
  Plant_Bush_Dead_Twisted: "#706040",
  Plant_Bush_Green: "#408030",
  Plant_Bush_Hanging: "#4a9038",
  Plant_Bush_Jungle: "#388028",
  Plant_Bush_Lush: "#3a9030",
  Plant_Bush_Winter_Sharp: "#a0a8a0",
  Plant_Bush_Winter_Snow: "#d0d8d0",
  Plant_Coral_Block_Green: "#40b080",
  Plant_Coral_Bush_White: "#e0d8c0",
  Plant_Crop_Health2: "#c04848",
  Plant_Crop_Mushroom_Cap_Red: "#c03028",
  Plant_Crop_Mushroom_Flatcap_Green: "#408040",
  Plant_Crop_Mushroom_Glowing_Blue: "#2060c0",
  Plant_Crop_Mushroom_Glowing_Green: "#40a040",
  Plant_Crop_Mushroom_Glowing_Purple: "#8040c0",
  Plant_Crop_Mushroom_Glowing_Red: "#c02020",
  Plant_Crop_Mushroom_Glowing_Violet: "#6030a0",
  Plant_Crop_Mushroom_Shelve_White: "#d8d0c8",
  Plant_Crop_Stamina2: "#4080c0",
  Plant_Fern: "#4a9040",
  Plant_Fern_Forest: "#3a8030",
  Plant_Fern_Jungle: "#308028",
  Plant_Fern_Tall: "#489038",
  Plant_Fern_Wet_Big: "#388030",
  Plant_Fern_Winter: "#788070",
  Plant_Flower_Bushy_Green: "#409840",
  Plant_Flower_Bushy_Orange: "#e07830",
  Plant_Flower_Bushy_Poisoned: "#90a830",
  Plant_Flower_Common_Blue: "#4060c0",
  Plant_Flower_Common_Cyan2: "#30a0c0",
  Plant_Flower_Common_Red2: "#c03030",
  Plant_Flower_Common_Violet: "#8040a0",
  Plant_Flower_Common_White2: "#e8e0d8",
  Plant_Flower_Common_Yellow2: "#e0c020",
  Plant_Flower_Flax_Blue: "#6080c0",
  Plant_Flower_Flax_Orange: "#e08030",
  Plant_Flower_Hemlock: "#e0e8d0",
  Plant_Flower_Orchid_Purple: "#b060c0",
  Plant_Flower_Tall_Pink: "#e07898",
  Plant_Flower_Tall_Purple: "#9050b0",
  Plant_Flower_Tall_Red: "#c03030",
  Plant_Flower_Water_Green: "#30a060",
  Plant_Fruit_Coconut: "#c09850",
  Plant_Grass_Arid: "#b0a850",
  Plant_Grass_Arid_Short: "#a8a048",
  Plant_Grass_Arid_Tall: "#b8b058",
  Plant_Grass_Dry: "#a0a040",
  Plant_Grass_Dry_Tall: "#a8a848",
  Plant_Grass_Gnarled: "#889040",
  Plant_Grass_Jungle: "#40a030",
  Plant_Grass_Lush_Short: "#50b040",
  Plant_Grass_Poisoned_Short: "#7a9830",
  Plant_Grass_Rocky: "#909870",
  Plant_Grass_Sharp: "#a0b840",
  Plant_Grass_Sharp_Tall: "#98b038",
  Plant_Grass_Sharp_Wild: "#a0a838",
  Plant_Grass_Wet: "#488040",
  Plant_Grass_Wet_Tall: "#409838",
  Plant_Grass_Winter: "#909888",
  Plant_Grass_Winter_Short: "#888878",
  Plant_Grass_Winter_Tall: "#989888",
  Plant_Leaves_Autumn_Floor: "#c07830",
  Plant_Leaves_Palm_Oasis: "#40a838",
  Plant_Leaves_Poisoned_Floor: "#889030",
  Plant_Moss_Block_Blue: "#3060a0",
  Plant_Moss_Block_Green: "#408040",
  Plant_Moss_Blue: "#4070a8",
  Plant_Moss_Green_Dark: "#306030",
  Plant_Moss_Rug_Blue: "#3868a0",
  Plant_Moss_Rug_Lime: "#70a030",
  Plant_Moss_Short_Blue: "#3878b0",
  Plant_Moss_Short_Green_Dark: "#387038",
  Plant_Reeds_Arid: "#c0b058",
  Plant_Reeds_Marsh: "#708040",
  Plant_Reeds_Water: "#508050",
  Plant_Reeds_Wet: "#608848",
  Plant_Reeds_Winter: "#9898a0",
  Plant_Roots_Cave: "#5a4030",
  Plant_Seaweed_Dead_Ghostly: "#b0c0b0",
  Plant_Seaweed_Grass: "#308060",
  Plant_Seaweed_Grass_Bulbs: "#289058",
  Plant_Seaweed_Grass_Stack: "#309060",
  Plant_Seaweed_Grass_Tall: "#288858",
  Plant_Vine: "#508038",
  Plant_Vine_Rug: "#489030",
  Plant_Vine_Thick_Roots: "#486838",
  Plant_Vine_Thick_Vertical: "#507838",
  Plant_Vine_Wall: "#508040",
  Plant_Vine_Wall_Dead: "#786848",

  // ── Rubble ──
  Rubble_Calcite_Medium: "#d0c8b8",
  Rubble_Ice: "#b8d8f0",
  Rubble_Marble: "#d8d5cc",
  Rubble_Marble_Medium: "#d0cdc4",
  Rubble_Sandstone: "#c8a878",
  Rubble_Sandstone_Red: "#b87050",
  Rubble_Sandstone_Red_Medium: "#b06848",
  Rubble_Shale: "#686678",
  Rubble_Slate: "#585870",
  Rubble_Stone: "#888888",
  Rubble_Stone_Medium: "#808080",
  Rubble_Volcanic: "#383028",

  // ── Wood ──
  Wood_Ash_Roots: "#a0a098",
  Wood_Cedar_Roots: "#7a5840",
  Wood_Drywood_Planks_Half: "#c0a870",
  Wood_Drywood_Stairs: "#b8a068",
  Wood_Fir_Roots: "#6a5038",
  Wood_Gumboab_Roots: "#8a6840",
  Wood_Gumboab_Trunk: "#9a7848",
  Wood_Gumboab_Trunk_Full: "#9a7848",
  Wood_Jungle_Trunk: "#6a5030",
  Wood_Jungle_Trunk_Full: "#6a5030",
  Wood_Maple_Trunk: "#8a6840",
  Wood_Maple_Trunk_Full: "#8a6840",
  Wood_Petrified_Trunk: "#807870",
  Wood_Petrified_Trunk_Full: "#807870",
  Wood_Redwood_Roots: "#8a4828",
  Wood_Sticks: "#a08050",
  Wood_Dry_Roots: "#9a8860",

  // ── Ore ──
  Ore_Cobalt_Basalt: "#3050a0",
  Ore_Cobalt_Stone: "#3858b0",
  Ore_Copper_Basalt: "#c07040",
  Ore_Copper_Stone: "#b86840",
  Ore_Gold_Stone: "#d0a820",
  Ore_Iron_Basalt: "#8a6050",
  Ore_Iron_Sandstone: "#a07858",
  Ore_Iron_Stone: "#8a7060",
  Ore_Mithril_Basalt: "#5870b8",
  Ore_Mithril_Magma: "#6878c0",
  Ore_Mithril_Stone: "#5060a8",
  Ore_Adamantite_Stone: "#a04080",
  Ore_Onyxium_Stone: "#202838",
  Ore_Thorium_Sandstone: "#78a030",
  Ore_Thorium_Stone: "#80c040",

  // ── Fluid / Water ──
  Fluid_Lava: "#d04000",
  Fluid_Slime: "#50a050",
  Fluid_Water: "#3060a0",
  Lava_Source: "#e04800",
  Poison_Source: "#608020",
  Water_Source: "#2858a0",

  // ── Decorative ──
  Barrier: "#ff6600",
  Deco_Bone_Skulls: "#e0d8c0",
  Deco_Coral_Shell_Sanddollar: "#e0c890",
  Deco_Coral_Shell_Urchin: "#b08060",
  Deco_Iron_Chain_Small: "#808880",
  Deco_fire: "#e06020",
  DivinePancakeCrumbs: "#e0c880",
  Furniture_Dungeon_Chest_Epic: "#c09020",
  Furniture_Scarak_Hive_Lamp: "#d0a820",
  Furniture_Scarak_Hive_Lantern: "#c8a018",
};

/** Sorted list of all known Hytale block/material identifiers. */
export const HYTALE_MATERIAL_IDS: readonly string[] = Object.keys(HYTALE_MATERIAL_COLORS).sort();

/** Returns the hex color for a material ID, or undefined if unknown. */
export function getMaterialColor(id: string): string | undefined {
  return HYTALE_MATERIAL_COLORS[id];
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** Convert hex color to LAB for perceptual distance */
function hexToLab(hex: string): [number, number, number] {
  // Convert hex to RGB
  const [r, g, b] = hexToRgb(hex);
  // Normalize
  const rn = r / 255, gn = g / 255, bn = b / 255;
  // sRGB to XYZ
  function srgbToLinear(c: number) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  const rl = srgbToLinear(rn), gl = srgbToLinear(gn), bl = srgbToLinear(bn);
  const x = rl * 0.4124 + gl * 0.3576 + bl * 0.1805;
  const y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
  const z = rl * 0.0193 + gl * 0.1192 + bl * 0.9505;
  // XYZ to LAB
  function xyzToLab(t: number) {
    return t > 0.008856 ? Math.pow(t, 1/3) : (7.787 * t) + 16/116;
  }
  const xn = x / 0.95047, yn = y / 1.0, zn = z / 1.08883;
  const l = 116 * xyzToLab(yn) - 16;
  const a = 500 * (xyzToLab(xn) - xyzToLab(yn));
  const b_ = 200 * (xyzToLab(yn) - xyzToLab(zn));
  return [l, a, b_];
}

/** Perceptual LAB color distance */
function labDistance(lab1: [number, number, number], lab2: [number, number, number]): number {
  return Math.sqrt(
    (lab1[0] - lab2[0]) ** 2 +
    (lab1[1] - lab2[1]) ** 2 +
    (lab1[2] - lab2[2]) ** 2
  );
}

/** Returns the top N material IDs whose color is closest to the given hex color, optionally filtered by category */
export function findNearestMaterials(hex: string, category?: string, n = 5): string[] {
  const targetLab = hexToLab(hex);
  let ids = HYTALE_MATERIAL_IDS;
  if (category && category !== "All") {
    ids = ids.filter(id => id.startsWith(category));
  }
  const scored = ids.map(id => {
    const color = HYTALE_MATERIAL_COLORS[id];
    if (!color) return { id, dist: Infinity };
    const lab = hexToLab(color);
    return { id, dist: labDistance(targetLab, lab) };
  });
  scored.sort((a, b) => a.dist - b.dist);
  return scored.slice(0, n).map(s => s.id);
}

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

  // Canonical Soil variants
  Soil_Dirt_Burnt: { roughness: 0.95 },
  Soil_Dirt_Cold: { roughness: 0.88 },
  Soil_Dirt_Dry: { roughness: 0.92 },
  Soil_Grass_Deep: { roughness: 0.72 },
  Soil_Grass_Sunny: { roughness: 0.68 },
  Soil_Grass_Wet: { roughness: 0.65 },
  Soil_Snow: { roughness: 0.6 },
  Soil_Gravel_Sand: { roughness: 0.82 },
  Soil_Pebbles_Frozen: { roughness: 0.7 },

  // Canonical Rock variants
  Rock_Stone_Mossy: { roughness: 0.75 },
  Rock_Volcanic: { roughness: 0.88 },
  Rock_Marble: { roughness: 0.3, metalness: 0.05 },
  Rock_Salt: { roughness: 0.6 },
  Rock_Aqua: { roughness: 0.55, metalness: 0.05 },

  // Canonical Ore variants — metallic
  Ore_Iron_Stone: { roughness: 0.6, metalness: 0.5 },
  Ore_Copper_Stone: { roughness: 0.55, metalness: 0.55 },
  Ore_Gold_Stone: { roughness: 0.3, metalness: 0.8 },
  Ore_Silver_Stone: { roughness: 0.25, metalness: 0.85 },
  Ore_Cobalt_Stone: { roughness: 0.45, metalness: 0.65 },
  Ore_Mithril_Stone: { roughness: 0.35, metalness: 0.75 },
  Ore_Adamantite_Stone: { roughness: 0.4, metalness: 0.7 },
  Ore_Onyxium_Stone: { roughness: 0.2, metalness: 0.9, emissive: "#101828", emissiveIntensity: 0.3 },
  Ore_Thorium_Stone: { roughness: 0.4, metalness: 0.6, emissive: "#406020", emissiveIntensity: 0.15 },

  // Canonical Leaves — low roughness
  Plant_Leaves_Oak: { roughness: 0.75 },
  Plant_Leaves_Autumn: { roughness: 0.7 },
  Plant_Leaves_Crystal: { roughness: 0.15, metalness: 0.1, emissive: "#60d8f0", emissiveIntensity: 0.2 },
  Plant_Leaves_Fire: { roughness: 0.6, emissive: "#d04010", emissiveIntensity: 0.4 },
  Plant_Leaves_Azure: { roughness: 0.6, emissive: "#1840a0", emissiveIntensity: 0.1 },
  Plant_Leaves_Goldentree: { roughness: 0.5, emissive: "#a08000", emissiveIntensity: 0.15 },
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

  // Keyword match — prefix-aware for canonical names
  if (lower.startsWith("ore_")) return { roughness: 0.4, metalness: 0.7 };
  if (lower.startsWith("plant_leaves_")) return { roughness: 0.75 };
  if (lower.startsWith("soil_grass_")) return MATERIAL_PROPERTIES.Soil_Grass ?? MATERIAL_PROPERTIES.Soil_Dirt ?? {};
  if (lower.startsWith("soil_dirt_")) return MATERIAL_PROPERTIES.Soil_Dirt ?? {};
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
  if (lower.includes("ore")) return { roughness: 0.4, metalness: 0.7 };

  return {}; // defaults will be applied by consumer
}

/* ── Default fallback palette ────────────────────────────────────── */

export const DEFAULT_MATERIAL_PALETTE: VoxelMaterial[] = [
  { name: "Soil_Grass", color: "#5cb85c" },
  { name: "Soil_Dirt", color: "#a0724a" },
  { name: "Rock_Stone", color: "#909090" },
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

  // Keyword match — prefix-aware for canonical names first
  if (lower.startsWith("ore_iron_")) return HYTALE_MATERIAL_COLORS.Ore_Iron_Stone;
  if (lower.startsWith("ore_copper_")) return HYTALE_MATERIAL_COLORS.Ore_Copper_Stone;
  if (lower.startsWith("ore_gold_")) return HYTALE_MATERIAL_COLORS.Ore_Gold_Stone;
  if (lower.startsWith("ore_cobalt_")) return HYTALE_MATERIAL_COLORS.Ore_Cobalt_Stone;
  if (lower.startsWith("ore_mithril_")) return HYTALE_MATERIAL_COLORS.Ore_Mithril_Stone;
  if (lower.startsWith("ore_adamantite_")) return HYTALE_MATERIAL_COLORS.Ore_Adamantite_Stone;
  if (lower.startsWith("ore_onyxium_")) return HYTALE_MATERIAL_COLORS.Ore_Onyxium_Stone;
  if (lower.startsWith("ore_thorium_")) return HYTALE_MATERIAL_COLORS.Ore_Thorium_Stone;
  if (lower.startsWith("plant_grass_")) return HYTALE_MATERIAL_COLORS.Plant_Grass_Sharp;
  if (lower.startsWith("plant_moss_")) return HYTALE_MATERIAL_COLORS.Plant_Moss_Block_Green;
  if (lower.startsWith("plant_fern_")) return HYTALE_MATERIAL_COLORS.Plant_Fern;
  if (lower.startsWith("plant_bush_")) return HYTALE_MATERIAL_COLORS.Plant_Bush;
  if (lower.startsWith("plant_vine_")) return HYTALE_MATERIAL_COLORS.Plant_Vine;
  if (lower.startsWith("plant_reeds_")) return HYTALE_MATERIAL_COLORS.Plant_Reeds_Water;
  if (lower.startsWith("plant_seaweed_")) return HYTALE_MATERIAL_COLORS.Plant_Seaweed_Grass;
  if (lower.startsWith("plant_flower_")) return HYTALE_MATERIAL_COLORS.Plant_Flower_Common_Yellow2;
  if (lower.startsWith("plant_crop_mushroom_")) return HYTALE_MATERIAL_COLORS.Plant_Crop_Mushroom_Glowing_Green;
  if (lower.startsWith("soil_grass_")) return HYTALE_MATERIAL_COLORS.Soil_Grass;
  if (lower.startsWith("soil_dirt_")) return HYTALE_MATERIAL_COLORS.Soil_Dirt;
  if (lower.startsWith("soil_clay_")) return HYTALE_MATERIAL_COLORS.Soil_Clay;
  if (lower.startsWith("rubble_")) return HYTALE_MATERIAL_COLORS.Rubble_Stone;
  if (lower.startsWith("wood_")) return HYTALE_MATERIAL_COLORS.Wood_Maple_Trunk;
  if (lower.includes("lava") || lower.includes("magma")) return HYTALE_MATERIAL_COLORS.Lava_Source;
  if (lower.includes("stone") || lower.includes("rock")) return HYTALE_MATERIAL_COLORS.Rock_Stone;
  if (lower.includes("basalt")) return HYTALE_MATERIAL_COLORS.Rock_Basalt;
  if (lower.includes("sandstone")) return HYTALE_MATERIAL_COLORS.Rock_Sandstone;
  if (lower.includes("marble")) return HYTALE_MATERIAL_COLORS.Rock_Marble;
  if (lower.includes("dirt") || lower.includes("soil")) return HYTALE_MATERIAL_COLORS.Soil_Dirt;
  if (lower.includes("grass")) return HYTALE_MATERIAL_COLORS.Soil_Grass;
  if (lower.includes("sand")) return HYTALE_MATERIAL_COLORS.Soil_Sand;
  if (lower.includes("snow")) return HYTALE_MATERIAL_COLORS.Soil_Snow;
  if (lower.includes("ice")) return HYTALE_MATERIAL_COLORS.Rock_Ice;
  if (lower.includes("clay")) return HYTALE_MATERIAL_COLORS.Soil_Clay;
  if (lower.includes("moss")) return HYTALE_MATERIAL_COLORS.Plant_Moss_Block_Green;
  if (lower.includes("mud")) return HYTALE_MATERIAL_COLORS.Soil_Mud;
  if (lower.includes("gravel")) return HYTALE_MATERIAL_COLORS.Soil_Gravel;
  if (lower.includes("ash")) return HYTALE_MATERIAL_COLORS.Soil_Ash;
  if (lower.includes("crystal")) return HYTALE_MATERIAL_COLORS.Rock_Crystal_Purple_Block;
  if (lower.includes("water")) return HYTALE_MATERIAL_COLORS.Water_Source;
  if (lower.includes("wood") || lower.includes("trunk") || lower.includes("roots")) return HYTALE_MATERIAL_COLORS.Wood_Maple_Trunk;
  if (lower.includes("mushroom")) return HYTALE_MATERIAL_COLORS.Plant_Crop_Mushroom_Glowing_Green;
  if (lower.includes("ore")) return HYTALE_MATERIAL_COLORS.Ore_Iron_Stone;
  if (lower.includes("volcanic")) return HYTALE_MATERIAL_COLORS.Rock_Volcanic;

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
