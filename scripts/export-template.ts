/**
 * CLI script to export a TerraNova template to Hytale-native format.
 * Usage: npx tsx scripts/export-template.ts <template-name> <output-dir>
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { internalToHytaleBiome, transformNode } from "../src/utils/internalToHytale.js";

const templateName = process.argv[2];
const outputDir = process.argv[3];

if (!templateName || !outputDir) {
  console.error("Usage: npx tsx scripts/export-template.ts <template-name> <output-dir>");
  process.exit(1);
}

const templateDir = join("templates", templateName);

if (!existsSync(templateDir)) {
  console.error(`Template not found: ${templateDir}`);
  process.exit(1);
}

// Read manifest to derive WorldStructure filename
const manifestPath = join(templateDir, "manifest.json");
if (!existsSync(manifestPath)) {
  console.error(`Manifest not found: ${manifestPath}`);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const worldStructureName = (manifest.name as string).replace(/\s+/g, "");

// Discover files
const settingsPath = join(templateDir, "HytaleGenerator/Settings/Settings.json");
const mainWorldPath = join(templateDir, "HytaleGenerator/WorldStructures/MainWorld.json");

// Find biome files
const biomesDir = join(templateDir, "HytaleGenerator/Biomes");
const biomeFiles = readdirSync(biomesDir).filter((f: string) => f.endsWith(".json"));

// Create output directories
const outGen = join(outputDir, "HytaleGenerator");
const outSettings = join(outGen, "Settings");
const outWorlds = join(outGen, "WorldStructures");
const outBiomes = join(outGen, "Biomes");

for (const dir of [outSettings, outWorlds, outBiomes]) {
  mkdirSync(dir, { recursive: true });
}

// 1. Settings.json — pass through as-is (no density nodes to translate)
const settings = readFileSync(settingsPath, "utf8");
writeFileSync(join(outSettings, "Settings.json"), settings);
console.log("  Settings.json (pass-through)");

// 2. MainWorld.json — translate the Density node and fix Framework
const mainWorld = JSON.parse(readFileSync(mainWorldPath, "utf8"));
if (mainWorld.Density && mainWorld.Density.Type) {
  mainWorld.Density = transformNode(mainWorld.Density, { parentField: "Density", category: "density" });
}
// Framework is not a valid key on WorldStructure assets — remove if present
delete mainWorld.Framework;
const worldStructureFile = `${worldStructureName}.json`;
writeFileSync(join(outWorlds, worldStructureFile), JSON.stringify(mainWorld, null, 2));
console.log(`  ${worldStructureFile} (density translated)`);

// 3. Biome files — full translation.
// Hytale resolves biomes by filename (not internal Name field), so keep original filenames.
// WorldStructure DefaultBiome/Biome references must match the filename (sans .json).
for (const biomeFile of biomeFiles) {
  const biomePath = join(biomesDir, biomeFile);
  const biomeData = JSON.parse(readFileSync(biomePath, "utf8"));
  const exported = internalToHytaleBiome(biomeData);
  writeFileSync(join(outBiomes, biomeFile), JSON.stringify(exported, null, 2));
  console.log(`  ${biomeFile} (full biome translation)`);
}

console.log(`\nExport complete → ${outGen}`);
