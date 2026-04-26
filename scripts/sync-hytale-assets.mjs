import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const defaultAssetsPath = "C:/Users/wolft/AppData/Roaming/Hytale/install/pre-release/package/game/latest/Assets";
const assetsRoot = path.resolve(process.argv[2] ?? process.env.HYTALE_ASSETS ?? defaultAssetsPath);
const hytaleGeneratorSource = path.join(assetsRoot, "Server", "HytaleGenerator");
const templateRoot = path.join(repoRoot, "templates", "hytale-pre-release");
const hytaleGeneratorTarget = path.join(templateRoot, "HytaleGenerator");
const bundlePath = path.join(repoRoot, "src", "data", "terranova-bundle.json");
const today = new Date().toISOString().slice(0, 10);

if (!existsSync(hytaleGeneratorSource)) {
  throw new Error(`HytaleGenerator source not found: ${hytaleGeneratorSource}`);
}

function assertInside(parent, child) {
  const relative = path.relative(parent, child);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside ${parent}: ${child}`);
  }
}

function walkJsonFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJsonFiles(filePath, out);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      out.push(filePath);
    }
  }
  return out;
}

function inferFieldType(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "object";
  switch (typeof value) {
    case "boolean":
      return "boolean";
    case "number":
      return Number.isInteger(value) ? "integer" : "number";
    case "string":
      return "string";
    case "object":
      return "object";
    default:
      return "object";
  }
}

const CATEGORY_BY_FOLDER = {
  Assignments: "Assignment",
  Biomes: "Biome",
  BlockMasks: "BlockMask",
  Density: "Density",
  Graphs: "PositionProvider",
  Positions: "PositionProvider",
  PropDistributions: "Prop",
  Props: "Prop",
  Settings: "Settings",
  WorldStructures: "WorldStructure",
};

const CATEGORY_BY_NODE_ID_TAG = {
  Assignments: "Assignment",
  Assignment: "Assignment",
  Biome: "Biome",
  Biomes: "Biome",
  BlockMask: "BlockMask",
  BlockMasks: "BlockMask",
  Curve: "Curve",
  Curves: "Curve",
  Density: "Density",
  Directionality: "Directionality",
  Environment: "EnvironmentProvider",
  EnvironmentProvider: "EnvironmentProvider",
  Material: "MaterialProvider",
  MaterialProvider: "MaterialProvider",
  Pattern: "Pattern",
  Patterns: "Pattern",
  Position: "PositionProvider",
  Positions: "PositionProvider",
  PositionProvider: "PositionProvider",
  Prop: "Prop",
  Props: "Prop",
  PropDistribution: "Prop",
  Scanner: "Scanner",
  Scanners: "Scanner",
  Tint: "TintProvider",
  TintProvider: "TintProvider",
  Vector: "VectorProvider",
  VectorProvider: "VectorProvider",
};

const HANDLE_BY_FIELD = [
  [/density|function|terrain/i, "Density"],
  [/curve|height/i, "Curve"],
  [/material/i, "MaterialProvider"],
  [/pattern|floor|ceiling|origin|mask/i, "Pattern"],
  [/position|locator|anchor/i, "PositionProvider"],
  [/prop|prefab/i, "Prop"],
  [/scanner/i, "Scanner"],
  [/assignment/i, "Assignment"],
  [/vector/i, "VectorProvider"],
  [/environment/i, "EnvironmentProvider"],
  [/tint/i, "TintProvider"],
  [/blockmask|blockset|blocktype/i, "BlockMask"],
  [/direction|orient|rotator/i, "Directionality"],
  [/biome/i, "Biome"],
];

function inferHandleType(fieldName, fallbackCategory) {
  for (const [pattern, category] of HANDLE_BY_FIELD) {
    if (pattern.test(fieldName)) return category;
  }
  return fallbackCategory;
}

function displayName(type) {
  return type.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Za-z])(\d)/g, "$1 $2");
}

function inferNodeCategory(value, folder) {
  if (typeof value?.$NodeId === "string") {
    const match = value.$NodeId.match(/^[^.]+\.([^-]+)-/);
    const category = match ? CATEGORY_BY_NODE_ID_TAG[match[1]] : undefined;
    if (category) return category;
  }
  return CATEGORY_BY_FOLDER[folder] ?? "Density";
}

const typeSamples = new Map();

function recordNode(value, folder) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) recordNode(item, folder);
    return;
  }

  if (typeof value.Type === "string") {
    const sample = typeSamples.get(value.Type) ?? {
      type: value.Type,
      folders: new Set(),
      categories: new Map(),
      fields: new Map(),
      inputs: new Map(),
    };
    sample.folders.add(folder);
    const observedCategory = inferNodeCategory(value, folder);
    sample.categories.set(observedCategory, (sample.categories.get(observedCategory) ?? 0) + 1);

    for (const [fieldName, fieldValue] of Object.entries(value)) {
      if (fieldName === "Type" || fieldName === "$NodeId" || fieldName === "Skip" || fieldName === "ExportAs") {
        continue;
      }

      const current = sample.fields.get(fieldName);
      if (!current || current.default === undefined || current.default === null) {
        sample.fields.set(fieldName, {
          type: inferFieldType(fieldValue),
          required: false,
          default: fieldValue === undefined ? null : fieldValue,
          description: `Observed from Hytale ${folder} assets.`,
        });
      }

      if (fieldValue && typeof fieldValue === "object") {
        const nested = Array.isArray(fieldValue)
          ? fieldValue.find((item) => item && typeof item === "object" && typeof item.Type === "string")
          : fieldValue;
        if (nested && typeof nested === "object" && typeof nested.Type === "string") {
          const handleType = inferHandleType(fieldName, CATEGORY_BY_FOLDER[folder] ?? "Density");
          sample.inputs.set(fieldName, {
            id: fieldName,
            handleType,
            label: fieldName,
            description: `Nested ${handleType} asset from Hytale ${folder} data.`,
          });
        }
      }
    }

    typeSamples.set(value.Type, sample);
  }

  for (const child of Object.values(value)) {
    recordNode(child, folder);
  }
}

assertInside(path.join(repoRoot, "templates"), hytaleGeneratorTarget);
rmSync(hytaleGeneratorTarget, { recursive: true, force: true });
mkdirSync(templateRoot, { recursive: true });
cpSync(hytaleGeneratorSource, hytaleGeneratorTarget, { recursive: true });

const files = walkJsonFiles(hytaleGeneratorTarget);
for (const file of files) {
  const relative = path.relative(hytaleGeneratorTarget, file);
  const folder = relative.split(path.sep)[0];
  const json = JSON.parse(readFileSync(file, "utf8"));
  recordNode(json, folder);
}

let bundleText = readFileSync(bundlePath, "utf8");
const bundle = JSON.parse(bundleText);
bundle.buildDate = today;
bundle.sourceBuild = "Hytale pre-release local Assets/Server/HytaleGenerator";

let addedNodes = 0;
let updatedNodes = 0;
const addedNodeEntries = [];
const updatedNodeEntries = [];
for (const [type, sample] of [...typeSamples.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const existingNode = bundle.nodes[type];
  if (existingNode && !existingNode.description?.startsWith("Discovered from official Hytale ")) continue;

  const firstFolder = [...sample.folders][0];
  const category = [...sample.categories.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? CATEGORY_BY_FOLDER[firstFolder] ?? "Density";
  const nodeDefinition = {
    nodeType: type,
    displayName: displayName(type),
    category,
    subcategory: firstFolder,
    description: `Discovered from official Hytale ${firstFolder} assets.`,
    source: {
      type: "observed-hytale-assets",
      heuristic: true,
      note: "Generated from example asset usage; confirm category and ports before treating this as authoritative schema.",
      folders: [...sample.folders].sort(),
      observedCategories: Object.fromEntries([...sample.categories.entries()].sort(([a], [b]) => a.localeCompare(b))),
    },
    fields: Object.fromEntries([...sample.fields.entries()].sort(([a], [b]) => a.localeCompare(b))),
    inputs: [...sample.inputs.values()].sort((a, b) => a.id.localeCompare(b.id)),
    outputs:
      category === "Settings"
        ? []
        : [
            {
              id: "output",
              handleType: category,
              label: "output",
            },
          ],
  };
  bundle.nodes[type] = nodeDefinition;
  if (existingNode) {
    updatedNodeEntries.push([type, nodeDefinition]);
    updatedNodes += 1;
  } else {
    addedNodeEntries.push([type, nodeDefinition]);
    addedNodes += 1;
  }
}

bundleText = bundleText
  .replace(/"buildDate": "[^"]+"/, `"buildDate": "${bundle.buildDate}"`)
  .replace(/"sourceBuild": "[^"]+"/, `"sourceBuild": "${bundle.sourceBuild}"`);

if (addedNodeEntries.length > 0) {
  const addedNodeText = JSON.stringify(Object.fromEntries(addedNodeEntries), null, 2)
    .split("\n")
    .slice(1, -1)
    .map((line) => `    ${line}`)
    .join("\n");
  bundleText = bundleText.replace(/\n  },\n  "handleTypes"/, `,\n${addedNodeText}\n  },\n  "handleTypes"`);
}

for (const [type, nodeDefinition] of updatedNodeEntries) {
  const escapedType = type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nodePattern = new RegExp(`\\n      "${escapedType}": \\{[\\s\\S]*?\\n      \\}(?=,?\\n      "[^"]+": \\{|\\n  \\},\\n  "handleTypes")`);
  const replacement = `\n      "${type}": ${JSON.stringify(nodeDefinition, null, 2).replace(/\n/g, "\n      ")}`;
  bundleText = bundleText.replace(nodePattern, replacement);
}

writeFileSync(bundlePath, bundleText.endsWith("\n") ? bundleText : `${bundleText}\n`);

const manifest = {
  name: "Hytale Pre-Release",
  description: "Mirrored from the local Hytale pre-release Assets/Server/HytaleGenerator directory.",
  version: "1.0.0",
  serverVersion: today,
  category: "Official",
  sourcePath: assetsRoot,
  fileCount: files.length,
  nodeTypeCount: typeSamples.size,
};
writeFileSync(path.join(templateRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Mirrored ${files.length} HytaleGenerator JSON files into ${path.relative(repoRoot, hytaleGeneratorTarget)}`);
console.log(`Observed ${typeSamples.size} node types; added ${addedNodes} missing bundle node definitions; updated ${updatedNodes}`);
