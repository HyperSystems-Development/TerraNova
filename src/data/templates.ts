export interface TemplateInfo {
  name: string;
  displayName: string;
  description: string;
  category: string;
  tags?: string[];
}

export const BUNDLED_TEMPLATES: TemplateInfo[] = [
  {
    name: "",
    displayName: "Blank Project",
    description: "An empty project with no nodes. Best for building a biome from scratch following the docs or a walkthrough.",
    category: "Starter",
    tags: ["Beginner", "Empty"],
  },
  {
    name: "void",
    displayName: "Void",
    description: "A minimal flat world with a single height formula. The simplest possible terrain: a perfectly flat plain at Y=100. Good first stop before adding noise.",
    category: "Starter",
    tags: ["Beginner", "Flat Plain", "2 Nodes"],
  },
  {
    name: "forest-hills",
    displayName: "Forest Hills",
    description: "Gently rolling forested hills with cliff ridges, valley floors, and cave networks. A solid all-rounder showing noise layering, material bands, and prop scatter.",
    category: "Nature",
    tags: ["Intermediate", "Rolling Hills", "Caves", "Props", "13 Node Types"],
  },
  {
    name: "shattered-archipelago",
    displayName: "Shattered Archipelago",
    description: "Dramatic volcanic island chains rising from a deep ocean, with coral reefs, sea caves, jungle canopy, and scattered ruins. A showcase of multi-biome composition.",
    category: "Nature",
    tags: ["Expert", "Sky Islands", "Caves", "7 Biomes", "46 Nodes"],
  },
  {
    name: "tropical-pirate-islands",
    displayName: "Tropical Pirate Islands",
    description: "Sandy beaches, palm trees, and hidden pirate coves rising from turquoise waters. Demonstrates beach shoreline blending, shallow ocean floors, and atmospheric tinting.",
    category: "Nature",
    tags: ["Intermediate", "Beach Shore", "Archipelago", "Atmospheric"],
  },
  {
    name: "eldritch-spirelands",
    displayName: "Eldritch Spirelands",
    description: "Towering crystalline spires and void-touched terrain in an otherworldly biome. Uses SDF shape nodes and gradient warp for surreal geometry that goes beyond standard noise.",
    category: "Fantasy",
    tags: ["Advanced", "Spires", "Gradient Warp", "Atmospheric"],
  },
  {
    name: "aqua-subterrain",
    displayName: "Aqua Subterrain",
    description: "A compact mod-derived underwater world template focused on ravines, coral structures, and vertical cave bands. Useful if you want to study enclosed biomes, ceiling/floor framing, and themed assignment layers.",
    category: "Fantasy",
    tags: ["Advanced", "Underwater", "Ravines", "Mod Template"],
  },
  {
    name: "mycelium-growth",
    displayName: "Mycelium Growth",
    description: "A lightweight fungal biome template with a single focused biome and a simple world structure. Good for experimenting with themed surface dressing and contained biome iteration without a large content pack.",
    category: "Experimental",
    tags: ["Intermediate", "Fungal", "Focused Biome", "Mod Template"],
  },
];
